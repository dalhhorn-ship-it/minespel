> Known tech debt in one table. Major means it can cost the kids their builds or points. Checked against the code on 2026-11-06.

# Tech debt

How to use it:
* Add a row when a review, a friction line or a developer finds debt. Take the next free id.
* Severity is `major`, `medium` or `low`. Major: the kids can lose something, or `main` can go red. Medium: it slows every release or hides bugs. Low: tidy up when the file is touched anyway.
* Set Status to `done` when it is fixed, and name the decision or task in Source. Do not delete rows.
* `python3 scripts/dashboard.py` counts the open rows per severity. Its Roadmap tab puts every open row in the foundation lane, major first.

| Id | Severity | Item | Where | Size | Source | Status |
|---|---|---|---|---|---|---|
| TD1 | major | A refresh can lose the last built block. On `pagehide` the save waits behind any write in flight, and Safari often freezes the page first. | `src/storage/save-queue.ts:62` | S | TECH_REVIEW N2, decision 72 (on hold) | open |
| TD2 | major | When storage opens after 3 seconds, the world is not saved for the rest of that session. Points and dinos still save. | `src/game/world-save.ts:52` | S | TECH_REVIEW N2, decision 72 (on hold) | open |
| TD3 | medium | `navigator.storage.persist()` is never called, so iPadOS may wipe a Safari tab's saves after 7 days without a visit. | `src/platform/` | S | TECH_REVIEW N2, v4 scope | open |
| TD4 | medium | The speed spike never ran. Rendering is capped at pixel ratio 2, and nothing lowers quality when the frame rate drops. | `src/render/quality.ts:12`, task T32 | S | TECH_REVIEW N6 | open |
| TD5 | medium | The Dinowinkel is the biggest code: `shop.ts` 683 lines, `shop.css` 531, `shop-flow.ts` 381. It grows with every shop wish. | `src/ui/shop.ts` | M | SIMPLIFY section 1 | open |
| TD6 | medium | `boot-taps.spec.ts:95` failed once in a full run: the waiting card came later than its 300 ms window under load. | `tests/e2e/boot-taps.spec.ts:95` | S | FRICTION 2026-10-26 | open |
| TD7 | low | `context-loss.spec.ts` fails under double load (8 workers on 4 cores). Its 3 second limits are the product promise. | `tests/e2e/context-loss.spec.ts` | S | FRICTION 2026-10-26 | open |
| TD8 | low | The village cooldown counts a shorter break interval as elapsed time once, so a villager question can come a bit sooner. | `src/app/village-flow.ts` | S | FRICTION 2026-10-24 (V11d review) | open |
| TD9 | low | The kept copy of the old world record from v11 is still in every save. It is planned to go in v3 (0.6.0). | `src/storage/` | S | PRD section 12, v3 In item 7 | open |
| TD10 | low | The own modules code path from v7 and v8 still reads the `ownModules` store at every start. Nothing writes it. | `src/app/content-loader.ts:11` | S | TECH_REVIEW N10 | open |
| TD11 | low | three.js is not in its own chunk, so every content release makes the iPad fetch the whole bundle again. Do it with the v4 service worker. | `vite.config.ts` | S | TECH_REVIEW N11 | open |
| TD12 | low | The speed spike loader ships in the production bundle. | `src/dev/spike-load.ts` | S | TECH_REVIEW nits | open |
| TD13 | low | `scripts/make-icons.mjs` is not wired to an npm script or named in the README. | `scripts/make-icons.mjs` | S | TECH_REVIEW nits | open |
| TD14 | low | `docs/STATUS.md` still has a long Done section from the Gemini era. | `docs/STATUS.md` | S | TECH_REVIEW nits | open |
| TD22 | medium | exam.spec.ts:254 (AC112, the exam timer does not count in portrait) fails about 2 in 5 runs in local Chromium: 5 s still count after the turn to portrait. It fails at 4c13d07 too, so it is older than v3. | `tests/e2e/exam.spec.ts:254`, exam timer pause | S | v3 build 2026-11-06 | open |
| TD15 | major | `main` was red: an e2e helper assumed the list of modules. | `tests/e2e/points-v9.spec.ts` | S | TECH_REVIEW N1, decision 100 | done |
| TD16 | major | It was unclear which deploy is live and whether a merge deploys. | `wrangler.jsonc` | S | TECH_REVIEW N3, decision 98 | done |
| TD17 | medium | `main.ts` held every flow and all test hooks (544 lines). Now 245. | `src/main.ts` | M | TECH_REVIEW N4, R2a, decision 110 | done |
| TD18 | medium | Points were saved as a copy of the whole economy record, apart from the ledger. | `src/app/session-log.ts` | M | TECH_REVIEW N5, R2b, decision 110 | done |
| TD19 | medium | Break and practice each had their own session helpers, and they drifted. | `src/app/session-log.ts` | M | SIMPLIFY section 1 pain 2, R2b and R2c | done |
| TD20 | medium | The local checks were never green where agents work: no WebKit, exact clock numbers, fixed waits. | `scripts/check.sh` | S | TECH_REVIEW N7 to N9, decisions 100 and 107 | done |
| TD21 | medium | The UI review spec was one slow 1 221 line file that booted the app 141 times. | `tests/e2e/ui-review.spec.ts` | M | SIMPLIFY section 1 pain 4, R2e, decision 116 | done |
