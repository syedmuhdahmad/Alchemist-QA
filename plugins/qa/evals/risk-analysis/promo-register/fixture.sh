#!/usr/bin/env bash
# A reviewed work item about money: at least one risk should come out high.
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
  - The discount is rounded to the nearest cent, with half a cent rounded up, and shown on its own line.
---

As a shopper I want to enter a promo code in the cart so that I pay the discounted price.
ITEM
cat > qa/basis/12.review.md <<'ITEM'
---
work_item: "#12"
verdict: ready-with-assumptions
---

# Basis review: Apply a promo code in the cart

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | gap | Story | Does not say whether free shipping is judged before or after the discount. |

## Assumptions

- A1 (covers F1): free shipping is judged on the subtotal after the discount.

## Questions for the owner

1. F1: is free shipping judged before or after the discount?
ITEM
