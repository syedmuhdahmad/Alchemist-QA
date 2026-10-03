---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# Seeded defect W5: an email with no top-level domain is accepted.
pattern: "\"fullName\":\"[^\"]*TC-50-05[^\"]*\",\"status\":\"failed\""
---
