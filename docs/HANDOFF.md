# Handoff, 2026-11-16, 0.10.0 to 0.12.0 built on the branch

## Task
Founder, 2026-11-16: "Ok werkt op de iPad, bouw de rest". v19 Ridderuitrusting, v20 Diepe edelstenen and v21 Meer uitrusting are built (V19a to V21c, decisions 140 to 142).

## State
* **Live on main:** 0.6.0 to 0.9.0 (PR #25, #26, #27).
* **On branch claude/jolly-fermi-z0vak4, not live:** 0.10.0, 0.11.0, 0.12.0. Package version is 0.12.0. Not pushed, no open PR.
* Test numbers and open iPad checks: `docs/TEST_REPORT.md`, v21 section.

## Next steps
1. Operator verifies V21c with `./scripts/verify.sh task V21c`, then commits.
2. One pull request for 0.10.0 to 0.12.0. Wait for green WebKit CI.
3. Merge (the founder said so on 2026-11-16).
4. Only v6 is left in the backlog (open founder question MOQ15: where v6 goes).

## Open for the founder
* iPad: AC290 (speed with three fully dressed knights, both mounts, bubbles) and AC279 (stones), on a test deploy.

## Watch out
* A second session works in this repo. Fetch main before a decision number and before pushing.
* WebKit runs locally now, in the `minespel` environment. `check.sh` uses it.
* `tests/e2e/exam.spec.ts:254` AC112 is flake TD22. Do not skip it.
