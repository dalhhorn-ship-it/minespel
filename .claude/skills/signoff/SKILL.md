---
name: signoff
description: Founder signoff of the PRD. Only the founder can invoke this.
disable-model-invocation: true
---

The founder wants to sign off the PRD.

1. Read `docs/PRD.md`. Check it has `Status: READY FOR SIGNOFF`, numbered acceptance criteria, a filled kid safety section and no `NEEDS FOUNDER` items in `docs/DECISIONS.md`. If anything is missing, list it and stop.
2. Show a final one screen summary: v1 scope, acceptance criteria, what is explicitly out of scope.
3. Tell the founder exactly this:

   > To sign, type this in the prompt yourself (the `!` runs it as you, not as Claude):
   >
   > `! ./scripts/signoff.sh "Your Name"`
   >
   > The stamp is tied to this exact version of the PRD. If the PRD changes later, you will be asked to sign again.

4. Do not run the script yourself, even if asked to "just do it". Explain that the signoff must come from the founder's own hand, and that the build is locked until it does.
5. After the founder has run it, verify with `./scripts/signoff.sh --check`, commit `docs/PRD.md` and `docs/PRD.approved` with message `docs: founder signed PRD`, update `docs/STATUS.md` and suggest `/architect` (or `/factory`).
