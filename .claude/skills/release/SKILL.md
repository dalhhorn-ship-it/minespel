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

## 1. Pick

1. Read `docs/PRD.md` section 5 (Release backlog), `docs/RETRO.md`, `docs/FRICTION.md`, the CHANGELOG and $ARGUMENTS.
2. Launch `product` in release mode to rank the backlog by value for the kids against size, add any new wishes, and split anything too big.
3. Ask the founder with AskUserQuestion which release is next: the top 2 or 3 options, each with what the kids get and its size, recommendation first.

## 2. Scope and approve

1. Launch `product` to write the release section in `docs/PRD.md` (section 12): goal, in, out, and new acceptance criteria that continue the AC numbers. It sets `Status: READY FOR SIGNOFF`.
2. Only if the release touches a Gate 2 topic (kid safety, money, accounts, platform), add a quick `architect` or `qa` review. Otherwise skip the review round.
3. Run the `/signoff` steps. The summary is short: what the kids get, the new ACs, what is left out.

## 3. Plan and build

1. Launch `architect` in release mode. It adds the release tasks to `docs/PLAN.md` with milestone `vN`. No redesign unless the release needs it.
2. Run the `/build` steps for these tasks only.

## 4. Check

Run the `/qa` steps in release mode: tests for the new ACs, the full `./scripts/check.sh` so nothing old broke, and a short play session on the iPad profile.

## 5. Ship

Run the `/ship` steps for a release: the next minor version (v2 is `0.2.0`, v3 is `0.3.0`), CHANGELOG, deploy decision, tag.

## 6. Learn

Ask the founder and kids two quick questions with AskUserQuestion: did they like the new thing, and what should come next. Put the answers in the backlog. Add one line per real problem to `docs/FRICTION.md`. Run the full `/retro` only every 3 releases or when friction grew.

Update `docs/STATUS.md` (current release, next in the backlog) and end with the next release you recommend.
