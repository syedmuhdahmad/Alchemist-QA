---
name: test-design-blackbox
description: Use when test cases are needed for a work item from its specification, acceptance criteria, and risk register. Not for finding gaps from code coverage, and not for writing automated test code.
metadata:
  kind: method
  freedom: medium
  stage: design
---

# Black-box test design

Turn a reviewed and risk-rated work item into test cases. Each case names the technique that produced it and the risk it covers. Follows CTFL v4.0.1, section 4.2.

## Inputs

- `qa/basis/<file>.md` and `qa/basis/<file>.review.md`. `<file>` is the work item id with only letters, digits, and hyphens.
- The work item's section of `qa/risk-register.md`.
- `qa/cases/<file>.md`, if it exists.

## Output

`qa/cases/<file>.md`, in the shape of [the template](templates/cases.md). If the file exists, keep every row and add new ones after it.

## Procedure

1. Check the inputs. Stop and say what is missing, writing nothing, if:
   - the review's verdict is `not-ready`, or there is no review: the basis review comes first;
   - the register has no section for this work item: risk analysis comes first.
2. List the test conditions: one per rule, input, or state change in each acceptance criterion and each assumption from the review. Tie each condition to the risk it most affects.
3. Choose techniques by the risk's level. Each level adds to the one before:

   | Level | Techniques |
   | --- | --- |
   | low | [Equivalence partitioning](references/equivalence-partitioning.md), valid partitions first |
   | medium | Adds [boundary values](references/boundary-values.md), [decision tables](references/decision-tables.md) for combined conditions, and invalid partitions |
   | high | Adds [state transitions](references/state-transitions.md) where the feature has states, and error guessing |

   Use a technique only where it fits. A rule with no ordered range has no boundaries; a rule with one condition needs no decision table.
4. Write one row per case:
   - **Input and steps**: concrete values, never "a valid code".
   - **Expected result**: the exact value the basis requires, worked out by hand from the basis and the assumptions. Never read the product's code to find it, because the code is what is under test.
   - **Basis**: the criterion or assumption, such as "Criterion 2" or "A1".
   - **Level**: `component` when one function or component decides the result, `integration` when two parts must work together, `system` when only the running app shows it.
5. Number cases `TC-<item>-01`, `TC-<item>-02`, and so on. When the file exists, continue after its highest number. Never reuse a number, even for a dropped case.
6. A case that only a person can judge, such as how a message reads, goes in `not_automated` in the frontmatter with the reason.
7. Write the file, then reply with its path, the number of cases per technique, and any risk that has no case and why.

## Checklist

- [ ] The review and the risk section were present before any case was written.
- [ ] Every risk has at least one case, or the reply says why not.
- [ ] Techniques match each risk's level, and every row names one.
- [ ] Every expected result is a concrete value from the basis.
- [ ] Rows already in the file are unchanged, and ids continue after the highest.
