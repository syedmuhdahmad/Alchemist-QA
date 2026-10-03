#!/usr/bin/env bash
# An issue exported from gh, because gh is not logged in here.
set -euo pipefail
cat > issue-31.json <<'ITEM'
{"number":31,"title":"Remember the shopper's cart between visits","url":"https://github.com/example/shop/issues/31","labels":[{"name":"enhancement"}],"body":"As a returning shopper I want my cart to still be there so that I do not have to find the items again.\n\n### Acceptance criteria\n\n- [ ] The cart is kept for 30 days after the last change.\n- [ ] A product that is no longer sold is removed from the kept cart, with the message \"Some items are no longer available\".\n- [ ] Signing in merges the kept cart with the account's cart, adding quantities up to 10 per line.\n\n### Design\n\n- See the Figma file."}
ITEM
