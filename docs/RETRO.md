# Retrospectives

Written by `/retro`. Newest at the bottom. Factory level learnings are also saved in `docs/factory-feedback/` and sent to the factory inbox.

## Retro 2026-10-22: why releases feel slow and costly

Asked by the founder after 0.3.0: "every update, every CI, QA takes so long, feels like we are burning tokens".

### Numbers
* 0.3.0 Eerlijke punten: PRD approved 17:06, three code tasks done 17:24 (18 minutes), QA tests 17:38, merged 19:48. About 2 hours 10 minutes of the 2 hours 40 minutes after approval went to CI rounds, waiting and shipping.
* 0.2.0 looked the same: last code commit 17:19, merged 19:45.
* 12 commits for 0.3.0, 8 of them docs only. Every push starts a CI run, the pull request reruns on main, and the deploy waits for main.
* CI is about 6 minutes per push. Browser tests (e2e) are most of it, and `ui-review.spec.ts` was 86% of the e2e time (friction 2026-10-19).
* The cloud session cannot download WebKit (cdn.playwright.dev is blocked), so e2e only runs in GitHub CI. 4 friction rows are CI rounds spent on test timing or guessed selectors that a local run would have caught in seconds.
* Docs that agents reread on every step: PRD 796 lines with 162 ACs, 89 decisions, ARCHITECTURE 381 lines, DISCUSSION 309 lines. About 3000 lines in total.
* A small release still used up to 6 agents (product, architect, developers, qa, kid-ui-reviewer, scribe) plus an operator that polls CI ("check back in about 8 minutes").
* The approval hook did not stamp when the founder picked Approve. It cost an extra round.

### App learnings
* Push once per release, not once per commit. Docs updates ride along with the code commit.
* Archive shipped release sections out of the PRD. Agents read the core PRD and the current release only.
* Run `ui-review.spec.ts` at milestones and before a release ships, not on every push.

### Factory learnings
See `docs/factory-feedback/2026-10-22.md`.
