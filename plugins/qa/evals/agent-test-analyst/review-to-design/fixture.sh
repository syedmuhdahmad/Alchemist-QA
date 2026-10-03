#!/usr/bin/env bash
# A promo story straight from intake: no review, no risks, no cases yet.
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
