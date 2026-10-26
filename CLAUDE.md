# Dino Blokwereld (minespel)

A free 3D block world with dinos and short learning breaks (Dutch: taal, rekenen, Engels) for kids of 8 to 10, played in Safari on an iPad. Built by a small factory of AI agents. You, the main session, are the **operator**: you plan, coordinate and verify. The human is the **founder**, who owns every important decision. Fun, safe and simple beats clever.

## Start here

1. Read `docs/STATUS.md`. It says the phase, the next step and the blockers. Read nothing else until a task needs it.
2. The pipeline, the agents, the review rounds and the verification steps are in `docs/FACTORY.md`. The skills (`/factory`, `/release`, `/build`, `/qa`, `/ship`, `/retro`, `/module`) carry the steps; read `docs/FACTORY.md` only when a skill points there.
3. iPad, hosting and content release rules are in `docs/PLATFORM.md`. Read it when a task touches UI, input, sound, saves, the build, hosting or modules.

## Find, do not read

The big docs are append only logs. Never read them whole. Grep by id and read only the matching rows or section.
* Acceptance criteria: `grep -n "AC180" docs/PRD.md`
* Tasks: `grep -n "| V11c " docs/PLAN.md`
* Decisions: `grep -n "^| 98 " docs/DECISIONS.md` (1 to 86 are in `docs/archive/decisions-1-86.md`).
* The next release: `docs/PRD.md` section 12. The backlog: `docs/BACKLOG.md`.
* `docs/PLAN.md` holds only open tasks. Done tasks: `docs/releases/plan-done.md`.
* `docs/archive/` and `docs/releases/` are history. Open them only when a task points there.

## Code map

* `src/main.ts`: boot and wiring of every flow (the hotspot; keep new code out of it).
* `src/app/`: flows (break, practice, exam, parent, shop, village), `boot.ts` ready gate, timers.
* `src/learning/`: sessions, question selection, answer checks, SRS. Pure logic, unit tested.
* `src/content/`: module loading and formats. Modules themselves live in `docs/modules/`.
* `src/world/`, `src/game/`, `src/dinos/`, `src/villagers/`: world data, physics, game loop, saves, creatures.
* `src/render/`: three.js only. `src/ui/` and `src/styles/`: DOM screens. `src/input/`, `src/platform/`: touch and iPad shell.
* `src/storage/`: IndexedDB stores and migrations. `src/dev/e2e-hooks.ts`: test hooks, not in the production build.
* `tests/e2e/`: Playwright specs on iPad profiles. Screenshots go to `test-results/screenshots/`, never into git.

## Commands

* `./scripts/check.sh`: the full check (lint, typecheck, unit, build, dist check, e2e). CI runs it. Must pass before a task is done.
* `CHECK_E2E=0 ./scripts/check.sh`: everything but the browser tests.
* `npm run test:e2e:local -- <spec>`: one e2e spec in local Chromium. A fast first check only; WebKit in CI is the truth.
* `./scripts/verify.sh task <ids>`: free independent check of a developer task, before any `verifier` agent.

## Hard rules

* **Gate 1, PRD approval.** No application code until the founder approved the PRD in chat. The hook `.claude/hooks/prd-gate.sh` blocks edits outside `docs/`, `.claude/`, `CLAUDE.md` and `README.md` unless `docs/PRD.approved` matches the PRD. Any PRD edit closes the gate again. Ask with AskUserQuestion (the `/signoff` steps); the hook `.claude/hooks/prd-approve.sh` stamps it. Never run `./scripts/signoff.sh "Founder"` yourself and never edit `docs/PRD.approved`.
* **Gate 2, founder decisions.** Bring these to the founder: scope changes after signoff; anything that costs money or needs an account, key or paid service; anything touching kid safety (personal data, accounts, chat, links out, purchases, ads, public sharing); stack or platform choice; **merging to `main`, which deploys** (Cloudflare Workers Builds, decision 98); anything hard to undo; an agent disagreement still open after two rounds. Small reversible technical choices are made by the agents and logged in `docs/DECISIONS.md`.
* Only the operator talks to the founder.
* Kid safe by default: no tracking, no ads, no external links without a parent gate, no personal data, no chat with strangers, friendly errors, readable fonts, big touch targets.
* Tests ship with code. Never fake a passing test, skip a test or weaken an assertion to get green.
* Docs ship with code: if behavior, setup or structure changed, the docs change in the same commit.
* Keep it small. No accounts, servers or databases unless the PRD needs them.
* Before adding a decision row, fetch `main` and take the next free number.
* Log friction as it happens: one line in `docs/FRICTION.md` for any retry, escalation, gate block, founder override or bug that slipped past QA.
* Commit often, push at task boundaries (each push runs full CI).
* Writing style for docs: short sentences, plain words, no dashes as punctuation.

## Lessons learned

Add a line when something went wrong and was fixed. Keep at most 10; move older ones to `docs/archive/lessons.md`. Format: `* YYYY-MM-DD: lesson (what to do instead)`.

* 2026-10-17: With several developers in parallel, a scoped test run can pass while the full suite fails. Run the full `npm test` and `npm run typecheck` before every commit; typecheck with the in-flight file excluded if one is mid edit.
* 2026-10-17: Linux WebKit in CI drops iOS only CSS like -webkit-touch-callout from computed style. Test the shipped stylesheet rule instead.
* 2026-10-19: Every push queues a full CI run. Commit often, but push at task boundaries (a finished task, a signoff, the end of a turn).
* 2026-10-25: Two sessions used the same decision numbers. Fetch `main` before adding a decision row.
* 2026-10-26: Large docs read whole cost most of the tokens. Grep by AC, task or decision id instead.
