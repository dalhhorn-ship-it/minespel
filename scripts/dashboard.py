#!/usr/bin/env python3
"""Project dashboard for the product director.

Reads the repo docs and git, then writes a self contained page:
  dashboard/index.html  (no JS, no network, light and dark)
  dashboard/data.json   (the same numbers as data)
  dashboard/SUMMARY.md  (a short markdown table)

Usage:
  python3 scripts/dashboard.py          write the three files
  python3 scripts/dashboard.py --print  also print SUMMARY.md

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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dashboard")
UNKNOWN = "unknown"

SOURCES = [
    "package.json", "CHANGELOG.md", "docs/BACKLOG.md", "docs/PLAN.md",
    "docs/DECISIONS.md", "docs/STATUS.md", "docs/FRICTION.md",
    "tests/e2e/*.spec.ts", "src/**/*.test.ts", "docs/modules/*/", "git",
]

STATUS_WORDS = ("shipped", "next", "candidate", "later", "dropped")
TASK_ID = re.compile(r"^[A-Z]{1,2}\d+[a-z]?$")


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


def collect():
    tasks = parse_plan(read("docs/PLAN.md"))
    return {
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "version": parse_package_version(read("package.json")),
        "changelog": parse_changelog(read("CHANGELOG.md")),
        "backlog": parse_backlog(read("docs/BACKLOG.md")),
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


def render(d):
    cl, dec, fr, t, g = d["changelog"], d["decisions"], d["friction"], d["tests"], d["git"]
    open_dec = n_of(dec["open"]) if dec != UNKNOWN else UNKNOWN
    tasks_n = n_of(d["tasks"])

    tiles = "".join([
        tile("Version", d["version"], "last release %s, %s" % (cl["latest"], cl["latest_date"])),
        tile("Unreleased changes", cl["unreleased"], "waiting in CHANGELOG",
             "warn" if isinstance(cl["unreleased"], int) and cl["unreleased"] else ""),
        tile("Open tasks", tasks_n, "in docs/PLAN.md"),
        tile("Founder decisions", open_dec, "open, need an answer",
             "bad" if isinstance(open_dec, int) and open_dec else "ok" if open_dec == 0 else ""),
        tile("E2e specs", t["e2e_specs"], "%s tests" % t["e2e_tests"]),
        tile("Unit test files", t["unit_files"], "%s tests" % t["unit_tests"]),
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
        card("Roadmap", roadmap, "wide"),
        card("Open founder decisions", founder, "attn" if dec != UNKNOWN and dec["open"] else ""),
        card("Open tasks (%s)" % tasks_n, tasks),
        card("Recent decisions", recent),
        card("Recent friction", friction),
        card("Recent commits", commits, "wide"),
        card("Learning modules", modules, "wide"),
    ])
    return PAGE.format(tiles=tiles, body=body, generated=e(d["generated"]),
                       sources=e(", ".join(d["sources"])))


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
.tiles {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:16px; }}
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
th {{ text-align:left; font-size:12px; color:var(--muted); font-weight:600; padding:6px 8px; border-bottom:1px solid var(--border); }}
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
footer {{ margin-top:24px; font-size:12px; color:var(--muted); }}
@media (max-width:720px) {{
  .grid {{ grid-template-columns:1fr; }}
  .tiles {{ grid-template-columns:repeat(2,minmax(0,1fr)); }}
  dl {{ grid-template-columns:1fr; gap:2px; }} dd {{ margin-bottom:8px; }}
  table.stack thead {{ display:none; }}
  table.stack, table.stack tbody, table.stack tr, table.stack td {{ display:block; width:100%; }}
  table.stack tr {{ border-bottom:1px solid var(--border); padding:8px 0; }}
  table.stack tr:last-child {{ border-bottom:0; }}
  table.stack td {{ border:0; padding:2px 0; }}
  table.stack td[data-l]::before {{ content:attr(data-l) ": "; color:var(--muted); font-size:12px; }}
  table.stack td:first-child::before {{ content:none; }}
}}
</style>
</head>
<body>
<main>
<h1>Minespel dashboard</h1>
<p class="lead">Dino Blokwereld at a glance. Made from the repo docs and git.</p>
<div class="tiles">{tiles}</div>
<div class="grid">{body}</div>
<footer>Generated {generated}. Sources: {sources}. Run python3 scripts/dashboard.py to refresh.</footer>
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
