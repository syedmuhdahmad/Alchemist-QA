---
type: llm
focus: { source: file, path: qa/cases/30.md }
---

PASS if the file raises the 14.99 charge for countries other than "US" as a question for the owner, because the basis does not mention it, and adds cases for free shipping at 50.00 or more and for an empty cart.
FAIL if the country branch is treated as required behaviour, or either of the other two gaps has no case.
