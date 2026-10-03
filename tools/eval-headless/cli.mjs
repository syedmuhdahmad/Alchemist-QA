#!/usr/bin/env node
/**
 * Usage: node tools/eval-headless/cli.mjs <plugin dir | eval dir> [options]
 *   --case <text>     run only cases whose name contains this text (repeatable)
 *   --bash-only       run only cases that allow the Bash tool
 *   --no-baseline     skip the arm without plugins
 *   --jobs <n>        runs at once (default 4)
 *   --budget <usd>    cost ceiling per run (default 3)
 *   --keep            keep every run's workspace; by default only runs with a failed grader are kept
 *
 * A plugin dir runs <plugin>/evals/** with that plugin loaded. Any other dir runs the cases under it with
 * the plugins their case.yaml lists, and no baseline. Writes results/headless-<time>.json next to the cases.
 * See docs/authoring.md for when to use this instead of `claude plugin eval`.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { grade, judgeWithHaiku, loadCase, runArm } from './eval-headless.mjs';

const args = process.argv.slice(2);
const values = (flag) => args.flatMap((arg, i) => (arg === flag ? [args[i + 1]] : []));
const target = resolve(args.find((arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? '.');
const isPlugin = existsSync(join(target, '.claude-plugin', 'plugin.json'));
const evalDir = isPlugin ? join(target, 'evals') : target;
const jobs = Number(values('--jobs')[0] ?? 4);
const budget = Number(values('--budget')[0] ?? 3);
const filters = values('--case');

function caseDirs(dir) {
  if (!existsSync(dir)) return [];
  if (existsSync(join(dir, 'prompt.md')) && existsSync(join(dir, 'graders'))) return [dir];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'results')
    .flatMap((entry) => caseDirs(join(dir, entry.name)));
}

const cases = caseDirs(evalDir)
  .map(loadCase)
  .filter((c) => filters.length === 0 || filters.some((f) => c.name.includes(f)))
  .filter((c) => !args.includes('--bash-only') || c.allowedTools.includes('Bash'));
if (cases.length === 0) {
  console.log(`no cases found under ${evalDir}`);
  process.exit(1);
}

const arms = [];
for (const testCase of cases) {
  const plugins = [...(isPlugin ? [target] : []), ...testCase.plugins];
  arms.push({ testCase, arm: 'with', plugins });
  if (isPlugin && !args.includes('--no-baseline')) arms.push({ testCase, arm: 'without', plugins: [] });
}
console.log(`${cases.length} case(s), ${arms.length} run(s), up to ${jobs} at once, $${budget} ceiling per run`);

async function execute({ testCase, arm, plugins }) {
  const workspace = mkdtempSync(join(tmpdir(), `eval-${testCase.name}-${arm}-`));
  try {
    const run = await runArm(testCase, workspace, plugins, budget);
    const graders = [];
    for (const grader of testCase.graders) {
      const result = await grade(grader, { workspace, ...run, judge: judgeWithHaiku });
      graders.push({ name: grader.name, type: grader.type, ...result });
    }
    // Like the eval runner, the Skill indicator does not count towards the score.
    const scored = graders.filter((g) => !(g.type === 'tool_used' && g.name === 'skill-fired'));
    const score = scored.length ? scored.filter((g) => g.passed).length / scored.length : 0;
    // Keep a workspace only when something failed, for inspection; copied apps make them large.
    const kept = graders.some((g) => !g.passed) || args.includes('--keep');
    if (!kept) rmSync(workspace, { recursive: true, force: true });
    return { case: testCase.name, arm, score, costUsd: run.costUsd, workspace: kept ? workspace : null, graders };
  } catch (error) {
    return { case: testCase.name, arm, score: 0, costUsd: 0, workspace, error: error.message, graders: [] };
  }
}

const results = [];
const queue = [...arms];
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    while (queue.length > 0) {
      const result = await execute(queue.shift());
      results.push(result);
      const failed = result.graders.filter((g) => !g.passed).map((g) => g.name);
      console.log(
        `${result.case} [${result.arm}] score ${result.score.toFixed(2)} $${result.costUsd.toFixed(2)}` +
          (result.error ? ` error: ${result.error}` : failed.length ? ` failed: ${failed.join(', ')}` : ''),
      );
    }
  }),
);

console.log('\n| Case | With | Without |\n| --- | --- | --- |');
for (const testCase of cases) {
  const score = (arm) => results.find((r) => r.case === testCase.name && r.arm === arm)?.score.toFixed(2) ?? '-';
  console.log(`| ${testCase.name} | ${score('with')} | ${score('without')} |`);
}
const total = results.reduce((sum, r) => sum + r.costUsd, 0);
console.log(`\ntotal cost $${total.toFixed(2)}`);
mkdirSync(join(evalDir, 'results'), { recursive: true });
const out = join(evalDir, 'results', `headless-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
console.log(`results: ${out}`);
