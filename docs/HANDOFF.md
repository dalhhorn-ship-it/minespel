# Handoff, 2026-11-15 19:35, v17 Ridders and v18 Zwarte bubbel build (plan in progress)

## Task
Founder: "Maak de wereld dieper ... monster mol, zwarte bubbel, ridders, uitrusting, zeldzame stenen, aan en uit in het oudermenu", then "OK bouw zo volgorde 1-3", "stop testing, build what we just discussed and push that live. Fix the rest in parallel, we need to deliver this fast", "outsource to cheaper models if possible".

## State
* v3 Dino's veilig (0.6.0) is live: PR #25 merged to main (f5aea78) with green WebKit CI. T53a done (24c3519), verify.sh and verifier PASS.
* Draft `docs/MONSTERS_PRD.md` (v16 to v21), reviewed by architect and qa (`docs/DISCUSSION.md`, MONSTERS_PRD review round 1). Decisions 130 to 134. Shipping order: v17 and v18 together as 0.7.0, then v15, v16, v19, v20, v21.
* PRD section 12 holds v17 Ridders and v18 Zwarte bubbel, AC200 to AC229. **Signed by the founder today** (0efd63f), the build gate is open. Any PRD edit closes it.
* The architect was writing the task plan (V17a.., V18a.. in `docs/PLAN.md`, decision 135) when this note was made. Its doc edits may be uncommitted: check `git status`, then commit them.
* Branch claude/jolly-fermi-z0vak4, merged with main after PR #25. No open PR.

## Next steps
1. If `docs/PLAN.md` has no V17 rows, launch `architect` in release mode again (brief: parallel safe tasks, every file named, seams task first).
2. /build: sonnet developers, parallel where the plan says files do not overlap. Tell developers NOT to commit; run `./scripts/verify.sh task <ids>` on the working tree, then the operator commits. One haiku verifier per batch.
3. Founder asked for speed: skip the extra review rounds and the separate qa play session. Keep `./scripts/check.sh` once at the end and green CI.
4. Push once, open one PR, merge when CI is green (the founder said push live for this build), version 0.7.0 and CHANGELOG.
5. Update `docs/STATUS.md` (stale: still says v11). Open founder question MOQ15: where v6 goes (assumed after v20).

## Watch out
* A second session works in this repo (branch claude/trusting-hypatia-amvord, decisions 128 and 129, animals roam and avoid lava). Fetch main before taking a decision number and before pushing.
* WebKit does not download in this sandbox; e2e runs in local Chromium. `tests/e2e/exam.spec.ts:254` AC112 is flake TD22 (1 in 3, with and without changes). Do not skip it.
* The stop hook asks to commit and push every turn; do not commit agents' half done work.
* Context hook: big docs are read by slice only.
