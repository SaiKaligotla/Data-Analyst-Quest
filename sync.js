/* ============================================================================
 * Data Analyst Quest - optional GitHub sync client
 * ----------------------------------------------------------------------------
 * THIS FILE IS NOT LOADED UNLESS YOU CONFIGURE IT. It ships with the site and
 * stays inert until an endpoint is provided (see docs/sync.md).
 *
 * Design rules this file obeys:
 *   1. No credential of any kind appears here - no personal access token, no
 *      OAuth client secret, no app private key. It only knows a URL.
 *   2. It never talks to github.com directly. Every authenticated call goes
 *      to the operator's backend, which holds the GitHub App credentials and
 *      keeps the user's OAuth session in an HttpOnly cookie.
 *   3. localStorage stays the offline cache. Sync pulls, merges (tombstone
 *      aware) and pushes - it does not "download over" local progress.
 *   4. If anything is unconfigured or fails, the UI says so plainly and the
 *      site keeps working offline. Nothing is silently skipped.
 *
 * Configuration (pick ONE):
 *   a) create sync-config.js next to this file:
 *        window.DAQ_SYNC_CONFIG = { endpoint: 'https://sync.example.com' };
 *      (sync-config.js is gitignored on purpose - never commit it)
 *   b) or add a meta tag to the page:
 *        <meta name="daq-sync-endpoint" content="https://sync.example.com">
 * ========================================================================== */
(function (global) {
  'use strict';

  var DAQ = global.DAQ;
  if (!DAQ) return;

  function config() {
    var c = global.DAQ_SYNC_CONFIG || {};
    var endpoint = (c.endpoint || '').replace(/\/+$/, '');
    if (!endpoint) {
      var m = global.document && global.document.querySelector('meta[name="daq-sync-endpoint"]');
      if (m) endpoint = (m.getAttribute('content') || '').replace(/\/+$/, '');
    }
    return { endpoint: endpoint };
  }

  var state = { connected: false, user: null, lastSync: 0, lastError: null, busy: false };

  function configured() { return !!config().endpoint; }

  function status() {
    if (!configured()) {
      return {
        state: 'off',
        label: 'GitHub sync: not configured',
        note: 'No sync endpoint is set, so this site never uploads anything. Export/import still ' +
          'works fully offline. To enable sync, deploy the backend in docs/sync.md and set its URL ' +
          'in sync-config.js (gitignored) or in a <meta name="daq-sync-endpoint"> tag.'
      };
    }
    if (state.busy) return { state: 'wait', label: 'GitHub sync: working…' };
    if (state.lastError) return { state: 'error', label: 'GitHub sync: ' + state.lastError };
    if (state.connected) {
      return {
        state: 'on',
        label: 'GitHub sync: connected' + (state.user ? ' as ' + state.user : ''),
        note: state.lastSync ? 'Last sync ' + new Date(state.lastSync).toLocaleString() : ''
      };
    }
    return { state: 'off', label: 'GitHub sync: not connected', note: 'Sign in with GitHub to sync.' };
  }

  function call(path, opts) {
    var base = config().endpoint;
    if (!base) return Promise.reject(new Error('sync endpoint not configured'));
    opts = opts || {};
    opts.credentials = 'include';               // the backend's session cookie
    opts.headers = opts.headers || {};
    if (opts.body && !opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    return global.fetch(base + path, opts).then(function (res) {
      if (res.status === 401) { state.connected = false; state.user = null; }
      if (!res.ok) {
        return res.json().then(function (j) {
          throw new Error((j && j.error) || ('HTTP ' + res.status));
        }, function () { throw new Error('HTTP ' + res.status); });
      }
      return res.json();
    });
  }

  function session() {
    if (!configured()) return Promise.resolve(status());
    return call('/session').then(function (s) {
      state.connected = !!s.connected;
      state.user = s.user || null;
      return status();
    }, function (e) {
      state.lastError = e.message;
      return status();
    });
  }

  function connect() {
    if (!configured()) {
      global.alert('Sync is not configured on this site. See docs/sync.md for the setup steps.');
      return Promise.resolve(status());
    }
    global.location.href = config().endpoint + '/login';
    return Promise.resolve({ state: 'wait', label: 'Redirecting to GitHub…' });
  }

  /* Pull, merge, push. The merge is tombstone aware, so a reset made on this
   * device beats a stale "level cleared" record from another device, and a
   * solve made after a remote reset beats that reset. */
  function sync() {
    if (!configured()) return Promise.reject(new Error('sync endpoint not configured'));
    state.busy = true; state.lastError = null; DAQ.refresh();
    return session()
      .then(function (s) {
        if (!state.connected) {
          var e = new Error('not signed in');
          e.state = s;
          throw e;
        }
        return call('/progress');
      })
      .then(function (remote) {
        var report = { added: 0, kept: 0, cleared: 0 };
        if (remote && remote.quests) {
          var r = DAQ.mergeStore(remote);
          DAQ.QUESTS.forEach(function (m) {
            var q = r.quests[m.id];
            if (q) { report.added += q.added; report.kept += q.kept; report.cleared += q.cleared; }
          });
        }
        return call('/progress', { method: 'PUT', body: JSON.stringify(DAQ.exportObject()) })
          .then(function () {
            state.busy = false; state.lastError = null; state.lastSync = Date.now();
            DAQ.refresh();
            return {
              message: report.added || report.cleared
                ? (report.added + ' levels restored, ' + report.cleared + ' resets applied.')
                : 'Already up to date.'
            };
          });
      })
      .catch(function (err) {
        state.busy = false;
        state.lastError = err.message;
        DAQ.refresh();
        throw err;
      });
  }

  function pull() { return session().then(function () { return call('/progress'); }); }
  function push() { return session().then(function () { return call('/progress', { method: 'PUT', body: JSON.stringify(DAQ.exportObject()) }); }); }

  DAQ.sync.register({
    configured: configured,
    status: status,
    connect: connect,
    session: session,
    pull: pull,
    push: push,
    sync: sync
  });

  session();
})(typeof window !== 'undefined' ? window : globalThis);
