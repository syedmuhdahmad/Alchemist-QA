import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { validateFile } from '../../../../tools/validate-testware/validate-testware.mjs';
import { basisFileName, toBasis } from './github-issue.mjs';

const ISSUE = {
  number: 12,
  title: 'Apply a promo code in the cart',
  url: 'https://github.com/example/shop/issues/12',
  labels: [{ name: 'enhancement' }],
  body: [
    'As a shopper I want to enter a promo code so that I pay less.',
    '',
    '## Acceptance criteria',
    '',
    '- SAVE10 takes 10% off items that are not on sale.',
    '- [ ] Codes are not case-sensitive.',
    '1. An unknown code shows "This code is not valid": nothing changes.',
    '',
    '## Notes',
    '',
    '- Design is in Figma.',
  ].join('\n'),
};
const NOW = '2026-10-03T12:00:00Z';

const frontmatter = (text) => parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, '');

test('the issue number, title, and url become the basis id, title, and url', () => {
  const front = frontmatter(toBasis(ISSUE, NOW));
  assert.deepEqual([front.id, front.title, front.url], ['#12', ISSUE.title, ISSUE.url]);
  assert.equal(front.source, 'github-issues');
});

test('list items under an "Acceptance criteria" heading become the criteria, without list or checkbox markers', () => {
  assert.deepEqual(frontmatter(toBasis(ISSUE, NOW)).acceptance_criteria, [
    'SAVE10 takes 10% off items that are not on sale.',
    'Codes are not case-sensitive.',
    'An unknown code shows "This code is not valid": nothing changes.',
  ]);
});

test('list items under a later heading are not criteria', () => {
  assert.ok(!frontmatter(toBasis(ISSUE, NOW)).acceptance_criteria.includes('Design is in Figma.'));
});

test('an issue with no acceptance criteria section gets an empty list, never a guess', () => {
  const front = frontmatter(toBasis({ ...ISSUE, body: 'Make the cart nicer.\n\n- faster\n- prettier' }, NOW));
  assert.deepEqual(front.acceptance_criteria, []);
});

test('an issue with an empty body still produces a valid basis file', () => {
  const front = frontmatter(toBasis({ ...ISSUE, body: null }, NOW));
  assert.deepEqual(front.acceptance_criteria, []);
});

test('the heading is matched whatever its level or letter case', () => {
  const issue = { ...ISSUE, body: '#### ACCEPTANCE CRITERIA\n* One thing.' };
  assert.deepEqual(frontmatter(toBasis(issue, NOW)).acceptance_criteria, ['One thing.']);
});

test('a bug label makes the work item a bug; otherwise it is a story', () => {
  assert.equal(frontmatter(toBasis({ ...ISSUE, labels: [{ name: 'bug' }] }, NOW)).type, 'bug');
  assert.equal(frontmatter(toBasis(ISSUE, NOW)).type, 'story');
});

test('the issue body is kept below the frontmatter, unchanged', () => {
  assert.equal(body(toBasis(ISSUE, NOW)).trim(), ISSUE.body.trim());
});

test('a title with quotes and a colon survives as written', () => {
  const title = 'Fix "Order placed": wrong number';
  assert.equal(frontmatter(toBasis({ ...ISSUE, title }, NOW)).title, title);
});

test('the result validates against the basis schema', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'intake-')), 'basis');
  mkdirSync(dir);
  const path = join(dir, basisFileName(ISSUE.number));
  writeFileSync(path, toBasis(ISSUE, NOW));
  assert.deepEqual(validateFile(path), []);
});

test('the file is named after the issue number', () => {
  assert.equal(basisFileName(12), '12.md');
});
