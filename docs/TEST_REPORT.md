# Test report

## v11 Dorp (0.5.0)

Result: PASS for everything that can run here. AC190 (fps on the oldest iPad) and the kid play check are still open for the founder.

Run on 2026-10-24 in local Chromium (`npm run test:e2e:local`, iPad gen 6 profiles), not WebKit. CI runs WebKit.

| Command | Result |
|---|---|
| `npm run test:e2e:local -- dorp` | 39 passed (38 landscape, 1 portrait) |
| `npm run test:e2e:local` (full, run twice) | 283 and 282 passed. Failures were only the two exam tests below and one Dorp timing race in my own test, fixed |
| `npx vitest run` | 111 files, 940 tests passed |
| `npm run typecheck`, `npm run lint` | clean |

### Failures that were not Dorp bugs

* `exam.spec.ts` AC71 (`remainingExamMs` 1079980 instead of 1080000) and AC112 (1795000 instead of 1800000). They are timing flakes: real time passes between two reads. Both also fail on the commit before v11 (07e15ce): AC71 failed 3 of 6 runs there, AC112 1 of 8. Not caused by v11. They should be fixed by the owner of the exam spec (use a fake clock or allow a small margin).
* Two Dorp test races, both fixed in the test: the cooldown test read a value across real ticks, and the shop close button swapped while tapped (now retried with `toPass`).

### AC coverage (e2e in `tests/e2e/dorp.spec.ts`, AC191 in `tests/unit/release-v11.test.ts`)

| AC | Test | Result |
|---|---|---|
| AC178 | three villages with houses in a new world, none within 10 blocks of the start; a house block can be mined | pass |
| AC179 | old 0.4.0 save: untouched world gets 3 villages and `worldV1` is kept; a changed site keeps its cells and gets no house; all three changed gives no houses; player stays; second start changes nothing | pass |
| AC180 | 8 villagers (3, 3, 2), 8 shirts, stay within 3 of home, never inside a block, never move the player; drawn in the world (shirt colour found on screen when looking, not when looking away) | pass |
| AC180 (build blocked inside a villager) | no e2e: no hook for the build rule. Covered by `src/game/game.test.ts` | unit only |
| AC181 | bubble near a villager, hides when far, nearest owns it, plain Hoi! cannot be tapped, double tap makes one card, no look change; size at least 44 x 44, in safe area, no HUD overlap at 1024x768, 1180x820, 1024x690; portrait shows no bubble and landscape brings it back | pass |
| AC181 (hold the move stick while the bubble shows) | not run by finger: needs two real fingers. Unit tests only. Founder check below | open |
| AC182 | no bubble in the pause menu, the shop, a break; 0:31 shows and 0:30 hides; paused game hides it | pass |
| AC183 | card opens from a bubble tap, one seen sum, no lesson; not a break (no break record, no ledger row, answers marked "dorp"); box 2 goes to 3 on right, to 1 on wrong then right; double tap acts once | pass |
| AC184 | wrong once shows "Net niet. Probeer het nog een keer." with no answer and a cleared input; wrong twice shows "Zo zit het:" and the answer; dance and "Respect bruuuuu!" both appear; "In mijn hotbar" fills the selected slot | pass |
| AC185 | points stay the same, no plus or minus number; timer stops under the card and keeps its value; kill with a card open reopens with no card | pass |
| AC186 | "Laat maar" starts the cooldown; cooldown counts only play time (not the pause menu); the villager who asked last is skipped, another one asks after 3 minutes; cooldown survives a kill | pass |
| AC187 | Dorp tab: 8 dark tiles, tap changes nothing; found block picked, placed twice, mined; 8 answers give "8 van de 8 gevonden" | pass |
| AC188 | 3 found blocks and the hotbar survive kill and reopen; Wereld opnieuw beginnen keeps them and removes rare blocks placed in the old world; 0.4.0 save loads with 0 van de 8 and no cooldown | pass |
| AC189 | no request outside the app origin during a full play session; no link, image, script or form on the card; saved village record has only found, cooldownMs, lastVillager | pass |
| AC189 (HTML looking item text) | not e2e: the generated sums cannot hold HTML. Card uses `textContent` only, covered by `src/ui/village-card.test.ts` | unit only |
| AC190 | iPad only, see below | open |
| AC191 | version 0.5.0 or later, 0.5.0 changelog entry about villages, a question, a dance, a rare block | pass |

I also changed `tests/unit/release-v10.test.ts` to accept 0.4.0 or later, the same way the v9 and v2 release tests do, so the version bump does not break it.

### Bugs found

None blocker or major. Small notes for the developer:

* Minor: the dance card says "Respect bruuuuu!" twice (in the speech bubble at the top and in the green banner). Screenshot `docs/screenshots/v11/dance.png`.
* Minor: the bubble is only hidden on the next village look (up to 250 ms), so a bubble can be on screen for a moment when the pause menu opens. A tap in that gap is ignored by the flow, so it is cosmetic.
* Note: `package-lock.json` still says 0.4.0. It is not in the V11e row.

### Kid safety and accessibility

* No network request beyond the app files (AC189 test). No tracking, no links, no ads.
* Bubble and card buttons are at least 44 px. Dorp tiles at least 44 px.
* Works without sound (the dance and "Respect bruuuuu!" are text and picture).
* No flashing: the dance is a slow wobble of the model.
* Not checked in WebKit here: iOS callout menu and zoom on the bubble. The bubble CSS has `user-select: none`, `-webkit-touch-callout: none` and `touch-action: none`. Check on the iPad.

### Screenshots (`docs/screenshots/v11/`)

`village.png` (the camera ended inside a house, a villager stands in the doorway), `village-villager.png`, `bubble.png`, `card.png`, `dance.png`, `zo-zit-het.png`, `dorp-tab.png`, `portrait.png`.

### Founder check on the iPad, AC190 (fps walk)

Use the oldest iPad (2018 or newer), from the home screen icon, with the fps counter on.

1. Baseline first on 0.4.0: buy or have 12 shop dinos on Volg mij and 10 chickens. Walk for 2 minutes through the world (there are no villages on 0.4.0, so walk the same route).
2. Then on 0.5.0 with the same dinos and chickens: walk 2 minutes through the biggest village and on to the next one.
3. Write down for each: the share of frames at 33 ms or less (needs 95 percent) and the slowest frame (needs 200 ms or less).
4. If 0.5.0 fails, open the app with `?still=1` (villagers stand at home and only turn to the player), measure again, and tell the operator. Only `stillMode` changes.

Results (founder fills in): 0.4.0 baseline ____ , 0.5.0 ____ , with `?still=1` if needed ____ .

### Kid play check (founder, from the home screen icon, with the kid own 0.4.0 save)

* Every build the kid made is still there. See which villages appeared.
* Hold the move stick with one finger and watch a bubble appear: the player must keep walking. Tap the bubble with the other finger.
* Walk to a villager, tap the bubble, answer right, see the dance or "Respect bruuuuu!" and the new block. Put it in the hotbar and build with it.
* Get one wrong twice and see "Zo zit het:".
* Walk to another villager right away: no bubble. After 3 minutes of play: a bubble.
* Open Alle blokken, Dorp: "?" tiles and the counter.
* Long press the bubble: no menu, no zoom. Rotate the iPad: the bubble hides in portrait.
* Ask the kid if the villagers are fun or annoying.

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
