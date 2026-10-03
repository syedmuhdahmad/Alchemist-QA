---
name: test-basis-review
description: Use when a work item, user story, or specification has to be checked for testability before test design starts, or someone asks whether a story is ready to test. Not for designing test cases, and not for reviewing code.
metadata:
  kind: method
  freedom: medium
  stage: review
---

# Test basis review

Check one work item for testability and record the result in a file that the next stage reads. Follows CTFL v4.0.1, chapter 3 (reviews) and section 4.5 (user stories and acceptance criteria).

## Inputs

- `qa/basis/<id>.md`: the work item, with its acceptance criteria in the frontmatter.

## Output

`qa/basis/<id>.review.md`, filled in from [the template](templates/review.md). Write it in every case, including when nothing is wrong. The file is the result. The chat reply is a short summary of it: the file path, the verdict, and one line for each finding that is not a note.

## Procedure

1. Read the work item: the story, each acceptance criterion, and anything it says it depends on.
2. Ask these questions of each acceptance criterion, then of the story as a whole. Each "no" is a finding of the type shown:
   - Can this statement and every other statement be true together? No: `contradiction`.
   - Does every term have one reading and, where it describes an amount or speed, a measure? Words such as "quickly", "strong", or "easy" fail: `ambiguity`.
   - Is there a result a tester can observe and check? No: `untestable`.
   - Within what this story sets out to do, is every situation it will meet settled by the criteria read together: invalid input, the error path, empty and repeated actions, the limits of any number? No: `gap`.
   - Are there any acceptance criteria at all? No: one `missing-criteria` finding.
   - Anything worth saying that does not stop a tester knowing the expected result is a `note`.
3. Before keeping an `ambiguity` or a `gap`, check three things:
   - Would two careful testers, reading the work item, write different expected results for the same test? If not, it is a `note`.
   - Does another criterion already settle it? Then it is not a finding.
   - Does it belong to a different feature, such as removing or editing something this story only adds? Then it is outside this story and a `note` at most.
4. Number the findings F1, F2, and so on.
5. For each finding that is not a `contradiction` or a `note`, write one assumption that makes it testable, numbered A1, A2, and so on, naming the finding it covers. An assumption is the most likely reading for this product, written so the owner can confirm or correct it. For `missing-criteria`, write assumptions for the main success path, the main failure path, and any limit the story implies.
6. Set the verdict:
   - `not-ready` when any finding is a `contradiction`. No assumption can settle two statements that cannot both hold.
   - `ready-with-assumptions` when there is no contradiction and at least one finding is not a `note`.
   - `ready` when every finding is a `note`, or there are none.
7. Write one question for the owner for each contradiction and each assumption.
8. Write the file. This stage ends there: the work item stays as it is, and test design is the next stage.
9. Reply with the file path, the verdict, and one line for each finding that is not a note.

## Checklist

- [ ] Every acceptance criterion was asked all five questions.
- [ ] Every ambiguity and gap passed the three checks in step 3.
- [ ] Every finding has an id, a type from step 2, where it is, and one line saying what is wrong.
- [ ] Every finding other than a contradiction or a note has an assumption that names it.
- [ ] The verdict follows step 6.
- [ ] `qa/basis/<id>.review.md` exists, and its frontmatter has `work_item` and `verdict`.
