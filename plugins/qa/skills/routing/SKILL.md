---
name: routing
description: Use when deciding which QA specialist and skill should handle a request, or how deeply to test at a risk level (techniques, testware review, devices). Not for doing the test work, and not for bringing a work item in.
metadata:
  kind: tool
  freedom: low
---

# Routing

Which specialist handles a request, and how deeply each risk level is tested. The tables below are generated from `plugins/qa/routing.yaml`; never edit them by hand.

## Procedure

1. In a project with `qa/profile.yaml`, a hook (`scripts/route-hint.mjs`) adds a routing hint to each prompt that matches a route. It matches words, not meaning: check the hint against the request and the table below before acting on it.
2. Pick the route whose requests match the person's words. Hand the work to its agent with a packet, or use its skill yourself when you are that agent.
3. A work item id with no other signal goes to the route its id names. Ids are listed in the hint, whatever the route.
4. For each risk, test to the depth its level sets: these techniques at least, this much testware review, and these devices.

## Routes

<!-- generated:routes:start -->
| Route | Requests like | Agent | Skill |
| --- | --- | --- | --- |
| `lead.github` | github issue; this issue; the issue; through testing; take it through; up to the completion report; up to the report; or a GitHub issue id with no other match | `qa:qa-lead` | `qa:intake-github` |
| `lead.manual` | no ticket; there's no ticket; not in a tracker; no tracker; test risk; test the risk; request from the owner; up to the completion report; up to the report; or a risk from the register id with no other match | `qa:qa-lead` | `qa:intake-manual` |
| `analysis.basis-review` | testable; is this testable; testability; ready to test; review this story; review the story; review the requirements; ambiguous | `qa:test-analyst` | `qa:test-basis-review` |
| `analysis.risk` | what could go wrong; product risks; risk analysis; rate the risks; risks of; risks for; how risky | `qa:test-analyst` | `qa:risk-analysis` |
| `analysis.acceptance` | given when then; given/when/then; acceptance scenarios; gherkin; write acceptance criteria; propose acceptance criteria | `qa:test-analyst` | `qa:acceptance-criteria` |
| `design.blackbox` | test cases for; design test cases; design the test cases; boundary values; boundary value; equivalence partitions; decision table; state transitions; edge cases | `qa:test-analyst` | `qa:test-design-blackbox` |
| `design.whitebox` | coverage gaps; code coverage; uncovered branches; branch coverage; statement coverage; not covered by tests; lines are not covered | `qa:test-analyst` | `qa:test-design-whitebox` |
| `design.exploratory` | exploratory; explore; charter; session-based; test tour | `qa:test-analyst` | `qa:exploratory-testing` |
| `planning.plan` | test plan; plan the testing; plan testing; estimate the testing; how long will testing take; entry and exit criteria; exit criteria for | `qa:test-manager` | `qa:test-planning` |
| `implementation.unit-web` | automate; automated tests for; write the tests; unit tests; component tests; web app; react component; vitest | `qa:automation-engineer` | `qa-web:vitest` |
| `implementation.unit-mobile` | automate; automated tests for; write the tests; unit tests; component tests; mobile; mobile app; react native; screen component | `qa:automation-engineer` | `qa-mobile:jest-native` |
| `execution.triage` | tests failed; test failed; failing tests; failing test; test failures; make the tests pass; make it pass; flaky; triage; why did | `qa:failure-triager` | `qa:failure-triage` |
| `execution.defect` | defect report; bug report; report the defect; report this bug; file a bug; write up the bug; write up the defect | `qa:failure-triager` | `qa:defect-reporting` |
| `execution.regression` | which tests to run; which tests should i run; what should i rerun; tests to rerun; regression; confirmation test; after this change; changed files | `qa:automation-engineer` | `qa:regression-selection` |
| `design.review` | review the test cases; review these test cases; review the tests; review these tests; check the test cases; review the testware; independent review | `qa:test-reviewer` | `qa:test-design-blackbox` |
| `completion.report` | test report; completion report; progress report; can we stop testing; are we done testing; exit criteria met; ready to release; summary of the testing | `qa:test-manager` | `qa:test-reporting` |
| `monitoring.trace` | traceability; what is covered; what's covered; which risks have no; no test case; no tests; update the trace; trace.json | `qa:test-manager` | `qa:traceability` |
<!-- generated:routes:end -->

## Depth by risk level

<!-- generated:depth:start -->
| Risk | Techniques | Testware review | Devices and runs |
| --- | --- | --- | --- |
| low | equivalence-partitioning | none | Smoke: one browser and one Android phone |
| medium | equivalence-partitioning, boundary-value, decision-table, error-guessing | sampled | Regression: a phone and a tablet |
| high | equivalence-partitioning, boundary-value, decision-table, error-guessing, state-transition, exploratory | all | Full portfolio: browsers, Android, iOS, tablets, and the non-functional packs |
<!-- generated:depth:end -->

## Gotchas

- The person's words beat the hint. A hint is advice from keyword matching; when it conflicts with what was asked, follow what was asked and say why.
- No hint does not mean out of scope: no keyword matched. Route from the table yourself.
- When the hint offers two routes, such as web or mobile automation, pick by `qa/profile.yaml` and the files involved, or ask.
- Azure DevOps (`AB#123`) and Jira (`PROJ-45`) ids are recognised, but there is no intake adapter for them yet. Tell the person, and offer `intake-manual` instead.
