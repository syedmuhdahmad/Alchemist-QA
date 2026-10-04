#!/usr/bin/env node
/**
 * Drafts what the department would post back to a GitHub issue, for a person to review. Posts nothing.
 * Usage: node github-writeback.mjs <issue-number> --report qa/reports/<file>.md [--repo owner/name]
 *
 * Writes qa/outbox/<number>-comment.md (a summary of the report) and qa/outbox/D-<n>-issue.md for each defect
 * report a person has approved (status: approved), then prints the gh commands that would post them.
 * No npm dependencies: plugins run on the user's machine as shipped.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../../traceability/scripts/trace.mjs';

const withoutFrontmatter = (text) => text.replace(/^---\n[\s\S]*?\n---\n*/, '');

/** The body of a `## <title>` section, without its heading, or '' when there is none. */
function section(text, title) {
  const match = withoutFrontmatter(text).match(new RegExp(`^## ${title}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match ? match[1].trim() : '';
}

/**
 * @param {string} report a qa/reports/<file>.md file
 * @param {string[]} defects the qa/defects/D-<n>.md files for the same work item
 * @param {string} reportPath where the report lives, for the link
 */
export function draftComment(report, defects, reportPath) {
  const front = parseFrontmatter(report);
  const verdict = {
    met: 'exit criteria met',
    'not-met': 'exit criteria not met',
    'awaiting-owner': `waiting on the owner's answers (${[front.awaiting ?? []].flat().join(', ')})`,
  }[front.exit_criteria] ?? 'exit criteria not met';
  const headline =
    front.kind === 'completion'
      ? `**Test completion report for ${front.work_item}: ${verdict}.**`
      : `**Test progress report for ${front.work_item}.**`;
  const parts = [`<!-- alchemist-qa:report ${front.work_item} -->\n${headline}`];
  for (const title of ['Summary', 'Exit criteria', 'Waiting on the owner', 'Risk remaining']) {
    const body = section(report, title);
    // "None." under Risk remaining tells the issue's readers no risk is left; under Waiting on the owner it says nothing.
    if (!body || (title === 'Waiting on the owner' && /^none\.?$/i.test(body))) continue;
    parts.push(title === 'Summary' ? body : `### ${title}\n\n${body}`);
  }
  if (defects.length > 0) {
    const lines = defects.map((text) => {
      const defect = parseFrontmatter(text);
      const state = defect.status === 'draft' ? 'waiting for review' : defect.status;
      return `- ${defect.id} (${defect.severity}): ${defect.title}: ${state}`;
    });
    parts.push(`### Defects\n\n${lines.join('\n')}`);
  }
  parts.push(`Full report: \`${reportPath}\`. Drafted by Alchemist-QA and reviewed by a person before posting.`);
  return `${parts.join('\n\n')}\n`;
}

/** @param {string} defect a qa/defects/D-<n>.md file */
export function draftDefectIssue(defect) {
  const front = parseFrontmatter(defect);
  const body = withoutFrontmatter(defect).replace(/^# .*\n+/, '');
  return {
    title: front.title,
    body: `Found while testing ${front.work_item} (cases: ${(front.cases ?? []).join(', ')}). Severity: ${front.severity}. Defect report ${front.id}.\n\n${body}`,
  };
}

function main(args) {
  const [number] = args;
  const option = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const reportPath = option('--report');
  if (!/^\d+$/.test(number ?? '') || !reportPath || reportPath.startsWith('--')) {
    console.error('usage: github-writeback.mjs <issue-number> --report qa/reports/<file>.md [--repo owner/name]');
    return 2;
  }
  const repo = option('--repo');
  const report = readFileSync(reportPath, 'utf8');
  const workItem = parseFrontmatter(report).work_item;
  const defectDir = join('qa', 'defects');
  const defects = existsSync(defectDir)
    ? readdirSync(defectDir)
        .filter((name) => /^D-\d+\.md$/.test(name))
        .sort()
        .map((name) => readFileSync(join(defectDir, name), 'utf8'))
        .filter((text) => parseFrontmatter(text).work_item === workItem)
    : [];

  mkdirSync(join('qa', 'outbox'), { recursive: true });
  const repoFlag = repo ? ` --repo ${repo}` : '';
  const commands = [];
  const commentPath = join('qa', 'outbox', `${number}-comment.md`);
  writeFileSync(commentPath, draftComment(report, defects, reportPath));
  commands.push(`gh issue comment ${number}${repoFlag} --body-file ${commentPath}`);

  for (const text of defects.filter((text) => parseFrontmatter(text).status === 'approved')) {
    const { title, body } = draftDefectIssue(text);
    const path = join('qa', 'outbox', `${parseFrontmatter(text).id}-issue.md`);
    writeFileSync(path, body);
    commands.push(`gh issue create${repoFlag} --title ${JSON.stringify(title)} --label bug --body-file ${path}`);
  }
  const waiting = defects.filter((text) => parseFrontmatter(text).status === 'draft').map((text) => parseFrontmatter(text).id);

  console.log('Drafted for review:');
  for (const command of commands) console.log(`  ${command.split('--body-file ')[1]}`);
  if (waiting.length > 0) console.log(`Not drafted, still waiting for review: ${waiting.join(', ')}`);
  console.log('Nothing was posted. After a person has read the drafts, these commands post them:');
  for (const command of commands) console.log(`  ${command}`);
  return 0;
}

if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) exit(main(argv.slice(2)));
