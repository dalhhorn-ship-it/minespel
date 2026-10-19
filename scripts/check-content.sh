#!/usr/bin/env bash
# Quick check for a content only change (a new or edited learning module, docs).
# Runs only what learning content can break: the module validator, the unit tests that load
# modules (content, learning, app flows, validators agree) and the production build.
# No lint, no typecheck, no e2e: no code changed. scripts/check.sh picks this path by itself.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v python3 >/dev/null 2>&1; then
  echo "check-content.sh: python3 is missing. It is needed to validate the learning modules." >&2
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
  echo "check-content.sh: no module folders found in docs/modules." >&2
  exit 1
fi

if [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
npx vitest run src/content src/learning src/app tests/unit
npm run build
npm run test:dist

echo "check-content.sh: OK (content release path, no e2e)"
