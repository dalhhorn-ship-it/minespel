# Product doc: Monsters and knights (v17 Ridders, v18 Zwarte bubbel, v16 Monstermol, v19 Ridderuitrusting, v20 Diepe edelstenen, v21 Meer uitrusting)

**Status:** DRAFT, revised after review round 1 (2026-11-15). Not signed. The founder approved the direction (decision 130). Each release moves into docs/PRD.md section 12 and is signed there when it comes up at /release.

**Companion to:** `docs/PRD.md` (the signed core), `docs/SHOP_PRD.md` (the Dinowinkel) and `docs/GAME_LOOP_PRD.md` (coins and balance). Backlog entries: `docs/BACKLOG.md`, sections v16 to v21. Review and answers: `docs/DISCUSSION.md`, "MONSTERS_PRD review round 1".

**Audience:** one kid of 8 to 10 (groep 5 to 7), Dutch, Safari on the family iPad, landscape.

**Criteria ids:** draft ids per release (MO17-1, MO18-1, ...). They get real AC numbers only when a release is scoped into PRD section 12, so they never clash with v3, v15 and v6.

**Scoped (2026-11-15):** v17 and v18 are scoped together into `docs/PRD.md` section 12 as one release, 0.7.0, on one signoff (decision 134). The PRD text wins. Mapping: MO17-1 and MO17-3 to AC200, MO17-2 to AC201, MO17-10 to AC202, MO17-4 to AC203, MO17-5 and MO17-6 to AC204, MO17-7 to AC205, MO17-8 to AC206, MO17-9 and part of MO17-11 to AC207, MO17-11 and MO17-12 to AC208, MO17-13 to AC209, MO17-16 to AC210; MO18-1 and MO18-2 to AC211, MO18-3 to AC212, MO18-4 to AC213, MO18-5 to AC214, MO18-6 to AC215, MO18-7 to AC216, MO18-8 to AC217, MO18-9 to AC218, MO18-10 to AC219, MO18-11 to AC220, MO18-12 to AC221, MO18-13 to AC222, MO18-14 to AC223, MO18-15 to AC224, MO18-16 to AC225, MO18-18 to AC226, MO18-19 to AC227; MO17-14 and MO18-17 to AC228; MO17-15 and the version part of MO18-18 to AC229. Sections 2 and 3 below stay as the draft.

**Scoped (2026-11-15, with v15):** v16 is scoped into `docs/PRD.md` section 12 as 0.9.0, after v15 Grote wereld (0.8.0), on the same signoff as v17 and v18. The PRD text wins. Mapping: MO16-1 to AC244, MO16-2 to AC245, MO16-3 to AC246, MO16-5 to AC247, MO16-6 to AC248, MO16-7 to AC249, MO16-8 to AC250, MO16-9 to AC251, MO16-10 to AC252, MO16-11 to AC253, MO16-4 and MO16-12 to AC254, MO16-13 and MO16-14 to AC255, MO16-15 to AC256, the version part of MO16-14 to AC257. Changes against the draft: targets are dinos and chickens on Vrij rondlopen (decision 128 renamed Blijf hier for animals), no mole wakes while a bubble or Klodder is out, a line when no spawn spot fits, and the mole never comes within 1 block of the kid. Section 4 below stays as the draft.

**Founder request (2026-11-15, Dutch, short):** make the world deeper. Deep under the ground, warnings: do not dig further. If the kid does, a monster mole comes up and slowly walks to the animals. He teases them, they run away and make a sound. Stop him with a fence of blocks, by trapping him, or with the knight. Every 10 minutes a black bubble with a little monster inside. A tap on the bubble lets it out. It breaks blocks and teases animals; only a knight stops it. Sell knights, with a wide range of gear that makes them stronger, and let knights guard the animals. Add more rare stones, and make them expensive. Every feature can be switched on and off in the parent menu.

**Founder answers (2026-11-15):** decision 130 (direction approved; questions not asked take this doc's recommendation), 131 (build order), 132 (bubble rules), 133 (gear width).

**The one rule over everything:** no animal is ever eaten, hurt, lost or taken. "Plagen" means the animal jumps, makes its sound, runs a few blocks away and then carries on as before.

---

## 1. How it fits the game today

### 1.1 Facts checked in the code on 2026-11-15

| Fact | What the code says | What it means here |
|---|---|---|
| World size and depth | `WORLD_SIZE` 64, `WORLD_HEIGHT` 64 (`src/world/terrain.ts`). Ground is about y 10. Oersteen at y 0 cannot be mined. A kid digs about 9 to 10 blocks today. | v17 and v18 work on today's world and need no depth. v15 (decision 124) makes it 128 x 128 and about 20 blocks to dig. v16 and v20 use the bottom layers of the v15 world. |
| Terrain versions | A save is a diff against a fixed terrain (`TerrainVersion` 1 or 2). The upgrade code knows only v1 to v2. | v15 adds the next terrain version anyway. That version also holds the stripe layer and the vein spots (architect A1, MOQ2 C). v16 and v20 add no terrain version. |
| Kid builds are known | The world record is `diff`: every cell the kid changed. `World` keeps its `start` array. | An O(1) "unchanged" check and a per chunk index of kid cells, built at load, keep Klodder off kid builds and the zone around them. Village sites have their own rule (`src/world/village-layout.ts`). |
| Blocks are free | All building blocks and the 8 rare blocks of v11 are free and unlimited once unlocked. No block inventory, no block price. | "Duur" needs a new step. See v20. |
| Parent switches | Instellingen in `src/ui/parent/settings-screen.ts`: rows with Aan or Uit (`makeToggleRow`). Values in `SettingsRecord`, read as on when missing. | New rows in one new card "Monsters en ridders". `makeToggleRow` needs a greyed state and a help line (V17c). |
| Play time | The play timer runs only on the world screen, visible, landscape, parent area closed (`timerMatrix` in `src/core/timers.ts`). The game loop stops with it. | Every monster clock counts this play time. A live monster pauses for free with the game loop. |
| Animals | Up to 25 dinos and 10 chickens. Modes Volg mij and Blijf hier (decision 122). Dinofluit (114). Followers stay out of the view (112) and pop next to the kid after 5 seconds far or stuck. Dinos walk straight and pop when stuck; there is no path search. | Only Blijf hier animals can be fenced. Teasing needs a column probe so no animal runs off a cliff or into water. Knights do not count toward 25 or 10. |
| Shop | `src/app/shop-flow.ts` has three near copies of "buy with ledger in one transaction". `LedgerReason` has no knight, gear or stone. | V17a makes one shared buy helper that v19 and v20 reuse. |
| Safety text | PRD 9 says villagers never break or place blocks. PRD 8 says no scary sounds, no angry dinos. | v17's signoff adds a "Ridders" line to PRD 8 and 9. v18's signoff adds a "Monsters" line. |

### 1.2 Release order and what each needs (decision 131)

Release ids stay; only the shipping order changed.

| Ship order | Release | The kid feels | Needs first | Size |
|---|---|---|---|---|
| 1 | v3 Dino's veilig | (backup, already scoped) | | 2 open tasks |
| 2 | **v17 Ridders** | I buy a knight. He marches in, salutes, follows me, stays, or guards my animals and tells me they are all safe. | v3 (backup) | M, 5 tasks |
| 3 | **v18 Zwarte bubbel** | Once I own a knight (or can pay for one), a black bubble floats by now and then. I tap it, Klodder jumps out, nibbles blocks and teases my animals, and my knight sends him off. Every block comes back. | v17 | M, 5 tasks |
| 4 | v15 Grote wereld | A bigger and deeper world, with a striped layer deep down (and hidden stone veins). | v3 | M to L |
| 5 | **v16 Monstermol** | Warnings deep down. Dig past the stripes and a silly mole comes up and teases my Blijf hier animals. A fence or my knight stops him. | v15 (depth and stripes), v18 (teasing, Moed bar) | M, 4 tasks |
| 6 | **v19 Ridderuitrusting** | 8 pieces of gear and a pony for my knights. They look great and win faster. | v17; best after v18 | M, 4 tasks |
| 7 | **v20 Diepe edelstenen** | 8 new shiny stones deep below the stripes. I find one, save up and buy it. | v15 (veins) | S to M, 3 tasks |
| later | **v21 Meer uitrusting** | The other 13 pieces of gear, a horse and a riding triceratops. | v19 | M, about 4 tasks |

v6 Wat heb ik geleerd was set right after v15 by decision 124. Decision 131 does not name it. Its slot is MOQ15.

Nothing depends on a later release. v17 and v18 do not need v15 or the mole. v20 works with every monster switch off.

### 1.3 Rules for every monster and knight (all releases)

* **Silly, not scary.** Cartoon shapes made of boxes, big googly eyes, bright colours on dark bodies. Sounds are giggles, boings and a "Boe!". No growl, scream, blood, teeth, death, sudden loud sound or jump scare.
* **A warning first.** The mole never appears without at least 3 seconds of rumble. The bubble floats in for at least 3 seconds before Klodder can come out, and he only comes out on the kid's tap.
* **Banned words.** No monster, knight, toast or parent string contains: bang, eng, dood, doodgaan, pijn, bloed, boos, gemeen, huilen, verdrietig, au, vechten, aanvallen, vermoorden, opeten, kapot. Tested on every new string (MO17-14, MO18-17, MO16-14).
* **Soft sounds.** Every new sound file is under 1.5 seconds, its peak level is at or below the loudest existing sound effect, and no file name says growl, scream or roar. All under Volume and Geluidseffecten. Teased animals use their existing sounds.
* **Never harms the kid.** A monster never touches, pushes, follows, traps or blocks the kid, and never takes points, dinos, eggs, chickens, knights, gear or found blocks.
* **Never harms an animal.** Teasing only (v18 4.3 In 6).
* **Knights win kindly.** A knight never kills or hurts. He pokes, tickles and shouts "Wegwezen!". The monster leaves with a silly line. The knight never loses.
* **A fight always lasts a moment.** The Moed bar never fills in less than 3 seconds, however many knights and however much gear (decision 133).
* **Opt in by the kid.** The mole only comes when the kid digs past the stripes. Klodder only comes out when the kid taps the bubble. A bubble not tapped floats away.
* **One at a time.** At most one mole and at most one bubble or Klodder in the world. At most 3 knights (2 if the v17 speed check fails, A9).
* **Paused with the world.** Every monster clock and every live monster stops whenever the play timer stops: learning break, exam, shop, dino menu, parent area, background, portrait.
* **Nothing for coins.** No coins or prizes for any monster. A monster is never a way to farm coins.
* With sound off, every monster line still shows as text. With reduced motion, no screen shake and no bounce, text only.

### 1.4 Parent switches

A new card **"Monsters en ridders"** in Ouders > Instellingen, behind the pincode. v17 adds the card with the master row and the Ridders row. Each later release adds its row. Every row has one plain help line under it.

| Row | Release | Help line (Dutch, exact) | Off means |
|---|---|---|---|
| Monsters en ridders (master) | v17 | "Zet alles hieronder in één keer aan of uit." | Everything below acts as off; the rows below show greyed and keep their own value. |
| Ridders | v17 | "Ridders koop je in de Dinowinkel. Ze volgen, wachten of passen op de dieren." | Knights march off with a wave and the Ridders shop section hides. Every knight and every piece of gear stays in the save and comes back when it is on again. |
| Zwarte bubbel | v18 | "Na 10 minuten spelen komt soms een bubbel. Tikt je kind erop, dan sloopt Klodder een paar blokken tot een ridder hem wegstuurt. Alles komt terug." | No bubble. A live bubble floats away and a live Klodder leaves at once; every block comes back. Only works with Ridders on; with Ridders off the row shows greyed with "Werkt alleen met Ridders aan". |
| Monstermol | v16 | "Wie onder de gestreepte laag graaft, maakt de Monstermol wakker. Een hek of een ridder stopt hem." | No warning text and no mole. The stripe blocks stay as plain blocks. A live mole digs down at once. |

v19 gear follows the Ridders row. v20 stones get no row: they are blocks (MOQ12 A, decided). Nothing bought is ever lost by a switch.

**Defaults (MOQ1 A with decision 132).** "New install" means the release starts for the first time with no saved world. "Existing install" means there is already a saved world.

| Row | New install | Existing install | Restored backup made before the row existed |
|---|---|---|---|
| Master | Aan | Aan | Aan |
| Ridders | Aan | Aan | Aan |
| Zwarte bubbel | Aan | Uit | Uit |
| Monstermol | Aan | Aan | Aan |

A backup made after the row existed restores its own value.

### 1.5 Saves and backup

* All new data stays on this iPad in IndexedDB, in one new kv record `monsters` plus settings fields. It holds: the knights (kind, spot, mode, worn gear), the bubble clock, the gear kast (v19), the found and bought deep stones (v20) and once only flags (the hint).
* Nothing live is saved. A live mole, bubble or Klodder, and every block Klodder broke, live only in memory (architect A2). After a reload, a crash or a kill they are gone and the world is whole.
* The v3 backup holds the `monsters` record and the new settings (`KV_NAMES`, `BACKUP_KV_NAMES`, `validKv`, `validSettings`). A backup from before a release restores with that release's things empty and the defaults of 1.4. Each release says so in its own criterion.
* "Wereld opnieuw beginnen": knights stay owned and stand next to the kid in the new world, keeping their mode (Blijf hier and guard spots move next to the kid). The bubble clock keeps its time. A live monster goes. Gear and bought stones stay.
* No personal data. No new text the kid types (knights get no names).

### 1.6 Speed on the iPad

The top project risk is 3D in iPad Safari, and v15 quadruples the chunks. So: 1 mole, 1 Klodder, at most 3 knights. Each creature is at most 6 meshes (one per colour, merged boxes like `src/render/dino-models.ts`), with one cached merged geometry per gear set. Path searches look at most 24 blocks across and 8 up or down and run at most every 2 seconds. Klodder breaks at most one block every 4 seconds; restores are grouped per chunk. Every release checks the AC101 frame target on the founder's oldest iPad with its new things on screen next to a herd of 25. v15's own speed test runs with 3 knights and Klodder on screen.

### 1.7 Animals when teased (shared by v18 and v16)

The animal jumps, plays its own existing sound and runs 6 (plus or minus 1) blocks away from the monster within 3 seconds. Its path never enters water or lava, never drops more than 1 block, never ends in a closed cell and never leaves the world (a column probe in `src/dinos/dino-ai.ts`). If no such spot exists (a Blijf hier animal walled in), it only jumps and plays its sound. Then it goes back to its mode: a Blijf hier animal walks back to within 3 blocks of its spot, a follower walks back behind the kid. An animal on a Dinofluit call is never teased and the call goes on. Nothing about teasing is saved.

### 1.8 How timing and pausing are tested

* **Hooks** in `src/dev/e2e-hooks.ts` (not in the production build): advance play time by N ms (only while the play timer runs), read the bubble clock, set the next break due time, set the random seed for spawn spots and picks, read the monster state (kind, position, clocks) and read the Moed bar.
* The logic runs on an injected clock, so unit tests need no real wait.
* Every timed rule (10 minutes, 5 minutes, 60 seconds, 10 seconds, 4 seconds, 3 seconds) is tested this way with a tolerance of plus or minus 1 second.
* Speeds are measured over 5 seconds with a tolerance of 20 percent. Distances have a tolerance of plus or minus 1 block.
* **Pause matrix:** one table driven test runs every state of `timerMatrix` (learning break, exam, shop, dino menu, parent area, background, portrait) against each live thing of the release (knight on guard, bubble and its 60 second timer, Klodder and his clocks, rumble, mole). In each state nothing moves and no clock advances; after it, everything goes on where it was.

---

## 2. v17 Ridders (ships after v3)

**Scoped into `docs/PRD.md` section 12, part A (0.7.0), as AC200 to AC210, AC228 and AC229.**

### 2.1 Goal
"I have my own knight. He marches in, salutes, follows me, stays where I say, or guards my animals and tells me they are all safe."

### 2.2 What the kid feels
1. In the Dinowinkel there is a new section "🛡️ Ridders" with a Ridder card for 30 coins.
2. I tap Kopen, then Ja. A knight with a silver helmet marches in next to me with a little fanfare: "Ridder tot je dienst!"
3. I walk past him. He salutes: "Hallo!"
4. I tap my knight. His menu has Volg mij, Blijf hier and Pas op de dieren.
5. I tap Pas op de dieren near my dino pen. He walks slow rounds among my animals.
6. I tap him again. "Ik pas op 4 dino's en 2 kippen. Alles veilig!"

### 2.3 Is v17 fun on its own?
Yes, for one release. It is the first thing in the shop that is not a dino, it is a person who does what the kid says, and the guard report is a tiny counting moment. The first monster follows in the very next release. Folding Klodder into v17 does not fit: v17 alone is 5 tasks (architect A6) and Klodder is 5 more. MOQ14 asks the founder to confirm.

### 2.4 In
1. **Ridders section** in the Dinowinkel, bought like an egg (`docs/SHOP_PRD.md` 4.3, 4.4): Kopen, Ja or Nee, the purchase lock, one transaction with a ledger row `reason: 'knight'`. 30 coins each, at most 3, not counted in the herd of 25 (MOQ7 A, decided).
2. **Inruilen** a knight for half its price (15), like a dino.
3. **Knight in the world:** box made, about player height, a basic helmet, tabard and wooden sword. Walks at 3 blocks per second like a dino (reusing `stepDino` with his own box). Never breaks or places blocks, never pushes the kid, follows decision 112 when following.
4. **Knight menu** on tap: Volg mij, Blijf hier, Pas op de dieren (MOQ8 A, decided). On Pas op de dieren he walks slow rounds within 8 blocks of the spot where it was set. A Volg mij knight walks with the kid and his followers.
5. **Salute:** when the kid comes within 3 blocks of a knight on Blijf hier or Pas op de dieren, the knight salutes and says "Hallo!", at most once a minute per knight.
6. **Guard report:** a tap on a knight on Pas op de dieren shows the menu and the line "Ik pas op N dino's en M kippen. Alles veilig!", counting the animals within 8 blocks of his spot. With none: "Hier zijn nog geen dieren."
7. The Dinofluit and Allemaal blijven do not move knights.
8. **The parent card** "Monsters en ridders" with the master row and the Ridders row, help lines and defaults (1.4).
9. **Save, backup, version:** knights and modes in the `monsters` record; the backup holds them; Wereld opnieuw beginnen as in 1.5; a version bump and a CHANGELOG line in kid words.
10. **PRD core:** a "Ridders" line in PRD 8 and 9 (a knight never hurts, game coins only).

### 2.5 Out
* Any monster (v18, v16). The Moed bar (v18).
* Gear (v19). Names for knights. Riding.
* Knights fighting each other, building fences or carrying animals.

### 2.6 Coins
One knight at 30 is about 3 breaks, so the first knight is reachable in one play session. Three knights cost 90. No coins are earned from knights.

### 2.7 Kid safety
* Game coins only, no real money, no ads, no "buy more coins".
* A knight never hurts: no blood, no falling over, no death.
* No text says the kid must have a knight. Nothing is lost without one.

### 2.8 iPad notes
* Knight menu buttons at least 56 px. A knight is at most 6 meshes.
* 3 knights, 25 dinos and 10 chickens in view must meet AC101 on the oldest iPad. If not, the cap is 2 before ship (A9).

### 2.9 Size and task split
M, 5 tasks (architect A6).
1. **V17a Knight economy:** one shared "buy with ledger in one transaction" helper replacing the three copies in `src/app/shop-flow.ts`, new `LedgerReason` values (knight, gear, stone), a `pointsEarned` check in `src/learning/progress-stats.ts`, cap, trade in, the `monsters` record, backup and restore checks, unit tests.
2. **V17b Knight life:** modes, guard rounds, follow rules, salute, guard report, Dinofluit and Allemaal blijven skip, Wereld opnieuw beginnen, unit tests.
3. **V17c Shop section and parent card:** the Ridders section, the card with master and Ridders rows, greyed state and help line in `makeToggleRow`, defaults.
4. **V17d Knight menu, hit test and model:** tap hit test for knights, the menu, the mesh, march in, fanfare, e2e.
5. **V17e Safety and speed:** the banned word and sound check helpers (reused by v18 and v16), the PRD core lines, version and CHANGELOG, the speed check.

### 2.10 Acceptance criteria (draft)
* **MO17-1:** Given the Dinowinkel with master and Ridders on, then a section "Ridders" shows a Ridder card with name, picture and price 30. Given either switch off, then the section is hidden.
* **MO17-2:** Given 30 coins, when the kid taps Kopen on the Ridder and then Ja, then the coins are 0, one knight appears within 3 blocks of the kid with "Ridder tot je dienst!", and the ledger has one row `reason: 'knight'` with delta -30, in one transaction. Given Nee, then nothing changes. Given 10 taps on Ja in 1 second with 60 coins, then exactly one knight is bought.
* **MO17-3:** Given 3 knights, then the Ridder card says "Je hebt al 3 ridders!" and cannot be bought. Given 25 dinos and 10 chickens, then a knight can still be bought.
* **MO17-4:** Given a knight, when the kid taps it, then the menu shows Volg mij, Blijf hier and Pas op de dieren, each button at least 56 by 56 px, and the chosen mode holds after a restart.
* **MO17-5:** Given a knight on Pas op de dieren, then over 2 minutes he never goes more than 8 (plus 1) blocks from his spot and he moves at least once every 10 seconds. Given a knight on Blijf hier, then over 2 minutes he stays within 1 block of his spot.
* **MO17-6:** Given a knight on Volg mij, then he walks at 3 blocks per second (20 percent) behind the kid, stays out of the view as decision 112 measures for dinos, and 40 world taps hit the knight 0 times.
* **MO17-7:** Given a knight on Blijf hier, when the kid walks to within 3 blocks, then he salutes and "Hallo!" shows; when the kid walks away and back within a minute, then no second salute.
* **MO17-8:** Given a knight on Pas op de dieren with 4 dinos and 2 chickens within 8 blocks and 1 dino at 12 blocks, when the kid taps him, then "Ik pas op 4 dino's en 2 kippen. Alles veilig!" shows. Given no animal within 8 blocks, then "Hier zijn nog geen dieren."
* **MO17-9:** Given any knight action for 2 minutes (automated), then no block is broken or placed and the kid is never pushed.
* **MO17-10:** Given a knight bought for 30, when the kid trades it in, then the kid gets 15 coins, a ledger row is written and the knight leaves.
* **MO17-11:** Given 2 knights, when the parent switches Ridders or the master off, then no knight shows in the world and the Ridders section is hidden. When it goes on again, then both are back with the same modes. Given the master off, then the Ridders row shows greyed and keeps its value. Given the Dinofluit or Allemaal blijven, then knights do not change mode or place.
* **MO17-12:** Given the parent card, then each row shows its exact help line of 1.4. Given a new install, an existing install and a restored backup from before v17, then master and Ridders are Aan.
* **MO17-13:** Given a save from before v17, then it loads with no knights. Given a backup after v17, then the knights come back with their modes on an empty iPad. Given a backup from before v17, then it restores with no knights. Given Wereld opnieuw beginnen with 2 knights, then both stand within 3 blocks of the kid in the new world with their modes.
* **MO17-14:** Given every new string of v17, then none contains a banned word of 1.3. Given every new sound file, then each is under 1.5 seconds and at or below the loudest existing effect. Given Geluidseffecten uit, then every knight line still shows as text.
* **MO17-15:** Given `package.json`, Instellingen and the CHANGELOG, then all show the new version with a kid line about knights.
* **MO17-16:** Given 3 knights, 25 dinos and 10 chickens on screen, when the founder walks around for 2 minutes with the fps counter, then the AC101 target holds (real iPad check). The founder also looks and listens: the knight looks friendly and the fanfare is soft.

---

## 3. v18 Zwarte bubbel (ships after v17)

**Scoped into `docs/PRD.md` section 12, part B (0.7.0, with v17), as AC211 to AC229.**

### 3.1 Goal
"Now and then a shiny black bubble floats by with a little monster inside. If I tap it, Klodder jumps out and makes a mess. My knight sends him off, and everything comes back."

### 3.2 What the kid feels
1. I own a knight. I am building. A shiny black bubble with two blinking eyes floats down in front of me with a soft "bloop".
2. I tap it. "Plop!" Out jumps Klodder, a small round black and purple monster with googly eyes. "Hihihi!"
3. Klodder hops to a tree and nibbles a leaf block away. Then he runs to my Compy: "Boe!" The Compy squeaks and runs off, then walks back.
4. My knight runs over. Tok, tok, the Moed bar fills. "Wegwezen!" Klodder is back in his bubble and floats away: "Doei!" Plop plop plop, the blocks he nibbled come back.
5. Another time I do not tap the bubble. After a minute it floats up and away. Nothing happens.

### 3.3 In
1. **The bubble clock (decision 132):** counts play time only, and only while all of these hold: master, Ridders and bubble rows on, the kid owns a knight or has at least 30 coins, and no bubble or Klodder is out. While a condition is false the clock keeps its time. At 10 minutes (MOQ11 A, decided) a bubble comes. If a learning break is due in under 60 seconds (`remainingPlayMs()`), the bubble waits until 30 seconds after the break. The clock is saved with the play timer (`persistPlayMs`), so a reload does not reset it.
2. **The bubble:** floats in over 3 seconds to a spot 6 to 10 blocks in front of the kid at eye height, only where that spot is air and in view; else it waits and tries again every 5 seconds. It drifts slowly within 1 block. It is at least 80 px on screen. A tap pops it in Hakken or Bouwen mode, before any block behind it, using the same hit test as the knight. Not tapped in 60 seconds of play time: it floats up and away and the clock starts again.
3. **Klodder:** small, round, silly, at most 6 meshes. Walks at 1.5 blocks per second. Every 4 seconds he nibbles one block he can reach, then sometimes teases an animal (1.7). After 20 blocks he only teases.
4. **Which blocks (MOQ4 A, decided):** only cells the kid never changed, not within 3 blocks of any kid changed cell, never in a village site, never oersteen, water or lava, never a block under or next to the kid or an animal.
5. **An overlay, never saved (architect A2):** a nibbled block is hidden for render and collision only. It is never written to the world diff. The world save writes those cells as their start block.
6. **Teasing** of dinos and chickens as in 1.7 (not villagers, not knights). He never picks the same animal twice in a row.
7. **The Moed bar:** a knight notices Klodder within 8 blocks (16 on Pas op de dieren), walks straight to him, and pops next to him after 3 seconds stuck, like a stuck dino (architect A5; v16 brings a real path search). He pokes with a soft "Tok!". A Moed bar over Klodder fills at the knights' Kracht per second (1 each without gear); Klodder needs 30. Never in less than 3 seconds (1.3). Full: "Wegwezen!", Klodder pops into a bubble that floats away with "Doei!". The knight goes back to his mode.
8. **Klodder always tires (decision 132):** after 5 minutes of play time out he yawns "Ik ben moe", climbs into his bubble and floats away. Fixed, no option.
9. **Every block comes back (decision 132):** when Klodder leaves for any reason, every nibbled block reappears with a soft "plop", spread over about 2 seconds, all within 3 seconds. A cell where the kid or an animal stands waits and retries each second until free. A cell the kid built in since then keeps the kid's block.
10. **One hint (MOQ6 A, decided, reworded after qa Q1):** the first time ever that Klodder is out and the kid has no knight: "Klodder wordt vanzelf moe. Een ridder kan hem sneller wegsturen." Never again. It names no shop.
11. **The bubble row** with its help line and defaults (1.4).
12. **Save, backup, version:** the bubble clock and the hint flag. A version bump and a CHANGELOG line. A "Monsters" line in PRD 8 and 9.

### 3.4 Out
* More than one bubble or Klodder at a time. Bubbles by clock time or date.
* Klodder nibbling kid builds, village houses or blocks under the kid. Blocks gone for good.
* Coins or prizes for beating Klodder. Klodder stopped by a fence (founder: only the knight).
* The mole (v16). Path search for knights (v16).

### 3.5 The pressure question, said plainly
The founder wants "the only way to stop him is the knight". Coins come only from learning, never from money, so this is not a purchase risk. It is a light pressure mechanic, kept kind by: the clock only runs once the kid has a knight or can pay for one, the kid chooses to tap the bubble, Klodder tires after 5 minutes, nibbles at most 20 blocks, never near a build, and every block comes back. On existing installs the parent switches it on. The one hint names no shop.

### 3.6 Kid safety
* Nothing comes out unless the kid taps. Klodder never touches the kid and never takes anything.
* Nothing the kid built is touched, and every block comes back, even after a crash.
* No coins or rewards for monsters.

### 3.7 iPad notes
* The bubble is at least 80 px. A tap on the bubble never also mines or places.
* One nibble per 4 seconds is one chunk rebuild. Restores are grouped per chunk.

### 3.8 Size and task split
M, 5 tasks.
1. **V18a Bubble clock and bubble:** the clock rules, saved with `persistPlayMs`, the bubble spot, float, tap with the shared hit test, float away, unit tests.
2. **V18b Klodder life:** walk, block pick rules with the unchanged check and the per chunk kid cell index, the overlay, cap 20, tired rule, restores, unit tests.
3. **V18c Teasing:** pick target, the flee step with the column probe in `src/dinos/dino-ai.ts`, back to mode, skip called animals, the seeded test map, unit tests.
4. **V18d Knight against Klodder:** notice, walk, pop when stuck, Moed bar, minimum fight time, the hint, e2e.
5. **V18e Model, sounds, switch, save:** meshes, sounds, the bubble row, defaults, backup and restore checks, the pause matrix test, PRD core lines, version, speed check.

### 3.9 Acceptance criteria (draft)
* **MO18-1:** Given master, Ridders and bubble on and 1 knight, after 10 minutes of play time (plus or minus 1 second) a bubble appears. Time in a learning break, exam, shop, dino menu, parent area, background or portrait does not count (hook driven).
* **MO18-2:** Given no knight and 29 coins, then after 30 minutes of play time no bubble has come and the clock has not moved. Given the kid then reaches 30 coins, then the clock runs on from where it stood.
* **MO18-3:** Given the bubble is due and a learning break is due in under 60 seconds, then the bubble waits and comes 30 seconds (plus or minus 1) after the break ends.
* **MO18-4:** Given a bubble, then it took at least 3 seconds to float in, it stands 6 to 10 blocks in front of the kid in an air cell in view, it is at least 80 px on screen, and over 30 seconds it stays within 1 block of its spot. Given the kid in a 1 wide tunnel, then no bubble shows until a valid spot exists.
* **MO18-5:** Given a bubble, when the kid taps it in Hakken or Bouwen mode, then it pops, Klodder appears and no block is mined or placed by that tap. Given no tap for 60 seconds of play time, then the bubble floats away and nothing else happens.
* **MO18-6:** Given Klodder out for 3 minutes on a seeded world with a kid built hut and a village (hook driven), then every nibbled cell was unchanged, at least 4 blocks from every kid changed cell, outside every village site, not oersteen, water or lava, and not under or next to the kid or an animal; at most one nibble per 4 seconds; at most 20 in total; after 20 he still teases.
* **MO18-7:** Given 1 knight within 16 blocks on Pas op de dieren, then the knight reaches Klodder (or pops next to him after 3 seconds stuck, also from inside a closed pen) and the Moed bar fills at 1 per second; after 30 seconds (plus or minus 1) Klodder is in a bubble that floats away with "Doei!" and the knight goes back to his mode. Given a knight at 12 blocks on Volg mij, then he does not chase. Given 3 knights, then the bar takes 10 seconds. The bar never fills in under 3 seconds.
* **MO18-8:** Given Klodder has nibbled 10 blocks and leaves for any reason (knight, tired, switch), then within 3 seconds every block is back, not all in one frame. Given the kid stands in a nibbled cell, then that block comes back within 1 second after the kid steps out. Given the kid placed a block in a nibbled cell, then the kid's block stays.
* **MO18-9:** Given a world diff saved before a visit, when Klodder nibbles 10 blocks and the page is hard killed (not a clean reload), then after the next start the world diff is byte equal to before and all blocks are there. Given a backup made while Klodder is out, then it holds the full blocks. Given Wereld opnieuw beginnen while Klodder is out, then Klodder is gone.
* **MO18-10:** Given no knight, then Klodder yawns "Ik ben moe" and floats away after 5 minutes of play time (plus or minus 1 second), and the blocks come back.
* **MO18-11:** Given a seeded map with a pen, a cliff of 4 and a pond, when Klodder teases 50 times (automated), then no animal is removed, changes mode for good, loses anything, enters water or lava, drops more than 1 block, ends in a closed cell or leaves the world; 10 seconds after each tease every Blijf hier animal is within 3 blocks of its spot and every follower is behind the kid; the saved dinos record differs only in positions.
* **MO18-12:** Given a Blijf hier dino walled in on all sides, when it is teased, then it jumps, plays its sound and stays. Given a dino on a Dinofluit call, then Klodder never teases it and it arrives at the kid. Given villagers and knights in reach, then Klodder never teases them.
* **MO18-13:** Given no knight and Klodder out for the first time ever, then "Klodder wordt vanzelf moe. Een ridder kan hem sneller wegsturen." shows once. Given a later Klodder, then it never shows again, also after a restart.
* **MO18-14:** Given Ridders off, then the bubble row shows greyed with "Werkt alleen met Ridders aan" and no bubble comes. Given Klodder out, when the parent switches the bubble, Ridders or the master off, then on return Klodder is gone and the blocks come back. Given a new install, the row is Aan; an existing install and a restored backup from before v18, Uit.
* **MO18-15:** Given a bubble or Klodder out, then in every `timerMatrix` pause state (1.8) nothing moves, the bubble's 60 seconds, Klodder's 5 minutes and his 4 second nibble clock do not advance, and after it all goes on. Given a reload while a bubble or Klodder is out, then neither is there and the bubble clock has its saved time (plus or minus 1 second).
* **MO18-16:** Given Klodder out, then he never touches the kid, the kid's points, herd, knights and found blocks do not change, and no coins are given (automated).
* **MO18-17:** Given every new string and sound of v18, then the banned word and sound rules of 1.3 hold. Given Geluidseffecten uit, then Klodder's lines show as text. Given reduced motion, then the bubble floats with no bounce.
* **MO18-18:** Given a backup after v18, then it holds the bubble clock and the hint flag; a backup from before v18 restores with a fresh clock and the bubble row Uit. The version and a CHANGELOG line show.
* **MO18-19:** Given Klodder, 3 knights and 25 dinos on screen, then the AC101 target holds (real iPad check). The founder looks and listens: Klodder is silly, not scary.

---

## 4. v16 Monstermol (ships after v15)

### 4.1 Goal
"Deep down there are warning stripes. If I dig past them anyway, a silly monster mole comes up and teases my animals. A fence or my knight stops him."

### 4.2 What the kid feels
1. I dig a deep hole. Two layers above the stripes a toast says "Pas op! Diep onder de grond woont de Monstermol."
2. I mine a yellow and black striped block. A card says "Niet verder graven! Onder de streep slaapt de Monstermol." I tap OK.
3. I dig one more block below the stripes. The ground rumbles: "Oei... de grond rommelt!"
4. After 3 seconds a purple mole with big glasses and a pink nose pops out of the grass, away from me, near my animals. "Hihi! Waar zijn de dieren?"
5. He waddles slowly to my Triceratops. "Boe!" The Triceratops jumps, squeaks and runs off a bit, then walks back.
6. I build a wall of blocks 2 high around my Blijf hier animals. "Hmpf! Ik kan er niet bij." He digs back into the ground.
7. Another time my knight runs over and the Moed bar fills. "Oké, oké, ik ga al!"

### 4.3 In
1. **The stripes come from v15** (architect A1, MOQ2 C): v15's terrain version holds a layer of Waarschuwsteen (id 42, yellow and black, mineable, not in the block grid) about 5 layers above oersteen. v16 adds no terrain version.
2. **Two warnings:** the toast when the kid mines a block 1 or 2 layers above the stripes (at most once per minute), and the card with OK when the kid mines a Waarschuwsteen (every time). The play timer stops while the card is open.
3. **Waking the mole:** mining any block below the stripes, with master and Monstermol on and no mole out. A rumble of 3 seconds (a small camera shake under 1 second, none with reduced motion), then the mole pops up on the surface: at least 6 blocks from the kid, not on or next to the dig column, within 16 blocks of the nearest animal (architect A4), never inside or within 3 blocks of a kid build, never on water or lava. With no animal in the world he pops up 6 to 10 blocks from the kid. More digging while a mole is out does nothing new.
4. **The path search (architect A3):** a grid search every 2 seconds over 24 blocks across and 8 up or down. Walkable means a solid block below and 1 free block above; step up at most 1; drop at most 3; no water or lava. The mole's walk follows the same path. So a fence is a closed wall 2 high with no gap; a 1 high gap under an overhang lets him through.
5. **The mole:** about 1 block tall, box made, at most 6 meshes. Walks at 1 block per second. Never breaks or places blocks. Walks through villages and ignores villagers.
6. **Teasing** of dinos and chickens within 24 blocks as in 1.7, reusing v18. Never the same animal twice in a row.
7. **Stopping him:** when the search finds no path to any animal for 10 seconds in a row, he says "Hmpf! Ik kan er niet bij." and digs down. Only Blijf hier animals can be fenced; followers stay with the kid (architect A4).
8. **No animals:** with no dino or chicken in the world, he looks around for 60 seconds, says "Niemand om mee te spelen..." and digs down.
9. **Tired:** after 10 minutes of play time out he yawns "Ik ga slapen" and digs down (MOQ3 A, decided).
10. **Knights:** a knight notices the mole like Klodder (v18) and uses the same path search to reach him; Moed 15; "Wegwezen!", the mole says "Oké, oké, ik ga al!" and digs down. From v16 on knights also use the path search for Klodder.
11. **The Monstermol row** with its help line and defaults (1.4).
12. **Sounds:** rumble, "Boe!", "Hmpf!". Version bump and CHANGELOG line.

### 4.4 Out
* A mole that breaks blocks, digs tunnels, follows the kid or goes after villagers.
* More depth than v15 gives. A special fence block or gate.

### 4.5 Kid safety
* The mole only comes after two warnings and the kid's own dig, away from the kid. He never touches the kid, never breaks a block and never takes anything.
* The parent can switch it off at any time; a live mole leaves at once.

### 4.6 Size and task split
M, 4 tasks.
1. **V16a Warnings and wake:** the toast, the card, the wake rule, the spawn spot rules, unit tests.
2. **V16b Path search and walk:** the grid search, the follower, the give up, no animals and tired rules, the unit test map (a pen, a 1 high wall, a gap under an overhang, a pit, a cliff of 4).
3. **V16c Mole in the world:** mesh, rumble, speech, teasing reuse, e2e.
4. **V16d Knights, switch and save:** knights chase with the path search, the Monstermol row, defaults, backup checks, pause matrix, version, speed check.

### 4.7 Acceptance criteria (draft)
* **MO16-1:** Given the kid mines a block 1 or 2 layers above the stripes, then the toast shows, at most once per minute. Given the kid mines a Waarschuwsteen, then the card with OK shows, its OK button at least 56 px, the play timer stops until OK, and neither covers the Hakken button.
* **MO16-2:** Given master and Monstermol on and no mole out, when the kid mines a block below the stripes, then "Oei... de grond rommelt!" shows and after 3 seconds (not sooner, by hook timestamp) one mole appears. Given a mole out, when the kid mines below the stripes again, then no second mole appears.
* **MO16-3:** Given 20 seeded wakes, then every spawn spot is at least 6 blocks from the kid, not on or next to the dig column, within 16 blocks of the nearest animal, not within 3 blocks of a kid changed cell, not on water or lava. Given the kid in a 1 wide shaft 15 deep, when the mole comes, then the kid can climb out with nothing in the way.
* **MO16-4:** Given either switch off, when the kid mines past the stripes, then no warning shows and no mole appears.
* **MO16-5:** Given a mole and 3 Blijf hier dinos in reach, then he walks at 1 block per second (20 percent) to the nearest and teases it as in 1.7; he never picks the same animal twice in a row.
* **MO16-6:** Given the unit test map, then the search finds a path through the 1 high gap under the overhang, over the 1 high wall and down the pit of 3, and none into the closed pen, up 2 or down the cliff of 4. The mole's walk takes the found path.
* **MO16-7:** Given the Blijf hier animals inside a closed wall 2 high, then after 10 seconds with no path, plus up to 2 seconds for the next check, the mole says "Hmpf! Ik kan er niet bij." and is gone within 15 seconds. Given walls 2 high around the mole, then the same. Given a wall only 1 high, then he steps over it.
* **MO16-8:** Given no dinos or chickens, then after 60 seconds he says "Niemand om mee te spelen..." and is gone. Given a mole out for 10 minutes of play time, then he yawns "Ik ga slapen" and is gone.
* **MO16-9:** Given a knight in a closed pen and the mole outside, then the knight reaches the mole and the Moed bar fills at 1 per second; after 15 seconds (plus or minus 1) "Wegwezen!" and "Oké, oké, ik ga al!" show and the mole is gone. Given 2 knights, then 7.5 seconds.
* **MO16-10:** Given a mole for 2 minutes (automated), then he never breaks or places a block, never touches or pushes the kid, never enters the kid's cell, and never teases a villager. Given a village in his way, then he walks through it.
* **MO16-11:** Given a mole or a rumble, then in every pause state of 1.8 nothing moves and no clock advances. Given a reload during the rumble or while the mole is out, then no mole is there after the reload.
* **MO16-12:** Given a mole out, when the parent switches Monstermol or the master off, then on return he is gone. Given the row, then it shows its help line and is Aan on a new install, an existing install and a restored backup from before v16.
* **MO16-13:** Given Geluidseffecten uit, then every warning and mole line shows as text. Given reduced motion, then no camera shake and the rumble shows as text only.
* **MO16-14:** Given every new string and sound of v16, then the rules of 1.3 hold, and no network request is made. The version and a CHANGELOG line show.
* **MO16-15:** Given a mole teasing a herd of 25 in view on the v15 world, then the AC101 target holds (real iPad check). The founder looks and listens: the mole is silly, not scary.

---

## 5. v19 Ridderuitrusting

### 5.1 Goal
"My knights get cool gear: helmets, shields, a tickle feather, a cape and a pony. They look great and win faster."

### 5.2 What the kid feels
1. The Ridders section in the Dinowinkel has a new row "⚔️ Uitrusting" with 8 cards, cheapest first.
2. I buy a Pony for 50 coins. It goes into my wapenkast.
3. I tap my knight and tap Uitrusten. I see my knight and the wapenkast below. I tap the Pony. My knight sits on a pony now.
4. Klodder comes. My knight on his pony gets there faster.

### 5.3 In
1. **Gear catalog (decision 133):** 8 items in 5 slots, all inside the 60 coin ceiling of `docs/GAME_LOOP_PRD.md` 1.3. One of each costs 210.

| Slot | Item (Dutch) | Coins | Does |
|---|---|---|---|
| Hoofd | Leren kap | 10 | Kracht +1 |
| Hoofd | IJzeren helm | 25 | Kracht +1, shines |
| Schild | Houten schild | 10 | Kracht +1 |
| Schild | IJzeren schild | 30 | Kracht +1, shines |
| Hand | Kietelveer | 20 | Kracht +1, monsters giggle |
| Hand | Glimzwaard | 50 | Kracht +1, sparkles |
| Rug | Riddercape | 15 | Kracht +1 |
| Rijdier | Pony | 50 | Speed +1.5 blocks per second |

2. **Kracht cap (decision 133):** a knight has base Kracht 1, plus 1 for each worn item in Hoofd, Schild, Hand and Rug: at most 5. A bare knight sends the mole off in 15 seconds and Klodder in 30; a fully dressed one in 3 and 6. The 3 second minimum of 1.3 holds for any number of knights. Better items in a slot look better; they do not add more Kracht.
3. **One item, one knight**, like the hats of v12: a bought item is one thing in the wapenkast, worn by one knight at a time, moved for free. One item per slot. The Hand item replaces the wooden sword.
4. **Uitrusten** in the knight menu: the knight shown as a static picture or on the main canvas (never a second renderer, architect A7), the wapenkast below, tap to wear, tap again to take off.
5. **Gear shows in the world** on the knight, merged into his meshes (at most 6), one cached geometry per gear set. The Pony carries the knight.
6. **Buying** with the shared helper of V17a, ledger `reason: 'gear'`. Too few coins: the card greyed with "Nog X punten nodig".
7. **Inruilen** a knight puts his gear back in the wapenkast. Switching Ridders off keeps all gear.
8. **Save, backup, version.**

### 5.4 Out
* The other 13 items, the Lijf, Voeten and Vlag slots, the Strijdpaard and the Rij-triceratops (v21).
* Gear for dinos (v12). Selling gear back. Gear that wears out. Colours.

### 5.5 Kid safety
* The feather tickles and the sword sparkles. No blood, no harm.
* Nothing wears off, nothing is needed, no text says a knight is weak.

### 5.6 Size and task split
M, 4 tasks.
1. **V19a Gear economy:** catalog data, buy, wapenkast, one item one knight, Kracht sum with cap, speed, save, backup, unit tests.
2. **V19b Shop row and Uitrusten screen:** cards, knight menu button, the picture, e2e.
3. **V19c Gear in the world:** attach points, the pony and seated pose, mesh merge and cache, speed check.
4. **V19d Effects:** giggle, sparkles, shine, unit tests.

### 5.7 Acceptance criteria (draft)
* **MO19-1:** Given the Ridders switch on, then the Dinowinkel shows "Uitrusting" with the 8 items cheapest first, each with name, picture, slot and price, every card at least 56 px.
* **MO19-2:** Given 50 coins, when the kid buys the Pony with Ja, then the coins are 0, the wapenkast holds one Pony and the ledger has one row `reason: 'gear'` with delta -50, in one transaction. Given 10 taps on Ja in 1 second, then one is bought. Given 49 coins, then the card is greyed with "Nog 1 punt nodig" and cannot be bought.
* **MO19-3:** Given one item of each kind worn by knight A, when the kid puts each on knight B, then B wears it, A does not, and the wapenkast still counts one of each. Given a worn item, when the kid taps it again in Uitrusten, then it is off and back in the kast.
* **MO19-4:** Given a knight with IJzeren helm and Houten schild, then his Kracht is 3 and he sends the mole off in 5 seconds and Klodder in 10 (plus or minus 1). Given all 4 Kracht slots filled, then Kracht is 5. Given 3 fully dressed knights, then a fight still takes at least 3 seconds. Given the Pony, then he walks at 4.5 blocks per second (20 percent).
* **MO19-5:** Given a knight wearing items in all 5 slots, then the knight model has one attached part per worn slot and at most 6 meshes (automated), and the founder sees each item on him (real iPad).
* **MO19-6:** Given Klodder or the mole and a knight with the Kietelveer, then the monster plays the giggle. Given the Glimzwaard, then sparkles show while poking. Given reduced motion, then no sparkles.
* **MO19-7:** Given a knight wearing 3 items, when the kid trades him in, then the 3 items are back in the wapenkast.
* **MO19-8:** Given a save or backup from before v19, then it loads with an empty wapenkast. Given a backup after v19, then the wapenkast and worn gear come back. The version and a CHANGELOG line show; the new strings pass the rules of 1.3.
* **MO19-9:** Given 3 knights in full gear and 25 dinos, then the AC101 target holds (real iPad check).

---

## 6. v20 Diepe edelstenen

### 6.1 Goal
"Deep under the warning stripes there are 8 new shiny stones. When I find one, I can save up to buy it, and then build with it as much as I like."

### 6.2 What the kid feels
1. Below the stripes I mine a block that sparkles inside. "Je hebt Maansteen ontdekt!"
2. In Alle blokken there is a new tab "Diep" with 8 tiles. Maansteen shows its picture with a lock and "Koop in de Dinowinkel".
3. In the Dinowinkel, a new section "💎 Edelstenen" shows the Maansteen for 80 coins. I save up and buy it.
4. Now Maansteen is in my Diep tab for good. I build a shiny tower with it.

### 6.3 In
1. **8 new blocks** (ids 43 to 50): Maansteen 80, Zonnesteen 100, Jade 120, Opaal 150, Topaas 180, Parelsteen 220, Drakensteen 300, Mollengoud 400. Prices stand (decision 130): the founder asked for expensive stones.
2. **Veins come from v15** (architect A1): v15's terrain version places the vein spots below the stripes. Until v20 they look and mine like plain steen; v20 shows them. No terrain version in v20.
3. **Find, then buy once (MOQ10 B, decided):** mining a vein block marks that stone found ("Je hebt X ontdekt!", the first time only). A found stone shows as a card in the Edelstenen section. Buying it once unlocks it for good, free and unlimited. A stone not found shows as a "?" card that cannot be bought. Found list copies the v11 `village.found` pattern.
4. **Diep tab** in Alle blokken with 8 tiles and "N van de 8 gekocht". Found but not bought: picture, lock, "Koop in de Dinowinkel". Not found: "?" and "Ergens diep onder de grond".
5. Found and bought stones stay after "Wereld opnieuw beginnen".
6. A restored hotbar with a stone that is not bought shows that slot empty.
7. **Save, backup, version.**

### 6.4 Out
* Stones bought per piece with a count (needs a block inventory). Selling stones. A switch for stones.

### 6.5 Coins
80 to 400 breaks the 60 coin ceiling on purpose. 400 is about 40 to 50 breaks, a long goal like the Regenboogsaurus (300). Nothing is needed to play.

### 6.6 Kid safety
Nothing new. Digging below the stripes may wake the mole, which is the fun of it. With the mole off the stones are still there.

### 6.7 Size and task split
S to M, 3 tasks.
1. **V20a Blocks and found list:** 8 block ids shown, textures, the found message, found list, unit tests.
2. **V20b Shop section and Diep tab:** cards with the shared buy helper, buy once, unlock, e2e.
3. **V20c Save, backup, hotbar rule, version, iPad check.**

### 6.8 Acceptance criteria (draft)
* **MO20-1:** Given a v15 world after v20, then each of the 8 stones lies in at least 2 veins below the stripes, only in cells the kid never changed.
* **MO20-2:** Given the kid mines a Maansteen for the first time, then "Je hebt Maansteen ontdekt!" shows, the Diep tab shows it with a lock and "Koop in de Dinowinkel", and the Edelstenen card can be bought. A second Maansteen shows no message.
* **MO20-3:** Given a stone not found, then its card is a "?" and cannot be bought, and its Diep tile shows "?" and "Ergens diep onder de grond". Given 79 coins and Maansteen found, then the card is greyed with "Nog 1 punt nodig".
* **MO20-4:** Given 80 coins, when the kid buys Maansteen with Ja, then the coins are 0, a ledger row `reason: 'stone'` with delta -80 is written in one transaction, Maansteen can be picked and placed without limit, and the tab shows "1 van de 8 gekocht".
* **MO20-5:** Given every monster switch off, when the kid mines a vein below the stripes, then the stone is found as usual.
* **MO20-6:** Given 2 bought stones, when the parent does "Wereld opnieuw beginnen", then both are still bought and found.
* **MO20-7:** Given a save or backup from before v20, then it loads with no stones found. Given a backup after v20, then found and bought stones come back. Given a restored hotbar holding an unbought stone, then that slot is empty. The version and a CHANGELOG line show.

---

## 7. v21 Meer uitrusting (candidate, after v19)

**Goal:** "Even more gear: a plumed helmet, a dragon shield, armour, boots, banners, a war horse and a riding triceratops."

**In:** the other 13 items of the first draft, in the slots of v19 plus Lijf, Voeten and Vlag:

| Slot | Item | Coins | Does |
|---|---|---|---|
| Hoofd | Pluimhelm | 45 | look |
| Hoofd | Gouden helm | 80 | look |
| Schild | Drakenschild | 60 | look |
| Hand | Houten zwaard | 10 | look (a spare sword) |
| Hand | Bubbelstaf | 75 | blows bubbles |
| Lijf | Maliënkolder | 30 | look |
| Lijf | Glanzend harnas | 70 | look |
| Rug | Koningscape | 40 | look |
| Voeten | Snelle laarzen | 20 | speed +1 |
| Rijdier | Strijdpaard | 90 | speed +2.5 |
| Rijdier | Rij-triceratops | 120 | speed +2, a new seated pose |
| Vlag | Banier | 25 | notices monsters 4 blocks further |
| Vlag | Koningsbanier | 55 | notices 6 blocks further |

The Kracht cap of 5 stays, so these add looks, speed, range and effects, never a faster fight than 3 seconds. 5 items cost 70 to 120, past the 60 coin ceiling (the first draft said 6; it is 5); the founder decides that at v21's `/release`. Size: M, about 4 tasks.

---

## 8. Founder questions

### 8.1 Still open

* **MOQ14: v17 without any monster.** In v17 the knight buys, marches in, salutes, follows, stays, guards and reports "Alles veilig!", but meets no monster until v18. A (recommended): ship v17 like that; v18 comes right after. B: fold a first monster into v17. It does not fit 5 tasks (v17 is already 5), so v17 would split into two releases anyway. C: ship v17 and v18 as one signoff, built back to back, released together.
* **MOQ15: Where v6 Wat heb ik geleerd goes.** Decision 124 put it right after v15; decision 131 lists v15, then v16, v19, v20 and does not name v6. A: right after v15, before v16 (keeps decision 124). B (recommended): after v20, following the order of decision 131 as said. C: right after v18, before v15.

### 8.2 Decided

* **MOQ1** Defaults: A, on for new and existing installs (decision 130), except the bubble row, off on existing installs (decision 132). Table in 1.4.
* **MOQ2** Depth: C, the stripe layer and vein spots go into v15's terrain version (architect A1, accepted after decision 130).
* **MOQ3** Mole tires after 10 minutes: A (decision 130).
* **MOQ4** Klodder's blocks: A, only unchanged blocks, at most 20, all come back (decision 132), plus the 3 block zone (qa Q3).
* **MOQ5** Safety valves: A, fixed (decision 132).
* **MOQ6** Hint: A, one toast the first time, reworded with no shop pointer (decision 130, qa Q1).
* **MOQ7** Knights: A, 30 coins, at most 3, not in the 25 (decision 130).
* **MOQ8** Begeleiden: A, Pas op de dieren (decision 130).
* **MOQ9** Gear: 8 items with a Kracht cap of 5 and a 3 second minimum fight; the rest in v21 (decision 133).
* **MOQ10** Stones: B, find then buy once (decision 130).
* **MOQ11** Bubble: A, every 10 minutes of play, fixed (decision 130), only with a knight or 30 coins (decision 132).
* **MOQ12** No switch for stones: A (decision 130).
* **MOQ13** Order: v17, v18, then v15, v16, v19, v20 (decision 131).
