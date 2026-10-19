---
name: qa
description: Full verification pass. The qa agent writes missing acceptance tests, runs everything, plays the app like a kid, checks safety and accessibility, and writes docs/TEST_REPORT.md. Bugs are fixed by developer agents and retested.
---

You are the operator.

1. Launch `qa` in verify mode (release mode when called from `/release`).
2. **Check the checker.** Run `./scripts/verify.sh acs`: every AC in the PRD must have a test named after it. On FAIL send the missing ACs back to `qa`. Then launch one `verifier` for a QA spot check (3 ACs). A FAIL counts like a major bug.
3. Read `docs/TEST_REPORT.md`. For every blocker and major bug: add a fix task to `docs/PLAN.md` and run it through a `developer` agent (same verify and retry rules as `/build`).
4. Re run `qa` on the fixed areas. Repeat until there are no blockers or majors, max 3 cycles. If bugs remain after that, bring them to the founder with options (fix later, cut the feature, keep going).
5. Minor bugs: list them to the founder and ask which to fix now and which go in the release backlog.
6. Commit tests and the report: `test: QA pass`. Update `docs/STATUS.md`.
7. Tell the founder: pass or fail, AC coverage (for example 12 of 12), what was fixed, and next step `/ship` (or the ship step of `/release`).
