# Pipeline engine, hooks, and scorecard

Design for the rest of Phase 2 in one pull request: #33, #34, #35, #36, #38, #39, #40, #112, #113, and #119. Agreed with the owner on 2026-10-27, with an eval budget of $150. Builds on the routing work in #124 (`docs/specs/2026-10-27-routing.md`).

## Goal

A work item goes through the `feature` pipeline with no one stepping in. Every stage is checked on disk. Every run is kept small and traced. The department's detection rate is measured on the benchmark and published.

## 1. Runs stay small, and are traced by a hook (#113, #35)

- Tool run scripts still write the raw report: `qa/runs/<time>-<capability>.json`, plus `runs/latest/<capability>.json`.
- `traceability/scripts/runs.mjs` turns a raw Jest-format report into a slim run in place: `{format: "alchemist-run/1", tool, totals, tests}`. `tests` keeps every failed test with the first line of its message, and every test whose title starts with a case id. All other tests count only in `totals`. The raw report survives only as `runs/latest/<capability>.json`.
- `trace.mjs` reads slim runs, and gives the same case results as it does from the raw reports.
- A `PostToolUse` hook on Bash, in a project with `qa/profile.yaml`:
  1. slims any raw run;
  2. updates `qa/trace.json`;
  3. when the newest run has failures and no `<run>.triage.md`, adds context naming the failures to triage.
  It reads files, not the Bash output, so it does not depend on the hook input's output field.
- `/qa:onboard` adds `qa/runs/latest/` and `qa/runs/coverage/` to `.gitignore`.
- Stated size: ten runs of a 1,000-test suite in which every test names a case stay under 1 MB.

## 2. Pipeline engine and hooks (#33, #34, #36, #112)

- **Manifest.** `plugins/qa/pipelines.yaml` holds the `feature` pipeline, whose stages follow the lead's steps:

  | Stage | Agent | Exit checks |
  | --- | --- | --- |
  | intake | qa-lead | `basis` |
  | analysis | test-analyst | `review-not-blocked`, `register-section`, `cases` |
  | plan | test-manager | `plan-exit-criteria` |
  | automate | automation-engineer (one per capability, parallel) | `cases-automated` |
  | triage | failure-triager | `failures-classed` |
  | review | test-reviewer (only for medium or high risk) | `review-recorded` |
  | report | test-manager | `report-verdict` |

- **Checks.** Each exit check is a named function in `pipeline/scripts/checks.mjs` that returns what is missing. The schema lists the check names, so a typo fails validation.
- **State.** `qa/state/<file>.pipeline.json` records:
  - the pipeline, the item, the file, and the current stage;
  - attempts per stage, and when each stage started and finished;
  - tokens per stage;
  - a status: `running`, `waiting`, `done`, or `stopped`.

  `pipeline.mjs` (`start`, `next`, `status`) is the one interface. The lead runs it, and the hooks import it.
- **Hooks**, all in `plugins/qa/hooks/hooks.json`, and all silent unless a pipeline is running:
  - `SessionStart` tells the session the item, its stage, and what "done" means for that stage, so a new session resumes.
  - `SubagentStart` gives a specialist the paths it needs, the stage, and the exit checks.
  - `SubagentStop` runs the stage's checks when the stopping agent owns the stage. When they fail, it sends the agent back with what is missing, at most twice. It never blocks a parallel stage, because one engineer finishing says nothing about the others.
  - `Stop` advances past every stage whose checks hold. If stages remain and `qa/profile.yaml` sets `autonomy` to L1 or higher, it sends the lead on to the next stage. Each stage allows at most 3 attempts; then the state says `stopped`, with the reason. A `not-ready` review or open owner questions set `waiting`, and nothing blocks.
  - `PreCompact` and `SessionEnd` checkpoint the state. `SessionEnd` also adds a ledger line to `qa/state/<file>.md`.
- **Time and tokens (#112).** Each stage records its elapsed time and its tokens. Tokens are summed from the session transcript and each specialist's transcript. Claude Code does not give hooks a cost, so the ledger records tokens, and the scorecard records cost from headless runs.
- **Plan estimate (#112).** Plans keep the human-effort estimate and add the agent run: minutes and US dollars, as ranges set by risk level and case count. These go in the optional plan fields `estimate_agent_minutes` and `estimate_agent_usd`.
- **Lead.** It preloads a new `pipeline` skill. It runs `pipeline.mjs start feature` after intake, and `pipeline.mjs next` after each step.

## 3. Scoring and scorecard (#38, #39, #40)

- `tools/scoring/seeded.mjs --app web|mobile` builds the sandbox. It copies one app and `REQUIREMENTS.md` into a temporary folder, never `answer-keys/`, links the app's installed `node_modules`, and writes a profile with `autonomy: L1`.
- It then runs the lead headless, with one prompt: bring `REQUIREMENTS.md` in as one work item and test it at unit level, up to the completion report. A finished run also proves #36: the pipeline runs unattended.
- Haiku matches each defect report to the answer key, or to none. The results:
  - **detection rate:** found over all 10 seeded defects, and over the unit-level defects;
  - **false-defect rate:** reports that match no seeded defect;
  - **cost and time:** from the headless result;
  - **flake:** failures classed `flaky`.
- **Mutation score (#39).** Stryker runs on the app's `src/lib` with the tests the department wrote, in the sandbox. Its score goes into the same record.
- **Records.** Each run writes `evals/scorecard/runs/<date>-<app>.json`.
- **Scorecard.** `tools/scoring/scorecard.mjs` generates `docs/scorecard.md` and a summary block in the README, with one row per model so model versions can be compared. Routing figures come from the golden set and the recorded model run. A test fails while either generated file is out of step with the records.

## 4. The flaky eval (#119)

Run `intake-github/no-criteria-section` three times on `main`. If it passes every time, close #119 as caused by the eval-runner bugs fixed in #116. If not, find the cause and fix it.

## Testing

| Change | Test |
| --- | --- |
| `runs.mjs`, trace | Unit tests: slim shape, same trace results as raw, size bound, XML untouched |
| PostToolUse hook | Unit tests: slims and traces; triage hint; silent outside a QA project |
| `checks.mjs`, `pipeline.mjs` | Unit tests per check, advance, attempts bound, waiting, autonomy gate, ledger line, tokens |
| Pipeline hooks | Unit tests on hook input and output for each event |
| Schemas | Validator tests: pipelines with check names; plan agent estimate |
| Scoring | Unit tests: sandbox never holds the answer key; matching and rates from fixed reports; scorecard generation and the in-step check |
| End to end | `seeded.mjs` on web and mobile, two runs each, within the budget |

## Not in scope

End-to-end tools (Phase 3): the 10 end-to-end-only seeded defects stay unfound and are reported as such. Azure DevOps and Jira. Scheduled runs (Phase 7).
