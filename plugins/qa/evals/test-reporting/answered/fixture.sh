#!/usr/bin/env bash
# The same results as awaiting-owner, but the owner has confirmed the assumption they rest on.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../awaiting-owner/fixture.sh"
sed -i 's/^- A1 (covers F1, open):/- A1 (covers F1, confirmed 2026-10-04):/; s/^1. F1: is free shipping judged on the subtotal before or after the discount?$/1. F1: is free shipping judged on the subtotal before or after the discount? (answered 2026-10-04)/' qa/basis/12.review.md
