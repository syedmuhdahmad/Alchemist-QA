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
mkdir -p qa/charters
cat > qa/charters/20-1.md <<'ITEM'
# Charter 20-1: Place an order

Mission: explore placing an order with slow, failing, and repeated submissions to discover whether an order can be sent twice or lost.

Risks: R-20-1, R-20-2. Time box: 60 minutes.

## Raw notes

- 10:02 placed order with 2 items, got "Order placed" A-1001. cart empty. fine
- 10:09 throttled network to 3G, clicked Place order twice fast -> two orders in the server log, A-1002 and A-1003!! button did not grey out
- 10:20 server returns 500 -> app said "Order placed" with number "pending" and cart emptied. bad
- 10:31 unsure: should the form keep the email if the order fails? story says nothing
- 10:40 rotated the phone during sending, nothing odd
- 10:48 idea: what about the back button right after placing?
- stopped 10:55, mostly on mission, maybe 15 min setting up throttling
ITEM
