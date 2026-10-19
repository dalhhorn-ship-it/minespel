# Architecture

Written by the architect after PRD signoff (2026-10-17). Source of truth for how Dino Blokwereld is built. The PRD says what, this file says how. Task ids refer to `docs/PLAN.md`.

## Stack and why

| Part | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Catches mistakes early, cheap agents work well with types. |
| Build and dev server | Vite | Fast, simple, static output in `dist/`. `npm run dev` serves on the local network. |
| 3D | three.js (only in `src/render/`) | Small enough (about 150 KB gzipped), mature WebGL on Safari, no physics or engine on top. |
| UI | Plain DOM with a tiny in house helper `el()` in `src/ui/dom.ts` | No framework to learn or ship. Screens are small and mostly static. `el()` only sets text with `textContent`, which keeps imported text plain (AC88). |
| Storage | IndexedDB through a small own wrapper (`src/storage/db.ts`) | Atomic transactions give safe writes for free (AC136). Room for a year of history. |
| Sounds | Web Audio, sounds made in code (oscillators and noise) | No sound files, no licences, tiny. |
| Font | Nunito (SIL Open Font License) from the `@fontsource/nunito` package, latin subset, bundled by Vite. Fallback stack `"Nunito", ui-rounded, system-ui, sans-serif` | Round and very readable, free, works offline, and comes through npm so no separate download is needed. |
| Textures | 16 x 16 pixel tiles painted in code into one atlas canvas at start (`src/render/atlas.ts`) | No image assets to license or download. One texture, one material. |
| Unit tests | Vitest, with jsdom for DOM tests and fake-indexeddb for storage tests | Same config as Vite. |
| End to end tests | Playwright with WebKit, iPad (gen 6) landscape as the main profile, iPad (gen 6) portrait and iPad Pro 11 landscape as extra profiles | iPad (gen 6) is the 2018 iPad, the reference device (F10). |
| Lint | ESLint flat config with typescript-eslint | One standard setup. Extra rule bans `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` and `eval`. |
| Hosting | Cloudflare Workers static assets (`wrangler.jsonc`), `wrangler` as a dev dependency | Free plan, no Worker code. Deploy only at `/ship` by the founder. |
| Offline | A hand written browser service worker (`offline/service-worker.js`), filled with the file list by a tiny Vite plugin | About 60 lines, no Workbox. Full control over "update only at app start" (AC138). |

No backend, no accounts, no paid services, no third party requests (AC98). Node 22 (same as CI).

**Dependencies.** Runtime: `three` and `@fontsource/nunito` (font files only). Dev: `vite`, `typescript`, `vitest`, `jsdom`, `fake-indexeddb`, `@playwright/test`, `eslint`, `typescript-eslint`, `@types/three`, `wrangler`. **Only task T1 edits `package.json`.** A later task that needs a new package stops and reports it to the operator.

## Folder structure

```
index.html                  viewport, apple meta tags, manifest link, root elements
wrangler.jsonc              Cloudflare static assets config (no Worker code)
vite.config.ts              Vite + Vitest config, precache plugin, __E2E__ define
playwright.config.ts        WebKit iPad projects, webServer on the e2e build
eslint.config.js
tsconfig.json
public/
  manifest.webmanifest
  icons/                    PNG icons made by scripts/make-icons.mjs
  _headers                  cache rules for Cloudflare (service worker never cached long)
offline/
  service-worker.js         the BROWSER service worker (offline play). Not the Cloudflare Worker.
vite/
  precache-plugin.ts        writes dist/service-worker.js with the file list and app version
scripts/
  check.sh                  the one check command
  check-dist.mjs            smoke test: dist/index.html, manifest, service worker exist, no __dino hook
  make-icons.mjs            draws the app icons as PNG with node only (no packages)
  bundle-module.mjs         docs/modules/<id>/ folder to one importable .json file
  signoff.sh                PRD gate (do not touch)
src/
  env.d.ts                  declares __E2E__ and the Vite types
  main.ts                   boot: lockdown, one window check, open storage, migrate, load, first screen
  app/                      screens and flows: glue between logic and UI
    screens.ts              which screen is up, the overlay layers, kid screen or parent screen
    timer-driver.ts         visibility, heartbeat, timer matrix inputs, play time stats
    break-flow.ts           runs a learning break: session, saving, logs, summary, back to world
    practice-flow.ts        Extra oefenen
    exam-flow.ts            exams
    shop-flow.ts            Dinowinkel
    parent-flow.ts          gate, parent area open and close
    settings-apply.ts       applies settings (font size class, volume)
    content-loader.ts       reads own modules from storage, builds the catalog
    resume.ts               at boot: continue a running break or exam from the session store
  core/                     pure logic, no DOM, no three.js
    clock.ts                injectable clock, local calendar day helpers ("2026-10-17")
    timers.ts               play timer, exam timer, heartbeat gap rule, timer matrix
    economy.ts              points (never below 0), egg purchase, 12 dino cap, Extra oefenen day cap
    numbers.ts              Rekenen answer parsing, tenths, thin space formatting
    dutch-numbers.ts        numbers in Dutch words, for the PIN vergeten question
    rng.ts                  seeded random (mulberry32)
  world/                    pure voxel logic
    blocks.ts               block ids, Dutch names, flags (solid, cutout, minable, placeable)
    terrain.ts              fixed seed world generation, WORLD_SIZE constant (64 or 48)
    world.ts                World: get and set blocks, diff against the start world, (de)serialize
    raycast.ts              voxel ray walk (Amanatides and Woo) for taps
    physics.ts              player box movement, gravity, jump, edge walls, step rules
    build.ts                mine and place rules, building up, overlap checks
  render/                   the only folder that imports three.js
    atlas.ts                paints the 16 x 16 tiles into one canvas texture
    chunk-mesh.ts           chunk geometry: visible faces only, per face shade, cut out flag
    renderer.ts             scene, camera, fog, resize, pixel ratio cap, context loss rebuild
    quality.ts              the knobs the speed spike may turn: pixel ratio, fog distance, view distance
    effects.ts              pop bits, puff, hearts
    dino-models.ts          box dinos for 4 kinds, golden variant, baby scale, eggs
    dino-render.ts          keeps dino meshes in sync with dino state
    name-tag.ts             dino name as a canvas sprite
    fps-counter.ts          developer fps counter and frame time stats (hidden by default)
  input/
    touch-classify.ts       tap or drag rule (10 points, 300 ms), pure
    pointer-router.ts       who owns each pointer: stick, look zone, button
    stick.ts                left thumb stick
    look.ts                 right half look drag
  game/
    game.ts                 owns world, player, renderer, systems; pause and resume
    loop.ts                 requestAnimationFrame loop with time based steps
    player-controller.ts    input to physics to camera
    build-controller.ts     taps to raycast to mine or place
    dino-system.ts          dinos and eggs in the world, hatching, tap hits
    world-save.ts           world diff, player and hotbar to the save queue
  dinos/
    kinds.ts                Compy, Triceratops, Stegosaurus, Brachiosaurus: size, price, box size
    dino-ai.ts              follow, stay and wander, hop one block, stuck pop, pure
    egg.ts                  egg hatch timing, pure
    dino-store.ts           dinos and eggs records, add egg, rename, mode
  learning/                 pure learning engine
    answer-check.ts         checks for choice, find-error, type, punctuate, number
    srs.ts                  boxes 0 to 5 and due days
    rotation.ts             smooth weighted round robin over modules, topic pointer per module
    selection.ts            picks N items for a break or practice round (PRD 4.6)
    generated-items.ts      saved wrong plus and minus sums, 200 newest per topic
    break-session.ts        state machine for one break or practice round or preview
    exam-session.ts         state machine for one exam
  content/
    format.ts               types: ModuleBundle, Topic, LessonPage, Item
    validate.ts             same rules as validate.py, Dutch error messages
    taal.ts                 loads docs/modules/cito-taalverzorging at build time
    catalog.ts              all modules (built in + own), lookups, usable items
    switches.ts             on and off tree, levels, topic overrides, presets, weights
    own-modules.ts          parent made modules: create, edit, copy, delete, ids
    module-io.ts            export and import of module files, conflicts
    punctuate-parse.ts      sentence with commas to words + gaps
    rekenen/
      generator.ts          makes sums by topic, skill, level and seed
      worked-example.ts     strategy steps for the teach moment
      module.ts             the Rekenen module: topics, skills, levels, exams
      lessons.ts            Rekenen lesson pages (Dutch)
  gate/
    sha256.ts               small built in SHA-256 (works on plain http)
    pin.ts                  set, check, shared lockout
    reset-question.ts       two step grown up question in words
  storage/
    db.ts                   IndexedDB open, get, put, transaction helper
    schema.ts               store names, record types, defaults, SCHEMA_VERSION
    migrate.ts              moves old saves to the current shape
    save-queue.ts           batched writes, flush within about 1 second, flush now
    log-store.ts            answers, breaks, exams, point ledger
    records.ts              typed get and put for every kv record, with defaults
    progress-store.ts       box and due day per item, list and delete by module or topic
    session-store.ts        running break or exam, saved after every step
    backup.ts               backup file make, check, restore in one transaction
  results/
    queries.ts              all numbers for Resultaten, pure over log records
  audio/
    sound.ts                Web Audio sounds, volume, mute setting
  platform/
    lockdown.ts             no zoom, no callout, no selection, no rubber band
    screen-guard.ts         portrait and too small window overlays, reports state
    audio-unlock.ts         resumes the AudioContext on the first tap
    one-window.ts           second tab check (BroadcastChannel)
    persist.ts              navigator.storage.persist, home screen detection, notes
    share.ts                share sheet with a file, new view fallback
    file-pick.ts            pick a .json file, 2 MB limit
    sw-register.ts          registers the service worker, applies a waiting update at start only
  ui/
    dom.ts                  el(), text only helpers
    tap.ts                  onTap(): pointer based tap, acts once, ignores repeats
    hud.ts                  stick, jump, mode buttons, hotbar slot, countdown slot, pause button, Winkel button (T51e)
    countdown.ts            "Leerpauze over 4:12", pulse, tick
    hotbar.ts, block-grid.ts, pause-menu.ts, shop.ts, dino-menu.ts, name-screen.ts, lock-icon.ts
    broken-save-screen.ts
    virtual-list.ts         fixed row height list for 10 000 items
    contrast.ts             WCAG contrast ratio, used by token tests and the a11y audit
    learn/                  kid learning screens (shared by break, practice, exam, Probeer)
    parent/                 parent area screens
      editor/               own module editor
  styles/
    tokens.css              colours, sizes, --kid-scale for Groter lettertype
    base.css, hud.css, questions.css, keyboard.css, lesson.css, break.css, exam.css, ...
  dev/
    e2e-hooks.ts            window.__dino test hooks, only in the e2e build
    spike-load.ts           14 placeholder dinos for the speed spike
tests/
  setup/vitest.setup.ts     fake-indexeddb, canvas getContext stub
  unit/fakes/               fake AudioContext and other test fakes
  e2e/                      Playwright specs
  e2e/helpers/              shared helpers: openApp, readState, killApp, asInsecure, loginAsParent
  fixtures/                 modules (good and broken), old saves, backups
```

Unit tests live next to the code: `src/world/raycast.test.ts` tests `src/world/raycast.ts`.

## Modules and data flow

**Shared APIs that several tasks rely on** (the owner task in brackets):
* `pointer-router.addIgnoreZone(el)`: touches that start there never look or tap the world (T10).
* `game.pause()`, `game.resume()`, `game.teleportHome()` which emits `teleported` (T23b). Dinos listen to it (T42).
* `dino-store.addEgg(kind, golden)`: used by the shop (T47) and the golden egg (T51a) (T42).
* `log-store`: `appendAnswer`, `saveBreak` (sets "snel geklikt"), `saveExam`, `listExams`, `appendLedger` (T67).
* `records.get(name)` and `records.put(name, value)` for every `kv` record, `progress-store` for boxes (T66).
* `backup.markBackupMade(now)` writes `meta.lastBackup`, read by the backup reminder (T18, called by T53a, read by T52).

**Layers.** `core`, `world`, `learning`, `content`, `gate`, `dinos` (except the store) and `results` are pure TypeScript: no DOM, no three.js, no storage. They take a clock and a random source as arguments. This is where most tests live. `render` draws, `input` reads fingers, `ui` builds screens, `storage` saves, `app` and `game` glue them together.

**Boot (`main.ts`).**
1. Lockdown and screen guard start (`platform/`).
2. One window check. A second tab shows "Dino Blokwereld is al open" and stops (AC114).
3. Service worker: if an update is waiting, apply it now and reload once. Never later (AC138).
4. Open IndexedDB, run migrations, load all records. Unreadable: broken save screen (AC137).
5. No PIN yet: first start flow (Flow 1). Otherwise: resume a running exam or break if the session store has one, else the world.

**Play.** `game/loop.ts` runs on `requestAnimationFrame`. Each frame: `player-controller` reads stick and look, `physics` moves the player, `dino-system` steps dinos, `renderer` draws. Steps use real elapsed time, capped at 100 ms per frame so a hiccup never tunnels the player through a block.

**A tap in the world.** `pointer-router` gives the pointer to the look zone. On release, `touch-classify` says tap or drag. A tap goes to `build-controller`: it casts a ray from the camera through the finger. First `dino-system` tests dinos and eggs within 6 blocks; a hit opens the dino menu (AC104). Otherwise `raycast` finds the block and face, `build.ts` decides, `world.set()` changes the block, `chunk-mesh` rebuilds that chunk (and a neighbour on an edge), `world-save` marks the diff dirty.

**Timers.** `timer-driver.ts` ticks every second (heartbeat) and on visibility events. It asks `screens.ts` what is on screen, asks `screen-guard` about portrait and size, and asks `document.visibilityState`. `core/timers.ts` turns that into "play timer runs", "exam timer runs" or "nothing runs" (PRD timer matrix 4.4). A gap of more than 5 seconds between two ticks is not counted (AC113). When the play timer hits 0, `break-flow` starts.

**A learning break.** `break-flow` asks `rotation` for the module, `selection` for N items (using `srs`, `switches`, `catalog`, `generated-items`), and starts a `break-session`. The session is a state machine: `lesson`, `question(try 1)`, `feedback`, `question(try 2)`, `teach`, `summary`. Each answer goes through `answer-check`. Every state change goes to `session-store` (so a reopen resumes at the same try, AC37), every answer goes to `log-store`, box changes go to the progress store, point changes go through `economy` and the ledger. The kid screen (`ui/learn/break-screen.ts`) only renders the session state and sends taps back. The session ignores input that does not fit its current state, which is the real guard against double taps (AC117).

The same `break-session` runs three modes: `break` (malus and bonus), `practice` (no malus, no bonus, day cap, AC52 and AC120) and `preview` (Probeer: no points, no boxes, no logs). `exam-session` is a separate, simpler machine: one try, no feedback, a timer.

**An exam (v2).** The parent starts it from Examens. A reopen continues it through `resume.ts`. `exam-flow` asks `exam-session` for a plan and the items (by the `mix` weights, switches ignored), shows the `ui/learn/exam-screen.ts` screens on the `exam` layer and saves every step to `session-store` as kind `exam` with a `phase`. The exam countdown lives in `timer-driver.ts` next to the play timer, so the timer matrix stops it for the parent layer, portrait, a small window and the background. The small grey lock on the question screen goes to `parentFlow.openExamStop()`: the same pin pad, then only the "Examen stoppen?" card. The gate and card sit on the parent layer above the exam, so the question and the typed answer stay as they were. At the end: answers to `log-store` (context `exam`), boxes to the progress store, the result through `saveExam`, a golden egg through `dinoStore.addEgg(kind, true)` on a pass, and back in the world a full play timer. Points never change.

**Rendering details.** Chunks of 16 x 16 x 32. Only faces next to air or a cut out block are built. Each face gets a fixed brightness (top 1.0, sides 0.8 and 0.6, bottom 0.5) as vertex colour, so there are no lights and no shadows. One `MeshBasicMaterial` with the atlas and `alphaTest` for glass and leaves. Linear fog hides the edge. Pixel ratio is `min(devicePixelRatio, 2)`; the spike may lower it to 1.5. Dinos are boxes grouped per dino; golden dinos use a gold colour. At most 12 shop dinos plus golden dinos, about 5 meshes each.

**Context loss (AC109).** If headless WebKit has no WebGL, AC109 is proven with a unit test on a fake renderer lifecycle and by hand on the iPad. The renderer listens for `webglcontextlost` (calls `preventDefault`) and `webglcontextrestored`. On restore it rebuilds the atlas, all chunk meshes and dino meshes from game state. If no restore comes within 1.5 seconds, it throws the canvas away and makes a new renderer. Game state never lives in three.js objects, so nothing is lost.

## How modules are loaded

**Format.** The format in `docs/modules/README.md` stays. Additions:
* Lesson pages get an optional `skill`. The teach moment shows the page whose `skill` matches the item's skill, else the first page (PRD 4.5).
* `module.json` gets an optional `generator` (for example `"rekenen-basis"`). Only built in code modules use it. Then there are no topic files and items come from code.
* The `punctuate` mark is a comma in v1.

**Module bundle.** In the app, a module is one object, also used as the export file:

```json
{
  "app": "Dino Blokwereld",
  "kind": "module",
  "formatVersion": 1,
  "createdAt": "2026-10-17T10:00:00.000Z",
  "module": { "id": "...", "title": "...", "subject": "taal", "version": 1, "language": "nl", "description": "...", "levels": ["M6"], "topics": ["komma"], "exams": [] },
  "topics": [ { "id": "komma", "title": "...", "groups": [6], "lesson": { "pages": [] }, "items": [] } ]
}
```

`module` is the `module.json` content. `topics` holds every topic file, in `module.topics` order.

**Built in Taal.** `src/content/taal.ts` imports the JSON files of `docs/modules/cito-taalverzorging/` with `import.meta.glob(..., { eager: true })` and builds the bundle. So the app ships exactly that folder (AC59), with no copy step. It sits in its own lazy chunk, which the service worker precaches.

**Built in Rekenen.** `src/content/rekenen/module.ts` defines the module with `generator: "rekenen-basis"`, four topics, lessons from `lessons.ts`, and four exams (Rekentoets M6, E6, M7, E7: 20 questions, 20 minutes, 70 percent, equal mix, only that level). Skills:

| Topic | Skills |
|---|---|
| optellen | `plus` |
| aftrekken | `min` |
| tafels | `tafel-1` to `tafel-10` (M6: 1 to 5 and 10, E6: 6 to 9), `tientallen-keer` (M7), `twee-cijfers-keer` (E7) |
| delen | `deel-1` to `deel-10` (M6: 1 to 5 and 10, E6: 6 to 9), `tientallen-delen` (M7), `drie-cijfers-delen` (E7) |

Rekenen item ids describe the sum, so the item can be rebuilt from the id alone and no content is stored: `tafels:7x8`, `delen:56:7`, `tafels:30x7`, `optellen:47+38`, `aftrekken:83-47`, and decimals in tenths with a `d` prefix, `optellen:d34+57` meaning 3,4 + 5,7. Level is part of the generator rule and is stored in the progress record. Tafels and delen at every level are a fixed, enumerable set. Optellen and aftrekken are open: new sums are drawn with the seeded random source; a sum wrong on the first try is saved in `generated-items` (200 newest per topic, AC126) and is never offered as new again (AC63).

**Own modules** live in IndexedDB (store `ownModules`, one bundle per record). `catalog.ts` merges built in and own modules. Ids for own modules, topics and items are made by the app (`own-` plus a short random base36 id) and never change (AC82).

**Import** (`module-io.ts`): refuse files over 2 MB or not JSON, check `app`, `kind` and `formatVersion` (newer: "Dit bestand is van een nieuwere versie. Werk de app bij."), then run `validate.ts` with Dutch messages per item id. `scripts/bundle-module.mjs docs/modules/<id>` makes an importable file from a folder.

**Two validators.** `validate.py` checks the content folders in `check.sh`. `validate.ts` checks bundles in the app (editor and import). They share rules: the TS one has a `builtIn` flag that adds the 6 items per level rule. A test runs both on the same fixtures in `tests/fixtures/modules/` (good and broken) and expects the same verdict, so they cannot drift apart.

## State and storage

One IndexedDB database `dino-blokwereld`, `SCHEMA_VERSION` in `storage/schema.ts`. Stores:

| Store | Key | Holds |
|---|---|---|
| `kv` | record name | small records, see below |
| `progress` | `moduleId|itemId` | box, due day (`"2026-10-18"`), level, topic, skill, seen count |
| `answers` | auto id, index on `ts` and on `moduleId` | one record per try: ts, day, context (break, practice, exam), session id, module, topic, skill, level, item id, try (1 or 2), correct, given answer as text, ms to answer |
| `breaks` | auto id | start, end, module, N, score, points, how it ended, `snel geklikt` flag |
| `exams` | auto id | start, end, module, exam id, every question with given and right answer, score, passed, status (done or gestopt) |
| `ledger` | auto id | point changes: ts, day, delta, reason (break, practice, shop, malus) |
| `ownModules` | module id | module bundle |

`kv` records: `settings`, `player` (position, look, hotbar, selected slot, mode), `world` (diff), `dinos` (dinos and eggs with kind, golden, name, mode, position, stay spot, hatch time left), `economy` (points, practice points earned today and its day), `timers` (play time left, exam time left), `rotation` (round robin weights, topic pointers, lessons seen), `switches` (tree, levels, overrides, weights), `session` (running break or exam, or the exam end screen), `gate` (salt, PIN hash, wrong tries, blocked until, reset wrong tries), `stats` (play ms per day), `meta` (schema version, app version, last backup date, created date).

**World diff.** The start world is made from the fixed seed. The save holds only changed cells as a `Uint32Array` of `cellIndex * 256 + blockId`. A world with 10 000 changes is 40 KB.

**Save queue (`save-queue.ts`).** Code calls `markDirty("world")`. The queue writes all dirty records in one transaction at most 1 second later, so changes are on disk within about 2 seconds (AC96). `flushNow()` is called when the page is hidden, at the start of every break and exam, and for purchases. A purchase writes `economy`, `dinos` and the ledger entry in one transaction (AC150). Session steps are saved right away.

**Safe writes (AC136).** An IndexedDB transaction either completes fully or not at all, so a cut off save leaves the previous one. Tests use fake-indexeddb and abort a transaction halfway.

**Backup.** One JSON file: `{ app, kind: "backup", formatVersion, createdAt, data: { every store except the PIN fields of gate } }`. Restore checks the whole file first (shape, app, version, every module), then clears and writes all stores in one transaction, keeping the current `gate`. A broken file changes nothing (AC130). Typed arrays are written as base64 in the file.

**Migrations.** `migrate.ts` holds one function per version step. Every schema change bumps `SCHEMA_VERSION`, adds a step and a fixture of the old shape in `tests/fixtures/saves/` (AC138). The first fixture is the M1 save (world and player only).

**Size.** A year of play is roughly 20 000 answer records of about 200 bytes, so about 4 MB. History is kept, not pruned, in v1 (at least 12 months, PRD 4.16).

**Safari notes for the founder.** Safari may wipe the storage of a site that was not opened for weeks, unless the app is on the home screen. Also, on iPad a home screen app and a Safari tab have **separate** storage: a game played in a Safari tab does not show up in the home screen app. So add the app to the home screen first, then play there. Backups move data between the two. The first start flow says this in short Dutch words.

## Security and kid safety in code

* No `innerHTML` and friends anywhere (lint rule). All text is set with `textContent`. Imported text is never a link.
* No network requests except the app's own files. An e2e test fails on any other request (AC98).
* No URL routing. The hash, history and back button are ignored. The parent area exists only in memory after the gate; a reload always starts on a kid screen with the gate closed (AC76).
* The PIN is stored as SHA-256 of salt plus PIN, with an in house SHA-256 so it works on plain http (AC128). It only hides the code from casual eyes.
* E2e test hooks (`window.__dino`) exist only in the e2e build (`__E2E__` define). `scripts/check-dist.mjs` fails if the production `dist/` contains `__dino`.
* The fps counter is hidden from the kid. It shows only when the address has `?fps=1` (used by the founder for the iPad check). The home screen app always opens the plain address.

## How to run

```
npm install
npm run dev          # Vite on the local network. Open the shown http://192.168.x.x:5173 on the iPad.
npm run build        # production build into dist/
npm run preview      # build, then wrangler dev: the built site served like production
```

The factory itself runs in the cloud, so real iPad checks use a test deploy to the `workers.dev` address at each milestone (decision 37, standing yes from the founder for milestone test deploys only).

On plain http (the dev server on the home network) Safari has no service worker, no file share sheet and no persistent storage. The app runs anyway and shows parent notes (AC140). Install, offline and sharing are checked on the deployed HTTPS address.

## How to test

`./scripts/check.sh` runs everything, in this order:
1. `validate.py` on every folder in `docs/modules/` (fails if python3 is missing).
2. `npm ci`, `npm run lint` (ESLint), `npm run typecheck` (`tsc --noEmit`).
3. `npm test`: Vitest unit tests (`src/**/*.test.ts`, `tests/unit/**/*.test.ts`). They run in plain Node by default, which is twice as fast. A test file that needs a page (`document`, `window`, `HTMLElement`) starts with `// @vitest-environment jsdom`.
4. `npm run build`, then `npm run test:dist` (`scripts/check-dist.mjs`: `dist/index.html`, manifest, icons and service worker exist, no test hooks, total size under 5 MB).
5. `npx playwright install webkit` (with `--with-deps` when running as root, as in the cloud sandbox), then `npm run test:e2e`: Playwright WebKit. Its `webServer` runs `npm run build:e2e` (output `dist-e2e/`, with test hooks) and `vite preview` on it.

`CHECK_E2E=0 ./scripts/check.sh` runs steps 1 to 4 only.

**CI** (`.github/workflows/ci.yml`) runs once per commit: on every push (pull requests from a fork get their own run). A newer push to the same branch cancels the older run, except on `main`. Two parts run at the same time: `check` (`CHECK_E2E=0 ./scripts/check.sh`) and `e2e`, split in 4 shards (`npx playwright test --shard=N/4`) inside the `mcr.microsoft.com/playwright` image, which already holds WebKit. When `@playwright/test` is updated, update the image tag in `ci.yml` to the same version.

**Content release path.** First `check.sh` asks `scripts/check-scope.sh` what changed against the base (`origin/main`, or `$CHECK_BASE`), including uncommitted and untracked files. When every change is learning content or docs (`docs/**` except `docs/modules/validate.py`, `.claude/**`, `CHANGELOG.md`, `README.md`), it runs `scripts/check-content.sh` instead: `validate.py` on every module, the unit tests that load modules (`src/content`, `src/learning`, `src/app`, `tests/unit`), `npm run build` and `npm run test:dist`. No lint, typecheck or e2e, because no code changed. Any code change, a change to the module format, an unknown base, `main` or a deploy (`CHECK_FULL=1`) runs everything. CI skips the WebKit install on the content path.

Playwright projects: `ipad-landscape` (iPad (gen 6) landscape, main), `ipad-portrait` (only the "Draai je iPad" specs), `ipad-pro-landscape` (layout specs). All have `hasTouch`. Fake time uses Playwright's `page.clock`. Multi touch uses synthetic `PointerEvent`s with `pointerType: "touch"` dispatched in the page.

Test hooks (`src/dev/e2e-hooks.ts`), e2e build only: read state (player position, block at a cell, points, timers, current screen, session), simulate WebGL context loss, place the player, set points, start a break now. Hooks never open a parent screen; e2e tests go through the gate with the PIN like a parent.

**Test setup.**
* `tests/setup/vitest.setup.ts` loads `fake-indexeddb/auto` and stubs the 2D canvas, which jsdom lacks. Code that paints (atlas, name tags) has a pure part that returns pixel data or layout, unit tested, and a thin canvas wrapper checked in e2e.
* `sound.ts` takes an AudioContext factory; unit tests pass the fake from `tests/unit/fakes/`.
* `asInsecure(page)` simulates plain http on `localhost` (which counts as secure): an init script removes `crypto.subtle`, `navigator.serviceWorker`, `navigator.share` and `navigator.storage.persist` and sets `isSecureContext` to false (AC128, AC140).
* `killApp(page)` simulates iOS killing the app: it calls the `simulateKill` hook (the save queue stops flushing on hide), closes the page and opens a new one in the same context (AC24, AC96, AC150).
* After T48b, `openApp` passes the first start with a test PIN, and `loginAsParent` opens the parent area through the gate.
* Contrast: `src/ui/contrast.ts` computes ratios; a unit test checks the kid colour tokens, the a11y audit checks rendered screens (AC141).
* Multi touch in e2e is synthetic pointer events; real two finger play is checked on the iPad (T64).
* Tests read `WORLD_SIZE`, never a literal 64, because the spike may change it to 48.

Rules: every task adds tests that fail without its change. Pure logic is tested with unit tests, screens with jsdom unit tests plus at least one e2e spec per flow. Checks marked (iPad) in the PRD are done by hand on the real iPad at milestones and written in `docs/TEST_REPORT.md`.

## How to deploy

* Worker name `dino-blokwereld`, static assets from `./dist`, `compatibility_date` 2026-10-17, see `wrangler.jsonc`. No Worker script, no KV, D1 or R2. `preview_urls` is off so no extra public addresses appear.
* Address: `https://dino-blokwereld.<account subdomain>.workers.dev` (F9, public).
* `npm run deploy` (build, then `wrangler deploy`) on the founder's machine after `npx wrangler login`, or the manual "Deploy to Cloudflare Workers" GitHub workflow (it does not rerun the tests; it refuses a commit without a green CI run, then builds and deploys) with the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, which only the founder adds.
* Every deploy is a founder decision. The ship checklist confirms Cloudflare Web Analytics is off for this Worker (AC98).
* `public/_headers` sets `Cache-Control: no-cache` for `/service-worker.js` and `/index.html`, and long caching for hashed files in `/assets/`.

## Conventions for developers

* **Files per task.** Only touch the files your task lists, plus its tests. Parallel tasks never share a file.
* **Stub pattern.** When a screen needs a menu entry for something a later task builds, the earlier task creates the later file as a stub that shows "Komt nog" and exports the final function signature. The later task replaces the stub. This keeps shared files out of parallel work. Stubs are listed in each task.
* **Integration files** (`src/main.ts`, `src/game/game.ts`, `src/app/screens.ts`, `src/ui/hud.ts`, `vite.config.ts`) are touched only by tasks that list them, never by two tasks in the same parallel group.
* **Test hooks.** `src/dev/e2e-hooks.ts` (T1) only offers `registerHook(name, fn)`. Each feature registers its hooks inside its own source file, in `if (__E2E__) { ... }`, so no separate hook files and no shared edits.
* **Starting order.** A task never starts while another running task lists any of the same files.
* **Shared docs.** In a parallel group, developers do not edit `CHANGELOG.md`, `README.md` or this file. They put the line they want in their report and the operator adds it when committing.
* **Colocated tests.** A file listed for a task includes its test file next to it (`x.ts` and `x.test.ts`).
* **CSS** lives in `src/styles/`, one file per screen, imported by that screen's `.ts` file (`import '../styles/x.css'`). `tokens.css` and `base.css` are imported by `main.ts`.
* **Dutch text** for the kid and parent lives in the file of the screen that shows it. Short sentences, groep 5 level on kid screens.
* **Point values and egg prices** live in `src/core/economy.ts` and `src/dinos/kinds.ts`, nowhere else.
* **Time.** Never call `Date.now()` in pure code; take a `Clock`. Days are local calendar days from `clock.ts`.

## Risks

| Risk | What we do |
|---|---|
| 3D too slow on the 2018 iPad (A10 chip, 2048 x 1536) | Speed spike task T32 with 14 placeholder dinos, measured by the founder (fps counter). Fallbacks in order: pixel ratio 1.5, fog closer, 48 x 48 world. Go or no go is logged in DECISIONS. |
| WebGL in headless WebKit on Linux is slow or missing | E2e tests read game state through hooks, not pixels. If WebGL is missing in CI, the e2e build falls back to a null renderer and the rest still runs. The spike task finds out. |
| Context loss after the background | Rebuild from game state (AC109), tested with `WEBGL_lose_context`. |
| iOS kills the app without `pagehide` | Save queue writes within about 2 seconds, not only on hide. |
| Separate storage for Safari tab and home screen app | First start note, backups. |
| Two validators drift | Shared fixture test runs both. |
| Large plan (71 tasks) | Pure logic first and in parallel, stubs for menus, milestones playable early. |
| Share sheet in home screen mode | Fallback new view (PRD 4.15), checked on the real iPad at M5. |
| Taal content mistakes | Validator checks plus the human check (T65). |
