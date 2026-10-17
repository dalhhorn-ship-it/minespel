# PRD: Dino Blokwereld (working title)

Status: DRAFT

## 1. Summary
Dino Blokwereld is a small 3D block world on the iPad where a kid explores, mines and builds among friendly blocky dinosaurs. Every few minutes the game pauses for a short learning break in Rekenen or Taal, and every right answer earns dino food to tame dinos and colour blocks to build with.

The parent decides what gets asked, can write their own lessons and questions, starts practice exams and follows progress. Everything stays on the iPad.

## 2. Users
* **Player:** one kid, age 8 to 10 (groep 5 to 7), plays alone. Reads Dutch at about groep 5 level.
* **Parent:** sets up the app, picks the learning content, writes own modules, starts exams, reads the results. Uses the same iPad, behind a parent gate.
* **Language:** all text in Dutch, for kid and parent screens.
* **Device:** iPad in Safari, added to the home screen. Touch only.
* **Orientation:** landscape only, for both the game and the parent area. In portrait the app shows a big "Draai je iPad" picture and nothing else.

## 3. Goals and success
The founder will feel it worked when:
1. The kid asks to play again the next day, on most days of the first two weeks.
2. The kid finishes at least 4 out of 5 learning breaks without a parent having to step in.
3. After 4 weeks the parent screen shows the percentage right going up for at least half of the topics the kid practised.
4. The parent can add a new set of questions (for example this week's spelling words) in under 10 minutes, without help.
5. The parent opens the results screen at least once a week because it is useful, not because they have to.
6. The game feels smooth on the family iPad: no stutter while walking, no lost saves.

## 4. Scope for v1

### 4.1 The world
* One fixed world of 64 x 64 blocks wide and 32 blocks high, the same for every new game (fixed seed). Gentle hills, grass, sand patches, trees, stone underneath. No caves, no water in v1.
* Invisible walls at the edges, softened with fog. The bottom layer is unbreakable `oersteen`. The player cannot fall out of the world.
* Always daytime. No weather.
* **Block types (11):**
  * Natural, can be mined and placed: gras, aarde, steen, zand, boomstam, bladeren.
  * Kleurblokken, only earned in learning breaks, can be mined and placed: rood, blauw, geel, paars.
  * Oersteen: bottom layer only, cannot be mined or placed.
* Mining a block adds 1 of that same block to the kid's backpack (gras gives gras), so the kid can rebuild what they see.
* No crafting, no tools, no health, no hunger, no damage, no enemies, no death.

### 4.2 Moving and building (touch)
* First person view.
* Left thumb stick (bottom left) to walk. Drag anywhere on the right half to look around. A jump button bottom right.
* A mode switch with two big buttons: **Hakken** (mine) and **Bouwen** (build).
* Tap a block within 6 blocks reach:
  * In Hakken mode the block breaks right away with a small pop of pixel bits.
  * In Bouwen mode the selected block is placed against the tapped face, unless it would end up inside the player or a dino.
* A hotbar along the bottom shows every block type the kid owns, with its count. Tap to select. Blocks with count 0 are hidden.
* Walking and looking work with two fingers at the same time (stick plus look).
* No flying in v1. The kid can build up by jumping and placing a block below (tap the block under the feet in Bouwen mode).

### 4.3 Dinos
* Three dino kinds, made of boxes, cute and Minecraft style: **Triceratops**, **Stegosaurus** and **Brachiosaurus** (langnek).
* Six wild dinos at a time, two of each kind. They wander, graze and do small idle animations. They never hurt the kid and never break blocks.
* **Taming:** the kid taps a wild dino while having at least 1 varenblad (dino food). Each tap feeds 1 varenblad and shows a heart. After 5 varenblaadjes the dino is tamed: big hearts and a happy sound.
* **Tame dinos:** tapping a tame dino opens a small menu: **Volg mij**, **Blijf hier**, **Naam geven** (kid types a name with the in game keyboard, max 12 letters), **Knuffel** (hearts, no cost).
* When a wild dino is tamed, a new wild dino of the same kind appears near the world edge at the end of the next learning break, so there are always six wild ones.
* At most 12 tame dinos. When the kid has 12, wild dinos still eat food but show a friendly message: "Je hebt al 12 dino's! Wat een kudde."
* **Gouden dino:** passing a practice exam gives a golden egg. The egg appears next to the kid and hatches into a tame golden version of a random dino kind (same model, gold colour). Golden dinos count toward the 12.

### 4.4 Learning break timer
* A countdown is always visible at the top of the screen during play: "Leerpauze over 4:12".
* The play timer only runs while the world is on screen and the app is visible. It stops in menus, during breaks and exams, and when the app is in the background or closed.
* In the last 30 seconds the countdown grows and pulses. In the last 10 seconds a soft tick plays (if sound is on).
* At zero the game saves, pauses and opens the learning break. There is no skip button.
* The remaining play time is saved. Closing and reopening the app does not reset it.

### 4.5 The learning break
* A calm full screen with a dino teacher character, a progress row of dots (one per question) and the break countdown ("Pauze nog 3:40").
* Each break uses one module. Modules take turns, weighted by the parent's subject mix setting (default: equal turns for Rekenen and Taal).
* If a topic is new for the kid, the break starts with that topic's lesson (see 4.7), then the questions.
* The kid answers the questions one at a time.
  * Right: a green check, a happy sound, "+1 varenblad".
  * Wrong: the right answer is shown with the `explain` text from the item. The kid taps "Verder". No second try in the same break.
* **The break ends** when the kid has answered every question (finish early), or when the break time runs out, whichever comes first. The parent can set the break time to "Geen limiet", then the break only ends when all questions are answered.
* Questions not answered when the break time runs out are logged as "niet beantwoord". They earn nothing and do not change the spaced repetition boxes.
* **Rewards at the end of a break:** a summary screen shows the score ("4 van de 5 goed!"), the varenblaadjes earned, and a chest with 5 kleurblokken of one random colour. All questions right gives a bonus: 2 extra varenblaadjes and 10 kleurblokken instead of 5.
* After the summary the kid taps "Terug naar de wereld" and play resumes with a full play timer.
* The break timer also only runs while the app is visible. If the app is closed during a break, reopening it continues the same break with the same questions and the same remaining time.

### 4.6 Choosing the questions (spaced repetition)
Every item has a box from 0 to 5. Box 0 means never seen.

| Box | Next due |
|---|---|
| 1 | the next break (never again in the same break) |
| 2 | 1 day later |
| 3 | 3 days later |
| 4 | 7 days later |
| 5 | 21 days later |

* Right answer: box goes up by 1 (from 0 it goes to 2, the maximum is 5).
* Wrong answer: box goes to 1.
* An item counts as **beheerst** (mastered) at box 4 or 5.

For a break with N questions from module M, only items that the parent has switched on (module, topic, skill and level) are used:
1. **Review slots:** up to half of N, rounded up, are due items. Box 1 items first, then other due items, the oldest due date first.
2. **New slots:** the rest are new items (box 0) from one topic. The topic is chosen by turns: the next switched on topic in teaching order that still has new items. Within that topic, items come from the easiest switched on level that still has new items, in random order.
3. If there are not enough new items, the remaining slots are filled with more due items, then with the not yet due items with the lowest box.
4. If "Nieuwe lessen" is off in settings, step 2 is skipped.
5. The question order inside the break is mixed.
6. If module M has no usable items at all, the next module in turn is used. If no module has usable items, the break shows a friendly message for the parent ("Er staan geen vragen aan. Vraag papa of mama om vragen te kiezen.") and ends after 10 seconds. The parent area shows a warning about this.

Answers in exams and in Extra oefenen also move the boxes the same way.

### 4.7 Lessons
* Every topic has a lesson: a few short pages with a title, a short text, good and wrong examples, and a tip. The kid swipes or taps "Volgende" through them. The last page has "Ik snap het!".
* A lesson shows automatically in a break the first time new items of that topic are asked. Lesson time counts as break time.
* **Lesboek:** from the pause menu the kid can open any lesson of any switched on topic at any time. Reading the Lesboek does not change the timers.
* **Extra oefenen:** from the pause menu the kid can start a practice round of N questions from a module of their choice, picked with the same rules as 4.6. It earns varenblaadjes the same way, but no kleurblokken chest. Like every menu, it stops the play timer while open. It does not reset the play timer, so it never replaces a learning break.

### 4.8 Answer types and input
All four item types from `docs/modules/README.md` are supported: `choice`, `find-error`, `type` and `punctuate`.
* `choice`: 2 to 4 big answer buttons.
* `find-error`: the sentence is shown as big tappable words, plus a "Geen fout" button. If the kid taps the wrong word correctly, the correction is shown as feedback. The kid does not have to type the correction in v1.
* `punctuate`: the sentence with tappable gaps between the words. Tapping a gap toggles the mark. A "Klaar" button checks the answer. All right gaps and no wrong gaps are needed for a right answer.
* `type`: the app's own on screen keyboard, never the iPad keyboard, so autocorrect and word suggestions cannot give away the spelling. Letters a to z, a shift key for capitals, a row with é, è, ë, ï, ö, ü, ', - and space, backspace and "Klaar". The check trims spaces at the start and end and is case sensitive.
* Rekenen answers use a big number pad with digits, a comma key and backspace. "3,5" and "3.5" are both accepted.

### 4.9 Built in module: Taal, Taalverzorging (Cito en IEP stijl)
* The module in `docs/modules/cito-taalverzorging/`, as written there. Ten topics in this teaching order: ww-tegenwoordig, ww-verleden, klanken, woordvormen, leenwoorden, trema-koppelteken, hoofdletters, komma, apostrof, leestekens.
* Levels M6, E6, M7 and E7. Every topic has a lesson and at least 6 items per level.
* Four practice exams: Oefenexamen M6, E6, M7 and E7, as defined in its `module.json`.
* All items are original, written in Cito and IEP style. No real test items are copied (decision 7).
* Before the build is called done, `python3 docs/modules/validate.py docs/modules/cito-taalverzorging` must print OK.

### 4.10 Built in module: Rekenen basis (modest, generated)
A small module where the questions are made by the app, so there are always new sums. All answers are typed with the number pad. It uses the same levels as Taal so the parent can pick one groep for both.

| Topic | Skill | M6 | E6 | M7 | E7 |
|---|---|---|---|---|---|
| optellen | plus sums | up to 100, with crossing the ten | up to 1000 | up to 10 000 | numbers with one decimal, up to 100 |
| aftrekken | minus sums | up to 100, with crossing the ten | up to 1000 | up to 10 000 | numbers with one decimal, up to 100 |
| tafels | keer sums | tafels 1 to 5 and 10 | tafels 6 to 9 | tens times a table (30 x 7) | two digits times one digit (34 x 6) |
| delen | deel sums | tafels 1 to 5 and 10 backwards | tafels 6 to 9 backwards | tens (210 : 7) | up to 3 digits by one digit, no remainder |

* Skills inside a topic match the rows above plus, for tafels and delen, one skill per tafel (`tafel-7`, `deel-7`), so the parent can switch single tables on and off.
* No answer is ever negative. Every division has a whole answer.
* Each topic has a short lesson (2 to 4 pages) with a smart strategy: splitsen, rijgen, tafeltrucs, delen als omgekeerd keer.
* Table and division facts are a fixed set (each fact has its own id, like `tafels:7x8`), so they follow the boxes in 4.6 exactly.
* For plus and minus sums there are too many to track one by one. A sum the kid got wrong is saved as its own item in box 1 and follows the boxes from there. New plus and minus slots are always freshly generated sums.
* Four practice exams: Rekentoets M6, E6, M7 and E7. Each has 20 questions, 20 minutes, pass at 70 percent, equal mix of the four topics, from that level only.
* The parent can see this module in the content tree and the results like any other, but cannot edit it. Lesson texts are written during the build and can be read in the Lesboek.

### 4.11 Exams (parent started)
* The parent starts an exam from the parent area: pick a module, pick one of its exams. The app checks there are enough items and warns if not ("Te weinig vragen voor dit examen, het examen krijgt er 22 in plaats van 30").
* Questions are picked per topic by the `mix` weights, from items at the exam `levels`. Parent switches for topics and skills are ignored in an exam, so the exam always matches its blueprint.
* The kid sees a calm exam screen: question number ("Vraag 7 van 30"), the time left if there is a time limit, no right or wrong feedback during the exam, no going back.
* The play timer is stopped during the exam. No learning break interrupts an exam.
* The exam ends when all questions are answered or the time runs out. Unanswered questions count as wrong.
* The kid sees a friendly end screen with the score and a message. Passed: "Geslaagd!" and the golden egg (4.3). Not passed: "Goed geoefend! De vragen die nog lastig zijn komen terug in je pauzes."
* An exam counts as a learning break: after it, play resumes with a full play timer.
* The kid cannot leave an exam. The parent can stop it through the parent gate. A stopped exam is saved as "gestopt" and gives no egg.
* If the app is closed during an exam, reopening continues the exam with the same questions and the same time left.

### 4.12 Parent gate
* At first start the parent sets a 4 digit pincode (typed twice).
* A small grey lock icon sits in the top right corner on every kid screen (world, break, exam). Tapping it asks for the pincode. Three wrong codes block the gate for 1 minute.
* **PIN vergeten:** shows an adult question written in words (for example "Wat is zevenenveertig keer drieëntwintig?"). A right answer lets the parent set a new pincode.
* Leaving the parent area returns the kid to where they were.

### 4.13 Parent area: what gets asked (Inhoud kiezen)
* A tree: subject (Rekenen, Taal, own subjects) > module > topic > skill. Every node has an on/off switch. Switching a node off switches off everything under it.
* Levels: a row of level checkboxes per module. A topic can override the module levels ("Eigen niveaus voor dit onderwerp").
* Each line shows how many items are switched on and how many are beheerst, so the parent sees the effect right away.
* **Vakverdeling:** a weight per switched on module (1 to 5, default 1) that sets how often each module gets a break.
* A quick preset at the top: "Groep 6 midden", "Groep 6 eind", "Groep 7 midden", "Groep 7 eind". A preset switches on that level and the levels below it for both built in modules.

### 4.14 Parent area: own modules (Eigen modules)
* **New module:** title, subject (Rekenen, Taal, or a new subject name the parent types, for example "Engels"), short description, levels (default M6, E6, M7, E7, the parent can rename, add or remove).
* **Topics:** add, rename, reorder and delete. Each topic has a lesson editor: pages with title, text, examples (good, optional wrong and why) and an optional tip.
* **Items:** a form per type, with level, skill (pick an existing skill or type a new one), prompt and explain for every type.
  * `choice`: optional sentence, 2 to 4 options, tap the right one.
  * `find-error`: the parent types the sentence with the mistake in it, taps the wrong word (or "Geen fout") and types the correction.
  * `type`: optional sentence and one or more accepted answers.
  * `punctuate`: the parent types the sentence with the marks in the right places. The app removes the marks and stores the gaps. The mark is a comma in v1.
* **Probeer:** every item and lesson can be previewed exactly as the kid will see it.
* **Exams:** own modules can have exams with title, levels, question count, time limit (or none), pass percent and topic weights.
* Ids are made by the app and never change, so progress is kept when an item is edited.
* **Built in modules** are read only. "Kopie maken" makes an editable own copy with new ids. Progress is not copied.
* **Delete** a module or topic asks to confirm and also deletes its progress.
* The editor is fine with small modules: one topic with one item is valid. The "6 items per level" rule is only for built in content.

### 4.15 Parent area: import and export
* **Exporteer module:** saves one module as a single `.json` file through the iPad share sheet (save to Bestanden, AirDrop, mail). The file holds the module and all its topics in the format of `docs/modules/README.md`, bundled in one file. The architect defines the exact bundle shape.
* **Importeer module:** pick a `.json` file from Bestanden. The app checks it with the same rules the editor uses and shows clear Dutch errors ("Vraag komma-012: het goede antwoord ontbreekt"). Files over 2 MB are refused.
* Importing a module with an id that already exists asks: "Vervangen" (progress for items with the same id is kept) or "Als nieuwe module toevoegen".
* The built in Taal module folder in `docs/modules/cito-taalverzorging/` can be bundled with a small script into an importable file, so new content written outside the app can be loaded.
* **Backup maken:** one file with everything (settings, own modules, progress, results, world, dinos, backpack), through the share sheet.
* **Backup terugzetten:** pick a backup file, confirm, and everything is replaced.

### 4.16 Parent area: results (Resultaten)
* **Overzicht:** today and this week: play time, number of breaks, questions answered, percent right, breaks finished early versus ended by time.
* **Per onderdeel:** drill down subject > module > topic > skill, with a level filter. For each: answered, percent right in the last 30 days and all time, number beheerst out of total, and how many items are in each box.
* **Over tijd:** a simple bar chart per week for the last 12 weeks: questions answered and percent right, for the selected node.
* **Lastige vragen:** the 20 items answered wrong most often in the last 30 days, with the kid's last wrong answer and the right answer.
* **Examens:** a list of every exam with date, module, exam name, score, passed or not, or "gestopt". Tap one to see the score per topic and every question with the kid's answer and the right answer.
* **Pauzes:** a list of breaks with date, time, module, score, length and how it ended (klaar, tijd op, door ouder beëindigd).
* History is kept for at least 12 months.

### 4.17 Parent area: settings (Instellingen)
| Setting | Range | Default |
|---|---|---|
| Tijd tussen leerpauzes | 1 to 30 minutes | 5 minutes |
| Vragen per pauze | 3 to 20 | 5 |
| Maximale pauzetijd | 2 to 15 minutes, or Geen limiet | 5 minutes |
| Nieuwe lessen en vragen | aan, uit (only review) | aan |
| Waarschuwing voor de pauze (pulse and tick) | aan, uit | aan |
| Geluidseffecten | aan, uit | aan |
| Volume | 0 to 100 | 70 |
| Pincode wijzigen | | |
| Pauze nu starten | button, for testing or a quick check | |
| Pauze nu beëindigen | button, only during a break, logged as "door ouder beëindigd" | |
| Wereld opnieuw beginnen | confirm, resets world, dinos and backpack, keeps learning progress | |
| Alles wissen | confirm twice, deletes everything | |

Changes to the timer settings take effect at the next play period. A running break is not changed.

### 4.18 Saving
* All data is stored on the iPad only.
* The world is saved as the changes against the fixed starting world, so saves stay small.
* The game saves every 30 seconds during play, at the start of every break and exam, and when the app goes to the background.
* The app asks Safari for persistent storage. The parent area shows a gentle note if the app is not added to the home screen, and a reminder to make a backup if the last backup is older than 30 days.

### 4.19 App basics
* Installable as a home screen app (manifest, icons, `apple-mobile-web-app-capable`).
* Works fully offline after the first visit (browser service worker caches the app and both built in modules).
* First start flow for the parent: welcome, set pincode, pick a groep preset, note about adding to the home screen and backups, then "Geef de iPad aan je kind".
* Hosted as static files on Cloudflare Workers. No Worker code, no server storage.

## 5. Out of scope (Later)
* Bigger world, more biomes, caves, water and lava, day and night, weather.
* More block types, crafting, tools, chests to store blocks, doors.
* Flying or creative mode, riding dinos, dino eggs found in the world, baby dinos that grow, more dino kinds, dino skins.
* Hidden treasures or quests in the world.
* More Rekenen: klokkijken, breuken, geld, metriek stelsel, verhaaltjessommen, cijferen, delen met rest.
* More Taal modules: begrijpend lezen, woordenschat, grammatica (ontleden), dictee with spoken words.
* Read aloud (text to speech) for lessons and questions.
* Pictures or sound in parent made lessons and questions.
* Mixed modules inside one break.
* Parent made exams across modules.
* Daily play time limit and bedtime lock.
* More than one kid profile.
* Typing the correction in `find-error`, other punctuation marks in `punctuate`.
* Background music.
* Portrait mode.
* Sync between devices, sharing modules online, any account or server.

## 6. User flows

### Flow 1: first start (parent)
1. Parent opens the app on the iPad and sees "Welkom bij Dino Blokwereld".
2. Parent sets a pincode twice.
3. Parent picks a preset, for example "Groep 6 eind".
4. Parent reads the short note about adding to the home screen and making backups.
5. Parent taps "Geef de iPad aan je kind". The world loads.

### Flow 2: play
1. I stand on a grassy hill. A triceratops walks by. At the top I see "Leerpauze over 5:00".
2. I walk with my left thumb and look around with my right thumb.
3. I tap Hakken and tap a tree. The block pops into my backpack.
4. I tap Bouwen, pick boomstam in the hotbar and tap the ground to build a wall.
5. I tap the lock icon by accident. It asks for a code I do not know. I tap "Terug".

### Flow 3: learning break
1. The countdown pulses at 0:30. At 0:10 it ticks.
2. At 0:00 the world freezes and Dino Juf says "Tijd voor een leerpauze!"
3. This topic is new, so I read three short lesson pages about the komma and tap "Ik snap het!".
4. I get 5 questions. I tap where the comma goes and tap "Klaar". Green check, +1 varenblad.
5. I get one wrong. I see the right answer and why, and tap "Verder".
6. After the last question I see "4 van de 5 goed!", 4 varenblaadjes and a chest with 5 blauwe blokken.
7. I tap "Terug naar de wereld" and play on. The countdown shows 5:00 again.

### Flow 4: taming a dino
1. I have 4 varenblaadjes. I walk up to a stegosaurus and tap it 4 times. Four hearts.
2. I need one more, so I keep building until the next break.
3. After the break I tap it again. Big hearts. It is mine!
4. I tap it, choose "Naam geven" and type "Stekel".
5. I tap "Volg mij" and it follows me home.

### Flow 5: Lesboek and Extra oefenen
1. I tap the pause button and choose "Lesboek".
2. I pick Taal, then "De apostrof", and read the pages again.
3. I go back and choose "Extra oefenen", pick Rekenen, and answer 5 sums to earn more varenblaadjes.
4. I tap "Terug naar de wereld".

### Flow 6: exam
1. Parent taps the lock icon, types the code, goes to Examens and starts "Oefenexamen M6".
2. Parent gives me the iPad. I see "Examen: 30 vragen, 30 minuten" and tap "Begin".
3. I answer each question. I do not see if it is right. I see "Vraag 12 van 30" and the time left.
4. At the end I see "27 van de 30 goed. Geslaagd!" and a golden egg.
5. Back in the world the egg hatches into a golden triceratops that follows me.

### Flow 7: parent picks what gets asked
1. Parent opens the parent area and goes to Inhoud kiezen.
2. Parent switches off Rekenen > tafels > tafel-1 and tafel-2, and switches on only M7 for the komma topic.
3. Parent sets Vakverdeling to Taal 2, Rekenen 1.
4. Parent leaves the parent area. The next breaks follow the new choices.

### Flow 8: parent makes a module
1. Parent opens Eigen modules and taps "Nieuwe module". Title "Spellingwoorden week 12", subject Taal.
2. Parent adds a topic "Woorden met au en ou" and writes a lesson page.
3. Parent adds ten `type` items and two `find-error` items, and taps "Probeer" on one to check it.
4. Parent switches the module on in Inhoud kiezen.
5. Parent taps "Exporteer module" and saves the file to Bestanden to share with the other parent.

### Flow 9: parent checks results
1. Parent opens Resultaten and sees this week: 42 minutes played, 8 breaks, 40 questions, 78 percent right.
2. Parent taps Taal > Taalverzorging > ww-verleden and sees 55 percent right, with "verleden-kofschip" as the weakest skill.
3. Parent opens Lastige vragen and sees the kid wrote "fietsde".
4. Parent opens Examens and taps the last exam to see the score per topic.

### Flow 10: backup
1. Parent opens Import en export and taps "Backup maken".
2. The share sheet opens and the parent saves the file to Bestanden.
3. Weeks later on a wiped iPad the parent taps "Backup terugzetten", picks the file, confirms, and the world, dinos and progress are back.

## 7. Acceptance criteria
Times in these criteria are play or break time with the app visible, unless stated otherwise. Tests may use a fake clock.

### World and controls
* **AC1:** Given a new game, when the world loads, then it is 64 x 64 blocks wide and 32 high with hills, trees, sand and stone, and it is identical every time a new game starts.
* **AC2:** Given the player walks into the world edge, when they keep pushing, then they stop at the edge and cannot leave the world.
* **AC3:** Given Hakken mode, when the kid taps a minable block within 6 blocks, then the block disappears and the backpack count for that block type goes up by 1.
* **AC4:** Given Hakken mode, when the kid taps oersteen or a block further than 6 blocks away, then nothing changes.
* **AC5:** Given Bouwen mode with a block selected that has count 1 or more, when the kid taps a block face within reach, then a block of the selected type appears against that face and the count goes down by 1.
* **AC6:** Given Bouwen mode, when the placed block would overlap the player or a dino, then no block is placed and the count stays the same.
* **AC7:** Given a block type count reaches 0, when the hotbar updates, then that block type is hidden from the hotbar.
* **AC8:** Given the kid holds the move stick with one finger, when they drag on the right half with a second finger, then the player walks and turns at the same time.
* **AC9:** Given the kid taps the jump button while standing on a block, then the player jumps high enough to land on a block one higher.
* **AC10:** Given any game screen, when the kid double taps, pinches or long presses, then the page does not zoom, scroll, select text or show a callout menu.
* **AC11:** Given the iPad is in portrait, when the app is open, then only the "Draai je iPad" message shows. Turning back to landscape restores the screen without losing state.

### Dinos and rewards
* **AC12:** Given a new game, when the world loads, then there are 6 wild dinos: 2 triceratops, 2 stegosaurus, 2 brachiosaurus.
* **AC13:** Given the kid has 0 varenblaadjes, when they tap a wild dino, then a message says they need varenblaadjes from a leerpauze, and nothing else changes.
* **AC14:** Given the kid has at least 1 varenblad, when they tap a wild dino, then 1 varenblad is used and the dino's feed count goes up by 1.
* **AC15:** Given a wild dino has been fed 5 times, then it becomes tame and shows big hearts. Its feed count is saved across app restarts.
* **AC16:** Given a tame dino, when the kid taps it, then a menu with Volg mij, Blijf hier, Naam geven and Knuffel appears.
* **AC17:** Given a tame dino set to Volg mij, when the kid walks away, then the dino follows and stays within about 5 blocks unless blocked by terrain.
* **AC18:** Given the kid names a dino, when they reopen the app, then the name shows above the dino. Names are at most 12 characters.
* **AC19:** Given a dino was tamed, when the next learning break ends, then a new wild dino of the same kind appears and the wild count is 6 again.
* **AC20:** Given the kid has 12 tame dinos, when they feed a wild dino to 5, then it does not become tame and the "al 12 dino's" message shows.
* **AC21:** No dino ever damages the player or breaks or places a block.

### Learning break timer
* **AC22:** Given default settings, when play starts, then the top of the screen shows "Leerpauze over 5:00" and counts down each second.
* **AC23:** Given the pause menu, Lesboek, Extra oefenen or parent area is open, or the app is in the background, then the play timer does not count down.
* **AC24:** Given 2:30 left on the play timer, when the app is closed and reopened, then the timer shows 2:30 (plus or minus 1 second).
* **AC25:** Given warnings are on, when 30 seconds are left, then the countdown grows and pulses, and in the last 10 seconds a tick plays if sound is on.
* **AC26:** Given the play timer reaches 0, then the game saves, the world stops, and the learning break opens. There is no way for the kid to close it.
* **AC27:** Given the parent sets "Tijd tussen leerpauzes" to 10 minutes, when the next play period starts, then the countdown starts at 10:00.

### Learning break
* **AC28:** Given "Vragen per pauze" is 5, when a break starts, then 5 progress dots show and the kid gets 5 questions.
* **AC29:** Given a right answer, then a green check, "+1 varenblad" and a happy sound (if sound is on) show, and the varenblaadjes count goes up by 1.
* **AC30:** Given a wrong answer, then the right answer and the item's `explain` text show, and the kid must tap "Verder" to continue.
* **AC31:** Given the kid answers the last question before the break time ends, then the break ends right away with the summary (finish early).
* **AC32:** Given "Maximale pauzetijd" is 5 minutes, when 5 minutes pass and questions are still open, then the break ends with the summary, open questions are logged as "niet beantwoord", and their boxes do not change.
* **AC33:** Given "Maximale pauzetijd" is "Geen limiet", then no break countdown shows and the break only ends after all questions are answered.
* **AC34:** Given a break ends with K right answers out of N with K < N, then the summary shows "K van de N goed!", K varenblaadjes and a chest with 5 kleurblokken of one colour.
* **AC35:** Given all N answers are right, then the summary shows N + 2 varenblaadjes and 10 kleurblokken.
* **AC36:** Given the summary, when the kid taps "Terug naar de wereld", then play resumes at the same spot and the play timer starts again at the full interval.
* **AC37:** Given a break is on question 3 with 2:10 left, when the app is closed and reopened, then the same break shows question 3 with the same questions and 2:10 left.
* **AC38:** Given two modules are switched on with equal weight, when 10 breaks happen, then each module gets 5 breaks. Given weights 2 and 1, then over 9 breaks they get 6 and 3.
* **AC39:** Given no items are switched on anywhere, when a break starts, then the friendly "Er staan geen vragen aan" message shows and the break ends after 10 seconds, and the parent area shows a warning.

### Spaced repetition and selection
* **AC40:** Given a new item answered right, then its box becomes 2 and it is due 1 day later.
* **AC41:** Given an item in any box answered wrong, then its box becomes 1, it does not come back in the same break, and it is due in the next break of that module.
* **AC42:** Given items in boxes 2, 3, 4 and 5 answered right, then their boxes become 3, 4, 5 and 5 and they are due 3, 7, 21 and 21 days later.
* **AC43:** Given a break with N = 5 and 4 due items (2 in box 1), then the break holds 3 review items (both box 1 items first), and 2 new items.
* **AC44:** Given a break with N = 5 and 0 due items, then the break holds 5 new items from one topic.
* **AC45:** Given a topic with new items left at M6 and E6 (both switched on), then new items come from M6 until no M6 items are new.
* **AC46:** Given new topics are taken in turn, when three breaks of the same module introduce new items, then they use the first three switched on topics in teaching order that still have new items.
* **AC47:** Given "Nieuwe lessen en vragen" is off, then breaks only hold items that were seen before.
* **AC48:** Given a topic, skill or level is switched off, then no break or Extra oefenen round asks an item from it.

### Lessons
* **AC49:** Given a break introduces the first new items of a topic, then the topic lesson shows first, page by page, ending with "Ik snap het!", and the break timer runs during it.
* **AC50:** Given a topic's lesson was shown once, then it does not show automatically again.
* **AC51:** Given the pause menu, when the kid opens Lesboek, then every switched on topic of every module is listed and each lesson opens page by page.
* **AC52:** Given Extra oefenen with module Rekenen, then the kid gets N questions picked by the same rules, earns 1 varenblad per right answer and no kleurblokken, and the play timer is stopped while the round is open.

### Answer types
* **AC53:** Given a `choice` item, then 2 to 4 buttons show and tapping the button at index `answer` is right, any other is wrong.
* **AC54:** Given a `find-error` item, then tapping the word at index `answer` is right. If `answer` is -1, tapping "Geen fout" is right. Any other tap is wrong.
* **AC55:** Given a `punctuate` item, when the kid toggles gaps and taps Klaar, then the answer is right only if the set of marked gaps equals `answer`. An empty `answer` is right only when no gap is marked.
* **AC56:** Given a `type` item with answer ["fietste"], then "fietste" and " fietste " are right, and "Fietste" and "fietsde" are wrong.
* **AC57:** Given any typing question, then the app's own keyboard shows and the iPad system keyboard never opens.
* **AC58:** Given a Rekenen question with answer 3.5, then typing "3,5" or "3.5" is right.

### Built in modules
* **AC59:** `python3 docs/modules/validate.py docs/modules/cito-taalverzorging` prints OK, and the app ships exactly the content in that folder.
* **AC60:** Given the Rekenen module, then it has topics optellen, aftrekken, tafels and delen, each with a lesson and items at M6, E6, M7 and E7 following the table in 4.10.
* **AC61:** Given 1000 generated Rekenen questions per skill and level (automated test), then no answer is negative, every division is whole, and every sum is within the range of its level.
* **AC62:** Given a tafels fact like 7 x 8 answered wrong, then the same fact comes back in the next Rekenen break.
* **AC63:** Given a generated plus sum answered wrong, then that exact sum comes back in the next Rekenen break.

### Exams
* **AC64:** Given the parent starts Oefenexamen M6, then the kid gets 30 questions at level M6, split over topics by the `mix` weights (largest remainder rounding), with a 30 minute countdown.
* **AC65:** Given an exam is running, then the kid sees no right or wrong feedback, cannot go back, and cannot leave without the pincode.
* **AC66:** Given an exam is running, then the play timer is stopped and no learning break starts.
* **AC67:** Given the exam time runs out, then the exam ends and unanswered questions count as wrong.
* **AC68:** Given the kid scores at or above `passPercent`, then "Geslaagd!" shows and a golden egg hatches into a tame golden dino in the world. Given a lower score, then the kind "Goed geoefend!" message shows and there is no egg.
* **AC69:** Given an exam ends, then the result is saved with date, module, exam, score, passed or not, and every question with the kid's answer.
* **AC70:** Given the parent stops a running exam through the gate, then it is saved as "gestopt" and gives no egg.
* **AC71:** Given an exam is on question 12 with 18:00 left, when the app is closed and reopened, then the exam continues at question 12 with 18:00 left.
* **AC72:** Given a module has too few items for an exam, when the parent starts it, then a warning shows the real question count before the exam begins.

### Parent gate
* **AC73:** Given first start, then the parent must set a 4 digit pincode, typed twice and matching, before the world opens.
* **AC74:** Given the lock icon is tapped, when the right pincode is typed, then the parent area opens. When a wrong code is typed 3 times, then the gate is blocked for 1 minute.
* **AC75:** Given "PIN vergeten", when the adult question is answered right, then the parent can set a new pincode.
* **AC76:** Given the kid is on any kid screen, then no parent function (settings, content, results, import, export, end break) can be reached without passing the gate.

### Parent: content choice
* **AC77:** Given Inhoud kiezen, then the tree shows subject, module, topic and skill with switches, and level checkboxes per module with an override per topic.
* **AC78:** Given the parent switches off a topic, then all its skills show as off and the switched on item count updates.
* **AC79:** Given the preset "Groep 7 midden", then levels M6, E6 and M7 are switched on and E7 off for both built in modules.

### Parent: own modules, import and export
* **AC80:** Given the parent creates a module with one topic, one lesson page and one item of each of the four types, then the module validates, appears in Inhoud kiezen, and its items can show up in breaks.
* **AC81:** Given the parent types the `punctuate` sentence "Ik zag een raptor, een T-rex en een ei.", then the stored item has the words without the comma and `answer` [3].
* **AC82:** Given the parent edits the text of an item, then the item keeps its id and its box.
* **AC83:** Given a built in module, then it cannot be edited, and "Kopie maken" creates an editable copy with new ids.
* **AC84:** Given "Exporteer module", then the share sheet opens with one `.json` file. Importing that file on a fresh install gives the same module with the same content.
* **AC85:** Given an import file with errors, then nothing is imported and every error shows in Dutch with the item id. Given a file over 2 MB or not JSON, then it is refused with a friendly message.
* **AC86:** Given an import with an id that exists, then the parent must choose "Vervangen" or "Als nieuwe module toevoegen". Vervangen keeps progress for item ids that still exist.
* **AC87:** Given "Backup maken" and then "Alles wissen" and then "Backup terugzetten" with that file, then settings, own modules, progress, results, world, dinos and backpack are all back as before.
* **AC88:** Given any text from an imported module (also text that looks like HTML or a web address), then it shows as plain text. No link is ever clickable and no script runs.

### Parent: results and settings
* **AC89:** Given answers were logged, then Resultaten shows for any node: answered, percent right in the last 30 days and all time, beheerst count and items per box, matching the logged answers.
* **AC90:** Given answers over several weeks, then the Over tijd chart shows one bar per week for the last 12 weeks with the right counts and percentages.
* **AC91:** Given Lastige vragen, then it lists up to 20 items, most wrong in the last 30 days first, with the kid's last wrong answer and the right answer.
* **AC92:** Given Pauzes, then every break shows with date, module, score, length and how it ended.
* **AC93:** Given every setting in the table in 4.17, then the parent can change it within its range, the change is saved, and it works as described.
* **AC94:** Given "Wereld opnieuw beginnen", then world, dinos and backpack reset and learning progress and results stay.
* **AC95:** Given "Pauze nu beëindigen" during a break, then the break ends, the kid gets rewards for the right answers so far, and the break is logged as "door ouder beëindigd".

### Saving, offline and device
* **AC96:** Given the kid built and mined, when the app is closed at any time and reopened, then at most the last 30 seconds of world changes are lost, and nothing is lost if the app went to the background first.
* **AC97:** Given the app was opened once online, when the iPad is in flight mode, then the app starts from the home screen and everything works, including both built in modules.
* **AC98:** Given the app runs, then it makes no network requests except loading its own files from its own address.
* **AC99:** Given the mute switch is on or sound is off in settings, then the game is fully playable and every right or wrong answer is still clear on screen.
* **AC100:** Given sound is on, then no sound plays before the first tap.
* **AC101:** Given the target iPad (see section 11), when walking around the world with all 6 wild dinos and 4 tame ones, then the frame rate stays at 30 fps or more on average over 2 minutes.
* **AC102:** Every button and tappable word is at least 44 x 44 points. Kid screen text is at least 20 points, question text at least 24 points.

## 8. Look, sound and feel
* **Style:** bright, friendly Minecraft style pixel blocks with 16 x 16 pixel textures. Dinos are chunky and cute with big eyes, made of boxes. Soft fog at the edge. No blood, no scary sounds, no angry dinos.
* **Colours:** sky blue, grass green, warm sand. Right answers in green. Wrong answers in soft orange, never harsh red. Kleurblokken are bright red, blue, yellow and purple.
* **Learning screens:** calm, white or soft paper background, one question at a time, big text, a small dino teacher ("Dino Juf") in the corner. Lots of space.
* **Exam screen:** even calmer: no dino animations, no sounds except a soft chime at the end.
* **Parent area:** plain and clear, grey and white, normal sized text, works like a settings app.
* **Font:** one round, very readable font, bundled with the app so it works offline. Kid text at least 20 points, questions at least 24 points.
* **Words:** Dutch, short sentences, groep 5 reading level on kid screens. Kind and encouraging: "Bijna!", "Goed zo!", "Wat knap!". Never "Fout!" on its own. The wrong answer screen says "Net niet. Zo is het:" followed by the right answer and the explain text.
* **Sounds:** short and soft. A pop when mining, a thunk when placing, a munch when feeding, a chime for right, a gentle "hmm" for wrong, a fanfare for a passed exam. No music in v1.

## 9. Kid safety and privacy
* **Data stored and where:** only on this iPad, in Safari's storage for this app. Stored: settings, pincode (hashed), own modules, answer history, break and exam results, the world changes, dinos (with names the kid types), backpack. No real name, age, photo, location or contact data is asked for or stored. Backup and export files only leave the iPad when the parent shares them through the share sheet.
* **Network use:** only to load the app's own files on first visit and for updates. No other requests. No data is ever sent anywhere.
* **Tracking, ads, purchases, chat:** none. No analytics, no cookies for tracking, no third party scripts or fonts from other servers.
* **External links:** none. Text in imported modules is shown as plain text and is never a link.
* **Parent gate:** pincode protects settings, content choice, own modules, import, export, backup, results, ending a break and stopping an exam.
* **Content:** all questions and lessons are original and kid friendly (dinos, nature, school, family). Nothing scary or violent.
* **Forced breaks:** the break is firm but kind. It never takes away blocks or dinos, there is no punishment for wrong answers, and the kid can always see how long is left.
* **Accessibility:** touch targets at least 44 points, readable text, never only colour to show right or wrong (always a check or a cross icon too), works without sound and with the mute switch on.

## 10. Constraints
* **Platform:** Safari on iPad, home screen web app, landscape. Tested in Playwright WebKit with an iPad profile, plus a real iPad check at every milestone.
* **Hosting:** static files on Cloudflare Workers (`wrangler.jsonc` with assets in `./dist`), free plan. No Worker code, no KV, D1 or R2. Every deploy is a founder decision.
* **HTTPS needed for offline:** Safari only runs the offline service worker over HTTPS. Testing on the local network (`npm run dev -- --host`) works for play, but home screen install with offline play needs the deployed HTTPS address. See question Q5.
* **Budget:** free. No paid services, no accounts, no API keys. Fonts and sounds must be free to use (for example CC0) or made by us.
* **Offline:** everything works offline after the first visit.
* **Size:** the first download should stay under 5 MB so it loads fast on home wifi.
* **Storage:** keep a year of history small enough to stay well under Safari's limits. The architect picks the storage (IndexedDB is expected).
* **Performance:** 30 fps on the target iPad. Small world, merged block faces, one texture atlas, no shadows, pixel ratio capped at 2.
* **Content:** the Taal module content is being written in `docs/modules/cito-taalverzorging/` and must validate before release. The module format may be adapted by the architect (decision 6), but built in and parent made modules must use the same format.

## 11. Risks and open questions

### Open founder decisions
| # | Question | Options | Recommendation | Owner |
|---|---|---|---|---|
| Q1 | How does a learning break end? | A: when all questions are answered, or when the break time is up, whichever comes first. Unanswered questions earn nothing. B: only when all questions are answered (no time limit). C: A as default, B available in settings. | C. It matches "finish early by completing the questions", keeps breaks short, and lets the parent make it strict. Default break time 5 minutes. | Founder |
| Q2 | Parent gate type | A: 4 digit pincode set at first start, with an adult question in words to reset it. B: a fresh adult puzzle each time (no code to remember). C: both. | A. A kid of 8 to 10 who is learning tables could solve simple puzzles. A code is quicker for the parent. | Founder |
| Q3 | Light goals and rewards | A: as written: varenblaadjes tame dinos, kleurblokken from every break, golden dino for a passed exam. B: only varenblaadjes and taming, no kleurblokken. C: no rewards, pure sandbox. | A. Rewards link learning to the fun parts (dinos and building) without changing the open sandbox. | Founder |
| Q4 | Does the kid see the exam score? | A: yes, score and a kind message, details only for the parent. B: only "Klaar!", the score only for the parent. | A. Kids this age like to know how they did, and the message is always kind. | Founder |
| Q5 | Where does the app live for daily use? | A: deploy to the public `minespel.<account>.workers.dev` address (needed for home screen install and offline play). B: same, but protected with Cloudflare Access, set up by the founder. C: only local network testing, no home screen install. | A. The app holds no data on the server and nothing personal, so a public static address is safe. Access adds login hassle and can block updates. Each deploy still needs founder approval. | Founder |
| Q6 | Which iPad is the target? | Tell us the model or year (Settings, Algemeen, Info) and the iPadOS version. | We plan for an iPad from 2018 or later on iPadOS 16 or newer. If the iPad is older, the world may need to shrink. | Founder |
| Q7 | Rekenen scope in v1 | A: as in 4.10 (plus, minus, tafels, delen, generated, four levels, four exams). B: only tafels and delen. C: A plus klokkijken. | A. Modest, endless fresh sums, and the same levels as Taal. Clocks, fractions and money go to Later. | Founder |
| Q8 | App name | A: Dino Blokwereld. B: Minespel. C: the kid picks a name. | C, with A as the working title. A name the kid chose makes it theirs. | Founder |

### Risks
| Risk | Effect | What we do |
|---|---|---|
| 3D is too slow on an older iPad | Stutter, the game is not fun | Small world, merged faces, no shadows, test on the real iPad in the first milestone. Shrink the world if needed. |
| Safari wipes the storage | Lost world and progress | Ask the parent to add it to the home screen, ask for persistent storage, backup file, reminder after 30 days. |
| The iPad keyboard autocorrects spelling | Typing questions become useless | Own on screen keyboard (4.8). |
| Forced breaks make the kid angry | Kid stops playing | Short breaks, finish early, kind words, good rewards, the parent can tune interval and question count. |
| The Taal content is not ready or has mistakes | Wrong spelling is taught | Validator, original items checked against woordenlijst.org, QA reads a sample per topic, the parent can switch off any skill. |
| The parent editor is fiddly on an iPad | The parent gives up on own modules | One form per item type, Probeer preview, import of JSON made elsewhere as a backup path. |
| Share sheet file export behaves differently in home screen mode | Backup or export fails | Test on the real iPad early. Fall back to a download link if the share sheet is not available. |
| Scope is large for the learning side | Long build | The 3D side is cut hard. The build plan should finish the learning engine and the break before any world polish. |
