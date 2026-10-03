---
type: regex
target: { source: file, path: qa/runs/2026-10-03T10-00-00-unit-web.triage.md }
# The product adds 8% tax (24.30); A1 assumed none. The owner decides, so it is not yet a defect.
pattern: "TC-12-02[^\\n]*question"
---
