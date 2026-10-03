---
name: onboard
description: Use when the user runs /qa:onboard or asks to set a project up for the QA department for the first time. Not for testing a work item, and not for changing a profile that already exists.
disable-model-invocation: true
metadata:
  kind: command
  freedom: low
---

# Onboard a project

Set a project up for the department: its profile, its test tools, a first view of product risk, and the permissions a person may choose to grant. A person reviews each result before the department relies on it.

## Procedure

1. Draft the profile from the project root:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/detect-stack.mjs" --write
   ```

   It detects React web and React Native apps up to two folders down, their platforms, and the tracker from the git remote, and writes `qa/profile.yaml` with autonomy `L0`. It refuses to overwrite an existing profile: in that case, run it without `--write`, show the differences, and stop.
2. Show the profile and ask the person to check three things it cannot know: the tracker (Jira Cloud is never detected), the environments and what each may be used for, and the device list.
3. For each capability in the profile, check its tool's dependencies with the `ensure-deps` script that the capability's tool skill names (`qa-web:vitest` for `unit-web`, `qa-mobile:jest-native` for `unit-mobile`). Report what is missing with the install command. Install nothing without the person's yes.
4. Draft a first risk register. Read the product's README and any requirements document, list its main features, and for each feature write the risks that matter most, rated and responded to with the rules of the `risk-analysis` skill. Put them in `qa/risk-register.md` under exactly `## Product: first pass`, the heading the trace script skips, numbered `R-product-<n>`, and say they are a draft to be replaced by each work item's own analysis.
5. Offer the permission rules below for the project's own `.claude/settings.json`. A plugin cannot grant permissions, so this is the person's choice. Write them only if the person says yes, and merge them into any rules already there.

   ```json
   {
     "permissions": {
       "allow": [
         "Bash(node *trace.mjs *)",
         "Bash(bash *ensure-deps.sh *)",
         "Bash(bash *run.sh *)"
       ]
     }
   }
   ```

6. Reply with what was written, what is missing, and the next step: bring in a work item, for example with the `intake-github` skill.
