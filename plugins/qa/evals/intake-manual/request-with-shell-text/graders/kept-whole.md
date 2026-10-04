---
type: regex
target: { source: file, path: qa/basis/REQ-1.md }
pattern: "NAME\\nREQUEST\\nCONFIRM\\n+On the REQUEST screen, the message box must keep exactly what was typed, even text like \\$\\(touch injected\\.txt\\) or `touch injected\\.txt`, and refuse messages over 500 characters\\."
---
