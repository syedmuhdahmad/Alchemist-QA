# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `NOTICE` now credits the third-party files that came with the React Native template.

## [0.0.1] - 2026-10-03

Phase 0: foundations. No agents or test skills yet.

### Added

- Marketplace `alchemist-qa` with the core plugin `qa` and its `/qa:about` skill.
- Authoring standard (`docs/authoring.md`) and `tools/lint-skills`, which enforces it.
- Schemas for `routing.yaml`, `pipelines.yaml`, `qa/profile.yaml`, basis files, and `qa/trace.json`, with `tools/validate-testware`.
- Benchmark product "Alchemy Shop": requirements, an API, a React web app, and a bare React Native app, each client with 10 seeded defects and an answer key that proves them.
- Verification of the Claude Code features the design relies on (`docs/claude-code-verification.md`).
- Mobile end-to-end tool spike (`docs/spikes/mobile-e2e.md`).
