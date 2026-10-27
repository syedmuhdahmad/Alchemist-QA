import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { compactRuns, slimRun } from '../skills/traceability/scripts/runs.mjs';
import { buildTrace } from '../skills/traceability/scripts/trace.mjs';

/** A Jest-format report with the given tests: [fullName, status, message?]. */
const raw = (tests) => ({
  numPassedTests: tests.filter(([, status]) => status === 'passed').length,
  numFailedTests: tests.filter(([, status]) => status === 'failed').length,
  numPendingTests: tests.filter(([, status]) => status === 'pending').length,
  numTodoTests: 0,
  testResults: [
    {
      name: '/app/src/cart.test.ts',
      assertionResults: tests.map(([fullName, status, message]) => ({
        fullName,
        title: fullName,
        status,
        failureMessages: message ? [message] : [],
      })),
    },
  ],
});

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'runs-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}

test('a slim run keeps every failure and every test that names a case, and counts the rest', () => {
  const slim = slimRun(
    raw([
      ['TC-12-01 ships free at 50.00', 'passed'],
      ['TC-12-02 caps a line at 10', 'failed', 'expected 10, got 11\n    at cart.test.ts:4'],
      ['renders the header', 'passed'],
      ['helper formats money', 'failed', `${'x'.repeat(400)}\nstack`],
      ['TC-12-03 todo', 'pending'],
    ]),
  );
  assert.equal(slim.format, 'alchemist-run/1');
  assert.deepEqual(slim.totals, { passed: 2, failed: 2, not_run: 1 });
  assert.deepEqual(slim.tests, [
    { title: 'TC-12-01 ships free at 50.00', status: 'passed' },
    { title: 'TC-12-02 caps a line at 10', status: 'failed', message: 'expected 10, got 11' },
    { title: 'helper formats money', status: 'failed', message: 'x'.repeat(300) },
    { title: 'TC-12-03 todo', status: 'not-run' },
  ]);
});

test('compacting runs gives the trace the same case results as the raw reports', () => {
  const files = {
    'qa/cases/12.md': '---\nwork_item: "#12"\n---\n\n| Id | Title | Risk | Basis | Technique | Level | Expected |\n| --- | --- | --- | --- | --- | --- | --- |\n| TC-12-01 | a | R-12-1 | C1 | boundary-value | component | x |\n| TC-12-02 | b | R-12-1 | C1 | boundary-value | component | y |\n',
    'src/cart.test.ts': "it('TC-12-01 a', () => {}); it('TC-12-02 b', () => {});",
    'qa/runs/2026-10-27T10-00-00-unit-web.json': raw([['TC-12-01 a', 'failed', 'boom'], ['TC-12-02 b', 'passed']]),
    'qa/runs/2026-10-27T11-00-00-unit-web.json': raw([['TC-12-01 a', 'passed'], ['TC-12-02 b', 'failed', 'bang'], ['other', 'passed']]),
  };
  const root = project(files);
  const before = buildTrace(root);
  const compacted = compactRuns(root);
  assert.equal(compacted.length, 2);
  assert.deepEqual(buildTrace(root), before);
  assert.deepEqual(compactRuns(root), [], 'a slim run is left alone');
});

test('JUnit XML and the latest raw copy are left alone', () => {
  const root = project({
    'qa/runs/2026-10-27T10-00-00-unit-mobile.xml': '<testsuite><testcase name="TC-1-01 a"/></testsuite>',
    'qa/runs/latest/unit-web.json': raw([['TC-12-01 a', 'passed']]),
  });
  assert.deepEqual(compactRuns(root), []);
  assert.match(readFileSync(join(root, 'qa/runs/latest/unit-web.json'), 'utf8'), /testResults/);
});

test('ten runs of a 1,000-test suite where every test names a case stay under 1 MB', () => {
  const tests = Array.from({ length: 1000 }, (_, n) => [`TC-12-${String(n).padStart(3, '0')} checks behaviour number ${n} of the cart`, n % 50 ? 'passed' : 'failed', 'expected true, got false']);
  const files = {};
  for (let run = 0; run < 10; run += 1) files[`qa/runs/2026-10-27T1${run}-00-00-unit-web.json`] = raw(tests);
  const root = project(files);
  compactRuns(root);
  const bytes = readdirSync(join(root, 'qa/runs')).reduce((sum, name) => sum + statSync(join(root, 'qa/runs', name)).size, 0);
  assert.ok(bytes < 1_000_000, `${bytes} bytes`);
});
