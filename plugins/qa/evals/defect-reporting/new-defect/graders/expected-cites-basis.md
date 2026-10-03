---
type: llm
focus: { source: file, path: qa/defects/D-0001.md }
---

PASS if Expected says shipping is free (0.00) at a subtotal of 50.00 and cites the criterion of #12; Actual says 4.99 was charged; and the severity is major or critical.
FAIL if Expected or Actual is vague, the basis is not cited, or the severity is minor or trivial.
