/** Validates Alchemist-QA testware files against the schemas in plugins/qa/schemas. */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'yaml';

const SCHEMA_DIR = fileURLToPath(new URL('../../plugins/qa/schemas/', import.meta.url));

const ajv = new Ajv2020({ allErrors: true, strict: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8')), file);
}

/** Schema file for a testware path, or undefined when the file is not testware we know. */
function schemaFor(path) {
  const name = basename(path);
  if (name === 'trace.json') return 'trace.schema.json';
  const folder = basename(dirname(path));
  if (folder === 'basis' && name.endsWith('.review.md')) return 'basis-review.schema.json';
  if (folder === 'basis' && name.endsWith('.acceptance.md')) return 'acceptance.schema.json';
  if (folder === 'basis' && name.endsWith('.md')) return 'basis.schema.json';
  const byFolder = { cases: 'cases', defects: 'defect', reports: 'report', plans: 'plan' };
  if (byFolder[folder] && name.endsWith('.md')) return `${byFolder[folder]}.schema.json`;
  const known = { 'routing.yaml': 'routing', 'pipelines.yaml': 'pipelines', 'profile.yaml': 'profile' };
  return known[name] && `${known[name]}.schema.json`;
}

// A basis review's body must have these sections, in this order (docs/testware.md).
const REVIEW_SECTIONS = ['## Findings', '## Assumptions', '## Questions for the owner'];

/** Errors for a basis review body whose required sections are missing or out of order. */
function reviewSectionErrors(path) {
  const body = readFileSync(path, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
  const headings = [];
  let fence = null; // the opening marker of the code fence we are inside, such as ``` or ~~~~
  for (const line of body.split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    } else if (marker) {
      fence = marker;
    } else if (line.startsWith('## ')) {
      headings.push(line.trim());
    }
  }
  const missing = REVIEW_SECTIONS.filter((section) => !headings.includes(section));
  if (missing.length > 0) return missing.map((section) => ({ message: `missing section "${section}"` }));
  const positions = REVIEW_SECTIONS.map((section) => headings.indexOf(section));
  const ordered = positions.every((position, index) => index === 0 || position > positions[index - 1]);
  return ordered ? [] : [{ message: `sections must be in this order: ${REVIEW_SECTIONS.join(', ')}` }];
}

// Techniques a case may name (docs/testware.md). The trace and the reports group cases by them.
export const TECHNIQUES = [
  'equivalence-partitioning',
  'boundary-value',
  'decision-table',
  'state-transition',
  'statement',
  'branch',
  'error-guessing',
  'checklist',
  'exploratory',
  'acceptance',
];
const CASE_HEADER = '| Id | Technique | Risk | Basis | Level | Input and steps | Expected result |';
const CASE_ID = /^TC-[A-Za-z0-9-]+-[0-9]{2,}$/;

/** Errors for a cases file whose case table is missing or has rows the trace could not read. */
function caseTableErrors(path) {
  const rows = readFileSync(path, 'utf8').split('\n');
  const start = rows.findIndex((row) => row.trim() === CASE_HEADER);
  if (start === -1) return [{ message: `missing the case table, whose header is: ${CASE_HEADER}` }];
  const errors = [];
  for (const row of rows.slice(start + 2)) {
    if (!row.trim().startsWith('|')) break;
    const [id, technique] = row.split('|').slice(1).map((cell) => cell.trim());
    if (!CASE_ID.test(id)) errors.push({ message: `case id "${id}" does not follow TC-<item>-<nn>` });
    if (!TECHNIQUES.includes(technique)) {
      errors.push({ message: `case ${id}: technique "${technique}" is not one of ${TECHNIQUES.join(', ')}` });
    }
  }
  return errors;
}

function load(path) {
  const text = readFileSync(path, 'utf8');
  if (!path.endsWith('.md')) return parse(text);
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('file must start with YAML frontmatter');
  return parse(match[1]);
}

/**
 * @param {string} path testware file
 * @returns {{message: string}[]} empty when the file is valid
 */
export function validateFile(path) {
  const schema = schemaFor(path);
  if (!schema) return [{ message: `no schema for ${basename(path)}` }];

  let data;
  try {
    data = load(path);
  } catch (error) {
    return [{ message: `could not parse: ${error.message}` }];
  }

  const validate = ajv.getSchema(schema);
  const errors = validate(data)
    ? []
    : validate.errors.map((error) => {
        const detail = error.params.additionalProperty ?? error.params.propertyName ?? '';
        return { message: `${error.instancePath || '/'} ${error.message}${detail ? ` (${detail})` : ''}` };
      });
  if (schema === 'basis-review.schema.json') return [...errors, ...reviewSectionErrors(path)];
  if (schema === 'cases.schema.json') return [...errors, ...caseTableErrors(path)];
  return errors;
}
