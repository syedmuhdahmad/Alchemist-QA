#!/usr/bin/env bash
# The benchmark React Native app's source with no test tools installed.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
app="$repo/evals/apps/mobile"
cp -r "$app/src" "$app/tsconfig.json" .
cat > package.json <<'ITEM'
{
  "name": "alchemyshop",
  "private": true,
  "dependencies": { "react": "19.2.3", "react-native": "0.87.1" }
}
ITEM
mkdir -p qa/cases
cat > qa/cases/60.md <<'ITEM'
---
work_item: "#60"
---

# Test cases: Cart

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-60-01 | boundary-value | R-60-1 | CART-2 | component | A cart line of product 1 at quantity 1; decrease its quantity once | The line's quantity is still 1 |
ITEM
