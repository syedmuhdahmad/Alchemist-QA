---
type: regex
target: { source: file, path: qa/runs/latest/unit-mobile.json }
# Seeded defect M3: tax is worked out before the discount.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-60-03(?:[^\"\\\\]|\\\\.)*\"[^{}]*?\"status\":\"failed\""
---
