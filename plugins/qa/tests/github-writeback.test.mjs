import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { draftComment, draftDefectIssue } from '../skills/intake-github/scripts/github-writeback.mjs';

const SCRIPT = new URL('../skills/intake-github/scripts/github-writeback.mjs', import.meta.url).pathname;

const REPORT = `---
work_item: "#12"
kind: completion
exit_criteria: not-met
---

# Test completion report: Apply a promo code

## Summary

Five cases ran. One high-risk case failed, so testing cannot stop.

## Results

| Risk | Level | Cases | Passed | Failed | Not run | No test |
| --- | --- | --- | --- | --- | --- | --- |
| R-12-1 | high | 2 | 1 | 1 | 0 | 0 |

## Exit criteria

| Criterion | Met | Evidence |
| --- | --- | --- |
| Every case for R-12-1 passed | no | TC-12-01 failed |

## Risk remaining

- R-12-1: sale items are discounted.
`;

const defect = (status) => `---
id: D-0001
title: SAVE10 discounts products on sale
work_item: "#12"
cases: [TC-12-01]
severity: major
status: ${status}
---

# D-0001: SAVE10 discounts products on sale

## Steps to reproduce

1. Add a sale product priced 20.00.
2. Apply SAVE10.

## Expected

No discount, per Criterion 2 of #12.

## Actual

Discount 2.00.
`;

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'writeback-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

test('the comment leads with the verdict and carries the summary and the exit criteria', () => {
  const comment = draftComment(REPORT, [], 'qa/reports/12.md');
  assert.match(comment, /^<!-- alchemist-qa:report #12 -->\n\*\*Test completion report for #12: exit criteria not met\.\*\*/);
  assert.match(comment, /Five cases ran\./);
  assert.match(comment, /\| Every case for R-12-1 passed \| no \| TC-12-01 failed \|/);
  assert.match(comment, /qa\/reports\/12\.md/);
  assert.doesNotMatch(comment, /## Results/);
});

test('a progress report says it is progress, with no verdict', () => {
  const progress = REPORT.replace('kind: completion', 'kind: progress').replace('exit_criteria: not-met\n', '');
  assert.match(draftComment(progress, [], 'qa/reports/12.md'), /\*\*Test progress report for #12\.\*\*/);
});

test('the comment lists defects and says which still wait for review', () => {
  const comment = draftComment(REPORT, [defect('draft')], 'qa/reports/12.md');
  assert.match(comment, /D-0001 \(major\): SAVE10 discounts products on sale: waiting for review/);
});

test('a defect issue has the report title, its body, and a link back to the work item', () => {
  const issue = draftDefectIssue(defect('approved'));
  assert.equal(issue.title, 'SAVE10 discounts products on sale');
  assert.match(issue.body, /Found while testing #12/);
  assert.match(issue.body, /## Steps to reproduce/);
  assert.doesNotMatch(issue.body, /^---/);
});

test('the CLI drafts files in qa/outbox and prints the gh commands, posting nothing', () => {
  const root = project({
    'qa/reports/12.md': REPORT,
    'qa/defects/D-0001.md': defect('approved'),
    'qa/defects/D-0002.md': defect('draft').replace('D-0001', 'D-0002').replace('id: D-0002', 'id: D-0002'),
  });
  const result = spawnSync('node', [SCRIPT, '12', '--report', 'qa/reports/12.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(join(root, 'qa/outbox/12-comment.md')));
  assert.ok(existsSync(join(root, 'qa/outbox/D-0001-issue.md')), 'approved defect is drafted');
  assert.ok(!existsSync(join(root, 'qa/outbox/D-0002-issue.md')), 'a defect still in draft is not');
  assert.match(result.stdout, /gh issue comment 12 --body-file qa\/outbox\/12-comment\.md/);
  assert.match(result.stdout, /gh issue create --title "SAVE10 discounts products on sale" --label bug --body-file qa\/outbox\/D-0001-issue\.md/);
  assert.match(result.stdout, /Nothing was posted/);
  assert.match(readFileSync(join(root, 'qa/outbox/D-0001-issue.md'), 'utf8'), /Found while testing #12/);
});

test('the CLI needs an issue number and a report', () => {
  const result = spawnSync('node', [SCRIPT, '12'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /usage/);
});
