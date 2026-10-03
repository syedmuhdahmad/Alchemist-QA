---
type: llm
focus: { source: file, path: qa/risk-register.md }
---

Each risk row has a likelihood, an impact, and a level, each one of low, medium, or high. Score low as 1, medium as 2, high as 3, and multiply likelihood by impact: 1 or 2 is low, 3 or 4 is medium, 6 or 9 is high.

PASS if every row's level matches that rule and at least one risk about the amount the shopper pays (a wrong discount or total) is rated high.
FAIL if any row's level breaks the rule, or no risk about the amount paid is high.
