---
type: regex
target: { source: file, path: qa/defects/D-0001.md }
pattern: "^id: D-0001$[\\s\\S]*^cases: \\[TC-12-01\\]$[\\s\\S]*^status: draft$[\\s\\S]*^## Steps to reproduce[\\s\\S]*^## Expected[\\s\\S]*^## Actual"
flags: m
---
