# Tech review: Dino Blokwereld

Architect review, 2026-10-24, on branch `claude/blissful-hawking-hr67ui` (same code as `main` at "Add English module Beautiful People (#10)", version 0.3.0, R1 shipped). Asked by the founder. Review only: no application code was changed. Starts from `docs/SIMPLIFY.md` (2026-10-19).

## 1. Snapshot

Measured today with a clean `npm ci`, then lint, typecheck, unit tests, build and the full e2e suite in local Chromium (`E2E_LOCAL=1`, 2 workers).

| What | 2026-10-19 (SIMPLIFY) | Today |
|---|---|---|
| `.ts` files in `src/` | 207 (116 code, 91 tests) | 212 (118 code, 94 tests) |
| Lines in `src/` incl. CSS | 30 084 | 30 858 (code 17 917, tests 10 644, CSS 2 297) |
| Biggest files | practice-flow 563, main 514, break-flow 502 | practice-flow 554, **main 544** (grew), switches 498, break-flow 495, shop.ts 493, exam-flow 465, shop.css 459, exam-session 448 |
| Copy and paste (jscpd, 8+ lines, no tests) | not measured | 0.93%: 167 lines in 15 small clones. Duplication is in shape, not in copied blocks |
| Unit tests | 93 files, 772 tests, 24 s | 98 files, 811 tests, 24.6 s. 54% is environment start up. Vitest itself says "about 14 s faster with isolate: false". Slowest: `generator.test.ts` 3.5 s, `exam-flow.test.ts` 1.8 s |
| Typecheck, lint | | 5.1 s, 4.4 s |
| Fixed sleeps in unit tests | 6 | 0, and an ESLint rule blocks new ones |
| E2e | 17 specs, 207 tests | 19 specs, 246 tests. `ui-review.spec.ts` still 1 221 lines and 141 tests (57%) |
| Fixed waits in e2e | 16 `waitForTimeout` plus 35 `settle()` | the same 16 (11 in `world.spec.ts`, 3 000 ms in `save.spec.ts`) plus 35 `settle()` |
| Local e2e (Chromium, 2 workers) | not possible | 6 min 50 s, 243 pass, **3 fail** (see N1 and N8) |
| CI time | branch 2.5 to 4 min, main 5 to 7 min | branch 2.7 to 3.0 min, main 3.0 min (4 shards) |
| CI health on `main` | 2 of 15 failed | **2 of the last 4 `main` runs failed** (#8 Taal fixes, #10 Engels), each on one e2e shard |
| Build | | 0.8 s. One JS file 957 KB (252 KB gzip), CSS 42 KB (8 KB gzip), fonts 110 KB, `dist/` 1.2 MB. Budget in `check-dist.mjs` is 5 MB |
| Learning content in the JS | | about 232 KB of module JSON (minified), about a quarter of the JS. Grows with every `/module` |
| `verify.sh acs` | about 50 FAIL | 1 FAIL (AC165, a by hand iPad check), 131 warnings |
| PRD | 908 lines, one stamp | 796 lines, backlog split out (decision 80) |
| Service worker, `storage.persist()` | none | still none (planned for v4) |
| Kid safety | | No `fetch`, no beacons, no outside URLs in the bundle. E2e hooks are not in the production build |

## 2. Status of the SIMPLIFY.md ideas

| Idea | Status | Evidence | Still worth it? |
|---|---|---|---|
| A1 One ready promise | Partly done | `src/app/boot.ts` (99 lines) gives `whenReady` and one waiting card; `boot-taps.spec.ts` covers it. But `main.ts:47-61` still has 13 nullable `let`s and calls `parentFlow?.open()` and so on, and the Dinowinkel keeps its own path (`openShop`, `waitingShop`, `shopFlowReady`, `main.ts:132-169`) | Yes, the rest is small: see N4 |
| A2 E2e hooks out of `main.ts` | Open | 40 `registerHook` calls, `main.ts:427-544`, a fifth of the file | Yes, S. Moved to R2 by decision 82 |
| A3 One session writer and queue | Partly done | One egg rule `canAffordEgg` in `core/economy.ts:153` (decision 84). Still two `formatGivenResponse` and `lessonForItem` (`break-flow.ts:93,143`, `practice-flow.ts:168,208`), two effect writers (`break-flow.ts:167-235`, `practice-flow.ts:225-275`), three queues (`break-flow.ts:288`, `exam-flow.ts:131`, `timer-driver.ts:98`), practice has none, three `shuffle`s | Yes, see N5 |
| A4 One `AppContext` | Open | `createApp()` in `main.ts:288-415` passes 8 to 14 options per flow; `practice-flow` keeps optional stores (`options.logStore &&`) | Yes, with A2 |
| A5 No global dino store | Open | `dino-store.ts:172-188`, `shop-flow.ts:57` | Yes, it blocks D6 |
| A6 Leave big healthy files | Holds | | Yes |
| B1 Delete dead exports | Open | `subjectCounts`, `skillExists`, `isGoldenColor`, `answeredCount`, `TAAL_CREATED_AT` still used nowhere; the test only list too | Yes, S |
| B2 Drop skill switches | Founder said no (decision 81) | `switches.ts` still 498 lines | Leave it |
| B3 Stale docs | Open | `SHOP_PRD.md` still there; ARCHITECTURE lists `public/_headers`, `offline/service-worker.js`, `backup.ts`, `virtual-list.ts` as if real; README says "Not yet" deployed | Yes, docs only. See N3 |
| C1 One boot | See A1 | | |
| C2 Slow storage | On hold (decisions 72, 83) | `world-save.ts:46,64-67` still gives up after 3 s and never saves the world that session | Yes, see N2 |
| C3 Tap before ready test | Done | `tests/e2e/boot-taps.spec.ts`, `helpers/slow-storage.ts` | |
| C4 No fixed sleeps in unit tests | Done | lint rule, decision 86 | |
| D1 Local Chromium e2e | Done | `test:e2e:local`, `playwright.config.ts:5-17` | Yes, but two tests are always red there: N8 |
| D2 One boot per size in UI review | Open | 141 boots | Less urgent now CI is 3 min. Keep for R3 |
| D3 Split `ui-review.spec.ts` | Open | 1 221 lines | Yes, S, any time |
| D4 Fewer sizes on branches | Founder said not now (decision 62) | | Leave it |
| D5 Polls instead of waits in e2e | Open | 16 `waitForTimeout` | Yes, `main` flakes (friction 2026-10-23) |
| D6 Vitest without isolation for Node tests | Open | Vitest reports 14 s to gain | Yes, after A5 |
| D7 One validate loop, `paths-ignore` | Open | loop in both `check.sh:19-33` and `check-content.sh:9-23`; no `paths-ignore` in `ci.yml` (docs commits now take about 0.7 min) | Script merge yes; `paths-ignore` low value now |
| E1 Split the PRD | Done | `docs/BACKLOG.md`, `docs/releases/v2.md`, decision 80 | |
| E2 Trim the PRD | Mostly done | 908 to 796 lines | |
| E3 Lighter checking | Partly | fast lane for releases of 3 tasks or fewer (CLAUDE.md) | Enough |
| E4 Kid bugs as patches | Founder said no (decision 81) | | Leave it |
| E5 Fewer `main.ts` clashes | Open | needs A2 first | Yes, with A2 |
| F1 Drop v7, v8 | Done | decision 79 | |
| F2, F3, F4 Smaller v4, v3, v6 | Founder said no (decision 81) | | See N6: one piece of v4 is worth pulling forward |
| F5 Taal check now | Done | #8, decision 88 | |

## 3. New findings

### N1. `main` is red: a content release broke an e2e test
* **What:** the Engels module added a new subject `engels`. The test helper `onlyRekenen` switches off only `taal`, so Engels questions now show up in a "Rekenen only" break and AC170 fails. The content release path skips e2e on the branch, so the branch was green and `main` went red.
* **Evidence:** `tests/e2e/points-v9.spec.ts:118` (`subjects: { ...cur.subjects, taal: false }`), check at `:134`. Fails in my local run. CI run for #10 on `main`: shard 2 failed. The #8 content release also failed on `main`.
* **Why it matters:** every new `/module` can break `main`, and a red `main` hides real bugs. The quick content path (decision 76) is only safe if tests never assume the list of modules.
* **Fix:** turn every subject off except `rekenen` (an allow list), the same rule the catalog unit test already follows. Add one line to `docs/modules/README.md` and ARCHITECTURE: "e2e tests never depend on which modules exist".
* **Size:** S. **Risk:** none.

### N2. Saves on refresh and slow start (decision 72, still on hold)
* **What:** two causes, both still in the code.
  1. On `pagehide` the save is chained behind any write in flight (`save-queue.ts:62-64`, `chain = chain.then(flushOnce)`). The new transaction starts later, in a promise callback. Safari often freezes the page before that. A block built less than a second before a refresh is lost, exactly as decision 72 describes.
  2. `bootSave` gives up after 3 s (`world-save.ts:46,64-67`), but `createApp()` keeps going. Points and dinos save, the world never does that session.
* **Also:** `navigator.storage.persist()` is called nowhere. In a Safari tab, iPadOS may wipe saves after 7 days without a visit.
* **Why it matters:** losing builds is the worst thing that can happen to the kids. Nothing else in this review comes close.
* **Fix:** on `pagehide` and `visibilitychange` hidden, open the IndexedDB transaction synchronously inside the event handler (read the values, call `db.transaction`, `put`), and do not wait for the chain. When storage opens after the 3 s, start world saving then. Call `navigator.storage.persist()` once after the first tap.
* **Size:** S to M (3 small tasks). **Risk:** medium, it touches saving; `save.spec.ts` and the kill hook cover it.
* **Founder decision:** decision 72 holds this fix, and `persist()` is v4 scope. Options: a) pull these three into a small "Bouwsels veilig" release now, before or as part of v3 (recommended); b) keep them in v4; c) leave as is.

### N3. Which deploy is real is unclear
* **What:** `wrangler.jsonc` names the Worker `dino-blokwereld`, but the PRD (`PRD.md:32`) and STATUS say the live Worker is `minespel`. `wrangler.jsonc` has a `previews` block "for Cloudflare Workers Builds", which means the repo is connected to Cloudflare and builds on push. `deploy.yml` says deploys are manual only and need green CI. README line 74 says "Not yet" deployed.
* **Why it matters:** if Workers Builds deploys `main` by itself, a red `main` (N1) goes live without anyone saying yes, which breaks the CLAUDE.md rule that every deploy is a founder decision. If the name is wrong, a deploy may make a second Worker.
* **Fix:** the founder checks in the Cloudflare dashboard which Worker is live and whether Workers Builds deploys on push. Then one docs task makes README, ARCHITECTURE "How to deploy", PRD wording and `wrangler.jsonc` agree.
* **Size:** S. **Risk:** low, but a wrong name can break the live site, so only the founder confirms.
* **Founder decision.** Options: a) keep Workers Builds on `main`, accept "merge is deploy", and make sure `main` is merged only with green CI (recommended if it is already set up); b) turn off Workers Builds and deploy only with the manual workflow; c) keep both but on separate Workers.

### N4. `main.ts` keeps growing
* **What:** 544 lines (was 514). 13 nullable variables, a special Dinowinkel waiting path next to `whenReady`, `createApp()` with all flow wiring, and 40 test hooks.
* **Evidence:** `main.ts:47-61`, `:132-169`, `:288-415`, `:427-544`.
* **Why it matters:** every release touches it, so it serialises parallel work (decision 64), and each new button is a chance to forget `whenReady`.
* **Fix:** R2 as planned: hooks to `src/dev/app-hooks.ts` (A2), flows built in `src/app/boot.ts` returning one `App` object (A1 rest, A4). Keep the instant Dinowinkel placeholder (AC164) but drive it from `gate.ready` instead of its own variables.
* **Size:** M. **Risk:** low to medium; `boot-taps.spec.ts` guards it.

### N5. Points are saved as a copy of the whole economy record
* **What:** break and practice write `records.put('economy', state.economy)`, the session's own copy, then the ledger in a second transaction.
* **Evidence:** `break-flow.ts:207-215`, `practice-flow.ts:262-270`.
* **Why it matters:** safe today, because only one session runs at a time and the shop is closed during it. But any later writer (the golden egg, v6 results, a backup restore) that changes points during a session gets overwritten. Points and ledger can also drift apart if the app is killed between the two writes. This is the kind of bug that made the kid say "the points do not add up".
* **Fix:** part of A3: one `writeEffects` in `src/app/session-log.ts` that adds the delta with `records.update` and writes the ledger row in the same transaction. Practice uses the same serial queue as break.
* **Size:** M. **Risk:** low to medium; flow unit tests cover the writes.

### N6. Rendering at full Retina on an older iPad
* **What:** the pixel ratio cap defaults to 2 (`render/quality.ts:12`), so an iPad renders 2048 x 1536. The speed spike T32 was never run, and nothing lowers quality when the frame rate drops.
* **Why it matters:** on a 2017 or 2018 iPad this is the most likely cause of stutter and a hot iPad. Voxel art with nearest filtering looks almost the same at 1.5.
* **Fix:** measure first with `?fps=1` and `?pr=1.5` on the family iPad (the knobs exist). If it helps, make 1.5 the default, or drop to 1.5 by itself after a few seconds below 40 fps.
* **Size:** S. **Risk:** low. Needs the real iPad, so it fits the v5 speed spike or any milestone iPad check.

### N7. A version test that breaks the next release
* **What:** `tests/unit/release-v9.test.ts` expects exactly `0.3.0`. The v2 test was written as "0.2.0 or later".
* **Why it matters:** the next release fails `check.sh` until someone edits an old test, and `verify.sh` does not allow deleting test files.
* **Fix:** "0.3.0 or later", like `release-v2.test.ts:11`.
* **Size:** S. **Risk:** none.

### N8. The checks agents run are not green where agents work
* **What:** `check.sh` always installs WebKit (`check.sh:47-51`), which the cloud container blocks, so the full check can never pass there. In local Chromium, `exam.spec.ts` AC68 and AC112 always fail on exact clock numbers (`299968` against `300000`, `1795000` against `1800000`). `check.sh` also runs `npm ci` every time (about 10 s).
* **Why it matters:** when a local run is always a bit red, agents learn to ignore red. That is how the R1b regression was first called a flake (friction 2026-10-23).
* **Fix:** in `check.sh`, when WebKit cannot be installed and the Chromium in `/opt/pw-browsers` exists, run `E2E_LOCAL=1` and say so in the output (CI keeps WebKit). Make the two exam tests allow a second of clock drift or freeze the clock first. Skip `npm ci` when `node_modules/.package-lock.json` is newer than `package-lock.json`.
* **Size:** S. **Risk:** low; CI on WebKit stays the truth.

### N9. Fixed waits in e2e still cause `main` flakes
* **What:** 16 `waitForTimeout` (11 in `world.spec.ts`, one of 3 000 ms in `save.spec.ts:26`, one of 1 800 ms in `world.spec.ts:102`) and 35 `settle()` sleeps in `ui-review.spec.ts:270`.
* **Why it matters:** friction 2026-10-23 records a physics test failing on `main`. Each flake costs a rerun and trust.
* **Fix:** D5 as planned: `expect.poll` on hooks, `flushSave` instead of 3 s.
* **Size:** S. **Risk:** none.

### N10. The own modules code path is left over from v7 and v8
* **What:** `src/app/content-loader.ts` reads the `ownModules` store and validates each entry at every start. Nothing writes that store since decision 79.
* **Why it matters:** small, but it is one more thing agents read and keep working.
* **Fix:** load the catalog from the folder modules only. Keep the store in the schema (old saves), and keep `validate.ts`: the unit tests use it to check the generated Rekenen module, which `validate.py` cannot see.
* **Size:** S. **Risk:** low.

### N11. The bundle grows with every module
* **What:** one 957 KB JS file, about a quarter of it learning content. Each `/module` adds 30 to 180 KB raw.
* **Why it matters:** not yet. 252 KB gzip loads fast on home wifi, and the 5 MB budget is far away. Without a service worker, every content release makes the iPad fetch the whole file again, three.js included.
* **Fix, later:** put three.js in its own chunk (one line in `vite.config.ts`), so a content release only changes the app chunk. Do this together with the v4 service worker, not before.
* **Size:** S. **Risk:** low.

### Nits
* `src/dev/spike-load.ts` and `?spike=1` ship in the production bundle. Harmless, small.
* `docs/STATUS.md` still has a 40 line "Done" section from the Gemini era (B3).
* `scripts/make-icons.mjs` is not wired to any npm script; mention it in README or drop it.

## 4. Top 5 recommendations

Ranked by value for the least effort.

| # | What | Size | Who decides | Fits a release of at most 5 tasks? |
|---|---|---|---|---|
| 1 | **Fix the red `main`** (N1): allow list in `onlyRekenen`, plus the rule that e2e never depends on the module list. Fix the version pin test (N7) in the same go | S, 1 task | Agent | Yes, fast lane |
| 2 | **Make the deploy path clear** (N3): which Worker is live, does a merge deploy | S, founder check plus 1 docs task | **Founder** (deploys) | Yes, docs only |
| 3 | **Keep the builds safe** (N2): save synchronously on `pagehide`, start world saving when storage opens late, `storage.persist()` | S to M, 3 tasks | **Founder** (lifts the hold of decision 72, moves a v4 item forward) | Yes: a small release of 3 tasks, or the first 3 tasks of v3 |
| 4 | **Trustworthy local checks** (N8, N9): `check.sh` falls back to local Chromium, the two exam clock tests, polls instead of sleeps | S, 2 tasks | Agent | Yes |
| 5 | **R2 refactor round** (N4, N5, A2 to A5, B1, D6): `main.ts` wiring and hooks out, one session writer with atomic points, one shuffle and queue, no global dino store, dead exports out, Vitest without isolation for Node tests | M, 5 tasks | Agent (no behaviour change for the kids) | Yes, exactly 5: R2a hooks and boot, R2b session writer, R2c shuffle, queue and dead code, R2d dino store and Vitest projects, R2e UI review split |

Suggested order: 1 and 2 now (they are small and `main` is red). Then 3, because it protects what the kids built. Then 4 beside the next release. Then R2 before v6, because v6 reads the logs that R2b makes uniform. N6 goes into the next real iPad check.

## 5. Things not to do

* **No UI framework, state library or IndexedDB library.** Plain DOM with `el()` is fine; the trouble is wiring, not rendering.
* **Do not merge break, practice and exam into one generic flow.** Their rules differ (exam has no retry, a timer and the golden egg). Share the writer and helpers, keep three small flows.
* **Do not lazy load modules or code split now.** It adds loading states and offline cases for about 60 KB gzip. Revisit with the v4 service worker.
* **Do not drop `validate.ts` for `validate.py` alone.** The TS validator checks the generated Rekenen module and runs in unit tests. The two agree by test.
* **Do not drop the UI review spec or run it on Chromium only.** It catches real layout bugs at the iPad sizes. Make it faster (D2, D3), do not remove it.
* **Do not turn off WebKit in CI** because local Chromium is quicker. WebKit is the closest thing to the iPad we have.
* **Do not split `game.ts`, `renderer.ts`, `shop.ts` or `switches.ts` on their own.** Split a file only inside a release that already changes it.
* **Do not add `paths-ignore` for docs.** Docs only runs take about 0.7 min now; not worth another founder question.
* **Do not batch R2 with a kid release.** A refactor round is its own milestone with one architect review.
