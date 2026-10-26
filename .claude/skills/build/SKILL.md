---
name: build
description: Build the app by running the execution loop over docs/PLAN.md. Spawns developer agents per task (parallel where safe), verifies each, commits, and runs architect reviews and scribe doc updates at milestones.
argument-hint: "[optional: task id or milestone to stop at]"
---

You are the operator. Follow the execution loop in `docs/FACTORY.md`.

1. Run `./scripts/signoff.sh --check`. If it fails, stop and explain. The PRD gate also blocks code edits.
2. Read `docs/PLAN.md`. Find ready tasks (all dependencies `done`). If $ARGUMENTS names a task or milestone, work only up to that.
3. For each batch of ready tasks:
   * Same parallel group and no shared files: launch one `developer` agent per task in a single message.
   * Otherwise: one at a time.
   * Give each agent only: the task id, the PRD AC numbers, and the files it may touch.
4. **Verify every result independently**, cheapest check first. Do not trust a "done" report without evidence.
   * Run `./scripts/verify.sh task <ids of this batch>`. It is free: scope, skipped tests, tracking, deleted tests, then `./scripts/check.sh`. On FAIL go straight to step 5. Never spend an agent on work that fails the script.
   * On PASS, launch one `verifier` for the whole batch (not one per task). Give it only the task ids and the script output, never the developer's summary. Skip it for tasks that changed docs only.
   * If the verifier says UNSURE, or the batch changed more than 400 lines, run it once more with `model: sonnet`. Never more.
   * A FAIL from either goes back to the developer as the exact finding.
5. On failure: send the exact error back to a `developer` agent with the task. Up to 3 attempts. If still failing, mark the task `blocked` in `docs/PLAN.md`, add a `NEEDS FOUNDER` decision with options (simplify the task, change approach, move it to a later release), and ask the founder.
6. On success: mark the task `done` in `docs/PLAN.md`, commit with message `feat(T<id>): <title>` (include tests and docs in the same commit).
7. **Scope guard.** If any agent reports the PRD is wrong or something new is needed, ask `product` whether it is in scope. If not, it is a founder decision. Do not build it before the founder says yes and the PRD is updated and approved again.
8. **At each milestone** (M1, M2, ...):
   * Launch `architect` in milestone review mode. Tell it the verifier already passed each task, so it should focus on design, structure and risks across tasks. Fix every "must fix" via `developer` agents.
   * Launch `scribe` to update README, CHANGELOG and STATUS. Then run `./scripts/verify.sh docs` to prove it only touched docs and every README command exists.
   * Optional: offer a quick `/retro` for this milestone if `docs/FRICTION.md` grew a lot.
   * Commit, then tell the founder something is playable and how to try it on the iPad: start `npm run dev -- --host` and give the local network address to open in Safari, plus a screenshot.
9. If something failed and was fixed in a way worth remembering, add a line to Lessons learned in CLAUDE.md.
10. When every task is `done`, update `docs/STATUS.md` and suggest `/qa`.

During a `/release`, work only on the tasks with that release's milestone (`vN`). Commit locally and push once at the end of the release, not per task. In the fast lane (3 tasks or fewer) use one developer, skip the architect review and the scribe, and write the CHANGELOG and STATUS lines yourself.
