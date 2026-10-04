#!/usr/bin/env bash
# A GitHub issue, exported because gh is not logged in here. It belongs to intake-github, not intake-manual.
set -euo pipefail
cat > issue-12.json <<'ITEM'
{"number":12,"title":"Apply a promo code at checkout","url":"https://github.com/example/shop/issues/12","labels":[{"name":"enhancement"}],"body":"As a shopper I want to enter a promo code so that I pay less.\n\n## Acceptance criteria\n\n- SAVE10 takes 10% off every item that is not already on sale.\n- Codes are not case-sensitive."}
ITEM
