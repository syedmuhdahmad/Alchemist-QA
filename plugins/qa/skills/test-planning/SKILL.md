---
name: test-planning
description: Use when a test plan is needed for a work item or a release, including its scope, approach, entry and exit criteria, estimate, and the order to test in. Not for analysing risks, and not for reporting results.
metadata:
  kind: method
  freedom: medium
  stage: plan
---

# Test planning

Write the plan that says what will be tested, how deeply, in what order, and when testing is done. Follows CTFL v4.0.1, section 5.1.

## Inputs

- The risk register sections for the work items in scope. Planning needs them: depth and order come from risk.
- `qa/basis/<file>.md` and its review, for each work item.
- `qa/cases/<file>.md`, if cases exist yet.
- `qa/profile.yaml`, if it exists, for the platforms and tools in use.

## Output

`qa/plans/<name>.md` in the shape of [the template](templates/plan.md). `<name>` is the work item's file name, or `release-<version>` for a release.

## Procedure

1. If no work item in scope has a risk register section, stop and reply that risk analysis comes first.
2. **Scope.** Name what is in scope (work items, features, platforms) and what is out, with a reason for each exclusion.
3. **Approach.** For each risk level present, state the techniques, test levels, review, and runs, matching the depth table the risk register uses. Name the platforms from the profile.
4. **Entry criteria.** What must be true before test execution starts: a review that is not `not-ready`, cases written for every high and medium risk, the build and environment available.
5. **Exit criteria.** What must be true to stop. Each criterion must be checkable from the trace or the defect files, never a judgement. Use at least:
   - every risk has at least one case, and every case has a test or a reason it is not automated;
   - every case for a high risk has passed;
   - no open defect of severity critical or major;
   - no result rests on an assumption the owner has not confirmed (`awaiting_owner` in the trace coverage is empty). While one does, the verdict is `awaiting-owner`, not `not-met`;
   - any other share the team sets, such as the share of medium-risk cases passed.
6. **Estimate.** Count the cases, or the conditions where there are no cases yet, by level, and multiply by an effort per case that you state. Add time for review, defect reports, and reruns, and show the working. Put the total, in hours, in `estimate_hours`.
7. **Priority order.** List what is tested first: high risks first, then medium, then low. Within a level, put first whatever other work depends on.
8. Write the plan, then reply with its path, the estimate, and the exit criteria.

## Checklist

- [ ] Every work item in scope has a risk section.
- [ ] Every exit criterion can be checked from the trace or the defect files.
- [ ] The estimate shows its working and matches `estimate_hours`.
- [ ] The priority order starts with the high risks.
