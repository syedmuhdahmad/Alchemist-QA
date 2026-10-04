#!/usr/bin/env bash
# A project whose trace is out of date: a run and a defect arrived after the last update.
set -euo pipefail
mkdir -p qa/cases qa/runs qa/defects src
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #12: Apply a promo code in the cart

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-12-1 | Sale lines are discounted, so the shop loses money. | medium | high | high | Decision table. |
| R-12-2 | Shipping is charged at exactly 50.00, so the shopper overpays. | medium | medium | medium | Boundary values. |
| R-12-3 | An unknown code shows no message, so the shopper is confused. | low | medium | low | Equivalence partitions. |
ITEM
cat > qa/cases/12.md <<'ITEM'
---
work_item: "#12"
not_automated:
  TC-12-04: Needs a person to judge whether the message is clear.
---

# Test cases: Apply a promo code in the cart

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | decision-table | R-12-1 | Criterion 2 | component | SAVE10; one sale line at 20.00 | Line stays 20.00 |
| TC-12-02 | decision-table | R-12-1 | Criterion 1 | component | SAVE10; one line at 20.00, not on sale | Discount 2.00 |
| TC-12-03 | boundary-value | R-12-2 | Criterion 4 | component | Subtotal after discount 50.00 | Shipping 0.00 |
| TC-12-04 | checklist | R-12-3 | Criterion 3 | system | Enter HELLO | Message is clear |
| TC-12-05 | boundary-value | R-12-2 | Criterion 4 | component | Subtotal after discount 49.99 | Shipping 4.99 |
ITEM
cat > src/pricing.test.ts <<'ITEM'
import { it } from 'vitest';
it('TC-12-01 does not discount a sale line', () => {});
it('TC-12-02 takes 10% off a line not on sale', () => {});
it('TC-12-03 ships free at exactly 50.00', () => {});
ITEM
cat > qa/runs/2026-10-03T10-00-00-unit-web.json <<'ITEM'
{"testResults":[{"name":"src/pricing.test.ts","assertionResults":[
{"title":"TC-12-01 does not discount a sale line","fullName":"TC-12-01 does not discount a sale line","status":"failed"},
{"title":"TC-12-02 takes 10% off a line not on sale","fullName":"TC-12-02 takes 10% off a line not on sale","status":"passed"},
{"title":"TC-12-03 ships free at exactly 50.00","fullName":"TC-12-03 ships free at exactly 50.00","status":"failed"}]}]}
ITEM
cat > qa/defects/D-0001.md <<'ITEM'
---
id: D-0001
title: SAVE10 discounts products on sale
work_item: "#12"
cases: [TC-12-01]
severity: major
status: draft
---

# D-0001: SAVE10 discounts products on sale
ITEM
echo '{"items":[]}' > qa/trace.json
# All passed for real: tests that assert, a product that meets them, and no unexplained earlier failure.
rm qa/runs/2026-10-03T10-00-00-unit-web.json
cat > src/pricing.ts <<'ITEM'
export type Line = { price: number; onSale: boolean; quantity: number };
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function totals(lines: Line[], code: string) {
  const subtotal = round(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const eligible = lines.filter((l) => !l.onSale).reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = code.trim().toUpperCase() === 'SAVE10' ? round(eligible * 0.1) : 0;
  const after = round(subtotal - discount);
  return { subtotal, discount, shipping: after >= 50 ? 0 : 4.99 };
}
ITEM
cat > src/pricing.test.ts <<'ITEM'
import { expect, it } from 'vitest';
import { totals } from './pricing';
it('TC-12-01 does not discount a sale line', () => { expect(totals([{ price: 20, onSale: true, quantity: 1 }], 'SAVE10').discount).toBe(0); });
it('TC-12-02 takes 10% off a line not on sale', () => { expect(totals([{ price: 20, onSale: false, quantity: 1 }], 'SAVE10').discount).toBe(2); });
it('TC-12-03 ships free at exactly 50.00', () => { expect(totals([{ price: 50, onSale: false, quantity: 1 }], '').shipping).toBe(0); });
it('TC-12-05 charges shipping at 49.99', () => { expect(totals([{ price: 49.99, onSale: false, quantity: 1 }], '').shipping).toBe(4.99); });
ITEM
cat > qa/runs/2026-10-03T12-00-00-unit-web.json <<'ITEM'
{"testResults":[{"name":"src/pricing.test.ts","assertionResults":[
{"title":"TC-12-01 does not discount a sale line","fullName":"TC-12-01 does not discount a sale line","status":"passed"},
{"title":"TC-12-02 takes 10% off a line not on sale","fullName":"TC-12-02 takes 10% off a line not on sale","status":"passed"},
{"title":"TC-12-03 ships free at exactly 50.00","fullName":"TC-12-03 ships free at exactly 50.00","status":"passed"},
{"title":"TC-12-05 charges shipping at 49.99","fullName":"TC-12-05 charges shipping at 49.99","status":"passed"}]}]}
ITEM
rm qa/defects/D-0001.md
mkdir -p qa/plans
cat > qa/plans/12.md <<'ITEM'
---
work_item: "#12"
estimate_hours: 4
---

# Test plan: Apply a promo code in the cart

## Exit criteria

- Every case for R-12-1 (high) has passed.
- No open defect of severity critical or major.
- Every case has a test, or a reason it is not automated.
- No result rests on an assumption the owner has not confirmed.
ITEM
