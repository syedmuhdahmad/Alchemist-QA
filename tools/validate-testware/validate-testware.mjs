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
  if (basename(dirname(path)) === 'basis' && name.endsWith('.review.md')) return 'basis-review.schema.json';
  if (basename(dirname(path)) === 'basis' && name.endsWith('.md')) return 'basis.schema.json';
  const known = { 'routing.yaml': 'routing', 'pipelines.yaml': 'pipelines', 'profile.yaml': 'profile' };
  return known[name] && `${known[name]}.schema.json`;
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
  if (validate(data)) return [];
  return validate.errors.map((error) => {
    const detail = error.params.additionalProperty ?? error.params.propertyName ?? '';
    return { message: `${error.instancePath || '/'} ${error.message}${detail ? ` (${detail})` : ''}` };
  });
}
