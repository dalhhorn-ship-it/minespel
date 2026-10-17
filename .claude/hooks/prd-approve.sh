#!/usr/bin/env bash
# Stamps the PRD when the founder approves it in chat, so Claude never runs the stamp itself.
# Runs after AskUserQuestion (the founder picked "Approve") and on each founder message
# (the founder typed a message that starts with "approve").
input=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
event=$(printf '%s' "$input" | python3 -c '
import json, re, sys
d = json.load(sys.stdin)
ev = d.get("hook_event_name", "")
q = r"Approve this PRD so we can start building\?"
def approved(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if re.fullmatch(q, str(k)) and isinstance(v, str) and re.match(r"Approve\b", v):
                return True
            if approved(v):
                return True
    elif isinstance(o, list):
        return any(approved(v) for v in o)
    elif isinstance(o, str):
        return re.search(q + r"\"?\s*[=:]\s*\"?Approve\b(?! this)", o) is not None
    return False
if ev == "UserPromptSubmit":
    ok = re.match(r"\s*approve(d)?\b", d.get("prompt", ""), re.I) is not None
else:
    ok = d.get("tool_name") == "AskUserQuestion" and approved(d.get("tool_response")) 
print(ev if ok else "")')
[[ -z "$event" ]] && exit 0
[[ -f "$root/docs/PRD.md" ]] || exit 0
"$root/scripts/signoff.sh" --check >/dev/null 2>&1 && exit 0

if msg=$("$root/scripts/signoff.sh" "Founder" 2>&1); then
  note="The founder approved the PRD in chat. The hook stamped it: $msg Commit docs/PRD.md and docs/PRD.approved with message 'docs: founder approved PRD', then go on to /architect."
else
  note="The founder said approve, but the stamp failed: $msg Fix the PRD with the /prd steps and ask again."
fi
python3 -c 'import json, sys; print(json.dumps({"hookSpecificOutput": {"hookEventName": sys.argv[1], "additionalContext": sys.argv[2]}}))' "$event" "$note"
exit 0
