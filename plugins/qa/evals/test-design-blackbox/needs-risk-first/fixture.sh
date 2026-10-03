#!/usr/bin/env bash
# A reviewed work item with no risk analysis yet: design must wait for it.
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
  - Choosing "Forgot password" and entering a registered email sends a reset link to that address.
  - The reset link works once, and for 30 minutes after it is sent.
  - A new password must have at least 12 characters.
---

As a shopper who forgot my password I want to reset it so that I can sign in again.
ITEM
cat > qa/basis/14.review.md <<'ITEM'
---
work_item: "#14"
verdict: ready
---

# Basis review: Reset a forgotten password

## Findings

None.

## Assumptions

None.

## Questions for the owner

None.
ITEM
