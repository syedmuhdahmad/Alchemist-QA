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
cat > qa/cases/61.md <<'ITEM'
---
work_item: "#61"
---

# Test cases: Product row (evals/apps/REQUIREMENTS.md)

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-61-01 | checklist | R-61-1 | A11Y-1 | component | Render ProductRow for product 1, "Elixir", 12.50, not on sale | The add-to-cart button's accessible name says it adds Elixir to the cart, such as "Add Elixir to cart" |
| TC-61-02 | equivalence-partitioning | R-61-1 | CAT-1 | component | Render ProductRow for product 1, "Elixir", 12.50, not on sale | Shows "Elixir" and "12.50" |
ITEM
