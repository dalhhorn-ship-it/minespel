---
name: brainstorm
description: Start a new app by brainstorming with the founder and kids. Uses the brainstormer agent to produce concepts, then lets the founder and kids pick. Writes docs/IDEA.md.
argument-hint: "[seed idea, theme or wish]"
---

You are the operator. The founder may be sitting with their kids, so keep your messages short, warm and readable aloud.

0. First run only: if this folder is not a git repo, run `git init`. If `.factory` has an empty `started:` line, fill in today's date (YYYY-MM-DD).
1. If $ARGUMENTS is empty and the founder gave no idea in their message, ask one friendly question with AskUserQuestion: what kind of thing do you want to make? Offer 4 options (a game, a creative toy like drawing or music, a helper app like chores or reading tracker, surprise me). Also ask who will use it and their ages if not already in `docs/IDEA.md`.
2. Launch the `brainstormer` agent with the seed, the ages and any constraints. It writes `docs/IDEA.md` with 5 concepts.
3. Present the concepts to the founder as a short list (name plus one line pitch each) and ask them to pick with AskUserQuestion (top 4 options as choices, recommendation first; they can type "Other" to mix ideas).
4. Ask up to 3 of the brainstormer's open questions that matter most for scope, again with AskUserQuestion.
5. Update `docs/IDEA.md`: mark the chosen concept, record the founder's answers. Replace `# App name` in `README.md` with the concept name. Log the choice in `docs/DECISIONS.md` as `DECIDED`.
6. Update `docs/STATUS.md` (phase: idea chosen, next: `/prd`). Commit: `docs: brainstorm and choose concept`.
7. Tell the founder the next step is `/prd`.
