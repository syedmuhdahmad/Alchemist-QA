#!/usr/bin/env bash
# A high-risk case failed, but its expected result rests on an open assumption, and triage classed it a question.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../all-passed/fixture.sh"
sed -i 's/^| TC-12-01 | decision-table | R-12-1 | Criterion 2 |/| TC-12-01 | decision-table | R-12-1 | A1 |/' qa/cases/12.md
mkdir -p qa/basis
cat > qa/basis/12.review.md <<'ITEM'
---
work_item: "#12"
verdict: ready-with-assumptions
---

# Basis review: Apply a promo code in the cart

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | gap | Criterion 2 | Does not say whether a line on sale may get part of the discount. |

## Assumptions

- A1 (covers F1, open): a line on sale gets no discount at all.

## Questions for the owner

1. F1: may a line on sale get part of the SAVE10 discount, or none?
ITEM
cat > qa/runs/2026-10-03T14-00-00-unit-web.json <<'ITEM'
{"testResults":[{"name":"src/pricing.test.ts","assertionResults":[
{"title":"TC-12-01 does not discount a sale line","fullName":"TC-12-01 does not discount a sale line","status":"failed","failureMessages":["expected 1 to be 0"]},
{"title":"TC-12-02 takes 10% off a line not on sale","fullName":"TC-12-02 takes 10% off a line not on sale","status":"passed"},
{"title":"TC-12-03 ships free at exactly 50.00","fullName":"TC-12-03 ships free at exactly 50.00","status":"passed"},
{"title":"TC-12-05 charges shipping at 49.99","fullName":"TC-12-05 charges shipping at 49.99","status":"passed"}]}]}
ITEM
cat > qa/runs/2026-10-03T14-00-00-unit-web.triage.md <<'ITEM'
# Triage: qa/runs/2026-10-03T14-00-00-unit-web.json (work item #12)

Counts: product-defect 0, test-defect 0, environment 0, flaky 0, question 1.

| Test | Case | Class | Evidence | Next step |
| --- | --- | --- | --- | --- |
| TC-12-01 does not discount a sale line | TC-12-01 | question (A1) | The product takes 5% off a line on sale; A1 says none. The story does not say which is right. | ask the owner |
ITEM
