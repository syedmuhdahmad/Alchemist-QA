---
type: regex
target: { source: file, path: qa/trace.json }
# The item, a risk, a case with a test, and a failed result that points at a defect.
pattern: "\"work_item\": \"#70\"[\\s\\S]*\"id\": \"R-70-1\"[\\s\\S]*\"id\": \"TC-70-\\d+\"[\\s\\S]*\"result\": \"failed\",\\s*\"defect\": \"D-\\d{4}\""
---
