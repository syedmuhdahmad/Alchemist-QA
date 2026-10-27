import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CHECKS } from '../skills/pipeline/scripts/checks.mjs';
import { advance, continueDecision, describe, ledgerLine, readState, saveState, startPipeline } from '../skills/pipeline/scripts/pipeline.mjs';

const MANIFEST = {
  pipelines: {
    feature: {
      stages: [
        { id: 'intake', agent: 'qa-lead', exit: ['basis'] },
        { id: 'analysis', agent: 'test-analyst', exit: ['review-not-blocked', 'register-section', 'cases'] },
        { id: 'plan', agent: 'test-manager', exit: ['plan-exit-criteria'] },
        { id: 'automate', agent: 'automation-engineer', parallel: true, exit: ['cases-automated'] },
        { id: 'triage', agent: 'failure-triager', exit: ['failures-classed'] },
        { id: 'review', agent: 'test-reviewer', when: 'risk >= medium', exit: ['review-recorded'] },
        { id: 'report', agent: 'test-manager', exit: ['report-verdict'] },
      ],
    },
  },
};

const T0 = '2026-10-27T10:00:00.000Z';
const at = (minutes) => new Date(Date.parse(T0) + minutes * 60_000).toISOString();

const FILES = {
  basis: ['qa/basis/12.md', '---\nid: "#12"\n---\n\n# Promo codes\n'],
  review: ['qa/basis/12.review.md', '---\nwork_item: "#12"\nverdict: ready\n---\n\n## Findings\n'],
  register: ['qa/risk-register.md', '# Risk register\n\n## #12: Promo codes\n\n| Id | Risk | Likelihood | Impact | Level | Response |\n| --- | --- | --- | --- | --- | --- |\n| R-12-1 | Sale items discounted | medium | high | LEVEL | Decision table |\n'],
  cases: ['qa/cases/12.md', '---\nwork_item: "#12"\n---\n\n| Id | Title | Risk | Basis | Technique | Level | Expected |\n| --- | --- | --- | --- | --- | --- | --- |\n| TC-12-01 | SAVE10 skips sale items | R-12-1 | C2 | decision-table | component | No discount |\n'],
  plan: ['qa/plans/12.md', '---\nwork_item: "#12"\nestimate_hours: 2\n---\n\n## Exit criteria\n\n- Every case for R-12-1 passed.\n'],
  test: ['src/promo.test.ts', "it('TC-12-01 SAVE10 skips sale items', () => {});"],
  run: ['qa/runs/2026-10-27T10-30-00-unit-web.json', JSON.stringify({ format: 'alchemist-run/1', totals: { passed: 0, failed: 1, not_run: 0 }, tests: [{ title: 'TC-12-01 SAVE10 skips sale items', status: 'failed', message: 'x' }] })],
  triage: ['qa/runs/2026-10-27T10-30-00-unit-web.triage.md', '| Test | Class |\n| --- | --- |\n| TC-12-01 | product-defect |\n'],
  ledger: ['qa/state/12.md', '- 10:50 6. Review: qa:test-reviewer, no blocking finding\n'],
  report: ['qa/reports/12.md', '---\nwork_item: "#12"\nkind: completion\nexit_criteria: not-met\n---\n\n# Report\n'],
};

function project({ level = 'high', profile = 'L1' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'pipeline-'));
  const write = (key) => {
    const [path, content] = FILES[key];
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content.replace('LEVEL', level));
  };
  mkdirSync(join(root, 'qa'), { recursive: true });
  writeFileSync(join(root, 'qa/profile.yaml'), `stack:\n  platforms: [web]\nautonomy: ${profile}\n`);
  return { root, write };
}

const ctx = (root) => ({ root, item: '#12', file: '12' });

test('each exit check says what is missing, and is met once its file is right', () => {
  const { root, write } = project();
  assert.deepEqual(CHECKS.basis(ctx(root)), { met: false, missing: ['qa/basis/12.md does not exist'] });
  write('basis');
  assert.equal(CHECKS.basis(ctx(root)).met, true);
  assert.match(CHECKS['register-section'](ctx(root)).missing[0], /no "## #12:" section/);
  write('register');
  assert.equal(CHECKS['register-section'](ctx(root)).met, true);
  assert.match(CHECKS['plan-exit-criteria'](ctx(root)).missing[0], /qa\/plans\/12\.md/);
  write('cases');
  assert.deepEqual(CHECKS['cases-automated'](ctx(root)).missing, ['TC-12-01 has no test and no not_automated reason']);
  write('test');
  assert.equal(CHECKS['cases-automated'](ctx(root)).met, true);
  write('run');
  assert.match(CHECKS['failures-classed'](ctx(root)).missing[0], /2026-10-27T10-30-00-unit-web\.triage\.md/);
  write('triage');
  assert.equal(CHECKS['failures-classed'](ctx(root)).met, true);
  write('report');
  assert.equal(CHECKS['report-verdict'](ctx(root)).met, true);
});

test('a not-ready review makes the analysis stage wait for the owner instead of failing', () => {
  const { root, write } = project();
  write('basis');
  writeFileSync(join(root, FILES.review[0]), FILES.review[1].replace('verdict: ready', 'verdict: not-ready'));
  const result = CHECKS['review-not-blocked'](ctx(root));
  assert.equal(result.met, false);
  assert.match(result.waiting, /not-ready/);
});

test('the engine moves through every stage as its files appear, and records time per stage', () => {
  const { root, write } = project();
  let state = startPipeline(root, { pipeline: 'feature', item: '#12', file: '12', now: T0 }, MANIFEST);
  assert.equal(state.stage, 'intake');
  const steps = [
    [['basis'], 'analysis'],
    [['review', 'register', 'cases'], 'plan'],
    [['plan'], 'automate'],
    [['test', 'run'], 'triage'],
    [['triage'], 'review'],
    [['ledger'], 'report'],
  ];
  steps.forEach(([keys, next], index) => {
    keys.forEach(write);
    ({ state } = advance(root, state, MANIFEST, at(10 * (index + 1))));
    assert.equal(state.stage, next, `after ${keys.join(', ')}`);
  });
  write('report');
  ({ state } = advance(root, state, MANIFEST, at(70)));
  assert.equal(state.status, 'done');
  assert.equal(state.stages.intake.finished, at(10));
  assert.deepEqual(readState(root, '12'), state, 'the state is saved');
  assert.match(ledgerLine(state), /intake 10 min/);
});

test('a work item with only low risks skips the testware review', () => {
  const { root, write } = project({ level: 'low' });
  ['basis', 'review', 'register', 'cases', 'plan', 'test', 'run', 'triage'].forEach(write);
  const { state } = advance(root, startPipeline(root, { pipeline: 'feature', item: '#12', file: '12', now: T0 }, MANIFEST), MANIFEST, at(5));
  assert.equal(state.stage, 'report');
  assert.equal(state.stages.review, undefined);
});

test('at L1 the lead is sent on to the next stage, at most three times per stage, then the pipeline stops', () => {
  const { root, write } = project();
  write('basis');
  let state = startPipeline(root, { pipeline: 'feature', item: '#12', file: '12', now: T0 }, MANIFEST);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const decision = continueDecision(root, state, MANIFEST, { autonomy: 'L1', now: at(attempt) });
    assert.equal(decision.block, true, `attempt ${attempt}`);
    assert.match(decision.reason, /analysis/);
    assert.match(decision.reason, /qa:test-analyst/);
    state = readState(root, '12');
  }
  const last = continueDecision(root, state, MANIFEST, { autonomy: 'L1', now: at(4) });
  assert.equal(last.block, false);
  assert.equal(readState(root, '12').status, 'stopped');
  assert.match(readState(root, '12').reason, /analysis.*3 attempts/);
});

test('at L0, or while waiting for the owner, nothing is blocked', () => {
  const { root, write } = project({ profile: 'L0' });
  write('basis');
  const state = startPipeline(root, { pipeline: 'feature', item: '#12', file: '12', now: T0 }, MANIFEST);
  assert.equal(continueDecision(root, state, MANIFEST, { autonomy: 'L0', now: at(1) }).block, false);
  writeFileSync(join(root, FILES.review[0]), FILES.review[1].replace('verdict: ready', 'verdict: not-ready'));
  const waiting = continueDecision(root, readState(root, '12'), MANIFEST, { autonomy: 'L1', now: at(2) });
  assert.equal(waiting.block, false);
  assert.equal(readState(root, '12').status, 'waiting');
});

test('the description names the stage, its agent, and what is missing', () => {
  const { root } = project();
  const state = startPipeline(root, { pipeline: 'feature', item: '#12', file: '12', now: T0 }, MANIFEST);
  const text = describe(root, state, MANIFEST);
  assert.match(text, /#12.*stage intake \(1 of 7\)/);
  assert.match(text, /qa\/basis\/12\.md does not exist/);
  saveState(root, { ...state, status: 'done' });
  assert.match(describe(root, readState(root, '12'), MANIFEST), /done/);
  assert.match(readFileSync(join(root, 'qa/state/12.pipeline.json'), 'utf8'), /"pipeline": "feature"/);
});

test('the pipeline schema lists exactly the checks the engine has', async () => {
  const { CHECK_NAMES } = await import('../skills/pipeline/scripts/checks.mjs');
  const schema = JSON.parse(readFileSync(new URL('../schemas/pipelines.schema.json', import.meta.url), 'utf8'));
  const stage = schema.properties.pipelines.additionalProperties.properties.stages.items;
  assert.deepEqual(stage.properties.exit.items.enum, CHECK_NAMES);
});
