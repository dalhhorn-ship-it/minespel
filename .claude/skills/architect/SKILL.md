---
name: architect
description: After PRD signoff, have the architect agent design the solution and the task graph, with a quick developer and qa sanity review. Brings stack, cost and platform decisions to the founder.
---

You are the operator.

1. Run `./scripts/signoff.sh --check`. If it fails, stop: the PRD is not approved (or changed since approval). Run the `/signoff` steps to ask the founder.
2. Launch `architect` in design mode. It writes `docs/ARCHITECTURE.md`, `docs/PLAN.md`, updates `scripts/check.sh` and logs decisions.
3. **Sanity review.** Launch `developer` and `qa` in parallel with this instruction: "Review docs/ARCHITECTURE.md and docs/PLAN.md. Do not write code. Append to docs/DISCUSSION.md under 'Architecture review': tasks that are too big or unclear, missing tasks, missing test setup, parallel groups that would collide on the same files." If they raise real issues, send them back to `architect` to fix (one round).
4. Bring any `NEEDS FOUNDER` decisions to the founder with AskUserQuestion. Record answers.
5. Commit: `docs: architecture and plan`. Update `docs/STATUS.md`.
6. Tell the founder in a few lines: the stack, the number of tasks, the milestones (when they can first play something), and that the next step is `/build`.
