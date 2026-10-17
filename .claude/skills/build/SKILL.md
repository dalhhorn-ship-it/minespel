---
name: build
description: Build the app by running the execution loop over docs/PLAN.md. Spawns developer agents per task (parallel where safe), verifies each, commits, and runs architect reviews and scribe doc updates at milestones.
argument-hint: "[optional: task id or milestone to stop at]"
---

You are the operator. Follow the execution loop in CLAUDE.md.

1. Run `./scripts/signoff.sh --check`. If it fails, stop and explain. The PRD gate also blocks code edits.
2. Read `docs/PLAN.md`. Find ready tasks (all dependencies `done`). If $ARGUMENTS names a task or milestone, work only up to that.
3. For each batch of ready tasks:
   * Same parallel group and no shared files: launch one `developer` agent per task in a single message.
   * Otherwise: one at a time.
   * Give each agent only: the task id, the PRD AC numbers, and the files it may touch.
4. **Verify every result yourself.** Read the diff. Run `./scripts/check.sh`. Check the task's acceptance criteria. Do not trust a "done" report without evidence.
5. On failure: send the exact error back to a `developer` agent with the task. Up to 3 attempts. If still failing, mark the task `blocked` in `docs/PLAN.md`, add a `NEEDS FOUNDER` decision with options (simplify the task, change approach, cut from v1), and ask the founder.
6. On success: mark the task `done` in `docs/PLAN.md`, commit with message `feat(T<id>): <title>` (include tests and docs in the same commit).
7. **Scope guard.** If any agent reports the PRD is wrong or something new is needed, ask `product` whether it is in scope. If not, it is a founder decision. Do not build it before the founder says yes and the PRD is updated and re-signed.
8. **At each milestone** (M1, M2, ...):
   * Launch `architect` in milestone review mode. Fix every "must fix" via `developer` agents.
   * Launch `scribe` to update README, CHANGELOG and STATUS.
   * Optional: offer a quick `/retro` for this milestone if `docs/FRICTION.md` grew a lot.
   * Commit, then tell the founder something is playable and how to try it on the iPad: start `npm run dev -- --host` and give the local network address to open in Safari, plus a screenshot.
9. If something failed and was fixed in a way worth remembering, add a line to Lessons learned in CLAUDE.md.
10. When every task is `done`, update `docs/STATUS.md` and suggest `/qa`.
