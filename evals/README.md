# Evals

How Alchemist-QA is measured. The question is simple: given a product with known defects, how many does the department find, and how many false alarms does it raise?

## Layout

| Path | What it is |
| --- | --- |
| `apps/REQUIREMENTS.md` | The test basis for the benchmark product, Alchemy Shop. |
| `apps/api/` | In-memory API. It has no seeded defects. |
| `apps/web/` | React web app with 10 seeded defects. |
| `apps/mobile/` | Bare React Native app with 10 seeded defects. |
| `answer-keys/*.yaml` | The seeded defects: requirement broken, location, and the test level that can reveal each. |
| `answer-keys/*.test.mjs` | Tests that prove each seeded defect is present. They pass while the benchmark is intact. |
| `spikes/` | Measured experiments behind tool choices. |

## Rules

- **Do not fix a seeded defect.** If a benchmark app must change, change the answer key in the same pull request.
- **Do not hint.** No comment, name, or commit message in an app may give a defect away.
- **Keep the key away from the tester.** An eval run copies one app folder and `REQUIREMENTS.md` into a sandbox. It never copies `answer-keys/`.

## Run the benchmark product

The API, on port 3001:

```bash
npm --prefix evals/apps/api start
```

The web app, on port 3000:

```bash
npm --prefix evals/apps/web install && npm --prefix evals/apps/web run dev
```

The mobile app needs the Android SDK and an emulator. See `spikes/mobile-e2e/` for the exact commands.

## Check the benchmark is intact

```bash
npm test
```
