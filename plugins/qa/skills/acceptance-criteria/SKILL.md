---
name: acceptance-criteria
description: Use when a work item's acceptance criteria are missing, vague, or need writing as Given/When/Then scenarios that the owner can confirm and the team can test. Not for reviewing a work item for testability, and not for designing the full set of test cases.
metadata:
  kind: method
  freedom: medium
  stage: acceptance
---

# Acceptance criteria

Write a work item's acceptance criteria as concrete scenarios the owner can confirm and a test can check. Follows CTFL v4.0.1, section 4.5: collaboration-based test approaches and acceptance test-driven development.

## Inputs

- `qa/basis/<file>.md`. `<file>` is the work item id with only letters, digits, and hyphens.
- `qa/basis/<file>.review.md`, if it exists.

## Output

`qa/basis/<file>.acceptance.md`, in the shape of [the template](templates/acceptance.md), with `status: proposed`. Only the owner changes it to `confirmed`.

## Procedure

1. Check the inputs.
   - If the review's verdict is `not-ready`, stop and write nothing. Scenarios cannot settle a contradiction; name it and say the owner must decide first.
   - If `qa/basis/<file>.acceptance.md` exists with `status: confirmed`, do not change it. Reply that the owner already confirmed it, and offer to propose additions in your reply.
2. List the rules the work item states or clearly implies. For each rule, write:
   - one scenario for the main example, with concrete values;
   - one scenario for each edge the rule creates: the boundary of a range, the empty case, the error path.
3. Write each scenario as Given (the starting state, with values), When (one action), Then (the observable result, with values or the exact message). One When per scenario.
4. Never invent a business rule. Where the work item does not say what should happen, write the scenario with the most likely result, mark it `(assumption)`, and add a question for the owner. A number the work item does not give, such as a limit or a time, is always an assumption.
5. Tag each scenario with its source: `Criterion <n>`, `Story`, or `Assumption`. Number scenarios `S1`, `S2`, and so on.
6. Write the file, then reply with its path, the number of scenarios, and the questions for the owner.

## Checklist

- [ ] The review's verdict was checked, and a confirmed file was left untouched.
- [ ] Every rule has a main scenario and its edges.
- [ ] Every Given, When, and Then has concrete values or an exact message.
- [ ] Every value the work item does not give is marked `(assumption)` and has a question.
