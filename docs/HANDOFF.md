# Handoff, 2026-11-15 21:00, overnight build of v15 Grote wereld and v16 Monstermol

## Task
Founder (asleep, looks again tomorrow): "ok kun je de mol en grote wereld ook bouwen", "ga zo door, ik kijk morgen", "outsource to cheaper models if possible". Earlier: "push that live" for Ridders and bubble.

## State
* **Live on main:** 0.6.0 (PR #25) and 0.7.0 v17 Ridders + v18 Zwarte bubbel (PR #26).
* **Built on the branch, not live:** 0.8.0 v15 Grote wereld and 0.9.0 v16 Monstermol, all 10 tasks done and pushed. See `docs/STATUS.md` for the test numbers and what is open.
* Branch claude/jolly-fermi-z0vak4. No open PR.

## Next steps
1. The full check is green on aa155f2 (1477 unit, 328 e2e, local Chromium).
2. Wait for the founder's iPad test (AC241, AC256, AC210, AC227). Do not merge v15 or v16 before it.
3. On the founder's word: one pull request for 0.8.0 and 0.9.0, green CI, merge.
4. Then /release for v19 Ridderuitrusting (standing approval, decision 136).

## For the founder tomorrow
* iPad checks open: AC210 and AC227 (0.7.0 speed with knights and Klodder), AC241 (big world speed and cold start), AC256.
* Open question MOQ15: where v6 goes (assumed after v20).
* PRD changes no longer need a tap for scope the founder asked for (decision 136).

## Watch out
* A second session works in this repo (decisions 128, 129). Fetch main before a decision number and before pushing.
* e2e runs in local Chromium here. `tests/e2e/exam.spec.ts:254` AC112 is flake TD22 (1 in 3). Do not skip it.
* The stop hook asks to commit and push every turn; never commit a developer's half done work.
