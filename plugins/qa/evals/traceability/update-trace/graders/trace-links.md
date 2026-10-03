---
type: regex
target: { source: file, path: qa/trace.json }
# TC-12-01 failed and carries its defect; TC-12-02 passed.
pattern: "\"id\": \"TC-12-01\"[\\s\\S]*?\"result\": \"failed\",\\s*\"defect\": \"D-0001\"[\\s\\S]*\"id\": \"TC-12-02\"[\\s\\S]*?\"result\": \"passed\""
---
