# Handoff, 2026-11-06 18:00, danfactory practices and health check

## Task
Founder: pull best practices from dalhhorn-ship-it/danfactory into minespel; health check brief for the product director; add the reference table, knowledge graph and dashboard.

## State
* Done on branch `ccr-89499325-bddp4g`, PR #17 (open, CI green on 73b573e):
  * 73b573e large read guard and short context hooks (decision 117)
  * e101bab `scripts/docs_index.py` builds docs/INDEX.md and docs/knowledge-graph.json; check.sh refreshes them (decision 118)
  * 73a578e `scripts/dashboard.py` and 14 tests; page published privately: https://claude.ai/artifact/TigpxQDByMmDuqBLjNK6Ug
* This session is subscribed to PR #17 activity.
* Uncommitted: none.

## Next steps (waiting on the founder's yes)
1. Fix PR #15 (health audit round 2, true STATUS): its decision 114 clashes with main's 114 (Dinofluit), and it adds a SessionStart hook (`scripts/session-start.sh`) that clashes with PR #17's `session_start.py`. Renumber, merge one hook into the other.
2. Check and delete 6 stale branches: claude/blissful-hawking-hr67ui, busy-dirac-7pcc1o, dreamy-rubin-eywmla, exciting-hawking-drlxoc (= PR #15), festive-ramanujan-0n4m43, inspiring-franklin-6sfogp.
3. Name the Unreleased CHANGELOG items (fluit, voortgang, herd 25, Bijzondere dino's, R2e) as a version, then `/release` to scope v3 Dino's veilig.

## Watch out
* Merging to main deploys (decision 98): founder only.
* .claude/hooks and .claude/settings.json are protected by prd-gate.sh; edit only with the founder's explicit yes.
* docs/STATUS.md and the BACKLOG "v11 next" row are stale; the dashboard repeats them. PR #15 has the true status.

## Pointers
* Decisions 117, 118 in docs/DECISIONS.md. Factory feedback: docs/factory-feedback/2026-11-06.md.
* danfactory clone (read only): /home/user/dalhhorn-ship-it/danfactory
