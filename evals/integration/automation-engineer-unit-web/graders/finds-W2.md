---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# Seeded defect W2: shipping is charged at exactly 50.00.
pattern: "\"fullName\":\"[^\"]*TC-50-02[^\"]*\",\"status\":\"failed\""
---
