---
type: tool_used
tool: Bash
input_match: ">>?[ \\t]*(?:\\\\?[\"'])?[^\\s\"'\\\\;&|<>]*\\.(?:test|spec)\\.[cm]?[jt]sx?\\b|\\b(?:tee|cp|mv|touch)\\b(?:[^\"\\\\;&|]|\\\\[^n])*?\\.(?:test|spec)\\.[cm]?[jt]sx?\\b|\\b(?:writeFile|appendFile|createWriteStream)(?:Sync)?\\s*\\((?:[^)\\\\]|\\\\[^n])*?\\.(?:test|spec)\\.[cm]?[jt]sx?\\b|\\bPath\\s*\\((?:[^)\\\\]|\\\\[^n])*?\\.(?:test|spec)\\.[cm]?[jt]sx?\\b(?:[^)\\\\]|\\\\[^n])*\\)\\s*\\.\\s*write_(?:text|bytes)\\b|\\bopen\\s*\\((?:[^)\\\\]|\\\\[^n])*?\\.(?:test|spec)\\.[cm]?[jt]sx?\\b(?:[^)\\\\]|\\\\[^n])*?,\\s*(?:mode\\s*=\\s*)?\\\\?[\"'][wax]"
min: 0
max: 0
---
