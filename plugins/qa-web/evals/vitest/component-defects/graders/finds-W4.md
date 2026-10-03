---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# Seeded defect W4: money is rounded down.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-50-04(?:[^\"\\\\]|\\\\.)*\",\"status\":\"failed\""
---
