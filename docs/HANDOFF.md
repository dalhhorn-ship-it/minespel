# Handoff, 2026-11-16, v22 to v24 ready for a pull request

## Task
Ship v22 Duidelijke mol en kompas (0.13.0), v23 Lavakip-bar (0.14.0) and v24 Geluid dichtbij (0.15.0). Code and docs are done on the branch. Next is the pull request to main, which waits for the founder's yes.

## State
* **Live on main:** 0.6.0 to 0.12.0 (PR #25 to #28). Main is still at 0.12.0.
* **Branch claude/jolly-fermi-z0vak4 at 0c676b4:** 0.13.0, 0.14.0 and 0.15.0. All 11 tasks V22a to V24c are done. Full check green in WebKit: 1922 unit tests, 487 e2e tests. Scope and design are in decisions 143 to 145.
* PRD section 12 still holds v22 to v24. The next `/release` moves them to `docs/releases/` once merged.

## Next steps
1. Open a pull request from the branch to main. Merge at green CI, after the founder says yes (Gate 2, merging deploys).
2. Founder iPad checks for v22 to v24: top section of `docs/TEST_REPORT.md`. The founder also has to listen to the new sounds.
3. `/retro` is due: send decision 136 and the friction lines to the factory.
4. Open question MOQ15: where v6 Wat heb ik geleerd goes.

## Watch out
* A second session works in this repo. Fetch main before a decision number (next free: 146) and before pushing.
* Lesson: on this fast machine a whole e2e card cycle fits in the 350 ms double tap guard. Helpers must tap again or wait.
* WebKit runs locally in the `minespel` environment (`npx playwright install webkit` once per container). Run the WebKit suite before a pull request: Chromium green was not enough for PR #27.
* `tests/e2e/exam.spec.ts:254` AC112 is flake TD22. `loginAsParent` taps with force (see docs/FRICTION.md).
* The e2e hook `knightMeshes` lives in `src/render/actor-render.ts`, not in the hooks file.

<!-- auto-snapshot:start -->
## Auto snapshot before compaction (2026-11-16 09:30 UTC, auto)
- Branch: claude/jolly-fermi-z0vak4 @ 49ad4f3
- Uncommitted: src/app/boot.ts, src/app/knight-flow.test.ts, src/app/shop-flow.ts, src/audio/near-mix.ts, src/audio/near-recipes.ts, src/audio/near-sounds.ts, src/knights/guard-report.test.ts, src/knights/guard-report.ts, src/knights/knight-ai.test.ts, src/knights/knight-system.test.ts …
- Last commits: 49ad4f3 feat(V22a): seams for v22 to v24: saved moles, backup formats 6 and 7, the chase mode, stubs for the pill, the lavakip bar and near sounds | 10a9565 docs: v22 knight and mole rules (decision 145), plan v22 to v24, 11 tasks (decision 144) | 76db9a8 docs: scope v22 Duidelijke mol en kompas, v23 Lavakip-bar, v24 Geluid dichtbij (decision 143); archive v15 to v21
<!-- auto-snapshot:end -->
