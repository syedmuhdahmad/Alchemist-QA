#!/usr/bin/env bash
# A work item, its cases, a test file, and the results of a run.
set -euo pipefail
mkdir -p qa/basis qa/cases qa/runs test
cat > qa/basis/12.md <<'ITEM'
---
id: "#12"
source: github-issues
type: story
title: Shipping and promo codes
url: https://github.com/example/shop/issues/12
acceptance_criteria:
  - Shipping is 4.99, and free when the subtotal after discount is 50.00 or more.
  - SAVE10 takes 10% off lines whose product is not on sale.
---

As a shopper I want to know what I pay.
ITEM
cat > qa/cases/12.md <<'ITEM'
---
work_item: "#12"
---

# Test cases: Shipping and promo codes

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | boundary-value | R-12-1 | Criterion 1 | component | Subtotal 50.00 | Shipping 0.00 |
| TC-12-02 | boundary-value | R-12-1 | Criterion 1 | component | Subtotal 49.99 | Shipping 4.99 |
| TC-12-03 | decision-table | R-12-2 | Criterion 2 | integration | SAVE10 on a 20.00 line not on sale, priced by the API | Discount 2.00 |
ITEM
cat > test/pricing.test.ts <<'ITEM'
import { expect, it } from "vitest";
import { shipping } from "../src/pricing";
import { priceCart } from "../src/api";
it("TC-12-01 ships free at exactly 50.00", () => { expect(shipping(50)).toBe(0); });
it("TC-12-02 charges shipping at 49.99", () => { expect(shipping(49.99)).toBe(5.99); });
it("TC-12-03 SAVE10 takes 2.00 off a 20.00 line", async () => { expect((await priceCart([{ price: 20, onSale: false }], "SAVE10")).discount).toBe(2); });
ITEM
cat > qa/runs/2026-10-03T10-00-00-unit-web.json <<'ITEM'
{"testResults":[{"name":"test/pricing.test.ts","assertionResults":[
{"fullName":"TC-12-01 ships free at exactly 50.00","title":"TC-12-01 ships free at exactly 50.00","status":"failed","failureMessages":["AssertionError: expected 4.99 to be 0\n    at test/pricing.test.ts:4:52"]},
{"fullName":"TC-12-02 charges shipping at 49.99","title":"TC-12-02 charges shipping at 49.99","status":"failed","failureMessages":["AssertionError: expected 4.99 to be 5.99\n    at test/pricing.test.ts:5:55"]},
{"fullName":"TC-12-03 SAVE10 takes 2.00 off a 20.00 line","title":"TC-12-03 SAVE10 takes 2.00 off a 20.00 line","status":"failed","failureMessages":["TypeError: fetch failed\n  [cause]: Error: connect ECONNREFUSED 127.0.0.1:4000"]}]}]}
ITEM
cat > qa/runs/2026-10-03T10-00-00-unit-web.triage.md <<'ITEM'
# Triage: 2026-10-03T10-00-00-unit-web

| Test | Case | Class | Evidence | Next step |
| --- | --- | --- | --- | --- |
| test/pricing.test.ts "TC-12-01 ships free at exactly 50.00" | TC-12-01 | product-defect | shipping(50) returned 4.99; Criterion 1 says free from 50.00 | defect report |
| test/pricing.test.ts "TC-12-02 charges shipping at 49.99" | TC-12-02 | test-defect | Test expected 5.99; Criterion 1 says 4.99. Test fixed. | test fixed |
| test/pricing.test.ts "TC-12-03 SAVE10 takes 2.00 off a 20.00 line" | TC-12-03 | environment | ECONNREFUSED 127.0.0.1:4000: the API was not running | fix environment |
ITEM
mkdir -p qa/defects
cat > qa/defects/D-0001.md <<'ITEM'
---
id: D-0001
title: Shipping is charged on a subtotal of exactly 50.00
work_item: "#12"
cases: [TC-12-01]
severity: major
status: draft
---

# D-0001: Shipping is charged on a subtotal of exactly 50.00

## Steps to reproduce

1. Put items worth exactly 50.00 in the cart.

## Expected

Shipping 0.00, per Criterion 1 of #12.

## Actual

Shipping 4.99.

## Evidence

- Test: `test/pricing.test.ts`, "TC-12-01 ships free at exactly 50.00"
- Run: `qa/runs/2026-10-02T10-00-00-unit-web.json`

## Environment

Node 22, commit abc123
ITEM
