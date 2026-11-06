# Handoff, 2026-11-06 18:40, build v3 Dino's veilig (0.6.0), then v6

## Task
Founder: "build v11, v3, v6". v11 already shipped (0.5.0). Build v3 now as 0.6.0, then v6 as 0.7.0, each with its own scope signoff and pull request (decision 119).

## State
* Branch `ccr-89499325-bddp4g`, PR #17 (open, not merged; merging to main deploys, founder only).
* v3 scope is in docs/PRD.md section 12, founder approved (40c637b). New criteria AC192 to AC199; tasks T18, T19, T53a, T55 (AC199 lock goes in T55). v11 archived in docs/releases/v11.md.
* Dashboard (decision 118): scripts/dashboard.py done (73a578e); delivery metrics, tech debt counts and scripts/ci_runs.py were being finished by an agent at 18:40. If uncommitted work is left in scripts/ or metrics/, check it (`python3 scripts/test_dashboard.py`), commit it, and republish dashboard/index.html to https://claude.ai/artifact/TigpxQDByMmDuqBLjNK6Ug.
* docs/TECH-DEBT.md: 14 open (2 major: TD1 refresh loses last block, decision 72; TD2 world stops saving if storage opens after 3 s).

## Next steps
1. `/release` step 3 for v3: 4 tasks plus a lock, so not the fast lane. Launch `architect` in release mode to put T18, T19, T53a, T55 in docs/PLAN.md for milestone v3, then `/build`, `/qa` (tests for AC192 to AC199, full check), then `/ship` (0.6.0, CHANGELOG: Unreleased goes into 0.6.0). One push per release.
2. After v3 ships: `/release` for v6 Wat heb ik geleerd (0.7.0). A first slice exists (decision 115, src/learning/progress-stats.ts).
3. Still open from the health brief: PR #15 (true STATUS; its decision 114 clashes with main, and its SessionStart hook clashes with PR #17), 6 stale branches, docs/STATUS.md is stale.

## Watch out
* Any PRD edit closes the gate and blocks scripts/ and src/ edits until the founder signs again. Do script work before or after a PRD edit.
* .claude/hooks and .claude/settings.json are protected; edit only with the founder's explicit yes.
* Herd limit is 25 (decision 111); AC101 and AC190 keep 12 on purpose.

## Pointers
* Decisions 117 to 119 in docs/DECISIONS.md. v3 draft history: docs/BACKLOG.md `### v3`.
