# Product doc: Game loop releases (v12 Dino-Hoed, v13 Dino-Eten, v14 Bouw-Opdracht)

**Status:** Draft, not signed. Each release moves into docs/PRD.md section 12 and is signed there when the founder picks it at /release.

**Companion to:** `docs/PRD.md` (the signed core) and `docs/SHOP_PRD.md` (the Dinowinkel). Backlog entries: `docs/BACKLOG.md`, sections v12, v13 and v14. All three are candidates after v6.

**Audience:** one kid of 8 to 10 (groep 5 to 7), Dutch, Safari on the family iPad, landscape.

**Criteria ids:** this doc uses draft ids (GL12-1, GL13-1, GL14-1, ...). They get real AC numbers only when a release is scoped into PRD section 12, so they never clash with the numbers of v3 and v6.

---

## 1. The game loop

**Goal:** learning earns coins, coins buy fun, fun pulls kids back to learning.

Today the loop has one weak spot. Once a kid owns a big herd, coins pile up and stop meaning much. These three releases give coins new, happy uses (hats, food) and one new way to earn them that is itself learning (building to a sum).

### 1.1 Coin sources today (checked in the code on 2026-11-06)

| Source | Coins | Where |
|---|---|---|
| Learning break | +2 first try, +1 second try, +3 when every question was right first try. A mistake costs 0 or 1 by the parent's Punten setting (Makkelijk, Normaal, Moeilijk). Default: 5 questions every 5 minutes of play, so at most 13 per break. | `src/core/economy.ts`, `src/storage/schema.ts` |
| Extra oefenen | Same per answer, no +3 bonus, **no day limit** since v10. | `src/app/practice-flow.ts`, AC52 |
| Exam | A golden egg, no coins. | PRD 4.11 |
| Villager question (v11) | A rare block and a dance, **no coins**. | PRD 4.x Dorp, v11 Out |
| Inruilen | Half the price back for a dino or chicken. | `docs/SHOP_PRD.md` |

A typical kid gets about 8 to 10 coins per break, so about 60 to 100 coins in an hour of play with some Extra oefenen.

### 1.2 Coin sinks today

| Sink | Price |
|---|---|
| Dino eggs | 20 (Compy) to 300 (Regenboogsaurus). One of each of the 14 kinds costs 1930. |
| Chicken | 5, at most 10. |
| Dinofluit | 60, once. |

The herd is capped at 25. After that the only sink is trade in and buy again, which loses half each time.

### 1.3 How the new sinks keep balance without a grind

* **Price ceiling:** nothing new costs more than 60 coins, about 5 breaks or one long play session. The cheapest thing (5 coins) is less than one break.
* **Nothing is ever needed.** No hat, food or build is required to keep a dino happy or to play. A dino that never gets a hat or a snack looks and acts exactly as it does today.
* **No decay, no timers that punish.** Nothing wears off, spoils, runs out or gets sad over time.
* **Hats scale with the herd.** One bought hat is worn by one dino at a time, so a big herd gives a long, slow sink, not a 190 coin one off.
* **Food is a small repeat sink with a cap** on what the bag can hold, so a kid cannot burn 200 coins in a frenzy.
* **The one new source (v14 builds) is learning.** It pays about the same per minute as a break, so it never beats learning breaks as the way to earn.
* **No new item unlocks by calendar days.** New hats unlock by learning done, so there is no reason to log in every day.

---

## 2. v12 Dino-Hoed

### 2.1 Goal
"I dress up my dinos, and every dino looks different." A cheap, happy coin sink that keeps learning coins worth earning after the herd is full.

### 2.2 What the kids get (kid's eye flow)
1. I open the Dinowinkel and see a new section "🎩 Hoedjes" with 8 cards: a picture, a name and a price.
2. I tap Kopen on the party hat (5 coins). The shop asks "Wil je een Feesthoed kopen voor 5 punten?" I tap Ja. The coins go down and the toast says "Hoera! De Feesthoed ligt in je kast."
3. I go back to the world and tap my Compy. The dino menu has a new button "Aankleden".
4. I tap Aankleden. I see my Compy big in the middle and my kast (wardrobe) below it with the things I own. I tap the Feesthoed and it sits on my Compy right away. I tap a colour dot to make it blue.
5. I tap Klaar. My Compy walks around the world with a blue party hat. It does a little hop.
6. Later I move the hat to my T-rex. The Compy has no hat now, the T-rex has it.
7. After a few more learning breaks the shop shows a new card with a "Nieuw!" sticker: a Toverhoed.

### 2.3 In
1. **Catalog of 8 items, cheapest first:** Feesthoed 5, Strik 8, Zonnebril 12, Pet 15, Bloemenkrans 20, Cape 30, Piratenhoed 40, Kroon 60. One of each costs 190.
2. **3 slots per dino:** Hoofd (feesthoed, strik, pet, bloemenkrans, piratenhoed, kroon), Ogen (zonnebril), Rug (cape). A dino wears at most one item per slot, so up to 3 at once.
3. **One item, one dino.** A bought item is one thing in the kast. It is worn by one dino at a time. The kid can buy more of the same item. Moving an item to another dino is free.
4. **Colour:** each item has 3 free colour choices (dots under the preview). The colour is saved per worn item.
5. **Buying** works like an egg (`docs/SHOP_PRD.md` 4.3 and 4.4): Kopen, then Ja or Nee, the purchase lock, one transaction for points, kast and a ledger row with `reason: 'hat'`. Too few coins: greyed, a bar and "Nog X punten nodig".
6. **Aankleden** in the dino menu (next to Volg mij, Blijf hier, Naam geven, Knuffel). It opens the kast for that dino with a live preview. Golden dinos can wear items too. Chickens cannot (out).
7. **Items show in the world** on all 14 kinds and the golden dino, sized to each kind.
8. **New items now and then:** 6 extra items (Toverhoed, Koksmuts, Zomerhoed, Sjaal, Ridderhelm, Astronautenhelm) unlock one at a time, one after every 5 finished learning breaks or Extra oefenen rounds. A new card gets a "Nieuw!" sticker until the kid opens the shop once. Prices 15 to 45. The shop says "Nog 3 rondes tot iets nieuws" in small text. (Founder question GLQ12-1.)
9. **Inruilen** a dino that wears items puts the items back in the kast. They are never lost.
10. **Save, migration and backup:** the kast, the worn items and the unlock count are saved. An old save loads with an empty kast. The v3 backup holds them and the restore check accepts them. A backup from before v12 still restores (empty kast).
11. A version bump and a CHANGELOG line.

### 2.4 Out
* Dino body paint and skins ("dino skins" stays in Later).
* Hats on chickens, villagers or the player.
* Selling items back for coins.
* Items that change how a dino moves or acts.
* Unlocks by date, season or holiday.

### 2.5 Coins
* Prices 5 to 60 for the base 8, 15 to 45 for the 6 unlockable ones. Total for one of each: 190 + 180 = 370.
* Dressing a herd of 25 with one head item each is about 400 to 600 coins. A slow sink with a big herd, a short one with a small herd.
* No coins are earned from hats.

### 2.6 Kid safety
* Game coins only. No real money, no ads, no link out, no "buy more coins".
* No guilt: a dino without a hat is just as happy. No message ever says a dino wants or misses a hat.
* No streak pressure: new items unlock by rounds done, never by days in a row. Nothing expires.
* No new personal data. Item names are fixed text from the app.

### 2.7 iPad notes
* Cards, Kopen, Ja, Nee, colour dots and kast tiles are at least 56 px. The preview is big enough to see the item on a Compy.
* Everything works offline; nothing is downloaded.
* Items are a few small boxes per dino, merged into the dino mesh, so 25 dressed dinos stay smooth on the family iPad. Each kind needs a head, eye and back point (a size table, like `src/dinos/kinds.ts`).
* Save format change: it comes after the v3 backup (0.6.0), so the backup holds the kast from day one.
* The play timer stops while the Dinowinkel or Aankleden is open (like AC23).

### 2.8 Open questions for the founder
* **GLQ12-1: How do new items appear?** A (recommended): one unlocks after every 5 finished rounds of learning, so learning brings the surprise. B: on fixed dates (a new item each week), which gives a reason to log in daily, close to streak pressure. C: all 14 from the start, no surprises.
* **GLQ12-2: One item for one dino, or buy once and every dino can wear it?** A (recommended): one item, one dino; a bigger herd means a longer sink and buying a second crown feels real. B: buy once, any number of dinos wear it; simpler, but the whole sink is only 370 coins.
* **GLQ12-3: Colours.** A (recommended): 3 free colours per item. B: no colours in v12. C: colours cost a few coins each.

### 2.9 Size and task split
S to M, 3 tasks.
1. **V12a Kast and economy:** item data, buy rules, unlock count, save record, migration, backup and restore checks, unit tests.
2. **V12b Hoedjes in de winkel and Aankleden:** shop section, dino menu button, kast screen with preview and colours, e2e.
3. **V12c Items in the world:** attach points per kind, mesh merge, the hop, speed check with 25 dressed dinos, iPad check.

### 2.10 Acceptance criteria (draft)
* **GL12-1:** Given the Dinowinkel, then a section "Hoedjes" shows the 8 base items cheapest first with name, picture and price, plus each unlocked extra item.
* **GL12-2:** Given 20 coins, when the kid taps Kopen on the Bloemenkrans and then Ja, then the coins are 0, the kast holds one Bloemenkrans and the ledger has one row `reason: 'hat'` with delta -20, all in one transaction. Given Nee, then nothing changes.
* **GL12-3:** Given 7 coins, then the Strik card (8) is greyed with a bar and "Nog 1 punt nodig", and Kopen cannot be tapped.
* **GL12-4:** Given 45 coins, when the kid taps Ja 10 times in 1 second on the Piratenhoed (40), then exactly one is bought and 5 coins are left.
* **GL12-5:** Given a hatched dino, when the kid taps it, then the menu shows Aankleden. Given a chicken, then it does not.
* **GL12-6:** Given the kid owns one Kroon worn by dino A, when the kid puts it on dino B, then B wears it, A wears no Kroon, and the kast still counts one Kroon.
* **GL12-7:** Given a dino wearing a Pet, when the kid puts a Kroon on it, then the Pet goes back to the kast (one Hoofd item at a time). Given a Zonnebril and a Cape too, then the dino shows all three.
* **GL12-8:** Given a worn item set to blue, when the app restarts, then the same dino wears the same item in blue.
* **GL12-9:** Given any of the 14 kinds or a golden dino wearing one item in each slot, then each item shows on the head, eyes or back of that dino in the world (screenshot check per kind).
* **GL12-10:** Given a dino wearing 2 items, when the kid trades it in, then both items are back in the kast.
* **GL12-11:** Given 4 finished rounds since the last unlock, when the kid finishes a 5th break or Extra oefenen round, then the next extra item appears in the shop with "Nieuw!". Given the kid opens the shop, then the sticker is gone next time. No unlock depends on the date.
* **GL12-12:** Given a save from before v12, when the app loads, then nothing is lost and the kast is empty. Given a backup made after v12, when it is restored on an empty iPad, then the kast and worn items come back. Given a backup from before v12, then it restores with an empty kast.
* **GL12-13:** Given 25 dinos each wearing 3 items, when the founder walks around for 2 minutes with the fps counter, then 95 percent of frames take 33 ms or less and no frame takes over 200 ms, the same target as AC101 (real iPad check).
* **GL12-14:** Given the kid opens the shop and the kast, then no text says a dino is sad, wants or misses an item, and no network request is made (automated).

---

## 3. v13 Dino-Eten

### 3.1 Goal
"I feed my dinos their favourite snack and they skip with hearts." A small repeat coin sink with a Rekenen sum on the side. No dino can ever starve.

### 3.2 What the kids get (kid's eye flow)
1. In the Dinowinkel I see the Snackkar: a food truck card with 4 snacks and a price board: "1 bes = 2 munten".
2. I tap "3" under Bessen. The truck asks "3 bessen van 2 munten. Hoeveel munten is dat?" with three big answers: 5, 6, 8.
3. I tap 6. "Goed gerekend! Je krijgt er 1 bes gratis bij." Then: "Wil je 3 bessen kopen voor 6 punten?" Ja. Now 4 bessen are in my Voertas.
4. Back in the world, I tap the new Voertas button. A tray with my snacks slides up at the bottom.
5. I drag a bes up onto my Compy. Compy loves bessen: it skips, spins and hearts fly up. A little bubble says "Mmm, bessen!"
6. I drag a bes onto my Triceratops. It likes varens best, but it eats the bes happily and one heart floats up.
7. When 3 of my dinos have had a snack today, a toast says "Je kudde smikkelt! +3 punten."

### 3.3 In
1. **4 snacks:** Bessen 2, Varens 2, Vis 3, Dinokoekje 5. The Dinokoekje is every dino's favourite.
2. **Each kind has a favourite:** Compy and Regenboogsaurus: Bessen. Triceratops, Stegosaurus, Brachiosaurus, Pachycephalosaurus, Parasaurolophus, Ankylosaurus: Varens. Velociraptor, Dilophosaurus, Spinosaurus, T-rex, IJsraptor, Lavarex: Vis. A golden dino likes what its kind likes.
3. **Snackkar** as a section of the Dinowinkel, drawn as a food truck. Buy 1, 3 or 5 of a snack. (Founder question GLQ13-1 about a truck in the world.)
4. **Price sum:** for 3 or 5 pieces, the kid picks the total from 3 big choices before the usual Ja or Nee. A right first pick gives 1 free piece. A wrong pick shows "Bijna! 3 x 2 = 6" and goes on to Ja or Nee at the right price. The price never changes and nothing is lost. For 1 piece there is no sum. The sums are tafels of 2, 3 and 5 up to 25.
5. **Voertas:** a HUD button (56 px or more) that opens a tray with each snack and its count. The bag holds at most 10 of each snack. At 10 the buy button says "Je voertas is vol".
6. **Feeding:** drag a snack from the tray onto a dino in the world. Or tap a snack, then tap a dino (for kids who find dragging hard). Dropping on empty ground puts the snack back.
7. **Reactions:** a favourite snack gives a skip, a spin and a burst of hearts. Any other snack is eaten happily with one heart. A dino never refuses food.
8. **Full tummy:** after 3 snacks a dino says "Ik zit vol! Straks weer." for 2 minutes of play, and the snack stays in the bag. Nothing is used up or lost.
9. **Smikkel-bonus:** once per play day, when 3 different dinos have eaten (or all of them, if the kid has fewer than 3), +3 coins with a ledger row `reason: 'snack-bonus'`. (Founder question GLQ13-2.)
10. **Save, migration and backup:** the bag, the full tummy timers and the bonus day are saved. An old save loads with an empty bag. The v3 backup holds them; older backups still restore.
11. A version bump and a CHANGELOG line.

### 3.4 Out
* Hunger, health, sickness or any meter that goes down over time.
* Food for chickens or villagers.
* Food that changes what a dino can do.
* A food truck in the world (later, if the founder wants it).
* A bonus that grows with days in a row.

### 3.5 Coins
* Snacks cost 2 to 5. Feeding 3 favourites a day costs about 6 to 9 coins. With the +3 bonus, the daily net sink is about 3 to 6 coins.
* The bag cap (10 of each) limits one shopping spree to at most 120 coins.
* The free piece for a right sum is worth 2 to 5 coins at most, once per purchase.

### 3.6 Kid safety
* Game coins only. No real money, no ads.
* **No dino ever gets sick, sad, hungry or dies.** A dino that is never fed looks and acts exactly as it does today. No text ever says a dino is hungry, misses you or needs food.
* No guilt and no streak: the bonus is once a day, the same every day, never counts days in a row, and nothing reminds the kid to come back.
* A wrong price sum never costs coins and never blocks the purchase.

### 3.7 iPad notes
* Snack buttons, answer choices, Ja and Nee are at least 56 px. Tray icons are at least 64 px so a drag starts easily.
* Drag on touch: a drag that starts on a tray icon never turns the view. The dino under the finger lights up when the snack is over it. Tap then tap does the same as a drag.
* Everything works offline.
* Save format change: after the v3 backup (0.6.0).
* The play timer stops while the shop is open. It keeps running while the Voertas tray is open, since that is play in the world.

### 3.8 Open questions for the founder
* **GLQ13-1: Where is the food truck?** A (recommended): a Snackkar section in the Dinowinkel, drawn as a truck; fits in 3 tasks. B: a real truck in the world near the start spot that the kid walks to; more fun, about one task more.
* **GLQ13-2: The daily Smikkel-bonus.** A (recommended): +3 once a day, flat, no streak, no reminder. B: no bonus at all, so food is pure fun and pure sink. C: bigger (+5), which makes feeding cost almost nothing and stops it being a sink.
* **GLQ13-3: The free piece for a right sum.** A (recommended): keep it, a small reward for Rekenen. B: no reward, the sum is just there.

### 3.9 Size and task split
S to M, 3 tasks.
1. **V13a Snack rules and save:** snacks, favourites, bag cap, full tummy, bonus, price sum maker, save record, migration, backup checks, unit tests.
2. **V13b Snackkar:** shop section, buy 1, 3 or 5, the sum step, Ja or Nee, e2e.
3. **V13c Voertas and feeding:** HUD button, tray, drag and tap feeding, skip and hearts, iPad check of the drag.

### 3.10 Acceptance criteria (draft)
* **GL13-1:** Given the Dinowinkel, then the Snackkar shows Bessen 2, Varens 2, Vis 3 and Dinokoekje 5 with buttons 1, 3 and 5.
* **GL13-2:** Given 10 coins, when the kid taps 3 under Bessen, picks 6, then taps Ja, then the coins are 4, the bag holds 4 Bessen and the ledger has one row with delta -6, in one transaction.
* **GL13-3:** Given the sum "3 bessen van 2 munten", when the kid picks 5, then "Bijna! 3 x 2 = 6" shows, then the confirm asks for 6 punten, and after Ja the bag holds exactly 3 Bessen.
* **GL13-4:** Given 1000 generated price sums (fixed seed), then each has exactly one right choice among 3 different choices, all choices are positive, and every total is at most 25.
* **GL13-5:** Given 9 Vis in the bag, then buying 3 Vis is not offered and the card says "Je voertas is vol" for the 5 and 3 buttons; buying 1 Vis still works. Given 10, then all Vis buttons say "Je voertas is vol".
* **GL13-6:** Given a Compy and Bessen in the bag, when the kid drags a Bes onto the Compy, then the bag has one Bes less and the Compy skips with hearts. Given the same with Varens, then it eats it with one heart.
* **GL13-7:** Given a snack dragged onto empty ground, then the bag count does not change and the view did not turn during the drag.
* **GL13-8:** Given the kid taps a snack in the tray and then taps a dino, then the dino eats it as in GL13-6.
* **GL13-9:** Given a dino that ate 3 snacks, when a 4th is dropped on it within 2 minutes of play, then it says "Ik zit vol! Straks weer." and the bag count does not change. After 2 minutes of play it eats again.
* **GL13-10:** Given a play day where 2 dinos have eaten, when a 3rd dino eats, then +3 coins and a toast "Je kudde smikkelt! +3 punten". A 4th dino on the same day gives no more bonus. Given the next day, then the bonus can come once again, the same +3.
* **GL13-11:** Given a dino that has not eaten for 30 days of game time (simulated), then it looks, moves and reacts exactly like before v13, and no text in the app says hungry, honger, ziek, verdrietig or mist je (automated text scan).
* **GL13-12:** Given a save or backup from before v13, then it loads with an empty bag and nothing else changes. Given a backup after v13, then the bag comes back on restore.
* **GL13-13:** Given the shop is open, then the play timer is stopped. Given only the Voertas tray is open, then it runs.

---

## 4. v14 Bouw-Opdracht

### 4.1 Goal
"A villager asks me to build something, I build it, and the game counts my blocks." Rekenen inside the building kids love, using the villages of v11.

### 4.2 What the kids get (kid's eye flow)
1. In a village I see a villager with a hammer in a speech bubble. This is the Bouwmeester.
2. I tap the bubble. A card says: "Wil je voor mij bouwen? Een toren van 2 bij 2 en 4 hoog." with "Ja, ik bouw!" and "Nu niet".
3. I tap "Ja, ik bouw!". A glowing yellow square appears on the ground next to the villager: the bouwplek. A small banner at the top says "Opdracht: toren 2 bij 2, 4 hoog".
4. I pick a block in my hotbar and build inside the square.
5. When I stand near the bouwplek a big "Klaar ✓" button shows. I tap it.
6. My tower is 3 high. The villager says: "Ik tel 12 blokken. Je toren is 3 hoog, ik vroeg 4 hoog. Probeer nog eens!" Nothing is taken from me.
7. I add a layer and tap Klaar again. The villager dances, the card says "Precies goed! 2 x 2 x 4 = 16 blokken. +10 punten." The first time I also get a Bouwhelm for one of my dinos.
8. I tap "Laten staan" and my tower stays. Next time the villager asks for something new.

### 4.3 In
1. **One Bouwmeester per village** (3 in all), a villager with a hammer bubble. Its bubble is separate from the v11 question bubble and has no cooldown. The kid has at most one open opdracht at a time, saved across restarts.
2. **The bouwplek:** a 7 by 7 square on flat ground next to the Bouwmeester's house, shown as a glowing outline drawn on the ground. It is not made of blocks, so it never changes the world. It is chosen when the kid says Ja: the first flat 7 by 7 spot within 10 blocks of the house with no blocks above ground. If no spot is free, the villager says "Ik vind geen lege plek. Maak je een stukje vrij?" and the opdracht starts after the kid clears one.
3. **The counted area:** every non air block inside the 7 by 7 square, from one block above the ground of the square up to 10 blocks high. The ground layer itself never counts, so digging is ignored. Blocks outside the square never count. Block kind does not matter, except for colour tasks, which count `wol` colours by block id.
4. **The shape reader** (pure logic, unit tested) reads the counted blocks and finds: the total, the box around them (width, depth, height), whether that box is completely full, whether the blocks are one connected piece, and the count per colour.
5. **Task types and checks:**

| Task | Example card text | Right when |
|---|---|---|
| Toren | "Een toren van 1 bij 1 en 7 hoog" | One full box, footprint 1 by 1, height 7. |
| Muur | "Een muur van 5 lang en 3 hoog" | One full box, depth 1, length 5 (either direction), height 3. |
| Precies N | "Bouw iets met precies 15 blokken" | Total is 15, any shape, one connected piece. |
| Even of oneven | "Een toren met een oneven aantal blokken, hoger dan 4" | One full 1 by 1 box, height 5 or more, odd total. |
| Vloer | "Een vloer van 4 bij 5" | One full box, height 1, 4 by 5 (either way round). |
| Vloer, kies zelf | "Een rechthoekige vloer van 12 blokken" | One full box, height 1, total 12 (1 x 12 does not fit; 2 x 6 and 3 x 4 do). |
| Balk | "Een blok van 3 bij 2 en 4 hoog" | One full box with those sizes (width and depth either way round). |
| Balk, kies zelf | "Een blok van 24 blokken, kies zelf de maten" | One full box, total 24, every side at least 2. |
| Helft of kwart | "Een muur van 8 blokken, de helft is rood" | The base shape is right and exactly half (or a quarter) of the blocks are wol rood. |
| Omheining | "Een hek om een tuintje van 3 bij 2" | Height 1, exactly the border ring of a 5 by 4 rectangle, empty inside: 14 blocks. |

6. **Levels for groep 5, 6 and 7:**

| Level | Task types | Sizes |
|---|---|---|
| Groep 5 | Toren, Muur, Precies N, Even of oneven | At most 20 blocks. Towers 3 to 10 high. Walls 2 to 5 long and 2 to 4 high. |
| Groep 6 | Vloer, Vloer kies zelf, Balk, Helft | At most 36 blocks. Sides 2 to 6. Balk like 2 x 3 x 4. Helft with an even total of at most 20. |
| Groep 7 | Balk kies zelf, Balk up to 48, Helft and Kwart, Omheining | At most 48 blocks. Sides 2 to 7. Omheining around a tuintje up to 5 by 4. |

   A level also uses the task types of the level below it now and then (1 in 4). The level is a parent setting "Bouwniveau" (Groep 5, Groep 6, Groep 7) in Instellingen, default Groep 6. (Founder question GLQ14-1.)
7. **Klaar:** a "Klaar ✓" button of at least 64 px shows while the kid stands within 8 blocks of the bouwplek with an open opdracht. A tap checks right away.
8. **A right build:** the Bouwmeester dances (the v11 dance), the card shows the sum ("2 x 2 x 4 = 16 blokken") and +10 coins with a ledger row `reason: 'build'`. The card has "Laten staan" and "Opruimen". Laten staan keeps the build and the next opdracht gets a new bouwplek. Opruimen asks "Je bouwwerk verdwijnt. Zeker weten?" and on Ja removes only the counted blocks with a puff.
9. **A wrong build:** never costs coins and never ends the opdracht. The villager gives one friendly hint that names what it counted, in this order: the total ("Ik tel 14 blokken, ik vroeg er 12."), then a size ("Je muur is 4 lang, ik vroeg 5 lang."), then a gap ("Er zit een gat in je blok."), then the colour ("Ik tel 3 rode, de helft van 8 is 4."), then loose parts ("Er staan losse blokken, maak er één bouwwerk van."). Then "Probeer nog eens!". The kid can tap Klaar as often as they like.
10. **Help after 3 wrong tries:** the card also offers "Laat zien hoe". It draws a see through ghost of one right answer in the bouwplek until the next Klaar. It still pays the full 10 coins when built.
11. **Andere opdracht:** the banner has "Andere opdracht" (no cost), which asks the Bouwmeester for a new task of the same level. Blocks already built stay.
12. **Bouwhelm hats:** the first right build gives a Bouwhelm, the 5th a Gouden troffel hoed, the 10th a Architectenpet, for the v12 kast. These are counted by builds done, never by days. (Needs v12. Founder question GLQ14-2.)
13. **The play timer runs** while building, since it is play. A learning break can come mid build. The opdracht, the bouwplek and the blocks stay; after the break the kid goes on.
14. **Save, migration and backup:** the open opdracht, its bouwplek, its wrong try count and the builds done count are saved. Old saves load with no opdracht. The v3 backup holds them; older backups still restore.
15. A version bump and a CHANGELOG line.

### 4.4 Out
* Tasks with diagonals, slopes, round shapes or hollow boxes in 3D.
* Building tasks outside villages.
* More than one open opdracht.
* Points lost or taken for anything.
* Reading speech aloud (no TTS in this release).

### 4.5 Coins
* +10 for a right build at every level. A build takes about 2 to 6 minutes, so this pays about the same per minute as a learning break (up to 13 per 5 minutes). It is not faster than learning breaks, and it is learning too.
* No day limit, like Extra oefenen (founder question GLQ14-3).
* Wrong builds and Andere opdracht cost nothing.

### 4.6 Kid safety
* Nothing new leaves the iPad. Every check runs on the iPad.
* No coin loss, no timer on a build, no "you failed" text. Hints say what was counted, in a kind voice.
* Opruimen removes only the counted blocks and only after a confirm. The game never removes a kid's blocks on its own.
* No streak and no reminder. Build hats come by builds done.

### 4.7 iPad notes
* Klaar, the card buttons and the banner are at least 56 px (Klaar 64 px). The banner never covers the hotbar or the stick.
* Building uses the normal tap to place (PRD 4.2). No new touch moves.
* The outline and the ghost are drawn, not blocks, so they never end up in the world save.
* The shape reader reads at most 7 x 7 x 10 = 490 cells, so a check is instant.
* Works offline.
* Save format change: after the v3 backup (0.6.0).

### 4.8 Open questions for the founder
* **GLQ14-1: How is the build level set?** A (recommended): a parent setting "Bouwniveau" with Groep 5, Groep 6 and Groep 7, default Groep 6. B: follow the Rekenen levels the parent switched on (M6 or E6 gives Groep 6, M7 or E7 gives Groep 7); no extra setting, but no Groep 5. C: one fixed mix for everyone.
* **GLQ14-2: What is "a villager hat"?** A (recommended): build hats for the kid's dinos (needs v12 first). B: the villager puts on a hat after a right build, nothing for the kid. C: no hat, coins only, so v14 does not need v12.
* **GLQ14-3: A day limit on build coins?** A (recommended): none, like Extra oefenen; a build is learning and is slow anyway. B: coins for the first 5 builds a day, then dances only.
* **GLQ14-4: v11 villager questions pay no coins on purpose. Should builds pay?** A (recommended): yes, +10, since a build is real Rekenen work. B: no coins, only the dance and hats, like v11.

### 4.9 Size and task split
M to L, 5 tasks.
1. **V14a Shape reader and checks:** pure logic for the counted area, box, full, connected, colours and every task type, with the hint order. Heavy unit tests.
2. **V14b Task maker:** tasks per level with fixed seeds, card and hint texts, unit tests.
3. **V14c Bouwplek:** finding a free spot, the outline and ghost drawing, save record, migration and backup checks.
4. **V14d Bouwmeester flow:** bubble, card, banner, Klaar, right and wrong builds, Laten staan and Opruimen, coins and ledger, e2e.
5. **V14e Bouwniveau and build hats:** the parent setting, build hats into the v12 kast, iPad check.

**If it grows,** split it in two releases that are each fun on their own: **v14a** Toren, Muur, Precies N, Even of oneven and Vloer (counting and area, Groep 5 and 6), and **v14b** Balk, Helft and Kwart, Omheining and the build hats (volume, fractions and perimeter, Groep 6 and 7).

### 4.10 Acceptance criteria (draft)
* **GL14-1:** Given each village, then exactly one villager shows a hammer bubble. Given a tap on it with no open opdracht, then a card shows one task with "Ja, ik bouw!" and "Nu niet". Nu niet changes nothing.
* **GL14-2:** Given Ja, then a 7 by 7 outline shows on flat ground within 10 blocks of the house, with no blocks above ground inside it, and no block in the world changed.
* **GL14-3:** Given no free 7 by 7 spot near the house, then the villager says "Ik vind geen lege plek. Maak je een stukje vrij?" and no outline shows.
* **GL14-4:** Given an open opdracht, then a block one above the ground inside the square counts, a block in the ground layer does not, a block 11 high does not, and a block outside the square does not (unit test).
* **GL14-5:** Given the task "Een toren van 2 bij 2 en 4 hoog", then a full 2 x 2 x 4 box of any block kinds is right; a 2 x 2 x 3 box gets the hint "Je toren is 3 hoog, ik vroeg 4 hoog."; a 2 x 2 x 4 box with one block missing gets "Ik tel 15 blokken, ik vroeg er 16." (unit test, all task types in the table of 4.3 item 5).
* **GL14-6:** Given "Een rechthoekige vloer van 12 blokken", then a full 3 by 4 and a full 2 by 6 floor are right, and 12 loose blocks in an L shape are wrong with a hint.
* **GL14-7:** Given "Een muur van 8 blokken, de helft is rood" and a 4 by 2 wall with 3 wol rood, then the hint is "Ik tel 3 rode, de helft van 8 is 4."
* **GL14-8:** Given "Een hek om een tuintje van 3 bij 2", then a 1 high ring around an empty 3 by 2 inside (14 blocks) is right, and the same ring with a block inside is wrong.
* **GL14-9:** Given 1000 tasks per level (fixed seed), then every Groep 5 task needs at most 20 blocks, Groep 6 at most 36, Groep 7 at most 48, every side fits in 7 by 7 by 10, and every task has at least one right build.
* **GL14-10:** Given the kid stands within 8 blocks of the bouwplek, then Klaar shows at 64 px or more. Given 9 blocks or more away, then it does not.
* **GL14-11:** Given a wrong build, when the kid taps Klaar, then the coins do not change, the opdracht stays open, the blocks stay, and one hint shows. Given 3 wrong tries, then "Laat zien hoe" is offered and shows a ghost of a right answer.
* **GL14-12:** Given a right build, when the kid taps Klaar, then the Bouwmeester dances, the card shows the sum, +10 coins and one ledger row `reason: 'build'` are saved in one transaction. Given a fast double tap on Klaar, then +10 comes once.
* **GL14-13:** Given the right build card, when the kid taps Opruimen and then Ja, then only the counted blocks are gone. Given Laten staan, then all blocks stay and the next opdracht gets a different bouwplek.
* **GL14-14:** Given Andere opdracht, then a new task of the same level shows, no coins change and no blocks change.
* **GL14-15:** Given an open opdracht with some blocks built, when the app restarts or a learning break comes, then the opdracht, the outline and the blocks are still there.
* **GL14-16:** Given Bouwniveau Groep 5, then 3 of every 4 tasks come from the Groep 5 types. Given Groep 7, then Omheining and Kwart can appear and the lower level types appear about 1 in 4.
* **GL14-17:** Given the first, 5th and 10th right build, then a Bouwhelm, a Gouden troffel hoed and an Architectenpet go into the kast (if v12 is live).
* **GL14-18:** Given a save or backup from before v14, then it loads with no opdracht and nothing else changes. Given a backup after v14, then the open opdracht and the builds done count come back.

---

## 5. Order and dependencies

* All three come after v3 (backup) and after v6, as the backlog says.
* v12 first is the natural order: v14's build hats need the v12 kast. v13 stands alone.
* Each release updates the backup checks of v3 for its new fields, so a restored backup never drops hats, snacks or an opdracht.

## 6. Not picked yet

Other ideas from the game loop brainstorm (`docs/BACKLOG.md`, v14 section). They stay out until the founder picks one:
* Woordenjacht-Eieren (word hunt eggs)
* Raad-de-Dino (guess the dino from clues)
* Dino-Dokter
* Dino-Show
* Dino-Taalkaart
* Kamer-Meester (dino den)
* Rekenmarkt (be the shopkeeper)
* Tijdreis-Poort (time gates)
* Krijtbord (quiet daily goal)
