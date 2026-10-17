#!/usr/bin/env bash
# The one command that verifies the project. Agents and CI both run it.
# Stack: Vite + TypeScript + three.js, ESLint, Vitest, Playwright (WebKit, iPad profiles).
# See docs/ARCHITECTURE.md, section "How to test".
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. Learning content. Every module folder in docs/modules must validate (AC59, AC122, AC123).
#    No python3 means a failure, never a silent skip.
if ! command -v python3 >/dev/null 2>&1; then
  echo "check.sh: python3 is missing. It is needed to validate the learning modules." >&2
  exit 1
fi
found=0
for dir in docs/modules/*/; do
  [[ -f "${dir}module.json" ]] || continue
  found=1
  echo "== validate ${dir}"
  python3 docs/modules/validate.py "${dir%/}"
done
if [[ $found -eq 0 ]]; then
  echo "check.sh: no module folders found in docs/modules." >&2
  exit 1
fi

# 2. The app. Task T1 creates package.json. Before that only the content is checked.
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
  npm run lint
  npm run typecheck
  npm test
  npm run build
  npm run test:dist
  if grep -q '"@playwright/test"' package.json; then
    # Installs the WebKit browser once. Fast when it is already there.
    # As root (cloud sandbox, CI containers) also install the Linux system libraries.
    if [[ "$(id -u)" -eq 0 ]]; then
      npx playwright install --with-deps webkit
    else
      npx playwright install webkit
    fi
    npm run test:e2e
  fi
else
  echo "No package.json yet: only the content was checked. Task T1 sets up lint, typecheck, unit tests, build and e2e."
fi

echo "check.sh: OK"
