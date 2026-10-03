---
type: llm
---

PASS if the selection includes test/pricing.test.ts (direct) and test/checkout.test.ts (checkout imports pricing, and covers a high risk), and leaves out test/validation.test.ts as unrelated.
FAIL if either pricing or checkout tests are missing, or validation tests are selected without a stated reason.
