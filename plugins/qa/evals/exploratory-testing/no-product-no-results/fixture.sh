#!/usr/bin/env bash
# A reviewed, risk-rated checkout story.
set -euo pipefail
mkdir -p qa/basis
cat > qa/basis/20.md <<'ITEM'
---
id: "#20"
source: github-issues
type: story
title: Place an order
url: https://github.com/example/shop/issues/20
acceptance_criteria:
  - Choosing Place order sends the order to the server once. While it is being sent, the Place order button is disabled.
  - When the server accepts the order, the app shows "Order placed" with the order number and empties the cart.
  - When the server rejects the order or cannot be reached, the app shows "We could not place your order" and keeps the cart.
---

As a shopper I want to place my order so that the shop sends me my items.
ITEM
cat > qa/risk-register.md <<'ITEM'
# Risk register

## #20: Place an order

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-20-1 | The order is sent twice, so the shopper is charged twice. | medium | high | high | State transitions, error guessing, exploratory session. |
| R-20-2 | A failed order is shown as placed or empties the cart. | medium | high | high | State transitions, exploratory session. |
| R-20-3 | The confirmation text is hard to read on a small screen. | low | low | low | Checklist. |
ITEM
