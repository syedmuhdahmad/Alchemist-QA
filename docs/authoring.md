# Authoring standard

How every skill and agent in Alchemist-QA is written. It applies Anthropic's skill-authoring guidance to this project. `tools/lint-skills` enforces the rules marked with a rule id, and CI runs it on every change.

```bash
npm run lint:skills
```

## Three layers, kept apart

| Kind | Answers | May name a tool? |
| --- | --- | --- |
| `method` | How does a tester think about this? | No |
| `tool` | How do I do it in this stack? | Yes |
| `domain` | What matters in this industry? | No |
| `command` | An entry point a user types. | Only to route |

One job loads at most one method skill, one tool skill, one domain pack, and the project profile.

## Progressive disclosure

Claude loads a skill in three steps. Write for each step.

| Level | When it loads | What goes there |
| --- | --- | --- |
| 1. Frontmatter | Always | The trigger. `description` says when to use the skill and what it is not for. It is the routing surface, so no two descriptions may overlap. |
| 2. `SKILL.md` body | When the skill is used | The procedure. Purpose, inputs, steps, checklist, gotchas, and pointers to references and scripts. |
| 3. References | When `SKILL.md` points to one | One technique or one platform per file. |

A description stays in context for every session, including for skills that are preloaded into a specialist agent. Claude Code cannot hide a preloaded skill from the listing, so short descriptions are the only way to keep that cost down.

## Frontmatter

```yaml
---
name: test-design-blackbox
description: Use when test cases are needed from a specification. Not for reading code to find coverage gaps.
metadata:
  kind: method          # method | tool | domain | command
  freedom: medium       # high | medium | low
  stage: design         # only for a skill that runs as a pipeline stage
---
```

| Rule id | Rule |
| --- | --- |
| `skill-file`, `frontmatter` | Every skill folder has a `SKILL.md` that starts with YAML frontmatter. |
| `name` | `name` is kebab-case and equals the folder name. |
| `description` | `description` contains "Use when" and "Not for", and is at most 500 characters. |
| `kind` | `metadata.kind` is one of `method`, `tool`, `domain`, `command`. |
| `freedom` | `metadata.freedom` is one of `high`, `medium`, `low`. |

## Degrees of freedom

Match how tightly a skill is written to how fragile the task is.

| Freedom | Write it as | Use it for | Must ship |
| --- | --- | --- | --- |
| `high` | Goals and boundaries in plain text | Failure triage, exploratory sessions, refactoring page and screen objects | Nothing extra |
| `medium` | A template with allowed variations | Basis reviews, risk registers, test cases, plans, defect reports, completion reports, scaffolding a spec | A file in `templates/` (rule `templates`) |
| `low` | Exact scripts with fixed parameters | Running suites, booting emulators, parsing results, updating the trace, checking exit criteria | An executable file in `scripts/` (rule `scripts`) |

Choose by the output, not by how much judgement the work takes. If a later stage or a check script reads the file a skill writes, the file has a fixed shape, so the skill is `medium` even when the analysis behind it is judgement.

## Folder

```text
skills/<name>/
  SKILL.md
  references/   one level deep, each linked directly from SKILL.md
  scripts/      executed, never read into context
  templates/    output shapes for medium-freedom skills
```

Eval cases for a skill live outside its folder, at `<plugin>/evals/<skill-name>/<case>/`, because that is where `claude plugin eval` looks.

| Rule id | Rule |
| --- | --- |
| `length` | `SKILL.md` is at most 500 lines. Over 200 is a warning. |
| `reference-nested` | Files sit directly in `references/`, not in subfolders. |
| `reference-unlinked` | Every reference is linked from `SKILL.md`. |
| `reference-chain` | A reference does not link to another reference. |
| `reference-contents` | A reference over 100 lines starts with a `## Contents` list. |
| `broken-link` | Every relative link in `SKILL.md` points at a file that exists. |
| `scripts` | Every file in `scripts/` is executable. |
| `evals` | A method, tool, or domain skill has at least three eval cases in `<plugin>/evals/<skill-name>/`. |

Scripts are run, not read: only their output costs tokens. Hooks and skills call the same scripts, so what the instructions say and what orchestration checks cannot drift apart.

## Body

| Rule id | Rule |
| --- | --- |
| `section-procedure` | Every skill has a `## Procedure` section. |
| `section-gotchas` | A tool skill has a `## Gotchas` section. |
| `section-checklist` | A stage skill has a `## Checklist` section. |
| `method-names-tool` | A method skill does not name a tool. |

Rules a linter cannot check, which reviewers do:

- **Gotchas are earned.** Each entry records a mistake Claude actually made in this stack, found by an eval or in triage. Add the eval case with it.
- **The checklist mirrors the exit criteria.** The agent ticks it, runs the check script, and loops back on failure. The `SubagentStop` hook runs the same script.
- **Do not state the obvious.** Write only our conventions and deviations. A skill is a procedure, never a syllabus summary.
- **Dependencies are explicit.** A tool skill ships an `ensure-deps` script. Nothing assumes Java, an SDK, or an emulator exists.
- **Cite, do not copy.** Name the syllabus and section a method follows. Use your own words.

## Evals come first

A skill is written test-first, like code:

1. Write at least three eval cases: a prompt a user would type, and graders on the files the skill should produce.
2. Run them before the skill exists and read what Claude does without it. That is the baseline, and it shows what the skill has to change.
3. Write the smallest skill that fixes what the baseline got wrong.
4. Run the cases again. The with-plugin score should pass and beat the no-plugin score.

```bash
claude plugin eval ./plugins/qa --case '<skill-name>-*' --scaffold --allow-tools Write --max-cost-usd 3
```

The runner needs the `claude` CLI logged in, and each run uses your Claude plan or API credit. Include one case where the right answer is "nothing to report", so a skill that over-reports is caught.

## Agents

- One role per agent. Its `description` says when the lead should delegate to it.
- The shortest `tools` list that lets it do its job. Leave `Agent` out, so only the lead delegates.
- A short body: role, inputs (the handoff packet), output files, exit criteria, what to return.
- It returns file paths and a five-line summary, never file contents.
- No knowledge in agent files. Knowledge goes in skills, listed under `skills`.
- Stateless: everything it needs is in the packet and on disk.
- A plugin agent cannot set `hooks`, `mcpServers`, or `permissionMode`. Hooks go in the plugin's `hooks/hooks.json`.

## How teams customise

Plugin skills are namespaced (`qa:risk-analysis`), so they never clash with a team's own. To replace one, a team writes a project skill in `.claude/skills/` and points a capability at it in `qa/profile.yaml`. Team-specific gotchas go in `qa/gotchas.md`. No fork is needed.
