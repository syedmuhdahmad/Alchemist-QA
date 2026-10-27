---
name: pipeline
description: Use when a work item is carried through the department's stages, to start its pipeline after intake, to check after a step whether the stage is done and what comes next, or to say where an engagement stands. Not for doing a stage's work, and not for bringing a work item in.
metadata:
  kind: tool
  freedom: low
---

# Pipeline

A script carries a work item through the stages in `plugins/qa/pipelines.yaml`, and checks each stage's exit criteria on the files in `qa/`. The state is in `qa/state/<file>.pipeline.json`. Hooks read the same state, and use the same checks.

## Procedure

1. Once intake has written `qa/basis/<file>.md`, start the `feature` pipeline from the project root, with the work item id in single quotes:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/pipeline.mjs" start feature --item '<work item id>' --file <file>
   ```

2. It prints the stage the work item is at: the agent, the skill, the checks that end the stage, and what is still missing. Hand that stage to its agent.
3. After each step, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/pipeline.mjs" next --file <file>
   ```

   It moves past every stage whose checks hold, and prints the next one. Do what it names.
4. When it says **waiting**, tell the person what it waits for, such as the owner's answer to a `not-ready` review, and stop.
5. When it says **stopped**, a stage failed its checks three times. Tell the person the reason it gives, and stop.
6. When it says **done**, every stage passed. Reply with the report's path and verdict.
7. To say where every engagement stands, run `pipeline.mjs status`.

## Gotchas

- Quote the work item id: `--item '#12'`. Unquoted, the shell reads `#12` as a comment and the id is lost.
- A stage is done only when its checks hold on disk. Produce the file a check names; never edit the state file to move on.
- The testware review stage checks your ledger: add a line to `qa/state/<file>.md` with the review's outcome, such as "6. Review: qa:test-reviewer, no blocking finding".
- At autonomy L1 or above in `qa/profile.yaml`, the Stop hook sends you on to the next stage, at most three times per stage. At L0 nothing continues by itself: run `next` and carry on.
