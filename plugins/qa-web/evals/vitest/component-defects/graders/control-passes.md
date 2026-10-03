---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# No seeded defect here: a test that fails would be a false alarm.
pattern: "\"fullName\":\"[^\"]*TC-50-07[^\"]*\",\"status\":\"passed\""
---
