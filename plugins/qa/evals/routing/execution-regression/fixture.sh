#!/usr/bin/env bash
# A project that has run /qa:onboard, so the routing hook is on.
set -euo pipefail
mkdir -p qa
cat > qa/profile.yaml <<'PROFILE'
stack:
  platforms: [web]
capabilities:
  unit-web: qa-web:vitest
tracker:
  type: github-issues
autonomy: L0
PROFILE
