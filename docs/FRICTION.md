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
