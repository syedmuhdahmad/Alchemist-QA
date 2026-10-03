---
type: llm
focus: { source: file, path: qa/cases/20.md }
---

PASS if a new case tries to place the order again while the first attempt is still being sent, and expects the order to be sent only once, and another new case covers placing the order successfully after a failed attempt.
FAIL if either is missing.
