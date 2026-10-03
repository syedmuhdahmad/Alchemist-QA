#!/usr/bin/env bash
# The benchmark web app with its seeded defects, an onboarded profile, and one GitHub issue exported from gh.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
app="$repo/evals/apps/web"
[[ -d "$app/node_modules/vitest" ]] || { echo "run npm ci in evals/apps/web first" >&2; exit 1; }
cp -r "$app/src" "$app/package.json" "$app/tsconfig.json" "$app/vite.config.ts" "$app/index.html" "$app/node_modules" .
mkdir -p qa
node "$repo/plugins/qa/skills/onboard/scripts/detect-stack.mjs" --write >/dev/null
# The requirements behind the issue are PRICE-2, PRICE-4, and PRICE-6 in evals/apps/REQUIREMENTS.md.
cat > issue-70.json <<'ITEM'
{"number":70,"title":"Promo code and shipping in the cart","url":"https://github.com/example/alchemy-shop/issues/70","labels":[{"name":"enhancement"}],"body":"As a shopper I want the cart to apply my promo code and work out shipping, so that I know what I will pay.\n\n## Acceptance criteria\n\n- Promo code SAVE10 takes 10% off every line whose product is not on sale. Products on sale are never discounted further.\n- Shipping is 4.99. It is free when the subtotal after the discount is 50.00 or more.\n- Every money amount is rounded to the nearest cent, with half a cent rounded up.\n\nThe pricing rules live in src/lib/pricing.ts."}
ITEM
