---
type: regex
target: { source: file, path: qa/cases/12.md }
# A medium or high risk with a range and combined conditions needs both a decision table and boundary values.
pattern: "\\| decision-table \\|[\\s\\S]*\\| boundary-value \\||\\| boundary-value \\|[\\s\\S]*\\| decision-table \\|"
---
