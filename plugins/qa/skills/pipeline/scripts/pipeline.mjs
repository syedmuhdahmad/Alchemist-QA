#!/usr/bin/env node
/**
 * The pipeline engine: carries one work item through the stages of a pipeline, checking each stage's exit
 * criteria on disk. State lives in qa/state/<file>.pipeline.json. The lead runs this script; the hooks import it.
 * Usage:
 *   node pipeline.mjs start <pipeline> --item <id> --file <file> [--root <dir>]
 *   node pipeline.mjs next [--file <file>] [--root <dir>]     check the current stage, move on if it is done
 *   node pipeline.mjs status [--root <dir>]
 * No npm dependencies: plugins run on the user's machine as shipped.
 */
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { CHECKS, riskLevels } from './checks.mjs';

export const MAX_ATTEMPTS = 3;
const CONTINUING = ['L1', 'L2', 'L3', 'L4'];

export function loadPipelines() {
  return JSON.parse(readFileSync(new URL('../pipelines.json', import.meta.url), 'utf8'));
}

// A work item's file name and id, as `start` accepts them. State files are committed with the project, so a state is
// used only when its file name, id, pipeline, stage, status, and time are ones the engine could have written: then no
// hook writes outside qa/state. Sessions are told where the work stands from the files, never from the state's text.
export const FILE = /^[A-Za-z0-9-]+$/;
export const ITEM = /^[#A-Za-z0-9-]+$/;
const SUFFIX = '.pipeline.json';
const STATUSES = new Set(['running', 'waiting', 'done', 'stopped']);
const DAY = 24 * 60 * 60 * 1000;

function statePath(root, file) {
  if (typeof file !== 'string' || !FILE.test(file)) throw new Error(`not a work item file name: ${file}`);
  return join(root, 'qa', 'state', `${file}${SUFFIX}`);
}

/**
 * The state saved for a work item file, or null when there is none or it is not one the engine could have written.
 * Its file name is always the state file's own name, never what the file says.
 */
export function readState(root, file, manifest = loadPipelines()) {
  if (typeof file !== 'string' || !FILE.test(file)) return null;
  const path = statePath(root, file);
  if (!existsSync(path)) return null;
  let state;
  try {
    state = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
  const pipeline = state && typeof state === 'object' && Object.hasOwn(manifest.pipelines, state.pipeline) ? manifest.pipelines[state.pipeline] : null;
  const updated = Date.parse(state?.updated);
  const known =
    pipeline?.stages.some((stage) => stage.id === state.stage) &&
    typeof state.item === 'string' &&
    ITEM.test(state.item) &&
    STATUSES.has(state.status) &&
    updated <= Date.now() + DAY &&
    typeof state.stages?.[state.stage] === 'object' &&
    (state.running === undefined || Array.isArray(state.running));
  return known ? { ...state, file } : null;
}

/**
 * Runs fn while holding qa/state/.lock, so hooks that fire together (parallel specialists stopping at once) take turns
 * with the state instead of overwriting each other's changes. A lock older than STALE is left from a killed hook.
 */
export function withStateLock(root, fn, { wait = 10_000 } = {}) {
  const STALE = 30_000;
  mkdirSync(join(root, 'qa', 'state'), { recursive: true });
  const lock = join(root, 'qa', 'state', '.lock');
  const until = Date.now() + wait;
  for (;;) {
    try {
      closeSync(openSync(lock, 'wx'));
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(lock).mtimeMs > STALE) rmSync(lock, { force: true });
      } catch {
        // Released between the two calls: try again.
      }
      if (Date.now() > until) throw new Error('qa/state is locked by another hook');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try {
    return fn();
  } finally {
    rmSync(lock, { force: true });
  }
}

export function saveState(root, state) {
  const path = statePath(root, state.file);
  mkdirSync(join(root, 'qa', 'state'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
}

/** Every state in qa/state that the engine could have written. */
export function allStates(root, manifest = loadPipelines()) {
  const dir = join(root, 'qa', 'state');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(SUFFIX))
    .map((name) => readState(root, name.slice(0, -SUFFIX.length), manifest))
    .filter(Boolean);
}

/** The pipeline being worked on: the most recently updated one that is running or waiting, or null. */
export function activeState(root, manifest = loadPipelines()) {
  return (
    allStates(root, manifest)
      .filter((state) => state.status === 'running' || state.status === 'waiting')
      .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0] ?? null
  );
}

const stagesOf = (manifest, state) => manifest.pipelines[state.pipeline].stages;

function applies(root, state, stage) {
  if (stage.when !== 'risk >= medium') return true;
  return riskLevels(root, state.item).some((level) => level === 'medium' || level === 'high');
}

/** The stage's exit checks together: what is missing, and why it waits, if it does. */
export function evaluate(root, state, stage) {
  const context = { root, item: state.item, file: state.file };
  const results = stage.exit.map((name) => CHECKS[name](context));
  return {
    met: results.every((check) => check.met),
    missing: results.flatMap((check) => check.missing),
    waiting: results.find((check) => check.waiting)?.waiting,
  };
}

export function startPipeline(root, { pipeline, item, file, now }, manifest = loadPipelines()) {
  if (!Object.hasOwn(manifest.pipelines, pipeline)) throw new Error(`there is no pipeline named ${pipeline}`);
  const existing = readState(root, file, manifest);
  if (existing?.status === 'stopped') {
    throw new Error(`${describe(root, existing, manifest)} A person decides whether to start it again, by deleting qa/state/${file}.pipeline.json.`);
  }
  // A second start resumes the engagement, so its attempts, time, and tokens are never reset.
  if (existing && existing.status !== 'done' && existing.pipeline === pipeline) return existing;
  const [first] = manifest.pipelines[pipeline].stages;
  const state = {
    pipeline,
    item,
    file,
    status: 'running',
    stage: first.id,
    stages: { [first.id]: { started: now, attempts: 0, tokens: 0 } },
    updated: now,
  };
  saveState(root, state);
  return state;
}

/** Moves past every stage whose exit checks hold. Saves and returns the state, and what the stage still misses. */
export function advance(root, state, manifest = loadPipelines(), now = new Date().toISOString()) {
  const next = structuredClone(state);
  if (next.status === 'done' || next.status === 'stopped') return { state: next, missing: [] };
  const stages = stagesOf(manifest, next);
  let missing = [];
  next.status = 'running';
  delete next.reason;
  for (;;) {
    const index = stages.findIndex((stage) => stage.id === next.stage);
    const result = evaluate(root, next, stages[index]);
    if (result.waiting) {
      next.status = 'waiting';
      next.reason = result.waiting;
      missing = result.missing;
      break;
    }
    if (!result.met) {
      missing = result.missing;
      break;
    }
    next.stages[next.stage].finished = now;
    const following = stages.slice(index + 1).find((stage) => applies(root, next, stage));
    if (!following) {
      next.status = 'done';
      break;
    }
    next.stage = following.id;
    next.stages[following.id] = { started: now, attempts: 0, tokens: 0 };
  }
  next.updated = now;
  saveState(root, next);
  return { state: next, missing };
}

/** One paragraph on where the engagement is and what its current stage still needs. */
export function describe(root, state, manifest = loadPipelines(), missing) {
  const name = `Engagement ${state.item} (${state.pipeline} pipeline)`;
  if (state.status === 'done') return `${name} is done: every stage passed its exit checks.`;
  const stages = stagesOf(manifest, state);
  const index = stages.findIndex((stage) => stage.id === state.stage);
  const stage = stages[index];
  // Told from the files, never from the reason stored in the state: the state is committed with the project.
  if (state.status === 'waiting') {
    const why = evaluate(root, state, stage).waiting ?? 'it may be able to go on: run `next` to check';
    return `${name} is waiting at stage ${state.stage}: ${why}.`;
  }
  const needs = missing ?? evaluate(root, state, stage).missing;
  if (state.status === 'stopped') {
    return `${name} stopped at stage ${state.stage}: it did not finish after ${MAX_ATTEMPTS} attempts. Missing: ${needs.join('; ') || 'nothing'}.`;
  }
  const skill = stage.method ? ` with skill ${stage.method}` : '';
  const parallel = stage.parallel ? ', one per capability in qa/profile.yaml, in parallel' : '';
  return (
    `${name} is at stage ${stage.id} (${index + 1} of ${stages.length}): agent qa:${stage.agent}${skill}${parallel}. ` +
    `Done when these checks hold: ${stage.exit.join(', ')}. Missing: ${needs.length ? needs.join('; ') : 'nothing'}.`
  );
}

/** Whether the Stop hook sends the lead on: only at autonomy L1 or above, and at most MAX_ATTEMPTS times per stage. */
export function continueDecision(root, state, manifest = loadPipelines(), { autonomy, now = new Date().toISOString() }) {
  const { state: current, missing } = advance(root, state, manifest, now);
  if (current.status !== 'running' || !CONTINUING.includes(autonomy)) return { block: false };
  const entry = current.stages[current.stage];
  if ((entry.attempts ?? 0) >= MAX_ATTEMPTS) {
    current.status = 'stopped';
    current.reason = `stage ${current.stage} did not finish after ${MAX_ATTEMPTS} attempts. Missing: ${missing.join('; ')}`;
    saveState(root, current);
    return { block: false };
  }
  entry.attempts = (entry.attempts ?? 0) + 1;
  saveState(root, current);
  return {
    block: true,
    reason: `Alchemist-QA pipeline (autonomy ${autonomy}): ${describe(root, current, manifest, missing)} Carry on with this stage now, then run the pipeline skill's \`next\`.`,
  };
}

/** Adds tokens to the current stage. */
export function addTokens(state, tokens) {
  const entry = state.stages[state.stage];
  entry.tokens = (entry.tokens ?? 0) + tokens;
  return state;
}

/** A ledger line for qa/state/<file>.md: status, time and tokens per stage, with an open stage timed until now. */
export function ledgerLine(state, now = state.updated) {
  const parts = Object.entries(state.stages).map(([id, entry]) => {
    const end = Date.parse(entry.finished ?? now);
    const minutes = Math.round((end - Date.parse(entry.started)) / 60_000);
    return `${id} ${minutes} min${entry.tokens ? `, ${entry.tokens} tokens` : ''}`;
  });
  return `- ${state.updated} ${state.pipeline} pipeline for ${state.item}: ${state.status} at stage ${state.stage}. Time per stage: ${parts.join('; ')}.`;
}

/** The autonomy level in qa/profile.yaml, or L0 when it says none. */
export function autonomyOf(root) {
  const path = join(root, 'qa', 'profile.yaml');
  const match = existsSync(path) && readFileSync(path, 'utf8').match(/^autonomy:\s*["']?(L\d)\b/m);
  return match ? match[1] : 'L0';
}

function main(args) {
  const option = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const root = resolve(option('--root') ?? '.');
  const [command, pipeline] = args;
  const fail = (message) => {
    console.error(message);
    return 2;
  };
  if (command === 'start') {
    const item = option('--item');
    const file = option('--file');
    if (!pipeline || !item || !file) return fail('usage: pipeline.mjs start <pipeline> --item <id> --file <file>');
    if (!ITEM.test(item) || !FILE.test(file)) return fail('--item and --file take a work item id and its file name, such as #12 and 12');
    try {
      return withStateLock(root, () => {
        const started = startPipeline(root, { pipeline, item, file, now: new Date().toISOString() });
        const { state, missing } = advance(root, started);
        console.log(describe(root, state, loadPipelines(), missing));
        return 0;
      });
    } catch (error) {
      return fail(error.message);
    }
  }
  if (command === 'next') {
    const file = option('--file');
    try {
      return withStateLock(root, () => {
        const current = file ? readState(root, file) : activeState(root);
        if (!current) return fail(file ? `no pipeline state for ${file}` : 'no pipeline is running');
        const { state, missing } = advance(root, current);
        console.log(describe(root, state, loadPipelines(), missing));
        return 0;
      });
    } catch (error) {
      return fail(error.message);
    }
  }
  if (command === 'status') {
    const states = allStates(root, loadPipelines());
    if (states.length === 0) console.log('no pipeline has been started');
    for (const state of states) console.log(describe(root, state));
    return 0;
  }
  return fail('usage: pipeline.mjs start|next|status (see the header of this file)');
}

if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) exit(main(argv.slice(2)));
