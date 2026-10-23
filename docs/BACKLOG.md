# Release backlog: Dino Blokwereld

Not signed. Changing this file never closes the PRD gate (decision 80). The signed product core is `docs/PRD.md`. The release picked next gets its section in `docs/PRD.md` section 12 and is signed there. Shipped release sections are archived in `docs/releases/`.

## Next steps (founder order)

1. **v9 Eerlijke punten (0.3.0)** (decision 87), shipped 2026-10-22. The kid said the points do not add up and the game is too harsh. Honest point banners, one egg hint rule (decision 84) and no malus anywhere. Its section is in `docs/PRD.md` section 12. It comes before R1.
2. **Refactor round R1** (decision 78, see `docs/SIMPLIFY.md` section 4 and decision 82), right after v9. One ready signal so no button is dead while the app loads, the egg limit mismatch, and e2e in Chromium before each push. At most 5 tasks, milestone `R1` in `docs/PLAN.md`. It needs no PRD change: the kids see no new behaviour, except that buttons that did nothing while loading now work.
3. **v3 Dino's veilig.** Picked by the founder as the release after R1 (decision 78). At `/release`, product writes its section in `docs/PRD.md` section 12 and the founder signs it.
4. **Taal spelling check (T65)** runs beside the next release, so beside v9 (decision 81). It is the human content check from AC124: QA reads 5 items per Taal topic against woordenlijst.org, and the founder or a teacher reads 20 items. It is mostly reading and needs no code.

On hold: the save on refresh fix (decision 72).

With v9 shipping as 0.3.0, v3 becomes 0.4.0 if it ships next (versions follow shipping order). v9 got its id because v7 and v8 are never reused.

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
| | **v9 Eerlijke punten** | Every number I see is the points I get, the egg hint is always right, and a mistake never costs points. | S | High. A kid complaint, so it goes first. | cut by the architect, about 3 | shipped (0.3.0, 2026-10-22) |
| | **R1** (refactor, not a release) | Buttons are never dead while the app loads. | S to M | Medium. Fixes taps that did nothing. | R1a to R1e (decision 82) | after v9 (decisions 78 and 87) |
| 1 | **v3 Dino's veilig** | A backup file keeps the world, dinos and points safe, even on a wiped or new iPad. | M | High, as insurance. Losing a herd of dinos would hurt the most. | T18, T19, T53a, T55 | candidate, the founder's pick after R1 (decision 78) |
| 2 | **v4 Altijd spelen** | The game starts without internet, never shows a blank screen, and two open tabs never fight over the save. | M | Medium to high. Protects saves, and the kids notice when it is missing. | T52, T22, new first start task | later (after v3) |
| 3 | **v5 Veilig en juist** | Nothing reaches the internet, everything fits with the big font, and the game is smooth on the family iPad. | M | Medium. Mostly invisible, but it protects what the kids learn and see. | T63, T62, T32, T64 (T65 runs now, decision 81) | candidate |
| 4 | **v6 Wat heb ik geleerd** | The parent sees progress per topic, over 12 weeks, the hardest questions and every exam. | M | Medium. Through the parent, who can then switch on what is hard. | T21, T56, T61 | candidate |
| | **v7 Eigen woorden** | | | | T40, T54, T57, T59 | dropped (decision 79) |
| | **v8 Modules delen** | | | | T53b, T20, T58, T60 | dropped (decision 79) |

Open plan tasks: the v9 tasks, 13 in v3 to v6, plus the new first start task in v4 (decision 60), plus T65 beside the next release. The 8 tasks of v7 and v8 are dropped; the architect marks them in `docs/PLAN.md`.

### v3 Dino's veilig
* **Goal:** the parent can make a backup file and put it back, so nothing the kid built or earned is ever lost for good.
* **In:** PRD 4.15 file header, sharing files, Backup maken, Backup terugzetten. 4.17 Alles wissen, Volume and the app version. Tests for Pauze nu starten, Pauze nu beëindigen and Wereld opnieuw beginnen, which v1 already has.
* **Out:** the backup reminder after 30 days (v4). Module import and export (dropped, decision 79).
* **Size:** M. **Tasks:** T18 (backup file), T19 (share and file pick helpers), T53a (backup in the parent area), T55 (settings actions). Volume and the app version are small leftovers of T49 that go with T55.
* **Criteria:** AC87, AC93 (Volume part), AC94 and AC95 (tests), AC130, AC131, AC133, AC135, AC152 (Alles wissen and restore part).

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
* **Plan note:** in `docs/PLAN.md`, T62 and T63 wait for every feature task. The architect points them at the live build, so this release can ship before v6.

### v6 Wat heb ik geleerd
* **Goal:** the parent sees what the kid knows and what is hard.
* **In:** PRD 4.16 in full: Overzicht, Pauzes, Per onderdeel, Over tijd, Lastige vragen, Examens.
* **Out:** nothing else.
* **Size:** M. **Tasks:** T21 (results queries), T56 (Overzicht, Pauzes, Examens), T61 (Per onderdeel, Over tijd, Lastige vragen).
* **Criteria:** AC89, AC90, AC91, AC92, AC134.

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
* Bigger world, more biomes, caves, flowing water and lava, day and night, weather. (Water and lava as plain blocks are in v1.)
* More block types beyond the 32 in v1, crafting, tools, chests to store blocks, doors.
* Wild dinos, taming with food, earning blocks.
* Creative mode (floating is in v1), riding dinos, dino eggs found in the world, baby dinos that grow up over days, more dino kinds, dino skins, selling or swapping dinos.
* Hidden treasures or quests in the world.
* More Rekenen: klokkijken, breuken, geld, metriek stelsel, verhaaltjessommen, cijferen, delen met rest.
* More Taal modules: begrijpend lezen, woordenschat, grammatica (ontleden), dictee with spoken words. (Folder modules made with `/module` are content, not a release.)
* Read aloud (text to speech) for lessons and questions.
* Parent settings for point values, egg prices or malus.
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
