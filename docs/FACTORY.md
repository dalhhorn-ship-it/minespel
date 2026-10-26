# App Factory: how the agents work

Moved out of `CLAUDE.md` on 2026-10-26 (decision 104) so it is read only when needed. The skills (`/build`, `/prd`, `/release`, `/ship`, `/retro`) and the agent files point here. The hard rules stay in `CLAUDE.md`.

## The team

| Agent | Model | Job | Writes |
|---|---|---|---|
| `brainstormer` | sonnet | Wild ideas, kid friendly options, game concepts | `docs/IDEA.md` |
| `product` | opus | Turns the idea into a PRD with acceptance criteria | `docs/PRD.md` |
| `architect` | opus | Stack, structure, task graph, code review at milestones | `docs/ARCHITECTURE.md`, `docs/PLAN.md` |
| `developer` | sonnet | Implements one task at a time, with tests | source code, unit tests |
| `qa` | sonnet | Acceptance tests, plays the app, finds bugs, kid safety check | `tests/`, `docs/TEST_REPORT.md` |
| `kid-ui-reviewer` | sonnet | Opens every screen on iPad sizes: buttons fit and are big enough, every screen has a way back, flows make sense for a kid | `docs/UI_REVIEW.md`, `tests/e2e/ui-review*.spec.ts`, `tests/e2e/helpers/ui-audit.ts`, screenshots |
| `scribe` | haiku | Keeps README, CHANGELOG and docs in sync with the code | docs |
| `verifier` | haiku | Independent, read only check of another agent's work against the ACs | nothing, returns a verdict |

Opus is used only where a mistake is expensive (what to build, how to build it, final review). Sonnet does the volume work. Haiku does the cheap, mechanical work. If a task feels too hard for its agent after 2 attempts, escalate one model tier for that single task and note it in `docs/STATUS.md`.

Only the operator talks to the founder. Agents read files, write files and return short summaries.

## The layers

1. **Plan.** Idea, PRD, architecture, then a task graph (`docs/PLAN.md`) with dependencies and parallel groups.
2. **Agents.** Spin up the specialist agent for each step. Do not spawn agents you do not need.
3. **Execution.** Each agent works on its own task with only the context it needs: task spec, relevant files, success criteria.
4. **Artifacts.** Every task returns something concrete: files, test results, screenshots, commands run, plus a short summary.
5. **Verification.** Run the code and the tests before marking anything done. Work is never verified only by the agent that made it.
6. **Feedback.** On failure: read the error, fix the real cause, retry up to 3 times, then escalate to the founder with options. Record the lesson in `CLAUDE.md` Lessons and log the event in `docs/FRICTION.md`.
7. **Completion.** Run the completion checklist in `/ship`.
8. **Retro.** `/retro` keeps app lessons in `CLAUDE.md` and sends factory learnings back to the factory repo.

## The pipeline

```
/brainstorm  ->  /prd  ->  [FOUNDER APPROVES IN CHAT]  ->  /architect  ->  /build  ->  /qa  ->  /ship  ->  /retro
then, one at a time:  /release  (pick, approve in chat, build, check, ship, learn)
```

If `docs/IDEA.md` has no chosen concept yet, treat the founder's first message as the seed and run the `/brainstorm` steps right away.

**Small releases.** v1 is the smallest version the kids can play. Everything else goes in `docs/BACKLOG.md` as small releases. The next release gets its section in `docs/PRD.md` section 12 and is signed there; when it ships, the backlog marks it shipped and its section later moves to `docs/releases/vN.md`. Each release: at most 5 tasks, one thing the kids can feel, shipped before the next one starts. Never batch releases. A release of 3 tasks or fewer takes the fast lane: one developer, no architect review, no scribe. Every release is pushed once, at the end, so CI runs once.

`/factory` looks at `docs/STATUS.md` and runs the next step, stopping at every gate.

## How agents discuss

When a step benefits from more than one view (the PRD, the architecture, a tricky bug):
1. The owner agent drafts.
2. One or two reviewer agents critique the draft in writing, each from their own angle.
3. The owner revises and answers each point: accepted, rejected with a reason, or "founder decision".
4. Maximum 2 rounds. Whatever is still open goes to the founder.

Append each round to `docs/DISCUSSION.md` (short: who said what, what changed). Add every founder question to `docs/DECISIONS.md` with `Status: NEEDS FOUNDER`, then ask with AskUserQuestion, giving 2 to 4 concrete options and a recommendation. Record the answer and flip the status to `DECIDED`.

## Execution loop (during /build)

1. Read the current release's rows in `docs/PLAN.md` and pick every task whose dependencies are done.
2. Run independent tasks in parallel (several `developer` agents in one message) only when they touch different files. Otherwise run them one by one.
3. Verify each batch independently: `./scripts/verify.sh task <ids>` first, then one `verifier` agent for the batch if the script passed.
4. Fix and retry on failure (max 3), then escalate.
5. Commit each completed task with a clear message. Update `docs/PLAN.md` and `docs/STATUS.md`.
6. At each milestone, ask `architect` for a code review and `scribe` to update docs.
7. Continue until every task is done, then hand over to `/qa`.

## Independent verification

No agent checks its own work. Checks run cheapest first, and a more expensive check runs only when the cheaper one passed.

| Work by | Checked by | How |
|---|---|---|
| `developer` | `scripts/verify.sh task`, then `verifier` (haiku) | Script: files stay in the task, a test changed, no skipped or deleted tests, no tracking, `check.sh` green. Verifier: reads only the diff and the task's ACs |
| `qa` | `scripts/verify.sh acs`, then `verifier` spot check | Every AC has a test named after it. Verifier reads 3 of those tests against their ACs |
| `scribe` | `scripts/verify.sh docs` | Only docs changed, every `npm run` in the README exists |
| `product`, `architect` | review rounds | Already reviewed by other agents and the founder |

Keep it economical:
* The script is free. Never launch an agent to review work that fails it.
* One `verifier` per batch of tasks, not per task. Skip it for docs only changes.
* Give the verifier the task ids and the script output only. Never the author's summary.
* Haiku by default. Rerun once on Sonnet only when it says UNSURE or the batch changed more than 400 lines.
* The Opus architect review stays at milestones only, and skips what the verifier already passed.
* `scripts/verify.sh` is protected by the PRD gate hook. Changes to it come from the factory.

## Files

| File | Purpose |
|---|---|
| `docs/STATUS.md` | Current phase, what is next, blockers. The operator keeps it current. |
| `docs/IDEA.md` | Output of brainstorming |
| `docs/PRD.md` | The product spec the founder approves: the product core, the criteria in force, and the next release in section 12 |
| `docs/BACKLOG.md` | The ranked release backlog. Not signed, so editing it never closes the gate. |
| `docs/releases/` | Archive of shipped release sections (`vN.md`). Not signed. |
| `docs/PRD.approved` | Approval stamp. Written only by the approval hook. |
| `docs/ARCHITECTURE.md` | Stack, structure, key choices |
| `docs/PLATFORM.md` | iPad, hosting and content release rules |
| `docs/PLAN.md` | Task graph |
| `docs/DECISIONS.md` | Decision log, including founder decisions |
| `docs/DISCUSSION.md` | Agent review rounds |
| `docs/TEST_REPORT.md` | Latest QA results |
| `docs/FRICTION.md` | Running log of problems, the raw material for `/retro` |
| `docs/RETRO.md` | Retrospective results |
| `docs/archive/` | Old one off reports, decisions 1 to 86, review rounds before v11. Read only when a task points there. |
| `docs/releases/plan-done.md` | Done and dropped tasks from `docs/PLAN.md`. When a release ships, move its done rows and notes here. |
| `docs/factory-feedback/` | Factory level learnings, also copied to the factory inbox |
| `.factory` | Which factory repo this app came from and the date it started |
| `CHANGELOG.md` | What changed, in kid readable words |
| `scripts/check.sh` | The one command that lints and tests everything. CI runs it too. |
| `scripts/verify.sh` | Free, independent checks of another agent's work. |
