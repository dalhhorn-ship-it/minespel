# Product doc: Monsters and knights (v16 Monstermol, v17 Ridders, v18 Zwarte bubbel, v19 Ridderuitrusting, v20 Diepe edelstenen)

**Status:** Draft, not signed. Each release moves into docs/PRD.md section 12 and is signed there when the founder picks it at /release.

**Companion to:** `docs/PRD.md` (the signed core), `docs/SHOP_PRD.md` (the Dinowinkel) and `docs/GAME_LOOP_PRD.md` (coins and balance). Backlog entries: `docs/BACKLOG.md`, sections v16 to v20. All five are candidates after v15 Grote wereld (decision 124).

**Audience:** one kid of 8 to 10 (groep 5 to 7), Dutch, Safari on the family iPad, landscape.

**Criteria ids:** this doc uses draft ids per release (MO16-1, MO17-1, MO18-1, MO19-1, MO20-1, ...). They get real AC numbers only when a release is scoped into PRD section 12, so they never clash with the numbers of v3, v15 and v6.

**Founder request (2026-11-15, Dutch, short):** make the world deeper. Deep under the ground, warnings: do not dig further. If the kid does, a monster mole comes up and slowly walks to the animals. He teases them, they run away and make a sound. Stop him with a fence of blocks, by trapping him, or with the knight. Every 10 minutes a black bubble with a little monster inside. A tap on the bubble lets it out. It breaks blocks and teases animals; only a knight stops it. Sell knights, with a wide range of gear that makes them stronger, and let knights guard the animals. Add more rare stones, and make them expensive. Every feature can be switched on and off in the parent menu.

**The one rule over everything:** no animal is ever eaten, hurt, lost or taken. "Plagen" means the animal jumps, makes its sound, runs a few blocks away and then carries on as before.

---

## 1. How it fits the game today

### 1.1 Facts checked in the code on 2026-11-15

| Fact | What the code says | What it means here |
|---|---|---|
| World size and depth | `WORLD_SIZE` 64, `WORLD_HEIGHT` 64 (`src/world/terrain.ts`). Ground is about y 10 (`BASE_HEIGHT` 10, hills up to 5 higher). Oersteen at y 0 cannot be mined. So a kid digs about 9 to 10 blocks today. | v15 (decision 124) makes it 128 x 128 and about 20 blocks to dig. This feature set needs no more depth than that. It uses the bottom layers of the v15 world as "Diepe grond". |
| Terrain versions | A save is a diff against a fixed terrain (`TerrainVersion` 1 or 2, `generateTerrain`). Version 2 stamps villages only where the kid changed nothing. | The warning layer and the deep stones are stamped the same way, as a new terrain version, only into cells the kid never changed. No kid build is touched. |
| Kid builds are known | The world record is `diff`: every cell the kid changed. | The bubble monster can be kept off kid builds for real: a cell in the diff is the kid's. Village houses are not in the diff, so they need their own rule (village sites, `src/world/village-layout.ts`). |
| Blocks are free | The 32 building blocks are free and unlimited (PRD 4.1). The 8 rare blocks of v11 (ids 34 to 41, Dorp tab) are free and unlimited once a villager gave them (`docs/releases/v11.md`, In 12). There is no block inventory and no block price anywhere. Goudsteen and diamant are already normal free blocks. | "Duur" needs a new mechanism. See v20. |
| Parent switches | Instellingen in `src/ui/parent/settings-screen.ts`: cards with rows, each row a label and an Aan or Uit button (`makeToggleRow`). Values live in `SettingsRecord` (`src/storage/schema.ts`), read as on when missing (`!== false`). | New rows fit this pattern: one new card "Monsters en ridders". |
| Play time | The play timer runs only on the world screen, visible, landscape, parent area closed (`timerMatrix` in `src/core/timers.ts`). It stops for the learning break, the exam, the shop, the dino menu and the parent area. | "Elke 10 minuten" counts this same active play time, on its own clock. |
| Animals | Up to 25 dinos (`MAX_SHOP_DINOS`) and 10 chickens (`MAX_CHICKENS`). Modes Volg mij and Blijf hier, new animals start on Blijf hier (decision 122). Dinofluit calls every animal (114). Followers stay out of the view (112). 8 villagers. | Teasing sends an animal off for a few seconds, then it goes back to its own mode and spot. Knights are not animals and do not count toward 25 or 10. |
| Safety text | PRD 9 says villagers never break or place blocks. PRD 8 says no scary sounds, no angry dinos. | The PRD core needs a new "Monsters (since v16)" line in section 9 and section 8 at the first signoff. |

### 1.2 Release order and what each needs

| Release | The kid feels | Needs first | Size |
|---|---|---|---|
| v16 Monstermol | Warning stripes deep down. Dig past them and a silly mole comes up and teases my animals. I build a fence to stop him. | v15 (depth), v3 (backup) | M, 5 tasks |
| v17 Ridders | I buy a knight. He follows me, stays, or guards my animals, and chases the mole away. | v16 for the chase; buying and guarding work without it | M, 4 tasks |
| v18 Zwarte bubbel | Every 10 minutes a black bubble floats by. I tap it and Klodder jumps out and makes a mess, until my knight pops him back into his bubble. | v17 | M, 4 tasks |
| v19 Ridderuitrusting | Helmets, shields, capes, a pony and banners for my knights. They look great and win faster. | v17 | M, 4 tasks |
| v20 Diepe edelstenen | 8 new shiny stones deep below the warning stripes. I find one, then save up to buy it and build with it. | v15; best after v16 (the stripes) | S to M, 3 tasks |

Nothing depends on a later release. The mole can be stopped with a fence alone, so v16 ships before knights exist. The bubble monster can only be stopped by a knight, so v18 comes after v17. v20 can also ship with every monster switch off.

### 1.3 Rules for every monster (all releases)

* **Silly, not scary.** Cartoon shapes made of boxes, big googly eyes, bright colours on dark bodies. Sounds are giggles, boings and a "Boe!". No growl, scream, blood, teeth, death, sudden loud sound or jump scare. A monster never appears without a warning of at least 3 seconds (a rumble, a wobble, a shadow).
* **Never harms the kid.** A monster never touches, pushes, follows, traps or blocks the kid, and never takes points, dinos, eggs, chickens, knights, gear or found blocks.
* **Never harms an animal.** Teasing only. The animal jumps, plays its own sound, runs about 6 blocks away for about 3 seconds, then goes back to what it did (Blijf hier animals walk back to their spot, followers walk back behind the kid). It never runs into water, lava or a hole deeper than 1 block, and never leaves the world. Nothing about teasing is saved.
* **Knights win kindly.** A knight never kills or hurts. He pokes, tickles and shouts "Wegwezen!". The mole says "Oké, oké, ik ga al!" and digs back down. Klodder is popped back into a bubble that floats up and away with "Doei!". The knight never loses; gear only makes him faster.
* **Opt in by the kid.** The mole only comes when the kid digs past the warning stripes. Klodder only comes out when the kid taps the bubble. A bubble that is not tapped floats away and nothing happens.
* **One at a time.** At most one mole and at most one bubble or Klodder in the world. At most 3 knights.
* **Paused with the world.** A live monster stops and its clock stops whenever the play timer stops (learning break, exam, shop, dino menu, parent area, background, portrait).

### 1.4 Parent switches

A new card **"Monsters en ridders"** in Ouders > Instellingen, behind the pincode, like the other Aan or Uit rows. Each release adds its own row.

| Row | Release | Off means |
|---|---|---|
| Monsters en ridders (master) | v16 | Everything below acts as off; the rows below show greyed with their own value kept. |
| Monstermol (diep graven) | v16 | No warning text and no mole. The stripe blocks stay in the world as plain blocks. A live mole digs down at once. |
| Ridders | v17 | Knights leave the world (they march off with a wave) and the Ridders shop section hides. Every knight and every piece of gear stays in the save and comes back when the switch is on again. |
| Zwarte bubbel (elke 10 minuten) | v18 | No bubble. A live bubble floats away and a live Klodder pops into his bubble at once, and the blocks he broke come back (if MOQ4 is A). This row only works with Ridders on; with Ridders off it shows "Werkt alleen met Ridders aan", so Klodder can never be out without a way to stop him. |

v19 gear follows the Ridders row. v20 stones get no switch: they are blocks, not monsters (MOQ12). Nothing bought is ever lost by a switch. The default for new and existing installs is founder question MOQ1.

### 1.5 Saves and backup

* All new data stays on this iPad in IndexedDB, in one new kv record `monsters` plus 4 new settings fields. It holds: the bubble clock (ms of play left until the next bubble), the knights (kind, spot, mode, worn gear), the gear kast (v19), the found and bought deep stones (v20), the blocks Klodder broke that still have to come back (v18), and once only flags (the shop hint, MOQ6).
* A live mole, bubble or Klodder is not saved. After a reload it is gone. Blocks it broke that were due to come back come back at the next start.
* The v3 backup holds the `monsters` record and the new settings, and the restore check accepts them. A backup from before the release restores with no knights, no gear and no stones. Each release that adds fields says so in its own criterion.
* No personal data. No new text the kid types (knights get no names in these releases).

### 1.6 Speed on the iPad

The top project risk is 3D in iPad Safari, and v15 doubles the world. So: 1 mole, 1 Klodder, 3 knights at most. Each is at most 8 box meshes with shared geometry, gear merged into the knight mesh. Path checks look at most 24 blocks around and run at most every 2 seconds. Klodder breaks at most one block every 4 seconds, so at most one chunk rebuild per 4 seconds. Every release checks the AC101 frame target with its new things on screen next to a herd of 25.

---

## 2. v16 Monstermol

### 2.1 Goal
"Deep down there are warning stripes. If I dig past them anyway, a silly monster mole comes up and teases my animals. I can stop him by building a fence."

### 2.2 What the kid feels (kid's eye flow)
1. I dig a deep hole. A few blocks above the bottom a toast says "Pas op! Diep onder de grond woont de Monstermol."
2. I reach a layer of yellow and black striped blocks. When I mine one, a card says "Niet verder graven! Onder de streep slaapt de Monstermol." I tap OK.
3. I dig one more block below the stripes. The ground rumbles and the screen wobbles a little: "Oei... de grond rommelt!"
4. After 3 seconds a purple mole with big glasses and a pink nose pops out of the grass up top, near my hole. "Hihi! Waar zijn de dieren?"
5. He waddles slowly to my Triceratops. "Boe!" The Triceratops jumps, squeaks and runs off a bit, then walks back to its spot. The mole goes to the next animal.
6. I build a wall of blocks 2 high around my animals. The mole walks around it. "Hmpf! Ik kan er niet bij." He digs back into the ground and is gone.
7. Another time I build walls around the mole himself. Same thing: "Hmpf!" and he is gone.

### 2.3 In
1. **Diepe grond:** a layer of a new block **Waarschuwsteen** (yellow and black stripes, id 42) across the whole world at a fixed depth, about 5 layers above oersteen in the v15 world (the architect fixes the exact y after v15). Stamped as a new terrain version, only into cells the kid never changed. It can be mined and is not in the block grid (MOQ2).
2. **Two warnings:** the toast when the kid mines a block within 2 layers above the stripes (at most once per minute), and the card with OK when the kid mines a Waarschuwsteen (every time). Both in big kid text.
3. **Waking the mole:** mining any block below the stripes, with the Monstermol switch on and no mole out. A rumble of 3 seconds, then the mole pops up on the surface 4 to 10 blocks from the top of the kid's dig spot, never inside a kid build, never on water or lava. More digging while a mole is out does nothing new.
4. **The mole:** about 1 block tall, box made, silly. Walks at 1 block per second (the kid walks 4.3), steps up 1 block like a dino, cannot jump 2, cannot swim, never breaks or places blocks.
5. **Teasing:** the mole walks to the nearest dino or chicken it can reach (not villagers, not knights). Within 1.5 blocks it says "Boe!" with a wiggle. The animal jumps, plays its sound, runs about 6 blocks away for about 3 seconds and goes back to its mode (1.3). The mole picks the next nearest, never the same one twice in a row.
6. **Stopping him:** every 2 seconds the mole looks for a walking path to any animal within 24 blocks. When it finds none for 10 seconds in a row (a fence around the animals, or walls around the mole), it says "Hmpf! Ik kan er niet bij." and digs down, gone. A fence is any blocks at least 2 high; no special fence block is needed.
7. **No animals at all:** the mole looks around for 60 seconds, says "Niemand om mee te spelen..." and digs down.
8. **Safety valve:** the mole gets tired after 10 minutes of play time out, yawns "Ik ga slapen" and digs down (MOQ3).
9. **The parent card** "Monsters en ridders" with the master row and the Monstermol row (1.4).
10. **New sounds:** rumble, "Boe!", a squeak or chirp per animal kind when teased, "Hmpf!". All short and soft, under Volume and Geluidseffecten.
11. **Save, backup, version:** the new terrain version, the settings fields. A version bump and a CHANGELOG line in kid words.

### 2.4 Out
* Knights (v17). The bubble monster (v18).
* A mole that breaks blocks, digs tunnels, follows the kid or goes after villagers.
* More world depth than v15 gives.
* A special fence block or gate.
* Rare stones in the deep layer (v20).

### 2.5 Kid safety
* The mole only comes after two warnings and the kid's own dig. It never touches the kid, never breaks a block and never takes anything.
* Teased animals are never hurt, lost or sad. No text says an animal is scared or sad. The animal's own happy sound, not a cry.
* The parent can switch it off at any time; a live mole leaves at once.
* No new personal data, no network.

### 2.6 iPad notes
* The card OK button and the toast are at least 56 px and never cover the Hakken button.
* The rumble wobble is a small camera shake under 1 second, and off with reduced motion (a text only warning then).
* Path checks are bounded (1.6). The mole is one small mesh.
* The play timer stops while the warning card is open.

### 2.7 Open questions for the founder
MOQ1, MOQ2 and MOQ3 (section 7).

### 2.8 Size and task split
M, 5 tasks.
1. **V16a Diepe grond:** Waarschuwsteen block, terrain version stamp (diff safe), the two warnings, unit tests.
2. **V16b Mole life:** wake rule, spawn spot, walk, path check, give up rules, tired rule, unit tests on pure logic.
3. **V16c Teasing:** pick target, the run away step for dinos and chickens in `src/dinos/`, back to mode, sounds.
4. **V16d Mole in the world:** mesh, animations, speech bubbles, rumble, e2e.
5. **V16e Parent switches and save:** the card, settings fields, switch off behaviour, backup and restore check, version, speed check.

### 2.9 Acceptance criteria (draft)
* **MO16-1:** Given a new or existing world after v16, then a layer of Waarschuwsteen lies at the fixed depth everywhere the kid changed nothing, and every cell the kid changed is exactly as before (automated diff check).
* **MO16-2:** Given the kid mines a block 1 or 2 layers above the stripes, then the toast "Pas op! Diep onder de grond woont de Monstermol." shows, at most once per minute. Given the kid mines a Waarschuwsteen, then the card "Niet verder graven! Onder de streep slaapt de Monstermol." shows with OK, and the play timer stops until OK.
* **MO16-3:** Given the Monstermol switch on and no mole out, when the kid mines a block below the stripes, then "Oei... de grond rommelt!" shows and after 3 seconds (not sooner) one mole appears on the surface 4 to 10 blocks from the top of the dig spot, not on a kid changed cell, water or lava. Given a mole is out, when the kid mines below the stripes again, then no second mole appears.
* **MO16-4:** Given the switch off, when the kid mines below the stripes, then no warning text shows and no mole appears.
* **MO16-5:** Given a mole and 3 dinos in reach, then the mole walks at about 1 block per second to the nearest one. Within 1.5 blocks it says "Boe!", the dino jumps, plays a sound and moves about 6 blocks away within about 3 seconds, then a Blijf hier dino walks back to within 3 blocks of its spot and a Volg mij dino walks back behind the kid. The mole never picks the same animal twice in a row.
* **MO16-6:** Given any teasing, then no animal is removed, changes mode for good, loses anything, enters water or lava, or leaves the world, and the saved dinos record is the same before and after except positions (automated over 50 teases).
* **MO16-7:** Given the animals inside a closed wall 2 blocks high, then within 14 seconds the mole says "Hmpf! Ik kan er niet bij." and is gone. Given walls 2 high around the mole, then the same. Given a wall only 1 high, then the mole steps over it.
* **MO16-8:** Given a mole and no dinos or chickens, then after 60 seconds it says "Niemand om mee te spelen..." and is gone. Given a mole out for 10 minutes of play time, then it yawns "Ik ga slapen" and is gone (if MOQ3 is A).
* **MO16-9:** Given a mole, then it never breaks or places a block, never touches or pushes the kid, and never walks into a cell the kid stands in (automated).
* **MO16-10:** Given a mole and the learning break starts, then the mole stands still for the whole break and goes on after it. The same for the shop, the dino menu and the parent area.
* **MO16-11:** Given a mole out, when the parent switches Monstermol or the master off, then on return to the world the mole is gone at once. Given the master off, then the Monstermol row shows greyed and keeps its value.
* **MO16-12:** Given a mole out, when the app reloads, then no mole is there. Given a backup made after v16, then it restores the new settings. Given a backup from before v16, then it restores with the default settings of MOQ1.
* **MO16-13:** Given the mole and teasing on screen (automated), then no network request is made and no text or sound says an animal is hurt, scared or sad.
* **MO16-14:** Given a mole teasing a herd of 25 in view, when the founder walks around for 2 minutes with the fps counter, then the AC101 target holds (real iPad check).

---

## 3. v17 Ridders

### 3.1 Goal
"I have my own knight. He follows me, stays where I say, or guards my animals. When the mole comes, my knight chases him away."

### 3.2 What the kid feels
1. In the Dinowinkel there is a new section "🛡️ Ridders" with a Ridder card for 30 coins.
2. I tap Kopen, then Ja. A knight with a silver helmet marches into the world next to me with a little fanfare: "Ridder tot je dienst!"
3. I tap my knight. His menu has Volg mij, Blijf hier and Pas op de dieren.
4. I tap Pas op de dieren. He walks slow rounds among my animals near that spot.
5. I dig past the stripes. The mole comes up and waddles to my chickens. My knight sees him, runs to him and pokes him with his wooden sword. A bar fills up. "Wegwezen!" The mole says "Oké, oké, ik ga al!" and digs down.

### 3.3 In
1. **Ridders section** in the Dinowinkel, bought like an egg (`docs/SHOP_PRD.md` 4.3, 4.4): Kopen, Ja or Nee, the purchase lock, one transaction with a ledger row `reason: 'knight'`. Price and cap are MOQ7 (recommended: 30 coins each, at most 3, not counted in the herd of 25).
2. **Inruilen** a knight for half its price, like a dino. Worn gear goes back to the kast (v19).
3. **Knight in the world:** box made, about player height, a basic helmet, tabard and wooden sword. Walks at 3 blocks per second like a dino. Never breaks or places blocks, never pushes the kid, follows the rules of decision 112 when following (never takes a tap meant for the world).
4. **Knight menu** on tap: Volg mij, Blijf hier, Pas op de dieren. "Pas op de dieren" (begeleiden, MOQ8): the knight walks slow rounds within 8 blocks of the spot where it was set, among the animals there. A Volg mij knight guards the kid's followers.
5. **Seeing a monster:** a knight notices a mole within 8 blocks of himself (16 when on Pas op de dieren), runs to it, and pokes. A **Moed** bar over the mole fills at the knight's Kracht (1 per second without gear). The mole needs 15. Full: "Wegwezen!", the mole says "Oké, oké, ik ga al!" and digs down. Two knights fill the bar together. Afterwards the knight goes back to his mode.
6. The Dinofluit and Allemaal blijven do not move knights.
7. **The Ridders switch** in the parent card (1.4).
8. **Save, backup, version:** knights and their modes in the `monsters` record; the backup holds them; a version bump and a CHANGELOG line.

### 3.4 Out
* Gear (v19). Names for knights. Knights riding anything (v19).
* Knights fighting each other or anything other than a monster.
* Knights that build fences or carry animals.

### 3.5 Coins
One knight at 30 is about 3 breaks, so the first knight is reachable in one play session. Three knights cost 90. No coins are earned from knights or from beating monsters (a monster must never be a way to farm coins).

### 3.6 Kid safety
* Game coins only, no real money, no ads, no "buy more coins".
* A knight never hurts: no blood, no falling over, no death. The mole is never hit hard; pokes are soft with a "Tok!" sound.
* No text says the kid needs a knight. Nothing is lost without one.

### 3.7 iPad notes
* Knight menu buttons at least 56 px. A knight is one mesh of at most 8 boxes.
* Up to 3 knights plus 25 dinos plus 10 chickens plus a mole in view must meet AC101.

### 3.8 Open questions for the founder
MOQ7 and MOQ8.

### 3.9 Size and task split
M, 4 tasks.
1. **V17a Knight economy:** buy, cap, trade in, ledger, save record, backup and restore checks, unit tests.
2. **V17b Knight life:** modes, guard rounds, follow rules, unit tests.
3. **V17c Knight against the mole:** notice, run, Moed bar, win, unit tests and e2e.
4. **V17d Shop, menu, model and switch:** shop section, knight menu, mesh, the Ridders row, speed check.

### 3.10 Acceptance criteria (draft)
* **MO17-1:** Given the Dinowinkel and the Ridders switch on, then a section "Ridders" shows a Ridder card with name, picture and price. Given the switch off, then the section is hidden.
* **MO17-2:** Given 30 coins, when the kid taps Kopen on the Ridder and then Ja, then the coins are 0, one knight appears within 3 blocks of the kid and the ledger has one row `reason: 'knight'` with delta -30, in one transaction. Given Nee, then nothing changes. Given 10 taps on Ja in 1 second with 60 coins, then exactly one knight is bought.
* **MO17-3:** Given 3 knights, then the Ridder card says "Je hebt al 3 ridders!" and cannot be bought. Given 25 dinos and 10 chickens, then a knight can still be bought (if MOQ7 is A).
* **MO17-4:** Given a knight, when the kid taps it, then the menu shows Volg mij, Blijf hier and Pas op de dieren, and the chosen mode holds after a restart.
* **MO17-5:** Given a knight on Pas op de dieren, then over 2 minutes he never goes more than 8 blocks from his spot. Given a knight on Volg mij, then 40 world taps hit the knight 0 times, as decision 112 measures for dinos.
* **MO17-6:** Given a mole within 16 blocks of a knight on Pas op de dieren, then the knight runs to it and a Moed bar fills at 1 per second. After about 15 seconds the knight says "Wegwezen!", the mole says "Oké, oké, ik ga al!" and is gone, and the knight goes back to his mode. Given two knights, then it takes about half the time.
* **MO17-7:** Given any knight action, then no block is broken or placed, the kid is never pushed, and the mole never falls over, flashes red or shows a hurt word (automated text and colour check).
* **MO17-8:** Given a knight bought for 30, when the kid trades it in, then the kid gets 15 coins and the knight leaves.
* **MO17-9:** Given 2 knights, when the parent switches Ridders off, then no knight shows in the world. When it goes on again, then both are back with the same modes. Given the Dinofluit or Allemaal blijven, then knights do not change mode.
* **MO17-10:** Given a save from before v17, then it loads with no knights. Given a backup after v17, then the knights come back on an empty iPad. Given a backup from before v17, then it restores with no knights.
* **MO17-11:** Given 3 knights, 25 dinos and a mole on screen, then the AC101 target holds (real iPad check).

---

## 4. v18 Zwarte bubbel

### 4.1 Goal
"Every now and then a shiny black bubble floats by with a little monster inside. If I tap it, Klodder jumps out and makes a mess. My knight pops him back into his bubble."

### 4.2 What the kid feels
1. I am building. A shiny black bubble with two blinking eyes floats down in front of me with a soft "bloop".
2. I tap it. "Plop!" Out jumps Klodder, a small round black and purple monster with googly eyes. "Hihihi!"
3. Klodder hops to a tree and nibbles a leaf block away. Then he runs to my Compy: "Boe!" The Compy squeaks and runs off.
4. My knight sees him and runs over. Tok, tok, the Moed bar fills. "Wegwezen!" Klodder is back in his bubble and floats away: "Doei!" Plop plop plop, the blocks he broke come back.
5. Another time I do not tap the bubble. After a minute it floats up and away. Nothing happens.

### 4.3 In
1. **The bubble clock:** counts play time only (1.1), only with the bubble switch on and nothing of v18 out. At 10 minutes (MOQ11) a bubble comes. If a learning break is due in less than 60 seconds, the bubble waits until 30 seconds after the break. Saved, so a reload does not reset it.
2. **The bubble:** floats down 6 to 10 blocks in front of the kid at eye height and drifts slowly. A tap pops it in any mode (Hakken or Bouwen), before any block behind it. Not tapped in 60 seconds: it floats up and away and the clock starts again.
3. **Klodder:** small, round, silly, box made. Walks at 1.5 blocks per second. Every 4 seconds he breaks one block he can reach, then sometimes teases an animal (as in v16).
4. **Which blocks** (MOQ4, recommended A): only blocks the kid never changed (not in the world diff), never in a village site, never oersteen, water or lava, never a block under or next to the kid or an animal, and at most 20 per visit.
5. **Only a knight stops him:** a knight notices Klodder like the mole (v17) and fills a Moed bar; Klodder needs 30. Full: Klodder is popped into a bubble that floats away with "Doei!".
6. **Safety valves** (MOQ5): Klodder gets tired after 5 minutes of play time out, yawns, climbs into his bubble and floats away. After 20 broken blocks he only teases.
7. **Blocks come back** (MOQ4 A): when Klodder leaves for any reason, every block he broke comes back in place with a small "plop" each, unless the kid built in that cell since then.
8. **One hint** (MOQ6): the first time ever that Klodder is out and the kid has no knight, a small toast: "Een ridder kan Klodder stoppen. Ridders vind je in de Dinowinkel." Never again after that.
9. **The bubble switch** in the parent card, only working with Ridders on (1.4).
10. **Save, backup, version:** the bubble clock, the broken block list, the hint flag. A version bump and a CHANGELOG line.

### 4.4 Out
* More than one bubble or Klodder at a time. Bubbles on a schedule by clock time or date.
* Klodder breaking kid builds, village houses or blocks under the kid.
* Coins or prizes for beating Klodder.
* Klodder stopped by a fence (founder: only the knight).

### 4.5 The pressure question, said plainly
The founder wants "the only way to stop him is to buy the knight". Coins only come from learning, never from money, so this is not a purchase risk. It is a pressure mechanic: a kid with no knight watches a monster make a mess and is nudged to spend. Four things keep it kind: the kid chooses to tap the bubble, the first knight costs about 3 breaks, Klodder tires after 5 minutes and breaks at most 20 blocks, and the blocks come back. The parent can switch it off. The founder decides MOQ4, MOQ5 and MOQ6.

### 4.6 Kid safety
* Nothing comes out unless the kid taps. Klodder never touches the kid and never takes anything.
* With MOQ4 A, nothing the kid built is ever broken and every broken block comes back.
* No coins or rewards for monsters, so there is no reason to farm them.

### 4.7 iPad notes
* The bubble is at least 80 px on screen so it is easy to tap. A tap on the bubble never also mines.
* One block break per 4 seconds is one chunk rebuild. Restoring 20 blocks happens over about 2 seconds, not in one frame.

### 4.8 Open questions for the founder
MOQ4, MOQ5, MOQ6 and MOQ11.

### 4.9 Size and task split
M, 4 tasks.
1. **V18a Bubble clock:** play time clock, the break rule, save, unit tests.
2. **V18b Bubble and Klodder life:** bubble float and tap, Klodder walk, block pick rules, cap, tired rule, restore list, unit tests.
3. **V18c Knight against Klodder and the hint:** Moed 30, pop into bubble, the one time hint, e2e.
4. **V18d Model, sounds, switch, save:** meshes, sounds, the bubble row, backup and restore checks, version, speed check.

### 4.10 Acceptance criteria (draft)
* **MO18-1:** Given the bubble switch and Ridders on, after 10 minutes of play time a bubble appears 6 to 10 blocks in front of the kid. Time in a learning break, exam, shop, dino menu, parent area or the background does not count (automated with the timer hooks).
* **MO18-2:** Given the bubble is due and a learning break is due in under 60 seconds, then the bubble waits and comes 30 seconds after the break ends.
* **MO18-3:** Given a bubble, when the kid taps it in Hakken or Bouwen mode, then it pops, Klodder appears and no block is mined or placed by that tap. Given no tap for 60 seconds, then the bubble floats away and nothing else happens.
* **MO18-4:** Given Klodder out for 2 minutes (automated), then every broken block was a cell not in the world diff, outside every village site, not oersteen, water or lava, and not under or next to the kid or an animal, and he broke at most one block per 4 seconds and at most 20 in total.
* **MO18-5:** Given a knight in reach, then the knight runs to Klodder and after about 30 seconds Klodder is in a bubble that floats away with "Doei!". Given MOQ4 A, then within 3 seconds every block he broke is back, except cells the kid built in since.
* **MO18-6:** Given no knight, then Klodder yawns and floats away after 5 minutes of play time out, and the blocks come back (MOQ4 A, MOQ5).
* **MO18-7:** Given no knight and Klodder out for the first time ever, then the hint toast shows once. Given a later Klodder, then it never shows again.
* **MO18-8:** Given Ridders off, then the bubble row says "Werkt alleen met Ridders aan" and no bubble comes. Given Klodder out, when the parent switches the bubble, Ridders or the master off, then Klodder is gone at once on return and the blocks come back.
* **MO18-9:** Given Klodder has broken 5 blocks, when the app reloads, then Klodder is gone and the 5 blocks are back. Given the bubble clock at 4 minutes left, when the app reloads, then it still has about 4 minutes left. Given a backup after v18, then it holds the bubble clock and the hint flag; a backup from before v18 restores with a fresh clock.
* **MO18-10:** Given Klodder out, then he never touches the kid, the kid's points and herd do not change, and no coins are given for beating him (automated).
* **MO18-11:** Given Klodder, 3 knights and 25 dinos on screen, then the AC101 target holds (real iPad check).

---

## 5. v19 Ridderuitrusting

### 5.1 Goal
"My knights get cool gear: helmets, shields, capes, a pony, banners. They look great and they win faster."

### 5.2 What the kid feels
1. The Ridders section in the Dinowinkel has a new row "⚔️ Uitrusting" with cards, cheapest first.
2. I buy a Pony for 50 coins. It goes into my wapenkast.
3. I tap my knight and tap Uitrusten. I see my knight big, and the wapenkast below. I tap the Pony. My knight sits on a pony now.
4. The mole comes. My knight on his pony gets there much faster and the Moed bar fills faster.

### 5.3 In
1. **Gear catalog** (MOQ9), 21 items in 8 slots. Kracht adds to the knight's base Kracht of 1 (the Moed bar fills at Kracht per second; v17 and v18).

| Slot | Item (Dutch) | Coins | Does |
|---|---|---|---|
| Hoofd | Leren kap | 10 | Kracht +1 |
| Hoofd | IJzeren helm | 25 | Kracht +2 |
| Hoofd | Pluimhelm | 45 | Kracht +3 |
| Hoofd | Gouden helm | 80 | Kracht +4 |
| Schild | Houten schild | 10 | Kracht +1 |
| Schild | IJzeren schild | 30 | Kracht +2 |
| Schild | Drakenschild | 60 | Kracht +3 |
| Hand | Houten zwaard | 10 | Kracht +1 |
| Hand | Kietelveer | 20 | Kracht +2, monsters giggle |
| Hand | Glimzwaard | 50 | Kracht +3, sparkles |
| Hand | Bubbelstaf | 75 | Kracht +4, blows bubbles |
| Lijf | Maliënkolder | 30 | Kracht +2 |
| Lijf | Glanzend harnas | 70 | Kracht +4 |
| Rug | Riddercape | 15 | Kracht +1 |
| Rug | Koningscape | 40 | Kracht +2 |
| Voeten | Snelle laarzen | 20 | Speed +1 block per second |
| Rijdier | Pony | 50 | Speed +1.5 |
| Rijdier | Strijdpaard | 90 | Speed +2.5, Kracht +1 |
| Rijdier | Rij-triceratops | 120 | Speed +2, Kracht +3 |
| Vlag | Banier | 25 | Notices monsters 4 blocks further |
| Vlag | Koningsbanier | 55 | Notices 6 blocks further, Kracht +1 |

   One of each costs 930. The best item in every slot for one knight costs 520 and gives Kracht 22: the mole goes in under 1 second and Klodder in under 2. A bare knight takes 15 and 30 seconds.
2. **One item, one knight**, like the hats of v12 (GLQ12-2): a bought item is one thing in the wapenkast, worn by one knight at a time, moved for free. One item per slot.
3. **Uitrusten** in the knight menu: the knight big with a live preview, the wapenkast below, tap to wear, tap again to take off.
4. **Gear shows in the world** on the knight, merged into one mesh. A mount carries the knight.
5. **Buying** as in v17, ledger `reason: 'gear'`. Too few coins: greyed with "Nog X punten nodig".
6. **Inruilen** a knight puts his gear back in the wapenkast. Switching Ridders off keeps all gear.
7. **Save, backup, version.**

### 5.4 Out
* Gear for dinos (that is v12 hats). Selling gear back for coins. Gear that wears out or breaks.
* Gear that changes how the knight looks beyond the item itself (no colours in v19).
* Unlocks by date.

### 5.5 Coins
The ceiling of GAME_LOOP_PRD 1.3 is 60 coins. 6 items cost more (70 to 120). That breaks the ceiling on purpose: the founder asked for a wide range that makes knights stronger, and a few big goals keep coins worth earning. A 120 coin mount is about 12 to 15 breaks. Nothing is needed: a bare knight still wins every time. MOQ9.

### 5.6 Kid safety
* Swords and staves only poke, tickle and blow bubbles. No blood, no harm.
* Nothing wears off, nothing is needed, no text says a knight is weak or sad.

### 5.7 iPad notes
* Up to 8 items on each of 3 knights, merged meshes. Cards and kast tiles at least 56 px.

### 5.8 Open questions for the founder
MOQ9.

### 5.9 Size and task split
M, 4 tasks.
1. **V19a Gear economy:** catalog data, buy, wapenkast, one item one knight, Kracht and speed sums, save, backup, unit tests.
2. **V19b Shop row and Uitrusten screen:** shop cards, knight menu button, preview, e2e.
3. **V19c Gear in the world:** attach points, mounts, mesh merge, speed check.
4. **V19d Effects:** Kracht, speed and range in the knight logic, the giggle and bubble effects, unit tests.

### 5.10 Acceptance criteria (draft)
* **MO19-1:** Given the Ridders switch on, then the Dinowinkel shows "Uitrusting" with the 21 items cheapest first, each with name, picture, slot and price.
* **MO19-2:** Given 50 coins, when the kid buys the Pony with Ja, then the coins are 0, the wapenkast holds one Pony and the ledger has one row `reason: 'gear'` with delta -50, in one transaction. Given 10 taps on Ja in 1 second, then one is bought.
* **MO19-3:** Given one Pluimhelm worn by knight A, when the kid puts it on knight B, then B wears it and A does not, and the wapenkast still counts one.
* **MO19-4:** Given a knight with an IJzeren helm (+2) and a Houten schild (+1), then his Kracht is 4 and he sends a mole off in about 15 / 4, under 4 seconds. Given a Pony, then he walks at about 4.5 blocks per second.
* **MO19-5:** Given a knight wearing items in all 8 slots, then each item shows on him in the world (screenshot check).
* **MO19-6:** Given a knight wearing 3 items, when the kid trades him in, then the 3 items are back in the wapenkast.
* **MO19-7:** Given a save or backup from before v19, then it loads with an empty wapenkast. Given a backup after v19, then the wapenkast and worn gear come back.
* **MO19-8:** Given 3 knights wearing 8 items each and 25 dinos, then the AC101 target holds (real iPad check).

---

## 6. v20 Diepe edelstenen

### 6.1 Goal
"Deep under the warning stripes there are 8 new shiny stones. When I find one, I can save up to buy it, and then build with it as much as I like."

### 6.2 What the kid feels
1. Below the stripes I see a glowing blue stone. I mine it. "Je hebt Maansteen ontdekt!"
2. In Alle blokken there is a new tab "Diep" with 8 tiles. Maansteen shows its picture with a little lock and "Koop in de Dinowinkel".
3. In the Dinowinkel, a new section "💎 Edelstenen" shows the Maansteen for 80 coins. I save up and buy it.
4. Now Maansteen is in my Diep tab for good. I build a shiny tower with it.

### 6.3 In
1. **8 new blocks** (ids 43 to 50): Maansteen 80, Zonnesteen 100, Jade 120, Opaal 150, Topaas 180, Parelsteen 220, Drakensteen 300, Mollengoud 400. One of each costs 1550.
2. **Veins in the Diepe grond:** a few small veins of each below the stripes, stamped in the same new terrain way (diff safe). Mining one marks it found ("Je hebt X ontdekt!").
3. **How they become expensive** (MOQ10, recommended B): a found stone shows as a card in the Edelstenen section. Buying it once unlocks it for good, free and unlimited like every other block (PRD 4.1). A stone not found yet shows as a "?" card that cannot be bought.
4. **Diep tab** in Alle blokken with 8 tiles and "N van de 8 gekocht". Found but not bought: picture, lock, "Koop in de Dinowinkel". Not found: "?" and "Ergens diep onder de grond".
5. Found and bought stones stay after "Wereld opnieuw beginnen", like the v11 rare blocks.
6. **Save, backup, version.**

### 6.4 Out
* Stones bought per piece with a count (that needs a block inventory, a much bigger change; MOQ10 C).
* Selling stones for coins. Stones as a coin source.
* A switch for stones (MOQ12).

### 6.5 Coins
80 to 400 breaks the 60 coin ceiling of GAME_LOOP_PRD 1.3 on purpose: the founder asked for expensive stones. 400 is about 40 to 50 breaks, a long goal like the Regenboogsaurus (300). Nothing is needed to play.

### 6.6 Kid safety
Nothing new. Finding a stone below the stripes may wake the mole (v16), which is the fun of it. With the mole off the stones are still there.

### 6.7 Size and task split
S to M, 3 tasks.
1. **V20a Blocks and veins:** 8 block ids, textures, terrain stamp, found list, unit tests.
2. **V20b Shop section and Diep tab:** cards, buy once, unlock, e2e.
3. **V20c Save, backup, version, iPad check.**

### 6.8 Acceptance criteria (draft)
* **MO20-1:** Given a world after v20, then each of the 8 stones lies in at least 2 veins below the stripes, only in cells the kid never changed.
* **MO20-2:** Given the kid mines a Maansteen for the first time, then "Je hebt Maansteen ontdekt!" shows, the Diep tab shows it with a lock, and the Edelstenen card can be bought.
* **MO20-3:** Given a stone not found, then its card is a "?" and cannot be bought. Given 79 coins and Maansteen found, then the card is greyed with "Nog 1 punt nodig".
* **MO20-4:** Given 80 coins, when the kid buys Maansteen with Ja, then the coins are 0, a ledger row `reason: 'stone'` with delta -80 is written in one transaction, and Maansteen can be picked and placed without limit.
* **MO20-5:** Given 2 bought stones, when the parent does "Wereld opnieuw beginnen", then both are still bought and found.
* **MO20-6:** Given a save or backup from before v20, then it loads with no stones found. Given a backup after v20, then found and bought stones come back.

---

## 7. Open questions for the founder

* **MOQ1: Default for the monster switches.** A (recommended): on for new and existing installs. The founder asked for it, every monster needs the kid's own action (digging past two warnings, tapping a bubble), and the parent can switch off. B: off until the parent switches on, so no kid meets a monster the parent did not choose. C: on for new installs, off for existing ones.
* **MOQ2: Who owns the depth?** A (recommended): v15 Grote wereld owns all depth (about 20 blocks). v16 adds no depth, only the stripe layer about 5 layers above oersteen. B: v16 makes the world deeper still, which means raising the ground and costs speed and a bigger world change. C: put the stripe layer into v15 itself, which makes v15 bigger before its speed test.
* **MOQ3: Does the mole also leave by himself?** The founder named three ways (fence, trap, knight). A (recommended): also after 10 minutes he gets tired, so a kid who cannot build a fence is never stuck with him. B: only the three ways.
* **MOQ4: Blocks Klodder breaks.** A (recommended): only blocks the kid never changed and not in villages, at most 20 per visit, and all come back when he leaves. B: the same blocks, but gone for good. C: any block except within 8 blocks of the start spot, gone for good.
* **MOQ5: Safety valve when the kid has no knight.** A (recommended): all of these: he tires after 5 minutes, at most 20 blocks, the first knight costs 30. B: only the cap of 20 blocks. C: none, the knight is the only way.
* **MOQ6: The hint to buy a knight.** A (recommended): one toast the first time ever. B: a toast every time Klodder is out and there is no knight (more pressure). C: no hint at all.
* **MOQ7: Knight price, count and herd cap.** A (recommended): 30 coins each, at most 3, not counted in the 25. B: rising prices 30, 60, 90. C: knights count toward the 25.
* **MOQ8: What "begeleiden" means.** A (recommended): Pas op de dieren, the knight guards the animals around a spot, and a following knight guards the followers. B: the kid picks one dino and the knight walks beside it. C: both, which adds a task.
* **MOQ9: The gear list and prices.** A (recommended): the 21 items of 5.3, 10 to 120 coins, one item one knight. B: cap at 60 coins (drop the 6 most expensive items). C: fewer slots (helmet, shield, sword, cape, mount) for a smaller first release.
* **MOQ10: How rare stones become expensive.** A: buy once in the Dinowinkel, no finding needed. B (recommended): find it deep below the stripes, then buy it once; after that unlimited. Depth matters and the mole adds tension. C: buy per piece with a count; needs a block inventory, a bigger release. D: find deep only, free; then they are not expensive.
* **MOQ11: How often the bubble comes.** A (recommended): every 10 minutes of play, fixed, as asked. B: a parent choice of 10, 15 or 20 minutes in the bubble row.
* **MOQ12: A switch for the stones and the stripes.** A (recommended): none; they are blocks, and the mole switch already stops the warnings. B: a "Diepe edelstenen" row too.
* **MOQ13: Order.** A (recommended): v16, v17, v18, v19, v20 after v15, the founder picking each at `/release`. B: v20 first after v15, as a calm release, with the stones lying deep without stripes until v16.
