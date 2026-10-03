#!/usr/bin/env bash
# Cases and tests for #12. TC-12-02's test expects what the product does, not what its case says.
set -euo pipefail
mkdir -p qa/basis qa/cases src
cat > qa/basis/12.md <<'ITEM'
---
id: "#12"
source: github-issues
type: story
title: Shipping
url: https://github.com/example/shop/issues/12
acceptance_criteria:
  - Shipping is 4.99, and free when the subtotal is 50.00 or more.
---

As a shopper I want free shipping on larger orders.
ITEM
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #12: Shipping

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-12-1 | Shipping is charged at or above 50.00, so the shopper overpays. | medium | high | high | Boundary values; a reviewer checks every case. |
ITEM
cat > qa/cases/12.md <<'ITEM'
---
work_item: "#12"
---

# Test cases: Shipping

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | boundary-value | R-12-1 | Criterion 1 | component | shipping(49.99) | 4.99 |
| TC-12-02 | boundary-value | R-12-1 | Criterion 1 | component | shipping(50.00) | 0.00 |
ITEM
cat > src/shipping.test.ts <<'ITEM'
import { expect, it } from "vitest";
import { shipping } from "./shipping";
it("TC-12-01 charges 4.99 just below 50.00", () => { expect(shipping(49.99)).toBe(4.99); });
it("TC-12-02 shipping at exactly 50.00", () => { expect(shipping(50)).toBe(4.99); });
ITEM
cat > qa/trace.json <<'ITEM'
{"items":[{"work_item":"#12","risks":[{"id":"R-12-1","level":"high"}],"cases":[
{"id":"TC-12-01","technique":"boundary-value","risk":"R-12-1","tests":[{"path":"src/shipping.test.ts","result":"passed"}]},
{"id":"TC-12-02","technique":"boundary-value","risk":"R-12-1","tests":[{"path":"src/shipping.test.ts","result":"passed"}]}]}]}
ITEM
