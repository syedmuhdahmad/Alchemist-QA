---
name: intake-github
description: Use when a GitHub issue must be brought into QA as a test basis file, or when test results for a GitHub issue are to be prepared for posting back to it. Not for Azure DevOps or Jira work items, and not for reviewing the issue's content.
metadata:
  kind: tool
  freedom: low
---

# GitHub Issues intake

Read a GitHub issue into `qa/basis/<number>.md`, and draft the comment and defect issues that go back to it. Both run as scripts with fixed parameters. Nothing is posted: a person reads the drafts and posts them.

## Procedure

### Read an issue

1. From the project root, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/github-issue.mjs" <number> [--repo owner/name]
   ```

   It prints the path of the basis file it wrote. The work item id is `#<number>`; the file is `qa/basis/<number>.md`.
2. If `gh` is not installed or not logged in, ask the person to export the issue with `gh issue view <number> --json number,title,url,body,labels > issue-<number>.json`, or use an export they already have, and run the script with `--from-json issue-<number>.json`.
3. Acceptance criteria are taken only from list items under a heading named "Acceptance criteria". If the basis file has none, say so: the basis review will flag it. Never add criteria to the basis file yourself.
4. Reply with the path, the title, and the number of criteria. The next step is the basis review.

### Prepare the write-back

1. When a report exists for the issue, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/github-writeback.mjs" <number> --report qa/reports/<number>.md [--repo owner/name]
   ```

   It writes `qa/outbox/<number>-comment.md`, and `qa/outbox/D-<n>-issue.md` for each defect report whose status is `approved`. It prints the `gh` commands that would post them.
2. Show the person the drafts and the commands. Do not run the commands. Posting is a person's decision while the department runs with human review.
3. Defect reports still in `draft` are listed as waiting for review. Approving one means a person changes its `status` to `approved`.

## Gotchas

- In a sandbox, CI job, or fresh machine, `gh` is often not logged in, and `gh issue view` fails with an authentication error rather than "not found". Use `--from-json` instead of retrying.
- The script names the file after the issue number (`12.md`), while the frontmatter keeps the tracker's form (`"#12"`). Use `#12` when you talk about the work item and in `--item` arguments, and `12` in file paths.
