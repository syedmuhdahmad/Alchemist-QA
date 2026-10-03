---
type: llm
focus: { source: file, path: qa/basis/41.acceptance.md }
---

PASS if there are scenarios at both ends of the range (quantity 1 with - disabled, quantity 10 with + disabled) and one for typing a number above 10 that expects 10, each with concrete values.
FAIL if any of these is missing or uses vague values.
