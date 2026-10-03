---
name: test-design-whitebox
description: Use when a code coverage report shows statements or branches that no test reaches, and someone wants to know which gaps matter and what cases would close them. Not for designing cases from a specification alone, and not for raising a coverage percentage for its own sake.
metadata:
  kind: method
  freedom: medium
  stage: design
---

# White-box test design

Read a coverage report, decide which uncovered statements and branches matter, and add cases that reach them. Follows CTFL v4.0.1, section 4.3.

## Inputs

- A coverage report with line and branch hit counts per file, such as an lcov file. The unit test tool skill writes one to `qa/runs/coverage/` when run with coverage.
- The source files it names.
- `qa/basis/<file>.md`, the work item's section of `qa/risk-register.md`, and `qa/cases/<file>.md`.

## Output

New rows in `qa/cases/<file>.md`, and a `## Coverage gaps` section after the case table in the shape of [the template](templates/coverage-gaps.md). Every existing row and section stays as it is.

## Procedure

1. List each file in the report that belongs to the work item, with its uncovered lines and branches. A branch is uncovered when one of its outcomes has a hit count of zero.
2. Read the code at each gap and decide which of these it is:

   | Gap | Action |
   | --- | --- |
   | A behaviour the basis requires | Add a case. Technique `branch` for an untaken branch outcome, `statement` for an unreached statement. |
   | A behaviour the basis does not mention | Do not add a case. Record it as a question for the owner: the code does something nobody asked for, or the basis has a gap. |
   | Code that cannot be reached, or only guards against impossible input | Record it as a note. No case. |

3. For each new case, write the input that drives execution down the uncovered path. Take the expected result from the basis, never from the code: the code is what is under test, and reading the answer from it would make a wrong branch pass.
4. Link each case to the risk it most affects, and number it after the highest existing case id.
5. Record every gap in the `## Coverage gaps` section, with what was done about it.
6. If the report shows no uncovered statements or branches in the work item's files, change nothing and reply that coverage has no gaps.
7. Reply with the cases added, the questions for the owner, and the coverage before the new cases.

## Checklist

- [ ] Every uncovered branch outcome in the work item's files is in the gaps section.
- [ ] Each new case's expected result comes from the basis.
- [ ] No case was added for behaviour the basis does not describe.
- [ ] Existing rows are unchanged, and ids continue after the highest.
