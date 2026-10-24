#!/usr/bin/env bash
# The one command that verifies the project. Agents and CI both run it.
# Stack: Vite + TypeScript + three.js, ESLint, Vitest, Playwright (WebKit, iPad profiles).
# See docs/ARCHITECTURE.md, section "How to test".
set -euo pipefail
cd "$(dirname "$0")/.."

# 0. Content release path. Only learning modules or docs changed against the base (see
#    scripts/check-scope.sh)? Then run the quick content check, without e2e.
#    CHECK_FULL=1 always runs everything (main, deploys, and when in doubt).
if [[ "${CHECK_FULL:-0}" != "1" && "$(./scripts/check-scope.sh)" == "content" ]]; then
  echo "check.sh: only learning content or docs changed, taking the content release path."
  echo "check.sh: set CHECK_FULL=1 to run everything."
  exec ./scripts/check-content.sh
fi

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
  # Skip the install when node_modules is newer than the lock file (saves about 10 seconds).
  if [[ -f package-lock.json && -f node_modules/.package-lock.json && node_modules/.package-lock.json -nt package-lock.json ]]; then
    echo "check.sh: node_modules is up to date, skipping npm ci."
  elif [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund
  else npm install --no-audit --no-fund; fi
  npm run lint
  npm run typecheck
  npm test
  npm run build
  npm run test:dist
  # CHECK_E2E=0 skips the browser tests. CI does that in its fast job and runs e2e in parallel shards.
  if [[ "${CHECK_E2E:-1}" == "0" ]]; then
    echo "check.sh: e2e skipped (CHECK_E2E=0)."
  elif grep -q '"@playwright/test"' package.json; then
    # Installs the WebKit browser once. Fast when it is already there.
    # As root (cloud sandbox, CI containers) also install the Linux system libraries.
    if [[ "$(id -u)" -eq 0 ]]; then
      install_webkit=(npx playwright install --with-deps webkit)
    else
      install_webkit=(npx playwright install webkit)
    fi
    if "${install_webkit[@]}"; then
      npm run test:e2e
    elif [[ -z "${CI:-}" && -d /opt/pw-browsers/chromium ]]; then
      # Cloud sandboxes block the WebKit download. CI always has WebKit and never takes this path.
      echo "check.sh: WARNING: WebKit could not be installed. Running e2e in LOCAL CHROMIUM (E2E_LOCAL=1), NOT WebKit. CI on WebKit stays the truth."
      npm run test:e2e:local
    else
      echo "check.sh: WebKit could not be installed and no local Chromium was found." >&2
      exit 1
    fi
  fi
else
  echo "No package.json yet: only the content was checked. Task T1 sets up lint, typecheck, unit tests, build and e2e."
fi

echo "check.sh: OK"
