# Handoff, 2026-11-16 06:45, the monster feature set is live

## Task
Founder: "Ok werkt op de iPad, bouw de rest", "Alles mag live", "Doe daarna volledige tests en push to main", "merge zodra CI groen is". Done.

## State
* **Live on main:** 0.6.0 to 0.12.0 (PR #25, #26, #27, #28, all with green WebKit CI). The last one, PR #28: v19 Ridderuitrusting, v20 Diepe edelstenen, v21 Meer uitrusting.
* Branch claude/jolly-fermi-z0vak4 equals main plus this note. No open PR. PRD section 12 still holds v15, v16, v19, v20, v21 (all shipped); the next /release moves them to `docs/releases/`.
* Rules changed this session: standing approval for PRD scope the founder asked for (decision 136).

## Next steps
1. Founder iPad checks, listed in `docs/STATUS.md` and `docs/TEST_REPORT.md`.
2. /release for the next thing. Backlog: v6 Wat heb ik geleerd (open founder question MOQ15), v12 to v14, v4, v5.
3. /retro is due (4 releases shipped): send decision 136 and the friction lines of 2026-11-15 and 16 to the factory.

## Watch out
* A second session works in this repo. Fetch main before a decision number (next free: 143) and before pushing.
* WebKit runs locally in the `minespel` environment (`npx playwright install webkit` once per container). Run the WebKit suite before a pull request: Chromium green was not enough for PR #27.
* `tests/e2e/exam.spec.ts:254` AC112 is flake TD22. `loginAsParent` taps with force (see docs/FRICTION.md).
* The e2e hook `knightMeshes` lives in `src/render/actor-render.ts`, not in the hooks file.

<!-- auto-snapshot:start -->
## Auto snapshot before compaction (2026-11-16 09:30 UTC, auto)
- Branch: claude/jolly-fermi-z0vak4 @ 49ad4f3
- Uncommitted: src/app/boot.ts, src/app/knight-flow.test.ts, src/app/shop-flow.ts, src/audio/near-mix.ts, src/audio/near-recipes.ts, src/audio/near-sounds.ts, src/knights/guard-report.test.ts, src/knights/guard-report.ts, src/knights/knight-ai.test.ts, src/knights/knight-system.test.ts …
- Last commits: 49ad4f3 feat(V22a): seams for v22 to v24: saved moles, backup formats 6 and 7, the chase mode, stubs for the pill, the lavakip bar and near sounds | 10a9565 docs: v22 knight and mole rules (decision 145), plan v22 to v24, 11 tasks (decision 144) | 76db9a8 docs: scope v22 Duidelijke mol en kompas, v23 Lavakip-bar, v24 Geluid dichtbij (decision 143); archive v15 to v21
<!-- auto-snapshot:end -->
