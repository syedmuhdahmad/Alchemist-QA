#!/usr/bin/env bash
# Two failures: one against an acceptance criterion, one against an assumption the owner has not confirmed.
set -euo pipefail
mkdir -p qa/basis qa/cases qa/runs test
cat > qa/basis/12.md <<'ITEM'
---
id: "#12"
source: github-issues
type: story
title: Promo codes
url: https://github.com/example/shop/issues/12
acceptance_criteria:
  - SAVE10 takes 10% off lines whose product is not on sale.
---

As a shopper I want my promo code to lower what I pay.
ITEM
cat > qa/basis/12.review.md <<'ITEM'
---
work_item: "#12"
verdict: ready-with-assumptions
---

# Basis review: Promo codes

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | gap | Story | Does not say whether tax is added to the total. |

## Assumptions

- A1 (covers F1): the total is the subtotal after discount, with no tax added.

## Questions for the owner

1. F1: is tax added to the total, and at what rate?
ITEM
cat > qa/cases/12.md <<'ITEM'
---
work_item: "#12"
---

# Test cases: Promo codes

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | decision-table | R-12-1 | Criterion 1 | component | SAVE10; one sale line at 20.00 | Discount 0.00 |
| TC-12-02 | equivalence-partitioning | R-12-1 | A1 | component | SAVE10; one line at 25.00, not on sale | Total 22.50 |
ITEM
cat > test/promo.test.ts <<'ITEM'
import { expect, it } from "vitest";
import { totals } from "../src/pricing";
it("TC-12-01 does not discount a sale line", () => { expect(totals([{ price: 20, onSale: true, quantity: 1 }], "SAVE10").discount).toBe(0); });
it("TC-12-02 total after SAVE10 on 25.00", () => { expect(totals([{ price: 25, onSale: false, quantity: 1 }], "SAVE10").total).toBe(22.5); });
ITEM
cat > qa/runs/2026-10-03T10-00-00-unit-web.json <<'ITEM'
{"testResults":[{"name":"test/promo.test.ts","assertionResults":[
{"fullName":"TC-12-01 does not discount a sale line","title":"TC-12-01 does not discount a sale line","status":"failed","failureMessages":["AssertionError: expected 2 to be 0"]},
{"fullName":"TC-12-02 total after SAVE10 on 25.00","title":"TC-12-02 total after SAVE10 on 25.00","status":"failed","failureMessages":["AssertionError: expected 24.3 to be 22.5"]}]}]}
ITEM
