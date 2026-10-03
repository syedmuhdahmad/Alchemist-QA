#!/usr/bin/env node
/** Usage: node tools/validate-testware/cli.mjs <dir>. Exits 1 on any error or when no testware is found. */
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validateFile } from './validate-testware.mjs';

const root = process.argv[2] ?? 'qa';
const results = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name))
  .map((file) => ({ file, errors: validateFile(file) }))
  .filter(({ errors }) => !errors.some((error) => error.message.startsWith('no schema for')));

if (results.length === 0) {
  console.log(`no testware found under ${root}`);
  process.exit(1);
}

let errorCount = 0;
for (const { file, errors } of results) {
  for (const error of errors) {
    console.log(`${relative(process.cwd(), file)}: ${error.message}`);
    errorCount += 1;
  }
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
console.log(`${plural(results.length, 'file')} checked, ${plural(errorCount, 'error')}`);
process.exit(errorCount > 0 ? 1 : 0);
