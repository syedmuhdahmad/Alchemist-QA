---
name: regression-selection
description: Use when a change (a commit, branch, pull request, or list of changed files) is ready and someone needs to know which existing tests to run, including confirmation tests for fixed defects. Not for designing new cases, and not for running the tests.
metadata:
  kind: method
  freedom: high
---

# Regression test selection

Choose the smallest set of existing tests that gives confidence a change broke nothing, and say why each one is in. Follows CTFL v4.0.1, sections 2.2.3 (confirmation and regression testing) and 2.3 (maintenance testing).

## Goals

- Every test that exercises changed code, directly or through code that depends on it, is selected.
- Every confirmation test for a defect the change claims to fix is selected.
- Tests for unrelated areas are left out unless risk says otherwise, so feedback stays fast.
- Each selected test has a reason a reviewer can check.

## Boundaries

- Read the change from version control or the list given. Do not guess what changed.
- When the dependencies of changed code cannot be worked out, select more, not less, and say so.
- Do not edit tests or product code.

## Procedure

1. List the changed files, for example from the version control diff against the base branch. Separate product code from tests, configuration, and documentation.
2. For each changed product file, find:
   - the tests that import or exercise it directly;
   - the product files that import it, and their tests (one or two levels, further for shared code such as money or dates);
   - the cases and risks linked to those tests in `qa/trace.json`.
3. Add every test whose case covers a high risk in an affected area, even if no import links it, because high risks are re-checked whenever their area changes.
4. If the change says it fixes a defect (`D-<n>` or a tracker id in the commit message or branch), add the tests linked to that defect's cases as confirmation tests.
5. A change to configuration, build files, or shared setup affects everything: select the full suite and say why. A change only to documentation needs no tests beyond the smoke set, if the project has one.
6. Write `qa/selections/<ref>.md`, where `<ref>` is the short commit id or branch name, with:
   - the changed files;
   - a table of selected tests: path, reason (`direct`, `dependent`, `high risk`, `confirmation`, or `config`), and the case or defect behind it;
   - the tests deliberately left out, by area, with the reason;
   - the command-line arguments the runner needs to run just this set, if the profile names the tool.
7. Reply with the path, the number of tests selected out of the total, and any uncertainty.
