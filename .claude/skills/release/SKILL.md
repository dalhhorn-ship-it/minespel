---
name: release
description: After v1 has shipped, run one short release loop. Pick the next small feature with the most value for the kids, approve it in chat, build it, test it, ship it and learn from it. One release at a time. Use when the founder says "next", "add", "what's next" or asks for a new feature after v1.
argument-hint: "[optional: the feature or wish for this release]"
---

You are the operator. A release is a small slice of value the kids can feel. It ships on its own, in a short loop, before the next one starts.

## Size rules

* One clear thing the kids get ("you can now save your rocket"), not a list of chores.
* At most 5 tasks and about one building session. If it is bigger, split it and ship the first part.
* Every release is playable and shippable by itself. No half features behind it.
* Fixes for bugs the kids found count as a release too, and go first.

## Fast lane (3 tasks or fewer)

Most releases are this small. Then keep it lean, because every extra agent and every push costs time and tokens:
* No architect. The operator writes the tasks in `docs/PLAN.md` itself. Call `architect` only if the design must change.
* One `developer` does the tasks one after another, so nothing collides and nothing needs merging.
* `qa` writes tests only for the new ACs and runs `./scripts/check.sh` once at the end.
* No scribe. The operator adds the CHANGELOG line and updates `docs/STATUS.md` in the same commit as the code.

## One push per release

Commit locally after each task, but do not push. Push once, when the whole release passes `./scripts/check.sh`, and open one pull request (or push to `main` if this session may). That is one CI run instead of one per commit. Never push docs only commits on their own during a release.

## 1. Pick

1. Read `docs/BACKLOG.md` (the release backlog, not signed), `docs/RETRO.md`, `docs/FRICTION.md`, the CHANGELOG and $ARGUMENTS.
2. Launch `product` in release mode to rank the backlog by value for the kids against size, add any new wishes, and split anything too big.
3. Ask the founder with AskUserQuestion which release is next: the top 2 or 3 options, each with what the kids get and its size, recommendation first.

## 2. Scope and approve

1. Launch `product` to write the release section in `docs/PRD.md` section 12: goal, in, out, and new acceptance criteria that continue the AC numbers. Section 12 holds only this next release. In the same edit, product moves the section of the release that shipped before it to `docs/releases/vN.md` (unchanged) and its criteria into section 7, so that is one signoff. In the same commit, that release's review rounds move from `docs/DISCUSSION.md` to `docs/archive/DISCUSSION-vN.md` (point any link to them at the new file), so the live file holds only open rounds. It marks the release `next` in `docs/BACKLOG.md` and sets `Status: READY FOR SIGNOFF`.
2. Only if the release touches a Gate 2 topic (kid safety, money, accounts, platform), add a quick `architect` or `qa` review. Otherwise skip the review round.
3. Run the `/signoff` steps. The summary is short: what the kids get, the new ACs, what is left out.

## 3. Plan and build

1. Fast lane: the operator adds the tasks to `docs/PLAN.md` with milestone `vN`. Bigger releases: launch `architect` in release mode for this. No redesign unless the release needs it.
2. Run the `/build` steps for these tasks only. Commit locally, do not push yet.

## 4. Check

Run the `/qa` steps in release mode: tests for the new ACs, the full `./scripts/check.sh` so nothing old broke, and a short play session on the iPad profile. Run the full UI review (`npm run test:e2e:ui-review`, or CI Run workflow with "Also run the full UI review") only when this release changes a lot of UI, or when about 5 releases have shipped since the last one (date at the top of `docs/UI_REVIEW.md`). Ask the founder when unsure (decision 106).

## 5. Ship

Push the release once (see One push per release). Then run the `/ship` steps for a release: the next minor version (v2 is `0.2.0`, v3 is `0.3.0`), CHANGELOG, deploy decision, tag. After it ships, move the release's done rows and task notes from `docs/PLAN.md` to `docs/releases/plan-done.md`, so the plan holds only open work.

## 6. Learn

Ask the founder and kids two quick questions with AskUserQuestion: did they like the new thing, and what should come next. Put the answers in `docs/BACKLOG.md`. Add one line per real problem to `docs/FRICTION.md`. Run the full `/retro` only every 3 releases or when friction grew.

Rewrite `docs/STATUS.md` short (current release, next step, open founder checks, blockers; no done log) and end with the next release you recommend.
