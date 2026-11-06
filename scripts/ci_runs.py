#!/usr/bin/env python3
"""Fetch the GitHub Actions run history into metrics/ci-runs.json.

The repo is public, so no credentials are needed (60 calls an hour without a
token). If GITHUB_TOKEN is set, it is sent for a higher limit.

Usage: python3 scripts/ci_runs.py [--pages 3]
The dashboard (scripts/dashboard.py) reads the file it writes.
"""

import datetime
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "dalhhorn-ship-it/minespel"
OUT = os.path.join(ROOT, "metrics", "ci-runs.json")
KEYS = ("id", "name", "event", "head_branch", "status", "conclusion",
        "created_at", "run_started_at", "updated_at", "html_url")


def fetch(page):
    url = "https://api.github.com/repos/%s/actions/runs?per_page=100&page=%d" % (REPO, page)
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json",
                                               "User-Agent": "minespel-dashboard"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r).get("workflow_runs", [])


def write(runs, source):
    """Write a compact list, one run per line, newest first."""
    runs = sorted(({k: r.get(k) for k in KEYS} for r in runs),
                  key=lambda r: r["created_at"] or "", reverse=True)
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write('{"source": %s, "fetched_at": "%s", "runs": [\n' % (json.dumps(source), now))
        f.write(",\n".join(json.dumps(r, separators=(",", ":")) for r in runs))
        f.write("\n]}\n")
    return len(runs)


def main(argv):
    pages = int(argv[argv.index("--pages") + 1]) if "--pages" in argv else 3
    runs, seen = [], set()
    for page in range(1, pages + 1):
        try:
            batch = fetch(page)
        except Exception as err:  # network, rate limit or proxy
            print("Could not fetch page %d: %s" % (page, err), file=sys.stderr)
            if not runs:
                return 1
            break
        for r in batch:
            if r.get("id") not in seen:
                seen.add(r.get("id"))
                runs.append(r)
        if len(batch) < 100:
            break
    n = write(runs, "GitHub Actions runs API, " + REPO)
    print("Wrote %d runs to metrics/ci-runs.json" % n)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
