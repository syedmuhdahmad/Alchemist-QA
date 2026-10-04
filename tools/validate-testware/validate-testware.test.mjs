import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateFile } from './validate-testware.mjs';

/** Writes `content` to a temp file at `name` (which may include folders) and validates it. */
function check(name, content) {
  const path = join(mkdtempSync(join(tmpdir(), 'testware-')), name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  return validateFile(path).map((error) => error.message);
}

const ROUTE = `routes:
  - id: design.blackbox
    activity: design
    signals: ["test cases for"]
    agent: test-analyst
    method: test-design-blackbox
`;

test('a complete route is valid', () => {
  assert.deepEqual(check('routing.yaml', ROUTE), []);
});

test('a route with an activity outside the ISTQB test process is rejected', () => {
  const errors = check('routing.yaml', ROUTE.replace('activity: design', 'activity: vibes'));
  assert.match(errors.join('\n'), /routes\/0\/activity/);
});

test('a route with no signals is rejected, because nothing could match it', () => {
  const errors = check('routing.yaml', ROUTE.replace('["test cases for"]', '[]'));
  assert.match(errors.join('\n'), /routes\/0\/signals/);
});

test('a route with an unknown key is rejected, so typos do not load silently', () => {
  const errors = check('routing.yaml', `${ROUTE}    agnet: x\n`);
  assert.match(errors.join('\n'), /agnet/);
});

const PIPELINE = `pipelines:
  feature:
    stages:
      - id: design
        agent: test-analyst
        method: test-design-blackbox
        exit: ["qa/cases/{item}.md exists"]
`;

test('a pipeline stage with an agent and exit criteria is valid', () => {
  assert.deepEqual(check('pipelines.yaml', PIPELINE), []);
});

test('a stage without exit criteria is rejected', () => {
  const errors = check('pipelines.yaml', PIPELINE.replace('        exit: ["qa/cases/{item}.md exists"]\n', ''));
  assert.match(errors.join('\n'), /exit/);
});

test('a stage must name either one agent or parallel branches', () => {
  const errors = check('pipelines.yaml', PIPELINE.replace('        agent: test-analyst\n', ''));
  assert.match(errors.join('\n'), /stages\/0/);
});

test('a parallel stage is valid without an agent', () => {
  const text = PIPELINE.replace('        agent: test-analyst\n', '        parallel: [web, mobile]\n');
  assert.deepEqual(check('pipelines.yaml', text), []);
});

const PROFILE = `stack:
  platforms: [web, android]
capabilities:
  unit-web: vitest
  e2e-mobile: maestro
tracker:
  type: github-issues
autonomy: L1
environments:
  local:
    url: http://localhost:3000
    allow: [functional]
`;

test('a complete profile is valid', () => {
  assert.deepEqual(check('profile.yaml', PROFILE), []);
});

test('an autonomy level outside L0 to L4 is rejected', () => {
  const errors = check('profile.yaml', PROFILE.replace('autonomy: L1', 'autonomy: L9'));
  assert.match(errors.join('\n'), /autonomy/);
});

test('a capability the routing layer does not know is rejected', () => {
  const errors = check('profile.yaml', PROFILE.replace('unit-web: vitest', 'unit-desktop: vitest'));
  assert.match(errors.join('\n'), /unit-desktop/);
});

test('an environment that does not say which test types it allows is rejected', () => {
  const errors = check('profile.yaml', PROFILE.replace('    allow: [functional]\n', ''));
  assert.match(errors.join('\n'), /allow/);
});

const BASIS = `---
id: "#12"
source: github-issues
type: story
title: Apply a promo code
url: https://github.com/example/shop/issues/12
acceptance_criteria:
  - SAVE10 takes 10% off items that are not on sale.
---

Body of the work item.
`;

test('a basis file with acceptance criteria is valid', () => {
  assert.deepEqual(check('basis/12.md', BASIS), []);
});

test('a basis file must state its acceptance criteria, even when the list is empty', () => {
  const text = BASIS.replace(/acceptance_criteria:\n.*\n/, '');
  assert.match(check('basis/12.md', text).join('\n'), /acceptance_criteria/);
});

test('a basis file from an unsupported tracker is rejected', () => {
  const errors = check('basis/12.md', BASIS.replace('source: github-issues', 'source: trello'));
  assert.match(errors.join('\n'), /source/);
});

test('a basis file without frontmatter is rejected', () => {
  assert.match(check('basis/12.md', 'Just text.\n').join('\n'), /frontmatter/);
});

const MANUAL = `---
id: "REQ-1"
source: manual
type: task
title: Check risk R-product-1
origin: "qa/risk-register.md R-product-1"
acceptance_criteria: []
created_at: "2026-10-04T10:00:00Z"
---

There is no tracker item.
`;

test('a manual basis file with an origin is valid', () => {
  assert.deepEqual(check('basis/REQ-1.md', MANUAL), []);
});

test('a manual basis file needs an origin', () => {
  const errors = check('basis/REQ-1.md', MANUAL.replace(/^origin: .*\n/m, ''));
  assert.match(errors.join('\n'), /origin/);
});

test('a manual basis id is REQ-<n>', () => {
  const errors = check('basis/R-product-1.md', MANUAL.replace('id: "REQ-1"', 'id: "R-product-1"'));
  assert.match(errors.join('\n'), /\/id/);
});

test('a basis file with no source reports only the missing source, not the rules for manual items', () => {
  const errors = check('basis/12.md', BASIS.replace('source: github-issues\n', '')).join('\n');
  assert.match(errors, /source/);
  assert.doesNotMatch(errors, /origin|REQ/);
});

test('a tracker basis file needs no origin', () => {
  assert.deepEqual(check('basis/12.md', BASIS), []);
});

const TRACE = {
  items: [
    {
      work_item: '#12',
      risks: [{ id: 'R1', level: 'high' }],
      cases: [
        {
          id: 'TC-12-01',
          technique: 'boundary-value',
          risk: 'R1',
          tests: [{ path: 'test/unit/promo.test.ts', result: 'passed' }],
        },
      ],
    },
  ],
};

test('a trace from work item to test result is valid', () => {
  assert.deepEqual(check('trace.json', TRACE), []);
});

test('a case that names no design technique is rejected', () => {
  const trace = structuredClone(TRACE);
  delete trace.items[0].cases[0].technique;
  assert.match(check('trace.json', trace).join('\n'), /technique/);
});

test('a test result outside the known set is rejected', () => {
  const trace = structuredClone(TRACE);
  trace.items[0].cases[0].tests[0].result = 'kinda';
  assert.match(check('trace.json', trace).join('\n'), /result/);
});

test('a trace case may rest on assumptions, and an item may list them with their status', () => {
  const trace = structuredClone(TRACE);
  trace.items[0].cases[0].rests_on = ['A1'];
  trace.items[0].assumptions = [{ id: 'A1', status: 'open' }, { id: 'A2', status: 'confirmed' }];
  assert.deepEqual(check('trace.json', trace), []);
  trace.items[0].assumptions[1].status = 'maybe';
  assert.match(check('trace.json', trace).join('\n'), /status/);
});

test('a case with no tests is valid, because design comes before automation', () => {
  const trace = structuredClone(TRACE);
  trace.items[0].cases[0].tests = [];
  assert.deepEqual(check('trace.json', trace), []);
});

test('a file the validator has no schema for is reported, not passed', () => {
  assert.match(check('notes.yaml', 'a: 1\n').join('\n'), /no schema/);
});

test('a file that is not valid YAML is reported', () => {
  assert.match(check('routing.yaml', 'routes: [\n').join('\n'), /parse/i);
});

const REVIEW = `---
work_item: "#14"
verdict: not-ready
---

# Basis review: Reset a forgotten password

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | contradiction | Criteria 2 and 3 | The link expires after 30 minutes but can be used for 24 hours. |

## Assumptions

None.

## Questions for the owner

1. F1: is the link valid for 30 minutes or 24 hours?
`;

test('a basis review with a known verdict is valid', () => {
  assert.deepEqual(check('basis/14.review.md', REVIEW), []);
});

test('a basis review is checked as a review, not as a work item', () => {
  // A work item needs id, source, type, and title. A review has none of them and must still pass.
  assert.doesNotMatch(check('basis/14.review.md', REVIEW).join('\n'), /source|title/);
});

test('a basis review with a verdict outside the known set is rejected', () => {
  const errors = check('basis/14.review.md', REVIEW.replace('not-ready', 'looks fine'));
  assert.match(errors.join('\n'), /verdict/);
});

test('a basis review that does not name its work item is rejected', () => {
  const errors = check('basis/14.review.md', REVIEW.replace('work_item: "#14"\n', ''));
  assert.match(errors.join('\n'), /work_item/);
});

test('a basis review with an empty work item is rejected', () => {
  const errors = check('basis/14.review.md', REVIEW.replace('work_item: "#14"', 'work_item: ""'));
  assert.match(errors.join('\n'), /work_item/);
});

for (const section of ['## Findings', '## Assumptions', '## Questions for the owner']) {
  test(`a basis review without "${section}" is rejected`, () => {
    const errors = check('basis/14.review.md', REVIEW.replace(`${section}\n`, ''));
    assert.match(errors.join('\n'), new RegExp(section));
  });
}

test('a basis review with its sections out of order is rejected', () => {
  const swapped = REVIEW.replace('## Findings', '## TEMP').replace('## Assumptions', '## Findings').replace('## TEMP', '## Assumptions');
  assert.match(check('basis/14.review.md', swapped).join('\n'), /order/);
});

test('headings inside a code fence do not count as review sections', () => {
  const fenced = `---
work_item: "#14"
verdict: not-ready
---

~~~md
## Findings
## Assumptions
## Questions for the owner
~~~
`;
  assert.match(check('basis/14.review.md', fenced).join('\n'), /missing section/);
});

const CASES = `---
work_item: "#12"
---

# Test cases: Apply a promo code

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | boundary-value | R-12-1 | Criterion 4 | component | Subtotal 50.00 | Shipping 0.00 |
`;

test('a cases file with the case table is valid', () => {
  assert.deepEqual(check('qa/cases/12.md', CASES), []);
});

test('a cases file without the case table is rejected', () => {
  const errors = check('qa/cases/12.md', CASES.split('| Id |')[0]);
  assert.match(errors.join('\n'), /case table/);
});

test('a case row with an id that does not follow TC-<item>-<nn> is rejected', () => {
  const errors = check('qa/cases/12.md', CASES.replace('TC-12-01', 'case 1'));
  assert.match(errors.join('\n'), /case 1/);
});

test('a case row with a technique outside the list is rejected', () => {
  const errors = check('qa/cases/12.md', CASES.replace('boundary-value', 'vibes'));
  assert.match(errors.join('\n'), /vibes/);
});

test('not_automated may only name case ids', () => {
  const errors = check('qa/cases/12.md', CASES.replace('---\n\n#', 'not_automated:\n  case-one: needs a device\n---\n\n#'));
  assert.match(errors.join('\n'), /not_automated/);
});

const DEFECT = `---
id: D-0001
title: Shipping charged at exactly 50.00
work_item: "#12"
cases: [TC-12-01]
severity: major
status: draft
---

# D-0001: Shipping charged at exactly 50.00
`;

test('a draft defect report is valid', () => {
  assert.deepEqual(check('qa/defects/D-0001.md', DEFECT), []);
});

test('a defect with a severity outside the scale is rejected', () => {
  assert.match(check('qa/defects/D-0001.md', DEFECT.replace('major', 'urgent')).join('\n'), /severity/);
});

test('a defect id must be D- and at least four digits', () => {
  assert.match(check('qa/defects/D-1.md', DEFECT.replace('D-0001\n', 'D-1\n')).join('\n'), /\/id/);
});

const REPORT = `---
work_item: "#12"
kind: completion
exit_criteria: not-met
---

# Test completion report
`;

test('a completion report with an exit-criteria verdict is valid', () => {
  assert.deepEqual(check('qa/reports/12.md', REPORT), []);
});

test('a completion report must state whether the exit criteria are met', () => {
  assert.match(check('qa/reports/12.md', REPORT.replace('exit_criteria: not-met\n', '')).join('\n'), /exit_criteria/);
});

test('a progress report needs no exit-criteria verdict', () => {
  const text = REPORT.replace('completion', 'progress').replace('exit_criteria: not-met\n', '');
  assert.deepEqual(check('qa/reports/12.md', text), []);
});

test('an awaiting-owner report lists what it waits for', () => {
  const text = REPORT.replace('exit_criteria: not-met', 'exit_criteria: awaiting-owner\nawaiting: [A3, A6]');
  assert.deepEqual(check('qa/reports/12.md', text), []);
});

test('an awaiting-owner report without awaiting is rejected', () => {
  const text = REPORT.replace('exit_criteria: not-met', 'exit_criteria: awaiting-owner');
  assert.match(check('qa/reports/12.md', text).join('\n'), /awaiting/);
});

test('awaiting is rejected on a met report, and on a report with no verdict', () => {
  const met = REPORT.replace('exit_criteria: not-met', 'exit_criteria: met\nawaiting: [A3]');
  assert.notDeepEqual(check('qa/reports/12.md', met), []);
  const progress = REPORT.replace('completion', 'progress').replace('exit_criteria: not-met', 'awaiting: [A3]');
  assert.notDeepEqual(check('qa/reports/12.md', progress), []);
});

test('awaiting names assumptions, A<n>', () => {
  const text = REPORT.replace('exit_criteria: not-met', 'exit_criteria: awaiting-owner\nawaiting: [Q3]');
  assert.match(check('qa/reports/12.md', text).join('\n'), /awaiting/);
});

test('a plan needs an estimate', () => {
  assert.deepEqual(check('qa/plans/12.md', '---\nwork_item: "#12"\nestimate_hours: 6\n---\n'), []);
  assert.match(check('qa/plans/12.md', '---\nwork_item: "#12"\n---\n').join('\n'), /estimate_hours/);
});

test('proposed acceptance criteria are checked as acceptance, not as a basis file', () => {
  assert.deepEqual(check('qa/basis/12.acceptance.md', '---\nwork_item: "#12"\nstatus: proposed\n---\n'), []);
  assert.match(check('qa/basis/12.acceptance.md', '---\nwork_item: "#12"\nstatus: maybe\n---\n').join('\n'), /status/);
});
