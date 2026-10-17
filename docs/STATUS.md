# Status

**Phase:** build, milestone M1
**Next step:** T32 speed spike on the founder's iPad. Run a test deploy (founder approves it) and check the game on the iPad. Write the go or no go in `docs/PLAN.md` and `docs/DECISIONS.md`.
**Blockers:** the founder must add the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Without them there is no test deploy.

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
  * T11 sound effects.

## Notes
* Biggest risk is 3D performance in iPad Safari. The T32 speed spike decides whether the plan holds.
* The Playwright WebKit browser cannot download in the cloud sandbox. GitHub CI runs the e2e tests.
* The Taal content still needs a human spelling check by the founder or a teacher (AC124).
* Content was written before the architect existed. The JSON module format may be adapted at /architect.
* Safari can clear the saves of a site not opened for a while. Tell the founder to play from the home screen app.
