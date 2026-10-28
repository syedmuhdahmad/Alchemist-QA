#!/usr/bin/env node
/**
 * Runs the department on one benchmark app, unattended, and records how it did (#38, #39).
 * Usage: node tools/scoring/seeded.mjs --app web|mobile [--budget <usd>] [--dry-run]
 *        node tools/scoring/seeded.mjs --app web|mobile --rescore <sandbox> [--record evals/scorecard/runs/<file>.json]
 *   --budget   ceiling for the run's Claude usage (default 35)
 *   --dry-run  build the sandbox, print its path, and run nothing
 *   --rescore  run Stryker again on a kept sandbox, and update the record's mutation score; a run with no score
 *              leaves the record as it is
 * A lead run that was stopped, failed, or never finished is not recorded, nor is one whose defect reports the
 * classifier could not match: the sandbox is kept, and the script exits 1.
 * The sandbox holds the app and REQUIREMENTS.md, never the answer key. The lead runs headless with autonomy L1,
 * so the pipeline's hooks carry it from stage to stage. Haiku matches each defect report to the answer key, and
 * Stryker scores the tests the department wrote. The record goes to evals/scorecard/runs/; then run
 * tools/scoring/scorecard.mjs to publish it.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ISOLATED, parseStream } from '../eval-headless/eval-headless.mjs';
import { APPS, leadRunProblem, loadKey, matchDefects, mutationScore, rates, readDefects, ROOT, sandbox, strykerConfig, strykerVitestConfig } from './score.mjs';

const PROMPT = [
  'There is no tracker item for this app. Bring REQUIREMENTS.md in as one work item with no tracker, titled "Alchemy Shop requirements": its request is the whole of REQUIREMENTS.md, word for word.',
  'Then take it through the feature pipeline at unit level, up to the completion report, and draft a defect report for every product defect you find.',
].join(' ');

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};

function runLead(dir, app, budget) {
  const args = [
    '-p',
    '--agent',
    'qa:qa-lead',
    '--plugin-dir',
    join(ROOT, 'plugins/qa'),
    '--plugin-dir',
    join(ROOT, 'plugins', APPS[app].plugin),
    '--output-format',
    'stream-json',
    '--verbose',
    '--max-budget-usd',
    String(budget),
    ...ISOLATED,
    '--allowedTools',
    'Agent Read Glob Grep Write Edit Bash Skill',
  ];
  return new Promise((resolvePromise) => {
    const child = spawn('claude', args, { cwd: dir, stdio: ['pipe', 'pipe', 'ignore'] });
    const timer = setTimeout(() => child.kill(), 3 * 60 * 60 * 1000);
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stdin.end(PROMPT);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ output, code, signal });
    });
  });
}

// Test files anywhere in the project, wherever the department put them, outside packages and testware.
const testFiles = (dir) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((name) => !/^(node_modules|qa|reports|\.stryker-tmp)(\/|$)/.test(name) && /\.(test|spec)\.[jt]sx?$/.test(name));

/** The full names of the tests that failed in the latest raw run of the app's capability. */
function failedTests(dir, app) {
  const latest = join(dir, 'qa/runs/latest', `${APPS[app].capability}.json`);
  if (!existsSync(latest)) return [];
  const report = JSON.parse(readFileSync(latest, 'utf8'));
  return (report.testResults ?? []).flatMap((suite) =>
    (suite.assertionResults ?? []).filter((test) => test.status === 'failed').map((test) => test.fullName ?? test.title),
  );
}

/** Stryker's score for the department's passing tests, or null when there are none or Stryker cannot run. */
function mutation(dir, app) {
  if (testFiles(dir).length === 0) return null;
  const failed = failedTests(dir, app);
  writeFileSync(join(dir, 'stryker.config.json'), `${JSON.stringify(strykerConfig(app, failed), null, 2)}\n`);
  if (app === 'web') writeFileSync(join(dir, 'stryker.vitest.config.ts'), strykerVitestConfig(failed));
  const result = spawnSync('npx', ['--no-install', 'stryker', 'run', 'stryker.config.json'], { cwd: dir, encoding: 'utf8', timeout: 30 * 60 * 1000 });
  const report = join(dir, 'reports/mutation/mutation.json');
  if (result.status !== 0 || !existsSync(report)) {
    console.error(`Stryker did not finish (exit ${result.status}); the mutation score is left empty.\n${(result.stdout ?? '').split('\n').filter((line) => /ERROR/.test(line)).join('\n')}`);
    return null;
  }
  return mutationScore(JSON.parse(readFileSync(report, 'utf8')));
}

function pipelineStatus(dir) {
  const state = join(dir, 'qa/state');
  const files = existsSync(state) ? readdirSync(state).filter((name) => name.endsWith('.pipeline.json')) : [];
  return files.length ? JSON.parse(readFileSync(join(state, files[0]), 'utf8')).status : 'not started';
}

function flakyFailures(dir) {
  const runs = join(dir, 'qa/runs');
  if (!existsSync(runs)) return 0;
  return readdirSync(runs)
    .filter((name) => name.endsWith('.triage.md'))
    .flatMap((name) => readFileSync(join(runs, name), 'utf8').split('\n'))
    .filter((line) => line.startsWith('|') && /\|\s*flaky\s*\|/.test(line)).length;
}

async function main() {
  const app = option('--app');
  if (!APPS[app]) {
    console.error('usage: seeded.mjs --app web|mobile [--budget <usd>] [--dry-run]');
    process.exit(2);
  }
  const rescore = option('--rescore');
  if (rescore) {
    // Score a kept sandbox's tests again, without another Claude run, and update its record.
    const record = option('--record');
    const score = mutation(rescore, app);
    console.log(`mutation score: ${score}`);
    if (record && score === null) {
      console.error(`${record} is left as it is: there is no mutation score to record`);
      process.exitCode = 1;
      return;
    }
    if (record) {
      const path = join(ROOT, record);
      writeFileSync(path, `${JSON.stringify({ ...JSON.parse(readFileSync(path, 'utf8')), mutation_score: score }, null, 2)}\n`);
      console.log(`updated ${record}`);
    }
    return;
  }
  const dir = join(mkdtempSync(join(tmpdir(), `seeded-${app}-`)), 'project');
  sandbox(app, dir);
  console.log(`sandbox: ${dir}`);
  if (process.argv.includes('--dry-run')) return;

  const started = Date.now();
  const exited = await runLead(dir, app, Number(option('--budget', 35)));
  const minutes = Math.round((Date.now() - started) / 60_000);
  const run = parseStream(exited.output);
  // A run that was stopped or failed is not a result: averaging it in would make the scorecard wrong.
  const notRecorded = (why) => {
    console.error(`not recorded: ${why}. The sandbox is kept at ${dir}.`);
    process.exitCode = 1;
  };
  const problem = leadRunProblem(exited, run);
  if (problem) return notRecorded(problem);
  const key = loadKey(app);
  const reports = readDefects(dir);
  let match;
  try {
    match = await matchDefects(reports, key);
  } catch (error) {
    return notRecorded(error.message);
  }
  const claude = (spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout ?? '').trim() || 'unknown';
  const date = new Date().toISOString().slice(0, 10);
  const record = {
    date,
    app,
    model: run.model ?? 'unknown',
    claude_code: claude.split(' ')[0],
    pipeline_status: pipelineStatus(dir),
    ...rates(match, key, reports.length),
    mutation_score: mutation(dir, app),
    flaky: flakyFailures(dir),
    cost_usd: Math.round(run.costUsd * 100) / 100,
    minutes,
    matches: match.matches,
  };
  const out = join(ROOT, 'evals/scorecard/runs');
  mkdirSync(out, { recursive: true });
  let n = 1;
  while (existsSync(join(out, `${date}-${app}-${n}.json`))) n += 1;
  writeFileSync(join(out, `${date}-${app}-${n}.json`), `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify({ ...record, matches: undefined }, null, 2));
  console.log(`recorded evals/scorecard/runs/${date}-${app}-${n}.json; the sandbox is kept at ${dir}. Publish with: node tools/scoring/scorecard.mjs`);
}

await main();
