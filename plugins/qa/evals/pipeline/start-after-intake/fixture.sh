#!/usr/bin/env bash
set -euo pipefail
mkdir -p qa/basis qa/state
cat > qa/profile.yaml <<'PROFILE'
stack:
  platforms: [web]
capabilities:
  unit-web: qa-web:vitest
tracker:
  type: github-issues
autonomy: L0
PROFILE
printf -- '---\nid: "#12"\nsource: github-issues\ntype: story\ntitle: "Promo codes"\nacceptance_criteria: ["SAVE10 takes 10%% off items not on sale"]\n---\n\n# #12: Promo codes\n' > qa/basis/12.md
