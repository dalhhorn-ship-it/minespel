# Handoff, 2026-11-15 21:00, overnight build of v15 Grote wereld and v16 Monstermol

## Task
Founder (asleep, looks again tomorrow): "ok kun je de mol en grote wereld ook bouwen", "ga zo door, ik kijk morgen", "outsource to cheaper models if possible". Earlier: "push that live" for Ridders and bubble.

## State
* **Live on main:** 0.6.0 (PR #25) and **0.7.0 v17 Ridders + v18 Zwarte bubbel** (PR #26, merged 8c29fbd, green WebKit CI).
* PRD section 12 also holds v15 (AC230 to AC243) and v16 (AC244 to AC257), stamped on the standing approval (decisions 136, 137). The gate is open. Plan: V15a to V15e, V16a to V16e in `docs/PLAN.md` (decision 138).
* V15a done (b5301d0). A developer was building **V15b** (the switch to 128 x 128 x 80 and the move of old saves) when this note was made: check `git status`.
* Branch claude/jolly-fermi-z0vak4, merged with main after PR #26. No open PR.

## Next steps
1. V15b: `./scripts/verify.sh task V15b --no-check`, full `./scripts/check.sh`, commit. Then V15c + V15d in parallel, then V15e (0.8.0). Then V16a, V16b + V16c in parallel, V16d, V16e (0.9.0).
2. Developers do not commit; the operator commits after the check. verify.sh does not read file names inside brackets in a plan row.
3. Push the branch after each verified task. **Do not merge v15 or v16 to main**: v15 waits for the founder's test on the oldest iPad (AC241; fallback `?near=1`), v16 builds on v15. Open one PR for 0.8.0 plus 0.9.0 only when the founder says so.
4. Update `docs/STATUS.md` (stale, still says v11) with what is live and what waits for the founder.

## For the founder tomorrow
* iPad checks open: AC210 and AC227 (0.7.0 speed with knights and Klodder), AC241 (big world speed and cold start), AC256.
* Open question MOQ15: where v6 goes (assumed after v20).
* PRD changes no longer need a tap for scope the founder asked for (decision 136).

## Watch out
* A second session works in this repo (decisions 128, 129). Fetch main before a decision number and before pushing.
* e2e runs in local Chromium here. `tests/e2e/exam.spec.ts:254` AC112 is flake TD22 (1 in 3). Do not skip it.
* The stop hook asks to commit and push every turn; never commit a developer's half done work.
