#!/usr/bin/env node
/**
 * Brings a work item that no tracker holds into QA as a basis file: qa/basis/REQ-<n>.md.
 * Usage:
 *   node manual-item.mjs --from-risk <risk id> [--root <dir>]
 *   node manual-item.mjs --title <title> --request-file <file or -> [--origin <text>] [--type story|bug|task] [--root <dir>]
 * A risk comes from a row of qa/risk-register.md; a request is the person's words, read from a file or stdin (-).
 * The id is one more than the highest REQ-<n> used anywhere in qa/, so an id is never reused, and an existing file
 * is never overwritten. No npm dependencies: plugins run on the user's machine as shipped.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { acceptanceCriteria } from '../../intake-github/scripts/github-issue.mjs';

const REQ_ID = /^REQ-(\d+)\b/;
const TYPES = ['story', 'bug', 'task'];

// A JSON string is a valid YAML scalar, so quoting with JSON keeps colons, quotes, and hashes safe.
const scalar = (value) => JSON.stringify(String(value));

/** The table cells of a Markdown row. A pipe escaped as \| stays inside its cell. */
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());

/** The next unused REQ-<n> id, from the file names under qa/ and the headings of the risk register. */
export function nextRequestId(root) {
  let highest = 0;
  for (const folder of ['basis', 'cases', 'plans', 'reports', 'state', 'charters']) {
    const dir = join(root, 'qa', folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const match = name.match(REQ_ID);
      if (match) highest = Math.max(highest, Number(match[1]));
    }
  }
  const register = join(root, 'qa', 'risk-register.md');
  if (existsSync(register)) {
    for (const match of readFileSync(register, 'utf8').matchAll(/^## REQ-(\d+)\b/gm)) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return `REQ-${highest + 1}`;
}

function basis({ id, type, title, origin, criteria, now, body }) {
  return [
    '---',
    `id: ${scalar(id)}`,
    'source: manual',
    `type: ${type}`,
    `title: ${scalar(title)}`,
    `origin: ${scalar(origin)}`,
    criteria.length === 0 ? 'acceptance_criteria: []' : 'acceptance_criteria:',
    ...criteria.map((criterion) => `  - ${scalar(criterion)}`),
    `created_at: ${scalar(now)}`,
    '---',
    '',
    body.trim(),
    '',
  ].join('\n');
}

/**
 * The basis file for one row of the risk register. Throws when the risk is not there, or is there more than once.
 * @param {string} registerText qa/risk-register.md
 * @param {string} riskId such as R-product-1
 * @param {{id: string, now: string}} options
 */
export function fromRisk(registerText, riskId, { id, now }) {
  const found = [];
  for (const section of registerText.split(/^(?=## )/m)) {
    const lines = section.split('\n');
    const header = lines.find((line) => /^\|\s*Id\s*\|/.test(line));
    for (const line of lines) {
      if (line.trim().startsWith('|') && cells(line)[0] === riskId) {
        found.push({ heading: lines[0].replace(/^## /, '').trim(), header, row: line.trim() });
      }
    }
  }
  if (found.length === 0) throw new Error(`${riskId} is not in the risk register`);
  if (found.length > 1) throw new Error(`${riskId} appears ${found.length} times in the risk register`);
  const [{ heading, header, row }] = found;
  const risk = cells(row)[1]?.replace(/\\\|/g, '|');
  if (!risk) throw new Error(`${riskId} has no risk text in the register`);
  const title = `Risk ${riskId}: ${risk}`;
  const table = header
    ? [header.trim(), `|${' --- |'.repeat(cells(header).length)}`, row].join('\n')
    : row;
  const body = [
    `# ${id}: ${title}`,
    '',
    `There is no tracker item. This work item is risk \`${riskId}\` from \`qa/risk-register.md\`, section "${heading}", brought in on ${now.slice(0, 10)}. It has no acceptance criteria of its own.`,
    '',
    table,
  ].join('\n');
  return basis({ id, type: 'task', title, origin: `qa/risk-register.md ${riskId}`, criteria: [], now, body });
}

/**
 * The basis file for a request a person typed. Acceptance criteria come only from an "Acceptance criteria" list.
 * @param {string} requestText the request, word for word
 * @param {{id: string, title: string, origin?: string, type?: string, now: string}} options
 */
export function fromRequest(requestText, { id, title, origin = 'request in chat', type = 'task', now }) {
  if (!requestText.trim()) throw new Error('the request is empty: there is nothing to test');
  const body = [
    `# ${id}: ${title}`,
    '',
    `There is no tracker item. A person asked for this on ${now.slice(0, 10)}. Their request, word for word:`,
    '',
    requestText.trim(),
  ].join('\n');
  return basis({ id, type, title, origin, criteria: acceptanceCriteria(requestText), now, body });
}

const USAGE = [
  'usage: manual-item.mjs --from-risk <risk id> [--root <dir>]',
  '       manual-item.mjs --title <title> --request-file <file or -> [--origin <text>] [--type story|bug|task] [--root <dir>]',
].join('\n');

function main(args) {
  const fail = (message) => {
    console.error(message);
    return 2;
  };
  const values = {};
  for (const name of ['--from-risk', '--title', '--request-file', '--origin', '--type', '--root']) {
    const index = args.indexOf(name);
    if (index === -1) continue;
    const value = args[index + 1];
    if (value === undefined || (value.startsWith('--') && value !== '-')) return fail(`${name} needs a value\n${USAGE}`);
    values[name] = value;
  }
  const fromRiskMode = values['--from-risk'] !== undefined;
  const requestMode = values['--title'] !== undefined || values['--request-file'] !== undefined;
  if (fromRiskMode === requestMode) return fail(USAGE);
  if (requestMode && (!values['--title']?.trim() || values['--request-file'] === undefined)) return fail(USAGE);
  if (values['--origin'] !== undefined && !values['--origin'].trim()) return fail(`--origin needs a value\n${USAGE}`);
  const type = values['--type'] ?? 'task';
  if (!TYPES.includes(type)) return fail(`--type must be one of ${TYPES.join(', ')}`);

  const root = values['--root'] ?? '.';
  const now = new Date().toISOString();
  const id = nextRequestId(root);
  let text;
  try {
    if (fromRiskMode) {
      const register = join(root, 'qa', 'risk-register.md');
      if (!existsSync(register)) return fail('qa/risk-register.md does not exist, so there is no risk to bring in');
      text = fromRisk(readFileSync(register, 'utf8'), values['--from-risk'], { id, now });
    } else {
      const file = values['--request-file'];
      const request = readFileSync(file === '-' ? 0 : file, 'utf8');
      text = fromRequest(request, { id, title: values['--title'].trim(), origin: values['--origin'], type, now });
    }
  } catch (error) {
    return fail(error.message);
  }
  const dir = join(root, 'qa', 'basis');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${id}.md`);
  try {
    writeFileSync(path, text, { flag: 'wx' });
  } catch (error) {
    return fail(error.code === 'EEXIST' ? `${path} already exists; nothing was written` : error.message);
  }
  console.log(path);
  return 0;
}

if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) exit(main(argv.slice(2)));
