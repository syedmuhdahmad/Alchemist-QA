#!/usr/bin/env bash
# A reviewed, risk-rated promo story with an ordered boundary (free shipping) and combined conditions (code x sale).
set -euo pipefail
mkdir -p qa/basis
cat > qa/basis/12.md <<'ITEM'
---
id: "#12"
source: github-issues
type: story
title: Apply a promo code in the cart
url: https://github.com/example/shop/issues/12
acceptance_criteria:
  - Entering SAVE10 in any letter case and choosing Apply gives 10% off the cart lines whose product is not on sale.
  - Cart lines for products on sale are never discounted.
  - Entering any other text, or nothing, shows "This code is not valid" and leaves every price unchanged.
  - Shipping is 4.99, and free when the subtotal after the discount is 50.00 or more.
---

As a shopper I want to enter a promo code in the cart so that I pay the discounted price.
ITEM
cat > qa/basis/12.review.md <<'ITEM'
---
work_item: "#12"
verdict: ready
---

# Basis review: Apply a promo code in the cart

## Findings

None.

## Assumptions

None.

## Questions for the owner

None.
ITEM
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #12: Apply a promo code in the cart

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-12-1 | Sale lines are discounted, or the wrong lines are, so the shop loses money or the shopper is overcharged. | medium | high | high | Decision table, state transitions, exploratory session. |
| R-12-2 | Shipping is charged or waived on the wrong side of 50.00, so the shopper pays the wrong total. | medium | medium | medium | Boundary values and failure paths. |
| R-12-3 | An unknown code changes prices or shows no message, so the shopper is confused. | low | medium | low | Equivalence partitions. |
ITEM
