---
name: risk-analysis
description: Use when the product risks of a work item have to be identified and rated to decide where and how deeply to test, or when someone asks what could go wrong with a feature before testing it. Not for project risks such as schedule or staffing, and not for designing test cases.
metadata:
  kind: method
  freedom: medium
  stage: risk
---

# Product risk analysis

Find what could go wrong in one work item, rate each risk, and set how deeply each one is tested. Follows CTFL v4.0.1, section 5.2.

## Inputs

- `qa/basis/<id>.md`: the work item.
- `qa/basis/<id>.review.md`: its basis review.
- `qa/risk-register.md`, if it exists.

## Output

One section for the work item in `qa/risk-register.md`, filled in from [the template](templates/risk-section.md). If the file does not exist, create it with the heading `# Risk register`. Every other section stays exactly as it is.

## Procedure

1. Read the review's verdict first.
   - `not-ready`: stop. Write nothing, and reply that risk analysis waits until the owner settles each contradiction, naming them.
   - No review file: stop, and reply that the basis review comes first.
2. For each acceptance criterion and each assumption in the review, ask what failure a shopper, user, or the business would notice, and what it would cost them. Consider the quality characteristics the work item touches: correct results, security, data kept and not lost, ease of use, speed. Risks to the project itself, such as schedule or people, do not go in the register.
3. Write each risk as one sentence: the failure, then its consequence.
4. Rate likelihood and impact as `low`, `medium`, or `high`.
   - Likelihood rises with complex rules, many combinations of inputs, new code, and dependence on another system.
   - Impact is high when money, security, personal data, or legal duties are at stake, and low when the user has an easy workaround.
5. Work out the level. Score low as 1, medium as 2, high as 3, and multiply likelihood by impact: 1 or 2 is `low`, 3 or 4 is `medium`, 6 or 9 is `high`.
6. Write the response the level calls for, naming the techniques that fit this particular risk:

   | Level | Test techniques | Review of the tests | Runs |
   | --- | --- | --- | --- |
   | low | Equivalence partitions on the success path | None | Smoke |
   | medium | Adds boundary values, decision tables, and failure paths | A reviewer samples the cases | Regression |
   | high | Adds state transitions and an exploratory session | A reviewer checks every case and the mutation score | Full, plus any non-functional check the risk names |

7. Mark each risk that depends on an assumption from the review with the assumption it rests on, such as "(rests on A2)".
8. Number the risks `R-<item>-1`, `R-<item>-2`, and so on, where `<item>` is the work item id with only letters, digits, and hyphens. When the section already exists, continue after its highest number; never reuse one.
9. Write the section, then reply with the file path and one line for each high risk.

## Checklist

- [ ] The review's verdict was checked before anything else.
- [ ] Every acceptance criterion and every assumption was considered.
- [ ] Every level follows the rule in step 5.
- [ ] Every response names techniques, and its depth matches the level.
- [ ] Risks that rest on assumptions say so.
- [ ] Every other section of the register is unchanged.
