#!/usr/bin/env python3
"""Build docs/INDEX.md (the reference table) and docs/knowledge-graph.json.

Adapted from the danfactory template (decision 118). Agents read docs/INDEX.md first, then grep
by id or read a slice at the line it lists, instead of reading a big doc whole.

  python3 scripts/docs_index.py           # regenerate
  python3 scripts/docs_index.py --check   # exit 1 if the files are stale

The block between <!-- curated:start --> and <!-- curated:end --> in INDEX.md is kept by hand
and survives a regenerate. Learning modules (docs/modules) are content, not docs: left out.
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX = os.path.join(ROOT, "docs", "INDEX.md")
GRAPH = os.path.join(ROOT, "docs", "knowledge-graph.json")
SOURCES = ["CLAUDE.md", "README.md", "CHANGELOG.md", "docs/**/*.md"]
SKIP = ("docs/modules/",)
LONG_DOC = 120  # list section lines only for docs longer than this
CURATED_RE = re.compile(r"<!-- curated:start -->\n(.*?)<!-- curated:end -->", re.S)
DEFAULT_CURATED = """| Question | Go to |
|---|---|
| Where are we, what is next, blockers? | docs/STATUS.md |
| Project dashboard | `python3 scripts/dashboard.py --print` (page: dashboard/index.html) |
| One acceptance criterion | `grep -n "AC180:" docs/PRD.md` |
| One decision | `grep -n "^\\| 98 " docs/DECISIONS.md` (1 to 86: docs/archive/decisions-1-86.md) |
| One open task | `grep -n "^\\| V11c " docs/PLAN.md` (done: docs/releases/plan-done.md) |
| The next release | docs/PRD.md section 12 |
| What can we build next? | docs/BACKLOG.md |
| How the agent factory works | docs/FACTORY.md |
| iPad, hosting, content release rules | docs/PLATFORM.md |
| Stack and structure | docs/ARCHITECTURE.md |
| Make a learning module | docs/modules/README.md and the `/module` skill |
| Where did the last session stop? | docs/HANDOFF.md (`/handoff`) |
"""
LINK_RE = re.compile(r"\]\(([^)#\s]+\.md)(#[^)]*)?\)|`((?:docs|\.claude)/[^`\s]+\.md)`")
HEAD_RE = re.compile(r"^(#{1,3})\s+(.*?)\s*#*\s*$")
# Where ids are defined, so an agent knows which file to grep.
ID_RULES = [
    ("Acceptance criteria", "AC", re.compile(r"^\s*[*-]\s+\*\*AC(\d+)[a-z]?[ :(]")),
    ("Decisions", "", re.compile(r"^\|\s*(\d+)\s*\|\s*\d{4}-\d{2}-\d{2}")),
    ("Tasks", "", re.compile(r"^\|\s*(T\d+[a-z]?|R\d+[a-z]|V\d+[a-z]?)\s*\|")),
]


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def collect():
    files = set()
    for pat in SOURCES:
        files.update(f for f in glob.glob(os.path.join(ROOT, pat), recursive=True) if os.path.isfile(f))
    files.discard(INDEX)
    files = {f for f in files if not rel(f).startswith(SKIP)}
    try:  # skip git ignored files, so the index is the same on every machine
        out = subprocess.run(["git", "check-ignore", "--stdin"], cwd=ROOT, capture_output=True, text=True,
                             input="\n".join(rel(f) for f in files), check=False, timeout=20).stdout
        ignored = {os.path.join(ROOT, l) for l in out.splitlines() if l}
        files -= ignored
    except (OSError, subprocess.SubprocessError):
        pass
    return sorted(files, key=rel)


def parse(path):
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().splitlines()
    title, summary, heads, links = rel(path), "", [], set()
    ids = {name: [] for name, _, _ in ID_RULES}
    in_code = False
    for i, line in enumerate(lines, 1):
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        m = HEAD_RE.match(line)
        if m:
            level, text = len(m.group(1)), m.group(2)
            if level == 1 and not heads and title == rel(path):
                title = text
            else:
                heads.append((i, level, text))
        elif not summary and line.strip() and not line.startswith(("|", "<!--", "---")):
            text = re.sub(r"^>\s*", "", line.strip())
            summary = re.sub(r"\*\*|`", "", text)
        for name, prefix, rx in ID_RULES:
            im = rx.match(line)
            if im:
                ids[name].append(prefix + im.group(1))
        for lm in LINK_RE.finditer(line):
            target = lm.group(1) or lm.group(3)
            if target.startswith("http"):
                continue
            base = ROOT if lm.group(3) or target.startswith(("docs/", ".claude/")) else os.path.dirname(path)
            full = os.path.normpath(os.path.join(base, target))
            if (os.path.isfile(full) or full == INDEX) and full != path:
                links.add(rel(full))
    return {"file": rel(path), "title": title, "summary": summary, "lines": len(lines),
            "headings": heads, "links": sorted(links), "ids": {k: v for k, v in ids.items() if v}}


def cell(s, width=None):
    if width and len(s) > width:
        s = s[: width - 1].rsplit(" ", 1)[0] + "…"
    return s.replace("|", "\\|")


def id_span(values):
    nums = [int(re.sub(r"\D", "", v)) for v in values if re.search(r"\d", v)]
    if values and all(re.fullmatch(r"(AC)?\d+", v) for v in values) and nums:
        prefix = "AC" if values[0].startswith("AC") else ""
        return "%s%d to %s%d (%d)" % (prefix, min(nums), prefix, max(nums), len(set(values)))
    shown = ", ".join(values[:12]) + (", …" if len(values) > 12 else "")
    return "%s (%d)" % (shown, len(values))


def render(docs, curated):
    out = [
        "# Docs index (generated)",
        "",
        "> The reference table. Read this first, then grep by id or read a slice at the listed line. "
        "Built by `python3 scripts/docs_index.py` (check.sh runs it); edit only the curated block. "
        "Doc links and id locations: docs/knowledge-graph.json.",
        "",
        "## Quick answers (curated)",
        "",
        "<!-- curated:start -->",
        curated.rstrip("\n"),
        "<!-- curated:end -->",
        "",
        "## Where ids live",
        "",
        "| Ids | File | Range (count) |",
        "|---|---|---|",
    ]
    for name, _, _ in ID_RULES:
        for d in docs:
            if name in d["ids"]:
                out.append("| %s | %s | %s |" % (name, d["file"], cell(id_span(d["ids"][name]))))
    out += ["", "## Documents", "", "| File | Lines | Summary |", "|---|---:|---|"]
    for d in docs:
        summary = cell(d["summary"] or d["title"], 90)
        if d["lines"] > LONG_DOC:
            secs = ", ".join("%s:%d" % (cell(t, 30), n) for n, lvl, t in d["headings"] if lvl == 2)
            if secs:
                summary += " Sections: " + secs
        out.append("| %s | %d | %s |" % (d["file"], d["lines"], summary))
    return "\n".join(out) + "\n"


def graph(docs):
    """Compact JSON, one node or edge per line, so it stays small and greppable."""
    nodes = [json.dumps({"id": d["file"], "title": d["title"], "lines": d["lines"],
                         "ids": {k: id_span(v) for k, v in d["ids"].items()}}, ensure_ascii=False)
             for d in docs]
    edges = [json.dumps({"from": d["file"], "to": t}) for d in docs for t in d["links"]]

    def block(items):
        return "[\n  " + ",\n  ".join(items) + "\n ]" if items else "[]"
    return ('{"generated_by": "scripts/docs_index.py",\n "nodes": ' + block(nodes)
            + ',\n "edges": ' + block(edges) + "\n}\n")


def build():
    curated, old_index, old_graph = DEFAULT_CURATED, "", ""
    if os.path.isfile(INDEX):
        old_index = open(INDEX, encoding="utf-8").read()
        m = CURATED_RE.search(old_index)
        if m:
            curated = m.group(1)
    if os.path.isfile(GRAPH):
        old_graph = open(GRAPH, encoding="utf-8").read()
    docs = [parse(p) for p in collect()]
    return docs, render(docs, curated), graph(docs), old_index, old_graph


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    docs, new_index, new_graph, old_index, old_graph = build()
    if a.check:
        stale = new_index != old_index or new_graph != old_graph
        if stale:
            print("docs/INDEX.md or docs/knowledge-graph.json is stale: run python3 scripts/docs_index.py")
        return 1 if stale else 0
    for path, content, old in ((INDEX, new_index, old_index), (GRAPH, new_graph, old_graph)):
        if content != old:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(content)
    if not a.quiet:
        print("docs_index: indexed %d docs" % len(docs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
