# Idea

## Seed
"Create a 3D minecraft education kind of game but then also with dinosaurs, and every 5 minutes a forced learning block where the kid needs to learn (like grammar, math, etc.). Minecraft game needs to be fun. Have a countdown for the learning blocks. Have a way for parents to define new learning blocks, check performance, select what gets asked, settings menu, be able to also run exams in the game. Learning features: lessons (to learn new stuff), tests (to test what they have learned, repeat what doesn't work etc)."

## Who it is for
One kid, age 8 to 10, plays alone. Dutch game text and lessons. Safari on an iPad, touch only, offline after first visit, static site. No accounts, no server. Data stays on the device. No chat, no links out. Parent area is behind a parent gate.

## Fixed in every concept
* 3D voxel world with dinosaurs.
* A learning break every 5 minutes, with a visible countdown.
* Parent area (behind a gate): make own lessons and tests, see performance, choose subjects and topics, settings, run exams.
* Lessons (learn new things) and tests (check it). Wrong answers come back later (spaced repetition).

## Tech note for all concepts (the big risk)
Use three.js with a small world, for example 64 x 32 x 64 blocks in 16 x 16 x 16 chunks. Merge faces so hidden faces are not drawn. Reuse one texture atlas with small pixel textures. Cap pixel ratio at 2, no shadows, simple fog, low poly dinos made of boxes. Touch controls: left thumb stick to move, drag right side to look, tap to break, long press or button to place. Target 30 fps on an older iPad. Test early on a real iPad.

## Concepts
### 1. Dino Hatchery
* Pitch: Dig up dino eggs, build a nest and raise baby dinos into big friendly ones.
* Core loop: Explore, mine blocks, find eggs, build a cosy home and feed dinos. Every 5 minutes the learning break gives "dino food" for right answers. Food makes dinos grow.
* For: Age 8 to 10, alone.
* Smallest fun version: One 64 x 64 island. Mine and place 6 block types. 3 egg types hatch into 3 dino kinds. Feed with food from the learning break. Math and spelling questions, 4 buttons each. Parent area with question list, scores and a switch for subjects.
* Later: More dino kinds, ride a dino, dino skins, exam mode that unlocks a rare egg, own lesson pictures.
* Effort: M

### 2. Time Rift Archaeologists
* Pitch: Dig for fossils, then the learning break "cleans" them in the lab to see the whole dino.
* Core loop: Dig in a big dig site, find fossil pieces, then answer questions to clean each piece. A full skeleton wakes up as a living dino in your park.
* For: Age 8 to 10, alone.
* Smallest fun version: One dig site, 10 fossil pieces for 2 dinos. Questions clean pieces. Finished skeleton becomes a walking dino. Lessons first, then test. Basic parent screen.
* Later: More dig sites, museum room to build and show, exam as "big dig day".
* Effort: M

### 3. Dino Rescue Island (wild card)
* Pitch: A volcano will erupt. Build bridges and safe pens to save the dinos in time.
* Core loop: Build and gather in short rounds. The 5 minute break is the "volcano rumble": answer to cool the lava and buy more time. Wrong answers return as "rumble questions" in the next round.
* For: Age 8 to 10, alone. Cartoon volcano only, no scary parts.
* Smallest fun version: One small island, one volcano timer, 5 dinos to lead into a pen by tapping them and building a path. Round ends with a score and a list of mistakes to practise.
* Later: More islands, weather, boss dino (friendly giant) for exams.
* Effort: L

### 4. Dino Farm Craft (calm, small)
* Pitch: A cosy blocky farm where tame dinos help you grow a park.
* Core loop: Plant, build, collect, decorate. The learning break is "school time at the farm". Good scores give coins for decorations. Daily streak is gentle, never punishing.
* For: Age 8 to 10, alone. Also fine for younger.
* Smallest fun version: 48 x 48 flat world, 5 crops, 2 helper dinos, 20 build blocks, one shop with 10 items. Questions for one subject at a time.
* Later: Seasons, more dinos, visitors who ask lesson questions, parent picks "shop prices" in coins.
* Effort: S to M

### 5. Dino Quest Dungeon-less (story adventure)
* Pitch: Follow a map across the dino world, solve block puzzles and meet a dino professor.
* Core loop: Walk to a goal, build bridges and doors with blocks, meet the professor who teaches a lesson. The 5 minute break is the professor calling you. Chapters end with a test, then an exam for the final gate.
* For: Age 8 to 10, alone.
* Smallest fun version: 3 small areas (forest, swamp, mountain), 3 puzzles, 1 professor dino, 1 chapter test. Lessons shown as short card slides.
* Later: More chapters, cutscenes, own chapters made by parents.
* Effort: L

## Open questions
1. Which subjects first? Suggested: math (tables and sums) and Dutch spelling and grammar. Or add English words, or time and clocks.
2. How do parents make questions? Suggested: a simple form with multiple choice and typed answers. Or paste a list, or only fixed packs at first.
3. What happens in the break? Suggested: cannot be skipped, but the game saves first and kid can finish early. Or a "snooze one minute" once per hour.
4. Which grade level? Suggested: groep 5 and 6 (age 8 to 10), with an easy and hard level the parent can set.
5. Where do exams live? Suggested: a parent starts an exam, kid answers in a calm screen, parent sees a report. Or a kid-started "boss test".

## Recommendation
Concept 1, Dino Hatchery. It has a clear fun loop (mine, build, raise dinos) and learning is a natural reward: right answers feed the dinos. It is also the right size for a first 3D build on iPad. Concept 4 is the fallback if 3D proves too heavy.

## Chosen concept
**Dino Blokwereld: a free 3D Minecraft style world with Minecraft style dinos.**
The founder did not pick one of the framed concepts. The kid explores, mines and builds freely in a blocky world full of blocky dinos. Every 5 minutes a countdown runs out and the game pauses for a learning break. The PRD may borrow light goals from the concepts above (for example taming or feeding dinos with rewards from the learning break) as long as the core stays an open sandbox.

## Founder answers
* Players: one kid, age 8 to 10, plays alone.
* Language: Dutch for game text and lessons.
* Concept: free 3D Minecraft world with Minecraft style dinos (not one of the five framed concepts).
* Subjects in v1: Math (Rekenen) and Grammar (Taal). Spelling is not a built in subject in v1.
* Parent modules: design for parent made modules from the start. Parents can add their own subjects, lessons and tests.
* Settings: advanced granularity. Parents pick per subject, per topic and per difficulty what gets asked, and tune things like break interval and number of questions.
* Break rules: no skip. The game saves and pauses. The kid can finish early by completing the questions.
* First built in Taal module (founder request): Cito LVS and IEP style taalverzorging for groep 6 and 7. Spelling, werkwoordspelling, hoofdletters, komma, apostrof and leestekens. Each topic has a lesson, practice questions and exams at levels M6, E6, M7 and E7. Content lives in `docs/modules/cito-taalverzorging/`.
