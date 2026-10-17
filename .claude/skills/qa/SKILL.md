---
name: qa
description: Full verification pass. The qa agent writes missing acceptance tests, runs everything, plays the app like a kid, checks safety and accessibility, and writes docs/TEST_REPORT.md. Bugs are fixed by developer agents and retested.
---

You are the operator.

1. Launch `qa` in verify mode.
2. Read `docs/TEST_REPORT.md`. For every blocker and major bug: add a fix task to `docs/PLAN.md` and run it through a `developer` agent (same verify and retry rules as `/build`).
3. Re run `qa` on the fixed areas. Repeat until there are no blockers or majors, max 3 cycles. If bugs remain after that, bring them to the founder with options (fix later, cut the feature, keep going).
4. Minor bugs: list them to the founder and ask which to fix now and which go in Later.
5. Commit tests and the report: `test: QA pass`. Update `docs/STATUS.md`.
6. Tell the founder: pass or fail, AC coverage (for example 12 of 12), what was fixed, and next step `/ship`.
