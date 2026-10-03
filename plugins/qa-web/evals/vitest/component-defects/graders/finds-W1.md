---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# Seeded defect W1: an eleventh unit can be added.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-50-01(?:[^\"\\\\]|\\\\.)*\",\"status\":\"failed\""
---
