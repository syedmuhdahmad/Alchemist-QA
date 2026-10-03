---
type: regex
target: { source: file, path: qa/risk-register.md }
# Reads each risk row from its id: | R-.. | risk | likelihood | impact | level |
# Fails when the level is not likelihood x impact (low 1, medium 2, high 3; 1-2 low, 3-4 medium, 6-9 high),
# or is not one of low, medium, or high.
pattern: "^\\| R-[^|\\n]*\\|[^|\\n]*\\| (?:(?:low \\| low|low \\| medium|medium \\| low) \\| (?:medium|high) \\||(?:low \\| high|medium \\| medium|high \\| low) \\| (?:low|high) \\||(?:medium \\| high|high \\| medium|high \\| high) \\| (?:low|medium) \\||(?:low|medium|high) \\| (?:low|medium|high) \\| (?!(?:low|medium|high) \\|)[^|\\n]*\\|)"
flags: m
match: not_contains
---
