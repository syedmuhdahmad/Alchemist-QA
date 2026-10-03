#!/usr/bin/env bash
# A finished report and two defects for issue 12: one approved by a person, one not yet.
set -euo pipefail
mkdir -p qa/reports qa/defects
cat > qa/reports/12.md <<'ITEM'
---
work_item: "#12"
kind: completion
exit_criteria: not-met
---

# Test completion report: Apply a promo code

## Summary

Six cases ran. Two failed, and one of them covers a high risk, so the exit criteria are not met.

## Exit criteria

| Criterion | Met | Evidence |
| --- | --- | --- |
| Every case for R-12-1 passed | no | TC-12-01 failed |
| No open major defect | no | D-0001 |

## Risk remaining

- R-12-1: sale items are discounted, so the shop loses money.
ITEM
cat > qa/defects/D-0001.md <<'ITEM'
---
id: D-0001
title: SAVE10 discounts products on sale
work_item: "#12"
cases: [TC-12-01]
severity: major
status: approved
---

# D-0001: SAVE10 discounts products on sale

## Steps to reproduce

1. Add a sale product priced 20.00 to the cart.
2. Apply SAVE10.

## Expected

No discount, per Criterion 2 of #12.

## Actual

Discount 2.00.
ITEM
cat > qa/defects/D-0002.md <<'ITEM'
---
id: D-0002
title: Discount rounded down
work_item: "#12"
cases: [TC-12-04]
severity: minor
status: draft
---

# D-0002: Discount rounded down
ITEM
