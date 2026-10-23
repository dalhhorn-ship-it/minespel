# Test report

## R1 Boot safety (R1d)

Result: pass in Chromium (`npm run test:e2e:local -- boot-taps`, 26 tests, run three times). WebKit runs in CI.

Spec: `tests/e2e/boot-taps.spec.ts`, helper `tests/e2e/helpers/slow-storage.ts`. Real finger taps. The specs never wait for the ready hook before tapping. Storage is held at open (2 s, or never), and for the Lesboek button late in boot, because the Lesboek has no lessons before the database is read. The 10 s limit is moved with `page.clock`, so nothing sleeps.

| Case | Buttons | Result |
|---|---|---|
| Storage held 2 s: card "Even geduld...", then opens by itself | HUD lock, Ouders in pause, Extra oefenen, Lesboek Oefen dit onderwerp, Nu oefenen | pass |
| Storage never answers: card, Terug goes back to the world | same five | pass |
| Storage never answers: cannot load text after 10 s, Terug works | same five | pass |
| Normal storage: opens on the first tap, no card | same five | pass |
| Pauze and Winkel open on the first tap | normal, held 2 s, never | pass |

Dropped: the Winkel placeholder has no "Verdien punten" button (only the real shop has it), so there is no case for it.

Proof the spec is real: copied into a worktree at d1a01ca (before R1b), 15 of 26 failed (every held and never case) and the 11 normal storage and Pauze or Winkel cases passed. On HEAD all 26 pass. The worktree is removed.

## v9 Eerlijke punten (0.3.0)

Result: pass in Chromium. WebKit runs in CI.

| AC | Test | Result |
|---|---|---|
| AC166 | `tests/e2e/points-v9.spec.ts` (Extra oefenen and Nu oefenen break past the limit) | pass |
| AC167 | `tests/e2e/points-v9.spec.ts` (1 point left, +1 punt, bonus that fits) | pass |
| AC168 | `tests/e2e/points-v9.spec.ts` (note only when cut, timed break keeps +2, +1, +3) | pass |
| AC169 | `tests/e2e/points-v9.spec.ts` (11 shop dinos plus golden and chickens: hint after break and Extra oefenen, Kopen for Compy; 12: never) | pass |
| AC170 | `tests/e2e/points-v9.spec.ts` (wrong twice in all three modes, 4 right and 1 teach gives 8) | pass |
| AC171 | `tests/unit/release-v9.test.ts` | pass (unit) |

What ran: the new spec plus break, practice and winkel specs, 24 tests, twice in a row, all green. Real finger taps, no fixed sleeps. The spec answers Rekenen sums from the screen and Taal choice or typing questions from the break state.

Only checked in Chromium (container cannot download WebKit): all of the above, on the iPad gen 6 landscape size. Not run: portrait, iPad Pro, full `./scripts/check.sh`.

Break tests ask only Rekenen sums: `onlyRekenen` switches Taal off in storage before each break, and `expectOnlySums` fails the test if any other question type shows up.

`./scripts/verify.sh acs`: AC166 to AC171 each have a test. It still reports FAIL for about 50 older ACs that have no test named after them (AC11, AC12, AC21, AC27, AC38 and others, listed by the script), and warns that most ACs are missing from this report. These are from before v9.

### Founder iPad check for 0.3.0 (home screen mode)
1. Earn the 10 extra points of the day in Extra oefenen, then play one more Extra oefenen round. Right answers must say "Goed!" with no number, the total must not change, and the end shows "Genoeg geoefend voor vandaag".
2. Answer one question wrong twice. The "Zo zit het:" card shows no points line, no minus shows anywhere, and the total stays the same.

## v2 Gouden ei (0.2.0)

Written by QA on 2026-10-19. Result: **PASS with 1 minor note**. The WebKit e2e suite could not run here (no WebKit download), so the e2e specs are "written, not run here". GitHub CI runs them. Everything else ran and passed.

### Commands and results
| Command | Result |
|---|---|
| `CHECK_E2E=0 ./scripts/check.sh` | OK. Lint, types, 753 unit tests in 90 files, build, dist check (983 KB). |
| `npx vitest run tests/unit/release-v2.test.ts` (new) | 2 passed |
| Chromium play session (iPad landscape 1024x768, 1180x820, Safari tab 1024x690, touch) | Done, see below. No console errors. |
| WebKit e2e (`tests/e2e/exam.spec.ts`, `exam-parent.spec.ts`) | Not run here, CI only |

### AC coverage
| AC | Test | Result |
|---|---|---|
| AC64 | exam-session.test.ts (30 questions, mix); exam.spec.ts AC64; exam-parent.spec.ts AC64 | pass (unit), e2e in CI |
| AC65 | exam-flow.test.ts, exam-session.test.ts, exam-screen.test.ts; exam.spec.ts | pass (unit), e2e in CI |
| AC66 | exam-flow.test.ts; exam.spec.ts (play timer stays put, no break) | pass (unit), e2e in CI |
| AC67 | exam-flow.test.ts, exam-session.test.ts; exam.spec.ts (time runs out, typed answer checked) | pass (unit), e2e in CI |
| AC68 | exam-flow.test.ts, exam-screen.test.ts; exam.spec.ts (pass and fail) | pass (unit), e2e in CI |
| AC69 | exam-flow.test.ts, exam-session.test.ts; exam.spec.ts (examsLog) | pass (unit), e2e in CI |
| AC70 | exam-flow.test.ts, exam-session.test.ts; exam-parent.spec.ts AC157, AC70 | pass (unit), e2e in CI |
| AC71 | exam-flow.test.ts; exam.spec.ts (kill on question 12, 18:00 left) | pass (unit), e2e in CI |
| AC72 | exam-session.test.ts, exams-screen.test.ts; exam-parent.spec.ts (no warning for built in exams) | pass (unit), e2e in CI. The warning itself is only unit tested, no built in exam is too short. |
| AC111 | exam.spec.ts (12 shop dinos, golden still hatches, 13th shop dino blocked) | e2e in CI |
| AC112 | exam.spec.ts (gate open, portrait) | e2e in CI. Window too small and background are manual. |
| AC115 | exams-screen.test.ts; exam-parent.spec.ts (two tests) | pass (unit), e2e in CI |
| AC125 exam part | exam-session.test.ts (no repeats, same seed same questions) | pass |
| AC127 | exam.spec.ts AC155, AC127 (44 x 44, inside screen, top right) | e2e in CI. Chromium play: lock box 44 x 44 at the top right at all sizes. |
| AC153 | exam-session.test.ts, exam-flow.test.ts, exam-screen.test.ts; exam.spec.ts (4 pages, kill during review) | pass (unit), e2e in CI. Play: review pages with question, answer, right answer and explain text. |
| AC155 | exam-screen.test.ts; exam.spec.ts | pass (unit), e2e in CI |
| AC156 | exam-screen.test.ts; exam.spec.ts (start, end, review, break, Extra oefenen) | pass (unit), e2e in CI |
| AC157 | exam-parent.spec.ts | e2e in CI. Play: Stoppen gives world, no egg, log "gestopt". |
| AC158 | exam.spec.ts, exam-parent.spec.ts (Sluiten, Terug naar het examen, 3 wrong codes) | e2e in CI |
| AC159 | **was missing**, added `tests/unit/release-v2.test.ts` (version 0.2.0, changelog names exams and golden dino) | pass |

Gap: the golden dino hatching animation and the egg appearing next to the player are only checked through state hooks (eggs, dinos with golden true). In the 1024x690 world screenshot the dino is not in view. Manual iPad check.

### Play session (Chromium, touch, e2e hooks)
At all three sizes: parent gate sum, pin setup, Examens list (8 exams), Taal start screen, question, mashing option buttons (double taps), reload mid exam (same question, timer continued, about 1 to 2 s lost), exam lock pin pad, Sluiten back to the same question, Stoppen card, Stoppen (world, no egg, "gestopt" saved), Rekentoets started from the parent area, a typed number answer through the number pad, pass 20 of 20 ("Geslaagd!", golden dino in the world, dinos list has one golden), Taal fail 6 of 30 ("Goed geoefend!", no egg), Bekijk je fouten (Fout 1 van 24, answer, right answer, explain text, Volgende).

Checks per screen (Chromium, script): no button below 44 px, no button cut off, smallest text 16 px (parent) and 20 px (kid), no links, no horizontal scroll, text selection off. At 1024x690 the Examens list is longer than the window and scrolls inside the parent area (one Start button below the fold, by design).

### Bugs
| # | Severity | Steps | Status |
|---|---|---|---|
| 1 | minor, unconfirmed | In an exam, tap the lock, tap Sluiten, then tap the lock again straight after the pin pad has gone. In one run the second tap did not open the pin pad. After waiting under a second it opened every time. Might be a short fade, might be the headless run. The WebKit e2e does the same sequence, so CI will show it. If a kid or parent can hit a dead lock for a moment it is only an annoyance. | open, please check in CI and on the iPad |

No blockers, no majors. Notes, not bugs: the review shows only "Volgende" on page 1 (Klaar comes on the last page, as the PRD says), and a review of 24 pages is long for a kid but is what AC153 asks for.

### Kid safety and accessibility
* Outside requests: none in any of the 3 sessions (every request went to localhost). No links on any exam screen.
* Exam content is plain text. Exams are only started through the parent gate, and the lock stops them only through the pincode.
* No tracking, no ads. Friendly Dutch messages ("Goed geoefend!", "Examen stoppen?").
* No sound needed. No flashing content seen.
* Colour contrast looked fine in the screenshots. Not measured with a tool.

### Screenshots
`docs/screenshots/v2/` holds 14 shots per size, prefixed with the size (1024x768, 1180x820, 1024x690): 00 gate question, 01 Examens list, 02 Taal start, 03 Taal question, 04 after reload, 05 lock pin pad, 06 stop card, 07 Rekentoets start, 08 Rekentoets question, 09 typed answer, 10 end pass, 11 world after pass, 12 end fail, 13 review page 1. Taken in Chromium, not WebKit.

### Manual iPad checks for the founder (home screen mode)
1. One full Taal exam, 30 questions, start from Ouders, Examens. Check reading size, the lock in the top right (not under the status bar or a finger), and the timer.
2. One full Rekentoets, 20 questions, with the number pad. Check typing on the real iPad.
3. Pass one: the golden egg appears next to the player and hatches into a golden dino. Check you can see it.
4. Close the app mid exam from the app switcher and reopen: same question, time roughly kept.
5. Stop one with the lock and the pincode. Check no egg and no review.
6. Check the lock tap right after Sluiten (bug 1).

---

Earlier release sections follow below (v1 not yet written).

## Summary
Commit:  Result:  AC coverage:

## Acceptance criteria coverage
| AC | Test | Result |
|---|---|---|

## Bugs
| # | Severity | Steps to reproduce | Status |
|---|---|---|---|

## Kid safety and accessibility

## Screenshots
