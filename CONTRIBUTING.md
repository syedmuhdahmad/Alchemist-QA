# Contributing

Thank you for helping. This page says how to get a change merged.

## Before you start

- For anything larger than a small fix, open an issue first so the approach can be agreed.
- Read [docs/authoring.md](docs/authoring.md) before writing a skill or an agent. The linter enforces it.
- Read the [roadmap](docs/roadmap.md) to see which phase a change belongs to.

## How work is tracked

| Where | What it holds |
| --- | --- |
| [Roadmap](docs/roadmap.md) | The plan: phases, design, and what each phase must prove |
| [Milestones](https://github.com/syedmuhdahmad/Alchemist-QA/milestones) | One per phase, with its exit criterion |
| [Project board](https://github.com/users/syedmuhdahmad/projects/2) | Every issue; group by milestone to see a phase |
| Issues labelled `epic` | One per phase, listing that phase's issues as a checklist |
| [Releases](https://github.com/syedmuhdahmad/Alchemist-QA/releases) | A tag for each finished phase, with the changelog entry |

Labels say what an issue is, where it lands, and how urgent it is:

| Group | Labels |
| --- | --- |
| Kind | `epic`, `skill: method`, `skill: tool`, `skill: domain`, `agent`, `hook`, `pipeline`, `schema`, `eval`, `spike`, `ci`, `tooling`, `governance`, plus `bug`, `enhancement`, `documentation` |
| Area | `area: core`, `area: intake`, `area: web`, `area: mobile`, `area: api`, `area: perf`, `area: security`, `area: a11y`, `area: visual`, `area: ai`, `area: management`, `area: domain` |
| Priority | `priority: high` blocks the phase's exit criterion, `priority: medium` is needed for the phase, `priority: low` is nice to have |
| State | `needs: syllabus`, `needs: decision`, `blocked` |

To pick something up, comment on the issue so it can be assigned. Link the issue in your pull request with `Closes #123`; merging then ticks it off in its epic.

## Set up

Needs Node 22.18 or later.

```bash
npm ci
```

```bash
npm run check
```

## Run the evals

Evals run Claude against each skill's cases and cost Claude usage, so CI does not run them. Install the benchmark apps' dependencies first, because the tool skill cases test those apps:

```bash
npm ci --prefix evals/apps/web && npm ci --prefix evals/apps/mobile
```

One plugin's cases, with a no-plugin baseline for comparison:

```bash
claude plugin eval ./plugins/qa --scaffold --allow-tools Write Edit Bash --runs 1 --max-cost-usd 5 --tag risk-analysis
```

Cases that need more than one plugin, including the end-to-end check, run from the repository root:

```bash
claude plugin eval . --eval-dir evals/integration --scaffold --allow-tools Write Edit Bash --max-cost-usd 10
```

If every Bash call in a run fails with `apply-seccomp: write /proc/self/setgroups`, your host blocks the eval runner's sandbox (see `docs/authoring.md`). Run the same cases with `claude -p` instead. It has no sandbox of its own, so use it only on cases you trust:

```bash
npm run eval:headless -- plugins/qa --bash-only
```

## Rules for a change

1. **Tests first.** Tooling under `tools/` is test-driven: write the failing test, then the code.
2. **Open source only.** A skill may only depend on tools that are open source and free to run. No paid service, account, or API key.
3. **Own words.** Do not copy text from an ISTQB syllabus or any other copyrighted source. Cite the section number and write the procedure yourself.
4. **Do not fix the benchmark.** The apps under `evals/apps/` contain defects on purpose. If you change one, update `evals/answer-keys/` in the same pull request.
5. **Keep the layers apart.** A method skill never names a tool. A tool skill never teaches a technique.
6. **Hooks orchestrate.** Do not add a hook whose only job is to block a tool.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- One topic per pull request. Fill in the template.
- CodeRabbit reviews every pull request automatically. Reply to its comments or resolve them; a maintainer makes the final call.
- CI must pass.

## Licence

By contributing you agree that your contribution is licensed under [Apache-2.0](LICENSE).
