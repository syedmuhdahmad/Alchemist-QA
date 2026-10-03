#!/usr/bin/env bash
# A story with clear criteria, including a range.
set -euo pipefail
mkdir -p qa/basis
cat > qa/basis/41.md <<'ITEM'
---
id: "#41"
source: github-issues
type: story
title: Choose a quantity
url: https://github.com/example/shop/issues/41
acceptance_criteria:
  - The quantity of a cart line is a whole number from 1 to 10.
  - The + button is disabled at 10, and the - button is disabled at 1.
  - Typing a number above 10 sets the quantity to 10.
---

As a shopper I want to choose how many of an item I buy.
ITEM
