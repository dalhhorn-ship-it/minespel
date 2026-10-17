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
