/**
 * Runs eval cases with `claude -p` instead of `claude plugin eval`, and applies the same graders.
 * For hosts where the eval runner's sandbox cannot start a shell (docs/authoring.md). It has no OS sandbox
 * of its own: the case's fixture and Claude's tools run as you, in a temporary folder.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

/** Splits `---\nfrontmatter\n---\nbody` into [parsed frontmatter, trimmed body]. */
function split(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return match ? [parse(match[1]) ?? {}, match[2].trim()] : [{}, text.trim()];
}

/** A case folder as the eval runner reads it: case.yaml, prompt.md, graders/*.md. */
export function loadCase(dir) {
  const yamlPath = join(dir, 'case.yaml');
  const config = existsSync(yamlPath) ? parse(readFileSync(yamlPath, 'utf8')) ?? {} : {};
  const [front, prompt] = split(readFileSync(join(dir, 'prompt.md'), 'utf8'));
  const graderDir = join(dir, 'graders');
  const graders = readdirSync(graderDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const [grader, body] = split(readFileSync(join(graderDir, name), 'utf8'));
      if (grader.type === 'llm' && !grader.criteria) grader.criteria = body;
      return { name: name.slice(0, -3), ...grader };
    });
  const script = config.context?.scaffold_script;
  return {
    dir,
    name: config.name ?? dir.split('/').pop(),
    prompt,
    allowedTools: front.allowed_tools ?? [],
    timeoutSeconds: front.timeout_seconds ?? 600,
    plugins: (config.plugins ?? []).map((path) => resolve(dir, path)),
    fixture: script ? join(dir, script) : undefined,
    graders,
  };
}

const readIf = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined);

/**
 * @param {object} grader one grader's frontmatter, with `criteria` for llm graders
 * @param {{workspace: string, uses: {name: string, input: object}[], lastMessage: string,
 *          judge: (criteria: string, text: string) => Promise<{passed: boolean, why: string}>}} run
 */
export async function grade(grader, run) {
  const target = (spec) =>
    spec && typeof spec === 'object' ? readIf(join(run.workspace, spec.path)) : run.lastMessage;
  switch (grader.type) {
    case 'file_exists': {
      const present = existsSync(join(run.workspace, grader.path));
      return { passed: present === (grader.exists ?? true), why: present ? 'present' : 'absent' };
    }
    case 'regex': {
      const text = target(grader.target);
      const found = text !== undefined && new RegExp(grader.pattern, grader.flags ?? '').test(text);
      const wanted = (grader.match ?? 'contains') === 'contains';
      return { passed: found === wanted, why: text === undefined ? 'file missing' : found ? 'matched' : 'no match' };
    }
    case 'tool_used': {
      const pattern = grader.input_match && new RegExp(grader.input_match);
      const count = run.uses.filter(
        (use) => use.name === grader.tool && (!pattern || pattern.test(JSON.stringify(use.input))),
      ).length;
      const passed = count >= (grader.min ?? 1) && count <= (grader.max ?? Infinity);
      return { passed, why: `${count} call(s)` };
    }
    case 'llm': {
      const text = target(grader.focus);
      return text === undefined ? { passed: false, why: 'file missing' } : run.judge(grader.criteria, text);
    }
    default:
      return { passed: false, why: `grader type ${grader.type} is not supported here` };
  }
}

/** Asks a small model to judge text against an llm grader's criteria, as the eval runner does. */
export async function judgeWithHaiku(criteria, text) {
  const question = `You are grading an AI agent's work.\n\nCRITERIA:\n${criteria}\n\nWORK:\n${text.slice(0, 12000)}\n\nAnswer with exactly PASS or FAIL on the first line, then one sentence why.`;
  const result = spawnSync('claude', ['-p', '--model', 'haiku'], { input: question, encoding: 'utf8', timeout: 300_000 });
  const answer = (result.stdout ?? '').trim();
  return { passed: answer.startsWith('PASS'), why: answer.split('\n').pop().slice(0, 200) };
}

/**
 * Runs one arm of a case in `workspace`: the fixture, then `claude -p` with the given plugin folders.
 * @returns {Promise<{uses: {name: string, input: object}[], lastMessage: string, costUsd: number}>}
 */
export function runArm(testCase, workspace, pluginDirs, budgetUsd) {
  if (testCase.fixture) {
    const fixture = spawnSync('bash', [testCase.fixture], { cwd: workspace, encoding: 'utf8' });
    if (fixture.status !== 0) throw new Error(`fixture failed: ${fixture.stderr}`);
  }
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--max-budget-usd', String(budgetUsd)];
  for (const dir of pluginDirs) args.push('--plugin-dir', dir);
  if (testCase.allowedTools.length > 0) args.push('--allowedTools', testCase.allowedTools.join(' '));
  return new Promise((resolvePromise) => {
    const child = spawn('claude', args, { cwd: workspace, stdio: ['pipe', 'pipe', 'ignore'] });
    const timer = setTimeout(() => child.kill(), testCase.timeoutSeconds * 2 * 1000);
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stdin.end(testCase.prompt);
    child.on('close', () => {
      clearTimeout(timer);
      const uses = [];
      let lastMessage = '';
      let costUsd = 0;
      for (const line of output.split('\n').filter((l) => l.startsWith('{'))) {
        const event = JSON.parse(line);
        if (event.type === 'assistant') {
          for (const block of event.message?.content ?? []) {
            if (block.type === 'tool_use') uses.push({ name: block.name, input: block.input });
            if (block.type === 'text') lastMessage = block.text;
          }
        }
        if (event.type === 'result') {
          costUsd = event.total_cost_usd ?? 0;
          lastMessage = event.result ?? lastMessage;
        }
      }
      resolvePromise({ uses, lastMessage, costUsd });
    });
  });
}
