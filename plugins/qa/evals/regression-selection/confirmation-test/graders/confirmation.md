---
type: llm
---

Judge only which tests were selected and why; the test files in this project are stubs on purpose.
PASS if the selection includes test/validation.test.ts as a confirmation test for D-0007 (case TC-25-02), and does not select the pricing tests.
FAIL if the validation tests are missing, D-0007 is not mentioned, or pricing tests are selected without a reason.
