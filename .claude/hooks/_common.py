"""Shared helpers for the context hooks. Stdlib only, Python 3.8+.

Adapted from the danfactory template (dalhhorn-ship-it/danfactory), decision 117.
"""
import json
import os
import sys

ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
HANDOFF = os.path.join(ROOT, "docs", "HANDOFF.md")


def read_event():
    try:
        return json.load(sys.stdin)
    except ValueError:
        return {}


def count_lines(path, stop_after=None):
    """Count lines, stopping early once stop_after is exceeded (cheap on huge files)."""
    n = 0
    try:
        with open(path, "rb") as fh:
            for _ in fh:
                n += 1
                if stop_after is not None and n > stop_after:
                    break
    except OSError:
        return 0
    return n


def block(reason):
    """Exit code 2 on PreToolUse blocks the call and shows `reason` to Claude."""
    sys.stderr.write(reason + "\n")
    sys.exit(2)
