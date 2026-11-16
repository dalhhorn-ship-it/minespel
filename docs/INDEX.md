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
| Acceptance criteria | docs/PRD.md | AC1 to AC337 (328) |
| Acceptance criteria | docs/SHOP_PRD.md | AC20 to AC150 (5) |
| Acceptance criteria | docs/TEST_REPORT.md | AC279 to AC290 (2) |
| Acceptance criteria | docs/releases/v10.md | AC172 to AC177 (6) |
| Acceptance criteria | docs/releases/v11.md | AC178 to AC191 (14) |
| Acceptance criteria | docs/releases/v15-v16.md | AC230 to AC257 (28) |
| Acceptance criteria | docs/releases/v17-v18.md | AC200 to AC229 (30) |
| Acceptance criteria | docs/releases/v19-v21.md | AC258 to AC291 (34) |
| Acceptance criteria | docs/releases/v2.md | AC155 to AC165 (11) |
| Acceptance criteria | docs/releases/v3.md | AC192 to AC199 (8) |
| Acceptance criteria | docs/releases/v9.md | AC166 to AC171 (6) |
| Decisions | docs/DECISIONS.md | 87 to 145 (59) |
| Decisions | docs/archive/decisions-1-86.md | 1 to 86 (86) |
| Tasks | docs/DISCUSSION.md | V11a, V11b, V11c, V11d, V11e (5) |
| Tasks | docs/PLAN.md | T21, T32, T52, T56, T22, T61, T62, T63, T64, V22a, V22b, V22c, … (20) |
| Tasks | docs/archive/SIMPLIFY.md | R1a, R1b, R1c, R1d, R1e, R2a, R2b, R2c, R2d, R2e, R3a, R3b, … (15) |
| Tasks | docs/releases/plan-done.md | T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, … (119) |

## Documents

| File | Lines | Summary |
|---|---:|---|
| CHANGELOG.md | 232 | Written so kids can read it too. Sections: Unreleased:5, 0.12.0:7, 0.11.0:19, 0.10.0:29, 0.9.0:41, 0.8.0:55, 0.7.0:67, 0.6.0 (2026-11-15):84, 0.5.0 (2026-10-24):127, 0.4.0 (2026-10-24):140, 0.3.0 (2026-10-22):150, 0.2.0 (2026-10-19):158, 0.1.0 (2026-10-19):180 |
| CLAUDE.md | 71 | A free 3D block world with dinos and short learning breaks (Dutch: taal, rekenen,… |
| README.md | 78 | Dino Blokwereld is a free 3D block world for kids, played in Dutch on an iPad. Walk… |
| docs/ARCHITECTURE.md | 406 | Written by the architect after PRD signoff (2026-10-17). Source of truth for how Dino… Sections: Stack and why:5, Folder structure:27, Modules and data flow:189, How modules are loaded:243, State and storage:284, Security and kid safety in…:314, How to run:323, How to test:336, How to deploy:369, Conventions for developers:378, Risks:392 |
| docs/BACKLOG.md | 259 | Not signed. Changing this file never closes the PRD gate (decision 80). The signed… Sections: Next steps (founder order):5, Rules:25, Ranked backlog:35, Dropped:215, Later:236 |
| docs/DECISIONS.md | 67 | Every notable decision. Founder decisions are marked NEEDS FOUNDER until answered, then… |
| docs/DISCUSSION.md | 164 | Review rounds between agents. Newest at the bottom. Keep it short: who said what, what… Sections: v11 Dorp: architect…:7, MONSTERS_PRD review round 1…:99 |
| docs/FACTORY.md | 113 | Moved out of CLAUDE.md on 2026-10-26 (decision 104) so it is read only when needed. The… |
| docs/FRICTION.md | 61 | The operator adds a line whenever something goes wrong or feels slow, so /retro has real… |
| docs/GAME_LOOP_PRD.md | 349 | Status: Draft, not signed. Each release moves into docs/PRD.md section 12 and is signed… Sections: 1. The game loop:13, 2. v12 Dino-Hoed:53, 3. v13 Dino-Eten:134, 4. v14 Bouw-Opdracht:214, 5. Order and dependencies:332, 6. Not picked yet:338 |
| docs/HANDOFF.md | 20 | Founder: "Ok werkt op de iPad, bouw de rest", "Alles mag live", "Doe daarna volledige… |
| docs/IDEA.md | 81 | "Create a 3D minecraft education kind of game but then also with dinosaurs, and every 5… |
| docs/MONSTERS_PRD.md | 494 | Status: DRAFT, revised after review round 1 (2026-11-15). Not signed. The founder… Sections: 1. How it fits the game today:25, 2. v17 Ridders (ships after…:126, 3. v18 Zwarte bubbel (ships…:201, 4. v16 Monstermol (ships…:278, 5. v19 Ridderuitrusting:340, 6. v20 Diepe edelstenen:401, 7. v21 Meer uitrusting…:447, 8. Founder questions:473 |
| docs/PLAN.md | 74 | Task graph written by the architect on 2026-10-17 from the signed PRD. The operator… |
| docs/PLATFORM.md | 39 | Moved out of CLAUDE.md on 2026-10-26 (decision 104). Read this when a task touches the… |
| docs/PRD.md | 1201 | Status: APPROVED by Founder (standing approval, decision 136) on 2026-11-16 Sections: 1. Summary:9, 2. Users:14, 3. Goals and success:21, 4. What the app is today (v1…:31, 5. Release backlog:391, 6. User flows:394, 7. Acceptance criteria:483, 8. Look, sound and feel:831, 9. Kid safety and privacy:847, 10. Constraints:865, 11. Risks and decisions:876, 12. Releases:970 |
| docs/RETRO.md | 25 | Written by /retro. Newest at the bottom. Factory level learnings are also saved in… |
| docs/SHOP_PRD.md | 108 | Document Status: Approved Addendum (docs/SHOP_PRD.md — companion to docs/PRD.md) |
| docs/STATUS.md | 55 | Phase: small releases. Live on main: 0.6.0 to 0.9.0 (PR #25, #26, #27): v3 Dino's… |
| docs/TECH-DEBT.md | 34 | Known tech debt in one table. Major means it can cost the kids their builds or points.… |
| docs/TEST_REPORT.md | 335 | Full ./scripts/check.sh on this branch, WebKit (no Chromium fallback warning): lint,… Sections: v21 Meer uitrusting…:3, v20 Diepe edelstenen…:17, v19 Ridderuitrusting…:31, v16 Monstermol (0.9.0), V16e…:44, v15 Grote wereld (0.8.0),…:68, v18 Zwarte bubbel (0.7.0,…:93, v17 Ridders (0.7.0, part A),…:110, v11 Dorp (0.5.0):123, R1 Boot safety (R1d):207, v9 Eerlijke punten (0.3.0):225, v2 Gouden ei (0.2.0):250, Summary:322, Acceptance criteria coverage:325, Bugs:329, Kid safety and accessibility:333, Screenshots:335 |
| docs/UI_REVIEW.md | 159 | Screenshots are not in git (44 MB). Run npm run test:e2e:ui-review to regenerate them in… Sections: How this was done:10, Why the founder sees buttons…:21, Screen map:30, Findings:58, Way back, in the same place?:135, What is good and should stay:142, Questions for the founder:153 |
| docs/archive/CONTENT_CHECK.md | 215 | Date: 2026-10-22. By: QA. F1 to F7 and F10 are fixed (see the "Fixed" line under each).… Sections: How this was done:5, Overall result:40, Findings:48, What checked out (no finding):159, Top 5 to fix:170, 20 items for the founder or…:178, Lookup list for…:207, For the founder:211 |
| docs/archive/DISCUSSION-to-v10.md | 309 | Moved out of docs/DISCUSSION.md on 2026-10-26 (decision 105). Unchanged. Sections: PRD review round 1:5, Architecture review:159, Architecture review (qa view):187, M1 milestone review:264 |
| docs/archive/SIMPLIFY.md | 259 | Architect review, 2026-10-19, after v2 (0.2.0). Read from the real code, tests, CI runs… Sections: 1. What hurts most:5, 2. Ideas:29, 3. Founder decisions in one…:193, 4. Suggested order:212 |
| docs/archive/TECH_REVIEW.md | 168 | Architect review, 2026-10-24, on branch claude/blissful-hawking-hr67ui (same code as… Sections: 1. Snapshot:5, 2. Status of the SIMPLIFY.md…:30, 3. New findings:63, 4. Top 5 recommendations:144, 5. Things not to do:158 |
| docs/archive/decisions-1-86.md | 92 | Moved out of docs/DECISIONS.md on 2026-10-26 (decision 105). Rows are unchanged. Grep by… |
| docs/factory-feedback/2026-10-22.md | 57 | Factory started: 2026-10-17 |
| docs/factory-feedback/2026-11-06.md | 26 | Source factory: dalhhorn-ship-it/danfactory (bf63299). For its inbox. |
| docs/releases/plan-done.md | 250 | Moved out of docs/PLAN.md on 2026-10-26 (decision 105) so the plan holds only open work.… Sections: Milestones:5, Tasks:27, Task notes:151, Operator notes during the…:246 |
| docs/releases/v10.md | 47 | Archive, not signed. This is the v10 section as the founder signed it in docs/PRD.md… |
| docs/releases/v11.md | 70 | Archive, not signed. This is the v11 section as the founder signed it in docs/PRD.md… |
| docs/releases/v15-v16.md | 158 | Archive, not signed. These are the v15 and v16 sections as the founder signed them in… |
| docs/releases/v17-v18.md | 143 | Archive, not signed. This is the v17 and v18 section as the founder signed it in… |
| docs/releases/v19-v21.md | 239 | Archive, not signed. These are the v19, v20 and v21 sections as the founder signed them… |
| docs/releases/v2.md | 54 | Archive, not signed. This is the v2 section as the founder signed it in docs/PRD.md… |
| docs/releases/v3.md | 54 | Archive, not signed. This is the v3 section as the founder signed it in docs/PRD.md… |
| docs/releases/v9.md | 38 | Archive, not signed. This is the v9 section as the founder signed it in docs/PRD.md… |
