#!/usr/bin/env bash
# The same code with every branch outcome covered: nothing to add.
set -euo pipefail
mkdir -p qa/basis qa/cases qa/runs/coverage src
cat > qa/basis/30.md <<'ITEM'
---
id: "#30"
source: github-issues
type: story
title: Shipping cost
url: https://github.com/example/shop/issues/30
acceptance_criteria:
  - Shipping is 4.99.
  - Shipping is free when the subtotal is 50.00 or more.
  - An empty cart (subtotal 0.00) has no shipping.
---

As a shopper I want to know the shipping cost before I pay.
ITEM
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #30: Shipping cost

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-30-1 | Shipping is charged when it should be free, so the shopper overpays. | medium | medium | medium | Boundary values. |
ITEM
cat > qa/cases/30.md <<'ITEM'
---
work_item: "#30"
---

# Test cases: Shipping cost

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-30-01 | equivalence-partitioning | R-30-1 | Criterion 1 | component | shipping(20.00, "US") | 4.99 |
ITEM
cat > src/shipping.ts <<'ITEM'
export function shipping(subtotal: number, country: string): number {
  if (subtotal <= 0) return 0;
  if (country !== "US") return 14.99;
  if (subtotal >= 50) return 0;
  return 4.99;
}
ITEM
cat > qa/runs/coverage/lcov.info <<'ITEM'
TN:
SF:src/shipping.ts
FN:1,shipping
FNDA:4,shipping
DA:1,4
DA:2,4
DA:3,3
DA:4,2
DA:5,1
BRDA:2,0,0,1
BRDA:2,0,1,3
BRDA:3,1,0,1
BRDA:3,1,1,2
BRDA:4,2,0,1
BRDA:4,2,1,1
LF:5
LH:5
BRF:6
BRH:6
end_of_record
ITEM
