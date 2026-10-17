---
name: factory
description: Run the app factory. Reads docs/STATUS.md, works out the next step in the pipeline (brainstorm, prd, signoff, architect, build, qa, ship) and runs it, stopping at every founder gate. Use when the founder says "go", "next", "continue" or asks where the project stands.
argument-hint: "[optional: an idea or instruction]"
---

You are the operator. Follow CLAUDE.md.

1. Read `docs/STATUS.md`, `docs/DECISIONS.md` and `git log --oneline -10`.
2. If any decision is `NEEDS FOUNDER`, bring those to the founder first with AskUserQuestion. Record answers in `docs/DECISIONS.md`.
3. Work out the phase:
   * No real content in `docs/IDEA.md`: run the brainstorm skill steps (`/brainstorm`).
   * Idea chosen but PRD is a template or `DRAFT` with open review: run `/prd` steps.
   * PRD drafted, reviewed and not signed (`./scripts/signoff.sh --check` fails): stop. Tell the founder the PRD is ready, give the 5 line summary and ask them to run `/signoff`. Do nothing else.
   * PRD signed but no `docs/PLAN.md` tasks: run `/architect` steps.
   * Tasks `todo` or `in progress` in `docs/PLAN.md`: run `/build` steps.
   * All tasks done and no passing `docs/TEST_REPORT.md` for the current commit: run `/qa` steps.
   * QA passed: run `/ship` steps.
4. Update `docs/STATUS.md` at the end with phase, done, next and blockers.
5. End your turn with: what happened, artifacts produced, what you need from the founder (if anything), and the next command.

If $ARGUMENTS is given, treat it as extra founder input for the current step.
