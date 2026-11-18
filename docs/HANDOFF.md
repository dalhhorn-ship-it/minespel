# Handoff, 2026-11-18, 0.16.0 is live

## Task
Ship v25 Nog een keer (0.16.0): a question that ended in a teach moment comes back at the end. Done.

## State
* **Live on main:** 0.6.0 to 0.16.0. PR #30 merged as 83e32e2 with green WebKit CI on 6e8ab13. The founder said "go live" (decision 148).
* Branch claude/jolly-fermi-z0vak4 equals main plus this note and the post merge docs. No open PR.
* PRD section 12 still holds v25 (shipped). The next `/release` moves it to `docs/releases/`.

## Next steps
1. Founder iPad check of v25 (PRD section 12, "Check before shipping"). The checks of v22 to v24 are still open too (`docs/TEST_REPORT.md`).
2. Scope v26 Ridders, stop!: one control that makes every knight stop chasing at once, also in the middle of a chase. The founder still has to say: all monsters or one, and does it stay on (a switch) or only stop the chase of that moment. The operator advised all monsters and a switch.
3. More monster kinds: 8 ideas were given in chat (Sokkendief, Slijmpie, Niesdraakje, Boeman Bram, Wolkje Mopper, Kietelkrab, Echo-vleermuis, Monstermol-baby). The founder and the kid pick 2 or 3.
4. `/retro` is due: decision 136 did not work in the cloud session (see below), plus the friction lines.
5. Flakes to look into: `lavakip-bar.spec.ts:213` AC314, `mole-save.spec.ts:125` AC299, and the six cases of the note of 2026-11-16 that fail with 7 workers.

## Watch out
* The session's permission check blocks the operator's own stamp with `signoff.sh` on the standing approval. Ask the founder for Approve with AskUserQuestion, then run `./scripts/signoff.sh "Founder"`.
* Never edit the PRD while a developer builds: it closes the build gate.
* A release that changes the version must update the version tests in `tests/e2e/backup.spec.ts` and `tests/e2e/big-world.spec.ts`.
* The villager card says "Net niet." and "Kijk even mee, zo zit het." on a wrong repeat. That wording is not in the PRD; the founder was told and has not objected.
* A second session may work in this repo. Fetch main before a decision number (next free: 149) and before pushing.
* A new e2e case must pass with `--repeat-each 6 --workers 3` before a push.
