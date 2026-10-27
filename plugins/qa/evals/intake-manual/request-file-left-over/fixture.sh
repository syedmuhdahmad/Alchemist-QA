#!/usr/bin/env bash
# A request file left behind by an earlier intake that stopped before writing its basis file.
set -euo pipefail
mkdir -p qa/inbox
printf '# Risk register\n' > qa/risk-register.md
printf 'Title: Dark mode toggle\n\nAdd a dark mode toggle to the settings page.\n' > qa/inbox/request.md
