---
type: tool_used
tool: Agent
# Every specialist call says run_in_background: false. Leaving it out runs the specialist in the background in
# current Claude Code, and its result never comes back as the call's result.
input_match: "^(?=.*\"subagent_type\"\\s*:\\s*\"(?:qa:)?(?:test-|automation-|failure-))(?!.*\"run_in_background\"\\s*:\\s*false)"
min: 0
max: 0
---
