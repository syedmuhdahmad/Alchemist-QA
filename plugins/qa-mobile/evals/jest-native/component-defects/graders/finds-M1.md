---
type: regex
target: { source: file, path: qa/runs/latest/unit-mobile.json }
# Seeded defect M1: the quantity can go below 1.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-60-01(?:[^\"\\\\]|\\\\.)*\"[^{}]*?\"status\":\"failed\""
---
