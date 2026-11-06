#!/usr/bin/env python3
"""SessionStart: point at docs/STATUS.md and reload the handoff note, if there is one.

Taken from the danfactory template (decision 117). After /clear, a compaction, a resume or a
fresh start, the session continues from the task and a short note instead of the full history.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HANDOFF, read_event  # noqa: E402

MAX_LINES = 60


def main():
    ev = read_event()
    out = ["[minespel] Start with docs/STATUS.md. Find, do not read: grep big docs by id."]
    if os.path.isfile(HANDOFF):
        with open(HANDOFF, encoding="utf-8") as fh:
            lines = fh.read().splitlines()
        if len(lines) > MAX_LINES:
            lines = lines[:MAX_LINES] + ["(truncated: keep the note under 40 lines)"]
        out += ["", "[minespel] Handoff note (docs/HANDOFF.md, loaded on %s). Continue from it; "
                "check facts against the repo before relying on them:" % ev.get("source", "startup")] + lines
    print("\n".join(out))


if __name__ == "__main__":
    main()
