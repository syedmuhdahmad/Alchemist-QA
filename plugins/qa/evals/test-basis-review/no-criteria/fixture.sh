#!/usr/bin/env bash
# Work item with no acceptance criteria at all.
set -euo pipefail
mkdir -p qa/basis
cat > qa/basis/21.md <<'ITEM'
---
id: "#21"
source: github-issues
type: story
title: Save products to a wishlist
url: https://github.com/example/shop/issues/21
acceptance_criteria: []
---

As a shopper I want to save products to a wishlist so that I can buy them later.
ITEM
