---
type: llm
focus: { source: file, path: qa/reports/70.md }
---

The app has three seeded defects in this area: SAVE10 also discounts products on sale; shipping is charged when the discounted subtotal is exactly 50.00; money is rounded down instead of to the nearest cent.
PASS if the report shows failing cases or defects for at least two of these three, and says the exit criteria are not met.
FAIL if it finds fewer than two, or says testing can stop.
