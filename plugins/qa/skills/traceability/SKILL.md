---
name: traceability
description: Use when qa/trace.json must be brought up to date after cases, tests, runs, or defects change, or when someone asks what is covered, which risks or cases have no tests, or which tests failed for a work item. Not for designing cases or running tests.
metadata:
  kind: method
  freedom: low
---

# Traceability

Keep the links from work item to risk, case, test, and result current, and answer coverage questions from them. Follows CTFL v4.0.1, section 1.4.4.

The trace is built by a script, never by hand, so every agent and every report sees the same links.

## How the links are found

| Link | Comes from |
| --- | --- |
| Work item to risk | The work item's section of `qa/risk-register.md`; the `## Product: first pass` draft from `/qa:onboard` is not a work item and is skipped |
| Risk to case | The Risk column of `qa/cases/<file>.md` |
| Case to test | A test whose title starts with the case id, such as `TC-12-01 ships free at 50.00` |
| Test to result | Result files in `qa/runs/`, oldest first, so the latest run wins. Within one run a case takes its worst test: one failing row of an `it.each` table fails the case |
| Failed test to defect | The `cases` list of a report in `qa/defects/` |

A case with no test needs its reason under `not_automated` in the cases file. Otherwise it is a gap.

## Procedure

1. Rebuild the trace from the project root:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/trace.mjs" update
   ```

2. Answer coverage questions from the script, not by reading files yourself. Add `--item "<id>"` to limit it to one work item:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/trace.mjs" coverage --item "#12"
   ```

   It prints `risks_without_cases`, `cases_without_tests`, `failed`, `not_run`, `passed`, and `complete`. Add `--strict` to exit with status 1 when anything is missing, failed, or not run.
3. If a case you expected is missing from the trace, check its test title starts with the case id, then run `update` again. Never edit `qa/trace.json` by hand.
4. Reply with the counts, and name each risk without a case and each case without a test.
