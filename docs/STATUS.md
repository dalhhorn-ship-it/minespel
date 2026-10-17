# Status

**Phase:** build. M1 and M2 code is done. The M2 milestone review is running.
**Next step:** M3 (Dinowinkel, eggs, dino menu, Lesboek, Extra oefenen). Tasks T45, T46 and T47.
**Blockers:** T32 (the speed spike on the founder's iPad) waits for the founder to add the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Without them there is no test deploy. M1 is not fully done until T32 is.

## Done
* Brainstorm: concept chosen (free 3D Minecraft world with dinos, learning breaks, Dutch, age 8 to 10).
* Cito taalverzorging module for groep 6 and 7: 10 topics, 288 questions, 4 exams in `docs/modules/cito-taalverzorging/`. Passes `docs/modules/validate.py` (T2).
* PRD drafted, reviewed by architect and qa (1 round), all founder decisions F1 to F15 answered.
* PRD approved by the founder in chat on 2026-10-17.
* M1 code is done, except the speed spike (T32):
  * T1 scaffold, lint, unit tests, WebKit e2e setup, npm scripts.
  * T3 iPad shell: no zoom, no selection, portrait message, manifest and icons.
  * T4 world data and seeded terrain. T8 block atlas and chunk mesher.
  * T5 storage core and T66 typed save records.
  * T9 physics and raycast. T10 touch controls and HUD.
  * T23a renderer and fps counter. T23b walkable world and game loop.
  * T24 mine and place rules. T33 Hakken, Bouwen, hotbar and Alle blokken.
  * T34 recovers after WebGL context loss. T37 saves the world and the player.
* M2 code is done (21 tasks):
  * Content: T2 Taal checks and fixes, T7 content format and Taal loader, T14 Rekenen module and lessons, T27 Rekenen generator and worked examples, T35 catalog and switches, T16 module rotation.
  * Rules: T6 clock and timers, T12 answer checks and number parsing, T13 spaced repetition, T15 economy and dino kinds, T38 question selection, T31 break state machine, T67 session and log stores.
  * Screens: T11 sound effects, T28 kid question views, T29 kid keyboard and number pad, T30 lesson view and teach moment, T36 break screen, T41 screens, timers and the Leerpauze countdown, T43 break flow with saves and resume, T44 pause menu with "Ik zit vast".
  * T42 dinos and eggs in the world are done too. It is an M3 task that was built early.

## Notes
* Biggest risk is 3D performance in iPad Safari. The T32 speed spike decides whether the plan holds.
* The Playwright WebKit browser cannot download in the cloud sandbox. GitHub CI runs the e2e tests.
* The Taal content still needs a human spelling check by the founder or a teacher (AC124).
* The Rekenen lesson texts need a read by the founder or a teacher. Check the wording and the examples for the age group.
* Content was written before the architect existed. The JSON module format may be adapted at /architect.
* Safari can clear the saves of a site not opened for a while. Tell the founder to play from the home screen app.
