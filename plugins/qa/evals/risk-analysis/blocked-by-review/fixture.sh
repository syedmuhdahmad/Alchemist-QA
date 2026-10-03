#!/usr/bin/env bash
# The review found a contradiction, so the work item is not ready. Risk analysis must not start.
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
  - A shopper can ask for a reset link by entering their email address.
  - The reset link expires 30 minutes after it is sent.
  - A reset link can be used for up to 24 hours.
---

As a shopper I want to reset my password so that I can get back into my account.
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
| F1 | contradiction | Criteria 2 and 3 | The link expires after 30 minutes but can be used for up to 24 hours. |

## Assumptions

None.

## Questions for the owner

1. F1: does a reset link stay valid for 30 minutes or for 24 hours?
ITEM
