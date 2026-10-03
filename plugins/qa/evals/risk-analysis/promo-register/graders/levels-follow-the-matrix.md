---
type: regex
target: { source: file, path: qa/risk-register.md }
# Fails on any row whose level does not equal likelihood x impact (low 1, medium 2, high 3; 1-2 low, 3-4 medium, 6-9 high).
pattern: "\\| (?:low \\| low|low \\| medium|medium \\| low) \\| (?:medium|high) \\||\\| (?:low \\| high|medium \\| medium|high \\| low) \\| (?:low|high) \\||\\| (?:medium \\| high|high \\| medium|high \\| high) \\| (?:low|medium) \\|"
match: not_contains
---
