#!/usr/bin/env node
/**
 * Reads one GitHub issue into a basis file: qa/basis/<number>.md.
 * Usage: node github-issue.mjs <issue-number> [--repo owner/name] [--out qa/basis] [--from-json <file>]
 *   --from-json reads a file saved from `gh issue view <n> --json number,title,url,body,labels` instead of calling gh.
 * Needs the gh CLI, logged in, unless --from-json is given. No npm dependencies: plugins run on the user's machine as shipped.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HEADING = /^#{1,6}\s+(.*?)\s*#*\s*$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*\S)\s*$/;

/** List items under the first "Acceptance criteria" heading, up to the next heading. */
export function acceptanceCriteria(body) {
  const criteria = [];
  let inside = false;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(HEADING);
    if (heading) {
      if (inside) break;
      inside = /acceptance criteria/i.test(heading[1]);
      continue;
    }
    const item = inside && line.match(LIST_ITEM);
    if (item) criteria.push(item[1]);
  }
  return criteria;
}

// A JSON string is a valid YAML scalar, so quoting with JSON keeps colons, quotes, and hashes safe.
const scalar = (value) => JSON.stringify(String(value));

export const basisFileName = (number) => `${number}.md`;

/**
 * @param {{number: number, title: string, url: string, body: string | null, labels: {name: string}[]}} issue
 * @param {string} fetchedAt ISO timestamp
 * @returns {string} the basis file's content
 */
export function toBasis(issue, fetchedAt) {
  const body = issue.body ?? '';
  const isBug = (issue.labels ?? []).some((label) => label.name.toLowerCase() === 'bug');
  const criteria = acceptanceCriteria(body);
  return [
    '---',
    `id: ${scalar(`#${issue.number}`)}`,
    'source: github-issues',
    `type: ${isBug ? 'bug' : 'story'}`,
    `title: ${scalar(issue.title)}`,
    `url: ${scalar(issue.url)}`,
    criteria.length === 0 ? 'acceptance_criteria: []' : 'acceptance_criteria:',
    ...criteria.map((criterion) => `  - ${scalar(criterion)}`),
    `fetched_at: ${scalar(fetchedAt)}`,
    '---',
    '',
    body.trim(),
    '',
  ].join('\n');
}

function main(argv) {
  const [number, ...rest] = argv;
  const option = (name, fallback) => {
    const index = rest.indexOf(name);
    if (index === -1) return fallback;
    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      console.error(`${name} needs a value`);
      process.exit(2);
    }
    return value;
  };
  if (!/^\d+$/.test(number ?? '')) {
    console.error('usage: github-issue.mjs <issue-number> [--repo owner/name] [--out qa/basis] [--from-json <file>]');
    process.exit(2);
  }
  const repo = option('--repo');
  const out = option('--out', join('qa', 'basis'));
  const fromJson = option('--from-json');
  const args = ['issue', 'view', number, '--json', 'number,title,url,body,labels', ...(repo ? ['--repo', repo] : [])];
  // --from-json reads the output of the same gh command, saved earlier, so intake works offline.
  const issue = JSON.parse(fromJson ? readFileSync(fromJson, 'utf8') : execFileSync('gh', args, { encoding: 'utf8' }));
  if (String(issue.number) !== number) {
    console.error(`${fromJson} holds issue ${issue.number}, not ${number}`);
    process.exit(2);
  }
  mkdirSync(out, { recursive: true });
  const path = join(out, basisFileName(issue.number));
  writeFileSync(path, toBasis(issue, new Date().toISOString()));
  console.log(path);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
