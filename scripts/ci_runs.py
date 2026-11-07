#!/usr/bin/env python3
"""Fetch the GitHub Actions run history and the Cloudflare build history into metrics/.

  metrics/ci-runs.json    GitHub Actions runs (CI)
  metrics/cf-builds.json  "Workers Builds: *" check runs (Cloudflare Workers Builds,
                          decision 98) for recent first parent commits on main and
                          recent branch heads, plus one plain GET of the live site

The repo is public, so no credentials are needed (60 calls an hour without a
token). If GITHUB_TOKEN is set, it is sent for a higher limit. There is no
Cloudflare API token: the build history comes from the check runs Cloudflare
records on GitHub (decision 122). A commit whose builds are all finished is not
fetched again. A network failure keeps the old cache.

Usage: python3 scripts/ci_runs.py [--pages 3]
The dashboard (scripts/dashboard.py) reads the files it writes.
"""

import datetime
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "dalhhorn-ship-it/minespel"
OUT = os.path.join(ROOT, "metrics", "ci-runs.json")
CF_OUT = os.path.join(ROOT, "metrics", "cf-builds.json")
LIVE_URL = "https://minespel.dalhhorn.workers.dev"
BUILD_PREFIX = "Workers Builds:"
DAYS = 60          # how far back to look for commits
MAIN_CAP = 60      # at most this many first parent commits on main
BRANCH_CAP = 30    # at most this many branch heads
SETTLE_DAYS = 2    # a commit older than this with no build gets no build any more
KEYS = ("id", "name", "event", "head_branch", "status", "conclusion",
        "created_at", "run_started_at", "updated_at", "html_url")


def api(path):
    """GET one GitHub API path (with query) and return the parsed JSON."""
    req = urllib.request.Request("https://api.github.com/repos/%s/%s" % (REPO, path),
                                 headers={"Accept": "application/vnd.github+json",
                                          "User-Agent": "minespel-dashboard"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def fetch(page):
    return api("actions/runs?per_page=100&page=%d" % page).get("workflow_runs", [])


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


def iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def to_utc(s):
    """An ISO time with any offset as a UTC 'Z' string, or None."""
    try:
        t = datetime.datetime.fromisoformat((s or "").replace("Z", "+00:00"))
    except ValueError:
        return None
    if t.tzinfo is None:
        t = t.replace(tzinfo=datetime.timezone.utc)
    return iso(t.astimezone(datetime.timezone.utc))


def write(runs, source):
    """Write a compact list, one run per line, newest first."""
    runs = sorted(({k: r.get(k) for k in KEYS} for r in runs),
                  key=lambda r: r["created_at"] or "", reverse=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write('{"source": %s, "fetched_at": "%s", "runs": [\n' % (json.dumps(source), iso(utc_now())))
        f.write(",\n".join(json.dumps(r, separators=(",", ":")) for r in runs))
        f.write("\n]}\n")
    return len(runs)


def fetch_ci(pages):
    runs, seen = [], set()
    for page in range(1, pages + 1):
        try:
            batch = fetch(page)
        except Exception as err:  # network, rate limit or proxy
            print("Could not fetch page %d: %s" % (page, err), file=sys.stderr)
            if not runs:
                return False
            break
        for r in batch:
            if r.get("id") not in seen:
                seen.add(r.get("id"))
                runs.append(r)
        if len(batch) < 100:
            break
    n = write(runs, "GitHub Actions runs API, " + REPO)
    print("Wrote %d runs to metrics/ci-runs.json" % n)
    return True


# ---------- Cloudflare builds (check runs on GitHub) ----------

def git_lines(*args):
    try:
        r = subprocess.run(["git", "-C", ROOT] + list(args), capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.splitlines() if r.returncode == 0 else None


def recent_commits(now, get=api):
    """[(sha, branch, commit time)] for first parent commits on main and for branch heads.

    Local git first (origin/main and the origin/* refs); the GitHub API when git has none.
    """
    since = now - datetime.timedelta(days=DAYS)
    out = []
    main = git_lines("log", "--first-parent", "origin/main", "--since=%s" % iso(since),
                     "-%d" % MAIN_CAP, "--format=%H%x09%cI")
    if main:
        out += [(sha, "main", to_utc(t)) for sha, t in (l.split("\t") for l in main if "\t" in l)]
    else:
        try:
            q = urllib.parse.urlencode({"sha": "main", "since": iso(since), "per_page": MAIN_CAP})
            for c in get("commits?" + q):
                out.append((c["sha"], "main", to_utc(c.get("commit", {}).get("committer", {}).get("date"))))
        except Exception as err:
            print("Could not list main commits: %s" % err, file=sys.stderr)
    heads = git_lines("for-each-ref", "--sort=-committerdate", "refs/remotes/origin",
                      "--format=%(refname:short)%09%(objectname)%09%(committerdate:iso-strict)")
    branches = []
    if heads:
        for line in heads:
            parts = line.split("\t")
            if len(parts) != 3 or not parts[0].startswith("origin/"):
                continue
            name, t = parts[0][len("origin/"):], to_utc(parts[2])
            if name in ("main", "HEAD") or not t or t < iso(since):
                continue
            branches.append((parts[1], name, t))
    else:
        try:
            for b in get("branches?per_page=100"):
                if b.get("name") != "main":
                    branches.append((b["commit"]["sha"], b["name"], None))
        except Exception as err:
            print("Could not list branches: %s" % err, file=sys.stderr)
    seen = {sha for sha, _, _ in out}
    out += [b for b in branches[:BRANCH_CAP] if b[0] not in seen]
    return out


def slug(name):
    """A branch name as Cloudflare writes it in a preview alias: claude/x_y becomes claude-x-y."""
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")


def build_rows(sha, branch, commit_at, check_runs):
    """The Workers Builds check runs of one commit as compact rows."""
    rows = []
    for c in check_runs:
        if not str(c.get("name", "")).startswith(BUILD_PREFIX):
            continue
        url = c.get("details_url") or ""
        m = re.search(r"/previews/([^/]+)/builds/", url)
        rows.append({
            # A commit on main may have been built as a preview on its branch before it reached main.
            "id": c.get("id"), "name": c.get("name"), "sha": sha,
            "branch": branch if not m or slug(branch) == slug(urllib.parse.unquote(m.group(1)))
            else urllib.parse.unquote(m.group(1)),
            "env": "preview" if m or "/previews/" in url else "production",
            "status": c.get("status"), "conclusion": c.get("conclusion"),
            "commit_at": commit_at, "queued_at": None,
            "started_at": c.get("started_at"), "completed_at": c.get("completed_at"),
            "details_url": url, "suite_id": (c.get("check_suite") or {}).get("id"),
        })
    return rows


def needs_fetch(entry, now):
    """True when a cached commit may still change: no entry, a build not done, or a young commit with no build."""
    if not entry:
        return True
    builds = entry.get("builds") or []
    if any(b.get("status") != "completed" for b in builds):
        return True
    if builds:
        return False
    t = entry.get("commit_at")
    return not t or t >= iso(now - datetime.timedelta(days=SETTLE_DAYS))


def fetch_builds(commits, cache, now, get=api):
    """Update cache (sha -> entry) for the commits. Stops at the first error and keeps the rest."""
    cache = dict(cache)
    errors = 0
    for sha, branch, commit_at in commits:
        old = cache.get(sha)
        if not needs_fetch(old, now):
            continue
        try:
            runs = get("commits/%s/check-runs?per_page=100" % sha).get("check_runs", [])
            rows = build_rows(sha, branch, commit_at, runs)
            for b in rows:
                # Workers Builds records the check run when the build ends (start equals end).
                # The check suite opens at the push, so its time gives push to build done.
                if b["suite_id"] and b["started_at"] == b["completed_at"]:
                    b["queued_at"] = get("check-suites/%s" % b["suite_id"]).get("created_at")
        except Exception as err:  # network, rate limit or proxy
            print("Could not fetch check runs for %s: %s" % (sha[:7], err), file=sys.stderr)
            errors += 1
            break
        cache[sha] = {"branch": branch, "commit_at": commit_at, "checked_at": iso(now), "builds": rows}
    keep = iso(now - datetime.timedelta(days=DAYS + 30))
    cache = {k: v for k, v in cache.items() if (v.get("commit_at") or iso(now)) >= keep}
    return cache, errors


def check_live(url=LIVE_URL, opener=urllib.request.urlopen):
    """One plain GET of the live site: status code and time, or the error."""
    res = {"url": url, "checked_at": iso(utc_now()), "status": None, "ms": None, "error": None}
    start = time.monotonic()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "minespel-dashboard"})
        with opener(req, timeout=15) as r:
            res["status"] = r.status
    except urllib.error.HTTPError as err:
        res["status"] = err.code
    except Exception as err:  # proxy block, DNS, timeout
        res["error"] = str(err)[:200]
        return res
    res["ms"] = round((time.monotonic() - start) * 1000)
    return res


def read_cache(path=CF_OUT):
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def write_builds(data, path=CF_OUT):
    """One commit per line, newest first."""
    commits = sorted(data["commits"].items(), key=lambda kv: kv[1].get("commit_at") or "", reverse=True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write('{"source": %s, "fetched_at": %s, "live": %s, "commits": {\n' % (
            json.dumps(data["source"]), json.dumps(data["fetched_at"]),
            json.dumps(data["live"], separators=(",", ":"))))
        f.write(",\n".join("%s: %s" % (json.dumps(k), json.dumps(v, separators=(",", ":"))) for k, v in commits))
        f.write("\n}}\n")


def fetch_cf():
    now = utc_now()
    old = read_cache()
    cache, errors = fetch_builds(recent_commits(now), old.get("commits") or {}, now)
    live = check_live()
    if live["error"]:
        print("Live check failed: %s" % live["error"], file=sys.stderr)
    data = {"source": "GitHub check runs 'Workers Builds: *', " + REPO,
            "fetched_at": iso(now) if not errors else old.get("fetched_at"),
            "live": live, "commits": cache}
    write_builds(data)
    n = sum(len(v.get("builds") or []) for v in cache.values())
    print("Wrote %d builds for %d commits to metrics/cf-builds.json%s" % (
        n, len(cache), " (stopped early on an error, old cache kept)" if errors else ""))
    return not errors


def main(argv):
    pages = int(argv[argv.index("--pages") + 1]) if "--pages" in argv else 3
    ok_ci = fetch_ci(pages)
    ok_cf = fetch_cf()
    return 0 if ok_ci or ok_cf else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
