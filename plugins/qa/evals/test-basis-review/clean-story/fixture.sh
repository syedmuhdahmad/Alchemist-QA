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
  - Entering SAVE10 in any letter case, with or without spaces around it, and choosing Apply gives a discount on the cart lines whose product is not on sale.
  - Cart lines for products on sale are never discounted.
  - Entering any other text, or nothing, and choosing Apply shows "This code is not valid" and leaves every price unchanged.
  - The discount is 10% of the total of the lines it applies to, rounded once to the nearest cent, with half a cent rounded up, and shown on its own line in the cart summary.
  - Applying SAVE10 again when it is already applied changes nothing.
  - When no line qualifies, because the cart is empty or every line is on sale, SAVE10 is still accepted and the discount line shows 0.00.
  - While SAVE10 is applied, the discount is worked out again every time a line is added, removed, or changes quantity.
---

As a shopper I want to enter a promo code in the cart so that I pay the discounted price.
ITEM
