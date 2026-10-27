import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classifyPrompt,
  loadKey,
  matchDefects,
  mutationScore,
  parseClassification,
  rates,
  readDefects,
  renderScorecard,
  sandbox,
  scorecardStale,
  strykerConfig,
  withoutTests,
} from './score.mjs';

test('the sandbox holds one app and the requirements, links the installed packages, and never the answer key', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'seeded-')), 'project');
  sandbox('web', dir);
  assert.ok(readFileSync(join(dir, 'REQUIREMENTS.md'), 'utf8').length > 0);
  assert.ok(readFileSync(join(dir, 'src/lib/cart.ts'), 'utf8').length > 0);
  assert.ok(lstatSync(join(dir, 'node_modules')).isSymbolicLink());
  assert.match(readFileSync(join(dir, 'qa/profile.yaml'), 'utf8'), /unit-web: qa-web:vitest[\s\S]*autonomy: L1/);
  const walk = (folder) =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
      entry.name === 'node_modules' ? [] : entry.isDirectory() ? walk(join(folder, entry.name)) : [join(folder, entry.name)],
    );
  for (const file of walk(dir)) {
    assert.doesNotMatch(file, /answer-keys/);
    assert.doesNotMatch(readFileSync(file, 'utf8'), /An eleventh unit can be added to a cart line/, `${file} holds the answer key's words`);
  }
});

test('defect reports are read with their id, title, and body', () => {
  const root = mkdtempSync(join(tmpdir(), 'defects-'));
  mkdirSync(join(root, 'qa/defects'), { recursive: true });
  writeFileSync(join(root, 'qa/defects/D-0001.md'), '---\nid: D-0001\ntitle: SAVE10 discounts sale items\nseverity: major\n---\n\n## Expected\n\nNo discount.\n');
  assert.deepEqual(readDefects(root), [{ id: 'D-0001', title: 'SAVE10 discounts sale items', body: '## Expected\n\nNo discount.' }]);
  assert.deepEqual(readDefects(mkdtempSync(join(tmpdir(), 'none-'))), []);
});

test('the classifier is asked to pick one seeded defect or none, and its answer is read strictly', () => {
  const key = loadKey('web');
  const prompt = classifyPrompt({ id: 'D-0001', title: 'SAVE10 discounts sale items', body: 'Steps...' }, key);
  assert.match(prompt, /W3: SAVE10 discounts products that are on sale\./);
  assert.match(prompt, /SAVE10 discounts sale items/);
  assert.match(prompt, /NONE/);
  assert.equal(parseClassification('W3', key), 'W3');
  assert.equal(parseClassification('  W10\n', key), 'W10');
  assert.equal(parseClassification('NONE', key), null);
  assert.equal(parseClassification('I think W3 or W4', key), null);
  assert.equal(parseClassification('W99', key), null);
});

test('matching counts each seeded defect once, and every report that matches none is a false defect', async () => {
  const key = loadKey('web');
  const answers = { 'D-1': 'W3', 'D-2': 'W3', 'D-3': null, 'D-4': 'W1' };
  const reports = Object.keys(answers).map((id) => ({ id, title: id, body: '' }));
  const match = await matchDefects(reports, key, async (report) => answers[report.id]);
  assert.deepEqual(match.found, ['W1', 'W3']);
  assert.deepEqual(match.falseDefects, ['D-3']);
  const result = rates(match, key, reports.length);
  assert.deepEqual(result, { found: 2, total: 10, unit_found: 2, unit_total: 6, detection: 0.2, unit_detection: 0.3333, reported: 4, false_defects: 1, false_defect_rate: 0.25 });
});

test('the mutation score is the share of covered and uncovered mutants the tests detect', () => {
  const report = {
    files: {
      'src/lib/cart.ts': { mutants: [{ status: 'Killed' }, { status: 'Killed' }, { status: 'Survived' }, { status: 'Timeout' }] },
      'src/lib/pricing.ts': { mutants: [{ status: 'NoCoverage' }, { status: 'Ignored' }, { status: 'CompileError' }] },
    },
  };
  assert.equal(mutationScore(report), 0.6);
  assert.equal(mutationScore({ files: {} }), null);
});

const RECORD = {
  date: '2026-10-27',
  app: 'web',
  model: 'claude-opus-5-5',
  pipeline_status: 'done',
  found: 4,
  total: 10,
  unit_found: 4,
  unit_total: 6,
  detection: 0.4,
  unit_detection: 0.6667,
  reported: 5,
  false_defects: 1,
  false_defect_rate: 0.2,
  mutation_score: 0.71,
  flaky: 0,
  cost_usd: 18.4,
  minutes: 52,
};

test('the scorecard shows each run and a summary per app and model, with routing', () => {
  const text = renderScorecard([RECORD, { ...RECORD, unit_found: 3, unit_detection: 0.5, cost_usd: 20.6 }], {
    golden: { correct: 63, total: 63 },
    model: { date: '2026-10-27', model: 'claude-opus-5-5', passed: 17, total: 17 },
  });
  assert.match(text, /\| web \| claude-opus-5-5 \| 2 \| 58% \| 40% \| 20% \| 71% \| 0 \| \$19\.50 \|/);
  assert.match(text, /Routing, plain-code matcher on the golden set \| 63 of 63/);
  assert.match(text, /\| 2026-10-27 \| web \| claude-opus-5-5 \| done \| 4 of 6 \| 4 of 10 \| 1 of 5 \| 71% \| \$18\.40 \| 52 \|/);
});

test('the scorecard in the repo is in step with its records', () => {
  assert.deepEqual(scorecardStale(), [], 'run: node tools/scoring/scorecard.mjs');
});

test('Stryker runs only the tests that pass, and never mutates a test file', () => {
  const failed = ['cart > TC-1-01 caps a line at 10 (11 allowed)', 'pricing > TC-1-02 rounds 1.005 (up)'];
  const pattern = new RegExp(withoutTests(failed));
  assert.equal(pattern.test('cart > TC-1-01 caps a line at 10 (11 allowed)'), false);
  assert.equal(pattern.test('pricing > TC-1-02 rounds 1.005 (up)'), false);
  assert.equal(pattern.test('cart > TC-1-03 starts empty'), true);
  assert.equal(pattern.test('cart > TC-1-01 caps a line at 10 (11 allowed) again'), true, 'only exact names are left out');
  const web = strykerConfig('web', failed);
  assert.equal(web.testRunner, 'vitest');
  assert.equal(web.vitest.configFile, 'stryker.vitest.config.ts');
  assert.deepEqual(web.mutate, ['src/lib/**/*.ts', '!src/**/*.test.*', '!src/**/*.spec.*']);
  const mobile = strykerConfig('mobile', failed);
  assert.equal(mobile.testRunner, 'jest');
  assert.equal(mobile.jest.config.testNamePattern, withoutTests(failed));
});
