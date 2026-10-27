#!/usr/bin/env node
/**
 * Publishes the scorecard: docs/scorecard.md and the README's scorecard block, from evals/scorecard/.
 * Usage: node tools/scoring/scorecard.mjs [--check]
 *   --check writes nothing, and exits 1 when either file is out of step with the records.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, scorecardFiles, scorecardStale } from './score.mjs';

if (process.argv.includes('--check')) {
  const stale = scorecardStale();
  for (const path of stale) console.error(`out of step with evals/scorecard/: ${path}`);
  if (stale.length > 0) console.error('run: node tools/scoring/scorecard.mjs');
  process.exit(stale.length > 0 ? 1 : 0);
}
for (const [path, text] of Object.entries(scorecardFiles())) writeFileSync(join(ROOT, path), text);
console.log('wrote docs/scorecard.md and the README scorecard');
