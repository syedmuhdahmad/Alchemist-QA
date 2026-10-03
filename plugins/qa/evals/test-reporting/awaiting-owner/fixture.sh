#!/usr/bin/env bash
# Every test passed, but two of them rest on an assumption the owner has not confirmed.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../all-passed/fixture.sh"
sed -i 's/^| TC-12-03 | boundary-value | R-12-2 | Criterion 4 |/| TC-12-03 | boundary-value | R-12-2 | A1 |/; s/^| TC-12-05 | boundary-value | R-12-2 | Criterion 4 |/| TC-12-05 | boundary-value | R-12-2 | A1 |/' qa/cases/12.md
mkdir -p qa/basis
cat > qa/basis/12.review.md <<'ITEM'
---
work_item: "#12"
verdict: ready-with-assumptions
---

# Basis review: Apply a promo code in the cart

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | gap | Criterion 4 | Does not say whether free shipping is judged before or after the discount. |

## Assumptions

- A1 (covers F1, open): free shipping is judged on the subtotal after the discount.

## Questions for the owner

1. F1: is free shipping judged on the subtotal before or after the discount?
ITEM
