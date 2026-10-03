# Alchemist-QA

A QA company for [Claude Code](https://claude.com/claude-code). Give it a work item and it decides what to test and how deeply, designs the tests, automates them, runs them, reports defects, and says whether the exit criteria are met.

Its methods follow the ISTQB syllabi. Its tools are open source only. It never edits your product code.

> **Status: phase 0.** The foundations are in place: the plugin skeleton, the authoring standard and its linter, the testware schemas, and the benchmark apps. There are no agents or test skills yet, so it cannot do test work today. See the [roadmap](docs/roadmap.md), the [milestones](https://github.com/syedmuhdahmad/Alchemist-QA/milestones), and the [project board](https://github.com/users/syedmuhdahmad/projects/2).

## Install

```bash
claude plugin marketplace add syedmuhdahmad/Alchemist-QA
```

```bash
claude plugin install qa@alchemist-qa
```

Then, in a session, `/qa:about` tells you which version you have and what it can do.

## How it is built

| Idea | What it means |
| --- | --- |
| Three layers of knowledge | **Method** skills say how a tester thinks. **Tool** skills say how to do it in one stack. **Domain** packs say what matters in one industry. A method skill never names a tool. |
| Few agents, many skills | Six core roles (lead, analyst, automation engineer, triager, reviewer, manager). Knowledge lives in skills, not in agents. |
| Hooks orchestrate | Hooks move work between agents and check each stage's exit criteria. They are not a restriction layer. |
| Files are the interface | Agents hand work over through a `qa/` folder: risks, cases, defects, reports, and a trace from work item to test result. |
| Autonomy is earned | Five levels, each unlocked by measured results on the benchmark apps. A person makes the release decision at every level. |

First stack: React on the web, and React Native on Android and iOS, phones and tablets. Work items come from GitHub Issues, Azure DevOps, or Jira Cloud.

## Repository layout

```text
.claude-plugin/marketplace.json   the marketplace
plugins/qa/                       the core plugin: skills, schemas, and later agents and hooks
tools/lint-skills/                checks every skill against docs/authoring.md
tools/validate-testware/          checks testware files against plugins/qa/schemas
evals/apps/                       benchmark web app, mobile app, and API, with seeded defects
evals/answer-keys/                the seeded defects, and tests that prove each one is present
evals/spikes/                     measured experiments behind tool choices
docs/                             roadmap, authoring standard, platform verification
```

## Develop

Needs Node 22.18 or later.

```bash
npm ci
```

```bash
npm run check
```

`npm run check` runs the tests, the skill linter, the testware validator, and the Markdown linter. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence and acknowledgement

[Apache-2.0](LICENSE). See [NOTICE](NOTICE).

The test methods follow the structure of syllabi published by the International Software Testing Qualifications Board (ISTQB), the source and copyright owner of those syllabi. Skills cite the section they follow and are written in this project's own words. ISTQB is a registered trademark of the International Software Testing Qualifications Board. Alchemist-QA is not affiliated with or endorsed by ISTQB and certifies nothing.
