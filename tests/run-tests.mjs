#!/usr/bin/env node
/* ============================================================================
 * Data Analyst Quest - test suite
 * ----------------------------------------------------------------------------
 *   node tests/run-tests.mjs            (everything)
 *   node tests/run-tests.mjs A          (just section A, etc.)
 *
 * Covers:
 *   A. the progress engine (schema, migration, merge/tombstones, resets, XP)
 *   B. each of the five game pages, driven through the real page scripts
 *   C. every level of every game: the model answer must pass its own check,
 *      and a wrong answer must fail
 *   D. HTML validity (tag balance, duplicate ids, local links/assets exist)
 *   E. security/config invariants (no credentials in frontend files, sync
 *      defaults to "not configured")
 *
 * No browser and no network required.
 * ========================================================================== */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createEnvironment, queryAll } from './lib/dom.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = [
  { file: 'sql-quest.html', qid: 'sql', key: 'sqlquest_v1', levels: 34, short: 'SQL', title: 'SQL Quest' },
  { file: 'excel-quest.html', qid: 'excel', key: 'excelquest_v1', levels: 30, short: 'Excel', title: 'Excel Quest' },
  { file: 'python-quest.html', qid: 'python', key: 'pyquest_v1', levels: 35, short: 'Python', title: 'Python Quest' },
  { file: 'stats-quest.html', qid: 'stats', key: 'statsquest_v1', levels: 31, short: 'Statistics', title: 'Statistics Quest' },
  { file: 'powerbi-quest.html', qid: 'powerbi', key: 'pbiquest_v1', levels: 29, short: 'Power BI', title: 'Power BI Quest' }
];

/* ------------------------------- tiny runner ----------------------------- */
let passed = 0;
const failures = [];
const only = process.argv[2] ? process.argv[2].toUpperCase() : null;

function test(section, name, fn) {
  if (only && !section.toUpperCase().includes(only)) return Promise.resolve();
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(() => { passed++; }, (e) => { failures.push({ section, name, error: e }); });
    }
    passed++;
  } catch (e) {
    failures.push({ section, name, error: e });
  }
  return Promise.resolve();
}
function ok(cond, label) { if (!cond) throw new Error(label || 'assertion failed'); }
function eq(a, b, label) {
  if (a !== b) throw new Error((label || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
}
function section(name) { if (!only || name.toUpperCase().includes(only)) console.log('\n== ' + name); }

/* ------------------------------- helpers --------------------------------- */
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

function engine(seed) {
  const env = createEnvironment('', seed);
  vm.createContext(env);
  vm.runInContext(read('progress.js'), env, { filename: 'progress.js' });
  return env;
}

function loadPage(page, seed) {
  const html = read(page.file);
  const env = createEnvironment(html, seed);
  vm.createContext(env);
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).filter((s) => s.trim());
  const src = ['progress.js', 'progress-ui.js', 'sync.js']
    .map((f) => read(f)).concat(inline).join('\n;\n');
  vm.runInContext(src, env, { filename: page.file });
  return env;
}

function run(env, code) { return vm.runInContext(code, env); }
function $(env, id) { return env.document.getElementById(id); }
function data(env) { return run(env, 'DATA'); }
function text(env, id) { const e = $(env, id); return e ? e.textContent : ''; }

/* Play a level the way a player would: open it, type an answer, press check. */
function answerLevel(env, n, wrong) {
  const l = data(env).levels[n - 1];
  run(env, 'openLevel(' + n + ')');
  run(env, 'closeOv()');
  if (l.type === 'mc') {
    const pickIdx = wrong ? (l.correct === 0 ? 1 : 0) : l.correct;
    run(env, 'pick(' + pickIdx + ')');
  } else {
    const val = l.type === 'num'
      ? (wrong ? String(l.answer + Math.max(1000, Math.abs(l.answer) * 10 + 1)) : String(l.answer))
      : (wrong ? 'zzz zzz zzz' : String(l.sol));
    run(env, 'document.getElementById(\'ed\').value=' + JSON.stringify(val));
    env.document.dispatch('input', { target: $(env, 'ed') });
  }
  run(env, 'check()');
  return { overlay: $(env, 'ov').className, msg: $(env, 'msg').className, msgText: $(env, 'msg').textContent };
}

/* Craft a v2 envelope with explicit timestamps (used by the merge tests). */
function crafted(quests) {
  return JSON.stringify({ schema: 'daq.progress', version: 2, dev: 'dev-test', updatedAt: 1, quests });
}
function level(at, extra) {
  return Object.assign({ done: true, clear: false, hints: 0, ans: '', xp: 30, at, rev: 1 }, extra || {});
}

/* ========================================================================= */
async function main() {
  /* ------------------------- A. engine unit tests ------------------------ */
  section('A. progress engine');

  await test('A', 'blank store: five quests, zero progress', () => {
    const env = engine();
    const all = env.DAQ.summaryAll();
    eq(all.quests.length, 5, 'quest count');
    eq(all.total, 0, 'cleared levels');
    eq(all.levels, 159, 'total levels');
    eq(all.pct, 0, 'percent');
    eq(env.DAQ.SCHEMA, 'daq.progress');
    eq(env.DAQ.VERSION, 2);
  });

  await test('A', 'stable quest ids and level ids', () => {
    const env = engine();
    eq(env.DAQ.QUESTS.map((q) => q.id).join(','), 'sql,excel,python,stats,powerbi');
    eq(env.DAQ.QUESTS.map((q) => q.file).join(','),
      'sql-quest.html,excel-quest.html,python-quest.html,stats-quest.html,powerbi-quest.html');
    eq(env.DAQ.levelId(7), 'L7');
    eq(env.DAQ.levelId('7'), 'L7');
  });

  await test('A', 'migrates the five legacy keys and keeps XP exactly', () => {
    const env = engine({
      sqlquest_v1: JSON.stringify({ done: { 1: 1, 2: 1, 3: 1 }, xp: 90, hints: { 3: 2 }, streak: 4, ans: { 1: 'SELECT 1;' } }),
      excelquest_v1: JSON.stringify({ done: { 1: 1 }, xp: 30, hints: {}, streak: 1, ans: {} }),
      pyquest_v1: 'not json at all',
      statsquest_v1: JSON.stringify({ xp: 5 }),
      pbiquest_v1: JSON.stringify({ done: { 999: 1 }, xp: 999, hints: {}, streak: 0, ans: {} })
    });
    const v = env.DAQ.view('sql');
    eq(Object.keys(v.done).length, 3, 'sql done');
    eq(v.xp, 90, 'sql xp preserved (30+30+16 attributed + 14 carried)');
    eq(v.hints[3], 2, 'hints migrated');
    eq(v.ans[1], 'SELECT 1;', 'answer migrated');
    eq(v.streak, 4, 'streak migrated');
    eq(env.DAQ.view('excel').xp, 30, 'excel xp');
    eq(env.DAQ.doneCount('powerbi'), 0, 'out-of-range level id dropped');
    eq(env.DAQ.xp('powerbi'), 999, 'but the xp it carried is never thrown away');
    eq(env.DAQ.summary('sql').pct, 9, 'percent');
    ok(env.localStorage.getItem('daq_progress_v2'), 'v2 envelope written');
  });

  await test('A', 'a corrupt stored envelope is kept aside, never silently discarded', () => {
    const env = engine({ daq_progress_v2: '{"schema":"daq.progress","version":2,"quests":' });
    ok(env.DAQ.ready(), 'engine still starts');
    eq(env.DAQ.xp('sql'), 0, 'starts clean');
    const keys = Object.keys(env.localStorage.dump()).filter((k) => k.indexOf('daq_unreadable_') === 0);
    eq(keys.length, 1, 'the unreadable envelope was kept aside: ' + keys.join(','));
    ok((env.localStorage.dump()[keys[0]] || '').indexOf('"quests":') >= 0,
      'the set-aside copy is the original text');
    env.DAQ.commit('sql', { done: { 1: 1 }, xp: 30, hints: {}, streak: 1, ans: { 1: 'x' } });
    eq(env.DAQ.xp('sql'), 30, 'progress saves on top of the clean start');
    const again = Object.keys(env.localStorage.dump()).filter((k) => k.indexOf('daq_unreadable_') === 0);
    eq(again.length, 1, 'no second copy once the store is valid again');
  });

  await test('A', 'legacy mirror keys stay in sync for older cached copies', () => {
    const env = engine();
    const v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    const mirror = JSON.parse(env.localStorage.getItem('sqlquest_v1'));
    eq(Object.keys(mirror.done).length, 1, 'mirror done');
    eq(mirror.xp, 30, 'mirror xp');
    const excelMirror = env.localStorage.getItem('excelquest_v1');
    ok(!excelMirror || JSON.parse(excelMirror).xp === 0, 'other mirrors untouched by a sql save');
  });

  await test('A', 'a solve is attributed to the level that produced it', () => {
    const env = engine();
    const v = env.DAQ.view('excel');
    v.done[4] = 1; v.xp += 23; v.streak = 2;
    env.DAQ.commit('excel', v);
    const rec = env.DAQ.quest('excel').levels.L4;
    eq(rec.done, true, 'level marked done');
    eq(rec.xp, 23, 'xp attributed to the level');
    eq(env.DAQ.xp('excel'), 23, 'quest xp');
    eq(env.DAQ.doneCount('excel'), 1, 'done count');
  });

  await test('A', 'replaying a cleared level never awards XP twice', () => {
    const env = engine();
    let v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;              // even if a game re-adds, the engine must not
    env.DAQ.commit('sql', v);
    eq(env.DAQ.xp('sql'), 30, 'xp unchanged by replay');
    eq(env.DAQ.quest('sql').levels.L1.xp, 30, 'level xp unchanged');
  });

  await test('A', 'draft answers survive for levels that are not solved', () => {
    const env = engine();
    const v = env.DAQ.view('python');
    v.ans[2] = 'df.groupby';
    env.DAQ.commit('python', v);
    eq(env.DAQ.answer('python', 2), 'df.groupby', 'draft stored');
    eq(env.DAQ.doneCount('python'), 0, 'not counted as solved');
    eq(env.DAQ.view('python').ans[2], 'df.groupby', 'draft comes back');
  });

  await test('A', 'hints are stored and never decrease', () => {
    const env = engine();
    let v = env.DAQ.view('stats');
    v.hints[5] = 1;
    env.DAQ.commit('stats', v);
    v = env.DAQ.view('stats');
    v.hints[5] = 0;
    env.DAQ.commit('stats', v);
    eq(env.DAQ.hints('stats', 5), 1, 'hints kept');
  });

  await test('A', 'per-level reset affects only that level', () => {
    const env = engine();
    let v = env.DAQ.view('sql');
    [1, 2, 3].forEach((n) => { v.done[n] = 1; v.xp += 30; v.hints[n] = 1; });
    v.ans[3] = 'SELECT 3';
    env.DAQ.commit('sql', v);
    const before = env.DAQ.xp('sql');
    const r = env.DAQ.resetLevel('sql', 2);
    eq(r.removedXp, 23, 'xp removed for that level (1 hint -> 23)');
    eq(env.DAQ.doneCount('sql'), 2, 'one level cleared');
    eq(env.DAQ.xp('sql'), before - 23, 'quest xp reduced by exactly that level');
    ok(env.DAQ.isDone('sql', 1) && env.DAQ.isDone('sql', 3), 'other levels untouched');
    eq(env.DAQ.hints('sql', 3), 1, 'other hints untouched');
    eq(env.DAQ.answer('sql', 3), 'SELECT 3', 'other answers untouched');
    const rec = env.DAQ.quest('sql').levels.L2;
    eq(rec.clear, true, 'tombstone written');
    eq(rec.done, false, 'not done');
    eq(rec.hints, 0, 'hints cleared');
    eq(rec.ans, '', 'answer cleared');
    eq(rec.xp, 0, 'xp cleared');
    eq(env.DAQ.doneCount('excel'), 0, 'other games untouched');
  });

  await test('A', 're-solving after a reset earns the XP once', () => {
    const env = engine();
    let v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    env.DAQ.resetLevel('sql', 1);
    eq(env.DAQ.xp('sql'), 0, 'xp removed');
    v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    eq(env.DAQ.xp('sql'), 30, 'xp earned again, once');
    v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    eq(env.DAQ.xp('sql'), 30, 'and not a third time');
  });

  await test('A', 'per-level reset also clears a level that was never solved', () => {
    const env = engine();
    const v = env.DAQ.view('powerbi');
    v.ans[7] = 'half an answer';
    env.DAQ.commit('powerbi', v);
    env.DAQ.resetLevel('powerbi', 7);
    eq(env.DAQ.answer('powerbi', 7), '', 'draft cleared');
    eq(env.DAQ.doneCount('powerbi'), 0, 'still unsolved');
  });

  await test('A', 'quest reset clears only that quest', () => {
    const env = engine();
    let v = env.DAQ.view('sql');
    v.done[1] = 1; v.done[2] = 1; v.xp += 60; v.streak = 2;
    env.DAQ.commit('sql', v);
    v = env.DAQ.view('excel');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('excel', v);
    const r = env.DAQ.resetQuest('sql');
    eq(r.cleared, 2, 'levels cleared');
    eq(env.DAQ.xp('sql'), 0, 'sql xp zeroed');
    eq(env.DAQ.doneCount('sql'), 0, 'sql cleared');
    eq(env.DAQ.streak('sql'), 0, 'sql streak zeroed');
    ok(env.DAQ.quest('sql').questResetAt > 0, 'quest reset timestamp recorded');
    eq(env.DAQ.doneCount('excel'), 1, 'excel untouched');
    eq(env.DAQ.xp('excel'), 30, 'excel xp untouched');
  });

  await test('A', 'the game emptying a quest is treated as a quest reset', () => {
    const env = engine();
    let v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    v = { done: {}, xp: 0, hints: {}, streak: 0, ans: {} };   // what resetAll() builds
    env.DAQ.commit('sql', v);
    eq(env.DAQ.doneCount('sql'), 0, 'cleared');
    ok(env.DAQ.quest('sql').questResetAt > 0, 'tombstone timestamp set');
    eq(env.DAQ.quest('sql').levels.L1.clear, true, 'level tombstoned');
  });

  /* ------------------------------ merging -------------------------------- */
  await test('A', 'merge unions progress and never deletes a solve', () => {
    const env = engine();
    const rep = env.DAQ.import(crafted({
      sql: { levels: { L1: level(1000), L2: level(1000) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 1000 }
    }), 'merge');
    eq(rep.ok, true, 'import ok');
    eq(env.DAQ.doneCount('sql'), 2, 'both levels restored');
    const v = env.DAQ.view('sql');
    v.done[3] = 1; v.xp += 30;                       // local-only progress
    env.DAQ.commit('sql', v);
    env.DAQ.import(crafted({
      sql: { levels: { L1: level(2000), L4: level(2000) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 2000 }
    }), 'merge');
    eq(env.DAQ.doneCount('sql'), 4, 'L1, L3, L4 all still cleared');
    ok(env.DAQ.isDone('sql', 3), 'local solve survived the merge');
  });

  await test('A', 'newer record wins a conflict', () => {
    const env = engine();
    env.DAQ.import(crafted({
      sql: { levels: { L1: level(1000, { hints: 2, xp: 16 }) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 1000 }
    }), 'merge');
    env.DAQ.import(crafted({
      sql: { levels: { L1: level(5000, { hints: 0, xp: 30 }) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 5000 }
    }), 'merge');
    eq(env.DAQ.hints('sql', 1), 0, 'newer hints win');
    eq(env.DAQ.quest('sql').levels.L1.xp, 30, 'newer xp wins');
  });

  await test('A', 'a quest reset on another device beats stale cleared levels', () => {
    const env = engine();
    env.DAQ.import(crafted({
      sql: { levels: { L1: level(1000), L2: level(1000), L3: level(1000) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 1000 }
    }), 'merge');
    eq(env.DAQ.doneCount('sql'), 3, 'setup');
    /* another device reset the whole quest at t=2000 and solved nothing since */
    const rep = env.DAQ.import(crafted({
      sql: { levels: {}, xpCarry: 0, streak: 0, questResetAt: 2000, updatedAt: 2000 }
    }), 'merge');
    eq(env.DAQ.doneCount('sql'), 0, 'cleared progress was NOT restored');
    eq(rep.quests.sql.cleared, 3, 'report says three levels were cleared');
    /* ...but a level solved after that reset survives */
    env.DAQ.import(crafted({
      sql: { levels: { L1: level(3000) }, xpCarry: 0, streak: 0, questResetAt: 2000, updatedAt: 3000 }
    }), 'merge');
    eq(env.DAQ.doneCount('sql'), 1, 'post-reset solve kept');
    ok(env.DAQ.isDone('sql', 1), 'L1 kept');
  });

  await test('A', 'a per-level reset on another device beats a stale solve', () => {
    const env = engine();
    env.DAQ.import(crafted({
      excel: { levels: { L1: level(1000), L2: level(1000) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 1000 }
    }), 'merge');
    env.DAQ.import(crafted({
      excel: { levels: { L1: level(1000), L2: level(4000, { done: false, clear: true, xp: 0 }) },
               xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 4000 }
    }), 'merge');
    eq(env.DAQ.doneCount('excel'), 1, 'only L2 was reset');
    ok(env.DAQ.isDone('excel', 1) && !env.DAQ.isDone('excel', 2), 'L1 kept, L2 cleared');
  });

  await test('A', 'server timestamps win over local clocks', () => {
    const env = engine();
    env.DAQ.import(crafted({
      python: { levels: { L1: level(9000) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 9000 }
    }), 'merge');
    const remote = {
      schema: 'daq.progress', version: 2, updatedAt: 1,
      quests: { python: { levels: { L1: level(100, { srvAt: 99999, hints: 3, xp: 9 }) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 100 } }
    };
    env.DAQ.mergeStore(remote);
    eq(env.DAQ.hints('python', 1), 3, 'server-stamped record wins');
  });

  /* --------------------------- export / import --------------------------- */
  await test('A', 'export -> import round trip on a fresh browser', () => {
    const a = engine();
    let v = a.DAQ.view('sql');
    v.done[1] = 1; v.done[2] = 1; v.xp += 60; v.hints[2] = 1;
    a.DAQ.commit('sql', v);
    v = a.DAQ.view('powerbi');
    v.done[9] = 1; v.xp += 30;
    a.DAQ.commit('powerbi', v);
    const json = a.DAQ.export(true);

    const b = engine();
    const rep = b.DAQ.import(json, 'merge');
    eq(rep.ok, true, 'import ok');
    eq(rep.quests.sql.added, 2, 'sql levels added');
    eq(rep.quests.powerbi.added, 1, 'powerbi level added');
    eq(b.DAQ.doneCount('sql'), 2, 'sql restored');
    eq(b.DAQ.xp('sql'), 60, 'sql xp restored');
    eq(b.DAQ.hints('sql', 2), 1, 'sql hints restored');
    eq(b.DAQ.doneCount('powerbi'), 1, 'powerbi restored');
    ok(rep.backupKey.indexOf('daq_backup_') === 0, 'backup written before import');
    eq(b.DAQ.backups().length, 1, 'one backup stored');
  });

  await test('A', 'import accepts the old per-game key format', () => {
    const env = engine();
    const legacy = JSON.stringify({
      sqlquest_v1: { done: { 1: 1, 2: 1 }, xp: 60, hints: { 2: 1 }, streak: 3, ans: { 1: 'SELECT 1;' } },
      pbiquest_v1: { done: { 5: 1 }, xp: 30, hints: {}, streak: 1, ans: {} }
    });
    const rep = env.DAQ.import(legacy, 'merge');
    eq(rep.ok, true, 'import ok');
    eq(env.DAQ.doneCount('sql'), 2, 'sql restored from wrapped legacy keys');
    eq(env.DAQ.xp('sql'), 60, 'xp preserved');
    eq(env.DAQ.doneCount('powerbi'), 1, 'powerbi restored');
  });

  await test('A', 'import accepts a bare single-game export when told the game', () => {
    const env = engine();
    const rep = env.DAQ.import(JSON.stringify({ done: { 1: 1, 2: 1 }, xp: 60, hints: {}, streak: 2, ans: {} }),
      'merge', { quest: 'stats' });
    eq(rep.ok, true, 'import ok');
    eq(env.DAQ.doneCount('stats'), 2, 'stats restored');
    eq(env.DAQ.doneCount('sql'), 0, 'nothing else touched');
  });

  await test('A', 'a bare single-game export is refused without a game', () => {
    const env = engine();
    const rep = env.DAQ.import(JSON.stringify({ done: { 1: 1 }, xp: 30, hints: {}, streak: 1, ans: {} }), 'merge', {});
    eq(rep.ok, false, 'refused');
    ok(/single-game export/.test(rep.error), 'explains why: ' + rep.error);
    eq(env.DAQ.doneCount('sql'), 0, 'nothing imported');
    eq(env.DAQ.backups().length, 0, 'no backup written for a refused import');
  });

  await test('A', 'garbage is refused and changes nothing', () => {
    const env = engine();
    let v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    ['', 'not json', '[]', '{"hello":1}', '{"schema":"daq.progress","version":2}'].forEach((bad) => {
      const rep = env.DAQ.import(bad, 'merge');
      eq(rep.ok, false, 'refused: ' + bad);
      ok(rep.error.length > 5, 'error message given');
    });
    eq(env.DAQ.doneCount('sql'), 1, 'progress intact');
    eq(env.DAQ.xp('sql'), 30, 'xp intact');
    eq(env.DAQ.backups().length, 0, 'no stray backups');
  });

  await test('A', 'replace mode overwrites, but keeps a backup', () => {
    const env = engine();
    let v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    const rep = env.DAQ.import(crafted({
      excel: { levels: { L1: level(1000), L2: level(1000) }, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 1000 }
    }), 'replace');
    eq(rep.ok, true, 'import ok');
    eq(rep.mode, 'replace', 'mode recorded');
    eq(env.DAQ.doneCount('sql'), 0, 'sql replaced away');
    eq(env.DAQ.doneCount('excel'), 2, 'excel replaced in');
    eq(env.DAQ.backups().length, 1, 'backup of the old state exists');
    const restored = env.DAQ.restoreBackup(env.DAQ.backups()[0].key);
    eq(restored.ok, true, 'restore ok');
    eq(env.DAQ.doneCount('sql'), 1, 'old sql progress back');
  });

  await test('A', 'local backups are capped and restorable', () => {
    const env = engine();
    for (let i = 0; i < 12; i++) {
      const v = env.DAQ.view('sql');
      v.done[1] = 1; v.xp += 30;
      env.DAQ.commit('sql', v);
      env.DAQ.backupNow(true);
    }
    const list = env.DAQ.backups();
    ok(list.length <= 8, 'capped at 8, got ' + list.length);
    ok(list[0].at >= list[list.length - 1].at, 'newest first');
    eq(env.DAQ.restoreBackup(list[1].key).ok, true, 'restored an older backup');
  });

  await test('A', 'unknown quest ids and junk level ids are dropped', () => {
    const env = engine();
    env.DAQ.mergeStore({
      schema: 'daq.progress', version: 2,
      quests: {
        notaquest: { levels: { L1: level(1) } },
        sql: { levels: { L1: level(1), L0: level(1), 'L-3': level(1), Lx: level(1), L1000: level(1) } }
      }
    });
    eq(Object.keys(env.DAQ.store().quests).sort().join(','), 'excel,powerbi,python,sql,stats', 'no foreign quests');
    eq(env.DAQ.doneCount('sql'), 2, 'only L1 and L1000 are valid level ids');
  });

  await test('A', 'quest neighbours drive the Previous/Next order', () => {
    const env = engine();
    eq(env.DAQ.neighbour('sql', -1), null, 'no previous before SQL');
    eq(env.DAQ.neighbour('sql', 1).id, 'excel');
    eq(env.DAQ.neighbour('excel', 1).id, 'python');
    eq(env.DAQ.neighbour('python', 1).id, 'stats');
    eq(env.DAQ.neighbour('stats', 1).id, 'powerbi');
    eq(env.DAQ.neighbour('powerbi', 1), null, 'no next after Power BI');
    eq(env.DAQ.neighbour('powerbi', -1).id, 'stats');
  });

  await test('A', 'survives a corrupted envelope', () => {
    const env = engine({ daq_progress_v2: '{"schema":"daq.progress","version":2,"quests":{' });
    eq(env.DAQ.summaryAll().total, 0, 'falls back to a blank store');
    const v = env.DAQ.view('sql');
    v.done[1] = 1; v.xp += 30;
    env.DAQ.commit('sql', v);
    eq(env.DAQ.doneCount('sql'), 1, 'usable again');
  });

  /* --------------------- B. the five game pages -------------------------- */
  section('B. game pages');

  for (const page of PAGES) {
    await test('B', page.file + ': loads and renders map, nav and panel', () => {
      const env = loadPage(page);
      ok($(env, 'worlds').children.length >= 7, 'worlds rendered');
      eq(text(env, 'stot'), String(page.levels), 'level total in HUD');
      eq(text(env, 'sxp'), '0', 'xp starts at zero');
      ok($(env, 'qnav'), 'nav host present');
      ok($(env, 'pbox'), 'panel host present');
      ok($(env, 'pstat').innerHTML.indexOf('daq.progress v2') > 0, 'panel shows the format version');
      ok($(env, 'psync').innerHTML.indexOf('not configured') > 0, 'sync reports not configured');
      ok(/0 of 159 levels/.test($(env, 'pstat').textContent), 'panel totals');
    });

    await test('B', page.file + ': Previous/Next quest controls', () => {
      const env = loadPage(page);
      const i = PAGES.indexOf(page);
      const prev = $(env, 'qprev'), next = $(env, 'qnext');
      eq(prev.disabled, i === 0, 'previous disabled only on the first quest');
      eq(next.disabled, i === PAGES.length - 1, 'next disabled only on the last quest');
      if (i > 0) {
        ok(prev.textContent.indexOf(PAGES[i - 1].short) >= 0, 'previous names ' + PAGES[i - 1].short);
        prev.click();
        eq(env.location.href, PAGES[i - 1].file, 'navigates to the previous quest');
      } else {
        ok(prev.textContent.indexOf('Previous Quest') > 0, 'still labelled, just disabled');
      }
      if (i < PAGES.length - 1) {
        ok(next.textContent.indexOf(PAGES[i + 1].short) >= 0, 'next names ' + PAGES[i + 1].short);
        next.click();
        eq(env.location.href, PAGES[i + 1].file, 'navigates to the next quest');
      }
      ok($(env, 'qnav').textContent.indexOf('Quest ' + (i + 1) + ' of 5') > 0, 'position label');
    });

    await test('B', page.file + ': solve, replay, per-level reset, quest reset', () => {
      const env = loadPage(page);
      let r = answerLevel(env, 1);
      ok(r.overlay.indexOf('on') >= 0, 'level 1 solved');
      eq(text(env, 'sxp'), '30', '30 xp for a clean solve');
      eq(text(env, 'sdone'), '1', 'one level cleared');
      eq(text(env, 'sstreak'), '1', 'streak 1');

      r = answerLevel(env, 1);
      eq(text(env, 'sxp'), '30', 'replay adds no xp');
      ok(/no extra XP/.test($(env, 'msg').textContent), 'replay message explains it: ' + $(env, 'msg').textContent);
      ok($(env, 'lvbadge').className.indexOf('on') >= 0, 'replay badge shown');
      ok(!$(env, 'breset').disabled, 'reset button enabled');

      run(env, 'openLevel(2); hint();');
      r = answerLevel(env, 2);
      eq(text(env, 'sxp'), '53', '23 xp after one hint');
      eq(text(env, 'sdone'), '2', 'two levels cleared');

      answerLevel(env, 3, true);
      eq(text(env, 'sstreak'), '0', 'wrong answer resets the streak');
      eq(text(env, 'sdone'), '2', 'progress untouched by a wrong answer');

      run(env, 'openLevel(1); resetLevel();');
      eq(env.__confirms.length, 1, 'reset asks for confirmation');
      eq(text(env, 'sxp'), '23', 'only level 1 xp removed');
      eq(text(env, 'sdone'), '1', 'only level 1 cleared');
      ok(env.DAQ.isDone(page.qid, 2), 'level 2 still cleared');
      eq(env.DAQ.hints(page.qid, 2), 1, 'level 2 hints intact');

      answerLevel(env, 1);
      eq(text(env, 'sxp'), '53', 'xp earned again');
      answerLevel(env, 1);
      eq(text(env, 'sxp'), '53', 'and not twice');

      /* level unlocking still behaves: one cleared, one current, the rest locked */
      const map = $(env, 'worlds');
      const marked = (cls) => queryAll(map, '.node.' + cls).length;
      eq(marked('done'), 1, 'cleared level marked done');
      eq(marked('cur'), 1, 'next level marked current');
      ok(marked('lock') >= 1, 'later levels still locked');

      run(env, 'resetAll()');
      eq(text(env, 'sxp'), '0', 'quest reset zeroes xp');
      eq(text(env, 'sdone'), '0', 'quest reset clears levels');
      ok(env.DAQ.backups().length >= 1, 'a backup was taken before the reset');
      const left = PAGES.reduce((n, p) => n + env.DAQ.doneCount(p.qid), 0);
      eq(left, 0, 'nothing left behind in any game');
    });

    await test('B', page.file + ': progress survives a reload (localStorage)', () => {
      const env = loadPage(page);
      answerLevel(env, 1);
      answerLevel(env, 2);
      const saved = env.localStorage.dump();
      const env2 = loadPage(page, saved);
      eq(env2.DAQ.doneCount(page.qid), 2, 'two levels restored');
      eq(text(env2, 'sxp'), '60', 'xp restored');
      eq(text(env2, 'sdone'), '2', 'HUD restored');
      /* multiple-choice levels store a pick, not text; the others store the draft */
      const first = data(env).levels[0];
      if (first.type === 'mc') {
        eq(env2.DAQ.isDone(page.qid, 1), true, 'mc level still cleared');
      } else {
        eq(env2.DAQ.answer(page.qid, 1), first.type === 'num' ? String(first.answer) : String(first.sol),
          'answer restored');
      }
    });

    await test('B', page.file + ': the panel status follows play', async () => {
      const env = loadPage(page);
      ok(/0 of 159 levels/.test($(env, 'pstat').textContent), 'starts empty');
      answerLevel(env, 1);
      answerLevel(env, 2);
      await new Promise((r) => setTimeout(r, 500));       // the refresh is coalesced
      const shown = $(env, 'pstat').textContent;
      ok(/2 of 159 levels/.test(shown), 'panel shows the new total: ' + shown);
      ok(/60 XP total/.test(shown), 'panel shows the new xp: ' + shown);
      ok(/SQL/.test($(env, 'pstat').textContent), 'per-game list present');
    });

    await test('B', page.file + ': importing a file merges without losing local progress', () => {
      const env = loadPage(page);
      answerLevel(env, 1);                                  // local: level 1
      const other = engine();
      const v = other.DAQ.view(page.qid);
      v.done[1] = 1; v.done[2] = 1; v.done[3] = 1; v.xp += 90;
      other.DAQ.commit(page.qid, v);
      const json = other.DAQ.export(true);

      $(env, 'ptxt').value = json;
      run(env, 'DAQ.ui.doImport()');
      eq(env.DAQ.doneCount(page.qid), 3, 'merged to three levels');
      ok(env.DAQ.isDone(page.qid, 1), 'local level 1 kept');
      ok(env.DAQ.isDone(page.qid, 3), 'imported level 3 added');
      ok($(env, 'pmsg').className.indexOf('ok') >= 0, 'success message shown');
      ok(/backed up first/.test($(env, 'pmsg').textContent), 'backup is reported');
      eq(text(env, 'sdone'), '3', 'map/HUD refreshed after import');
      ok(env.DAQ.backups().length >= 1, 'backup stored');
    });
  }

  /* ------------------ C. every level's own answer check ------------------ */
  section('C. answer checks (all 159 levels)');

  for (const page of PAGES) {
    await test('C', page.file + ': model answer passes, wrong answer fails', () => {
      const env = loadPage(page);
      const lv = data(env).levels;
      eq(lv.length, page.levels, 'level count matches the README');
      const bad = [];
      lv.forEach((l) => {
        const good = answerLevel(env, l.n);
        if (good.overlay.indexOf('on') < 0) bad.push('L' + l.n + ' (' + l.title + '): model answer rejected');
        const wrong = answerLevel(env, l.n, true);
        if (wrong.overlay.indexOf('on') >= 0) bad.push('L' + l.n + ' (' + l.title + '): wrong answer accepted');
        if (l.type !== 'mc' && wrong.msg.indexOf('bad') < 0 && wrong.overlay.indexOf('on') < 0) {
          bad.push('L' + l.n + ': wrong answer gave no feedback');
        }
      });
      eq(bad.join(' | '), '', 'every level behaves');
    });
  }

  /* --------------------------- D. HTML validity -------------------------- */
  section('D. HTML validity');

  const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const HTML_FILES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

  function checkBalance(html) {
    const problems = [];
    const stack = [];
    /* strip script/style bodies first: they contain strings that look like tags */
    const markup = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const re = /<!DOCTYPE[^>]*>|<!--[\s\S]*?-->|<(\/)?([a-zA-Z][-a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/)?>/g;
    let m;
    while ((m = re.exec(markup))) {
      if (m[0][1] === '!') continue;
      const closing = !!m[1];
      const tag = m[2].toLowerCase();
      const selfClose = !!m[4] || VOID_TAGS.has(tag);
      if (closing) {
        const open = stack.lastIndexOf(tag);
        if (open < 0) { problems.push('</' + tag + '> with no open tag'); continue; }
        if (open !== stack.length - 1) {
          problems.push('</' + tag + '> closes while <' + stack[stack.length - 1] + '> is still open');
        }
        stack.length = open;
      } else if (!selfClose) stack.push(tag);
    }
    if (stack.length) problems.push('unclosed: ' + stack.join(', '));
    return problems;
  }

  await test('D', 'every html file is well formed', () => {
    const problems = [];
    HTML_FILES.forEach((f) => {
      const html = read(f);
      if (!/^<!DOCTYPE html>/i.test(html.trim())) problems.push(f + ': missing <!DOCTYPE html>');
      if (!/<html lang="en">/.test(html)) problems.push(f + ': missing <html lang="en">');
      if (!/<meta charset="utf-8">/.test(html)) problems.push(f + ': missing charset');
      if (!/<meta name="viewport"/.test(html)) problems.push(f + ': missing viewport');
      if (!/<title>/.test(html)) problems.push(f + ': missing <title>');
      checkBalance(html).forEach((p) => problems.push(f + ': ' + p));
    });
    eq(problems.join('\n'), '', 'html problems');
  });

  await test('D', 'ids are unique and every local link/asset exists', () => {
    const problems = [];
    HTML_FILES.forEach((f) => {
      const html = read(f);
      const markup = html.replace(/<script[\s\S]*?<\/script>/gi, '');
      const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
      if (dupes.length) problems.push(f + ': duplicate id(s) ' + [...new Set(dupes)].join(','));
      [...markup.matchAll(/(?:href|src)="([^"#]+)"/g)].forEach((m) => {
        const target = m[1];
        if (/^(https?:|mailto:|data:|blob:)/.test(target)) return;
        const clean = target.split('?')[0];
        if (clean && !fs.existsSync(path.join(ROOT, clean))) problems.push(f + ': missing target "' + target + '"');
      });
    });
    eq(problems.join('\n'), '', 'link/id problems');
  });

  await test('D', 'every onclick handler resolves to a real function', () => {
    const problems = [];
    for (const page of PAGES) {
      const html = read(page.file);
      const env = loadPage(page);
      [...html.replace(/<script[\s\S]*?<\/script>/gi, '')
        .matchAll(/onclick="([a-zA-Z_$][\w$]*)\(/g)].map((m) => m[1]).forEach((fn) => {
        if (run(env, 'typeof ' + fn) !== 'function') problems.push(page.file + ': onclick ' + fn + '() undefined');
      });
      ['DAQ.ui.exportFile', 'DAQ.ui.copyJSON', 'DAQ.ui.doImport', 'DAQ.ui.resetLevel', 'DAQ.ui.syncNow'].forEach((p) => {
        if (run(env, 'typeof ' + p) !== 'function') problems.push(page.file + ': ' + p + ' missing');
      });
    }
    eq(problems.join('\n'), '', 'handler problems');
  });

  await test('D', 'every getElementById target exists (static or UI-created)', () => {
    /* ids that exist at runtime rather than in the static markup: the shared UI
     * creates the panel/nav ones, the games rebuild #ed for every level. */
    const RUNTIME_IDS = new Set(['pstat', 'bexp', 'bcopy', 'bbak', 'bimp', 'pimp', 'ptxt', 'pfile',
      'bdo', 'bcancel', 'pmsg', 'pbackups', 'bsel', 'brestore', 'psync', 'psyncbtn', 'bsync',
      'bconn', 'qnav', 'qprev', 'qnext', 'breset', 'lvbadge', 'ed']);
    const problems = [];
    const re = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const page of PAGES) {
      const html = read(page.file);
      const staticIds = new Set(
        [...html.replace(/<script[\s\S]*?<\/script>/gi, '').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      const ids = new Set();
      let m;
      while ((m = re.exec(html))) ids.add(m[1]);
      while ((m = re.exec(read('progress-ui.js')))) ids.add(m[1]);
      ids.forEach((id) => {
        if (!staticIds.has(id) && !RUNTIME_IDS.has(id)) problems.push(page.file + ': #' + id + ' not found');
      });
    }
    eq(problems.join('\n'), '', 'missing ids');
  });

  await test('D', 'javascript parses in every page and shared file', () => {
    const problems = [];
    for (const page of PAGES) {
      const html = read(page.file);
      [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map((m) => m[1]).filter((s) => s.trim()).forEach((code, i) => {
          try { new vm.Script(code, { filename: page.file + '#' + i }); }
          catch (e) { problems.push(page.file + ' script ' + i + ': ' + e.message); }
        });
    }
    ['progress.js', 'progress-ui.js', 'sync.js', 'sync-config.example.js'].forEach((f) => {
      try { new vm.Script(read(f), { filename: f }); }
      catch (e) { problems.push(f + ': ' + e.message); }
    });
    eq(problems.join('\n'), '', 'js problems');
  });

  /* --------------------- E. security / config invariants ---------------- */
  section('E. security and configuration');

  await test('E', 'no credentials anywhere in the shipped frontend', () => {
    const files = HTML_FILES.slice()
      .concat(['progress.js', 'progress-ui.js', 'sync.js', 'progress.css', 'sync-config.example.js']);
    const patterns = [
      [/ghp_[A-Za-z0-9]{20,}/, 'GitHub personal access token'],
      [/github_pat_[A-Za-z0-9_]{20,}/, 'GitHub fine-grained token'],
      [/gho_[A-Za-z0-9]{20,}/, 'GitHub OAuth token'],
      [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
      [/client_secret\s*[:=]\s*['"][^'"]{8,}/, 'OAuth client secret'],
      [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
      [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token']
    ];
    const problems = [];
    files.forEach((f) => {
      const text = read(f);
      patterns.forEach(([re, label]) => { if (re.test(text)) problems.push(f + ': looks like a ' + label); });
    });
    eq(problems.join('\n'), '', 'credential leaks');
  });

  await test('E', 'frontend never calls github.com directly', () => {
    const problems = [];
    ['progress.js', 'progress-ui.js', 'sync.js'].forEach((f) => {
      const text = read(f);
      if (/api\.github\.com/.test(text)) problems.push(f + ': talks to the GitHub API');
      if (/github\.com\/login\/oauth/.test(text)) problems.push(f + ': performs the OAuth redirect itself');
    });
    eq(problems.join('\n'), '', 'direct GitHub calls');
  });

  await test('E', 'sync is inert until an endpoint is configured', () => {
    const env = loadPage(PAGES[0]);
    const s = env.DAQ.sync.status();
    eq(s.state, 'off', 'state');
    ok(/not configured/.test(s.label), 'label says so: ' + s.label);
    ok(/docs\/sync\.md/.test(s.note), 'points at the setup docs');
    eq(env.DAQ.sync.configured(), false, 'not configured');
    eq(env.__alerts.length + env.__confirms.length, 0, 'no dialogs on load');
  });

  await test('E', 'sync merges instead of overwriting once configured', async () => {
    const env = loadPage(PAGES[0]);
    /* a remote store holding L1, stamped by the server far in the future */
    const pulled = {
      schema: 'daq.progress', version: 2,
      quests: {
        sql: {
          levels: { L1: { done: true, clear: false, hints: 0, ans: '', xp: 30, at: 1, rev: 1, srvAt: 5e12 } },
          xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 5e12
        }
      }
    };
    env.DAQ_SYNC_CONFIG = { endpoint: 'https://sync.invalid' };
    let put = null;
    env.fetch = (url, opts) => {
      const u = String(url);
      if (u.endsWith('/session')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ connected: true, user: 'octocat' }) });
      }
      if (u.endsWith('/progress') && (!opts || opts.method !== 'PUT')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pulled) });
      }
      put = opts ? JSON.parse(opts.body) : null;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    };
    answerLevel(env, 2);                       // local: level 2 solved now
    await env.DAQ.sync.sync();
    eq(env.DAQ.doneCount('sql'), 2, 'local level 2 plus remote level 1');
    ok(put && put.quests && put.quests.sql, 'the merged envelope was pushed back');
    ok(Object.keys(put.quests.sql.levels).indexOf('L1') >= 0, 'remote level included in the push');
    ok(Object.keys(put.quests.sql.levels).indexOf('L2') >= 0, 'local level included in the push');
    eq(env.DAQ.sync.status().state, 'on', 'reports connected');
  });

  await test('E', 'sync-config.js is gitignored and documented', () => {
    const ignore = read('.gitignore');
    ok(/(^|\n)sync-config\.js(\n|$)/.test(ignore), 'sync-config.js ignored');
    ok(fs.existsSync(path.join(ROOT, 'sync-config.example.js')), 'example config shipped');
    ok(/docs\/sync\.md/.test(read('README.md')), 'README points at docs/sync.md');
    ok(fs.existsSync(path.join(ROOT, 'docs', 'sync.md')), 'docs/sync.md exists');
  });

  await test('E', 'README documents the new features', () => {
    const md = read('README.md');
    ['Previous Quest', 'Next Quest', 'Reset this level', 'backup', 'merge',
      'docs/sync.md', 'tests/run-tests.mjs', 'daq_progress_v2'].forEach((needle) => {
      ok(md.toLowerCase().indexOf(needle.toLowerCase()) >= 0, 'README mentions "' + needle + '"');
    });
  });

  /* ------------------------------- report -------------------------------- */
  const total = passed + failures.length;
  console.log('\n' + '='.repeat(64));
  if (failures.length === 0) {
    console.log('ALL ' + total + ' TESTS PASSED');
  } else {
    console.log(passed + ' passed, ' + failures.length + ' FAILED (of ' + total + ')');
    failures.forEach((f) => {
      console.log('\nFAIL [' + f.section + '] ' + f.name);
      console.log('  ' + (f.error && f.error.stack ? f.error.stack.split('\n').slice(0, 5).join('\n  ') : f.error));
    });
  }
  console.log('='.repeat(64));
  process.exit(failures.length ? 1 : 0);
}

main();
