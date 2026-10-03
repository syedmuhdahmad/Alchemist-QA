---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# Seeded defect W8: the quantity input has no accessible name.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-51-01(?:[^\"\\\\]|\\\\.)*\",\"status\":\"failed\""
---
