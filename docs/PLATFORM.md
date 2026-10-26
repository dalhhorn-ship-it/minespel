# Platform rules: iPad, hosting, content releases

Moved out of `CLAUDE.md` on 2026-10-26 (decision 104). Read this when a task touches the UI, input, sound, saves, the build, hosting or learning modules.

## Target device: iPad browser

Unless the PRD says otherwise, apps are played in **Safari on an iPad**, held by a kid.
* Touch first. No hover states, no right click, no keyboard needed. Touch targets at least 44px, bigger for small kids. Use pointer events, and handle two fingers at once if kids play together.
* Works in landscape and portrait, or locks the layout to one and says so. Respect safe areas (`viewport-fit=cover`, `env(safe-area-inset-*)`).
* Feels like an app: no double tap zoom, no pinch zoom during play, no text selection or callout menus on long press, no pull to refresh or rubber band scrolling in game areas.
* Installable as a home screen web app (manifest, icons, `apple-mobile-web-app-capable`), and works offline after the first visit (service worker).
* Sound starts only after the first tap (iOS rule). The app must still work with the mute switch on.
* Saves: Safari can wipe local storage of sites not opened for a while unless the app is added to the home screen. Keep saves small and forgiving.
* Performance: smooth on an older iPad. Keep assets small, use CSS transforms or canvas, avoid heavy libraries.
* Test in WebKit with an iPad device profile (Playwright), plus a real iPad check at each milestone: `npm run dev -- --host` and open the shown address on the iPad.
* `check.sh` installs WebKit with `npx playwright install webkit`. If a cloud session cannot download it, `check.sh` falls back to local Chromium (`npm run test:e2e:local`). Chromium is a fast first check only: CI on WebKit stays the truth.

## Hosting: Cloudflare Workers

The app is served as static assets by the Cloudflare Worker `minespel` (`wrangler.jsonc`, `"assets": { "directory": "./dist" }`).
* **Merging to `main` deploys.** Cloudflare Workers Builds is connected to the repo and deploys `main` on every merge (decision 98). It does not wait for GitHub CI. So a merge to `main` is a deploy: it needs the founder (Gate 2), and only a commit with green CI is merged.
* `.github/workflows/deploy.yml` is a spare manual path. It deploys only a commit whose CI run is green, with the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, which only the founder adds.
* npm scripts: `deploy` (`npm run build && wrangler deploy`) and `preview` (build, then `wrangler dev`). `wrangler` is a dev dependency, never a global install.
* URL: `minespel.dalhhorn.workers.dev`. A custom domain or route is a founder decision.
* Static assets only. Worker code, KV, D1, R2 or any server side logic only when the PRD needs it and the founder approved it. Free plan limits must hold.
* The Cloudflare Worker (hosting) and the browser service worker (offline play) are separate files. Name them clearly.
* Never commit Cloudflare tokens or account ids.
* For a private test, prefer `wrangler dev` on the local network, or Cloudflare Access (founder sets it up).

## Content releases (learning modules)

A new or changed learning module that stays inside the format in `docs/modules/README.md` is content, not a feature. Make it with `/module`. `./scripts/check.sh` sees that only module JSON and docs changed (`scripts/check-scope.sh`) and runs just the validator, the module unit tests and the build, without e2e. CI does the same. Anything else in the same change (code, tests, `validate.py`) makes it a normal release with the full check. `main` and deploys always run everything.
