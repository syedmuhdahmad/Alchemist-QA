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
printf '%s\n' '{"pipeline":"feature","item":"#12","file":"12","status":"running","stage":"analysis","stages":{"intake":{"started":"2026-10-27T10:00:00.000Z","finished":"2026-10-27T10:05:00.000Z","attempts":0,"tokens":0},"analysis":{"started":"2026-10-27T10:05:00.000Z","attempts":0,"tokens":0}},"updated":"2026-10-27T10:05:00.000Z"}' > qa/state/12.pipeline.json
printf -- '---\nwork_item: "#12"\nverdict: ready\n---\n\n## Findings\n\n- F1 (contradiction): criterion 1 and criterion 3 disagree on sale items.\n\n## Assumptions\n\n## Questions for the owner\n\n- Does SAVE10 apply to sale items?\n' > qa/basis/12.review.md
printf '# Risk register\n\n## #12: Promo codes\n\n| Id | Risk | Likelihood | Impact | Level | Response |\n| --- | --- | --- | --- | --- | --- |\n| R-12-1 | SAVE10 discounts sale items | medium | high | high | Decision table |\n' > qa/risk-register.md
mkdir -p qa/cases
printf -- '---\nwork_item: "#12"\n---\n\n| Id | Title | Risk | Basis | Technique | Level | Expected |\n| --- | --- | --- | --- | --- | --- | --- |\n| TC-12-01 | SAVE10 skips sale items | R-12-1 | C1 | decision-table | component | No discount |\n' > qa/cases/12.md
