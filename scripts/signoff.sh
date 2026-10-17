#!/usr/bin/env bash
# Founder signoff for docs/PRD.md.
#   ./scripts/signoff.sh "Founder"     stamp the current PRD (only after the founder said yes in chat)
#   ./scripts/signoff.sh --check       exit 0 if the current PRD is signed
set -euo pipefail
cd "$(dirname "$0")/.."

PRD="docs/PRD.md"
STAMP="docs/PRD.approved"

hash_prd() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$PRD" | cut -d' ' -f1
  else shasum -a 256 "$PRD" | cut -d' ' -f1; fi
}

if [[ "${1:-}" == "--check" ]]; then
  [[ -f "$STAMP" ]] || { echo "PRD not approved: ask the founder (/signoff)"; exit 1; }
  want=$(grep '^sha256:' "$STAMP" | cut -d' ' -f2)
  if [[ "$want" != "$(hash_prd)" ]]; then
    echo "PRD changed since signoff: founder must approve again"; exit 1
  fi
  echo "PRD signed: $(grep '^signed_by:' "$STAMP" | cut -d' ' -f2-)"
  exit 0
fi

name="${1:-}"
[[ -n "$name" ]] || { echo "Usage: ./scripts/signoff.sh \"Your Name\""; exit 1; }
grep -q 'Status: READY FOR SIGNOFF' "$PRD" || {
  echo "PRD is not marked 'Status: READY FOR SIGNOFF'. Finish /prd first."; exit 1; }

# Flip the status line, then stamp the hash of the final text.
sed -i.bak "s/Status: READY FOR SIGNOFF/Status: APPROVED by $name on $(date +%Y-%m-%d)/" "$PRD"
rm -f "$PRD.bak"
cat > "$STAMP" <<STAMP
signed_by: $name
date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
sha256: $(hash_prd)
STAMP
echo "Signed. The build is unlocked for this version of the PRD."
