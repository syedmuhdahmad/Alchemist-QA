---
type: regex
target: { source: file, path: qa/runs/latest/unit-web.json }
# No seeded defect here.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-51-02(?:[^\"\\\\]|\\\\.)*\",\"status\":\"passed\""
---
