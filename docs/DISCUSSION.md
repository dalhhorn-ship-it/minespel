# Agent discussion

Review rounds between agents. Newest at the bottom. Keep it short: who said what, what changed.

Rounds before v11 are in `docs/archive/DISCUSSION-to-v10.md`.

## v11 Dorp: architect feasibility review (2026-10-24)

Input: decision 94. Read: ARCHITECTURE, PRD 4.0 to 4.7, 9, 10 and 12, `terrain.ts`, `world.ts`, `world-save.ts`, `dino-system.ts`, `dino-ai.ts`, `blocks.ts`, `atlas.ts`, `selection.ts`, `break-flow.ts`, `practice-flow.ts`, `timers.ts`, `boot.ts`. Verdict: feasible in 5 tasks without the bigger world. The riskiest part is putting houses into worlds that kids already changed.

### 1. Houses without breaking saves

A save is a list of `cellIndex * 256 + blockId` for every cell that differs from `generateTerrain(WORLD_SEED)`. If the generator changes, every cell the kid did not touch silently follows the new terrain, and every cell the kid did touch keeps its old value. A kid who dug a hole where a house now stands gets a house with a hole. A kid who built a castle there gets house walls grown into it.

Options:
* **A. Just change the generator.** Simple, but it damages kid builds as above. Also, any new `rng` call before the trees shifts every hill and tree in the world. Rejected.
* **B. Houses as meshes, not blocks** (like dinos). No save impact, but the player walks through walls, houses cannot be mined or built on, and it does not feel like the block world. Rejected.
* **C. Versioned terrain plus a one time, careful stamp (pick).**
  * `src/world/village-layout.ts`: 3 fixed village sites (hand placed coordinates, away from the start area and the obsidiaan gate), each 2 or 3 small houses from hand written templates using existing blocks only (planken, boomstam, glas, baksteen, wol). No random numbers, so the v1 terrain stream is untouched. Each site also lists its villager home spots.
  * `generateTerrain(seed, version)`: version 1 is today's world, byte for byte. Version 2 is version 1 plus the stamp (flatten a pad, fill under it with aarde, clear trees whose trunk is in the site plus 2, place the houses).
  * The world record gets `terrainVersion`. Missing means 1.
  * A new game and "Wereld opnieuw beginnen" use version 2.
  * Loading a version 1 save, once: rebuild the kid's real world (v1 terrain plus the old diff). For each site, if the old diff has **any** cell inside the site rectangle plus 2 blocks, at any height, skip that site: the kid's land stays exactly as it was. Otherwise stamp the houses. Then store the new diff against the v2 terrain with `terrainVersion: 2`. A skipped site costs a few hundred extra diff entries (about 1 to 2 KB). No cell the kid ever changed is touched.
  * Keep the old world record as `worldV1` in `kv` for one release, so the founder can undo the stamp if a kid is upset. Drop it in the release after.
  * Villagers of a skipped site still come and stand on the ground there.
  * Cost: one extra terrain build at the first load after the update, well under the 3 s `bootSave` timeout.

### 2. Villagers

Reuse the dino movement, not the dino store. `DinoKindId`, the store, the shop, the 12 dino cap, the egg hint and the dino menu all assume a dino, so a "villager" dino kind would leak into all of them.
* New `src/villagers/`: a villager is a `DinoState` shaped object in `stay` mode around its home spot, stepped with `dino-ai.ts` (wander within 3 blocks, hop one block, never inside a block, no collision with the player). The only change in `dino-ai.ts` is that the box size can come from the caller instead of `DINO_KINDS`.
* New `src/game/villager-system.ts` beside the dino system: steps villagers, checks the distance to the player, adds villagers to `isOccupied` so no block is placed inside one, and plays a dance (a hop and spin on the model, no physics).
* New `src/render/villager-models.ts`: blocky people built like `dino-models.ts` (merged boxes, one mesh per colour, cached materials), with a different shirt colour per villager.
* Villager positions are not saved. They start at home after every load. Only what was found and the cooldown are saved (see 4).
* **How many: 8**, one per rare block. Each adds about 4 to 5 draw calls, so about 40 more on top of up to 12 dinos and 10 chickens. Villagers farther than 24 blocks are not stepped. The game already runs dinos the same way, so the risk is small, but it must be measured: the T32 speed spike has no go or no go row in DECISIONS, so nobody has a real number for the old iPad yet. Fallback if slow: villagers stand still and only turn to the player.

### 3. The question

**A small card, not the break screen.** The break screen carries Dino Juf, the dots, points banners, the bonus and the summary, and its session code saves and resumes a break. Bending it to one question with no points risks breaking breaks. Instead, `src/ui/village-card.ts` reuses the question views (`choice-view`, `number-view`, `find-error-view`, `kid-keyboard`, `number-pad`) and `answer-check.ts` inside a lighter card with the villager's face. Typed items need the keyboard, so the card is large, but the world stays visible behind it.

Flow I propose (product decides the words):
* Coming within about 3 blocks makes the villager turn and wave, and a big speech bubble button ("Hoi! Wil je een vraag?") shows in the HUD layer. It is a DOM button, so it never steals the finger on the stick. The kid taps it to get the question, or walks on: farther than 6 blocks hides the bubble. A card that pops up by itself would steal the stick and interrupt play.
* Two tries like a break. Right gives the dance or "Respect bruuuuu!" and the block. Wrong twice shows the right answer and the `explain` text (no lesson page), the villager stays friendly, no block this time.
* **Selection:** `selectBreakItems` with `count: 1`, `newLessonsEnabled: false` and `shuffleOrder: false`, so only seen items come (box 1 to 5) and never an item whose lesson the kid has not had. The module is picked by the Vakverdeling weights, but the rotation state is **not** saved, so breaks keep their turn order. If no seen item exists, the villager just says "Hoi!" and there is no question.
* **Not a break.** It does not reset or move the countdown, gives no bonus, writes no break record, and gives **no points and no minus**, so the Punten setting (decision 92) does not apply. This follows decision 94 (the reward is the dance and the block). It also stops point farming from walking around villages.
* **Boxes:** I recommend the first try moves the box like Extra oefenen does (4.6), and the answer goes into the answer log with a source "dorp". This is a product or founder call (see below).
* **Timers:** the open card is a `kid-overlay` screen, so the play timer stops like in the dino menu. No bubble shows in the last 30 seconds before a break, and an open bubble hides when the break starts, so a question never collides with a break.
* **Exam, pause, parent, ready gate:** the villager system only runs while the world is on screen and the game is not paused, so nothing happens during an exam, the pause menu, the shop or the parent area. Bubbles only show after the app is ready (`boot.ts`), because the found list and the cooldown must be loaded first.
* **Cooldown:** one global cooldown of 3 minutes of play time (counts only while the play timer runs), and never the same villager twice in a row. It starts when the card opens and is saved right then, so closing the app cannot reset it. A villager whose block was found still asks, still dances, gives no second block.

### 4. Rare blocks

* **8 new ids, 34 to 41**, appended to `blocks.ts` (ids are never renumbered). Placeable and minable like other blocks. 8 new procedural tiles in `atlas.ts` (38 tiles, the atlas grows from 4 to 5 rows, a few KB). `MAX_BLOCK_ID` moves to 41. Names are product's call (for example smaragd, robijn, saffier, amethist, kristal, lichtsteen, regenboog, sterrensteen).
* **Saved:** a new `village` record in `kv`: `{ found: number[], cooldownMs: number, lastVillager: string | null }`. A new `kv` key needs no `SCHEMA_VERSION` bump, only a default. The v3 backup must include it later.
* **Once found, free and unlimited** like every other block (4.1). On the reward card a "In mijn hotbar" button puts it in the selected slot. Hotbar restore already accepts any placeable id.
* **Not yet found:** Alle blokken gets a "Dorp" tab with 8 tiles. A found block is normal. A missing one is a dark tile with a big "?" and a small hint ("Een dorpeling heeft deze"). It cannot be picked. A counter shows "3 van de 8 gevonden".
* "Wereld opnieuw beginnen" keeps the found blocks, like dinos (4.3: earned things are never taken away). A block a kid placed in the world is lost with the world, as now.

### 5. The bigger world

Cost per step up (today 64 x 64 x 64):

| Size | Block memory (world plus start copy) | Chunks to mesh | `diff()` per save |
|---|---|---|---|
| 64 | 0.5 MB | 16 | 0.26 M cells |
| 128 | 2 MB | 64 | 1 M cells |
| 256 | 8 MB | 256 | 4 M cells, 10 to 20 ms on an old iPad |

* Meshing every chunk at boot and drawing them all does not scale past 128. A bigger world needs view distance culling and meshing near the player only.
* `diff()` scans the whole world on every save. Past 128 it needs a running list of changed cells.
* `cellIndex` depends on `WORLD_SIZE`, so every saved diff and the player spot must be moved into the new coordinates. The old 64 x 64 world would sit in the middle so kid builds stay. Up to 256 still fits the `cellIndex * 256` encoding in 32 bits, 512 does not.
* Save size only grows with what the kid changes, so that part is fine.

**Yes, its own release**, starting with a speed spike at 128 x 128 on the founder's oldest iPad with `?fps=1`. Villages in v11 use a layout module with site coordinates, so they can move into a bigger world later.

### 6. Cut for v11 (5 tasks)

| Id | Title | Depends | Group | Files |
|---|---|---|---|---|
| V11a | Rare blocks: 8 ids, tiles, Dorp tab with locked "?" tiles | none | 1 | `src/world/blocks.ts`, `src/render/atlas.ts`, `src/ui/block-grid.ts`, `src/styles/hotbar.css` |
| V11b | Villages in the terrain: layout, terrain version 2, one time stamp for old saves, `worldV1` copy | none | 1 | `src/world/village-layout.ts`, `src/world/terrain.ts`, `src/world/world.ts`, `src/game/world-save.ts`, `src/storage/schema.ts` |
| V11c | Villagers: models, wandering at home, proximity, dance, `isOccupied` | V11b | 2 | `src/villagers/`, `src/dinos/dino-ai.ts`, `src/game/villager-system.ts`, `src/render/villager-models.ts`, `src/render/renderer.ts`, `src/game/game.ts` |
| V11d | Village question: bubble, card, selection, two tries, reward, found list, cooldown, `village` record, e2e hooks | V11a, V11c | 3 | `src/app/village-flow.ts`, `src/ui/village-card.ts`, `src/ui/village-bubble.ts`, `src/styles/village.css`, `src/storage/schema.ts`, `src/main.ts`, `src/dev/e2e-hooks.ts` |
| V11e | E2e on iPad profiles, version 0.5.0, CHANGELOG, fps check with 8 villagers, 12 dinos and 10 chickens on the real iPad | V11d | 4 | `package.json`, `CHANGELOG.md` |

V11a and V11b touch different files and run in parallel. `schema.ts` is in V11b and V11d, which never run at the same time.

### Needs a founder or product decision

1. **Stamping villages into existing worlds (hard to undo).** Pick: stamp only where the kid changed nothing, skip the other sites, keep `worldV1` for one release. Other options: villages only in a new world (old saves never get them unless the parent picks "Wereld opnieuw beginnen"), or stamp everywhere and overwrite kid builds (not advised).
2. **Do villager answers move the learning boxes?** Pick: yes, first try only, like Extra oefenen. Other option: no, the questions are for fun only.
3. **Bubble or popup.** Pick: a bubble the kid taps, walking on hides it. Other option: the card opens by itself when close (interrupts play).
4. **Cooldown length.** Pick: 3 minutes of play time, shared by all villagers.
5. **Found blocks survive "Wereld opnieuw beginnen".** Pick: yes.

Kid safety: no new personal data (only 8 found flags and a cooldown), no network, no links, no points or money. Villagers never chase, block or hurt the kid. The text "Respect bruuuuu!" is fine. No paid services or accounts. The bigger world is out of v11.


## MONSTERS_PRD review round 1 (2026-11-15)

### qa

Scope: testability and kid safety and feel, for `docs/MONSTERS_PRD.md`. Most serious first.

1. **Q1. The bubble pushes a kid without coins to buy (4.3 In 8, 4.5, MOQ5, MOQ6, MO18-7).** The bubble comes by itself, so "opt in by the kid" (1.3) is only half true: the kid picks to tap it, not to meet it. A kid with 0 coins gets a mess and a toast that points to the shop. Also 3.6 says "No text says the kid needs a knight", and the hint says exactly that. Suggest: the bubble clock only runs once the kid owns a knight (or has at least 30 coins), or the first bubble waits for that. Drop the shop pointer from the hint (MOQ6 C) or word it as "Klodder is moe, hij gaat zo weg." Add a criterion: with 0 coins and 0 knights no bubble comes (or no hint text names the shop). Fix the 3.6 contradiction.
2. **Q2. "Everything comes back" is not complete or fully testable (4.3 In 7, 1.5, MO18-5, MO18-9).** Gaps to close with criteria: (a) a block restores into a cell where the kid or an animal now stands (kid stuck in a block); suggest skip and retry, or push it to the next free moment. (b) The broken list must be saved at the moment of each break, not on exit, so a Safari kill or crash cannot lose it; test with a hard page kill, not only a reload. (c) Klodder's breaks go into the world diff, so restore must delete the diff entry, not write the old block as a kid change; test that the diff is byte equal before and after a visit. (d) "Wereld opnieuw beginnen", a backup made while the list is non empty, and a restore of it. (e) 3 seconds in MO18-5 against "about 2 seconds" in 4.7: pick one number. (f) The kid mines or builds a cell Klodder broke: MO18-5 only says "built in", say "mined, built or changed".
3. **Q3. Klodder can still wreck what the kid built (4.3 In 4, MO18-4).** "Not in the diff" protects only placed cells. A kid who dug a house into a natural hill, or loves a village tree, loses the walls and trees around it. Suggest an exclusion zone of 3 blocks around every diff cell, plus a rule never to break leaves of a tree the kid touched. Make MO18-4 check the zone on a seeded world with a kid built hut.
4. **Q4. The mole can block or crowd the kid (1.3, 2.3 In 3, MO16-9).** 1.3 says it never traps or blocks the kid, but the criterion only covers pushing and entering the kid's cell. The mole pops up "near my hole", which may be the exit of a deep hole, and a mole 4 blocks away in view is the closest thing to a scare. Add: spawn is never on or next to the exit cell of the dig, never closer than 4 blocks to the kid, and a test that a kid in a 1 wide shaft can always climb out with the mole present. Also say what the mole does in a village (walk through, avoid) and give it a criterion.
5. **Q5. "Animals run away and cannot be found again" is not fully covered (1.3, 2.3 In 5, MO16-6).** MO16-6 checks water, lava and the world edge only. Add: never into a hole deeper than 1 block (stated in 1.3, not tested), never into a sealed cell, and 10 seconds after any tease every animal stands within 3 blocks of its spot or behind the kid, on a seeded map that has a pen, a cliff and a pond. A Blijf hier animal whose spot got walled in needs a rule (stay put). Run the 50 teases on that map, not on flat ground. Also check the Dinofluit still calls a teased animal.
6. **Q6. "Silly, not scary" has no checkable criterion (1.3, 2.5, 2.3 In 10).** Only MO16-13 checks words, and nothing checks looks or sound. Make it checkable: (a) a word list of banned text (bang, dood, pijn, eng, boos, bloed and so on) tested on every monster, knight and toast string; (b) a sound list with a cap per file (length under 1.5 s, peak level at or below the existing sound effects, no file named growl, scream, roar); (c) a test that no monster appears without a 3 second warning, for mole and bubble, with the exact hook timestamps; (d) a founder listening and looking check on the real iPad, listed in the criteria like MO16-14; (e) a test that it all works with sound off and with reduced motion (MO16-2 says a text only warning, but there is no criterion).
7. **Q7. The interrupt matrix is thin (1.3 "Paused with the world", MO16-10, MO18-1).** Covered: break, shop, dino menu, parent area. Missing: exam, background, portrait, and a reload during the 3 second rumble, during a break, and while Klodder is out. Also: what happens to a bubble that is live when a break starts (its 60 second timer must stop), and a break that becomes due while Klodder is out (the kid returns to the same mess). Add one table driven test over all timer states in `timerMatrix` for mole, bubble and Klodder.
8. **Q8. Timing rules need hooks, and the criteria need them named (MO16-3, 7, 8, MO17-6, MO18-1, 2, 6, 9).** Add to `src/dev/e2e-hooks.ts`: advance play time by N ms without waiting (and only while the timer is running), read the bubble clock, force the break due time, a seeded random for spawn spots and picks, and read the monster state and the Moed bar. Write the logic against an injected clock so unit tests need no real wait. Say in the doc that the 10 minute, 5 minute, 60 second and 10 second rules are tested this way, with a tolerance (plus or minus 1 second).
9. **Q9. Parent control is on or off only, with no view and a risky default for the bubble (1.4, MOQ1).** The parent sees no hint of what the monsters did. Suggest one plain line under each row saying what it does ("Elke 10 minuten komt een bubbel; een ridder stopt hem"), tested as strings. Defaults: the mole needs two warnings and a dig, so on is fine; the bubble arrives by itself and breaks blocks, so for existing installs it should be off until the parent turns it on (see my MOQ1 note). Add a criterion for the exact default per row for a new install, an existing install and a restored old backup (MO16-12 says "defaults of MOQ1" without a value to assert).
10. **Q10. "In" items with no criterion.** v16: sounds under Volume and Geluidseffecten, the mole's step up 1 block and no jump 2, version bump and CHANGELOG line, the toast not covering Hakken, 56 px buttons. v17: "Volg mij" knight guards followers, notice range 8 and 16 (only 16 tested), Allemaal blijven and Dinofluit (only in MO17-9), "Je hebt al 3 ridders" is tested but not the mode menu 56 px. v18: after 20 broken blocks he only teases, the bubble drifts 6 to 10 blocks at eye height, bubble at least 80 px, the 2 second spread of restores. v19: "Nog X punten nodig" greyed card, wear and take off by tap, the Banier and Koningsbanier range, Kietelveer and Bubbelstaf effects, MO19-3 only tests one item. v20: "N van de 8 gekocht", the "?" text, Diep tab lock text, stones found with the mole off. Add one criterion each.
11. **Q11. Vague or unmeasurable wording.** "about 1 block per second", "about 6 blocks", "about 3 seconds", "about half the time" (MO16-5, MO17-6), "slowly", "silly". Give a tolerance (for example 20 percent, measured over 5 seconds, or 6 plus or minus 1 blocks). MO19-5 "screenshot check" cannot fail automatically: assert one attached mesh part per slot and that the part count stays at or under 8 boxes. MO16-7 "within 14 seconds" should say 10 seconds of no path plus up to 2 seconds of check plus the speech time.
12. **Q12. Gear makes the knight win instantly, and costs pass the coin ceiling (5.3, 5.5, MO19-4).** A best gear knight has Kracht 22, so the mole goes in under 1 second: the fun encounter disappears and 520 coins is a long pressure goal for a kid whose friends have it. The doc admits the 60 coin ceiling is broken. Suggest a Kracht cap (for example 8) or a minimum fight time of 3 seconds so a fight is always seen, and a test for it. If kept, the founder should confirm the six items over 60 coins knowingly (MOQ9).
