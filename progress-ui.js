/* ============================================================================
 * Data Analyst Quest - shared progress UI
 * ----------------------------------------------------------------------------
 * Renders, on every game page and on the index:
 *   - the Previous Quest / Next Quest navigation bar
 *   - the "Progress data" panel: export, copy, backup, import/restore
 *   - the GitHub sync status line (honest about being unconfigured)
 *   - the per-level "Reset this level" control inside the level view
 *
 * No secrets, no credentials, no authentication logic lives here. The sync
 * section only ever talks to a URL that the operator configures; the GitHub
 * OAuth exchange happens on the backend described in docs/sync.md.
 * ========================================================================== */
(function (global) {
  'use strict';

  var DAQ = global.DAQ;
  var doc = global.document;

  var ui = {
    quest: null,          // quest id of the current page
    level: null,          // level number currently open
    onImported: null,     // page callback after an import/restore
    onLevelReset: null    // page callback after a per-level reset
  };

  /* ------------------------------- helpers ------------------------------- */
  function el(id) { return doc.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function when(ms) {
    if (!ms) return 'never';
    var d = new Date(ms), diff = Date.now() - ms;
    if (diff < 45000) return 'just now';
    if (diff < 3600e3) return Math.round(diff / 60e3) + ' min ago';
    if (diff < 864e5) return Math.round(diff / 3600e3) + ' h ago';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function stamp(ms) {
    var d = new Date(ms);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function msg(text, kind, html) {
    var box = el('pmsg');
    if (!box) { global.alert(text); return; }
    box.className = 'pmsg on ' + (kind || 'info');
    if (html) box.innerHTML = text; else box.textContent = text;
  }
  function download(name, text) {
    var blob = new global.Blob([text], { type: 'application/json' });
    var url = global.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url; a.download = name;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 4000);
  }

  /* ------------------------------ quest nav ------------------------------ */
  /* SQL -> Excel -> Python -> Statistics -> Power BI. The first quest has no
   * Previous, the last has no Next; both are rendered disabled with a note. */
  function mountNav(qid) {
    var host = el('qnav');
    if (!host) return;
    var meta = DAQ.meta(qid);
    var idx = DAQ.QUESTS.indexOf(meta);
    var prev = DAQ.neighbour(qid, -1);
    var next = DAQ.neighbour(qid, 1);

    var h = '';
    h += '<button class="qn" id="qprev" type="button"' + (prev ? '' : ' disabled') + '>' +
      '&larr; Previous Quest' + (prev ? ': ' + esc(prev.short) : '') + '</button>';
    h += '<button class="qn" id="qnext" type="button"' + (next ? '' : ' disabled') + '>' +
      (next ? esc(next.short) + ': ' : '') + 'Next Quest &rarr;</button>';
    h += '<span class="qp">Quest <b>' + (idx + 1) + '</b> of <b>' + DAQ.QUESTS.length +
      '</b> &middot; ' + esc(meta.title) +
      (!prev ? ' &middot; first quest' : '') + (!next ? ' &middot; last quest' : '') + '</span>';
    host.innerHTML = h;

    if (prev) el('qprev').addEventListener('click', function () { global.location.href = prev.file; });
    if (next) el('qnext').addEventListener('click', function () { global.location.href = next.file; });
  }

  /* --------------------------- progress panel ---------------------------- */
  function mountPanel(qid) {
    var host = el('pbox');
    if (!host) return;
    host.innerHTML =
      '<h3>Progress data &mdash; backup, restore &amp; sync</h3>' +
      '<div class="hint">Progress is stored in this browser only. Download a copy to move it to ' +
      'another device, or import one here. Importing always keeps a backup of what you had first, ' +
      'and merging never deletes a level you have already cleared.</div>' +
      '<div class="pstat" id="pstat"></div>' +
      '<div class="prow">' +
        '<button class="b" type="button" id="bexp">Download export (.json)</button>' +
        '<button class="b" type="button" id="bcopy">Copy JSON</button>' +
        '<button class="b" type="button" id="bbak">Save backup copy</button>' +
        '<button class="b" type="button" id="bimp">Import / restore&hellip;</button>' +
      '</div>' +
      '<div class="pimp" id="pimp">' +
        '<textarea id="ptxt" spellcheck="false" placeholder="Paste an exported progress JSON here, or pick a file below."></textarea>' +
        '<input type="file" id="pfile" accept=".json,application/json">' +
        '<label class="pchk"><input type="radio" name="pmode" value="merge" checked>' +
          '<span><b>Merge (recommended)</b> &mdash; add what the file has and keep everything you ' +
          'already cleared here. Nothing is deleted.</span></label>' +
        '<label class="pchk"><input type="radio" name="pmode" value="replace">' +
          '<span><b>Replace</b> &mdash; throw away this browser&rsquo;s progress and use the file ' +
          'instead. A backup is still written first.</span></label>' +
        '<div class="prow">' +
          '<button class="b go" type="button" id="bdo">Import</button>' +
          '<button class="b" type="button" id="bcancel">Cancel</button>' +
        '</div>' +
      '</div>' +
      '<div class="pmsg" id="pmsg"></div>' +
      '<div class="pbackups" id="pbackups"></div>' +
      '<div class="sync" id="psync"></div>';

    el('bexp').addEventListener('click', function () { ui.exportFile(); });
    el('bcopy').addEventListener('click', function () { ui.copyJSON(); });
    el('bbak').addEventListener('click', function () {
      var k = DAQ.backupNow();
      msg('Backup saved in this browser as <code>' + esc(k) + '</code>. ' +
          'Use "Save backup copy" any time before changing something risky.', 'ok', true);
      ui.refresh();
    });
    el('bimp').addEventListener('click', function () {
      var box = el('pimp');
      box.className = box.className.indexOf('on') >= 0 ? 'pimp' : 'pimp on';
    });
    el('bcancel').addEventListener('click', function () {
      el('pimp').className = 'pimp';
      el('ptxt').value = '';
      el('pfile').value = '';
    });
    el('bdo').addEventListener('click', function () { ui.doImport(); });
    el('pfile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var fr = new global.FileReader();
      fr.onload = function () {
        el('ptxt').value = String(fr.result || '');
        msg('Loaded <b>' + esc(f.name) + '</b>. Pick Merge or Replace, then Import.', 'info', true);
      };
      fr.onerror = function () { msg('Could not read that file.', 'bad'); };
      fr.readAsText(f);
    });
    DAQ.onRefresh(function () { ui.refresh(); });
    ui.refresh();
  }

  function renderStatus() {
    var box = el('pstat');
    if (!box) return;
    var all = DAQ.summaryAll();
    var h = '<b>' + all.total + '</b> of <b>' + all.levels + '</b> levels cleared across the five games &middot; ' +
      '<b>' + all.xp + '</b> XP total<br>' +
      'Format <code>' + DAQ.SCHEMA + ' v' + DAQ.VERSION + '</code> &middot; last change ' + when(all.quests.reduce(function (m, q) {
        return Math.max(m, q.updatedAt || 0);
      }, 0)) + ' &middot; this browser <code>' + esc(DAQ.store().dev) + '</code>';
    h += '<ul class="plist">';
    all.quests.forEach(function (q) {
      h += '<li><span class="pn">' + esc(q.short) + '</span><span class="pv">' +
        q.done + ' / ' + q.levels + ' levels &middot; ' + q.xp + ' XP &middot; ' + q.pct + '%</span></li>';
    });
    h += '</ul>';
    box.innerHTML = h;
  }

  function renderBackups() {
    var box = el('pbackups');
    if (!box) return;
    var list = DAQ.backups();
    if (!list.length) { box.innerHTML = ''; return; }
    var h = 'Local backups (newest first): ' +
      '<select id="bsel">' + list.map(function (b) {
        return '<option value="' + esc(b.key) + '">' + esc(stamp(b.at) + ' ' +
          new Date(b.at).toLocaleTimeString()) + ' &middot; ' + (b.levels < 0 ? 'unreadable' : b.levels + ' levels') +
          '</option>';
      }).join('') + '</select> ' +
      '<button class="b" type="button" id="brestore">Restore</button>';
    box.innerHTML = h;
    el('brestore').addEventListener('click', function () {
      var key = el('bsel').value;
      if (!global.confirm('Restore this backup? Your current progress is backed up first, ' +
        'then replaced by the backup.')) return;
      var r = DAQ.restoreBackup(key);
      if (!r.ok) { msg('Restore failed: ' + r.error, 'bad'); return; }
      msg('Restored backup <code>' + esc(key) + '</code> (' + r.levels + ' levels). ' +
        'The progress it replaced was saved as <code>' + esc(r.backupKey) + '</code>.', 'ok', true);
      ui.afterChange();
    });
  }

  /* -------------------------------- sync --------------------------------- */
  function renderSync() {
    var box = el('psync');
    if (!box) return;
    var s = DAQ.sync.status();
    var dot = 'off', label = s.label || 'Unknown', note = '';
    if (s.state === 'on') dot = 'on';
    else if (s.state === 'wait') dot = 'wait';
    else if (s.state === 'error') dot = 'err';
    if (s.note) note = s.note;
    else if (s.state === 'absent' || s.state === 'off') {
      note = 'GitHub sync is <b>not configured</b> on this site, so nothing is uploaded anywhere. ' +
        'Use the export/import buttons above to move progress between devices. ' +
        'To turn sync on you have to deploy a small backend that holds your GitHub App credentials ' +
        '&mdash; see <a href="docs/sync.md">docs/sync.md</a>.';
    }
    box.innerHTML = '<span class="dot ' + dot + '"></span>' +
      '<span class="sl">' + esc(label) + '</span>' +
      (note ? '<span class="sn">' + note + '</span>' : '') +
      '<span class="sn" id="psyncbtn"></span>';
    var btn = el('psyncbtn');
    if (DAQ.sync.configured()) {
      btn.innerHTML = '<button class="b" type="button" id="bsync">Sync now</button> ' +
        (s.state === 'on' ? '' : '<button class="b" type="button" id="bconn">Connect GitHub</button>');
      if (el('bsync')) el('bsync').addEventListener('click', function () { ui.syncNow(); });
      if (el('bconn')) el('bconn').addEventListener('click', function () { DAQ.sync.connect(); });
    }
  }

  ui.refresh = function () {
    renderStatus();
    renderBackups();
    renderSync();
  };

  /* ------------------------------ actions -------------------------------- */
  ui.exportFile = function () {
    download('data-analyst-quest-progress-' + stamp(Date.now()) + '.json', DAQ.export(true));
    msg('Export downloaded. Keep it somewhere private &mdash; it contains your answers and progress.', 'ok');
  };

  ui.copyJSON = function () {
    var text = DAQ.export(true);
    function fallback() {
      var ta = doc.createElement('textarea');
      ta.value = text;
      doc.body.appendChild(ta);
      ta.select();
      try { doc.execCommand('copy'); msg('Progress JSON copied to the clipboard.', 'ok'); }
      catch (e) { msg('Could not copy automatically. Use "Download export" instead.', 'bad'); }
      doc.body.removeChild(ta);
    }
    if (global.navigator && global.navigator.clipboard) {
      global.navigator.clipboard.writeText(text).then(function () {
        msg('Progress JSON copied to the clipboard.', 'ok');
      }, fallback);
    } else fallback();
  };

  ui.doImport = function () {
    var text = (el('ptxt').value || '').trim();
    if (!text) { msg('Paste an exported progress JSON, or choose a file first.', 'bad'); return; }
    var mode = 'merge';
    var radios = doc.querySelectorAll('input[name="pmode"]');
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) mode = radios[i].value;

    var rep = DAQ.import(text, mode, { quest: ui.quest });
    if (!rep.ok) { msg('Import refused: ' + rep.error, 'bad'); return; }

    var lines = [];
    DAQ.QUESTS.forEach(function (m) {
      var r = rep.quests[m.id];
      if (!r) return;
      if (!r.added && !r.cleared && !r.kept) return;
      lines.push('<li><b>' + esc(m.short) + '</b>: ' + r.kept + ' kept, ' + r.added +
        ' newly restored, ' + r.cleared + ' no longer cleared &middot; ' +
        r.xpBefore + ' &rarr; ' + r.xpAfter + ' XP</li>');
    });
    msg('<b>Import complete (' + (mode === 'merge' ? 'merge' : 'replace') + ').</b> ' +
      'Your previous progress was backed up first as <code>' + esc(rep.backupKey) + '</code>.' +
      (lines.length ? '<ul>' + lines.join('') + '</ul>' : ' Nothing changed.') +
      '<br>The file contained ' + rep.received + ' cleared levels.', 'ok', true);
    el('pimp').className = 'pimp';
    el('ptxt').value = '';
    ui.afterChange();
  };

  ui.syncNow = function () {
    var s = DAQ.sync.status();
    if (!DAQ.sync.configured()) {
      msg('Sync is not configured on this site, so there is nothing to sync to. ' +
        'Use export/import, or follow docs/sync.md to deploy the backend.', 'info');
      return;
    }
    msg('Syncing&hellip;', 'info', true);
    DAQ.sync.sync().then(function (r) {
      msg('Sync complete. ' + (r && r.message ? esc(r.message) : ''), 'ok', true);
      ui.afterChange();
    }, function (err) {
      msg('Sync failed: ' + esc((err && err.message) || err), 'bad', true);
      ui.refresh();
    });
  };

  /* Let the page re-render after anything that changed stored progress. */
  ui.afterChange = function () {
    DAQ.refresh();
    if (typeof ui.onImported === 'function') ui.onImported();
  };

  /* ------------------------- level view injection ------------------------ */
  /* Adds "Reset this level" to the button row of the open level, plus a
   * badge that says whether the level is already cleared. Works on all five
   * games because they share the same level markup. */
  var injected = false;
  ui.levelOpened = function (qid, n) {
    ui.quest = qid; ui.level = n;
    if (!injected && !inject()) return;
    injected = true;
    updateLevel(qid, n);
  };

  function inject() {
    var row = doc.querySelector('#lv .row');
    if (!row) { if (global.console) global.console.warn('DAQ: level button row not found'); return false; }
    var btn = doc.createElement('button');
    btn.className = 'b warn';
    btn.type = 'button';
    btn.id = 'breset';
    btn.addEventListener('click', function () { ui.resetLevel(); });
    row.appendChild(btn);
    var badge = doc.createElement('div');
    badge.className = 'lvbadge';
    badge.id = 'lvbadge';
    row.parentNode.insertBefore(badge, row.nextSibling);
    return true;
  }

  function updateLevel(qid, n) {
    var btn = el('breset');
    if (btn) {
      var done = DAQ.isDone(qid, n);
      btn.textContent = done ? 'Reset this level' : 'Reset this level (nothing saved yet)';
      btn.disabled = !DAQ.answer(qid, n) && !DAQ.hints(qid, n) && !done;
    }
    var badge = el('lvbadge');
    if (badge) {
      if (DAQ.isDone(qid, n)) {
        badge.className = 'lvbadge on';
        badge.innerHTML = 'Already cleared &mdash; replay it as often as you like. ' +
          'Replaying does <b>not</b> add XP again; use <b>Reset this level</b> for a fresh, ' +
          'XP-earning attempt (that also clears this level&rsquo;s hints and saved answer).';
      } else {
        badge.className = 'lvbadge';
        badge.innerHTML = '';
      }
    }
  }

  /* ------------------------------- resets -------------------------------- */
  ui.resetLevel = function () {
    var qid = ui.quest, n = ui.level;
    if (!qid || !n) return;
    var meta = DAQ.meta(qid);
    var done = DAQ.isDone(qid, n);
    var ok = global.confirm(
      'Reset level ' + n + ' of ' + meta.title + '?\n\n' +
      'This clears ONLY this level: its completed tick, the hints you used, your saved answer' +
      (done ? ' and the ' + DAQ.quest(qid).levels[DAQ.levelId(n)].xp + ' XP it earned' : '') + '.\n' +
      'Every other level, and the other four games, are untouched.\n' +
      'You can replay it straight away and earn the XP again once.');
    if (!ok) return;
    var r = DAQ.resetLevel(qid, n);
    msg('Level ' + n + ' reset. Replay it any time &mdash; XP is awarded once per fresh solve.', 'ok');
    ui.afterChange();
    if (typeof ui.onLevelReset === 'function') ui.onLevelReset(n);
  };

  /* -------------------------------- mount -------------------------------- */
  ui.mount = function (qid) {
    ui.quest = qid;
    global.DAQ_UI = ui;
    if (!DAQ || !DAQ.ready()) {
      var host = el('qnav');
      if (host) host.innerHTML = '<span class="qp">Progress storage unavailable in this browser mode.</span>';
      return;
    }
    mountNav(qid);
    mountPanel(qid);
    wrapHud();
  };

  /* The games redraw their HUD after every state change (solve, wrong answer,
   * reset, import). Wrapping it keeps the level badge and the reset button in
   * step without touching five copies of the game logic. */
  function wrapHud() {
    var prev = global.hud;
    if (typeof prev !== 'function' || prev.__daqWrapped) return;
    var wrapped = function () {
      var out = prev.apply(null, arguments);
      if (ui.level) updateLevel(ui.quest, ui.level);
      return out;
    };
    wrapped.__daqWrapped = true;
    global.hud = wrapped;
  }

  global.DAQ_UI = ui;
  if (DAQ) DAQ.ui = ui;
  if (typeof module !== 'undefined' && module.exports) module.exports = ui;
})(typeof window !== 'undefined' ? window : globalThis);
