# PRD: Dino Blokwereld (working title)

Status: READY FOR SIGNOFF

First approved by the founder on 2026-10-17. Recut on 2026-10-19 by decision 57: the live build is v1 (0.1.0), and everything not built yet moved to small releases in section 5. The recut changes the PRD, so the founder approves it again. On 2026-10-19 the founder picked v2 Gouden ei as the next release (decision 59). Its section is in 12. This signoff covers the recut and v2.

This signoff adds the Winkel button and the Pauze fix to v2 (decision 73, see also 72).

## 1. Summary
Dino Blokwereld is a small 3D block world on the iPad where a kid explores, mines and builds with Minecraft style blocks. Every few minutes the game pauses for a short learning break in Rekenen or Taal. Right answers earn dino points. In the Dinowinkel the kid buys dino eggs with those points, and the eggs hatch into friendly blocky dinos that walk around in the world. A passed practice exam gives a golden dino.

The parent decides what gets asked, can write their own lessons and questions, starts practice exams and follows progress. Everything stays on the iPad.

## 2. Users
* **Player:** one kid, age 8 to 10 (groep 5 to 7), plays alone. Reads Dutch at about groep 5 level.
* **Parent:** sets up the app, picks the learning content, writes own modules, starts exams, reads the results. Uses the same iPad, behind a parent gate.
* **Language:** all text in Dutch, for kid and parent screens.
* **Device:** iPad in Safari, added to the home screen. Touch only. Reference device: an iPad from 2018 or newer on iPadOS 16 or newer (F10).
* **Orientation:** landscape only, for both the game and the parent area. In portrait the app shows a big "Draai je iPad" picture and nothing else. iOS ignores the manifest orientation, so this message is the only mechanism.

## 3. Goals and success
The founder will feel it worked when:
1. The kid asks to play again the next day, on most days of the first two weeks.
2. The kid finishes at least 4 out of 5 learning breaks without a parent having to step in.
3. After 4 weeks the parent screen shows the percentage right going up for at least half of the topics the kid practised.
4. The parent can add a new set of questions (for example this week's spelling words) in under 10 minutes, without help.
5. The parent opens the results screen at least once a week because it is useful, not because they have to.
6. The kid saves up for a dino on their own and talks about which egg to buy next.
7. The game feels smooth on the family iPad: no stutter while walking, no lost saves.

## 4. Scope for v1 (0.1.0, the live build)

### 4.0 What v1 is (decision 57)
v1 is the build that runs today on `main` and on the Cloudflare Worker `minespel`. It ships as version 0.1.0. Decision 57 replaces F1 ("everything ships together"). Features that are not built yet moved to small releases in section 5. Their text stays below so nothing is lost. Each moved part is marked "Moved to vN (see section 5)".

**v1 holds:**
* The block world: fixed seed, 64 x 64 wide and 64 high, 32 free building blocks, the obsidiaan gate with vuur, and lava.
* Touch controls: stick, look, jump, Hakken and Bouwen, hotbar, Alle blokken, Omhoog and Omlaag with floating, camera arrows, Ik zit vast.
* The countdown and learning breaks with retry, teach moment, summary and points. Nu oefenen starts a break early.
* Spaced repetition, lessons, Lesboek and Extra oefenen (with Stoppen).
* Both built in modules: Taal Taalverzorging and Rekenen basis, without their exams.
* Dino points, the Dinowinkel, eggs, dinos with their menu, and chickens.
* The parent gate: pincode, lockout, PIN vergeten, a grown up question before the first pincode.
* Inhoud kiezen: the content tree, levels, presets and Vakverdeling.
* Instellingen core: interval, questions per break, new lessons, warning, Groter lettertype, sound on or off, Pincode wijzigen, Pauze nu starten, Pauze nu beëindigen, Wereld opnieuw beginnen.
* Saving core: eager small saves, safe writes, save versions.
* App basics: home screen icons and manifest, "Draai je iPad", "Maak dit venster groter", 3D view rebuild, hosting on `workers.dev`, the fps counter.
* Resultaten shows only a simple list of the last 20 breaks with the "snel geklikt" mark. The full results views come in v6.

**Where each subsection stands:**

| Subsection | Status |
|---|---|
| 4.1 The world | v1 |
| 4.2 Moving and building | v1 |
| 4.3 Dinos, points, Dinowinkel | v1. The golden dino moved to v2. |
| 4.4 Timers | v1. The exam timer moved to v2. |
| 4.5 Learning break | v1 |
| 4.6 Spaced repetition | v1. Exam answers moving boxes come with v2. |
| 4.7 Lessons and practice | v1 |
| 4.8 Answer types | v1 |
| 4.9 Taal module | v1. The four exams moved to v2. The human content check moved to v5. |
| 4.10 Rekenen module | v1. The four Rekentoets exams moved to v2. |
| 4.11 Exams | Moved to v2 |
| 4.12 Parent gate | v1. The full automated route test moved to v5. |
| 4.13 Inhoud kiezen | v1. The "geen vragen" warning in the parent area moved to v4. |
| 4.14 Eigen modules | Moved to v7. Own exams and the 10 000 item list moved to v8. |
| 4.15 Import, export, backup | Backup moved to v3. Module import and export moved to v8. |
| 4.16 Resultaten | Moved to v6 (v1 has the simple break list only) |
| 4.17 Instellingen | v1 core. Volume, Alles wissen and the app version moved to v3. |
| 4.18 Saving | v1 core. Broken save screen, storage notes and persistent storage moved to v4. |
| 4.19 App basics | v1 core. Offline, one window, plain http notes and the first start flow moved to v4. |

**v1 changes since the 2026-10-17 PRD.** These founder decisions and requests are built and live. Where the text in 4.1 to 4.19 says something else, this list wins.
* **Sky height 64** (decision 44). The world is 64 blocks high, not 32.
* **32 building blocks** (founder request CR1, see `docs/STATUS.md`). The 16 blocks from 4.1 plus obsidiaan, vuur, lava, mossteen, zandsteen, graniet, marmer, basalt, diepsteen, vuursteen, goudsteen, diamant, water, ijs, sneeuw and wol oranje. All free and unlimited. Alle blokken has category filters and a row to pick which of the 8 slots to fill. Water, vuur and lava are blocks only. They never hurt the player (there is no health).
* **Obsidiaan gate** (CR2) and **lava** (CR4). Four obsidiaan blocks lie in front of the start spot, with steen and vuursteen beside them. Building obsidiaan up on the left and right and placing vuur lights the gate. The start hotbar holds obsidiaan, vuur and lava.
* **Floating** (decision 47). Omhoog lifts the player into the sky. On release the player stays floating and can walk and build in the air. Omlaag goes down. Touching the ground ends floating. This replaces "No flying in v1" in 4.2.
* **Camera arrows** (decision 44). Four buttons ▲ ▼ ◀ ▶ turn the view smoothly, next to the look drag.
* **Nu oefenen** (decisions 48 and 56). A button on the countdown, in Extra oefenen, in the Lesboek and in the Dinowinkel starts a learning break right away. Its plus points (+2, +1, +3 bonus) share the 10 extra points a day with Extra oefenen. A plus that does not fit gives the part that fits. No malus. A break that starts from the timer keeps full points and the malus.
* **Stoppen in Extra oefenen** (decision 51). Every Extra oefenen question has a Stoppen button. Points earned so far stay. Learning breaks still cannot be stopped by the kid.
* **Chickens** (decision 55). The Kippenhok in the Dinowinkel sells one chicken at a time for 5 points, bought with Ja or Nee like an egg, points and chicken saved together. At most 10 chickens. They do not count toward the 12 dinos.
* **Shop layout** (decision 49, `docs/SHOP_PRD.md`). Species cards, progress bars toward the price, the herd counter and the "Mijn Dino-verzameling" list.
* **First pincode** (decision 52). Before the first pincode can be set, a grown up sum in words must be answered, like PIN vergeten. A kid tapping the lock cannot set it. The first start flow in 4.19 is not built. The founder kept it as a new task in v4 (decision 60).
* **Lock only in the world** (decision 53). A small grey lock shows in the world only. No lock on break, exam or overlay screens. No labelled "Ouders" button. This replaces "on every kid screen" in 4.12. From v2 the same small lock also shows on the exam screen, only to stop the exam (decision 61). Learning breaks stay without a lock.
* **Home screen first** (decision 54). The design floor is the home screen app at 1024 x 768. In a Safari tab (about 690 high) tall kid screens may scroll inside their card.

### 4.1 The world
**Status: v1.** With the changes in 4.0: 64 high, 32 blocks, the obsidiaan gate.
* One fixed world of 64 x 64 blocks wide and 32 blocks high, the same for every new game (fixed seed). Gentle hills, grass, sand patches, trees, stone underneath. No caves, no water in v1. If the first milestone spike shows this is too slow on the reference iPad, the world shrinks to 48 x 48.
* Invisible walls at the edges, softened with fog. The bottom layer is unbreakable `oersteen`. The player cannot fall out of the world.
* Always daytime. No weather.
* **Building blocks (16), all free from the start, unlimited (F5):** gras, aarde, steen, keisteen, zand, boomstam, planken, bladeren, glas, baksteen, and wol in wit, rood, geel, blauw, groen and paars. The kid never has to earn, collect or count blocks.
* **Oersteen:** bottom layer only, cannot be mined or placed.
* Mining a block removes it from the world. Nothing is collected, because every block is always free.
* No crafting, no tools, no health, no hunger, no damage, no enemies, no death.

### 4.2 Moving and building (touch)
**Status: v1.** With floating, Omhoog, Omlaag and the camera arrows from 4.0.
* First person view.
* Left thumb stick (bottom left) to walk. Drag anywhere on the right half to look around. A jump button bottom right.
* A mode switch with two big buttons: **Hakken** (mine) and **Bouwen** (build).
* **Tap or drag:** a touch that moves less than 10 points and lasts less than 300 ms is a tap. Any other touch on the right half is a look drag and never mines or places. A touch that starts on a button, the stick or the hotbar never starts a look drag. Long press in the world does nothing in v1.
* **What a tap hits:** the nearest thing under the finger. A dino or an egg comes before a block.
* Tap a block within 6 blocks reach:
  * In Hakken mode the block breaks right away with a small pop of pixel bits.
  * In Bouwen mode the selected block is placed against the tapped face, unless it would end up inside the player, a dino or an egg.
* **Building up:** in Bouwen mode, tapping the top face of the block the player stands on places a block there and lifts the player one block up onto it, if there is room above the head. This is how the kid climbs without fiddly timing. No flying in v1.
* **Hotbar:** 8 big slots along the bottom, filled at the start with gras, aarde, steen, planken, boomstam, glas, baksteen and wol rood. Tap a slot to select it. A ninth button, **Alle blokken**, opens a grid with all 16 blocks. Tapping a block there puts it in the selected slot and closes the grid. The hotbar is saved. There are no counts.
* Walking and looking work with two fingers at the same time (stick plus look).
* **Ik zit vast:** a button in the pause menu moves the player to the start spot. Dinos set to Volg mij come along. Nothing else changes.

### 4.3 Dinos, dino points and the Dinowinkel (F5, F7)
**Status: v1**, with chickens (4.0). The Gouden dino bullet is moved to v2 (see section 5).
All dinos are earned through learning. There are no wild dinos and no taming.

* **Dino kinds:** four kinds, made of boxes, cute and Minecraft style, with big eyes:

| Dino | Size | Price |
|---|---|---|
| Compy (Compsognathus) | klein | 20 punten |
| Triceratops | middel | 40 punten |
| Stegosaurus | middel | 40 punten |
| Brachiosaurus (langnek) | groot | 80 punten |

* **Dino points** are earned in learning breaks and Extra oefenen (see 4.5 and 4.7). The total is always shown in the pause menu and the Dinowinkel. The total never goes below 0.
* **Dinowinkel:** opened from the pause menu. It shows the four eggs with a picture of the dino, its name, its size and its price, and the kid's point total. The play timer stops while it is open.
  * An egg the kid can afford has a big "Kopen" button. Tapping it asks "Koop dit ei voor 40 punten?" with "Ja" and "Nee".
  * An egg the kid cannot afford is greyed out and says "Nog 12 punten nodig".
  * When the kid has 12 dinos (eggs that have not hatched yet count too), every Kopen button is greyed out and the shop says "Je hebt al 12 dino's! Wat een kudde."
  * The shop uses only dino points. There is no real money, no payment screen and no link anywhere.
* **Eggs:** after buying, the kid goes back to the world and the egg appears on the ground next to the player. It wobbles and hatches after 5 seconds of play into a baby sized version of that dino, which then grows to full size in 2 seconds. The new dino starts on **Volg mij**. A bought egg is saved right away, so closing the app never loses the egg or the points.
* **Dino menu:** tapping a dino opens a small menu: **Volg mij**, **Blijf hier**, **Naam geven** (kid types a name with the in game keyboard, max 12 characters), **Knuffel** (hearts, no cost). The name screen says "Bedenk een leuke dinonaam" so the kid does not type their own name.
* **Simple on purpose:** dinos walk straight toward their goal and can hop up one block. They never walk into or through any block. No path finding. A dino on Blijf hier idles and wanders a little within 3 blocks of where it was told to stay. A dino the kid walls in stays there (building a pen is fine). Dinos never hurt the kid and never break or place blocks.
* **Following:** a dino on Volg mij walks toward the player. A following dino that is stuck for more than 5 seconds, or more than 8 blocks away for more than 5 seconds, pops next to the player with a little puff.
* **At most 12 dinos** bought in the shop (hatched or still an egg).
* **Gouden dino (moved to v2, see section 5):** passing a practice exam gives a golden egg. When the kid is back in the world, the egg appears next to the player and hatches like a normal egg into a golden version of a random dino kind (same model, gold colour). Golden dinos do not count toward the 12 (F7), so a passed exam always pays. Golden dinos have the same menu as other dinos.
* Dinos are never taken away. No wrong answer, malus or reset removes a dino or an egg.

### 4.4 Timers
**Status: v1**, with Nu oefenen (4.0). The exam timer column is moved to v2 (see section 5).
* A countdown is always visible at the top of the screen during play: "Leerpauze over 4:12".
* All timers are time based (real clock), not frame based.
* In the last 30 seconds the countdown grows and pulses. In the last 10 seconds a soft tick plays (if sound is on).
* At zero the game saves, pauses and opens the learning break. There is no skip button.
* A learning break has no time limit (F2). It ends when all its questions are done.
* The remaining play and exam time is saved. Closing and reopening the app does not reset it.

**Timer matrix.** Which timer runs where:

| Situation | Play timer | Exam timer |
|---|---|---|
| World on screen, app visible | runs | |
| Pause menu, Dinowinkel, Lesboek, Extra oefenen, dino menu, block grid, name keyboard | stops | |
| Learning break, including lessons, teach moments and summary | stops | |
| Exam, including its end screen and review | stops | runs until the last answer |
| Parent gate or parent area open | stops | stops |
| Portrait ("Draai je iPad") or window too small | stops | stops |
| App in background, screen locked, Control Center, app closed | stops | stops |

* Background is detected with `visibilitychange`, `pagehide` and `blur`. As a safety net, a heartbeat ticks every second; if more than 5 seconds pass between two ticks, that gap is not counted.

### 4.5 The learning break (F2, F6)
**Status: v1.** Breaks started with Nu oefenen follow the point rule in 4.0.
* A calm full screen with a dino teacher character ("Dino Juf") and a progress row of dots, one per question. There is no break countdown.
* Each break uses one module. Modules take turns by smooth weighted round robin on the parent's Vakverdeling weights (default: equal turns for Rekenen and Taal). The turn state is saved across restarts. A module with no usable items is skipped and the turn goes to the next module.
* If a topic is new for the kid, the break starts with that topic's lesson (see 4.7), then the questions.
* **Each question goes like this:**
  1. The kid answers. **Right on the first try:** a green check, a happy sound, "+2 punten". The kid taps "Verder".
  2. **Wrong on the first try:** a soft orange cross and "Net niet. Probeer het nog een keer." The right answer is not shown. The same question shows again, cleared, and the kid answers once more.
  3. **Right on the retry:** a green check, "Goed zo! +1 punt". The kid taps "Verder".
  4. **Wrong on the retry:** a **teach moment**. The screen shows "Zo zit het:" with the right answer, the item's `explain` text, and a short piece of teaching:
     * For a Taal item or a parent made item: one page of the topic's lesson. If a lesson page is linked to the item's skill, that page shows; otherwise the first page of the topic lesson. The architect adds an optional `skill` field to lesson pages for this.
     * For a Rekenen item: a worked example of this exact sum, step by step, using the topic's strategy (for example 7 x 8 = 7 x 4 + 7 x 4 = 28 + 28 = 56).
     * Below it: "-1 punt" in soft grey, never in red. The kid taps "Ik snap het" and the break moves on to the next question.
* **Points (F5, F6):**

| What happens | Points |
|---|---|
| Right on the first try | +2 |
| Right on the retry | +1 |
| Teach moment (wrong twice) | -1 (malus) |
| Every question of the break right on the first try | +3 bonus |

  * The total never goes below 0. A malus on a total of 0 leaves it at 0.
  * A break with 0 right answers (no right on the first try and none on the retry) gives no plus points.
* Only the first tap or Klaar of each try counts. A double tap or two fingers on two buttons in the same moment count as one answer. "Verder", "Ik snap het", "Klaar" and "Terug naar de wereld" also act once.
* **The break ends only when every question is done** (right on the first try, right on the retry, or after a teach moment). Nothing else ends it, except the parent with "Pauze nu beëindigen". Questions not done when the parent ends a break are logged as "niet beantwoord". They give no points, no malus and do not change the spaced repetition boxes.
* **Summary screen:** the score ("4 van de 5 goed!", counting right on the first try or the retry), the points earned in this break and the new total. When the kid can now afford an egg, it adds "Je kunt een ei kopen in de Dinowinkel!".
  * With 0 right: a kind message ("Dit was lastig. Volgende keer gaat het vast beter!") and the total, with no plus points.
* After the summary the kid taps "Terug naar de wereld" and play resumes with a full play timer.
* If the app is closed during a break, reopening it continues the same break at the same question and the same try (first try, retry or teach moment), with the same questions.

### 4.6 Choosing the questions (spaced repetition)
**Status: v1.** The exam rule in the last paragraph comes with v2.
Every item has a box from 0 to 5. Box 0 means never seen.

| Box | Next due |
|---|---|
| 1 | the next break of that module (never again in the same break) |
| 2 | from tomorrow |
| 3 | from 3 days later |
| 4 | from 7 days later |
| 5 | from 21 days later |

* **Days are calendar days in the iPad's local time.** "From tomorrow" means from 00:00 tomorrow. A kid who plays at 19:00 and again at 8:00 the next morning gets box 2 items back.
* If the iPad clock goes back, stored due dates do not move. An item that was due stays due.
* **Only the first try counts for the boxes.** Right on the first try: box goes up by 1 (from 0 it goes to 2, the maximum is 5). Wrong on the first try: box goes to 1, also when the retry is right and also after a teach moment.
* An item counts as **beheerst** (mastered) at box 4 or 5.

For a break with N questions from module M, only items that the parent has switched on (module, topic, skill and level) are used:
1. **Review slots:** up to half of N, rounded up, are due items. Box 1 items first, then other due items, the oldest due date first.
2. **New slots:** the rest are new items (box 0) from one topic. Topics take turns: a saved pointer per module moves to the next switched on topic in teaching order after every break that used new slots, skipping topics with no new items left. Generated Rekenen topics (optellen, aftrekken) always have new items. Within the topic, items come from the easiest switched on level that still has new items, in random order.
3. If there are not enough new items, the remaining slots are filled with more due items, then with the not yet due items with the lowest box.
4. If "Nieuwe lessen" is off in settings, step 2 is skipped.
5. The question order inside the break is mixed. No question appears twice in one break, apart from its own retry.
6. If no module has usable items, the break shows a friendly message for the parent ("Er staan geen vragen aan. Vraag papa of mama om vragen te kiezen.") and ends after 10 seconds with no points and no malus. The parent area shows a warning about this.

Answers in exams and in Extra oefenen also move the boxes the same way. Exams ignore the parent's switches (see 4.11). In an exam there is only one try.

### 4.7 Lessons and practice
**Status: v1**, with Stoppen in Extra oefenen (4.0).
* Every topic has a lesson: a few short pages with a title, a short text, good and wrong examples, and a tip. The kid swipes or taps "Volgende" through them. The last page has "Ik snap het!".
* A lesson shows automatically in a break the first time new items of that topic are asked.
* **Lesboek:** from the pause menu the kid can open any lesson of any switched on topic at any time. Reading the Lesboek does not change the timers or the points.
* **Extra oefenen:** from the pause menu the kid can start a practice round of N questions from a module of their choice, picked with the same rules as 4.6. Each question works like in a break: retry, teach moment and the same points, but no malus (F14). Extra oefenen earns at most 10 plus points a calendar day (F6). After that the round still works but earns no plus points, and the kid sees "Genoeg geoefend voor vandaag, ga lekker bouwen!". The +3 bonus does not apply in Extra oefenen. It stops the play timer while open and does not reset it, so it never replaces a learning break.

### 4.8 Answer types and input
**Status: v1.**
All four item types from `docs/modules/README.md` are supported: `choice`, `find-error`, `type` and `punctuate`.
* `choice`: 2 to 4 big answer buttons.
* `find-error`: the sentence is shown as big tappable words, plus a "Geen fout" button. If the kid taps the wrong word correctly, the correction is shown as feedback. The kid does not have to type the correction in v1.
* `punctuate`: the sentence with tappable gaps between the words. Tapping a gap toggles the mark. A "Klaar" button checks the answer. All right gaps and no wrong gaps are needed for a right answer. The mark is a comma in v1, for built in and parent made content.
* `type`: the app's own on screen keyboard, never the iPad keyboard, so autocorrect and word suggestions cannot give away the spelling. Letters a to z, a shift key for capitals, a row with é, è, ë, ï, ö, ü, ', - and space, backspace and "Klaar". The check trims spaces at the start and end and is case sensitive. One tap types one character.
* **Rekenen answers** use a big number pad with digits 0 to 9, a comma key and backspace. There is no dot key. The check: trim spaces, turn a comma into a dot, then compare as numbers. "3,5", "3,50" and "03,5" are right for 3.5. Empty, "3," and ",5" without a digit before it are not accepted as an answer (the Klaar button stays grey). Decimal sums are computed in whole tenths, so there are no rounding errors.
* Numbers of 1000 and up are shown with a thin space as thousands separator ("10 000"), never with a dot.
* On a retry the input is cleared, so the kid starts fresh.

### 4.9 Built in module: Taal, Taalverzorging (Cito en IEP stijl)
**Status: v1.** The four practice exams are moved to v2 and the human check to v5 (see section 5). The content checks in `validate.py` are done.
* The module in `docs/modules/cito-taalverzorging/`, as written there. Ten topics in this teaching order: ww-tegenwoordig, ww-verleden, klanken, woordvormen, leenwoorden, trema-koppelteken, hoofdletters, komma, apostrof, leestekens.
* Levels M6, E6, M7 and E7. Every topic has a lesson and at least 6 items per level.
* Four practice exams: Oefenexamen M6, E6, M7 and E7, as defined in its `module.json`.
* All items are original, written in Cito and IEP style. No real test items are copied (decision 7).
* `python3 docs/modules/validate.py docs/modules/cito-taalverzorging` prints OK today. `./scripts/check.sh` runs `validate.py` on every module folder in `docs/modules/`, so it stays OK.
* **Content checks** added to `validate.py`: no `choice` item has two equal options, no two items in a module share the same prompt and sentence, every `type` item has at least one accepted answer, no sentence longer than 15 words at M6 and E6 or 20 words at M7 and E7. Items that fail are fixed before release.
* **Human check:** QA reads 5 items per topic against woordenlijst.org, and the founder (or a teacher) reads a sample of 20 items, also looking for commas that are optional in Dutch. The result goes in `docs/TEST_REPORT.md`.

### 4.10 Built in module: Rekenen basis (modest, generated) (F11)
**Status: v1.** The four Rekentoets exams are moved to v2 (see section 5). The Rekentoets definitions already exist in the module.
A small module where the questions are made by the app, so there are always new sums. All answers are typed with the number pad. It uses the same levels as Taal so the parent can pick one groep for both.

| Topic | Skill | M6 | E6 | M7 | E7 |
|---|---|---|---|---|---|
| optellen | plus sums | up to 100, with crossing the ten | up to 1000 | up to 10 000 | numbers with one decimal, up to 100 |
| aftrekken | minus sums | up to 100, with crossing the ten | up to 1000 | up to 10 000 | numbers with one decimal, up to 100 |
| tafels | keer sums | tafels 1 to 5 and 10 | tafels 6 to 9 | tens times a table (30 x 7) | two digits times one digit (34 x 6) |
| delen | deel sums | tafels 1 to 5 and 10 backwards | tafels 6 to 9 backwards | tens (210 : 7) | up to 3 digits by one digit, no remainder |

* The module format gets a `generator` field for built in code modules. Items are made at run time, and progress is stored by item id like any other module. Parent made modules never use it.
* Skills inside a topic match the rows above plus, for tafels and delen, one skill per tafel (`tafel-7`, `deel-7`), so the parent can switch single tables on and off.
* No answer is ever negative. Every division has a whole answer.
* Each topic has a short lesson (2 to 4 pages) with a smart strategy: splitsen, rijgen, tafeltrucs, delen als omgekeerd keer.
* The generator also makes an `explain` text and a worked example for every sum, using the topic's strategy, for the teach moment (4.5).
* Table and division facts are a fixed set (each fact has its own id, like `tafels:7x8`), so they follow the boxes in 4.6 exactly.
* For plus and minus sums there are too many to track one by one. A sum the kid got wrong on the first try is saved as its own item in box 1 and follows the boxes from there, also after it is answered right. It is never offered as a new sum again. At most the 200 newest saved sums per topic are kept.
* No question repeats inside one break or exam. The generator takes a seed, so a failing test can be replayed.
* Four practice exams: Rekentoets M6, E6, M7 and E7. Each has 20 questions, 20 minutes, pass at 70 percent, equal mix of the four topics, from that level only.
* The parent can see this module in the content tree and the results like any other, but cannot edit or copy it. Lesson texts are written during the build and can be read in the Lesboek.

### 4.11 Exams (parent started) (F8)
**Status: Moved to v2 (see section 5).** The Examens section in the parent area is a placeholder in v1.
* The parent starts an exam from the parent area: pick a module, pick one of its exams. The app checks there are enough items and warns if not ("Te weinig vragen voor dit examen, het examen krijgt er 22 in plaats van 30").
* An exam cannot start while a learning break is running. The parent sees "Beëindig eerst de pauze".
* Questions are picked per topic by the `mix` weights, from items at the exam `levels`. Parent switches for topics and skills are ignored in an exam, so the exam always matches its blueprint.
* The kid sees a calm exam screen: question number ("Vraag 7 van 30"), the time left if there is a time limit, no right or wrong feedback during the exam, no retry, no teach moment, no going back. Exams keep their own time limit.
* Exams give no dino points and no malus. The only reward is the golden egg.
* The play timer is stopped during the exam. No learning break interrupts an exam.
* The exam ends when all questions are answered or the time runs out. Unanswered questions count as wrong. If the time runs out while the kid has typed or marked an answer but not tapped Klaar, that answer is checked as given.
* **End screen:** the kid sees the score and a kind message. Passed: "Geslaagd!" and the golden egg (4.3). Not passed: "Goed geoefend! De vragen die nog lastig zijn komen terug in je pauzes."
* **Review:** below the score a button "Bekijk je fouten" opens a review of every question the kid got wrong or left open, one per page: the question, the kid's answer (or "niet beantwoord"), the right answer and the item's `explain` text. The kid pages through with "Volgende" and closes with "Klaar". With no mistakes the button is not shown and the screen says "Alles goed!". The review shows no points and no malus.
* The same details stay in the parent area (4.16, Examens).
* An exam counts as a learning break: after it, play resumes with a full play timer.
* The kid cannot leave an exam. The parent can stop it through the parent gate: a small grey lock on the exam screen opens the gate, and after the right pincode the parent can stop the exam (decision 61, details in 12). A stopped exam is saved as "gestopt", gives no egg and shows no review.
* If the app is closed during an exam, reopening continues the exam with the same questions and the same time left. If it is closed on the end screen or in the review, reopening shows the end screen again.

### 4.12 Parent gate (F3, F4)
**Status: v1**, with the grown up question before the first pincode (decision 52) and the lock in the world only (decision 53). From v2 the lock also shows on the exam screen, only to stop the exam (decision 61). The automated test of every route moves to v5 (see section 5).
* At first start the parent sets a 4 digit pincode (typed twice).
* A lock icon sits in the top right corner of the world, and from v2 on the exam screen (decisions 53 and 61). There is no lock on learning breaks or overlay screens. It looks small and grey, but its tap area is at least 44 x 44 points, inside the safe area and outside the look drag zone. Tapping it asks for the pincode.
* Three wrong codes block the gate for 1 minute. The wrong try count and the block are saved, so a reload or closing the app does not reset them.
* The pincode is stored as a hash made with a small built in function, so the gate also works on plain http on the home network. This only hides the code from casual eyes; a 4 digit code is not real security.
* **PIN vergeten:** shows a fresh two step grown up question in words each time (for example "Neem zeven keer acht en trek daar negentien van af. Schrijf het antwoord in cijfers."). A right answer lets the parent set a new pincode. After 2 wrong answers, PIN vergeten is blocked for 10 minutes. Wrong tries here and on the pin pad share one saved lockout, so switching between them does not reset anything.
* Leaving the parent area returns the kid to where they were.
* No route reaches a parent screen without the gate: not the URL hash, the back button, a reload or the browser history.

### 4.13 Parent area: what gets asked (Inhoud kiezen)
**Status: v1.** The "Er staan geen vragen aan" warning at the top of the parent area is moved to v4 (see section 5).
* A tree: subject (Rekenen, Taal, own subjects) > module > topic > skill. Every node has an on/off switch. Switching a node off switches off everything under it.
* Levels: a row of level checkboxes per module. A topic can override the module levels ("Eigen niveaus voor dit onderwerp").
* Each line shows how many items are switched on and how many are beheerst, so the parent sees the effect right away.
* If nothing is switched on, the top of the parent area shows a warning: "Er staan geen vragen aan. Je kind krijgt lege pauzes."
* **Vakverdeling:** a weight per switched on module (1 to 5, default 1) that sets how often each module gets a break.
* A quick preset at the top: "Groep 6 midden", "Groep 6 eind", "Groep 7 midden", "Groep 7 eind". A preset switches on that level and the levels below it for both built in modules.

### 4.14 Parent area: own modules (Eigen modules)
**Status: Moved to v7 (see section 5).** The **Exams** bullet and the 10 000 item bullet are moved to v8. The Eigen modules section is a placeholder in v1.
* **New module:** title, subject (Rekenen, Taal, or a new subject name the parent types, for example "Engels"), short description, levels (default M6, E6, M7, E7, the parent can rename, add or remove).
* **Topics:** add, rename, reorder and delete. Each topic has a lesson editor: pages with title, text, examples (good, optional wrong and why), an optional tip and an optional skill (used by the teach moment).
* **Items:** a form per type, with level, skill (pick an existing skill or type a new one), prompt and explain for every type.
  * `choice`: optional sentence, 2 to 4 options, tap the right one.
  * `find-error`: the parent types the sentence with the mistake in it, taps the wrong word (or "Geen fout") and types the correction.
  * `type`: optional sentence and one or more accepted answers.
  * `punctuate`: the parent types the sentence with commas in the right places. The app removes the commas and stores the gaps.
* **Probeer:** every item and lesson can be previewed on the exact same screens the kid sees, including the retry and the teach moment. Probeer never changes points or boxes.
* **Exams (moved to v8):** own modules can have exams with title, levels, question count, time limit (or none), pass percent and topic weights.
* Ids are made by the app and never change, so progress is kept when an item is edited.
* **Built in modules** are read only. "Kopie maken" makes an editable own copy with new ids, only for JSON modules like Taal. Rekenen is generated and has no Kopie maken. Progress is not copied.
* **Delete** a module or topic asks to confirm and also deletes its progress. Points and dinos are never deleted this way.
* The editor is fine with small modules: one topic with one item is valid. The "6 items per level" rule is only for built in content.
* (Moved to v8.) The editor stays usable with a module of 10 000 items: the item list scrolls smoothly and opens within 2 seconds.

### 4.15 Parent area: import, export and backup
**Status: Moved.** File header, sharing files, Backup maken and Backup terugzetten are moved to v3. Exporteer module, Importeer module, the id conflict choice and the bundle script are moved to v8 (see section 5). The Import & Export section is a placeholder in v1.
* **Every backup and export file** holds the app name, a format version and the date it was made. A newer app version can read older files. A file from a newer app version is refused with "Dit bestand is van een nieuwere versie. Werk de app bij."
* **Sharing files:** files go out through the iPad share sheet (save to Bestanden, AirDrop, mail). If the share sheet is not available (for example on plain http), the app opens the file in a new view where the parent uses the iPad share button. Both are fine for v1. If neither works, the parent sees a clear note.
* **Exporteer module:** saves one module as a single `.json` file. The file holds the module and all its topics in the format of `docs/modules/README.md`, bundled in one file. The architect defines the exact bundle shape.
* **Importeer module:** pick a `.json` file from Bestanden. The app checks it with the same rules the editor uses and shows clear Dutch errors ("Vraag komma-012: het goede antwoord ontbreekt"). Files over 2 MB are refused.
* Importing a module with an id that already exists asks: "Vervangen" (progress for items with the same id is kept) or "Als nieuwe module toevoegen". A module with the id of a built in module can only be added as a new module.
* The built in Taal module folder in `docs/modules/cito-taalverzorging/` can be bundled with a small script into an importable file, so new content written outside the app can be loaded.
* **Backup maken:** one file with everything (settings, own modules, progress, results, world, hotbar, dinos, eggs, dino points), except the pincode.
* **Backup terugzetten:** pick a backup file, confirm, and everything is replaced. The whole file is checked first. The old data stays until the new data is fully written, then the app switches. A broken file changes nothing. The current pincode stays.

### 4.16 Parent area: results (Resultaten)
**Status: Moved to v6 (see section 5).** v1 shows only a list of the last 20 breaks with date, module, score, points and the "snel geklikt" mark. The Examens list in Resultaten needs v2 first.
* **Overzicht:** today and this week: play time, number of breaks, questions answered, percent right on the first try, percent right after the retry, number of teach moments, dino points earned and spent.
* **Pauzes:** a list of breaks with date, time, module, score, points, length and how it ended (klaar or door ouder beëindigd). A break where every first answer took less than 2 seconds gets a "snel geklikt" mark (F13), so the parent can spot guessing.
* **Per onderdeel:** drill down subject > module > topic > skill, with a level filter. For each: answered, percent right on the first try in the last 30 days and all time, number beheerst out of total, and how many items are in each box.
* **Over tijd:** a simple bar chart per week for the last 12 weeks: questions answered and percent right on the first try, for the selected node.
* **Lastige vragen:** the 20 items answered wrong on the first try most often in the last 30 days, with the kid's last wrong answer and the right answer.
* **Examens:** a list of every exam with date, module, exam name, score, passed or not, or "gestopt". Tap one to see the score per topic and every question with the kid's answer and the right answer.
* History is kept for at least 12 months.

### 4.17 Parent area: settings (Instellingen)
**Status: v1 core.** Volume, Alles wissen and the app version at the bottom are moved to v3 (see section 5). Greying out "Pauze nu starten" during an exam comes with v2.
| Setting | Range | Default |
|---|---|---|
| Tijd tussen leerpauzes | 1 to 30 minutes | 5 minutes |
| Vragen per pauze | 3 to 20 | 5 |
| Nieuwe lessen en vragen | aan, uit (only review) | aan |
| Waarschuwing voor de pauze (pulse and tick) | aan, uit | aan |
| Groter lettertype (F13) | aan, uit | uit |
| Geluidseffecten | aan, uit | aan |
| Volume | 0 to 100 | 70 |
| Pincode wijzigen | | |
| Pauze nu starten | button, for testing or a quick check. Greyed out during a break or exam. | |
| Pauze nu beëindigen | button, only during a break, logged as "door ouder beëindigd" | |
| Wereld opnieuw beginnen | confirm, resets the blocks of the world and the player position. Dinos, eggs, dino points and learning progress stay. Dinos move to the start spot. | |
| Alles wissen | confirm twice, deletes everything | |

* **Groter lettertype:** makes all text on kid screens (breaks, lessons, Lesboek, exams, review, Dinowinkel, menus) 25 percent bigger. Layouts still fit in landscape without cutting off text; long content scrolls inside its card where needed. It does not change the parent area.
* Changes to the timer settings take effect at the next play period. A running break is not changed.
* The settings screen shows the app version at the bottom, so a stale cached version can be spotted.

### 4.18 Saving
**Status: v1 core**: on the iPad only, world as changes, eager saves, safe writes, save versions. Moved to v4 (see section 5): the broken save screen, the storage full note, persistent storage, the home screen note and the backup reminder. Applying a new app version only at start comes with the offline service worker in v4.
* All data is stored on the iPad only.
* The world is saved as the changes against the fixed starting world, so saves stay small.
* **Save eagerly:** every world change, answer, point change, purchase, dino change and timer step is saved within about 2 seconds, in small batched writes. A purchase and its points are saved together in one write. There is also a save when the app is hidden, and at the start of every break and exam. iOS can kill a home screen app without warning, so the app never relies on that last save alone.
* **Safe writes:** a save that is cut off halfway leaves the previous save readable.
* **Broken save:** if the save cannot be read, the app shows a friendly Dutch message for the parent with "Backup terugzetten" and "Opnieuw beginnen" (confirm twice). It never shows a blank screen and never wipes data on its own.
* **Updates:** saved data carries a version number. A new app version moves old saves to the new shape. A new app version is applied only when the app starts, never during a break or exam.
* **Storage full or refused:** the parent area shows a gentle note and play goes on.
* The app asks Safari for persistent storage where possible. The parent area shows a gentle note if the app is not added to the home screen, and a reminder to make a backup if the last backup is older than 30 days.

### 4.19 App basics
**Status: v1 core**: home screen manifest and icons, window too small, 3D view lost, hosting, fps counter. Moved to v4 (see section 5): offline play, plain http notes, one window, and the first start flow (kept as a new v4 task by decision 60).
* Installable as a home screen app (manifest, icons, `apple-mobile-web-app-capable`).
* Works fully offline after the first visit (browser service worker caches the app and both built in modules).
* **Plain http:** on the home network (`npm run dev -- --host`) Safari blocks some features (service worker, share sheet with files, persistent storage). The app still runs without errors and the parent sees a note where a feature is missing.
* **One window:** if the app is open in a second Safari tab or home screen window, the second one shows "Dino Blokwereld is al open" and changes nothing.
* **Window too small:** in Split View or Slide Over, when the window is less than 900 points wide, the app shows "Maak dit venster groter" and all timers stop.
* **3D view lost:** when Safari drops the 3D view (WebGL context lost, often after the app was in the background), the game rebuilds it without losing the world, dinos, eggs or position.
* First start flow for the parent: welcome, set pincode, pick a groep preset, note about adding to the home screen and backups, then "Geef de iPad aan je kind".
* Hosted as static files on Cloudflare Workers at the public `workers.dev` address (F9). No Worker code, no server storage. Cloudflare Web Analytics stays off. Deploying is done by the founder at `/ship`.
* A developer fps counter exists for the founder's iPad check. It is hidden from the kid by default.

## 5. Release backlog

v1 is live. After it come small releases, one at a time. Each release gives the kids (or the parent) one thing they can feel, holds at most 5 plan tasks, and ships on its own. The founder picks the next one at `/release`; only then it gets a section in 12. Order picked by the founder (decision 59): v2 Gouden ei first, as 0.2.0, then v3 Dino's veilig.

* **Release ids and versions.** The id (v2, v3, ...) is a fixed name in this backlog, so the tags in section 7 stay valid. The version number is given in shipping order: the first release shipped after v1 is 0.2.0, the next 0.3.0, and so on, whichever id it is.
* **Ranking.** Value for the kids against size. There is no kid feedback or kid bug logged yet. When there is, it goes first.
* **Status.** `shipped`: live. `next`: picked by the founder, has its section in 12, built next. `candidate`: can be picked next, all its plan dependencies are done or can be pointed at the live build. `later`: waits for an earlier release.
* **Size.** S: about one session. M: two or three sessions. L: four or more.
* Every release ends with a real iPad check of what it adds (CLAUDE.md), and the kid safety rules in 9 hold for every release.

### Ranked backlog

| Rank | Release | What the kids or the parent feel | Size | Value for the kids | Plan tasks | Status |
|---|---|---|---|---|---|---|
| | **v1** | The block world with dinos, learning breaks, the Dinowinkel and chickens (4.0) | | | every task marked done in `docs/PLAN.md` | shipped |
| 1 | **v2 Gouden ei** | The parent starts a practice exam. Pass it and a golden dino hatches. | M | High. A new big goal, and the only reward still missing. | T39, T51a, T51b, T51e | next (0.2.0) |
| 2 | **v3 Dino's veilig** | A backup file keeps the world, dinos and points safe, even on a wiped or new iPad. | M | High, as insurance. Losing a herd of dinos would hurt the most. | T18, T19, T53a, T55 | candidate, right after v2 (decision 59) |
| 3 | **v4 Altijd spelen** | The game starts without internet, never shows a blank screen, and two open tabs never fight over the save. | M | Medium to high. Protects saves, and the kids notice when it is missing. | T52, T22, new first start task | later (after v3) |
| 4 | **v5 Veilig en juist** | The Taal words are spelled right, nothing reaches the internet, everything fits with the big font, and the game is smooth on the family iPad. | M | Medium. Mostly invisible, but it protects what the kids learn and see. | T63, T65, T62, T32, T64 | candidate |
| 5 | **v6 Wat heb ik geleerd** | The parent sees progress per topic, over 12 weeks, the hardest questions and every exam. | M | Medium. Through the parent, who can then switch on what is hard. | T21, T56, T61 | later (after v2) |
| 6 | **v7 Eigen woorden** | The parent types this week's spelling words, tries them with Probeer, and the kid gets them in breaks. | L | Medium. The kid practises what school asks this week. | T40, T54, T57, T59 | candidate |
| 7 | **v8 Modules delen** | The parent exports and imports modules, loads content made elsewhere, and writes own exams for a golden egg. | M | Low to medium. A parent tool. | T53b, T20, T58, T60 | later (after v3 and v7) |

The 25 open plan tasks are all in v2 to v8. v4 adds one new task the architect writes into the plan: the first start flow from 4.19, which the founder kept (decision 60).

### v2 Gouden ei (next, 0.2.0)
* **Goal:** a practice exam the parent starts, a calm exam screen for the kid, and a golden egg for a pass.
* **In:** 4.11 in full. The golden dino from 4.3. The exam timer from 4.4. Exam answers move the boxes (4.6). The four Taal exams (4.9) and four Rekentoets exams (4.10). The parent Examens screen with the "te weinig vragen" warning. "Pauze nu starten" greyed during an exam. The small grey lock on the exam screen to stop the exam (decision 61). A Winkel button next to Pauze and a Pauze that opens at once (decision 73).
* **Out:** the Examens list in Resultaten (v6). Own exams (v8). A lock on learning breaks.
* **Size:** M. **Tasks:** T39 (exam logic), T51a (kid exam screen, review, golden egg, exam lock), T51b (parent Examens screen, stop after the gate), T51e (Winkel button and instant Pauze).
* **Criteria:** AC64 to AC72, AC111, AC112, AC115, AC125 (exam part), AC153, and the new AC155 to AC165 in 12.
* **Decided:** the parent stops an exam with a small grey lock on the exam screen only (decision 61). Full section in 12.

### v3 Dino's veilig
* **Goal:** the parent can make a backup file and put it back, so nothing the kid built or earned is ever lost for good.
* **In:** 4.15 file header, sharing files, Backup maken, Backup terugzetten. 4.17 Alles wissen, Volume and the app version. Tests for Pauze nu starten, Pauze nu beëindigen and Wereld opnieuw beginnen, which v1 already has.
* **Out:** module import and export (v8). The backup reminder after 30 days (v4).
* **Size:** M. **Tasks:** T18 (backup file), T19 (share and file pick helpers), T53a (backup in the parent area), T55 (settings actions). Volume and the app version are small leftovers of T49 that go with T55.
* **Criteria:** AC87, AC93 (Volume part), AC94 and AC95 (tests), AC130, AC131 (backup part), AC133, AC135, AC152 (Alles wissen and restore part).

### v4 Altijd spelen
* **Goal:** the game always starts and never loses or mixes up a save.
* **In:** 4.18 broken save screen, storage full note, persistent storage, home screen note, backup reminder. 4.19 offline play, plain http notes, one window, and the first start flow (kept by decision 60). The "geen vragen" warning from 4.13.
* **Out:** nothing else. The flight mode check on the real iPad (AC97) is done in this release's own iPad check, or in T64 if v5 comes later.
* **Size:** M. **Tasks:** T52 (robustness), T22 (offline service worker), new task for the first start flow.
* **Criteria:** AC73, AC97, AC114, AC129, AC137, AC138 (update at start), AC139, AC140, AC144.
* **Why not first:** T52 needs the backup file from v3 (the broken save screen offers "Backup terugzetten", the reminder reads the last backup date). The kids play from the home screen at home on wifi (decision 54), so offline matters less than a backup.

### v5 Veilig en juist
* **Goal:** prove the live game is safe, correct and smooth, and fix what the checks find.
* **In:** the kid safety suite (no outside requests, no links, plain text, every parent route behind the gate, works with sound off). The human Taal content check. The accessibility and layout audit with Groter lettertype. The speed spike and the full real iPad check.
* **Out:** checks of features that do not exist yet. Each later release re-runs the suites for what it adds.
* **Size:** M, mostly qa and founder time. **Tasks:** T63 (safety suite), T65 (content check), T62 (accessibility audit), T32 (speed spike), T64 (real iPad checks).
* **Criteria:** AC76 (route test), AC98, AC99, AC101, AC102, AC107, AC124, AC141 (full audit), AC143, AC154 (audit).
* **Plan note:** in `docs/PLAN.md`, T62, T63 and T65 wait for every feature task. The architect points them at the live build, so this release can ship before v6 to v8.
* **Why it should not wait long:** the kids already learn from the Taal content, and it has not had its human spelling check (AC124). Decision 59 picked v2 without T65, so T65 stays in v5 for now. It is mostly reading, so the founder can still pull it into any release at `/release`.

### v6 Wat heb ik geleerd
* **Goal:** the parent sees what the kid knows and what is hard.
* **In:** 4.16 in full: Overzicht, Pauzes, Per onderdeel, Over tijd, Lastige vragen, Examens.
* **Out:** nothing else.
* **Size:** M. **Tasks:** T21 (results queries), T56 (Overzicht, Pauzes, Examens), T61 (Per onderdeel, Over tijd, Lastige vragen).
* **Criteria:** AC89, AC90, AC91, AC92, AC134.
* **Split if needed:** if v6 is wanted before v2, T56 can ship without its Examens tab and add it after v2.

### v7 Eigen woorden
* **Goal:** the parent makes an own module with lessons and all four question types, and checks each one with Probeer.
* **In:** 4.14 apart from own exams and the 10 000 item list. Kopie maken for Taal. Delete with confirm.
* **Out:** own exams and the big item list (v8). Import and export (v8).
* **Size:** L. **Tasks:** T40 (own module store), T54 (module list, form, topics, lesson editor), T57 (item forms), T59 (Probeer).
* **Criteria:** AC80, AC81, AC82, AC83, AC152 (module delete part).

### v8 Modules delen
* **Goal:** modules travel as files, and own modules can have exams.
* **In:** 4.15 Exporteer module, Importeer module, the id conflict choice, the bundle script. 4.14 own exams and the 10 000 item list.
* **Out:** sharing online, accounts or servers (Later).
* **Size:** M. **Tasks:** T53b (module import and export), T20 (bundle script), T58 (virtual item list), T60 (own exams form).
* **Criteria:** AC84, AC85, AC86, AC88, AC131 (export part), AC132.

### Later
Not planned in any release. Each would need the founder to pick it first.
* Bigger world, more biomes, caves, flowing water and lava, day and night, weather. (Water and lava as plain blocks are in v1.)
* More block types beyond the 32 in v1, crafting, tools, chests to store blocks, doors.
* Wild dinos, taming with food, earning blocks.
* Creative mode (floating is in v1), riding dinos, dino eggs found in the world, baby dinos that grow up over days, more dino kinds, dino skins, selling or swapping dinos.
* Hidden treasures or quests in the world.
* More Rekenen: klokkijken, breuken, geld, metriek stelsel, verhaaltjessommen, cijferen, delen met rest.
* More Taal modules: begrijpend lezen, woordenschat, grammatica (ontleden), dictee with spoken words.
* Read aloud (text to speech) for lessons and questions.
* Parent settings for point values, egg prices or malus.
* Pictures or sound in parent made lessons and questions.
* Mixed modules inside one break.
* Parent made exams across modules.
* Daily play time limit and bedtime lock.
* More than one kid profile.
* Typing the correction in `find-error`, other punctuation marks in `punctuate`.
* Long press actions in the world.
* Background music.
* Portrait mode.
* Renaming the app from inside the app (the kid may pick the final name later, see F12).
* Custom domain for the hosted app.
* Sync between devices, sharing modules online, any account or server.

## 6. User flows

Flows 2 to 5 and 7 are v1. Flow 1 is v4 (kept by decision 60), Flows 6 and 6b are v2, Flow 8 is v7 (step 5 is v8), Flow 9 is v6 and Flow 10 is v3. In v1 the first pincode is set the first time a grown up taps the lock, after the grown up question (decision 52).

### Flow 1: first start (parent) (v4)
1. Parent opens the app on the iPad and sees "Welkom bij Dino Blokwereld".
2. Parent sets a pincode twice.
3. Parent picks a preset, for example "Groep 6 eind".
4. Parent reads the short note about adding to the home screen and making backups.
5. Parent taps "Geef de iPad aan je kind". The world loads.

### Flow 2: play and build
1. I stand on a grassy hill. There are no dinos yet. At the top I see "Leerpauze over 5:00" and "0 punten" in the pause menu.
2. I walk with my left thumb and look around with my right thumb.
3. I tap Hakken and tap a tree. The block pops away.
4. I tap Bouwen, tap "Alle blokken", pick blauwe wol and tap the ground to build a wall.
5. I want to get on top of my wall. I tap the block under my feet. A block appears and I go up one. I do it again.
6. I tap the lock icon by accident. It asks for a code I do not know. I tap "Terug".

### Flow 3: learning break
1. The countdown pulses at 0:30. At 0:10 it ticks.
2. At 0:00 the world freezes and Dino Juf says "Tijd voor een leerpauze!"
3. This topic is new, so I read three short lesson pages about the komma and tap "Ik snap het!".
4. I get 5 questions. I tap where the comma goes and tap "Klaar". Green check, +2 punten.
5. Next question, I get it wrong. "Net niet. Probeer het nog een keer." I try again and get it right. "Goed zo! +1 punt".
6. Another one I get wrong twice. Dino Juf shows "Zo zit het:", the right answer, why, and one lesson page. It says -1 punt. I tap "Ik snap het".
7. After the last question I see "4 van de 5 goed!", "+6 punten" and "Je kunt een ei kopen in de Dinowinkel!".
8. I tap "Terug naar de wereld" and play on. The countdown shows 5:00 again.

### Flow 4: buying a dino egg
1. I tap the pause button and choose "Dinowinkel". I have 23 punten.
2. I see four eggs. The Compy costs 20. The Triceratops says "Nog 17 punten nodig".
3. I tap "Kopen" under the Compy and then "Ja".
4. I go back to the world. An egg is next to me. It wobbles, cracks and a small Compy hops out. It follows me.
5. I tap it, choose "Naam geven" and type "Pip".
6. I want a langnek next. I start saving up.

### Flow 5: Lesboek, Extra oefenen and stuck
1. I tap the pause button and choose "Lesboek".
2. I pick Taal, then "De apostrof", and read the pages again.
3. I go back and choose "Extra oefenen", pick Rekenen, and answer 5 sums to earn more punten.
4. I walled myself in. I tap the pause button and "Ik zit vast". I am back at the start and Pip is with me.
5. I tap "Terug naar de wereld".

### Flow 6: exam (v2)
1. Parent taps the lock icon, types the code, goes to Examens and starts "Oefenexamen M6".
2. Parent gives me the iPad. I see "Examen: 30 vragen, 30 minuten" and tap "Begin".
3. I answer each question. I do not see if it is right. I see "Vraag 12 van 30" and the time left.
4. At the end I see "27 van de 30 goed. Geslaagd!" and a golden egg.
5. I tap "Bekijk je fouten" and see my 3 mistakes, each with the right answer and why. I tap "Klaar".
6. Back in the world the egg hatches into a golden triceratops that follows me.

### Flow 6b: parent stops an exam (v2)
1. Dinner is ready, but I am on "Vraag 9 van 30". Papa taps the small grey lock in the corner of the exam screen.
2. Papa types the code. The time does not run while he types.
3. Papa sees "Examen stoppen?" and taps "Stoppen".
4. I am back in the world. There is no golden egg this time. The countdown starts again.

### Flow 7: parent picks what gets asked
1. Parent opens the parent area and goes to Inhoud kiezen.
2. Parent switches off Rekenen > tafels > tafel-1 and tafel-2, and switches on only M7 for the komma topic.
3. Parent sets Vakverdeling to Taal 2, Rekenen 1.
4. Parent leaves the parent area. The next breaks follow the new choices.

### Flow 8: parent makes a module (v7, step 5 in v8)
1. Parent opens Eigen modules and taps "Nieuwe module". Title "Spellingwoorden week 12", subject Taal.
2. Parent adds a topic "Woorden met au en ou" and writes a lesson page.
3. Parent adds ten `type` items and two `find-error` items, and taps "Probeer" on one to check it.
4. Parent switches the module on in Inhoud kiezen.
5. Parent taps "Exporteer module" and saves the file to Bestanden to share with the other parent.

### Flow 9: parent checks results (v6)
1. Parent opens Resultaten and sees this week: 42 minutes played, 8 breaks, 40 questions, 78 percent right on the first try, 6 teach moments.
2. Parent opens Pauzes and sees one break marked "snel geklikt".
3. Parent taps Taal > Taalverzorging > ww-verleden and sees 55 percent right, with "verleden-kofschip" as the weakest skill.
4. Parent opens Lastige vragen and sees the kid wrote "fietsde".
5. Parent opens Examens and taps the last exam to see the score per topic.

### Flow 10: backup (v3)
1. Parent opens Import en export and taps "Backup maken".
2. The share sheet opens and the parent saves the file to Bestanden.
3. Weeks later on a wiped iPad the parent goes through the first start, then taps "Backup terugzetten", picks the file, confirms, and the world, dinos, points and progress are back. The new pincode stays.

## 7. Acceptance criteria
Times in these criteria are play time with the app visible, unless stated otherwise. Tests may use a fake clock. Criteria AC103 to AC144 were added in review round 1, and AC145 and up when the founder answered F1 to F13. They sit in their topic group. **(iPad)** marks a check the founder or QA does by hand on the reference iPad, because headless WebKit cannot measure it. Removed criteria keep their number so references stay valid.

**Release tags (decision 57).** A criterion with no tag is v1. A tag like **(v2)** means the criterion belongs to that release in section 5. A tag like **(v1, test in v3)** means the behaviour is in v1 and the named part comes in that release. Numbers never change.

**v1 readings.** For v1, read these criteria with the changes in 4.0: AC1 has a world 64 high, not 32. AC7 and AC151 have 32 building blocks, not 16. AC20 and AC149 count no chickens toward the 12. In AC120, plus points from a break started with Nu oefenen do count toward the 10 point cap and give no malus (decision 56); only timed breaks stay outside the cap. AC52 holds with a Stoppen button on every question (decision 51). AC127 is the lock in the world only. From v2, AC127 also holds for the exam screen lock (AC155).

### World and controls
* **AC1:** Given a new game, when the world loads, then it is 64 x 64 blocks wide and 32 high (or 48 x 48 if the spike says so) with hills, trees, sand and stone, and it is identical every time a new game starts.
* **AC2:** Given the player walks into the world edge, when they keep pushing, then they stop at the edge and cannot leave the world.
* **AC3:** Given Hakken mode, when the kid taps a minable block within 6 blocks, then the block disappears.
* **AC4:** Given Hakken mode, when the kid taps oersteen or a block further than 6 blocks away, then nothing changes.
* **AC5:** Given Bouwen mode with any block selected, when the kid taps a block face within reach, then a block of the selected type appears against that face. There is no count and no limit.
* **AC6:** Given Bouwen mode, when the placed block would overlap the player, a dino or an egg, then no block is placed. (Building up, AC103, is the one exception for the player.)
* **AC7:** Given any moment of play, then the hotbar shows 8 filled slots and the "Alle blokken" button. Given "Alle blokken", then all 16 building blocks from 4.1 show, and picking one puts it in the selected slot. The hotbar choice is saved across restarts.
* **AC8:** Given the kid holds the move stick with one finger, when they drag on the right half with a second finger, then the player walks and turns at the same time.
* **AC9:** Given the kid taps the jump button while standing on a block, then the player jumps high enough to land on a block one higher.
* **AC10:** Given the built app (automated check), then the viewport meta blocks zoom, game areas have `touch-action: none`, `user-select: none` and `-webkit-touch-callout: none`, and `gesturestart` is prevented.
* **AC11:** Given the iPad is in portrait, when the app is open, then only the "Draai je iPad" message shows. Turning back to landscape restores the screen without losing state.
* **AC103:** Given Bouwen mode and room above the player's head, when the kid taps the top face of the block they stand on, then a block is placed there and the player stands on top of it. Given no room above the head, then nothing is placed.
* **AC104:** Given a touch on the right half that moves less than 10 points and lasts less than 300 ms, then it is a tap. Given any longer or wider touch, then the view turns and no block is mined or placed. Given a dino or egg and a block both under the finger, then the tap hits the dino or egg. Given a touch that starts on a button, the stick or the hotbar, then the view does not turn. Given a long press in the world, then nothing happens.
* **AC105:** Given Bouwen mode, when two fingers tap two different block faces in the same moment, then at most 2 blocks are placed, never two blocks in the same cell, and nothing crashes.
* **AC106:** Given the kid is walled in, when they tap "Ik zit vast" in the pause menu, then the player stands at the start spot, dinos on Volg mij are next to them, and the world is unchanged.
* **AC107 (iPad) (v1, iPad check in v5):** Given the world, a break or an exam on the reference iPad, when the kid double taps, pinches, long presses or pulls down, then nothing zooms, scrolls, selects text or shows a callout menu.
* **AC108:** Given the window is less than 900 points wide (Split View or Slide Over), then only "Maak dit venster groter" shows and all timers stop. Making the window bigger restores the screen without losing state.
* **AC109:** Given the 3D view is lost (simulated WebGL context loss), then within 3 seconds the world shows again with the same blocks, dinos, eggs and player position, and no black screen stays.
* **AC151:** Given a new game, then all 16 building blocks from 4.1 can be placed right away, without earning anything, and no block type ever runs out.

### Dinos, points and the Dinowinkel
* **AC12:** Given a new game, when the world loads, then there are no dinos and no eggs in the world and the kid has 0 dino points.
* **AC13:** (removed, see F5: no wild dinos or feeding)
* **AC14:** (removed, see F5: no wild dinos or feeding)
* **AC15:** (removed, see F5: no taming)
* **AC16:** Given a dino, when the kid taps it, then a menu with Volg mij, Blijf hier, Naam geven and Knuffel appears.
* **AC17:** Given a dino on Volg mij, when the kid walks away and then stands still for 5 seconds, then the dino is within 8 blocks of the player. Given the dino is stuck for more than 5 seconds, then it pops next to the player.
* **AC18:** Given the kid names a dino, when they reopen the app, then the name shows above the dino. Names are at most 12 characters and hold only characters from the app keyboard.
* **AC19:** (removed, see F5: no wild dinos to replace)
* **AC20:** Given the kid has 12 shop dinos (hatched or as eggs), when they open the Dinowinkel, then every Kopen button is greyed out, the "Je hebt al 12 dino's! Wat een kudde." message shows, and no points can be spent.
* **AC21:** No dino ever damages the player, breaks or places a block, or ends up inside a block.
* **AC110:** Given 45 points, when the kid taps "Kopen" and "Ja" on a 40 point egg 10 times within 1 second, then exactly one egg is bought, the total is 5, and the total never goes below 0.
* **AC111 (F7) (v2):** Given the kid has 12 shop dinos, when they pass an exam, then the golden egg still hatches into a golden dino, and the Dinowinkel still blocks a 13th shop dino.
* **AC149:** Given the Dinowinkel, then it shows the Compy for 20, the Triceratops for 40, the Stegosaurus for 40 and the Brachiosaurus for 80 points, and the kid's total. Given 30 points, then the Compy can be bought and the others are greyed out with "Nog 10 punten nodig" and "Nog 50 punten nodig". Given "Kopen" then "Nee", then nothing changes. The shop has no link, no real money and no payment screen.
* **AC150:** Given the kid bought an egg, when they return to the world, then the egg lies next to the player and after 5 seconds of play hatches into a dino of the bought kind on Volg mij. Given the app is killed right after "Ja", when it reopens, then the egg or the dino is there and the points were taken exactly once.
* **AC152 (v1, Alles wissen and restore in v3, module delete in v7):** Given no wrong answer, malus, "Wereld opnieuw beginnen", module delete or restart, then no dino or egg is ever removed. Only "Alles wissen" and "Backup terugzetten" replace them.

### Timers
* **AC22:** Given default settings, when play starts, then the top of the screen shows "Leerpauze over 5:00" and after 60 seconds of real time it shows 4:00, plus or minus 1 second, whatever the frame rate.
* **AC23:** Given the pause menu, Dinowinkel, Lesboek, Extra oefenen, the dino menu, the block grid, the parent gate or the parent area is open, or the app is in portrait, too small or in the background, then the play timer does not count down.
* **AC24:** Given 2:30 left on the play timer, when the app is killed and reopened, then the timer shows between 2:30 and 2:35.
* **AC25:** Given warnings are on, when 30 seconds are left, then the countdown grows and pulses, and in the last 10 seconds a tick plays if sound is on.
* **AC26:** Given the play timer reaches 0, then the game saves, the world stops, and the learning break opens. There is no way for the kid to close it.
* **AC27:** Given the parent sets "Tijd tussen leerpauzes" to 10 minutes, when the next play period starts, then the countdown starts at 10:00.
* **AC112 (v2):** Given an exam with time left, when the parent gate or parent area is open, the iPad is in portrait, the window is too small, or the app is in the background, then the exam timer does not count down.
* **AC113:** Given a fake clock that jumps 60 seconds between two heartbeats while the app is visible, then no timer loses those 60 seconds.
* **AC114 (v4):** Given the app is open, when it is opened in a second tab or window, then the second shows "Dino Blokwereld is al open" and no saved data changes.
* **AC115 (v2):** Given a break or an exam is running, then "Pauze nu starten" is greyed out. Given a break is running, when the parent tries to start an exam, then "Beëindig eerst de pauze" shows and no exam starts.

### Learning break
* **AC28:** Given "Vragen per pauze" is 5, when a break starts, then 5 progress dots show and the kid gets 5 questions. No break countdown shows.
* **AC29:** Given a right answer on the first try, then a green check, "+2 punten" and a happy sound (if sound is on) show, and the point total goes up by 2.
* **AC30:** Given a wrong answer on the first try, then "Net niet. Probeer het nog een keer." shows, the right answer is not shown, and the same question shows again with its input cleared.
* **AC31:** Given a break, then it ends only after every question is done (right on the first try, right on the retry, or a teach moment). Given a fake clock that moves 30 minutes while a question is on screen, then the break is still on that question and nothing is logged as "niet beantwoord".
* **AC32:** (removed, see F2: no break time limit, no "Laatste vraag")
* **AC33:** (removed, see F2: no "Geen limiet" setting)
* **AC34 (F6):** Given a break ends with K right out of N, with K from 1 to N, then the summary shows "K van de N goed!", the points earned in this break and the new total. Given the total now covers the price of an egg the kid can buy, then "Je kunt een ei kopen in de Dinowinkel!" shows.
* **AC35:** Given every question of a break is right on the first try, then the kid gets 2 points per question plus a 3 point bonus (13 points for 5 questions).
* **AC36:** Given the summary, when the kid taps "Terug naar de wereld", then play resumes at the same spot and the play timer starts again at the full interval.
* **AC37:** Given a break is on question 3 on the retry, when the app is closed and reopened, then the same break shows question 3 on the retry with the same questions, and the points so far are kept.
* **AC38:** Given two modules are switched on with equal weight, when 10 breaks happen, then each module gets 5 breaks. Given weights 2 and 1, then over 9 breaks they get 6 and 3, also when the app is restarted between breaks. Given one module has no usable items, then its turn goes to the next module.
* **AC39:** Given no items are switched on anywhere, when a break starts, then the friendly "Er staan geen vragen aan" message shows and the break ends after 10 seconds with no points and no malus.
* **AC116 (F6):** Given a break ends with 0 right (first try and retry), then the summary shows the kind "Dit was lastig" message, no plus points and no bonus.
* **AC117:** Given a question, when the kid double taps an answer button, or two fingers hit two answer buttons in the same moment, then exactly one answer is logged for that try, the first one. Given a double tap on "Verder", "Ik snap het", "Klaar" or "Terug naar de wereld", then it acts once and no question or retry is skipped.
* **AC145:** Given a wrong first try, when the retry is right, then a green check and "Goed zo! +1 punt" show and the total goes up by 1.
* **AC146:** Given a wrong first try, when the retry is also wrong, then the teach moment shows "Zo zit het:", the right answer, the item's `explain` text and teaching: for a Taal or parent item the lesson page linked to the item's skill (or the first lesson page of the topic), for a Rekenen item a step by step worked example of that sum. It shows "-1 punt", the total goes down by 1, and "Ik snap het" moves to the next question.
* **AC147:** Given a total of 0 points, when a teach moment happens, then the total stays 0. The total is never below 0 anywhere in the app.

### Spaced repetition and selection
* **AC40:** Given a new item answered right on the first try, then its box becomes 2 and it is due from 00:00 the next calendar day in local time.
* **AC41:** Given an item in any box answered wrong on the first try, then its box becomes 1, it does not come back in the same break (apart from its own retry), and it is due in the next break of that module.
* **AC42:** Given items in boxes 2, 3, 4 and 5 answered right on the first try, then their boxes become 3, 4, 5 and 5 and they are due from 00:00 on the calendar day 3, 7, 21 and 21 days later.
* **AC43:** Given a break with N = 5 and 4 due items (2 in box 1), then the break holds 3 review items (both box 1 items first), and 2 new items.
* **AC44:** Given a break with N = 5 and 0 due items, then the break holds 5 new items from one topic.
* **AC45:** Given a topic with new items left at M6 and E6 (both switched on), then new items come from M6 until no M6 items are new.
* **AC46:** Given three breaks of the same module that use new slots, then they use the first three switched on topics in teaching order that still have new items, and the fourth break goes on from there, also after a restart.
* **AC47:** Given "Nieuwe lessen en vragen" is off, then breaks only hold items that were seen before.
* **AC48:** Given a topic, skill or level is switched off, then no break or Extra oefenen round asks an item from it. Exams are exempt (AC64).
* **AC118:** Given an item is due today, when the iPad clock is set back 3 days, then the item is still due. No stored due date changes.
* **AC119:** Given a break, then no item appears twice in it, apart from its own retry.
* **AC148:** Given an item in box 3, when the first try is wrong and the retry is right, then its box becomes 1 (only the first try counts for the boxes).

### Lessons and practice
* **AC49:** Given a break introduces the first new items of a topic, then the topic lesson shows first, page by page, ending with "Ik snap het!".
* **AC50:** Given a topic's lesson was shown once, then it does not show automatically again at the start of a break. (A teach moment may still show one of its pages.)
* **AC51:** Given the pause menu, when the kid opens Lesboek, then every switched on topic of every module is listed and each lesson opens page by page.
* **AC52:** Given Extra oefenen with module Rekenen, then the kid gets N questions picked by the same rules, with the same retry, teach moment and points as a break, no malus, no +3 bonus, and the play timer is stopped while the round is open.
* **AC120 (F6):** Given the kid earned 10 plus points from Extra oefenen today, when they answer more right in Extra oefenen, then they earn nothing more and "Genoeg geoefend voor vandaag, ga lekker bouwen!" shows. The next calendar day the cap starts again. Points from learning breaks never count toward this cap.

### Answer types
* **AC53:** Given a `choice` item, then 2 to 4 buttons show and tapping the button at index `answer` is right, any other is wrong.
* **AC54:** Given a `find-error` item, then tapping the word at index `answer` is right. If `answer` is -1, tapping "Geen fout" is right. Any other tap is wrong.
* **AC55:** Given a `punctuate` item, when the kid toggles gaps and taps Klaar, then the answer is right only if the set of marked gaps equals `answer`. An empty `answer` is right only when no gap is marked.
* **AC56:** Given a `type` item with answer ["fietste"], then "fietste" and " fietste " are right, and "Fietste" and "fietsde" are wrong.
* **AC57:** Given any typing question, then the app's own keyboard shows and the iPad system keyboard never opens. One tap on a key types exactly one character, also when tapped fast.
* **AC58:** Given a Rekenen question with answer 3.5, then "3,5", "3,50" and "03,5" are right and "35" is wrong. Given the input is empty, "3," or ",5", then Klaar cannot be tapped. Given E7 decimal sums such as 0,1 + 0,2, then the expected answer is exactly 0,3.
* **AC121:** Given the Rekenen number pad, then it has digits 0 to 9, a comma and backspace, and no key ever types a dot. Given a number of 1000 or more on screen, then it shows with a thin space ("10 000").

### Built in modules
* **AC59:** `python3 docs/modules/validate.py docs/modules/cito-taalverzorging` prints OK, and the app ships exactly the content in that folder.
* **AC60:** Given the Rekenen module, then it has topics optellen, aftrekken, tafels and delen, each with a lesson and items at M6, E6, M7 and E7 following the table in 4.10.
* **AC61:** Given 1000 generated Rekenen questions per skill and level (automated test with a fixed seed), then no answer is negative, every division is whole, every sum is within the range of its level, and every question has an `explain` text and a worked example whose last step equals the answer.
* **AC62:** Given a tafels fact like 7 x 8 answered wrong on the first try, then the same fact comes back in the next Rekenen break.
* **AC63:** Given a generated plus sum answered wrong on the first try, then that exact sum comes back in the next Rekenen break. When it is then answered right on the first try, it moves to box 2 and follows the boxes, and it is never offered as a new sum.
* **AC122:** Given `./scripts/check.sh`, then it runs `validate.py` on every module folder in `docs/modules/` and fails if any module fails or if python3 is missing. It never skips silently.
* **AC123:** Given `validate.py`, then it also fails on: two equal options in a `choice` item, two items with the same prompt and sentence in one module, a `type` item without an accepted answer, a sentence over 15 words at M6 or E6, or over 20 words at M7 or E7.
* **AC124 (v5):** Given the release, then `docs/TEST_REPORT.md` records the human content check: 5 items per Taal topic checked by QA against woordenlijst.org, and 20 items read by the founder or a teacher, with every problem found fixed.
* **AC125 (v1, exam part in v2):** Given a Rekenen exam of 20 questions or a Rekenen break, then no question appears twice. Given the same seed, then the generator gives the same questions.
* **AC126:** Given more than 200 wrong plus sums saved for optellen, then only the 200 newest are kept.

### Exams
* **AC64 (v2):** Given the parent starts Oefenexamen M6, then the kid gets 30 questions at level M6, split over topics by the `mix` weights (largest remainder rounding), with a 30 minute countdown, whatever the parent's switches are.
* **AC65 (v2):** Given an exam is running, then the kid sees no right or wrong feedback, gets no retry and no teach moment, cannot go back, and cannot leave without the pincode. The point total does not change during or after an exam.
* **AC66 (v2):** Given an exam is running, then the play timer is stopped and no learning break starts.
* **AC67 (v2):** Given the exam time runs out, then the exam ends and unanswered questions count as wrong. Given an answer was typed or marked but Klaar was not tapped, then that answer is checked as given.
* **AC68 (v2):** Given the kid scores at or above `passPercent`, then "Geslaagd!" shows with the score, and back in the world a golden egg hatches into a golden dino. Given a lower score, then the score and the kind "Goed geoefend!" message show and there is no egg.
* **AC69 (v2):** Given an exam ends, then the result is saved with date, module, exam, score, passed or not, and every question with the kid's answer.
* **AC70 (v2):** Given the parent stops a running exam through the gate, then it is saved as "gestopt", gives no egg and shows no review.
* **AC71 (v2):** Given an exam is on question 12 with 18:00 left, when the app is closed and reopened, then the exam continues at question 12 with between 18:00 and 18:05 left.
* **AC72 (v2):** Given a module has too few items for an exam, when the parent starts it, then a warning shows the real question count before the exam begins.
* **AC153 (F8) (v2):** Given an exam ended with 3 wrong and 1 unanswered question, when the kid taps "Bekijk je fouten", then 4 pages show, each with the question, the kid's answer (or "niet beantwoord"), the right answer and the `explain` text, and "Klaar" returns to the end screen. Given an exam with no mistakes, then "Alles goed!" shows and there is no review button. Given the app is closed during the review, then reopening shows the end screen again.

### Parent gate
* **AC73 (v4):** Given first start, then the parent must set a 4 digit pincode, typed twice and matching, before the world opens.
* **AC74:** Given the lock icon is tapped, when the right pincode is typed, then the parent area opens. When a wrong code is typed 3 times, then the gate is blocked for 1 minute, and the block still holds after a reload or after closing and reopening the app. Fast tapping on the pin pad types one digit per tap and never crashes.
* **AC75 (F4):** Given "PIN vergeten", then a new two step question in words shows each time. When it is answered right, then the parent can set a new pincode. When it is answered wrong twice, then PIN vergeten is blocked for 10 minutes. Wrong tries here and on the pin pad share one saved lockout that survives a reload.
* **AC76 (v1, full route test in v5):** Given the kid is on any kid screen, then no parent function (settings, content, results, import, export, backup, end break, stop exam) can be reached without passing the gate. An automated test tries every route: URL hash, back button, reload and browser history.
* **AC127:** Given the lock icon, then its tap area is at least 44 x 44 points, fully inside the safe area, and a look drag that starts outside it never opens the gate.
* **AC128:** Given the app runs over plain http (no secure context), then the pincode can be set and checked and the gate works.

### Parent: content choice
* **AC77:** Given Inhoud kiezen, then the tree shows subject, module, topic and skill with switches, and level checkboxes per module with an override per topic.
* **AC78:** Given the parent switches off a topic, then all its skills show as off and the switched on item count updates.
* **AC79:** Given the preset "Groep 7 midden", then levels M6, E6 and M7 are switched on and E7 off for both built in modules.
* **AC129 (v4):** Given no items are switched on anywhere, when the parent opens the parent area, then the warning "Er staan geen vragen aan" shows at the top.

### Parent: own modules, import, export and backup
* **AC80 (v7):** Given the parent creates a module with one topic, one lesson page and one item of each of the four types, then the module validates, appears in Inhoud kiezen, and its items can show up in breaks.
* **AC81 (v7):** Given the parent types the `punctuate` sentence "Ik zag een raptor, een T-rex en een ei.", then the stored item has the words without the comma and `answer` [3].
* **AC82 (v7):** Given the parent edits the text of an item, then the item keeps its id and its box.
* **AC83 (v7):** Given a built in module, then it cannot be edited. Given the Taal module, then "Kopie maken" creates an editable copy with new ids. Given Rekenen, then there is no "Kopie maken".
* **AC84 (v8):** Given an exported module file, when it is imported on a fresh install, then the same module with the same content appears (automated). (iPad) Given "Exporteer module" on the reference iPad in home screen mode, then the share sheet opens with one `.json` file, or the file opens in a new view that can be shared.
* **AC85 (v8):** Given an import file with errors, then nothing is imported and every error shows in Dutch with the item id. Given a file over 2 MB or not JSON, then it is refused with a friendly message. The test set includes text with `<script>`, `javascript:` and `https://`, a file just over 2 MB, and a file with 10 000 items.
* **AC86 (v8):** Given an import with an id that exists, then the parent must choose "Vervangen" or "Als nieuwe module toevoegen". Vervangen keeps progress for item ids that still exist. Given the id of a built in module, then only "Als nieuwe module toevoegen" is offered.
* **AC87 (v3):** Given "Backup maken" and then "Alles wissen", a new pincode, and "Backup terugzetten" with that file, then settings, own modules, progress, results, world, hotbar, dinos, eggs and dino points are all back as before, and the new pincode still works.
* **AC88 (v8):** Given any text from an imported module (also text that looks like HTML or a web address), then it shows as plain text. No link is ever clickable and no script runs.
* **AC130 (v3):** Given a broken backup file (cut off, wrong JSON, wrong app name), when the parent restores it, then a friendly message shows and all current data is unchanged. Given a backup from a newer format version, then it is refused with "Dit bestand is van een nieuwere versie".
* **AC131 (v3, export part in v8):** Given any backup or export file, then it holds the app name, a format version and the date. A backup from the previous format version (test fixture) restores correctly.
* **AC132 (v8):** Given a module with 10 000 items, then the editor item list opens within 2 seconds and scrolls without freezing.
* **AC133 (iPad) (v3):** Given "Backup maken" on the reference iPad in home screen mode, then the parent can save the file to Bestanden, by the share sheet or the new view fallback.

### Parent: results and settings
* **AC89 (v6):** Given answers were logged, then Resultaten Per onderdeel shows for any node: answered, percent right on the first try in the last 30 days and all time, beheerst count and items per box, matching the logged answers.
* **AC90 (v6):** Given answers over several weeks, then the Over tijd chart shows one bar per week for the last 12 weeks with the right counts and percentages.
* **AC91 (v6):** Given Lastige vragen, then it lists up to 20 items, most wrong on the first try in the last 30 days first, with the kid's last wrong answer and the right answer.
* **AC92 (F13) (v6, v1 has the simple list with the mark):** Given Pauzes, then every break shows with date, module, score, points, length and how it ended. A break where every first answer took less than 2 seconds shows "snel geklikt". A break with one first answer of 2 seconds or more does not.
* **AC93 (v1, Volume in v3):** Given every setting in the table in 4.17, then the parent can change it within its range, the change is saved, and it works as described.
* **AC94 (v1, tests in v3):** Given "Wereld opnieuw beginnen", then the blocks and the player position reset to the fixed starting world, dinos and eggs stand at the start spot, and dino points, learning progress and results stay.
* **AC95 (v1, tests in v3):** Given "Pauze nu beëindigen" during a break, then the break ends, the kid keeps the points and malus so far, open questions are logged as "niet beantwoord" with no box change, and the break is logged as "door ouder beëindigd".
* **AC134 (v6):** Given Overzicht, then today and this week show play time, breaks, questions answered, percent right on the first try, percent right after the retry, teach moments, and points earned and spent, matching the log.
* **AC135 (v3):** Given Instellingen, then the app version shows at the bottom.
* **AC154 (F13) (v1, audit in v5):** Given "Groter lettertype" is on, then text on every kid screen is 25 percent bigger than with it off (question text at least 30 points), no text is cut off in landscape on the reference iPad size, and the parent area text does not change.

### Saving, offline and device
* **AC96:** Given the kid built and mined, when the app is killed at any moment and reopened, then at most the last 5 seconds of changes are lost.
* **AC97 (v4):** Given the app was opened once online over HTTPS, when the iPad is in flight mode, then the app starts from the home screen and everything works, including both built in modules.
* **AC98 (v1, automated suite in v5):** Given the app runs, locally and on the deployed address, then it makes no network requests except loading its own files from its own address. The ship checklist confirms Cloudflare Web Analytics is off.
* **AC99 (v1, automated suite in v5):** Given the mute switch is on or sound is off in settings, then the game is fully playable and every right or wrong answer is still clear on screen.
* **AC100:** Given sound is on, then no sound plays before the first tap.
* **AC101 (iPad) (v5):** Given the reference iPad (2018 or newer, iPadOS 16 or newer) and the developer fps counter, when the founder walks around the world for 2 minutes with 12 shop dinos and 2 golden dinos following, then 95 percent of frames take 33 ms or less and no frame takes over 200 ms.
* **AC102 (v1, audit in v5):** Every button and tappable word has a tap area of at least 44 x 44 points. Kid screen text is at least 20 points, question text at least 24 points. Every text input in the parent area is at least 16 points, so Safari does not zoom.
* **AC136:** Given a save is cut off halfway (simulated in a test), when the app reopens, then the previous save loads.
* **AC137 (v4):** Given an unreadable save, when the app opens, then a friendly Dutch message shows with "Backup terugzetten" and "Opnieuw beginnen", no data is deleted without a double confirm, and no blank screen shows.
* **AC138 (v1, update at start in v4):** Given a save from the previous app version (test fixture), when the new version opens it, then everything loads. Given a new version is waiting, then it is applied only at app start, never during a break or exam.
* **AC139 (v4):** Given storage is full or refused (simulated), then the parent area shows a gentle note and play goes on without a crash.
* **AC140 (v4):** Given the app runs over plain http, then it starts and plays without errors, and the parent sees a note where sharing or offline is not available.
* **AC141 (v1, full audit in v5):** Given every kid screen, then normal text has a contrast of at least 4.5 to 1 and large text at least 3 to 1, also on the soft orange "wrong" colour, the grey malus text and the lock icon. Right and wrong always show an icon (check or cross) as well as a colour.
* **AC142:** Given the pulsing countdown and pop effects, then nothing flashes more than 2 times a second. Given `prefers-reduced-motion`, then the pulse is off and the countdown text still grows.
* **AC143 (iPad) (v1, iPad check in v5):** Given the reference iPad, then the stick, jump button, hotbar, countdown and lock icon sit inside the safe area, and the hotbar sits high enough that using it never triggers the home swipe.
* **AC144 (v4):** Given a wiped iPad (empty storage), when the app opens, then the first start flow shows, and after "Geef de iPad aan je kind" the world loads with no errors.

**Count:** AC1 to AC154 here, plus AC155 to AC165 for v2 in section 12. 6 are removed (AC13, AC14, AC15, AC19, AC32, AC33). 159 active criteria. 106 are v1 (some with a part in a later release). 53 belong to a later release: v2 has 24 (13 here, 11 in 12), v3 has 5, v4 has 8, v5 has 2, v6 has 5, v7 has 4, v8 has 5.

## 8. Look, sound and feel
* **Style:** bright, friendly Minecraft style pixel blocks with 16 x 16 pixel textures. Dinos are chunky and cute with big eyes, made of boxes. Eggs are spotted and wobble. Soft, still fog at the edge (no flicker). No blood, no scary sounds, no angry dinos.
* **Colours:** sky blue, grass green, warm sand. Right answers in green. Wrong answers in soft orange, never harsh red. The malus "-1 punt" is soft grey. Wool blocks are bright. Golden dinos shine gold. Text contrast as in AC141.
* **Motion:** the mining pop is a short burst of a few pixel bits, under half a second. The egg wobble and hatch take about 2 seconds. Nothing flashes more than 2 times a second. Reduced motion turns the pulse and the egg wobble off.
* **Learning screens:** calm, white or soft paper background, one question at a time, big text, a small dino teacher ("Dino Juf") in the corner. Lots of space. The teach moment looks like a friendly lesson card, not a red mark.
* **Exam screen:** even calmer: no dino animations, no sounds except a soft chime at the end. The review pages look like the teach moment card.
* **Dinowinkel:** bright and cheerful, four big egg cards side by side, the point total big at the top.
* **Parent area:** plain and clear, grey and white, normal sized text, works like a settings app. Forms are one column, inputs are at least 16 points, and the active field scrolls into view above the iPad keyboard. The parent area is the one place where normal scrolling is allowed.
* **Font:** one round, very readable font, bundled with the app so it works offline. Kid text at least 20 points, questions at least 24 points, and 25 percent bigger with Groter lettertype.
* **Words:** Dutch, short sentences, groep 5 reading level on kid screens. Kind and encouraging: "Bijna!", "Goed zo!", "Wat knap!". Never "Fout!" on its own. A wrong first try says "Net niet. Probeer het nog een keer." The teach moment says "Zo zit het:".
* **Sounds:** short and soft. A pop when mining, a thunk when placing, a chime for right, a gentle "hmm" for wrong, a coin clink when buying an egg, a crack and a happy chirp when an egg hatches, a fanfare for a passed exam. No sound for the malus. No music in v1.

## 9. Kid safety and privacy
* **Data stored and where:** only on this iPad, in Safari's storage for this app. Stored: settings, pincode (hashed), own modules, answer history, break and exam results, the world changes, the hotbar, dinos and eggs (with names the kid types), dino points. No real name, age, photo, location or contact data is asked for or stored. The dino name screen asks for a dino name, not the kid's name.
* **v1 as it is live now:** the rules below all hold for v1. v1 makes no files at all (backup comes in v3, module export in v8). Without the offline service worker (v4), v1 needs the internet to start and loads only its own files from `workers.dev`. Chickens and eggs are bought only with dino points. The automated safety suite that proves these rules is in v5; until then they are checked by reading the code and by the UI review.
* **Files:** backup and export files only leave the iPad when the parent shares them through the share sheet, behind the gate. Backups do not hold the pincode.
* **Network use:** only to load the app's own files from the public `workers.dev` address on first visit and for updates (F9). No other requests. No data is ever sent anywhere. The server holds only the app files, nothing about the kid. Cloudflare Web Analytics and any other Cloudflare injected script stay off.
* **Tracking, ads, chat:** none. No analytics, no cookies for tracking, no third party scripts or fonts from other servers.
* **Purchases:** none with real money. The Dinowinkel only uses dino points earned by learning. There is no payment code, no store link and no way to buy points.
* **External links:** none. Text in imported modules is shown as plain text and is never a link.
* **Parent gate:** a 4 digit pincode protects settings, content choice, own modules, import, export, backup, results, ending a break and stopping an exam. The lockout survives reloads. PIN vergeten uses a fresh two step grown up question with a 10 minute block after 2 wrong tries, sharing the lockout with the pin pad (F3, F4). The first pincode can only be set after the same kind of grown up question (decision 52). The lock shows only in the world (decision 53). From v2 it also shows on the exam screen, only to stop the exam (decision 61). Learning breaks have no lock.
* **Content:** all questions and lessons are original and kid friendly (dinos, nature, school, family). Nothing scary or violent. Taal content gets a human spelling check before release (AC124).
* **Breaks and malus:** the break is firm but kind. It has no time pressure, every question gets a second try, and a second mistake leads to a short lesson, not a scolding. The malus is 1 point, shown in soft grey, and the total never goes below 0. Mistakes never take away blocks, dinos or eggs.
* **Accessibility:** touch targets at least 44 points, readable text with good contrast, an optional bigger font, never only colour to show right or wrong (always a check or a cross icon too), works without sound and with the mute switch on, respects reduced motion.

## 10. Constraints
* **Platform:** Safari on iPad, home screen web app, landscape. Reference device: iPad 2018 or newer on iPadOS 16 or newer (F10). Tested in Playwright WebKit with an iPad profile, plus a real iPad check at every milestone. Checks marked (iPad) in section 7 can only be done on the real device.
* **Hosting:** static files on Cloudflare Workers (`wrangler.jsonc` with assets in `./dist`), free plan, at the public `<app>.<account>.workers.dev` address (F9). No Worker code, no KV, D1 or R2. Every deploy is a founder action at `/ship`.
* **HTTPS:** Safari only allows the offline service worker, file sharing and persistent storage over HTTPS. Testing on the local network (`npm run dev -- --host`) works for play, but install, offline and the share sheet need the deployed HTTPS address. The founder deploys a test build when those checks are due.
* **Budget:** free. No paid services, no accounts, no API keys. Fonts and sounds must be free to use (for example CC0) or made by us.
* **Offline:** everything works offline after the first visit.
* **Size:** the first download should stay under 5 MB so it loads fast on home wifi.
* **Storage:** keep a year of history small enough to stay well under Safari's limits. The architect picks the storage (IndexedDB is expected).
* **Performance:** see AC101 on the reference iPad. Small world, merged block faces, one texture atlas, no shadows, pixel ratio capped at 2. Glass and leaves use simple cut out textures. The first world task is a speed spike on the reference iPad with a written go or no go; the fallback is a 48 x 48 world.
* **Content:** the Taal module in `docs/modules/cito-taalverzorging/` is complete (10 topics, 288 items, 4 exams) and validates. The module format may be adapted by the architect (decision 6), but built in and parent made modules use the same format. Only built in code modules (Rekenen) use the `generator` field. Lesson pages get an optional `skill` field for the teach moment.

## 11. Risks and decisions

### Decided
The decisions F1 to F15 are answered. Details are in `docs/DECISIONS.md` (rows 8 to 22). The recut questions D1 to D3 are answered too (rows 59 to 61). There is no open founder question.

| # | Question | Founder's answer | Where in this PRD |
|---|---|---|---|
| F1 | v1 size | Everything ships together in v1, no v1a or v1b split. Replaced by decision 57 on 2026-10-19. | 4.0 |
| F2 | How a break ends | Only when all questions are done. Wrong: one retry. Wrong again: teach moment, malus, move on. No break time limit. Exams keep their time limit. | 4.4, 4.5, AC31, AC145 to AC148 |
| F3 | Parent gate type | 4 digit pincode | 4.12 |
| F4 | PIN vergeten | Fresh two step grown up question, 10 minute block after 2 wrong tries, shared lockout | 4.12, AC75 |
| F5 | Rewards | All dinos earned through learning: points buy eggs in the Dinowinkel, bigger dinos cost more. All blocks free from the start. No wild dinos, no taming. | 4.1, 4.3, 4.5 |
| F6 | Zero effort | A break with 0 right gives no plus points. Extra oefenen earns at most 10 points a day. | 4.5, 4.7, AC116, AC120 |
| F7 | Golden egg at 12 dinos | Golden dinos do not count toward the 12 | 4.3, AC111 |
| F8 | Exam result for the kid | Score with a kind message and a full review of every mistake. Details also in the parent area. | 4.11, AC153 |
| F9 | Hosting | Public `workers.dev` address. Deploying is a founder action at `/ship`. | 4.19, 10 |
| F10 | Reference iPad | iPad 2018 or newer, iPadOS 16 or newer | 2, 10, AC101 |
| F11 | Rekenen scope | Plus, minus, tafels, delen as in 4.10 | 4.10 |
| F12 | App name | Dino Blokwereld as working title. The kid may rename it later. | Title, 5 |
| F13 | Small scope changes | "Snel geklikt" mark in v1. "Groter lettertype" stays in v1. | 4.16, 4.17, AC92, AC154 |
| F14 | Malus in Extra oefenen | No malus in Extra oefenen. Malus only in learning breaks. | 4.7, AC52 |
| F15 | Dino kinds and prices | Compy 20, Triceratops 40, Stegosaurus 40, Brachiosaurus 80 | 4.3, AC149 |
| D1 | Which release comes next (row 59) | v2 Gouden ei is next and ships as 0.2.0. Then v3 Dino's veilig. T65 was not pulled in. | 5, 12 |
| D2 | The first start flow (row 60) | Keep it as a new task in v4 Altijd spelen. | 4.19, 5 v4, Flow 1 |
| D3 | How the parent stops an exam (row 61) | A small grey lock on the exam screen only opens the parent gate to stop the exam. Learning breaks stay without a lock. This narrows decision 53 for exams. | 4.0, 4.11, 4.12, 9, 12, AC155 to AC158 |

Choices made by product inside these answers, which the founder sees when signing: the point values (+2, +1, -1, +3 bonus) and egg prices (20, 40, 40, 80); a fourth small dino kind (Compy) so there is a cheap first egg (confirmed by the founder, F15); no malus in Extra oefenen (founder, F14); only the first try counts for spaced repetition; exams give no points; "Wereld opnieuw beginnen" keeps dinos and points.

**Decided during the build** (`docs/DECISIONS.md` rows 44 to 57, all built into v1 as listed in 4.0): sky height 64 and camera arrows (44), visible countdown (45), floating with Omhoog and Omlaag (47), Nu oefenen (48, 56), the shop layout (49), Gemini's build is the truth (50), Stoppen in Extra oefenen (51), grown up question before the first pincode (52), lock in the world only (53, replaces 46), home screen first (54), chickens for 5 points, at most 10 (55), and the v1 recut (57). The founder requests CR1 to CR4 (32 blocks, the obsidiaan gate, chickens, lava) are recorded as decision row 58. Signing this PRD confirms them as part of v1.

**Decided for the recut and v2** (rows 59 to 61): see D1 to D3 in the table above.

### Open founder decisions
None.

### Risks
| Risk | Effect | What we do |
|---|---|---|
| 3D is too slow on the reference iPad | Stutter, the game is not fun | Speed spike as the first world task, measured on the real iPad with a go or no go. Small world, merged faces, no shadows. Fallback 48 x 48. |
| Safari drops the 3D view after the background | Black screen | Rebuild the view on context loss (AC109). |
| Safari wipes the storage or iOS kills the app | Lost world, dinos and progress | v1: eager small saves, safe writes, home screen install. v3: backup file. v4: persistent storage, broken save screen, reminder after 30 days. Until v3 ships there is no way back after a wipe. |
| Features missing on plain http | Gate, sharing or offline fail in local tests | Built in pincode hash, fallbacks with a parent note, real checks on the deployed HTTPS address. |
| The iPad keyboard autocorrects spelling | Typing questions become useless | Own on screen keyboard (4.8). |
| Forced breaks make the kid angry | Kid stops playing | Short breaks, no time pressure, a second try, kind words, a clear goal (the next egg), the parent can tune interval and question count. |
| A break with no time limit drags on | Kid feels stuck | Every question ends after at most two tries and a teach moment, so a break always moves forward. The parent can end a break. |
| The malus feels unfair | Kid feels punished | Only 1 point, soft grey, never below 0, never takes dinos or blocks. Watch it in the first week. |
| Point values or egg prices feel off (too slow or too fast) | Boring or too easy | Values are in one place in the code. Changing them after playtesting is a small change the operator brings to the founder. |
| Unlimited free blocks make building less special | Less reason to learn | The learning goal is now the dinos. Blocks are for creativity. |
| The Taal content has mistakes | Wrong spelling is taught | Validator with content checks, human check by QA and the founder (AC124), the parent can switch off any skill. |
| The parent editor is fiddly on an iPad | The parent gives up on own modules | One column forms, Probeer preview, import of JSON made elsewhere as a backup path. Built late in the suggested order. |
| Share sheet behaves differently in home screen mode | Backup or export fails | Test on the real iPad on the deployed address. Fallback: open the file in a new view and share from there. |
| Scope was large (one v1, about 70 tasks) | Long build, nothing shipped | Recut by decision 57: the live build is v1, the 25 open tasks are 7 small releases in section 5, shipped one at a time. |
| 3D speed on the iPad was never measured | Stutter with many dinos | The speed spike (T32) is in v5. The kids already play, so stutter they notice moves v5 up. |

## 12. Releases

One section per release the founder picked at `/release`. Each one ships on its own.

### v2 Gouden ei (0.2.0)

**Status:** next. Picked by the founder (decision 59). Ships as 0.2.0.

**Goal:** "Pass a practice exam and a golden dino hatches next to me. And I can open the Dinowinkel with one tap, and Pauze always works."

**In:**
* Exams as in 4.11: the parent starts one, the kid sees the calm exam screen, the end screen and "Bekijk je fouten".
* The golden egg and golden dino from 4.3. Golden dinos do not count toward the 12 (F7).
* The exam timer from the timer matrix in 4.4.
* Exam answers move the boxes, with one try only (4.6).
* The four Taal practice exams (4.9) and the four Rekentoets exams (4.10), from the exam definitions that already exist in the modules.
* The parent Examens screen: pick a module and an exam, the "te weinig vragen" warning, "Beëindig eerst de pauze" during a break.
* "Pauze nu starten" greyed out during an exam (4.17).
* New (decision 61): a small grey lock on the exam screen only. It opens the parent gate, and after the right pincode the parent can stop the exam.
* New (decision 73): a Winkel button "🥚 Winkel" in the world top bar, next to Pauze and the same size. It opens the Dinowinkel directly. The Dinowinkel stays in the pause menu too.
* New (decision 73, bug the kids hit): Pauze and Winkel open at once on a tap, without waiting for saved data. The points fill in when they are read.
* Version 0.2.0 and a kid readable entry in `CHANGELOG.md`.

**Out:**
* A lock on learning breaks, lessons, summaries, overlays, the exam end screen or the review. Decision 53 still holds there.
* The Examens list in Resultaten (v6). The result is saved now (AC69), so v6 can show it later.
* Own exams for parent made modules (v8).
* Exams across modules, timed learning breaks (Later).

**How the exam lock works (decision 61):**
* The lock looks like the lock in the world: small, grey, top right, a tap area of at least 44 x 44 points inside the safe area.
* It shows only while exam questions are on screen.
* Tapping it opens the same pin pad, with the same shared lockout and PIN vergeten (4.12). The exam timer stops while the gate is open (4.4).
* After the right pincode the parent sees a small card "Examen stoppen?" with "Stoppen" and "Terug naar het examen". The rest of the parent area is not reachable from here. The parent uses the lock in the world for that.
* "Stoppen" saves the exam as "gestopt", gives no egg, shows no review and takes the kid back to the world with a full play timer.
* "Terug naar het examen", or "Terug" on the pin pad, returns to the same question with the same answer typed so far and the same time left.

**Plan tasks:** T39 (exam logic), T51a (kid exam screen, end screen, review, golden egg, and the exam lock with its pin pad hook), T51b (parent Examens screen, the "Examen stoppen?" card and the stop). The architect may split the lock into its own task T51c if T51a gets too big. T51e (Winkel button and instant Pauze, decision 73). That is 4 or 5 tasks.

**Acceptance criteria.** The existing v2 criteria in section 7 hold as written: AC64, AC65, AC66, AC67, AC68, AC69, AC70, AC71, AC72, AC111, AC112, AC115, AC153, and the exam part of AC125. AC127 also holds for the exam lock. New for v2:

* **AC155 (v2):** Given an exam is running with a question on screen, then a small grey lock shows in the top right corner, with a tap area of at least 44 x 44 points fully inside the safe area. When the kid or parent taps it, then the pin pad of the parent gate opens.
* **AC156 (v2):** Given a learning break, a lesson, a break summary, Extra oefenen, the exam start screen, the exam end screen or the review is on screen, then no lock and no parent button shows. Given the world, then the lock shows as in v1.
* **AC157 (v2):** Given the pin pad was opened from the exam lock, when the right pincode is typed and the parent taps "Stoppen", then the exam is saved as "gestopt", no golden egg appears, no review shows, and the kid is in the world with the play timer at the full interval. Given the app is closed and reopened after that, then the world shows, not the exam.
* **AC158 (v2):** Given an exam on question 9 with 20:00 left and an answer typed but not checked, when the pin pad is opened from the exam lock and then closed with "Terug", or the right pincode is typed and "Terug naar het examen" is tapped, then the exam shows question 9 with the same typed answer and 20:00 left, plus or minus 1 second, however long the gate was open. Given 3 wrong codes, then the gate blocks for 1 minute with the same shared lockout as the world lock (AC74), and the exam stays on question 9 with no time lost.
* **AC159 (v2):** Given the v2 build, then `package.json` has version 0.2.0 and `CHANGELOG.md` has a 0.2.0 entry in kid readable words that names the exams and the golden dino.
* **AC160 (v2):** Given the world is on screen, then a "🥚 Winkel" button shows in the top bar next to Pauze, with the same size as Pauze and a tap area of at least 44 x 44 points. Given a learning break, a lesson, a break summary, Extra oefenen, an exam screen, the pause menu, the pin pad, the parent area or any other overlay is on screen, then the Winkel button does not show.
* **AC161 (v2):** Given the world, when the kid taps "🥚 Winkel", then the Dinowinkel opens directly. When the kid closes the Dinowinkel, then the world shows again, not the pause menu. Given the pause menu, then the Dinowinkel can still be opened from there as in v1.
* **AC162 (v2):** Given the world at 1024 x 768, 1180 x 820 and a 1024 x 690 Safari tab, in landscape, then the Winkel button does not overlap the countdown, the Pauze button or the small lock, and all of them sit inside the safe area.
* **AC163 (v2):** Given the world and saved data that is slow (takes 3 seconds or more) or not available, when the kid taps Pauze once with one finger, then the pause menu opens within 300 ms. The points show a placeholder until they are read and then show the real total.
* **AC164 (v2):** Given the world and saved data that is slow or not available, when the kid taps "🥚 Winkel" once with one finger, then the Dinowinkel opens within 300 ms with a placeholder for the points. Its points and buy buttons fill in when the data is read. Given the points are not read yet, then no "Kopen" button can be tapped and no egg can be bought.
* **AC165 (iPad) (v2):** Given the founder's iPad with the game opened from the home screen icon, when the kid taps Pauze, then the pause menu opens, and when the kid taps "🥚 Winkel", then the Dinowinkel opens. Both work on the first tap.

**Check before shipping:** a real iPad check of one full Taal exam and one Rekentoets in home screen mode: the lock is easy for a parent to find and hard to hit by accident, the golden egg hatches in the world, and closing the app mid exam continues it (AC71). The founder also checks on the real iPad, from the home screen icon, that Pauze and Winkel open on the first tap (AC165).
