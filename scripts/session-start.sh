#!/usr/bin/env bash
# SessionStart hook (cloud sessions only): install npm packages and WebKit once,
# so smoke.sh and the e2e specs do not pay for the install in every session.
# The container is cached after this hook, so later sessions start ready.
set -euo pipefail

if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}"

if [[ ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  npm install --no-audit --no-fund
fi

if ! ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/webkit-* >/dev/null 2>&1; then
  npx playwright install --with-deps webkit || echo "session-start: WebKit install failed, e2e falls back to Chromium (npm run test:e2e:local)."
fi
