# Docs index (generated)

> The reference table. Read this first, then grep by id or read a slice at the listed line. Built by `python3 scripts/docs_index.py` (check.sh runs it); edit only the curated block. Doc links and id locations: docs/knowledge-graph.json.

## Quick answers (curated)

<!-- curated:start -->
| Question | Go to |
|---|---|
| Where are we, what is next, blockers? | docs/STATUS.md |
| Project dashboard | `python3 scripts/dashboard.py --print` (page: dashboard/index.html) |
| One acceptance criterion | `grep -n "AC180:" docs/PRD.md` |
| One decision | `grep -n "^\| 98 " docs/DECISIONS.md` (1 to 86: docs/archive/decisions-1-86.md) |
| One open task | `grep -n "^\| V11c " docs/PLAN.md` (done: docs/releases/plan-done.md) |
| The next release | docs/PRD.md section 12 |
| What can we build next? | docs/BACKLOG.md |
| How the agent factory works | docs/FACTORY.md |
| iPad, hosting, content release rules | docs/PLATFORM.md |
| Stack and structure | docs/ARCHITECTURE.md |
| Make a learning module | docs/modules/README.md and the `/module` skill |
| Where did the last session stop? | docs/HANDOFF.md (`/handoff`) |
<!-- curated:end -->

## Where ids live

| Ids | File | Range (count) |
|---|---|---|
| Acceptance criteria | docs/PRD.md | AC1 to AC199 (190) |
| Acceptance criteria | docs/SHOP_PRD.md | AC20 to AC150 (5) |
| Acceptance criteria | docs/releases/v10.md | AC172 to AC177 (6) |
| Acceptance criteria | docs/releases/v11.md | AC178 to AC191 (14) |
| Acceptance criteria | docs/releases/v2.md | AC155 to AC165 (11) |
| Acceptance criteria | docs/releases/v9.md | AC166 to AC171 (6) |
| Decisions | docs/DECISIONS.md | 87 to 120 (34) |
| Decisions | docs/archive/decisions-1-86.md | 1 to 86 (86) |
| Tasks | docs/DISCUSSION.md | V11a, V11b, V11c, V11d, V11e (5) |
| Tasks | docs/PLAN.md | T18, T19, T55b, T55a, T53a, T21, T32, T52, T56, T22, T61, T62, … (19) |
| Tasks | docs/archive/SIMPLIFY.md | R1a, R1b, R1c, R1d, R1e, R2a, R2b, R2c, R2d, R2e, R3a, R3b, … (15) |
| Tasks | docs/releases/plan-done.md | T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, … (77) |

## Documents

| File | Lines | Summary |
|---|---:|---|
| CHANGELOG.md | 133 | Written so kids can read it too. Sections: Unreleased:5, 0.5.0 (2026-10-24):28, 0.4.0 (2026-10-24):41, 0.3.0 (2026-10-22):51, 0.2.0 (2026-10-19):59, 0.1.0 (2026-10-19):81 |
| CLAUDE.md | 71 | A free 3D block world with dinos and short learning breaks (Dutch: taal, rekenen,… |
| README.md | 78 | Dino Blokwereld is a free 3D block world for kids, played in Dutch on an iPad. Walk… |
| docs/ARCHITECTURE.md | 393 | Written by the architect after PRD signoff (2026-10-17). Source of truth for how Dino… Sections: Stack and why:5, Folder structure:27, Modules and data flow:186, How modules are loaded:230, State and storage:271, Security and kid safety in…:301, How to run:310, How to test:323, How to deploy:356, Conventions for developers:365, Risks:379 |
| docs/BACKLOG.md | 177 | Not signed. Changing this file never closes the PRD gate (decision 80). The signed… Sections: Next steps (founder order):5, Rules:20, Ranked backlog:30, Dropped:133, Later:154 |
| docs/DECISIONS.md | 42 | Every notable decision. Founder decisions are marked NEEDS FOUNDER until answered, then… |
| docs/DISCUSSION.md | 96 | Review rounds between agents. Newest at the bottom. Keep it short: who said what, what… |
| docs/FACTORY.md | 113 | Moved out of CLAUDE.md on 2026-10-26 (decision 104) so it is read only when needed. The… |
| docs/FRICTION.md | 52 | The operator adds a line whenever something goes wrong or feels slow, so /retro has real… |
| docs/GAME_LOOP_PRD.md | 349 | Status: Draft, not signed. Each release moves into docs/PRD.md section 12 and is signed… Sections: 1. The game loop:13, 2. v12 Dino-Hoed:53, 3. v13 Dino-Eten:134, 4. v14 Bouw-Opdracht:214, 5. Order and dependencies:332, 6. Not picked yet:338 |
| docs/HANDOFF.md | 23 | Founder: "build v11, v3, v6". v11 already shipped (0.5.0). Build v3 now as 0.6.0, then… |
| docs/IDEA.md | 81 | "Create a 3D minecraft education kind of game but then also with dinosaurs, and every 5… |
| docs/PLAN.md | 73 | Task graph written by the architect on 2026-10-17 from the signed PRD. The operator… |
| docs/PLATFORM.md | 39 | Moved out of CLAUDE.md on 2026-10-26 (decision 104). Read this when a task touches the… |
| docs/PRD.md | 874 | Status: APPROVED by Founder on 2026-11-06 Sections: 1. Summary:7, 2. Users:12, 3. Goals and success:19, 4. What the app is today (v1…:29, 5. Release backlog:389, 6. User flows:392, 7. Acceptance criteria:481, 8. Look, sound and feel:714, 9. Kid safety and privacy:726, 10. Constraints:740, 11. Risks and decisions:751, 12. Releases:821 |
| docs/RETRO.md | 25 | Written by /retro. Newest at the bottom. Factory level learnings are also saved in… |
| docs/SHOP_PRD.md | 108 | Document Status: Approved Addendum (docs/SHOP_PRD.md — companion to docs/PRD.md) |
| docs/STATUS.md | 55 | Phase: small releases. 0.1.0, 0.2.0, 0.3.0, R1 and 0.4.0 Punten voor elke ronde are… |
| docs/TECH-DEBT.md | 33 | Known tech debt in one table. Major means it can cost the kids their builds or points.… |
| docs/TEST_REPORT.md | 215 | Result: PASS for everything that can run here. AC190 (fps on the oldest iPad) and the… Sections: v11 Dorp (0.5.0):3, R1 Boot safety (R1d):87, v9 Eerlijke punten (0.3.0):105, v2 Gouden ei (0.2.0):130, Summary:202, Acceptance criteria coverage:205, Bugs:209, Kid safety and accessibility:213, Screenshots:215 |
| docs/UI_REVIEW.md | 159 | Screenshots are not in git (44 MB). Run npm run test:e2e:ui-review to regenerate them in… Sections: How this was done:10, Why the founder sees buttons…:21, Screen map:30, Findings:58, Way back, in the same place?:135, What is good and should stay:142, Questions for the founder:153 |
| docs/archive/CONTENT_CHECK.md | 215 | Date: 2026-10-22. By: QA. F1 to F7 and F10 are fixed (see the "Fixed" line under each).… Sections: How this was done:5, Overall result:40, Findings:48, What checked out (no finding):159, Top 5 to fix:170, 20 items for the founder or…:178, Lookup list for…:207, For the founder:211 |
| docs/archive/DISCUSSION-to-v10.md | 309 | Moved out of docs/DISCUSSION.md on 2026-10-26 (decision 105). Unchanged. Sections: PRD review round 1:5, Architecture review:159, Architecture review (qa view):187, M1 milestone review:264 |
| docs/archive/SIMPLIFY.md | 259 | Architect review, 2026-10-19, after v2 (0.2.0). Read from the real code, tests, CI runs… Sections: 1. What hurts most:5, 2. Ideas:29, 3. Founder decisions in one…:193, 4. Suggested order:212 |
| docs/archive/TECH_REVIEW.md | 168 | Architect review, 2026-10-24, on branch claude/blissful-hawking-hr67ui (same code as… Sections: 1. Snapshot:5, 2. Status of the SIMPLIFY.md…:30, 3. New findings:63, 4. Top 5 recommendations:144, 5. Things not to do:158 |
| docs/archive/decisions-1-86.md | 92 | Moved out of docs/DECISIONS.md on 2026-10-26 (decision 105). Rows are unchanged. Grep by… |
| docs/factory-feedback/2026-10-22.md | 57 | Factory started: 2026-10-17 |
| docs/factory-feedback/2026-11-06.md | 26 | Source factory: dalhhorn-ship-it/danfactory (bf63299). For its inbox. |
| docs/releases/plan-done.md | 133 | Moved out of docs/PLAN.md on 2026-10-26 (decision 105) so the plan holds only open work.… Sections: Milestones:5, Tasks:18, Task notes:100, Operator notes during the…:129 |
| docs/releases/v10.md | 47 | Archive, not signed. This is the v10 section as the founder signed it in docs/PRD.md… |
| docs/releases/v11.md | 70 | Archive, not signed. This is the v11 section as the founder signed it in docs/PRD.md… |
| docs/releases/v2.md | 54 | Archive, not signed. This is the v2 section as the founder signed it in docs/PRD.md… |
| docs/releases/v9.md | 38 | Archive, not signed. This is the v9 section as the founder signed it in docs/PRD.md… |
