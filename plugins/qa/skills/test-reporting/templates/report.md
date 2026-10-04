---
work_item: "<work item id, or release-<version>>"
kind: <progress or completion>
exit_criteria: <met, not-met, or awaiting-owner; leave this line out of a progress report>
awaiting: [<A<n>, ...: only with awaiting-owner, from the coverage's awaiting_owner>]
---

# Test <progress or completion> report: <title>

## Summary

<two or three sentences: what was tested, the verdict or the state of progress, and the main reason for it>

## Results

| Risk | Level | Cases | Passed | Failed | Not run | No test |
| --- | --- | --- | --- | --- | --- | --- |
| R-<item>-<n> | <level> | <n> | <n> | <n> | <n> | <n> |

## Defects

| Id | Title | Severity | Status | Cases |
| --- | --- | --- | --- | --- |
| D-<nnnn> | <title> | <severity> | <status> | <TC ids> |

## Exit criteria

| Criterion | Met | Evidence |
| --- | --- | --- |
| <criterion from the plan> | <yes or no> | <case ids, defect ids, or counts> |

## Waiting on the owner

| Assumption | Question | Cases | Results |
| --- | --- | --- | --- |
| A<n> | <the question from the basis review> | <TC ids resting on it> | <passed n, failed n> |

## Risk remaining

- <risk or defect>: <what it means for a user>

## Not tested

- <what was left out, and why>
