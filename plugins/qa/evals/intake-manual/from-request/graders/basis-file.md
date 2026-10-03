---
type: regex
target: { source: file, path: qa/basis/REQ-1.md }
pattern: "^source: manual$[\\s\\S]*^origin: \"[^\"]*request[^\"]*\"$[\\s\\S]*^acceptance_criteria:\\n  - \"A new address gets a confirmation email within 5 minutes\\.\"\\n  - [^\\n]+\\n  - [^\\n]+\\n[a-z_]+:"
flags: m
---
