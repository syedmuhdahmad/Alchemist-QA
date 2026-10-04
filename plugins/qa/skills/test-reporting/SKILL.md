---
name: test-reporting
description: Use when someone needs a test progress report or a test completion report for a work item or release, including whether the exit criteria are met, not met, or waiting on the owner's answers, and what risk remains. Not for planning tests, and not for reporting a single defect.
metadata:
  kind: method
  freedom: medium
  stage: report
---

# Test reporting

Report where testing stands, from recorded facts, and say plainly whether the exit criteria are met, not met, or waiting on the owner's answers. Follows CTFL v4.0.1, section 5.3.

## Inputs

- `qa/trace.json`, rebuilt first with the traceability skill's script.
- The exit criteria in `qa/plans/<file>.md`.
- `qa/defects/`, the work item's section of `qa/risk-register.md`, and the questions in `qa/basis/<file>.review.md`.

Without a plan, no criteria were set before testing. Judge the default criteria for information: every risk has a case; every case has a test or a reason it is not automated; every case for a high risk passed; no open defect of severity critical or major. Then add the criterion "a test plan set the exit criteria before testing" as not met, so a completion report is `not-met`.

## Output

`qa/reports/<file>.md` in the shape of [the template](templates/report.md), where `<file>` is the work item id with only letters, digits, and hyphens. Progress and completion reports use this same path: each report replaces the last, and version control keeps the history. `kind` is `progress` while testing continues, `completion` when testing has ended or someone asks whether it can end.

## Procedure

1. Rebuild the trace and read the coverage for the work item:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/traceability/scripts/trace.mjs" update
   node "${CLAUDE_PLUGIN_ROOT}/skills/traceability/scripts/trace.mjs" coverage --item "<id>"
   ```

2. Take every number in the report from that output and from the defect files. Never estimate or round a count.
3. Judge each exit criterion as met or not met, with the evidence: the case ids, defect ids, or counts that decide it. Leave out the cases listed under `provisional` in the coverage. Their expected results rest on assumptions the owner has not confirmed, so until the owner answers, they neither meet a criterion nor fail one, whether they passed or failed.
4. For a completion report, set the verdict in this order:
   - `not-met` when any criterion is not met;
   - otherwise `awaiting-owner` when the coverage's `awaiting_owner` is not empty, with `awaiting` in the frontmatter set to that list, such as `awaiting: [A1, A3]`;
   - otherwise `met`.

   A failure that triage classed `question` is provisional, so on its own it never makes a report `not-met`. A progress report has no verdict and no `awaiting`.
5. Under **Risk remaining**, list each risk whose cases failed, did not run, or do not exist, and each open defect, with what it means for a user.
6. Under **Not tested**, list what the plan left out and every case marked `not_automated` that has no recorded manual result. Silence here would read as coverage.
7. Under **Waiting on the owner**, list each assumption in `awaiting_owner` with its question from the review and the provisional cases that rest on it, with their results, whatever the verdict. With none, write "None."
8. Write the report, then reply with its path, the verdict (or "progress"), the criteria that are not met, and the assumptions it waits on.

## Checklist

- [ ] The trace was rebuilt before anything was counted.
- [ ] Every number comes from the trace or the defect files.
- [ ] Each exit criterion has a verdict and its evidence.
- [ ] Provisional cases were left out of the criteria, and listed under Waiting on the owner.
- [ ] The verdict follows step 4: `not-met`, then `awaiting-owner` with `awaiting`, then `met`.
- [ ] Without a plan, the report says so and is not `met`.
- [ ] Risk remaining, Not tested, and Waiting on the owner are filled in, or say "None."
