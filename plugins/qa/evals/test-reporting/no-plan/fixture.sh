#!/usr/bin/env bash
# Every test passed, but no plan set exit criteria before testing.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../all-passed/fixture.sh"
rm qa/plans/12.md
