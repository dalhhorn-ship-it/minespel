# PRD: Dino Blokwereld (working title)

Status: DRAFT

## 1. Summary
Dino Blokwereld is a small 3D block world on the iPad where a kid explores, mines and builds among friendly blocky dinosaurs. Every few minutes the game pauses for a short learning break in Rekenen or Taal, and every right answer earns dino food to tame dinos and colour blocks to build with.

The parent decides what gets asked, can write their own lessons and questions, starts practice exams and follows progress. Everything stays on the iPad.

## 2. Users
* **Player:** one kid, age 8 to 10 (groep 5 to 7), plays alone. Reads Dutch at about groep 5 level.
* **Parent:** sets up the app, picks the learning content, writes own modules, starts exams, reads the results. Uses the same iPad, behind a parent gate.
* **Language:** all text in Dutch, for kid and parent screens.
* **Device:** iPad in Safari, added to the home screen. Touch only. The reference iPad is named once the founder answers F10.
* **Orientation:** landscape only, for both the game and the parent area. In portrait the app shows a big "Draai je iPad" picture and nothing else. iOS ignores the manifest orientation, so this message is the only mechanism.

## 3. Goals and success
The founder will feel it worked when:
1. The kid asks to play again the next day, on most days of the first two weeks.
2. The kid finishes at least 4 out of 5 learning breaks without a parent having to step in.
3. After 4 weeks the parent screen shows the percentage right going up for at least half of the topics the kid practised.
4. The parent can add a new set of questions (for example this week's spelling words) in under 10 minutes, without help.
5. The parent opens the results screen at least once a week because it is useful, not because they have to.
6. The game feels smooth on the family iPad: no stutter while walking, no lost saves.

## 4. Scope for v1

### 4.0 Build order (see F1)
v1 is large, so it is built in two milestones. Each one is a usable app. The recommended option in F1 keeps both in v1.
* **v1a, the kid can play and learn:** world, controls, dinos and taming, timers, breaks, spaced repetition, lessons, Lesboek, Extra oefenen, both built in modules, built in exams, parent gate, Inhoud kiezen, Instellingen, Resultaten Overzicht and Pauzes, Backup maken and Backup terugzetten, saving, offline, app basics.
* **v1b, parent power tools:** Eigen modules editor with Probeer and own exams, Kopie maken, Exporteer module and Importeer module, Resultaten Per onderdeel, Over tijd, Lastige vragen and the Examens detail view.

Acceptance criteria for v1b items are marked **(v1b)** in section 7.

### 4.1 The world
* One fixed world of 64 x 64 blocks wide and 32 blocks high, the same for every new game (fixed seed). Gentle hills, grass, sand patches, trees, stone underneath. No caves, no water in v1. If the first milestone spike shows this is too slow on the reference iPad, the world shrinks to 48 x 48.
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
* **Tap or drag:** a touch that moves less than 10 points and lasts less than 300 ms is a tap. Any other touch on the right half is a look drag and never mines or places. A touch that starts on a button, the stick or the hotbar never starts a look drag. Long press in the world does nothing in v1.
* **What a tap hits:** the nearest thing under the finger. A dino comes before a block.
* Tap a block within 6 blocks reach:
  * In Hakken mode the block breaks right away with a small pop of pixel bits.
  * In Bouwen mode the selected block is placed against the tapped face, unless it would end up inside the player or a dino.
* **Building up:** in Bouwen mode, tapping the top face of the block the player stands on places a block there and lifts the player one block up onto it, if there is room above the head. This is how the kid climbs without fiddly timing. No flying in v1.
* A hotbar along the bottom shows every block type the kid owns, with its count. Tap to select. Blocks with count 0 are hidden. Counts never go below 0, also when two fingers tap at once.
* Walking and looking work with two fingers at the same time (stick plus look).
* **Ik zit vast:** a button in the pause menu moves the player to the start spot. Tame dinos set to Volg mij come along. Nothing else changes.

### 4.3 Dinos
* Three dino kinds, made of boxes, cute and Minecraft style: **Triceratops**, **Stegosaurus** and **Brachiosaurus** (langnek).
* Six wild dinos at a time, two of each kind. They wander, graze and do small idle animations. They never hurt the kid and never break or place blocks.
* **Simple on purpose:** dinos walk straight toward their goal and can hop up one block. They never walk into or through any block. No path finding. A dino the kid walls in stays there (building a pen is fine).
* **Taming:** the kid taps a wild dino while having at least 1 varenblad (dino food). Each tap feeds 1 varenblad and shows a heart. After 5 varenblaadjes the dino is tamed: big hearts and a happy sound. Fast taps never use more food than the kid has and never feed past 5.
* **Tame dinos:** tapping a tame dino opens a small menu: **Volg mij**, **Blijf hier**, **Naam geven** (kid types a name with the in game keyboard, max 12 characters), **Knuffel** (hearts, no cost). The name screen says "Bedenk een leuke dinonaam" so the kid does not type their own name.
* **Following:** a dino on Volg mij walks toward the player. A following dino that is stuck for more than 5 seconds, or more than 8 blocks away for more than 5 seconds, pops next to the player with a little puff.
* When a wild dino is tamed, a new wild dino of the same kind appears near the world edge at the end of the next learning break, so there are always six wild ones.
* At most 12 tame dinos. When the kid has 12, tapping a wild dino uses no food and shows a friendly message: "Je hebt al 12 dino's! Wat een kudde."
* **Gouden dino:** passing a practice exam gives a golden egg. The egg appears next to the kid and hatches into a tame golden version of a random dino kind (same model, gold colour). What happens when the kid already has 12 tame dinos is founder decision F7. The recommendation is that golden dinos do not count toward the 12.

### 4.4 Timers
* A countdown is always visible at the top of the screen during play: "Leerpauze over 4:12".
* All timers are time based (real clock), not frame based.
* In the last 30 seconds the countdown grows and pulses. In the last 10 seconds a soft tick plays (if sound is on).
* At zero the game saves, pauses and opens the learning break. There is no skip button.
* The remaining play, break and exam time is saved. Closing and reopening the app does not reset it.

**Timer matrix.** Which timer runs where:

| Situation | Play timer | Break timer | Exam timer |
|---|---|---|---|
| World on screen, app visible | runs | | |
| Pause menu, Lesboek, Extra oefenen, dino menu, name keyboard | stops | | |
| Learning break, including its lesson and summary | stops | runs until the summary | |
| Exam | stops | | runs |
| Parent gate or parent area open | stops | stops | stops |
| Portrait ("Draai je iPad") or window too small | stops | stops | stops |
| App in background, screen locked, Control Center, app closed | stops | stops | stops |

* Background is detected with `visibilitychange`, `pagehide` and `blur`. As a safety net, a heartbeat ticks every second; if more than 5 seconds pass between two ticks, that gap is not counted.

### 4.5 The learning break
* A calm full screen with a dino teacher character, a progress row of dots (one per question) and the break countdown ("Pauze nog 3:40").
* Each break uses one module. Modules take turns by smooth weighted round robin on the parent's Vakverdeling weights (default: equal turns for Rekenen and Taal). The turn state is saved across restarts. A module with no usable items is skipped and the turn goes to the next module.
* If a topic is new for the kid, the break starts with that topic's lesson (see 4.7), then the questions.
* The kid answers the questions one at a time.
  * Right: a green check, a happy sound, "+1 varenblad".
  * Wrong: the right answer is shown with the `explain` text from the item. The kid taps "Verder". No second try in the same break.
* Only the first answer to a question counts. A double tap or two fingers on two buttons in the same moment count as one answer. "Verder", "Klaar" and "Terug naar de wereld" also act once.
* **The break ends** when the kid has answered every question (finish early), or when the break time runs out, whichever comes first (see F2). The parent can set the break time to "Geen limiet", then the break only ends when all questions are answered.
* **When the break time runs out** while a question is on screen, the kid may still answer that one question. The screen shows "Laatste vraag". Then the summary shows. Nothing typed is lost.
* Questions not answered when the break ends are logged as "niet beantwoord". They earn nothing and do not change the spaced repetition boxes.
* **Rewards at the end of a break** (see F5 and F6): a summary screen shows the score ("4 van de 5 goed!") and the varenblaadjes earned.
  * K right out of N, with K from 1 to N minus 1: K varenblaadjes and a chest with 5 kleurblokken of one random colour.
  * All N right: N + 2 varenblaadjes and 10 kleurblokken.
  * K = 0, also when the time ran out with nothing answered: a kind message ("Dit was lastig. Volgende keer gaat het vast beter!"), no varenblaadjes and no chest.
* After the summary the kid taps "Terug naar de wereld" and play resumes with a full play timer.
* If the app is closed during a break, reopening it continues the same break with the same questions and the same remaining time.

### 4.6 Choosing the questions (spaced repetition)
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
* Right answer: box goes up by 1 (from 0 it goes to 2, the maximum is 5).
* Wrong answer: box goes to 1.
* An item counts as **beheerst** (mastered) at box 4 or 5.

For a break with N questions from module M, only items that the parent has switched on (module, topic, skill and level) are used:
1. **Review slots:** up to half of N, rounded up, are due items. Box 1 items first, then other due items, the oldest due date first.
2. **New slots:** the rest are new items (box 0) from one topic. Topics take turns: a saved pointer per module moves to the next switched on topic in teaching order after every break that used new slots, skipping topics with no new items left. Generated Rekenen topics (optellen, aftrekken) always have new items. Within the topic, items come from the easiest switched on level that still has new items, in random order.
3. If there are not enough new items, the remaining slots are filled with more due items, then with the not yet due items with the lowest box.
4. If "Nieuwe lessen" is off in settings, step 2 is skipped.
5. The question order inside the break is mixed. No question appears twice in one break.
6. If no module has usable items, the break shows a friendly message for the parent ("Er staan geen vragen aan. Vraag papa of mama om vragen te kiezen.") and ends after 10 seconds. The parent area shows a warning about this.

Answers in exams and in Extra oefenen also move the boxes the same way. Exams ignore the parent's switches (see 4.11).

### 4.7 Lessons
* Every topic has a lesson: a few short pages with a title, a short text, good and wrong examples, and a tip. The kid swipes or taps "Volgende" through them. The last page has "Ik snap het!".
* A lesson shows automatically in a break the first time new items of that topic are asked. Lesson time counts as break time.
* **Lesboek:** from the pause menu the kid can open any lesson of any switched on topic at any time. Reading the Lesboek does not change the timers.
* **Extra oefenen:** from the pause menu the kid can start a practice round of N questions from a module of their choice, picked with the same rules as 4.6. It earns 1 varenblad per right answer, but no kleurblokken chest. At most 10 varenblaadjes a day come from Extra oefenen (see F6). After that the round still works but earns nothing, and the kid sees "Genoeg geoefend voor vandaag, ga lekker bouwen!". It stops the play timer while open and does not reset it, so it never replaces a learning break.

### 4.8 Answer types and input
All four item types from `docs/modules/README.md` are supported: `choice`, `find-error`, `type` and `punctuate`.
* `choice`: 2 to 4 big answer buttons.
* `find-error`: the sentence is shown as big tappable words, plus a "Geen fout" button. If the kid taps the wrong word correctly, the correction is shown as feedback. The kid does not have to type the correction in v1.
* `punctuate`: the sentence with tappable gaps between the words. Tapping a gap toggles the mark. A "Klaar" button checks the answer. All right gaps and no wrong gaps are needed for a right answer. The mark is a comma in v1, for built in and parent made content.
* `type`: the app's own on screen keyboard, never the iPad keyboard, so autocorrect and word suggestions cannot give away the spelling. Letters a to z, a shift key for capitals, a row with é, è, ë, ï, ö, ü, ', - and space, backspace and "Klaar". The check trims spaces at the start and end and is case sensitive. One tap types one character.
* **Rekenen answers** use a big number pad with digits 0 to 9, a comma key and backspace. There is no dot key. The check: trim spaces, turn a comma into a dot, then compare as numbers. "3,5", "3,50" and "03,5" are right for 3.5. Empty, "3," and ",5" without a digit before it are not accepted as an answer (the Klaar button stays grey). Decimal sums are computed in whole tenths, so there are no rounding errors.
* Numbers of 1000 and up are shown with a thin space as thousands separator ("10 000"), never with a dot.

### 4.9 Built in module: Taal, Taalverzorging (Cito en IEP stijl)
* The module in `docs/modules/cito-taalverzorging/`, as written there. Ten topics in this teaching order: ww-tegenwoordig, ww-verleden, klanken, woordvormen, leenwoorden, trema-koppelteken, hoofdletters, komma, apostrof, leestekens.
* Levels M6, E6, M7 and E7. Every topic has a lesson and at least 6 items per level.
* Four practice exams: Oefenexamen M6, E6, M7 and E7, as defined in its `module.json`.
* All items are original, written in Cito and IEP style. No real test items are copied (decision 7).
* `python3 docs/modules/validate.py docs/modules/cito-taalverzorging` prints OK today. `./scripts/check.sh` runs `validate.py` on every module folder in `docs/modules/`, so it stays OK.
* **Content checks** added to `validate.py`: no `choice` item has two equal options, no two items in a module share the same prompt and sentence, every `type` item has at least one accepted answer, no sentence longer than 15 words at M6 and E6 or 20 words at M7 and E7. Items that fail are fixed before release.
* **Human check:** QA reads 5 items per topic against woordenlijst.org, and the founder (or a teacher) reads a sample of 20 items, also looking for commas that are optional in Dutch. The result goes in `docs/TEST_REPORT.md`.

### 4.10 Built in module: Rekenen basis (modest, generated)
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
* Table and division facts are a fixed set (each fact has its own id, like `tafels:7x8`), so they follow the boxes in 4.6 exactly.
* For plus and minus sums there are too many to track one by one. A sum the kid got wrong is saved as its own item in box 1 and follows the boxes from there, also after it is answered right. It is never offered as a new sum again. At most the 200 newest saved sums per topic are kept.
* No question repeats inside one break or exam. The generator takes a seed, so a failing test can be replayed.
* Four practice exams: Rekentoets M6, E6, M7 and E7. Each has 20 questions, 20 minutes, pass at 70 percent, equal mix of the four topics, from that level only.
* The parent can see this module in the content tree and the results like any other, but cannot edit or copy it. Lesson texts are written during the build and can be read in the Lesboek.

### 4.11 Exams (parent started)
* The parent starts an exam from the parent area: pick a module, pick one of its exams. The app checks there are enough items and warns if not ("Te weinig vragen voor dit examen, het examen krijgt er 22 in plaats van 30").
* An exam cannot start while a learning break is running. The parent sees "Beëindig eerst de pauze".
* Questions are picked per topic by the `mix` weights, from items at the exam `levels`. Parent switches for topics and skills are ignored in an exam, so the exam always matches its blueprint.
* The kid sees a calm exam screen: question number ("Vraag 7 van 30"), the time left if there is a time limit, no right or wrong feedback during the exam, no going back.
* The play timer is stopped during the exam. No learning break interrupts an exam.
* The exam ends when all questions are answered or the time runs out. Unanswered questions count as wrong. If the time runs out while the kid has typed or marked an answer but not tapped Klaar, that answer is checked as given.
* The kid sees a friendly end screen with the score and a message (see F8). Passed: "Geslaagd!" and the golden egg (4.3). Not passed: "Goed geoefend! De vragen die nog lastig zijn komen terug in je pauzes."
* An exam counts as a learning break: after it, play resumes with a full play timer.
* The kid cannot leave an exam. The parent can stop it through the parent gate. A stopped exam is saved as "gestopt" and gives no egg.
* If the app is closed during an exam, reopening continues the exam with the same questions and the same time left.

### 4.12 Parent gate
* At first start the parent sets a 4 digit pincode (typed twice).
* A lock icon sits in the top right corner on every kid screen (world, break, exam). It looks small and grey, but its tap area is at least 44 x 44 points, inside the safe area and outside the look drag zone. Tapping it asks for the pincode.
* Three wrong codes block the gate for 1 minute. The wrong try count and the block are saved, so a reload or closing the app does not reset them.
* The pincode is stored as a hash made with a small built in function, so the gate also works on plain http on the home network. This only hides the code from casual eyes; a 4 digit code is not real security.
* **PIN vergeten:** shows an adult question in words. A right answer lets the parent set a new pincode. How strong this question is, is founder decision F4. Recommended: a new two step question in words each time, 2 wrong tries then a 10 minute block, sharing the saved lockout with the pincode.
* Leaving the parent area returns the kid to where they were.
* No route reaches a parent screen without the gate: not the URL hash, the back button, a reload or the browser history.

### 4.13 Parent area: what gets asked (Inhoud kiezen)
* A tree: subject (Rekenen, Taal, own subjects) > module > topic > skill. Every node has an on/off switch. Switching a node off switches off everything under it.
* Levels: a row of level checkboxes per module. A topic can override the module levels ("Eigen niveaus voor dit onderwerp").
* Each line shows how many items are switched on and how many are beheerst, so the parent sees the effect right away.
* If nothing is switched on, the top of the parent area shows a warning: "Er staan geen vragen aan. Je kind krijgt lege pauzes."
* **Vakverdeling:** a weight per switched on module (1 to 5, default 1) that sets how often each module gets a break.
* A quick preset at the top: "Groep 6 midden", "Groep 6 eind", "Groep 7 midden", "Groep 7 eind". A preset switches on that level and the levels below it for both built in modules.

### 4.14 Parent area: own modules (Eigen modules) (v1b)
* **New module:** title, subject (Rekenen, Taal, or a new subject name the parent types, for example "Engels"), short description, levels (default M6, E6, M7, E7, the parent can rename, add or remove).
* **Topics:** add, rename, reorder and delete. Each topic has a lesson editor: pages with title, text, examples (good, optional wrong and why) and an optional tip.
* **Items:** a form per type, with level, skill (pick an existing skill or type a new one), prompt and explain for every type.
  * `choice`: optional sentence, 2 to 4 options, tap the right one.
  * `find-error`: the parent types the sentence with the mistake in it, taps the wrong word (or "Geen fout") and types the correction.
  * `type`: optional sentence and one or more accepted answers.
  * `punctuate`: the parent types the sentence with commas in the right places. The app removes the commas and stores the gaps.
* **Probeer:** every item and lesson can be previewed on the exact same screens the kid sees.
* **Exams:** own modules can have exams with title, levels, question count, time limit (or none), pass percent and topic weights.
* Ids are made by the app and never change, so progress is kept when an item is edited.
* **Built in modules** are read only. "Kopie maken" makes an editable own copy with new ids, only for JSON modules like Taal. Rekenen is generated and has no Kopie maken. Progress is not copied.
* **Delete** a module or topic asks to confirm and also deletes its progress.
* The editor is fine with small modules: one topic with one item is valid. The "6 items per level" rule is only for built in content.
* The editor stays usable with a module of 10 000 items: the item list scrolls smoothly and opens within 2 seconds.

### 4.15 Parent area: import, export and backup
* **Every backup and export file** holds the app name, a format version and the date it was made. A newer app version can read older files. A file from a newer app version is refused with "Dit bestand is van een nieuwere versie. Werk de app bij."
* **Sharing files:** files go out through the iPad share sheet (save to Bestanden, AirDrop, mail). If the share sheet is not available (for example on plain http), the app opens the file in a new view where the parent uses the iPad share button. Both are fine for v1. If neither works, the parent sees a clear note.
* **Exporteer module (v1b):** saves one module as a single `.json` file. The file holds the module and all its topics in the format of `docs/modules/README.md`, bundled in one file. The architect defines the exact bundle shape.
* **Importeer module (v1b):** pick a `.json` file from Bestanden. The app checks it with the same rules the editor uses and shows clear Dutch errors ("Vraag komma-012: het goede antwoord ontbreekt"). Files over 2 MB are refused.
* Importing a module with an id that already exists asks: "Vervangen" (progress for items with the same id is kept) or "Als nieuwe module toevoegen". A module with the id of a built in module can only be added as a new module.
* The built in Taal module folder in `docs/modules/cito-taalverzorging/` can be bundled with a small script into an importable file, so new content written outside the app can be loaded.
* **Backup maken:** one file with everything (settings, own modules, progress, results, world, dinos, backpack), except the pincode.
* **Backup terugzetten:** pick a backup file, confirm, and everything is replaced. The whole file is checked first. The old data stays until the new data is fully written, then the app switches. A broken file changes nothing. The current pincode stays.

### 4.16 Parent area: results (Resultaten)
* **Overzicht:** today and this week: play time, number of breaks, questions answered, percent right, breaks finished early versus ended by time.
* **Pauzes:** a list of breaks with date, time, module, score, length and how it ended (klaar, tijd op, door ouder beëindigd). A break where every answer took less than 2 seconds gets a "snel geklikt" mark, so the parent can spot guessing.
* **Per onderdeel (v1b):** drill down subject > module > topic > skill, with a level filter. For each: answered, percent right in the last 30 days and all time, number beheerst out of total, and how many items are in each box.
* **Over tijd (v1b):** a simple bar chart per week for the last 12 weeks: questions answered and percent right, for the selected node.
* **Lastige vragen (v1b):** the 20 items answered wrong most often in the last 30 days, with the kid's last wrong answer and the right answer.
* **Examens:** a list of every exam with date, module, exam name, score, passed or not, or "gestopt". **(v1b)** Tap one to see the score per topic and every question with the kid's answer and the right answer.
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
| Pauze nu starten | button, for testing or a quick check. Greyed out during a break or exam. | |
| Pauze nu beëindigen | button, only during a break, logged as "door ouder beëindigd" | |
| Wereld opnieuw beginnen | confirm, resets world, dinos and backpack, keeps learning progress | |
| Alles wissen | confirm twice, deletes everything | |

Changes to the timer settings take effect at the next play period. A running break is not changed.

The settings screen shows the app version at the bottom, so a stale cached version can be spotted.

### 4.18 Saving
* All data is stored on the iPad only.
* The world is saved as the changes against the fixed starting world, so saves stay small.
* **Save eagerly:** every world change, answer, dino change and timer step is saved within about 2 seconds, in small batched writes. There is also a save when the app is hidden, and at the start of every break and exam. iOS can kill a home screen app without warning, so the app never relies on that last save alone.
* **Safe writes:** a save that is cut off halfway leaves the previous save readable.
* **Broken save:** if the save cannot be read, the app shows a friendly Dutch message for the parent with "Backup terugzetten" and "Opnieuw beginnen" (confirm twice). It never shows a blank screen and never wipes data on its own.
* **Updates:** saved data carries a version number. A new app version moves old saves to the new shape. A new app version is applied only when the app starts, never during a break or exam.
* **Storage full or refused:** the parent area shows a gentle note and play goes on.
* The app asks Safari for persistent storage where possible. The parent area shows a gentle note if the app is not added to the home screen, and a reminder to make a backup if the last backup is older than 30 days.

### 4.19 App basics
* Installable as a home screen app (manifest, icons, `apple-mobile-web-app-capable`).
* Works fully offline after the first visit (browser service worker caches the app and both built in modules).
* **Plain http:** on the home network (`npm run dev -- --host`) Safari blocks some features (service worker, share sheet with files, persistent storage). The app still runs without errors and the parent sees a note where a feature is missing.
* **One window:** if the app is open in a second Safari tab or home screen window, the second one shows "Dino Blokwereld is al open" and changes nothing.
* **Window too small:** in Split View or Slide Over, when the window is less than 900 points wide, the app shows "Maak dit venster groter" and all timers stop.
* **3D view lost:** when Safari drops the 3D view (WebGL context lost, often after the app was in the background), the game rebuilds it without losing the world, dinos or position.
* First start flow for the parent: welcome, set pincode, pick a groep preset, note about adding to the home screen and backups, then "Geef de iPad aan je kind".
* Hosted as static files on Cloudflare Workers. No Worker code, no server storage. Cloudflare Web Analytics stays off.
* A developer fps counter exists for the founder's iPad check. It is hidden from the kid by default.

## 5. Out of scope (Later)
* Bigger world, more biomes, caves, water and lava, day and night, weather.
* More block types, crafting, tools, chests to store blocks, doors.
* Flying or creative mode, riding dinos, dino eggs found in the world, baby dinos that grow, more dino kinds, dino skins.
* Hidden treasures or quests in the world.
* More Rekenen: klokkijken, breuken, geld, metriek stelsel, verhaaltjessommen, cijferen, delen met rest.
* More Taal modules: begrijpend lezen, woordenschat, grammatica (ontleden), dictee with spoken words.
* Read aloud (text to speech) for lessons and questions.
* A parent setting "Groter lettertype".
* Pictures or sound in parent made lessons and questions.
* Mixed modules inside one break.
* Parent made exams across modules.
* Daily play time limit and bedtime lock.
* More than one kid profile.
* Typing the correction in `find-error`, other punctuation marks in `punctuate`.
* Long press actions in the world.
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
5. I want to get on top of my wall. I tap the block under my feet. A block appears and I go up one. I do it again.
6. I tap the lock icon by accident. It asks for a code I do not know. I tap "Terug".

### Flow 3: learning break
1. The countdown pulses at 0:30. At 0:10 it ticks.
2. At 0:00 the world freezes and Dino Juf says "Tijd voor een leerpauze!"
3. This topic is new, so I read three short lesson pages about the komma and tap "Ik snap het!".
4. I get 5 questions. I tap where the comma goes and tap "Klaar". Green check, +1 varenblad.
5. I get one wrong. I see "Net niet. Zo is het:" with the right answer and why, and tap "Verder".
6. After the last question I see "4 van de 5 goed!", 4 varenblaadjes and a chest with 5 blauwe blokken.
7. I tap "Terug naar de wereld" and play on. The countdown shows 5:00 again.

### Flow 4: taming a dino
1. I have 4 varenblaadjes. I walk up to a stegosaurus and tap it 4 times. Four hearts.
2. I need one more, so I keep building until the next break.
3. After the break I tap it again. Big hearts. It is mine!
4. I tap it, choose "Naam geven" and type "Stekel".
5. I tap "Volg mij" and it follows me home.

### Flow 5: Lesboek, Extra oefenen and stuck
1. I tap the pause button and choose "Lesboek".
2. I pick Taal, then "De apostrof", and read the pages again.
3. I go back and choose "Extra oefenen", pick Rekenen, and answer 5 sums to earn more varenblaadjes.
4. I walled myself in. I tap the pause button and "Ik zit vast". I am back at the start and Stekel is with me.
5. I tap "Terug naar de wereld".

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

### Flow 8: parent makes a module (v1b)
1. Parent opens Eigen modules and taps "Nieuwe module". Title "Spellingwoorden week 12", subject Taal.
2. Parent adds a topic "Woorden met au en ou" and writes a lesson page.
3. Parent adds ten `type` items and two `find-error` items, and taps "Probeer" on one to check it.
4. Parent switches the module on in Inhoud kiezen.
5. Parent taps "Exporteer module" and saves the file to Bestanden to share with the other parent.

### Flow 9: parent checks results
1. Parent opens Resultaten and sees this week: 42 minutes played, 8 breaks, 40 questions, 78 percent right.
2. Parent opens Pauzes and sees one break marked "snel geklikt".
3. (v1b) Parent taps Taal > Taalverzorging > ww-verleden and sees 55 percent right, with "verleden-kofschip" as the weakest skill.
4. (v1b) Parent opens Lastige vragen and sees the kid wrote "fietsde".
5. (v1b) Parent opens Examens and taps the last exam to see the score per topic.

### Flow 10: backup
1. Parent opens Import en export and taps "Backup maken".
2. The share sheet opens and the parent saves the file to Bestanden.
3. Weeks later on a wiped iPad the parent goes through the first start, then taps "Backup terugzetten", picks the file, confirms, and the world, dinos and progress are back. The new pincode stays.

## 7. Acceptance criteria
Times in these criteria are play or break time with the app visible, unless stated otherwise. Tests may use a fake clock. Criteria AC103 and up were added in review round 1 and sit in their topic group. **(v1b)** marks criteria for the second milestone. **(iPad)** marks a check the founder or QA does by hand on the reference iPad, because headless WebKit cannot measure it. **(F#)** marks a criterion written for the recommended option of a founder decision; it changes if the founder picks differently.

### World and controls
* **AC1:** Given a new game, when the world loads, then it is 64 x 64 blocks wide and 32 high (or 48 x 48 if the spike says so) with hills, trees, sand and stone, and it is identical every time a new game starts.
* **AC2:** Given the player walks into the world edge, when they keep pushing, then they stop at the edge and cannot leave the world.
* **AC3:** Given Hakken mode, when the kid taps a minable block within 6 blocks, then the block disappears and the backpack count for that block type goes up by 1.
* **AC4:** Given Hakken mode, when the kid taps oersteen or a block further than 6 blocks away, then nothing changes.
* **AC5:** Given Bouwen mode with a block selected that has count 1 or more, when the kid taps a block face within reach, then a block of the selected type appears against that face and the count goes down by 1.
* **AC6:** Given Bouwen mode, when the placed block would overlap the player or a dino, then no block is placed and the count stays the same. (Building up, AC103, is the one exception for the player.)
* **AC7:** Given a block type count reaches 0, when the hotbar updates, then that block type is hidden from the hotbar.
* **AC8:** Given the kid holds the move stick with one finger, when they drag on the right half with a second finger, then the player walks and turns at the same time.
* **AC9:** Given the kid taps the jump button while standing on a block, then the player jumps high enough to land on a block one higher.
* **AC10:** Given the built app (automated check), then the viewport meta blocks zoom, game areas have `touch-action: none`, `user-select: none` and `-webkit-touch-callout: none`, and `gesturestart` is prevented.
* **AC11:** Given the iPad is in portrait, when the app is open, then only the "Draai je iPad" message shows. Turning back to landscape restores the screen without losing state.
* **AC103:** Given Bouwen mode, a selected block with count 1 or more, and room above the player's head, when the kid taps the top face of the block they stand on, then a block is placed there, the player stands on top of it, and the count goes down by 1. Given no room above the head, then nothing is placed.
* **AC104:** Given a touch on the right half that moves less than 10 points and lasts less than 300 ms, then it is a tap. Given any longer or wider touch, then the view turns and no block is mined or placed. Given a dino and a block both under the finger, then the tap hits the dino. Given a touch that starts on a button, the stick or the hotbar, then the view does not turn. Given a long press in the world, then nothing happens.
* **AC105:** Given Bouwen mode with a count of 2, when two fingers tap two block faces in the same moment, then at most 2 blocks are placed and the count never goes below 0.
* **AC106:** Given the kid is walled in, when they tap "Ik zit vast" in the pause menu, then the player stands at the start spot, tame dinos on Volg mij are next to them, and the world and backpack are unchanged.
* **AC107 (iPad):** Given the world, a break or an exam on the reference iPad, when the kid double taps, pinches, long presses or pulls down, then nothing zooms, scrolls, selects text or shows a callout menu.
* **AC108:** Given the window is less than 900 points wide (Split View or Slide Over), then only "Maak dit venster groter" shows and all timers stop. Making the window bigger restores the screen without losing state.
* **AC109:** Given the 3D view is lost (simulated WebGL context loss), then within 3 seconds the world shows again with the same blocks, dinos and player position, and no black screen stays.

### Dinos and rewards
* **AC12:** Given a new game, when the world loads, then there are 6 wild dinos: 2 triceratops, 2 stegosaurus, 2 brachiosaurus.
* **AC13:** Given the kid has 0 varenblaadjes, when they tap a wild dino, then a message says they need varenblaadjes from a leerpauze, and nothing else changes.
* **AC14:** Given the kid has at least 1 varenblad, when they tap a wild dino, then 1 varenblad is used and the dino's feed count goes up by 1.
* **AC15:** Given a wild dino has been fed 5 times, then it becomes tame and shows big hearts. Its feed count is saved across app restarts.
* **AC16:** Given a tame dino, when the kid taps it, then a menu with Volg mij, Blijf hier, Naam geven and Knuffel appears.
* **AC17:** Given a tame dino on Volg mij, when the kid walks away and then stands still for 5 seconds, then the dino is within 8 blocks of the player. Given the dino is stuck for more than 5 seconds, then it pops next to the player.
* **AC18:** Given the kid names a dino, when they reopen the app, then the name shows above the dino. Names are at most 12 characters and hold only characters from the app keyboard.
* **AC19:** Given a dino was tamed, when the next learning break ends, then a new wild dino of the same kind appears and the wild count is 6 again.
* **AC20:** Given the kid has 12 tame dinos, when they tap a wild dino, then no varenblad is used, the feed count does not change, and the "al 12 dino's" message shows.
* **AC21:** No dino ever damages the player, breaks or places a block, or ends up inside a block.
* **AC110:** Given the kid has 3 varenblaadjes, when they tap a wild dino 10 times within 1 second, then exactly 3 varenblaadjes are used. Given a dino with feed count 4 and the kid has 5 varenblaadjes, when they tap it 10 times fast, then exactly 1 is used and it is tamed. The count never goes below 0.
* **AC111 (F7):** Given the kid has 12 tame dinos, when they pass an exam, then the golden egg still hatches into a tame golden dino, and the kid can still not tame a 13th normal dino.

### Timers
* **AC22:** Given default settings, when play starts, then the top of the screen shows "Leerpauze over 5:00" and after 60 seconds of real time it shows 4:00, plus or minus 1 second, whatever the frame rate.
* **AC23:** Given the pause menu, Lesboek, Extra oefenen, the dino menu, the parent gate or the parent area is open, or the app is in portrait, too small or in the background, then the play timer does not count down.
* **AC24:** Given 2:30 left on the play timer, when the app is killed and reopened, then the timer shows between 2:30 and 2:35.
* **AC25:** Given warnings are on, when 30 seconds are left, then the countdown grows and pulses, and in the last 10 seconds a tick plays if sound is on.
* **AC26:** Given the play timer reaches 0, then the game saves, the world stops, and the learning break opens. There is no way for the kid to close it.
* **AC27:** Given the parent sets "Tijd tussen leerpauzes" to 10 minutes, when the next play period starts, then the countdown starts at 10:00.
* **AC112:** Given a break or an exam with time left, when the parent gate or parent area is open, the iPad is in portrait, the window is too small, or the app is in the background, then the break and exam timers do not count down.
* **AC113:** Given a fake clock that jumps 60 seconds between two heartbeats while the app is visible, then no timer loses those 60 seconds.
* **AC114:** Given the app is open, when it is opened in a second tab or window, then the second shows "Dino Blokwereld is al open" and no saved data changes.
* **AC115:** Given a break or an exam is running, then "Pauze nu starten" is greyed out. Given a break is running, when the parent tries to start an exam, then "Beëindig eerst de pauze" shows and no exam starts.

### Learning break
* **AC28:** Given "Vragen per pauze" is 5, when a break starts, then 5 progress dots show and the kid gets 5 questions.
* **AC29:** Given a right answer, then a green check, "+1 varenblad" and a happy sound (if sound is on) show, and the varenblaadjes count goes up by 1.
* **AC30:** Given a wrong answer, then "Net niet. Zo is het:", the right answer and the item's `explain` text show, and the kid must tap "Verder" to continue.
* **AC31:** Given the kid answers the last question before the break time ends, then the break ends right away with the summary (finish early).
* **AC32:** Given "Maximale pauzetijd" is 5 minutes, when 5 minutes pass and questions are still open, then the question on screen can still be answered ("Laatste vraag" shows), then the summary shows, the other open questions are logged as "niet beantwoord", and their boxes do not change.
* **AC33:** Given "Maximale pauzetijd" is "Geen limiet", then no break countdown shows and the break only ends after all questions are answered.
* **AC34 (F6):** Given a break ends with K right answers out of N with K from 1 to N minus 1, then the summary shows "K van de N goed!", K varenblaadjes and a chest with 5 kleurblokken of one colour.
* **AC35:** Given all N answers are right, then the summary shows N + 2 varenblaadjes and 10 kleurblokken.
* **AC36:** Given the summary, when the kid taps "Terug naar de wereld", then play resumes at the same spot and the play timer starts again at the full interval.
* **AC37:** Given a break is on question 3 with 2:10 left, when the app is closed and reopened, then the same break shows question 3 with the same questions and between 2:10 and 2:15 left.
* **AC38:** Given two modules are switched on with equal weight, when 10 breaks happen, then each module gets 5 breaks. Given weights 2 and 1, then over 9 breaks they get 6 and 3, also when the app is restarted between breaks. Given one module has no usable items, then its turn goes to the next module.
* **AC39:** Given no items are switched on anywhere, when a break starts, then the friendly "Er staan geen vragen aan" message shows and the break ends after 10 seconds.
* **AC116 (F6):** Given a break ends with 0 right, also when the time ran out with nothing answered, then the summary shows the kind "Dit was lastig" message, no varenblaadjes and no chest.
* **AC117:** Given a question, when the kid double taps an answer button, or two fingers hit two answer buttons in the same moment, then exactly one answer is logged, the first one. Given a double tap on "Verder", "Klaar" or "Terug naar de wereld", then it acts once and no question is skipped.

### Spaced repetition and selection
* **AC40:** Given a new item answered right, then its box becomes 2 and it is due from 00:00 the next calendar day in local time.
* **AC41:** Given an item in any box answered wrong, then its box becomes 1, it does not come back in the same break, and it is due in the next break of that module.
* **AC42:** Given items in boxes 2, 3, 4 and 5 answered right, then their boxes become 3, 4, 5 and 5 and they are due from 00:00 on the calendar day 3, 7, 21 and 21 days later.
* **AC43:** Given a break with N = 5 and 4 due items (2 in box 1), then the break holds 3 review items (both box 1 items first), and 2 new items.
* **AC44:** Given a break with N = 5 and 0 due items, then the break holds 5 new items from one topic.
* **AC45:** Given a topic with new items left at M6 and E6 (both switched on), then new items come from M6 until no M6 items are new.
* **AC46:** Given three breaks of the same module that use new slots, then they use the first three switched on topics in teaching order that still have new items, and the fourth break goes on from there, also after a restart.
* **AC47:** Given "Nieuwe lessen en vragen" is off, then breaks only hold items that were seen before.
* **AC48:** Given a topic, skill or level is switched off, then no break or Extra oefenen round asks an item from it. Exams are exempt (AC64).
* **AC118:** Given an item is due today, when the iPad clock is set back 3 days, then the item is still due. No stored due date changes.
* **AC119:** Given a break, then no item appears twice in it.

### Lessons and practice
* **AC49:** Given a break introduces the first new items of a topic, then the topic lesson shows first, page by page, ending with "Ik snap het!", and the break timer runs during it.
* **AC50:** Given a topic's lesson was shown once, then it does not show automatically again.
* **AC51:** Given the pause menu, when the kid opens Lesboek, then every switched on topic of every module is listed and each lesson opens page by page.
* **AC52:** Given Extra oefenen with module Rekenen, then the kid gets N questions picked by the same rules, earns 1 varenblad per right answer and no kleurblokken, and the play timer is stopped while the round is open.
* **AC120 (F6):** Given the kid earned 10 varenblaadjes from Extra oefenen today, when they answer more right in Extra oefenen, then they earn nothing more and "Genoeg geoefend voor vandaag, ga lekker bouwen!" shows. The next calendar day the cap starts again.

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
* **AC61:** Given 1000 generated Rekenen questions per skill and level (automated test with a fixed seed), then no answer is negative, every division is whole, and every sum is within the range of its level.
* **AC62:** Given a tafels fact like 7 x 8 answered wrong, then the same fact comes back in the next Rekenen break.
* **AC63:** Given a generated plus sum answered wrong, then that exact sum comes back in the next Rekenen break. When it is then answered right, it moves to box 2 and follows the boxes, and it is never offered as a new sum.
* **AC122:** Given `./scripts/check.sh`, then it runs `validate.py` on every module folder in `docs/modules/` and fails if any module fails or if python3 is missing. It never skips silently.
* **AC123:** Given `validate.py`, then it also fails on: two equal options in a `choice` item, two items with the same prompt and sentence in one module, a `type` item without an accepted answer, a sentence over 15 words at M6 or E6, or over 20 words at M7 or E7.
* **AC124:** Given the release, then `docs/TEST_REPORT.md` records the human content check: 5 items per Taal topic checked by QA against woordenlijst.org, and 20 items read by the founder or a teacher, with every problem found fixed.
* **AC125:** Given a Rekenen exam of 20 questions or a Rekenen break, then no question appears twice. Given the same seed, then the generator gives the same questions.
* **AC126:** Given more than 200 wrong plus sums saved for optellen, then only the 200 newest are kept.

### Exams
* **AC64:** Given the parent starts Oefenexamen M6, then the kid gets 30 questions at level M6, split over topics by the `mix` weights (largest remainder rounding), with a 30 minute countdown, whatever the parent's switches are.
* **AC65:** Given an exam is running, then the kid sees no right or wrong feedback, cannot go back, and cannot leave without the pincode.
* **AC66:** Given an exam is running, then the play timer is stopped and no learning break starts.
* **AC67:** Given the exam time runs out, then the exam ends and unanswered questions count as wrong. Given an answer was typed or marked but Klaar was not tapped, then that answer is checked as given.
* **AC68:** Given the kid scores at or above `passPercent`, then "Geslaagd!" shows and a golden egg hatches into a tame golden dino in the world. Given a lower score, then the kind "Goed geoefend!" message shows and there is no egg.
* **AC69:** Given an exam ends, then the result is saved with date, module, exam, score, passed or not, and every question with the kid's answer.
* **AC70:** Given the parent stops a running exam through the gate, then it is saved as "gestopt" and gives no egg.
* **AC71:** Given an exam is on question 12 with 18:00 left, when the app is closed and reopened, then the exam continues at question 12 with between 18:00 and 18:05 left.
* **AC72:** Given a module has too few items for an exam, when the parent starts it, then a warning shows the real question count before the exam begins.

### Parent gate
* **AC73:** Given first start, then the parent must set a 4 digit pincode, typed twice and matching, before the world opens.
* **AC74:** Given the lock icon is tapped, when the right pincode is typed, then the parent area opens. When a wrong code is typed 3 times, then the gate is blocked for 1 minute, and the block still holds after a reload or after closing and reopening the app. Fast tapping on the pin pad types one digit per tap and never crashes.
* **AC75 (F4):** Given "PIN vergeten", then a new two step question in words shows each time. When it is answered right, then the parent can set a new pincode. When it is answered wrong twice, then PIN vergeten is blocked for 10 minutes. Wrong tries here and on the pin pad share one saved lockout.
* **AC76:** Given the kid is on any kid screen, then no parent function (settings, content, results, import, export, backup, end break, stop exam) can be reached without passing the gate. An automated test tries every route: URL hash, back button, reload and browser history.
* **AC127:** Given the lock icon, then its tap area is at least 44 x 44 points, fully inside the safe area, and a look drag that starts outside it never opens the gate.
* **AC128:** Given the app runs over plain http (no secure context), then the pincode can be set and checked and the gate works.

### Parent: content choice
* **AC77:** Given Inhoud kiezen, then the tree shows subject, module, topic and skill with switches, and level checkboxes per module with an override per topic.
* **AC78:** Given the parent switches off a topic, then all its skills show as off and the switched on item count updates.
* **AC79:** Given the preset "Groep 7 midden", then levels M6, E6 and M7 are switched on and E7 off for both built in modules.
* **AC129:** Given no items are switched on anywhere, when the parent opens the parent area, then the warning "Er staan geen vragen aan" shows at the top.

### Parent: own modules, import, export and backup
* **AC80 (v1b):** Given the parent creates a module with one topic, one lesson page and one item of each of the four types, then the module validates, appears in Inhoud kiezen, and its items can show up in breaks.
* **AC81 (v1b):** Given the parent types the `punctuate` sentence "Ik zag een raptor, een T-rex en een ei.", then the stored item has the words without the comma and `answer` [3].
* **AC82 (v1b):** Given the parent edits the text of an item, then the item keeps its id and its box.
* **AC83:** Given a built in module, then it cannot be edited. (v1b) Given the Taal module, then "Kopie maken" creates an editable copy with new ids. Given Rekenen, then there is no "Kopie maken".
* **AC84 (v1b):** Given an exported module file, when it is imported on a fresh install, then the same module with the same content appears (automated). (iPad) Given "Exporteer module" on the reference iPad in home screen mode, then the share sheet opens with one `.json` file, or the file opens in a new view that can be shared.
* **AC85 (v1b):** Given an import file with errors, then nothing is imported and every error shows in Dutch with the item id. Given a file over 2 MB or not JSON, then it is refused with a friendly message. The test set includes text with `<script>`, `javascript:` and `https://`, a file just over 2 MB, and a file with 10 000 items.
* **AC86 (v1b):** Given an import with an id that exists, then the parent must choose "Vervangen" or "Als nieuwe module toevoegen". Vervangen keeps progress for item ids that still exist. Given the id of a built in module, then only "Als nieuwe module toevoegen" is offered.
* **AC87:** Given "Backup maken" and then "Alles wissen", a new pincode, and "Backup terugzetten" with that file, then settings, own modules, progress, results, world, dinos and backpack are all back as before, and the new pincode still works.
* **AC88 (v1b):** Given any text from an imported module (also text that looks like HTML or a web address), then it shows as plain text. No link is ever clickable and no script runs.
* **AC130:** Given a broken backup file (cut off, wrong JSON, wrong app name), when the parent restores it, then a friendly message shows and all current data is unchanged. Given a backup from a newer format version, then it is refused with "Dit bestand is van een nieuwere versie".
* **AC131:** Given any backup or export file, then it holds the app name, a format version and the date. A backup from the previous format version (test fixture) restores correctly.
* **AC132 (v1b):** Given a module with 10 000 items, then the editor item list opens within 2 seconds and scrolls without freezing.
* **AC133 (iPad):** Given "Backup maken" on the reference iPad in home screen mode, then the parent can save the file to Bestanden, by the share sheet or the new view fallback.

### Parent: results and settings
* **AC89 (v1b):** Given answers were logged, then Resultaten Per onderdeel shows for any node: answered, percent right in the last 30 days and all time, beheerst count and items per box, matching the logged answers.
* **AC90 (v1b):** Given answers over several weeks, then the Over tijd chart shows one bar per week for the last 12 weeks with the right counts and percentages.
* **AC91 (v1b):** Given Lastige vragen, then it lists up to 20 items, most wrong in the last 30 days first, with the kid's last wrong answer and the right answer.
* **AC92:** Given Pauzes, then every break shows with date, module, score, length and how it ended. A break where every answer took less than 2 seconds shows "snel geklikt".
* **AC93:** Given every setting in the table in 4.17, then the parent can change it within its range, the change is saved, and it works as described.
* **AC94:** Given "Wereld opnieuw beginnen", then world, dinos and backpack reset and learning progress and results stay.
* **AC95:** Given "Pauze nu beëindigen" during a break, then the break ends, the kid gets rewards for the right answers so far, and the break is logged as "door ouder beëindigd".
* **AC134:** Given Overzicht, then today and this week show play time, breaks, questions answered, percent right, and breaks finished early versus ended by time, matching the log.
* **AC135:** Given Instellingen, then the app version shows at the bottom.

### Saving, offline and device
* **AC96:** Given the kid built and mined, when the app is killed at any moment and reopened, then at most the last 5 seconds of changes are lost.
* **AC97:** Given the app was opened once online over HTTPS, when the iPad is in flight mode, then the app starts from the home screen and everything works, including both built in modules.
* **AC98:** Given the app runs, locally and on the deployed address, then it makes no network requests except loading its own files from its own address. The ship checklist confirms Cloudflare Web Analytics is off.
* **AC99:** Given the mute switch is on or sound is off in settings, then the game is fully playable and every right or wrong answer is still clear on screen.
* **AC100:** Given sound is on, then no sound plays before the first tap.
* **AC101 (iPad):** Given the reference iPad (F10) and the developer fps counter, when the founder walks around the world for 2 minutes with 6 wild and 12 tame dinos, then 95 percent of frames take 33 ms or less and no frame takes over 200 ms.
* **AC102:** Every button and tappable word has a tap area of at least 44 x 44 points. Kid screen text is at least 20 points, question text at least 24 points. Every text input in the parent area is at least 16 points, so Safari does not zoom.
* **AC136:** Given a save is cut off halfway (simulated in a test), when the app reopens, then the previous save loads.
* **AC137:** Given an unreadable save, when the app opens, then a friendly Dutch message shows with "Backup terugzetten" and "Opnieuw beginnen", no data is deleted without a double confirm, and no blank screen shows.
* **AC138:** Given a save from the previous app version (test fixture), when the new version opens it, then everything loads. Given a new version is waiting, then it is applied only at app start, never during a break or exam.
* **AC139:** Given storage is full or refused (simulated), then the parent area shows a gentle note and play goes on without a crash.
* **AC140:** Given the app runs over plain http, then it starts and plays without errors, and the parent sees a note where sharing or offline is not available.
* **AC141:** Given every kid screen, then normal text has a contrast of at least 4.5 to 1 and large text at least 3 to 1, also on the soft orange "wrong" colour and the lock icon. Right and wrong always show an icon (check or cross) as well as a colour.
* **AC142:** Given the pulsing countdown and pop effects, then nothing flashes more than 2 times a second. Given `prefers-reduced-motion`, then the pulse is off and the countdown text still grows.
* **AC143 (iPad):** Given the reference iPad, then the stick, jump button, hotbar, countdown and lock icon sit inside the safe area, and the hotbar sits high enough that using it never triggers the home swipe.
* **AC144:** Given a wiped iPad (empty storage), when the app opens, then the first start flow shows, and after "Geef de iPad aan je kind" the world loads with no errors.

## 8. Look, sound and feel
* **Style:** bright, friendly Minecraft style pixel blocks with 16 x 16 pixel textures. Dinos are chunky and cute with big eyes, made of boxes. Soft, still fog at the edge (no flicker). No blood, no scary sounds, no angry dinos.
* **Colours:** sky blue, grass green, warm sand. Right answers in green. Wrong answers in soft orange, never harsh red. Kleurblokken are bright red, blue, yellow and purple. Text contrast as in AC141.
* **Motion:** the mining pop is a short burst of a few pixel bits, under half a second. Nothing flashes more than 2 times a second. Reduced motion turns the pulse off.
* **Learning screens:** calm, white or soft paper background, one question at a time, big text, a small dino teacher ("Dino Juf") in the corner. Lots of space.
* **Exam screen:** even calmer: no dino animations, no sounds except a soft chime at the end.
* **Parent area:** plain and clear, grey and white, normal sized text, works like a settings app. Forms are one column, inputs are at least 16 points, and the active field scrolls into view above the iPad keyboard. The parent area is the one place where normal scrolling is allowed.
* **Font:** one round, very readable font, bundled with the app so it works offline. Kid text at least 20 points, questions at least 24 points.
* **Words:** Dutch, short sentences, groep 5 reading level on kid screens. Kind and encouraging: "Bijna!", "Goed zo!", "Wat knap!". Never "Fout!" on its own. The wrong answer screen says "Net niet. Zo is het:" followed by the right answer and the explain text.
* **Sounds:** short and soft. A pop when mining, a thunk when placing, a munch when feeding, a chime for right, a gentle "hmm" for wrong, a fanfare for a passed exam. No music in v1.

## 9. Kid safety and privacy
* **Data stored and where:** only on this iPad, in Safari's storage for this app. Stored: settings, pincode (hashed), own modules, answer history, break and exam results, the world changes, dinos (with names the kid types), backpack. No real name, age, photo, location or contact data is asked for or stored. The dino name screen asks for a dino name, not the kid's name.
* **Files:** backup and export files only leave the iPad when the parent shares them through the share sheet, behind the gate. Backups do not hold the pincode.
* **Network use:** only to load the app's own files on first visit and for updates. No other requests. No data is ever sent anywhere. Cloudflare Web Analytics and any other Cloudflare injected script stay off.
* **Tracking, ads, purchases, chat:** none. No analytics, no cookies for tracking, no third party scripts or fonts from other servers.
* **External links:** none. Text in imported modules is shown as plain text and is never a link.
* **Parent gate:** pincode protects settings, content choice, own modules, import, export, backup, results, ending a break and stopping an exam. The lockout survives reloads. The strength of the PIN reset is founder decision F4.
* **Content:** all questions and lessons are original and kid friendly (dinos, nature, school, family). Nothing scary or violent. Taal content gets a human spelling check before release (AC124).
* **Forced breaks:** the break is firm but kind. It never takes away blocks or dinos, there is no punishment for wrong answers, and the kid can always see how long is left.
* **Accessibility:** touch targets at least 44 points, readable text with good contrast, never only colour to show right or wrong (always a check or a cross icon too), works without sound and with the mute switch on, respects reduced motion.

## 10. Constraints
* **Platform:** Safari on iPad, home screen web app, landscape. Tested in Playwright WebKit with an iPad profile, plus a real iPad check at every milestone. Checks marked (iPad) in section 7 can only be done on the real device.
* **Hosting:** static files on Cloudflare Workers (`wrangler.jsonc` with assets in `./dist`), free plan. No Worker code, no KV, D1 or R2. Every deploy is a founder decision.
* **HTTPS:** Safari only allows the offline service worker, file sharing and persistent storage over HTTPS. Testing on the local network (`npm run dev -- --host`) works for play, but install, offline and the share sheet need the deployed HTTPS address. So F9 must be decided before milestone 2.
* **Budget:** free. No paid services, no accounts, no API keys. Fonts and sounds must be free to use (for example CC0) or made by us.
* **Offline:** everything works offline after the first visit.
* **Size:** the first download should stay under 5 MB so it loads fast on home wifi.
* **Storage:** keep a year of history small enough to stay well under Safari's limits. The architect picks the storage (IndexedDB is expected).
* **Performance:** see AC101 on the reference iPad. Small world, merged block faces, one texture atlas, no shadows, pixel ratio capped at 2. The first world task is a speed spike on the reference iPad with a written go or no go; the fallback is a 48 x 48 world.
* **Content:** the Taal module in `docs/modules/cito-taalverzorging/` is complete (10 topics, 288 items, 4 exams) and validates. The module format may be adapted by the architect (decision 6), but built in and parent made modules use the same format. Only built in code modules (Rekenen) use the `generator` field.

## 11. Risks and open questions

### Open founder decisions
| # | Question | Options | Recommendation |
|---|---|---|---|
| F1 | v1 is large (about 55 to 65 tasks). How do we handle that? | A: build order. v1a (play and learn, 4.0) is milestone 1 and 2, v1b (parent power tools) is the last milestone. Both are part of v1 and both are signed now. B: cut v1b to Later, sign only v1a now. C: build everything at once, no split. | A. You asked for parent made learning blocks, results views and exams, so they stay in v1. Building v1a first means the kid can play and learn sooner, and we learn from real use before building the editor. |
| F2 | How does a learning break end? | A: when all questions are answered, or when the break time is up, whichever comes first. B: only when all questions are answered. C: A as default, B available in settings. | C. It matches "finish early" (decision 4), keeps breaks short, and lets you make it strict. |
| F3 | Parent gate type | A: 4 digit pincode set at first start, with an adult question to reset it. B: a fresh adult puzzle each time (no code). C: both. | A. A kid who is learning tables could solve simple puzzles. A code is quicker for you. |
| F4 | How strong is "PIN vergeten"? A kid could guess or use the calculator app. | A: a new two step question in words each time, 2 wrong tries then a 10 minute block, shared lockout with the pin pad. B: one question as now, with the shared lockout only. C: no reset in the app; a forgotten pincode means restoring a backup on a fresh install. | A. It does not stop a determined kid with a calculator, but the block makes guessing slow and boring, which is enough at 8 to 10. C is safest but harsh on a tired parent. |
| F5 | Light goals and rewards | A: varenblaadjes tame dinos, kleurblokken from breaks, golden dino for a passed exam. B: only varenblaadjes and taming. C: no rewards, pure sandbox. | A. Rewards link learning to the fun parts without changing the open sandbox. |
| F6 | Rewards for zero effort. Today 0 right still gives a chest, and Extra oefenen pays without limit, so food can be farmed by guessing. | A: 0 right gives a kind message and no chest; Extra oefenen pays at most 10 varenblaadjes a day. B: every finished break pays a chest, Extra oefenen unlimited. C: 0 right gives no chest, Extra oefenen unlimited. | A. Random tapping should not pay, and the cap keeps building time more fun than farming. The "snel geklikt" mark helps you see guessing. |
| F7 | Golden egg when the kid already has 12 tame dinos | A: golden dinos do not count toward 12 (12 normal plus any golden). B: the egg waits until the kid has room. C: the kid picks a dino to say goodbye to, with a confirm. | A. A passed exam is hard work and must always pay. Exams are rare, so the herd stays small. C would make a kid sad. |
| F8 | Does the kid see the exam score? | A: score and a kind message, details only for the parent. B: only "Klaar!", the score only for the parent. | A. Kids this age like to know how they did, and the message is always kind. |
| F9 | Where does the app live for daily use? Needed before milestone 2 to test install, offline and sharing. | A: deploy to the public `minespel.<account>.workers.dev` address. B: same, protected with Cloudflare Access set up by you. C: only local network testing, no home screen install. | A. The server holds no data and nothing personal, so a public static address is safe. Access adds login hassle. Each deploy still needs your approval. |
| F10 | Which iPad is the reference device? Needed for the speed spike in milestone 1. | Tell us the model or year (Instellingen, Algemeen, Info) and the iPadOS version. | We plan for an iPad from 2018 or later on iPadOS 16 or newer. If it is older, the world may shrink to 48 x 48. |
| F11 | Rekenen scope in v1 | A: as in 4.10 (plus, minus, tafels, delen, generated, four levels, four exams). B: only tafels and delen. C: A plus klokkijken. | A. Modest, endless fresh sums, and the same levels as Taal. |
| F12 | App name | A: Dino Blokwereld. B: Minespel. C: the kid picks a name. | C, with A as the working title. A name the kid chose makes it theirs. |

### Risks
| Risk | Effect | What we do |
|---|---|---|
| 3D is too slow on the reference iPad | Stutter, the game is not fun | Speed spike as the first world task, measured on the real iPad with a go or no go. Small world, merged faces, no shadows. Fallback 48 x 48. |
| Safari drops the 3D view after the background | Black screen | Rebuild the view on context loss (AC109). |
| Safari wipes the storage or iOS kills the app | Lost world and progress | Eager small saves, safe writes, home screen install, persistent storage, backup file, reminder after 30 days. |
| Features missing on plain http | Gate, sharing or offline fail in local tests | Built in pincode hash, fallbacks with a parent note, real checks on the HTTPS address (F9). |
| The iPad keyboard autocorrects spelling | Typing questions become useless | Own on screen keyboard (4.8). |
| Forced breaks make the kid angry | Kid stops playing | Short breaks, finish early, "Laatste vraag" grace, kind words, good rewards, the parent can tune interval and question count. |
| The Taal content has mistakes | Wrong spelling is taught | Validator with content checks, human check by QA and the founder (AC124), the parent can switch off any skill. |
| The parent editor is fiddly on an iPad | The parent gives up on own modules | One column forms, Probeer preview, import of JSON made elsewhere as a backup path. Built last (v1b). |
| Share sheet behaves differently in home screen mode | Backup or export fails | Test on the real iPad in milestone 2. Fallback: open the file in a new view and share from there. |
| Scope is large | Long build | Build order v1a then v1b (F1). The learning engine and the break come before any world polish. |
