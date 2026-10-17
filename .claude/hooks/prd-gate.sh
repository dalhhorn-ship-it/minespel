#!/usr/bin/env bash
# PreToolUse hook: no application code until the founder has signed the PRD.
# Docs, agents, skills and the README are always editable.
# The signoff stamp and the gate itself can never be changed by Claude.
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
    echo "Blocked: $rel is protected. Only the founder signs the PRD or changes the gate, by hand." >&2
    exit 2 ;;
  docs/*|.claude/*|CLAUDE.md|README.md|CHANGELOG.md|scripts/check.sh)
    exit 0 ;;
esac

if ! "$root/scripts/signoff.sh" --check >/dev/null 2>&1; then
  echo "Blocked by PRD gate: $rel is application code and the PRD is not signed (or changed since signing). Finish /prd and ask the founder to run /signoff." >&2
  exit 2
fi
exit 0
