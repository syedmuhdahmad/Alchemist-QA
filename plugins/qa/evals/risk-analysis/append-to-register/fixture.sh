#!/usr/bin/env bash
# The register already has #12. Adding #21 must keep #12 exactly as it was.
set -euo pipefail
mkdir -p qa/basis
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #12: Apply a promo code in the cart

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-12-1 | A product on sale is discounted again, so the shop loses money on every such order. | medium | high | high | Decision table over code and sale status; every case reviewed. |
| R-12-2 | The discount is rounded the wrong way, so totals are off by a cent. | medium | low | low | Equivalence partitions on amounts; happy path only. |
ITEM
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
cat > qa/basis/21.review.md <<'ITEM'
---
work_item: "#21"
verdict: ready-with-assumptions
---

# Basis review: Save products to a wishlist

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | missing-criteria | Story | The work item has no acceptance criteria. |

## Assumptions

- A1 (covers F1): only a signed-in shopper has a wishlist, and it is kept across sessions.
- A2 (covers F1): saving a product twice keeps one entry.
- A3 (covers F1): a wishlist holds at most 100 products; saving one more shows a message and saves nothing.

## Questions for the owner

1. A1: must a shopper be signed in, and is the wishlist kept across sessions?
2. A2: does saving a product twice keep one entry?
3. A3: is there a limit on wishlist size, and what happens at it?
ITEM
