---
type: regex
target: { source: file, path: qa/reports/12.md }
pattern: "^kind: completion$[\\s\\S]*^exit_criteria: not-met$|^exit_criteria: not-met$[\\s\\S]*^kind: completion$"
flags: m
---
