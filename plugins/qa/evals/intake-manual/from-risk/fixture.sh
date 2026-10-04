#!/usr/bin/env bash
# A risk from the onboard draft of the register, with no tracker item behind it.
set -euo pipefail
mkdir -p qa
cat > qa/risk-register.md <<'ITEM'
# Risk register

## Product: first pass

Draft from `/qa:onboard`. Each work item's own analysis replaces the rows it covers.

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-product-1 | Checkout charges a different total from the one shown, so shoppers are overcharged. | medium | high | high | Decision table over discounts and shipping; every case reviewed. |
| R-product-2 | Search misses products whose names have accents. | medium | medium | medium | Partitions over character sets. |
| R-product-3 | A newsletter sign-up adds an address without the double opt-in, so people get mail they never confirmed. | medium | high | high | State transitions over sign-up, confirm, and unsubscribe; every case reviewed. |
ITEM
