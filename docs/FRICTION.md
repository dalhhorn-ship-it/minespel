# Friction log

The operator adds a line whenever something goes wrong or feels slow, so `/retro` has real evidence.
Examples: a retry, a model escalation, an agent that misread its task, a gate that blocked, a founder override, a bug QA missed, a question the founder found pointless.

| Date | Step | Agent | What happened | How it was resolved |
|---|---|---|---|---|
| 2026-10-17 | signoff | operator | Founder said approved and signed, but no stamp was found here or on any remote branch. The ! command may not be available in the founder's app. | Gave the founder both signing routes again |
| 2026-10-17 | signoff | operator | The ! shortcut does not work in the founder's app, and the Codespace route felt too complicated. Founder asked to skip to build. | Gate kept. The architect step also needs signoff, so work waits. Retro: find a one tap signoff for app users. |
| 2026-10-17 | architect | developer, qa | Both sanity reviewers stopped early on a session rate limit. | Resumed them after the limit reset. |
| 2026-10-17 | build T2 | developer | Plan said 2 module wide duplicates existed, but none match the AC123 rule (operator checked too: 288 unique). | No content change. A permanent validator test goes with T7. |
