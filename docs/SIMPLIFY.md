# Simplify: keeping Dino Blokwereld small and quick to change

Architect review, 2026-10-19, after v2 (0.2.0). Read from the real code, tests, CI runs and friction log. No code was changed for this review.

## 1. What hurts most

### The numbers (measured today)

| What | Measured |
|---|---|
| Source | 207 `.ts` files in `src/` (116 code, 91 tests), 30 084 lines including CSS |
| Biggest code files | `src/app/practice-flow.ts` 563, `src/main.ts` 514, `src/app/break-flow.ts` 502, `src/content/switches.ts` 498, `src/ui/shop.ts` 493, `src/app/exam-flow.ts` 465, `src/styles/shop.css` 459, `src/learning/exam-session.ts` 448 |
| The Dinowinkel | `shop.ts` 493 + `shop.css` 459 + `shop-flow.ts` 287 = 1 239 lines for 4 dinos and a chicken coop |
| Unit tests | 93 files, 772 tests, 24 s locally. 56% of that time is worker start up (93 workers at about 483 ms each) |
| E2e | 17 specs, 207 tests. `tests/e2e/ui-review.spec.ts` is 1 221 lines and 141 of the 207 tests (68%), about 86% of e2e time. Every one of its tests boots the app from scratch |
| Fixed waits | 6 fixed sleeps left in unit tests, 16 `waitForTimeout` in e2e (11 in `world.spec.ts`, one of 3 000 ms in `save.spec.ts`), plus `settle()` called 35 times in `ui-review.spec.ts` |
| CI | Branch runs about 2.5 to 4 min, `main` runs 5 to 7 min (full e2e). 2 of the last 15 runs failed, 2 were cancelled |
| Docs | `docs/PRD.md` 908 lines with 165 acceptance criteria, all under one hash stamp. `docs/SHOP_PRD.md` 86 more lines outside the stamp |
| Git | 145 commits, 41 start with `docs`, 22 are fixes |

### The five pains, with evidence

1. **Boot leaves buttons dead.** `src/main.ts` keeps 11 nullable `let` variables (`game`, `queue`, `records`, `screens`, `timerDriver`, `breakFlow`, `parentFlow`, `shopFlow`, `practiceFlow`, `examFlow`, plus menus) and calls flows as `parentFlow?.open()`, `practiceFlow?.open()`, `practiceFlow?.startTopic()`, `breakFlow?.startBreak()`. While boot runs, those taps do nothing. If IndexedDB hangs, they do nothing forever. Pauze and Winkel got a special fix (`waitingShop`, `recordsReady`, `shopFlowReady`, about 60 lines), the others did not: Ouders, Extra oefenen, Lesboek's "Oefen dit onderwerp", Nu oefenen on the countdown and Verdien punten in the shop. Friction row 2026-10-19 "Pauze does not work on the iPad". Second problem in the same spot: `bootSave` (`src/game/world-save.ts`) gives up after 3 s, but `create()` keeps running. The flows, points and dinos then start saving later, while the world itself never saves for that session. That is a mixed state and a likely cause of decision 72 (a block lost after refresh).
2. **The same session code three times, and it already drifts.** `break-flow.ts` and `practice-flow.ts` each have their own `formatGivenResponse`, `lessonForItem`, `canAffordEgg` and a 60 to 100 line effect writer (answer log, box, points, ledger). They no longer agree. `canAffordEgg` in break-flow counts every dino, egg, chicken and golden dino against 12 (`MAX_DINOS_AND_EGGS`, line 154). Practice-flow uses `shopDinoCount`, which skips golden dinos and chickens (decisions 14 and 55). So the break summary can say "no egg possible" while Extra oefenen says yes. Break-flow and exam-flow run every step through a serial queue (`enqueueDispatch`, `enqueue`); practice-flow does not. `shuffle` is copied three times (`generator.ts`, `selection.ts`, `exam-session.ts`).
3. **E2e cannot run where agents work.** The cloud container blocks the WebKit download, so an e2e mistake costs a full CI round. Four friction rows are exactly that (practice.spec, timer.spec, world.spec, T51b exam spec), each time "the app was right". Chromium is already on disk (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), but Playwright 1.64.1 expects build 1248, so it is never used.
4. **The UI review spec is the slow monolith of the tests.** 1 221 lines in one file: an in page audit, 22 screen recipes, a session walker that answers questions, and real tap tests. It runs every screen at 4 sizes and boots the app 141 times. It waits with fixed `settle()` sleeps instead of waiting for the screen.
5. **The process taxes every small change.** The PRD is one 908 line file under one SHA-256 stamp. Any edit, even marking a release `shipped` in the backlog table, closes the gate and needs a new founder yes. Signoff caused 2 friction rows. v2 grew to 6 tasks over the 5 task rule when a kid bug came in. The spec also drifted from the build: AC77 promises skill switches and per topic level overrides, the parent screen has neither, but `switches.ts` still carries the code (`setSkillOn`, `setModuleOn`, `setTopicLevelOverride` are used only by tests).

## 2. Ideas

Effort: S is under one session, M is one or two sessions, L is more. **TOP** marks the five I recommend first.

### A. Code structure and monoliths

**A1. TOP. One `ready` promise for the app, instead of 11 nullable variables.**
* Change: a new `src/app/boot.ts` opens storage and builds every flow, returning `Promise<App>` (records, stores, all flows). `main.ts` makes the world and HUD at once, then wires each button through one helper, `whenReady((app) => app.parentFlow.open())`. When the app is not ready yet, the helper shows one shared "Even geduld..." card and runs the action when ready. If storage never opens, the card says so in friendly words instead of doing nothing. This replaces `waitingShop`, `shopFlowReady` and `recordsReady`.
* Why: one rule for every button, so the Pauze bug cannot come back on another button. New buttons in later releases get it for free.
* Effort: M. Payoff: `main.ts` drops from 514 to about 200 lines, no silent dead taps. Risk: medium, boot order changes. Guard it with C3 (tap before ready test) and the existing e2e.
* Agent decision, as long as the waiting card uses the same look as today's Dinowinkel waiting card.

**A2. Move the e2e hooks out of `main.ts`.**
* Change: the 39 `registerHook` calls in `main.ts` (lines 405 to 514) move to `src/dev/app-hooks.ts`, called once with the `App` and `Game`.
* Why: a third of `main.ts` is test glue. It is also the file every release wants to touch, and decision 34 lets only one task edit it at a time.
* Effort: S. Payoff: smaller main, fewer file clashes between parallel developers. Risk: low, e2e proves it. Agent decision.

**A3. TOP. One shared session writer and one serial queue.**
* Change: new `src/app/session-log.ts` with `formatGivenResponse`, `lessonForItem`, `canAffordEgg` (one cap rule from `core/economy.ts`) and `writeEffects(ctx, effects)` for answer, box, points and ledger. New `serialQueue()` helper in `src/core/`. Break, practice and exam flows use both. `shuffle` moves to `src/core/rng.ts`.
* Why: three copies have already drifted (pain 2). Every future rule change (points, logging for v6 results) would otherwise be made two or three times.
* Effort: M. Payoff: about 200 lines less, one place for v6 results to read from, practice gets the same tap safety as breaks. Risk: low to medium; the flow unit tests cover the writes.
* The `canAffordEgg` change is a bug fix that follows decisions 14 and 55 (golden dinos and chickens do not count). Agent decision, but tell the founder.

**A4. One context object for the flows.**
* Change: `clock, rng, screens, records, progressStore, logStore, sessionStore, getCatalog, sound` are passed to each flow one by one (8 to 12 options per flow). Pass one `AppContext` instead. Make the stores required, not optional (`options.logStore?` in practice-flow).
* Effort: S, together with A1. Payoff: shorter tests and boot. Risk: low. Agent decision.

**A5. Remove the global dino store.**
* Change: `src/dinos/dino-store.ts` keeps a module level `activeStore` with `setActiveDinoStore`, `getActiveDinoStore` and a global `addEgg`. Pass the store explicitly (shop-flow already accepts `options.dinoStore`).
* Why: hidden global state makes tests order dependent and blocks D6.
* Effort: S. Risk: low. Agent decision.

**A6. Leave the big but healthy files alone.** `game.ts` (335), `renderer.ts` (365), `shop.ts` (493) and the parent screens are long but single purpose. Split them only when a release has to change them anyway (for example split the Kippenhok card and the collection out of `shop.ts` the next time the shop changes). No UI framework, no state library: plain DOM with `el()` still fits.

### B. Dead or duplicate code

**B1. Delete code nobody calls.** Measured with grep over `src/` and `tests/`:
* Never used anywhere, not even in tests: `subjectCounts` (switches.ts), `skillExists` (rekenen/generator.ts), `isGoldenColor` (dino-models.ts), `answeredCount` (exam-session.ts), `TAAL_CREATED_AT` (taal.ts).
* Used only by their own tests, never by the app: `createRenderer` (a one line wrapper), `canReceiveGolden` (always returns `true`), `levelOfId`, `dinoHeight`, `daysBetween`, `parseNumberInput`, `toTenths`, `hatchTimeLeft`, `doneCount`, `emptyRotation`, `del` (db.ts). Delete each with its test cases.
* `src/ui/contrast.ts` is imported only by a test: move it to `tests/unit/`.
* Effort: S. Payoff: less to read for every agent. Risk: low. Note: `scripts/verify.sh` fails a task that deletes a whole test file, so keep the files and remove only the cases. Agent decision.

**B2. The switch tree is deeper than the parent screen.** `switches.ts` (498 lines) supports subject, module, topic and skill switches plus a level override per topic. The parent screen (`content-screen.ts`) uses only subject, topic, module levels, weights and presets. `setSkillOn`, `setModuleOn`, `setTopicLevelOverride`, `topicLevelOverride`, `isSkillOwnSwitchOn` and `skillCounts` exist only for tests, yet `selection.ts` still checks them on every break.
* Change: drop skill switches and topic level overrides from code and from AC77.
* Effort: S. Payoff: about 120 lines less in a file every content change touches, and a simpler mental model for selection. Risk: low, nothing on screen changes.
* **Founder decision** (it removes a promise from the signed PRD). Options:
  * a) Drop both from the PRD and the code. Recommended: the parent never had them and nobody missed them.
  * b) Keep the code and build the screens later, in v6 or v7.
  * c) Leave as is (the PRD and the build stay out of step).

**B3. Gemini era docs that duplicate other docs.** `docs/SHOP_PRD.md` was written beside the PRD to dodge the gate (decision 49). `docs/STATUS.md` has a 30 line "Done" section that retells the CHANGELOG. `docs/ARCHITECTURE.md` lists 21 files that do not exist yet (planned for v3 to v8, for example `backup.ts`, `service-worker.js`, `virtual-list.ts`) next to real ones.
* Change: fold the parts of SHOP_PRD that are true into PRD 4.3 (with the next signoff) and archive the file. Trim STATUS to phase, next step and blockers. Mark planned files in ARCHITECTURE as "(planned, vN)".
* Effort: S, docs only. Payoff: agents stop reading stale specs. Risk: none. Agent decision (the SHOP_PRD fold lands with the next founder signoff).

### C. State and boot (storage, flows)

**C1. One boot, see A1.** It is the core of this group.

**C2. Decide what happens when storage is slow.**
* Today: after 3 s the kid plays, the world is never saved for that session, but points and dinos are. On the next start the dinos may stand in a world without the kid's blocks.
* Change: keep the 3 s wait, but when storage opens late, start world saving then (the world restore is skipped, so the late save only stores what the kid built since). If storage never opens, show a small note in the parent area.
* Effort: S after A1. Payoff: no half saved sessions. Risk: medium, it touches saving.
* **Founder decision** (decision 72 put the save fix on hold). Options:
  * a) Start saving late when storage opens, plus the parent note. Recommended.
  * b) Wait longer (10 s) with a "Je wereld wordt geladen" card, then play without saving.
  * c) Keep today's behaviour.

**C3. A test that taps before the app is ready.**
* Change: one e2e spec that delays `indexedDB.open` with `page.addInitScript`, then taps Pauze, Winkel, Ouders, Extra oefenen, Lesboek and Nu oefenen, and expects each to open (or show the waiting card). Today every spec waits for the `ready` hook first, which is exactly why CI missed the Pauze bug.
* Effort: S. Payoff: the kid bug class is caught in CI. Risk: none. Agent decision.

**C4. No fixed sleeps on IndexedDB.**
* Change: replace the last 6 sleeps with `vi.waitFor` or an awaited flush: `src/ui/shop.test.ts:187`, `src/ui/parent/gate-screen.test.ts:42` and `:49`, `src/app/break-flow.test.ts:65`, `src/game/world-save.test.ts:231`, `src/storage/save-queue.test.ts:81`. Add a lint rule or a `verify.sh` check that fails on `setTimeout(r, N)` in a test.
* Effort: S. Payoff: no flakes when three developers run tests at once (friction 2026-10-19). Risk: none. Agent decision.

### D. Tests and CI speed

**D1. TOP. Run e2e locally in Chromium before every push.**
* Change: add a `chromium-ipad` Playwright project that is used only when `E2E_LOCAL=1`, with `launchOptions.executablePath` pointing at the Chromium already in `/opt/pw-browsers`, iPad viewport and `hasTouch`. New script `npm run test:e2e:local -- <spec>`. Developers and QA run the specs they touched before pushing. CI keeps WebKit as the truth.
* Why: four CI rounds were lost to selectors and timing that a local run would have shown in a minute.
* Effort: S. Payoff: most e2e mistakes are found before CI. Risk: Chromium is not Safari, so WebKit only CSS still needs CI (Lessons 2026-10-17). Agent decision.
* Alternative that needs the founder: allow `cdn.playwright.dev` and `playwright.download.prss.microsoft.com` in the cloud environment settings, then agents can run real WebKit. Both can be done.

**D2. One app boot per size in the UI review.**
* Change: run the 22 screens of one size inside one page, in order: open, audit, screenshot, back to the world. Load a fresh page only after a failure. Replace `settle()` with waits on the `currentScreen` hook or on the dialog role.
* Effort: M. Payoff: 141 app boots become about 12, likely halving e2e time. Risk: one broken screen can hide the next; the fresh page after a failure handles that. Agent decision.

**D3. Split `ui-review.spec.ts`.**
* Change: `tests/e2e/helpers/ui-audit.ts` (in page audit, `assertClean`, about 270 lines), `tests/e2e/helpers/ui-screens.ts` (the 22 screen recipes), `tests/e2e/ui-review.spec.ts` (screens only), `ui-sessions.spec.ts` (the session walker), `ui-taps.spec.ts` (real taps and scrolling).
* Why: with four files, Playwright shards balance better, and a new screen is one recipe, not an edit in a 1 200 line file.
* Effort: S. Payoff: easier for the kid-ui-reviewer and better sharding. Risk: none. Agent decision.

**D4. Fewer sizes on branch pushes.**
* Today every push checks 4 sizes. Layout bugs show at the smallest ones (1024 x 768 home screen and 1024 x 690 Safari tab, decision 54).
* Effort: S. Payoff: about half of UI review time on branches. Risk: a bug only at 1180 x 820 or 1366 x 1024 is found on `main` instead of on the branch.
* **Founder decision** (decision 62 said "F not now"). Options:
  * a) 2 smallest sizes on branch pushes, all 4 on `main`. Recommended once D2 is in.
  * b) Keep all 4 everywhere.
  * c) All 4 only at release time.

**D5. Wait for state, not for time, in e2e.** Replace the 11 `waitForTimeout` in `world.spec.ts`, the 2 in `build.spec.ts` and the 3 000 ms in `save.spec.ts` (use the `flushSave` hook) with `expect.poll` on a hook. Effort: S. Payoff: fewer CI only flakes (friction 2026-10-18 jump test) and a few seconds per run. Risk: none. Agent decision.

**D6. Faster unit runs.** Split Vitest into two projects: Node tests with `isolate: false` (one worker reused), and the 38 jsdom files isolated as today. Needs A5 first (no global dino store). Effort: S. Payoff: about 10 s off 24 s, which matters when three developers run the suite at once. Risk: low; any test that leaks state shows up at once. Agent decision.

**D7. Remove the copy in the check scripts.** The module validate loop is written twice (`scripts/check.sh` and `scripts/check-content.sh`). Let `check.sh` call `check-content.sh` for the content part. Docs only commits (41 of 145) still start a CI check job: add `paths-ignore` for `docs/**` except `docs/modules/**` and `docs/PRD.md`. Effort: S. Risk: low. The `paths-ignore` part was already proposed to the founder (friction 2026-10-19) and still needs that yes; the script merge is an agent decision.

### E. The factory process (PRD size, gates, agents)

**E1. TOP. Split the PRD so a signoff covers one small thing.**
* Today: one 908 line file, one hash. Marking v2 `shipped`, fixing a typo or adding a backlog wish closes the gate and needs a new founder yes.
* Change: `docs/PRD.md` keeps the stable core (what v1 and shipped releases do, safety, constraints) and is signed as today. Each new release gets `docs/releases/vN.md` with its goal, in, out and new ACs, signed on its own. The backlog table and release status move to `docs/BACKLOG.md`, which is not stamped. The gate hook and `signoff.sh` check every stamped file.
* Effort: M (product splits the text, a small change to `signoff.sh` and the hook, which only the founder may approve because they are protected files). Payoff: a release signoff reads one short page; backlog edits never reopen the gate. Risk: low; the history stays in git.
* **Founder decision.** Options:
  * a) Core PRD plus one file per release plus an unstamped backlog. Recommended.
  * b) One file, but the stamp covers only the text between two markers; status and backlog live outside them.
  * c) Keep one file and one stamp.

**E2. Trim the PRD to what is built or next.** Sections 4.14 to 4.17 and their ACs describe v6 to v8 in full detail, and section 5 "Later" is 24 lines of wishes. Move unbuilt detail into the backlog file (E1) and write it out only when that release is picked. Effort: S with E1. Payoff: the PRD shrinks to about 500 lines and agents read less. Risk: none. Founder decision only as part of E1.

**E3. Lighter checking for small tasks.** Each task now runs `check.sh`, then `verify.sh` (which runs `check.sh` again), then a `verifier` agent, then an architect review at the milestone. For a release of at most 5 tasks, the milestone review is the release review.
* Change: run `check.sh` once through `verify.sh`. Skip the verifier for tasks under about 150 changed lines that pass `verify.sh`; keep it for bigger or risky ones (storage, gate, money).
* Effort: S (skill text). Payoff: fewer agent calls per task, less waiting. Risk: low; the script catches the mechanical faults.
* **Founder decision** (it changes the factory process). Options:
  * a) Verifier only for big or risky tasks. Recommended.
  * b) Keep the verifier for every batch.

**E4. Kid bugs ship as a patch, not inside the current release.** v2 grew to 6 tasks when the Pauze bug came in. Rule: a bug the kids found becomes a 0.x.1 patch release of 1 or 2 tasks, shipped first, outside the 5 task count.
* Effort: S (CLAUDE.md and `/release` text). Payoff: releases stay small, kid bugs reach the iPad sooner. Risk: none.
* **Founder decision.** Options: a) patch releases for kid bugs, recommended; b) keep adding them to the open release.

**E5. Fewer `main.ts` clashes.** After A1 and A2, a new button is one line in `main.ts` plus its own flow file. Write that into ARCHITECTURE "Conventions", so plans stop serialising every release behind `main.ts` (decision 64 had to keep `main.ts` in one task). Effort: S. Agent decision.

### F. The backlog (features that cost more than the kids get)

**F1. TOP. Drop v7 Eigen woorden and v8 Modules delen; use `/module` instead.**
* Today: v7 is size L with 4 tasks (own module store, module form, lesson editor, item forms, Probeer). v8 is 4 more tasks (import and export, bundle script, a 10 000 item virtual list, an own exams form). Together that is 8 tasks and ACs 80 to 86, 88, 131 (export part) and 132.
* Since decision 74, the `/module` skill turns workbook photos into a checked module in one content release, with no code, no e2e and the validator as safety net. Three modules were added that way today.
* Change: replace v7 and v8 with "the parent sends this week's words or a workbook photo, the operator runs `/module`". Keep "Kopie maken" and own exams out.
* Effort: S (PRD and plan edits). Payoff: 8 tasks and the biggest, riskiest parent screens never get built. Risk: the parent cannot add words alone on the iPad without the operator.
* **Founder decision.** Options:
  * a) Drop v7 and v8, use `/module` for new words and modules. Recommended.
  * b) A tiny v7: one form for a list of spelling words that become type questions (2 tasks), drop v8.
  * c) Keep v7 and v8 as planned.

**F2. Shrink v4 Altijd spelen.** The kids play at home on wifi from the home screen icon (decision 54). An offline service worker is the classic source of "the iPad shows the old game" bugs, and it needs its own cache rules and update rules (AC138). The one window check and broken save screen depend on v3.
* Change: keep `navigator.storage.persist()`, the home screen note and a friendly "could not load" screen (1 task). Drop the offline service worker, the one window check and the first start flow, or move them to Later.
* Effort: S. Payoff: 2 tasks saved, one whole class of cache bugs avoided. Risk: no play on a trip without wifi.
* **Founder decision.** Options:
  * a) Shrink v4 to 1 task as above. Recommended.
  * b) Keep offline play but drop the one window check and first start flow (2 tasks).
  * c) Keep v4 as planned.

**F3. Keep v3 Dino's veilig, in its simplest form.** It has the highest value: losing the herd would hurt most. Simplest form: "Backup maken" downloads one JSON file, "Terugzetten" opens a file picker. Both work in iPad Safari without the share sheet helper (T19).
* Effort: saves 1 task of 4. Risk: the share sheet is a bit nicer for AirDrop.
* **Founder decision.** Options: a) download and file pick only, recommended; b) as planned with the share sheet.

**F4. Shrink v6 Wat heb ik geleerd to one screen.** Six tabs (Overzicht, Pauzes, Per onderdeel, Over tijd, Lastige vragen, Examens) is a dashboard. One screen with "per topic this week: right and wrong", "the 5 hardest questions" and "the last 5 exams" answers what a parent asks. It reads the log that A3 makes uniform.
* Effort: 1 or 2 tasks instead of 3. Risk: no 12 week chart.
* **Founder decision.** Options: a) one screen, recommended; b) as planned; c) skip v6 until a parent asks.

**F5. Pull the human Taal check forward.** In v5, T65 (human spelling check, AC124) is mostly reading, and the kids already learn from unchecked content in five modules (Cito, Taal E6, Leestekens, 't Kofschip, plus Rekenen). Do T65 now as a founder task beside v3; keep the rest of v5 as it is.
* Effort: founder time, no code. Risk: none.
* **Founder decision.** Options: a) do the check now, beside v3, recommended; b) keep it in v5.

## 3. Founder decisions in one place

| # | Idea | Recommended option |
|---|---|---|
| 1 | E1 Split the PRD so a signoff covers one small thing | Core PRD plus one file per release plus an unstamped backlog |
| 2 | F1 Drop v7 and v8, use `/module` | Drop both |
| 3 | F2 Shrink v4 | Persistent storage, home screen note and a load error screen only |
| 4 | F3 v3 backup without the share sheet | Download and file pick only |
| 5 | F4 v6 results as one screen | One screen |
| 6 | F5 Human Taal check now | Now, beside v3 |
| 7 | B2 Drop skill switches and topic overrides | Drop from PRD and code |
| 8 | C2 What happens when storage is slow | Start saving late, plus a parent note |
| 9 | D4 UI review sizes on branch pushes | 2 sizes on branches, 4 on `main` |
| 10 | E3 Verifier only for big or risky tasks | Yes |
| 11 | E4 Kid bugs as patch releases | Yes |
| 12 | D1 alternative, D7 `paths-ignore` | Allow the Playwright hosts; skip CI for docs only commits |

Everything else in section 2 is a pure refactor or a test change: agents decide and log it in `docs/DECISIONS.md`.

## 4. Suggested order

Each round is at most 5 small tasks, ships between kid releases, changes no behaviour the kids can see (except where a founder decision says so), and keeps `./scripts/check.sh` and all e2e green. One commit per task. Refactor tasks still go through `verify.sh` with their file lists in `docs/PLAN.md`, milestone `R1`, `R2` and so on.

### Round R1: boot safety (before v3, because v3 adds buttons to the parent area)

| Task | Idea | Files | Depends on |
|---|---|---|---|
| R1a | Local Chromium e2e project and `test:e2e:local` script | `playwright.config.ts`, `package.json`, `docs/ARCHITECTURE.md` | none |
| R1b | Tap before ready e2e spec (fails today for Ouders and Extra oefenen, which proves it) | `tests/e2e/boot-taps.spec.ts` | R1a |
| R1c | `src/app/boot.ts` with `Promise<App>`, `AppContext`, `whenReady()` and one waiting card; `main.ts` uses it for every button | `src/main.ts`, `src/app/boot.ts`, `src/ui/waiting-card.ts` | R1b |
| R1d | E2e hooks move to `src/dev/app-hooks.ts` | `src/main.ts`, `src/dev/app-hooks.ts` | R1c |
| R1e | Remove the 6 fixed sleeps in unit tests, add a check that blocks new ones | the 6 test files, `scripts/verify.sh` (protected: founder approves) or `eslint.config.js` | none |

R1c is the only one that touches behaviour (a waiting card where taps did nothing). C2 joins this round only if the founder picks option a or b.

### Round R2: one session code path (before v6, because results read these logs)

| Task | Idea | Files |
|---|---|---|
| R2a | `serialQueue()` and `shuffle` in `src/core/`, used by all three flows | `src/core/serial-queue.ts`, `src/core/rng.ts`, the three flows, `selection.ts`, `exam-session.ts`, `generator.ts` |
| R2b | `src/app/session-log.ts`: shared helpers and effect writer; break and practice use it; one egg cap rule | `src/app/session-log.ts`, `break-flow.ts`, `practice-flow.ts` |
| R2c | Exam flow writes its answers through the same writer | `exam-flow.ts` |
| R2d | No global dino store | `src/dinos/dino-store.ts`, `src/app/shop-flow.ts`, `src/game/game.ts` |
| R2e | Delete dead exports from B1 (and B2 if the founder picks a) | the files listed in B1 and B2 |

### Round R3: faster tests (any time after R1)

| Task | Idea | Files |
|---|---|---|
| R3a | Split `ui-review.spec.ts` into helpers and three specs | `tests/e2e/ui-*.ts`, `tests/e2e/helpers/ui-*.ts` |
| R3b | One app boot per size, waits on state instead of `settle()` | the UI review files |
| R3c | Polls instead of fixed waits in `world.spec.ts`, `build.spec.ts`, `save.spec.ts` | those three specs |
| R3d | Vitest projects: Node without isolation, jsdom isolated | `vite.config.ts` |
| R3e | `check.sh` calls `check-content.sh`; `paths-ignore` and the size subset only if the founder said yes | `scripts/check.sh`, `scripts/check-content.sh`, `.github/workflows/ci.yml`, `playwright.config.ts` |

### Round R4: docs and process (no code, can run beside any release)

* Split the PRD (E1) and trim it (E2), if the founder picks it. This needs one founder signoff of the new files.
* Fold `SHOP_PRD.md` into the PRD, trim STATUS, mark planned files in ARCHITECTURE (B3).
* Update `/release`, `/build` and CLAUDE.md for E3, E4 and E5 as decided.
* Rewrite the backlog in section 5 with the founder's answers to F1 to F5.

### What not to do

* No rewrite, no UI framework, no state library. The plain DOM plus `el()` approach is not the problem; wiring and duplication are.
* Do not split `game.ts`, `renderer.ts` or `shop.ts` on their own. Split a file only inside a release that already changes it.
* Do not batch these rounds with a kid release. A refactor round is its own small milestone with one architect review.
