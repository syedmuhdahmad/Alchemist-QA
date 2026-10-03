---
name: exploratory-testing
description: Use when a work item needs an exploratory session, a test charter, an error-guessing list, or a checklist, or when rough notes from a session must be written up. Not for scripted test cases with fixed expected results, and not for filing defect reports.
metadata:
  kind: method
  freedom: high
---

# Exploratory testing

Plan, run, and debrief time-boxed sessions that learn about the product while testing it. Follows CTFL v4.0.1, section 4.4: error guessing, exploratory testing, and checklist-based testing.

## Goals

- Find what scripted cases miss: surprising behaviour, gaps in the basis, and risks nobody listed.
- Spend the time where the risk register says the danger is. High risks get a session; low risks get a checklist at most.
- Leave a record another tester could repeat or extend.

## Boundaries

- Never present an observation as a result unless it was seen in the product during the session. Without a running product to explore, write the charter and say the session has not run.
- A session note records bugs, questions, and ideas. It does not file defects: a bug worth reporting goes to defect reporting with the note as evidence.
- Do not change product code or test code during a session.

## Procedure

1. **Charter.** Write `qa/charters/<file>-<n>.md`, where `<file>` is the work item id with only letters, digits, and hyphens and `<n>` counts up from 1. It holds:
   - the mission, as one sentence: explore *what*, with *which resources or techniques*, to discover *what information*;
   - the risks it targets (`R-<item>-<n>`) and a time box, normally 30, 60, or 90 minutes;
   - an error-guessing list: the faults this feature is likely to have, from the risk register, the basis, past defects, and common faults in this kind of feature (empty, very long, and special-character input; zero, negative, and maximum amounts; repeated or double actions; interruptions; slow or failed responses; rounding; time zones);
   - the tours or heuristics to use, such as following the money, the interrupted flow, or varying one input at a time.
2. **Session.** When a running product is reachable, explore within the time box and keep notes as you go: what was tried, what was seen, and anything that raised a question.
3. **Debrief.** Add a `## Session notes` section to the charter with:
   - **Done:** the areas and conditions actually covered, and roughly what share of the time box was spent on the mission;
   - **Bugs:** each observation that breaks the basis, with the steps to see it again;
   - **Issues:** questions for the owner, gaps in the basis, and things that blocked testing;
   - **Ideas:** new risks or cases for the register and the case file.
4. **Checklist.** For a low risk, or a quality characteristic such as usability, a checklist of yes-or-no checks taken from the basis and common faults can replace a session. Put it in the charter under `## Checklist`.
5. Reply with the charter path, how many bugs and issues were found, and which bugs should go to defect reporting.
