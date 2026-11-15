# Handoff, 2026-11-15 evening, v3 part 2 live, T53a next

## Task
Founder: build v3 Dino's veilig (0.6.0), then v15 Grote wereld (0.7.0), then v6 (0.8.0). Plus founder requests from 2026-11-15, all live now.

## State
* Live on main (PRs #20 782f336, #21 6499bff, #22 375bf27; Workers Builds deploys): T55a 7096c88 (verifier PASS); dinos stay by default plus Allemaal blijven 284331f, 1327c26, save race fix 3d16b7e; module engels-klok 6e68bf9; sheet exams plus Runaway fixed to the real sheet 402cc69, 041376d; Examens pick the lesson first 049fdc2; kid keyboard like the iPad dad0a84; Beautiful People blad exam hidden 5b165e1.
* Full check.sh after #20 (local Chromium, WebKit blocked): 161 passed, 1 failed (the save race, fixed in #22). CI on WebKit not yet checked for #22.
* Branch claude/trusting-hypatia-amvord = main plus nothing. Uncommitted: none after this note.

## Decisions
* 128 animals roam freely 12 blocks when not following (166603d), texts Vrij rondlopen and Allemaal vrij.
* 122 dinos stay, 123 klok module, 124 v15 Grote wereld right after v3 (keep the kid's world in the middle), 125 Examens by lesson, 126 keyboard like the iPad, 127 sheet is the only source (BRON.md, founder confirms, validate.py check).

## Next steps
1. Check CI on main for #22 (WebKit is the truth).
2. /build V3-C: T53a (grep "| T53a " docs/PLAN.md). Tell the developer: make the backup file when the section opens and call shareFile straight from the tap; pass appVersion (__APP_VERSION__) to replaceAll; reload after; set 0.6.0 and the CHANGELOG (AC198). Unreleased already holds many lines; they all go into 0.6.0. Do NOT commit before verify.sh runs on the uncommitted tree.
3. /qa (AC192 to AC199), /ship 0.6.0. Then /release v15 (speed test at 128 x 128 first).

## Watch out
* Alles wissen is live but Backup maken is not yet (T53a). Founder was warned.
* Founder waits to send a photo of the Beautiful People sheet. Then fix docs/modules/engels-beautiful-people/BRON.md, rerun scratchpad blad.py (may be gone; it regenerates blad.json from BRON.md), rename blad.json.wacht-op-foto back, re-add topic and exam to module.json (see that COVERAGE.md).
* Founder rule: sheet exams use only sheet text, never invent anything.
* PRD 4.8 keyboard wording (line 246) needs an update at the next scope signoff (decision 126). T55a file list in PLAN lacks settings-screen.test.ts (verifier note).
* verify.sh only checks the working tree; developers must run it before committing (FRICTION 2026-11-15).
* exam.spec.ts:254 AC112 flake (TD22). Open verifier gaps: AC192 40 percent loudness not e2e tested; validate.py blad check accepts either side of a BRON line.
* danfactory backflow branch still has no PR (founder never answered).

## Pointers
* docs/BACKLOG.md v15 row; docs/modules/README.md section on sheet modules; tests/e2e/dino-stay.spec.ts.
