# Security policy

## Reporting a vulnerability

Please do not open a public issue. Report it privately through [GitHub security advisories](https://github.com/syedmuhdahmad/Alchemist-QA/security/advisories/new).

Say what you found, how to reproduce it, and what an attacker could do with it. You should get a first reply within 7 days.

## What is in scope

- The plugins under `plugins/`: skills, agents, hooks, and scripts that run on a user's machine.
- The tooling under `tools/`.

## What is not

- The apps under `evals/apps/`. They are benchmark fixtures with defects seeded on purpose, including security defects. Do not deploy them.

## Supported versions

Only the latest release is supported while the project is below version 1.0.
