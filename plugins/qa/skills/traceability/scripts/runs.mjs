#!/usr/bin/env node
/**
 * Keeps qa/runs/ small: turns each raw Jest-format report in qa/runs/ into a slim run, in place.
 * A slim run keeps every failed test with the first line of its message, and every test whose title names a case;
 * the rest count only in its totals. The raw report survives as qa/runs/latest/<capability>.json, which the run
 * scripts write and this script never touches. JUnit XML is left as it is.
 * Usage: node runs.mjs compact [--root <dir>]
 * No npm dependencies: this runs in any project.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { CASE_ID, STATUS } from './trace.mjs';

export const SLIM_FORMAT = 'alchemist-run/1';
const MESSAGE_LENGTH = 300;

/** @param {object} report a Jest-format JSON report */
export function slimRun(report) {
  const totals = { passed: 0, failed: 0, not_run: 0 };
  const tests = [];
  for (const suite of report.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      const title = assertion.fullName ?? assertion.title ?? '';
      const status = STATUS[assertion.status] ?? 'not-run';
      totals[status === 'not-run' ? 'not_run' : status] += 1;
      const namesCase = (title.match(CASE_ID) ?? []).length > 0;
      if (status !== 'failed' && !namesCase) continue;
      const entry = { title, status };
      if (status === 'failed') entry.message = String(assertion.failureMessages?.[0] ?? '').split('\n')[0].slice(0, MESSAGE_LENGTH);
      tests.push(entry);
    }
  }
  return { format: SLIM_FORMAT, tool: 'jest-json', totals, tests };
}

/** Slims every raw Jest-format report directly in qa/runs/. Returns the files it changed. */
export function compactRuns(root) {
  const dir = join(root, 'qa', 'runs');
  if (!existsSync(dir)) return [];
  const changed = [];
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.json')).sort()) {
    const path = join(dir, name);
    let report;
    try {
      report = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      continue;
    }
    if (report.format === SLIM_FORMAT || !Array.isArray(report.testResults)) continue;
    writeFileSync(path, `${JSON.stringify(slimRun(report))}\n`);
    changed.push(path);
  }
  return changed;
}

function main(args) {
  if (args[0] !== 'compact') {
    console.error('usage: runs.mjs compact [--root <dir>]');
    return 2;
  }
  const index = args.indexOf('--root');
  const root = resolve(index === -1 ? '.' : args[index + 1]);
  const changed = compactRuns(root);
  console.log(`slimmed ${changed.length} run(s)`);
  return 0;
}

if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) exit(main(argv.slice(2)));
