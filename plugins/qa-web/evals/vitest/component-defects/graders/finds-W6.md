---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# Seeded defect W6: removing a line lowers the count by 1.
pattern: "\"fullName\":\"[^\"]*TC-50-06[^\"]*\",\"status\":\"failed\""
---
