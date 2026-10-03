---
type: tool_used
tool: Bash
# Any Bash command that runs gh to comment, create an issue, or call the API, at its start or after && ; |
input_match: "\"command\"\\s*:\\s*\"(?:[^\"]*(?:&&|;|\\|)\\s*)?gh (?:issue (?:comment|create)|api)"
min: 0
max: 0
---
