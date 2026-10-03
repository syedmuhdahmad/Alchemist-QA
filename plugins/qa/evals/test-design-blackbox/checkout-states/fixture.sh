#!/usr/bin/env bash
# A high-risk feature with states, and a cases file that already holds three cases.
set -euo pipefail
mkdir -p qa/basis qa/cases
cat > qa/basis/20.md <<'ITEM'
---
id: "#20"
source: github-issues
type: story
title: Place an order
url: https://github.com/example/shop/issues/20
acceptance_criteria:
  - Choosing Place order sends the order to the server once. While it is being sent, the Place order button is disabled.
  - When the server accepts the order, the app shows "Order placed" with the order number and empties the cart.
  - When the server rejects the order or cannot be reached, the app shows "We could not place your order", keeps the cart, and enables Place order again.
---

As a shopper I want to place my order so that the shop sends me my items.
ITEM
cat > qa/basis/20.review.md <<'ITEM'
---
work_item: "#20"
verdict: ready
---

# Basis review: Place an order

## Findings

None.

## Assumptions

None.

## Questions for the owner

None.
ITEM
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #20: Place an order

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-20-1 | The order is sent twice, so the shopper is charged twice. | medium | high | high | State transitions, error guessing, exploratory session. |
| R-20-2 | A failed order is shown as placed or empties the cart, so the shopper loses the cart and believes the order went through. | medium | high | high | State transitions, failure paths. |
ITEM
cat > qa/cases/20.md <<'ITEM'
---
work_item: "#20"
---

# Test cases: Place an order

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-20-01 | equivalence-partitioning | R-20-2 | Criterion 2 | system | Cart with 1 item; server accepts with order number A-1001; choose Place order | Shows "Order placed" and A-1001; cart count 0 |
| TC-20-02 | equivalence-partitioning | R-20-2 | Criterion 3 | system | Cart with 1 item; server rejects; choose Place order | Shows "We could not place your order"; cart count 1 |
| TC-20-03 | equivalence-partitioning | R-20-2 | Criterion 3 | system | Cart with 1 item; server unreachable; choose Place order | Shows "We could not place your order"; cart count 1 |
ITEM
