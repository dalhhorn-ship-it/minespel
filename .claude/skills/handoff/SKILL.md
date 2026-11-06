---
name: handoff
description: Write a short handoff note (docs/HANDOFF.md) so work can go on in a fresh, short context. Use at a logical boundary (a task done, a release step done, a topic switch, before a long new task) or when the context watch hook says the context is long; then ask the founder to /clear. Also use when the founder says "handoff", "wrap up" or "save state".
---

# Handoff: restart with the task and a note, not the whole history

Agents lose almost no accuracy when they restart from a short note instead of the full history, and every turn gets cheaper. This skill writes that note. Taken from the danfactory template (decision 117).

## When
* Good moments: a task is done (`./scripts/smoke.sh` or the full check green), a release step is done, the topic changes, or the context watch hook fired and you reached a boundary.
* Never in the middle of debugging or a half done change. Finish the step or revert it first.

## Write `docs/HANDOFF.md` (40 lines or fewer, replace the old note)
```markdown
# Handoff, <YYYY-MM-DD HH:MM>, <short title>

## Task
<the founder's goal for this work in 1 or 2 lines, in their words where you can>

## State
* Done: <what is finished and verified, with commit shas>
* In progress: <where it stopped>; next command or edit: <...>
* Branch: <branch>, uncommitted: <none | files>

## Decisions
* <decision row number and one line why>

## Next steps
1. <concrete next action>

## Watch out
* <gotchas, failed approaches not to retry, founder preferences>

## Pointers
* <file:line, task id, AC id or decision number; no pasted content>
```

Rules:
* Facts only: shas, paths, ids, commands. No story of how you got here.
* Point to files and ids instead of quoting them. `docs/STATUS.md` stays the source of truth for the phase; the note only holds what STATUS does not.
* Keep the founder's open questions and preferences. Those get lost first.
* Commit the note with the work, so a cloud session on another machine can pick it up. Delete the note (in a commit) when its work is merged.

## Then
Tell the founder: "Handoff written. Type `/clear` to go on in a fresh context. The note loads again by itself." If they want to keep the history, `/compact` works too; CLAUDE.md says what a summary must keep.
