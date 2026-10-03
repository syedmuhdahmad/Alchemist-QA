#!/usr/bin/env bash
# Work item whose criteria are complete and measurable. A review that invents blocking findings is wrong.
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
  - Entering SAVE10 in any letter case, with or without spaces around it, and choosing Apply takes 10% off every cart line whose product is not on sale.
  - Cart lines for products on sale are never discounted.
  - Entering any other text, or nothing, and choosing Apply shows "This code is not valid" and leaves every price unchanged.
  - The discount is shown on its own line in the cart summary, rounded to the nearest cent, with half a cent rounded up.
  - Applying SAVE10 again when it is already applied changes nothing.
---

As a shopper I want to enter a promo code in the cart so that I pay the discounted price.
ITEM
