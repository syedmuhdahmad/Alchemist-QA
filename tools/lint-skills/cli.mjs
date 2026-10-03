#!/usr/bin/env node
/** Usage: node tools/lint-skills/cli.mjs <root>. Exits 1 on any error or when no skills are found. */
import { relative } from 'node:path';
import { findSkills, lintSkill } from './lint-skills.mjs';

const root = process.argv[2] ?? 'plugins';
const skills = findSkills(root);
if (skills.length === 0) {
  console.log(`no skills found under ${root}`);
  process.exit(1);
}

const findings = skills.flatMap(lintSkill);
for (const finding of findings) {
  console.log(`${relative(process.cwd(), finding.file)}: ${finding.level} [${finding.rule}] ${finding.message}`);
}

const count = (level) => findings.filter((finding) => finding.level === level).length;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
console.log(
  `${plural(skills.length, 'skill')} checked, ${plural(count('error'), 'error')}, ${plural(count('warning'), 'warning')}`,
);
process.exit(count('error') > 0 ? 1 : 0);
