#!/usr/bin/env node
/* ============================================================================
 * tools/inspect-export.mjs - look inside a progress export WITHOUT importing it
 * ----------------------------------------------------------------------------
 *   node tools/inspect-export.mjs <file.json> [--normalize out.json]
 *
 * Run this on your own export before you import it anywhere. It:
 *   - detects the format (current v2 envelope, the old per-game keys, or a
 *     single bare game object)
 *   - reports per-game level counts, XP, hints and last-change times
 *   - reports anything it refuses to trust (unknown quest ids, out-of-range
 *     level ids, corrupt records)
 *   - optionally writes a normalised v2 envelope you can then import
 *
 * It never touches localStorage, never writes anything unless --normalize is
 * given, and never sends anything anywhere. Keep the file to yourself: it
 * contains your answers and progress.
 * ========================================================================== */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createEnvironment } from '../tests/lib/dom.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEngine() {
  const env = createEnvironment('');
  vm.createContext(env);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'), env);
  return env.DAQ;
}

const args = process.argv.slice(2);
const normalizeIdx = args.indexOf('--normalize');
const normalizeTo = normalizeIdx >= 0 ? args[normalizeIdx + 1] : null;
const file = args.filter((a) => a !== '--normalize' && a !== normalizeTo)[0];

if (!file) {
  console.error('usage: node tools/inspect-export.mjs <file.json> [--normalize out.json]');
  process.exit(2);
}
if (!fs.existsSync(file)) {
  console.error('no such file: ' + file);
  process.exit(2);
}

const DAQ = loadEngine();
const text = fs.readFileSync(file, 'utf8');
const parsed = DAQ.parseImport(text, {});

console.log('file: ' + file + '  (' + text.length + ' bytes)');

if (parsed.error) {
  console.log('\nNOT USABLE: ' + parsed.error);
  console.log('\nExpected one of:');
  console.log('  - an export made by this site  {"schema":"daq.progress","version":2,"quests":{...}}');
  console.log('  - the old per-game keys        {"sqlquest_v1":{...},"excelquest_v1":{...},...}');
  console.log('  - a single bare game object    {"done":{...},"xp":...,"hints":{...},"streak":...,"ans":{...}}');
  process.exit(1);
}

const store = parsed.store;
const quests = Object.keys(store.quests);
const ignored = ['sql', 'excel', 'python', 'stats', 'powerbi'].filter((id) => !quests.includes(id));
if (ignored.length) {
  console.log('(no data for: ' + ignored.join(', ') + ')');
}
console.log('\nformat: daq.progress v' + (store.version || DAQ.VERSION) +
  '  |  quests found: ' + (quests.length ? quests.join(', ') : '(none)'));

let total = 0, xp = 0;
quests.forEach((id) => {
  const q = store.quests[id];
  const meta = DAQ.meta(id);
  const ids = Object.keys(q.levels || {});
  const done = ids.filter((l) => q.levels[l].done && !q.levels[l].clear).length;
  const cleared = ids.filter((l) => q.levels[l].clear).length;
  const hints = ids.filter((l) => q.levels[l].hints).length;
  const answers = ids.filter((l) => q.levels[l].ans).length;
  const questXp = (q.xpCarry || 0) + ids.reduce((n, l) =>
    n + (q.levels[l].done && !q.levels[l].clear ? (q.levels[l].xp || 0) : 0), 0);
  total += done; xp += questXp;
  console.log('\n  ' + (meta ? meta.title : id) + '  (' + id + ')');
  console.log('    levels cleared : ' + done + ' / ' + (meta ? meta.levels : '?'));
  console.log('    xp             : ' + questXp + (q.xpCarry ? '  (includes ' + q.xpCarry + ' carried from an older format)' : ''));
  console.log('    hints recorded : ' + hints);
  console.log('    saved answers  : ' + answers);
  console.log('    reset levels   : ' + cleared);
  console.log('    last change    : ' + (q.updatedAt ? new Date(q.updatedAt).toISOString() : 'never'));
  const outOfRange = ids.filter((l) => {
    const n = parseInt(String(l).replace(/^L/i, ''), 10);
    return !(n >= 1 && n <= (meta ? meta.levels : 9999));
  });
  if (outOfRange.length) console.log('    !! ignored level ids: ' + outOfRange.join(', '));
});

console.log('\n  TOTAL: ' + total + ' levels cleared, ' + xp + ' XP');

if (normalizeTo) {
  const envelope = {
    schema: DAQ.SCHEMA, version: DAQ.VERSION,
    exportedAt: new Date().toISOString(),
    device: store.dev || 'imported',
    quests: store.quests
  };
  fs.writeFileSync(normalizeTo, JSON.stringify(envelope, null, 2));
  console.log('\nwrote a normalised v2 envelope to ' + normalizeTo);
  console.log('import that file from any game page (Merge is the safe default).');
} else {
  console.log('\nnothing was written. to convert this file to the current format:');
  console.log('  node tools/inspect-export.mjs "' + file + '" --normalize progress-v2.json');
}
