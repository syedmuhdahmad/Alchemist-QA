---
name: defect-reporting
description: Use when a failure has been triaged as a product defect and needs a defect report with steps, expected and actual results, severity, and evidence, or when a new failure may duplicate a defect already reported. Not for deciding why a test failed, and not for posting to a tracker.
metadata:
  kind: method
  freedom: medium
  stage: report-defects
---

# Defect reporting

Write one clear, reproducible report per product defect, ready for a person to review before it is filed. Follows CTFL v4.0.1, section 5.5.

## Inputs

- The triage file in `qa/runs/` that classed the failure as `product-defect`.
- The failing test, its case in `qa/cases/<file>.md`, and the basis `qa/basis/<file>.md`.
- Every existing report in `qa/defects/`.

## Output

`qa/defects/D-<nnnn>.md` in the shape of [the template](templates/defect.md), with `status: draft`. Filing it in the tracker is a separate step that a person approves.

## Procedure

1. Take only the failures triaged as `product-defect`. Test defects, environment problems, and flaky tests get no defect report.
2. Check for a duplicate before writing. A failure duplicates an existing report when it names the same case, or shows the same wrong behaviour in the same feature. For a duplicate, add the new evidence to the existing report's `## Evidence` and its case to `cases`, and write no new file.
3. Number a new report one above the highest `D-<nnnn>` in `qa/defects/`, with four digits. Never reuse a number.
4. Fill in the template:
   - **Title:** the wrong behaviour and where, in one line, such as "Shipping is charged on a subtotal of exactly 50.00".
   - **Steps to reproduce:** numbered, from a known start, with the exact data.
   - **Expected:** what the basis requires, quoting or citing the criterion or assumption.
   - **Actual:** what the product did, with exact values or messages.
   - **Evidence:** the test, the run file, and the failure message.
   - **Severity** by effect, using the scale below. Priority is the owner's call, so leave it out.

   | Severity | When |
   | --- | --- |
   | `critical` | Blocks a main flow, loses data, breaks security, or takes the wrong amount of money in a way the shopper cannot see or undo. |
   | `major` | A requirement fails and there is no reasonable workaround, or the wrong amount is visible to the shopper. |
   | `minor` | A requirement fails but there is a reasonable workaround. |
   | `trivial` | Cosmetic, with no effect on what the user can do. |

5. Write each report, then reply with the new and updated report ids, their titles and severities.

## Checklist

- [ ] Only product defects were reported.
- [ ] Existing reports were checked for duplicates first.
- [ ] Every report reproduces from its steps alone, and Expected cites the basis.
- [ ] Ids continue after the highest existing one, and `status` is `draft`.
