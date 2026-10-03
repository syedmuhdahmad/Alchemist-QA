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
