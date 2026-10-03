---
name: test-reporting
description: Use when someone needs a test progress report or a test completion report for a work item or release, including whether the exit criteria are met and what risk remains. Not for planning tests, and not for reporting a single defect.
metadata:
  kind: method
  freedom: medium
  stage: report
---

# Test reporting

Report where testing stands, from recorded facts, and say plainly whether the exit criteria are met. Follows CTFL v4.0.1, section 5.3.

## Inputs

- `qa/trace.json`, rebuilt first with the traceability skill's script.
- The exit criteria in `qa/plans/<file>.md`. Without a plan, use the default criteria below and say so.
- `qa/defects/` and the work item's section of `qa/risk-register.md`.

Default exit criteria: every risk has a case; every case has a test or a reason it is not automated; every case for a high risk passed; no open defect of severity critical or major.

## Output

`qa/reports/<file>.md` in the shape of [the template](templates/report.md), where `<file>` is the work item id with only letters, digits, and hyphens. Progress and completion reports use this same path: each report replaces the last, and version control keeps the history. `kind` is `progress` while testing continues, `completion` when testing has ended or someone asks whether it can end.

## Procedure

1. Rebuild the trace and read the coverage for the work item:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/traceability/scripts/trace.mjs" update
   node "${CLAUDE_PLUGIN_ROOT}/skills/traceability/scripts/trace.mjs" coverage --item "<id>"
   ```

2. Take every number in the report from that output and from the defect files. Never estimate or round a count.
3. Judge each exit criterion as met or not met, with the evidence: the case ids, defect ids, or counts that decide it.
4. For a completion report, set `exit_criteria: met` only if every criterion is met. One unmet criterion makes it `not-met`. A progress report has no verdict.
5. Under **Risk remaining**, list each risk whose cases failed, did not run, or do not exist, and each open defect, with what it means for a user.
6. Under **Not tested**, list what the plan left out and every case marked `not_automated` that has no recorded manual result. Silence here would read as coverage.
7. Write the report, then reply with its path, the verdict (or "progress"), and the criteria that are not met.

## Checklist

- [ ] The trace was rebuilt before anything was counted.
- [ ] Every number comes from the trace or the defect files.
- [ ] Each exit criterion has a verdict and its evidence.
- [ ] A completion report is `met` only when every criterion is met.
- [ ] Risk remaining and Not tested are filled in, or say "None."
