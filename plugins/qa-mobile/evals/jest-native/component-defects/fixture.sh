#!/usr/bin/env bash
# The benchmark React Native app (evals/apps/mobile), with its seeded defects, as the project under test.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
app="$repo/evals/apps/mobile"
[[ -d "$app/node_modules/jest" ]] || { echo "run npm ci in evals/apps/mobile first" >&2; exit 1; }
cp -r "$app/src" "$app/App.tsx" "$app/index.js" "$app/app.json" "$app/package.json" "$app/tsconfig.json" "$app/babel.config.js" "$app/jest.config.js" .
# node_modules is large and only read by Jest (its cache goes to TMPDIR), so link it.
ln -s "$app/node_modules" node_modules
mkdir -p qa/cases
cat > qa/cases/60.md <<'ITEM'
---
work_item: "#60"
---

# Test cases: Cart, pricing, and checkout rules (evals/apps/REQUIREMENTS.md)

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-60-01 | boundary-value | R-60-1 | CART-2 | component | A cart line of product 1 at quantity 1; decrease its quantity once | The line's quantity is still 1 |
| TC-60-02 | equivalence-partitioning | R-60-2 | PRICE-3 | component | One line: a 20.00 product not on sale, quantity 1; promo code save10 | Discount 2.00 |
| TC-60-03 | decision-table | R-60-2 | PRICE-5 | component | One line: a 100.00 product not on sale, quantity 1; promo code SAVE10 | Tax 7.20 (8% of 90.00) |
| TC-60-04 | equivalence-partitioning | R-60-3 | CHK-3 | component | Postcode AB123 | Not a valid postcode |
| TC-60-05 | boundary-value | R-60-2 | PRICE-4 | component | One line: a 50.00 product not on sale, quantity 1; no promo code | Shipping 0.00 |
ITEM
