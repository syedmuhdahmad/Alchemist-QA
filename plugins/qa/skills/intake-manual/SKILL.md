---
name: intake-manual
description: Use when a work item that no tracker holds must be brought into QA as a test basis file, such as a risk from the risk register or a request a person typed in chat. Not for GitHub issues, Azure DevOps or Jira work items, and not for reviewing the item's content.
metadata:
  kind: tool
  freedom: low
---

# Manual intake

Bring a work item that is in no tracker into `qa/basis/REQ-<n>.md`, with a true source and the words it came from. A script picks the id and writes the file. Nothing else writes it.

## Procedure

### A risk from the register

1. From the project root, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/manual-item.mjs" --from-risk <risk id>
   ```

   It copies that row of `qa/risk-register.md` into a new basis file, with no acceptance criteria, and prints the file's path.

### A request typed in chat

1. Pass the person's request word for word, with a short title in their words, on standard input:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/manual-item.mjs" --title "<title>" --request-file - <<'REQUEST'
   <the request, exactly as the person wrote it>
   REQUEST
   ```

   It prints the file's path.
2. If the request came from somewhere other than this chat, such as an email or a meeting, add `--origin "<where>"`. If it reports a defect, add `--type bug`; if it is a user story, `--type story`. Otherwise leave both out.

### After either

1. Use the id the script printed, such as `REQ-1`, as the work item id from now on: in `--item` arguments, in the risk ids `R-REQ-1-<n>`, the case ids `TC-REQ-1-<nn>`, and the file name `REQ-1`.
2. Reply with the path, the id, the title, and the number of acceptance criteria. If there are none, say so: the basis review will flag it. The next step is the basis review.

## Gotchas

- Never write or edit a basis file yourself, and never add acceptance criteria the person did not write. A risk row has none: the basis review finds that and writes assumptions for the owner to confirm.
- A GitHub issue (`#12`) goes to `intake-github`, even when `gh` is not logged in, because it can read an exported issue.
- Acceptance criteria are read only from a list under a line "Acceptance criteria", as a heading or a line on its own. Criteria written any other way stay in the body, where the review finds them.
- The script never reuses an id, even one whose basis file was deleted, and never overwrites a file. If it refuses, report its message rather than writing the file another way.
