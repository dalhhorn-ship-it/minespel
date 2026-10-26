#!/usr/bin/env bash
# The fast check for one task, in about a minute. The full check stays ./scripts/check.sh
# (before a push at the end of a release, and in CI). See docs/PLATFORM.md, "Smoke and full check".
#   1. Only docs or learning content changed: the content check, then stop.
#   2. Lint and typecheck everything (both are quick).
#   3. Unit tests related to the changed source files (all of them when more than 40 files changed).
#   4. Build and the dist check.
#   5. A few e2e specs on one iPad size: smoke, boot-taps, world, plus every changed spec.
#      WebKit when it is installed, else local Chromium (a first check only).
# Base for "changed": $CHECK_BASE, else origin/main. Uncommitted and untracked files count.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(./scripts/check-scope.sh)" == "content" ]]; then
  echo "smoke.sh: only learning content or docs changed, running the content check."
  exec ./scripts/check-content.sh
fi

base="${CHECK_BASE:-origin/main}"
mb=$(git merge-base "$base" HEAD 2>/dev/null || git rev-parse HEAD)
changed=$( { git diff --name-only "$mb" HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)

if [[ ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  npm ci --no-audit --no-fund
fi

npm run lint
npm run typecheck

src=$(grep -E '^(src|tests/unit)/.*\.ts$' <<< "$changed" | while read -r f; do [[ -f "$f" ]] && echo "$f"; done || true)
count=$(grep -c . <<< "$src" || true)
if [[ $count -eq 0 ]]; then
  echo "smoke.sh: no source files changed, skipping unit tests."
elif [[ $count -gt 40 ]]; then
  echo "smoke.sh: $count source files changed, running every unit test."
  npm test
else
  # shellcheck disable=SC2086
  npx vitest related --run $src
fi

npm run build
npm run test:dist

specs=(tests/e2e/smoke.spec.ts tests/e2e/boot-taps.spec.ts tests/e2e/world.spec.ts)
while read -r f; do
  [[ "$f" == tests/e2e/*.spec.ts && "$f" != tests/e2e/ui-review*.spec.ts && -f "$f" ]] && specs+=("$f")
done <<< "$changed"
mapfile -t specs < <(printf '%s\n' "${specs[@]}" | sort -u)

if ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/webkit-* /opt/pw-browsers/webkit-* >/dev/null 2>&1; then
  npx playwright test --project=ipad-landscape "${specs[@]}"
else
  echo "smoke.sh: WebKit is not installed, running e2e in LOCAL CHROMIUM. CI on WebKit stays the truth."
  E2E_LOCAL=1 npx playwright test --project=ipad-landscape "${specs[@]}"
fi

echo "smoke.sh: OK (fast check only; run ./scripts/check.sh before the release push)"
