#!/usr/bin/env bash
# A work item with its review, risks, and cases done, and no plan yet.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../waits-for-specialists/fixture.sh"
rm -f .claude/settings.json
mkdir -p qa/cases
cat > qa/cases/15.md <<'ITEM'
---
work_item: "#15"
---

# Test cases: Lock an account after failed sign-ins

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-15-01 | boundary-value | R-15-1 | Criterion 1 | component | 4 failed sign-ins in a row | Account not locked |
| TC-15-02 | boundary-value | R-15-1 | Criterion 1 | component | 5 failed sign-ins in a row | Account locked for 15 minutes |
| TC-15-03 | boundary-value | R-15-1 | Criterion 1 | component | Sign in 14:59 after the lock started | Refused: still locked |
| TC-15-04 | state-transition | R-15-2 | Criterion 2 | component | 4 failures, 1 success, 1 failure | Account not locked; count is 1 |
ITEM
