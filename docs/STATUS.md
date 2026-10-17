# Status

**Phase:** build, milestone M2 complete (ready for M3)
**Next step:** Build M3 (Dinos in the world T42, Dino menu & naming T45, full Lesboek & Extra oefenen T46, Dinowinkel egg shop T47), or run the T32 speed spike on the founder's iPad.
**Blockers:** For live Cloudflare test deploy, the founder must add the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Done
* Brainstorm: concept chosen (free 3D Minecraft world with dinos, learning breaks, Dutch, age 8 to 10).
* Cito taalverzorging module for groep 6 and 7: 10 topics, 288 questions, 4 exams in `docs/modules/cito-taalverzorging/`. Passes `docs/modules/validate.py` (T2).
* PRD drafted, reviewed by architect and qa (1 round), all founder decisions F1 to F15 answered.
* PRD approved by the founder in chat on 2026-10-17.
* **M1 code is done** (except the on-device speed spike T32):
  * T1 scaffold, lint, unit tests, WebKit e2e setup, npm scripts.
  * T3 iPad shell: no zoom, no selection, portrait message, manifest and icons.
  * T4 world data and seeded terrain. T8 block atlas and chunk mesher.
  * T5 storage core and T66 typed save records.
  * T9 physics and raycast. T10 touch controls and HUD.
  * T23a renderer and fps counter. T23b walkable world and game loop.
  * T24 mine and place rules. T33 Hakken, Bouwen, hotbar and Alle blokken.
  * T34 recovers after WebGL context loss. T37 saves the world and the player.
  * T11 sound effects.
* **M2 code is done** (76 unit test files / 615 tests passing, e2e specs added, production & e2e builds verified):
  * **T35 (`src/content/catalog.ts`, `src/content/switches.ts`):** Unified catalog of built-in Rekenen & Taal plus own modules; switch hierarchy (subject -> module -> topic -> skill), level selection, topic overrides, Groep 6/7 presets, module weights, and item counts.
  * **T38 (`src/learning/selection.ts`, `src/learning/generated-items.ts`):** Leitner SRS due-first selection, new-topic pointer advancement, and 200-newest cap for saved generated Rekenen sums (`optellen`, `aftrekken`).
  * **T36 (`src/ui/learn/break-screen.ts`, `dino-juf.ts`, `question-host.ts`, `summary.ts`, `src/styles/break.css`):** Full learning break UI with Dino Juf, progress dots, question views (`choice`, `find-error`, `type`, `punctuate`), retry banner, teach moment (with Rekenen worked examples and Taal lesson pages), and summary screen.
  * **T41 (`src/app/screens.ts`, `src/app/timer-driver.ts`, `src/ui/countdown.ts`, `src/styles/countdown.css`, `tests/e2e/timer.spec.ts`):** Screen layer manager, 1s heartbeat timer driver connected to `timerMatrix`, visibility/focus/screen-guard listeners, play time stats per day, and live HUD countdown pill (`"Leerpauze over 5:00"`) with 30s warning pulse and 10s tick sound.
  * **T43 (`src/app/break-flow.ts`, `src/app/content-loader.ts`, `src/app/resume.ts`, `src/app/exam-flow.ts`, `tests/e2e/break.spec.ts`):** End-to-end learning break orchestrator with module rotation, first-time topic lesson display, step-by-step session persistence (`sessionStore`), SRS box updates, answer/break/ledger logging, and automatic resume on app reload.
  * **T44 (`src/ui/pause-menu.ts`, `src/styles/pause-menu.css`, `src/ui/learn/lesboek.ts`, `src/app/practice-flow.ts`, `src/app/shop-flow.ts`, `tests/e2e/pause.spec.ts`):** Pause menu showing points total, `Terug naar de wereld`, `Ik zit vast` (calls `game.teleportHome()`), `Dinowinkel`, `Lesboek`, `Extra oefenen`, and `Ouders`.
* **Founder-Requested Enhancements (implemented with M2):**
  1. **Higher in the sky + eased camera angle arrows:** Doubled `WORLD_HEIGHT` from `32` to `64` in `src/world/terrain.ts`, added `Omhoog ⬆` sky-ascend support (`ascend()` / `setAscending()`), and added on-screen camera angle arrow buttons (`▲`, `▼`, `◀`, `▶`) plus keyboard arrow keys with smooth exponential velocity easing in `src/game/player-controller.ts`, `src/ui/hud.ts`, and `src/game/game.ts`.
  2. **Countdown to learning moment:** Mounted live `"Leerpauze over M:SS"` countdown pill in the HUD top bar (`src/ui/countdown.ts`, `src/app/timer-driver.ts`).
  3. **Parental controls button & screen (`🔒 Ouders`):** Added the `🔒 Ouders` button in the HUD top bar, in the Pause menu, and as a floating lock button on kid overlays/breaks (`src/ui/lock-icon.ts`), wired to the 4-digit PIN gate & Dutch reset question (`src/ui/parent/gate-screen.ts`), Parent Shell (`src/ui/parent/parent-shell.ts`), Settings (`src/ui/parent/settings-screen.ts`, `src/app/settings-apply.ts`), and Content Picker (`src/ui/parent/content-screen.ts`, `src/app/parent-flow.ts`).

## Notes
* Biggest risk is 3D performance in iPad Safari. The T32 speed spike decides whether the plan holds.
* The Taal content still needs a human spelling check by the founder or a teacher (AC124).
* Safari can clear the saves of a site not opened for a while. Tell the founder to play from the home screen app.
