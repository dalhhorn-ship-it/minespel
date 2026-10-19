#!/usr/bin/env bash
# Prints "content" when every change against the base is learning content or docs, else "full".
# Content means: module JSON in docs/modules/<module>/, other docs, CHANGELOG, README, .claude.
# The module format itself (docs/modules/validate.py) and all code always count as full.
# Base: $CHECK_BASE, else origin/main. Includes uncommitted and untracked files.
# When the base cannot be found, the answer is "full", never "content".
set -uo pipefail
cd "$(dirname "$0")/.."

base="${CHECK_BASE:-origin/main}"
if ! mb=$(git merge-base "$base" HEAD 2>/dev/null); then
  echo full
  exit 0
fi

changed=$( {
  git diff --name-only "$mb" HEAD
  git diff --name-only HEAD
  git ls-files --others --exclude-standard
} | sort -u)

if [[ -z "$changed" ]]; then
  echo full
  exit 0
fi

while IFS= read -r f; do
  case "$f" in
    docs/modules/validate.py) echo full; exit 0 ;;
    docs/*|.claude/*|CHANGELOG.md|README.md) ;;
    *) echo full; exit 0 ;;
  esac
done <<< "$changed"
echo content
