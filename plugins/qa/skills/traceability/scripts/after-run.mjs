#!/usr/bin/env node
/**
 * PostToolUse hook on Bash: bookkeeping after a test run, with no agent action.
 * In a project with qa/profile.yaml, it slims any new raw run in qa/runs/, updates qa/trace.json, and, when the
 * newest new run has failures and no <run>.triage.md, adds context that queues them for triage.
 * It reads files, not the Bash output. It never blocks: on any problem it exits 0 and prints nothing.
 * No npm dependencies: plugins run on the user's machine as shipped.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { compactRuns } from './runs.mjs';
import { buildTrace } from './trace.mjs';

const SHOWN = 5;

try {
  const { cwd } = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof cwd === 'string' && existsSync(join(cwd, 'qa', 'profile.yaml'))) {
    const changed = compactRuns(cwd);
    if (changed.length > 0) {
      writeFileSync(join(cwd, 'qa', 'trace.json'), `${JSON.stringify(buildTrace(cwd), null, 2)}\n`);
      const newest = changed.at(-1);
      const failed = JSON.parse(readFileSync(newest, 'utf8')).tests.filter((test) => test.status === 'failed');
      const triage = newest.replace(/\.json$/, '.triage.md');
      if (failed.length > 0 && !existsSync(triage)) {
        const titles = failed.slice(0, SHOWN).map((test) => `"${test.title}"`).join(', ');
        const more = failed.length > SHOWN ? `, and ${failed.length - SHOWN} more` : '';
        const context =
          `Alchemist-QA: run qa/runs/${basename(newest)} has ${failed.length} failed test(s): ${titles}${more}. ` +
          `qa/trace.json is updated. Triage the failures with qa:failure-triager (skill failure-triage) into ` +
          `qa/runs/${basename(triage)} before acting on them.`;
        process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } }));
      }
    }
  }
} catch {
  // Bookkeeping is a convenience: a tool call must never fail because of it.
}
process.exit(0);
