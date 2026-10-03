#!/usr/bin/env bash
# The benchmark web app (evals/apps/web), with its seeded defects, as the project under test.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
app="$repo/evals/apps/web"
[[ -d "$app/node_modules/vitest" ]] || { echo "run npm ci in evals/apps/web first" >&2; exit 1; }
cp -r "$app/src" "$app/package.json" "$app/tsconfig.json" "$app/vite.config.ts" "$app/index.html" .
cp -r "$app/node_modules" .
mkdir -p qa/cases
cat > qa/cases/50.md <<'ITEM'
---
work_item: "#50"
---

# Test cases: Cart and pricing rules (evals/apps/REQUIREMENTS.md)

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-50-01 | boundary-value | R-50-1 | CART-2 | component | A cart line of product 1 at quantity 10; add product 1 again | The line's quantity is still 10 |
| TC-50-02 | boundary-value | R-50-2 | PRICE-4 | component | One line: a 50.00 product not on sale, quantity 1; no promo code | Shipping 0.00 |
| TC-50-03 | decision-table | R-50-2 | PRICE-2 | component | One line: a 20.00 product on sale, quantity 1; promo code SAVE10 | Discount 0.00 |
| TC-50-04 | equivalence-partitioning | R-50-2 | PRICE-6 | component | One line: a 10.05 product not on sale, quantity 1; promo code SAVE10 | Discount 1.01 (10% of 10.05 is 1.005, rounded half up) |
| TC-50-05 | equivalence-partitioning | R-50-3 | CHK-2 | component | Email address ana@shop | Not a valid email address |
| TC-50-06 | state-transition | R-50-1 | CART-3 | component | Add product 1 three times (one line, quantity 3); remove that line | Cart count 0 |
| TC-50-07 | equivalence-partitioning | R-50-2 | PRICE-1 | component | One line: a 4.50 product, quantity 2 | Line total 9.00 |
ITEM
