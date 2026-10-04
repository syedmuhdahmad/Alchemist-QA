# Owner answers, plans before testing, and work items with no tracker

Design for #110, #111, and #115, found in the first two field tests. Agreed with the owner on 2026-10-04.

## Goal

After a run, the files in `qa/` tell a person the truth about three things:

- where the work item came from, even when no tracker holds it (#110);
- that a plan set the exit criteria before testing started (#115);
- whether "met" means done, or depends on assumptions the owner has not confirmed (#111).

Constraints: nothing is posted without a person, open-source tools only, and no change to how tracker items are read.

## Decisions

| Question | Decision |
| --- | --- |
| Verdict when results depend on the owner | A third verdict, `awaiting-owner`, with the list of open assumptions in `awaiting` |
| What blocks `met` | Any case whose expected result comes from an open assumption, whether it passed or failed |
| Where the owner answers | In the basis review: each assumption has a status `open`, `confirmed <date>`, or `corrected <date>` |
| Work items with no tracker | `source: manual`, ids `REQ-<n>` |
| Who decides "awaiting" | The trace script, from the review and the cases' Basis column, not a judgement |
| How a `REQ` item is read in | A new tool skill, `intake-manual`, with a script, like `intake-github` |
| Where the plan step goes | After test design, before automation |

## 1. Work items with no tracker (#110)

**Basis file.** `basis.schema.json` accepts `source: manual`. A manual item must have:

- `id` of the form `REQ-<n>`;
- `origin`: where it came from, such as `qa/risk-register.md R-product-1` or `request in chat`.

It may have `created_at`. Its body says that no tracker item exists and keeps the source word for word: the register row, or the person's request.

**Skill `intake-manual`** (kind `tool`, freedom `low`), with `scripts/manual-item.mjs`:

- `--from-risk <risk id>` finds that row in `qa/risk-register.md`, in any section including the onboard draft. It writes `qa/basis/REQ-<n>.md` with type `task`, the risk's text as the title, the row quoted, and no acceptance criteria, so the basis review flags `missing-criteria`.
- `--title "<title>" --request-file <file or ->` keeps the request word for word. It takes acceptance criteria from an "Acceptance criteria" list, with the same rule and the same code as `intake-github`. `--origin` overrides the default `request in chat`, and `--type` overrides `task`.
- The number is one more than the highest `REQ-<n>` already used in `qa/` (basis, cases, plans, reports, state, charters, register headings), so an id is never reused. The script never overwrites a file.
- It prints the path it wrote, or exits 2 with the reason.

**Lead.** Step 1 runs `intake-github` for a GitHub issue and `intake-manual` for a risk from the register or a request typed in chat. The lead never writes a basis file itself. Risk and case ids follow from the work item id: `R-REQ-1-1`, `TC-REQ-1-01`.

## 2. A plan before testing (#115)

**Lead steps.** The lead's steps become:

1. intake;
2. basis review, risk analysis, and test design (`qa:test-analyst`);
3. **plan** (`qa:test-manager`, `test-planning`), done when `qa/plans/<file>.md` exists with exit criteria;
4. automation;
5. triage;
6. review of the testware;
7. report.

**Reporting without a plan.** The criterion "a test plan set the exit criteria before testing" is not met, so a completion report is `not-met`. The default criteria are still judged, for information.

**Pipeline example.** `plugins/qa/schemas/examples/pipelines.yaml` gets the same `plan` stage, for #36.

## 3. Waiting for the owner's answers (#111)

**Assumption status.** In `qa/basis/<file>.review.md` each assumption reads `- A<n> (covers F<n>, <status>): <text>`:

- `<status>` is `open`, `confirmed <date>`, or `corrected <date>`. An assumption with no status is `open`, so older reviews still work.
- Only the owner's answer changes a status. The analyst records it, from the review or from the person's words in chat passed on by the lead, and never on its own judgement.
- A corrected assumption's text becomes the owner's answer. The cases that cite it are updated in the same step.

**Trace.** `trace.mjs` reads each review's assumptions and statuses, and each case's Basis column:

- A case gets `rests_on: [A<n>, ...]` when its Basis cites assumptions.
- An item gets `assumptions: [{id, status}]` when it has a review. `status` is `open`, `confirmed`, or `corrected`, without the date.
- `coverage` adds two lists:
  - `awaiting_owner`: the open assumptions that at least one case rests on, including ids the review does not define;
  - `provisional`: the cases that rest on an open assumption and ran, whether they passed or failed. A case with no test, or one that did not run, stays a gap.
- Neither list changes `complete`, which stays about coverage, so `--strict` and the lead's step checks are unchanged.

**Verdict.** `test-reporting` decides a completion report's verdict in this order:

1. Judge every exit criterion using only cases that are not provisional, plus the defects. If any criterion is not met, the verdict is `not-met`.
2. Otherwise, if `awaiting_owner` is not empty, the verdict is `awaiting-owner`, with `awaiting` set to that list.
3. Otherwise the verdict is `met`.

So a failure classed `question` never makes a report `not-met` on its own. A real defect still does, and the open questions are listed alongside it.

**Report.** `report.schema.json`:

- `exit_criteria` gains `awaiting-owner`;
- `awaiting` is a list of `A<n>`, required with `awaiting-owner` and absent otherwise.

The template gets a **Waiting on the owner** section: each open assumption, its question from the review, and the cases resting on it with their results. It says "None." when the list is empty.

**Planning.** `test-planning` adds an exit criterion: no result rests on an open assumption (`awaiting_owner` is empty); while one does, the verdict is `awaiting-owner`.

**Triage.** A failure is `question` only while its assumption is `open`. A confirmed or corrected assumption is part of the basis, so the failure is a `product-defect` or a `test-defect`.

**Lead.**

- The lead always ends with a report on disk. If it stops before step 7, for example on a `not-ready` review, a specialist that failed twice, or a person who stopped it, the test manager writes a progress report that says where the work stopped and what is open.
- When the person answers, the lead sends the answers to the analyst to record. Then automation, triage, review, and the report run again for the affected cases only.

**Write-back.** For `awaiting-owner`, the drafted GitHub comment says the report is waiting on the owner's answers and names the assumptions. It also copies the Waiting on the owner section.

## Testing

| Change | Test first |
| --- | --- |
| `manual-item.mjs` | Unit tests: from a risk, from a request, numbering past used ids, unknown risk, no overwrite |
| `trace.mjs` | Unit tests: statuses, `rests_on`, `awaiting_owner`, `provisional`, `complete` unchanged, missing review |
| Schemas | Validator tests: manual basis needs `origin` and a `REQ-<n>` id; `awaiting-owner` needs `awaiting`; `awaiting` only with it |
| Write-back | Unit test: the `awaiting-owner` headline and section |
| `intake-manual` | Eval cases: from a risk row, from a typed request, a GitHub issue goes to `intake-github` instead |
| `test-reporting` | Eval cases: all passed but resting on an open assumption; only `question` failures; assumptions confirmed gives `met`; no plan gives `not-met`. `all-passed` gets a plan in its fixture. |
| `test-basis-review` | Eval case: recording the owner's answers as `confirmed` and `corrected` |
| `qa-lead` | Eval cases: "get the item ready for automation" writes a plan and no test; `stops-at-gate` also leaves a progress report |

Each eval case runs against `main` first to show it fails, then on the branch.

## Housekeeping

- `docs/testware.md`: the `REQ-<n>` id, assumption statuses, the new verdict, and who writes basis files.
- The test manager's return line names the new verdict.
- `qa` becomes 0.1.2. `/qa:about` reads the version from `plugin.json` instead of stating it, so it can no longer go stale.
- CHANGELOG.

## Not in scope

The device portfolio (#47, Phase 3), time and cost per stage (#112), run size (#113), and the Azure DevOps and Jira adapters.
