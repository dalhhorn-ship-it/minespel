#!/usr/bin/env python3
"""PreCompact: save a mechanical snapshot into docs/HANDOFF.md before the context is compacted.

Taken from the danfactory template (decision 117).

Safety net only: the real handoff note is written by the agent (`handoff` skill). The snapshot
records facts a summary tends to lose (branch, uncommitted files, last commits),
replacing the previous snapshot block so the file stays short.
"""
import datetime
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HANDOFF, ROOT, read_event  # noqa: E402

PATH = HANDOFF
START, END = "<!-- auto-snapshot:start -->", "<!-- auto-snapshot:end -->"


def git(*a):
    p = subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True)
    return p.stdout.rstrip() if p.returncode == 0 else ""


def main():
    ev = read_event()
    status = git("status", "--short").splitlines()
    snap = [START, "## Auto snapshot before compaction (%s, %s)" % (
        datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), ev.get("trigger", "?")),
        "- Branch: %s @ %s" % (git("rev-parse", "--abbrev-ref", "HEAD") or "?", git("rev-parse", "--short", "HEAD") or "?"),
        "- Uncommitted: %s" % (", ".join(l[3:] for l in status[:10]) + (" …" if len(status) > 10 else "") if status else "none"),
        "- Last commits: %s" % " | ".join(git("log", "-3", "--format=%h %s").splitlines()),
        END]
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    cur = open(PATH, encoding="utf-8").read() if os.path.exists(PATH) else "# Handoff\n\n_No agent-written note yet._\n"
    if START in cur:
        cur = cur[:cur.index(START)].rstrip() + "\n" + cur[cur.index(END) + len(END):].lstrip("\n")
    with open(PATH, "w", encoding="utf-8") as fh:
        fh.write(cur.rstrip() + "\n\n" + "\n".join(snap) + "\n")


if __name__ == "__main__":
    main()
