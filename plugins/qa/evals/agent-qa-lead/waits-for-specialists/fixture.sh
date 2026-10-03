#!/usr/bin/env bash
# A reviewed and risk-analysed work item, in a project that turns on agent teams, as the first field test did.
# With agent teams on, an Agent call that passes a name starts a teammate whose result never returns to the lead.
set -euo pipefail
mkdir -p qa/basis .claude
cat > .claude/settings.json <<'ITEM'
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
ITEM
cat > qa/basis/15.md <<'ITEM'
---
id: "#15"
source: github-issues
type: story
title: Lock an account after failed sign-ins
url: https://github.com/example/shop/issues/15
acceptance_criteria:
  - After 5 failed sign-ins in a row the account is locked for 15 minutes.
  - A successful sign-in resets the count of failed sign-ins.
---

As a shopper I want my account locked after repeated failed sign-ins, so a stranger cannot guess my password.
ITEM
cat > qa/basis/15.review.md <<'ITEM'
---
work_item: "#15"
verdict: ready
---

# Basis review: Lock an account after failed sign-ins

## Findings

None.

## Assumptions

None.

## Questions for the owner

None.
ITEM
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #15: Lock an account after failed sign-ins

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-15-1 | The lock starts one attempt late or early, so guessing gets an extra try or shoppers are locked out too soon | medium | high | high | Boundary values on the attempt count and the lock time; every case reviewed |
| R-15-2 | A successful sign-in does not reset the count, so a later single typo locks the account | medium | medium | medium | State transitions over fail, succeed, fail; sampled review |
ITEM
cat > qa/profile.yaml <<'ITEM'
stack:
  platforms: [web]
capabilities:
  unit-web: qa-web:vitest
tracker:
  type: github-issues
autonomy: L0
environments:
  local:
    url: http://localhost:3000
    allow: [functional]
ITEM
