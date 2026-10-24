# PRD: Dino Blokwereld (working title)

Status: APPROVED by Founder on 2026-10-24

This signoff archives the shipped v9 Eerlijke punten (0.3.0) to `docs/releases/v9.md` with its criteria AC166 to AC171 now in force in section 7, and scopes v10 Punten voor elke ronde (0.4.0, decision 92) in section 12.

## 1. Summary
Dino Blokwereld is a small 3D block world on the iPad where a kid explores, mines and builds with Minecraft style blocks. Every few minutes the game pauses for a short learning break in Rekenen or Taal. Right answers earn dino points. In the Dinowinkel the kid buys dino eggs with those points, and the eggs hatch into friendly blocky dinos that walk around in the world. A passed practice exam gives a golden dino.

The parent decides what gets asked, starts practice exams and follows progress. New lessons and questions are added as modules with the `/module` skill (decision 79). Everything stays on the iPad.

## 2. Users
* **Player:** one kid, age 8 to 10 (groep 5 to 7), plays alone. Reads Dutch at about groep 5 level.
* **Parent:** sets up the app, picks the learning content, starts exams, reads the results. Uses the same iPad, behind a parent gate.
* **Language:** all text in Dutch, for kid and parent screens.
* **Device:** iPad in Safari, added to the home screen. Touch only. Reference device: an iPad from 2018 or newer on iPadOS 16 or newer (F10).
* **Orientation:** landscape only, for both the game and the parent area. In portrait the app shows a big "Draai je iPad" picture and nothing else. iOS ignores the manifest orientation, so this message is the only mechanism.

## 3. Goals and success
The founder will feel it worked when:
1. The kid asks to play again the next day, on most days of the first two weeks.
2. The kid finishes at least 4 out of 5 learning breaks without a parent having to step in.
3. After 4 weeks the parent screen shows the percentage right going up for at least half of the topics the kid practised.
4. A new set of questions (for example this week's spelling words) becomes a module with `/module` in one short session.
5. The parent opens the results screen at least once a week because it is useful, not because they have to.
6. The kid saves up for a dino on their own and talks about which egg to buy next.
7. The game feels smooth on the family iPad: no stutter while walking, no lost saves.

## 4. What the app is today (v1 0.1.0, v2 0.2.0 and v9 0.3.0)

### 4.0 What is live (decisions 57 and 80)
The live build is v1 (0.1.0) plus v2 Gouden ei (0.2.0) plus v9 Eerlijke punten (0.3.0, shipped 2026-10-22), on `main` and on the Cloudflare Worker `minespel`. Refactor round R1 (2026-10-24) changed no rule in this file. The v9 section is archived in `docs/releases/v9.md`; its rules are in 4.0, 4.5 and 4.7 and its criteria in section 7. Decision 57 replaces F1 ("everything ships together"). Features that are not built yet wait in small releases in `docs/BACKLOG.md`. Their text stays below so nothing is lost. Each waiting part is marked "Moved to vN". Parts the founder dropped are marked "Dropped (decision 79)". The shipped v2 section is archived in `docs/releases/v2.md`; its rules are in this section and its criteria in section 7.

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

**v2 adds (0.2.0, decisions 59, 61 and 73):**
* Exams as in 4.11, with the end screen and "Bekijk je fouten". The four Taal exams and the four Rekentoets exams.
* The golden egg and golden dino (4.3), the exam timer (4.4), exam answers move the boxes (4.6).
* The parent Examens screen with the "te weinig vragen" warning and "Beëindig eerst de pauze". "Pauze nu starten" is greyed out during an exam.
* The exam lock, the Winkel button and the instant Pauze, with the rules below.

**Where each subsection stands:**

| Subsection | Status |
|---|---|
| 4.1 The world | live (v1) |
| 4.2 Moving and building | live (v1) |
| 4.3 Dinos, points, Dinowinkel | live. The golden dino came with v2. |
| 4.4 Timers | live. The exam timer came with v2. |
| 4.5 Learning break | live (v1) |
| 4.6 Spaced repetition | live. Exam answers move boxes since v2. |
| 4.7 Lessons and practice | live (v1) |
| 4.8 Answer types | live (v1) |
| 4.9 Taal module | live, exams since v2. The human content check (T65) runs beside the next release (decision 81). |
| 4.10 Rekenen module | live, Rekentoets exams since v2. |
| 4.11 Exams | live (v2) |
| 4.12 Parent gate | live. The full automated route test moved to v5. |
| 4.13 Inhoud kiezen | live. The "geen vragen" warning in the parent area moved to v4. |
| 4.14 Eigen modules | Dropped (decision 79) |
| 4.15 Import, export, backup | Backup moved to v3. Module import and export dropped (decision 79). |
| 4.16 Resultaten | Moved to v6 (v1 has the simple break list only) |
| 4.17 Instellingen | live core. Punten comes with v10, the next release (section 12). Volume, Alles wissen and the app version moved to v3. |
| 4.18 Saving | live core. Broken save screen, storage notes and persistent storage moved to v4. |
| 4.19 App basics | live core. Offline, one window, plain http notes and the first start flow moved to v4. |

**v1 changes since the 2026-10-17 PRD.** These founder decisions and requests are built and live. Where the text in 4.1 to 4.19 says something else, this list wins.
* **Sky height 64** (decision 44). The world is 64 blocks high, not 32.
* **32 building blocks** (founder request CR1, see `docs/STATUS.md`). The 16 blocks from 4.1 plus obsidiaan, vuur, lava, mossteen, zandsteen, graniet, marmer, basalt, diepsteen, vuursteen, goudsteen, diamant, water, ijs, sneeuw and wol oranje. All free and unlimited. Alle blokken has category filters and a row to pick which of the 8 slots to fill. Water, vuur and lava are blocks only. They never hurt the player (there is no health).
* **Obsidiaan gate** (CR2) and **lava** (CR4). Four obsidiaan blocks lie in front of the start spot, with steen and vuursteen beside them. Building obsidiaan up on the left and right and placing vuur lights the gate. The start hotbar holds obsidiaan, vuur and lava.
* **Floating** (decision 47). Omhoog lifts the player into the sky. On release the player stays floating and can walk and build in the air. Omlaag goes down. Touching the ground ends floating. This replaces "No flying in v1" in 4.2.
* **Camera arrows** (decision 44). Four buttons ▲ ▼ ◀ ▶ turn the view smoothly, next to the look drag.
* **Nu oefenen** (decisions 48 and 56). A button on the countdown, in Extra oefenen, in the Lesboek and in the Dinowinkel starts a learning break right away. **From v10 (decision 92):** a Nu oefenen break pays like any break (+2, +1, +3 bonus, and the minus points of the Punten setting in 4.17), every round, with no day limit. The 10 extra points a day of decisions 48 and 56 are dropped. Until 0.4.0 ships, the live build still shares 10 extra points a day between Nu oefenen and Extra oefenen and has no malus (v9).
* **Stoppen in Extra oefenen** (decision 51). Every Extra oefenen question has a Stoppen button. Points earned so far stay. Learning breaks still cannot be stopped by the kid.
* **Chickens** (decision 55). The Kippenhok in the Dinowinkel sells one chicken at a time for 5 points, bought with Ja or Nee like an egg, points and chicken saved together. At most 10 chickens. They do not count toward the 12 dinos.
* **Shop layout** (decision 49, `docs/SHOP_PRD.md`). Species cards, progress bars toward the price, the herd counter and the "Mijn Dino-verzameling" list.
* **First pincode** (decision 52). Before the first pincode can be set, a grown up sum in words must be answered, like PIN vergeten. A kid tapping the lock cannot set it. The first start flow in 4.19 is not built. The founder kept it as a new task in v4 (decision 60).
* **Lock only in the world** (decision 53). A small grey lock shows in the world only. No lock on break, exam or overlay screens. No labelled "Ouders" button. This replaces "on every kid screen" in 4.12. From v2 the same small lock also shows on the exam screen, only to stop the exam (decision 61). Learning breaks stay without a lock.
* **Home screen first** (decision 54). The design floor is the home screen app at 1024 x 768. In a Safari tab (about 690 high) tall kid screens may scroll inside their card.
* **Folder modules** (decisions 76 and 77). Every module folder in `docs/modules/` loads as a built in module, for example Taal E6, Leestekens and 't Kofschip. New lessons and questions come through the `/module` skill on the content release path (CLAUDE.md, decision 79). They follow the module format and `validate.py`, like 4.9.

**v2 rules.** Built and live in 0.2.0. Where the text in 4.1 to 4.19 says something else, this list wins.
* **Exam lock** (decision 61). It looks like the lock in the world: small, grey, top right, a tap area of at least 44 x 44 points inside the safe area. It shows only while exam questions are on screen. Tapping it opens the same pin pad, with the same shared lockout and PIN vergeten (4.12). The exam timer stops while the gate is open (4.4). After the right pincode the parent sees a small card "Examen stoppen?" with "Stoppen" and "Terug naar het examen". The rest of the parent area is not reachable from here. "Stoppen" saves the exam as "gestopt", gives no egg, shows no review and takes the kid back to the world with a full play timer. "Terug naar het examen", or "Terug" on the pin pad, returns to the same question with the same answer typed so far and the same time left. No lock on learning breaks, lessons, summaries, overlays, the exam end screen or the review.
* **Winkel button** (decision 73). A "🥚 Winkel" button in the world top bar, next to Pauze and the same size, opens the Dinowinkel directly. Closing it returns to the world. The Dinowinkel stays in the pause menu too.
* **Instant Pauze** (decision 73). Pauze and Winkel open at once on a tap, without waiting for saved data. The points fill in when they are read. No egg can be bought before the points are read.

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
**Status: live**, with chickens (4.0). The Gouden dino bullet came with v2.
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
  * When the kid has 12 shop dinos (eggs that have not hatched yet count too, golden dinos and chickens never count), every Kopen button is greyed out and the shop says "Je hebt al 12 dino's! Wat een kudde."
  * The shop uses only dino points. There is no real money, no payment screen and no link anywhere.
* **Eggs:** after buying, the kid goes back to the world and the egg appears on the ground next to the player. It wobbles and hatches after 5 seconds of play into a baby sized version of that dino, which then grows to full size in 2 seconds. The new dino starts on **Volg mij**. A bought egg is saved right away, so closing the app never loses the egg or the points.
* **Dino menu:** tapping a dino opens a small menu: **Volg mij**, **Blijf hier**, **Naam geven** (kid types a name with the in game keyboard, max 12 characters), **Knuffel** (hearts, no cost). The name screen says "Bedenk een leuke dinonaam" so the kid does not type their own name.
* **Simple on purpose:** dinos walk straight toward their goal and can hop up one block. They never walk into or through any block. No path finding. A dino on Blijf hier idles and wanders a little within 3 blocks of where it was told to stay. A dino the kid walls in stays there (building a pen is fine). Dinos never hurt the kid and never break or place blocks.
* **Following:** a dino on Volg mij walks toward the player. A following dino that is stuck for more than 5 seconds, or more than 8 blocks away for more than 5 seconds, pops next to the player with a little puff.
* **At most 12 dinos** bought in the shop (hatched or still an egg).
* **Gouden dino:** passing a practice exam gives a golden egg. When the kid is back in the world, the egg appears next to the player and hatches like a normal egg into a golden version of a random dino kind (same model, gold colour). Golden dinos do not count toward the 12 (F7), so a passed exam always pays. Golden dinos have the same menu as other dinos.
* Dinos are never taken away. No wrong answer or reset removes a dino or an egg.

### 4.4 Timers
**Status: live**, with Nu oefenen (4.0). The exam timer column came with v2.
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
**Status: live**, with honest point banners and one egg hint rule from v9 (decisions 84 and 87). v10 (decision 92) drops the day limit and brings back minus points, set by the parent with Punten (4.17). Where this text says v10, the live build follows it once 0.4.0 ships.
* A calm full screen with a dino teacher character ("Dino Juf") and a progress row of dots, one per question. There is no break countdown.
* Each break uses one module. Modules take turns by smooth weighted round robin on the parent's Vakverdeling weights (default: equal turns for Rekenen and Taal). The turn state is saved across restarts. A module with no usable items is skipped and the turn goes to the next module.
* If a topic is new for the kid, the break starts with that topic's lesson (see 4.7), then the questions.
* **Each question goes like this:**
  1. The kid answers. **Right on the first try:** a green check, a happy sound, "+2 punten". The kid taps "Verder". Every banner shows the points the kid really gets, plus or minus (v9). From v10 there is no day limit, so a right answer always shows and gives its full points.
  2. **Wrong on the first try:** a soft orange cross and "Net niet. Probeer het nog een keer." On Moeilijk (v10) it also shows "-1 punt". The right answer is not shown. The same question shows again, cleared, and the kid answers once more.
  3. **Right on the retry:** a green check, "Goed zo! +1 punt". The kid taps "Verder".
  4. **Wrong on the retry:** a **teach moment**. The screen shows "Zo zit het:" with the right answer, the item's `explain` text, and a short piece of teaching:
     * For a Taal item or a parent made item: one page of the topic's lesson. If a lesson page is linked to the item's skill, that page shows; otherwise the first page of the topic lesson. The architect adds an optional `skill` field to lesson pages for this.
     * For a Rekenen item: a worked example of this exact sum, step by step, using the topic's strategy (for example 7 x 8 = 7 x 4 + 7 x 4 = 28 + 28 = 56).
     * The points line follows Punten (v10): on Normaal and Moeilijk it shows "-1 punt" in soft orange, on Makkelijk it shows no points line. When the total is already 0, nothing is taken and no minus shows. The kid taps "Ik snap het" and the break moves on to the next question.
* **Points (F5, F6, decision 92).** The same in timed breaks, Pauze nu starten, Nu oefenen breaks and Extra oefenen (no bonus there). Exams never give or take points.

| What happens | Makkelijk | Normaal (default) | Moeilijk |
|---|---|---|---|
| Right on the first try | +2 | +2 | +2 |
| Wrong on the first try | 0 | 0 | -1 |
| Right on the retry | +1 | +1 | +1 |
| Teach moment (wrong on the retry) | 0 | -1 | -1 |
| Every question of the break right on the first try | +3 bonus | +3 bonus | +3 bonus |

  * Until 0.4.0 ships, the live build has the Makkelijk column only (no malus since v9).
  * The total never goes below 0. A minus takes only what is there, and the banner shows what was really taken. Nothing else in the app takes points away, except buying an egg or a chicken. Dinos, eggs and chickens are never taken away.
  * A break with 0 right answers (no right on the first try and none on the retry) gives no plus points.
  * No day limit (v10): every break and every round of Extra oefenen pays in full, as often as the kid plays.
* Only the first tap or Klaar of each try counts. A double tap or two fingers on two buttons in the same moment count as one answer. "Verder", "Ik snap het", "Klaar" and "Terug naar de wereld" also act once.
* **The break ends only when every question is done** (right on the first try, right on the retry, or after a teach moment). Nothing else ends it, except the parent with "Pauze nu beëindigen". Questions not done when the parent ends a break are logged as "niet beantwoord". They give no points and do not change the spaced repetition boxes.
* **Summary screen:** the score ("4 van de 5 goed!", counting right on the first try or the retry), the points really earned in this break (plus and minus added up, so it can be "-1 punt" or "0 punten") and the new total. From v10 there is no "Genoeg geoefend voor vandaag" line. When the kid can now buy an egg, it adds "Je kunt een ei kopen in de Dinowinkel!". **Egg hint rule (v9, decision 84):** the same rule after a break, after Extra oefenen and for the Kopen button: fewer than 12 shop dinos (hatched or still an egg) and enough points for at least one egg. Golden dinos and chickens never count.
  * With 0 right: a kind message ("Dit was lastig. Volgende keer gaat het vast beter!") and the total, with no plus points.
* After the summary the kid taps "Terug naar de wereld" and play resumes with a full play timer.
* If the app is closed during a break, reopening it continues the same break at the same question and the same try (first try, retry or teach moment), with the same questions.

### 4.6 Choosing the questions (spaced repetition)
**Status: live.** The exam rule in the last paragraph came with v2.
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
6. If no module has usable items, the break shows a friendly message for the parent ("Er staan geen vragen aan. Vraag papa of mama om vragen te kiezen.") and ends after 10 seconds with no points. The parent area shows a warning about this.

Answers in exams and in Extra oefenen also move the boxes the same way. Exams ignore the parent's switches (see 4.11). In an exam there is only one try.

### 4.7 Lessons and practice
**Status: v1**, with Stoppen in Extra oefenen (4.0).
* Every topic has a lesson: a few short pages with a title, a short text, good and wrong examples, and a tip. The kid swipes or taps "Volgende" through them. The last page has "Ik snap het!".
* A lesson shows automatically in a break the first time new items of that topic are asked.
* **Lesboek:** from the pause menu the kid can open any lesson of any switched on topic at any time. Reading the Lesboek does not change the timers or the points.
* **Extra oefenen:** from the pause menu the kid can start a practice round of N questions from a module of their choice, picked with the same rules as 4.6. Each question works like in a break: retry, teach moment and the same points, with the same Punten setting (v10, decision 92, replacing F14). From v10 there is no day limit: every round pays in full, and "Genoeg geoefend voor vandaag, ga lekker bouwen!" is gone. Until 0.4.0 ships, the live build still caps Extra oefenen at 10 plus points a day (F6). The banners and the summary show only the points really earned, as in 4.5. The egg hint follows the rule in 4.5. The +3 bonus does not apply in Extra oefenen. It stops the play timer while open and does not reset it, so it never replaces a learning break.

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
**Status: live.** The four practice exams came with v2. The human check (T65) runs beside the next release (decision 81, see `docs/BACKLOG.md`). The content checks in `validate.py` are done.
* The module in `docs/modules/cito-taalverzorging/`, as written there. Ten topics in this teaching order: ww-tegenwoordig, ww-verleden, klanken, woordvormen, leenwoorden, trema-koppelteken, hoofdletters, komma, apostrof, leestekens.
* Levels M6, E6, M7 and E7. Every topic has a lesson and at least 6 items per level.
* Four practice exams: Oefenexamen M6, E6, M7 and E7, as defined in its `module.json`.
* All items are original, written in Cito and IEP style. No real test items are copied (decision 7).
* `python3 docs/modules/validate.py docs/modules/cito-taalverzorging` prints OK today. `./scripts/check.sh` runs `validate.py` on every module folder in `docs/modules/`, so it stays OK.
* **Content checks** added to `validate.py`: no `choice` item has two equal options, no two items in a module share the same prompt and sentence, every `type` item has at least one accepted answer, no sentence longer than 15 words at M6 and E6 or 20 words at M7 and E7. Items that fail are fixed before release.
* **Human check:** QA reads 5 items per topic against woordenlijst.org, and the founder (or a teacher) reads a sample of 20 items, also looking for commas that are optional in Dutch. The result goes in `docs/TEST_REPORT.md`.

### 4.10 Built in module: Rekenen basis (modest, generated) (F11)
**Status: live.** The four Rekentoets exams came with v2.
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
**Status: live since v2.**
* The parent starts an exam from the parent area: pick a module, pick one of its exams. The app checks there are enough items and warns if not ("Te weinig vragen voor dit examen, het examen krijgt er 22 in plaats van 30").
* An exam cannot start while a learning break is running. The parent sees "Beëindig eerst de pauze".
* Questions are picked per topic by the `mix` weights, from items at the exam `levels`. Parent switches for topics and skills are ignored in an exam, so the exam always matches its blueprint.
* The kid sees a calm exam screen: question number ("Vraag 7 van 30"), the time left if there is a time limit, no right or wrong feedback during the exam, no retry, no teach moment, no going back. Exams keep their own time limit.
* Exams give no dino points and take none away. The only reward is the golden egg.
* The play timer is stopped during the exam. No learning break interrupts an exam.
* The exam ends when all questions are answered or the time runs out. Unanswered questions count as wrong. If the time runs out while the kid has typed or marked an answer but not tapped Klaar, that answer is checked as given.
* **End screen:** the kid sees the score and a kind message. Passed: "Geslaagd!" and the golden egg (4.3). Not passed: "Goed geoefend! De vragen die nog lastig zijn komen terug in je pauzes."
* **Review:** below the score a button "Bekijk je fouten" opens a review of every question the kid got wrong or left open, one per page: the question, the kid's answer (or "niet beantwoord"), the right answer and the item's `explain` text. The kid pages through with "Volgende" and closes with "Klaar". With no mistakes the button is not shown and the screen says "Alles goed!". The review shows no points.
* The same details stay in the parent area (4.16, Examens).
* An exam counts as a learning break: after it, play resumes with a full play timer.
* The kid cannot leave an exam. The parent can stop it through the parent gate: a small grey lock on the exam screen opens the gate, and after the right pincode the parent can stop the exam (decision 61, details in 4.0 under v2 rules). A stopped exam is saved as "gestopt", gives no egg and shows no review.
* If the app is closed during an exam, reopening continues the exam with the same questions and the same time left. If it is closed on the end screen or in the review, reopening shows the end screen again.

### 4.12 Parent gate (F3, F4)
**Status: live**, with the grown up question before the first pincode (decision 52) and the lock in the world only (decision 53). Since v2 the lock also shows on the exam screen, only to stop the exam (decision 61). The automated test of every route moves to v5 (see `docs/BACKLOG.md`).
* At first start the parent sets a 4 digit pincode (typed twice).
* A lock icon sits in the top right corner of the world, and from v2 on the exam screen (decisions 53 and 61). There is no lock on learning breaks or overlay screens. It looks small and grey, but its tap area is at least 44 x 44 points, inside the safe area and outside the look drag zone. Tapping it asks for the pincode.
* Three wrong codes block the gate for 1 minute. The wrong try count and the block are saved, so a reload or closing the app does not reset them.
* The pincode is stored as a hash made with a small built in function, so the gate also works on plain http on the home network. This only hides the code from casual eyes; a 4 digit code is not real security.
* **PIN vergeten:** shows a fresh two step grown up question in words each time (for example "Neem zeven keer acht en trek daar negentien van af. Schrijf het antwoord in cijfers."). A right answer lets the parent set a new pincode. After 2 wrong answers, PIN vergeten is blocked for 10 minutes. Wrong tries here and on the pin pad share one saved lockout, so switching between them does not reset anything.
* Leaving the parent area returns the kid to where they were.
* No route reaches a parent screen without the gate: not the URL hash, the back button, a reload or the browser history.

### 4.13 Parent area: what gets asked (Inhoud kiezen)
**Status: live.** The "Er staan geen vragen aan" warning at the top of the parent area is moved to v4 (see `docs/BACKLOG.md`).
* A tree: subject (Rekenen, Taal) > module > topic > skill. Every node has an on/off switch. Switching a node off switches off everything under it.
* Levels: a row of level checkboxes per module. A topic can override the module levels ("Eigen niveaus voor dit onderwerp").
* Each line shows how many items are switched on and how many are beheerst, so the parent sees the effect right away.
* If nothing is switched on, the top of the parent area shows a warning: "Er staan geen vragen aan. Je kind krijgt lege pauzes."
* **Vakverdeling:** a weight per switched on module (1 to 5, default 1) that sets how often each module gets a break.
* A quick preset at the top: "Groep 6 midden", "Groep 6 eind", "Groep 7 midden", "Groep 7 eind". A preset switches on that level and the levels below it for both built in modules.

### 4.14 Parent area: own modules (Eigen modules)
**Status: Dropped (decision 79).** New lessons and questions come through `/module` as folder modules.

### 4.15 Parent area: import, export and backup
**Status: Moved.** File header, sharing files, Backup maken and Backup terugzetten are moved to v3 (see `docs/BACKLOG.md`). The module parts are dropped (decision 79). The Import & Export section is a placeholder in the live build.
* **Every backup file** holds the app name, a format version and the date it was made. A newer app version can read older files. A file from a newer app version is refused with "Dit bestand is van een nieuwere versie. Werk de app bij."
* **Sharing files:** files go out through the iPad share sheet (save to Bestanden, AirDrop, mail). If the share sheet is not available (for example on plain http), the app opens the file in a new view where the parent uses the iPad share button. Both are fine for v1. If neither works, the parent sees a clear note.
* **Exporteer module:** Dropped (decision 79).
* **Importeer module:** Dropped (decision 79).
* **Id conflict on import:** Dropped (decision 79).
* **Bundle script:** Dropped (decision 79).
* **Backup maken:** one file with everything (settings, content choice, progress, results, exam results, world, hotbar, dinos, golden dinos, eggs, chickens, dino points), except the pincode and the gate lockout. The file name holds only the app name and the date, for example `dino-blokwereld-backup-2026-10-24.json`. The app remembers the date of the last backup (the v4 reminder reads it).
* **Backup terugzetten:** pick a backup file, confirm, and everything is replaced. The whole file is checked first, also every value against the save rules (for example dino names as in AC18). The old data stays until the new data is fully written, then the app switches and shows the restored world. A broken or wrong file changes nothing. The current pincode stays.
* **Where:** both buttons are in the parent area, so only behind the parent gate. A backup file never leaves the iPad on its own; only the parent sends it, through the share sheet or the new view fallback.

### 4.16 Parent area: results (Resultaten)
**Status: Moved to v6 (see `docs/BACKLOG.md`).** The live build shows only a list of the last 20 breaks with date, module, score, points and the "snel geklikt" mark. Exam results are saved since v2, so v6 can list them.
* **Overzicht:** today and this week: play time, number of breaks, questions answered, percent right on the first try, percent right after the retry, number of teach moments, dino points earned and spent.
* **Pauzes:** a list of breaks with date, time, module, score, points, length and how it ended (klaar or door ouder beëindigd). A break where every first answer took less than 2 seconds gets a "snel geklikt" mark (F13), so the parent can spot guessing.
* **Per onderdeel:** drill down subject > module > topic > skill, with a level filter. For each: answered, percent right on the first try in the last 30 days and all time, number beheerst out of total, and how many items are in each box.
* **Over tijd:** a simple bar chart per week for the last 12 weeks: questions answered and percent right on the first try, for the selected node.
* **Lastige vragen:** the 20 items answered wrong on the first try most often in the last 30 days, with the kid's last wrong answer and the right answer.
* **Examens:** a list of every exam with date, module, exam name, score, passed or not, or "gestopt". Tap one to see the score per topic and every question with the kid's answer and the right answer.
* History is kept for at least 12 months.

### 4.17 Parent area: settings (Instellingen)
**Status: live core.** Punten comes with v10 (section 12). Volume, Alles wissen and the app version at the bottom are moved to v3 (see `docs/BACKLOG.md`). Greying out "Pauze nu starten" during an exam came with v2.
| Setting | Range | Default |
|---|---|---|
| Tijd tussen leerpauzes | 1 to 30 minutes | 5 minutes |
| Vragen per pauze | 3 to 20 | 5 |
| Nieuwe lessen en vragen | aan, uit (only review) | aan |
| Waarschuwing voor de pauze (pulse and tick) | aan, uit | aan |
| Groter lettertype (F13) | aan, uit | uit |
| Geluidseffecten | aan, uit | aan |
| Punten (v10, decision 92): how much a mistake costs, see the table in 4.5 | Makkelijk (a mistake costs nothing), Normaal (wrong twice costs 1 punt), Moeilijk (every wrong try costs 1 punt) | Normaal |
| Volume | 0 to 100 | 70 |
| Pincode wijzigen | | |
| Pauze nu starten | button, for testing or a quick check. Greyed out during a break or exam. | |
| Pauze nu beëindigen | button, only during a break, logged as "door ouder beëindigd" | |
| Wereld opnieuw beginnen | confirm, resets the blocks of the world and the player position. Dinos, eggs, dino points and learning progress stay. Dinos move to the start spot. | |
| Alles wissen | confirm twice, deletes everything, also the pincode. The app then starts a new game. The next tap on the lock asks the grown up question before a new pincode (decision 52), until the first start flow comes in v4. | |

* **Groter lettertype:** makes all text on kid screens (breaks, lessons, Lesboek, exams, review, Dinowinkel, menus) 25 percent bigger. Layouts still fit in landscape without cutting off text; long content scrolls inside its card where needed. It does not change the parent area.
* Changes to the timer settings take effect at the next play period. A running break is not changed.
* **Punten (v10):** a change applies from the next answer. It never changes points already given or taken. Each choice has one short line under it, so the parent sees what it does. The setting is saved with the other settings.
* The settings screen shows the app version at the bottom, so a stale cached version can be spotted.

### 4.18 Saving
**Status: live core**: on the iPad only, world as changes, eager saves, safe writes, save versions. Moved to v4 (see `docs/BACKLOG.md`): the broken save screen, the storage full note, persistent storage, the home screen note and the backup reminder. Applying a new app version only at start comes with the offline service worker in v4.
* All data is stored on the iPad only.
* The world is saved as the changes against the fixed starting world, so saves stay small.
* **Save eagerly:** every world change, answer, point change, purchase, dino change and timer step is saved within about 2 seconds, in small batched writes. A purchase and its points are saved together in one write. There is also a save when the app is hidden, and at the start of every break and exam. iOS can kill a home screen app without warning, so the app never relies on that last save alone.
* **Safe writes:** a save that is cut off halfway leaves the previous save readable.
* **Broken save:** if the save cannot be read, the app shows a friendly Dutch message for the parent with "Backup terugzetten" and "Opnieuw beginnen" (confirm twice). It never shows a blank screen and never wipes data on its own.
* **Updates:** saved data carries a version number. A new app version moves old saves to the new shape. A new app version is applied only when the app starts, never during a break or exam.
* **Storage full or refused:** the parent area shows a gentle note and play goes on.
* The app asks Safari for persistent storage where possible. The parent area shows a gentle note if the app is not added to the home screen, and a reminder to make a backup if the last backup is older than 30 days.

### 4.19 App basics
**Status: live core**: home screen manifest and icons, window too small, 3D view lost, hosting, fps counter. Moved to v4 (see `docs/BACKLOG.md`): offline play, plain http notes, one window, and the first start flow (kept as a new v4 task by decision 60).
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
The ranked backlog, release ids and versions, release statuses, dropped releases and the Later list live in `docs/BACKLOG.md`. That file is not signed, so editing it never closes the gate (decision 80).

## 6. User flows

Flows 2 to 5 and 7 are v1, and Flows 6 and 6b are v2. All of them are live. Flow 3 step 6 is the v10 rule with Punten on Normaal, the default (decision 92). Until 0.4.0 ships the kid loses no points there (v9). Flow 1 is v4 (kept by decision 60), Flow 9 is v6 and Flow 10 is v3. Flow 8 was dropped with v7 (decision 79). In v1 the first pincode is set the first time a grown up taps the lock, after the grown up question (decision 52).

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
6. Another one I get wrong twice. Dino Juf shows "Zo zit het:", the right answer, why, one lesson page and "-1 punt". I tap "Ik snap het".
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

### Flow 6: exam
1. Parent taps the lock icon, types the code, goes to Examens and starts "Oefenexamen M6".
2. Parent gives me the iPad. I see "Examen: 30 vragen, 30 minuten" and tap "Begin".
3. I answer each question. I do not see if it is right. I see "Vraag 12 van 30" and the time left.
4. At the end I see "27 van de 30 goed. Geslaagd!" and a golden egg.
5. I tap "Bekijk je fouten" and see my 3 mistakes, each with the right answer and why. I tap "Klaar".
6. Back in the world the egg hatches into a golden triceratops that follows me.

### Flow 6b: parent stops an exam
1. Dinner is ready, but I am on "Vraag 9 van 30". Papa taps the small grey lock in the corner of the exam screen.
2. Papa types the code. The time does not run while he types.
3. Papa sees "Examen stoppen?" and taps "Stoppen".
4. I am back in the world. There is no golden egg this time. The countdown starts again.

### Flow 7: parent picks what gets asked
1. Parent opens the parent area and goes to Inhoud kiezen.
2. Parent switches off Rekenen > tafels > tafel-1 and tafel-2, and switches on only M7 for the komma topic.
3. Parent sets Vakverdeling to Taal 2, Rekenen 1.
4. Parent leaves the parent area. The next breaks follow the new choices.

### Flow 8: parent makes a module
Dropped with v7 (decision 79). New modules come through `/module`.

### Flow 9: parent checks results (v6)
1. Parent opens Resultaten and sees this week: 42 minutes played, 8 breaks, 40 questions, 78 percent right on the first try, 6 teach moments.
2. Parent opens Pauzes and sees one break marked "snel geklikt".
3. Parent taps Taal > Taalverzorging > ww-verleden and sees 55 percent right, with "verleden-kofschip" as the weakest skill.
4. Parent opens Lastige vragen and sees the kid wrote "fietsde".
5. Parent opens Examens and taps the last exam to see the score per topic.

### Flow 10: backup (v3)
1. Parent opens Import en export and taps "Backup maken".
2. The share sheet opens and the parent saves the file to Bestanden.
3. Weeks later on a wiped iPad the parent taps the lock, answers the grown up question and sets a new pincode (from v4 this is the first start flow). In the parent area the parent taps "Backup terugzetten", picks the file in Bestanden and confirms.
4. The world, dinos, chickens, points and progress are back. The new pincode stays.

## 7. Acceptance criteria
Times in these criteria are play time with the app visible, unless stated otherwise. Tests may use a fake clock. Criteria AC103 to AC144 were added in review round 1, AC145 to AC154 when the founder answered F1 to F13, AC155 to AC165 with v2, AC166 to AC171 with v9 and AC172 to AC177 with v10. They sit in their topic group. **(iPad)** marks a check the founder or QA does by hand on the reference iPad, because headless WebKit cannot measure it. Removed criteria keep their number so references stay valid.

**Release tags (decisions 57 and 80).** A criterion with no tag is in force in the live build (v1, v2 or v9). A tag like **(v3)** means the criterion belongs to that release in `docs/BACKLOG.md`. A tag like **(v1, test in v3)** means the behaviour is live and the named part comes in that release. A **(v10)** tag on a criterion that is live means it is rewritten for v10 (decision 92) and holds in this form once 0.4.0 ships. **(removed in v10)** means it holds in the live build only until 0.4.0 ships. When a release ships, its tags are dropped here. Numbers never change and are never reused. Criteria dropped with v7 and v8 (decision 79) keep a one line note here; their text is in `docs/BACKLOG.md` under Dropped.

**v1 readings.** For v1, read these criteria with the changes in 4.0: AC1 has a world 64 high, not 32. AC7 and AC151 have 32 building blocks, not 16. AC20 and AC149 count no chickens toward the 12. AC52 holds with a Stoppen button on every question (decision 51). AC127 holds for the lock in the world and for the exam screen lock (AC155).

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
* **AC111 (F7):** Given the kid has 12 shop dinos, when they pass an exam, then the golden egg still hatches into a golden dino, and the Dinowinkel still blocks a 13th shop dino.
* **AC149:** Given the Dinowinkel, then it shows the Compy for 20, the Triceratops for 40, the Stegosaurus for 40 and the Brachiosaurus for 80 points, and the kid's total. Given 30 points, then the Compy can be bought and the others are greyed out with "Nog 10 punten nodig" and "Nog 50 punten nodig". Given "Kopen" then "Nee", then nothing changes. The shop has no link, no real money and no payment screen.
* **AC150:** Given the kid bought an egg, when they return to the world, then the egg lies next to the player and after 5 seconds of play hatches into a dino of the bought kind on Volg mij. Given the app is killed right after "Ja", when it reopens, then the egg or the dino is there and the points were taken exactly once.
* **AC152 (v1, Alles wissen and restore in v3):** Given no wrong answer, "Wereld opnieuw beginnen" or restart, then no dino or egg is ever removed. Only "Alles wissen" and "Backup terugzetten" replace them.

### Timers
* **AC22:** Given default settings, when play starts, then the top of the screen shows "Leerpauze over 5:00" and after 60 seconds of real time it shows 4:00, plus or minus 1 second, whatever the frame rate.
* **AC23:** Given the pause menu, Dinowinkel, Lesboek, Extra oefenen, the dino menu, the block grid, the parent gate or the parent area is open, or the app is in portrait, too small or in the background, then the play timer does not count down.
* **AC24:** Given 2:30 left on the play timer, when the app is killed and reopened, then the timer shows between 2:30 and 2:35.
* **AC25:** Given warnings are on, when 30 seconds are left, then the countdown grows and pulses, and in the last 10 seconds a tick plays if sound is on.
* **AC26:** Given the play timer reaches 0, then the game saves, the world stops, and the learning break opens. There is no way for the kid to close it.
* **AC27:** Given the parent sets "Tijd tussen leerpauzes" to 10 minutes, when the next play period starts, then the countdown starts at 10:00.
* **AC112:** Given an exam with time left, when the parent gate or parent area is open, the iPad is in portrait, the window is too small, or the app is in the background, then the exam timer does not count down.
* **AC113:** Given a fake clock that jumps 60 seconds between two heartbeats while the app is visible, then no timer loses those 60 seconds.
* **AC114 (v4):** Given the app is open, when it is opened in a second tab or window, then the second shows "Dino Blokwereld is al open" and no saved data changes.
* **AC115:** Given a break or an exam is running, then "Pauze nu starten" is greyed out. Given a break is running, when the parent tries to start an exam, then "Beëindig eerst de pauze" shows and no exam starts.

### Learning break
* **AC28:** Given "Vragen per pauze" is 5, when a break starts, then 5 progress dots show and the kid gets 5 questions. No break countdown shows.
* **AC29 (v10):** Given a right answer on the first try in any learning break or in Extra oefenen, however many points the kid already earned today, then a green check, "+2 punten" and a happy sound (if sound is on) show, and the point total goes up by 2.
* **AC30:** Given a wrong answer on the first try, then "Net niet. Probeer het nog een keer." shows, the right answer is not shown, and the same question shows again with its input cleared.
* **AC31:** Given a break, then it ends only after every question is done (right on the first try, right on the retry, or a teach moment). Given a fake clock that moves 30 minutes while a question is on screen, then the break is still on that question and nothing is logged as "niet beantwoord".
* **AC32:** (removed, see F2: no break time limit, no "Laatste vraag")
* **AC33:** (removed, see F2: no "Geen limiet" setting)
* **AC34 (F6):** Given a break ends with K right out of N, with K from 1 to N, then the summary shows "K van de N goed!", the points really earned in this break and the new total. Given the kid can now buy an egg by the rule in AC169, then "Je kunt een ei kopen in de Dinowinkel!" shows.
* **AC35 (v10):** Given every question of a learning break (timed, Pauze nu starten or Nu oefenen) is right on the first try, then the kid gets 2 points per question plus a 3 point bonus (13 points for 5 questions).
* **AC36:** Given the summary, when the kid taps "Terug naar de wereld", then play resumes at the same spot and the play timer starts again at the full interval.
* **AC37:** Given a break is on question 3 on the retry, when the app is closed and reopened, then the same break shows question 3 on the retry with the same questions, and the points so far are kept.
* **AC38:** Given two modules are switched on with equal weight, when 10 breaks happen, then each module gets 5 breaks. Given weights 2 and 1, then over 9 breaks they get 6 and 3, also when the app is restarted between breaks. Given one module has no usable items, then its turn goes to the next module.
* **AC39:** Given no items are switched on anywhere, when a break starts, then the friendly "Er staan geen vragen aan" message shows and the break ends after 10 seconds with no points.
* **AC116 (F6):** Given a break ends with 0 right (first try and retry), then the summary shows the kind "Dit was lastig" message, no plus points and no bonus.
* **AC117:** Given a question, when the kid double taps an answer button, or two fingers hit two answer buttons in the same moment, then exactly one answer is logged for that try, the first one. Given a double tap on "Verder", "Ik snap het", "Klaar" or "Terug naar de wereld", then it acts once and no question or retry is skipped.
* **AC145 (v10):** Given a wrong first try in any learning break or in Extra oefenen, when the retry is right, then a green check and "Goed zo! +1 punt" show and the total goes up by 1 (on Moeilijk the first try already took 1, AC173).
* **AC146 (v10):** Given a wrong first try, when the retry is also wrong, then the teach moment shows "Zo zit het:", the right answer, the item's `explain` text and teaching: for a Taal or parent item the lesson page linked to the item's skill (or the first lesson page of the topic), for a Rekenen item a step by step worked example of that sum. Its points line and the change in the total follow the Punten setting (AC173), and "Ik snap het" moves to the next question.
* **AC147:** Given a total of 0 points, when a teach moment happens, then the total stays 0, whatever the Punten setting. The total is never below 0 anywhere in the app.

### Honest points
These came with v9 (decision 87, shipped as 0.3.0). The release text is archived in `docs/releases/v9.md`. v10 removes the day limit and brings back minus points (decision 92), so four of them go.
* **AC166 (removed in v10):** the "Goed!" banner past the day limit. There is no day limit from v10 (decision 92), see AC175.
* **AC167 (removed in v10):** the part that fits under the day limit. See AC175. Its rule "every number shown equals the change in the total" lives on in AC174.
* **AC168 (removed in v10):** the "Genoeg geoefend voor vandaag" summary line. See AC175.
* **AC169:** Given 11 shop dinos (hatched or as eggs), 2 golden dinos, 3 chickens and 20 points or more, when a break summary or the end of Extra oefenen shows, then "Je kunt een ei kopen in de Dinowinkel!" shows, and the Dinowinkel has a Kopen button for the Compy. Given 12 shop dinos, then the hint never shows after a break or after Extra oefenen, whatever the points. Given fewer than 12 shop dinos and fewer than 20 points, then the hint does not show. The break and Extra oefenen always agree.
* **AC170 (removed in v10):** no malus anywhere. Mistakes cost points again by the Punten setting (decision 92), see AC172 and AC173. On Makkelijk the old rule still holds.
* **AC171:** Given the v9 build, then `package.json` has version 0.3.0 and `CHANGELOG.md` has a 0.3.0 entry in kid readable words that says the points now add up and a mistake never costs points.

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
* **AC52 (v10):** Given Extra oefenen with module Rekenen, then the kid gets N questions picked by the same rules, with the same retry, teach moment and points as a break (including the Punten setting), no +3 bonus, no day limit, and the play timer is stopped while the round is open.
* **AC120 (removed in v10):** the 10 plus points a day cap on Extra oefenen (F6). Dropped by decision 92, see AC175. Until 0.4.0 ships the live build still has it.

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
* **AC124 (v5, runs early with T65 beside the next release, decision 81):** Given the release, then `docs/TEST_REPORT.md` records the human content check: 5 items per Taal topic checked by QA against woordenlijst.org, and 20 items read by the founder or a teacher, with every problem found fixed.
* **AC125:** Given a Rekenen exam of 20 questions or a Rekenen break, then no question appears twice. Given the same seed, then the generator gives the same questions.
* **AC126:** Given more than 200 wrong plus sums saved for optellen, then only the 200 newest are kept.

### Exams
* **AC64:** Given the parent starts Oefenexamen M6, then the kid gets 30 questions at level M6, split over topics by the `mix` weights (largest remainder rounding), with a 30 minute countdown, whatever the parent's switches are.
* **AC65:** Given an exam is running, then the kid sees no right or wrong feedback, gets no retry and no teach moment, cannot go back, and cannot leave without the pincode. The point total does not change during or after an exam.
* **AC66:** Given an exam is running, then the play timer is stopped and no learning break starts.
* **AC67:** Given the exam time runs out, then the exam ends and unanswered questions count as wrong. Given an answer was typed or marked but Klaar was not tapped, then that answer is checked as given.
* **AC68:** Given the kid scores at or above `passPercent`, then "Geslaagd!" shows with the score, and back in the world a golden egg hatches into a golden dino. Given a lower score, then the score and the kind "Goed geoefend!" message show and there is no egg.
* **AC69:** Given an exam ends, then the result is saved with date, module, exam, score, passed or not, and every question with the kid's answer.
* **AC70:** Given the parent stops a running exam through the gate, then it is saved as "gestopt", gives no egg and shows no review.
* **AC71:** Given an exam is on question 12 with 18:00 left, when the app is closed and reopened, then the exam continues at question 12 with between 18:00 and 18:05 left.
* **AC72:** Given a module has too few items for an exam, when the parent starts it, then a warning shows the real question count before the exam begins.
* **AC153 (F8):** Given an exam ended with 3 wrong and 1 unanswered question, when the kid taps "Bekijk je fouten", then 4 pages show, each with the question, the kid's answer (or "niet beantwoord"), the right answer and the `explain` text, and "Klaar" returns to the end screen. Given an exam with no mistakes, then "Alles goed!" shows and there is no review button. Given the app is closed during the review, then reopening shows the end screen again.

### Exam lock, Winkel button and instant Pauze
These came with v2 (decisions 61 and 73). The release text is archived in `docs/releases/v2.md`.
* **AC155:** Given an exam is running with a question on screen, then a small grey lock shows in the top right corner, with a tap area of at least 44 x 44 points fully inside the safe area. When the kid or parent taps it, then the pin pad of the parent gate opens.
* **AC156:** Given a learning break, a lesson, a break summary, Extra oefenen, the exam start screen, the exam end screen or the review is on screen, then no lock and no parent button shows. Given the world, then the lock shows as in v1.
* **AC157:** Given the pin pad was opened from the exam lock, when the right pincode is typed and the parent taps "Stoppen", then the exam is saved as "gestopt", no golden egg appears, no review shows, and the kid is in the world with the play timer at the full interval. Given the app is closed and reopened after that, then the world shows, not the exam.
* **AC158:** Given an exam on question 9 with 20:00 left and an answer typed but not checked, when the pin pad is opened from the exam lock and then closed with "Terug", or the right pincode is typed and "Terug naar het examen" is tapped, then the exam shows question 9 with the same typed answer and 20:00 left, plus or minus 1 second, however long the gate was open. Given 3 wrong codes, then the gate blocks for 1 minute with the same shared lockout as the world lock (AC74), and the exam stays on question 9 with no time lost.
* **AC159:** Given the v2 build, then `package.json` has version 0.2.0 and `CHANGELOG.md` has a 0.2.0 entry in kid readable words that names the exams and the golden dino.
* **AC160:** Given the world is on screen, then a "🥚 Winkel" button shows in the top bar next to Pauze, with the same size as Pauze and a tap area of at least 44 x 44 points. Given a learning break, a lesson, a break summary, Extra oefenen, an exam screen, the pause menu, the pin pad, the parent area or any other overlay is on screen, then the Winkel button does not show.
* **AC161:** Given the world, when the kid taps "🥚 Winkel", then the Dinowinkel opens directly. When the kid closes the Dinowinkel, then the world shows again, not the pause menu. Given the pause menu, then the Dinowinkel can still be opened from there as in v1.
* **AC162:** Given the world at 1024 x 768, 1180 x 820 and a 1024 x 690 Safari tab, in landscape, then the Winkel button does not overlap the countdown, the Pauze button or the small lock, and all of them sit inside the safe area.
* **AC163:** Given the world and saved data that is slow (takes 3 seconds or more) or not available, when the kid taps Pauze once with one finger, then the pause menu opens within 300 ms. The points show a placeholder until they are read and then show the real total.
* **AC164:** Given the world and saved data that is slow or not available, when the kid taps "🥚 Winkel" once with one finger, then the Dinowinkel opens within 300 ms with a placeholder for the points. Its points and buy buttons fill in when the data is read. Given the points are not read yet, then no "Kopen" button can be tapped and no egg can be bought.
* **AC165 (iPad):** Given the founder's iPad with the game opened from the home screen icon, when the kid taps Pauze, then the pause menu opens, and when the kid taps "🥚 Winkel", then the Dinowinkel opens. Both work on the first tap.

### Parent gate
* **AC73 (v4):** Given first start, then the parent must set a 4 digit pincode, typed twice and matching, before the world opens.
* **AC74:** Given the lock icon is tapped, when the right pincode is typed, then the parent area opens. When a wrong code is typed 3 times, then the gate is blocked for 1 minute, and the block still holds after a reload or after closing and reopening the app. Fast tapping on the pin pad types one digit per tap and never crashes.
* **AC75 (F4):** Given "PIN vergeten", then a new two step question in words shows each time. When it is answered right, then the parent can set a new pincode. When it is answered wrong twice, then PIN vergeten is blocked for 10 minutes. Wrong tries here and on the pin pad share one saved lockout that survives a reload.
* **AC76 (v1, full route test in v5):** Given the kid is on any kid screen, then no parent function (settings, content, results, backup, end break, stop exam) can be reached without passing the gate. An automated test tries every route: URL hash, back button, reload and browser history.
* **AC127:** Given the lock icon, then its tap area is at least 44 x 44 points, fully inside the safe area, and a look drag that starts outside it never opens the gate.
* **AC128:** Given the app runs over plain http (no secure context), then the pincode can be set and checked and the gate works.

### Parent: content choice
* **AC77:** Given Inhoud kiezen, then the tree shows subject, module, topic and skill with switches, and level checkboxes per module with an override per topic.
* **AC78:** Given the parent switches off a topic, then all its skills show as off and the switched on item count updates.
* **AC79:** Given the preset "Groep 7 midden", then levels M6, E6 and M7 are switched on and E7 off for both built in modules.
* **AC129 (v4):** Given no items are switched on anywhere, when the parent opens the parent area, then the warning "Er staan geen vragen aan" shows at the top.

### Parent: backup
* AC80 to AC83: dropped with v7 (decision 79). Text in `docs/BACKLOG.md`.
* AC84 to AC86, AC88 and AC132: dropped with v8 (decision 79). Text in `docs/BACKLOG.md`.
* **AC87 (v3):** Given "Backup maken" and then "Alles wissen", a new pincode, and "Backup terugzetten" with that file, then settings, content choice, progress, results, exam results, world, hotbar, dinos (with names), golden dinos, eggs, chickens and dino points are all back as before, and the new pincode still works.
* **AC130 (v3):** Given a broken backup file (cut off, wrong JSON, wrong app name), when the parent restores it, then a friendly message shows and all current data is unchanged. Given a backup from a newer format version, then it is refused with "Dit bestand is van een nieuwere versie".
* **AC131 (v3):** Given any backup file, then it holds the app name, a format version and the date. Given a backup whose saved data has an older save version (test fixture, including old `malus` entries in the points history), then it restores and the data is moved to the current shape, as in AC138.
* **AC133 (iPad) (v3):** Given "Backup maken" on the reference iPad in home screen mode on the HTTPS address, then the parent can save the file to Bestanden, by the share sheet or the new view fallback. Given "Backup terugzetten" on the same iPad, then the parent can pick that file from Bestanden and it restores.

### Parent: results and settings
* **AC89 (v6):** Given answers were logged, then Resultaten Per onderdeel shows for any node: answered, percent right on the first try in the last 30 days and all time, beheerst count and items per box, matching the logged answers.
* **AC90 (v6):** Given answers over several weeks, then the Over tijd chart shows one bar per week for the last 12 weeks with the right counts and percentages.
* **AC91 (v6):** Given Lastige vragen, then it lists up to 20 items, most wrong on the first try in the last 30 days first, with the kid's last wrong answer and the right answer.
* **AC92 (F13) (v6, v1 has the simple list with the mark):** Given Pauzes, then every break shows with date, module, score, points, length and how it ended. A break where every first answer took less than 2 seconds shows "snel geklikt". A break with one first answer of 2 seconds or more does not.
* **AC93 (v1, Volume in v3):** Given every setting in the table in 4.17, then the parent can change it within its range, the change is saved, and it works as described.
* **AC94 (v1, tests in v3):** Given "Wereld opnieuw beginnen", then the blocks and the player position reset to the fixed starting world, dinos and eggs stand at the start spot, and dino points, learning progress and results stay.
* **AC95 (v1, tests in v3):** Given "Pauze nu beëindigen" during a break, then the break ends, the kid keeps the points so far, open questions are logged as "niet beantwoord" with no box change, and the break is logged as "door ouder beëindigd".
* **AC134 (v6):** Given Overzicht, then today and this week show play time, breaks, questions answered, percent right on the first try, percent right after the retry, teach moments, and points earned and spent, matching the log.
* **AC135 (v3):** Given Instellingen, then the app version shows at the bottom and equals the version in `package.json`.
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
* **AC141 (v1, full audit in v5):** Given every kid screen, then normal text has a contrast of at least 4.5 to 1 and large text at least 3 to 1, also on the soft orange "wrong" colour, the grey teach moment text and the lock icon. Right and wrong always show an icon (check or cross) as well as a colour.
* **AC142:** Given the pulsing countdown and pop effects, then nothing flashes more than 2 times a second. Given `prefers-reduced-motion`, then the pulse is off and the countdown text still grows.
* **AC143 (iPad) (v1, iPad check in v5):** Given the reference iPad, then the stick, jump button, hotbar, countdown and lock icon sit inside the safe area, and the hotbar sits high enough that using it never triggers the home swipe.
* **AC144 (v4):** Given a wiped iPad (empty storage), when the app opens, then the first start flow shows, and after "Geef de iPad aan je kind" the world loads with no errors.

**Count:** AC1 to AC171 here, plus AC172 to AC177 for v10 in section 12. 11 are removed: AC13, AC14, AC15, AC19, AC32, AC33, and with v10 AC120, AC166, AC167, AC168 and AC170 (decision 92; these still hold in the live build until 0.4.0 ships). 9 are dropped with v7 and v8 (AC80 to AC86, AC88, AC132; decision 79). 157 active criteria. 131 are in force: 105 from v1 (some with a part in a later release, AC34 and AC146 changed by v9, and AC29, AC35, AC52, AC145 and AC146 rewritten for v10), 24 from v2 and 2 from v9. 26 belong to a later release: v10 has 6 (in section 12), v3 has 5, v4 has 8, v5 has 2, v6 has 5. The release after v10 continues at AC178.

## 8. Look, sound and feel
* **Style:** bright, friendly Minecraft style pixel blocks with 16 x 16 pixel textures. Dinos are chunky and cute with big eyes, made of boxes. Eggs are spotted and wobble. Soft, still fog at the edge (no flicker). No blood, no scary sounds, no angry dinos.
* **Colours:** sky blue, grass green, warm sand. Right answers in green. Wrong answers in soft orange, never harsh red. A minus number shows only when points are really taken by the Punten setting (v10), always in soft orange, never red, next to a kind word. Wool blocks are bright. Golden dinos shine gold. Text contrast as in AC141.
* **Motion:** the mining pop is a short burst of a few pixel bits, under half a second. The egg wobble and hatch take about 2 seconds. Nothing flashes more than 2 times a second. Reduced motion turns the pulse and the egg wobble off.
* **Learning screens:** calm, white or soft paper background, one question at a time, big text, a small dino teacher ("Dino Juf") in the corner. Lots of space. The teach moment looks like a friendly lesson card, not a red mark.
* **Exam screen:** even calmer: no dino animations, no sounds except a soft chime at the end. The review pages look like the teach moment card.
* **Dinowinkel:** bright and cheerful, four big egg cards side by side, the point total big at the top.
* **Parent area:** plain and clear, grey and white, normal sized text, works like a settings app. Forms are one column, inputs are at least 16 points, and the active field scrolls into view above the iPad keyboard. The parent area is the one place where normal scrolling is allowed.
* **Font:** one round, very readable font, bundled with the app so it works offline. Kid text at least 20 points, questions at least 24 points, and 25 percent bigger with Groter lettertype.
* **Words:** Dutch, short sentences, groep 5 reading level on kid screens. Kind and encouraging: "Bijna!", "Goed zo!", "Wat knap!". Never "Fout!" on its own. A wrong first try says "Net niet. Probeer het nog een keer." The teach moment says "Zo zit het:".
* **Sounds:** short and soft. A pop when mining, a thunk when placing, a chime for right, a gentle "hmm" for wrong, a coin clink when buying an egg, a crack and a happy chirp when an egg hatches, a fanfare for a passed exam. No music.

## 9. Kid safety and privacy
* **Data stored and where:** only on this iPad, in Safari's storage for this app. Stored: settings, pincode (hashed), answer history, break and exam results, the world changes, the hotbar, dinos and eggs (with names the kid types), dino points. No real name, age, photo, location or contact data is asked for or stored. The dino name screen asks for a dino name, not the kid's name.
* **The live build (v1, v2 and v9):** the rules below all hold for it. It makes no files at all (backup comes in v3). Without the offline service worker (v4), it needs the internet to start and loads only its own files from `workers.dev`. Chickens and eggs are bought only with dino points. The automated safety suite that proves these rules is in v5; until then they are checked by reading the code and by the UI review.
* **Files (from v3):** backup files are made and restored only in the parent area, behind the gate. They hold only game data: no real name, age, photo, location or contact data, only what the list above says (dino names included). They do not hold the pincode or the gate lockout, and the file name holds only the app name and the date. A backup never leaves the iPad on its own: no upload, no server, no automatic sync. It only leaves when the parent sends it through the iPad share sheet (or the new view fallback). A restored file is checked in full and its text shows as plain text, never as a link or a script.
* **Network use:** only to load the app's own files from the public `workers.dev` address on first visit and for updates (F9). No other requests. No data is ever sent anywhere. The server holds only the app files, nothing about the kid. Cloudflare Web Analytics and any other Cloudflare injected script stay off.
* **Tracking, ads, chat:** none. No analytics, no cookies for tracking, no third party scripts or fonts from other servers.
* **Purchases:** none with real money. The Dinowinkel only uses dino points earned by learning. There is no payment code, no store link and no way to buy points.
* **External links:** none. Module text is shown as plain text and is never a link.
* **Parent gate:** a 4 digit pincode protects settings, content choice, backup, results, ending a break and stopping an exam. The lockout survives reloads. PIN vergeten uses a fresh two step grown up question with a 10 minute block after 2 wrong tries, sharing the lockout with the pin pad (F3, F4). The first pincode can only be set after the same kind of grown up question (decision 52). The lock shows only in the world (decision 53) and, since v2, on the exam screen, only to stop the exam (decision 61). Learning breaks have no lock.
* **Content:** all questions and lessons are original and kid friendly (dinos, nature, school, family). Nothing scary or violent. Taal content gets a human spelling check before release (AC124).
* **Breaks and points:** the break is firm but kind. It has no time pressure, every question gets a second try, and a second mistake leads to a short lesson, not a scolding. Every number shown is the points the kid really gets, plus or minus (v9). From v10 the parent decides how much a mistake costs with Punten, behind the gate: Makkelijk nothing, Normaal 1 point after a teach moment (default), Moeilijk 1 point per wrong try (decision 92). The total never goes below 0. Mistakes never take away blocks, dinos, eggs or chickens. From v10 there is no day limit, so practice always pays.
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
The decisions F1 to F15 are answered. Details are in `docs/DECISIONS.md` (rows 8 to 22). The recut questions D1 to D3 are answered too (rows 59 to 61), and so are decisions 78 to 81, 84, 87 and 90 to 92. No founder question is open for v10.

| # | Question | Founder's answer | Where in this PRD |
|---|---|---|---|
| F1 | v1 size | Everything ships together in v1, no v1a or v1b split. Replaced by decision 57 on 2026-10-19. | 4.0 |
| F2 | How a break ends | Only when all questions are done. Wrong: one retry. Wrong again: teach moment, move on. The malus went in v9 (decision 87) and comes back in v10 as the Punten setting (decision 92). No break time limit. Exams keep their time limit. | 4.4, 4.5, AC31, AC145 to AC148 |
| F3 | Parent gate type | 4 digit pincode | 4.12 |
| F4 | PIN vergeten | Fresh two step grown up question, 10 minute block after 2 wrong tries, shared lockout | 4.12, AC75 |
| F5 | Rewards | All dinos earned through learning: points buy eggs in the Dinowinkel, bigger dinos cost more. All blocks free from the start. No wild dinos, no taming. | 4.1, 4.3, 4.5 |
| F6 | Zero effort | A break with 0 right gives no plus points. Extra oefenen earns at most 10 points a day. The day limit is dropped in v10 (decision 92). | 4.5, 4.7, AC116 |
| F7 | Golden egg at 12 dinos | Golden dinos do not count toward the 12 | 4.3, AC111 |
| F8 | Exam result for the kid | Score with a kind message and a full review of every mistake. Details also in the parent area. | 4.11, AC153 |
| F9 | Hosting | Public `workers.dev` address. Deploying is a founder action at `/ship`. | 4.19, 10 |
| F10 | Reference iPad | iPad 2018 or newer, iPadOS 16 or newer | 2, 10, AC101 |
| F11 | Rekenen scope | Plus, minus, tafels, delen as in 4.10 | 4.10 |
| F12 | App name | Dino Blokwereld as working title. The kid may rename it later. | Title, `docs/BACKLOG.md` Later |
| F13 | Small scope changes | "Snel geklikt" mark in v1. "Groter lettertype" stays in v1. | 4.16, 4.17, AC92, AC154 |
| F14 | Malus in Extra oefenen | No malus in Extra oefenen. Malus only in learning breaks. From v9 no malus anywhere (decision 87). From v10 the Punten setting holds everywhere, Extra oefenen too (decision 92). | 4.7, AC52, AC173 |
| F15 | Dino kinds and prices | Compy 20, Triceratops 40, Stegosaurus 40, Brachiosaurus 80 | 4.3, AC149 |
| D1 | Which release comes next (row 59) | v2 Gouden ei is next and ships as 0.2.0. Then v3 Dino's veilig. T65 was not pulled in. Shipped. | `docs/releases/v2.md` |
| D2 | The first start flow (row 60) | Keep it as a new task in v4 Altijd spelen. | 4.19, `docs/BACKLOG.md` v4, Flow 1 |
| D3 | How the parent stops an exam (row 61) | A small grey lock on the exam screen only opens the parent gate to stop the exam. Learning breaks stay without a lock. This narrows decision 53 for exams. | 4.0, 4.11, 4.12, 9, AC155 to AC158 |
| 78 | What comes after 0.2.0 | Refactor round R1, then v3. Decision 87 puts v9 before R1. | `docs/BACKLOG.md` |
| 79 | v7 and v8 | Both dropped. New lessons come through `/module`. | 4.14, 4.15, 7, `docs/BACKLOG.md` |
| 80 | Split the PRD | This file is the signed core plus the next release. The backlog and shipped releases live outside it. | 5, 12 |
| 81 | Other SIMPLIFY items | The Taal spelling check (T65) runs beside the next release. The rest stays as it is. | 4.9, AC124 |
| 84 | Egg hint rule (architect) | Shop dinos only, golden dinos and chickens never count. Moves into v9. | 12, AC169 |
| 87 | Points the kid trusts | v9 Eerlijke punten (0.3.0) before R1: honest banners, one egg hint rule, no malus. Breaks stay every 5 minutes. Shipped 2026-10-22. | 4.0, 4.5, 4.7, AC166 to AC171, `docs/releases/v9.md` |
| 90 | Release after R1 | v3 Dino's veilig: backup and restore, Alles wissen, Volume, app version. Now 0.5.0, after v10 (decision 92). | 4.15, 4.17, `docs/BACKLOG.md` |
| 91 | Parent learning dashboard | v6 Wat heb ik geleerd grows into a parent dashboard, worked out on the iPad behind the gate. Now 0.6.0, after v3. | 4.16, `docs/BACKLOG.md` |
| 92 | Points only in the first round (kid bug) | v10 Punten voor elke ronde (0.4.0) goes first: no day limit, every round pays. Mistakes cost points again by a parent setting Punten: Makkelijk, Normaal (default), Moeilijk. Drops the day cap of decisions 48 and 56 and reverses the no malus part of decision 87. | 4.0, 4.5, 4.7, 4.17, 8, 9, 12, AC172 to AC177 |

Choices made by product inside these answers, which the founder sees when signing: the point values (+2, +1, +3 bonus, and from v10 the minus points of Punten) and egg prices (20, 40, 40, 80); a fourth small dino kind (Compy) so there is a cheap first egg (confirmed by the founder, F15); from v10 the Punten setting holds in every break and in Extra oefenen, never in exams (decision 92); a Punten change applies from the next answer; only the first try counts for spaced repetition; exams give no points; "Wereld opnieuw beginnen" keeps dinos and points.

**Decided during the build** (`docs/DECISIONS.md` rows 44 to 57, all built into v1 as listed in 4.0): sky height 64 and camera arrows (44), visible countdown (45), floating with Omhoog and Omlaag (47), Nu oefenen (48, 56), the shop layout (49), Gemini's build is the truth (50), Stoppen in Extra oefenen (51), grown up question before the first pincode (52), lock in the world only (53, replaces 46), home screen first (54), chickens for 5 points, at most 10 (55), and the v1 recut (57). The founder requests CR1 to CR4 (32 blocks, the obsidiaan gate, chickens, lava) are recorded as decision row 58. Signing this PRD confirms them as part of v1.

**Decided for the recut and v2** (rows 59 to 61): see D1 to D3 in the table above. **Decided for the split and v9** (rows 78 to 81, 84, 87): see the table above.

### Open founder decisions
None for v10. One question waits for v3 (how the parent reaches "Pauze nu beëindigen"); it is in `docs/BACKLOG.md` under v3 and is asked when v3 is scoped.

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
| The malus feels unfair | Kid feels punished | It happened: the kid found the game too harsh (decision 87), and v9 removed the malus. v10 brings it back as a parent choice (decision 92). If the kid feels punished again, the parent sets Punten to Makkelijk. Every minus shows honestly in soft orange. |
| Without a day limit the kid farms Extra oefenen for eggs | Less building, quick tapping | Practice is learning, so that is fine. The "snel geklikt" mark (F13) shows guessing to the parent, and Normaal or Moeilijk makes guessing cost points. |
| Point values or egg prices feel off (too slow or too fast) | Boring or too easy | Values are in one place in the code. Changing them after playtesting is a small change the operator brings to the founder. |
| Unlimited free blocks make building less special | Less reason to learn | The learning goal is now the dinos. Blocks are for creativity. |
| The Taal content has mistakes | Wrong spelling is taught | Validator with content checks, human check by QA and the founder (AC124), the parent can switch off any skill. |
| Share sheet behaves differently in home screen mode | Backup fails | Test on the real iPad on the deployed address. Fallback: open the file in a new view and share from there. |
| Scope was large (one v1, about 70 tasks) | Long build, nothing shipped | Recut by decision 57 into small releases, shipped one at a time. v7 and v8 dropped (decision 79). The backlog is in `docs/BACKLOG.md`. |
| 3D speed on the iPad was never measured | Stutter with many dinos | The speed spike (T32) is in v5. The kids already play, so stutter they notice moves v5 up. |

## 12. Releases

Only the next release has its section here, and it is signed with this file. When it ships, its section moves to `docs/releases/vN.md` and its criteria move into section 7. That happens together with scoping the release after it, so it is one signoff. Shipped releases: v2 in `docs/releases/v2.md`, v9 in `docs/releases/v9.md`. The ranked backlog is in `docs/BACKLOG.md`.

### v10 Punten voor elke ronde (0.4.0)

**Status:** next. Picked by the founder (decision 92). Ships as 0.4.0, before v3 Dino's veilig (now 0.5.0). The id is v10 because ids are never reused.

**Goal:** "Every round I play gives me points, not only the first one. And papa or mama decides how much a mistake costs."

**Why:** a bug the kid hit. The 10 points a day limit on Extra oefenen and Nu oefenen (decisions 48 and 56) is used up in about one round, so every round after that pays nothing. The founder drops the limit: every round pays. With no limit, mistakes cost points again, so guessing does not pay, but the parent can make it softer or harder (decision 92). This reverses the "no malus" part of v9 (decision 87). The honest banners of v9 stay.

**In:**
1. **No day limit anywhere.** Extra oefenen, every Nu oefenen break (from the countdown, Extra oefenen, the Lesboek and the Dinowinkel, also when opened with the Winkel button), Pauze nu starten and timed breaks all pay in full, every round. A Nu oefenen break gets the +3 bonus like any break; Extra oefenen still has no bonus. The day cap rules of decisions 48 and 56 and the "Genoeg geoefend voor vandaag" text are gone (4.0, 4.5, 4.7).
2. **Punten setting** in Ouders, Instellingen (4.17), behind the parent gate, saved with the other settings. Three choices, each with one short line of explanation:
   * **Makkelijk:** a mistake costs nothing.
   * **Normaal** (default): wrong twice (a teach moment) costs 1 punt.
   * **Moeilijk:** every wrong try costs 1 punt, so a teach moment costs 2 in total.
   The setting holds in every learning break and in Extra oefenen. Exams never give or take points. A change applies from the next answer. A save from 0.3.0 has no Punten yet and starts on Normaal.
3. **Honest minus.** The banners of v9 stay honest: the kid always sees the real change, plus or minus. On Normaal the teach moment card shows "-1 punt". On Moeilijk the "Net niet" banner shows "-1 punt" too. Minus numbers are soft orange, never red. The summary shows the points of the round added up, so it can be a minus. The total never goes below 0: a minus takes only what is there and shows only what was taken. Dinos, eggs and chickens are never taken away.
4. Version 0.4.0 and a kid readable entry in `CHANGELOG.md`.

**Out:**
* Other point values (+2, +1, +3 bonus stay), egg prices and chicken prices. "Parent settings for point values" stays in the Later list, except this one Punten setting.
* The break interval (still a parent setting, default 5 minutes).
* Backup, Alles wissen, Volume and the app version (v3, now 0.5.0). The results views and the dashboard (v6, now 0.6.0).
* A new limit of any kind (a higher cap, a cap per hour). If the kids farm points, that is a new founder decision.

**Kid safety.** No new data beyond one setting value, stored on the iPad with the other settings. No network use, no tracking. The setting can only be changed behind the parent gate. Minus points are shown kindly (soft orange, "Net niet", "Zo zit het:"), never as "Fout!" and never in red, and they never take blocks, dinos, eggs or chickens. Section 9 holds as updated in this signoff.

**Core text changed with this release.** Signing this file also changes 4.0 (Nu oefenen), 4.5 (points table, banners, summary), 4.7 (Extra oefenen), 4.17 (the Punten row), Flow 3, 8 (colours), 9 (breaks and points), 11 (F2, F6, F14, decisions 90 to 92, risks) and the criteria AC29, AC35, AC52, AC145 and AC146 (tagged "(v10)" in section 7). AC120, AC166, AC167, AC168 and AC170 are removed with v10. Until 0.4.0 ships, the live build keeps the day limit and has no malus.

**Also in this signoff (not part of v10):** the v9 section moves to `docs/releases/v9.md` and its criteria are in section 7. The future v3 text in 4.15, 4.17 (Alles wissen), Flow 10, section 9 (Files) and AC87, AC131, AC133 and AC135 is clarified: the backup also holds chickens, golden dinos and exam results, and the file only leaves the iPad through the parent's share sheet. None of that is built in v10.

**Plan tasks:** about 3, so the fast lane. Expected: (a) remove the day limit in the points code, the banners and the summary, for Extra oefenen and Nu oefenen; (b) the Punten setting in Instellingen, saved, Normaal by default and for old saves; (c) minus points by the setting with honest banners and summary, plus version 0.4.0. The operator writes them in `docs/PLAN.md`; the architect only if the points code needs a redesign.

**Acceptance criteria.** The rewritten criteria in section 7 hold as written there: AC29, AC35, AC52, AC145 and AC146. AC34, AC116, AC147 and AC169 still hold as they are. New for v10:

* **AC172 (v10):** Given the parent area, Instellingen, then a "Punten" setting shows with three choices, Makkelijk, Normaal and Moeilijk, each with one short line saying what it does, and Normaal chosen on a new game. Given the parent picks Moeilijk and the app is closed and reopened, then Moeilijk is still chosen. Given a save from 0.3.0 (test fixture) with no Punten setting, then it loads with Normaal. The setting cannot be reached without the parent gate.
* **AC173 (v10):** Given a total of 10 points, then for one question in a timed break, a Nu oefenen break, a break from Pauze nu starten or Extra oefenen: on **Makkelijk**, a wrong first try and a wrong retry leave the total at 10 and no minus shows; on **Normaal**, a wrong first try leaves 10 with no minus, and a wrong retry gives a teach moment card with "-1 punt" and a total of 9; on **Moeilijk**, a wrong first try shows "Net niet. Probeer het nog een keer." with "-1 punt" and a total of 9, then a right retry shows "+1 punt" and a total of 10, or a wrong retry shows the teach moment with "-1 punt" and a total of 8. Given a timed break of 5 questions with 4 right on the first try and 1 teach moment, then the kid gets 8 points on Makkelijk, 7 on Normaal and 6 on Moeilijk. Given a change of Punten, then it applies from the next answer and changes no points already given.
* **AC174 (v10):** Given a total of 0 on Normaal, when a teach moment happens, then the total stays 0 and the card shows no minus. Given a total of 1 on Moeilijk, when the first try and the retry are both wrong, then the first shows "-1 punt" and the total is 0, and the teach moment shows no minus and the total stays 0. In every case each number shown equals the change in the total, and minus numbers are soft orange, never red. No mistake ever removes a block, dino, egg or chicken. Given an exam on any Punten setting, then no answer changes the total.
* **AC175 (v10):** Given the kid already earned 50 plus points today from Extra oefenen and Nu oefenen breaks, when the kid answers right on the first try in a new round of Extra oefenen, or in a Nu oefenen break started from the countdown, Extra oefenen, the Lesboek or the Dinowinkel (also when opened with the Winkel button), then "+2 punten" shows and the total goes up by 2. Given a Nu oefenen break with every first try right, then the +3 bonus is given. Given a save from 0.3.0 (test fixture) where today's limit was already reached, then the next round pays in full. The text "Genoeg geoefend" never shows anywhere in the app.
* **AC176 (v10):** Given a break or a round of Extra oefenen with plus and minus points (for example +2, +1, -1 and -1 on Moeilijk), then the summary shows the points of that round added up ("+1 punt"), or a minus in soft orange when the sum is below 0 ("-1 punt"), and the new total. The number on the summary always equals the change in the total over that round.
* **AC177 (v10):** Given the v10 build, then `package.json` has version 0.4.0 and `CHANGELOG.md` has a 0.4.0 entry in kid readable words that says every round of oefenen gives points again, and that papa or mama can choose how much a mistake costs.

**Check before shipping:** on the founder's iPad, from the home screen icon: play three rounds of Extra oefenen in a row and see each round pay; start Nu oefenen from the Dinowinkel after that and see "+2 punten"; set Punten to Normaal, get a question wrong twice and see "-1 punt" on the teach moment card; set it to Moeilijk and see "-1 punt" on the first wrong try; set it to Makkelijk and see no minus. Ask the kid if it feels fair.
