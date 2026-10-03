#!/usr/bin/env bash
# Work item with a contradiction (30 minutes against 24 hours), two unmeasurable terms, and no negative scenario.
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
  - The link is sent quickly.
  - A reset link can be used for up to 24 hours.
  - The new password must be strong.
---

As a shopper I want to reset my password so that I can get back into my account.
ITEM
