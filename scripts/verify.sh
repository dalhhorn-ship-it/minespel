#!/usr/bin/env bash
# Independent, free checks on another agent's work. Runs before any verifier agent,
# so no tokens are spent reviewing work that fails a mechanical rule.
#   ./scripts/verify.sh task T3 [T4 ...] [--no-check]  developer work in the working tree
#   ./scripts/verify.sh acs                            every PRD AC has a test (checks qa)
#   ./scripts/verify.sh docs                           scribe changed docs only, README commands exist
# Prints FAIL and WARN lines, then a verdict. Exits 1 on any FAIL.
set -uo pipefail
cd "$(dirname "$0")/.."

fails=0; warns=0
fail() { echo "FAIL: $*"; fails=$((fails + 1)); }
warn() { echo "WARN: $*"; warns=$((warns + 1)); }
done_() {
  if [[ $fails -gt 0 ]]; then echo "verify.sh: FAIL ($fails failed, $warns warnings)"; exit 1; fi
  echo "verify.sh: PASS ($warns warnings)"; exit 0
}

is_test() { [[ $1 == tests/* || $1 == test/* || $1 == e2e/* || $1 == *.test.* || $1 == *.spec.* || $1 == *_test.* || $1 == */test_* || $1 == test_* ]]; }
is_doc() { [[ $1 == *.md || $1 == docs/* ]]; }

base() { git rev-parse -q --verify HEAD >/dev/null && echo HEAD; }
changed() {
  { if [[ -n $(base) ]]; then git diff --name-only HEAD; else git ls-files; fi
    git ls-files --others --exclude-standard; } | sort -u
}
# Added and removed lines, as "+file<TAB>line" and "-file<TAB>line".
lines() {
  local f
  if [[ -n $(base) ]]; then
    git diff -U0 HEAD | awk '/^diff --git /{f=$3; sub(/^a\//,"",f); next} /^(\+\+\+|---) /{next}
      /^\+/{print "+" f "\t" substr($0,2)} /^-/{print "-" f "\t" substr($0,2)}'
  fi
  git ls-files --others --exclude-standard | while read -r f; do
    [[ -f $f ]] && grep -Iq . "$f" 2>/dev/null && while IFS= read -r l || [[ -n $l ]]; do printf '+%s\t%s\n' "$f" "$l"; done < "$f"
  done
}

mode="${1:-}"; shift || true
case "$mode" in
task)
  run_check=1; ids=()
  for a in "$@"; do [[ $a == --no-check ]] && run_check=0 || ids+=("$a"); done
  [[ ${#ids[@]} -gt 0 ]] || { echo "usage: verify.sh task T3 [T4 ...] [--no-check]"; exit 2; }

  allowed=()
  for id in "${ids[@]}"; do
    row=$(awk -F'|' -v id="$id" '{g=$2; gsub(/ /,"",g)} g==id {print $6; exit}' docs/PLAN.md)
    [[ -n $row ]] || { fail "$id not found in docs/PLAN.md, or it lists no files"; continue; }
    for p in $(printf '%s' "$row" | tr ',`' '  '); do allowed+=("$p"); done
  done

  files=$(changed)
  [[ -n $files ]] || fail "no changes in the working tree"
  tests=0
  deleted=$([[ -n $(base) ]] && git diff --name-only --diff-filter=D HEAD)
  while read -r f; do
    [[ -z $f ]] && continue
    case "$f" in docs/PRD.md|docs/PRD.approved|scripts/signoff.sh|scripts/verify.sh|.claude/*)
      fail "$f is not a developer file and must not change in a task"; continue ;; esac
    if is_test "$f"; then
      if grep -qxF "$f" <<< "$deleted"; then fail "$f was deleted (never delete a test to get green)"; else tests=1; fi
      continue
    fi
    is_doc "$f" && continue
    ok=0
    for p in ${allowed[@]+"${allowed[@]}"}; do
      [[ $f == $p || $f == ${p%/}/* ]] && ok=1 && break
      [[ $f == package-lock.json && $p == package.json ]] && ok=1 && break
    done
    [[ $ok -eq 1 ]] || fail "$f is outside the files listed for ${ids[*]} (scope or new dependency)"
  done <<< "$files"
  [[ $tests -eq 1 ]] || fail "no test file added or changed"

  diff_lines=$(lines | grep -v $'^[+-]scripts/verify.sh\t')
  code_added=$(printf '%s\n' "$diff_lines" | grep '^+' | while IFS=$'\t' read -r f l; do
    f=${f#+}; is_doc "$f" || printf '%s\t%s\n' "$f" "$l"; done)
  printf '%s\n' "$code_added" | grep -E '\b(it|test|describe)\.(skip|only|todo)\(|\bx(it|describe|test)\(|@ts-(ignore|nocheck)|eslint-disable|pytest\.mark\.(skip|xfail)' \
    | while IFS=$'\t' read -r f l; do echo "FAIL: $f skips a test or silences a check: $l"; done | grep . && fails=$((fails + 1))
  printf '%s\n' "$code_added" | grep -Ei 'google-analytics|googletagmanager|gtag\(|facebook\.net|mixpanel|segment\.(io|com)|hotjar|doubleclick' \
    | while IFS=$'\t' read -r f l; do echo "FAIL: $f looks like tracking or ads: $l"; done | grep . && fails=$((fails + 1))
  printf '%s\n' "$code_added" | while IFS=$'\t' read -r f l; do
    is_test "$f" && continue
    printf '%s\n' "$l" | grep -Eo 'https?://[^ "'"'"'`)]+' | grep -Ev '^https?://(localhost|127\.0\.0\.1|www\.w3\.org)' \
      | sed "s|^|WARN: $f has an external URL (parent gate?): |"
  done | grep . && warns=$((warns + 1))
  counts=$(printf '%s\n' "$diff_lines" | awk -F'\t' '$2 ~ /expect\(|assert/ && $1 ~ /(tests?\/|e2e\/|\.test\.|\.spec\.|_test\.|test_)/ {
    if (substr($1,1,1) == "+") a++; else r++ } END {print a+0, r+0}')
  read -r added removed <<< "$counts"
  [[ $removed -gt $added ]] && warn "tests lost assertions ($removed removed, $added added): check none were weakened"

  size=$(printf '%s\n' "$diff_lines" | grep -c .)
  echo "info: ${size} changed lines in $(printf '%s\n' "$files" | grep -c .) files"
  if [[ $run_check -eq 1 && $fails -eq 0 ]]; then
    out=$(./scripts/check.sh 2>&1) || { fail "scripts/check.sh failed"; printf '%s\n' "$out" | tail -20; }
  fi
  done_ ;;

acs)
  out=$(python3 - <<'PY'

import pathlib, re, sys
prd = re.sub(r"<!--.*?-->", "", pathlib.Path("docs/PRD.md").read_text(), flags=re.S)
acs = sorted(set(re.findall(r"\*\*(AC\d+)", prd)), key=lambda a: int(a[2:]))
skip = {"node_modules", ".git", "dist", "build", "coverage", "test-results", "playwright-report"}
text = ""
for p in pathlib.Path(".").rglob("*"):
    if p.is_file() and not skip & set(p.parts) and re.search(r"(^|/)(tests?|e2e)/|\.test\.|\.spec\.|_test\.|(^|/)test_", str(p)):
        try: text += p.read_text(errors="ignore")
        except OSError: pass
report = pathlib.Path("docs/TEST_REPORT.md").read_text() if pathlib.Path("docs/TEST_REPORT.md").exists() else ""
bad = 0
for a in acs:
    if not re.search(rf"\b{a}\b", text): print(f"FAIL: {a} has no test named after it"); bad += 1
    if not re.search(rf"\b{a}\b", report): print(f"WARN: {a} is missing from docs/TEST_REPORT.md")
print(f"info: {len(acs)} acceptance criteria checked")
sys.exit(1 if bad or not acs else 0)
PY
) || fails=$((fails + 1))
  printf '%s\n' "$out"
  warns=$(grep -c '^WARN' <<< "$out")
  done_ ;;

docs)
  while read -r f; do
    [[ -z $f ]] && continue
    is_doc "$f" || fail "$f is not a doc file (the scribe never changes code)"
  done <<< "$(changed)"
  if [[ -f README.md && -f package.json ]]; then
    for s in $(grep -Eo 'npm run [a-z0-9:_-]+' README.md | awk '{print $3}' | sort -u); do
      python3 -c 'import json,sys; sys.exit(0 if sys.argv[1] in json.load(open("package.json")).get("scripts",{}) else 1)' "$s" \
        || fail "README mentions npm run $s but package.json has no such script"
    done
  fi
  done_ ;;

*) sed -n '2,8p' "$0"; exit 2 ;;
esac
