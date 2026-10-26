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
