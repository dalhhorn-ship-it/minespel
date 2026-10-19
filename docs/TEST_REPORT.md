# Test report

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
