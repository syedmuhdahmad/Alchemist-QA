---
type: regex
target: { source: file, path: qa/cases/12.md }
# Fails when a case row's Risk cell is not one of the work item's risk ids.
pattern: "^\\| TC-12-\\d+ \\| [^|\\n]* \\| (?!R-12-\\d)"
flags: m
match: not_contains
---
