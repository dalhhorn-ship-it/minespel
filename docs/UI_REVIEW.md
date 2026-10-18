# UI review: Dino Blokwereld (Gemini's build, HEAD f2dee5b)

> Screenshots are not in git (44 MB). Run `npx playwright test ui-review` to regenerate them in `docs/screenshots/ui-review/`.

> **Status 2026-10-18:** all 14 findings are fixed (commits 0dbde85, 879b8ad and the next one). F1 and F13 follow founder decisions 51 to 54. `tests/e2e/ui-review.spec.ts` now asserts every check with no fixmes; the one allowance is decision 54 (shop and Lesboek may scroll in a Safari tab). Lesson and teach moment text scroll inside their own panel on purpose. Still to check on a real iPad: finger scrolling.

Reviewer: Kids Game UI Reviewer. Date: 2026-10-18.
Seen like an 8 to 10 year old on an iPad, in landscape.

## How this was done

* Spec: `tests/e2e/ui-review.spec.ts`. It opens every screen at four sizes, saves a screenshot, and measures every button.
* Sizes: 1024x768 (iPad 9.7), 1180x820 (iPad Air), 1366x1024 (iPad Pro 12.9), and 1024x690 (a Safari tab with its toolbars, about 70 points lost). The fourth size is extra. A kid who plays in Safari, not from the home screen, gets this one.
* Safe area: Chromium has no `env()`, so the spec sets `--safe-top: 24px` and `--safe-bottom: 20px` (an iPad home screen app).
* Checks per screen: inside the screen, inside the safe area, at least 44 x 44, main buttons at least 56, at least 8 points between neighbours, not covered by another element (a real hit test at the centre), text not clipped, no sideways scroll, text at least 17 points, a visible way back, and back to the world in at most 2 real touch taps.
* Result: 128 tests pass, 21 are `test.fixme` (one per known bug, numbered F1 to F14 below). The fixmes keep the checks alive. When a bug is fixed, delete its line in the `KNOWN` list and its fixme, and the check guards the layout.
* Screenshots: `docs/screenshots/ui-review/<size>-<screen>.png`. 201 files.
* Limit: Chromium here cannot do a real swipe. Scrolling (F14) was proven by reading the code and by sending a `touchmove` event to the screens. Please confirm on a real iPad.
* Run it: `npx playwright test ui-review` (CI uses WebKit). From the repo root, because the screenshot folder is relative.

## Why the founder sees buttons that do not fit

Four real causes, in order of damage:

1. A second "Ouders" button sits on top of the Pauze button (F1).
2. The Dinowinkel is only 560 wide, so the right column of egg cards is cut off (F2).
3. Long kid screens need scrolling, but the app cancels all finger scrolling on kid screens (F14). So the teach moment button, the Kippenhok and most topics in Extra oefenen cannot be reached (F5, F3).
4. The keyboard in questions does not fit in a Safari tab (F7).

## Screen map

Size column shows what I saw at 1024x768 unless said otherwise. Taps back is to the world. All screenshots below exist for the four sizes. Replace `1024x768` in the link with `1180x820`, `1366x1024` or `1024x690-safari`.

| Screen | How to open | Way back (taps) | Screenshot |
|---|---|---|---|
| World HUD (Spring, Omhoog, Omlaag, camera arrows, Hakken, Bouwen, hotbar, Alle blokken, Ouders, Pauze, countdown, Nu oefenen) | start | this is the world | [hud](screenshots/ui-review/1024x768-wereld-hud.png), [Bouwen](screenshots/ui-review/1024x768-wereld-bouwen.png), [warning](screenshots/ui-review/1024x768-wereld-aftellen-waarschuwing.png) |
| Alle blokken and slot chooser | hotbar "Alle blokken" | "Klaar" top right (1), or tap beside the panel | [grid](screenshots/ui-review/1024x768-alle-blokken.png), [slot 8, wol](screenshots/ui-review/1024x768-alle-blokken-vakje-kiezen.png) |
| Pauze | HUD "Pauze" (blocked by F1) | "Terug naar de wereld" (1) | [pauze](screenshots/ui-review/1024x768-pauze.png) |
| Dinowinkel | Pauze, Dinowinkel | "Sluiten" top left (1) | [shop](screenshots/ui-review/1024x768-dinowinkel.png), [few points](screenshots/ui-review/1024x768-dinowinkel-weinig-punten.png), [buy question](screenshots/ui-review/1024x768-dinowinkel-ei-kopen-vraag.png), [Kippenhok and collection](screenshots/ui-review/1024x768-dinowinkel-kippenhok-onderaan.png) |
| Lesboek list | Pauze, Lesboek | "Sluiten" top right (1) | [list](screenshots/ui-review/1024x768-lesboek-lijst.png) |
| Lesboek lesson | Lesboek, a topic | "Terug naar Lesboek", then "Sluiten" (2) | [lesson](screenshots/ui-review/1024x768-lesboek-les.png) |
| Extra oefenen | Pauze, Extra oefenen, or Lesboek "Oefen dit onderwerp" | "Terug naar de wereld" top left (1) | [list](screenshots/ui-review/1024x768-extra-oefenen.png) |
| Extra oefenen session | a topic in Extra oefenen | none until the summary, then "Terug naar de wereld" (F13) | [number](screenshots/ui-review/1024x768-oefenen-rekenen-vraag-number.png), [choice](screenshots/ui-review/1024x768-oefenen-taal-vraag-choice.png), [find error](screenshots/ui-review/1024x768-oefenen-taal-vraag-find-error.png), [typing](screenshots/ui-review/1024x768-oefenen-taal-vraag-type.png), [commas](screenshots/ui-review/1024x768-oefenen-komma-vraag-punctuate.png), [retry](screenshots/ui-review/1024x768-oefenen-taal-fout-opnieuw.png), [right](screenshots/ui-review/1024x768-oefenen-taal-goed.png), [teach, lesson](screenshots/ui-review/1024x768-oefenen-taal-uitleg-les.png), [teach, steps](screenshots/ui-review/1024x768-oefenen-rekenen-uitleg-voorbeeld.png), [summary](screenshots/ui-review/1024x768-oefenen-taal-samenvatting.png) |
| Nu oefenen (HUD pill, shop pill, Extra oefenen bar) | tap it | starts a learning break, see below | [in HUD](screenshots/ui-review/1024x768-wereld-hud.png), [in shop](screenshots/ui-review/1024x768-dinowinkel.png) |
| Learning break (lesson, questions, retry, teach, summary) | timer, or Nu oefenen | cannot be closed on purpose. After the summary "Terug naar de wereld" (1). A parent can end it through Ouders | [lesson](screenshots/ui-review/1024x768-leerpauze-les.png), [number](screenshots/ui-review/1024x768-leerpauze-vraag-number.png), [retry](screenshots/ui-review/1024x768-leerpauze-fout-opnieuw.png), [right](screenshots/ui-review/1024x768-leerpauze-goed.png), [teach](screenshots/ui-review/1024x768-leerpauze-uitleg-voorbeeld.png), [summary](screenshots/ui-review/1024x768-leerpauze-samenvatting.png) |
| Dino menu | tap a dino | "Sluiten" at the bottom (1) | [menu](screenshots/ui-review/1024x768-dino-menu.png) |
| Naming keyboard | Dino menu, Naam geven | "Terug" top right, then "Sluiten" (2) | [naming](screenshots/ui-review/1024x768-dino-naam-geven.png) |
| Parent gate, choose PIN (first start) | HUD "Ouders" or Pauze, Ouders | "Sluiten" in the key pad (1) | [choose](screenshots/ui-review/1024x768-ouders-pincode-kiezen.png) |
| Parent gate, enter PIN, wrong PIN | "Ouders" after a PIN exists | "Sluiten" in the key pad (1) | [enter](screenshots/ui-review/1024x768-ouders-pincode-invoeren.png), [wrong](screenshots/ui-review/1024x768-ouders-pincode-fout.png) |
| PIN vergeten | gate, "Pincode vergeten?" | "Terug", then "Sluiten" (2) | [forgot](screenshots/ui-review/1024x768-ouders-pincode-vergeten.png) |
| Parent area: Instellingen, Inhoud kiezen, Resultaten, Examens, Eigen modules, Import & Export | after the PIN | "Sluiten" bottom left of the side bar (1) | [Instellingen](screenshots/ui-review/1024x768-ouders-instellingen.png), [Inhoud](screenshots/ui-review/1024x768-ouders-inhoud-kiezen.png), [Resultaten](screenshots/ui-review/1024x768-ouders-resultaten.png), [Examens](screenshots/ui-review/1024x768-ouders-examens.png), [Eigen modules](screenshots/ui-review/1024x768-ouders-eigen-modules.png), [Import](screenshots/ui-review/1024x768-ouders-import-export.png), [reset world question](screenshots/ui-review/1024x768-ouders-wereld-opnieuw-vraag.png) |
| Portrait | turn the iPad | turn it back | [turn message](screenshots/ui-review/768x1024-portrait-draai-je-ipad.png) |

First start: there is no kid onboarding. The first thing that looks like "first start" is the choose PIN screen, which opens when anyone taps Ouders (see decision 2).

Exam screens do not exist yet in the UI (the Examens section is a placeholder), so there was nothing to review there.

## Findings

Counts: 4 blockers, 5 major, 5 minor, 14 findings in all.

### Blockers

**F1. The floating "Ouders" button covers "Pauze" (and sits on every kid screen).**
* Screen: world HUD, all four sizes. Also every overlay and break screen.
* What is wrong: `.lock-icon-btn { display: inline-flex }` in `src/styles/parent.css` beats the `hidden` attribute. `main.ts` sets `floatingLock.element.hidden = true` in the world, but the button stays visible. It sits at the top right, right on top of the real Pauze button. The HUD has its own "Ouders" button 12 points to the left. A tap on the middle of Pauze hits the floating Ouders button.
* Why it matters: the kid taps Pauze and gets the parent PIN screen. They cannot open the pause menu, the Dinowinkel, Lesboek or "Ik zit vast" by the normal route. It also puts two buttons called "Ouders" next to each other. On break screens it covers the last progress dot.
* Fix: add `.lock-icon-btn[hidden] { display: none; }` to `src/styles/parent.css`. Then the floating button only shows on kid overlays and breaks, as intended. Also move it so it does not cover other things: on the break screen raise `.break-header` `padding-right` to about 140px (the button is 117 wide).
* Severity: blocker.
* Test: `F1` fixmes, plus "a finger on Pauze in the world opens the pause menu".

**F2. Dinowinkel: the right column of egg cards is cut off.**
* Screen: Dinowinkel, all four sizes. See [shop](screenshots/ui-review/1024x768-dinowinkel.png).
* What is wrong: `.pause-card { width: min(560px, 100%) }` (pause-menu.css) wins over `.shop-modal { width: min(960px, 96vw) }` because the shop uses both classes. The card is 560 wide with two columns inside, and `overflow-y: auto` hides what sticks out sideways. Triceratops and Brachiosaurus lose their price, the end of their name and half of "Kopen".
* Why it matters: the kid cannot read the price of two of the four dinos and half of the buy button is not there.
* Fix: in `src/styles/shop.css` add `.shop-modal.pause-card { width: min(960px, 96vw); }`. Also use `grid-template-columns: repeat(2, minmax(0, 1fr))` on `.shop-grid` so a long word can never push a column out.
* Severity: blocker.
* Test: F2 fixme.

**F14. Kid screens cannot scroll with a finger.**
* Screen: every kid screen that is taller than the iPad: Dinowinkel, Lesboek list, Extra oefenen list, teach moment, long lessons.
* What is wrong: `src/platform/lockdown.ts` cancels every `touchmove` that is not inside `.parent` or `.scrollable`. No kid screen has the class `scrollable` (only the parent area works, the spec proves it). On iOS a cancelled touchmove means no scroll.
* Why it matters: in Extra oefenen and Lesboek the list has 14 topics, but only the first 6 or so fit. The rest cannot be opened. The Kippenhok in the shop and the collection cannot be reached. The teach moment button cannot be reached (F5).
* Fix: add `class="scrollable"` to the scrolling element of each kid screen: `.shop-modal`, `.lesboek-card`, `.pause-card`, `.break-screen`, `.grid-panel`. Or add them to `SCROLL_SELECTOR`. Then check on a real iPad. Better still, make the screens fit so nothing needs scrolling (see F3, F5).
* Severity: blocker. Not proven with a real swipe (Chromium cannot swipe here). Please verify on the iPad.
* Test: three F14 fixmes (teach moment, Extra oefenen list, Dinowinkel) and one passing test that the parent area allows drags.

**F5. Teach moment: "Ik snap het" is below the screen.**
* Screen: after two wrong answers, Taal topics, at 1024x768 (button at y 830 to 924 for a 768 tall screen), 1180x820 and 1024x690. Fits at 1366x1024. See [teach](screenshots/ui-review/1024x768-oefenen-taal-uitleg-les.png).
* What is wrong: the lesson card (title, rule, two examples, tip) plus "-1 punt" is taller than the screen. The button is last. With F14 the kid cannot scroll to it.
* Why it matters: the kid is stuck. A practice session cannot be closed (F13) and a learning break cannot be closed on purpose.
* Fix: put "Ik snap het" in a sticky footer: `.teach-moment` as a flex column with `.teach-lesson { overflow-y: auto; min-height: 0 }` and the button fixed under it, `position: sticky; bottom: 0`. Or show only the first example. Also add `.scrollable` (F14).
* Severity: blocker.
* Test: F5 fixmes and "the teach moment shows Ik snap het without scrolling".

### Major

**F3. Kippenhok buttons are below the fold.**
* Screen: Dinowinkel at all sizes. The "Kip loslaten" buttons start at y 887 on a 768 tall screen.
* Why it matters: a main feature the kids like is out of sight. It needs a scroll, and scrolling does not work (F14).
* Fix: shorter egg cards (drop the `.shop-card-trait` line, or use 4 columns on one row at 1024 wide), or put the Kippenhok first in a compact row. Make `.shop-card` `min-height` smaller. Test: `F3` fixmes.

**F4. Dinowinkel "Sluiten" scrolls out of view.**
* Screen: Dinowinkel after scrolling down ([screenshot](screenshots/ui-review/1024x768-dinowinkel-kippenhok-onderaan.png)).
* What is wrong: the header with "Sluiten" is part of the scrolling card, so once the kid scrolls to the Kippenhok there is no visible way back. Also the floating Ouders button lands on top of a "Kopen" button.
* Fix: make `.shop-header` `position: sticky; top: 0` with the card background, or make only `.shop-grid` area scroll and keep the header outside it. Test: F4 fixme.

**F7. The question keyboard does not fit.**
* Screen: typing and number questions. At 1024x768 the "Klaar" key (y 692 to 768) sits under the home indicator. At 1024x690 it is cut off (typing: space and Klaar at y 630 to 698). See [typing at 690](screenshots/ui-review/1024x690-safari-oefenen-taal-vraag-type.png).
* Why it matters: "Klaar" is the main action of the question.
* Fix: in `src/styles/keyboard.css` and `questions.css` use `clamp()` key heights tied to `vh` (for example `height: clamp(48px, 8.5vh, 76px)`), put the header on one row, and hide the Dino Juf bubble text on small heights. At 690 the area between the answer box and the keys is the first thing to shrink.
* Test: F7 fixmes.

**F13. Extra oefenen sessions have no way to stop.**
* Screen: any practice question. Only the summary has an exit.
* Why it matters: a kid who started the wrong topic must answer all questions. Combined with F5 they can get stuck. The PRD says a break cannot be closed on purpose, but Extra oefenen is a choice.
* Fix: add a "Stoppen" button top left on the practice break screen (same place as "Terug" on other screens). It ends the session and keeps the points already earned. Text for the kid: "Stoppen? Je punten blijven bewaard." Test: "Extra oefenen sessions have a visible way to stop" (fixme). Needs a founder decision, see below.

**F8. Text under 17 points on kid screens.**
* Where: block names and numbers in the slot chooser (11 and 12 px), block names in the grid (15), category pills (14), HUD "Alle blokken" (16), "Nu oefenen" pill (16 and 15), shop cards (trait 15, price 15, chips, "Dino-ei" 11), Lesboek subject labels (14), the counter in the naming screen (16), "Ouders" in the floating button (16).
* Fix: raise these to at least 17 (set `font-size: 17px` or `var(--font-body)`). The grid slot labels need taller slots, the slot bar can drop the numbers. Test: F8 fixme.

### Minor

**F6. Lesboek lesson: "Volgende" touches the bottom edge** (y 706 to 768 at 1024x768), under the home indicator. Fix: give `.lesson-view` bottom padding for `--safe-bottom` plus 16px and let the page text area shrink. Test: F6 fixmes.

**F9. Buttons too close together** (4 to 6 points, need 8): the 8 slots and "Alle blokken" in the hotbar, the four camera arrows, the 8 slot chooser buttons and category pills in Alle blokken, the comma gap buttons in punctuation questions (4 points), the level pills in Inhoud kiezen. Fix: `gap: 8px` or more in `.hud-hotbar`, `.hud-camera-pad`, `.grid-slot-bar`, `.grid-cat-bar`, `.q-line` gap buttons, `.parent-level-pill`. Test: F9 fixme.

**F10. Level pills in Inhoud kiezen are 56 x 38** (parent area). Fix: `min-height: 44px` on `.parent-level-pill`.

**F11. Main buttons under 56 points.** "Nu oefenen" pill in the HUD is 143 x 44, "Ja" and "Nee" in the shop buy question are 124 x 52, "Sluiten" in the parent area is 206 x 48. Fix: `min-height: 56px`. Test: F11 fixme.

**F12. Parent area "Sluiten" sits 16 points from the bottom**, under the home indicator zone (needs 20). Fix: `.parent-sidebar { padding-bottom: calc(var(--safe-bottom) + 16px) }`. Test: F12 fixme.

## Way back, in the same place?

* Most common place: top right ("Klaar", "Sluiten", "Terug") or a big green button at the top.
* Odd ones: Pauze ("Terug naar de wereld" is a full width bar at the top, fine), Dinowinkel ("Sluiten" top left, under the title), Extra oefenen ("Terug naar de wereld" top left), Dino menu ("Sluiten" at the bottom, full width), the PIN gate ("Sluiten" inside the key pad, bottom right), the parent area ("Sluiten" bottom left). Fix: pick top right, use the same "Sluiten" or "Klaar" label, same size. It is a polish item, but a kid learns it fast. Dinowinkel and Extra oefenen are the ones to move.
* Screens without a way back: a running learning break (on purpose, says nothing kind about it, add a line such as "Even leren, dan mag je weer spelen"), and every Extra oefenen session (F13, not on purpose).
* No screen needs more than 2 taps. Closing never lost progress in the paths I tried.

## What is good and should stay

* The world HUD fits in all four sizes, including the Safari tab size. Spring, Omhoog, Omlaag and the camera arrows are 56 points or bigger and do not overlap each other.
* Short Dutch labels everywhere. Friendly retry text ("Net niet. Probeer het nog een keer.") in soft orange, not a red wall.
* The pause menu, dino menu, naming screen with its own kid keyboard, Alle blokken grid and the summary all fit at every size and look calm and clear.
* Alle blokken closes with "Klaar" or a tap beside the panel. The slot chooser shows which slot is picked.
* The summary has one big button to the world.
* The PIN gate: big keys, dots, kind messages after a wrong PIN, a way out with "Sluiten". The parent area scrolls with a finger and has a clear side bar.
* Portrait shows "Draai je iPad" and covers the HUD.
* No hover only things. Every button reacted to a real touch in the spec.

## Questions for the founder

1. **Stop button in Extra oefenen (F13).** Add "Stoppen" and keep the points earned so far? Recommended: yes.
2. **First PIN.** The first time anyone taps "Ouders" the app asks them to choose a PIN. With F1 a kid who taps Pauze gets this screen and could set the PIN. Option: ask for the PIN in a first start flow, or only let the parent screen set the first PIN after a small grown up question (like the "PIN vergeten" sum). Kid safety, so it is your call.
3. **The floating Ouders button on every kid screen.** After the F1 fix it still shows on overlays and breaks, and it covers things at the top right. Keep it (parents can always get in) or only show it in the world and on the break screen?
4. **Play in a Safari tab or from the home screen?** Tab height is only about 690 and F7, F3 get worse. If kids play in a tab, design for 690. If home screen only, 768 is the floor. The spec covers both.
5. **Exam screens** are not built yet. They will need the same closing rules.
