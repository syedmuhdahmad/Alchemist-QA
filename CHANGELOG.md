# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

Phase 1: method and staff.

### Added

- Six agents in `qa`: `qa-lead`, `test-analyst`, `automation-engineer`, `failure-triager`, `test-reviewer`, and `test-manager`.
- Method skills from CTFL v4.0.1: `test-basis-review`, `risk-analysis`, `acceptance-criteria`, `test-design-blackbox` (with references for partitions, boundary values, decision tables, and state transitions), `test-design-whitebox`, `exploratory-testing`, `test-planning`, `regression-selection`, `failure-triage`, `defect-reporting`, `test-reporting`, and `traceability`.
- `traceability` script: builds `qa/trace.json` from the risk register, case files, test titles, run results (Jest-format JSON or JUnit XML), and defect reports, and reports coverage gaps.
- `intake-github`: reads an issue into a basis file (now also from a saved `gh` export with `--from-json`), and drafts the comment and defect issues for a person to post. It never posts.
- `/qa:onboard`: detects the stack and drafts `qa/profile.yaml`, checks tool dependencies, drafts a first risk register, and offers permission rules.
- Plugins `qa-web` (`vitest`) and `qa-mobile` (`jest-native`) for unit and component tests, each with `ensure-deps.sh` and `run.sh`.
- Testware contract (`docs/testware.md`) for every `qa/` file, with schemas for cases, acceptance scenarios, plans, defects, and reports.
- Agent rules in `tools/lint-skills`.
- Eval cases: three per skill, one per agent, and `evals/integration/` for cases that need more than one plugin, including the phase 1 exit check.
- `NOTICE` now credits the third-party files that came with the React Native template.
- `intake-manual`: brings a work item that no tracker holds, such as a risk from the register or a request typed in chat, into `qa/basis/REQ-<n>.md` with `source: manual` and where it came from. The id is never reused (#110).
- A third report verdict, `awaiting-owner`, with the open assumptions it waits on in `awaiting` (#111).
- Assumptions in a basis review carry the owner's answer: `open`, `confirmed <date>`, or `corrected <date>`. The analyst records the owner's words and updates the cases that cite a corrected assumption (#111).
- The trace lists the open assumptions that cases rest on (`awaiting_owner`) and those cases (`provisional`).

### Changed

- The benchmark apps now have Vitest and Testing Library (web) and React Native Testing Library (mobile) as dev dependencies, so the department can test them.
- The GitHub intake script moved into the `intake-github` skill.
- `test-reporting` judges the exit criteria without the provisional cases, then says `not-met`, `awaiting-owner`, or `met`, in that order. A failure classed `question` alone no longer makes a report `not-met`. A report without a plan is never `met` (#111, #115).
- Failure triage classes a failure `question` only while its assumption is open.
- `qa-lead` routes a risk or a typed request to `intake-manual`, always leaves a report on disk when it stops early, and sends the owner's answers to the analyst (#110, #111).

### Fixed

- `qa-lead` starts specialists as plain subagents and waits for their results. With agent teams on, it used to name them, which started teammates whose results never reached it, so it watched files in shell loops instead (#109).
- `qa-lead` has a plan step, after test design and before automation, so the exit criteria are set before any test runs (#115).
- `tools/eval-headless` grades the agent's real final reply: it keeps the last reply when the result is empty, reads it from the session transcript when the agent waited on a background agent, and fences it off in the judge's prompt, so a reply that asks the owner a question is graded rather than answered.
- `trace.mjs` no longer reports a case as passed when one of its tests failed. Within one run a case now takes the worst result of its tests; before, the last test in the file decided (#107).
- `trace.mjs` skips the `## Product: first pass` draft that `/qa:onboard` writes, so its risks no longer show as risks without cases (#108).
- `intake-manual` no longer passes a typed request through the shell. The agent writes the request, its title, and its origin to `qa/inbox/request.md` with its Write tool, and `manual-item.mjs --from-request` reads that file and removes it. Before, a line `REQUEST` in the request ended the heredoc early and the shell ran the lines after it, and `$(...)` in a title ran too. The script's `--title`, `--request-file`, `--origin`, and `--type` flags are gone, and it refuses any argument it does not know. A request file left from an intake that did not finish is never overwritten: the agent asks the person whether to bring it in first or replace it (#117).
- The drafted GitHub comment leaves out **Waiting on the owner** when the section says "None.", so `met` and `not-met` comments no longer carry an empty section (#118).

## [0.0.1] - 2026-10-03

Phase 0: foundations. No agents or test skills yet.

### Added

- Marketplace `alchemist-qa` with the core plugin `qa` and its `/qa:about` skill.
- Authoring standard (`docs/authoring.md`) and `tools/lint-skills`, which enforces it.
- Schemas for `routing.yaml`, `pipelines.yaml`, `qa/profile.yaml`, basis files, and `qa/trace.json`, with `tools/validate-testware`.
- Benchmark product "Alchemy Shop": requirements, an API, a React web app, and a bare React Native app, each client with 10 seeded defects and an answer key that proves them.
- Verification of the Claude Code features the design relies on (`docs/claude-code-verification.md`).
- Mobile end-to-end tool spike (`docs/spikes/mobile-e2e.md`).
