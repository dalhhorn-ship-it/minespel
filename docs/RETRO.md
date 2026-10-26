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

## Retro 2026-10-26: the CI, development and testing fixes

Asked by the founder: look back at every fix that made CI, development and testing better, and feed it back to the factory template.

### Numbers
* 204 commits since 2026-10-17, 14 fix commits, 0 reverts. 79 done plan rows, 192 ACs, about 71 founder decisions.
* 38 friction rows. 24 of them are about CI, e2e timing, test load or the check scripts.
* 8 friction rows were e2e tests that raced the app (fixed sleeps, async screens, physics frames, a hook ready before the ready gate). In every case the app was right and the test was wrong.
* 3 friction rows were red CI that a local WebKit run would have caught. WebKit could not install in the cloud sandbox until the health audit.
* 2 bugs slipped past QA that CI could not see: Pauze on the real iPad (2026-10-19) and follow dinos that took every tap in a big herd (2026-10-26).
* CI went from 6.3 minutes per push (e2e 4.7 of it) to sharded WebKit e2e in 4 jobs, once per commit, older runs cancelled, docs only pushes without e2e (decisions 62, 76).
* Normal e2e runs went from 285 to 144 tests by leaving the full UI review out (decision 106).
* A developer check went from the full `check.sh` to `smoke.sh`, about a minute (decision 107). Unit tests 37 s to 32 s (decision 110, R2d).
* CLAUDE.md 15.4 KB to 5.5 KB, PLAN 86 KB to 20 KB, 13.9 MB of screenshots out of git (decisions 103 to 105).

### What the people said
* Fun: Loved it.
* Best part: faster checks.
* Annoying: it still took too long.
* Next time: start with fast CI from day one.

### What we fixed, in order
1. 2026-10-18: e2e races fixed one by one with polls (practice, timer, jump, egg).
2. 2026-10-19: CI speed A to E (decision 62): shard e2e, once per commit, cancel older runs, deploy after green CI, caches. Unit tests poll with `vi.waitFor`.
3. 2026-10-19: content only changes skip e2e (`check-scope.sh`, decision 76).
4. 2026-10-23: local e2e in Chromium (`E2E_LOCAL=1`) as a first check. E2e hooks wait for the ready gate.
5. 2026-10-24: red main and local checks fixed (decision 100).
6. 2026-10-26: health audit. WebKit installs in the sandbox, `smoke.sh`, `waitFrames` in place of millisecond waits, UI review on request, lean docs, `E2E_PORT` for parallel worktrees, R2 refactor (hooks out of `main.ts`, no global dino store).

### App learnings
* Already in CLAUDE.md lessons: full `npm test` before a commit, test the shipped CSS rule for iOS only CSS, push at task boundaries, fetch main before a decision row, grep docs by id.
* Added: when a release raises a cap (herd 25), add a test at the cap near the player.

### Factory learnings
See `docs/factory-feedback/2026-10-26.md` (10 learnings). It builds on `2026-10-22.md`: F2, F3 and F5 from that file were tried here and worked.
