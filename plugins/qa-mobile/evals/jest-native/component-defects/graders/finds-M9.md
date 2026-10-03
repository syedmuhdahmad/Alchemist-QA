---
type: regex
target: { source: file, path: qa/runs/latest/unit-mobile.json }
# Seeded defect M9: any five characters are accepted as a postcode.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-60-04(?:[^\"\\\\]|\\\\.)*\"[^{}]*?\"status\":\"failed\""
---
