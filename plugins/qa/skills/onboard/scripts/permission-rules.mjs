#!/usr/bin/env node
/**
 * Prints the permission rules /qa:onboard offers for a project's .claude/settings.json, so the scripts the department
 * runs most (trace.mjs, pipeline.mjs, and each tool skill's ensure-deps.sh and run.sh) run without asking each time.
 * Claude Code matches a rule against the command exactly as typed, with `*` for any text, so each rule names one
 * script by its absolute path, in quotes, as the skills run it. A wildcard before the path would also allow
 * `node -e '<any code>' .../pipeline.mjs`.
 * Usage: node permission-rules.mjs [--skill-dir <dir>]...
 *   --skill-dir  the directory of a tool skill the profile uses, such as qa-web:vitest; adds its ensure-deps.sh and
 *                run.sh
 * The paths change when a plugin is updated: the rules then stop matching, and Claude Code asks again until this
 * script is run again. No npm dependencies.
 */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

const QA_SCRIPTS = [
  ['node', 'skills/traceability/scripts/trace.mjs'],
  ['node', 'skills/pipeline/scripts/pipeline.mjs'],
];
const TOOL_SCRIPTS = [
  ['bash', 'scripts/ensure-deps.sh'],
  ['bash', 'scripts/run.sh'],
];

const rule = (runner, path) => `Bash(${runner} "${path}" *)`;
// A quote or a wildcard in a path would change what the rule matches.
const usable = (dir) => isAbsolute(dir) && !/["*\n]/.test(dir);

/** The allow rules for the qa plugin at qaRoot and for each tool skill directory, or an error naming the bad one. */
export function permissionRules(qaRoot, skillDirs = []) {
  if (!usable(qaRoot)) throw new Error(`the qa plugin path cannot be used in a rule: ${qaRoot}`);
  for (const dir of skillDirs) {
    const missing = TOOL_SCRIPTS.map(([, script]) => script).filter((script) => !existsSync(join(dir, script)));
    if (!usable(dir) || missing.length > 0) {
      throw new Error(`--skill-dir takes the absolute path of a tool skill with scripts/ensure-deps.sh and scripts/run.sh: ${dir}`);
    }
  }
  return [
    ...QA_SCRIPTS.map(([runner, script]) => rule(runner, join(qaRoot, script))),
    ...skillDirs.flatMap((dir) => TOOL_SCRIPTS.map(([runner, script]) => rule(runner, join(dir, script)))),
  ];
}

function main(args) {
  const skillDirs = [];
  for (let index = 0; index < args.length; index += 2) {
    if (args[index] !== '--skill-dir' || args[index + 1] === undefined) {
      console.error('usage: permission-rules.mjs [--skill-dir <dir>]...');
      return 2;
    }
    skillDirs.push(args[index + 1]);
  }
  // The plugin root as this script was called, which is how Claude Code fills in the skills' paths.
  const qaRoot = resolve(dirname(argv[1]), '../../..');
  try {
    console.log(JSON.stringify({ permissions: { allow: permissionRules(qaRoot, skillDirs) } }, null, 2));
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  return 0;
}

if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) exit(main(argv.slice(2)));
