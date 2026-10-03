---
type: regex
target: { source: file, path: qa/runs/latest/unit-mobile.json }
# Seeded defect M2: promo codes are case-sensitive.
pattern: "\"fullName\":\"(?:[^\"\\\\]|\\\\.)*TC-60-02(?:[^\"\\\\]|\\\\.)*\"[^{}]*?\"status\":\"failed\""
---
