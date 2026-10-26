# Status

Keep this file short and true. Rewrite it, do not append. What was done lives in `CHANGELOG.md`, `docs/releases/` and git log. The old long status is `docs/archive/status-to-0.5.0.md`.

**Phase:** small releases. Shipped: 0.1.0 to 0.5.0. The last one is v11 Dorp (0.5.0, PR #13).
**On `main` since 0.5.0 (live, not yet a version):** the health audit (decisions 103 to 110, 114), Inruilen and a herd of 25, the follow dino fix and 10 Bijzondere dino's (decisions 111 to 113, PR #14). The kid lines are in `CHANGELOG.md` under Unreleased.
**Next step:** `/release` to scope the next release with the founder: v3 Dino's veilig (0.6.0), then v6 Wat heb ik geleerd (0.7.0). See `docs/BACKLOG.md`. Scoping v3 also moves the v11 section from PRD section 12 to `docs/releases/v11.md`, in the same signoff.
**Founder checks open:** speed with 25 dinos on the oldest iPad; the iPad check AC165; the Taal spelling check (AC124, T65).
**On hold:** the save on refresh fix (decision 72); refactor R2e (decision 108).
**Blockers:** none. Cloud sessions cannot push to `main` or push tags (HTTP 403), so `main` is updated through a pull request. A merge to `main` deploys (decision 98).

## Notes
* Biggest risk: 3D speed in iPad Safari, now with up to 25 dinos.
* Safari can clear the saves of a site not opened for a while. The kids should play from the home screen app. v3 adds a backup file.
