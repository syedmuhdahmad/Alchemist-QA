---
type: regex
target: { source: file, path: qa/plans/12.md }
# The plan estimates the department's own run, as well as human effort (#112).
pattern: "^estimate_agent_minutes: \\[\\d+(\\.\\d+)?, \\d+(\\.\\d+)?\\]$[\\s\\S]*^estimate_agent_usd: \\[\\d+(\\.\\d+)?, \\d+(\\.\\d+)?\\]$|^estimate_agent_usd: \\[\\d+(\\.\\d+)?, \\d+(\\.\\d+)?\\]$[\\s\\S]*^estimate_agent_minutes: \\[\\d+(\\.\\d+)?, \\d+(\\.\\d+)?\\]$"
flags: m
---
