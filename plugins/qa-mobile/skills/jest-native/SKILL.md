---
name: jest-native
description: Use when test cases at component or unit level must be automated, run, or checked for coverage in a bare React Native app for Android or iOS, as the unit-mobile capability. Not for tests on a device or emulator, and not for React web apps.
metadata:
  kind: tool
  freedom: medium
---

# Unit and component tests for React Native

Turn component-level cases into Jest tests with React Native Testing Library, run them, and record the results for the trace. Fills the `unit-mobile` capability in `qa/profile.yaml`. These tests run in Node, not on a device: anything that needs the platform (rotation, interrupts, deep links from the OS) belongs to the device tool skills.

## Inputs

- `qa/cases/<file>.md`: the cases whose Level is `component`, or `integration` when both parts run in one process.
- The source the cases are about. Read it only to learn how to call it: names, arguments, imports. Never to learn what it should return.

## Output

- Test files: next to the source file as `<name>.test.ts`, or `<name>.test.tsx` for components, unless the project keeps tests in `__tests__/`. Use [the unit template](templates/unit.test.ts) or [the component template](templates/component.test.tsx).
- Results in `qa/runs/`, written by the run script.

## Procedure

1. Check the dependencies, from the project root:

   ```bash
   bash "${CLAUDE_SKILL_DIR}/scripts/ensure-deps.sh" <app dir>
   ```

   If something is missing, show what it printed and ask before installing, because it changes the team's `package.json`.
2. Write one `it` per case. The title starts with the case id, then the condition in words. Take the input from the case's "Input and steps" and the expected value from its "Expected result", exactly. If the case cannot be expressed against the code's interface, stop and say so; do not substitute what the code does.
3. Component tests find elements by role and accessible name (`getByRole('button', { name: 'Add Elixir to cart' })`), the way TalkBack and VoiceOver users do. Use `testID` only when no role fits.
4. Run the tests:

   ```bash
   bash "${CLAUDE_SKILL_DIR}/scripts/run.sh" --app <app dir> [--coverage] [test files]
   ```

   It writes `qa/runs/<time>-unit-mobile.json`, copies it to `qa/runs/latest/unit-mobile.json`, and prints each failure. Add `--coverage` when white-box design will read the gaps; it writes `qa/runs/coverage/lcov.info`.
5. A failing test whose expectation matches its case is a finding, not a mistake to fix. Leave it failing and hand the run to failure triage. Fix only errors in the test itself, such as a wrong import or a test file that does not load.
6. Update the trace with the traceability skill's script, then reply with the test files, the counts, and each failing case id.

## Gotchas

- A `Pressable` only has the `button` role when it sets `accessibilityRole="button"` (or `role="button"`), and its accessible name is the text inside it. A button showing "+" has the name "+", which passes a check that "a name exists" while telling a screen reader user nothing. Assert the exact name the case expects.
- The modules in this stack import each other with `.ts` extensions (`from './pricing.ts'`). Jest resolves them through the React Native preset; copy the import style of the file under test.
- Jest prints its own report to stderr and writes the JSON only to the run script's output file. Read the script's summary lines, not Jest's console, to get the failing case ids.
