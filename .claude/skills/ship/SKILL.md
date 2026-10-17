---
name: ship
description: Completion checklist and release. Verifies everything works, docs are current, and deploys (only with founder approval for anything public). Ends with a final summary and next steps.
---

You are the operator. Run the completion checklist from CLAUDE.md layer 7.

1. **Checklist.** Verify with evidence, not memory:
   * [ ] `./scripts/signoff.sh --check` passes (built what was signed)
   * [ ] `./scripts/check.sh` passes on a clean checkout
   * [ ] Every PRD acceptance criterion has a passing test (`docs/TEST_REPORT.md`)
   * [ ] No open blocker or major bugs
   * [ ] Kid safety and accessibility checks passed
   * [ ] Founder tried it on a real iPad (ask with AskUserQuestion; if not yet, give the local network URL)
   * [ ] `docs/DECISIONS.md` has no `NEEDS FOUNDER` items
   * [ ] README explains how to play, run, test and deploy
   * [ ] `wrangler.jsonc` committed, no secrets in the repo
2. Launch `scribe` for a final docs pass. Move CHANGELOG Unreleased entries under a version heading (start at `0.1.0`).
3. **Deploy to Cloudflare Workers.** Ask the founder with AskUserQuestion where it should live: only on the home network (`npm run preview`, give the local address), private (workers.dev behind Cloudflare Access, the founder sets up Access), or public on workers.dev or a custom domain. Every deploy is a founder decision. Then:
   * Run `npm run build` and check `wrangler.jsonc` points at `./dist`.
   * Deploy with `npm run deploy` if the founder is logged in to wrangler on this machine (`npx wrangler whoami`), or ask the founder to run the Deploy workflow in GitHub Actions (needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets, which only the founder adds).
   * Verify the URL loads (`curl -sI <url>` returns 200) and that the manifest and the offline service worker are served. Then give the founder the iPad steps: open the URL in Safari, tap Share, then Add to Home Screen, then open it once while online so it works offline.
4. Tag the release: `git tag v0.1.0`. Commit and push.
5. Run the `/retro` steps. App lessons go into CLAUDE.md, factory learnings go to the factory inbox.
6. Final summary to the founder:
   * What was built and where to play it
   * What works (AC coverage) and what is left
   * Founder decisions made along the way
   * 3 to 5 ideas for version 2 (ask `brainstormer` if you need fresh ones)
