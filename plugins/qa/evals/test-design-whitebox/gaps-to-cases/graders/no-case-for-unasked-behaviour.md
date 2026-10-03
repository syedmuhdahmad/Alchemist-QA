---
type: regex
target: { source: file, path: qa/cases/30.md }
# The 14.99 rate for other countries is not in the basis, so no case may expect it.
pattern: "^\\| TC-30-\\d+ [^\\n]*14\\.99"
flags: m
match: not_contains
---
