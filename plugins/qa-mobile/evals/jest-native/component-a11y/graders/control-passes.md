---
type: regex
target: { source: file, path: qa/runs/latest/unit-mobile.json }
# No seeded defect here.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-61-02(?:[^\"\\\\]|\\\\.)*\"[^{}]*?\"status\":\"passed\""
---
