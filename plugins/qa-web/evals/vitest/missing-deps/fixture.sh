#!/usr/bin/env bash
# The benchmark web app's source with no test tools installed.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
app="$repo/evals/apps/web"
cp -r "$app/src" "$app/tsconfig.json" .
cat > package.json <<'ITEM'
{
  "name": "shop",
  "private": true,
  "type": "module",
  "dependencies": { "react": "^19.2.0", "react-dom": "^19.2.0" }
}
ITEM
mkdir -p qa/cases
cat > qa/cases/50.md <<'ITEM'
---
work_item: "#50"
---

# Test cases: Cart

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-50-01 | boundary-value | R-50-1 | CART-2 | component | A cart line of product 1 at quantity 10; add product 1 again | The line's quantity is still 10 |
ITEM
