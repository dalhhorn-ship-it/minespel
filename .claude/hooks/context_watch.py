#!/usr/bin/env python3
"""UserPromptSubmit: nudge for a handoff note + fresh context when the context gets long.

Short contexts with a structured handoff lose almost no accuracy and cost far less per token
(NVIDIA, "You don't need long context"). Taken from the danfactory template (decision 117). This hook reads the live context size from the
transcript (last assistant turn: input + cache read + cache write) and, once it passes
the budget (FACTORY_CONTEXT_HANDOFF_TOKENS, default 120k), adds one reminder per 50k band, never on every prompt.
The agent decides the logical moment; the hook only says "it's time to look for one".
"""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_event  # noqa: E402

BAND = 50_000


def context_tokens(transcript_path):
    """Prompt size of the most recent assistant turn = current context size."""
    last = None
    try:
        with open(transcript_path, encoding="utf-8") as fh:
            for line in fh:
                if '"usage"' not in line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if rec.get("type") == "assistant" and not rec.get("isSidechain"):
                    last = (rec.get("message") or {}).get("usage") or last
    except OSError:
        return 0
    if not last:
        return 0
    return int(last.get("input_tokens", 0)) + int(last.get("cache_read_input_tokens", 0)) + \
        int(last.get("cache_creation_input_tokens", 0))


def main():
    ev = read_event()
    tp, sid = ev.get("transcript_path"), ev.get("session_id") or "unknown"
    if not tp:
        return
    limit = int(os.environ.get("FACTORY_CONTEXT_HANDOFF_TOKENS") or 120_000)
    size = context_tokens(tp)
    if size < limit:
        return
    band = (size - limit) // BAND
    state = os.path.join(tempfile.gettempdir(), "minespel-ctx-%s" % sid)
    try:
        seen = int(open(state).read().strip())
    except (OSError, ValueError):
        seen = -1
    if band <= seen:
        return
    try:
        with open(state, "w") as fh:
            fh.write(str(band))
    except OSError:
        pass
    print("[minespel] Context is ~{:,} tokens (handoff budget {:,}). At the next logical boundary "
          "(task done, milestone, topic switch; not mid-debug): run the `handoff` skill, then ask the user "
          "to /clear. The note reloads automatically, so the new session starts with the task + note only."
          .format(size, limit))


if __name__ == "__main__":
    main()
