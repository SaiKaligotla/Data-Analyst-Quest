/* ============================================================================
 * Data Analyst Quest - progress engine
 * ----------------------------------------------------------------------------
 * One file, no dependencies, no network, no credentials.
 *
 * What this file owns:
 *   - a single versioned localStorage envelope (daq_progress_v2) holding the
 *     progress of all five games, keyed by STABLE quest ids and level ids
 *   - migration of the old per-game keys (sqlquest_v1, excelquest_v1,
 *     pyquest_v1, statsquest_v1, pbiquest_v1) into that envelope
 *   - a "legacy view" ({done, xp, hints, streak, ans}) that the existing game
 *     scripts keep using, so the games themselves barely change
 *   - per-level reset, per-quest reset, XP-awarded-once bookkeeping
 *   - export / import / local backups with a safe, tombstone-aware merge
 *   - hooks for the optional GitHub sync client (see docs/sync.md)
 *
 * SECURITY: this file contains no secrets and performs no authentication.
 * The GitHub sync design keeps every credential server side; see docs/sync.md.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------- constants ----------------------------- */
  var SCHEMA = 'daq.progress';
  var VERSION = 2;
  var STORE_KEY = 'daq_progress_v2';       // canonical store
  var BACKUP_PREFIX = 'daq_backup_';       // local safety copies
  var BAD_PREFIX = 'daq_unreadable_';      // corrupt envelopes, kept aside, never read back
  var MAX_BACKUPS = 8;
  var MAX_LEVEL = 9999;                    // sanity bound for level numbers

  /* Stable quest registry. Order === the order the Previous/Next controls walk.
   * `key` is the historical per-game localStorage key, still written as a
   * compatibility mirror so older cached copies of the site keep working. */
  var QUESTS = [
    { id: 'sql',     key: 'sqlquest_v1',   file: 'sql-quest.html',
      title: 'SQL Quest',        short: 'SQL',        levels: 34, accent: '#6366f1', day: 'Days 1-2' },
    { id: 'excel',   key: 'excelquest_v1', file: 'excel-quest.html',
      title: 'Excel Quest',      short: 'Excel',      levels: 30, accent: '#16a34a', day: 'Day 3' },
    { id: 'python',  key: 'pyquest_v1',    file: 'python-quest.html',
      title: 'Python Quest',     short: 'Python',     levels: 35, accent: '#eab308', day: 'Day 4' },
    { id: 'stats',   key: 'statsquest_v1', file: 'stats-quest.html',
      title: 'Statistics Quest', short: 'Statistics', levels: 31, accent: '#a855f7', day: 'Day 5' },
    { id: 'powerbi', key: 'pbiquest_v1',   file: 'powerbi-quest.html',
      title: 'Power BI Quest',   short: 'Power BI',   levels: 29, accent: '#f97316', day: 'Day 6' }
  ];

  var QUEST_IDS = QUESTS.map(function (q) { return q.id; });

  /* -------------------------------- storage ------------------------------ */
  function ls() {
    try { global.localStorage.setItem('__daq_probe__', '1'); global.localStorage.removeItem('__daq_probe__'); }
    catch (e) { return null; }
    return global.localStorage;
  }
  function readRaw(key) {
    var s = ls(); if (!s) return null;
    try { return s.getItem(key); } catch (e) { return null; }
  }
  function writeRaw(key, val) {
    var s = ls(); if (!s) return false;
    try { s.setItem(key, val); return true; } catch (e) { return false; }
  }
  function removeRaw(key) { var s = ls(); if (!s) return; try { s.removeItem(key); } catch (e) {} }

  /* ------------------------------ utilities ------------------------------ */
  function now() { return Date.now(); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function int(v, d) { v = parseInt(v, 10); return isFinite(v) ? v : (d || 0); }
  function clampInt(v, lo, hi, d) {
    v = parseInt(v, 10);
    if (!isFinite(v)) return d || 0;
    return Math.max(lo, Math.min(hi, v));
  }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function keysOf(o) { return isObj(o) ? Object.keys(o) : []; }
  function levelId(n) { return 'L' + int(n, 0); }
  function levelNum(lid) { var n = parseInt(String(lid).replace(/^L/i, ''), 10); return isFinite(n) ? n : 0; }

  function newDeviceId() {
    return 'dev-' + Math.random().toString(36).slice(2, 8) + '-' + now().toString(36);
  }

  /* --------------------------- envelope handling ------------------------- */
  function blankStore() {
    return { schema: SCHEMA, version: VERSION, dev: newDeviceId(), updatedAt: now(), quests: {} };
  }

  function blankQuest() {
    return { levels: {}, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 0 };
  }

  /* Accepts anything shaped even vaguely like a store and returns a clean one.
   * Unknown quest ids / junk level keys are dropped rather than trusted. */
  function normalizeStore(raw) {
    var st = blankStore();
    if (!isObj(raw)) return st;
    st.dev = str(raw.dev) || st.dev;
    st.updatedAt = int(raw.updatedAt, 0) || st.updatedAt;
    var qs = isObj(raw.quests) ? raw.quests : raw;
    QUEST_IDS.forEach(function (id) {
      var q = qs[id];
      if (!isObj(q)) return;
      st.quests[id] = normalizeQuest(q);
    });
    return st;
  }

  function normalizeQuest(q) {
    var out = blankQuest();
    if (!isObj(q)) return out;
    out.xpCarry = Math.max(0, int(q.xpCarry, 0));
    out.streak = Math.max(0, int(q.streak, 0));
    out.questResetAt = Math.max(0, int(q.questResetAt, 0));
    out.updatedAt = Math.max(0, int(q.updatedAt, 0));
    var levels = isObj(q.levels) ? q.levels : {};
    keysOf(levels).forEach(function (lid) {
      var n = levelNum(lid);
      if (n < 1 || n > MAX_LEVEL) return;                 // stable ids only
      var r = levels[lid];
      if (!isObj(r)) return;
      var rec = {
        at: Math.max(0, int(r.at, 0)),
        rev: Math.max(0, int(r.rev, 0)),
        done: !!r.done,
        clear: !!r.clear,
        hints: clampInt(r.hints, 0, 9, 0),
        ans: str(r.ans).slice(0, 20000),
        xp: Math.max(0, int(r.xp, 0))
      };
      if (r.srvAt) rec.srvAt = Math.max(0, int(r.srvAt, 0));
      if (!rec.at && !rec.done && !rec.ans) return;       // nothing to remember
      out.levels[levelId(n)] = rec;
    });
    return out;
  }

  /* ------------------------------- in-memory ----------------------------- */
  var cache = null;

  /* The one authoritative read of the envelope. If what is stored cannot be
   * parsed - a truncated write, a half-finished migration, someone editing dev
   * tools - keep it aside before anything overwrites it, then start clean. */
  function store() {
    if (cache) return cache;
    var raw = readRaw(STORE_KEY);
    if (raw) {
      var parsed = null;
      try { parsed = normalizeStore(JSON.parse(raw)); } catch (e) { parsed = null; }
      if (parsed) { cache = parsed; return cache; }
      try { writeRaw(BAD_PREFIX + now() + '-' + (++badSeq), raw); } catch (e) {}
      cache = blankStore();
      try { writeRaw(STORE_KEY, JSON.stringify(cache)); } catch (e) {}
    } else {
      cache = migrateLegacy();
    }
    return cache;
  }

  function quest(id) {
    var st = store();
    if (!st.quests[id]) st.quests[id] = blankQuest();
    return st.quests[id];
  }

  function questXp(q) {
    var total = q.xpCarry || 0;
    keysOf(q.levels).forEach(function (lid) {
      var r = q.levels[lid];
      if (r && r.done && !r.clear) total += r.xp || 0;
    });
    return total;
  }
  function doneCount(q) {
    var n = 0;
    keysOf(q.levels).forEach(function (lid) {
      var r = q.levels[lid];
      if (r && r.done && !r.clear) n++;
    });
    return n;
  }

  /* Persist the envelope, then refresh the legacy mirror of the quest that was
   * just written so any older cached copy of the site (and the original
   * index.html script) still reads correct progress. Saves happen on every
   * keystroke, so only the one mirror is refreshed here. */
  function save(mirrorQuestId) {
    var st = store();
    st.updatedAt = now();
    writeRaw(STORE_KEY, JSON.stringify(st));
    if (mirrorQuestId) writeMirror(mirrorQuestId);
    scheduleRefresh();
    return st;
  }

  function writeMirror(id) {
    var meta = questMeta(id);
    if (!meta) return;
    writeRaw(meta.key, JSON.stringify(view(id)));
  }
  function writeAllMirrors() { QUESTS.forEach(function (m) { writeMirror(m.id); }); }

  /* ------------------------- legacy key migration ------------------------ */
  /* The five old keys each held {done:{n:1}, xp, hints:{}, streak, ans:{}}.
   * They are read (never deleted) and folded into the v2 envelope. XP that
   * cannot be attributed to a single level is preserved in xpCarry so nobody
   * loses XP they already earned. */
  function migrateLegacy() {
    var st = blankStore();
    var found = 0;
    QUESTS.forEach(function (meta) {
      var raw = readRaw(meta.key);
      if (!raw) return;
      var legacy;
      try { legacy = JSON.parse(raw); } catch (e) { return; }
      if (!isObj(legacy) || !isObj(legacy.done)) return;
      found++;
      st.quests[meta.id] = legacyToQuest(legacy, meta);
    });
    if (found) {
      st.updatedAt = now();
      writeRaw(STORE_KEY, JSON.stringify(st));
    }
    return st;
  }

  function legacyToQuest(legacy, meta) {
    var q = blankQuest(), perLevel = 0;
    keysOf(legacy.done || {}).forEach(function (k) {
      var n = int(k, 0);
      if (n < 1 || n > meta.levels) return;
      var h = clampInt(legacy.hints && legacy.hints[k], 0, 9, 0);
      var gain = Math.max(10, 30 - h * 7);
      perLevel += gain;
      q.levels[levelId(n)] = {
        done: true, clear: false, hints: h,
        ans: str(legacy.ans && legacy.ans[k]).slice(0, 20000),
        xp: gain, at: now(), rev: 1
      };
    });
    q.xpCarry = Math.max(0, int(legacy.xp, 0) - perLevel);
    q.streak = Math.max(0, int(legacy.streak, 0));
    q.updatedAt = now();
    return q;
  }

  /* --------------------------- the legacy view --------------------------- */
  /* Exactly the shape the five game scripts already use, so they keep working
   * unchanged: {done:{n:1}, xp, hints:{n:k}, streak, ans:{n:'text'}} */
  function view(id) {
    var q = quest(id);
    var done = {}, hints = {}, ans = {};
    keysOf(q.levels).forEach(function (lid) {
      var r = q.levels[lid];
      if (!r) return;
      var n = levelNum(lid);
      if (r.done && !r.clear) done[n] = 1;
      if (r.hints) hints[n] = r.hints;
      if (r.ans) ans[n] = r.ans;
    });
    return { done: done, xp: questXp(q), hints: hints, streak: q.streak || 0, ans: ans };
  }

  /* Write a legacy view back into the envelope. The games own their own XP
   * arithmetic (30 XP minus 7 per hint, floor 10); this function attributes
   * whatever the game just did to the right level record instead of
   * re-implementing it, so the two can never drift apart. */
  function commit(id, v) {
    var q = quest(id), t = now();
    var before = questXp(q);
    var prevDone = {};
    keysOf(q.levels).forEach(function (lid) {
      var r = q.levels[lid];
      if (r && r.done && !r.clear) prevDone[levelNum(lid)] = true;
    });

    var touched = [];
    var add = function (n) { if (touched.indexOf(n) < 0) touched.push(n); };
    keysOf(v && v.done).forEach(function (k) { add(int(k, 0)); });
    keysOf(v && v.hints).forEach(function (k) { add(int(k, 0)); });
    keysOf(v && v.ans).forEach(function (k) { add(int(k, 0)); });
    touched = touched.filter(function (n) { return n >= 1 && n <= MAX_LEVEL; })
                     .sort(function (a, b) { return a - b; });

    var newlyDone = touched.filter(function (n) { return v.done && v.done[n] && !prevDone[n]; });
    var formulaSum = 0;
    newlyDone.forEach(function (n) {
      var h = clampInt(v.hints && v.hints[n], 0, 9, 0);
      formulaSum += Math.max(10, 30 - h * 7);
    });

    touched.forEach(function (n) {
      var lid = levelId(n);
      var rec = q.levels[lid];
      var hints = clampInt(v.hints && v.hints[n], 0, 9, 0);
      var ans = str(v.ans && v.ans[n]).slice(0, 20000);
      var doneNow = !!(v.done && v.done[n]);
      var changed = false;

      if (!rec) {
        if (!doneNow && !ans && !hints) return;
        rec = { done: false, clear: false, hints: 0, ans: '', xp: 0, at: t, rev: 0 };
        q.levels[lid] = rec;
        changed = true;
      }
      /* a level the view no longer reports as done has been cleared */
      if (rec.done && !rec.clear && !doneNow) {
        q.levels[lid] = { done: false, clear: true, hints: 0, ans: '', xp: 0,
                          at: t, rev: (rec.rev || 0) + 1 };
        return;
      }
      if (!rec.done && doneNow) { rec.done = true; rec.clear = false; changed = true; }
      if (hints > (rec.hints || 0)) { rec.hints = hints; changed = true; }
      if (ans && ans !== rec.ans) { rec.ans = ans; changed = true; }
      if (changed) { rec.at = t; rec.rev = (rec.rev || 0) + 1; }
    });

    /* A level that is stored as done but is missing from the view has been
     * cleared on this device (the games do that in resetAll(), which replaces
     * the whole state object). Tombstone those too, so the reset propagates. */
    keysOf(q.levels).forEach(function (lid) {
      var rec = q.levels[lid];
      if (!rec || !rec.done || rec.clear) return;
      if (v.done && v.done[levelNum(lid)]) return;
      q.levels[lid] = { done: false, clear: true, hints: 0, ans: '', xp: 0,
                        at: t, rev: (rec.rev || 0) + 1 };
    });

    /* attribute XP to the level(s) that were just solved */
    if (newlyDone.length) {
      var delta = int(v.xp, 0) - before;
      if (newlyDone.length === 1) {
        var rec = q.levels[levelId(newlyDone[0])];
        rec.xp = delta > 0 ? delta : Math.max(10, 30 - (rec.hints || 0) * 7);
      } else {
        newlyDone.forEach(function (n) {
          var r = q.levels[levelId(n)];
          r.xp = Math.max(10, 30 - (r.hints || 0) * 7);
        });
        if (delta > 0 && delta !== formulaSum) {
          q.xpCarry = Math.max(0, (q.xpCarry || 0) + (delta - formulaSum));
        }
      }
    }

    /* the game emptied the quest -> treat it as a full quest reset */
    if (doneCount(q) === 0 && Object.keys(prevDone).length > 0) {
      q.questResetAt = t;
      q.xpCarry = 0;
    }
    q.streak = Math.max(0, int(v && v.streak, 0));
    q.updatedAt = t;
    save(id);
    return q;
  }

  /* ------------------------------- resets -------------------------------- */
  /* Per-level reset: only this level. Its tick, hints, saved answer and the
   * XP it earned go away; every other level is untouched. A tombstone is
   * written so the reset also wins when another device syncs later. */
  function resetLevel(id, n) {
    var q = quest(id), lid = levelId(n), t = now();
    var rec = q.levels[lid];
    if (!rec) return { removedXp: 0, wasDone: false };
    var wasDone = !!(rec.done && !rec.clear);
    var hadXp = wasDone ? (rec.xp || 0) : 0;
    q.levels[lid] = { done: false, clear: true, hints: 0, ans: '', xp: 0,
                      at: t, rev: (rec.rev || 0) + 1 };
    q.updatedAt = t;
    save(id);
    return { removedXp: hadXp, wasDone: wasDone };
  }

  /* Per-quest reset: every level of this quest, nothing else. */
  function resetQuest(id) {
    var q = quest(id), t = now();
    var cleared = doneCount(q);
    q.levels = {};
    q.xpCarry = 0;
    q.streak = 0;
    q.questResetAt = t;
    q.updatedAt = t;
    save(id);
    writeAllMirrors();
    return { cleared: cleared };
  }

  /* ------------------------------- merging ------------------------------- */
  /* Which record is newer? The server stamp if sync supplied one, otherwise
   * the local clock. Ties fall back to the revision counter, then to the
   * non-destructive record, so a merge can never silently delete a solve. */
  function stamp(r) { return (r && (r.srvAt || r.at)) || 0; }

  function tombstone(r, at) {
    return { done: false, clear: true, hints: 0, ans: '', xp: 0, at: at, rev: (r.rev || 0) + 1 };
  }

  function pickLevel(a, b, questResetAt) {
    var win;
    if (!a) win = b;
    else if (!b) win = a;
    else {
      var sa = stamp(a), sb = stamp(b);
      if (sa > sb) win = a; else if (sb > sa) win = b;
      else if ((a.rev || 0) > (b.rev || 0)) win = a;
      else if ((b.rev || 0) > (a.rev || 0)) win = b;
      else if (a.done && !a.clear && !(b.done && !b.clear)) win = a;
      else if (b.done && !b.clear && !(a.done && !a.clear)) win = b;
      else win = (a.xp || 0) >= (b.xp || 0) ? a : b;
    }
    if (!win) return null;
    /* a quest reset that happened after this level was solved beats the solve */
    if (questResetAt && stamp(win) < questResetAt && stamp(win) !== questResetAt) {
      return tombstone(win, questResetAt);
    }
    return win;
  }

  function mergeQuest(a, b) {
    var out = blankQuest();
    var qr = Math.max(a.questResetAt || 0, b.questResetAt || 0);
    var newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
    out.questResetAt = qr;
    out.xpCarry = Math.max(0, int(newer.xpCarry, 0));
    out.streak = Math.max(int(a.streak, 0), int(b.streak, 0));
    out.updatedAt = Math.max(int(a.updatedAt, 0), int(b.updatedAt, 0));
    var ids = {};
    keysOf(a.levels).forEach(function (k) { ids[k] = 1; });
    keysOf(b.levels).forEach(function (k) { ids[k] = 1; });
    keysOf(ids).forEach(function (lid) {
      var win = pickLevel(a.levels[lid], b.levels[lid], qr);
      if (win) out.levels[lid] = win;
    });
    return out;
  }

  /* Merge a whole foreign store into the local one (used by import and sync).
   * The result is written straight back to localStorage, so a caller can never
   * merge into memory and forget to persist. */
  function mergeStore(other) {
    var st = store();
    var incoming = normalizeStore(other);
    var report = { quests: {} };
    QUEST_IDS.forEach(function (id) {
      var mine = st.quests[id] || blankQuest();
      var theirs = incoming.quests[id];
      if (!theirs) { report.quests[id] = diff(mine, mine); return; }
      var merged = mergeQuest(mine, theirs);
      report.quests[id] = diff(mine, merged);
      st.quests[id] = merged;
    });
    st.updatedAt = now();
    writeRaw(STORE_KEY, JSON.stringify(st));
    writeAllMirrors();
    return report;
  }

  function diff(before, after) {
    var b = {}, a = {};
    keysOf(before.levels).forEach(function (l) { var r = before.levels[l]; if (r && r.done && !r.clear) b[l] = 1; });
    keysOf(after.levels).forEach(function (l) { var r = after.levels[l]; if (r && r.done && !r.clear) a[l] = 1; });
    var added = 0, kept = 0, cleared = 0;
    keysOf(a).forEach(function (l) { if (b[l]) kept++; else added++; });
    keysOf(b).forEach(function (l) { if (!a[l]) cleared++; });
    return {
      added: added, kept: kept, cleared: cleared,
      levels: keysOf(a).length,
      xpBefore: questXp(before), xpAfter: questXp(after)
    };
  }

  /* ---------------------------- export / import -------------------------- */
  function envelope(extra) {
    var out = {
      schema: SCHEMA, version: VERSION,
      exportedAt: new Date().toISOString(),
      device: store().dev,
      quests: store().quests
    };
    if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  function exportJSON(pretty) {
    return JSON.stringify(envelope(), null, pretty ? 2 : 0);
  }

  /* Understands, in order:
   *   1. a v2 envelope                    {schema:'daq.progress', quests:{...}}
   *   2. a wrapped legacy export          {sqlquest_v1:{...}, excelquest_v1:{...}}
   *   3. {quests:{sql:{...}}}             (quest ids, not storage keys)
   *   4. a single bare legacy game object {done:{}, xp, hints, streak, ans}
   *      -> applied to opts.quest (the current page's quest by default)
   */
  function parseImport(text, opts) {
    opts = opts || {};
    var data;
    try { data = JSON.parse(text); }
    catch (e) { return { error: 'That is not valid JSON (' + e.message + ').' }; }
    if (!isObj(data)) return { error: 'Expected a JSON object at the top level.' };

    if (data.schema === SCHEMA || data.version === VERSION) {
      if (!isObj(data.quests)) return { error: 'Envelope is missing its "quests" object.' };
      return { store: normalizeStore(data) };
    }
    /* wrapped legacy storage keys */
    var wrapped = {}, hit = 0;
    QUESTS.forEach(function (m) {
      if (isObj(data[m.key]) && isObj(data[m.key].done)) { wrapped[m.id] = legacyToQuest(data[m.key], m); hit++; }
    });
    if (hit) return { store: normalizeStore({ quests: wrapped }) };

    /* quest ids, not storage keys */
    if (isObj(data.quests)) {
      var any = false;
      QUEST_IDS.forEach(function (id) { if (isObj(data.quests[id])) any = true; });
      if (any) return { store: normalizeStore(data) };
    }
    /* bare legacy game object */
    if (isObj(data.done)) {
      var id = opts.quest || (global.DAQ_UI && global.DAQ_UI.quest);
      var meta = questMeta(id);
      if (!meta) {
        return { error: 'This is a single-game export. Open that game\'s page and import it there, ' +
          'so the site knows which game it belongs to.' };
      }
      var one = {};
      one[id] = legacyToQuest(data, meta);
      return { store: normalizeStore({ quests: one }) };
    }
    return { error: 'Unrecognised progress format. Expected an export made by this site ' +
      '(schema "' + SCHEMA + '" v' + VERSION + ') or one of the old per-game localStorage keys.' };
  }

  /* Import is always backup-first: the current state is copied to
   * daq_backup_<timestamp> before a single byte changes. */
  function importJSON(text, mode, opts) {
    mode = mode === 'replace' ? 'replace' : 'merge';
    var parsed = parseImport(text, opts);
    if (parsed.error) return { ok: false, error: parsed.error };
    var st = store();
    var before = {};
    QUEST_IDS.forEach(function (id) { before[id] = st.quests[id] || blankQuest(); });

    var backupKey = backupNow(true);
    var report;
    if (mode === 'replace') {
      var next = normalizeStore(parsed.store);
      report = { quests: {} };
      QUEST_IDS.forEach(function (id) {
        report.quests[id] = diff(before[id], next.quests[id] || blankQuest());
        st.quests[id] = next.quests[id] || blankQuest();
      });
      st.dev = st.dev || next.dev;
    } else {
      report = mergeStore(parsed.store);
    }
    st.updatedAt = now();
    writeRaw(STORE_KEY, JSON.stringify(st));
    writeAllMirrors();
    report.ok = true;
    report.mode = mode;
    report.backupKey = backupKey;
    report.received = countDone(parsed.store);
    return report;
  }

  function countDone(s) {
    var total = 0;
    QUEST_IDS.forEach(function (id) { total += doneCount(s.quests[id] || blankQuest()); });
    return total;
  }

  /* ------------------------------- backups ------------------------------- */
  /* Two backups can be taken inside the same millisecond, so the key carries a
   * sequence number as well as the timestamp; backups() reads the timestamp
   * back out of the front of the key. */
  var backupSeq = 0;
  var badSeq = 0;
  function backupNow(silent) {
    var key = BACKUP_PREFIX + now() + '-' + (++backupSeq);
    writeRaw(key, exportJSON(true));
    pruneBackups();
    if (!silent) refreshUI();
    return key;
  }
  function backups() {
    var s = ls(); if (!s) return [];
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var k = s.key(i);
      if (!k || k.indexOf(BACKUP_PREFIX) !== 0) continue;
      var raw = readRaw(k);
      if (!raw) continue;
      var n = 0;
      try {
        var st = normalizeStore(JSON.parse(raw));
        n = countDone(st);
      } catch (e) { n = -1; }
      out.push({ key: k, at: int(k.slice(BACKUP_PREFIX.length), 0), levels: n });
    }
    return out.sort(function (a, b) { return b.at - a.at || (b.key < a.key ? -1 : 1); });
  }
  function pruneBackups() {
    backups().slice(MAX_BACKUPS).forEach(function (b) { removeRaw(b.key); });
  }
  function restoreBackup(key) {
    if (String(key).indexOf(BACKUP_PREFIX) !== 0) return { ok: false, error: 'Not a backup key.' };
    var raw = readRaw(key);
    if (!raw) return { ok: false, error: 'That backup no longer exists.' };
    var keep = backupNow(true);
    var st;
    try { st = normalizeStore(JSON.parse(raw)); }
    catch (e) { return { ok: false, error: 'That backup is corrupt.' }; }
    cache = st;
    writeRaw(STORE_KEY, JSON.stringify(st));
    writeAllMirrors();
    return { ok: true, backupKey: keep, levels: countDone(st) };
  }

  /* -------------------------------- status ------------------------------- */
  function questMeta(id) {
    for (var i = 0; i < QUESTS.length; i++) if (QUESTS[i].id === id) return QUESTS[i];
    return null;
  }
  function summary(id) {
    var q = quest(id), meta = questMeta(id);
    var done = doneCount(q);
    return {
      id: id, title: meta.title, short: meta.short, levels: meta.levels,
      done: done, xp: questXp(q), streak: q.streak || 0,
      pct: meta.levels ? Math.round(100 * done / meta.levels) : 0,
      updatedAt: q.updatedAt || 0, questResetAt: q.questResetAt || 0
    };
  }
  function summaryAll() {
    var out = { quests: QUESTS.map(function (m) { return summary(m.id); }), total: 0, xp: 0, levels: 0 };
    out.quests.forEach(function (s) { out.total += s.done; out.levels += s.levels; out.xp += s.xp; });
    out.pct = out.levels ? Math.round(100 * out.total / out.levels) : 0;
    return out;
  }
  function neighbour(id, dir) {
    var i = QUEST_IDS.indexOf(id);
    if (i < 0) return null;
    var j = i + dir;
    if (j < 0 || j >= QUESTS.length) return null;
    return QUESTS[j];
  }

  /* --------------------------------- sync -------------------------------- */
  /* The sync client (sync.js) registers itself here. It is handed no secrets -
   * only a URL. Everything authenticated happens on the backend, which holds
   * the GitHub App credentials. If sync.js is absent, or the endpoint is not
   * configured, the UI reports "not configured" and nothing else happens.
   * See docs/sync.md. */
  var syncAdapter = null;
  var sync = {
    register: function (adapter) { syncAdapter = adapter; refreshUI(); },
    configured: function () { return !!(syncAdapter && syncAdapter.configured && syncAdapter.configured()); },
    status: function () {
      if (!syncAdapter) return { state: 'absent', label: 'Sync not loaded' };
      return syncAdapter.status();
    },
    connect: function () { if (syncAdapter && syncAdapter.connect) return syncAdapter.connect(); },
    pull: function () { if (syncAdapter && syncAdapter.pull) return syncAdapter.pull(); },
    push: function () { if (syncAdapter && syncAdapter.push) return syncAdapter.push(); },
    sync: function () { if (syncAdapter && syncAdapter.sync) return syncAdapter.sync(); }
  };

  /* --------------------------------- hooks ------------------------------- */
  var uiHooks = [];
  var refreshTimer = null;
  function refreshUI() {
    refreshTimer = null;
    uiHooks.forEach(function (f) { try { f(); } catch (e) {} });
  }
  /* Saves happen on every keystroke, so the panel refresh is coalesced. */
  function scheduleRefresh() {
    if (typeof global.setTimeout !== 'function') { refreshUI(); return; }
    if (refreshTimer) return;
    refreshTimer = global.setTimeout(function () { refreshUI(); }, 350);
  }
  function onRefresh(f) { if (typeof f === 'function') uiHooks.push(f); }

  /* --------------------------------- public ------------------------------ */
  var DAQ = {
    SCHEMA: SCHEMA, VERSION: VERSION, STORE_KEY: STORE_KEY, QUESTS: QUESTS,
    levelId: levelId,
    ready: function () { return !!ls(); },
    store: store,
    quest: quest,
    meta: questMeta,
    neighbour: neighbour,
    view: view,
    commit: commit,
    isDone: function (id, n) { var r = quest(id).levels[levelId(n)]; return !!(r && r.done && !r.clear); },
    doneCount: function (id) { return doneCount(quest(id)); },
    xp: function (id) { return questXp(quest(id)); },
    hints: function (id, n) { var r = quest(id).levels[levelId(n)]; return r ? (r.hints || 0) : 0; },
    answer: function (id, n) { var r = quest(id).levels[levelId(n)]; return r ? (r.ans || '') : ''; },
    streak: function (id) { return quest(id).streak || 0; },
    resetLevel: resetLevel,
    resetQuest: resetQuest,
    migrate: function () { cache = null; var st = store(); writeAllMirrors(); return st; },
    export: exportJSON,
    exportObject: function () { return envelope(); },
    import: importJSON,
    parseImport: parseImport,
    mergeStore: mergeStore,
    summary: summary,
    summaryAll: summaryAll,
    backupNow: function (silent) { return backupNow(silent); },
    backups: backups,
    restoreBackup: restoreBackup,
    sync: sync,
    onRefresh: onRefresh,
    refresh: refreshUI
  };

  global.DAQ = DAQ;
  if (typeof module !== 'undefined' && module.exports) module.exports = DAQ;
})(typeof window !== 'undefined' ? window : globalThis);
