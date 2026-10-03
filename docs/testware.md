# Testware

Agents hand work to each other through files in the project's `qa/` folder, not through chat. That makes a run resumable, reviewable in a pull request, and checkable by a script. This page says what each file is and who writes it.

Files with a schema are checked by `tools/validate-testware`. The schemas and one example of each are in `plugins/qa/schemas/`.

## Layout

```text
qa/
  profile.yaml            the project: stack, capabilities, devices, tracker, autonomy
  gotchas.md              this team's own gotchas, added to the plugin's
  risk-register.md        product risks, one section per work item
  basis/<id>.md           one work item, as read from the tracker
  basis/<id>.review.md    the testability review of that work item
  cases/<id>.md           test cases designed for that work item
  charters/               exploratory session charters and notes
  runs/                   parsed results, one file per run
  defects/D-<n>.md        one defect report each
  plans/  reports/        plans, and progress and completion reports
  trace.json              work item -> risk -> case -> test -> result
  state/                  engagement ledger for pipelines
```

## Who writes what

| File | Written by | Checked by | Schema |
| --- | --- | --- | --- |
| `profile.yaml` | `/qa:onboard`, then the team | `SessionStart` hook | `profile.schema.json` |
| `basis/<id>.md` | Intake adapter | Analyst | `basis.schema.json` |
| `basis/<id>.review.md` | Analyst (`test-basis-review`) | Lead | `basis-review.schema.json` |
| `risk-register.md` | Analyst (`risk-analysis`) | Reviewer | Phase 1 |
| `cases/<id>.md` | Analyst (`test-design-*`) | Reviewer | Phase 1 |
| `trace.json` | A script, on each written case and each run | Manager | `trace.schema.json` |
| `defects/D-<n>.md` | Triager (`defect-reporting`) | A person, before it is filed | Phase 1 |
| `reports/<id>.md` | Manager (`test-reporting`) | A person | Phase 1 |

"Phase 1" means the shape is defined by the skill that writes the file, when that skill lands.

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

The other file shapes are added to this page as their skills land.
