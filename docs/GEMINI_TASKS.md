# Build list for the change of 2026-10-18 (for Gemini)

This file lists the work for the founder's change requests (decisions 50 to 52 in `docs/DECISIONS.md`, PRD sections F16 to F18, AC155 to AC181). Each task is small and has its own tests, so it can be built on its own, in the order below.

Written by the operator on 2026-10-18 after an architect and a qa review of the PRD change.

## Read first

* **The PRD is the spec.** `docs/PRD.md` sections 4.1, 4.2, 4.3, 4.7, 4.20, 4.21 and AC155 to AC181. If this file and the PRD disagree, the PRD wins, then tell the founder.
* **PRD signoff.** The changed PRD is not signed yet (the gate in `.claude/hooks/prd-gate.sh` is closed). The founder must approve the PRD before code lands on `main`.
* **Open founder choice, malus in early breaks.** This file assumes **no malus in early breaks** (like Extra oefenen, F14), because a capped early break could otherwise only lose points. The PRD draft (4.21, AC176) still says the malus applies. The founder picks one; then fix the PRD and task G10.
* **This branch's code is the base.** Gemini's earlier commits `3ba4f39` and `7c52d56` on the `gemi` branch were never merged into the code. Reuse only what this file says. Do not copy the old `dino-store.ts`, `world-save.ts`, `shop-flow.ts`, `shop.ts`, `practice-flow.ts`, `break-flow.ts`, `timer-driver.ts` or `screens.ts` rewrites: they conflict with tested code here and bypass the purchase save hold.
* **Rules from `CLAUDE.md`.** Tests ship with code. `./scripts/check.sh` must pass before a task is done (lint, typecheck, unit tests, build, content check). Run the full `npm test` and `npm run typecheck`, not only the tests of the task. E2e tests run in Playwright WebKit with iPad profiles (`npm run test:e2e`). Never skip a test or weaken an assertion. Docs change in the same commit as behaviour. One commit per task, message like `feat(G4): flying with Omhoog and Omlaag`. Add one line to `docs/FRICTION.md` for every retry or surprise.
* **Target device.** Safari on an iPad in landscape, held by a kid. Touch only. Every button at least 56 px (`--touch-min` in `src/styles/tokens.css`), inside the safe area, and registered with `router.addIgnoreZone` so it never starts a look drag.
* **Kid safety.** Nothing here adds links, network calls, accounts, data collection or money.

## Order and dependencies

| Task | Status | What | Needs | Main files |
|---|---|---|---|---|
| G0 | **DONE** (`775b5dd`) | World 64 high, world save version, faster mesher | | `src/world/terrain.ts`, `src/world/world.ts`, `src/storage/schema.ts`, `src/storage/records.ts`, `src/game/world-save.ts`, `src/render/chunk-mesh.ts` |
| G1 | **DONE** (`b913881`) | 16 new blocks with textures | G0 | `src/world/blocks.ts`, `src/render/atlas.ts`, `src/render/effects.ts`, `src/render/chunk-mesh.ts` |
| G2 | TODO | Alle blokken with a slot chooser | G1 | `src/ui/block-grid.ts`, `src/styles/hotbar.css` |
| G3 | TODO | The obsidiaan gate | G1 | `src/world/terrain.ts`, `src/world/gate.ts` (new), `src/game/build-controller.ts` |
| G4 | TODO | Flying: physics, controller, save | G0 | `src/world/physics.ts`, `src/game/player-controller.ts`, `src/game/world-save.ts`, `src/storage/schema.ts` |
| G5 | TODO | Camera arrows | G4 | `src/game/player-controller.ts` |
| G6 | TODO | Right side HUD buttons and release on every exit | G4, G5 | `src/ui/hud.ts`, `src/styles/hud.css`, `src/game/game.ts` |
| G7 | TODO | Ground spot below a floating player | G4 | `src/game/dino-system.ts`, `src/dinos/dino-ai.ts`, `src/game/game.ts` |
| G8 | TODO | Chickens: data, economy, model | G7 | `src/dinos/kinds.ts`, `src/core/economy.ts`, `src/dinos/dino-store.ts`, `src/render/dino-models.ts`, `src/app/purchase.ts` |
| G9 | TODO | Richer Dinowinkel with Kippenhok and Mijn dino's | G8 | `src/ui/shop.ts`, `src/app/shop-flow.ts`, `src/styles/shop.css` |
| G10 | TODO | Early break points and the shared daily cap | | `src/core/economy.ts`, `src/app/break-flow.ts`, `src/storage/schema.ts`, `src/storage/log-store.ts` |
| G11 | TODO | Nu oefenen button and its question | G10, G9 | `src/ui/countdown.ts`, `src/app/screens.ts`, `src/app/break-flow.ts`, `src/ui/learn/lesboek.ts`, `src/ui/shop.ts` |
| G12 | TODO | Backup and old saves | all above | `src/storage/migrate.ts`, `tests/e2e/` fixtures |
| G13 | TODO | Docs, CHANGELOG and the speed spike note | all above | `README.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/STATUS.md` |

G0 to G3, G10 can start in parallel only if they touch different files. G0 and G3 both touch `terrain.ts`, so G3 waits for G0. G4, G5 and G6 all touch the player controller or the HUD: build them one by one.

## Tasks

### G0. World 64 high, world save version, faster mesher

**Why:** flying needs a higher sky. More height must not make the game slower or break saves.

**Do:**
* Set `WORLD_HEIGHT = 64` in `src/world/terrain.ts`. Keep the ground about as high as now, so the new space is sky. `cellIndex` has y as the outer term, so old diffs still point at the same cells.
* Add `worldVersion`, `size` and `height` to the world save record (`WorldRecord` in `src/storage/schema.ts`). Bump the version now (the gate blocks in G3 change the fixed world too; bump once and land G3 before any real save exists). On load, if any of the three differs from the current one, drop only the world diff and keep everything else (player, hotbar, dinos, points, progress, settings).
* In `src/render/chunk-mesh.ts`, keep a per chunk "highest non air y" and loop only up to it plus 1. Update it when a block is set.
* Use one convention everywhere: "layer 64" in the PRD is y index 63 in code. Write it in `docs/ARCHITECTURE.md`.

**Reuse:** only the constant change from `3ba4f39` (`src/world/terrain.ts`).

**Tests:**
* Unit: `WORLD_HEIGHT` is 64, `CELL_COUNT` is 64 x 64 x 64, and `cellIndex(x, y, z)` gives the same index as before for every y below 32.
* Unit: a world record with an old `worldVersion` loads with an empty diff, and the player record from the same save still loads.
* Unit: a world record with the current version keeps its diff.
* Unit: the mesher output for a test chunk is identical before and after the "highest y" change, also after placing a block at y 60 and mining it again.
* Unit: generated terrain has nothing but air above the old top height (no change to the look of the world).
* Existing tests all pass.

### G1. 16 new blocks with textures (AC157, AC158)

**Do:**
* Add ids 18 to 33 after `OERSTEEN` (17): obsidiaan, vuur, lava, mossteen, zandsteen, graniet, marmer, basalt, diepsteen, vuursteen, goudsteen, diamant, water, ijs, sneeuw, wol oranje. Old ids never change.
* All are solid, placeable and minable. Nothing flows, spreads, burns or hurts. Ijs is not slippery.
* Water, ijs and vuur are "see through" only as cut out holes in the texture (alpha test, like glas and bladeren). No half transparent blending: it would need a second sorted material and costs speed on an older iPad.
* Lava and vuur look glowing: skip the face shading for those ids (always full brightness). Textures do not move or flicker.
* Add each block's flat colour for pop bits and hotbar swatches.

**Reuse nearly as is from `7c52d56`:** the ids and names in `src/world/blocks.ts`, the tile specs in `src/render/atlas.ts`, and `BLOCK_COLORS` in `src/render/effects.ts`. Check the looks: lava and vuur warm orange, water and ijs light blue with holes, no red strobing at the vuur edge. Do **not** take Gemini's `DEFAULT_HOTBAR` change: the default hotbar stays gras, aarde, steen, planken, boomstam, glas, baksteen, wol rood.

**Tests:**
* Unit: `PLACEABLE_BLOCKS` has 32 ids in the PRD 4.1 order, `oersteen` is not in it, `MAX_BLOCK_ID` is 33.
* Unit: every placeable block has a tile in the atlas and a colour in `BLOCK_COLORS`.
* Unit: each new block can be placed and mined with `placeBlock` and `mineBlock` (AC157).
* Unit: physics, the player cannot walk into a cell holding water, lava or vuur (AC157).
* Unit: after placing water, lava and vuur and stepping the game for 60 s of fake time, no other cell changed (AC158).
* Unit: the mesher gives lava and vuur faces full brightness, and two water blocks side by side hide their shared face.
* (iPad) The founder checks the new textures look calm and friendly.

### G2. Alle blokken with a slot chooser (AC155, AC156)

**Do:**
* One screen shows all 32 blocks in the four rows of the PRD 4.1 table (Natuur, Steen, Bouwen, Kleur). No tabs, no scrolling. Each tile at least 64 x 64 points with its Dutch name visible.
* The 8 hotbar slots sit above the grid, with the currently selected slot marked when the grid opens.
* Tap a slot in the grid screen to choose it, then tap a block: that slot gets the block, it becomes the selected slot, and the grid closes. "Terug" changes nothing. The same block may sit in two slots.
* The hotbar is saved once per change.

**Reuse:** Gemini's `src/ui/block-grid.ts` in `7c52d56` as a visual idea only.

**Tests:**
* Unit (jsdom): the grid has 32 tiles in 4 rows and the selected slot is marked on open (AC155).
* Unit: tap slot 5, then diamant: slot 5 holds diamant, slot 5 is selected, the grid is closed, the other 7 slots are unchanged (AC156).
* Unit: "Terug" leaves the hotbar unchanged. A new game has the default 8 blocks.
* Unit: tapping a tile twice fast closes the grid once and writes one hotbar save.
* E2e (WebKit) at 1024 x 768 and 1180 x 820 landscape: no scroll, every tile at least 64 x 64, every name fully visible (longest names: zandsteen, diepsteen, goudsteen, wol oranje).
* E2e: a second finger on another tile while the first is down does nothing extra.

### G3. The obsidiaan gate (AC159 to AC163)

**Do:**
* Fixed spot (yaw 0 looks toward +z, so the kid's right is −x): F1 to F4 are x `MID+1`, `MID`, `MID−1`, `MID−2` at z `MID+4`, at ground height G = the start ground height. Their top is level with the grass. Write these coordinates in `docs/ARCHITECTURE.md`.
* Terrain flattens the rectangle x `MID−3` to `MID+2`, z `MID+3` to `MID+5` to height G, and keeps trees and leaves out of it.
* New pure function in `src/world/gate.ts`: `gateFill(world, isOccupied) => cells[]`. The frame is complete when F1 to F4 are obsidiaan and above F1 and F4 there is an unbroken obsidiaan pillar at least 2 high (from G+1 up). The opening is the cells above F2 and F3, from G+1 up to the height of the lower pillar. If at least one opening cell holds vuur, return every empty opening cell that is not occupied by the player, a dino, a chicken or an egg.
* Call it from the build controller after every place, only when the placed cell is in the gate columns (cheap). Apply the whole fill as one world change: one remesh per touched chunk, one save. Mining never lights anything. A soft whoosh plays once if sound is on.
* A cell skipped because something stood there is filled by a later placement once it is free.

**Do not reuse** Gemini's `tryLightObsidianGate` or its terrain placement: it works anywhere and on both axes, sits at `MID+3`, adds extra flank blocks, checks pillars of exactly 2, lights only 2 cells and has no occupancy check.

**Tests (unit, on `gateFill` and the build controller):**
* A new game has obsidiaan at F1 to F4, flush with the ground, and flat ground around (AC159). After "Wereld opnieuw beginnen" they are back.
* Pillars of 2 on F1 and F4, vuur at G+1 above F2: all 4 opening cells hold vuur (AC160).
* Pillars of 3 and 2: exactly the 4 cells from G+1 to G+2 hold vuur, G+3 stays empty (AC161).
* Vuur first above F2, pillar 2 on F1 and 1 on F4, then the second obsidiaan on F4: the opening fills (AC162).
* Pillar of 1, a missing floor cell, or a pillar of steen: nothing fills (AC162).
* A planken block or the player in an opening cell: that cell is unchanged (AC163). Same with a dino, a chicken or an egg standing there; after it walks away, the next placement fills it.
* Mining a lit vuur block removes only that block, mining never lights (AC163).
* The same frame built elsewhere: nothing fills (AC163).
* Pillars 20 high: the fill is one change with one save call, and it runs under 5 ms in the unit test.

### G4. Flying: physics, controller, save (AC164 to AC169)

**Do:**
* `FLY_SPEED = 4` blocks a second (not the jump speed).
* Physics: when floating, gravity is off. Vertical speed is +FLY_SPEED while Omhoog is held, −FLY_SPEED while Omlaag is held, 0 otherwise or when both are held. Collide up and down; the head never goes above y index 63; the player never ends up inside a block.
* Controller API: `setAscending(on)`, `setDescending(on)`, `isFloating()`. Omhoog at any time (ground, falling, jumping) starts or continues floating. Omlaag only acts while floating. Touching the ground while going down ends floating, then gravity and jumping work again. The jump button does nothing while floating. Building and mining work the same while floating, and mining the block under a floating player keeps them floating.
* `reset()` (Ik zit vast) ends floating and puts the player on the ground at the start spot. If the start spot is built over, use the nearest free standing cell.
* Save: add optional `floating?: boolean` to the player record (missing means false). Add it to the 1 s poll signature in `world-save.ts`, so a change in floating without moving is saved. On restore, clamp the player inside the world; if the saved spot is inside a block, put the player on the ground in that column.

**Reuse with changes from `7c52d56`:** the floating branch in `src/world/physics.ts` (use FLY_SPEED, add tests for the snap under a ceiling and the world top), and the `setAscending`, `setDescending`, `isFloating` parts of `src/game/player-controller.ts`. Drop the `ascend()` impulse and the "Omlaag starts floating mid fall" behaviour.

**Tests (unit, fake clock):**
* Hold Omhoog 1 s from the ground, let go: 3 to 5 blocks higher, still there after 5 s (AC164).
* Floating plus stick: moves at the same height, stops at a wall. Hold Omlaag: sinks, stops on the first block below, floating ends, a jump works again (AC165).
* Floating under a block: the head stops under it. Near the top: the head never passes y index 63. 1000 random fly and walk steps never end inside a block (AC166).
* Floating plus jump: nothing. On the ground plus Omlaag: nothing. Both held: no vertical move (AC167).
* Mining the block under a floating player: still floating. Placing above y index 63: nothing placed (AC168).
* Save and restore while floating: same spot, still floating. Ik zit vast while floating: on the ground at the start, not floating. Start spot built over: nearest free standing cell (AC169).
* A saved floating spot that is now inside a block (fixture): restored on the ground in that column.
* An old player record without `floating`: loads as not floating.

### G5. Camera arrows (AC171, AC172)

**Do:**
* Controller API: `setLookInput(turnX, tiltY)` for held arrows (each −1, 0 or +1) and `tapLook(turnX, tiltY)` for a short press.
* A press shorter than 200 ms is a tap: the view turns exactly 15 degrees, eased over about 250 ms (never in one frame). A longer press is a hold: it turns at 90 degrees a second with a 250 ms ease in, and a 250 ms ease out after release (total extra turn after release between 5 and 25 degrees). Tap and hold never add up for the same press.
* Up and down stop at the same pitch limit as drag look (`MAX_PITCH`). Drag look still works the same.
* The easing must use the frame time, so the result is the same at 30 and 60 fps.

**Reuse with changes:** the easing idea (`LOOK_EASE_RATE`, `setLookInput`) from `player-controller.ts` in `3ba4f39` and `7c52d56`. Replace `nudgeLook` with the tap rule above.

**Tests (unit, fake clock):**
* One tap left: yaw changes by 15 degrees (14 to 16), and after the first frame it has changed by less than 15 (AC171).
* Hold right 2 s: 160 to 200 degrees, and it keeps turning a little after release, then stops (AC171).
* The same hold at 30 fps and at 60 fps gives results within 2 degrees of each other.
* Hold up 5 s: pitch equals `MAX_PITCH`. Hold down 5 s: pitch equals `−MAX_PITCH` (AC172).
* Left and right held together: no turn. Up and left together: both apply.
* Stick plus arrow at the same time: walks and turns (AC172).

### G6. Right side HUD buttons and release on every exit (AC143, AC172)

**Do:**
* Buttons: Omhoog and Omlaag in a small column just left of the jump button (Omhoog on top). The four camera arrows in a plus shaped cluster above the jump and fly buttons, below the lock icon, between the jump button and the mode buttons. All at least 56 px, inside the safe area, not overlapping the hotbar, the countdown or each other. Write the positions in `docs/ARCHITECTURE.md`.
* Every new button is an ignore zone (`router.addIgnoreZone`): a touch that starts on it and drags never turns the view and never mines or places.
* Every held control (Omhoog, Omlaag, 4 arrows) releases on `pointerup`, `pointercancel`, `lostpointercapture`, window `blur`, `visibilitychange` to hidden, an orientation change, and whenever any screen opens on top of the world (pause, shop, break, gate). Use pointer capture on press. iOS sends `pointercancel` on system gestures: a stuck Omhoog flies the kid to the top.
* Keyboard arrow keys are a desktop testing aid only, not required.

**Reuse:** the button markup ideas in `src/ui/hud.ts` from `3ba4f39` and `7c52d56`. Do **not** add the labelled "Ouders" button: the PRD keeps the small grey lock icon (T48b).

**Tests:**
* Unit (jsdom): for each held button and each release path above, pressing then firing that event calls the matching `set...(false)` once.
* Unit: opening a screen on top (fake `screens` push) releases all held controls.
* E2e (WebKit) layout check at 1024 x 768, 1180 x 820 and 1366 x 1024 landscape: every HUD button is at least 44 x 44, inside the safe area, and no two button boxes overlap; the bottom row is at least 20 px above the bottom edge plus the safe area.
* E2e: a touch starting on each new button and dragging 100 px does not change the view (except the arrow's own turn) and does not mine or place (AC172).
* E2e: hold the stick with one finger and an arrow with another: the player walks and turns.
* (iPad) The founder checks flying and the arrows feel good and nothing gets stuck.

### G7. Ground spot below a floating player (AC170)

**Do:**
* One helper, for example `groundSpotBelow(world, x, z)`, that scans down the player's column to the first standing spot, then uses the existing "free spot next to the player" logic from there. If those cells are blocked, take the nearest free standing cell within 3 blocks.
* Use it for a bought egg, a golden egg, a chicken, and a following dino that pops back.
* The follow distance in `src/dinos/dino-ai.ts` is flat (x and z only), so a floating player does not make every dino pop back.

**Tests (unit):**
* Player floating 10 blocks up: a new egg, a golden egg and a chicken stand on the ground near the column under the player, never in the air (AC170).
* A following dino more than 8 blocks away for 5 s pops to the ground below the player, not into the air.
* A dino 3 blocks away flat while the player floats 10 up does not pop back.
* Neighbour cells blocked: the spot is the nearest free standing cell within 3 blocks.

### G8. Chickens: data, economy, model (AC177, AC178, F18)

**Do:**
* Store chickens as entries with kind `'kip'` in the same dinos record, so the purchase transaction, backup, Ik zit vast, Wereld opnieuw beginnen, the AI, the renderer and the dino menu work unchanged.
* Split the types: `CreatureKindId` (5 kinds, includes kip) and `EggKindId` (the 4 dinos). An egg of kind kip or a golden kip must be a type error.
* In `src/core/economy.ts`: `CHICKEN_PRICE = 5`, `CHICKEN_CAP = 10`, `chickenCount()`, and `purchaseChicken()` next to `purchaseEgg()`. `shopDinoCount` leaves kip out, so chickens never count toward the 12 dinos, and dinos never block chickens.
* Buying a chicken follows the egg purchase pattern of decision 48: inside `saveQueue.hold`, add the chicken in memory, commit economy, dinos and ledger in one transaction, remove the chicken again if the commit fails. A lock stops double taps.
* A chicken appears next to the player right away (no egg), on Volg mij, with the same menu as dinos (Volg mij, Blijf hier, Naam geven, Knuffel). About half a block high. Its tap area on screen is at least 44 pt.

**Reuse:** the kip palette and box spec in `src/render/dino-models.ts` from `7c52d56` (check the height), and the idea of filtering kip out of `shopDinoCount`. Do **not** put kip with price 0 into the dino kind list as Gemini did.

**Tests:**
* Unit: 9 points, 0 chickens, 5 fast "Ja" taps: exactly one chicken, total 4, one ledger line of −5 (AC177).
* Unit: 9 chickens and 15 points, 3 fast taps: exactly one more (the 10th), total 10, then the buy is blocked as full (AC178).
* Unit: 12 shop dinos, a chicken can still be bought. 10 chickens, an egg can still be bought. 4 points: blocked with "Nog 1 punt nodig" (AC178).
* Unit: commit fails: no chicken, points unchanged.
* Unit: kill right after "Ja" (simulated), reopen: the chicken is there and the points are taken once (AC177).
* Typecheck: `addEgg('kip')` does not compile (a `// @ts-expect-error` test).
* Unit: the chicken model builds with the kip palette and is between 0.4 and 0.8 blocks high.

### G9. Richer Dinowinkel with Kippenhok and Mijn dino's (AC179, AC180, AC20, AC110, AC149, AC150)

**Do:**
* Two tabs: **Winkel** and **Mijn dino's**.
* Winkel shows five cards: the four eggs and the Kippenhok. Each egg card: picture, name, trait line (PRD 4.3), size chip ("klein", "middel", "groot"), price. An egg the kid cannot afford shows "Nog X punten nodig" (or "Nog 1 punt nodig") and a progress bar with `role="progressbar"`, `aria-valuenow` and `aria-valuemax`, plus a visible text like "30 van 40", so colour is never the only cue.
* Kippenhok card: chicken picture, "Tok tok! Kippen scharrelen gezellig rond.", "5 punten", the count "4 van de 10", a "Kip kopen" button with the same Ja and Nee question. Full: greyed with "Het kippenhok is vol!".
* Mijn dino's: eggs still hatching ("Ei: " plus the kind), hatched dinos by name (or kind if unnamed), golden ones with a gold mark, and "Kippen: X van de 10". Only shows things, tapping does nothing.
* A "Nu oefenen" button goes on this screen in G11.
* Keep everything the current shop does: AC20, AC110, AC149, AC150 must still pass.

**Reuse:** Gemini's `src/ui/shop.ts` and `src/styles/shop.css` in `7c52d56` as a visual reference only. Build on this branch's `src/ui/shop.ts` and `src/app/shop-flow.ts`.

**Tests:**
* Unit (jsdom): each egg card shows its trait line and size chip (AC179).
* Unit: 30 points, Triceratops shows "Nog 10 punten nodig" with `aria-valuenow=30`, `aria-valuemax=40`; Brachiosaurus `30` of `80` (AC179).
* Unit: Mijn dino's with one egg, Compy "Pip", an unnamed Stegosaurus, a golden Triceratops and 4 chickens lists exactly those and "Kippen: 4 van de 10"; a tap changes nothing (AC180).
* Existing shop unit and e2e tests still pass (AC20, AC110, AC149, AC150).
* E2e at 1024 x 768: both tabs fit without cutting text; every button at least 56 px.

### G10. Early break points and the shared daily cap (F17, AC175, AC176)

**Do:**
* Add a session mode `'early'` to the points logic (`applyPoints` in `src/core/economy.ts`). Plus points (+2, +1 and the +3 bonus) are capped by the shared 10 per day extra cap, using the existing `practicePointsToday` and `practiceDay` fields (no new schema field). A plus that does not fully fit gives only the part that fits.
* **Malus (founder to confirm):** default in this file, no malus in early breaks, like Extra oefenen (F14). If the founder chooses "malus applies", then a teach moment takes 1 point (never below 0) and the malus never changes the cap count.
* The cap day is the day the break started, for the whole break, so a break over midnight is defined. Setting the device clock back never resets the cap of a day that is already counted.
* Add `early: boolean` to the saved break session (missing means false), so a resumed break stays early, and to the break log record, so Resultaten Pauzes can show "zelf gestart".
* A normal timed break is never capped and keeps its full points (4.5).

**Tests (unit):**
* 0 used, an early break of N questions (N from the setting, test N = 5) all right first try: +10 total, the bonus does not fit, the cap shows reached (AC175).
* 9 used, a right first try: +1 (AC175).
* 8 used, last question right plus the +3 bonus: total +2 only, cap at 10.
* Cap reached, another early break: right answers give 0, the cap stays 10 (AC176). Teach moment: no change (default) or −1 never below 0 (if the founder picks the malus).
* Next calendar day: the cap starts at 0 again (AC176).
* A break started at 23:59 and finished at 00:02 counts on the first day.
* Clock set back one day after using 10: the cap does not reset for that day.
* A normal timed break with the cap reached gives its full points (AC176).
* Extra oefenen and early breaks share one cap: 6 from Extra oefenen, then an early break can give at most 4.
* A saved early break resumes as early; an old saved break without the flag resumes as normal.

### G11. Nu oefenen button and its question (AC173, AC174)

**Do:**
* A "Nu oefenen" button on the countdown pill, in the Dinowinkel and in the Lesboek. At least 56 px. The pill button is an ignore zone.
* Not shown during a break, an exam (with its end screen and review), Extra oefenen, the parent gate or the parent area.
* Tapping it opens a question screen "Nu een leerpauze doen?" with "Ja" and "Nee", set apart, "Nee" the calm default. This is a screen kind in `src/app/screens.ts` that the timer driver treats as paused. If the countdown would reach 0 while the question is open, nothing happens until it closes.
* "Ja" starts `breakFlow.start({ early: true })`. Starting from the Dinowinkel or the Lesboek first closes the pause menu stack, so after the summary "Terug naar de wereld" lands in the world. The countdown restarts from the full interval (the existing end path already calls `restartTimer()`).
* A double tap on "Ja" starts one break and writes one break log line.
* If no question is available (nothing switched on), show "Er is nu niets te oefenen" instead of an empty break.
* If a timed break is already due or being resumed, the button does nothing extra (no second break).

**Reuse:** the idea of the pill button in Gemini's `src/ui/countdown.ts` from `7c52d56`. Build on this branch's `countdown.ts`, `screens.ts` and `break-flow.ts`.

**Tests:**
* Unit (jsdom): the button shows in the world, Dinowinkel and Lesboek, and not in a break, exam, Extra oefenen, the gate or the parent area (AC173).
* Unit: "Nee" changes nothing and the play timer did not count down while the question was open (AC173).
* Unit: countdown at 0:01, open the question, advance 10 s of fake time: no break starts until "Nee"; after "Nee" the timed break starts.
* Unit: double tap "Ja": one break, one log line.
* E2e (WebKit): 3:12 left, open the Dinowinkel, "Nu oefenen", "Ja": a break of the next module starts; after the summary the kid is in the world and the countdown shows 5:00 (10:00 if the setting is 10 minutes); the break log is marked early (AC174).
* E2e: kill the page between "Ja" and the first question, reopen: one early break resumes, not two.
* Unit: nothing switched on: "Er is nu niets te oefenen", no break starts.

### G12. Backup and old saves (AC181)

**Do:**
* Backup and restore carry chickens, the floating flag and the extra points used today.
* Add a test fixture: a save from before this change (no `worldVersion`, no `floating`, no `early`). Opening it keeps dinos, eggs, points, hotbar, settings and learning progress; the world diff is dropped because the version differs (G0).
* "Wereld opnieuw beginnen" removes placed vuur and brings back the 4 gate blocks; dinos, chickens and points stay.

**Tests:**
* Unit: backup with chickens, a floating player and 6 extra points used, restore: all three are back (AC181).
* Unit: the old fixture loads with everything above, and the world is the fresh fixed world (AC181).
* Unit: a backup with a lit gate restores the lit gate.
* E2e: Wereld opnieuw beginnen after lighting the gate: the 4 obsidiaan blocks are back, no vuur, chickens still there.

### G13. Docs, CHANGELOG and the speed spike note

**Do:**
* `CHANGELOG.md`: kid readable lines for each feature (blocks, gate, flying, arrows, Nu oefenen, chickens, shop).
* `docs/ARCHITECTURE.md`: layer convention, gate coordinates, HUD positions, alpha test rule, chickens in the dinos record, early mode.
* `docs/PLAN.md` and `docs/STATUS.md`: mark G0 to G12 done with their test results.
* T32 speed spike (founder on the iPad, needs a founder approved test deploy): now with the 64 high world and all 32 blocks, plus a new scene: float at the top looking down for 20 s with 12 dinos, 2 golden dinos and 10 chickens, and a lit gate with tall pillars. Same pass rule (95 percent of frames at 33 ms or less, none over 200 ms).

**Tests:** `./scripts/check.sh` passes. The docs mention no feature that the code does not have.

## Done means

* Every task above is committed with its tests, and `./scripts/check.sh` passes on the final commit.
* E2e (`npm run test:e2e`) passes in WebKit in CI.
* The founder has signed the changed PRD, picked the malus rule, and played it on the iPad.
