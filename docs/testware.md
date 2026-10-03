# Testware

Agents hand work to each other through files in the project's `qa/` folder, not through chat. That makes a run resumable, reviewable in a pull request, and checkable by a script. This page says what each file is and who writes it.

Files with a schema are checked by `tools/validate-testware`. The schemas and one example of each are in `plugins/qa/schemas/`.

## Layout

```text
qa/
  profile.yaml            the project: stack, capabilities, devices, tracker, autonomy
  gotchas.md              this team's own gotchas, added to the plugin's
  risk-register.md        product risks, one section per work item, plus the onboard draft
  basis/<id>.md           one work item, as read from the tracker
  basis/<id>.review.md    the testability review of that work item
  basis/<id>.acceptance.md  Given/When/Then scenarios, proposed to the owner
  cases/<id>.md           test cases designed for that work item
  charters/<id>-<n>.md    exploratory session charters and notes
  runs/<time>-<capability>.json   results of one run (Jest-format JSON or JUnit XML)
  runs/<run>.triage.md    why each failure in that run failed
  runs/latest/            a copy of the latest run per capability
  runs/coverage/          coverage of the latest run with coverage on
  selections/<ref>.md     the regression tests chosen for one change
  defects/D-<n>.md        one defect report each
  plans/<id>.md           the test plan for a work item or release
  reports/<id>.md         progress and completion reports
  outbox/                 comments and issues drafted for a person to post
  trace.json              work item -> risk -> case -> test -> result
  state/<id>.md           the lead's ledger for one work item
```

## Who writes what

| File | Written by | Checked by | Schema |
| --- | --- | --- | --- |
| `profile.yaml` | `/qa:onboard`, then the team | `SessionStart` hook | `profile.schema.json` |
| `basis/<id>.md` | Intake adapter | Analyst | `basis.schema.json` |
| `basis/<id>.review.md` | Analyst (`test-basis-review`) | Lead | `basis-review.schema.json` |
| `basis/<id>.acceptance.md` | Analyst (`acceptance-criteria`) | The owner, who confirms it | `acceptance.schema.json` |
| `risk-register.md` | Analyst (`risk-analysis`) | Reviewer | Read by the trace script |
| `cases/<id>.md` | Analyst (`test-design-blackbox`, `test-design-whitebox`) | Reviewer | `cases.schema.json` and the case table check |
| `charters/` | Analyst (`exploratory-testing`) | Lead | None: free form |
| `runs/*.json` | A tool skill's run script | Triager | The tool's own format |
| `runs/<run>.triage.md` | Triager (`failure-triage`) | Reviewer | None: one table |
| `selections/<ref>.md` | Lead or engineer (`regression-selection`) | Reviewer | None |
| `defects/D-<n>.md` | Triager (`defect-reporting`) | A person, before it is filed | `defect.schema.json` |
| `plans/<id>.md` | Manager (`test-planning`) | A person | `plan.schema.json` |
| `reports/<id>.md` | Manager (`test-reporting`) | A person | `report.schema.json` |
| `outbox/` | `intake-github` write-back script | A person, who posts it | None |
| `trace.json` | `traceability` script, after cases, runs, or defects change | Manager | `trace.schema.json` |
| `state/<id>.md` | Lead | A person | None |

Each skill's template, in its `templates/` folder, is the authoritative shape of the file it writes.

## Identifiers

| Thing | Form | Example |
| --- | --- | --- |
| Work item | As the tracker writes it | `#12`, `AB#123`, `PROJ-45` |
| File name for a work item | The id with only letters, digits, and hyphens | `12`, `AB-123`, `PROJ-45` |
| Finding in a basis review | `F<n>`, unique within the review | `F2` |
| Assumption in a basis review | `A<n>`, naming the finding it covers | `A1 (covers F1)` |
| Risk | `R-<item>-<n>` | `R-12-1` |
| Test case | `TC-<item>-<nn>` | `TC-12-01` |
| Defect | `D-<nnnn>`, unique in the project | `D-0003` |

Ids are never reused. A case that is dropped keeps its number.

## Basis review

`basis/<id>.review.md` is the gate between intake and test design. Its `verdict` decides what happens next:

| Verdict | Meaning | Next |
| --- | --- | --- |
| `ready` | Nothing blocks test design. | Risk analysis and design start. |
| `ready-with-assumptions` | Testable only if the listed assumptions hold. | Design starts against the assumptions; the questions go to the owner. |
| `not-ready` | Two statements contradict each other. No assumption can settle that. | The pipeline stops until the owner answers. |

A finding has one of these types:

| Type | Use it when |
| --- | --- |
| `contradiction` | Two statements cannot both be true. |
| `ambiguity` | A statement can be read in more than one way, or uses a term with no measure ("fast", "strong"). |
| `gap` | A situation the feature will meet is not covered, such as an error path. |
| `untestable` | A statement has no observable result to check. |
| `missing-criteria` | The work item has no acceptance criteria at all. |
| `note` | Worth saying, but it does not block design. |

The body has three sections, in this order: `## Findings` (a table of id, type, where, finding), `## Assumptions`, and `## Questions for the owner`. A section with nothing in it says "None."

## Test cases

`cases/<id>.md` has `work_item` in its frontmatter, and an optional `not_automated` map from case id to the reason no automated test exists. Its body has one table with this exact header, which the trace script and the validator read:

```text
| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
```

- **Technique** is one of `equivalence-partitioning`, `boundary-value`, `decision-table`, `state-transition`, `statement`, `branch`, `error-guessing`, `checklist`, `exploratory`, `acceptance`.
- **Risk** is the `R-<item>-<n>` the case covers. **Level** is `component`, `integration`, or `system`.
- **Expected result** comes from the basis, never from the code under test.

White-box design adds a `## Coverage gaps` section after the table.

## How tests link to cases

A test is linked to a case when its title starts with the case id, such as `it('TC-12-01 ships free at 50.00')`. Results are linked the same way: the trace script reads every result file in `runs/`, oldest first, so the latest run decides each case's result. When several tests in one run carry the same case id, the case takes the worst of them: failed, then not run, then passed. The `## Product: first pass` section that `/qa:onboard` drafts in `risk-register.md` is not a work item, and the trace skips it. A failed case points at the defect report whose `cases` list names it.

## Defects, plans, and reports

| File | Frontmatter | Notes |
| --- | --- | --- |
| `defects/D-<n>.md` | `id`, `title`, `work_item`, `cases`, `severity` (`critical`, `major`, `minor`, `trivial`), `status` (`draft`, `approved`, `filed`) | Only a person moves a report from `draft` to `approved`. Only approved reports are drafted as tracker issues. |
| `plans/<id>.md` | `work_item`, `estimate_hours` | Exit criteria must be checkable from the trace or the defect files. |
| `reports/<id>.md` | `work_item`, `kind` (`progress` or `completion`), and on a completion report `exit_criteria` (`met` or `not-met`) | Every number comes from the trace or the defect files. |

## Write-back

Nothing is posted to a tracker by the department. The `intake-github` write-back script drafts the comment and the defect issues into `outbox/` and prints the `gh` commands that would post them. A person reads the drafts and runs the commands.
