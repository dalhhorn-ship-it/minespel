# Dino Blokwereld

Dino Blokwereld is a free 3D block world for kids, played in Dutch on an iPad. Walk around a world made of blocks, dig out what you need and build what you like. Dinos join you too. They hatch from spotted eggs, follow you around and get a name from you. Between play times, a friendly dino will ask a few questions on school subjects. The plan has no ads, no accounts and no tracking. Your saves stay on your iPad.

## How to play

The game now has milestone 3 (M3). You can explore, build, answer school questions, buy dino eggs and look after your dinos.

* **Walk:** use your left thumb on the left side of the screen.
* **Look around:** use your right thumb on the right half of the screen.
* **Spring:** tap the Spring button to jump up onto a block.
* **Hakken:** tap a block to break it. Blocks you can't break, like the oersteen floor, stay put.
* **Bouwen:** tap the side of a block to put a new block against it. Building up lifts you up too.
* **Hotbar:** the 8 slots at the bottom hold your blocks. Tap a slot to pick it.
* **Alle blokken:** opens a grid with all 16 blocks. Tap one to put it in the slot you picked.
* You can reach blocks up to 6 steps away.
* Your world is saved. The blocks you built or broke, where you stand, your hotbar and whether you are on Hakken or Bouwen are all there when you open the game again.

### Leerpauze: the learning break

* At the top of the screen a countdown runs. It starts at 5 minutes. In the last 30 seconds it grows and pulses.
* When the countdown reaches 0, Dino Juf asks 5 questions on Taal and Rekenen.
* Before a new topic, a lesson page shows first. Swipe or tap to read on.
* Tap your answer. Some questions need the keyboard or the number pad on the screen.
* Points:
  * Right on the first try: +2 points.
  * Right on the second try: +1 point.
  * When it is hard, **Zo zit het** shows the right answer and explains it. After that you lose 1 point.
  * All 5 right on the first try: +3 bonus points.
  * Your points never go below 0.
* At the end you see a summary. Then you go back to your world.
* If you close the app during a break, the break is still there when you open it again.

### Pauze: the pause menu

* Tap **Pauze** at the top of the screen. The countdown stops while the menu is open.
* The menu shows your points.
* **Terug naar de wereld:** go back to your world.
* **Ik zit vast:** go back to the start spot. Your world stays the way it is. Dinos that follow you come along.
* **Dinowinkel:** buy dino eggs with your points. See below.
* **Lesboek:** read the lesson pages again. Reading does not change your points or your countdown.
* **Extra oefenen:** practise questions any time. See below.

### Dinos and eggs

* Buy an egg in the Dinowinkel. The egg appears next to you in the world.
* An egg hatches after 5 seconds of play. Breaks and menus do not count. The baby dino starts small and grows to full size in 2 seconds.
* Tap a dino to open its menu:
  * **Volg mij:** the dino follows you.
  * **Blijf hier:** the dino stays where it is.
  * **Naam geven:** type a name with the keyboard on the screen. A name can be up to 12 letters.
  * **Knuffel:** give your dino a hug. Hearts float up.
* You can have up to 12 dinos from the shop.

### Dinowinkel: buy eggs

The Dinowinkel uses points only. No real money is spent. There are no links.

| Egg | Price |
|---|---|
| Compy | 20 punten |
| Triceratops | 40 punten |
| Stegosaurus | 40 punten |
| Brachiosaurus | 80 punten |

* Tap **Kopen** on a card. Then tap **Ja** to buy it, or **Nee** to stop.
* A card is grey when you cannot buy it yet. The shop shows how many points you still need, for example "Nog 10 punten nodig".
* When you have 12 dinos, the shop says so and you cannot buy more eggs.

### Extra oefenen: practise any time

* Open it from the pause menu. Pick a module and answer a round of questions.
* Right answers give points, like in a break. But there is no minus point when you read **Zo zit het**, and no 3 bonus points.
* Up to 10 points a day count. After that you get no more points that day. The game then says: "Genoeg geoefend voor vandaag, ga lekker bouwen!" (Enough practice for today, go and build!)
* The next day, the 10 points start again.

## How to run

You need Node.js 22 and npm.

```
npm install
npm run dev      # Vite on the local network, open the shown address on the iPad
npm run build    # production build into dist/
npm run preview  # build, then wrangler dev (the built site, like production)
npm run deploy   # build, then wrangler deploy (a founder decision, see below)
```

### Test links for the developer

Add these to the address to check the speed of the game:

* `?fps=1` shows the frames per second counter.
* `?spike=1` adds 14 test dinos. Use it together with `?fps=1`, for example `?fps=1&spike=1`.
* `?pr=1.5` sets the highest pixel ratio, from 1 to 3. A lower number makes the picture less sharp and can run faster on an old iPad.
* `?fog=40` sets how far you can see. The fog starts at half of this distance.

A kid who plays from the home screen app never sees the counter unless the address has `?fps=1`.

## How to test

```
./scripts/check.sh
```

This one command runs the learning content checks (needs Python 3), lint, typecheck, unit tests (Vitest), the production build, a check that the production build has no test hooks, and the end to end tests (Playwright with WebKit, iPad profiles).

You can also run each part:

```
npm run lint
npm run typecheck
npm test          # unit tests
npm run build
npm run test:dist
npm run test:e2e  # needs the WebKit browser: npx playwright install webkit
```

The Playwright WebKit browser cannot download in the cloud sandbox, because the proxy blocks its download host. So the end to end tests run in GitHub CI on every push. The CI workflow is in `.github/workflows/ci.yml`. On your own computer, run `npx playwright install webkit` once and then `npm run test:e2e`.

## Playing on the iPad

1. Open the game in Safari on the iPad.
2. Tap the Share button, then **Zet op beginscherm** (Add to Home Screen).
3. Open Dino Blokwereld from the home screen icon and play there.

Please play only from the home screen icon. The home screen app and a Safari tab keep separate saves. If you play in a Safari tab, your world is not in the home screen app, and the other way around. Safari can also clear the saves of a website you have not opened for a while. The home screen app is safer for that.

## Where it is deployed

Cloudflare Workers as static assets, Worker `minespel`, at `minespel.<account subdomain>.workers.dev`. The founder connected the repo to Cloudflare Workers Builds, so a push to `main` builds and deploys it (decision 54). The manual workflow `.github/workflows/deploy.yml` still works with the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Built by an agent factory
This app was made with the agent factory in `CLAUDE.md`. Start Claude Code in this folder and say what you want to make, or type `/factory` to continue where you left off.
