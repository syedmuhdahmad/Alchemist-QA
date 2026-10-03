#!/usr/bin/env bash
# A work item reviewed before assumptions had a status, whose owner has now answered two of the three questions.
set -euo pipefail
mkdir -p qa/basis qa/cases
cat > qa/basis/12.md <<'ITEM'
---
id: "#12"
source: github-issues
type: story
title: Apply a promo code at checkout
url: https://github.com/example/shop/issues/12
acceptance_criteria:
  - SAVE10 takes 10% off every item that is not already on sale.
  - An unknown code shows "This code is not valid" and changes nothing.
---

As a shopper I want to enter a promo code so that I pay less.
ITEM
cat > qa/basis/12.review.md <<'ITEM'
---
work_item: "#12"
verdict: ready-with-assumptions
---

# Basis review: Apply a promo code at checkout

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | gap | Criterion 1 | Does not say whether spaces around a code are ignored. |
| F2 | ambiguity | Criterion 2 | "Changes nothing" does not say whether a code that was already applied stays applied. |
| F3 | gap | Story | Does not say how many codes one order can carry. |

## Assumptions

- A1 (covers F1): spaces around a code are ignored, so " SAVE10 " works.
- A2 (covers F2): an unknown code leaves a code that was already applied in place.
- A3 (covers F3): an order carries one code at most.

## Questions for the owner

1. F1: are spaces around a code ignored?
2. F2: should an unknown code remove a code that was already applied?
3. F3: how many codes can one order carry?
ITEM
cat > qa/cases/12.md <<'ITEM'
---
work_item: "#12"
---

# Test cases: Apply a promo code at checkout

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | decision-table | R-12-1 | Criterion 1 | component | SAVE10, one line at 20.00 not on sale | Discount 2.00 |
| TC-12-02 | equivalence-partitioning | R-12-1 | A1 | component | Code " SAVE10 " on one line at 20.00 | Discount 2.00 |
| TC-12-03 | state-transition | R-12-2 | A2 | component | Apply SAVE10, then enter HELLO | Message "This code is not valid"; SAVE10 stays applied |
| TC-12-04 | boundary-value | R-12-2 | A3 | component | Apply SAVE10, then SAVE20 | SAVE20 is refused |
ITEM
