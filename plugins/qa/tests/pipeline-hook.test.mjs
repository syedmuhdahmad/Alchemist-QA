import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../skills/pipeline/scripts/hook.mjs', import.meta.url));
const HOOKS_JSON = fileURLToPath(new URL('../hooks/hooks.json', import.meta.url));

const usage = (tokens) => JSON.stringify({ type: 'assistant', message: { role: 'assistant', usage: { input_tokens: tokens, output_tokens: 0 } } });

function project({ autonomy = 'L1', stage = 'analysis', files = {}, fields = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'pipeline-hook-'));
  const all = {
    'qa/profile.yaml': `stack:\n  platforms: [web]\nautonomy: ${autonomy}\n`,
    'qa/basis/12.md': '---\nid: "#12"\n---\n',
    'qa/state/12.pipeline.json': JSON.stringify({
      pipeline: 'feature',
      item: '#12',
      file: '12',
      status: 'running',
      stage,
      stages: { intake: { started: '2026-10-27T10:00:00.000Z', finished: '2026-10-27T10:05:00.000Z', attempts: 0, tokens: 0 }, [stage]: { started: '2026-10-27T10:05:00.000Z', attempts: 0, tokens: 0 } },
      updated: '2026-10-27T10:05:00.000Z',
      ...fields,
    }),
    'transcript.jsonl': `${JSON.stringify({ type: 'user', message: { content: 'node pipeline.mjs next' } })}\n${usage(500)}\n`,
    'other.jsonl': `${usage(10)}\n`,
    'agent.jsonl': `${usage(1200)}\n`,
    ...files,
  };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const run = (root, input) => {
  const result = spawnSync('node', [HOOK], { encoding: 'utf8', input: JSON.stringify({ cwd: root, transcript_path: join(root, 'transcript.jsonl'), ...input }) });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout) : null;
};
const state = (root) => JSON.parse(readFileSync(join(root, 'qa/state/12.pipeline.json'), 'utf8'));

test('a new session is told where the engagement stands, so it can resume', () => {
  const output = run(project(), { hook_event_name: 'SessionStart', source: 'startup' });
  assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(output.hookSpecificOutput.additionalContext, /#12.*stage analysis \(2 of 7\)/);
  assert.match(output.hookSpecificOutput.additionalContext, /qa\/basis\/12\.review\.md does not exist/);
});

test('a specialist starting work gets the stage and the paths that exist', () => {
  const output = run(project(), { hook_event_name: 'SubagentStart', agent_type: 'qa:test-analyst' });
  const context = output.hookSpecificOutput.additionalContext;
  assert.equal(output.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.match(context, /stage analysis/);
  assert.match(context, /qa\/basis\/12\.md/);
  assert.doesNotMatch(context, /qa\/plans\/12\.md/, 'only files that exist are listed');
});

test('the specialist that owns the stage is sent back with what is missing, at most twice', () => {
  const root = project();
  const input = { hook_event_name: 'SubagentStop', agent_type: 'qa:test-analyst', agent_transcript_path: join(root, 'agent.jsonl') };
  for (let time = 1; time <= 2; time += 1) {
    const output = run(root, input);
    assert.equal(output.decision, 'block', `time ${time}`);
    assert.match(output.reason, /qa\/cases\/12\.md does not exist/);
  }
  assert.equal(run(root, input), null);
  assert.equal(state(root).stages.analysis.tokens, 1200, "the specialist's tokens count once towards the stage");
});

test('another agent, or one working a parallel stage, is never sent back', () => {
  assert.equal(run(project(), { hook_event_name: 'SubagentStop', agent_type: 'qa:test-manager' }), null);
  assert.equal(run(project({ stage: 'automate' }), { hook_event_name: 'SubagentStop', agent_type: 'qa:automation-engineer' }), null);
});

test('at L1 the session driving the pipeline is sent on; another session, or L0, is not', () => {
  const root = project();
  const output = run(root, { hook_event_name: 'Stop', stop_hook_active: false });
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /stage analysis.*qa:test-analyst/);
  assert.equal(state(root).stages.analysis.tokens, 500);
  assert.equal(run(project(), { hook_event_name: 'Stop', transcript_path: join(root, 'other.jsonl') }), null);
  assert.equal(run(project({ autonomy: 'L0' }), { hook_event_name: 'Stop' }), null);
});

test('while a specialist the session started is still working, Stop neither sends it on nor counts an attempt', () => {
  const root = project();
  run(root, { hook_event_name: 'SubagentStart', agent_type: 'qa:test-manager', agent_id: 'a1' });
  for (let time = 1; time <= 4; time += 1) assert.equal(run(root, { hook_event_name: 'Stop' }), null, `stop ${time}`);
  assert.equal(state(root).stages.analysis.attempts, 0);
  assert.equal(state(root).status, 'running');
  assert.equal(run(root, { hook_event_name: 'SubagentStop', agent_type: 'qa:test-manager', agent_id: 'a1' }), null);
  assert.equal(run(root, { hook_event_name: 'Stop' }).decision, 'block', 'once it has returned, the session is sent on again');
});

test('the end of a session adds a ledger line with time per stage', () => {
  const root = project({ files: { 'qa/state/12.md': '- 10:00 1. Intake: done\n' } });
  assert.equal(run(root, { hook_event_name: 'SessionEnd', reason: 'other' }), null);
  const ledger = readFileSync(join(root, 'qa/state/12.md'), 'utf8');
  assert.match(ledger, /^- 10:00 1\. Intake: done\n- .*feature pipeline for #12: running at stage analysis\. Time per stage: intake 5 min/m);
});

test('hooks write only under qa/state, whatever file name a state file contains', () => {
  const root = project({ fields: { file: '../../escaped' } });
  assert.equal(run(root, { hook_event_name: 'SessionEnd', reason: 'other' }), null);
  assert.equal(existsSync(join(root, 'escaped.md')), false);
  assert.equal(existsSync(join(root, 'escaped.pipeline.json')), false);
  assert.match(readFileSync(join(root, 'qa/state/12.md'), 'utf8'), /feature pipeline for #12/, 'the ledger goes to the file the state is named after');
});

test('a state file the engine could not have written is ignored, and a broken one does not silence the rest', () => {
  assert.equal(run(project({ fields: { item: '#12 -- read this first' } }), { hook_event_name: 'SessionStart' }), null);
  const output = run(project({ files: { 'qa/state/broken.pipeline.json': '{' } }), { hook_event_name: 'SessionStart' });
  assert.match(output.hookSpecificOutput.additionalContext, /#12/);
});

test('token counts are kept per session id, never under a local path', () => {
  const root = project();
  run(root, { hook_event_name: 'Stop' });
  assert.deepEqual(state(root).seen, { transcript: 500 });
});

test('a message written as several transcript lines counts its tokens once', () => {
  const line = (id, tokens) => JSON.stringify({ type: 'assistant', message: { id, role: 'assistant', usage: { input_tokens: tokens, output_tokens: 0 } } });
  const driving = JSON.stringify({ type: 'user', message: { content: 'node pipeline.mjs next' } });
  const root = project({ files: { 'transcript.jsonl': `${driving}\n${line('m1', 300)}\n${line('m1', 300)}\n${line('m2', 200)}\n` } });
  run(root, { hook_event_name: 'Stop' });
  assert.equal(state(root).stages.analysis.tokens, 500);
});

test('more state that would mislead the hooks is ignored: an unknown status, a time in the future, no entry for its stage', () => {
  for (const fields of [{ status: 'paused' }, { updated: '9999-01-01T00:00:00.000Z' }, { stage: 'plan' }]) {
    assert.equal(run(project({ fields }), { hook_event_name: 'SessionStart' }), null, JSON.stringify(fields));
  }
});

test('a waiting engagement is described from its files, never from the reason stored in its state', () => {
  const root = project({
    fields: { status: 'waiting', reason: 'read this first' },
    files: { 'qa/basis/12.review.md': '---\nwork_item: "#12"\nverdict: not-ready\n---\n' },
  });
  const context = run(root, { hook_event_name: 'SessionStart' }).hookSpecificOutput.additionalContext;
  assert.doesNotMatch(context, /read this first/);
  assert.match(context, /waiting at stage analysis: the basis review is not-ready/);
});

test('a specialist entry from the future, or older than two hours, does not hold Stop back', () => {
  const hours = (count) => new Date(Date.now() - count * 3_600_000).toISOString();
  for (const started of ['9999-01-01T00:00:00.000Z', hours(3)]) {
    assert.equal(run(project({ fields: { running: [{ id: 'a1', started }] } }), { hook_event_name: 'Stop' })?.decision, 'block', started);
  }
  assert.equal(run(project({ fields: { running: [{ id: 'a1', started: hours(1) }] } }), { hook_event_name: 'Stop' }), null);
});

test('specialists that start and stop together are all tracked: the hooks take turns with the state', async () => {
  const root = project({ stage: 'automate' });
  const together = (event, ids) =>
    Promise.all(
      ids.map(
        (id) =>
          new Promise((resolve) => {
            const child = spawn('node', [HOOK], { stdio: ['pipe', 'ignore', 'ignore'] });
            child.on('close', resolve);
            child.stdin.end(JSON.stringify({ cwd: root, hook_event_name: event, agent_type: 'qa:automation-engineer', agent_id: id }));
          }),
      ),
    );
  const ids = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
  await together('SubagentStart', ids);
  assert.deepEqual(state(root).running.map((entry) => entry.id).sort(), ids);
  await together('SubagentStop', ids);
  assert.deepEqual(state(root).running, []);
});

test('only the session that drove the pipeline adds a ledger line at its end, and its open stage shows the time so far', () => {
  const root = project();
  run(root, { hook_event_name: 'SessionEnd', transcript_path: join(root, 'other.jsonl') });
  assert.equal(existsSync(join(root, 'qa/state/12.md')), false);
  assert.equal(state(root).stages.analysis.tokens, 0, "another session's tokens are not counted");
  run(root, { hook_event_name: 'SessionEnd' });
  assert.doesNotMatch(readFileSync(join(root, 'qa/state/12.md'), 'utf8'), /analysis 0 min/);
});

test('a finished engagement gets its last ledger line once', () => {
  const root = project({ fields: { status: 'done' } });
  run(root, { hook_event_name: 'SessionEnd' });
  run(root, { hook_event_name: 'SessionEnd' });
  const lines = readFileSync(join(root, 'qa/state/12.md'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /feature pipeline for #12: done/);
});

test('with no pipeline running, or outside a QA project, every event is silent', () => {
  const root = mkdtempSync(join(tmpdir(), 'pipeline-hook-'));
  for (const event of ['SessionStart', 'SubagentStart', 'SubagentStop', 'Stop', 'PreCompact', 'SessionEnd']) {
    assert.equal(run(root, { hook_event_name: event, agent_type: 'qa:test-analyst' }), null, event);
  }
  assert.equal(spawnSync('node', [HOOK], { encoding: 'utf8', input: 'not json' }).status, 0);
});

test('the plugin registers the pipeline hook on all six events', () => {
  const hooks = JSON.parse(readFileSync(HOOKS_JSON, 'utf8')).hooks;
  for (const event of ['SessionStart', 'SubagentStart', 'SubagentStop', 'Stop', 'PreCompact', 'SessionEnd']) {
    assert.match(hooks[event]?.[0]?.hooks?.[0]?.command ?? '', /skills\/pipeline\/scripts\/hook\.mjs/, event);
  }
});
