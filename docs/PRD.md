# PRD: Dino Blokwereld (working title)

Status: APPROVED by Founder (standing approval, decision 136) on 2026-11-16

This signoff archives v17 Ridders and v18 Zwarte bubbel (live as 0.7.0) in `docs/releases/v17-v18.md` and moves their criteria AC200 to AC229 into section 7. The v15 Grote wereld (0.8.0) and v16 Monstermol (0.9.0) sections and AC230 to AC257 stay in section 12 unchanged: they are built and wait for the founder's merge.

It adds v19 Ridderuitrusting (0.10.0), v20 Diepe edelstenen (0.11.0) and v21 Meer uitrusting (0.12.0) to section 12, on the founder's request of 2026-11-16 ("Ok werkt op de iPad, bouw de rest"), inside decisions 130 to 133. They are built after v16 and ship one by one. New criteria AC258 to AC291.

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

## 4. What the app is today (v1 0.1.0, v2 0.2.0, v9 0.3.0, v10 0.4.0 and v11 0.5.0)

### 4.0 What is live (decisions 57 and 80)
The live build is v1 (0.1.0) plus v2 Gouden ei (0.2.0) plus v9 Eerlijke punten (0.3.0, shipped 2026-10-22) plus v10 Punten voor elke ronde (0.4.0, shipped 2026-10-24) plus v11 Dorp (0.5.0, shipped 2026-10-24), on `main` and on the Cloudflare Worker `minespel`. Refactor round R1 (2026-10-24) changed no rule in this file. The v9 section is archived in `docs/releases/v9.md`, the v10 section in `docs/releases/v10.md` and the v11 section in `docs/releases/v11.md`; their rules are in 4.0, 4.5, 4.7 and 4.17 and their criteria in section 7. The v11 rules (villages, villagers, rare blocks) are the In list of `docs/releases/v11.md`; the subsections below point to it where it changes them. Since 0.5.0, `main` also holds work listed under Unreleased in `CHANGELOG.md` (decisions 111 to 116); it gets its version with 0.6.0. v3 Dino's veilig (0.6.0, decisions 90 and 119) is live; its section is archived in `docs/releases/v3.md`, its rules are in 4.12, 4.15, 4.17 and section 9, and its criteria are in section 7. v17 Ridders and v18 Zwarte bubbel (0.7.0, decisions 130 to 134) are live; their section is archived in `docs/releases/v17-v18.md` (the Ridders section of the Dinowinkel, the knight menu, Klodder and the card "Monsters en ridders"), their safety lines are in sections 8 and 9, and their criteria are in section 7. The next releases, v15, v16, v19, v20 and v21 (0.8.0 to 0.12.0), are scoped in section 12. Decision 57 replaces F1 ("everything ships together"). Features that are not built yet wait in small releases in `docs/BACKLOG.md`. Their text stays below so nothing is lost. Each waiting part is marked "Moved to vN". Parts the founder dropped are marked "Dropped (decision 79)". The shipped v2 section is archived in `docs/releases/v2.md`; its rules are in this section and its criteria in section 7.

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
| 4.1 The world | live (v1). Villages and 8 rare blocks since v11 (`docs/releases/v11.md`). |
| 4.2 Moving and building | live (v1) |
| 4.3 Dinos, points, Dinowinkel | live. The golden dino came with v2. The Ridders section since 0.7.0 (`docs/releases/v17-v18.md`). Uitrusting and Edelstenen come with v19, v20 and v21 (section 12). |
| 4.4 Timers | live. The exam timer came with v2. |
| 4.5 Learning break | live (v1) |
| 4.6 Spaced repetition | live. Exam answers move boxes since v2. Villager answers move boxes since v11 (`docs/releases/v11.md`). |
| 4.7 Lessons and practice | live (v1) |
| 4.8 Answer types | live (v1) |
| 4.9 Taal module | live, exams since v2. The human content check (T65) runs beside the next release (decision 81). |
| 4.10 Rekenen module | live, Rekentoets exams since v2. |
| 4.11 Exams | live (v2) |
| 4.12 Parent gate | live. The lock on learning breaks is built in v3 (0.6.0, `docs/releases/v3.md`). The full automated route test moved to v5. |
| 4.13 Inhoud kiezen | live. The "geen vragen" warning in the parent area moved to v4. |
| 4.14 Eigen modules | Dropped (decision 79) |
| 4.15 Import, export, backup | Backup built in v3 (0.6.0). Module import and export dropped (decision 79). |
| 4.16 Resultaten | Moved to v6 (v1 has the simple break list only) |
| 4.17 Instellingen | live core, with Punten since v10. Volume, Alles wissen and the app version built in v3 (0.6.0). The card "Monsters en ridders" is live since 0.7.0 (`docs/releases/v17-v18.md`); the Monstermol row comes with v16 (section 12). |
| 4.18 Saving | live core. Broken save screen, storage notes and persistent storage moved to v4. |
| 4.19 App basics | live core. Offline, one window, plain http notes and the first start flow moved to v4. |

**v1 changes since the 2026-10-17 PRD.** These founder decisions and requests are built and live. Where the text in 4.1 to 4.19 says something else, this list wins.
* **Sky height 64** (decision 44). The world is 64 blocks high, not 32.
* **32 building blocks** (founder request CR1, see `docs/STATUS.md`). The 16 blocks from 4.1 plus obsidiaan, vuur, lava, mossteen, zandsteen, graniet, marmer, basalt, diepsteen, vuursteen, goudsteen, diamant, water, ijs, sneeuw and wol oranje. All free and unlimited. Alle blokken has category filters and a row to pick which of the 8 slots to fill. Water, vuur and lava are blocks only. They never hurt the player (there is no health).
* **Obsidiaan gate** (CR2) and **lava** (CR4). Four obsidiaan blocks lie in front of the start spot, with steen and vuursteen beside them. Building obsidiaan up on the left and right and placing vuur lights the gate. The start hotbar holds obsidiaan, vuur and lava.
* **Floating** (decision 47). Omhoog lifts the player into the sky. On release the player stays floating and can walk and build in the air. Omlaag goes down. Touching the ground ends floating. This replaces "No flying in v1" in 4.2.
* **Camera arrows** (decision 44). Four buttons ▲ ▼ ◀ ▶ turn the view smoothly, next to the look drag.
* **Nu oefenen** (decisions 48 and 56). A button on the countdown, in Extra oefenen, in the Lesboek and in the Dinowinkel starts a learning break right away. **From v10 (decision 92):** a Nu oefenen break pays like any break (+2, +1, +3 bonus, and the minus points of the Punten setting in 4.17), every round, with no day limit. The 10 extra points a day of decisions 48 and 56 are dropped.
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
**Status: v1.** With the changes in 4.0: 64 high, 32 blocks, the obsidiaan gate. Since v11 (`docs/releases/v11.md`) the world also has 3 villages, and 8 rare blocks the kid finds by answering villager questions.
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
  * When the kid has 25 shop dinos (decision 111) (eggs that have not hatched yet count too, golden dinos and chickens never count), every Kopen button is greyed out and the shop says "Je hebt al 12 dino's! Wat een kudde."
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
| Pause menu, Dinowinkel, Lesboek, Extra oefenen, dino menu, block grid, name keyboard, villager card (v11) | stops | |
| Learning break, including lessons, teach moments and summary | stops | |
| Exam, including its end screen and review | stops | runs until the last answer |
| Parent gate or parent area open | stops | stops |
| Portrait ("Draai je iPad") or window too small | stops | stops |
| App in background, screen locked, Control Center, app closed | stops | stops |

* Background is detected with `visibilitychange`, `pagehide` and `blur`. As a safety net, a heartbeat ticks every second; if more than 5 seconds pass between two ticks, that gap is not counted.

### 4.5 The learning break (F2, F6)
**Status: live**, with honest point banners and one egg hint rule from v9 (decisions 84 and 87). v10 (decision 92, live since 0.4.0) dropped the day limit and brought back minus points, set by the parent with Punten (4.17). A villager question (v11, `docs/releases/v11.md`) is not a learning break.
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

  * The total never goes below 0. A minus takes only what is there, and the banner shows what was really taken. Nothing else in the app takes points away, except buying an egg or a chicken. Dinos, eggs and chickens are never taken away.
  * A break with 0 right answers (no right on the first try and none on the retry) gives no plus points.
  * No day limit (v10): every break and every round of Extra oefenen pays in full, as often as the kid plays.
* Only the first tap or Klaar of each try counts. A double tap or two fingers on two buttons in the same moment count as one answer. "Verder", "Ik snap het", "Klaar" and "Terug naar de wereld" also act once.
* **The break ends only when every question is done** (right on the first try, right on the retry, or after a teach moment). Nothing else ends it, except the parent with "Pauze nu beëindigen". Questions not done when the parent ends a break are logged as "niet beantwoord". They give no points and do not change the spaced repetition boxes.
* **Summary screen:** the score ("4 van de 5 goed!", counting right on the first try or the retry), the points really earned in this break (plus and minus added up, so it can be "-1 punt" or "0 punten") and the new total. From v10 there is no "Genoeg geoefend voor vandaag" line. When the kid can now buy an egg, it adds "Je kunt een ei kopen in de Dinowinkel!". **Egg hint rule (v9, decision 84):** the same rule after a break, after Extra oefenen and for the Kopen button: fewer than 25 shop dinos (hatched or still an egg) and enough points for at least one egg. Golden dinos and chickens never count.
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

Answers in exams and in Extra oefenen also move the boxes the same way. Since v11, so do villager questions: only the first try counts (AC183). Exams ignore the parent's switches (see 4.11). In an exam there is only one try.

### 4.7 Lessons and practice
**Status: v1**, with Stoppen in Extra oefenen (4.0).
* Every topic has a lesson: a few short pages with a title, a short text, good and wrong examples, and a tip. The kid swipes or taps "Volgende" through them. The last page has "Ik snap het!".
* A lesson shows automatically in a break the first time new items of that topic are asked.
* **Lesboek:** from the pause menu the kid can open any lesson of any switched on topic at any time. Reading the Lesboek does not change the timers or the points.
* **Extra oefenen:** from the pause menu the kid can start a practice round of N questions from a module of their choice, picked with the same rules as 4.6. Each question works like in a break: retry, teach moment and the same points, with the same Punten setting (v10, decision 92, replacing F14). From v10 there is no day limit: every round pays in full, and "Genoeg geoefend voor vandaag, ga lekker bouwen!" is gone. The banners and the summary show only the points really earned, as in 4.5. The egg hint follows the rule in 4.5. The +3 bonus does not apply in Extra oefenen. It stops the play timer while open and does not reset it, so it never replaces a learning break.

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
**Status: live**, with the grown up question before the first pincode (decision 52) and the lock in the world only (decision 53). Since v2 the lock also shows on the exam screen, only to stop the exam (decision 61). From v3 (0.6.0, section 12) it also shows on a learning break, only to end the break (decision 119). The automated test of every route moves to v5 (see `docs/BACKLOG.md`).
* At first start the parent sets a 4 digit pincode (typed twice).
* A lock icon sits in the top right corner of the world, and from v2 on the exam screen (decisions 53 and 61). From v3 it also sits on the questions, lessons and teach moments of a learning break, where it only leads to "Pauze nu beëindigen" (decision 119, AC199). There is no lock on the break summary or on overlay screens. It looks small and grey, but its tap area is at least 44 x 44 points, inside the safe area and outside the look drag zone. Tapping it asks for the pincode.
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
**Status: Moved.** File header, sharing files, Backup maken and Backup terugzetten are moved to v3, the next release (section 12). The module parts are dropped (decision 79). The Import & Export section is a placeholder in the live build.
* **Every backup file** holds the app name, a format version and the date it was made. A newer app version can read older files. A file from a newer app version is refused with "Dit bestand is van een nieuwere versie. Werk de app bij."
* **Sharing files:** files go out through the iPad share sheet (save to Bestanden, AirDrop, mail). If the share sheet is not available (for example on plain http), the app opens the file in a new view where the parent uses the iPad share button. Both are fine for v1. If neither works, the parent sees a clear note.
* **Exporteer module:** Dropped (decision 79).
* **Importeer module:** Dropped (decision 79).
* **Id conflict on import:** Dropped (decision 79).
* **Bundle script:** Dropped (decision 79).
* **Backup maken:** one file with everything (settings, content choice, progress, results, exam results, world, hotbar, dinos, golden dinos, eggs, chickens, dino points, the found rare blocks, the villager cooldown and the villager who asked last), except the pincode, the gate lockout and the kept copy of the 0.4.0 world record. The file name holds only the app name and the date, for example `dino-blokwereld-backup-2026-10-24.json`. The app remembers the date of the last backup (the v4 reminder reads it).
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
**Status: live core**, with Punten since v10. Volume, Alles wissen and the app version at the bottom are moved to v3, the next release (section 12). Greying out "Pauze nu starten" during an exam came with v2.
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
| Pauze nu beëindigen | button, only during a break, logged as "door ouder beëindigd". From v3 the parent reaches it through the lock on the break, in a small parent view with only this button and "Terug naar de pauze" (decision 119, AC199). | |
| Wereld opnieuw beginnen | confirm, resets the blocks of the world and the player position. Dinos, eggs, dino points and learning progress stay. Dinos move to the start spot. Since v11 the new world has all 3 villages, and found rare blocks stay found (AC188). | |
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

Flows 2 to 5 and 7 are v1, and Flows 6 and 6b are v2. All of them are live. Flow 3 step 6 is the v10 rule with Punten on Normaal, the default (decision 92). Flow 1 is v4 (kept by decision 60), Flow 9 is v6, Flow 10 is v3 (section 12) and Flow 11 is v11 (live since 0.5.0). Flow 8 was dropped with v7 (decision 79). In v1 the first pincode is set the first time a grown up taps the lock, after the grown up question (decision 52).

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

### Flow 10: backup (v3, 0.6.0)
1. Parent opens Import en export and taps "Backup maken".
2. The share sheet opens and the parent saves the file to Bestanden.
3. Weeks later on a wiped iPad the parent taps the lock, answers the grown up question and sets a new pincode (from v4 this is the first start flow). In the parent area the parent taps "Backup terugzetten", picks the file in Bestanden and confirms.
4. The world, dinos, chickens, points and progress are back. The new pincode stays.

### Flow 11: a villager asks a question (v11)
1. I walk over a hill and see a little village with three houses. A villager in a red shirt wanders near a house.
2. I walk closer. The villager turns to me and waves. A big bubble shows: "Hoi! Wil je een vraag?"
3. I tap the bubble. A card opens with the villager and one question I had before in a pauze: 7 x 8.
4. I type 54 and tap Klaar. "Net niet. Probeer het nog een keer." I type 56. Green check.
5. The villager does a silly dance. The card says "Je hebt robijn gevonden!" I tap "In mijn hotbar" and the robijn block is in my hotbar.
6. I build a robijn tower. I open Alle blokken, tap Dorp and see "1 van de 8 gevonden" and seven "?" tiles.
7. I walk to the next village. Its villagers wander near home but no bubble shows yet. A few minutes of play later, a villager in a blue shirt waves at me.

## 7. Acceptance criteria
Times in these criteria are play time with the app visible, unless stated otherwise. Tests may use a fake clock. Criteria AC103 to AC144 were added in review round 1, AC145 to AC154 when the founder answered F1 to F13, AC155 to AC165 with v2, AC166 to AC171 with v9, AC172 to AC177 with v10, AC178 to AC191 with v11 and AC192 to AC199 with v3. They sit in their topic group. AC200 to AC229 are for v17 and v18 and sit in section 12 until they ship. **(iPad)** marks a check the founder or QA does by hand on the reference iPad, because headless WebKit cannot measure it. Removed criteria keep their number so references stay valid.

**Release tags (decisions 57 and 80).** A criterion with no tag is in force in the live build (v1, v2, v9, v10 and v11), or for v3 in 0.6.0, which goes live with the merge. A tag like **(v3)** means the criterion belongs to that release in `docs/BACKLOG.md`. A tag like **(v1, test in v3)** means the behaviour is live and the named part comes in that release. **(removed)** means the criterion no longer holds; the note says which release removed it. When a release ships, its tags are dropped here. Numbers never change and are never reused. Criteria dropped with v7 and v8 (decision 79) keep a one line note here; their text is in `docs/BACKLOG.md` under Dropped.

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
* **AC20:** Given the kid has 25 shop dinos (decision 111) (hatched or as eggs), when they open the Dinowinkel, then every Kopen button is greyed out, the "Je hebt al 25 dino's! Wat een kudde. Ruil er een in om plek te maken." message shows, and no points can be spent.
* **AC21:** No dino ever damages the player, breaks or places a block, or ends up inside a block.
* **AC110:** Given 45 points, when the kid taps "Kopen" and "Ja" on a 40 point egg 10 times within 1 second, then exactly one egg is bought, the total is 5, and the total never goes below 0.
* **AC111 (F7):** Given the kid has 25 shop dinos, when they pass an exam, then the golden egg still hatches into a golden dino, and the Dinowinkel still blocks a 26th shop dino.
* **AC149:** Given the Dinowinkel, then it shows the Compy for 20, the Triceratops for 40, the Stegosaurus for 40 and the Brachiosaurus for 80 points, and the kid's total. Given 30 points, then the Compy can be bought and the others are greyed out with "Nog 10 punten nodig" and "Nog 50 punten nodig". Given "Kopen" then "Nee", then nothing changes. The shop has no link, no real money and no payment screen.
* **AC150:** Given the kid bought an egg, when they return to the world, then the egg lies next to the player and after 5 seconds of play hatches into a dino of the bought kind on Volg mij. Given the app is killed right after "Ja", when it reopens, then the egg or the dino is there and the points were taken exactly once.
* **AC152:** Given no wrong answer, "Wereld opnieuw beginnen" or restart, then no dino or egg is ever removed. Only "Alles wissen" and "Backup terugzetten" replace them.

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
* **AC29:** Given a right answer on the first try in any learning break or in Extra oefenen, however many points the kid already earned today, then a green check, "+2 punten" and a happy sound (if sound is on) show, and the point total goes up by 2.
* **AC30:** Given a wrong answer on the first try, then "Net niet. Probeer het nog een keer." shows, the right answer is not shown, and the same question shows again with its input cleared.
* **AC31:** Given a break, then it ends only after every question is done (right on the first try, right on the retry, or a teach moment). Given a fake clock that moves 30 minutes while a question is on screen, then the break is still on that question and nothing is logged as "niet beantwoord".
* **AC32:** (removed, see F2: no break time limit, no "Laatste vraag")
* **AC33:** (removed, see F2: no "Geen limiet" setting)
* **AC34 (F6):** Given a break ends with K right out of N, with K from 1 to N, then the summary shows "K van de N goed!", the points really earned in this break and the new total. Given the kid can now buy an egg by the rule in AC169, then "Je kunt een ei kopen in de Dinowinkel!" shows.
* **AC35:** Given every question of a learning break (timed, Pauze nu starten or Nu oefenen) is right on the first try, then the kid gets 2 points per question plus a 3 point bonus (13 points for 5 questions).
* **AC36:** Given the summary, when the kid taps "Terug naar de wereld", then play resumes at the same spot and the play timer starts again at the full interval.
* **AC37:** Given a break is on question 3 on the retry, when the app is closed and reopened, then the same break shows question 3 on the retry with the same questions, and the points so far are kept.
* **AC38:** Given two modules are switched on with equal weight, when 10 breaks happen, then each module gets 5 breaks. Given weights 2 and 1, then over 9 breaks they get 6 and 3, also when the app is restarted between breaks. Given one module has no usable items, then its turn goes to the next module.
* **AC39:** Given no items are switched on anywhere, when a break starts, then the friendly "Er staan geen vragen aan" message shows and the break ends after 10 seconds with no points.
* **AC116 (F6):** Given a break ends with 0 right (first try and retry), then the summary shows the kind "Dit was lastig" message, no plus points and no bonus.
* **AC117:** Given a question, when the kid double taps an answer button, or two fingers hit two answer buttons in the same moment, then exactly one answer is logged for that try, the first one. Given a double tap on "Verder", "Ik snap het", "Klaar" or "Terug naar de wereld", then it acts once and no question or retry is skipped.
* **AC145:** Given a wrong first try in any learning break or in Extra oefenen, when the retry is right, then a green check and "Goed zo! +1 punt" show and the total goes up by 1 (on Moeilijk the first try already took 1, AC173).
* **AC146:** Given a wrong first try, when the retry is also wrong, then the teach moment shows "Zo zit het:", the right answer, the item's `explain` text and teaching: for a Taal or parent item the lesson page linked to the item's skill (or the first lesson page of the topic), for a Rekenen item a step by step worked example of that sum. Its points line and the change in the total follow the Punten setting (AC173), and "Ik snap het" moves to the next question.
* **AC147:** Given a total of 0 points, when a teach moment happens, then the total stays 0, whatever the Punten setting. The total is never below 0 anywhere in the app.

### Honest points
These came with v9 (decision 87, shipped as 0.3.0). The release text is archived in `docs/releases/v9.md`. v10 removed the day limit and brought back minus points (decision 92), so four of them are gone.
* **AC166 (removed):** the "Goed!" banner past the day limit. Removed with v10: there is no day limit (decision 92), see AC175.
* **AC167 (removed):** the part that fits under the day limit. Removed with v10, see AC175. Its rule "every number shown equals the change in the total" lives on in AC174.
* **AC168 (removed):** the "Genoeg geoefend voor vandaag" summary line. Removed with v10, see AC175.
* **AC169:** Given 24 shop dinos (hatched or as eggs), 2 golden dinos, 3 chickens and 20 points or more, when a break summary or the end of Extra oefenen shows, then "Je kunt een ei kopen in de Dinowinkel!" shows, and the Dinowinkel has a Kopen button for the Compy. Given 25 shop dinos, then the hint never shows after a break or after Extra oefenen, whatever the points. Given fewer than 25 shop dinos and fewer than 20 points, then the hint does not show. The break and Extra oefenen always agree.
* **AC170 (removed):** no malus anywhere. Removed with v10: mistakes cost points again by the Punten setting (decision 92), see AC172 and AC173. On Makkelijk the old rule still holds.
* **AC171:** Given the v9 build, then `package.json` has version 0.3.0 and `CHANGELOG.md` has a 0.3.0 entry in kid readable words that says the points now add up and a mistake never costs points.

### Punten setting and every round pays
These came with v10 (decision 92, shipped as 0.4.0). The release text is archived in `docs/releases/v10.md`.
* **AC172:** Given the parent area, Instellingen, then a "Punten" setting shows with three choices, Makkelijk, Normaal and Moeilijk, each with one short line saying what it does, and Normaal chosen on a new game. Given the parent picks Moeilijk and the app is closed and reopened, then Moeilijk is still chosen. Given a save from 0.3.0 (test fixture) with no Punten setting, then it loads with Normaal. The setting cannot be reached without the parent gate.
* **AC173:** Given a total of 10 points, then for one question in a timed break, a Nu oefenen break, a break from Pauze nu starten or Extra oefenen: on **Makkelijk**, a wrong first try and a wrong retry leave the total at 10 and no minus shows; on **Normaal**, a wrong first try leaves 10 with no minus, and a wrong retry gives a teach moment card with "-1 punt" and a total of 9; on **Moeilijk**, a wrong first try shows "Net niet. Probeer het nog een keer." with "-1 punt" and a total of 9, then a right retry shows "+1 punt" and a total of 10, or a wrong retry shows the teach moment with "-1 punt" and a total of 8. Given a timed break of 5 questions with 4 right on the first try and 1 teach moment, then the kid gets 8 points on Makkelijk, 7 on Normaal and 6 on Moeilijk. Given a change of Punten, then it applies from the next answer and changes no points already given.
* **AC174:** Given a total of 0 on Normaal, when a teach moment happens, then the total stays 0 and the card shows no minus. Given a total of 1 on Moeilijk, when the first try and the retry are both wrong, then the first shows "-1 punt" and the total is 0, and the teach moment shows no minus and the total stays 0. In every case each number shown equals the change in the total, and minus numbers are soft orange, never red. No mistake ever removes a block, dino, egg or chicken. Given an exam on any Punten setting, then no answer changes the total.
* **AC175:** Given the kid already earned 50 plus points today from Extra oefenen and Nu oefenen breaks, when the kid answers right on the first try in a new round of Extra oefenen, or in a Nu oefenen break started from the countdown, Extra oefenen, the Lesboek or the Dinowinkel (also when opened with the Winkel button), then "+2 punten" shows and the total goes up by 2. Given a Nu oefenen break with every first try right, then the +3 bonus is given. Given a save from 0.3.0 (test fixture) where today's limit was already reached, then the next round pays in full. The text "Genoeg geoefend" never shows anywhere in the app.
* **AC176:** Given a break or a round of Extra oefenen with plus and minus points (for example +2, +1, -1 and -1 on Moeilijk), then the summary shows the points of that round added up ("+1 punt"), or a minus in soft orange when the sum is below 0 ("-1 punt"), and the new total. The number on the summary always equals the change in the total over that round.
* **AC177:** Given the v10 build, then `package.json` has version 0.4.0 and `CHANGELOG.md` has a 0.4.0 entry in kid readable words that says every round of oefenen gives points again, and that papa or mama can choose how much a mistake costs.

### Dorp: villages, villagers and rare blocks
These came with v11 (decisions 94 and 95, shipped as 0.5.0). The release text is archived in `docs/releases/v11.md`; its words "village site" and "seen item" are defined there. Read AC7 and AC151 with the Dorp tab: the 32 building blocks are free from the start, the 8 rare blocks only once found.
* **AC178:** Given a new game or "Wereld opnieuw beginnen", when the world loads, then 3 villages stand at the same fixed spots every time, each with 2 or 3 houses made only of existing building blocks, on flat ground with no tree inside a village site, and no house block is within 10 blocks of the start spot or the obsidiaan gate. Given Hakken or Bouwen, then a house block can be mined and built on like any block. Given the terrain of 0.4.0 and the new terrain (automated), then they are the same in every cell outside the three village sites.
* **AC179:** Save safety. Given a save from 0.4.0 (test fixtures: no changes; changes inside one site only; changes in all three sites; a site where only the player, a dino, an egg or a chicken stands; 500 random changes spread over the world), when 0.5.0 opens it, then in every fixture every cell the kid changed holds exactly the same block as before, and the player stands where they stood. A site with any changed cell or anything standing in it gets no house and every cell in it is as before; every other site gets its houses; every cell outside the sites is as before. Given the app is opened a second time, then no cell changes. Given the old world record, then a copy of it is kept unchanged. Given the app is killed during the first load after the update (simulated), then the next start shows the whole old world or the whole new world, never a mix, and still no cell the kid changed is different.
* **AC180:** Given the world, then 8 villagers live in the villages (3, 3 and 2), each with its own shirt colour. Given 2 minutes of play (fake clock), then every villager stayed within 3 blocks of its home spot, was never inside a block, never moved the player and never changed a block. Given Bouwen mode, when the placed block would overlap a villager, then no block is placed. Given the app is closed and reopened, then every villager starts at its home spot. Given a site without houses (AC179), then its villagers stand on the ground there.
* **AC181:** Given the world with no overlay, the app ready, the cooldown over and at least one seen item switched on, when the player comes within 3 blocks of a villager that did not ask last, then the villager turns to the player and a bubble "Hoi! Wil je een vraag?" shows. Given two villagers within 3 blocks, then only the bubble of the nearest shows. When the player moves farther than 6 blocks away, then the bubble hides. Given the kid holds the move stick when the bubble shows, then the player keeps walking. Given 1024 x 768, 1180 x 820 and a 1024 x 690 Safari tab in landscape, then the bubble has a tap area of at least 44 x 44 points inside the safe area and does not overlap the stick, jump button, hotbar, countdown, Pauze, Winkel or the lock.
* **AC182:** Given an exam, a learning break, a lesson, a break summary, the pause menu, the Dinowinkel, the Lesboek, Extra oefenen, the dino menu, the block grid, the pin pad or the parent area is on screen, or the app is not ready yet, then no bubble shows and no villager card can open. Given 30 seconds or less on the play timer, then no bubble shows, and a bubble that shows at 0:31 hides at 0:30. Given every switched on item is in box 0, when the player comes close, then the villager says "Hoi!" with no question, nothing can be tapped for a question, and no cooldown starts.
* **AC183:** Given the kid taps the bubble, then a card opens with the villager and one question, from switched on content only, in box 1 to 5, never box 0, and no lesson shows. Given items of all four types and Rekenen, then each works on the card as in AC53 to AC58. Given a series of breaks with villager questions in between and the same series without them (automated), then the breaks get the same modules in the same order and the same new topics. Given a first try right, then the item's box moves up as in AC40 and AC42; given a first try wrong, then its box becomes 1, also when the retry is right. The answer is in the answer history marked "dorp", and no break is added to the Resultaten list.
* **AC184:** Given a question on the card, when the first try is wrong, then "Net niet. Probeer het nog een keer." shows, the right answer is not shown and the input is cleared. When the first try or the retry is right and the villager's block is not found yet, then the villager dances or "Respect bruuuuu!" shows, and the card shows "Je hebt [naam van het blok] gevonden!" with the block, "In mijn hotbar" and "Verder"; "In mijn hotbar" puts the block in the selected slot and closes the card. Given a fixed random seed and 10 right answers, then both the dance and "Respect bruuuuu!" happen. Given the block was found before, then the dance or "Respect bruuuuu!" shows with "Die had je al!" and the found count does not change. When the retry is also wrong, then "Zo zit het:", the right answer and the `explain` text show, no lesson page, no block, and "Verder" returns to the world. Given "Laat maar", then the card closes, no block is given, and a first try already given still counts for the box. A double tap on any card button acts once.
* **AC185:** Given a total of 10 points and any Punten setting, when the kid answers a villager question right, wrong once or wrong twice, then the total stays 10 and the card shows no plus or minus number and no bonus. Given 2:00 on the play timer, when a villager card is open for 60 seconds, then the countdown shows 2:00, plus or minus 1 second, after the card closes, and it is not reset to the full interval. Given the app is closed with a card open, when it reopens, then the world shows with no card.
* **AC186:** Given a villager card opened, then no villager shows a bubble until 3 minutes of play time have passed; time in the pause menu, a break, an overlay, a villager card, the parent area or the background does not count. Given the app is killed right after the card opened, when it reopens, then no bubble shows until the rest of the 3 minutes of play time has passed. Given the cooldown is over, when the player stands next to the villager that asked last, then it shows no bubble, and when the player comes close to another villager, then that one does.
* **AC187:** Given Alle blokken, then a "Dorp" tab shows 8 tiles and the counter "N van de 8 gevonden" with N the found count. Given a block not found yet, then its tile is dark with a big "?" and "Een dorpeling heeft deze", and tapping it does not change the hotbar. Given a found block, then its tile shows its picture and name, picking it puts it in the selected slot, and in Bouwen mode it can be placed without limit and mined as in AC3 and AC5. Given all 8 villagers answered right once (automated), then all 8 rare blocks are found and the counter shows "8 van de 8 gevonden". The 32 building blocks show and work as before.
* **AC188:** Given 3 found blocks and one of them in the hotbar, when the app is closed and reopened, then the Dorp tab shows "3 van de 8 gevonden" and the hotbar still holds it. When the parent does "Wereld opnieuw beginnen", then the Dorp tab still shows "3 van de 8 gevonden", the same 3 can be picked, and rare blocks placed in the old world are gone with it. Given a save from 0.4.0, then it loads with "0 van de 8 gevonden" and no cooldown running.
* **AC189:** Given the kid plays with villages, villagers and the card (automated), then the app makes no network request beyond its own files. Given an item whose text looks like HTML or a web address (test fixture), then the villager card shows it as plain text, with no link and no script. Given a save after villager questions, then the only new saved data is the found list, the cooldown and the last villager, plus the answers in the answer history.
* **AC190 (iPad):** Given the founder's oldest iPad (2018 or newer) from the home screen icon with the fps counter, 12 shop dinos on Volg mij and 10 chickens, when the founder walks for 2 minutes through the biggest village and on to the next one, then 95 percent of frames take 33 ms or less and no frame takes over 200 ms, as in AC101. The same walk on 0.4.0 is measured first as a baseline, and both results go in `docs/TEST_REPORT.md`. Given the check fails, then villagers stand still at home and only turn to the player (the fallback), AC180 reads "stays at its home spot", and the check is run again.
* **AC191:** Given the v11 build, then `package.json` has version 0.5.0 and `CHANGELOG.md` has a 0.5.0 entry in kid readable words that says there are villages in the world, villagers ask a question, and a right answer gives a dance and a rare block to collect.

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
* **AC52:** Given Extra oefenen with module Rekenen, then the kid gets N questions picked by the same rules, with the same retry, teach moment and points as a break (including the Punten setting), no +3 bonus, no day limit, and the play timer is stopped while the round is open.
* **AC120 (removed):** the 10 plus points a day cap on Extra oefenen (F6). Removed with v10 (decision 92), see AC175.

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
* **AC156 (learning break part changed by v3, see AC199):** Given a learning break, a lesson, a break summary, Extra oefenen, the exam start screen, the exam end screen or the review is on screen, then no lock and no parent button shows. Given the world, then the lock shows as in v1.
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
* **AC87:** Given "Backup maken" and then "Alles wissen", a new pincode, and "Backup terugzetten" with that file, then settings, content choice, progress, results, exam results, world, hotbar, dinos (with names), golden dinos, eggs, chickens, dino points, the found rare blocks and the villager cooldown are all back as before, and the new pincode still works.
* **AC130:** Given a broken backup file (cut off, wrong JSON, wrong app name), when the parent restores it, then a friendly message shows and all current data is unchanged. Given a backup from a newer format version, then it is refused with "Dit bestand is van een nieuwere versie".
* **AC131:** Given any backup file, then it holds the app name, a format version and the date. Given a backup whose saved data has an older save version (test fixture, including old `malus` entries in the points history), then it restores and the data is moved to the current shape, as in AC138.
* **AC133 (iPad):** Given "Backup maken" on the reference iPad in home screen mode on the HTTPS address, then the parent can save the file to Bestanden, by the share sheet or the new view fallback. Given "Backup terugzetten" on the same iPad, then the parent can pick that file from Bestanden and it restores.

### Parent: results and settings
* **AC89 (v6):** Given answers were logged, then Resultaten Per onderdeel shows for any node: answered, percent right on the first try in the last 30 days and all time, beheerst count and items per box, matching the logged answers.
* **AC90 (v6):** Given answers over several weeks, then the Over tijd chart shows one bar per week for the last 12 weeks with the right counts and percentages.
* **AC91 (v6):** Given Lastige vragen, then it lists up to 20 items, most wrong on the first try in the last 30 days first, with the kid's last wrong answer and the right answer.
* **AC92 (F13) (v6, v1 has the simple list with the mark):** Given Pauzes, then every break shows with date, module, score, points, length and how it ended. A break where every first answer took less than 2 seconds shows "snel geklikt". A break with one first answer of 2 seconds or more does not.
* **AC93:** Given every setting in the table in 4.17, then the parent can change it within its range, the change is saved, and it works as described.
* **AC94:** Given "Wereld opnieuw beginnen", then the blocks and the player position reset to the fixed starting world, dinos and eggs stand at the start spot, and dino points, learning progress and results stay.
* **AC95:** Given "Pauze nu beëindigen" during a break, then the break ends, the kid keeps the points so far, open questions are logged as "niet beantwoord" with no box change, and the break is logged as "door ouder beëindigd".
* **AC134 (v6):** Given Overzicht, then today and this week show play time, breaks, questions answered, percent right on the first try, percent right after the retry, teach moments, and points earned and spent, matching the log.
* **AC135:** Given Instellingen, then the app version shows at the bottom and equals the version in `package.json`.
* **AC154 (F13) (v1, audit in v5):** Given "Groter lettertype" is on, then text on every kid screen is 25 percent bigger than with it off (question text at least 30 points), no text is cut off in landscape on the reference iPad size, and the parent area text does not change.

### Backup, Alles wissen, Volume and the break lock
These came with v3 (decisions 90 and 119, built for 0.6.0). The release text is archived in `docs/releases/v3.md`.
* **AC192:** Given Instellingen, then a Volume setting from 0 to 100 shows, set to 70 on a new game. Given Volume 0, then no sound effect is heard. Given Volume 40, then the next sound effect plays at 40 percent of full loudness. Given the parent sets 40 and the app is closed and reopened, then Volume is still 40. Given Geluidseffecten uit, then no effect plays at any Volume.
* **AC193:** Given "Alles wissen", then a first confirm and a second confirm with different words show, and "Annuleren" at either step changes nothing. Given both confirms, then all data and the pincode are gone, a new game shows as in AC12, and the next tap on the lock asks the grown up question before a new pincode (decision 52).
* **AC194:** Given "Backup maken", then exactly one file is made, named `dino-blokwereld-backup-JJJJ-MM-DD.json` with the date of today. It holds no pincode, no pincode hash and no gate lockout, and no copy of the 0.4.0 world record. The date of this backup is saved. Making the backup sends no network request (automated). Given a save that still holds the kept copy of the 0.4.0 world record, when 0.6.0 opens it, then the copy is deleted and every block of the world is as before.
* **AC195:** Given a file to restore that is not JSON, is over 20 MB, or holds a value outside the save rules (a dino name over 12 characters or with characters not on the app keyboard, such as `<b>Pip</b>` or `https://x.nl`, negative points, more shop dinos than the shop allows (25, decision 111) or more than 10 chickens), when the parent restores it, then a friendly Dutch message shows and nothing changes. No text from a backup ever shows as a link or runs as a script.
* **AC196:** Given no break and no exam running, when the parent taps "Pauze nu starten", then the parent area closes and a learning break starts right away with the timed break rules. When the kid finishes it and taps "Terug naar de wereld", then play resumes with the play timer at the full interval.
* **AC197:** Given a valid backup, when the parent taps "Backup terugzetten" and picks it, then a confirm "Alles op deze iPad wordt vervangen door de backup van [datum]" shows with "Terugzetten" and "Annuleren". "Annuleren" changes nothing. Given a restore that is killed halfway (simulated), when the app reopens, then it holds all the old data or all the new data, never a mix.
* **AC198:** Given the v3 build, then `package.json` has version 0.6.0, Instellingen shows 0.6.0 at the bottom, and `CHANGELOG.md` has a 0.6.0 entry in kid readable words that says papa or mama can keep your world and dinos safe in a backup. The entries that were under Unreleased are part of the 0.6.0 entry.
* **AC199:** Given a learning break runs (timed, Nu oefenen or started with Pauze nu starten) with a question, lesson or teach moment on screen, then a small grey lock shows in the top right corner, with a tap area of at least 44 x 44 points fully inside the safe area, not over an answer button or the number pad. When it is tapped, then the pin pad of the parent gate opens. When the right pincode is typed, then a parent view shows with only "Pauze nu beëindigen" and "Terug naar de pauze", and no settings, content, results or backup. Given "Pauze nu beëindigen", then the break ends as in AC95 and the kid is in the world with the play timer at the full interval. Given "Terug" on the pin pad or "Terug naar de pauze", then the break shows the same question with the same typed answer. Given the kid does not know the pincode, then the break cannot be ended: 3 wrong codes block the gate for 1 minute with the shared lockout of AC74, and the break stays on the same question. Given the break summary, Extra oefenen or the world, then this lock does not show (the world keeps its own lock, the exam its own, AC155).

### Knights and the black bubble
Shipped with 0.7.0 (v17 Ridders and v18 Zwarte bubbel). "The table above" and "the rules above" in these criteria mean the parent switch tables and the rules for every monster and knight in `docs/releases/v17-v18.md`, which still hold.

* **AC200:** Given the Dinowinkel with Ridders on, then a section "Ridders" shows a Ridder card with name, picture and price 30, and its Kopen button has a tap area of at least 44 x 44 points. Given the master or Ridders off, then the section does not show. Given 3 knights, then the card says "Je hebt al 3 ridders!" and cannot be bought. Given 25 shop dinos, 10 chickens and 30 points, then a knight can still be bought and the herd and chicken counts do not change.
* **AC201:** Given 30 points, when the kid taps Kopen on the Ridder and then Ja, then the points are 0, one knight appears within 3 blocks of the kid with "Ridder tot je dienst!", and the ledger has one row `reason: 'knight'` with -30, saved in one transaction with the knight. Given Nee, then nothing changes. Given 60 points and 10 taps on Ja within 1 second, then exactly one knight is bought and 30 points are left. Given 29 points, then no knight can be bought.
* **AC202:** Given a knight bought for 30, when the kid trades him in and confirms, then the kid gets 15 points, the ledger has one row with +15, the knight leaves the world, and after a restart he is still gone.
* **AC203:** Given a knight, when the kid taps him in Hakken or Bouwen mode, then the knight menu opens with Volg mij, Blijf hier and Pas op de dieren, each button at least 56 x 56 points, and no block is mined or placed by that tap. Given the kid picks a mode and the app is closed and reopened, then the knight has the same mode.
* **AC204:** Given a knight on Pas op de dieren, then over 2 minutes he is never more than 9 blocks from his spot and he moves at least once every 10 seconds. Given a knight on Blijf hier, then over 2 minutes he stays within 1 block of his spot. Given a knight on Volg mij, then he walks at 3 blocks per second behind the kid, stays out of the view as decision 112 measures for dinos, and 40 taps on random world spots in view hit him 0 times.
* **AC205:** Given a knight on Blijf hier or Pas op de dieren, when the kid walks to within 3 blocks, then he salutes and "Hallo!" shows. When the kid walks away and comes back within 1 minute, then there is no second salute. When the kid comes back after more than 1 minute, then he salutes again.
* **AC206:** Given a knight on Pas op de dieren with 4 dinos and 2 chickens within 8 blocks of his spot and 1 dino at 12 blocks, when the kid taps him, then "Ik pas op 4 dino's en 2 kippen. Alles veilig!" shows. Given no dino or chicken within 8 blocks, then "Hier zijn nog geen dieren." shows.
* **AC207:** Given 3 knights in all three modes for 2 minutes (automated), then no block is broken or placed and the kid's position is never moved by a knight. Given the Dinofluit or Allemaal blijven, then no knight changes mode or spot.
* **AC208:** Given Instellingen, then a card "Monsters en ridders" shows the rows Monsters en ridders and Ridders, each with its exact help line from the table above and a tap area of at least 44 x 44 points. Given 2 knights, when the parent switches Ridders or the master off, then back in the world no knight shows and the Ridders section is hidden; when it goes on again, then both knights are back with the same modes. Given the master off, then the Ridders row shows greyed and keeps its value. Given a new install, an existing install and a restored backup from before 0.7.0, then the master and Ridders are Aan.
* **AC209:** Given a save from 0.6.0, then it loads with no knights and nothing else changed. Given a backup made with 2 knights, when it is restored on an empty iPad, then both knights come back with their modes. Given a backup from 0.6.0, then it restores with no knights. Given "Wereld opnieuw beginnen" with 2 knights, then both stand within 3 blocks of the kid in the new world with their modes.
* **AC210 (iPad):** Given the founder's oldest iPad from the home screen icon with the fps counter, 3 knights, 25 shop dinos and 10 chickens in view, when the founder walks for 2 minutes, then the AC101 target holds: 95 percent of frames take 33 ms or less and none takes over 200 ms. The result goes in `docs/TEST_REPORT.md`. Given the check fails, then the cap becomes 2 knights, AC200 reads "Je hebt al 2 ridders!", and the check runs again. The founder also looks and listens: the knight looks friendly and the fanfare is soft.
* **AC211:** Given the bubble on and 1 knight, then a bubble appears after 10 minutes of play time (plus or minus 1 second); time in a learning break, exam, Dinowinkel, dino menu, knight menu, parent area, background or portrait does not count. Given no knight and 29 points, then after 30 minutes of play time no bubble has come and the clock has not moved; when the kid then reaches 30 points, the clock runs on from where it stood. Given a bubble or Klodder out, then the clock does not move and no second bubble comes. Given a bubble or Klodder leaves, then the next bubble comes 10 minutes of play time later.
* **AC212:** Given the bubble is due and a learning break is due in under 60 seconds, then no bubble comes before the break, and the bubble comes 30 seconds (plus or minus 1) of play time after the break ends.
* **AC213:** Given a bubble comes, then it took at least 3 seconds to float in, it stands 6 to 10 blocks in front of the kid in an air cell in view, it is at least 80 points wide on screen, and over 30 seconds it stays within 1 block of its spot. Given the kid stands in a tunnel 1 block wide with no valid spot in view, then no bubble shows until a valid spot exists, checked every 5 seconds.
* **AC214:** Given a bubble, when the kid taps it in Hakken or Bouwen mode, then it pops, Klodder appears where it was with "Hihihi!", and that tap mines or places no block. Given Klodder, then he walks at 1.5 blocks per second. Given a bubble not tapped for 60 seconds of play time, then it floats away, no Klodder comes and no block changes.
* **AC215:** Given Klodder out for 3 minutes on a seeded world with a kid built hut and a village (automated), then every nibbled cell was a cell the kid never changed, more than 3 blocks from every kid changed cell, outside every village site, not oersteen, water or lava, and not under or next to the kid or an animal. There was at most one nibble per 4 seconds and at most 20 in total, and after 20 he still teases.
* **AC216:** Given 1 knight on Pas op de dieren with Klodder within 16 blocks, then the knight reaches him, or pops next to him after 3 seconds stuck (also from inside a closed pen), and the Moed bar fills at 1 per second. After 30 seconds (plus or minus 1) "Wegwezen!" shows, Klodder is in a bubble that floats away with "Doei!", and the knight is back in his mode. Given a knight on Volg mij 12 blocks from Klodder, then he does not go to him. Given 3 knights poking, then the bar takes 10 seconds (plus or minus 1). The bar never fills in under 3 seconds.
* **AC217:** Given Klodder has nibbled 10 blocks, when he leaves for any reason (knight, tired, switch off), then within 3 seconds every block is back, and not all in the same frame. Given the kid or an animal stands in a nibbled cell, then that block comes back within 1 second after the cell is free. Given the kid built a block in a nibbled cell, then the kid's block stays.
* **AC218:** Given a world record saved before Klodder came out, when Klodder nibbles 10 blocks and the page is hard killed (not a clean reload), then after the next start the world record is byte for byte the same as before, every block is there, and no bubble or Klodder shows. Given a backup made while Klodder is out, then it holds every block of the world. Given "Wereld opnieuw beginnen" while Klodder is out, then Klodder is gone in the new world and the bubble clock keeps its time.
* **AC219:** Given no knight and Klodder out, then after 5 minutes of play time (plus or minus 1 second) he yawns "Ik ben moe", climbs into his bubble and floats away, and every block comes back as in AC217. Given knights that never reach him (automated), then the same happens at 5 minutes. No setting changes the 5 minutes.
* **AC220:** Given a seeded map with a pen, a cliff of 4 and a pond, when Klodder teases 50 times (automated), then no animal is removed, loses anything, enters water or lava, drops more than 1 block, ends in a closed cell, leaves the world or changes its mode. 10 seconds after each tease, every Blijf hier animal is within 3 blocks of its spot and every follower is behind the kid. No animal is teased twice in a row. The saved dinos and chickens differ only in their positions.
* **AC221:** Given a Blijf hier dino walled in on all sides, when it is teased, then it jumps, plays its sound and stays. Given a dino on a Dinofluit call, then Klodder never teases it and it arrives at the kid. Given villagers and knights within reach, then Klodder never teases them.
* **AC222:** Given no knight and Klodder out for the first time ever, then "Klodder wordt vanzelf moe. Een ridder kan hem sneller wegsturen." shows once. Given any later Klodder, also after a restart or a restored backup made after the hint, then it never shows again. Given the kid owns a knight the first time Klodder comes out, then no hint shows.
* **AC223:** Given the card "Monsters en ridders", then the Zwarte bubbel row shows its exact help line. Given Ridders off, then the row shows greyed with "Werkt alleen met Ridders aan" and no bubble comes. Given a bubble or Klodder out, when the parent switches the bubble, Ridders or the master off, then back in the world neither is there and every block is back. Given a new install, then the row is Aan. Given an existing install or a restored backup from before 0.7.0, then the row is Uit, no bubble comes, and the bubble clock does not move until a parent switches it on.
* **AC224:** Given a bubble or Klodder out, then in each pause state (learning break, exam, Dinowinkel, dino menu, knight menu, parent area, background, portrait) nothing moves and the bubble's 60 seconds, Klodder's 5 minutes, his 4 second nibble clock and the Moed bar do not advance; after it, all goes on where it was. Given a knight on Pas op de dieren, then he also stands still in each pause state. Given a clean reload while a bubble or Klodder is out, then neither is there after it and the bubble clock has its saved time (plus or minus 1 second).
* **AC225:** Given Klodder out for 5 minutes (automated), then his box never overlaps the kid's, the kid's position is never moved by him, and the points, dinos, eggs, chickens, knights and found blocks do not change. No points are given for any monster event. Given a full play session with knights and Klodder (automated), then the app makes no network request beyond its own files.
* **AC226:** Given a backup made with 0.7.0, then it holds the bubble clock, the hint flag and the three switches, and they come back on restore. Given a backup from before 0.7.0, then it restores with a bubble clock at 0, no hint shown yet, and the switches as in the defaults table. Given a save with knights, then the only new saved data is the `monsters` record and the three switches.
* **AC227 (iPad):** Given the founder's oldest iPad from the home screen icon with the fps counter, Klodder, 3 knights (or 2, see AC210) and 25 shop dinos in view, when Klodder nibbles and a knight sends him off, then the AC101 target holds. The result goes in `docs/TEST_REPORT.md`. The founder looks and listens: Klodder is silly, not scary, and the sounds are soft.
* **AC228:** Given every new string of 0.7.0 (automated), then none holds a banned word from the rules above as a whole word. Given every new sound file, then each is under 1.5 seconds, its peak is at or below the loudest sound effect of 0.6.0, and no file name holds growl, scream or roar. Given Geluidseffecten uit or Volume 0, then every knight and Klodder line still shows as text. Given `prefers-reduced-motion`, then the bubble floats with no bounce and nothing shakes.
* **AC229:** Given the 0.7.0 build, then `package.json` has version 0.7.0, Instellingen shows 0.7.0 at the bottom, and `CHANGELOG.md` has a 0.7.0 entry in kid readable words that says you can buy a knight who guards your animals, and that a little monster in a black bubble may come, your knight sends him off, and every block comes back.

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

**Count:** AC1 to AC229 here, plus AC230 to AC291 for v15, v16, v19, v20 and v21 in section 12. 11 are removed: AC13, AC14, AC15, AC19, AC32, AC33, and with v10 AC120, AC166, AC167, AC168 and AC170 (decision 92). 9 are dropped with v7 and v8 (AC80 to AC86, AC88, AC132; decision 79). 209 active criteria here. 194 are in force in the live build: 105 from v1 (some with a part in a later release, AC34 and AC146 changed by v9, and AC29, AC35, AC52, AC145 and AC146 rewritten by v10), 24 from v2, 2 from v9, 6 from v10, 14 from v11, 13 from v3 (0.6.0: 5 completed and 8 new) and 30 from v17 and v18 (0.7.0). 15 belong to a later release: v4 has 8, v5 has 2, v6 has 5. Section 12 adds 62: 14 for v15, 14 for v16, 13 for v19, 10 for v20 and 11 for v21. The release after them continues at AC292.

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
* **Monsters and knights (from 0.7.0, section 12):** silly, not scary. Box made, big googly eyes, bright colours on a dark body. Sounds are giggles, boings, a soft "bloop" and a "Boe!", each under 1.5 seconds and never louder than the loudest effect today. No growl, scream, roar, teeth, blood, death, sudden loud sound or jump scare. A knight never hurts: he pokes, tickles and shouts "Wegwezen!", and the monster leaves with a silly line. Klodder may break only the blocks section 12 describes (never a kid build, a village or a block next to the kid or an animal), and every one comes back.
* **The bigger world and the mole (from 0.8.0 and 0.9.0, section 12):** the striped layer deep down is a cheerful yellow and black pattern, never a skull or a danger sign. The mole is silly, not scary: purple, big glasses, a pink nose and a slow waddle. Before he shows there is a soft rumble of 3 seconds with a short shake, and no shake with reduced motion. His sounds follow the monster rules above.
* **Knight gear and deep stones (from 0.10.0 to 0.12.0, section 12):** gear looks friendly and shiny: caps, helmets, shields, capes, armour, boots, banners and a tickle feather, no blood and no harm. Sparkles and soap bubbles flash at most 2 times a second and are off with reduced motion; metal shine is a colour, not an animation. A knight rides a pony, a horse or a triceratops in a seated pose. The 8 deep stones are bright stones with still specks, no animation.

## 9. Kid safety and privacy
* **Data stored and where:** only on this iPad, in Safari's storage for this app. Stored: settings, pincode (hashed), answer history, break and exam results, the world changes, the hotbar, dinos and eggs (with names the kid types), dino points, and since v11 which of the 8 rare blocks were found, the villager cooldown and which villager asked last. Villager answers go into the answer history like other answers. No real name, age, photo, location or contact data is asked for or stored. The dino name screen asks for a dino name, not the kid's name.
* **The live build (v1, v2, v9, v10 and v11):** the rules below all hold for it. It makes no files at all (backup comes in v3). Without the offline service worker (v4), it needs the internet to start and loads only its own files from `workers.dev`. Chickens and eggs are bought only with dino points. The automated safety suite that proves these rules is in v5; until then they are checked by reading the code and by the UI review.
* **Files (from v3):** backup files are made and restored only in the parent area, behind the gate. They hold only game data: no real name, age, photo, location or contact data, only what the list above says (dino names included). They do not hold the pincode or the gate lockout, and the file name holds only the app name and the date. A backup never leaves the iPad on its own: no upload, no server, no automatic sync. It only leaves when the parent sends it through the iPad share sheet (or the new view fallback). A restored file is checked in full and its text shows as plain text, never as a link or a script.
* **Network use:** only to load the app's own files from the public `workers.dev` address on first visit and for updates (F9). No other requests. No data is ever sent anywhere. The server holds only the app files, nothing about the kid. Cloudflare Web Analytics and any other Cloudflare injected script stay off.
* **Tracking, ads, chat:** none. No analytics, no cookies for tracking, no third party scripts or fonts from other servers.
* **Villagers (since v11):** villagers are part of the game, not people. They only show fixed text from the app and questions from the switched on modules, as plain text. The kid cannot type to them and they never ask for a name or anything personal. They never chase, trap, push or hurt the kid, and never break or place blocks. Their questions give no points and take none. Houses only go into an existing world where the kid changed nothing, so no kid build is ever changed.
* **Monsters and knights (from 0.7.0, section 12):** they are part of the game, not people. They only show fixed text from the app; the kid cannot type to them and knights get no names. Knights are bought only with dino points, never real money, and nothing says the kid must have one. No animal is ever hurt, eaten, lost or taken: "plagen" means it jumps, makes its own sound, runs a few blocks and carries on. A monster never touches, pushes, follows or traps the kid and never takes points, animals, knights or found blocks. Klodder only comes out when the kid taps the bubble, always tires after 5 minutes, may break only the blocks section 12 describes, and every block comes back: his breaks are never saved. No points or prizes come from monsters. The parent switches all of it in Instellingen, card "Monsters en ridders", behind the gate. New saved data: one `monsters` record (the knights with their spot and mode, the bubble clock, the hint flag) and the new switches, also in the backup. Nothing live is saved.
* **The bigger world and the mole (from 0.8.0 and 0.9.0, section 12):** the bigger world moves the kid's own world into the middle and changes no block the kid built. No animal, knight, point or found block is lost, and old backups still restore. The mole comes only after the kid digs past two warnings, comes up away from the kid, and never touches, pushes, follows, traps or blocks the kid. He never breaks or places a block and never takes anything. He teases only animals on Vrij rondlopen, which are never hurt or lost, and he always leaves. The parent switches him off with the row Monstermol in the card "Monsters en ridders". The only new saved data is that switch (and the Kijkafstand setting, only if v15 needs fallback step 2). Nothing live is saved. No network request.
* **Knight gear and deep stones (from 0.10.0 to 0.12.0, section 12):** gear and stones are bought only with dino points, never real money, and nothing says the kid must have them: a bare knight still sends every monster off, and a found stone stays found. No pressure text, only the price and "Nog X punten nodig". Nothing bought is ever lost: gear goes back to the wapenkast on a trade in, stays through a switch off and "Wereld opnieuw beginnen", and stones stay found and bought. New saved data, in the `monsters` record and the backup: the wapenkast, the items each knight wears, and the found and bought stones. No new personal data, no text the kid types, no network request.
* **Purchases:** none with real money. The Dinowinkel only uses dino points earned by learning. There is no payment code, no store link and no way to buy points.
* **External links:** none. Module text is shown as plain text and is never a link.
* **Parent gate:** a 4 digit pincode protects settings, content choice, backup, results, ending a break and stopping an exam. The lockout survives reloads. PIN vergeten uses a fresh two step grown up question with a 10 minute block after 2 wrong tries, sharing the lockout with the pin pad (F3, F4). The first pincode can only be set after the same kind of grown up question (decision 52). The lock shows only in the world (decision 53) and, since v2, on the exam screen, only to stop the exam (decision 61). From v3 a learning break also shows the lock, only to end the break: behind the gate the parent sees only "Pauze nu beëindigen" and "Terug naar de pauze" (decision 119).
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
The decisions F1 to F15 are answered. Details are in `docs/DECISIONS.md` (rows 8 to 22). The recut questions D1 to D3 are answered too (rows 59 to 61), and so are decisions 78 to 81, 84, 87, 90 to 92, 94, 95, 119, 124 and 130 to 134. No founder question is open for v15, v16, v19, v20 and v21.

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
| 90 | Release after R1 | v3 Dino's veilig: backup and restore, Alles wissen, Volume, app version. Now 0.6.0, after v11 (decisions 92 and 94). | 4.15, 4.17, `docs/BACKLOG.md` |
| 91 | Parent learning dashboard | v6 Wat heb ik geleerd grows into a parent dashboard, worked out on the iPad behind the gate. Now 0.7.0, after v3. | 4.16, `docs/BACKLOG.md` |
| 92 | Points only in the first round (kid bug) | v10 Punten voor elke ronde (0.4.0) goes first: no day limit, every round pays. Mistakes cost points again by a parent setting Punten: Makkelijk, Normaal (default), Moeilijk. Drops the day cap of decisions 48 and 56 and reverses the no malus part of decision 87. Shipped 2026-10-24. | 4.0, 4.5, 4.7, 4.17, 8, 9, AC172 to AC177, `docs/releases/v10.md` |
| 94 | Villagers and houses (founder wish) | v11 Dorp (0.5.0) right after 0.4.0. A right villager answer gives a silly dance or "Respect bruuuuu!" and a rare block, a different one per villager. A villager asks at most once every few minutes and the kid can walk on. The bigger world is a separate later step. v3 becomes 0.6.0, v6 0.7.0. | 12, `docs/BACKLOG.md` |
| 95 | v11 Dorp details | Villages go into existing worlds only where the kid changed nothing; the old world record is kept for one release. A speech bubble the kid taps starts the question. The first try moves the learning boxes, like Extra oefenen. Found rare blocks survive "Wereld opnieuw beginnen". No points and no minus. Cooldown 3 minutes of play, shared by all villagers. Shipped 2026-10-24. | AC178 to AC191, `docs/releases/v11.md` |
| 119 | v3 scope and how the parent ends a break (V3-1) | v3 Dino's veilig ships next as 0.6.0, then v6 as 0.7.0 with its own signoff. A small lock on a running learning break opens the parent gate, only to end the break, like the exam lock of decision 61 (option A). Not chosen: B, keep the button unreachable and test it through the code only; C, remove the button and AC95. 0.6.0 also gives a version to what went live under Unreleased (decisions 111 to 116). | 4.12, 4.17, 9, AC156, AC199, `docs/releases/v3.md` |
| 124 | Bigger world (founder wish) | The world 2 times as big and 2 times as deep: 128 x 128 and about 20 blocks to dig. The kid's world stays as the middle, with new land around it and deeper ground under it. It starts with a speed check on the oldest iPad. Decision 131 moved it after v17 and v18, so it ships as 0.8.0 and v16 as 0.9.0. | 12, AC230 to AC243 |
| 130 | Monsters, knights and deep stones (founder wish) | Direction approved, drafted in `docs/MONSTERS_PRD.md`. No animal is ever eaten, hurt or lost. Every feature has a parent switch. Questions not asked take the draft's recommendation. | 8, 9, 12 |
| 131 | Build order | v3 first, then v17 Ridders and v18 Zwarte bubbel on today's world, then v15 Grote wereld, then v16, v19 and v20. | 12, `docs/BACKLOG.md` |
| 132 | When the black bubble comes | The bubble clock runs only while the kid owns a knight or has 30 points. On existing installs the bubble is off until a parent switches it on. Klodder always tires after 5 minutes and every block comes back. | 9, 12, AC211, AC215, AC217 to AC219, AC223 |
| 133 | Knight gear width | About 8 items first with a Kracht cap, so a fight always lasts a moment; the rest later (v21). For this release only the 3 second minimum fight counts. | 12, AC216, AC262, AC283 |
| 134 | One signoff for v17 and v18 (MOQ14 C) | v17 and v18 are built back to back and released together as 0.7.0 on one signoff. | 12 |

Choices made by product inside these answers, which the founder sees when signing: the point values (+2, +1, +3 bonus, and from v10 the minus points of Punten) and egg prices (20, 40, 40, 80); a fourth small dino kind (Compy) so there is a cheap first egg (confirmed by the founder, F15); from v10 the Punten setting holds in every break and in Extra oefenen, never in exams (decision 92); a Punten change applies from the next answer; only the first try counts for spaced repetition; exams give no points; "Wereld opnieuw beginnen" keeps dinos and points. For v11: the names of the 8 rare blocks; a right answer on the retry also gives the dance and the block; a "Laat maar" button lets the kid close a villager card without answering; a village site is also left alone when the player, a dino, an egg or a chicken stands in it; and the fallback if villagers are too slow on the iPad (they stand still at home and only turn to the kid). For v3: the 20 MB limit on a backup file; a restore keeps the pincode of this iPad; the break lock shows on questions, lessons and teach moments but not on the summary; its parent view has only "Pauze nu beëindigen" and "Terug naar de pauze"; and the kept copy of the 0.4.0 world record is deleted in 0.6.0, not put in the backup.

**Decided during the build** (`docs/DECISIONS.md` rows 44 to 57, all built into v1 as listed in 4.0): sky height 64 and camera arrows (44), visible countdown (45), floating with Omhoog and Omlaag (47), Nu oefenen (48, 56), the shop layout (49), Gemini's build is the truth (50), Stoppen in Extra oefenen (51), grown up question before the first pincode (52), lock in the world only (53, replaces 46), home screen first (54), chickens for 5 points, at most 10 (55), and the v1 recut (57). The founder requests CR1 to CR4 (32 blocks, the obsidiaan gate, chickens, lava) are recorded as decision row 58. Signing this PRD confirms them as part of v1.

**Decided for the recut and v2** (rows 59 to 61): see D1 to D3 in the table above. **Decided for the split and v9** (rows 78 to 81, 84, 87): see the table above. **Decided for v10 and v11** (rows 92, 94 and 95) **and for v3** (row 119) **and for v17 and v18** (rows 130 to 134): see the table above.

**Choices made by product for v15 and v16**, which the founder sees when signing: a world 80 high and the move of 32, 10 and 32, so every old cell fits; the stripes at y 5 and the veins at y 1 to 4; the seam rule of 1 block; the CI budgets of AC240 (5 times the faces, 3.5 times the faces drawn); the order of the speed fallback; the mole's speed of 1 block per second, the 10 second fence rule, 60 seconds alone, 10 minutes tired and Moed 15; only animals on Vrij rondlopen as targets; no mole while a bubble or Klodder is out; the line "Hmm... toch maar niet." when no spawn spot fits; and the Monstermol row on for every install.

**Choices made by product for v19, v20 and v21**, which the founder sees when signing: each item is bought once and moves between knights for free, so 3 knights share one set (draft MO19-3, "one of each costs 210"); gear cards are greyed with "Koop eerst een ridder" while the kid has no knight, so no points go to gear nobody can wear; any item in Hoofd, Schild, Hand or Rug gives the same Kracht +1, so the v21 items there (also the Houten zwaard) add looks, not more Kracht; the Moed bar fills by the Kracht of the poking knights added up, capped at full in 3 seconds; boots add nothing while a knight rides; the Banier and Koningsbanier ranges of 12 and 14 (20 and 22 on guard); soap bubbles that cannot be tapped; the stone tiles with still specks; a "?" card in Edelstenen for a stone not found; a backup file format one up in each of the three releases; and **the 5 v21 items over the 60 point ceiling** (Glanzend harnas 70, Bubbelstaf 75, Gouden helm 80, Strijdpaard 90, Rij-triceratops 120) keep the draft prices. The other option is to cap them at 60.

### Open founder decisions
None for v15, v16, v19, v20 and v21. MOQ14 is answered by decision 134. MOQ15 (where v6 goes in the order) is a backlog question for a later `/release` and is not part of this signoff (`docs/MONSTERS_PRD.md` 8.1). With v19, v20 and v21 scoped here, its options are now right after v16 (before v19) or after v21. A founder question comes up before 0.8.0 ships only if the v15 speed check still fails after fallback step 2 (section 12, v15).

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
| 3D speed on the iPad was never measured | Stutter with many dinos | The speed spike (T32) is in v5. The kids already play, so stutter they notice moves v5 up. v11 measures fps with 8 villagers, 12 dinos and 10 chickens on the founder's iPad (AC190). |
| Houses land on a kid's build in an old world | A castle with house walls grown into it, an upset kid | A village site gets houses only where the kid changed no block and nothing stands (AC179). The old world record was kept for one release, so the operator could put it back if the founder asked. v3 deletes the copy (AC194). |
| The kid taps the break lock to escape a break | The kid guesses codes instead of answering | Behind the lock only the pincode helps. 3 wrong codes block the gate for 1 minute with the shared lockout, and the break waits on the same question (AC199). |
| Villager questions interrupt play | The kid feels chased by questions | The kid taps a bubble to get a question and can walk on. One question per 3 minutes of play across all villagers, never in the last 30 seconds before a break. |
| Kids farm villagers for points | Less learning, more tapping | Villager questions give no points, only a dance and a block, and each block only once. |
| Klodder feels like pressure to buy a knight | The kid feels forced to spend | The bubble clock runs only with a knight or 30 points, the kid chooses to tap, Klodder tires after 5 minutes, breaks at most 20 blocks far from any build, and every block comes back. The hint names no shop. Off on existing installs until a parent switches it on (decision 132). |
| Klodder breaks something the kid made | An upset kid | He picks only cells the kid never changed, more than 3 blocks from any kid changed cell and outside villages. His breaks are never saved, so even a crash brings every block back (AC215, AC218). |
| Knights and Klodder make the iPad stutter | The game is not fun | At most 3 knights and 1 Klodder, each at most 6 meshes, one nibble per 4 seconds. The AC101 target is checked on the founder's oldest iPad with a herd of 25 (AC210, AC227). If the knight check fails, the cap is 2 before shipping. |
| The 128 x 128 world is too slow on the oldest iPad | Stutter or a slow start, the game is not fun | A draw budget check in CI (AC240), the iPad check before shipping (AC241), and a fallback in order: near chunks only, then a Kijkafstand switch, then a founder decision (96 x 96 or hold v15). |
| The move breaks or loses something the kid built | An upset kid | Every kid changed cell and every spot moves by the same step, checked cell by cell on fixtures from 0.4.0 and 0.7.0 (AC235, AC236). A killed move never moves anything twice (AC237). Old backups still restore (AC238). |
| The mole scares the kid or the animals never get rest | An upset kid | Two warnings and the kid's own dig, a 3 second rumble, a silly look. He comes up away from the kid and teases only animals on Vrij rondlopen. He always leaves: a fence, a knight, 60 seconds alone or 10 minutes. The parent can switch him off (AC244 to AC257). |
| Gear makes fights too short or knights feel weak without it | No fun in the Moed bar, or the kid feels gear is a must | Kracht is at most 5 and a fight always lasts at least 3 seconds (AC262, AC283). A bare knight still wins. No text says a knight is weak. |
| Gear on 3 knights makes the iPad stutter | The game is not fun | Gear is merged into at most 6 meshes per knight with one cached geometry per gear set, checked on the founder's oldest iPad (AC269, AC290). |
| Expensive stones feel out of reach | The kid gives up | A found stone stays found, the cheapest is 80, and nothing is needed to play. Prices are one line of data and easy to change after the kids play. |

## 12. Releases

Only the next release has its section here, and it is signed with this file. When it ships, its section moves to `docs/releases/vN.md` and its criteria move into section 7. That happens together with scoping the release after it, so it is one signoff. Shipped releases: v2 in `docs/releases/v2.md`, v9 in `docs/releases/v9.md`, v10 in `docs/releases/v10.md`, v11 in `docs/releases/v11.md`, v3 (0.6.0) in `docs/releases/v3.md`, and v17 and v18 (0.7.0) in `docs/releases/v17-v18.md`. The ranked backlog is in `docs/BACKLOG.md`.

This time section 12 holds five releases, each shipped on its own in this order: v15 Grote wereld (0.8.0) and v16 Monstermol (0.9.0), signed on 2026-11-15 and built, waiting for the founder's merge; then v19 Ridderuitrusting (0.10.0), v20 Diepe edelstenen (0.11.0) and v21 Meer uitrusting (0.12.0), scoped in this signoff on the founder's request of 2026-11-16 ("Ok werkt op de iPad, bouw de rest"). Where a section here says "the v17 and v18 section", that text is now in `docs/releases/v17-v18.md` and still holds.

### v15 Grote wereld (0.8.0)

**Status:** next after v17 and v18. The founder asked for it on 2026-11-15 ("ok kun je de mol en grote wereld ook bouwen", decisions 124 and 131). It is signed on this signoff together with v17, v18 and v16, so this time section 12 holds three releases. It is built after 0.7.0 ships and ships on its own as 0.8.0. Sources: `docs/BACKLOG.md` (v15), `docs/DISCUSSION.md` (the bigger world, and architect A1 and A9 in MONSTERS_PRD review round 1). Where they differ, this section wins.

**Goal:** "My world is much bigger now and I can dig much deeper. Everything I built is still there, in the middle, with new land all around it. Deep down there is a striped layer."

**Why:** a founder and kid wish (decisions 94 and 124). The kid knows every corner of 64 x 64 and can dig only about 9 layers. v16 Monstermol and v20 Diepe edelstenen need the depth, so the striped layer and the hidden vein spots go into this terrain version, and v16 and v20 need no terrain version of their own (architect A1).

**Facts checked in the code on 2026-11-15.**
* `src/world/terrain.ts`: `WORLD_SIZE` 64, `WORLD_HEIGHT` 64, `CHUNK_SIZE` 16. Terrain versions 1 (the world of 0.4.0) and 2 (version 1 plus the villages), `CURRENT_TERRAIN_VERSION` 2. The ground is about y 10 and oersteen is y 0. `cellIndex` depends on `WORLD_SIZE`, and the start spot is the middle of the world.
* `src/game/world-save.ts`: the world record is a diff (cell index times 256 plus the block id) against the start world of its terrain version. `upgradeV1World` stamps the villages into a version 1 world once and writes the new record in one put. The player, dinos, eggs and chickens are saved in their own records, in world coordinates. `restorePlayer` ignores a spot outside 64 x 64 x 64.
* `src/render/`: every chunk (16 x 16, full height) is meshed when the world is set, and every mesh stays in the scene. A block change rebuilds at most 3 chunks. The view distance is the fog: `fogFar` 60 and a camera far plane at 80 (`quality.ts`, `renderer.ts`). At 128 x 128 there are 64 chunks instead of 16.

**Words used here.**
* **The move:** a cell or spot at (x, y, z) in the 0.7.0 world is at (x + 32, y + 10, z + 32) in the 0.8.0 world.
* **The middle:** the columns with x and z from 32 to 95, the old world after the move.
* **New land:** every column outside the middle.
* **Ground:** the highest solid block of a column in the start world.
* **Old save:** a save with terrain version 1 or 2. **Old backup:** a backup file made by 0.6.0 or 0.7.0.

**In:**
1. **Terrain version 3.** The world is 128 x 128 blocks and 80 high. Every new game gets the same start world from the fixed seed. The middle is the terrain version 2 start world after the move, block for block, with its 3 villages, its trees and the obsidiaan gate. Its old bottom layer of oersteen becomes steen.
2. **Deeper ground everywhere.** Under the middle and the new land: oersteen at y 0, steen with a little keisteen at y 1 to 4 and y 6 to 9, and a full layer of Waarschuwsteen at y 5. The ground is 10 layers higher than before, so the kid can dig about 19 layers down before oersteen. The room to build above the ground is a bit bigger than today.
3. **Two new block kinds, not for building.** Waarschuwsteen (id 42): yellow and black stripes, can be mined, cannot be placed, not in Alle blokken. Vein blocks (ids 43 to 50): the hidden spots of the 8 deep stones of v20, at y 1 to 4. They look and mine exactly like steen, cannot be placed and are not in Alle blokken. In v15, mining either one is like mining steen. The warnings come in v16 and the stones in v20.
4. **New land.** Gentle hills, grass, sand patches and trees like the middle. No water, no lava, no new villages. It meets the middle with no cliff.
5. **Edges.** The invisible wall stands at the edge of the 128 x 128 world. Nothing stops the kid at the old edge. "Ik zit vast" and "Wereld opnieuw beginnen" use the start spot in the middle, which is the same place in the kid's world as before.
6. **Nothing is lost: the kid's world moves to the middle.** The first time 0.8.0 opens an old save, every kid changed cell and everything with a place in the world moves with the move: the player, the dinos, eggs and chickens, their Vrij rondlopen spots, the knights with their Blijf hier and guard spots, and the villagers with their villages. A terrain version 1 world first gets its villages as 0.5.0 does (AC179), then moves. Names, kinds, modes, points, found blocks, the hotbar, the bubble clock and every setting stay the same. The move is safe: a kill halfway never moves anything twice and never mixes the old and the new world.
7. **Backups.** A backup made by 0.8.0 holds terrain version 3 and a file format version one higher than 0.7.0 writes, so 0.7.0 refuses it as a newer file (4.15). An old backup still restores in 0.8.0 and moves as in item 6.
8. **Speed.** An automated draw budget check that runs in CI (AC240) and the check on the founder's oldest iPad (AC241). If the iPad check fails, the speed fallback below is built before shipping.
9. **Version 0.8.0** and a `CHANGELOG.md` entry in kid words.

**Speed fallback**, in this order. After each step AC241 runs again.
1. **Near chunks only.** Build and draw only the chunks within 4 chunks (64 blocks) of the chunk the player stands in. Missing meshes are built at most 2 per frame as the kid walks, nearest first, and meshes more than 6 chunks away are dropped. The world size and the fog stay the same.
2. **A Kijkafstand switch.** A row "Kijkafstand" in Ouders > Instellingen with Ver (today's view, the default) and Dichtbij (fog ends at 40 blocks, chunks within 3 chunks), with the help line "Dichtbij maakt het spel sneller op een oudere iPad. Je kijkt dan minder ver." Saved with the settings and in the backup (AC243). The founder sets Dichtbij on the oldest iPad and the check runs with it.
3. **Still too slow:** a founder decision before 0.8.0 ships. Options: ship a 96 x 96 world (the same rules with a move of 16 instead of 32), or hold v15 and stay on 0.7.0 until a fix is found. Nothing is built for this step until the founder answers.

**Out:**
* A world bigger than 128 x 128 or higher than 80. Caves, water or lava in the new land, new biomes, more villages or villagers, day and night.
* A choice between the old world and a new one (decision 124 keeps the old world in the middle).
* The warnings, the card and the mole (v16). Showing, finding or buying the deep stones (v20).
* The Kijkafstand switch, unless fallback step 2 is needed.
* v6 and its slot in the order (MOQ15, a later `/release`).

**Kid safety.** No new personal data, no new text the kid types, no network request. The move changes no block the kid built and loses no animal, knight, point or found block. A killed or failed move leaves a world the kid can play, never a mix. The striped layer is a cheerful yellow and black pattern, not a skull or a danger sign, and in v15 nothing tells the kid about the mole yet. Sections 8 and 9 hold as updated in this signoff.

**Core text changed with this release.** From 0.8.0 the world of 4.0 and 4.1 is 128 x 128 and 80 high, with the striped layer and about 19 layers to dig, and AC1 reads with that size. The text of 4.1 changes when v15 ships; until then this section describes it. Section 10 (Performance) names a 48 x 48 fallback for the first world; from 0.8.0 the speed fallback of this section applies instead. Section 11 gets decision 124 and two risks.

**Plan tasks** (4):
* **V15a** Terrain version 3: the size, the middle from version 2, the deep ground, Waarschuwsteen and the vein ids with their tiles and block rules, the new land and its seam, the start spot and the village sites, unit tests.
* **V15b** The move: the world diff from version 2 (and version 1 through the village stamp), every saved spot (player, dinos, eggs, chickens, knights, the `monsters` record), one safe write, the backup check for old and new files, unit tests and the kill test.
* **V15c** Render and speed: 8 x 8 chunks, the draw budget test, the `chunkStats` hook, the frame log, and fallback step 1 if it is needed.
* **V15d** E2e, version and the iPad check: walk into the new land, dig to the stripes, open an old save, restore an old backup, version 0.8.0 and the CHANGELOG, AC241 in `docs/TEST_REPORT.md`, and fallback step 2 if it is needed.

**How it is tested.** Existing hooks: `terrainVersion`, `blockAt`, `placePlayer`, `player`, `dinos`, `knights`, `villageSites`, `simulateKill`, `flushSave`, `resetWorld`. New hooks (not in the production build): `worldSize` (width and height), `mineAt(x, y, z)` (mines like a kid tap; v16 reuses it) and `chunkStats` (chunks with a mesh, chunks drawn in the last frame, faces drawn in the last frame). Old saves and old backups are fixture files under `tests/fixtures/`, made with 0.4.0, 0.6.0 and 0.7.0, each with a kid built hut, mined holes and a placed rare block.

**Acceptance criteria.** All criteria in section 7 and AC200 to AC229 still hold, read with the move. New for v15:

* **AC230 (v15):** Given a new install of 0.8.0, then `worldSize` gives 128 x 128 and 80 high and `terrainVersion` gives 3. The kid starts standing on the ground at x 64.5 and z 64.5, the same spot of the world as in 0.7.0 after the move. Given the kid at the start spot, then the ground there is exactly 10 layers higher than in 0.7.0, and the kid can mine at least 18 layers straight down before reaching oersteen at y 0.
* **AC231 (v15):** Given the start worlds of terrain version 2 and 3 from the fixed seed (automated), then for every cell (x, y, z) of version 2 with y from 1 to 63, the version 3 cell at the move holds the same block, and every version 2 cell at y 0 (oersteen) is steen in version 3. So the 3 villages, the trees and the obsidiaan gate are in the middle as before. The same seed always gives the same version 3 world, byte for byte.
* **AC232 (v15):** Given the terrain version 3 start world (automated), then in every one of the 128 x 128 columns y 0 is oersteen and y 5 is Waarschuwsteen, every cell at y 1 to 4 is steen, keisteen or a vein block, and every cell at y 6 to 9 is steen or keisteen. Each of the vein ids 43 to 50 lies in at least 2 veins of 3 to 6 touching cells. No cell above y 5 is a vein block or Waarschuwsteen.
* **AC233 (v15):** Given a Waarschuwsteen, then it shows yellow and black stripes, can be mined in Hakken mode, cannot be placed, and is not in Alle blokken. Given a vein block, then it shows the steen tile, mines like steen, cannot be placed, and is not in Alle blokken. Given the kid mines either one in 0.8.0, then the cell becomes air like any mined block and is saved as a kid change, and no toast, card or sound other than the mining pop comes.
* **AC234 (v15):** Given the terrain version 3 start world (automated), then the new land has grass and trees and no water or lava, each ground column of the new land next to a column of the middle differs from it by at most 1 block in height, and two neighbouring ground columns in the new land differ by at most 2. Given the kid walks from the start spot straight to each of the 4 sides, then nothing stops them before the edge of the 128 x 128 world, and at the edge an invisible wall keeps them inside (x and z stay from 0 to 128). Given "Ik zit vast", then the kid is at the start spot of AC230.
* **AC235 (v15):** Given the 0.7.0 fixture save (terrain version 2) with a kid built hut, mined holes, a placed rare block, the player, 5 dinos (2 on Volg mij, 3 on Vrij rondlopen), 2 eggs, 3 chickens and 2 knights (one on Blijf hier, one on Pas op de dieren) (automated), when 0.8.0 opens it, then every kid changed cell of the old diff is at the move with the same block, every other cell is as in the terrain version 3 start world, and the world record has terrain version 3. The player, every dino, egg, chicken and knight, every Vrij rondlopen spot and every Blijf hier and guard spot is at the move, and the player looks the same way. Names, kinds, modes, points, the ledger, found blocks, the hotbar, the bubble clock, the hint flag and all settings are the same as before.
* **AC236 (v15):** Given the 0.4.0 fixture save (terrain version 1, never opened by 0.5.0 or later) (automated), when 0.8.0 opens it, then the villages are stamped only where the kid changed nothing and nobody stands, as AC179 says, and then the world and every spot move as in AC235. Every cell the kid changed is the same as in the 0.4.0 world, at the move.
* **AC237 (v15):** Given the move of AC235 is killed halfway (`simulateKill`) (automated), when the app opens again, then the world and every spot are the same as after one move that was not killed: the world record byte for byte and every spot equal. Nothing is moved twice and nothing is lost. Given the move has run and the app is opened 3 more times, then nothing moves again. Given any open after a move, then the player, every animal and every knight stands inside the world and not inside a solid block.
* **AC238 (v15):** Given an old backup made by 0.6.0 and one made by 0.7.0 with 2 knights (fixtures), when the parent restores it in 0.8.0 on an empty iPad, then it is accepted and the world, animals, knights and spots come back moved as in AC235. Given a backup whose world record still has terrain version 1, then it restores as in AC236. Given a backup made by 0.8.0, then it holds terrain version 3 and the new format version, and it restores exactly, byte for byte. Given a terrain version 3 backup with a cell or a spot outside 128 x 128 x 80, or an old backup with a cell or a spot outside 64 x 64 x 64, then it is refused with the friendly message of AC195 and nothing changes.
* **AC239 (v15):** Given the moved world of AC235 (automated), then the villagers walk at home in their moved villages and a villager question works as in `docs/releases/v11.md`, a knight on Pas op de dieren counts the dinos and chickens within 8 blocks of his moved spot (AC206), a Vrij rondlopen dino roams around its moved spot, and with a seeded bubble Klodder nibbles only cells that AC215 allows in the moved world. Given "Wereld opnieuw beginnen", then the new world is the terrain version 3 start world, and dinos, chickens, knights, points and found blocks stay as AC188 and AC209 say. Given "Alles wissen", then the new game has the terrain version 3 world.
* **AC240 (v15):** Given the terrain version 3 start world (automated, runs in CI), then no chunk mesh has more than 65 536 vertices, and the faces of all chunk meshes together are at most 5 times those of the terrain version 2 start world, both counted in the same unit test. Given the camera at the start spot, and at x 8 and z 8 on the ground looking to the middle, then `chunkStats` shows that no chunk beyond the camera's far plane is drawn, and the faces drawn in one frame at the start spot are at most 3.5 times what 0.7.0 draws at its start spot looking the same way (the 0.7.0 number is measured once and kept as a constant in the test). Given the kid mines or places one block, then at most 3 chunk meshes are rebuilt. An e2e run with the fps counter walks for 30 seconds on the iPad profile and writes the 95 percent and the worst frame time to the test log. CI has no real iPad GPU, so that number is a log to compare releases, not a pass or fail.
* **AC241 (iPad) (v15):** Given the founder's oldest iPad from the home screen icon with the fps counter, an existing install updated to 0.8.0 with its own world, 3 knights (or 2, see AC210), Klodder out (a test build may call the bubble), 25 shop dinos and 10 chickens, when the founder walks for 2 minutes from the middle into the new land and back and mines and builds on the way, then the AC101 target holds: 95 percent of frames take 33 ms or less and none takes over 200 ms. From a cold start, the world shows within 5 seconds after the tap on the icon. The founder sees the kid's own world in the middle, whole. The result goes in `docs/TEST_REPORT.md`. Given the check fails, then step 1 of the speed fallback is built and the check runs again, then step 2 with Dichtbij, and then step 3 goes to the founder.
* **AC242 (v15):** Given the 0.8.0 build, then `package.json` has version 0.8.0, Instellingen shows 0.8.0 at the bottom, and `CHANGELOG.md` has a 0.8.0 entry in kid readable words that says the world is much bigger, you can dig much deeper, everything you built is still there in the middle, and deep down there is a striped layer.
* **AC243 (v15, only if fallback step 2 is built):** Given Instellingen, then a row "Kijkafstand" shows Ver and Dichtbij with its exact help line and a tap area of at least 44 x 44 points, and it is Ver on a new install, an existing install and a restored backup without it. Given Dichtbij, then the fog ends at 40 blocks and `chunkStats` shows no drawn chunk more than 3 chunks from the player's chunk. The value is saved, is held in the backup and comes back on restore.

**Check before shipping:** on the founder's iPad, on the HTTPS address (a test deploy is a founder action), from the home screen icon. Make a backup in 0.7.0 first. Update the existing install and see the kid's world in the middle with every build, animal and knight. Walk into the new land, dig straight down to the striped layer and see oersteen under it. Talk to a villager. Restore the 0.7.0 backup and see the same world again. Run AC241. Hand the iPad to the kid and watch: does the kid find everything they built?

### v16 Monstermol (0.9.0)

**Status:** next after v15. Signed on this signoff with v17, v18 and v15, built after v15 ships (it needs its depth and stripes) and shipped on its own as 0.9.0. The draft is `docs/MONSTERS_PRD.md` section 4 with the shared rules of section 1, as revised after review round 1 (`docs/DISCUSSION.md`). Where they differ, this section wins. The words, the rules for every monster and knight and the way timing is tested of the v17 and v18 section hold here too.

**Goal:** "Deep down there are warning stripes. If I dig past them anyway, a silly monster mole comes up and waddles to my animals to tease them. A wall around my animals, or my knight, stops him."

**Why:** a founder wish (decision 130): a mole deep under the warning signs who teases the animals, stopped by a fence, by trapping him, or by a knight. A fence is block play, so the kid answers the mole with what the game is about.

**Words used here.** As in the v17 and v18 section, plus:
* **The stripes:** the Waarschuwsteen layer at y 5 of v15. **Below the stripes:** y 1 to 4.
* **Target animal:** a dino or chicken on Vrij rondlopen (internal mode `stay`, decision 128) that is not on a Dinofluit call. An animal on Volg mij is never a target. It stays with the kid, so it needs no fence, and the mole never walks up to the kid for it (architect A4).
* **Ground spot:** a free cell with sky above it and a solid block under it that is not water or lava.
* **The walk rule:** a step goes to one of the 4 neighbouring columns, at most 1 block up and at most 3 blocks down, into a cell that is not solid, water or lava, with a solid block under it that is not water or lava. A step up also needs the cell above the mole free (1 block of headroom).
* **A fence:** anything the walk rule cannot cross. So a closed wall 2 blocks high with no gap stops him, a wall 1 high does not, and a gap 1 block high under an overhang lets him through.

**In:**
1. **Two warnings.** When the kid mines a block at y 6 or 7, a toast "Pas op! Diep onder de grond woont de Monstermol.", at most once per minute of play time. When the kid mines a Waarschuwsteen, every time, a card "Niet verder graven! Onder de streep slaapt de Monstermol." with one OK button. The play timer stops while the card is open. Neither covers the Hakken or Bouwen button.
2. **Waking the mole.** When the kid mines a block below the stripes while Monstermol is on and no rumble, mole, bubble or Klodder is out: "Oei... de grond rommelt!", a soft rumble for 3 seconds and a small camera shake under 1 second (with reduced motion no shake, only the text and the sound). Then the mole pops out of the ground with "Hihi! Waar zijn de dieren?". Digging below the stripes while a rumble or a mole is out does nothing new. After he leaves, the next dig below the stripes can wake him again.
3. **Where he comes up: near the animals, away from the kid (architect A4, qa Q4).** On a ground spot not within 5 blocks of the kid along x and z, not within 1 block of the dig column, within 16 blocks of a target animal, not within 3 blocks of a kid changed cell, and not on water or lava. With no target animal in the world: a ground spot 6 to 10 blocks from the kid along x and z, with the same other rules. If no spot fits, no mole comes and the rumble ends with "Hmm... toch maar niet." The spot is picked with the seeded random of `setCreatureSeed`.
4. **The mole.** About 1 block tall, box made, purple with big glasses and a pink nose, at most 6 meshes. He waddles at 1 block per second. He never breaks or places a block and never enters a cell within 1 block of the kid; if the kid stands in his way, he waits. He walks through villages and ignores villagers.
5. **The path search (architect A3).** Every 2 seconds he looks for a path by the walk rule to the nearest target animal within 24 blocks along x and z and 8 up or down. One search looks at no more than 49 x 49 x 17 cells. He walks the path he found, step by step.
6. **Teasing.** When he is within 1 block of a target animal: "Boe!", and the animal is teased as in v18 (part B In 6, AC220). It jumps, plays its own sound, runs about 6 blocks away and carries on. He never teases the same animal twice in a row, and never a follower, a villager or a knight. Then he looks for the next one.
7. **A fence stops him (the fence rule).** When the search finds no path to any target animal for 10 seconds in a row, he says "Hmpf! Ik kan er niet bij." and digs down into the ground with a soft "plop". No block changes. So walls 2 high around the animals stop him, and so do walls 2 high around the mole (trapping him).
8. **No one to tease.** With no target animal in the world, he looks around for 60 seconds, says "Niemand om mee te spelen..." and digs down.
9. **He tires by himself.** After 10 minutes of play time out, he yawns "Ik ga slapen" and digs down. Fixed, no setting.
10. **A knight stops him.** A knight notices the mole within 8 blocks, or within 16 on Pas op de dieren, walks to him by the path search and pops next to him after 3 seconds stuck, as with Klodder. He pokes with "Tok!". A Moed bar over the mole fills at 1 per second for each poking knight and is full at 15, so 1 knight takes 15 seconds, 2 take 7.5 and 3 take 5. It never fills in under 3 seconds. Full: "Wegwezen!", the mole says "Oké, oké, ik ga al!" and digs down, and the knight goes back to his mode. From v16 knights also use the path search to reach Klodder, and AC216 still holds.
11. **One at a time.** At most one mole. While a bubble or Klodder is out, no mole wakes (the warnings still show). If a bubble comes while the mole is out, both can be out; a knight goes to the nearer one first.
12. **Never saved.** A rumble or a mole is gone after a reload, crash or kill. "Wereld opnieuw beginnen" removes a live mole. Only the Monstermol switch is saved.
13. **The Monstermol row** in the card "Monsters en ridders" (see Parent switch below).
14. **Sounds,** soft and under the rules: the rumble, "Boe!", "Hmpf!", a yawn and the dig down "plop". Teased animals use their own sounds.
15. **Version 0.9.0** and a `CHANGELOG.md` entry in kid words.

**Parent switch.** One new row in the card "Monsters en ridders", under the master row, with its help line word for word:

| Row | Help line | Off means |
|---|---|---|
| Monstermol | "Wie onder de gestreepte laag graaft, maakt de Monstermol wakker. Een hek of een ridder stopt hem." | No toast, no card and no mole. The stripes stay as plain blocks. A running rumble stops with no mole, and a live mole digs down at once. |

The row works with Ridders on or off, because a fence also stops him. With the master off it shows greyed and keeps its value. It is Aan on a new install, an existing install and a restored backup made before 0.9.0, because the mole only comes after two warnings and the kid's own dig (qa Q9, `docs/MONSTERS_PRD.md` 1.4). A backup made with 0.9.0 or later restores its own value.

**Speed caps.** One mole, at most 6 meshes. One path search per 2 seconds for the mole and for each knight going to a monster, each at most 49 x 49 x 17 cells. The iPad check runs on the v15 world with the mole, 3 knights (or 2) and 25 shop dinos.

**Out:**
* A mole that breaks blocks, digs tunnels, follows the kid, or goes after villagers, knights or followers.
* More than one mole. A mole by clock or at random. Catching or keeping the mole.
* A special fence block or a gate. More depth than v15 gives.
* Points or prizes for stopping the mole.
* Gear (v19) and the deep stones (v20).
* v6 and its slot in the order (MOQ15).

**Kid safety.** The mole only comes after the kid's own dig past two warnings, comes up away from the kid, and never touches, pushes, follows, traps or blocks the kid. He never breaks or places a block and never takes points, animals, knights or found blocks. He teases only animals on Vrij rondlopen, which are never hurt or lost and carry on. He always leaves: a fence, a knight, nobody to tease, or 10 minutes. The parent can switch him off at any time, and a live mole leaves at once. No new personal data, no new text the kid types, no network request. Sections 8 and 9 hold as updated in this signoff.

**Core text changed with this release.** Signing this file also adds the bigger world and the mole lines to sections 8 and 9, and the Monstermol row joins the card "Monsters en ridders" of 4.17 (described here until it ships). Section 11 gets one risk.

**Plan tasks** (4, from `docs/MONSTERS_PRD.md` 4.6):
* **V16a** Warnings and wake: the toast, the card, the wake rule, the rumble, the spawn spot rules, unit tests.
* **V16b** Path search and walk: the walk rule, the grid search, the path follower, the fence rule, the no one to tease and tired rules, the unit test map (a closed pen, a wall 1 high, a gap 1 high under an overhang, a pit of 3, a cliff of 4, a step of 2).
* **V16c** The mole in the world: the mesh, speech, sounds, teasing reuse, e2e.
* **V16d** Knights, switch and save: knights chase with the path search (Klodder too), the Moed bar at 15, the Monstermol row and its defaults, backup checks, the pause test, version 0.9.0 and the CHANGELOG, the speed check.

**How timing is tested.** As in the v17 and v18 section, with `advancePlayMs` and `setCreatureSeed`, plus new hooks (not in the production build): `mineAt(x, y, z)` from v15, `moleState` (none, rumble, out or leaving; position; target; the no path clock; the time out; the Moed bar; the time each state began) and `findMolePath(from, to)` (the path by the walk rule on the current world, or none). Tolerances as in that section.

**Acceptance criteria.** All criteria in section 7, AC200 to AC229 and AC230 to AC243 still hold. New for v16:

* **AC244 (v16):** Given Monstermol on, when the kid mines a block at y 6 or 7, then "Pas op! Diep onder de grond woont de Monstermol." shows, and another such dig within 1 minute of play time shows no toast. When the kid mines a Waarschuwsteen, then the card "Niet verder graven! Onder de streep slaapt de Monstermol." shows every time, its OK button is at least 56 x 56 points, the play timer does not run until OK is tapped, and neither the toast nor the card covers the Hakken or Bouwen button.
* **AC245 (v16):** Given Monstermol on and no rumble, mole, bubble or Klodder out, when the kid mines a block below the stripes, then "Oei... de grond rommelt!" shows and one mole appears no sooner than 3 seconds later (by the `moleState` times) with "Hihi! Waar zijn de dieren?". Given a rumble or a mole out, when the kid mines below the stripes again, then no second mole comes. Given a bubble or Klodder out, when the kid mines below the stripes, then no mole comes. Given the mole has left, when the kid mines below the stripes again, then a new rumble starts.
* **AC246 (v16):** Given 20 seeded wakes with target animals (automated), then every spawn spot is a ground spot not within 5 blocks of the kid along x and z, not within 1 block of the dig column, within 16 blocks of a target animal, not within 3 blocks of a kid changed cell, and not on water or lava. Given no target animal, then the spot is 6 to 10 blocks from the kid along x and z. Given the kid at the bottom of a shaft 1 block wide and 15 deep when the mole comes, then the kid can climb out with nothing in the way. Given a seeded map where no spot fits, then no mole comes and "Hmm... toch maar niet." shows.
* **AC247 (v16):** Given a mole and 3 dinos on Vrij rondlopen within 24 blocks, then he walks at 1 block per second (plus or minus 20 percent) to the nearest, says "Boe!", and it is teased as AC220 says. He never picks the same animal twice in a row. Given dinos on Volg mij, a dino on a Dinofluit call, villagers and knights within reach, then he never goes for or teases any of them.
* **AC248 (v16):** Given the unit test map (automated), then `findMolePath` finds a path over the wall 1 high, through the gap 1 high under the overhang and down the pit of 3, and none into the closed pen, up the step of 2 or down the cliff of 4. No search looks at more than 49 x 49 x 17 cells. The mole's walk takes the found path, step by step.
* **AC249 (v16):** Given the target animals inside a closed wall 2 high, then after 10 seconds with no path, plus up to 2 seconds for the next search, the mole says "Hmpf! Ik kan er niet bij." and he is gone within 3 seconds after that line. Given walls 2 high around the mole, then the same. Given a wall only 1 high around the animals, then he steps over it and teases.
* **AC250 (v16):** Given a mole and no target animal in the world (none at all, or all on Volg mij), then after 60 seconds of play time (plus or minus 1) he says "Niemand om mee te spelen..." and is gone. Given a mole that nothing stopped, then after 10 minutes of play time out (plus or minus 1 second) he yawns "Ik ga slapen" and is gone. No setting changes either time.
* **AC251 (v16):** Given a knight on Pas op de dieren inside a closed pen and the mole within 16 blocks outside it, then the knight reaches him or pops next to him after 3 seconds stuck, and the Moed bar fills at 1 per second. After 15 seconds (plus or minus 1) "Wegwezen!" and "Oké, oké, ik ga al!" show, the mole is gone, and the knight is back in his mode. Given 2 knights poking, then it takes 7.5 seconds, and given 3, then 5 seconds (plus or minus 1), never under 3. Given a knight on Volg mij 12 blocks from the mole, then he does not go to him. Given Klodder behind a wall 2 high with a gap, then a knight walks to him through the gap by the path search, and AC216 still holds.
* **AC252 (v16):** Given a mole out for 2 minutes on a seeded world (automated), then no block is broken or placed, his box never overlaps the kid's, he never enters a cell within 1 block of the kid, the kid's position is never moved by him, and the points, dinos, eggs, chickens, knights and found blocks do not change. Given a village in his way, then he walks through it and no villager is teased. No points are given for anything the mole does.
* **AC253 (v16):** Given a rumble or a mole out, then in each pause state (learning break, exam, Dinowinkel, dino menu, knight menu, parent area, background, portrait) nothing moves, and the rumble's 3 seconds, the no path clock, the 60 seconds, the 10 minutes and the Moed bar do not advance; after it, all goes on where it was. Given a reload, crash or kill during the rumble or while the mole is out, then no rumble and no mole is there after it and the world record is unchanged. Given "Wereld opnieuw beginnen" while the mole is out, then he is gone in the new world.
* **AC254 (v16):** Given Instellingen, then the card "Monsters en ridders" shows the row Monstermol with its exact help line and a tap area of at least 44 x 44 points. Given Monstermol or the master off, when the kid mines past the stripes, then no toast, no card and no mole. Given a rumble or a mole out, when the parent switches either off, then back in the world neither is there. Given the master off, then the row shows greyed and keeps its value. Given Ridders off and Monstermol on, then the mole still comes. Given a new install, an existing install and a restored backup from before 0.9.0, then the row is Aan. Given a backup made with 0.9.0, then it holds the row and its value comes back on restore. The only new saved data is this switch.
* **AC255 (v16):** Given every new string and sound file of 0.9.0 (automated), then the rules of AC228 hold: no banned word, every sound under 1.5 seconds and no louder than the loudest effect of 0.6.0, and no file name with growl, scream or roar. Given Geluidseffecten uit or Volume 0, then every warning and mole line still shows as text. Given `prefers-reduced-motion`, then there is no camera shake and no bounce, and the rumble shows as text. Given a full play session with the mole (automated), then the app makes no network request beyond its own files.
* **AC256 (iPad) (v16):** Given the founder's oldest iPad from the home screen icon with the fps counter, on the v15 world, with the mole teasing, 3 knights (or 2, see AC210) and 25 shop dinos in view, when a knight sends him off, then the AC101 target holds. The result goes in `docs/TEST_REPORT.md`. The founder looks and listens: the mole is silly, not scary, and the rumble is soft.
* **AC257 (v16):** Given the 0.9.0 build, then `package.json` has version 0.9.0, Instellingen shows 0.9.0 at the bottom, and `CHANGELOG.md` has a 0.9.0 entry in kid readable words that says if you dig past the striped layer a silly mole comes up and teases your animals, and a wall around them or your knight stops him.

**Check before shipping:** on the founder's iPad, on the HTTPS address (a test deploy is a founder action), from the home screen icon. Dig a shaft and see the toast and the card. Dig past the stripes and see the rumble and the mole come up near the animals, away from you. Watch a tease. Build a wall 2 high around animals on Vrij rondlopen and see him give up. Wake him again and let a knight send him off. Switch Monstermol off and dig again: nothing comes. Run AC256. Hand the iPad to the kid and watch: scared or upset means the founder decides before shipping.

### v19 Ridderuitrusting (0.10.0)

**Status:** next after v16. The founder asked for it on 2026-11-16 ("Ok werkt op de iPad, bouw de rest"), inside decisions 130 to 133. Signed on this signoff with v20 and v21, built after v16 and shipped on its own as 0.10.0. The draft is `docs/MONSTERS_PRD.md` section 5 with the shared rules of section 1. Where they differ, this section wins. The words, the rules for every monster and knight and the way timing is tested of the v17 and v18 section (`docs/releases/v17-v18.md`) hold here too.

**Goal:** "My knights get cool gear: helmets, shields, a tickle feather, a sword that sparkles, a cape and a pony. They look great and send the monsters off faster."

**Why:** a founder wish (decision 130): sell knights "with a wide range of gear that makes them stronger". Decision 133 starts with about 8 items and a Kracht cap, so a fight always lasts a moment; the rest comes in v21.

**Facts checked in the code on 2026-11-16.**
* `src/storage/schema.ts`: `KnightRecord` holds `id`, `mode`, `spot` and `boughtFor`. `MonstersRecord` holds `knights`, `bubbleClockMs` and `hintShown`. There is no gear yet.
* `src/monsters/moed.ts`: Klodder's Moed bar is full at 30 and fills at 1 per second for each poking knight (at most 3), never faster than `MOED_MAX_RATE` 10 per second. `src/monsters/mole-moed.ts`: the mole's bar is full at 15 and fills the same way. So every knight has Kracht 1 today.
* `src/knights/knight-ai.ts`: knights walk at `DINO_SPEED`, 3 blocks per second. The kid walks at 4.3.
* `src/ui/knight-menu.ts`: the menu has Volg mij, Blijf hier, Pas op de dieren and Sluiten. `src/ui/shop-knights.ts` calls the knights "Ridder 1" to "Ridder 3".
* `src/app/buy.ts`: `buyInOneTransaction` writes the points, the bought thing and one ledger row in one transaction. `LedgerReason` (`src/storage/log-store.ts`) has no `gear` yet.
* `src/storage/backup.ts`: `BACKUP_FORMAT` is 2 (since v15). `validMonsters` in `src/storage/backup-check.ts` checks the knights, the bubble clock and the hint flag.

**Words used here.** As in the v17 and v18 section, plus:
* **Item:** one piece of gear. **Slot:** the place on a knight where an item goes: Hoofd, Schild, Hand, Rug or Rijdier.
* **Wapenkast:** every item the kid bought. Each item is one thing: it lies in the wapenkast or one knight wears it.
* **Kracht:** how fast a knight fills the Moed bar.

**In:**
1. **The catalog (decision 133).** 8 items in 5 slots, all inside the 60 point ceiling of `docs/GAME_LOOP_PRD.md` 1.3. One of each costs 210 points. In shop order, cheapest first, and at the same price in this table's order:

| Item | Slot | Points | Does |
|---|---|---|---|
| Leren kap | Hoofd | 10 | Kracht +1 |
| Houten schild | Schild | 10 | Kracht +1 |
| Riddercape | Rug | 15 | Kracht +1 |
| Kietelveer | Hand | 20 | Kracht +1, the monster giggles |
| IJzeren helm | Hoofd | 25 | Kracht +1, shines |
| IJzeren schild | Schild | 30 | Kracht +1, shines |
| Glimzwaard | Hand | 50 | Kracht +1, sparkles |
| Pony | Rijdier | 50 | walks 1.5 blocks per second faster |

2. **One of each, one knight at a time.** The kid buys each item once. A bought item lies in the wapenkast or is worn by one knight, and moving it to another knight costs nothing. A knight wears at most one item per slot.
3. **Kracht (decision 133).** A knight has Kracht 1, plus 1 for each worn item in Hoofd, Schild, Hand and Rug, so at most 5. The Rijdier adds no Kracht. A better item in a slot looks better but adds no more Kracht. The Moed bar fills each second by the Kracht of all poking knights added up, but never faster than full in 3 seconds: Klodder's bar (full at 30) at most 10 per second, the mole's bar (full at 15) at most 5 per second. So:

| Poking knights | Klodder | Mole |
|---|---|---|
| 1 bare knight (Kracht 1) | 30 seconds, as AC216 | 15 seconds, as AC251 |
| 1 knight with Kracht 3 | 10 seconds | 5 seconds |
| 1 knight with Kracht 5 | 6 seconds | 3 seconds |
| 2 or 3 knights with Kracht 5 | 3 seconds | 3 seconds |

4. **Speed.** A knight with the Pony walks at 4.5 blocks per second in every mode and when he walks to a monster. Without it he walks at 3.
5. **The shop row** "⚔️ Uitrusting" in the Dinowinkel, under the Ridders section, only while Ridders is on. 8 cards with name, picture, slot and price. Bought like a knight: Kopen, Ja or Nee, the purchase lock, the points, the item and one ledger row `reason: 'gear'` in one transaction with the shared buy helper. Too few points: the card is greyed with "Nog X punten nodig" ("Nog 1 punt nodig" for 1). Bought: "In je wapenkast" and no Kopen. With no knight: every card is greyed with "Koop eerst een ridder".
6. **Uitrusten.** The knight menu gets a button "Uitrusten". It opens a screen with a flat picture of this knight wearing his items (drawn in the page, never a second 3D view, architect A7), and under it the wapenkast, grouped by slot. A tap on an item puts it on; an item he wore in that slot goes back in the wapenkast. A tap on an item he wears takes it off. An item another knight wears shows "Bij Ridder 2" (his number), and a tap moves it to this knight. "Terug" goes back to the knight menu. The play timer stays stopped, as in the knight menu.
7. **Gear in the world.** The Hoofd item takes the place of the silver helmet and the Hand item the place of the wooden sword. The shield sits on his arm, the cape on his back, and on the Pony he sits in a seated pose. Every worn item is merged into the knight's meshes: at most 6 meshes, one cached geometry per gear set.
8. **Effects.** Kietelveer: every "Tok!" of that knight also plays a soft giggle of the monster. Glimzwaard: small sparkles at the sword while he pokes, never flashing more than 2 times a second, and none with reduced motion. IJzeren helm and IJzeren schild: a bright metal colour, no animation.
9. **Nothing bought is ever lost.** Inruilen a knight still gives 15 points, and his items go back in the wapenkast; the confirm adds "Zijn uitrusting gaat terug in de wapenkast." With Ridders or the master off, the Uitrusting row hides, the knights march off with their gear, and everything comes back as it was when it is on again. "Wereld opnieuw beginnen" keeps every item where it is. Gear never wears out and is never sold back.
10. **Save and backup.** The wapenkast and the items each knight wears go in the `monsters` record. The backup holds them. Its file format goes one up (3), so 0.9.0 refuses a 0.10.0 backup as a newer file (4.15) and no gear is ever dropped without a word. A backup check refuses an unknown item, an item twice, an item worn by two knights or in the wrong slot, with the friendly message of AC195. A save or backup from before 0.10.0 loads with an empty wapenkast and bare knights.
11. **Version 0.10.0** and a `CHANGELOG.md` entry in kid words.

**Speed caps.** At most 3 knights, each at most 6 meshes with all his gear, one cached merged geometry per gear set. The iPad check runs with 3 knights in full gear.

**Out:**
* The other 13 items, the slots Lijf, Voeten and Vlag, the Strijdpaard and the Rij-triceratops (v21).
* Gear for dinos (v12). Two of the same item. Selling gear back. Gear that wears out or breaks. Picking colours.
* Kracht above 5 or a fight under 3 seconds. A Kracht number or bar on screen. Names for knights. Knights fighting each other.
* Points or prizes for sending a monster off.
* v6 and its slot in the order (MOQ15).

**Kid safety.** Gear costs dino points only, earned by learning. Nothing is needed to play: a bare knight still sends every monster off. No text says a knight is weak or needs gear. The feather tickles and the sword sparkles: no blood, no harm. Bought gear is never lost by a trade in, a switch, "Wereld opnieuw beginnen" or a backup. No new personal data, no new text the kid types, no network request. Sections 8 and 9 hold as updated in this signoff.

**Core text changed with this release.** The Dinowinkel (4.3) gets the Uitrusting row and the knight menu gets Uitrusten, described here until it ships. Sections 8 and 9 get the gear lines. Section 11 gets one risk and the choices made by product.

**Plan tasks** (4, from `docs/MONSTERS_PRD.md` 5.6):
* **V19a** Gear economy: the catalog data, the `gear` ledger reason, buying with the shared helper, one of each, the wapenkast and worn items in the `monsters` record, Kracht with the cap and the rate limit in `moed.ts` and `mole-moed.ts`, the Pony speed, trade in, switches, backup format 3 and its checks, unit tests.
* **V19b** Shop row and Uitrusten: the cards and their greyed states, the knight menu button, the screen with the flat picture, e2e.
* **V19c** Gear in the world: attach points, the seated pose on the Pony, mesh merge and cache, the mesh hook, the speed check.
* **V19d** Effects and ship: giggle, sparkles, metal look, the banned word and sound checks, version 0.10.0 and the CHANGELOG, the iPad check.

**How it is tested.** Existing hooks: `knights`, `addKnight`, `knightScreenPoint`, `openShop`, `buyKnightInShop`, `setPoints`, `points`, `ledgerLog`, `spawnKlodder`, `monsterState`, `moleState`, `mineAt`, `advancePlayMs`, `setCreatureSeed`, `resetWorld`, `flushSave`. New hooks (not in the production build): `gearState` (the wapenkast, the items each knight wears, and each knight's Kracht and walk speed), `buyGearInShop(item)`, `wearGear(knight, item or none, slot)` and `knightMeshes(knight)` (the mesh count and the cached geometry key). Tolerances as in the v17 and v18 section.

**Acceptance criteria.** All criteria in section 7 and AC230 to AC257 still hold. New for v19:

* **AC258 (v19):** Given Ridders on and a knight, then the Dinowinkel shows a row "Uitrusting" under Ridders with 8 cards in this order: Leren kap 10, Houten schild 10, Riddercape 15, Kietelveer 20, IJzeren helm 25, IJzeren schild 30, Glimzwaard 50, Pony 50. Each card shows the name, a picture, the slot and the price, each card is at least 56 x 56 points and its Kopen button has a tap area of at least 44 x 44 points. Given the master or Ridders off, then the row does not show.
* **AC259 (v19):** Given 50 points and a knight, when the kid taps Kopen on the Pony and then Ja, then the points are 0, `gearState` shows one Pony in the wapenkast, and `ledgerLog` has one row `reason: 'gear'` with -50, written in one transaction with the item. Given Nee, then nothing changes. Given 100 points and 10 taps on Ja within 1 second, then exactly one Pony is bought and 50 points are left. Given 49 points, then the card is greyed with "Nog 1 punt nodig" and cannot be bought.
* **AC260 (v19):** Given the Pony in the wapenkast, then its card shows "In je wapenkast" and cannot be bought again. Given no knight and 100 points, then every Uitrusting card is greyed with "Koop eerst een ridder" and nothing can be bought. Given the kid trades in every knight, then the wapenkast keeps every item.
* **AC261 (v19):** Given a knight, when the kid taps him, then the knight menu shows "Uitrusten" at least 56 x 56 points, and a tap on it opens a screen with a picture of this knight and the wapenkast grouped by slot, with no second 3D canvas on the page. When the kid taps the IJzeren helm, then the knight wears it and the picture shows it. When the kid then taps the Leren kap, then he wears the Leren kap and the IJzeren helm is back in the wapenkast. When the kid taps the worn item again, then it is off and back in the wapenkast. Given the Glimzwaard worn by Ridder 1, then on the Uitrusten screen of Ridder 2 it shows "Bij Ridder 1", and a tap on it puts it on Ridder 2 and off Ridder 1, at no cost. Given one item of each kind and 3 knights, after any set of taps, then `gearState` still counts one of each, no item is worn by two knights and no knight wears two items in one slot. Given the app is closed and reopened, then every knight wears the same items. No tap on the screen mines or places a block, and the play timer does not run while it is open.
* **AC262 (v19):** Given one knight with the IJzeren helm and the Houten schild (Kracht 3) poking (`spawnKlodder`, `advancePlayMs`), then Klodder's Moed bar is full after 10 seconds and the mole's after 5 seconds (plus or minus 1). Given a knight with an item in each of Hoofd, Schild, Hand and Rug, then `gearState` gives Kracht 5, and Klodder takes 6 seconds and the mole 3 seconds. Given the Pony as well, then his Kracht is still 5. Given a bare knight, then Klodder still takes 30 seconds and the mole 15, as AC216 and AC251. Given 2 or 3 knights with Kracht 5 poking (automated), then neither bar is full before 3 seconds of poking.
* **AC263 (v19):** Given a knight with the Pony on Pas op de dieren and Klodder 16 blocks away on flat ground, then over the first 3 seconds he walks to him at 4.5 blocks per second (plus or minus 20 percent). Given the same with the Pony taken off, then he walks at 3. Given the Pony on Volg mij, when the kid walks away, then he keeps up behind the kid as AC204 says.
* **AC264 (v19):** Given a knight wearing an item in all 5 slots (automated), then `knightMeshes` gives at most 6 meshes, the Hoofd item replaces the silver helmet, the Hand item replaces the wooden sword, and he sits on the Pony. Given two knights with the same gear set, then they share one cached geometry. Given the founder's iPad, then the founder sees each item on the knight and the knight on his Pony.
* **AC265 (v19):** Given a knight with the Kietelveer poking a monster (unit test on the effect step), then each of his "Tok!" lines also plays the giggle. Given the Glimzwaard, then sparkles show at his sword while he pokes and none when he stops, they flash at most 2 times a second, and with `prefers-reduced-motion` no sparkles show. Given the IJzeren helm or IJzeren schild, then it has the bright metal colour and no animation.
* **AC266 (v19):** Given a knight wearing 3 items, when the kid trades him in, then the confirm shows "Zijn uitrusting gaat terug in de wapenkast.", the kid gets 15 points, and the 3 items are in the wapenkast, worn by no one. Given 2 knights in gear, when the parent switches Ridders or the master off, then the Uitrusting row is hidden and no knight shows; when it goes on again, then both knights are back wearing the same items. Given "Wereld opnieuw beginnen", then every knight wears the same items and the wapenkast is the same.
* **AC267 (v19):** Given a save from 0.9.0 with 2 knights, then 0.10.0 loads it with an empty wapenkast, bare knights and nothing else changed. Given a backup made with 0.10.0 holding 5 items, 3 of them worn, when it is restored on an empty iPad, then the wapenkast and who wears what come back. Given a backup from 0.9.0, then it restores with an empty wapenkast. Given a 0.10.0 backup, then its file format is 3. Given a backup with an unknown item, the same item twice, an item worn by two knights or an item in the wrong slot, then it is refused with the friendly message of AC195 and nothing changes.
* **AC268 (v19):** Given every new string and sound file of 0.10.0 (automated), then the rules of AC228 hold: no banned word, every sound under 1.5 seconds and no louder than the loudest effect of 0.6.0, and no file name with growl, scream or roar. No new string says a knight is weak or must have gear. Given Geluidseffecten uit or Volume 0, then every line still shows as text. Given a full play session with gear (automated), then the app makes no network request beyond its own files.
* **AC269 (iPad) (v19):** Given the founder's oldest iPad from the home screen icon with the fps counter, on the v15 world, with 3 knights (or 2, see AC210) in full gear, one on the Pony, Klodder out and 25 shop dinos in view, when a knight sends Klodder off, then the AC101 target holds. The result goes in `docs/TEST_REPORT.md`.
* **AC270 (v19):** Given the 0.10.0 build, then `package.json` has version 0.10.0, Instellingen shows 0.10.0 at the bottom, and `CHANGELOG.md` has a 0.10.0 entry in kid readable words that says you can buy gear and a pony for your knights in the Dinowinkel, and that knights with gear send monsters off faster.

**Check before shipping:** on the founder's iPad, on the HTTPS address (a test deploy is a founder action), from the home screen icon. Buy a Leren kap and the Pony, dress a knight in Uitrusten, see him in the world on his Pony, move the kap to a second knight. Let a dressed knight send Klodder off and see it go faster. Trade in a dressed knight and find his gear in the wapenkast. Run AC269. Hand the iPad to the kid and watch: does the kid like dressing the knights?

### v20 Diepe edelstenen (0.11.0)

**Status:** next after v19. The founder asked for it on 2026-11-16 ("Ok werkt op de iPad, bouw de rest"), inside decisions 130 and 131. Signed on this signoff with v19 and v21, built after v19 and shipped on its own as 0.11.0. The draft is `docs/MONSTERS_PRD.md` section 6. Where they differ, this section wins.

**Goal:** "Deep under the warning stripes there are 8 new shiny stones. When I find one, I save up and buy it once, and then I build with it as much as I like."

**Why:** a founder wish (decision 130): "more rare stones, and make them expensive". Today every block is free, so "expensive" needs a new step: find the stone deep down, then buy it once (MOQ10 B).

**Facts checked in the code on 2026-11-16.**
* `src/world/blocks.ts`: `VEIN_BLOCKS` are ids 43 to 50, named "ader 1" to "ader 8": solid, minable, not placeable, drawn with the steen tile. `src/world/terrain-v3.ts` puts them at y 1 to 4 below the stripes, each id in at least 2 veins of 3 to 6 touching cells (AC232). So v20 needs no terrain version.
* `src/ui/block-grid.ts`: Alle blokken has tabs. The Dorp tab shows the 8 rare blocks of v11, with a "?" tile for each one not found, from `village.found`.
* `src/app/buy.ts`: the shared buy helper. `LedgerReason` has no `stone` yet.
* The backup file format is 3 after v19.

**The stones**, in shop order. All 8 cost 1550 points.

| Id | Stone | Points |
|---|---|---|
| 43 | Maansteen | 80 |
| 44 | Zonnesteen | 100 |
| 45 | Jade | 120 |
| 46 | Opaal | 150 |
| 47 | Topaas | 180 |
| 48 | Parelsteen | 220 |
| 49 | Drakensteen | 300 |
| 50 | Mollengoud | 400 |

**In:**
1. **The veins show.** Each vein id gets its stone name and its own tile: a stone with a few bright specks in its colour, still, with no animation. From 0.11.0 the veins in the ground look like this. The start world and the world record do not change, and the terrain version stays 3.
2. **Found.** Mining a vein block in Hakken mode makes it air like any mined block and marks that stone found. The first time only, a toast "Je hebt Maansteen ontdekt!" (with the name of the stone). It works with every monster switch off. Mining below the stripes still wakes the mole as v16 says.
3. **The Edelstenen section** "💎 Edelstenen" in the Dinowinkel, always shown (no switch, MOQ12 A), with 8 cards in price order. A stone not found: a "?" card with "Ergens diep onder de grond" and no Kopen. A found stone: name, picture, price and Kopen, bought like a knight: Ja or Nee, the purchase lock, the points, the stone and one ledger row `reason: 'stone'` in one transaction with the shared buy helper. Too few points: greyed with "Nog X punten nodig". Bought: "Gekocht!" and no Kopen.
4. **Buy once, build for ever.** A bought stone is placeable, free and unlimited, like the building blocks. Mining a placed stone gives nothing and takes nothing.
5. **The Diep tab** in Alle blokken, after Dorp, with the 8 stones in price order and "N van de 8 gekocht". Not found: a "?" tile with "Ergens diep onder de grond". Found but not bought: the picture with a lock and "Koop in de Dinowinkel"; a tap does nothing. Bought: a tap picks it for the hotbar like any block.
6. **A stone not bought cannot be placed.** A hotbar slot holding a stone that is not bought (for example from a restored backup) shows empty.
7. **Kept.** "Wereld opnieuw beginnen" keeps every found and bought stone; the new world has its veins again. Alles wissen deletes them with everything else.
8. **Save and backup.** The found and bought stones go in the `monsters` record (`docs/MONSTERS_PRD.md` 1.5). The backup holds them. Its file format goes one up (4). A backup check refuses a stone id outside 43 to 50, or a stone bought but not found, with the friendly message of AC195. A save or backup from before 0.11.0 loads with no stone found.
9. **Version 0.11.0** and a `CHANGELOG.md` entry in kid words.

**Points.** 80 to 400 is past the 60 point ceiling on purpose (decision 130): the founder asked for expensive stones. 400 is about 40 to 50 breaks, a long goal like the Regenboogsaurus (300). Nothing is needed to play.

**Out:**
* Stones bought per piece with a count (that needs a block inventory). Selling stones. A switch for stones.
* More veins, other depths or a new terrain version. A stone finder or veins seen through the ground. Stones from villagers.
* v6 and its slot in the order (MOQ15).

**Kid safety.** Stones cost dino points only. Nothing is needed to play, and a found stone stays found, so there is no hurry. The cards say only the price and "Nog X punten nodig", never a pressure line. Digging below the stripes may wake the mole, which is the fun of it, and with the mole off the stones are still there. No new personal data, no new text the kid types, no network request. Sections 8 and 9 hold as updated in this signoff.

**Core text changed with this release.** The Dinowinkel (4.3) gets the Edelstenen section and Alle blokken (4.2) the Diep tab, described here until it ships. Section 9 gets the stone line.

**Plan tasks** (3, from `docs/MONSTERS_PRD.md` 6.7):
* **V20a** Stones and the found list: names and tiles for ids 43 to 50, the found rule and its toast, the found list, unit tests.
* **V20b** Shop section and Diep tab: the cards with the shared buy helper and the `stone` reason, buy once, placeable once bought, the hotbar rule, e2e.
* **V20c** Save and ship: the `monsters` record fields, backup format 4 and its checks, "Wereld opnieuw beginnen", the banned word check, version 0.11.0 and the CHANGELOG, the iPad look.

**How it is tested.** Existing hooks: `mineAt`, `blockAt`, `setBlock`, `placePlayer`, `buildState`, `setBuildState`, `openShop`, `setPoints`, `points`, `ledgerLog`, `creatureSwitches`, `resetWorld`, `flushSave`. New hooks (not in the production build): `stonesState` (the found and bought ids), `veinCells(id)` (the start world cells of that vein id, so a test can mine one) and `buyStoneInShop(id)`.

**Acceptance criteria.** All criteria in section 7 and AC230 to AC270 still hold. New for v20:

* **AC271 (v20):** Given the terrain version 3 start world in 0.11.0 (automated), then every vein cell shows the tile of its stone, not the steen tile, the 8 tiles differ from each other and from steen, and no tile animates. Given a 0.10.0 save, then 0.11.0 loads it with the same world record byte for byte and `terrainVersion` 3.
* **AC272 (v20):** Given the kid mines a Maansteen cell (`veinCells`, `mineAt`) for the first time, then the cell is air, "Je hebt Maansteen ontdekt!" shows, and `stonesState` lists 43 as found. Given a second Maansteen, then no toast shows. Given every monster switch off, then mining a vein cell finds the stone in the same way.
* **AC273 (v20):** Given the Dinowinkel, then a section "Edelstenen" shows 8 cards in the order of the stone table, also with the master, Ridders and Monstermol off. Given a stone not found, then its card is a "?" with "Ergens diep onder de grond" and no Kopen. Given Maansteen found and 79 points, then its card shows the name, picture and 80, greyed with "Nog 1 punt nodig", and it cannot be bought. Every card is at least 56 x 56 points and every Kopen button has a tap area of at least 44 x 44 points.
* **AC274 (v20):** Given Maansteen found and 80 points, when the kid taps Kopen and then Ja, then the points are 0, `ledgerLog` has one row `reason: 'stone'` with -80 written in one transaction with the stone, and the card shows "Gekocht!" with no Kopen. Given Nee, then nothing changes. Given 160 points and 10 taps on Ja within 1 second, then Maansteen is bought once and 80 points are left.
* **AC275 (v20):** Given Maansteen bought, when the kid picks it in the Diep tab and places it 100 times (automated), then 100 Maansteen blocks stand in the world and the points do not change. When the kid mines one, then it is air and Maansteen is still bought. Given Zonnesteen found but not bought, then it cannot be placed in any way, and given a hotbar slot holding it (`setBuildState`), then that slot shows empty.
* **AC276 (v20):** Given Alle blokken, then a tab "Diep" shows after Dorp with 8 tiles in price order and "1 van de 8 gekocht" when one is bought. A stone not found shows "?" and "Ergens diep onder de grond"; a found stone not bought shows its picture with a lock and "Koop in de Dinowinkel", and a tap on either does nothing. A bought stone goes in the hotbar with one tap. Every tile has a tap area of at least 44 x 44 points.
* **AC277 (v20):** Given 2 stones bought and 3 found, when the parent does "Wereld opnieuw beginnen", then the same stones are bought and found, and the new world has every vein of the start world again. Given Alles wissen, then no stone is found or bought.
* **AC278 (v20):** Given a save or backup from 0.10.0, then it loads with no stone found or bought and nothing else changed. Given a backup made with 0.11.0 with 3 found and 2 bought, when it is restored on an empty iPad, then the same stones are found and bought, and its file format is 4. Given a backup with a stone id outside 43 to 50, or a stone bought but not found, then it is refused with the friendly message of AC195 and nothing changes. Given a restored hotbar holding a stone that is not bought, then that slot is empty.
* **AC279 (v20):** Given every new string of 0.11.0 (automated), then none holds a banned word of AC228. Given a full play session with mining and buying stones (automated), then the app makes no network request beyond its own files. Given the founder's iPad, then the founder sees the 8 stones shine in the ground and in a build, and the walk below the stripes still meets the AC101 target.
* **AC280 (v20):** Given the 0.11.0 build, then `package.json` has version 0.11.0, Instellingen shows 0.11.0 at the bottom, and `CHANGELOG.md` has a 0.11.0 entry in kid readable words that says deep under the striped layer there are 8 shiny stones to find, and once you buy one in the Dinowinkel you can build with it as much as you like.

**Check before shipping:** on the founder's iPad, on the HTTPS address (a test deploy is a founder action), from the home screen icon. Dig below the stripes until a vein shows, mine it and see the toast. Find the card in Edelstenen and the lock in the Diep tab. Buy it, build a tower with it. Do "Wereld opnieuw beginnen" and see it still bought. Hand the iPad to the kid and watch: does the kid want to dig for the next stone?

### v21 Meer uitrusting (0.12.0)

**Status:** next after v20. The founder asked for it on 2026-11-16 ("Ok werkt op de iPad, bouw de rest"), inside decisions 130 and 133 ("the rest later"). Signed on this signoff with v19 and v20, built after v20 and shipped on its own as 0.12.0. The draft is `docs/MONSTERS_PRD.md` section 7. Where they differ, this section wins. Everything of the v19 section holds here, read with 21 items and 8 slots.

**Goal:** "Even more gear: a plumed helmet, a golden helmet, a dragon shield, armour, fast boots, banners, a war horse and a riding triceratops."

**Why:** the founder asked for "a wide range of gear" (decision 130). Decision 133 put 8 items in v19 and the rest here, with the same Kracht cap.

**In:**
1. **13 more items and 3 new slots** (Lijf, Voeten, Vlag), so 21 items in 8 slots. One of each of the 13 costs 720 points; all 21 cost 930. The rule of v19 stays: any item in Hoofd, Schild, Hand or Rug gives Kracht +1, the same as a cheaper item in that slot.

| Item | Slot | Points | Does |
|---|---|---|---|
| Houten zwaard | Hand | 10 | Kracht +1, a spare sword for a second knight |
| Snelle laarzen | Voeten | 20 | walks 1 block per second faster on foot |
| Banier | Vlag | 25 | notices monsters 4 blocks further |
| Maliënkolder | Lijf | 30 | looks only |
| Koningscape | Rug | 40 | Kracht +1, looks |
| Pluimhelm | Hoofd | 45 | Kracht +1, looks |
| Koningsbanier | Vlag | 55 | notices monsters 6 blocks further |
| Drakenschild | Schild | 60 | Kracht +1, looks |
| Glanzend harnas | Lijf | 70 | looks, shines |
| Bubbelstaf | Hand | 75 | Kracht +1, blows soap bubbles |
| Gouden helm | Hoofd | 80 | Kracht +1, shines |
| Strijdpaard | Rijdier | 90 | walks 2.5 blocks per second faster |
| Rij-triceratops | Rijdier | 120 | walks 2 blocks per second faster, his own seated pose |

2. **Kracht stays capped.** Lijf, Voeten, Vlag and Rijdier add no Kracht. Kracht is at most 5 and a fight never ends in under 3 seconds (v19 In 3).
3. **Speed.** On foot a knight walks at 3, with the Snelle laarzen at 4. On the Pony at 4.5, the Strijdpaard at 5.5 and the Rij-triceratops at 5. While he rides, the boots add nothing.
4. **Notice range.** A knight notices a monster within 8 blocks, or 16 on Pas op de dieren. With the Banier that is 12 or 20, with the Koningsbanier 14 or 22. It counts for Klodder and the mole. The path search of v16 (24 blocks along x and z) still covers it.
5. **Soap bubbles.** With the Bubbelstaf, while he pokes, small clear rainbow soap bubbles float up and pop by themselves within 2 seconds. They are never black, cannot be tapped and never bring Klodder. None with reduced motion.
6. **Shop and Uitrusten.** The Uitrusting row shows all 21 cards, cheapest first, and at the same price v19 items first and then in the table order. Uitrusten shows the 8 slots. Every rule of v19 In 2, 5, 6 and 9 holds.
7. **Gear in the world.** The Lijf item takes the place of the tabard, the boots go on his feet, the banner stands on a short pole on his back. The Strijdpaard and the Rij-triceratops carry him like the Pony. Still at most 6 meshes per knight and one cached geometry per gear set. A mount is part of the knight: not a dino, not in the herd of 25, never teased and with no menu of its own.
8. **Save and backup.** The same records as v19. The backup file format goes one up (5), so 0.11.0 refuses a 0.12.0 backup as a newer file. An old save or backup loads with the v19 gear as it was.
9. **Version 0.12.0** and a `CHANGELOG.md` entry in kid words.

**Prices over the 60 point ceiling (a choice the founder sees).** 5 items cost more than the 60 point ceiling of `docs/GAME_LOOP_PRD.md` 1.3: Glanzend harnas 70, Bubbelstaf 75, Gouden helm 80, Strijdpaard 90 and Rij-triceratops 120. Product keeps the draft prices: the founder asked for a wide range, these items add looks, speed and soap bubbles but never a faster fight, and longer goals already exist (Regenboogsaurus 300, the stones up to 400). The other option is to cap all 5 at 60. A price is one line of data, so it is easy to change after the kids play.

**Out:**
* More slots or items than these 21. Gear for dinos (v12). Two of the same item. Selling gear. Picking colours.
* Kracht above 5 or a fight under 3 seconds.
* The kid riding a mount. Mounts as animals of their own.
* v6 and its slot in the order (MOQ15).

**Kid safety.** As v19. Nothing is needed to play and no item is needed to win. The soap bubbles cannot be tapped and never look like the black bubble. No new personal data, no new text the kid types, no network request. Sections 8 and 9 hold as updated in this signoff.

**Core text changed with this release.** None beyond the v19 lines of sections 8, 9 and 11, read with 21 items.

**Plan tasks** (4):
* **V21a** Catalog and rules: the 13 items and 3 slots, the speed and notice rules, the save and backup checks with format 5, unit tests.
* **V21b** Shop and Uitrusten for 21 items and 8 slots, e2e.
* **V21c** Models: the 13 parts, the horse and the triceratops with its seated pose, mesh merge and cache, the speed check.
* **V21d** Effects and ship: soap bubbles, shine, the banned word and sound checks, version 0.12.0 and the CHANGELOG, the iPad check.

**How it is tested.** As in the v19 section, with `gearState`, `buyGearInShop`, `wearGear` and `knightMeshes`.

**Acceptance criteria.** All criteria in section 7 and AC230 to AC280 still hold. New for v21:

* **AC281 (v21):** Given Ridders on and a knight, then the Uitrusting row shows 21 cards in price order (Leren kap, Houten schild and Houten zwaard at 10 first, Rij-triceratops 120 last), each with name, picture, slot and price, at least 56 x 56 points.
* **AC282 (v21):** Given 120 points, when the kid buys the Rij-triceratops with Ja, then the points are 0 and `ledgerLog` has one row `reason: 'gear'` with -120 in one transaction. Given one item of each of the 13, when the kid puts each on in Uitrusten, then the screen shows 8 slots, each knight wears at most one item per slot, and `gearState` still counts one of each.
* **AC283 (v21):** Given a knight wearing the Pluimhelm, the Drakenschild, the Bubbelstaf and the Koningscape, then his Kracht is 5, the same as with the 4 cheapest items of those slots. Given the Maliënkolder, the Snelle laarzen, the Koningsbanier and the Strijdpaard as well, then his Kracht is still 5. Given 3 knights in all 8 slots poking (automated), then neither Moed bar is full in under 3 seconds.
* **AC284 (v21):** Given a knight on foot with the Snelle laarzen, then he walks at 4 blocks per second. Given the Strijdpaard, then 5.5; given the Rij-triceratops, then 5; given the boots and the Strijdpaard, then 5.5. All measured as in AC263, plus or minus 20 percent.
* **AC285 (v21):** Given a still Klodder or mole along one axis (automated), and a knight on Volg mij with the Banier and Klodder 11 blocks away, then he goes to him; at 13 blocks he does not. Given the Koningsbanier, then he goes at 13 and not at 15. Given a knight on Pas op de dieren with the Koningsbanier, then he goes to the mole at 21 blocks and not at 23. Without a banner, AC216 and AC251 hold.
* **AC286 (v21):** Given a knight with the Bubbelstaf poking, then soap bubbles show while he pokes, each gone within 2 seconds, none is black, a tap on one does nothing (no Klodder, no block mined or placed), and with `prefers-reduced-motion` none show.
* **AC287 (v21):** Given a knight wearing an item in all 8 slots (automated), then `knightMeshes` gives at most 6 meshes and one part per worn slot, and two knights with the same set share one cached geometry. Given the Strijdpaard or the Rij-triceratops, then he sits on it, the triceratops with its own pose, and the herd count, the dino list and the teasing targets do not change. Given the founder's iPad, then the founder sees each item and both mounts.
* **AC288 (v21):** Given a knight wearing 4 new items, when the kid trades him in, then the 4 items are in the wapenkast. Given a backup made with 0.12.0 with new items worn, when it is restored on an empty iPad, then everything comes back, and its file format is 5. Given a save or backup from 0.11.0, then it loads with its v19 gear as it was. Given a backup with an unknown item or an item in the wrong slot, then it is refused with the friendly message of AC195.
* **AC289 (v21):** Given every new string and sound file of 0.12.0 (automated), then the rules of AC228 hold, and no new string says a knight is weak or must have gear. Given a full play session with the new gear (automated), then the app makes no network request beyond its own files.
* **AC290 (iPad) (v21):** Given the founder's oldest iPad from the home screen icon with the fps counter, on the v15 world, with 3 knights (or 2, see AC210) in all 8 slots, on the Pony, the Strijdpaard and the Rij-triceratops, Klodder out, soap bubbles blowing and 25 shop dinos in view, then the AC101 target holds. The result goes in `docs/TEST_REPORT.md`.
* **AC291 (v21):** Given the 0.12.0 build, then `package.json` has version 0.12.0, Instellingen shows 0.12.0 at the bottom, and `CHANGELOG.md` has a 0.12.0 entry in kid readable words that says there is much more gear for your knights, with armour, boots, banners, a war horse and a riding triceratops.

**Check before shipping:** on the founder's iPad, on the HTTPS address (a test deploy is a founder action), from the home screen icon. Buy the Banier and the Rij-triceratops, dress a knight in all 8 slots, see him ride and notice Klodder from further away. Watch the soap bubbles. Run AC290. Hand the iPad to the kid and watch: does the kid like the new gear?

