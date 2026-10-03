#!/usr/bin/env bash
# A work item whose review found a contradiction.
set -euo pipefail
mkdir -p qa/basis
cat > qa/basis/14.md <<'ITEM'
---
id: "#14"
source: github-issues
type: story
title: Reset a forgotten password
url: https://github.com/example/shop/issues/14
acceptance_criteria:
  - The reset link works for 30 minutes.
  - The reset link expires after 24 hours.
---

As a shopper who forgot my password I want to reset it.
ITEM
cat > qa/basis/14.review.md <<'ITEM'
---
work_item: "#14"
verdict: not-ready
---

# Basis review: Reset a forgotten password

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | contradiction | Criteria 1 and 2 | The link is valid for 30 minutes in one criterion and 24 hours in the other. |

## Assumptions

None.

## Questions for the owner

1. F1: how long is the reset link valid: 30 minutes or 24 hours?
ITEM
