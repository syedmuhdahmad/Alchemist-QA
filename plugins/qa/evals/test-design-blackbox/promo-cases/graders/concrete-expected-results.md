---
type: llm
focus: { source: file, path: qa/cases/12.md }
---

PASS if every case gives concrete inputs (actual prices, quantities, or codes) and an expected result stated as exact values or an exact message, such as "discount 2.00, total 22.80" or "shows This code is not valid".
FAIL if any expected result is vague, such as "the discount is correct", "works as expected", or "an error is shown" without the message.
