# Contributing

Thank you for helping. This page says how to get a change merged.

## Before you start

- For anything larger than a small fix, open an issue first so the approach can be agreed.
- Read [docs/authoring.md](docs/authoring.md) before writing a skill or an agent. The linter enforces it.
- Read the [roadmap](docs/roadmap.md) to see which phase a change belongs to.

## Set up

Needs Node 22.18 or later.

```bash
npm ci
```

```bash
npm run check
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

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE).
