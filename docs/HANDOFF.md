# Handoff, 2026-11-06 20:30, v3 Dino's veilig build (3 of 5 tasks done)

## Task
Founder: "build v11, v3, v6". v11 shipped (0.5.0). Build v3 as 0.6.0, then v6 as 0.7.0, each with its own scope signoff and pull request (decision 119).

## State
* Done and verified (verify.sh PASS plus verifier PASS): T19 share helpers 41f7f16, T55b break lock e61e881, T18 backup file 5884ec8. Plan by architect adaafb5 (decision 120: T55 split into T55a and T55b, 5 tasks).
* Also done this session: backlog v12 Dino-Hoed, v13 Dino-Eten, v14 Bouw-Opdracht (a6e2d64); draft unsigned docs/GAME_LOOP_PRD.md (4ff8d92, 10 founder questions GLQ12-1 to GLQ14-4, ask at /release); dashboard Roadmap tab 9b45056, republished to https://claude.ai/artifact/TigpxQDByMmDuqBLjNK6Ug; check.sh Chromium fallback fix fa8c462.
* danfactory backflow: pushed branch claude/dashboard-backflow-from-minespel (e3ab375) in dalhhorn-ship-it/danfactory, clone at /home/user/danfactory. No PR, not merged. Founder has not said yet whether to open a PR.
* PR #17 merged to main 2026-11-06 (d531a19, deploys): v3 part 1 is live (break lock; backup code has no UI yet). Version still 0.5.0. Branch ccr-89499325-bddp4g restarted from main; next work opens a new PR.

## Next steps
1. Founder closed for the day on 2026-11-06. On return: /build V3-B: one developer for T55a (grep "| T55a " docs/PLAN.md). Tell it: pass `halt` to replaceAll is no longer needed for safety (db.ts halt flag), but Alles wissen must use replaceAll(db, null) then reload; it may wire `db` into createWorldSave to really delete worldV1 (now put null).
2. Then V3-C: T53a. Tell it: make the backup file when the section opens and call shareFile straight from the tap (iPad Safari rule); pass appVersion (__APP_VERSION__ from T55a) to replaceAll; then reload. It sets 0.6.0 and the CHANGELOG (AC198).
3. Each batch: ./scripts/verify.sh task <ids>, then one verifier. Then /qa (AC192 to AC199, full check), push once, /ship 0.6.0.
4. Then /release v6.

## Watch out
* WebKit download is blocked in this sandbox; check.sh now runs e2e in local Chromium. CI on WebKit is the truth.
* exam.spec.ts:254 AC112 is a pre-existing flake (2 of 5 in Chromium, also at 4c13d07), logged TD22. Do not skip it; rerun if it alone fails.
* Verifier gaps left open, minor: break-lock.spec checks viewport bounds, not the safe area, and only the landscape profile (QA can add).
* Any PRD edit closes the gate. GAME_LOOP_PRD.md is separate on purpose.
* The stop hook asks to push every turn; the release rule (one push per release) wins. 2026-11-06 the founder chose to merge v3 part 1 early; the rest of v3 ships as 0.6.0 in a new PR.

## Pointers
* Decisions 119, 120. Tasks T55a, T53a in docs/PLAN.md. ACs AC192 to AC199 in docs/PRD.md section 12.
