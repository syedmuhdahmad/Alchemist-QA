# Owner answers, plans, and manual intake: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix #110, #111, and #115: manual work items get a true source, reports can say `awaiting-owner`, and the lead plans before automation.

**Architecture:** Deterministic parts are scripts with unit tests: `manual-item.mjs` for intake, and `trace.mjs` for which cases rest on open assumptions. Judgement parts are skill and agent text, each pinned by an eval case that fails on `main` first.

**Tech Stack:** Node 22 ESM scripts with no npm dependencies, `node:test`, Ajv 2020 in `tools/validate-testware`, and eval cases run with `tools/eval-headless`.

**Spec:** `docs/specs/2026-10-04-owner-answers-plans-manual-intake.md`

## Global Constraints

- Plugin scripts have no npm dependencies, and are invoked as `node "${CLAUDE_SKILL_DIR}/scripts/<name>.mjs"`.
- Values: `source: manual`, ids `REQ-<n>`, statuses `open`, `confirmed <date>`, `corrected <date>`, verdict `awaiting-owner`, frontmatter key `awaiting`, and coverage keys `awaiting_owner` and `provisional`.
- Nothing is posted, and no product code is changed by any agent.
- Every skill keeps at least 3 eval cases (`tools/lint-skills`). `npm run check` and `claude plugin validate --strict` pass at the end.
- Commit messages are Conventional Commits, ending with the co-author line.

## Review Focus

1. A Basis cell that cites several assumptions, or an assumption with a sub-part, such as `Criterion 2, A4` or `A1(c)`, rests on every id cited. Owned by Task 2.
2. A review written before this change, with no status in its assumptions, counts every assumption as open. Owned by Task 2.
3. A case that cites an assumption the review does not define, or that has no review at all, is treated as open, not as confirmed. Owned by Task 2.
4. A register row whose risk text has quotes, a colon, or backticks gives a basis file whose frontmatter still parses. Owned by Task 3.
5. A typed request that contains a `---` line or an `## Acceptance criteria` heading keeps its body intact, and only that list becomes criteria. A project with no `qa/` folder yet gets `REQ-1`. Owned by Task 3.

---

### Task 1: Schemas

**Files:**

- Modify: `plugins/qa/schemas/basis.schema.json`, `report.schema.json`, `trace.schema.json`
- Modify: `plugins/qa/schemas/examples/basis/12.review.md`, `reports/12.md` (stay valid)
- Test: `tools/validate-testware/validate-testware.test.mjs`

**Interfaces:**

- Produces:
  - Basis: `source` gains `manual`. When `source` is `manual`, `origin` (non-empty string) is required and `id` must match `^REQ-[0-9]+$`. `created_at` is an optional string.
  - Report: `exit_criteria` gains `awaiting-owner`. `awaiting` is an array, at least one item, each `^A[0-9]+$`. It is required when `exit_criteria` is `awaiting-owner` and forbidden otherwise.
  - Trace: a case may have `rests_on` (array of `^A[0-9]+$`). An item may have `assumptions` (array of `{id, status}`, with `status` one of `open`, `confirmed`, `corrected`).

- [ ] **Step 1: Write failing validator tests**

  - `a manual basis file with an origin is valid`
  - `a manual basis file needs an origin`
  - `a manual basis id is REQ-<n>`
  - `an awaiting-owner report lists what it waits for`
  - `an awaiting-owner report without awaiting is rejected`
  - `awaiting is rejected on a met report`
  - `a trace case may rest on assumptions`

- [ ] **Step 2: Run `node --test tools/validate-testware/` and confirm that only the new tests fail**
- [ ] **Step 3: Change the three schemas**

  Use `allOf` with two `if`/`then` pairs in the report schema. The `awaiting-owner` `if` must also have `required: ["exit_criteria"]`, so a progress report is not caught by it.

- [ ] **Step 4: Run `npm test` (all pass) and `npm run lint:testware` (examples still valid)**
- [ ] **Step 5: Commit `feat: schema support for manual items and awaiting-owner reports`**

### Task 2: Trace knows which results rest on open assumptions

**Files:**

- Modify: `plugins/qa/skills/traceability/scripts/trace.mjs`
- Modify: `plugins/qa/skills/traceability/SKILL.md`
- Test: `plugins/qa/tests/trace.test.mjs`

**Interfaces:**

- Consumes: Task 1's trace shape.
- Produces:
  - `buildTrace(root)`: a case gains `rests_on` only when non-empty. An item gains `assumptions` when a review for it exists, matched by the review's frontmatter `work_item`.
  - `coverage(trace, item)`: the result gains `awaiting_owner` (sorted assumption ids) and `provisional` (case ids). `complete` ignores both.
  - The CLI prints both lists like the others.

- [ ] **Step 1: Write failing tests**
  - `a case rests on every assumption its Basis cites` covers `Criterion 2, A4` giving `[A4]`, `A1(c)` giving `[A1]`, and `A11Y-1` giving nothing.
  - `assumption statuses come from the review, and no status means open`
  - `awaiting_owner lists open assumptions that cases rest on, passed or failed, and provisional lists those cases`
  - `confirmed and corrected assumptions do not wait`
  - `an assumption the review does not define, or a missing review, counts as open`
  - `awaiting_owner does not change complete`
- [ ] **Step 2: Run `node --test plugins/qa/tests/trace.test.mjs` and confirm that only the new tests fail**
- [ ] **Step 3: Implement**
  - Parse the lines under `## Assumptions` that start with `- A<n> (`.
  - The status is the first of `open`, `confirmed`, or `corrected` inside the parenthesis, and `open` when none is there.
  - Assumption ids are `\bA(\d+)\b` in the Basis cell, column 4.
- [ ] **Step 4: Run the trace tests and then `npm test`, and confirm everything passes**
- [ ] **Step 5: Update the traceability skill text (the source table and the coverage keys), then commit `feat: trace lists results that rest on open assumptions`**

### Task 3: `manual-item.mjs`

**Files:**

- Create: `plugins/qa/skills/intake-manual/scripts/manual-item.mjs`
- Modify: `plugins/qa/skills/intake-github/scripts/github-issue.mjs` (export `acceptanceCriteria`)
- Test: `plugins/qa/tests/manual-item.test.mjs`

**Interfaces:**

- Produces:
  - `nextRequestId(root): string`, such as `REQ-3`. It is one more than the highest `REQ-<n>` found in file names under `qa/basis`, `qa/cases`, `qa/plans`, `qa/reports`, `qa/state`, and `qa/charters`, and in `## REQ-<n>` headings of `qa/risk-register.md`.
  - `fromRisk(registerText, riskId, {id, now}): string`: the basis file text. It throws when the risk is missing or appears twice.
  - `fromRequest(requestText, {id, title, origin = 'request in chat', type = 'task', now}): string`: the basis file text.
  - CLI: `--from-risk <id>` or `--title <t> --request-file <file|->`, with `[--origin <text>] [--type story|bug|task] [--root <dir>]`. It prints the written path. On a usage error, unknown risk, or existing file it writes nothing and exits 2.

- [ ] **Step 1: Write failing tests**
  - `a risk row becomes REQ-1 with source manual, origin, type task, no criteria, and the row quoted`
  - `the number follows the highest REQ id used anywhere in qa/, never reusing one`
  - `a project with no qa folder gets REQ-1`
  - `an unknown risk id exits 2 and writes nothing`
  - `a request keeps its text, and only its Acceptance criteria list becomes criteria`
  - `quotes, colons, backticks, and a --- line survive`
  - `--origin and --type override the defaults`
  - `the result validates against the basis schema`
- [ ] **Step 2: Run `node --test plugins/qa/tests/manual-item.test.mjs` and confirm the tests fail because the module is missing**
- [ ] **Step 3: Implement**
  - Use JSON-quoted scalars, as `github-issue.mjs` does.
  - Write with `writeFileSync(path, text, { flag: 'wx' })`, so an existing file is never overwritten.
- [ ] **Step 4: Run the new tests and then `npm test`, and confirm everything passes**
- [ ] **Step 5: Commit `feat: manual-item script for work items with no tracker`**

### Task 4: `intake-manual` skill and the lead's intake step

**Files:**

- Create: `plugins/qa/skills/intake-manual/SKILL.md` (kind `tool`, freedom `low`)
- Create: `plugins/qa/evals/intake-manual/{from-risk,from-request,github-issue-not-manual}/`
- Modify: `plugins/qa/agents/qa-lead.md` (step 1, inputs, preload `intake-manual`)

- [ ] **Step 1: Write the three eval cases**
  - `from-risk` and `from-request` check:
    - `qa/basis/REQ-1.md` exists, with `^source: manual$` and an `^origin:` line naming the source;
    - Bash ran `manual-item\.mjs`;
    - Write was never used on `qa/basis` (`min: 0, max: 0`).
  - `github-issue-not-manual` gives an exported issue JSON and asks to bring in `#12`. `qa/basis/12.md` must exist and `qa/basis/REQ-1.md` must not.
- [ ] **Step 2: Run them on `main`'s plugin and confirm they fail, since the skill does not exist there yet**
- [ ] **Step 3: Write the skill, and the lead's step 1**

  The lead uses `intake-github` for a GitHub issue, and `intake-manual` for a risk from the register or a request typed in chat. It never writes a basis file itself.

- [ ] **Step 4: Run the three cases and confirm they pass; `npm run lint:skills` is clean**
- [ ] **Step 5: Commit `feat: intake-manual brings in work items that are not in a tracker`**

### Task 5: The owner's answers in the basis review, and triage

**Files:**

- Modify: `plugins/qa/skills/test-basis-review/SKILL.md`, `templates/review.md`
- Modify: `plugins/qa/skills/failure-triage/SKILL.md`
- Create: `plugins/qa/evals/test-basis-review/record-answers/`

- [ ] **Step 1: Write the eval case**

  The fixture has a review with A1 and A2 open. The prompt gives the owner's words: A1 is right, and A2 is wrong, the rule is X.

  - Graders: `A1 \(covers F1, confirmed`, and `A2 \(covers F2, corrected` with X in A2's text.
  - An llm grader checks that no other assumption changed status.

- [ ] **Step 2: Run on `main` and confirm it fails**
- [ ] **Step 3: Change the skill**
  - New assumptions are written `(covers F<n>, open)`.
  - A section "Record the owner's answers" covers status and date, takes a correction's text from the owner, never changes a status on the agent's own judgement, and names the cases that cite a corrected assumption.
  - Failure triage classes a failure `question` only while its assumption is `open`.
- [ ] **Step 4: Run the case and `failure-triage/assumption-not-defect`, and confirm both pass**
- [ ] **Step 5: Commit `feat: the owner confirms or corrects assumptions in the basis review`**

### Task 6: Reports can say `awaiting-owner`, and a report without a plan is never met

**Files:**

- Modify: `plugins/qa/skills/test-reporting/SKILL.md`, `templates/report.md`
- Modify: `plugins/qa/agents/test-manager.md` (return line)
- Modify: `plugins/qa/skills/intake-github/scripts/github-writeback.mjs`
- Test: `plugins/qa/tests/github-writeback.test.mjs`
- Create: `plugins/qa/evals/test-reporting/{awaiting-owner,question-failures,answered,no-plan}/`
- Modify: `plugins/qa/evals/test-reporting/all-passed/fixture.sh` (add a plan)

**Interfaces:**

- Consumes: Task 2's `awaiting_owner` and `provisional` coverage output.
- Produces: the verdict order from the spec, section 3.

- [ ] **Step 1: Write the four eval cases, and add the plan to `all-passed`**

  The expected verdicts are:

  | Case | Verdict |
  | --- | --- |
  | `awaiting-owner` | `awaiting-owner` with `A1` |
  | `question-failures` | `awaiting-owner`, not `not-met` |
  | `answered` | `met` |
  | `no-plan` | `not-met` |

  Each case also has an llm grader that checks the Waiting on the owner section, or the missing-plan criterion.

- [ ] **Step 2: Run the five cases on `main` and confirm the four new ones fail**
- [ ] **Step 3: Write a failing unit test**

  The test is `an awaiting-owner report leads with the assumptions it waits on and carries that section`. Run it and confirm it fails.

- [ ] **Step 4: Implement**
  - The skill text gets the verdict order, the provisional-case rule, and the no-plan criterion.
  - The template gets the `awaiting` line and the Waiting on the owner section.
  - The write-back headline and sections handle `awaiting-owner`.
  - The test manager's return line names the new verdict.
- [ ] **Step 5: Run the unit tests and the five cases, plus `not-met` and `progress-only`, and confirm they pass**
- [ ] **Step 6: Commit `feat: reports wait for the owner instead of saying met or not-met`**

### Task 7: The plan step

**Files:**

- Modify: `plugins/qa/skills/test-planning/SKILL.md`, `templates/plan.md`
- Modify: `plugins/qa/agents/qa-lead.md` (steps 1 to 7, report on early stop, recording the owner's answers, return line)
- Modify: `plugins/qa/schemas/examples/pipelines.yaml` (`plan` stage)
- Create: `plugins/qa/evals/agent-qa-lead/plans-before-automation/`
- Modify: `plugins/qa/evals/agent-qa-lead/stops-at-gate/graders/` (add `progress-report`)

- [ ] **Step 1: Write the eval case `plans-before-automation`, and the new `stops-at-gate` grader**
  - `plans-before-automation`: the fixture has the basis, review, risks, and cases done. The prompt is "Use the qa-lead agent to get #15 ready for automation; stop before any test is written".
    - Graders: `qa/plans/15.md` exists;
    - no Write to a `.test.` or `.spec.` file;
    - no Agent call for `automation-engineer`.
  - `stops-at-gate`'s new grader checks that `qa/reports/14.md` exists, with `^kind: progress$`.
- [ ] **Step 2: Run both on `main` and confirm they fail**
- [ ] **Step 3: Implement**
  - Planning gets the exit criterion for open assumptions.
  - The lead:
    - gets the new step table;
    - always leaves a report on disk;
    - routes the owner's answers to the analyst, then reruns the affected cases.
  - `pipelines.yaml` gets the `plan` stage.
- [ ] **Step 4: Run both cases and `waits-for-specialists`, and confirm they pass**
- [ ] **Step 5: Commit `fix: the lead plans before automation and always leaves a report`**

### Task 8: Docs, version, and the PR

**Files:**

- Modify: `docs/testware.md`, `CHANGELOG.md`, `plugins/qa/.claude-plugin/plugin.json` (0.1.2), `plugins/qa/skills/about/SKILL.md` (read the version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`)

- [ ] **Step 1: Update the docs**

  `docs/testware.md` gets the `REQ-<n>` identifier, the basis writers, the assumption statuses, the verdicts, and the coverage keys. Add the CHANGELOG entries.

- [ ] **Step 2: Bump the version and update the about skill**
- [ ] **Step 3: Check**

  `npm run check` passes, and `claude plugin validate --strict` passes for the marketplace and `qa`.

- [ ] **Step 4: Commit, push, and open the PR**

  The PR body has the eval table: each case before and after the change. It closes #110, #111, and #115.
