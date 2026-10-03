/** Lints skill folders against docs/authoring.md. */
import { accessSync, constants, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize, relative } from 'node:path';
import { parse } from 'yaml';

const KINDS = ['method', 'tool', 'domain', 'command'];
const FREEDOMS = ['high', 'medium', 'low'];
const MAX_DESCRIPTION = 500;
const MAX_LINES = 500;
const TARGET_LINES = 200;
const CONTENTS_AFTER_LINES = 100;
const MIN_EVAL_CASES = 3;
// Whole-word tool names a method skill must not mention.
const TOOL_NAMES =
  /\b(playwright|vitest|jest|maestro|appium|webdriverio|detox|cypress|selenium|k6|lighthouse|stryker|axe-core|newman|postman|mailpit|semgrep|allure)\b/i;

const lines = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
const hasSection = (body, title) => new RegExp(`^## ${title}\\s*$`, 'm').test(body);

/** Relative link targets in a Markdown file, without anchors or external URLs. */
function links(text) {
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1].split('#')[0])
    .filter((target) => target && !/^[a-z][a-z0-9+.-]*:/i.test(target));
}

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/** Number of eval case folders directly under `dir`: those holding a prompt.md or a case.yaml. */
function evalCases(dir) {
  if (!existsSync(dir)) return 0;
  const isFile = (path) => existsSync(path) && statSync(path).isFile();
  return readdirSync(dir, { withFileTypes: true }).filter(
    (entry) =>
      entry.isDirectory() &&
      (isFile(join(dir, entry.name, 'prompt.md')) || isFile(join(dir, entry.name, 'case.yaml'))),
  ).length;
}

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} skillDir folder that should contain SKILL.md
 * @returns {{rule: string, level: 'error' | 'warning', message: string, file: string}[]}
 */
export function lintSkill(skillDir) {
  const findings = [];
  const skillFile = join(skillDir, 'SKILL.md');
  const add = (rule, message, { level = 'error', file = skillFile } = {}) =>
    findings.push({ rule, level, message, file });

  if (!existsSync(skillFile)) {
    add('skill-file', 'SKILL.md is missing');
    return findings;
  }

  const text = readFileSync(skillFile, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    add('frontmatter', 'SKILL.md must start with YAML frontmatter');
    return findings;
  }
  const front = parse(match[1]) ?? {};
  const body = match[2];
  const metadata = front.metadata ?? {};

  const folder = basename(skillDir);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(front.name ?? '') || front.name !== folder) {
    add('name', `name must be kebab-case and match the folder name "${folder}"`);
  }

  const description = String(front.description ?? '');
  if (!/Use when/.test(description) || !/Not for/.test(description)) {
    add('description', 'description must say "Use when ..." and "Not for ..."');
  } else if (description.length > MAX_DESCRIPTION) {
    add('description', `description is ${description.length} characters; the limit is ${MAX_DESCRIPTION}`);
  }

  if (!KINDS.includes(metadata.kind)) {
    add('kind', `metadata.kind must be one of: ${KINDS.join(', ')}`);
  }
  if (!FREEDOMS.includes(metadata.freedom)) {
    add('freedom', `metadata.freedom must be one of: ${FREEDOMS.join(', ')}`);
  }

  if (!hasSection(body, 'Procedure')) add('section-procedure', 'a "## Procedure" section is required');
  if (metadata.kind === 'tool' && !hasSection(body, 'Gotchas')) {
    add('section-gotchas', 'a tool skill needs a "## Gotchas" section');
  }
  if (metadata.stage && !hasSection(body, 'Checklist')) {
    add('section-checklist', 'a stage skill needs a "## Checklist" section');
  }
  if (metadata.kind === 'method' && TOOL_NAMES.test(body)) {
    add('method-names-tool', `a method skill may not name a tool (found "${body.match(TOOL_NAMES)[0]}")`);
  }

  const length = lines(text);
  if (length > MAX_LINES) {
    add('length', `SKILL.md is ${length} lines; the limit is ${MAX_LINES}`);
  } else if (length > TARGET_LINES) {
    add('length', `SKILL.md is ${length} lines; aim for ${TARGET_LINES} or fewer`, { level: 'warning' });
  }

  // Inside a plugin, eval cases live at <plugin>/evals/<skill>/<case>/, where `claude plugin eval` finds them.
  if (basename(dirname(skillDir)) === 'skills' && KINDS.includes(metadata.kind) && metadata.kind !== 'command') {
    const cases = evalCases(join(dirname(dirname(skillDir)), 'evals', folder));
    if (cases < MIN_EVAL_CASES) {
      add('evals', `found ${cases} eval case(s) in evals/${folder}/; at least ${MIN_EVAL_CASES} are required`);
    }
  }

  const scripts = filesUnder(join(skillDir, 'scripts'));
  if (metadata.freedom === 'low' && scripts.length === 0) {
    add('scripts', 'a low-freedom skill must ship at least one script in scripts/');
  }
  for (const script of scripts.filter((path) => !isExecutable(path))) {
    add('scripts', 'script is not executable', { file: script });
  }
  if (metadata.freedom === 'medium' && filesUnder(join(skillDir, 'templates')).length === 0) {
    add('templates', 'a medium-freedom skill must ship at least one template in templates/');
  }

  const skillLinks = links(text).map((target) => normalize(join(skillDir, target)));
  for (const target of skillLinks.filter((path) => !existsSync(path))) {
    add('broken-link', `link target does not exist: ${relative(skillDir, target)}`);
  }

  const referencesDir = join(skillDir, 'references');
  for (const reference of filesUnder(referencesDir)) {
    if (dirname(reference) !== referencesDir) {
      add('reference-nested', 'references must sit directly in references/', { file: reference });
      continue;
    }
    if (!skillLinks.includes(reference)) {
      add('reference-unlinked', 'reference is not linked from SKILL.md', { file: reference });
    }
    if (statSync(reference).isFile() && reference.endsWith('.md')) {
      const referenceText = readFileSync(reference, 'utf8');
      const pointsAtReference = links(referenceText)
        .map((target) => normalize(join(referencesDir, target)))
        .some((target) => dirname(target) === referencesDir);
      if (pointsAtReference) {
        add('reference-chain', 'a reference may not link to another reference', { file: reference });
      }
      const head = referenceText.split('\n').slice(0, 15).join('\n');
      if (lines(referenceText) > CONTENTS_AFTER_LINES && !hasSection(head, 'Contents')) {
        add('reference-contents', `a reference over ${CONTENTS_AFTER_LINES} lines must start with "## Contents"`, {
          file: reference,
        });
      }
    }
  }

  return findings;
}

/** Every folder under `root` that is a direct child of a `skills/` folder. */
export function findSkills(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isDirectory() && basename(entry.parentPath) === 'skills')
    .filter((entry) => !entry.parentPath.split('/').includes('node_modules'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}
