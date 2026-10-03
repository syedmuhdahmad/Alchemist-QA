---
type: llm
focus: { source: file, path: qa/plans/release-1.4.md }
---

PASS if the plan covers both #12 and #15, its priority order puts R-12-1 (high) before R-15-1 (low), and #15 gets lighter testing than #12.
FAIL if either work item is missing, or the low risk is ordered before the high risk, or both get the same depth.
