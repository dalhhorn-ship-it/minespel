#!/usr/bin/env bash
# PreToolUse hook: no application code until the founder has approved the PRD.
# Docs, agents, skills and the README are always editable.
# The approval stamp is only written by scripts/signoff.sh, after the founder says yes in chat.
input=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file=$(printf '%s' "$input" | python3 -c '
import json, sys
t = json.load(sys.stdin).get("tool_input", {})
print(t.get("file_path") or t.get("notebook_path") or "")')
[[ -z "$file" ]] && exit 0
rel="${file#"$root"/}"
rel="${rel#./}"

case "$rel" in
  docs/PRD.approved|scripts/signoff.sh|.claude/hooks/*|.claude/settings.json)
    echo "Blocked: $rel is protected. The approval stamp is written only by scripts/signoff.sh after the founder approves in chat." >&2
    exit 2 ;;
  docs/*|.claude/*|CLAUDE.md|README.md|CHANGELOG.md|scripts/check.sh)
    exit 0 ;;
esac

if ! "$root/scripts/signoff.sh" --check >/dev/null 2>&1; then
  echo "Blocked by PRD gate: $rel is application code and the PRD is not approved (or changed since approval). Finish /prd and ask the founder to approve it in chat (/signoff steps)." >&2
  exit 2
fi
exit 0
