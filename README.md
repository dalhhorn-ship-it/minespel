# Dino Blokwereld

Dino Blokwereld is a free 3D block world for kids, played in Dutch on an iPad. Walk around a world made of blocks, dig out what you need and build what you like. Later, dinos will join you, hatch from spotted eggs and follow you around. Between play times, a friendly dino will ask a few questions on school subjects. The plan has no ads, no accounts and no tracking. Your saves stay on your iPad.

## How to play

The game works now in milestone 2 (M2). You can explore, build and answer school questions. Dinos and eggs can already be in the world. Buying eggs comes in M3.

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
* **Dinowinkel**, **Lesboek** and **Extra oefenen** show "Komt nog" (coming soon) for now.

### Dinos and eggs

Dinos and eggs can already be in the world. Buying eggs in the Dinowinkel comes in M3.

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

Not yet. The plan is Cloudflare Workers as static assets, at a `dino-blokwereld` address on workers.dev. The first test deploy waits for the founder. It needs the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and the founder must say yes. The deploy workflow is manual only (`.github/workflows/deploy.yml`).

## Built by an agent factory
This app was made with the agent factory in `CLAUDE.md`. Start Claude Code in this folder and say what you want to make, or type `/factory` to continue where you left off.
