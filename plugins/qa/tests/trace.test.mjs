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
