#!/usr/bin/env node
/**
 * Keeps qa/trace.json current: work item -> risk -> case -> test -> result (CTFL 1.4.4).
 *
 *   trace.mjs update   [--root <dir>]                         rebuild qa/trace.json from the qa/ folder and the tests
 *   trace.mjs coverage [--root <dir>] [--item <id>] [--strict] print the gaps; --strict exits 1 when there are any
 *
 * Sources: qa/risk-register.md, qa/cases/*.md, test files that name a case id (TC-<item>-<nn>) in a test title,
 * result files in qa/runs/ (Jest-format JSON or JUnit XML, oldest first), and qa/defects/*.md.
 * No npm dependencies: this runs in any project.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

const CASE_ID = /TC-[A-Za-z0-9-]+-\d{2,}\b/g;
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'qa', 'dist', 'build', 'coverage', 'Pods', '.gradle']);

/** A small YAML subset: scalars, quoted strings, [inline, lists], and one level of nested map or list. */
export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const scalar = (raw) => {
    const value = raw.trim();
    if (/^".*"$/.test(value)) return JSON.parse(value);
    if (/^'.*'$/.test(value)) return value.slice(1, -1);
    if (/^\[.*\]$/.test(value)) {
      const inner = value.slice(1, -1).trim();
      return inner ? inner.split(',').map((item) => scalar(item)) : [];
    }
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    return value;
  };
  const result = {};
  let parent = null;
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const nested = line.match(/^\s+(?:- (.*)|([^:]+):\s*(.*))$/);
    if (nested && parent) {
      if (nested[1] !== undefined) {
        result[parent] = Array.isArray(result[parent]) ? result[parent] : [];
        result[parent].push(scalar(nested[1]));
      } else {
        result[parent] = result[parent] && !Array.isArray(result[parent]) ? result[parent] : {};
        result[parent][scalar(nested[2])] = scalar(nested[3]);
      }
      continue;
    }
    const top = line.match(/^([^:\s][^:]*):\s*(.*)$/);
    if (!top) continue;
    if (top[2].trim() === '') {
      parent = top[1].trim();
      result[parent] = null;
    } else {
      parent = null;
      result[top[1].trim()] = scalar(top[2]);
    }
  }
  return result;
}

const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const filesIn = (dir, pattern) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => pattern.test(name))
        .sort()
        .map((name) => join(dir, name))
    : [];

/** Table rows after the header row that starts with `| Id |`, as arrays of trimmed cells. */
function tableRows(text) {
  const rows = [];
  let inTable = false;
  for (const line of text.split('\n')) {
    if (/^\|\s*Id\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.trim().startsWith('|')) {
      inTable = false;
      continue;
    }
    if (/^\|\s*-{3}/.test(line)) continue;
    rows.push(line.split('|').slice(1, -1).map((cell) => cell.trim()));
  }
  return rows;
}

/** The heading `/qa:onboard` gives its draft of product risks: a starting point, not a work item. */
const DRAFT_SECTION = /^Product: first pass\s*$/i;

/** Risks per work item, from the `## <item>: <title>` sections of the register, except the onboard draft. */
function readRisks(root) {
  const risks = new Map();
  const sections = read(join(root, 'qa/risk-register.md')).split(/^## /m).slice(1);
  for (const section of sections) {
    const heading = section.split('\n')[0];
    if (DRAFT_SECTION.test(heading)) continue;
    const item = heading.split(':')[0].trim();
    const rows = tableRows(section).filter((row) => /^R-/.test(row[0]));
    risks.set(item, rows.map((row) => ({ id: row[0], level: row[4] })));
  }
  return risks;
}

/** Every test file under root, outside dependencies, build output, and the qa folder. */
function testFiles(root, dir = root) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found.push(...testFiles(root, join(dir, entry.name)));
    } else if (TEST_FILE.test(entry.name) || (dir.includes('.maestro') && /\.ya?ml$/.test(entry.name))) {
      found.push(join(dir, entry.name));
    }
  }
  return found;
}

/** Case id -> test file paths (relative to root) that name it. */
function testsByCase(root) {
  const byCase = new Map();
  for (const file of testFiles(root)) {
    const path = relative(root, file);
    for (const id of new Set(read(file).match(CASE_ID) ?? [])) {
      byCase.set(id, [...(byCase.get(id) ?? []), path]);
    }
  }
  return byCase;
}

const STATUS = { passed: 'passed', failed: 'failed', pending: 'not-run', skipped: 'not-run', todo: 'not-run', disabled: 'not-run' };

const SEVERITY = { passed: 0, 'not-run': 1, failed: 2 };

/**
 * Case id -> latest result, read from qa/runs/ oldest first so later runs win. Within one run a case takes the
 * worst result of its tests, so one failing row of an `it.each` table fails the case whatever its position.
 */
function resultsByCase(root) {
  const results = new Map();
  for (const file of filesIn(join(root, 'qa/runs'), /\.(json|xml)$/)) {
    const run = new Map();
    const record = (title, result) => {
      for (const id of new Set(title.match(CASE_ID) ?? [])) {
        if (!run.has(id) || SEVERITY[result] > SEVERITY[run.get(id)]) run.set(id, result);
      }
    };
    const text = read(file);
    if (file.endsWith('.json')) {
      let report;
      try {
        report = JSON.parse(text);
      } catch {
        continue;
      }
      for (const suite of report.testResults ?? []) {
        for (const assertion of suite.assertionResults ?? []) {
          record(assertion.fullName ?? assertion.title ?? '', STATUS[assertion.status] ?? 'not-run');
        }
      }
    } else {
      for (const [, attributes, body = ''] of text.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
        const name = attributes.match(/\bname="([^"]*)"/)?.[1] ?? '';
        const result = /<(failure|error)\b/.test(body) ? 'failed' : /<skipped\b/.test(body) ? 'not-run' : 'passed';
        record(name, result);
      }
    }
    for (const [id, result] of run) results.set(id, result);
  }
  return results;
}

/** Case id -> defect id, from the defect reports that name the case. */
function defectsByCase(root) {
  const byCase = new Map();
  for (const file of filesIn(join(root, 'qa/defects'), /^D-\d+\.md$/)) {
    const front = parseFrontmatter(read(file));
    for (const id of front.cases ?? []) byCase.set(id, front.id);
  }
  return byCase;
}

/** The trace for every work item that has a cases file or a register section. */
export function buildTrace(root) {
  const risks = readRisks(root);
  const tests = testsByCase(root);
  const results = resultsByCase(root);
  const defects = defectsByCase(root);
  const items = new Map();

  for (const file of filesIn(join(root, 'qa/cases'), /\.md$/)) {
    const text = read(file);
    const front = parseFrontmatter(text);
    const notAutomated = front.not_automated ?? {};
    const cases = tableRows(text)
      .filter((row) => /^TC-/.test(row[0]))
      .map(([id, technique, riskCell]) => {
        const entry = { id, technique };
        const risk = riskCell?.match(/R-[A-Za-z0-9-]+-\d+/)?.[0];
        if (risk) entry.risk = risk;
        if (notAutomated[id]) entry.not_automated = notAutomated[id];
        entry.tests = (tests.get(id) ?? []).map((path) => {
          const test = { path, result: results.get(id) ?? 'not-run' };
          if (test.result === 'failed' && defects.has(id)) test.defect = defects.get(id);
          return test;
        });
        return entry;
      });
    items.set(front.work_item, { work_item: front.work_item, risks: risks.get(front.work_item) ?? [], cases });
  }
  for (const [item, itemRisks] of risks) {
    if (!items.has(item)) items.set(item, { work_item: item, risks: itemRisks, cases: [] });
  }
  return { items: [...items.values()] };
}

/** Gaps in a trace, optionally for one work item. `complete` is true when nothing is missing, failed, or unrun. */
export function coverage(trace, item) {
  const items = trace.items.filter((entry) => !item || entry.work_item === item);
  const report = { risks_without_cases: [], cases_without_tests: [], failed: [], not_run: [], passed: [] };
  for (const entry of items) {
    const covered = new Set(entry.cases.map((testCase) => testCase.risk));
    report.risks_without_cases.push(...entry.risks.filter((risk) => !covered.has(risk.id)).map((risk) => risk.id));
    for (const testCase of entry.cases) {
      if (testCase.tests.length === 0) {
        if (!testCase.not_automated) report.cases_without_tests.push(testCase.id);
        continue;
      }
      const results = testCase.tests.map((test) => test.result);
      if (results.includes('failed')) report.failed.push(testCase.id);
      else if (results.includes('not-run') || results.includes('blocked')) report.not_run.push(testCase.id);
      else report.passed.push(testCase.id);
    }
  }
  report.complete = Object.entries(report).every(([key, list]) => key === 'passed' || list.length === 0);
  return report;
}

function main(args) {
  const [command] = args;
  const option = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const rootArg = option('--root') ?? '.';
  const root = isAbsolute(rootArg) ? rootArg : resolve(rootArg);

  if (command === 'update') {
    const trace = buildTrace(root);
    writeFileSync(join(root, 'qa/trace.json'), `${JSON.stringify(trace, null, 2)}\n`);
    const cases = trace.items.reduce((sum, entry) => sum + entry.cases.length, 0);
    console.log(`qa/trace.json: ${trace.items.length} work item(s), ${cases} case(s)`);
    return 0;
  }
  if (command === 'coverage') {
    const tracePath = join(root, 'qa/trace.json');
    const trace = existsSync(tracePath) ? JSON.parse(read(tracePath)) : buildTrace(root);
    const report = coverage(trace, option('--item'));
    for (const [key, list] of Object.entries(report)) {
      if (Array.isArray(list)) console.log(`${key}: ${list.length ? list.join(', ') : 'none'}`);
    }
    console.log(`complete: ${report.complete}`);
    return args.includes('--strict') && !report.complete ? 1 : 0;
  }
  console.error('usage: trace.mjs update|coverage [--root <dir>] [--item <id>] [--strict]');
  return 2;
}

if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) exit(main(argv.slice(2)));
