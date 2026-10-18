# Agent discussion

Review rounds between agents. Newest at the bottom. Keep it short: who said what, what changed.

## PRD review round 1

### architect

Overall: the PRD is clear, testable and well thought out. The stack (Vite, TypeScript, three.js, IndexedDB, static hosting) fits it with no paid services. The two real problems are size and a few iPad Safari details that will bite late if we do not fix them now. Rough size: about 55 to 65 tasks. Riskiest parts, in order: 3D speed and touch controls on the real iPad, saving reliably on iOS, the share sheet and file picker in home screen mode, the parent module editor (the biggest UI chunk), and the question picker rules.

**A1 (important, founder decision): the scope is very large for one v1.**
102 acceptance criteria cover a voxel engine, dino behaviour, a full learning engine, two built in modules, exams, a module editor, import and export, backup and a results dashboard. That is two apps. Proposal: keep the PRD, but add a cut line in section 4 so the build ships in two stages. **v1a** (the kid can play and learn): world, controls, dinos and taming, timer, breaks, spaced repetition, lessons, both built in modules, exams, parent gate, Inhoud kiezen, settings, Overzicht and Pauzes in Resultaten, Backup maken and terugzetten. **v1b** (parent power tools): Eigen modules editor with Probeer and own exams, Kopie maken, import and export of modules, Per onderdeel drill down, Over tijd chart, Lastige vragen, Examens detail view. Each stage is a real, usable app. Ask the founder whether this split is fine, or which items move.

**A2 (important): plan for a 3D go or no go spike in milestone 1.**
three.js is the right choice (about 150 KB gzipped, fine under the 5 MB budget). A 64 x 64 x 32 world is 8 chunks of 16 x 16 x 32 with hidden face culling, which is light. The unknowns are the real iPad, Safari WebGL memory, and WebGL context loss when the app goes to the background. Proposal: (1) the first world task is a spike with terrain, walking and looking, measured on the founder's iPad, with a written go or no go. Fallback is 48 x 48. (2) Add to section 4.19: "When the 3D view is lost (WebGL context lost) the game rebuilds it without losing state." (3) AC101 should test the worst case: 6 wild plus 12 tame dinos, not 4 tame. (4) AC101 is a manual check on the real iPad. Headless WebKit in CI renders WebGL slowly or not at all, so it cannot measure fps. Say so in the AC.

**A3 (blocker): building under your own feet contradicts AC6.**
Section 4.2 says the kid builds up by jumping and tapping the block under the feet. The new block lands where the player stands, so AC6 (no block inside the player) refuses it, and the timing of a mid jump tap is very hard for a kid. Proposal: "In Bouwen mode, tapping the top of the block the player stands on places a block there and lifts the player one block up on top of it (if there is room above the head)." Add an AC for it. This also covers AC9 style climbing without fiddly timing.

**A4 (important): define tap versus drag, and what a tap hits.**
The right half is both "drag to look" and "tap a block or dino". The hotbar, mode buttons, jump button and lock also sit there. Without a rule, looking around will mine blocks by accident. Proposal for 4.2: "A tap is a touch that moves less than about 10 points and lasts less than 300 ms. Anything else is a look drag. A tap hits the nearest thing under the finger: a dino before a block. Buttons and the hotbar never start a look drag." Also: long press does nothing in the world in v1.

**A5 (important): Safari secure context limits on the local network.**
`crypto.subtle` (for hashing the pincode), `navigator.share` with files, the browser service worker and `navigator.storage.persist()` only work over HTTPS. On `npm run dev -- --host` (plain http on the home network) they are missing. Proposals: (1) Hash the pincode with a tiny built in function, not `crypto.subtle`, so the gate works everywhere. A 4 digit code cannot be truly protected anyway; the hash only hides it from casual eyes. (2) The app must run without these features (no crash), with a parent note when sharing is not available. (3) Install, offline, share sheet and persistent storage can only be checked on the deployed HTTPS address, so Q5 must be decided before milestone 2, not at the end.

**A6 (important): saving on iOS needs to be more eager.**
iOS can freeze or kill a home screen app without a reliable `pagehide` event, and an IndexedDB write started while going to the background may not finish. AC96 ("nothing lost if the app went to the background first") and AC24 (timer within 1 second after a close) are then flaky. Proposal for 4.18: "Every world change, answer and timer step is saved within about 2 seconds (small writes, batched), plus a save when the app is hidden." Change AC24 to "within 5 seconds" and AC96 to "at most the last 5 seconds of changes are lost". This is simpler and safer than a 30 second autosave, and the saves stay small.

**A7 (important): Rekenen does not fit the module format, so the format needs a generator type.**
Rekenen has no item list. Facts like `tafels:7x8` are a fixed set made by code, and wrong plus sums become new items at run time. Proposals: (1) Let the architect add a `generator` field to `module.json` for built in code modules, with items made at run time and stored progress keyed by id as usual. Parent made modules never use it. (2) Say in 4.14 that "Kopie maken" is only for the Taal module (and other JSON modules), not for Rekenen. (3) Saved wrong sums need a cap (for example the 200 newest) so a year of mistakes stays small. (4) "New topic in turns that still has new items" never runs out for plus and minus, so the turn order must still move on after one break. Write that rule down.

**A8 (important): the Taal content is not ready and is on the critical path for release.**
Today `validate.py` reports 20 problems: the topics hoofdletters, komma, apostrof and leestekens are missing, so all four exams fail. Proposal: writing and checking the rest of the content is its own parallel track in the plan, separate from code. The app is built and tested with the six ready topics plus a tiny test fixture module. AC59 is a release gate, not a build gate. Also: if `leestekens` needs `?`, `!` or `.` in `punctuate` items, allow any single mark per item for built in content (the renderer cost is the same), and keep "comma only" just for the parent editor in v1.

**A9 (important): import, export and backup on the iPad, plus file versions.**
`navigator.share({ files })` works on current iPadOS but only after a tap and only over HTTPS, and a blob download link in home screen mode often opens a preview instead of saving. The file picker (`<input type="file">`) works. Proposals: (1) Make the first share sheet test a milestone 2 task on the real iPad, with the fallback "open the file in a new view, use the share button" written into the PRD as acceptable. (2) Every backup and export file carries an app name, a format version and a date, so a later app version can still read old backups. Add to 4.15. (3) AC84 and the share sheet part of AC87 are manual iPad checks; the data round trip is tested automatically.

**A10 (nit): define "a day" for the boxes.**
"Due 1 day later" can mean 24 hours or "tomorrow". If a kid plays at 19:00 and at 8:00 the next morning, 24 hours means nothing is due yet. Proposal: due dates are calendar days in local time (box 2 means "from tomorrow on"). Add one line to 4.6 and adjust AC40 and AC42 wording. Also say that if the iPad clock jumps back, items simply stay due.

**A11 (nit): keep dino behaviour dumb on purpose.**
"Follows and stays within about 5 blocks unless blocked by terrain" can grow into path finding. Proposal for 4.3: dinos walk straight toward their goal, hop up one block, and a following dino that is stuck for more than 5 seconds pops next to the player with a little puff. The brachiosaurus is tall: say that dinos never walk into or through blocks the kid built, and that a dino is never trapped under a built roof forever (the same pop rule). No other AI.

**A12 (nit): the parent area on an iPad in landscape.**
The parent editor uses the normal iPad keyboard, which covers half the screen in landscape. Text fields under 16 points make Safari zoom in. Proposals: forms are a single column that scrolls the active field into view, all inputs at least 16 points, and "Probeer" reuses the exact kid screens. The parent area is the one place where normal scrolling is allowed. No change to scope, but worth one line in section 8 so nobody locks scrolling there.

Stack implications for the founder: no paid services or accounts are needed. Two items need a founder answer before the build gets far: Q5 (public HTTPS address, needed to test install, offline and the share sheet, see A5 and A9) and Q6 (the real iPad model, needed for the A2 spike). A1 (the v1a and v1b split) is a scope decision.

### qa (PRD review round 1)

Scope: testability of the ACs, missing edge cases, kid safety and accessibility for a kid of 8 to 10 on iPad Safari. Severity: blocker (fix before signoff), important (fix in this PRD or log a decision), nit.

**Q1 (blocker) AC101 and Q6 cannot be tested yet.** AC101 points to "section 11" but the device is an open question (Q6), and "30 fps on average over 2 minutes" hides stutter. Playwright WebKit on a laptop says nothing about an iPad.
Change: name a reference device in the PRD once the founder answers Q6. Rewrite AC101 as: "On the reference iPad, over 2 minutes of walking with 6 wild and 4 tame dinos, 95 percent of frames take 33 ms or less and no frame takes over 200 ms." Mark AC101 as a founder run real iPad check, and add a dev only fps overlay so the founder can read the number. Add: "When the app returns from the background, the 3D view comes back (WebGL context loss is handled) and no black screen shows."

**Q2 (blocker) Fast tapping and two fingers are not covered by any AC.** Kids tap everything twice, fast, with two fingers.
Change: add ACs.
* AC-new-a: a double tap on an answer button, "Verder", "Klaar" or "Terug naar de wereld" counts once. Only the first answer to a question counts, even if two fingers hit two answer buttons in the same frame.
* AC-new-b: tapping a wild dino 10 times in one second uses at most the food the kid has, never goes below 0, and never feeds past 5.
* AC-new-c: in Bouwen mode two fingers tapping at once place at most `count` blocks. A count never goes below 0.
* AC-new-d: AC74 lockout and the typed name keyboard survive mashing (no crash, no double characters from one tap).

**Q3 (blocker, kid safety) The parent gate has holes.**
* The 3 wrong tries lockout must survive a reload and closing the app. If it only lives in memory, the kid reloads and tries again.
* "PIN vergeten" has no limit. A kid can just keep guessing the adult question, or open the iPad calculator app next to Safari and compute "47 x 23". Then the kid can reset the PIN and owns the parent area.
Change: AC74 adds "the lockout is stored and still holds after a reload". AC75 adds: the question is new each time, needs more than a calculator can do alone in 1 try (for example two steps in words, answer with 2 wrong tries then 10 minute block), and the same lockout counter is shared with the PIN entry. Founder decision: is a calculator proof gate needed, or is "an 8 to 10 year old is not that determined" good enough? Also add to AC76 a test that lists every route (URL hash, back button, reload, browser history) and shows none reaches a parent screen without the gate.

**Q4 (important) Rewards can be gamed, and a zero score still pays.** AC34 gives a chest for K < N, including K = 0, so a kid can tap randomly to finish fast and still get 5 kleurblokken. Extra oefenen (AC52) is unlimited and pays varenblaadjes, so food can be farmed by guessing. Spec also does not say what the summary shows when K = 0.
Change: AC34 "K from 1 to N-1 gives the chest; K = 0 gives a kind message and no chest" (or founder decides that every finished break pays). Extra oefenen: cap rewarded varenblaadjes at, say, 10 per day, then "Genoeg geoefend voor vandaag, ga bouwen!". Add a parent visible flag in Resultaten for breaks with all answers under 2 seconds. Add an AC for K = 0 and for a break that timed out with 0 answered (what does the kid see and get?).

**Q5 (important) Timer and state rules have gaps, so AC22 to AC37 are not fully testable.**
* The lock icon is on break and exam screens. Does the break timer and the exam timer stop while the gate or parent area is open? AC23 only names the play timer.
* What happens in portrait ("Draai je iPad")? Does the break timer or exam timer run? Lock screen, Control Center, auto lock and Split View need a rule. iOS home screen apps do not always fire `visibilitychange`, so use `pagehide`, `blur` and a heartbeat gap rule.
* "Pauze nu starten" or an exam start while the kid is mid break or mid exam: which wins?
* The same app open twice (Safari tab plus home screen icon) would write to the same storage and double count.
* If the break time runs out while the kid is typing an answer, the typed part is lost and the screen jumps.
Change: add one table "timer matrix" (rows: play, break, exam, lesson, Lesboek, Extra oefenen, gate open, portrait, background; columns: runs or stops) and one AC per row that matters, tested with a fake clock. Allow only one active window (second window shows "Dino Blokwereld is al open"). Let the break time end after the current question is answered, or show "Nog 1 vraag" grace. Mark orientation lock: manifest `orientation` is ignored by iOS, so the portrait message is the only mechanism.

**Q6 (important) Several ACs are vague.**
* AC40 to AC42 "due 1 day later": say calendar day in the iPad local time (due from 00:00 of that day) or 24 hours, and what happens when the date moves back or the time zone changes. A kid can also change the iPad date. Suggest: due dates use calendar days, a clock that goes back never makes items due earlier than "today".
* AC38 "each module gets 5 breaks in 10": name the rule (smooth weighted round robin, state saved across restarts) and the rule when a module has no usable items for one turn.
* AC48 "no break or Extra oefenen round asks an item": also add exams are exempt (4.11 says so), so the AC must not apply to exams.
* AC10 "does not zoom, scroll": say how it is tested. Pinch and double tap zoom cannot be reliably scripted in Playwright. Split into an automated check (viewport meta, `touch-action`, `user-select`, `-webkit-touch-callout`, `gesturestart` prevented) and a real iPad check for the founder.
* AC22 "counts down each second": tolerate plus or minus 1 second and say the timer is time based, not frame based.

**Q7 (important) Saving can lose or corrupt everything, and updates are not covered.** AC96 only tests the happy path.
Change: add ACs.
* AC-new-e: a save killed halfway (power off, Safari kills the tab) leaves the previous save readable (write a new copy then switch, or use one IndexedDB transaction).
* AC-new-f: a corrupt or unreadable save shows a friendly Dutch message with "Probeer backup" and does not show a blank screen or wipe data silently.
* AC-new-g: after the app is updated by the service worker, saves from the older version load (a version number and a migration test with an old fixture). The update applies at the start of the app, not mid break.
* AC-new-h: storage full or storage denied shows a gentle message to the parent and play continues.
Founder note to relay: the parent area should show the app version, so a stale cached version on the iPad can be spotted.

**Q8 (important) Backup, restore and import safety.**
* AC87 restore: a bad file must not destroy the current data. Validate the whole file first, keep the old data until the new data is written, and then switch. Add an AC for restoring a broken file and for a backup from a newer app version.
* Does the backup hold the PIN hash? If yes, restoring an old backup resets the PIN. Decide and write it down.
* AC85 and AC88: add test files with `<script>`, `javascript:` and `https://` text, a 2 MB plus file, a file with 10 000 items (does the editor stay usable), and a module with the same id as a built in module.
* AC98 "no network requests": test it against the deployed address too. Cloudflare can inject Web Analytics from the dashboard, which would break the no tracking rule. Add to the ship checklist: automatic setup of Web Analytics is off.
* AC84 export: if the share sheet fails in home screen mode (see risks), the download fallback needs its own AC.

**Q9 (important) Dino rules have unclear edges.**
* AC20 and 4.3: with 12 tame dinos, is food consumed when feeding a wild dino? Better: not consumed, message shows. Say so.
* A passed exam at 12 tame dinos: the golden egg rule conflicts with the cap. The kid just did a hard exam and gets nothing. Suggest: the golden dino always hatches, the cap is 12 normal plus unlimited golden, or the kid picks a dino to release (needs a confirm). Founder decision.
* AC18 says "12 characters", 4.3 says "12 letters". Pick one. Own keyboard only, so names can hold only the allowed characters. Names are shown in Resultaten and backups, fine, but add a note that the app asks the kid to use a nickname, not a full real name.
* AC17 "about 5 blocks" is vague. Rewrite: "within 8 blocks after 5 seconds of the kid standing still, unless the path is blocked, and it never gets stuck inside a wall".
* Dino stuck in a hole made by the kid, or the kid walled in by blocks they placed. Add AC: the kid cannot trap themselves forever (jump plus placing blocks always works) and a parent or kid reachable "Ik zit vast" button moves the player to the spawn.

**Q10 (important) Rekenen answers: parsing and generation.**
* AC58 needs a full rule. Proposal: trim, comma becomes dot, then compare as numbers, so "3,50" and "3,5" are right but "3," and "" are not, and a leading zero is allowed. Use whole tenths in code for E7 decimal sums so there is no 0.1 + 0.2 float error.
* Dutch uses a dot as thousands separator ("1.000"). The pad has no dot, good, but add an AC that the pad never produces a dot, and big numbers on screen are shown with a thin space or dot in a way a groep 6 kid reads right.
* AC61 add: no question repeats inside one break or exam, an exam of 20 has no duplicate fact, and generation is seedable so a failing test can be reproduced.
* AC62 and AC63: add the "right answer later" case. A wrong generated sum goes to box 1, and once right it moves up and is not asked as a new sum again.

**Q11 (important) AC59 proves the format, not the spelling.** The validator checks structure only. The biggest content risk is a wrong spelling rule taught to a child.
Change: add AC: `./scripts/check.sh` runs `validate.py` (and says so if python3 is missing, it must not skip silently). Add content checks that can be scripted: no `choice` item has two options that are both correct (compare against `answer` and a small list), every `type` item lists all accepted answers, no `punctuate` item where the comma is optional in Dutch, no item longer than 15 words (M6, E6) or 20 words (M7, E7), no two items with the same prompt and sentence. Add a human check: QA reads 5 items per topic against woordenlijst.org and the founder or a teacher reads a sample of 20. Record the result in TEST_REPORT.

**Q12 (important) Accessibility and iPad basics need measurable ACs.**
* AC102 "at least 44 x 44 points": the lock icon is described as "small". Say the icon may look small but its tap area is at least 44 x 44, placed away from the look drag zone so a kid dragging does not hit it.
* Add contrast: text at least 4.5 to 1, big text at least 3 to 1, checked on the soft orange "wrong" colour and the grey lock icon. Add: right and wrong are never colour only (already in section 9, move into an AC).
* Add safe areas: stick, jump button, hotbar, countdown and lock icon sit inside `env(safe-area-inset-*)`, and the hotbar is lifted from the bottom edge so the home indicator swipe does not trigger by accident. Real iPad check.
* Add motion: the pulsing countdown and pop effects never flash more than 2 times a second, and `prefers-reduced-motion` turns pulse off while the text still grows. Define the fog and the hit "pop" so they are not flicker.
* Add Split View and Slide Over: the app shows "Maak dit venster groter" when the window is under 900 px wide, instead of broken controls.
* Add: with the iPad Dutch voice over off, a kid with dyslexia can still read: font size 24 for questions is in. Suggest a parent setting "Groter lettertype" (later is fine, log it).
* Add an AC for the first start flow on a wiped iPad (empty state) and for a "no module is switched on" parent warning (AC39 covers the kid side only).

Open for the PRD owner: please answer each Q as accepted, rejected with a reason, or founder decision. Q1, Q3 and the open founder question on dino cap in Q9 go to the founder.

### product response (round 1)

Section 11 now numbers founder decisions F1 to F12 so they do not clash with the qa Q numbers. Old PRD Q1 to Q8 became F2, F3, F5, F8, F9, F10, F11, F12. New ACs start at AC103 and sit in their topic group.

* **A1:** founder decision F1 (A: build order v1a then v1b, both in v1, recommended; B: cut v1b to Later; C: no split). Added 4.0 with the v1a and v1b lists and (v1b) marks on sections, flows and ACs.
* **A2:** accepted. Speed spike with go or no go and 48 x 48 fallback in 4.1 and section 10; context loss in 4.19 and AC109; AC101 now 6 wild plus 12 tame, marked (iPad).
* **A3:** accepted. Building up rule in 4.2, new AC103, AC6 notes the exception, Flow 2 step 5.
* **A4:** accepted. Tap versus drag and hit order in 4.2, new AC104, long press does nothing (Later list).
* **A5:** accepted. Built in pincode hash (4.12, AC128), no crash on plain http (4.19, AC140), F9 must be decided before milestone 2 (section 10).
* **A6:** accepted. Saves within about 2 seconds (4.18); AC24 now 2:30 to 2:35, AC96 now at most 5 seconds lost; AC37 and AC71 got the same tolerance.
* **A7:** accepted. `generator` field (4.10, section 10), Kopie maken only for JSON modules (4.14, AC83), 200 newest saved sums (AC126), saved topic pointer that always moves on (4.6 step 2, AC46).
* **A8:** accepted, updated per operator: content is complete and validates. AC59 kept, new AC122 makes check.sh run validate.py on every module. Built in content has comma only marks, so punctuate stays comma only everywhere in v1.
* **A9:** accepted. New view fallback in 4.15, file header with app name, format version and date (AC131), share sheet checks marked (iPad) in AC84 and AC133.
* **A10:** accepted. Calendar days in local time (4.6), AC40 and AC42 reworded, clock going back in AC118.
* **A11:** accepted with one change. Straight line walking, one block hop, pop after 5 seconds stuck (4.3, AC17). Rejected "never trapped under a roof" for wild dinos: a kid building a pen is part of the fun; dinos only never walk through blocks (AC21).
* **A12:** accepted. Line in section 8 (one column, 16 point inputs, scrolling allowed) and in AC102.
* **Q1:** accepted. AC101 rewritten with the 95 percent and 200 ms frame rule, marked (iPad), uses the reference device from F10; developer fps counter in 4.19; context loss AC109. Used 12 tame dinos (A2) as the worst case, not 4.
* **Q2:** accepted. New AC117 (double tap and two fingers on answers), AC110 (fast feeding), AC105 (two finger build), mashing in AC57 and AC74.
* **Q3:** accepted the stored lockout (AC74), shared counter and route test (AC75, AC76). Calculator proof reset is founder decision F4 (A: two step question plus 10 minute block, recommended; B: one question plus shared lockout; C: no in app reset, restore a backup).
* **Q4:** founder decision F6 (A: 0 right gives no chest and Extra oefenen pays at most 10 a day, recommended; B: always pay, no cap; C: no chest at 0, no cap). ACs AC34, AC116, AC120 are written for option A and marked (F6). Accepted the "snel geklikt" mark in Pauzes (4.16, AC92).
* **Q5:** accepted. Timer matrix in 4.4 with heartbeat gap rule (AC23, AC112, AC113); one window only (AC114); Pauze nu starten greyed and no exam during a break (AC115); "Laatste vraag" grace (4.5, AC32); exam timeout checks a typed answer (AC67). Portrait message is the only lock (section 2).
* **Q6:** accepted. Calendar days (AC40, AC42, AC118); smooth weighted round robin saved across restarts (4.5, AC38); exams exempt in AC48; AC10 split into automated AC10 and iPad AC107; AC22 is time based with 1 second tolerance.
* **Q7:** accepted. Safe writes AC136, broken save AC137, version and migration AC138 (update only at app start), storage full AC139, app version in settings AC135.
* **Q8:** accepted. Restore checks first and keeps old data (4.15, AC130); backups hold no pincode (AC87, section 9); test files listed in AC85; built in id conflict AC86; AC98 also on the deployed address and Web Analytics off; download fallback in AC84 and AC133.
* **Q9:** accepted food not used at 12 (4.3, AC20); 12 characters and a "dino name" prompt (AC18, section 9); AC17 rewritten with 8 blocks after 5 seconds; "Ik zit vast" in the pause menu (AC106, Flow 5). Golden egg at 12 is founder decision F7 (A: golden do not count, recommended; B: egg waits; C: release a dino); AC111 marked (F7).
* **Q10:** accepted. Full parse rule and whole tenths (4.8, AC58); no dot key and thin space for thousands (AC121); no repeats and seedable generator (AC125, AC61); right answer later in AC63.
* **Q11:** accepted. check.sh runs validate.py and fails if python3 is missing (AC122); scriptable checks added (AC123); optional comma left to the human check, since a script cannot judge it; human check in AC124.
* **Q12:** accepted. Lock tap area AC127; contrast and icon plus colour AC141; safe areas AC143 (iPad); motion and reduced motion AC142; window under 900 points AC108; first start on a wiped iPad AC144; parent warning AC129. "Groter lettertype" moved to Later.

### product: founder answers F1 to F13 folded into PRD

## Architecture review

### developer view

Only real issues. Checked ARCHITECTURE.md and PLAN.md against file lists and groups.

**Too big or unclear**
* **D1. T23** (renderer, loop, controller, fps counter, spike, hooks, null renderer) is too big. Suggest T23a renderer, quality, fps counter, loop, game.ts; T23b player controller, e2e hooks, spike load.
* **D2. T43** (break flow, content loader, resume, session store, log store, e2e) is too big. Suggest moving `session-store.ts` and `log-store.ts` to their own task after T5 (they can run early in group C), so T43 is only the flow.
* **D3. T48, T51, T53** are each two or three jobs. Suggest T48 into gate and parent shell vs first start flow; T51 into exam screen and flow vs the parent exams screen; T53 into backup UI vs module import and export.
* **D4. T44 vs T42, "Ik zit vast".** The button lives in T44 (`pause-menu.ts`), the Volg mij behavior in T42, and T44 does not depend on T42. Name one owner. Suggest T44 calls a `game.imStuck()` that T42 adds, and T44 depends on T42.

**Files lists that break the "only touch listed files" rule**
* **D5.** Per feature e2e hook files (`registerHook` in "its own file") are not listed in any task (T33, T41, T43 and others). List them per task, and say where they are imported (side effect import from the feature file).
* **D6.** `scripts/check-dist.mjs` is extended by T3 and T22 (T1 note) but is in neither Files list. Also `src/env.d.ts` (`__E2E__` declaration) and a Vitest setup file are in no list. Add them to T1.
* **D7.** CSS files: no task says where `src/styles/*.css` get imported. Say "imported from the screen's .ts file" or list the importer.

**Missing tasks or test setup**
* **D8. No owner for the progress store** (box, due day, level per item) and for typed load and save of the `kv` records (`economy`, `timers`, `rotation`, `switches`, `stats`). T5 only has generic db and queue. T13, T38, T43 all need it. Add to T5 or a new task after T5.
* **D9. Canvas in unit tests.** jsdom has no 2D canvas and we may not add the `canvas` package. T8 (atlas), T26 (name tag) and tests for them need a pure part (tile pixel data, label text) plus a thin canvas wrapper, or an e2e check only. Say so in the tasks.
* **D10. T34 (AC109)** needs real WebGL `WEBGL_lose_context`. If headless WebKit has no WebGL (the T1 report may say so), the e2e cannot prove it. Add the fallback: unit test with a fake GL context and the hand check on the iPad.
* **D11. Web Audio in tests (T11, AC100).** jsdom has no `AudioContext`. State that tests use a fake AudioContext injected through `sound.ts`.
* **D12. Font and icons (T3).** Nunito woff2 must be downloaded and the cloud sandbox may have no network. Needs a decision: operator supplies the file, or fall back to a system rounded font stack.
* **D13. `npx playwright install webkit`** in `check.sh` does not install Linux system libraries. May need `--with-deps` (root) in the cloud and in `ci.yml`. T1 should verify and fix `check.sh` and `ci.yml` (add both to T1 Files).

**Parallel groups**
* No same group file collisions found in the Files lists as written. Two risks: (a) `src/main.ts` is edited by T3, T22, T23, T37, T41, T43, T48, T52; this is safe only if the "start earlier than group" rule is never used for T22 (group C, M5), so T22 must not run with T23. (b) T65 (group C) edits Taal JSON and `TEST_REPORT.md`, which T32 and T64 also use, and T7 pins 288 items. Run T65 only in M7, and have T7 read the counts, not hardcode them if fixes can change them.

## Architecture review (qa view)

Checked ARCHITECTURE.md and PLAN.md against the 148 active ACs in the PRD. Every active AC maps to at least one task. The issues below are real gaps.

**Plan holes**
1. T50 (Inhoud kiezen) is not a dependency of any task, so T62, T63 and T64 can start without it. Add T50 to the T62 and T63 dependency lists.
2. `scripts/check.sh` is owned by no task. AC122 (validate.py on every module folder, fail if python3 is missing) is listed under T1, but check.sh is not in T1's file list. Add it to T1.
3. The "first download under 5 MB" constraint (PRD section 10) has no task. Add a size check to `scripts/check-dist.mjs` in T1.
4. Shared e2e helpers (go through the gate with the PIN, read hooks, fake clock, tap target scan, "kill the app") have no owner. Parallel tasks in groups I and J will each write their own copy or collide. Give one early task (T1 or T23) `tests/e2e/helpers/*.ts`, and give T48 the PIN login helper.
5. Egg spawn API is unspecified. T47 (buy) and T51 (golden egg) must put an egg in the world, but neither lists `dino-system.ts` or `dino-store.ts`, which T42 owns. Make T42 export `addEgg(kind, golden)` and say so in its acceptance.
6. T51 and T56 read and write the `exams` store, but `log-store.ts` is owned by T43. T43 should export saveExam and the break flag "snel geklikt" (AC92). Today T43's acceptance does not mention either.
7. The lock icon (T48) must never start a look drag (AC127), but T48 does not list `pointer-router.ts`. T10 should expose an "ignore zone" registration.
8. T52 shows the 30 day backup reminder, but nothing writes `meta.lastBackup`. Add it to T53 through a backup.ts call (T18 owns the file).

**Test setup**
9. No step installs WebKit for Playwright (`npx playwright install webkit --with-deps`) in T1, check.sh or CI.
10. AC141 needs a contrast checker. No axe-core or own helper is in the dependency list. Add a package in T1 or write a small ratio function over the tokens in T3.
11. Plain http tests (AC128, AC140) cannot run on `localhost`, which counts as a secure context. The tests must remove `crypto.subtle`, `serviceWorker` and `isSecureContext` with `addInitScript`. Say this in T17 and T52.
12. "Kill and reopen" (AC24, AC96, AC150) needs a hook that closes the page without the pagehide flush. `page.close()` fires pagehide and would hide the 5 second loss rule. Add such a hook in the helpers.
13. AC109 may be untestable if headless WebKit has no WebGL and the null renderer is used. Then AC109 must move to the (iPad) list. Decide this when T1 reports on WebGL.
14. AC97 offline with `setOffline` and a service worker is flaky in Playwright WebKit. Plan a fallback: the check on the deployed HTTPS address (T64).
15. Multi touch (AC8, AC105, AC117) is synthetic PointerEvents, not real touch. Put "two finger play on the real iPad" on the T64 list.
16. T32 changes `WORLD_SIZE` to 48 after T4 and T23 tests exist. AC1 tests must read the constant, not a literal 64.

**Tasks too big or unclear**
17. T48 does gate logic UI, first start flow, parent shell, lock icon and seven stubs, plus `screens.ts` and `main.ts`. Split into gate plus first start, and shell plus stubs.
18. T23 has nine files (renderer, loop, controller, fps counter, spike, hooks, main). Split into renderer plus fps plus spike, and loop plus controller.
19. T43 (break flow, resume, content loader, both stores, logs) and T53 (backup UI, export, import, conflict choice) are each too much for one agent run. Consider splitting by storage versus UI.
20. T31 must say the session state is a plain serializable object, or AC37 (resume on the same try) cannot be built later in T43.
21. T62 is unbounded: an audit of every screen with fixes across all CSS. Keep "small CSS fixes only" and send everything else to new tasks, as the task note says.

**Parallel collisions**
No file is shared inside a group once the stub rule is followed. Watch these: `src/main.ts` (T3, T22, T23, T37, T41, T43, T48, T52, never in the same group today, keep it so), `src/game/game.ts` (T23, T33, T37, T42, T55 via actions), `src/ui/hud.ts` (T10, T33, T41, T44). T65 is in group C but edits the Taal JSON while T7 and T20 read it, so run T65 only after T7 and T20 are done and re-check the 288 item count in AC59.

### architect response (architecture review round 1)

Plan now has 71 tasks. A script checked that no two tasks in one group share a file and that every dependency sits in an earlier group. New rule: a task never starts while another running task lists any of the same files.

**Developer view**
* **D1:** accepted. T23 is now T23a (renderer, quality, fps counter, spike load) and T23b (loop, controller, `game.ts`, `main.ts`). The hooks registry moved to T1.
* **D2:** accepted. New T66 (typed records, progress store) and T67 (session store, log store). T43 is only the flow. T7 reads the item count from the folder.
* **D3:** accepted. T48a shell and stubs, T48b gate, lock icon and first start; T51a kid exam, T51b parent Examens; T53a backup UI, T53b module import and export (with a stub section file made by T53a).
* **D4:** accepted with a change. No new dependency is needed: T23b provides `game.teleportHome()` which emits `teleported`, T44 calls it, T42 listens so Volg mij dinos come along. Written in both tasks.
* **D5:** accepted with a change. Hooks are registered inside the feature's own source file, so there are no extra hook files to list. Rule in ARCHITECTURE and PLAN.
* **D6:** accepted. T1 owns `scripts/check.sh`, `check-dist.mjs`, `src/env.d.ts`, `tests/setup/vitest.setup.ts`, `ci.yml`. T3 and T22 list `check-dist.mjs` and never share a group.
* **D7:** accepted. Each screen's `.ts` imports its own CSS; `main.ts` imports tokens and base.
* **D8:** accepted, see D2 (T66).
* **D9:** accepted. Vitest setup stubs the canvas; atlas and name tag have a pure part plus a thin wrapper checked in e2e.
* **D10:** accepted. Without WebGL in headless WebKit, AC109 is a unit test on a fake renderer lifecycle plus the iPad check in T64.
* **D11:** accepted. `sound.ts` takes an AudioContext factory, T11 owns the fake in `tests/unit/fakes/`.
* **D12:** decided by the architect (small, free, reversible, decision 38): `@fontsource/nunito` through npm with a rounded system font fallback. No founder decision needed.
* **D13:** accepted. `check.sh` uses `--with-deps` when running as root. T1 checks WebKit runs in the sandbox and trims `ci.yml` to WebKit only.
* **Parallel risks:** accepted. T22 now depends on T52, the last `main.ts` user before it. T65 runs in group M after T7 and T20.

**qa view**
1. Accepted. T62, T63 and T65 depend on every leaf task, including T50.
2. Accepted, see D6.
3. Accepted. `check-dist.mjs` fails above 5 MB (T1).
4. Accepted. T1 owns `tests/e2e/helpers/app.ts`; T48b adds `helpers/gate.ts` with `loginAsParent` and makes `openApp` pass the first start.
5. Accepted. T42 exports `addEgg(kind, golden)`.
6. Accepted. T67 owns `saveExam`, `listExams` and `saveBreak` with the "snel geklikt" flag.
7. Accepted. T10 exposes `addIgnoreZone`; T48b uses it for the lock icon.
8. Accepted. T18 `markBackupMade` writes `meta.lastBackup`, T53a calls it, T52 reads it.
9. Accepted, see D13.
10. Accepted. Own `src/ui/contrast.ts` in T3, no new package.
11. Accepted. `asInsecure` helper in T1, used by T48b (AC128) and T52 (AC140).
12. Accepted. `simulateKill` hook in the save queue (T5) plus `killApp` helper (T1).
13. Accepted, see D10.
14. Accepted. T22 notes the fallback: AC97 on the HTTPS test deploy in T64.
15. Accepted. Two finger play added to T64.
16. Accepted. T4 and T23b tests read `WORLD_SIZE`.
17 to 19. Accepted, see D1 to D3.
20. Accepted. T31 acceptance: session state is a plain object with a JSON round trip test.
21. Accepted. T62 does small CSS fixes only; other findings become new tasks.

No open points. No founder decisions from this round.

## M1 milestone review

Architect, 2026-10-17. Scope: `src/`, `tests/`, `scripts/`, `index.html`, `vite.config.ts`, `playwright.config.ts`, `.github/workflows/`, checked against ARCHITECTURE, PLAN and the M1 ACs.

`./scripts/check.sh` in the cloud sandbox: validate.py OK, lint OK, typecheck OK, 243 unit tests pass, build OK, check-dist OK (676 KB). E2e did not run here: the proxy blocks the WebKit download (known, FRICTION). CI on GitHub is green for T33, T34 and T37, with real WebGL (decision 40). The production bundle has no `__dino`, no hook names and no network calls. Only the `simulateKill` method name is left, as a plain method on the save queue, not on `window`. That is harmless.

Overall: the code follows the architecture. Pure parts are pure and well tested. Hooks stay out of the real build. No kid safety problems: no links, no network, no personal data, text goes in through `textContent`. The items below are what to fix before T32 and before M2 starts.

### Must fix

1. **The deploy workflow will fail at the e2e step, so T32 cannot deploy.** `.github/workflows/deploy.yml` line 16 runs `./scripts/check.sh`. On a GitHub runner the user is not root, so `check.sh` (line 40) runs `npx playwright install webkit` without `--with-deps`, and WebKit cannot start without the Linux libraries. `ci.yml` only works because it has its own install step first. Fix: add the same step to `deploy.yml` before "Check": `npm install --no-audit --no-fund && npx playwright install --with-deps webkit`. Also add `permissions: contents: read` and `concurrency: { group: deploy, cancel-in-progress: false }` at the top level. With that, the workflow is ready for T32 once the founder adds `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers") and `CLOUDFLARE_ACCOUNT_ID`. The workflow is already on `main`, so "Run workflow" shows up. The founder must pick the branch `claude/clever-euler-c9e2kq` in the branch menu, or merge it first.

2. **The fps counter would give a wrong spike result.** `src/render/fps-counter.ts`:
   * Line 50: the stats cover only the last 600 frames (about 10 to 20 seconds). AC101 and T32 judge 2 minutes, so a hitch at minute 1 is gone by the time the founder reads the number. Fix: keep running totals since the measuring started: frame count, frames within budget, frames over 200 ms, worst frame, and a 1 ms bucket histogram for the 95th percentile. Show the elapsed seconds too, so the founder knows when 2 minutes are up.
   * Lines 78 to 81: `last` is never reset when the loop stops. A trip to the background, a turn to portrait or a pause becomes one huge "frame" and counts as over 200 ms. The loop already passes `dt = 0` on the first frame after a start. Fix: in `src/game/game.ts` line 169 pass that through (`fps.frame(now, dt === 0)`) and skip the sample when it is a restart.
   * Warm up: the first frames compile shaders and upload chunks and can take over 200 ms. Fix: start measuring after the first 3 seconds of play.
   * Line 29: `v <= 33` counts a frame that takes two screen refreshes (33.3 ms, plus timer jitter) as too slow. An iPad that holds a steady 30 fps would fail. Fix: count frames up to 34 ms as within budget, and log this reading of AC101 in DECISIONS.
   * T32 note for the founder: turn Low Power Mode off, because it caps Safari at 30 fps. Use a Safari tab with `?fps=1&spike=1`, because the home screen app drops the query.

3. **Sound can stay silent on the iPad.** `src/audio/sound.ts` line 160 only makes the AudioContext on the first `play()`. `src/platform/audio-unlock.ts` line 16 then line 34: the first `pointerup` sets "unlocked" and removes the `touchend` and `click` listeners. Two problems follow:
   * If the first sound is not played inside a tap (the countdown tick in M2, an egg hatch in M3), the context is made and resumed outside a user gesture and iOS keeps it suspended for good. Also, if iOS does not accept `pointerup` as the gesture, the `touchend` chance is already gone.
   * After the app was in the background, or after Siri or a call, iOS puts the context in `interrupted` or `suspended`. Nothing ever calls `resume()` again.

   Fix: `createSound` calls `unlock.whenUnlocked(() => ensure())`, so the context is made and resumed inside the first tap. `audio-unlock.ts` keeps a light capture listener on `touchend` and `click` (not only `pointerup`) and calls `resume()` on every tap while any watched context is not `running`. Unit test with the fake context: a play from a timer before any tap never makes a context. After a tap the context exists. After the fake goes to `interrupted`, the next tap resumes it.

4. **The kid can play before the save is loaded.** `src/main.ts` line 40 starts the game and its loop, then line 63 opens IndexedDB and restores asynchronously. On a cold start Safari can take a moment. Blocks mined in that moment are wiped by `applyDiff`, the player jumps to the saved spot, and changes made before `save.start()` are never marked dirty. Fix: call `game.pause()` right after `createGame`, and `game.resume()` in the `finally` at line 64. Add a 3 second timeout around `startSaving`, so a hanging `indexedDB.open` (a known Safari problem) still lets the kid play, without saving. This is also the boot shape M2 needs (PIN first, then the world).

5. **Settings defaults do not match the PRD.** `src/storage/schema.ts` line 134 has `breakEveryMinutes: 20, questionsPerBreak: 10`. PRD 4.17 says 5 minutes and 5 questions (AC22, AC28). Fix it now, before the first settings record is ever written, because `withDefaults` keeps stored values. Add a test that pins the defaults to the PRD table.

### Later

Before M2 starts (these touch shared files, so plan them as tasks):
* **`main.ts` and `game.ts` growth.** `main.ts` lines 68 to 104 register about 25 game hooks. Every later feature that needs a hook would edit `main.ts`, which serialises the parallel groups. Move the game hooks into `game.ts` (or `src/game/e2e-hooks-game.ts`, owned by game) under `if (__E2E__)`, and make `main.ts` a short boot sequence (`src/app/boot.ts`). In `game.ts`, add `addSystem({ update(dt), onRestore?, onTeleport?, dispose? })`, so dinos (T42) and timers plug in without editing the frame function (line 164). Suggest one small refactor task before T41 and T42, done alone, not in a parallel group.
* **Single save queue.** It only writes the `kv` store. AC150 needs economy, dinos and the ledger in one transaction. Add `queue.commit(extraStores, fn)` that runs on the same promise chain and writes all dirty `kv` records in that same transaction, so a batched flush and a purchase can never interleave. Also schedule a retry after a failed write (today a failed record waits for the next change, `save-queue.ts` line 57). Wire `onError` to the AC139 storage note.
* **Never write over a save that could not be read (AC137).** `src/game/world-save.ts` lines 86 to 97 swallow a failed read and play on in the start world. The next change then overwrites the kid's world. When a record fails to load, stop saving it until the broken save screen has asked the parent.
* **IndexedDB upkeep in `src/storage/db.ts`.** Set `db.onversionchange = () => db.close()` before the first `SCHEMA_VERSION` bump. `onblocked` (line 35) should not reject, because the open can still succeed. Call `navigator.storage.persist()` on HTTPS (AC140 path).
* **Reset input on pause and hide.** `pointer-router.ts` keeps owned pointers if an up event never arrives, and `look.ts` keeps adding drag while the loop is stopped. Add `router.reset()` that cancels every owner, and call it whenever the loop stops. Otherwise the player may walk on by itself, or the camera may jump, after a trip to the background.
* **Tap rule.** `look.ts` line 50 compares only the start and end points. A finger that moves 30 points and comes back within 300 ms still counts as a tap. Track the largest distance seen (AC104).
* **Jump on press.** `hud.ts` uses `onTap` for "Spring", so the jump happens on release, after a 350 ms repeat guard. Jump on `pointerdown` instead. It feels much better for kids.
* **Text sizes (AC102).** `src/styles/hotbar.css` line 13 ("Alle blokken") and line 34 (block names) use 16px. Kid text must be at least 20 points. Widen the grid cells so "Wol paars" fits at 20px.
* **Saved block ids.** `cleanDiff` (`world-save.ts` line 31) checks the cell index but not the block id. Also keep only AIR or known block ids.
* **Performance on the 2018 iPad.** `chunk-mesh.ts` builds into `number[]` with a closure per face. A tap on a chunk edge rebuilds up to 3 chunks in one frame. Ask the founder to mine and build at chunk edges during T32. If that hitches, write into reused typed arrays. In `sound.ts`, make one noise buffer and reuse it, instead of a new one per sound.
* **Hosting.** `public/_headers` from ARCHITECTURE "How to deploy" does not exist yet. That is fine for T32. It must land with the service worker (T22).
* **Nits.** Two words for the same mode (`mine` and `build` in the save, `hakken` and `bouwen` in the game). Pick one before more records copy it. `check-dist.mjs` could also grep for a few hook names, not only `__dino`.

No founder decisions come from this review. One item to tell the founder for T32: turn Low Power Mode off, and open the test address in a Safari tab with `?fps=1&spike=1`.

## M2 milestone review

Architect, 2026-10-17. Scope: everything since `a695894` (the M1 review), checked against ARCHITECTURE, PLAN (with the operator notes at the end) and the M2 ACs. Focus: the break flow end to end, save robustness, iPad Safari, kid safety, shared state in `main.ts`, and what M3 needs.

`./scripts/check.sh` parts run in the cloud sandbox: validate.py OK, lint OK, typecheck OK, 733 unit tests in 84 files pass (33 s), build OK, check-dist OK (886 KB). E2e did not run here (WebKit download blocked, CI runs it).

Overall: good work. The session reducer is pure, serializable and well tested. Points are written as an absolute economy record, so a kill can never pay a kid twice. Resume on the same question and try works in unit and e2e tests. Kid safety is clean: no `innerHTML`, no links, no network calls, no `localStorage`, no console output, all text through `textContent`. The items below are what to fix before M3 (group J) starts.

### Must fix

1. **Every break makes a new AudioContext that is never closed.** `src/app/break-flow.ts` lines 263 to 271: `mountScreen` calls `createSound` for each break when no `env.sound` is given, and `main.ts` line 127 never gives one. Because the app is already unlocked, `whenUnlocked` runs `ensure()` at once (`src/audio/sound.ts` line 179), so each break opens a fresh context and adds it to the unlock list for good. With a break every 5 minutes that is 12 contexts an hour. iOS Safari has a small limit on live contexts. After that `ensure()` fails, `failed` becomes true and the break goes silent, and every open context keeps the audio hardware awake (battery). There are three Sound instances in total: `game.ts` line 102 (which also ignores the sound settings, so AC99 "sound off in settings" will not silence the world), `timer-driver.ts` line 269, and one per break. Fix: make one `Sound` in `main.ts` after the settings are read (`createSound({ unlock: audio, enabled: s.soundEffectsEnabled, volume: s.volume })`), pass it to `createGame` (the `sound` option exists), to `startPlayTimer` and to the break flow. Remove `createSound` from `break-flow.ts` and `timer-driver.ts`. T49 then calls `setEnabled` and `setVolume` on that one instance. Test: three breaks in a row with a counting fake context factory create exactly one context.

2. **One break step is written in four to six separate transactions.** `break-flow.ts` lines 289 to 293 save the session, then each effect (`applyEffect`, lines 299 to 356, and `saveBox`, lines 362 to 388) in its own transaction. `finishRun` (lines 397 to 417) writes the break log and then the session in two more. A kill in between gives:
   * a lost answer log line, box or ledger line (the ledger then no longer adds up to the points the parent sees in Resultaten);
   * a break logged twice: the break log is written, the app dies before the session with `logged: true` is saved, the kid reopens on the summary, taps "Terug naar de wereld" and `saveBreak` runs again;
   * a rotation step without a break: line 248 writes `rotation` before the session (line 249).
   The resume path papers over the points part by writing the economy from the saved session (line 191). That overwrite is safe today only because nothing else writes points. In M3 the shop does. Fix: add `src/app/session-writer.ts` with `commitStep(db, step)`, which runs one `transact(db, ['kv', 'answers', 'breaks', 'ledger', 'progress'], 'readwrite', ...)` and writes the session (or clears it), the economy, the answer logs, the ledger lines, the box changes, the saved sum trimming and, at the end, the break log. Do the start of a break (rotation plus first session) in one commit too. Then delete line 191. `transact` in `db.ts` already takes several stores. This is the same helper T47 needs for AC150, so build it once, here. Test: a commit where one write throws leaves the session, economy, logs and ledger exactly as before (fake-indexeddb abort), and a resume on the summary after the break log was committed does not write a second break log.

3. **M3 cannot be built with the current wiring and file lists.**
   * `setBreakEnv` (`break-flow.ts` lines 72 to 77, used again at lines 425 and 451) is a module global set by `main.ts` line 127 right before `startPlayTimer`. Order dependent and invisible to the type checker.
   * `main.ts` lines 117 to 119 call `openShop(screens)`, `openLesboek(screens)` and `openPractice(screens)` with only `screens`. The shop needs the database, the dino store and the points; Extra oefenen needs the catalog, the stores, the sound and the session writer. T46 and T47 are both in group J, neither lists `src/main.ts`, and both would have to change it. So they either collide in `main.ts` or invent more globals.
   * T47 says "uses `addEgg` and `appendLedger`, edits neither file" (PLAN line 82). That cannot meet AC150: `addEgg` only changes the in memory store, and the dinos record reaches disk through the save queue up to a second later, in another transaction than the points and the ledger.
   * When the boot times out after 3 seconds (`world-save.ts` lines 63 to 67), `database`, `records` and `queue` may still be set in `main.ts`, but the dino store was never loaded. A purchase that writes `store.toRecord()` would then replace the kid's saved dinos with an empty list plus one egg.
   Fix: one small task, done alone before group J (call it T43b). Files: `src/app/app-env.ts` (new), `src/main.ts`, `src/app/break-flow.ts`, `src/app/timer-driver.ts`, the three stubs (`shop-flow.ts`, `practice-flow.ts`, `ui/learn/lesboek.ts`). `AppEnv` holds `db`, `records`, `queue`, `sound`, `audio`, `clock`, `dinos` (the game's store) and `saving` (true only when `bootSave` returned `'saving'`). `main.ts` builds it once after the boot and passes it through `PlayTimerDeps` and to each `openX(screens, env)`. Remove `setBreakEnv`. Then update PLAN: T46 adds `src/app/session-writer.ts` as a user (no copy of `applyEffect`; the answer `context` and ledger `reason` become parameters instead of the fixed `'break'` at lines 310 and 350) and must not save its round as session kind `'break'`, or the boot resume would open it as a break. T47 adds `src/app/purchase.ts` (new): inside one `transact(db, ['kv', 'ledger'])` it reads the economy, checks price and the 12 cap, writes the new economy, the dinos record with the egg added, and the ledger line; the egg goes into the in memory store first (synchronously, so any save queue flush that reads the dinos record later already sees it), then the commit runs, and if the commit fails the egg is taken out again (T47 then also lists `src/dinos/dino-store.ts` for a `removeEgg`). Adding the egg only after the commit would let a queue flush that started in between write the old dinos record over the purchase. The shop is greyed with a friendly line when `env.saving` is false.

4. **AC126 keeps the wrong 200 sums.** `src/learning/generated-items.ts` lines 13 to 19 and 52 to 61 use the due day as age. A sum that has climbed to box 5 is due far in the future, so it counts as "newest" and is kept, while sums answered wrong last week (box 1, due soon) are dropped first. That is the opposite of "only the 200 newest are kept". `break-flow.ts` lines 381 to 386 only protect the one sum just saved. The unit test at `break-flow.test.ts` lines 268 to 284 does not catch it, because all 200 seeded sums are due in 2020. Fix now, before real saves pile up on the iPad: add an optional `added: number` (ms) to `ProgressRecord` (`src/storage/progress-store.ts` line 4), set it in `saveBox` as `old?.added ?? ts` so it never changes after the first save, sort `savedSums` by `added` with records without it treated as oldest, and drop the "keep the one just saved" workaround (pass all records with cap 200). Test: 200 saved sums in box 5 due in 2027, then 5 new wrong sums: the 5 new ones stay and the 5 with the smallest `added` go.

### Later

* **Parent end while a break is loading is lost.** `break-flow.ts` line 469 calls `run?.screen?.parentEnd()`, and `run` is null until `openRun` resolves. Remember a pending parent end and apply it once the screen mounts. Also, a parent end on the summary logs the break as `stopped` (`break-session.ts` line 252 and `break-flow.ts` line 400) although every question was done. Treat the summary as complete. M4 needs a clear route from the parent area to `breakFlow.parentEnd()`; give it through `AppEnv` or a small `breaks` handle, not through a hook.
* **A resumed break that was already done is not destroyed.** `break-flow.ts` lines 192 to 194 call `finishRun` before `run` is set, so `leave()` (line 428) cannot destroy its screen. Small leak of tap listeners. Destroy the screen in `finishRun` directly.
* **A failed catalog load gives a free full timer.** `break-flow.ts` lines 456 to 459. Until T22 precaches the lazy `taal` chunk, a flaky network at break time skips every break. Fine for now; T22 must list the chunk, and the e2e for offline should start a break.
* **AC37 test does not check points.** `tests/e2e/break.spec.ts` lines 107 to 130: add an assert that `points` after the kill equals the points before it ("the points so far are kept").
* **Pause menu points go stale.** `src/ui/pause-menu.ts` lines 74 to 77 read the points once on open. After a purchase or an Extra oefenen round the menu below still shows the old total. Re-read when the screen on top of it closes (subscribe to `screens`).
* **`main.ts` growth.** 204 lines, of which lines 136 to 204 are e2e hooks (M1 later item, still open). Move them to `src/dev/app-hooks.ts` taking the `AppEnv` and the game. Do it in T43b if it stays small, otherwise right after M3.
* **M1 later items still open:** `queue.commit` (superseded by the session writer and `purchase.ts` above; keep `economy` out of the save queue, and keep the egg first order from item 3 so a queued `dinos` write is never stale), AC137 never overwrite an unreadable record (now also `dino-system.ts` line 256: a broken dinos record starts empty and the next hatch overwrites it), `db.onversionchange`, input reset on pause. Plan them in M5 (T61) or earlier.
* **Two breaks can stack.** `break-flow.ts` `start()` does not look at `screens.depth()`, so a boot resume can open a break over an open pause menu. Harmless today (the world stays paused), but keep it in mind when the PIN screen arrives in M4: the break must open under the PIN screen, or after it.
* **Nits.** `.screen-layer` CSS lives in `src/styles/countdown.css` line 30, and `.break-stub` styles are left over there. Move them to a `screens.css`. The main chunk is 656 KB (three.js plus all learn UI); lazy load the learn screens when the bundle gets near the budget.

No founder decisions come from this review. For the iPad check at M2: play three or four breaks in a row with sound on and listen that the chime and hmm still play in the last one (this is item 1).

## M3 milestone review

Architect, 2026-10-17. Diff `553c0fe..HEAD` (T38b, T43b, T43c, T45, T46, T47; T25, T26, T42 were already in). Checked against ARCHITECTURE, PLAN (with the operator notes), decisions 45 to 49 and AC16 to AC21, AC23, AC51, AC52, AC110, AC111, AC120, AC149, AC150, AC152.

Run here: `npm run lint` clean, `npm run typecheck` clean, `npm test` 91 files and 788 tests pass, `npm run build` OK (main chunk 666 KB, warning only), `npm run test:dist` OK (903 KB). WebKit e2e not run here (CI only).

What is good: the M2 must fix items are all done and done well. `commitStep` writes one learning step in one transaction, `AppEnv` replaced the globals, there is one Sound, and sums age by `added`. The purchase writes economy, dinos and ledger in one transaction, and the hatch case is safe: the dinos record is read inside the transaction, so it always holds the latest hatch, and a queue flush that read its copy earlier also opened its transaction earlier and commits first. The save queue never writes `economy`, `session` or `rotation`. Extra oefenen never touches the `session` record (`practice-flow.ts` line 170 and a unit test), so the boot can not resume it as a break. The shop is kid safe: no link, no money words, prices in "punten", a clear "Compy kopen voor 20 punten?" with big Ja and Nee, the box is gone after the first Ja, and the cards are grey with a friendly line when saving is off. No `innerHTML` or links anywhere in `src`. Dino names go to a canvas sprite, not to HTML. The operator wiring in `game.ts` (onRename, onHug) is right: rename goes through the store, so the save queue picks it up, and the hug uses the shared Sound.

### Must fix

1. **A failed purchase can still leave a free egg on disk.** `src/app/purchase.ts` lines 46 to 66, with `src/storage/save-queue.ts` lines 39 to 60. The egg goes into the store first (right for the success case, decision 48). But while the purchase transaction is in flight, a save queue flush can run (a timer that was already pending, or `pagehide` when the kid presses the home button right after Ja). That flush reads `dinos` with the new egg and opens its own `kv` transaction, which waits behind the purchase. If the purchase then aborts (points changed, or a storage error such as a full iPad), the egg is removed in memory, but the queued flush still commits the dinos record with the egg. Until the next flush about 1 second later, the saved game has the egg and the points. A kill in that window gives a free egg. Decision 48 and AC150 say this can never happen. The same gap will hit the golden egg (T51a) and the backup restore in M4. Fix: give the save queue a small exclusive section, for example `hold<T>(fn: () => Promise<T>): Promise<T>`, that runs `fn` on the queue's own `chain`, so no flush reads a snapshot while `fn` runs, and flushes asked for meanwhile run after it. Pass `env.queue` into `PurchaseDeps` and run the whole of `buyNow` (addEgg, transaction, removeEgg on failure) inside `queue.hold`. This also replaces the `queues` WeakMap in `purchase.ts` line 34. Test (fake-indexeddb): register `dinos` on a real queue, start a purchase whose commit fails (lower the stored points first), call `flushNow()` while it is in flight, then read the stored `dinos` record: no egg, points unchanged, no ledger line. Update decision 48 with one line about the hold.

2. **The dino menu, the naming screen and the block grid do not stop the play timer (AC23).** `src/game/game.ts` lines 124, 199 to 210 and 166: opening them only sets `menuOpen` and stops the render loop. The timer driver looks only at `screens.current()` (`src/app/timer-driver.ts` line 97), and these three never open a screen. So the countdown keeps running while the kid types a dino name, and a break can pop up on top of the name keyboard. PRD 4.4 and AC23 list all three as stopping the timer, and T45 lists AC23 as done. The e2e at `tests/e2e/dino-menu.spec.ts` line 72 checks `gameRunning` (the render loop) with the comment "the menu stops the timer", so it does not test AC23. Fix: add a `screens` (or an `onOverlay(open: boolean)`) option to `createGame`; on dino menu open and block grid open call `screens.open('kid-overlay')` without a node, and call the returned close on close (also when the naming screen closes the menu). In `src/app/screens.ts` keep the layer hidden when no open screen has a node (`layer.hidden = !stack.some((e) => e.node)`), otherwise the empty full screen layer (z-index 500) eats the taps meant for the menu. `main.ts` passes `screens` to `createGame` (one line; do it before T48b, which also edits `main.ts` and `screens.ts`). Tests: in `dino-menu.spec.ts` assert `timerCounting` is false with the menu open, with the name screen open, and true again after closing; same for the block grid in its spec; a unit test in `screens.test.ts` that a node less screen keeps the layer hidden.

### Later

Before or inside M4 (these will hurt if left):
* **Resumed break rewrites old points.** `src/app/break-flow.ts` resume path (around line 160): a resumed break writes `state.economy` from the saved session, absolute, at its next step. Between `finishBoot('saving')` and the break mounting (play timer start plus the lazy `taal` catalog load) the shop is already open for business, so a very fast purchase there gets its points back at the next break step. Fix: when resuming, set `r.meta.state.economy` from the stored `economy` record. This is safe because every step commits session and economy together, so the stored one is the truth.
* **Golden egg (T51a) must use the purchase pattern.** Add the golden egg to `env.dinos` and commit the dinos record in the same transaction as the exam result and the session clear, inside `queue.hold` (must fix 1). Do not use the module global `addEgg` in `src/dinos/dino-store.ts` lines 194 to 218: without a running game its `pending` list lives only in memory and a reload loses the egg. Once T51a is done, delete `setActiveDinoStore`, `getActiveDinoStore`, `addEgg` and `pending`, so `env.dinos` is the only route. AC111 is already right in the core (`shopDinoCount` leaves golden dinos out); keep a test for it in the exam task.
* **Backup terugzetten and Alles wissen (T56, T57).** The save queue keeps readers of the in memory world, player, dinos, timers and stats. A flush after a restore would write the old game over the restored data. Run the restore inside `queue.hold`, call `simulateKill` style stop on the queue (make a real `stop()`), write everything in one transaction, then reload the page. Clear the `session` record in the same transaction. `dino-store.ts` `load` only trims names to 12; a backup file can hold any characters, so filter names to the kid keyboard set on load (AC18).
* **Parent end while a break is loading is still lost** (M2 later item). `break-flow.ts` line 327 calls `run?.screen?.parentEnd()`, and `run` is null while the break loads. T55 needs this to work. Remember a pending parent end and apply it on mount.
* **Breaks can still stack over other screens** (M2 later item). With the PIN screen (T48b) the break must open under it or after it. Decide in T48b and test it.
* **Pause menu points via `document.querySelector`.** `src/app/shop-flow.ts` lines 22 to 29 and `src/app/practice-flow.ts` lines 47 to 56 write into the pause menu DOM. Give the pause menu a `refreshPoints()` that runs when the screen on top of it closes (`screens.subscribe`). The parent area will change points too (reset paths), so do it before T49.

Small:
* `NAME_MAX` is defined twice: `src/ui/name-screen.ts` line 8 and `src/dinos/dino-store.ts` line 11. Import the store's one.
* Hug hearts start at the full grown height (`game.ts` onHug uses `DINO_KINDS[kind].size.h`), so on a baby they float high above. Use the same height as the name tag (`dinoHeight(kind) * growthScale(growth)`).
* `src/main.ts` line 193 has two statements on one line (`startBreak` and `savedSession` hooks). The M2 item to move the e2e hooks to `src/dev/app-hooks.ts` is still open; `main.ts` is the file T48b, T52 and T22 all edit.
* The shared break summary says "Terug naar de wereld" in Extra oefenen, where it goes back to the pause menu (operator note). Pass the label in.
* Main chunk 666 KB. Fine offline after the first visit, but lazy load the learn screens if `test:dist` gets near its budget.

No founder decisions come from this review. iPad check for M3: buy an egg and press the home button right after Ja, reopen, and check the egg and the points; then open the dino menu with 10 seconds left on the countdown and watch that it stops (it does not today, must fix 2).

## PRD change of 2026-10-18 (product)

Product, 2026-10-18. The founder put the change requests from the side branch in v1 (decisions 50 to 52). Folded into `docs/PRD.md` as F16 to F18. Status set back to DRAFT; the founder signs again.
* Changed: summary, 4.0, 4.1 (64 high world, 32 blocks, all solid, nothing flows or burns), 4.2 (button layout, flying, camera arrows, block grid with slot chooser), 4.3 (trait lines, size chips, progress bars, Mijn dino's tab, chickens at 5 points, max 10), 4.4 timer matrix, 4.5, 4.7 (shared cap, partial plus), 4.15, 4.16 ("zelf gestart"), 4.17, 4.18 (older saves), new 4.20 (obsidiaan gate) and 4.21 (Nu oefenen), section 5, flows 11 and 12, sections 8 to 11.
* Updated ACs: AC1, AC7, AC23, AC101, AC143, AC151. New ACs: AC155 to AC181. AC20, AC110, AC149 and AC150 are unchanged.
* Kept: the small grey lock icon, not a labelled "Ouders" button. The default hotbar. No "3 kippen" button.
* Not reviewed by architect or qa yet. The architect should check the T32 spike plan with the 64 high world.
