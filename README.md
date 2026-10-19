# Dino Blokwereld

Dino Blokwereld is a free 3D block world for kids, played in Dutch on an iPad. Walk around a world made of blocks, dig out what you need and build what you like. Later, dinos will join you, hatch from spotted eggs and follow you around. Between play times, a friendly dino will ask a few questions on school subjects. The plan has no ads, no accounts and no tracking. Your saves stay on your iPad.

## How to play

The game works now in milestone 1 (M1). You can explore and build. Dinos and school questions come in later milestones.

* **Walk:** use your left thumb on the left side of the screen.
* **Look around:** use your right thumb on the right half of the screen.
* **Spring:** tap the Spring button to jump up onto a block.
* **Hakken:** tap a block to break it. Blocks you can't break, like the oersteen floor, stay put.
* **Bouwen:** tap the side of a block to put a new block against it. Building up lifts you up too.
* **Hotbar:** the 8 slots at the bottom hold your blocks. Tap a slot to pick it.
* **Alle blokken:** opens a grid with all 16 blocks. Tap one to put it in the slot you picked.
* You can reach blocks up to 6 steps away.
* Your world is saved. The blocks you built or broke, where you stand, your hotbar and whether you are on Hakken or Bouwen are all there when you open the game again.

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

The Playwright WebKit browser cannot download in the cloud sandbox, because the proxy blocks its download host. So the end to end tests run in GitHub CI, on every push, split over 4 parallel jobs. The CI workflow is in `.github/workflows/ci.yml`. On your own computer, run `npx playwright install webkit` once and then `npm run test:e2e`.

## Playing on the iPad

1. Open the game in Safari on the iPad.
2. Tap the Share button, then **Zet op beginscherm** (Add to Home Screen).
3. Open Dino Blokwereld from the home screen icon and play there.

Please play only from the home screen icon. The home screen app and a Safari tab keep separate saves. If you play in a Safari tab, your world is not in the home screen app, and the other way around. Safari can also clear the saves of a website you have not opened for a while. The home screen app is safer for that.

## Where it is deployed

Not yet. The plan is Cloudflare Workers as static assets, at a `dino-blokwereld` address on workers.dev. The first test deploy waits for the founder. It needs the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and the founder must say yes. The deploy workflow is manual only (`.github/workflows/deploy.yml`).

## Built by an agent factory
This app was made with the agent factory in `CLAUDE.md`. Start Claude Code in this folder and say what you want to make, or type `/factory` to continue where you left off.
