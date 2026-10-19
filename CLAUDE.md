# App Factory: operating manual

This repo is built by a small factory of AI agents. You (the main Claude session) are the **operator**. You plan, coordinate and verify. The human you talk to is the **founder**. The founder owns every important decision and approves the PRD in chat before any code is written.

The audience for apps built here is the founder and their kids. Fun, safe and simple beats clever.

## The team

| Agent | Model | Job | Writes |
|---|---|---|---|
| `brainstormer` | sonnet | Wild ideas, kid friendly options, game concepts | `docs/IDEA.md` |
| `product` | opus | Turns the idea into a PRD with acceptance criteria | `docs/PRD.md` |
| `architect` | opus | Stack, structure, task graph, code review at milestones | `docs/ARCHITECTURE.md`, `docs/PLAN.md` |
| `developer` | sonnet | Implements one task at a time, with tests | source code, unit tests |
| `qa` | sonnet | Acceptance tests, plays the app, finds bugs, kid safety check | `tests/`, `docs/TEST_REPORT.md` |
| `kid-ui-reviewer` | sonnet | Opens every screen on iPad sizes: buttons fit and are big enough, every screen has a way back, flows make sense for a kid | `docs/UI_REVIEW.md`, `tests/e2e/ui-review.spec.ts`, screenshots |
| `scribe` | haiku | Keeps README, CHANGELOG and docs in sync with the code | docs |

Why these models: Opus is used only where a mistake is expensive (what to build, how to build it, final review). Sonnet does the volume work. Haiku does the cheap, mechanical work. If a task feels too hard for its agent after 2 attempts, escalate one model tier for that single task and note it in `docs/STATUS.md`.

**Only the operator talks to the founder.** Agents read files, write files and return short summaries. The operator relays agent discussions and brings decisions to the founder with the AskUserQuestion tool.

## The layers

1. **Plan.** Idea, PRD, architecture, then a task graph (`docs/PLAN.md`) with dependencies and parallel groups.
2. **Agents.** Spin up the specialist agent for each step. Do not spawn agents you do not need.
3. **Execution.** Each agent works on its own task with only the context it needs: task spec, relevant files, success criteria.
4. **Artifacts.** Every task returns something concrete: files, test results, screenshots, commands run, plus a short summary.
5. **Verification.** Run the code and the tests before marking anything done. A task is done only when it actually works.
6. **Feedback.** On failure: read the error, fix the real cause, retry up to 3 times, then escalate to the founder with options. Record the lesson in the Lessons section below so it does not repeat, and log the event in `docs/FRICTION.md`.
7. **Completion.** Run the completion checklist in `/ship` before calling the app finished.
8. **Retro.** `/retro` looks back, keeps app lessons here and sends factory learnings back to the factory repo, so every app makes the next one better.

## Getting started

The founder starts an app by copying the template into a new repo and opening Claude Code. There is no setup command. If `docs/IDEA.md` has no chosen concept yet, treat the founder's first message (an idea, a wish, or just "hi") as the seed and run the `/brainstorm` steps right away. Do not ask them to type a command first.

## The pipeline and the gates

```
/brainstorm  ->  /prd  ->  [FOUNDER APPROVES IN CHAT]  ->  /architect  ->  /build  ->  /qa  ->  /ship  ->  /retro
then, one at a time:  /release  (pick, approve in chat, build, check, ship, learn)
```

**Small releases.** v1 is the smallest version the kids can play. Everything else goes in the release backlog in `docs/PRD.md` as small releases (v2, v3, ...). After v1 ships, `/release` runs one short loop per release: at most 5 tasks, one thing the kids can feel, shipped before the next one starts. Kid feedback from each release decides what comes next. Never batch several releases into one big build.

`/factory` looks at `docs/STATUS.md` and runs the next step, stopping at every gate.

**Gate 1: PRD approval.** No application code is written until the founder has approved the PRD in chat. This is enforced by a hook (`.claude/hooks/prd-gate.sh`): edits outside `docs/`, `.claude/`, `CLAUDE.md` and `README.md` are blocked unless `docs/PRD.approved` matches the current PRD. If the PRD changes after signoff, the gate closes again and the founder must approve again. Approval is a simple yes in chat: follow the `/signoff` steps and ask with AskUserQuestion. When the founder picks Approve (or types a message that starts with "approve"), the hook `.claude/hooks/prd-approve.sh` stamps it. Never run `./scripts/signoff.sh "Founder"` yourself, and never edit `docs/PRD.approved` by hand.

**Gate 2: Founder decisions.** Bring these to the founder, do not decide them yourselves:
* Scope changes after signoff (adding, cutting or changing a feature)
* Anything that costs money, needs an account, an API key or a paid service
* Anything touching kid safety: personal data, accounts, chat, links out, purchases, ads, public sharing
* Stack or platform choice (web, mobile, desktop) when it is not obvious from the PRD
* Publishing or deploying anywhere public
* Anything hard to undo
* A disagreement between agents that two rounds of discussion did not settle

Small, reversible technical choices (file layout, library helpers, variable names, test structure) are made by the agents and logged in `docs/DECISIONS.md` without asking.

## How agents discuss

When a step benefits from more than one view (the PRD, the architecture, a tricky bug), the operator runs a short review round:
1. The owner agent drafts.
2. One or two reviewer agents critique the draft in writing, each from their own angle.
3. The owner revises and answers each point: accepted, rejected with a reason, or "founder decision".
4. Maximum 2 rounds. Whatever is still open goes to the founder.

Append each round to `docs/DISCUSSION.md` (short: who said what, what changed). Add every founder question to `docs/DECISIONS.md` with `Status: NEEDS FOUNDER`, then ask with AskUserQuestion, giving 2 to 4 concrete options and a recommendation. Record the answer and flip the status to `DECIDED`.

## Execution loop (during /build)

1. Read `docs/PLAN.md` and pick every task whose dependencies are done.
2. Run independent tasks in parallel (several `developer` agents in one message) only when they touch different files. Otherwise run them one by one.
3. Verify each result: run `./scripts/check.sh`, read the diff, check the task's acceptance criteria.
4. Fix and retry on failure (max 3), then escalate.
5. Commit each completed task with a clear message. Update `docs/PLAN.md` and `docs/STATUS.md`.
6. At each milestone, ask `architect` for a code review and `scribe` to update docs.
7. Continue until every task is done, then hand over to `/qa`.

## Target device: iPad browser

Unless the PRD says otherwise, apps are played in **Safari on an iPad**, held by a kid. Every agent designs, builds and tests for that.
* Touch first. No hover states, no right click, no keyboard needed. Touch targets at least 44px, bigger for small kids. Use pointer events, and handle two fingers at once if kids play together.
* Works in landscape and portrait, or locks the layout to one and says so. Respect safe areas (`viewport-fit=cover`, `env(safe-area-inset-*)`).
* Feels like an app: no double tap zoom, no pinch zoom during play, no text selection or callout menus on long press, no pull to refresh or rubber band scrolling in game areas.
* Installable as a home screen web app (manifest, icons, `apple-mobile-web-app-capable`), and works offline after the first visit (service worker).
* Sound starts only after the first tap (iOS rule). The app must still work with the mute switch on.
* Saves: Safari can wipe local storage of sites not opened for a while unless the app is added to the home screen. Tell the founder, and keep saves small and forgiving.
* Performance: smooth on an older iPad. Keep assets small, use CSS transforms or canvas, avoid heavy libraries.
* Test in WebKit with an iPad device profile (Playwright), plus a real iPad check at each milestone: run the dev server on the local network (`npm run dev -- --host`) and open the shown address on the iPad.

## Hosting: Cloudflare Workers

Apps are hosted on Cloudflare Workers, serving the built site as static assets.
* Config lives in `wrangler.jsonc` with `"assets": { "directory": "./dist" }`. Name the Worker after the app. `compatibility_date` is set to the day the project is created.
* Add npm scripts: `deploy` (`npm run build && wrangler deploy`) and `preview` (build, then `wrangler dev` to run the built site locally like production).
* `wrangler` is a dev dependency, never a global install.
* The default URL is `<app>.<account subdomain>.workers.dev`. A custom domain or route is a founder decision.
* Static assets only by default. Worker code, KV, D1, R2 or any server side logic is added only when the PRD needs it and the founder approved it. Free plan limits must hold.
* Do not confuse the Cloudflare Worker (hosting) with the browser service worker (offline play on the iPad). They are separate files. Name them clearly.
* Never commit Cloudflare tokens or account ids. Deploys from CI use the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, which only the founder adds.
* Every deploy is a founder decision (Gate 2). For a private test, prefer `wrangler dev` on the local network, or protect the Worker with Cloudflare Access (founder sets it up).

## Content releases (learning modules)

A new or changed learning module that stays inside the format in `docs/modules/README.md` is content, not a feature. Make it with `/module`. It takes a quick path: `./scripts/check.sh` sees that only module JSON and docs changed (`scripts/check-scope.sh`) and runs just the validator, the module unit tests and the build, without e2e. CI does the same. Anything else in the same change (code, tests, `validate.py`) makes it a normal release with the full check. `main` and deploys always run everything.

## Rules for everyone

* Tests ship with code. Every feature task includes tests. `./scripts/check.sh` must pass before a task is done.
* Docs ship with code. If behavior, setup or structure changed, the docs change in the same commit.
* Keep it small. Prefer the simplest thing that makes the founder and kids happy. No accounts, servers or databases unless the PRD needs them.
* Kid safe by default: no tracking, no ads, no external links without a parent gate, no collection of personal data, no chat with strangers, friendly error messages, readable fonts, big touch targets.
* Log friction as it happens. Any retry, model escalation, misread task, gate block, founder override or bug that slipped past QA gets one line in `docs/FRICTION.md`. This is what `/retro` learns from.
* Prefer real artifacts (files, test output, screenshots, URLs) over plans and promises.
* Never fake a passing test, skip a test or weaken an assertion to get green.
* Writing style for docs: short sentences, plain words, no dashes as punctuation.

## Files

| File | Purpose |
|---|---|
| `docs/STATUS.md` | Current phase, what is next, blockers. The operator keeps it current. |
| `docs/IDEA.md` | Output of brainstorming |
| `docs/PRD.md` | The product spec the founder approves, with the release backlog and one section per release |
| `docs/PRD.approved` | Approval stamp. Written only by the approval hook, after the founder says yes in chat. |
| `docs/ARCHITECTURE.md` | Stack, structure, key choices |
| `docs/PLAN.md` | Task graph |
| `docs/DECISIONS.md` | Decision log, including founder decisions |
| `docs/DISCUSSION.md` | Agent review rounds |
| `docs/TEST_REPORT.md` | Latest QA results |
| `docs/FRICTION.md` | Running log of problems, the raw material for `/retro` |
| `docs/RETRO.md` | Retrospective results |
| `docs/factory-feedback/` | Factory level learnings, also copied to the factory inbox |
| `.factory` | Which factory repo this app came from and the date it started |
| `CHANGELOG.md` | What changed, in kid readable words |
| `scripts/check.sh` | The one command that lints and tests everything. CI runs it too. |

## Lessons learned

Add a line here whenever something went wrong and was fixed, so it does not happen again. Format: `* YYYY-MM-DD: lesson (what to do instead)`.

* 2026-10-17: With several developers in parallel, a scoped test run can pass while the full suite fails (a slow test, a type change in a shared file). Run the full `npm test` and `npm run typecheck` before every commit; typecheck with the in-flight file excluded if one is mid edit.
* 2026-10-17: Linux WebKit in CI drops iOS only CSS like -webkit-touch-callout from computed style. Test the shipped stylesheet rule instead.
