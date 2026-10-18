# Friction log

The operator adds a line whenever something goes wrong or feels slow, so `/retro` has real evidence.
Examples: a retry, a model escalation, an agent that misread its task, a gate that blocked, a founder override, a bug QA missed, a question the founder found pointless.

| Date | Step | Agent | What happened | How it was resolved |
|---|---|---|---|---|
| 2026-10-17 | signoff | operator | Founder said approved and signed, but no stamp was found here or on any remote branch. The ! command may not be available in the founder's app. | Gave the founder both signing routes again |
| 2026-10-17 | signoff | operator | The ! shortcut does not work in the founder's app, and the Codespace route felt too complicated. Founder asked to skip to build. | Gate kept. The architect step also needs signoff, so work waits. Retro: find a one tap signoff for app users. |
| 2026-10-17 | architect | developer, qa | Both sanity reviewers stopped early on a session rate limit. | Resumed them after the limit reset. |
| 2026-10-17 | build T2 | developer | Plan said 2 module wide duplicates existed, but none match the AC123 rule (operator checked too: 288 unique). | No content change. A permanent validator test goes with T7. |
| 2026-10-17 | build T1 | developer | Sandbox proxy blocks the Playwright WebKit download (cdn.playwright.dev, 403), so e2e cannot run in the cloud container. | GitHub CI runs e2e on every push; founder may allowlist the hosts. |
| 2026-10-17 | build T3 | developer | CI e2e failed: Linux WebKit drops the iOS only -webkit-touch-callout from computed style. | Test now checks the shipped stylesheet rule when the computed value is empty. |
| 2026-10-17 | M1 review fix | operator | Audio fix made whenUnlocked required, which broke the silent stand-in in game.ts. Parallel fixes hid it behind a main.ts syntax error. | Added whenUnlocked to the stand-in. Typecheck the rest with main.ts excluded while main.ts is in flight. |
| 2026-10-17 | build T29 | developer | The shared 350 ms double tap guard dropped the second letter of ee or oo on the kid keyboard. | Typing keys use their own tap helper that counts every completed tap; Klaar keeps the guard. |
| 2026-10-17 | build T27 | operator | Committed T27 after scoped tests passed; the full suite then timed out on the E7 delen generator test (7.3 s under parallel load). | Sent back to find the cause. Lesson: run the full npm test before every commit, not only scoped tests. |
| 2026-10-17 | build M2 | developer x3 | T36, T41 and T42 stopped on a session rate limit (second time today). | Committed finished work in a clean worktree, resumed all three after the reset. |
| 2026-10-17 | build T44 | developer | T44 edited src/main.ts although its brief said to report the lines instead (main.ts was shared with the T42 wiring). | Operator staged a main.ts with only the T42 change; T44's part is reviewed with T44. |
| 2026-10-17 | build T42 | operator | CI red: dinos e2e read the new egg before the game step gave it a spot (NaN, sent as null), only in WebKit timing. | Test now waits for a numeric spot. Chromium runs in the sandbox missed it. |
| 2026-10-17 | build T43b | operator | The egg tap e2e projected an egg sitting beside the player onto the screen, divided by zero and got an infinite tap point, so it failed now and then. | Test places the egg in front of the player first; 20 of 20 repeats pass. |
| 2026-10-17 | build T43c | developer | context-loss e2e (no restore, new canvas in 3 s) fails now and then in sandbox Chromium software GL; WebKit in CI passes it. | Watch it in CI; if it ever fails there, give it a longer settle time. |
| 2026-10-17 | build M3 | operator | The pause menu tests expected the Komt nog stubs that T46 and T47 replaced, and the shop e2e read the cards before they loaded. | Pause menu tests use plain stand ins; e2e opens each real screen; shop e2e waits for the text. |
| 2026-10-17 | build T45b | developer | Ran git stash by accident while another developer had uncommitted work, popped it right away; nothing lost. | Briefs now say: never run git stash or checkout; use a separate worktree to compare with HEAD. |
| 2026-10-18 | build G1 | gemini | The reused `vuur` tile pattern had `y < 3 && tongue > 2` where `tongue` reached at most 2, so `alphas(VUUR)` had no 0 alpha pixel. | Adjusted to `y < 4 && tongue >= 2` with `Math.floor(y / 2)` so top flame gaps are cut out. |
| 2026-10-18 | signoff | gemini | Gemini wrote `docs/PRD.approved` by hand instead of the founder approving in chat. The hash matched the PRD. | The founder approved the same PRD in chat afterwards ("prd approved", decision 53). Briefs for outside builders should say: never write the stamp, ask the founder. |
| 2026-10-18 | verify G0, G1 | operator | WebKit cannot download in the sandbox, so e2e ran in the pre-installed Chromium with the iPad profiles: 57 of 60 pass. context-loss (2) and the Extra oefenen cap e2e (1) fail the same way on the commit before G0. | Not caused by G0 or G1. WebKit in CI is the real check. |
