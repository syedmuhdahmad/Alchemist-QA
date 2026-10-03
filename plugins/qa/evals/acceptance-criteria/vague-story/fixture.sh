#!/usr/bin/env bash
# A story with no criteria and an unstated limit.
set -euo pipefail
mkdir -p qa/basis
cat > qa/basis/40.md <<'ITEM'
---
id: "#40"
source: github-issues
type: story
title: Save items for later
url: https://github.com/example/shop/issues/40
acceptance_criteria: []
---

As a shopper I want to move an item from my cart to a "Saved for later" list, and move it back, so that I can buy it another time. Saved items should not count towards the cart total.
ITEM
