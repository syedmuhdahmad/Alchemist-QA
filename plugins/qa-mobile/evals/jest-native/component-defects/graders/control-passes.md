---
type: regex
target: { source: file, path: qa/runs/latest/unit-mobile.json }
# No seeded defect here: a failure would be a false alarm.
pattern: "\"fullName\":\"[^\"]*TC-60-05[^\"]*\"[^{}]*?\"status\":\"passed\""
---
