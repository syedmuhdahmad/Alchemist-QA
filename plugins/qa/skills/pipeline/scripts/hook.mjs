#!/usr/bin/env node
/**
 * The pipeline's hooks: one script for SessionStart, SubagentStart, SubagentStop, Stop, PreCompact, and SessionEnd.
 * Each reads the hook input as JSON on stdin and acts only in a project with qa/profile.yaml and a pipeline that is
 * running or waiting. On any problem it exits 0 and prints nothing, so a hook never breaks a session.
 *   SessionStart   tells the session where the engagement stands, so it resumes there
 *   SubagentStart  gives a specialist the stage and the paths of the work item's files
 *   SubagentStop   sends the stage's own specialist back with what is missing, at most twice
 *   Stop           at autonomy L1 or above, sends the session that drives the pipeline on to the next stage
 *   PreCompact     checkpoints the state
 *   SessionEnd     adds a ledger line with time and tokens per stage to qa/state/<file>.md
 * No npm dependencies: plugins run on the user's machine as shipped.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { activeState, addTokens, advance, autonomyOf, continueDecision, describe, evaluate, ledgerLine, loadPipelines, saveState } from './pipeline.mjs';

const SEND_BACK = 2;
// A specialist that never reported back stops counting as running after this long.
const RUNNING_FOR = 2 * 60 * 60 * 1000;
const stillRunning = (state, now) => (state.running ?? []).filter((entry) => Date.parse(now) - Date.parse(entry.started) < RUNNING_FOR);

/** Total tokens in a transcript, from the usage of each assistant message. */
function transcriptTokens(path) {
  if (!path || !existsSync(path)) return 0;
  let total = 0;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.includes('"usage"')) continue;
    try {
      const usage = JSON.parse(line).message?.usage ?? {};
      total += (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    } catch {
      // A line that is not JSON adds nothing.
    }
  }
  return total;
}

/**
 * Adds the tokens a transcript gained since this hook last read it to the current stage. Counts are kept under the
 * transcript's session id, because the state is committed and a full path would name the person's home folder.
 */
function countTokens(state, path) {
  if (!path) return state;
  const session = basename(path, '.jsonl');
  state.seen ??= {};
  const total = transcriptTokens(path);
  addTokens(state, Math.max(0, total - (state.seen[session] ?? 0)));
  state.seen[session] = total;
  return state;
}

const context = (event, text) => ({ hookSpecificOutput: { hookEventName: event, additionalContext: text } });
const agentName = (type) => String(type ?? '').replace(/^[\w-]+:/, '');
// Only a session that has worked the pipeline is driven by it; other sessions in the project are left alone.
const drives = (path) => Boolean(path) && existsSync(path) && readFileSync(path, 'utf8').includes('pipeline.mjs');

function paths(root, state) {
  const candidates = [
    `qa/basis/${state.file}.md`,
    `qa/basis/${state.file}.review.md`,
    'qa/risk-register.md',
    `qa/cases/${state.file}.md`,
    `qa/plans/${state.file}.md`,
    'qa/trace.json',
    'qa/runs/',
    `qa/reports/${state.file}.md`,
  ];
  return candidates.filter((path) => existsSync(join(root, path)));
}

function handle(input) {
  const root = input.cwd;
  if (typeof root !== 'string' || !existsSync(join(root, 'qa', 'profile.yaml'))) return null;
  const manifest = loadPipelines();
  const state = activeState(root, manifest);
  if (!state) return null;
  const now = new Date().toISOString();
  const event = input.hook_event_name;

  if (event === 'SessionStart') {
    return context(event, `Alchemist-QA: ${describe(root, state, manifest)} Resume there with the pipeline skill's \`next\`.`);
  }
  if (event === 'SubagentStart') {
    // Remember the specialist, so Stop waits for it instead of spending the stage's attempts.
    saveState(root, { ...state, running: [...stillRunning(state, now), { id: input.agent_id ?? input.agent_type, started: now }] });
    const files = paths(root, state).join(', ');
    return context(event, `Alchemist-QA: ${describe(root, state, manifest)} Work item files: ${files}.`);
  }
  if (event === 'SubagentStop') {
    const counted = countTokens(state, input.agent_transcript_path);
    const { state: current, missing } = advance(root, counted, manifest, now);
    const stage = manifest.pipelines[current.pipeline].stages.find((candidate) => candidate.id === current.stage);
    const entry = current.stages[current.stage];
    const owns = current.status === 'running' && !stage.parallel && stage.agent === agentName(input.agent_type);
    if (owns && (entry.sent_back ?? 0) < SEND_BACK && !evaluate(root, current, stage).met) {
      entry.sent_back = (entry.sent_back ?? 0) + 1;
      saveState(root, current);
      return { decision: 'block', reason: `Stage ${stage.id} of ${current.item} is not done. Missing: ${missing.join('; ')}. Finish it before you return.` };
    }
    const id = input.agent_id ?? input.agent_type;
    saveState(root, { ...current, running: stillRunning(current, now).filter((running) => running.id !== id) });
    return null;
  }
  if (event === 'Stop') {
    if (!drives(input.transcript_path)) return null;
    // A specialist is still working: the session waits for it, and that is not a failed attempt at the stage.
    if (stillRunning(state, now).length > 0) return null;
    const decision = continueDecision(root, countTokens(state, input.transcript_path), manifest, { autonomy: autonomyOf(root), now });
    return decision.block ? { decision: 'block', reason: decision.reason } : null;
  }
  if (event === 'PreCompact') {
    saveState(root, { ...state, checkpoint: now });
    return null;
  }
  if (event === 'SessionEnd') {
    const counted = countTokens(state, input.transcript_path);
    saveState(root, counted);
    appendFileSync(join(root, 'qa', 'state', `${state.file}.md`), `${ledgerLine(counted)}\n`);
    return null;
  }
  return null;
}

try {
  const output = handle(JSON.parse(readFileSync(0, 'utf8')));
  if (output) process.stdout.write(JSON.stringify(output));
} catch {
  // The pipeline's hooks guide a session; they must never break one.
}
process.exit(0);
