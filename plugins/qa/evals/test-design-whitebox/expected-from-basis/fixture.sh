#!/usr/bin/env bash
# An uncovered branch where the code's answer differs from the basis: the case must expect the basis.
set -euo pipefail
mkdir -p qa/basis qa/cases qa/runs/coverage src
cat > qa/basis/31.md <<'ITEM'
---
id: "#31"
source: github-issues
type: story
title: Promo code discount
url: https://github.com/example/shop/issues/31
acceptance_criteria:
  - The code SAVE10, in any letter case, takes 10% off the subtotal.
  - Any other code takes nothing off.
---

As a shopper I want my promo code to work however I type it.
ITEM
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #31: Promo code discount

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-31-1 | The code gives the wrong discount, so the shopper pays the wrong amount. | medium | high | high | Decision table, partitions by letter case. |
ITEM
cat > qa/cases/31.md <<'ITEM'
---
work_item: "#31"
---

# Test cases: Promo code discount

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-31-01 | equivalence-partitioning | R-31-1 | Criterion 1 | component | discount(20.00, "SAVE10") | 2.00 |
| TC-31-02 | equivalence-partitioning | R-31-1 | Criterion 2 | component | discount(20.00, "HELLO") | 0.00 |
ITEM
cat > src/discount.ts <<'ITEM'
export function discount(subtotal: number, code: string): number {
  if (code === "SAVE10") return Math.round(subtotal * 10) / 100;
  if (code === "save10") return Math.round(subtotal * 5) / 100;
  return 0;
}
ITEM
cat > qa/runs/coverage/lcov.info <<'ITEM'
TN:
SF:src/discount.ts
FN:1,discount
FNDA:2,discount
DA:1,2
DA:2,2
DA:3,1
DA:4,1
BRDA:2,0,0,1
BRDA:2,0,1,1
BRDA:3,1,0,0
BRDA:3,1,1,1
LF:4
LH:4
BRF:4
BRH:3
end_of_record
ITEM
