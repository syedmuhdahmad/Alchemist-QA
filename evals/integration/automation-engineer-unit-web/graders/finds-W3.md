---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# Seeded defect W3: SAVE10 discounts sale products.
pattern: "\"fullName\":\"[^\"]*TC-50-03[^\"]*\",\"status\":\"failed\""
---
