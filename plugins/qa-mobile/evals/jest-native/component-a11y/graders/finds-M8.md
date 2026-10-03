---
type: regex
target: { source: file, path: qa/runs/latest/unit-mobile.json }
# Seeded defect M8: the add-to-cart button has no useful accessible name.
pattern: "\"fullName\":\"[^\"]*TC-61-01[^\"]*\"[^{}]*?\"status\":\"failed\""
---
