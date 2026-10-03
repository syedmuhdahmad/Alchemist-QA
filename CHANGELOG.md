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

### Changed

- The benchmark apps now have Vitest and Testing Library (web) and React Native Testing Library (mobile) as dev dependencies, so the department can test them.
- The GitHub intake script moved into the `intake-github` skill.

## [0.0.1] - 2026-10-03

Phase 0: foundations. No agents or test skills yet.

### Added

- Marketplace `alchemist-qa` with the core plugin `qa` and its `/qa:about` skill.
- Authoring standard (`docs/authoring.md`) and `tools/lint-skills`, which enforces it.
- Schemas for `routing.yaml`, `pipelines.yaml`, `qa/profile.yaml`, basis files, and `qa/trace.json`, with `tools/validate-testware`.
- Benchmark product "Alchemy Shop": requirements, an API, a React web app, and a bare React Native app, each client with 10 seeded defects and an answer key that proves them.
- Verification of the Claude Code features the design relies on (`docs/claude-code-verification.md`).
- Mobile end-to-end tool spike (`docs/spikes/mobile-e2e.md`).
