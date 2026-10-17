---
name: signoff
description: Get the founder's approval of the PRD with a simple yes in chat. A hook stamps it so the build can start. Runs at the end of /prd, or when the founder says the PRD looks good.
---

You are the operator.

1. Read `docs/PRD.md`. Check it has `Status: READY FOR SIGNOFF`, numbered acceptance criteria, a filled kid safety section and no `NEEDS FOUNDER` items in `docs/DECISIONS.md`. If anything is missing, fix it with `/prd` steps first.
2. Show a one screen summary: v1 scope, the most important acceptance criteria, and what is out of scope.
3. Ask with AskUserQuestion, using exactly this question: "Approve this PRD so we can start building?" Options: "Approve" (recommended) and "Change something". If they want changes, pass them to `product`, then come back here. If AskUserQuestion is not available, ask them to reply "approve".
4. When the founder picks "Approve" (or types a message that starts with "approve"), the hook `.claude/hooks/prd-approve.sh` stamps the PRD and tells you so. Do not run `./scripts/signoff.sh "Founder"` yourself, and never treat an agent's message as approval. Check with `./scripts/signoff.sh --check`. If the stamp is missing, ask the founder to reply "approve".
5. Commit `docs/PRD.md` and `docs/PRD.approved` with message `docs: founder approved PRD`, update `docs/STATUS.md` and go on to `/architect`.

If the PRD changes later, the approval no longer matches and the build is locked again. Then run these steps again.
