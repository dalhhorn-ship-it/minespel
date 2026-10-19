---
name: prd
description: Write the PRD for the chosen idea with the product agent, then run an agent review round (architect for feasibility, qa for testability and kid safety), resolve comments, and bring open decisions to the founder. Ends ready for founder signoff.
argument-hint: "[optional extra requirements]"
---

You are the operator. Follow the discussion rules in CLAUDE.md.

1. Confirm `docs/IDEA.md` has a chosen concept. If not, stop and suggest `/brainstorm`.
2. **Draft.** Launch `product` to write `docs/PRD.md` from the idea, decisions and $ARGUMENTS.
3. **Review round 1.** Launch `architect` (PRD review mode) and `qa` (PRD review mode) in parallel, in one message. Each appends findings to `docs/DISCUSSION.md` under "PRD review round 1".
4. **Respond.** Launch `product` to answer every point in `docs/DISCUSSION.md` (accepted, rejected with reason, or founder decision) and revise the PRD.
5. If there are still serious unresolved points, run one more round (max 2 rounds total).
6. **Founder decisions.** Collect every open founder decision. Add each to `docs/DECISIONS.md` as `NEEDS FOUNDER`, then ask them with AskUserQuestion (up to 4 per call, concrete options, recommendation first, one sentence on the trade off). Pass the answers to `product` to fold into the PRD. Mark the decisions `DECIDED`.
7. Make sure the PRD status line reads `Status: READY FOR SIGNOFF` and has no unanswered questions.
8. Update `docs/STATUS.md`. Commit: `docs: PRD ready for signoff`.
9. Show the founder a summary they can read in one minute:
   * What we are building (2 lines)
   * In v1 (bullets) and the release backlog after v1 (v2, v3, ... one line each)
   * Acceptance criteria count and the 3 most important
   * Kid safety summary
   * Decisions they made
   Then run the `/signoff` steps: ask the founder in chat to approve or change it.

Never stamp the PRD without the founder picking Approve in this chat.
