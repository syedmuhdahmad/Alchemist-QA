---
name: failure-triage
description: Use when tests have failed and each failure must be classed as a product defect, a test defect, an environment problem, a flaky test, or a question for the owner before anyone acts on it, including when asked to make failing tests pass. Not for writing the defect report itself, and not for designing tests.
metadata:
  kind: method
  freedom: high
---

# Failure triage

Decide why each test failed, so product defects are reported, test defects are fixed, and nothing is hidden. Follows CTFL v4.0.1, section 1.2.3: an error causes a defect, a defect may cause a failure, and not every failure comes from a defect in the product.

## Goals

- Every failure gets exactly one class, with the evidence for it.
- A product defect is never "fixed" by changing the test to agree with the product.
- A test defect is fixed in the test, and the test is shown to pass for the right reason.

## Classes

| Class | It is this when |
| --- | --- |
| `product-defect` | The test's expectation matches the basis, and the product does something else. |
| `test-defect` | The test expects something the basis does not say, or it is wrong in itself: a wrong selector, wrong test data, a missing wait, a typo. |
| `environment` | The failure comes from outside the product and the test: a server not running, a port in use, a missing dependency, no network, a full disk. |
| `flaky` | The same test, on the same code, both passed and failed. |
| `question` | The test's expectation comes from an assumption that is still `open` in the review (the case's Basis is `A<n>`), and the product does something else. Nobody knows yet who is right. |

## Boundaries

- The basis decides who is right, never the code. Read `qa/basis/<file>.md`, its review's assumptions, and the case in `qa/cases/<file>.md` before judging a test's expectation.
- Never change an expected value, delete an assertion, or skip a test to make a run pass, unless the basis proves the test wrong. If someone asks to make the tests pass and the product is at fault, say so and leave the test as it is.
- Do not change product code. The department reports defects; developers fix them.

## Procedure

1. Read the run's results, and list each failed test with its case id, message, and stack.
2. For each failure:
   - environment signs (connection refused, timeout before any assertion, module not found) point to `environment`; confirm by checking the service or dependency;
   - otherwise find where the case's expected value comes from. From an acceptance criterion or a confirmed scenario: equal to the test's expectation means `product-defect`, different means `test-defect`. From an assumption whose status in the review is `open`, or that has no status: `question`, because the product may be right and the assumption wrong. From an assumption the owner `confirmed` or `corrected`: treat it as a criterion;
   - when the code under test has not changed since an earlier run where the same test passed, or a single rerun passes, call it `flaky` and record both runs.
3. Rerun a failure once at most to check for flakiness, and only when the class is not already clear.
4. Fix each `test-defect` in the test, citing the basis line that proves it wrong, and rerun that test.
5. Write `qa/runs/<run>.triage.md`, where `<run>` is the result file's name without its extension: the triage of `qa/runs/2026-10-03T10-00-00-unit-web.json` is `qa/runs/2026-10-03T10-00-00-unit-web.triage.md`. It has a table with one row per failure: test, case, class, evidence, next step (`defect report`, `test fixed`, `fix environment`, `quarantine and investigate`, or `ask the owner`). A `question` names the assumption and what the product does instead, so the owner can choose.
6. Reply with the counts per class, and the failures that need a defect report.
