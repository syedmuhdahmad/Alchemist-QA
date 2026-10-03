#!/usr/bin/env bash
# An exported issue with no acceptance criteria heading.
set -euo pipefail
cat > issue-32.json <<'ITEM'
{"number":32,"title":"Checkout is slow","url":"https://github.com/example/shop/issues/32","labels":[{"name":"bug"}],"body":"Checkout takes ages on my phone. It should be fast.\n\n- Happens on 4G\n- Started last week"}
ITEM
