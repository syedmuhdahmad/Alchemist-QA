/**
 * The exit checks a pipeline stage can name. Each reads the work item's files on disk and returns
 * {met, missing: [what is not there yet], waiting?: why the stage waits for a person}.
 * No npm dependencies: plugins run on the user's machine as shipped.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slimRun } from '../../traceability/scripts/runs.mjs';
import { buildTrace, coverage, parseFrontmatter, SLIM_FORMAT } from '../../traceability/scripts/trace.mjs';

const read = (root, path) => (existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : null);
const result = (missing, waiting) => ({ met: missing.length === 0 && !waiting, missing, ...(waiting && { waiting }) });
const absent = (path) => `${path} does not exist`;

/** The rows of the item's `## <item>: <title>` section of the risk register, as arrays of cells. */
function registerRows(root, item) {
  const text = read(root, 'qa/risk-register.md') ?? '';
  const section = text.split(/^## /m).find((part) => {
    const heading = part.split('\n')[0];
    return heading === item || heading.startsWith(`${item}:`);
  });
  if (!section) return null;
  return section
    .split('\n')
    .filter((line) => /^\|\s*R-/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

/** The risk levels in the item's register section, lower-cased. */
export function riskLevels(root, item) {
  return (registerRows(root, item) ?? []).map((row) => (row[4] ?? '').toLowerCase());
}

/** The latest run file per capability, from names like 2026-10-27T10-30-00-unit-web.json. */
function latestRuns(root) {
  const dir = join(root, 'qa', 'runs');
  if (!existsSync(dir)) return [];
  const latest = new Map();
  for (const name of readdirSync(dir).filter((file) => /\.(json|xml)$/.test(file)).sort()) {
    const capability = name.replace(/^\d{4}-\d{2}-\d{2}T[\d-]+?-(?=[a-z])/, '').replace(/\.(json|xml)$/, '');
    latest.set(capability, name);
  }
  return [...latest.values()];
}

/** The failures in a run file, counting a suite that failed before its tests ran, or null when it cannot be read. */
function failures(text, name) {
  if (name.endsWith('.xml')) return (text.match(/<(failure|error)\b/g) ?? []).length;
  try {
    const run = JSON.parse(text);
    if (run.format === SLIM_FORMAT && Number.isInteger(run.totals?.failed)) return run.totals.failed;
    if (Array.isArray(run.testResults)) return slimRun(run).totals.failed;
    return null;
  } catch {
    return null;
  }
}

const CLASSES = new Set(['product-defect', 'test-defect', 'environment', 'flaky', 'question']);
/** The rows of a triage file that give a failure one of the classes. */
const classedRows = (text) =>
  text.split('\n').filter((line) => line.trimStart().startsWith('|') && line.split('|').some((cell) => CLASSES.has(cell.trim().replaceAll('`', '')))).length;

const VERDICTS = new Set(['ready', 'ready-with-assumptions', 'not-ready']);

export const CHECKS = {
  basis: ({ root, file }) => result(read(root, `qa/basis/${file}.md`) === null ? [absent(`qa/basis/${file}.md`)] : []),

  'review-not-blocked': ({ root, file }) => {
    const path = `qa/basis/${file}.review.md`;
    const text = read(root, path);
    if (text === null) return result([absent(path)]);
    const verdict = String(parseFrontmatter(text).verdict ?? '').toLowerCase();
    if (!VERDICTS.has(verdict)) return result([`${path} has no verdict: ready, ready-with-assumptions, or not-ready`]);
    if (verdict === 'not-ready') return result([], 'the basis review is not-ready: the owner must settle its contradictions first');
    return result([]);
  },

  'register-section': ({ root, item }) => {
    const rows = registerRows(root, item);
    return result(rows && rows.length > 0 ? [] : [`qa/risk-register.md has no "## ${item}:" section with risks`]);
  },

  cases: ({ root, file }) => {
    const path = `qa/cases/${file}.md`;
    const text = read(root, path);
    if (text === null) return result([absent(path)]);
    return result(/^\|\s*TC-/m.test(text) ? [] : [`${path} has no cases`]);
  },

  'plan-exit-criteria': ({ root, file }) => {
    const path = `qa/plans/${file}.md`;
    const text = read(root, path);
    if (text === null) return result([absent(path)]);
    const section = text.split(/^## /m).find((part) => part.startsWith('Exit criteria')) ?? '';
    const lines = section.split('\n').slice(1).filter((line) => line.trim());
    return result(lines.length > 0 ? [] : [`${path} has no exit criteria`]);
  },

  'cases-automated': ({ root, item, file }) => {
    if (read(root, `qa/cases/${file}.md`) === null) return result([absent(`qa/cases/${file}.md`)]);
    const trace = buildTrace(root);
    // With no cases under the item, there would be no gaps to report: that is not done.
    if (!trace.items.some((entry) => entry.work_item === item && entry.cases.length > 0)) {
      return result([`the trace has no cases for ${item}: check work_item in qa/cases/${file}.md`]);
    }
    return result(coverage(trace, item).cases_without_tests.map((id) => `${id} has no test and no not_automated reason`));
  },

  'failures-classed': ({ root }) => {
    const runs = latestRuns(root);
    if (runs.length === 0) return result(['no run in qa/runs/ yet']);
    const missing = [];
    for (const name of runs) {
      const count = failures(read(root, `qa/runs/${name}`) ?? '', name);
      if (count === null) {
        missing.push(`qa/runs/${name} cannot be read`);
        continue;
      }
      if (count === 0) continue;
      const triage = `qa/runs/${name.replace(/\.(json|xml)$/, '.triage.md')}`;
      const text = read(root, triage);
      if (text === null) missing.push(`${triage} does not exist: ${count} failure(s) to class`);
      else if (classedRows(text) < count) missing.push(`${triage} classes ${classedRows(text)} of ${count} failures`);
    }
    return result(missing);
  },

  // The ledger is the only record of qa:test-reviewer's work. The engine's own ledger lines never name an agent, so
  // they cannot satisfy this check.
  'review-recorded': ({ root, file }) => {
    const ledger = read(root, `qa/state/${file}.md`) ?? '';
    return result(/^-.*\btest-reviewer\b/m.test(ledger) ? [] : [`qa/state/${file}.md has no line from qa:test-reviewer`]);
  },

  'report-verdict': ({ root, file }) => {
    const path = `qa/reports/${file}.md`;
    const text = read(root, path);
    if (text === null) return result([absent(path)]);
    const front = parseFrontmatter(text);
    const done = front.kind === 'completion' && ['met', 'not-met', 'awaiting-owner'].includes(front.exit_criteria);
    return result(done ? [] : [`${path} is not a completion report with a verdict`]);
  },
};

export const CHECK_NAMES = Object.keys(CHECKS);
