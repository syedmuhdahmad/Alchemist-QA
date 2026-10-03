#!/usr/bin/env bash
# The benchmark web app (evals/apps/web), with its seeded defects, as the project under test.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
app="$repo/evals/apps/web"
[[ -d "$app/node_modules/vitest" ]] || { echo "run npm ci in evals/apps/web first" >&2; exit 1; }
cp -r "$app/src" "$app/package.json" "$app/tsconfig.json" "$app/vite.config.ts" "$app/index.html" .
cp -r "$app/node_modules" .
mkdir -p qa/cases
cat > qa/cases/51.md <<'ITEM'
---
work_item: "#51"
---

# Test cases: Quantity input (evals/apps/REQUIREMENTS.md)

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-51-01 | checklist | R-51-1 | A11Y-1 | component | Render QuantityInput for product 1 with value 3 | A spin button with the accessible name "Quantity" is present |
| TC-51-02 | equivalence-partitioning | R-51-1 | CART-2 | component | Render QuantityInput for product 1 with value 3 | The input shows 3 |
ITEM
