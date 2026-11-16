# Handoff, 2026-11-16, 0.13.0 to 0.15.0 are live

## Task
Ship v22 Duidelijke mol en kompas (0.13.0), v23 Lavakip-bar (0.14.0) and v24 Geluid dichtbij (0.15.0). Done.

## State
* **Live on main:** 0.6.0 to 0.15.0 (PR #25 to #29). PR #29 merged as 266836a with green WebKit CI on 25f2197. The founder said yes (decision 146).
* Branch claude/jolly-fermi-z0vak4 equals main plus this note. No open PR.
* PRD section 12 still holds v22 to v24 (shipped). The next `/release` moves them to `docs/releases/`.
* CI went red five times on PR #29. One real bug (the Lavakip card read old points, fixed) and test races (fixed). See the 2026-11-16 lines in `docs/FRICTION.md`.

## Next steps
1. Founder iPad checks for v22 to v24: top section of `docs/TEST_REPORT.md`. The founder also has to listen to the new sounds.
2. Six e2e cases fail when the suite runs with 7 workers on 4 cores (they pass on CI and with the default workers): `bubble.spec.ts:24`, `context-loss.spec.ts:38`, `guard.spec.ts:30`, `ridder-klodder.spec.ts:83`, `stones.spec.ts:25`, `world-move.spec.ts:124`. Find out for each if it is a test race or a real bug.
3. `/retro` is due: send decision 136 and the friction lines to the factory.
4. Open question MOQ15: where v6 Wat heb ik geleerd goes.

## Watch out
* A second session works in this repo. Fetch main before a decision number (next free: 147) and before pushing.
* A new e2e case must pass with `--repeat-each 6 --workers 3` before a push. A state the game reads again in the background (points, switches) needs a wait on the real condition in the test.
* CI prints the error context of a red e2e case in the job log. Read that first. The artifact host is not reachable from this cloud session.
* WebKit runs locally in the `minespel` environment (`npx playwright install webkit` once per container).
* `tests/e2e/exam.spec.ts:254` AC112 is flake TD22. `loginAsParent` taps with force (see docs/FRICTION.md).
* The e2e hook `knightMeshes` lives in `src/render/actor-render.ts`, not in the hooks file.

<!-- auto-snapshot:start -->
## Auto snapshot before compaction (2026-11-16 09:30 UTC, auto)
- Branch: claude/jolly-fermi-z0vak4 @ 49ad4f3
- Uncommitted: src/app/boot.ts, src/app/knight-flow.test.ts, src/app/shop-flow.ts, src/audio/near-mix.ts, src/audio/near-recipes.ts, src/audio/near-sounds.ts, src/knights/guard-report.test.ts, src/knights/guard-report.ts, src/knights/knight-ai.test.ts, src/knights/knight-system.test.ts …
- Last commits: 49ad4f3 feat(V22a): seams for v22 to v24: saved moles, backup formats 6 and 7, the chase mode, stubs for the pill, the lavakip bar and near sounds | 10a9565 docs: v22 knight and mole rules (decision 145), plan v22 to v24, 11 tasks (decision 144) | 76db9a8 docs: scope v22 Duidelijke mol en kompas, v23 Lavakip-bar, v24 Geluid dichtbij (decision 143); archive v15 to v21
<!-- auto-snapshot:end -->
