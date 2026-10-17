#!/usr/bin/env bash
# The one command that verifies the project. Agents and CI both run it.
# The architect adapts it to the chosen stack.
set -euo pipefail
cd "$(dirname "$0")/.."

ran=0
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
  npm run lint --if-present
  npm run typecheck --if-present
  npm test --if-present
  npm run build --if-present
  npm run test:e2e --if-present
  ran=1
fi
if [[ -f pyproject.toml || -f requirements.txt ]]; then
  python3 -m pytest -q
  ran=1
fi

if [[ $ran -eq 0 ]]; then
  echo "No app code yet: nothing to check. (The architect sets this up in task T1.)"
fi
echo "check.sh: OK"
