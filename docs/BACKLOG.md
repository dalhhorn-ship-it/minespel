# Release backlog: Dino Blokwereld

Not signed. Changing this file never closes the PRD gate (decision 80). The signed product core is `docs/PRD.md`. The release picked next gets its section in `docs/PRD.md` section 12 and is signed there. Shipped release sections are archived in `docs/releases/`.

## Next steps (founder order)

1. **v9 Eerlijke punten (0.3.0)** (decision 87), shipped 2026-10-22. Honest point banners, one egg hint rule (decision 84) and no malus anywhere. Its section is archived in `docs/releases/v9.md`.
2. **Refactor round R1** (shipped 2026-10-24, decision 78, see `docs/archive/SIMPLIFY.md` section 4 and decision 82). One ready signal so no button is dead while the app loads, the egg limit mismatch, and e2e in Chromium before each push. It needed no PRD change.
3. **v10 Punten voor elke ronde (0.4.0), shipped 2026-10-24.** A kid bug went first (decision 92): every round of oefenen pays, and the parent picks how much a mistake costs. Its section is archived in `docs/releases/v10.md`.
4. **v11 Dorp (0.5.0), shipped 2026-10-25** (PR #13, decisions 94 and 95): villages with houses, villagers who ask a question, a silly dance or "Respect bruuuuu!" and a rare block. Its section moves from PRD section 12 to `docs/releases/v11.md` when v3 is scoped.
5. **v3 Dino's veilig (0.6.0)**, candidate, the next one to scope (decisions 90, 92 and 94).
6. **v6 Wat heb ik geleerd (0.7.0)**, after v3 (decisions 91, 92 and 94). It grows into a parent learning dashboard. v4 and v5 come after it.
7. **Taal spelling check (T65)** runs beside the next release (decision 81). It is the human content check from AC124: QA reads 5 items per Taal topic against woordenlijst.org, and the founder or a teacher reads 20 items. It is mostly reading and needs no code.

On hold: the save on refresh fix (decision 72).

Versions follow shipping order: v10 shipped as 0.4.0, then v11 as 0.5.0, v3 as 0.6.0, v6 as 0.7.0. v9 and v10 got their ids because v7 and v8 are never reused.

## Rules

* **Small releases.** One at a time. Each gives the kids (or the parent) one thing they can feel, holds at most 5 plan tasks, and ships on its own. The founder picks the next one at `/release`; only then it gets a section in `docs/PRD.md` section 12.
* **Release ids and versions.** The id (v2, v3, ...) is a fixed name in this backlog, so the tags in PRD section 7 stay valid. Ids are never reused, also not for dropped releases. The version number is given in shipping order: the first release shipped after v1 is 0.2.0, the next 0.3.0, and so on, whichever id it is.
* **Ranking.** Value for the kids against size. Kid feedback, bugs the kids hit and things they asked for go first.
* **Status.** `shipped`: live, its section is archived in `docs/releases/vN.md`. `next`: picked by the founder, has its section in PRD section 12, built next. `candidate`: can be picked next, all its plan dependencies are done or can be pointed at the live build. `later`: waits for an earlier release. `dropped`: the founder dropped it.
* **Size.** S: about one session. M: two or three sessions. L: four or more.
* **Life of a release.** Scoped: its section goes in PRD section 12 and the founder signs it. Shipped: this backlog marks it `shipped` (no signoff needed). Its section moves from PRD section 12 to `docs/releases/vN.md` together with scoping the next release, so that is one signoff. Its new acceptance criteria move into PRD section 7 at the same time.
* Every release ends with a real iPad check of what it adds (CLAUDE.md), and the kid safety rules in PRD section 9 hold for every release.

## Ranked backlog

| Rank | Release | What the kids or the parent feel | Size | Value for the kids | Plan tasks | Status |
|---|---|---|---|---|---|---|
| | **v1** | The block world with dinos, learning breaks, the Dinowinkel and chickens (PRD 4.0) | | | every v1 task in `docs/PLAN.md` | shipped (0.1.0) |
| | **v2 Gouden ei** | The parent starts a practice exam. Pass it and a golden dino hatches. One tap Winkel, Pauze that always opens. | M | | T39, T51a, T51b, T51c, T51d, T51e | shipped (0.2.0), see `docs/releases/v2.md` |
| | **v9 Eerlijke punten** | Every number I see is the points I get, the egg hint is always right, and a mistake never costs points. | S | High. A kid complaint, so it goes first. | V9a, V9b, V9c (decision 89) | shipped (0.3.0, 2026-10-22), see `docs/releases/v9.md` |
| | **R1** (refactor, not a release) | Buttons are never dead while the app loads. | S to M | Medium. Fixes taps that did nothing. | R1a to R1e (decision 82) | shipped (2026-10-24) |
| | **v10 Punten voor elke ronde** | Every round of oefenen pays, not only the first one. Papa or mama picks how much a mistake costs: Makkelijk, Normaal or Moeilijk. | S | High. A bug the kid hit, so it goes first. | about 3, the operator or architect cuts them | shipped (0.4.0, 2026-10-24), see `docs/releases/v10.md` |
| | **v11 Dorp** | Villages with houses; a villager asks a question when I come close; a right answer gives a silly dance or "Respect bruuuuu!" and a rare block; 8 rare blocks to find. | M | High. A founder and kid wish, learning inside the world. | V11a to V11e (architect review) | shipped (0.5.0, 2026-10-25) |
| 1 | **v3 Dino's veilig** | A backup file keeps the world, dinos and points safe, even on a wiped or new iPad. | M | High, as insurance. Losing a herd of dinos would hurt the most. | T18, T19, T53a, T55 | candidate, next to scope (decisions 90, 92 and 94), 0.6.0 |
| 2 | **v6 Wat heb ik geleerd** | A parent learning dashboard: is my kid really learning? Right on the first try per topic over time, topics that got better or got stuck, the hardest questions, exam results, and learning time against play time. All worked out on the iPad, behind the gate. | M, may grow to L | High for the parent (decision 91). Through the parent, who can then switch on what is hard. | T21, T56, T61, plus dashboard tasks the architect cuts | candidate, after v3 (decisions 91, 92 and 94), 0.7.0 |
| 3 | **v4 Altijd spelen** | The game starts without internet, never shows a blank screen, and two open tabs never fight over the save. | M | Medium to high. Protects saves, and the kids notice when it is missing. | T52, T22, new first start task | later (after v3) |
| 4 | **v5 Veilig en juist** | Nothing reaches the internet, everything fits with the big font, and the game is smooth on the family iPad. | M | Medium. Mostly invisible, but it protects what the kids learn and see. | T63, T62, T32, T64 (T65 runs now, decision 81) | candidate |
| | **v7 Eigen woorden** | | | | T40, T54, T57, T59 | dropped (decision 79) |
| | **v8 Modules delen** | | | | T53b, T20, T58, T60 | dropped (decision 79) |

Open plan tasks: 13 in v3 to v6 (v6 may get more for the dashboard, decision 91), plus the new first start task in v4 (decision 60), plus T65 beside the next release. The 8 tasks of v7 and v8 are dropped; the architect marks them in `docs/PLAN.md`.

### v11 Dorp
* **Status:** shipped as 0.5.0 on 2026-10-25 (PR #13, decisions 94 and 95). The signed text is `docs/PRD.md` section 12; this entry is the short version.
* **Goal:** villages in the world, where villagers ask a question the kid has learned before and give a dance or "Respect bruuuuu!" and a rare block for a right answer.
* **In:** 3 villages with 2 or 3 houses each, added to existing worlds only where the kid changed nothing. 8 villagers wandering near home. A speech bubble the kid taps for one question from seen items, two tries, no points. First try moves the boxes. A 3 minute shared cooldown. 8 rare blocks, a Dorp tab with "?" tiles and "N van de 8 gevonden", kept after "Wereld opnieuw beginnen". Version 0.5.0.
* **Out:** the bigger world (its own later release, speed spike at 128 x 128 first). Villagers that trade, talk or follow. Points for villager questions.
* **Size:** M, 5 tasks (V11a to V11e, architect review). **Criteria:** AC178 to AC191.
* **Note for the release after v11:** delete the kept copy of the old world record (PRD section 12, In item 2).

### v3 Dino's veilig
* **Status:** candidate, next to scope, ships as 0.6.0 (decisions 90, 92 and 94). Its section was drafted on 2026-10-24 (see "Draft section" below) and is written into PRD section 12 when v11 has shipped. The backup must also hold the found rare blocks and the villager cooldown of v11 (PRD 4.15 and AC87 already say so).
* **Goal:** the parent can make a backup file and put it back, so nothing the kid built or earned is ever lost for good.
* **In:** PRD 4.15 file header, sharing files, Backup maken, Backup terugzetten. 4.17 Alles wissen, Volume and the app version. Tests for Pauze nu starten, Pauze nu beëindigen and Wereld opnieuw beginnen, which v1 already has.
* **Out:** the backup reminder after 30 days (v4). Module import and export (dropped, decision 79).
* **Size:** M. **Tasks:** T18 (backup file), T19 (share and file pick helpers), T53a (backup in the parent area), T55 (settings actions). Volume and the app version are small leftovers of T49 that go with T55.
* **Criteria:** AC87, AC93 (Volume part), AC94 and AC95 (tests), AC130, AC131, AC133, AC135, AC152 (Alles wissen and restore part), and 7 new criteria (drafted below as B1 to B7; they get the next free numbers, from AC192 after v11, when v3 is scoped).
* **Already in the PRD core:** the v10 signoff also carries the v3 clarifications of 4.15 (what the backup holds, where the buttons are), 4.17 (Alles wissen), Flow 10, section 9 (Files) and AC87, AC131, AC133 and AC135, all still tagged or marked for v3.
* **Open founder question for v3 (V3-1): how does the parent reach "Pauze nu beëindigen"?** The button works only while a break runs, but since decision 53 a learning break has no lock and the world lock is hidden then. So no parent can open the parent area during a break, and the button can never be tapped (checked in `src/app/parent-flow.ts` and `src/ui/parent/settings-screen.ts`). Options: **A (recommended)** a small lock on the learning break only to end it, like the exam lock of decision 61, one more criterion inside T55; **B** keep it, tested through the code only; **C** remove the button and AC95. Ask when v3 is scoped.
* **Draft section** (not signed, written 2026-10-24, to copy into PRD section 12 at `/release`):
  * **Goal:** "My world, my dinos and my points are safe. Even on a wiped or new iPad, papa or mama can bring them back."
  * **Why:** Safari can wipe the storage of a site and iOS can kill the app. The home screen app and a Safari tab keep separate saves (decision 72). Today there is no way back after a wipe. Alles wissen only makes sense once a backup exists.
  * **In:** (1) Backup maken under Import en export: one `.json` file with everything except the pincode and the gate lockout, with the file header, out through the share sheet or the new view fallback; the app remembers the last backup date. (2) Backup terugzetten: pick, check in full, confirm, replace in one safe write; a broken, wrong, too big or newer file changes nothing; the pincode stays; the app then shows the restored world. (3) Alles wissen: confirm twice, delete everything including the pincode, start a new game. (4) Volume 0 to 100, default 70, and the app version at the bottom of Instellingen. (5) Tests for Pauze nu starten, Pauze nu beëindigen and Wereld opnieuw beginnen; bugs they find are fixed in the release. (6) The next version and a CHANGELOG entry.
  * **Out:** 30 day reminder, broken save screen, persistent storage and the first start flow (v4). Module import and export (dropped). Automatic, cloud or server backups and sync. The save on refresh fix.
  * **Kid safety:** backups are made and restored only behind the parent gate. They hold only game data (dino names included), no real name, age, photo, location or contact data, no pincode, no lockout. The file name is only the app name and the date. A backup never leaves the iPad on its own: no upload, no server, no network request, only the parent's own share sheet. A restored file is checked in full and its text shows only as plain text.
  * **B1 Volume:** at 0 no effect is heard, at 40 the next effect plays at 40 percent, default 70, saved across a restart, and Geluidseffecten uit wins.
  * **B2 Alles wissen:** two confirms with different words, Annuleren at either step changes nothing; after both, all data and the pincode are gone, a new game shows as in AC12, and the next lock tap asks the grown up question (decision 52).
  * **B3 Backup file:** exactly one file named `dino-blokwereld-backup-JJJJ-MM-DD.json`, no pincode or hash, no lockout, the backup date is saved, no network request (automated).
  * **B4 Refused files:** not JSON, over 20 MB, or a value outside the save rules (dino name over 12 characters or with characters not on the app keyboard such as `<b>Pip</b>` or `https://x.nl`, negative points, more than 12 shop dinos or 10 chickens) is refused with a friendly Dutch message and nothing changes. No backup text ever shows as a link or runs as a script.
  * **B5 Pauze nu starten:** with no break or exam running, the parent area closes and a learning break starts right away with timed break rules, and play resumes with a full play timer after the summary.
  * **B6 Restore confirm and safe write:** a confirm "Alles op deze iPad wordt vervangen door de backup van [datum]" with Terugzetten and Annuleren; a restore killed halfway (simulated) leaves all old or all new data, never a mix.
  * **B7 Version:** `package.json`, Instellingen and the CHANGELOG show the new version, with a kid readable line about keeping your world and dinos safe in a backup.
  * **iPad check:** on the HTTPS address (a test deploy is a founder action), make a backup to Bestanden, change something, restore and see the old world back; then in a Safari tab with empty storage set a pincode through the lock, restore the same file and see the world, dinos and points appear. Turn Volume down and up.

### v6 Wat heb ik geleerd
* **Status:** candidate, after v3 (decisions 91, 92 and 94). Ships as 0.7.0 if it ships in this order.
* **Goal:** the parent sees what the kid knows and what is hard, and can tell at a glance if the kid is really learning. It grows into a parent learning dashboard (decision 91).
* **In:** PRD 4.16 in full: Overzicht, Pauzes, Per onderdeel, Over tijd, Lastige vragen, Examens. Plus key dashboard stats: right on the first try per topic over time, topics that got better or got stuck, the hardest questions, exam results, and learning time against play time.
* **Kid safety:** everything is worked out on the iPad, behind the parent gate. Nothing leaves the device, no tracking, no analytics service (decision 91, PRD section 9).
* **Out:** nothing else.
* **Size:** M, may grow to L with the dashboard. If it is more than 5 tasks, product splits it into two small releases at `/release`, and the first part must be useful to the parent on its own (for example Overzicht with the key stats first, the drill down views second). **Tasks:** T21 (results queries), T56 (Overzicht, Pauzes, Examens), T61 (Per onderdeel, Over tijd, Lastige vragen), plus dashboard tasks the architect cuts.
* **Criteria:** AC89, AC90, AC91, AC92, AC134, plus new criteria for the dashboard stats when it is scoped.

### v4 Altijd spelen
* **Goal:** the game always starts and never loses or mixes up a save.
* **In:** PRD 4.18 broken save screen, storage full note, persistent storage, home screen note, backup reminder. 4.19 offline play, plain http notes, one window, and the first start flow (kept by decision 60). The "geen vragen" warning from 4.13.
* **Out:** nothing else. The flight mode check on the real iPad (AC97) is done in this release's own iPad check, or in T64 if v5 comes later.
* **Size:** M. **Tasks:** T52 (robustness), T22 (offline service worker), new task for the first start flow.
* **Criteria:** AC73, AC97, AC114, AC129, AC137, AC138 (update at start), AC139, AC140, AC144.
* **Why not first:** T52 needs the backup file from v3 (the broken save screen offers "Backup terugzetten", the reminder reads the last backup date). The kids play from the home screen at home on wifi (decision 54), so offline matters less than a backup.

### v5 Veilig en juist
* **Goal:** prove the live game is safe, correct and smooth, and fix what the checks find.
* **In:** the kid safety suite (no outside requests, no links, plain text, every parent route behind the gate, works with sound off). The accessibility and layout audit with Groter lettertype. The speed spike and the full real iPad check.
* **Moved out:** the human Taal content check (T65, AC124) runs now, beside the next release (decision 81).
* **Out:** checks of features that do not exist yet. Each later release re-runs the suites for what it adds.
* **Size:** M, mostly qa and founder time. **Tasks:** T63 (safety suite), T62 (accessibility audit), T32 (speed spike), T64 (real iPad checks).
* **Criteria:** AC76 (route test), AC98, AC99, AC101, AC102, AC107, AC141 (full audit), AC143, AC154 (audit). AC124 goes with T65.
* **Plan note:** in `docs/PLAN.md`, T62 and T63 wait for every feature task. The architect points them at the live build, so this release does not wait for later features.

## Dropped

Dropped by the founder (decision 79). New lessons and questions come through the `/module` skill as folder modules in `docs/modules/`, on the content release path. The ids v7 and v8 and the numbers below are never reused. The full feature text (PRD 4.14 and the module parts of 4.15) is in git history, in `docs/PRD.md` before the split.

### v7 Eigen woorden (dropped)
* Was: the parent makes an own module in the app, with lessons and all four question types, checks each one with Probeer, makes a copy of Taal, and deletes with confirm (PRD 4.14). Tasks T40, T54, T57, T59.
* AC80: Given the parent creates a module with one topic, one lesson page and one item of each of the four types, then the module validates, appears in Inhoud kiezen, and its items can show up in breaks.
* AC81: Given the parent types the `punctuate` sentence "Ik zag een raptor, een T-rex en een ei.", then the stored item has the words without the comma and `answer` [3].
* AC82: Given the parent edits the text of an item, then the item keeps its id and its box.
* AC83: Given a built in module, then it cannot be edited. Given the Taal module, then "Kopie maken" creates an editable copy with new ids. Given Rekenen, then there is no "Kopie maken".
* Also dropped: the module delete part of AC152.

### v8 Modules delen (dropped)
* Was: Exporteer module, Importeer module, the id conflict choice, the bundle script (PRD 4.15), own exams and the 10 000 item list (PRD 4.14). Tasks T53b, T20, T58, T60.
* AC84: Given an exported module file, when it is imported on a fresh install, then the same module with the same content appears (automated). (iPad) Given "Exporteer module" on the reference iPad in home screen mode, then the share sheet opens with one `.json` file, or the file opens in a new view that can be shared.
* AC85: Given an import file with errors, then nothing is imported and every error shows in Dutch with the item id. Given a file over 2 MB or not JSON, then it is refused with a friendly message. The test set includes text with `<script>`, `javascript:` and `https://`, a file just over 2 MB, and a file with 10 000 items.
* AC86: Given an import with an id that exists, then the parent must choose "Vervangen" or "Als nieuwe module toevoegen". Vervangen keeps progress for item ids that still exist. Given the id of a built in module, then only "Als nieuwe module toevoegen" is offered.
* AC88: Given any text from an imported module (also text that looks like HTML or a web address), then it shows as plain text. No link is ever clickable and no script runs.
* AC132: Given a module with 10 000 items, then the editor item list opens within 2 seconds and scrolls without freezing.
* Also dropped: the export part of AC131.

## Later

Not planned in any release. Each would need the founder to pick it first.
* Bigger world (decision 94 wants it as its own release after v11; it starts with a speed spike at 128 x 128 on the oldest iPad, see the architect review in `docs/DISCUSSION.md`). More biomes, caves, flowing water and lava, day and night, weather. (Water and lava as plain blocks are in v1.)
* More block types beyond the 32 in v1, crafting, tools, chests to store blocks, doors.
* Wild dinos, taming with food, earning blocks.
* Creative mode (floating is in v1), riding dinos, dino eggs found in the world, baby dinos that grow up over days, more dino kinds, dino skins, selling or swapping dinos.
* Hidden treasures or quests in the world.
* More Rekenen: klokkijken, breuken, geld, metriek stelsel, verhaaltjessommen, cijferen, delen met rest.
* More Taal modules: begrijpend lezen, woordenschat, grammatica (ontleden), dictee with spoken words. (Folder modules made with `/module` are content, not a release.)
* Read aloud (text to speech) for lessons and questions.
* Parent settings for point values or egg prices. (The one Punten setting for what a mistake costs comes with v10, decision 92.)
* Pictures or sound in lessons and questions.
* Mixed modules inside one break.
* Exams across modules.
* Daily play time limit and bedtime lock.
* More than one kid profile.
* Typing the correction in `find-error`, other punctuation marks in `punctuate`.
* Long press actions in the world.
* Background music.
* Portrait mode.
* Renaming the app from inside the app (the kid may pick the final name later, see F12).
* Custom domain for the hosted app.
* Sync between devices, sharing modules online, any account or server.
