#!/usr/bin/env python3
"""Project dashboard for the product director.

Reads the repo docs and git, then writes a self contained page:
  dashboard/index.html  (no network, light and dark; four tabs, Overview,
                         Roadmap, Deploy and Security, switched with pure
                         CSS; one small inline script only for the Ververs
                         button)
  dashboard/data.json   (the same numbers as data)
  dashboard/SUMMARY.md  (a short markdown table)

Usage:
  python3 scripts/dashboard.py          write the three files
  python3 scripts/dashboard.py --print  also print SUMMARY.md

The Ververs button fires the Claude Code Routine REFRESH_TRIGGER through the
artifact runtime capability `mcp` (decision 121). Set the env var
DASHBOARD_REFRESH_TRIGGER to another trigger id, or to empty for no button.
The page renders fully without the script.

Python 3 stdlib only. Every parser takes text, not a path, and gives
"unknown" when a source is missing or does not match. It never crashes
on a bad source.
"""

import datetime
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dashboard")
UNKNOWN = "unknown"

# Ververs button (decision 121): the Routine that regenerates and republishes the page.
REFRESH_TRIGGER = os.environ.get("DASHBOARD_REFRESH_TRIGGER", "trig_01E4LwguiwHKSMXYFywVuiFP").strip()
REFRESH_SERVER = "Claude Code Remote"
REFRESH_TOOL = "fire_trigger"

SOURCES = [
    "package.json", "CHANGELOG.md", "docs/BACKLOG.md", "docs/PLAN.md",
    "docs/DECISIONS.md", "docs/STATUS.md", "docs/FRICTION.md", "docs/TECH-DEBT.md",
    "metrics/ci-runs.json", "metrics/cf-builds.json", "docs/SECURITY-AUDIT.md",
    "git log --first-parent origin/main",
    "tests/e2e/*.spec.ts", "src/**/*.test.ts", "docs/modules/*/", "git",
]

STATUS_WORDS = ("shipped", "next", "candidate", "later", "dropped")
TASK_ID = re.compile(r"^[A-Z]{1,2}\d+[a-z]?$")

# Roadmap swimlanes. A release goes to the value lane (kids or parent feel
# something new) unless one of these rules puts it in the foundation lane:
#   1. a tag in the backlog row: #foundation (or #tech, #debt, #refactor,
#      #quality, #safety, #infra, #perf); #value or #feature forces value;
#   2. LANE_OVERRIDES below, keyed by release id (the first word: v4, R2);
#   3. a refactor round: id R1, R2 and so on, or "refactor" in the row note.
# Open items in docs/TECH-DEBT.md always go to the foundation lane.
# v4 Altijd spelen is foundation: it adds nothing new to do; it makes start,
# offline play and saves robust (T52, T22). v5 Veilig en juist is foundation:
# safety, accessibility and speed checks (T62, T63, T32, T64).
# Edit this map, or tag the row, to move a release to the other lane.
LANE_OVERRIDES = {"v4": "foundation", "v5": "foundation"}
FOUNDATION_TAGS = {"foundation", "tech", "debt", "tech-debt", "refactor", "quality",
                   "safety", "infra", "perf", "robustness"}
LANES = (("value", "Value for kids and parents", "releases they feel"),
         ("foundation", "Technical foundation", "refactors, safety, robustness, tech debt"))


# ---------- small helpers ----------

def read(rel):
    """Text of a repo file, or None when it is missing or unreadable."""
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return None


def git(*args):
    """Output of a git command, or None when git fails or is missing."""
    try:
        r = subprocess.run(["git", "-C", ROOT] + list(args), capture_output=True,
                           text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def plain(text):
    """Strip simple markdown: bold, code ticks, links."""
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = text.replace("**", "").replace("`", "")
    return re.sub(r"\s+", " ", text).strip()


def trim(text, n):
    text = plain(text)
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0]
    return cut.rstrip(" ,.;:") + "…"


def cells(line):
    """Cells of a markdown table row, or None when the line is not a row."""
    line = line.strip()
    if not line.startswith("|"):
        return None
    parts = line.strip("|").split("|")
    return [p.strip() for p in parts]


def section(text, heading):
    """Lines under a '## heading' up to the next '## '."""
    out, inside = [], False
    for line in text.splitlines():
        if line.startswith("## "):
            if inside:
                break
            inside = line[3:].strip().lower() == heading.lower()
            continue
        if inside:
            out.append(line)
    return out if inside or out else None


# ---------- parsers (text in, data out) ----------

def parse_package_version(text):
    if text is None:
        return UNKNOWN
    try:
        return str(json.loads(text).get("version") or UNKNOWN)
    except (ValueError, AttributeError):
        return UNKNOWN


def parse_changelog(text):
    """Latest released version and date, and the bullet count under Unreleased."""
    res = {"latest": UNKNOWN, "latest_date": UNKNOWN, "unreleased": UNKNOWN}
    if text is None:
        return res
    m = re.search(r"^## (\d+\.\d+\.\d+)(?: \((\d{4}-\d{2}-\d{2})\))?", text, re.M)
    if m:
        res["latest"] = m.group(1)
        res["latest_date"] = m.group(2) or UNKNOWN
    lines = section(text, "Unreleased")
    if lines is not None:
        res["unreleased"] = sum(1 for l in lines if re.match(r"^\s*[*-] ", l))
    return res


def parse_backlog(text):
    """Rows of the '## Ranked backlog' table, or UNKNOWN."""
    if text is None:
        return UNKNOWN
    lines = section(text, "Ranked backlog")
    if not lines:
        return UNKNOWN
    rows, header = [], None
    for line in lines:
        c = cells(line)
        if c is None:
            if header is not None and rows:
                break
            continue
        if header is None:
            header = [h.lower() for h in c]
            continue
        if all(re.fullmatch(r":?-+:?", x or "-") for x in c):
            continue
        get = lambda name, i: c[header.index(name)] if name in header and header.index(name) < len(c) else (c[i] if i < len(c) else "")
        release = get("release", 1)
        m = re.search(r"\*\*(.+?)\*\*", release)
        name = m.group(1) if m else plain(release)
        status = plain(get("status", 6))
        word = status.split(" ", 1)[0].strip(",.;:").lower() if status else ""
        rows.append({
            "rank": plain(get("rank", 0)),
            "release": name,
            "id": name.split(" ", 1)[0] if name else "",
            "tasks": plain(get("plan tasks", 5)),
            "tags": [t.lower() for t in re.findall(r"(?<![\w&])#([A-Za-z][\w-]*)", line)],
            "note": plain(release[m.end():]) if m else "",
            "feel": trim(get("what the kids or the parent feel", 2), 100),
            "size": plain(get("size", 3)),
            "status": status,
            "chip": word if word in STATUS_WORDS else "other",
        })
    return rows if rows else UNKNOWN


def parse_plan(text):
    """Open task ids: table rows whose first cell looks like a task id."""
    if text is None:
        return UNKNOWN
    ids = []
    for line in text.splitlines():
        c = cells(line)
        if c and TASK_ID.match(c[0]) and c[0] not in ids:
            ids.append(c[0])
    return ids


def parse_plan_tasks(text):
    """Task rows of docs/PLAN.md with their milestone and status, or UNKNOWN.

    Milestone and Status are the last two columns. They are read from the end
    of the row, so a pipe inside the task text does not shift them.
    """
    if text is None:
        return UNKNOWN
    rows, header = [], None
    for line in text.splitlines():
        c = cells(line)
        if c is None:
            continue
        low = [h.lower() for h in c]
        if low and low[0] == "id" and "milestone" in low:
            header = low
            continue
        if header is None or not c or not TASK_ID.match(c[0]) or len(c) < len(header):
            continue
        status = plain(c[-1])
        rows.append({
            "id": c[0],
            "milestone": plain(c[-2]),
            "status": status.split(" ", 1)[0].strip(",.;:").lower() or "todo",
        })
    return rows


def parse_decisions(text):
    """All decision rows plus the ones still waiting for the founder."""
    if text is None:
        return UNKNOWN
    rows = []
    for line in text.splitlines():
        c = cells(line)
        if not c or not re.fullmatch(r"\d+", c[0]):
            continue
        rows.append({
            "n": int(c[0]),
            "date": c[1] if len(c) > 1 else "",
            "title": trim(c[2], 140) if len(c) > 2 else "",
            "status": plain(c[-1]) if len(c) > 3 else "",
            "open": "NEEDS FOUNDER" in line,
        })
    rows.sort(key=lambda r: r["n"])
    return {
        "total": len(rows),
        "last": rows[-5:][::-1],
        "open": [r for r in rows if r["open"]],
    }


def parse_status(text):
    keys = [("phase", "Phase"), ("current", "Current release"),
            ("next", "Next step"), ("blockers", "Blockers")]
    res = {k: UNKNOWN for k, _ in keys}
    if text is None:
        return res
    for line in text.splitlines():
        for k, label in keys:
            prefix = "**%s:**" % label
            if line.startswith(prefix) and res[k] == UNKNOWN:
                res[k] = trim(line[len(prefix):], 300) or UNKNOWN
    return res


def parse_friction(text):
    if text is None:
        return UNKNOWN
    rows = []
    for line in text.splitlines():
        c = cells(line)
        if c and re.fullmatch(r"\d{4}-\d{2}-\d{2}", c[0]):
            rows.append({
                "date": c[0],
                "area": plain(c[1]) if len(c) > 1 else "",
                "text": trim(c[3] if len(c) > 3 else " ".join(c[1:]), 160),
            })
    return {"total": len(rows), "last": rows[-3:][::-1]}


def count_tests(text):
    """Cheap count of test( and it( calls in one spec or test file."""
    return len(re.findall(r"^\s*(?:test|it)(?:\.only|\.skip|\.fixme)?\(", text, re.M))


SEVERITIES = ("major", "medium", "low")


def parse_tech_debt(text):
    """Rows of the docs/TECH-DEBT.md table and open counts per severity."""
    if text is None:
        return UNKNOWN
    rows, header = [], None
    for line in text.splitlines():
        c = cells(line)
        if c is None:
            continue
        if header is None:
            if c and c[0].lower() == "id":
                header = [h.lower() for h in c]
            continue
        if all(re.fullmatch(r":?-+:?", x or "-") for x in c) or len(c) < len(header):
            continue
        row = dict(zip(header, c))
        sev = plain(row.get("severity", "")).lower()
        rows.append({
            "id": plain(row.get("id", "")),
            "severity": sev if sev in SEVERITIES else "other",
            "item": trim(row.get("item", ""), 160),
            "where": plain(row.get("where", "")),
            "size": plain(row.get("size", "")),
            "open": plain(row.get("status", "")).lower().startswith("open"),
        })
    if header is None:
        return UNKNOWN
    open_rows = [r for r in rows if r["open"]]
    order = {s: i for i, s in enumerate(SEVERITIES)}
    open_rows.sort(key=lambda r: order.get(r["severity"], 9))
    counts = {s: sum(1 for r in open_rows if r["severity"] == s) for s in SEVERITIES}
    return {"total": len(rows), "open_total": len(open_rows), "open": counts, "items": open_rows}


def to_time(s):
    try:
        return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError):
        return None


def week_of(day):
    y, w, _ = day.isocalendar()
    return "%d-W%02d" % (y, w)


def last_weeks(today, n=8):
    """The last n ISO week keys, oldest first, ending with the week of today."""
    monday = today - datetime.timedelta(days=today.weekday())
    return [week_of(monday - datetime.timedelta(weeks=i)) for i in range(n - 1, -1, -1)]


def pct(part, whole):
    return round(100.0 * part / whole) if whole else UNKNOWN


def quantile(values, q):
    if not values:
        return UNKNOWN
    v = sorted(values)
    return v[min(len(v) - 1, int(q * len(v)))] if q != 0.5 else (
        v[len(v) // 2] if len(v) % 2 else (v[len(v) // 2 - 1] + v[len(v) // 2]) / 2)


def parse_ci_runs(text):
    """The runs list from metrics/ci-runs.json text, or UNKNOWN."""
    if text is None:
        return UNKNOWN
    try:
        data = json.loads(text)
    except ValueError:
        return UNKNOWN
    runs = data.get("runs") if isinstance(data, dict) else data
    return runs if isinstance(runs, list) else UNKNOWN


def ci_metrics(runs, today):
    """Pass rates, durations, last failure and runs per week. Skipped and cancelled runs do not count."""
    if runs == UNKNOWN or not runs:
        return UNKNOWN
    runs = sorted((r for r in runs if isinstance(r, dict)), key=lambda r: r.get("created_at") or "", reverse=True)
    decided = [r for r in runs if r.get("conclusion") in ("success", "failure")]
    last30 = decided[:30]
    main30 = [r for r in decided if r.get("head_branch") == "main"][:30]
    mins = []
    for r in decided[:100]:
        a, b = to_time(r.get("run_started_at") or r.get("created_at")), to_time(r.get("updated_at"))
        if a and b and b >= a:
            mins.append((b - a).total_seconds() / 60)
    fail = next((r for r in runs if r.get("conclusion") == "failure"), None)
    main_fail = next((r for r in runs if r.get("conclusion") == "failure" and r.get("head_branch") == "main"), None)
    weeks = last_weeks(today)
    per = {w: {"runs": 0, "ok": 0, "decided": 0} for w in weeks}
    for r in runs:
        t = to_time(r.get("created_at"))
        w = week_of(t.date()) if t else None
        if w in per:
            per[w]["runs"] += 1
            if r.get("conclusion") in ("success", "failure"):
                per[w]["decided"] += 1
                per[w]["ok"] += r.get("conclusion") == "success"
    short = lambda r: None if r is None else {
        "date": (r.get("created_at") or "")[:10], "branch": r.get("head_branch") or "", "url": r.get("html_url") or ""}
    return {
        "runs": len(runs),
        "pass_rate_30": pct(sum(r["conclusion"] == "success" for r in last30), len(last30)),
        "decided_30": len(last30),
        "main_pass_rate": pct(sum(r["conclusion"] == "success" for r in main30), len(main30)),
        "main_decided": len(main30),
        "median_min": round(quantile(mins, 0.5), 1) if mins else UNKNOWN,
        "p90_min": round(quantile(mins, 0.9), 1) if mins else UNKNOWN,
        "last_failure": short(fail),
        "last_main_failure": short(main_fail),
        "weeks": weeks,
        "runs_per_week": [per[w]["runs"] for w in weeks],
        "pass_per_week": [pct(per[w]["ok"], per[w]["decided"]) for w in weeks],
    }


def deploy_metrics(dates, today):
    """Deploys from the dates (YYYY-MM-DD) of first parent commits on origin/main."""
    if dates == UNKNOWN or dates is None:
        return UNKNOWN
    days = []
    for s in dates:
        try:
            days.append(datetime.date.fromisoformat(s.strip()))
        except ValueError:
            pass
    weeks = last_weeks(today)
    return {
        "total": len(days),
        "last": max(days).isoformat() if days else UNKNOWN,
        "weeks": weeks,
        "per_week": [sum(1 for d in days if week_of(d) == w) for w in weeks],
    }


def release_metrics(text, today):
    """Released versions with dates from CHANGELOG.md, gaps between them and days since the last."""
    if text is None:
        return UNKNOWN
    rel = []
    for m in re.finditer(r"^## (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)", text, re.M):
        try:
            rel.append((m.group(1), datetime.date.fromisoformat(m.group(2))))
        except ValueError:
            pass
    if not rel:
        return UNKNOWN
    rel.sort(key=lambda x: (x[1], tuple(int(p) for p in x[0].split("."))))
    gaps = [(b[1] - a[1]).days for a, b in zip(rel, rel[1:])]
    return {
        "count": len(rel),
        "versions": [{"version": v, "date": d.isoformat()} for v, d in rel],
        "median_gap_days": (lambda m: int(m) if m == int(m) else m)(quantile(gaps, 0.5)) if gaps else UNKNOWN,
        "days_since_last": (today - rel[-1][1]).days,
    }


# ---------- Cloudflare builds (metrics/cf-builds.json, decision 122) ----------

LIVE_URL = "https://minespel.dalhhorn.workers.dev"
PREVIEW_URL = re.compile(r"/previews/([^/]+)/builds/")
SERVICE_URL = re.compile(r"^(https://dash\.cloudflare\.com/[0-9a-f]{32}/workers/services/view/[^/?#]+/production)")


def slug(name):
    """A branch name as Cloudflare writes it in a preview alias: claude/x_y becomes claude-x-y."""
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")


def parse_cf_builds(text):
    """Builds (newest first) and the live check from metrics/cf-builds.json text, or UNKNOWN.

    The env comes from the details_url: /previews/<alias>/builds/ is a preview build, anything
    else a production build of main. A preview keeps the stored branch name when its alias
    matches; a commit on main built as a preview on its branch first shows that alias.
    """
    if text is None:
        return UNKNOWN
    try:
        data = json.loads(text)
    except ValueError:
        return UNKNOWN
    commits = data.get("commits") if isinstance(data, dict) else None
    if not isinstance(commits, dict):
        return UNKNOWN
    builds, seen = [], set()
    for sha, entry in commits.items():
        for b in (entry.get("builds") or []) if isinstance(entry, dict) else []:
            if not isinstance(b, dict) or (b.get("id") is not None and b.get("id") in seen):
                continue
            seen.add(b.get("id"))
            url = b.get("details_url") or ""
            m = PREVIEW_URL.search(url)
            stored = b.get("branch") or ("" if m else "main")
            alias = urllib.parse.unquote(m.group(1)) if m else None
            builds.append(dict(b, sha=b.get("sha") or sha, env="preview" if m else "production",
                               branch=stored if not m or slug(stored) == slug(alias) else alias))
    builds.sort(key=lambda b: b.get("completed_at") or b.get("started_at") or "", reverse=True)
    live = data.get("live")
    return {"fetched_at": data.get("fetched_at") or UNKNOWN, "builds": builds,
            "live": live if isinstance(live, dict) else None}


def build_secs(b):
    """Seconds a build took. Workers Builds writes the check run at the end (start equals end),
    so then the time runs from queued_at (the check suite opened at the push)."""
    a, z = to_time(b.get("started_at")), to_time(b.get("completed_at"))
    if a and z and z > a:
        return (z - a).total_seconds()
    q = to_time(b.get("queued_at"))
    return (z - q).total_seconds() if q and z and z >= q else None


def merge_to_live_secs(b):
    """Seconds from the commit (the merge commit on main) to its production build done."""
    c, z = to_time(b.get("commit_at")), to_time(b.get("completed_at"))
    return (z - c).total_seconds() if c and z and z >= c else None


def cf_service_url(details_url):
    """The Workers service page on the Cloudflare dashboard, from a build details_url."""
    m = SERVICE_URL.match(details_url or "")
    return m.group(1) if m else None


def dur(secs):
    if not isinstance(secs, (int, float)):
        return UNKNOWN
    if secs < 90:
        return "%d s" % round(secs)
    if secs < 5400:
        return "%.1f min" % (secs / 60)
    return "%.1f h" % (secs / 3600)


def cf_metrics(cf, now):
    """Deploy tab numbers from parse_cf_builds. now is a naive UTC datetime."""
    if cf == UNKNOWN:
        return UNKNOWN
    builds = cf["builds"]
    decided = [b for b in builds if b.get("status") == "completed" and b.get("conclusion") in ("success", "failure")]
    prod = [b for b in decided if b["env"] == "production"]
    prev = [b for b in decided if b["env"] == "preview"]
    prod_ok = [b for b in prod if b["conclusion"] == "success"]

    def age_days(b):
        t = to_time(b.get("completed_at"))
        return (now - t).total_seconds() / 86400 if t else None

    def within(rows, days):
        return [b for b in rows if age_days(b) is not None and age_days(b) <= days]

    secs = [s for s in (build_secs(b) for b in decided) if s is not None]
    m2l = [s for s in (merge_to_live_secs(b) for b in prod_ok if b.get("branch") == "main") if s is not None]
    weeks = last_weeks(now.date())
    per_week = {w: 0 for w in weeks}
    for b in prod_ok:
        t = to_time(b.get("completed_at"))
        if t and week_of(t.date()) in per_week:
            per_week[week_of(t.date())] += 1
    last = prod_ok[0] if prod_ok else None
    service = next((u for u in (cf_service_url(b.get("details_url")) for b in builds) if u), None)
    row = lambda b: {
        "env": b["env"], "branch": b.get("branch") or "", "sha": (b.get("sha") or "")[:7],
        "result": b.get("conclusion") or b.get("status") or UNKNOWN, "secs": build_secs(b),
        "completed_at": b.get("completed_at") or "", "url": b.get("details_url") or ""}
    return {
        "fetched_at": cf["fetched_at"],
        "builds": len(builds),
        "last_prod": None if last is None else dict(row(last), merge_to_live=merge_to_live_secs(last)),
        "last_prod_any": None if not prod else row(prod[0]),
        "days_since_deploy": int(age_days(last)) if last and age_days(last) is not None else UNKNOWN,
        "prod_7": len(within(prod_ok, 7)), "prod_30": len(within(prod_ok, 30)),
        "failed_30": len(within([b for b in prod if b["conclusion"] == "failure"], 30)),
        "prod_rate": pct(len(prod_ok), len(prod)), "prod_decided": len(prod),
        "preview_rate": pct(sum(b["conclusion"] == "success" for b in prev), len(prev)), "preview_decided": len(prev),
        "median_secs": quantile(secs, 0.5) if secs else UNKNOWN,
        "p90_secs": quantile(secs, 0.9) if secs else UNKNOWN,
        "m2l_median": quantile(m2l, 0.5) if m2l else UNKNOWN, "m2l_n": len(m2l),
        "weeks": weeks, "per_week": [per_week[w] for w in weeks],
        "last10": [row(b) for b in builds[:10]],
        "service_url": service,
        "live_url": (cf["live"] or {}).get("url") or LIVE_URL,
        "live": cf["live"],
    }


# ---------- security audit (docs/SECURITY-AUDIT.md, decision 122) ----------

SEC_LEVELS = ("critical", "high", "medium", "low", "info")
SEC_STATUS = ("open", "accepted", "fixed")
SEC_HEAD = {"date": "date", "scope": "scope", "auditor or tool": "auditor", "auditor": "auditor",
            "tool": "auditor", "summary": "summary"}


def parse_security_audit(text):
    """Header lines and findings of docs/SECURITY-AUDIT.md, or UNKNOWN when the file is missing.

    Header lines: 'Date: ...', 'Scope: ...', 'Auditor or tool: ...', 'Summary: ...' (bold or
    a bullet is fine). Findings: a table whose first column is Id, with Severity, Title, Where,
    Status and Fix or note. An unknown status counts as open. Findings sort by status
    (open, accepted, fixed), then severity (critical first).
    """
    if text is None:
        return UNKNOWN
    head = {k: UNKNOWN for k in ("date", "scope", "auditor", "summary")}
    rows, header = [], None
    for line in text.splitlines():
        c = cells(line)
        if c is None:
            s = line.replace("**", "").strip().lstrip("*- ").strip()
            m = re.match(r"^(auditor or tool|auditor|tool|date|scope|summary)\s*:\s*(.+)$", s, re.I)
            if m and head[SEC_HEAD[m.group(1).lower()]] == UNKNOWN:
                head[SEC_HEAD[m.group(1).lower()]] = plain(m.group(2))
            continue
        low = [x.lower() for x in c]
        if low and low[0] == "id" and "severity" in low:
            header = low
            continue
        if header is None or all(re.fullmatch(r":?-+:?", x or "-") for x in c) or not c[0]:
            continue
        r = dict(zip(header, c))
        sev = plain(r.get("severity", "")).split(" ", 1)[0].lower()
        st = plain(r.get("status", "")).split(" ", 1)[0].strip(",.;:").lower()
        rows.append({
            "id": plain(r.get("id", "")),
            "severity": sev if sev in SEC_LEVELS else "info",
            "title": trim(r.get("title", ""), 160),
            "where": plain(r.get("where", "")),
            "status": st if st in SEC_STATUS else "open",
            "note": trim(r.get("fix or note", r.get("note", "")), 200),
        })
    so, vo = {s: i for i, s in enumerate(SEC_STATUS)}, {s: i for i, s in enumerate(SEC_LEVELS)}
    rows.sort(key=lambda r: (so[r["status"]], vo[r["severity"]], r["id"]))
    counts = {s: {"open": sum(1 for r in rows if r["severity"] == s and r["status"] == "open"),
                  "total": sum(1 for r in rows if r["severity"] == s)} for s in SEC_LEVELS}
    return dict(head, findings=rows, counts=counts, has_table=header is not None,
                open_total=sum(1 for r in rows if r["status"] == "open"))


def lane_of(row):
    """'value' or 'foundation' for a backlog row. See LANE_OVERRIDES for the rule."""
    tags = set(row.get("tags") or [])
    if tags & {"value", "feature"}:
        return "value"
    if tags & FOUNDATION_TAGS:
        return "foundation"
    rid = row.get("id", "")
    if rid in LANE_OVERRIDES:
        return LANE_OVERRIDES[rid]
    if re.fullmatch(r"R\d+", rid) or "refactor" in row.get("note", "").lower():
        return "foundation"
    return "value"


def release_tasks(row, plan):
    """PLAN tasks of a release: rows with its id as milestone, plus ids named in
    its Plan tasks cell (T55 also finds T55a and T55b)."""
    named = set(re.findall(r"\b[A-Z]{1,2}\d+[a-z]?\b", row.get("tasks", "")))
    out = []
    for t in plan:
        base = re.sub(r"[a-z]$", "", t["id"])
        if t["milestone"] == row.get("id") or t["id"] in named or base in named:
            out.append(t)
    return out


ROADMAP_GROUPS = (("next", "Now", "the release being built"),
                  ("candidate", "Then", "candidates in rank order"),
                  ("later", "Later", "after the candidates"))


def roadmap(backlog, plan, debt):
    """Proposed sequence. Columns: Now (status next), Then (candidates), Later,
    and Tech debt to schedule. Rows keep their backlog rank order. Every card
    gets a number per lane (1 is next up in that lane). Shipped and dropped
    releases are left out and only counted."""
    rows = backlog if isinstance(backlog, list) else []
    plan = plan if isinstance(plan, list) else []
    seq = {"value": 0, "foundation": 0}
    columns = []
    claimed = set()

    def rank(r):
        return (0, int(r["rank"])) if r["rank"].isdigit() else (1, 0)

    for chip, name, sub in ROADMAP_GROUPS:
        lanes = {"value": [], "foundation": []}
        for r in sorted((r for r in rows if r["chip"] == chip), key=rank):
            tasks = release_tasks(r, plan)
            claimed.update(t["id"] for t in tasks)
            lanes[lane_of(r)].append({"title": r["release"], "feel": trim(r["feel"], 90), "size": r["size"],
                                      "tasks": tasks, "badge": "", "lane": lane_of(r)})
        if chip == "next":
            # Open refactor rounds from PLAN.md (R2, R3...) that are not a backlog row.
            rounds = {}
            for t in plan:
                if re.fullmatch(r"R\d+", t["milestone"]) and t["id"] not in claimed:
                    rounds.setdefault(t["milestone"], []).append(t)
            for mid, tasks in rounds.items():
                if any(t["status"] != "done" for t in tasks):
                    lanes["foundation"].append({"title": "%s refactor round" % mid, "feel": "", "size": "",
                                                "tasks": tasks, "badge": "", "lane": "foundation"})
        columns.append({"name": name, "sub": sub, "lanes": lanes})
    items = debt["items"] if isinstance(debt, dict) else []
    if items:
        columns.append({"name": "Tech debt to schedule", "sub": "open items, major first", "lanes": {
            "value": [],
            "foundation": [{"title": x["id"], "feel": trim(x["item"], 70), "size": x["size"],
                            "tasks": [], "badge": x["severity"], "lane": "foundation"} for x in items]}})
    columns = [c for c in columns if c["lanes"]["value"] or c["lanes"]["foundation"]]
    for c in columns:
        for key in ("value", "foundation"):
            for card in c["lanes"][key]:
                seq[key] += 1
                card["seq"] = seq[key]
    return {"columns": columns, "open": seq,
            "shipped": sum(1 for r in rows if r["chip"] == "shipped")}


# ---------- collectors (touch the disk and git) ----------

def collect_tests():
    res = {"e2e_specs": UNKNOWN, "e2e_tests": UNKNOWN, "unit_files": UNKNOWN, "unit_tests": UNKNOWN}
    e2e = os.path.join(ROOT, "tests", "e2e")
    if os.path.isdir(e2e):
        files = [os.path.join(e2e, f) for f in os.listdir(e2e) if f.endswith(".spec.ts")]
        res["e2e_specs"] = len(files)
        res["e2e_tests"] = sum(count_tests(read(os.path.relpath(f, ROOT)) or "") for f in files)
    src = os.path.join(ROOT, "src")
    if os.path.isdir(src):
        files = [os.path.join(d, f) for d, _, fs in os.walk(src) for f in fs if f.endswith(".test.ts")]
        res["unit_files"] = len(files)
        res["unit_tests"] = sum(count_tests(read(os.path.relpath(f, ROOT)) or "") for f in files)
    return res


def collect_git():
    res = {"branch": UNKNOWN, "commits": [], "ahead": UNKNOWN, "tags": []}
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch is None:
        return res
    res["branch"] = branch
    log = git("log", "-5", "--date=short", "--format=%h%x09%ad%x09%s") or ""
    for line in log.splitlines():
        parts = line.split("\t", 2)
        if len(parts) == 3:
            res["commits"].append({"sha": parts[0], "date": parts[1], "subject": parts[2]})
    if git("rev-parse", "--verify", "--quiet", "origin/main") is not None:
        n = git("rev-list", "--count", "origin/main..HEAD")
        if n is not None and n.isdigit():
            res["ahead"] = int(n)
    tags = git("tag", "--sort=-v:refname") or ""
    res["tags"] = [t for t in tags.splitlines() if t][:5]
    return res


def collect_modules():
    base = os.path.join(ROOT, "docs", "modules")
    if not os.path.isdir(base):
        return UNKNOWN
    mods = []
    for name in sorted(os.listdir(base)):
        folder = os.path.join(base, name)
        if not os.path.isdir(folder):
            continue
        mod = {"folder": name, "title": name, "subject": UNKNOWN, "topics": UNKNOWN, "questions": UNKNOWN}
        try:
            meta = json.loads(read(os.path.join("docs", "modules", name, "module.json")) or "{}")
            mod["title"] = meta.get("title") or name
            mod["subject"] = meta.get("subject") or UNKNOWN
            count, topics = 0, 0
            for f in sorted(os.listdir(folder)):
                if not f.endswith(".json") or f == "module.json":
                    continue
                data = json.loads(read(os.path.join("docs", "modules", name, f)) or "{}")
                if isinstance(data, dict) and isinstance(data.get("items"), list):
                    topics += 1
                    count += len(data["items"])
            if topics:
                mod["topics"], mod["questions"] = topics, count
        except (ValueError, AttributeError, OSError):
            pass
        mods.append(mod)
    return mods


AUTO_DEPLOY_SINCE = "2026-10-24"  # decision 98: main deploys through Workers Builds


def collect_deploy_dates():
    """Commit dates of the first parent line of origin/main since auto deploys began.

    A push or merge to main deploys through Cloudflare Workers Builds only since decision 98
    (2026-10-24); older main commits did not deploy, so they are not counted.
    """
    if git("rev-parse", "--verify", "--quiet", "origin/main") is None:
        return UNKNOWN
    out = git("log", "--first-parent", "origin/main", "--date=short", "--format=%ad")
    if out is None:
        return UNKNOWN
    return [d for d in out.splitlines() if d >= AUTO_DEPLOY_SINCE]


def collect():
    plan_text = read("docs/PLAN.md")
    tasks = parse_plan(plan_text)
    today = datetime.datetime.now(datetime.timezone.utc).date()
    changelog = read("CHANGELOG.md")
    backlog = parse_backlog(read("docs/BACKLOG.md"))
    debt = parse_tech_debt(read("docs/TECH-DEBT.md"))
    return {
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "version": parse_package_version(read("package.json")),
        "changelog": parse_changelog(changelog),
        "releases": release_metrics(changelog, today),
        "ci": ci_metrics(parse_ci_runs(read("metrics/ci-runs.json")), today),
        "deploys": deploy_metrics(collect_deploy_dates(), today),
        "cf": cf_metrics(parse_cf_builds(read("metrics/cf-builds.json")),
                         datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)),
        "security": parse_security_audit(read("docs/SECURITY-AUDIT.md")),
        "debt": debt,
        "backlog": backlog,
        "roadmap": roadmap(backlog, parse_plan_tasks(plan_text), debt),
        "tasks": tasks,
        "decisions": parse_decisions(read("docs/DECISIONS.md")),
        "status": parse_status(read("docs/STATUS.md")),
        "friction": parse_friction(read("docs/FRICTION.md")),
        "tests": collect_tests(),
        "git": collect_git(),
        "modules": collect_modules(),
        "sources": SOURCES,
    }


# ---------- output ----------

def e(x):
    return html.escape(str(x))


def n_of(x, key=None):
    """Length of a list, a field of a dict, or UNKNOWN."""
    if x == UNKNOWN or x is None:
        return UNKNOWN
    if key is not None:
        return x.get(key, UNKNOWN)
    return len(x)


def tile(label, value, sub="", state=""):
    return ('<div class="tile %s"><div class="label">%s</div><div class="value">%s</div>'
            '<div class="sub">%s</div></div>' % (state, e(label), e(value), e(sub)))


def empty(msg):
    return '<p class="muted">%s</p>' % e(msg)


def bars(values, weeks, title, unit=""):
    """Small inline SVG bar chart, one bar per week. No JS."""
    nums = [v for v in values if isinstance(v, (int, float))]
    top = max(nums) if nums and max(nums) > 0 else 1
    rects = []
    for i, (v, w) in enumerate(zip(values, weeks)):
        x = i * 14 + 2
        if isinstance(v, (int, float)):
            h = max(1.5, 36.0 * v / top) if v else 1.5
            rects.append('<rect x="%d" y="%.1f" width="10" height="%.1f" rx="1.5"%s><title>%s: %s%s</title></rect>'
                         % (x, 40 - h, h, ' class="zero"' if not v else "", e(w), e(v), e(unit)))
        else:
            rects.append('<rect x="%d" y="38.5" width="10" height="1.5" class="zero"><title>%s: no data</title></rect>'
                         % (x, e(w)))
    last = values[-1] if values else UNKNOWN
    return ('<figure class="spark"><figcaption>%s <b>%s%s</b> <span class="muted">this week</span></figcaption>'
            '<svg viewBox="0 0 %d 40" preserveAspectRatio="none" role="img" aria-label="%s">%s</svg>'
            '<div class="axis"><span>%s</span><span>%s</span></div></figure>'
            % (e(title), e(last), e(unit) if isinstance(last, (int, float)) else "", len(weeks) * 14, e(title),
               "".join(rects), e(weeks[0] if weeks else ""), e(weeks[-1] if weeks else "")))


def delivery_html(d):
    ci, dep, rel, t = d.get("ci", UNKNOWN), d.get("deploys", UNKNOWN), d.get("releases", UNKNOWN), d["tests"]
    cl = d["changelog"]
    get = lambda x, k: UNKNOWN if x == UNKNOWN else x[k]
    p30, pm = get(ci, "pass_rate_30"), get(ci, "main_pass_rate")
    state = lambda v: "" if not isinstance(v, (int, float)) else "ok" if v >= 90 else "warn" if v >= 70 else "bad"
    with_pct = lambda v: "%s%%" % v if isinstance(v, (int, float)) else v
    tiles = "".join([
        tile("CI pass rate", with_pct(p30), "last %s finished runs" % get(ci, "decided_30"), state(p30)),
        tile("Main pass rate", with_pct(pm), "last %s runs on main" % get(ci, "main_decided"), state(pm)),
        tile("CI time", "%s min" % get(ci, "median_min") if ci != UNKNOWN else UNKNOWN,
             "median, p90 %s min" % get(ci, "p90_min")),
        tile("Deploys", get(dep, "total"), "merges to main, last %s" % get(dep, "last")),
        tile("Releases", get(rel, "count"), "median %s days apart" % get(rel, "median_gap_days")),
        tile("Since last release", "%s days" % get(rel, "days_since_last") if rel != UNKNOWN else UNKNOWN,
             "%s changes waiting" % cl["unreleased"],
             "warn" if rel != UNKNOWN and rel["days_since_last"] > 14 and cl["unreleased"] not in (0, UNKNOWN) else ""),
    ])
    charts = []
    if ci != UNKNOWN:
        charts.append(bars(ci["runs_per_week"], ci["weeks"], "CI runs per week"))
        charts.append(bars(ci["pass_per_week"], ci["weeks"], "CI pass rate per week", "%"))
    if dep != UNKNOWN:
        charts.append(bars(dep["per_week"], dep["weeks"], "Deploys per week"))
    lines = []
    if ci == UNKNOWN:
        lines.append(e("No CI data. Run python3 scripts/ci_runs.py to refresh metrics/ci-runs.json."))
    else:
        for label, f in (("Last failure", ci["last_failure"]), ("Last failure on main", ci["last_main_failure"])):
            lines.append("%s: %s" % (e(label), "none" if f is None else '%s on <span class="mono">%s</span>, <a href="%s">the run</a>' % (
                e(f["date"]), e(f["branch"]), e(f["url"]))))
    if dep == UNKNOWN:
        lines.append(e("Deploys unknown: no origin/main in git."))
    lines.append(e("Tests: %s e2e specs with %s tests, %s unit files with %s tests. The full CI run is the suite time: %s min median." % (
        t["e2e_specs"], t["e2e_tests"], t["unit_files"], t["unit_tests"], get(ci, "median_min"))))
    lines.append(e("A merge to main deploys (Cloudflare Workers Builds, decision 98). Skipped and cancelled runs do not count."))
    return ('<div class="tiles mini">%s</div>%s<ul class="plain small-list">%s</ul>' % (
        tiles, '<div class="charts">%s</div>' % "".join(charts) if charts else "",
        "".join("<li>%s</li>" % l for l in lines)))


def debt_html(debt):
    if debt == UNKNOWN:
        return empty("unknown: no table found in docs/TECH-DEBT.md.")
    c = debt["open"]
    counts = '<div class="counts">%s</div>' % "".join(
        '<div class="count %s%s"><b>%d</b><span>%s</span></div>' % (s, " hot" if s == "major" and c[s] else "", c[s], s)
        for s in SEVERITIES)
    if not debt["items"]:
        return counts + empty("No open tech debt.")
    rows = "".join(
        '<tr><td data-l="Id" class="mono">%s</td><td data-l="Severity"><span class="chip sev-%s">%s</span></td>'
        '<td data-l="Item">%s</td><td data-l="Where" class="mono small">%s</td><td data-l="Size">%s</td></tr>'
        % (e(r["id"]), e(r["severity"]), e(r["severity"]), e(r["item"]), e(r["where"]), e(r["size"]))
        for r in debt["items"])
    return (counts + '<p class="muted small">%d open of %d rows in docs/TECH-DEBT.md.</p>' % (debt["open_total"], debt["total"])
            + '<table class="stack debt"><thead><tr><th>Id</th><th>Severity</th><th>Item</th><th>Where</th><th>Size</th></tr></thead>'
            '<tbody>%s</tbody></table>' % rows)


def render_roadmap(rm):
    cols = rm["columns"] if isinstance(rm, dict) else []
    if not cols:
        return ('<section class="card"><h2>Roadmap</h2>%s</section>' % empty(
            "No roadmap yet. Give releases the status next, candidate or later in the Ranked backlog "
            "table of docs/BACKLOG.md."))

    def task(t):
        return '<span class="chip id t-%s" title="%s">%s</span>' % (e(t["status"]), e(t["status"]), e(t["id"]))

    def card(c):
        badges = "".join([
            '<span class="chip sev-%s">%s</span>' % (e(c["badge"]), e(c["badge"])) if c["badge"] else "",
            '<span class="size">%s</span>' % e(c["size"]) if c["size"] else ""])
        tasks = ('<div class="rm-tasks">%s</div>' % "".join(task(t) for t in c["tasks"])) if c["tasks"] else ""
        return '<li class="rm-card"><span class="seq">%d</span><span class="t"><b>%s</b>%s</span>%s%s</li>' % (
            c["seq"], e(c["title"]), '<br><span class="muted small">%s</span>' % e(c["feel"]) if c["feel"] else "",
            '<span class="b">%s</span>' % badges if badges else "", tasks)

    head = "".join('<div class="rm-col-h"><b>%s</b><span class="muted small">%s</span></div>' % (
        e(c["name"]), e(c["sub"])) for c in cols)
    rows = ""
    for key, label, sub in LANES:
        rows += '<div class="rm-lane-h %s"><b>%s</b><span class="muted small">%s, %d open</span></div>' % (
            key, e(label), e(sub), rm["open"][key])
        rows += "".join('<ul class="rm-cell %s">%s</ul>' % (
            key, "".join(card(x) for x in c["lanes"][key]) or '<li class="muted small">none</li>') for c in cols)
    return ('<section class="card"><h2>Roadmap: proposed sequence</h2>'
            '<p class="muted small">Columns follow the status in the Ranked backlog of docs/BACKLOG.md, rows keep '
            'its rank. Numbers are the suggested order within each lane. Task chips come from docs/PLAN.md '
            '(green is done). Open items in docs/TECH-DEBT.md join the foundation lane. %d releases shipped, '
            'not shown. Lane rule: LANE_OVERRIDES and #foundation or #value tags in scripts/dashboard.py.</p>'
            '<div class="scroll"><div class="rm" style="--cols:%d">'
            '<div class="rm-corner"></div>%s%s</div></div></section>' % (rm.get("shipped", 0), len(cols), head, rows))


def when(iso_time):
    t = to_time(iso_time)
    return t.strftime("%Y-%m-%d %H:%M UTC") if t else UNKNOWN


def link_btn(href, label):
    return '<a class="btn" href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (e(href), e(label))


def render_deploy(m):
    """The Deploy tab: Cloudflare Workers Builds from the check runs GitHub records (decision 122)."""
    if m == UNKNOWN:
        return ('<section class="card"><h2>Deploy</h2><div class="btns">%s</div>%s</section>' % (
            link_btn(LIVE_URL, "Open the live site"), empty(
                "No build data yet. Run python3 scripts/ci_runs.py to fetch the Cloudflare builds into "
                "metrics/cf-builds.json, then python3 scripts/dashboard.py.")))
    with_pct = lambda v: "%s%%" % v if isinstance(v, (int, float)) else v
    state = lambda v: "" if not isinstance(v, (int, float)) else "ok" if v >= 90 else "warn" if v >= 70 else "bad"
    last, live = m["last_prod"], m["live"] or {}
    btns = link_btn(m["live_url"], "Open the live site")
    btns += link_btn(m["service_url"], "Cloudflare dashboard") if m["service_url"] else (
        '<span class="muted small">Cloudflare dashboard link unknown: no build with a details link yet.</span>')
    if live.get("status"):
        live_tile = tile("Live check", "HTTP %s" % live["status"], "%s ms, %s" % (live.get("ms"), when(live.get("checked_at"))),
                         "ok" if 200 <= live["status"] < 400 else "bad")
    else:
        live_tile = tile("Live check", "not checked", "the network or proxy blocked the GET" if live.get("error") else "no check yet")
    any_last = m["last_prod_any"]
    last_failed = any_last is not None and any_last["result"] != "success"
    days = m["days_since_deploy"]
    tiles = "".join([
        tile("Last production deploy", when(last["completed_at"])[:10] if last else "none",
             "%s, %s, %s, build %s" % (when(last["completed_at"])[11:], last["sha"], last["result"], dur(last["secs"]))
             if last else "no successful build",
             "bad" if last_failed else "ok" if last else ""),
        tile("Production deploys", "%s / %s" % (m["prod_7"], m["prod_30"]), "last 7 / 30 days, %s failed in 30" % m["failed_30"],
             "warn" if m["failed_30"] else ""),
        tile("Build success", with_pct(m["prod_rate"]), "production, %s builds" % m["prod_decided"], state(m["prod_rate"])),
        tile("Preview success", with_pct(m["preview_rate"]), "previews, %s builds" % m["preview_decided"], state(m["preview_rate"])),
        tile("Build time", dur(m["median_secs"]), "median, p90 %s, push to done" % dur(m["p90_secs"])),
        tile("Merge to live", dur(m["m2l_median"]), "median of %s, last %s" % (
            m["m2l_n"], dur(last["merge_to_live"]) if last else UNKNOWN)),
        tile("Since last deploy", "%s days" % days if days != UNKNOWN else UNKNOWN, "successful production build",
             "warn" if isinstance(days, int) and days > 14 else ""),
        live_tile,
    ])
    rows = "".join(
        '<tr><td data-l="Env"><span class="chip env-%s">%s</span></td><td data-l="Branch" class="mono small">%s</td>'
        '<td data-l="Sha" class="mono sha">%s</td><td data-l="Result"><span class="chip r-%s">%s</span></td>'
        '<td data-l="Time" class="num">%s</td><td data-l="Done" class="small">%s</td><td data-l="Link">%s</td></tr>' % (
            e(b["env"]), e(b["env"]), e(b["branch"]), e(b["sha"]), e(b["result"]), e(b["result"]), e(dur(b["secs"])),
            e(when(b["completed_at"])), '<a href="%s" target="_blank" rel="noopener noreferrer">build</a>' % e(b["url"])
            if b["url"] else "")
        for b in m["last10"])
    table = ('<table class="stack builds"><thead><tr><th>Env</th><th>Branch</th><th>Sha</th><th>Result</th><th>Time</th>'
             '<th>Done</th><th>Link</th></tr></thead><tbody>%s</tbody></table>' % rows) if rows else empty("No builds in the cache.")
    return ('<section class="card"><h2>Deploy</h2><div class="btns">%s</div>'
            '<div class="tiles mini">%s</div><div class="charts">%s</div>'
            '<h2>Last 10 builds</h2>%s'
            '<p class="muted small">From the check runs "Workers Builds: *" that Cloudflare records on GitHub, for the '
            'first parent commits on main and the branch heads of the last 60 days (decisions 98 and 122). A merge to '
            'main deploys. Build time runs from the push to the build done, so it includes the queue. Merge to live '
            'runs from the merge commit to the production build done. Fetched %s. Run python3 scripts/ci_runs.py to '
            'refresh.</p></section>' % (
                btns, tiles, bars(m["per_week"], m["weeks"], "Production deploys per week"), table, e(when(m["fetched_at"]))))


def render_security(a):
    """The Security tab: the last audit in docs/SECURITY-AUDIT.md (decision 122)."""
    how = ('<p class="muted small">To add one, run an audit and write docs/SECURITY-AUDIT.md in the format in '
           'docs/PLATFORM.md, section Security audit.</p>')
    if a == UNKNOWN:
        return '<section class="card"><h2>Security</h2><p><b>No security audit yet.</b></p>%s</section>' % how
    head = "<dl>%s</dl>" % "".join("<dt>%s</dt><dd>%s</dd>" % (e(label), e(a[k])) for k, label in (
        ("date", "Date"), ("scope", "Scope"), ("auditor", "Auditor or tool"), ("summary", "Summary")))
    c = a["counts"]
    counts = '<div class="counts five">%s</div>' % "".join(
        '<div class="count sec-%s%s"><b>%d</b><span>%s</span><span class="of">open of %d</span></div>' % (
            s, " hot" if c[s]["open"] else "", c[s]["open"], s, c[s]["total"]) for s in SEC_LEVELS)
    if not a["findings"]:
        table = empty("No findings in the table." if a["has_table"] else "No findings table found.")
    else:
        table = ('<table class="stack sec"><thead><tr><th>Id</th><th>Severity</th><th>Title</th><th>Where</th><th>Status</th>'
                 '<th>Fix or note</th></tr></thead><tbody>%s</tbody></table>' % "".join(
                     '<tr class="st-%s"><td data-l="Id" class="mono">%s</td><td data-l="Severity"><span class="chip sev-%s">%s</span></td>'
                     '<td data-l="Title">%s</td><td data-l="Where" class="mono small">%s</td>'
                     '<td data-l="Status"><span class="chip st-%s">%s</span></td><td data-l="Fix or note">%s</td></tr>' % (
                         e(r["status"]), e(r["id"]), e(r["severity"]), e(r["severity"]), e(r["title"]), e(r["where"]),
                         e(r["status"]), e(r["status"]), e(r["note"])) for r in a["findings"]))
    return ('<section class="card"><h2>Security audit</h2>%s%s<p class="muted small">%d open of %d findings in '
            'docs/SECURITY-AUDIT.md, open first, then by severity.</p>%s%s</section>' % (
                head, counts, a["open_total"], len(a["findings"]), table,
                '<p class="muted small">Format: docs/PLATFORM.md, section Security audit.</p>'))


REFRESH_JS = """(function () {
  var TRIGGER = %(trigger)s, SERVER = %(server)s, TOOL = %(tool)s;
  var btn = document.getElementById("refresh-btn");
  var msg = document.getElementById("refresh-msg");
  if (!btn || !msg) return;
  var mcp = null, busy = false;
  function say(text) { msg.textContent = text; }
  function unavailable(text) { btn.hidden = true; btn.disabled = true; say(text); }
  function fail(err) {
    var code = (err && err.code) || "upstream_error";
    if (code === "blocked_by_policy" || code === "not_in_manifest") {
      return unavailable("Ververs is hier niet beschikbaar (" + code + ").");
    }
    var text = {
      needs_reauth: "Verbind " + SERVER + " opnieuw in claude.ai, Instellingen, Connectors.",
      server_not_connected: "Voeg " + SERVER + " toe in claude.ai, Instellingen, Connectors.",
      approval_required: "Ververs heeft je toestemming nodig. Klik opnieuw en kies Toestaan.",
      consent_required: "Ververs heeft je toestemming nodig. Klik opnieuw en kies Toestaan.",
      server_unavailable: "Niet zeker of het bijwerken is gestart. Wacht een paar minuten.",
      upstream_error: "Niet zeker of het bijwerken is gestart. Wacht een paar minuten."
    }[code] || "Bijwerken lukte niet.";
    var again = err && err.retryable === true || code === "approval_required" || code === "consent_required";
    say(text + " (" + code + ")" + (again ? "" : " Opnieuw proberen kan nu niet."));
    btn.disabled = !again;
  }
  btn.addEventListener("click", function () {
    if (!mcp || busy) return;
    busy = true; btn.disabled = true; say("Bezig...");
    var listed = typeof mcp.listTools === "function" ? mcp.listTools(SERVER) : Promise.resolve(null);
    listed.then(function (res) {
      if (res) {
        var ok = (res.servers || []).some(function (s) {
          return s.server === SERVER && (s.tools || []).some(function (t) { return t.name === TOOL; });
        });
        if (!ok) { unavailable("Ververs is hier niet beschikbaar."); return; }
      }
      return mcp.callTool(SERVER, TOOL, { trigger_id: TRIGGER }).then(function () {
        say("Bijwerken gestart. De pagina laadt zichzelf opnieuw over een paar minuten.");
        setTimeout(function () { btn.disabled = false; }, 120000);
      });
    }).catch(fail).then(function () { busy = false; });
  });
  var use = window.claude && window.claude.use;
  Promise.resolve(typeof use === "function" ? window.claude.use("mcp") : null)
    .catch(function () { return null; })
    .then(function (ns) {
      if (!ns) return unavailable("Ververs werkt alleen in claude.ai.");
      mcp = ns; btn.hidden = false; btn.disabled = false; say("");
    });
})();"""

SAFE_TRIGGER = re.compile(r"^[A-Za-z0-9_-]{1,100}$")


def refresh_html(generated, trigger):
    """The Gemaakt line, plus the Ververs button when a trigger id is set.
    The button starts hidden; the script shows it only when the mcp capability resolves."""
    made = '<span class="muted small">Gemaakt: %s</span>' % e(generated)
    if not trigger or not SAFE_TRIGGER.match(trigger):
        return '<div class="refresh">%s</div>' % made
    js = REFRESH_JS % {"trigger": json.dumps(trigger), "server": json.dumps(REFRESH_SERVER),
                       "tool": json.dumps(REFRESH_TOOL)}
    return ('<div class="refresh" data-trigger="%s"><button type="button" id="refresh-btn" hidden>Ververs</button>%s'
            '<span id="refresh-msg" class="muted small" role="status">Ververs werkt alleen in claude.ai.</span></div>'
            '<script>%s</script>' % (e(trigger), made, js))


def render(d, refresh_trigger=None):
    if refresh_trigger is None:
        refresh_trigger = REFRESH_TRIGGER
    cl, dec, fr, t, g = d["changelog"], d["decisions"], d["friction"], d["tests"], d["git"]
    open_dec = n_of(dec["open"]) if dec != UNKNOWN else UNKNOWN
    tasks_n = n_of(d["tasks"])
    debt = d.get("debt", UNKNOWN)
    major = UNKNOWN if debt == UNKNOWN else debt["open"]["major"]

    tiles = "".join([
        tile("Version", d["version"], "last release %s, %s" % (cl["latest"], cl["latest_date"])),
        tile("Unreleased changes", cl["unreleased"], "waiting in CHANGELOG",
             "warn" if isinstance(cl["unreleased"], int) and cl["unreleased"] else ""),
        tile("Open tasks", tasks_n, "in docs/PLAN.md"),
        tile("Founder decisions", open_dec, "open, need an answer",
             "bad" if isinstance(open_dec, int) and open_dec else "ok" if open_dec == 0 else ""),
        tile("E2e specs", t["e2e_specs"], "%s tests" % t["e2e_tests"]),
        tile("Unit test files", t["unit_files"], "%s tests" % t["unit_tests"]),
        tile("Tech debt", n_of(debt, "open_total") if debt != UNKNOWN else UNKNOWN,
             "open, %s major" % major, "bad" if isinstance(major, int) and major else "ok" if major == 0 else ""),
    ])

    s = d["status"]
    status = "<dl>%s</dl>" % "".join(
        "<dt>%s</dt><dd>%s</dd>" % (e(label), e(s[k]))
        for k, label in [("phase", "Phase"), ("current", "Current release"),
                         ("next", "Next step"), ("blockers", "Blockers")])

    if d["backlog"] == UNKNOWN:
        roadmap = empty("unknown: no Ranked backlog table found in docs/BACKLOG.md.")
    else:
        roadmap = ('<table class="stack"><thead><tr><th>Release</th><th>What the kids feel</th>'
                   '<th>Size</th><th>Status</th></tr></thead><tbody>%s</tbody></table>' % "".join(
                       '<tr><td data-l="Release"><b>%s</b>%s</td><td data-l="Kids feel">%s</td>'
                       '<td data-l="Size">%s</td><td data-l="Status"><span class="chip %s">%s</span>%s</td></tr>'
                       % (e(r["release"]), ' <span class="muted small">%s</span>' % e(r["note"]) if r["note"] else "",
                          e(r["feel"] or "none given"), e(r["size"] or "none"), e(r["chip"]),
                          e(r["chip"] if r["chip"] != "other" else (r["status"] or UNKNOWN)),
                          '<br><span class="muted small">%s</span>' % e(trim(r["status"].split(" ", 1)[1], 80))
                          if r["chip"] != "other" and " " in r["status"] else "")
                       for r in d["backlog"]))

    if dec == UNKNOWN:
        founder = recent = empty("unknown: docs/DECISIONS.md not found.")
    else:
        founder = ('<ul class="plain alert">%s</ul>' % "".join(
            '<li><span class="mono">%d</span> <span class="muted">%s</span> %s</li>' % (r["n"], e(r["date"]), e(r["title"]))
            for r in dec["open"])) if dec["open"] else empty("None open. The founder has answered every decision.")
        recent = ('<p class="muted small">%d decisions in the log.</p><ul class="plain">%s</ul>' % (
            dec["total"], "".join(
                '<li><span class="mono">%d</span> <span class="muted">%s</span> %s</li>' % (r["n"], e(r["date"]), e(r["title"]))
                for r in dec["last"]))) if dec["last"] else empty("No decision rows found.")

    if fr == UNKNOWN:
        friction = empty("unknown: docs/FRICTION.md not found.")
    elif not fr["last"]:
        friction = empty("No friction logged yet.")
    else:
        friction = '<p class="muted small">%d lines in the log.</p><ul class="plain">%s</ul>' % (
            fr["total"], "".join('<li><span class="muted">%s</span> <b>%s</b>: %s</li>' % (
                e(r["date"]), e(r["area"]), e(r["text"])) for r in fr["last"]))

    ahead = g["ahead"]
    commits_meta = "Branch <span class=\"mono\">%s</span>%s%s" % (
        e(g["branch"]),
        (", %s commit%s ahead of origin/main" % (e(ahead), "" if ahead == 1 else "s")) if ahead != UNKNOWN
        else ", origin/main unknown",
        ", tags: %s" % e(", ".join(g["tags"])) if g["tags"] else ", no git tags")
    commits = '<p class="muted small">%s.</p>%s' % (commits_meta, (
        '<ul class="plain">%s</ul>' % "".join(
            '<li><span class="mono">%s</span> <span class="muted">%s</span> %s</li>' % (
                e(c["sha"]), e(c["date"]), e(c["subject"])) for c in g["commits"])
    ) if g["commits"] else empty("unknown: no git history."))

    tasks = (empty("unknown: docs/PLAN.md not found.") if d["tasks"] == UNKNOWN else
             '<p class="ids">%s</p>' % "".join('<span class="chip id">%s</span>' % e(i) for i in d["tasks"])
             if d["tasks"] else empty("No open tasks."))

    mods = d["modules"]
    if mods == UNKNOWN:
        modules = empty("unknown: docs/modules not found.")
    else:
        modules = ('<table class="stack"><thead><tr><th>Module</th><th>Subject</th><th>Topics</th><th>Questions</th></tr></thead>'
                   '<tbody>%s</tbody></table>' % "".join(
                       '<tr><td data-l="Module"><b>%s</b><br><span class="muted small mono">%s</span></td>'
                       '<td data-l="Subject">%s</td><td data-l="Topics" class="num">%s</td><td data-l="Questions" class="num">%s</td></tr>'
                       % (e(m["title"]), e(m["folder"]), e(m["subject"]), e(m["topics"]), e(m["questions"]))
                       for m in mods)) if mods else empty("No module folders.")

    def card(title, body, cls=""):
        return '<section class="card %s"><h2>%s</h2>%s</section>' % (cls, e(title), body)

    body = "".join([
        card("Where we are", status, "wide"),
        card("Ranked backlog", roadmap, "wide"),
        card("Open founder decisions", founder, "attn" if dec != UNKNOWN and dec["open"] else ""),
        card("Open tasks (%s)" % tasks_n, tasks),
        card("Recent decisions", recent),
        card("Recent friction", friction),
        card("Delivery", delivery_html(d), "wide"),
        card("Tech debt", debt_html(debt), "wide"),
        card("Recent commits", commits, "wide"),
        card("Learning modules", modules, "wide"),
    ])
    return PAGE.format(tiles=tiles, body=body, generated=e(d["generated"]),
                       refresh=refresh_html(d["generated"], refresh_trigger),
                       sources=e(", ".join(d["sources"])), roadmap=render_roadmap(d.get("roadmap")),
                       deploy=render_deploy(d.get("cf", UNKNOWN)), security=render_security(d.get("security", UNKNOWN)))


def sub_get(d, part, key):
    x = d.get(part, UNKNOWN)
    return UNKNOWN if x == UNKNOWN else x.get(key, UNKNOWN)


def ci_get(d, key):
    return sub_get(d, "ci", key)


def debt_line(debt):
    if debt == UNKNOWN:
        return UNKNOWN
    c = debt["open"]
    return "%d (%d major, %d medium, %d low)" % (debt["open_total"], c["major"], c["medium"], c["low"])


def cf_line(m):
    if m == UNKNOWN:
        return "no data (run python3 scripts/ci_runs.py)"
    last = m["last_prod"]
    return "last deploy %s (%s), %s in 7 days, %s in 30, production %s%% ok, build %s median" % (
        when(last["completed_at"]) if last else "none", last["sha"] if last else "none",
        m["prod_7"], m["prod_30"], m["prod_rate"], dur(m["median_secs"]))


def security_line(a):
    if a == UNKNOWN:
        return "no audit yet"
    return "%s, %d open (%s)" % (a["date"], a["open_total"], ", ".join(
        "%d %s" % (a["counts"][s]["open"], s) for s in SEC_LEVELS if a["counts"][s]["open"]) or "none")


def summary(d):
    cl, dec, fr, s = d["changelog"], d["decisions"], d["friction"], d["status"]
    nxt = UNKNOWN
    if d["backlog"] != UNKNOWN:
        nxt = next((r["release"] for r in d["backlog"] if r["chip"] == "next"), "none marked next")
    rows = [
        ("Version", "%s (last release %s, %s)" % (d["version"], cl["latest"], cl["latest_date"])),
        ("Unreleased changes", cl["unreleased"]),
        ("Next release", nxt),
        ("Open tasks", n_of(d["tasks"])),
        ("Open founder decisions", UNKNOWN if dec == UNKNOWN else len(dec["open"])),
        ("Decisions logged", n_of(dec, "total") if dec != UNKNOWN else UNKNOWN),
        ("Friction lines", n_of(fr, "total") if fr != UNKNOWN else UNKNOWN),
        ("Tests", "%s e2e specs, %s unit test files" % (d["tests"]["e2e_specs"], d["tests"]["unit_files"])),
        ("CI", UNKNOWN if d.get("ci", UNKNOWN) == UNKNOWN else "%s%% pass (last 30), main %s%%, median %s min" % (
            ci_get(d, "pass_rate_30"), ci_get(d, "main_pass_rate"), ci_get(d, "median_min"))),
        ("Deploys and releases", "%s deploys, %s releases, %s days since the last" % (
            sub_get(d, "deploys", "total"), sub_get(d, "releases", "count"), sub_get(d, "releases", "days_since_last"))),
        ("Tech debt open", debt_line(d.get("debt", UNKNOWN))),
        ("Cloudflare builds", cf_line(d.get("cf", UNKNOWN))),
        ("Security audit", security_line(d.get("security", UNKNOWN))),
        ("Branch", "%s, %s ahead of origin/main" % (d["git"]["branch"], d["git"]["ahead"])),
        ("Blockers", trim(s["blockers"], 120)),
    ]
    out = ["# Minespel dashboard", "", "| What | Now |", "|---|---|"]
    out += ["| %s | %s |" % (k, str(v).replace("|", "/")) for k, v in rows]
    out += ["", "Generated %s." % d["generated"]]
    return "\n".join(out) + "\n"


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Minespel dashboard</title>
<style>
:root {{
  --bg:#f6f7f9; --surface:#ffffff; --text:#1b1f24; --muted:#5b6470; --border:#dfe3e8;
  --accent:#2f6fdb; --ok:#1f8a4c; --ok-bg:#e6f4ec; --bad:#c23934; --bad-bg:#fbeaea;
  --warn:#9a6700; --warn-bg:#fff4d6; --track:#e9edf2; --info-bg:#e7efff;
  color-scheme: light dark;
}}
@media (prefers-color-scheme: dark) {{
  :root {{
    --bg:#0f1216; --surface:#171b21; --text:#e6e9ed; --muted:#9aa4b1; --border:#2a313a;
    --accent:#6ea0ff; --ok:#4cc38a; --ok-bg:#12291d; --bad:#ff7b72; --bad-bg:#2d1517;
    --warn:#e3b341; --warn-bg:#2b230f; --track:#262d36; --info-bg:#16233d;
  }}
}}
* {{ box-sizing:border-box; }}
html, body {{ margin:0; background:var(--bg); color:var(--text); }}
body {{ font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; overflow-wrap:anywhere; }}
main {{ max-width:1180px; margin:0 auto; padding:24px 16px 48px; }}
h1 {{ font-size:24px; margin:0 0 4px; }}
h2 {{ font-size:15px; margin:0 0 12px; }}
.muted {{ color:var(--muted); }} .small {{ font-size:12px; }}
.mono {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; }}
.lead {{ color:var(--muted); margin:0 0 20px; }}
.tiles {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:16px; }}
.tile {{ background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; border-top:3px solid var(--border); min-width:0; }}
.tile.ok {{ border-top-color:var(--ok); }} .tile.bad {{ border-top-color:var(--bad); }} .tile.warn {{ border-top-color:var(--warn); }}
.tile .label {{ font-size:12px; color:var(--muted); }}
.tile .value {{ font-size:24px; font-weight:650; font-variant-numeric:tabular-nums; margin:2px 0; }}
.tile .sub {{ font-size:12px; color:var(--muted); }}
.grid {{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }}
.card {{ background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:16px; min-width:0; }}
.card.wide {{ grid-column:1 / -1; }}
.card.attn {{ border-color:var(--bad); background:var(--bad-bg); }}
dl {{ margin:0; display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; }}
dt {{ font-weight:600; font-size:14px; }} dd {{ margin:0; font-size:14px; }}
ul.plain {{ list-style:none; padding:0; margin:0; }}
ul.plain li {{ padding:6px 0; border-bottom:1px solid var(--border); font-size:14px; }}
ul.plain li:last-child {{ border-bottom:0; }}
ul.alert li {{ color:var(--bad); font-weight:600; }}
table {{ width:100%; border-collapse:collapse; font-size:14px; }}
th {{ white-space:nowrap; text-align:left; font-size:12px; color:var(--muted); font-weight:600; padding:6px 8px; border-bottom:1px solid var(--border); }}
td {{ padding:8px; border-bottom:1px solid var(--border); vertical-align:top; }}
tr:last-child td {{ border-bottom:0; }}
td.num {{ font-variant-numeric:tabular-nums; }}
.chip {{ display:inline-block; font-size:12px; padding:2px 9px; border-radius:999px; background:var(--track); white-space:nowrap; }}
.chip.shipped {{ background:var(--ok-bg); color:var(--ok); }}
.chip.next {{ background:var(--info-bg); color:var(--accent); font-weight:600; }}
.chip.candidate {{ background:var(--warn-bg); color:var(--warn); }}
.chip.dropped {{ text-decoration:line-through; color:var(--muted); }}
.ids {{ margin:0; display:flex; flex-wrap:wrap; gap:6px; }}
.chip.id {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; border-radius:6px; }}
.tiles.mini {{ grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); }}
.tiles.mini .tile {{ background:var(--bg); }}
.charts {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:12px; }}
.spark {{ margin:0; min-width:0; }}
.spark figcaption {{ font-size:13px; margin-bottom:6px; }}
.spark svg {{ width:100%; height:48px; display:block; }}
.spark rect {{ fill:var(--accent); }} .spark rect.zero {{ fill:var(--border); }}
.spark .axis {{ display:flex; justify-content:space-between; font-size:11px; color:var(--muted); margin-top:2px; }}
ul.small-list li {{ font-size:13px; }}
a {{ color:var(--accent); }}
.counts {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:12px; }}
.count {{ background:var(--track); border-radius:8px; padding:8px; text-align:center; }}
.count b {{ display:block; font-size:22px; font-variant-numeric:tabular-nums; }}
.count span {{ font-size:12px; color:var(--muted); }}
.count.hot {{ background:var(--bad-bg); }} .count.hot b {{ color:var(--bad); }}
.chip.sev-major {{ background:var(--bad-bg); color:var(--bad); font-weight:600; }}
.chip.sev-medium {{ background:var(--warn-bg); color:var(--warn); }}
table.debt td.mono {{ white-space:nowrap; }}
.refresh {{ display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; margin:-8px 0 20px; }}
.refresh button {{ font:inherit; font-weight:600; min-height:44px; padding:8px 18px; border-radius:8px; border:1px solid var(--accent); background:var(--accent); color:#fff; cursor:pointer; }}
.refresh button:disabled {{ opacity:.55; cursor:default; }}
.refresh button[hidden] {{ display:none; }}
footer {{ margin-top:24px; font-size:12px; color:var(--muted); }}
.tabs {{ display:flex; gap:4px; border-bottom:1px solid var(--border); margin-bottom:16px; }}
.tabs label {{ padding:10px 16px; cursor:pointer; color:var(--muted); border-bottom:2px solid transparent; margin-bottom:-1px; font-weight:600; font-size:15px; }}
.tab-input {{ position:absolute; opacity:0; pointer-events:none; }}
.panel {{ display:none; }}
#tab-overview:checked ~ .panel-overview, #tab-roadmap:checked ~ .panel-roadmap,
#tab-deploy:checked ~ .panel-deploy, #tab-security:checked ~ .panel-security {{ display:block; }}
#tab-overview:checked ~ .tabs label[for="tab-overview"], #tab-roadmap:checked ~ .tabs label[for="tab-roadmap"],
#tab-deploy:checked ~ .tabs label[for="tab-deploy"], #tab-security:checked ~ .tabs label[for="tab-security"] {{ color:var(--text); border-bottom-color:var(--accent); }}
#tab-overview:focus-visible ~ .tabs label[for="tab-overview"], #tab-roadmap:focus-visible ~ .tabs label[for="tab-roadmap"],
#tab-deploy:focus-visible ~ .tabs label[for="tab-deploy"], #tab-security:focus-visible ~ .tabs label[for="tab-security"] {{ outline:2px solid var(--accent); outline-offset:2px; }}
.btns {{ display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; margin-bottom:16px; }}
.btn {{ display:inline-flex; align-items:center; min-height:44px; padding:8px 16px; border-radius:8px; border:1px solid var(--accent); color:var(--accent); font-weight:600; text-decoration:none; }}
.btn:first-child {{ background:var(--accent); color:#fff; }}
.chip.r-success {{ background:var(--ok-bg); color:var(--ok); }}
.chip.r-failure {{ background:var(--bad-bg); color:var(--bad); font-weight:600; }}
.chip.env-production {{ background:var(--info-bg); color:var(--accent); }}
.counts.five {{ grid-template-columns:repeat(5,minmax(0,1fr)); }}
.count span {{ display:block; }} .count .of {{ font-size:11px; }}
.count.sec-critical.hot, .count.sec-high.hot {{ background:var(--bad-bg); }}
.count.sec-critical.hot b, .count.sec-high.hot b {{ color:var(--bad); }}
.count.sec-medium.hot {{ background:var(--warn-bg); }} .count.sec-medium.hot b {{ color:var(--warn); }}
.count.sec-low.hot, .count.sec-info.hot {{ background:var(--info-bg); }}
.chip.sev-critical, .chip.sev-high {{ background:var(--bad-bg); color:var(--bad); font-weight:600; }}
.chip.st-open {{ background:var(--bad-bg); color:var(--bad); font-weight:600; }}
.chip.st-fixed {{ background:var(--ok-bg); color:var(--ok); }}
table.sec tr.st-fixed td {{ color:var(--muted); }}
table.builds td.sha {{ white-space:nowrap; }}
.scroll {{ overflow-x:auto; }}
.rm {{ --lane-w:minmax(150px,180px); --col-w:240px; display:grid; gap:8px; min-width:max-content;
  grid-template-columns:var(--lane-w) repeat(var(--cols),var(--col-w)); }}
.rm-col-h {{ display:flex; flex-direction:column; font-size:14px; padding:4px 2px; border-bottom:2px solid var(--border); }}
.rm-lane-h {{ display:flex; flex-direction:column; font-size:14px; padding:10px; border-radius:8px; border-left:4px solid var(--accent); background:var(--track);
  position:sticky; left:0; z-index:1; box-shadow:8px 0 0 var(--surface); }}
.rm-lane-h.foundation {{ border-left-color:var(--warn); }}
.rm-cell {{ list-style:none; margin:0; padding:8px; border-radius:8px; background:var(--bg); border:1px dashed var(--border); display:flex; flex-direction:column; gap:6px; }}
.rm-card {{ display:flex; flex-wrap:wrap; align-items:baseline; gap:6px; background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:6px; padding:6px 8px; font-size:13px; }}
.rm-cell.foundation .rm-card {{ border-left-color:var(--warn); }}
.rm-card .t {{ flex:1 1 120px; }}
.rm-card .b {{ display:flex; gap:4px; }}
.rm-card .seq {{ font-variant-numeric:tabular-nums; font-weight:650; color:var(--muted); min-width:1.4em; }}
.rm-card .size {{ font-size:11px; padding:0 6px; border-radius:999px; background:var(--track); color:var(--muted); white-space:nowrap; }}
.rm-tasks {{ flex-basis:100%; display:flex; flex-wrap:wrap; gap:4px; }}
.rm-tasks .chip {{ font-size:11px; padding:1px 6px; }}
.chip.t-done {{ background:var(--ok-bg); color:var(--ok); }}
.chip.t-doing {{ background:var(--info-bg); color:var(--accent); }}
.chip.t-blocked {{ background:var(--bad-bg); color:var(--bad); }}
@media (max-width:720px) {{
  .rm {{ --lane-w:104px; --col-w:210px; }} .rm-lane-h {{ padding:8px; }}
  .grid {{ grid-template-columns:1fr; }}
  .tiles {{ grid-template-columns:repeat(2,minmax(0,1fr)); }}
  dl {{ grid-template-columns:1fr; gap:2px; }} dd {{ margin-bottom:8px; }}
  table.stack thead {{ display:none; }}
  table.stack, table.stack tbody, table.stack tr, table.stack td {{ display:block; width:100%; }}
  table.stack tr {{ border-bottom:1px solid var(--border); padding:8px 0; }}
  table.stack tr:last-child {{ border-bottom:0; }}
  table.stack td {{ border:0; padding:2px 0; }}
  table.stack td[data-l]::before {{ content:attr(data-l) ": "; color:var(--muted); font-size:12px; }}
  table.stack td.mono {{ white-space:normal; }}
  .tabs label {{ padding:10px 10px; }}
  table.stack td:first-child::before {{ content:none; }}
}}
</style>
</head>
<body>
<main>
<h1>Minespel dashboard</h1>
<p class="lead">Dino Blokwereld at a glance. Made from the repo docs and git.</p>
{refresh}
<input type="radio" name="tab" id="tab-overview" class="tab-input" checked>
<input type="radio" name="tab" id="tab-roadmap" class="tab-input">
<input type="radio" name="tab" id="tab-deploy" class="tab-input">
<input type="radio" name="tab" id="tab-security" class="tab-input">
<nav class="tabs" aria-label="Dashboard views"><label for="tab-overview">Overview</label><label for="tab-roadmap">Roadmap</label><label for="tab-deploy">Deploy</label><label for="tab-security">Security</label></nav>
<div class="panel panel-roadmap">{roadmap}</div>
<div class="panel panel-deploy">{deploy}</div>
<div class="panel panel-security">{security}</div>
<div class="panel panel-overview">
<div class="tiles">{tiles}</div>
<div class="grid">{body}</div>
</div>
<footer>Generated {generated}. Sources: {sources}. Run python3 scripts/ci_runs.py to refresh the CI history, then python3 scripts/dashboard.py.</footer>
</main>
</body>
</html>
"""


def build():
    d = collect()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(render(d))
    with open(os.path.join(OUT, "data.json"), "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    text = summary(d)
    with open(os.path.join(OUT, "SUMMARY.md"), "w", encoding="utf-8") as f:
        f.write(text)
    return text


def main(argv):
    text = build()
    if "--print" in argv:
        sys.stdout.write(text)
    else:
        print("Wrote dashboard/index.html, dashboard/data.json and dashboard/SUMMARY.md")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
