# Product Requirements Document: Dinowinkel (Dino Shop & Coin Economy)

**Document Status:** Approved Addendum (`docs/SHOP_PRD.md` — companion to `docs/PRD.md`)  
**Target Milestone:** M3 (`T42`, `T45`, `T46`, `T47`)  
**Audience:** Children aged 8–11 (Groep 6/7/8) on iPad landscape

---

## 1. Vision & Motivation

In **Dino Blokwereld**, learning breaks and practice rounds reward the child with **punten / munten (coins)**. For that loop to feel genuinely exciting, spending those coins must feel like visiting a magical prehistoric pet shop and hatchery.

The **Dinowinkel** turns every earned coin into tangible progress toward hatching, naming, and caring for a personal herd of blocky 3D dinosaurs that walk, hop, and follow the player through their voxel world.

---

## 2. How Coins (Punten) Are Earned

Children can earn coins at any time — either when the play countdown naturally reaches `0:00` or **immediately on demand** by overriding the countdown clock:

| Source | How to Trigger | Reward Rules |
|---|---|---|
| **Leerpauze (Learning Break)** | Automatically every `N` minutes of play, **or** immediately via the HUD **"Nu oefenen 🪙"** button on the countdown pill | **+2** first try, **+1** second try, **-1** teach moment (total never below 0), **+3** perfect-break bonus |
| **Extra oefenen (Topic Practice)** | Pause menu → **Extra oefenen** → pick any switched-on topic (or start a full break round) | **+2** first try, **+1** second try, **0** teach moment (no penalty), up to **10 extra points per day** (`AC52`, `AC120`) |
| **Lesboek (Study Book)** | Pause menu → **Lesboek** → read any topic lesson at leisure, then jump straight into practicing that topic | Prepares the child to ace first-try answers (+2 coins each) |
| **Examen (Golden Egg Challenge)** | Parent-started exam (70%+ score) | Awards a **Gouden Ei** (Golden Dino Egg) exempt from the 25-dino shop cap (`AC111`) |

---

## 3. Dinowinkel Catalog & Species Design

The shop presents the four dinosaur species in ascending price order (`SHOP_KINDS`), each with a distinct voxel silhouette, colour palette, personality trait, and size badge:

| Species (`DinoKindId`) | Dutch Name | Price | Grown Voxel Size (`w × h × l`) | Palette & Signature Feature | Kid-Friendly Blurb & Trait |
|---|---|---|---|---|---|
| `compy` | **Compy** | **20** 🪙 | `0.6 × 0.8 × 1.0` | Emerald green (`#66bb6a`) | *Snel & nieuwsgierig!* Een vrolijke kleine dino die overal achter je aan huppelt. |
| `triceratops` | **Triceratops** | **40** 🪙 | `1.0 × 1.0 × 1.6` | Warm amber (`#ffa726`) + cream frill & 3 horns | *Sterk & dapper!* Met drie stoere hoorns en een groot nekschild. |
| `stegosaurus` | **Stegosaurus** | **40** 🪙 | `1.0 × 1.2 × 1.8` | Teal (`#26a69a`) + pink back plates | *Rustig & vriendelijk!* Heeft prachtige roze rugplaten en een dikke staart. |
| `brachiosaurus` | **Brachiosaurus** | **80** 🪙 | `1.2 × 2.4 × 2.0` | Sky blue (`#42a5f5`) + tall neck (`2.4` blocks high!) | *De vriendelijke reus!* Kijkt met zijn lange nek over al je bouwwerken heen. |

---

## 4. Compelling Shop UX & Layout

### 4.1 Header & Treasure Wallet
- **Coin Treasure Badge:** Displays the child's current balance (`🪙 X punten`) in a golden pill with high-contrast typography.
- **Herd Counter Pill:** Shows current shop dinos + eggs against the herd cap (`🦕 X / 25 dino's`), plus a golden star badge (`⭐ +Y gouden`) when the child owns golden exam dinos.
- **"Verdien meer munten!" Quick Action:** If the child wants more coins while browsing the shop, a **"Nu oefenen 🪙"** button lets them jump straight from the shop into an exercise round without having to close the shop and wait for the timer.

### 4.2 Egg Cards (4-Card Grid)
Each species card includes:
1. **Voxel Dino & Spotted Egg Emblem:** A layered CSS/SVG-free voxel block illustration in the species' exact 3D palette (`body`, `head`, `feature`, and spotted egg), plus an **"In je kudde: X"** badge if the child already owns one or more of this species.
2. **Trait & Size Chips:** Shows the species description and size category (*Klein*, *Middel*, *Groot*, *Reusachtig*).
3. **Price & Progress Meter:**
   - **When affordable (`canBuy === true`):** Card has a vibrant green/gold border and an active **"Kopen — X 🪙"** button (`min-height: 56px`).
   - **When more coins are needed (`blocked === 'points'`):** Card is visually dimmed (`greyed` / `aria-disabled="true"`), displays the exact text **`"Nog X punten nodig"`** (`AC149`), and renders a visual progress bar (`points / price`) so the child can see how close they are.
   - **When the 25-dino shop cap is reached (`blocked === 'cap'`):** All buy buttons are disabled and the shop displays the friendly banner **`"Je hebt al 25 dino's! Wat een kudde. Ruil er een in om plek te maken."`** (`AC149`, cap raised from 12 in decision 111).

### 4.3 Two-Step Kid-Safe Purchase Confirmation (`AC20`, `AC110`)
- Tapping **"Kopen"** on an affordable card opens an inline confirmation prompt for that species:
  - Prompt: *"Wil je een **[Soort]-ei** kopen voor **[Prijs] punten**?"*
  - Buttons: **"Ja"** (confirm) and **"Nee"** (cancel).
- **Double-Tap & Concurrency Guard (`AC110`):**
  - Confirming with **"Ja"** locks the purchase flow while the transaction runs and re-validates `purchaseEgg(economy, shopCount, kind)` inside the transaction.
  - Rapidly tapping **"Ja"** 10 times with 45 points on a 40-point egg buys **at most 1 egg**, leaving **5 points** (never negative).

### 4.4 Atomic Save & Immediate World Spawn (`AC150`, `AC12`)
- When **"Ja"** is tapped:
  1. `economy` (deducted points), `dinos` (new `EggState` placed on a free ground spot 1.5–2.5 blocks from the player), and `ledger` (`delta: -price, reason: 'egg'`) are committed in **one single IndexedDB transaction** (`transact(db, ['kv', 'ledger'], 'readwrite', ...)`).
  2. Killing the app immediately after tapping **"Ja"** never deducts points without saving the egg or vice versa (`AC150`).
  3. The `clink` sound plays, a celebratory banner confirms *"Hoera! Je [Soort]-ei ligt naast je in de wereld!"*, and the wallet/collection view updates immediately.

### 4.5 "Mijn Dino-verzameling" (Live Herd & Incubator Showcase)
Below the 4 shop cards, the shop displays the child's live collection:
- **Incubating Eggs:** Shows each unhatched egg with its species and remaining play seconds (`🥚 [Soort]-ei — broedt nog X s`).
- **Hatched Dinos:** Shows each dino in the herd with its custom name (or species name if unnamed), golden status (`⭐`), and current behaviour (`Volg mij` or `Blijf hier`).

---

## 5. Acceptance Criteria Checklist

- **AC20:** Buying an egg deducts the price from `economy.points`, spawns an egg next to the player, and logs to `ledger`.
- **AC23:** While the Dinowinkel is open (`kid-overlay`), the play countdown timer is paused.
- **AC110:** Tapping `Ja` 10 times in 1 second with 45 points on a 40-point egg buys only 1 egg and leaves 5 points.
- **AC149:** Unaffordable cards are greyed and show `"Nog X punten nodig"` (or `"Nog 1 punt nodig"`). At 25 shop dinos/eggs, cards are disabled and show `"Je hebt al 25 dino's! Wat een kudde. Ruil er een in om plek te maken."` (decision 111).
- **AC150:** Points, egg, and ledger entry are written atomically in one IndexedDB transaction; egg hatch timer (`5 s`) advances only during active world play.

## Inruilen (decision 111)

* In "Mijn Dino-verzameling" every hatched dino and every chicken has an orange button "Inruilen +N", at least 48 px high.
* N is half the price, rounded down: Compy 10, Triceratops 20, Stegosaurus 20, Brachiosaurus 40, Kip 2.
* Tapping it asks "Wil je Lange Nek (Brachiosaurus) inruilen? Je krijgt 40 punten terug." with Ja and Nee. Nee changes nothing.
* Ja removes the animal from the world and adds the points. Points, dinos and a ledger row (`reason: 'tradein'`, positive delta) are saved in one transaction. Fast taps trade in one animal once; trade ins share the purchase lock.
* A golden dino (an exam prize) has no button and can never be traded in. Eggs cannot be traded in; they hatch in 5 seconds of play.
* The toast says "Dag Lange Nek! Je kreeg 40 punten terug."

