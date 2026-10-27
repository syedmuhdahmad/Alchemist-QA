#!/usr/bin/env node
/**
 * Runs the department on one benchmark app, unattended, and records how it did (#38, #39).
 * Usage: node tools/scoring/seeded.mjs --app web|mobile [--budget <usd>] [--dry-run]
 *   --budget   ceiling for the run's Claude usage (default 35)
 *   --dry-run  build the sandbox, print its path, and run nothing
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
import { APPS, loadKey, matchDefects, mutationScore, rates, readDefects, ROOT, sandbox } from './score.mjs';

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
    child.on('close', () => {
      clearTimeout(timer);
      resolvePromise(output);
    });
  });
}

const modelOf = (output) =>
  output
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {};
      }
    })
    .find((event) => event.type === 'system' && event.subtype === 'init')?.model ?? 'unknown';

const testFiles = (dir) =>
  readdirSync(join(dir, 'src'), { recursive: true }).filter((name) => /\.(test|spec)\.[jt]sx?$/.test(String(name)));

function mutation(dir, app) {
  if (testFiles(dir).length === 0) return null;
  const result = spawnSync(
    'npx',
    ['--no-install', 'stryker', 'run', '--testRunner', APPS[app].runner, '--mutate', 'src/lib/**/*.ts', '--reporters', 'json', '--concurrency', '4'],
    { cwd: dir, encoding: 'utf8', timeout: 30 * 60 * 1000 },
  );
  const report = join(dir, 'reports/mutation/mutation.json');
  if (!existsSync(report)) {
    console.error(`Stryker wrote no report (exit ${result.status}); the mutation score is left empty.`);
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
  const dir = join(mkdtempSync(join(tmpdir(), `seeded-${app}-`)), 'project');
  sandbox(app, dir);
  console.log(`sandbox: ${dir}`);
  if (process.argv.includes('--dry-run')) return;

  const started = Date.now();
  const output = await runLead(dir, app, Number(option('--budget', 35)));
  const minutes = Math.round((Date.now() - started) / 60_000);
  const run = parseStream(output);
  const key = loadKey(app);
  const reports = readDefects(dir);
  const match = await matchDefects(reports, key);
  const claude = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
  const date = new Date().toISOString().slice(0, 10);
  const record = {
    date,
    app,
    model: modelOf(output),
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
