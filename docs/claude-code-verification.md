# Claude Code feature verification

The roadmap was drafted from memory of how Claude Code works. Phase 0 checked each assumption against the current documentation and the installed CLI (Claude Code 2.1.283, checked 2026-10-03). This page records what held, what did not, and what changed in the design as a result.

Sources: the plugin manifest, marketplace, skills, subagents, and hooks pages under <https://code.claude.com/docs/en/>, and `claude plugin validate` run against this repository.

## What held

| Assumption | Result |
| --- | --- |
| A marketplace is a repo with `.claude-plugin/marketplace.json`, and plugins can live in subfolders | Confirmed. `claude plugin validate .` passes on this repo. |
| A subagent can preload skills with a `skills` list | Confirmed. The full skill content is injected when the subagent starts. |
| `Stop` and `SubagentStop` hooks can block and send the agent back to work | Confirmed, with `decision: "block"` and a `reason`. |
| `SubagentStart` can add context for the subagent | Confirmed, through `additionalContext`. It cannot block. |
| `SessionStart` and `UserPromptSubmit` can add context | Confirmed. |
| Subagents can run in parallel | Confirmed. The default limit is 20 at once. |
| Skill precedence is enterprise, then personal, then project; plugin skills are namespaced | Confirmed. |
| `SKILL.md` should stay under 500 lines | Confirmed as guidance. |
| Plugins can ship evals | Confirmed: `claude plugin eval` reads `evals/` in the plugin. |
| The main session can run as an agent | Confirmed, with `claude --agent` or the `agent` setting. |

## What did not hold

| Assumption | What is true | Design change |
| --- | --- | --- |
| A subagent cannot start another subagent | It can, up to three levels deep by default. | "Only the lead delegates" becomes a rule we enforce: specialists leave `Agent` out of their `tools`, and the lead lists the agents it may start. |
| Commands would be `/qa:onboard` with a plugin named `qa-core` | A plugin's commands are prefixed with the plugin's name. | The core plugin is named `qa`, so commands are `/qa:onboard`, `/qa:feature`, and so on. |
| The plugin can ship permission rules that deny writes to product code | A plugin's `settings.json` only applies `agent` and `subagentStatusLine`. | Restriction rests on each agent's `tools` list. `/qa:onboard` will offer to add permission rules to the project's own `.claude/settings.json`, which the team owns. |
| Stage-only skills can be hidden from the listing and still be preloaded | A skill with `disable-model-invocation: true` cannot be preloaded into a subagent. | Preloaded skills stay listed. Their descriptions are kept short; the linter caps them at 500 characters. |
| A plugin agent can carry its own hooks | `hooks`, `mcpServers`, and `permissionMode` are ignored on plugin agents. | All hooks live in the plugin's `hooks/hooks.json` and match on agent type. |
| The lead can be the default main agent | It can, but an agent that runs as the main session replaces the default system prompt for the whole session. | The plugin does not set `agent` by default. Normal sessions use `/qa:*` skills. Headless and dedicated QA sessions start with `claude --agent qa:qa-lead`. |

## Not found in the documentation

| Item | Consequence |
| --- | --- |
| A built-in guard against a `Stop` hook that blocks forever | Our pipeline state keeps its own counter and stops blocking after a fixed number of attempts per stage. This is a phase 2 requirement. |
| The exact field that holds a Bash tool's output in `PostToolUse` input | To be confirmed with a recording hook before phase 2 parses test results from it. |

## Limits worth knowing

- A skill's `description` plus `when_to_use` is capped at 1,536 characters. The whole listing gets about 1% of the context window, and Claude Code drops the descriptions of the least-used skills when it overflows.
- Plugin names may not start with `claude-` or `anthropic-`. Marketplace names have a reserved list. `alchemist-qa` and `qa` pass validation.
- `claude plugin validate --strict` turns warnings into failures. CI uses it.
