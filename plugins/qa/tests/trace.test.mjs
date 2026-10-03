import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTrace, coverage, parseFrontmatter } from '../skills/traceability/scripts/trace.mjs';

const SCRIPT = fileURLToPath(new URL('../skills/traceability/scripts/trace.mjs', import.meta.url));

const REGISTER = `# Risk register

## #12: Apply a promo code

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-12-1 | Wrong discount, so the shopper pays the wrong amount. | medium | high | high | Decision table. |
| R-12-2 | Unclear error message. | low | low | low | Partitions. |
`;

const CASES = `---
work_item: "#12"
not_automated:
  TC-12-03: Needs a person to judge the wording.
---

# Test cases: Apply a promo code

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | decision-table | R-12-1 | Criterion 1 | component | SAVE10, one sale line | Sale line not discounted |
| TC-12-02 | boundary-value | R-12-1 | Criterion 4 | component | Subtotal 50.00 | Shipping 0.00 |
| TC-12-03 | checklist | R-12-2 | Criterion 3 | system | Unknown code | Clear message |
`;

const TEST_FILE = `import { it } from 'vitest';
it('TC-12-01 does not discount sale lines', () => {});
it('TC-12-02 ships free at exactly 50.00', () => {});
`;

/** A temp project with the given files, as { path: content }. */
function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'trace-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const jestRun = (file, results) =>
  JSON.stringify({
    testResults: [
      {
        name: file,
        assertionResults: results.map(([title, status]) => ({ title, fullName: title, status })),
      },
    ],
  });

test('frontmatter: scalars, quoted strings, inline lists, and one nested map', () => {
  const front = parseFrontmatter('---\nid: D-0001\nwork_item: "#12"\ncases: [TC-12-01, TC-12-02]\nnot_automated:\n  TC-12-03: Needs a person.\n---\nbody');
  assert.deepEqual(front, {
    id: 'D-0001',
    work_item: '#12',
    cases: ['TC-12-01', 'TC-12-02'],
    not_automated: { 'TC-12-03': 'Needs a person.' },
  });
});

test('risks come from the register section of the work item, with their levels', () => {
  const root = project({ 'qa/risk-register.md': REGISTER, 'qa/cases/12.md': CASES });
  const [item] = buildTrace(root).items;
  assert.equal(item.work_item, '#12');
  assert.deepEqual(item.risks, [
    { id: 'R-12-1', level: 'high' },
    { id: 'R-12-2', level: 'low' },
  ]);
});

test('a case is linked to the test files that name its id, and not-run until a run says otherwise', () => {
  const root = project({ 'qa/risk-register.md': REGISTER, 'qa/cases/12.md': CASES, 'src/promo.test.ts': TEST_FILE });
  const cases = buildTrace(root).items[0].cases;
  assert.deepEqual(cases[0], {
    id: 'TC-12-01',
    technique: 'decision-table',
    risk: 'R-12-1',
    tests: [{ path: 'src/promo.test.ts', result: 'not-run' }],
  });
});

test('the latest run decides each result, and a failed case picks up the defect that names it', () => {
  const root = project({
    'qa/risk-register.md': REGISTER,
    'qa/cases/12.md': CASES,
    'src/promo.test.ts': TEST_FILE,
    'qa/runs/2026-10-03T10-00-00-unit-web.json': jestRun('src/promo.test.ts', [
      ['TC-12-01 does not discount sale lines', 'failed'],
      ['TC-12-02 ships free at exactly 50.00', 'failed'],
    ]),
    'qa/runs/2026-10-03T11-00-00-unit-web.json': jestRun('src/promo.test.ts', [
      ['TC-12-02 ships free at exactly 50.00', 'passed'],
    ]),
    'qa/defects/D-0001.md': '---\nid: D-0001\ntitle: Sale lines discounted\nwork_item: "#12"\ncases: [TC-12-01]\nseverity: major\nstatus: draft\n---\n',
  });
  const [first, second] = buildTrace(root).items[0].cases;
  assert.deepEqual(first.tests, [{ path: 'src/promo.test.ts', result: 'failed', defect: 'D-0001' }]);
  assert.deepEqual(second.tests, [{ path: 'src/promo.test.ts', result: 'passed' }]);
});

test('a case with several tests in one run takes the worst result, whatever the order (#107)', () => {
  const root = project({
    'qa/cases/12.md': CASES,
    'src/promo.test.ts': TEST_FILE,
    'qa/runs/2026-10-03T10-00-00-unit-web.json': jestRun('src/promo.test.ts', [
      ['TC-12-01 does not discount sale lines (row 1)', 'passed'],
      ['TC-12-01 does not discount sale lines (row 2)', 'failed'],
      ['TC-12-01 does not discount sale lines (row 3)', 'passed'],
      ['TC-12-02 ships free at exactly 50.00 (row 1)', 'passed'],
      ['TC-12-02 ships free at exactly 50.00 (row 2)', 'skipped'],
    ]),
  });
  const [first, second] = buildTrace(root).items[0].cases;
  assert.equal(first.tests[0].result, 'failed');
  assert.equal(second.tests[0].result, 'not-run');
});

test('a newer run that has the case replaces every result of an older run (#107)', () => {
  const root = project({
    'qa/cases/12.md': CASES,
    'src/promo.test.ts': TEST_FILE,
    'qa/runs/2026-10-03T10-00-00-unit-web.json': jestRun('src/promo.test.ts', [
      ['TC-12-01 does not discount sale lines (row 1)', 'failed'],
      ['TC-12-01 does not discount sale lines (row 2)', 'passed'],
    ]),
    'qa/runs/2026-10-03T11-00-00-unit-web.json': jestRun('src/promo.test.ts', [
      ['TC-12-01 does not discount sale lines (row 1)', 'passed'],
      ['TC-12-01 does not discount sale lines (row 2)', 'passed'],
    ]),
  });
  assert.equal(buildTrace(root).items[0].cases[0].tests[0].result, 'passed');
});

test('JUnit XML: a failing row among passing rows of one case is a failure (#107)', () => {
  const row = (name, body = '') => `<testcase classname="src/promo.test.ts" name="${name}">${body}</testcase>`;
  const xml = `<testsuites><testsuite name="promo">${row('TC-12-01 row 1')}${row('TC-12-01 row 2', '<failure message="x"/>')}${row('TC-12-01 row 3')}</testsuite></testsuites>`;
  const root = project({ 'qa/cases/12.md': CASES, 'src/promo.test.ts': TEST_FILE, 'qa/runs/2026-10-03-unit-web.xml': xml });
  assert.equal(buildTrace(root).items[0].cases[0].tests[0].result, 'failed');
});

test('the draft section that /qa:onboard writes is not read as a work item (#108)', () => {
  const draft = `## Product: first pass

Draft from \`/qa:onboard\`.

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
| R-product-1 | Checkout fails. | medium | high | high | Partitions. |
`;
  const root = project({ 'qa/risk-register.md': REGISTER.replace('## #12', `${draft}\n## #12`), 'qa/cases/12.md': CASES });
  const trace = buildTrace(root);
  assert.deepEqual(trace.items.map((item) => item.work_item), ['#12']);
  assert.deepEqual(coverage(trace).risks_without_cases, []);
});

test('JUnit XML results are read too', () => {
  const xml = `<testsuites><testsuite name="promo"><testcase classname="src/promo.test.ts" name="TC-12-01 does not discount sale lines"><failure message="x"/></testcase><testcase classname="src/promo.test.ts" name="TC-12-02 ships free at exactly 50.00"/></testsuite></testsuites>`;
  const root = project({ 'qa/cases/12.md': CASES, 'src/promo.test.ts': TEST_FILE, 'qa/runs/2026-10-03-unit-web.xml': xml });
  const results = buildTrace(root).items[0].cases.map((c) => c.tests[0]?.result);
  assert.deepEqual(results, ['failed', 'passed', undefined]);
});

test('a case marked not_automated carries its reason and no tests', () => {
  const root = project({ 'qa/cases/12.md': CASES });
  const third = buildTrace(root).items[0].cases[2];
  assert.equal(third.not_automated, 'Needs a person to judge the wording.');
  assert.deepEqual(third.tests, []);
});

test('test files in node_modules and the qa folder are ignored', () => {
  const root = project({
    'qa/cases/12.md': CASES,
    'node_modules/x/promo.test.ts': TEST_FILE,
    'qa/promo.test.ts': TEST_FILE,
  });
  assert.deepEqual(buildTrace(root).items[0].cases[0].tests, []);
});

test('coverage lists risks with no case, cases with no test, and failed or unrun tests', () => {
  const register = `${REGISTER}| R-12-3 | Nobody tests this. | low | medium | low | Partitions. |\n`;
  const root = project({
    'qa/risk-register.md': register,
    'qa/cases/12.md': CASES.replace(/\| TC-12-01 [^\n]*\n/, ''),
    'src/promo.test.ts': TEST_FILE,
  });
  const report = coverage(buildTrace(root));
  assert.deepEqual(report.risks_without_cases, ['R-12-3']);
  assert.deepEqual(report.cases_without_tests, []);
  assert.deepEqual(report.not_run, ['TC-12-02']);
  assert.deepEqual(report.failed, []);
  assert.equal(report.complete, false);
});

test('the CLI writes qa/trace.json and exits 1 under --strict when coverage has gaps', () => {
  const root = project({ 'qa/risk-register.md': REGISTER, 'qa/cases/12.md': CASES });
  execFileSync('node', [SCRIPT, 'update', '--root', root]);
  const written = JSON.parse(readFileSync(join(root, 'qa/trace.json'), 'utf8'));
  assert.equal(written.items[0].cases.length, 3);
  assert.throws(() => execFileSync('node', [SCRIPT, 'coverage', '--root', root, '--strict'], { stdio: 'pipe' }), {
    status: 1,
  });
});

test('coverage can be limited to one work item', () => {
  const root = project({
    'qa/cases/12.md': CASES,
    'qa/cases/14.md': CASES.replace('"#12"', '"#14"').replaceAll('TC-12-', 'TC-14-'),
    'src/promo.test.ts': TEST_FILE,
  });
  const report = coverage(buildTrace(root), '#14');
  assert.deepEqual(report.cases_without_tests, ['TC-14-01', 'TC-14-02']);
});

test('case ids from trackers with letters and hyphens are matched whole', () => {
  const cases = CASES.replace('"#12"', 'PROJ-45').replaceAll('TC-12-', 'TC-PROJ-45-');
  const root = project({
    'qa/cases/PROJ-45.md': cases,
    'src/promo.test.ts': TEST_FILE.replaceAll('TC-12-', 'TC-PROJ-45-'),
  });
  const ids = buildTrace(root).items[0].cases.map((c) => [c.id, c.tests.length]);
  assert.deepEqual(ids, [['TC-PROJ-45-01', 1], ['TC-PROJ-45-02', 1], ['TC-PROJ-45-03', 0]]);
});

// Assumptions: which results rest on what the owner has not confirmed (#111).

const ASSUMED_CASES = `---
work_item: "#12"
---

# Test cases: Apply a promo code

| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-12-01 | decision-table | R-12-1 | Criterion 2 | component | SAVE10, one sale line | Sale line not discounted |
| TC-12-02 | boundary-value | R-12-1 | Criterion 2, A4 | component | Subtotal 50.00 | Shipping 0.00 |
| TC-12-03 | equivalence-partitioning | R-12-1 | A1(c) | component | Code " save10 " | Applied |
| TC-12-04 | checklist | R-12-2 | A11Y-1 | system | Screen reader | Message is read |
| TC-12-05 | boundary-value | R-12-1 | A2 | component | Subtotal 49.99 | Shipping 4.99 |
`;

const ASSUMED_TESTS = `import { it } from 'vitest';
it('TC-12-01 sale line', () => {});
it('TC-12-02 free at 50.00', () => {});
it('TC-12-03 trimmed code', () => {});
it('TC-12-04 read aloud', () => {});
it('TC-12-05 paid at 49.99', () => {});
`;

const review = (assumptions) => `---
work_item: "#12"
verdict: ready-with-assumptions
---

# Basis review: Apply a promo code

## Findings

| Id | Type | Where | Finding |
| --- | --- | --- | --- |
| F1 | gap | Criterion 1 | Spaces in a code are not mentioned. |

## Assumptions

${assumptions}

## Questions for the owner

1. Are spaces around a code ignored?
`;

const ASSUMED_RUN = jestRun('src/promo.test.ts', [
  ['TC-12-01 sale line', 'passed'],
  ['TC-12-02 free at 50.00', 'failed'],
  ['TC-12-03 trimmed code', 'passed'],
  ['TC-12-04 read aloud', 'passed'],
  ['TC-12-05 paid at 49.99', 'passed'],
]);

const assumedProject = (assumptions) =>
  project({
    'qa/risk-register.md': REGISTER,
    'qa/cases/12.md': ASSUMED_CASES,
    'src/promo.test.ts': ASSUMED_TESTS,
    'qa/runs/2026-10-04T10-00-00-unit-web.json': ASSUMED_RUN,
    ...(assumptions === undefined ? {} : { 'qa/basis/12.review.md': review(assumptions) }),
  });

test('a case rests on every assumption its Basis cites, and only on assumptions', () => {
  const cases = buildTrace(assumedProject('- A1 (covers F1, open): spaces are ignored.')).items[0].cases;
  assert.deepEqual(
    cases.map((c) => [c.id, c.rests_on]),
    [
      ['TC-12-01', undefined],
      ['TC-12-02', ['A4']],
      ['TC-12-03', ['A1']],
      ['TC-12-04', undefined],
      ['TC-12-05', ['A2']],
    ],
  );
});

test('assumption statuses come from the review, and an assumption with no status is open', () => {
  const root = assumedProject(
    [
      '- A1 (covers F1, confirmed 2026-10-04): spaces are ignored.',
      '- A2 (covers F1): written before statuses existed.',
      '- A4 (covers F1, corrected 2026-10-04): free shipping starts at 50.00.',
      '- A5 (covers F1, open): something else.',
    ].join('\n'),
  );
  assert.deepEqual(buildTrace(root).items[0].assumptions, [
    { id: 'A1', status: 'confirmed' },
    { id: 'A2', status: 'open' },
    { id: 'A4', status: 'corrected' },
    { id: 'A5', status: 'open' },
  ]);
});

test('awaiting_owner lists the open assumptions that cases rest on, passed or failed, and provisional lists those cases', () => {
  const root = assumedProject(['- A1 (covers F1, open): spaces are ignored.', '- A2 (covers F1, open): 49.99 pays.', '- A4 (covers F1, open): free at 50.00.', '- A7 (covers F1, open): no case cites this.'].join('\n'));
  const report = coverage(buildTrace(root));
  assert.deepEqual(report.awaiting_owner, ['A1', 'A2', 'A4']);
  assert.deepEqual(report.provisional, ['TC-12-02', 'TC-12-03', 'TC-12-05']);
});

test('confirmed and corrected assumptions do not wait', () => {
  const root = assumedProject(['- A1 (covers F1, confirmed 2026-10-04): spaces are ignored.', '- A2 (covers F1, corrected 2026-10-04): 49.99 pays 4.99.', '- A4 (covers F1, open): free at 50.00.'].join('\n'));
  const report = coverage(buildTrace(root));
  assert.deepEqual(report.awaiting_owner, ['A4']);
  assert.deepEqual(report.provisional, ['TC-12-02']);
});

test('an assumption the review does not define, or a missing review, counts as open', () => {
  const partial = coverage(buildTrace(assumedProject('- A1 (covers F1, confirmed 2026-10-04): spaces are ignored.')));
  assert.deepEqual(partial.awaiting_owner, ['A2', 'A4']);
  const none = coverage(buildTrace(assumedProject(undefined)));
  assert.deepEqual(none.awaiting_owner, ['A1', 'A2', 'A4']);
  assert.equal(buildTrace(assumedProject(undefined)).items[0].assumptions, undefined);
});

test('awaiting_owner does not change complete, which stays about coverage', () => {
  const cases = ASSUMED_CASES.replace('| TC-12-02 | boundary-value | R-12-1 | Criterion 2, A4 |', '| TC-12-02 | boundary-value | R-12-2 | Criterion 2, A4 |');
  const root = project({
    'qa/risk-register.md': REGISTER,
    'qa/cases/12.md': cases,
    'src/promo.test.ts': ASSUMED_TESTS,
    'qa/runs/2026-10-04T10-00-00-unit-web.json': ASSUMED_RUN.replace('"failed"', '"passed"'),
    'qa/basis/12.review.md': review('- A1 (covers F1, open): spaces are ignored.'),
  });
  const report = coverage(buildTrace(root));
  assert.notDeepEqual(report.awaiting_owner, []);
  assert.equal(report.complete, true);
});

test('the CLI prints awaiting_owner and provisional', () => {
  const root = assumedProject('- A1 (covers F1, open): spaces are ignored.');
  const out = execFileSync('node', [SCRIPT, 'coverage', '--root', root], { encoding: 'utf8' });
  assert.match(out, /^awaiting_owner: A1, A2, A4$/m);
  assert.match(out, /^provisional: TC-12-02, TC-12-03, TC-12-05$/m);
});

test('across several work items, an awaiting assumption is named with its item, since each review numbers its own', () => {
  const root = assumedProject('- A1 (covers F1, open): spaces are ignored.');
  writeFileSync(join(root, 'qa/cases/14.md'), ASSUMED_CASES.replace('"#12"', '"#14"').replaceAll('TC-12-', 'TC-14-'));
  const report = coverage(buildTrace(root));
  assert.ok(report.awaiting_owner.includes('#12 A1'));
  assert.ok(report.awaiting_owner.includes('#14 A1'));
  assert.deepEqual(coverage(buildTrace(root), '#14').awaiting_owner, ['A1', 'A2', 'A4']);
});
