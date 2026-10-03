---
name: vitest
description: Use when test cases at component or unit level must be automated, run, or checked for coverage in a React web project, as the unit-web capability. Not for end-to-end browser tests, and not for React Native apps.
metadata:
  kind: tool
  freedom: medium
---

# Unit and component tests for React web

Turn component-level cases into Vitest tests with Testing Library, run them, and record the results for the trace. Fills the `unit-web` capability in `qa/profile.yaml`.

## Inputs

- `qa/cases/<file>.md`: the cases whose Level is `component`, or `integration` when both parts run in one process.
- The source the cases are about. Read it only to learn how to call it: names, arguments, imports. Never to learn what it should return.

## Output

- Test files: next to the source file as `<name>.test.ts`, or `<name>.test.tsx` for components, unless the project keeps tests elsewhere. Use [the unit template](templates/unit.test.ts) or [the component template](templates/component.test.tsx).
- Results in `qa/runs/`, written by the run script.

## Procedure

1. Check the dependencies, from the project root:

   ```bash
   bash "${CLAUDE_SKILL_DIR}/scripts/ensure-deps.sh" <app dir>
   ```

   If something is missing, show the install command it printed and ask before running it, because it changes the team's `package.json`.
2. Write one `it` per case. The title starts with the case id, then the condition in words. Take the input from the case's "Input and steps" and the expected value from its "Expected result", exactly. If the case's expected value cannot be expressed against the code's interface, stop and say so; do not substitute what the code does.
3. Component tests find elements by role and accessible name (`getByRole('button', { name: 'Apply' })`), the way a user and assistive technology do. Use test ids only when no role fits.
4. Run the tests:

   ```bash
   bash "${CLAUDE_SKILL_DIR}/scripts/run.sh" --app <app dir> [--coverage] [test files]
   ```

   It writes `qa/runs/<time>-unit-web.json`, copies it to `qa/runs/latest/unit-web.json`, and prints each failure. Add `--coverage` when white-box design will read the gaps; it writes `qa/runs/coverage/lcov.info`.
5. A failing test whose expectation matches its case is a finding, not a mistake to fix. Leave it failing and hand the run to failure triage. Fix only errors in the test itself, such as a wrong import or a query that finds nothing because of how the test renders.
6. Update the trace with the traceability skill's script, then reply with the test files, the counts, and each failing case id.

## Gotchas

- Vitest runs tests in Node by default. A component test needs a DOM: put `// @vitest-environment jsdom` on the first line of the file instead of editing the team's Vite config.
- Testing Library cleans up between tests only when `afterEach` is global. This project's Vitest does not enable globals, so add `afterEach(cleanup)`, or the second render finds the first one's elements and queries fail with "Found multiple elements".
- Vitest skips coverage when a test fails unless told otherwise. The run script passes `--coverage.reportOnFailure=true`, so use it rather than calling Vitest directly.
- Some projects import with `.ts` extensions (`import { add } from './cart.ts'`). Copy the import style of the file under test, or the import fails to resolve.
