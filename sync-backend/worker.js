/* ============================================================================
 * Data Analyst Quest - reference sync backend (OPTIONAL, NOT DEPLOYED)
 * ----------------------------------------------------------------------------
 * A Cloudflare Worker. It is the only component that holds a GitHub credential,
 * and the only component that talks to api.github.com.
 *
 * This file is documentation as much as code: it shows exactly what the backend
 * has to do. Nothing here runs until YOU deploy it - see docs/sync.md.
 *
 *   npx wrangler secret put GITHUB_APP_CLIENT_ID
 *   npx wrangler secret put GITHUB_APP_CLIENT_SECRET
 *   npx wrangler secret put SESSION_SECRET
 *   npx wrangler deploy
 *
 * Routes
 *   GET  /login      -> redirect to GitHub OAuth (state + PKCE)
 *   GET  /callback   -> exchange the code, set an HttpOnly session cookie
 *   GET  /session    -> {connected, user}
 *   POST /logout     -> clear the cookie
 *   GET  /progress   -> the stored envelope (404 if none yet)
 *   PUT  /progress   -> merge the posted envelope, stamp it, write it back
 *
 * Storage: progress.json in a PRIVATE repo you own, via the Contents API.
 *
 * SECURITY MODEL
 *   - The browser gets a cookie. It never gets a token.
 *   - The cookie is HttpOnly + Secure + SameSite=Lax, signed with SESSION_SECRET.
 *   - CORS is locked to ALLOWED_ORIGIN. No wildcard, ever.
 *   - The GitHub token is held in worker memory per session and in the signed
 *     cookie payload; it is never returned to the client and never logged.
 * ========================================================================== */

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

/* ------------------------------- helpers --------------------------------- */
function json(data, status, env, extraHeaders) {
  const headers = Object.assign({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'null',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  }, extraHeaders || {});
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}

function redirect(url, env) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'null',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

function base64url(bytes) {
  let s = btoa(String.fromCharCode.apply(null, bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))));
}

/* Signed, tamper-evident cookie payload. Not encrypted - do not put anything in
 * here you would not want the holder to read. The GitHub token is, so this
 * worker keeps tokens in memory instead (see tokenCache below). */
async function signSession(payload, secret) {
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  return body + '.' + (await hmac(secret, body));
}
async function readSession(cookieHeader, secret, name) {
  name = name || 'daq_session';
  if (!cookieHeader) return null;
  const m = new RegExp(name + '=([^;]+)').exec(cookieHeader);
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  const expect = await hmac(secret, body);
  if (expect !== sig) return null;
  try { return JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))); }
  catch (e) { return null; }
}

/* Short-lived, in-memory GitHub tokens keyed by session id. A worker instance is
 * reused across requests, so this survives; if it is evicted the user simply
 * re-authorizes. Nothing is persisted to disk. */
const tokenCache = new Map();

async function githubToken(sessionId, env) {
  if (tokenCache.has(sessionId)) return tokenCache.get(sessionId);
  return null;
}

/* ------------------------------ GitHub calls ----------------------------- */
async function gh(env, path, init) {
  const token = await githubToken(init && init.__sessionId, env);
  const headers = Object.assign({
    Authorization: 'token ' + token,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'data-analyst-quest-sync',
    'X-GitHub-Api-Version': '2022-11-28'
  }, (init && init.headers) || {});
  delete init.__sessionId;
  return fetch(GITHUB_API + path, Object.assign({}, init, { headers }));
}

async function readProgressFile(env, sessionId) {
  const [owner, repo] = (env.PROGRESS_REPO || '').split('/');
  const file = env.PROGRESS_FILE || 'progress.json';
  const res = await gh(env, '/repos/' + owner + '/' + repo + '/contents/' + file +
    '?t=' + Date.now(), { __sessionId: sessionId });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub read failed: HTTP ' + res.status);
  const body = await res.json();
  const decoded = atob(body.content.replace(/\n/g, ''));
  return { envelope: JSON.parse(decoded), sha: body.sha };
}

async function writeProgressFile(env, sessionId, envelope, sha) {
  const [owner, repo] = (env.PROGRESS_REPO || '').split('/');
  const file = env.PROGRESS_FILE || 'progress.json';
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(envelope, null, 2))));
  const res = await gh(env, '/repos/' + owner + '/' + repo + '/contents/' + file, {
    __sessionId: sessionId,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'progress: sync from device ' + (envelope.device || 'unknown'),
      content: content,
      sha: sha || undefined,
      branch: env.PROGRESS_BRANCH || 'main'
    })
  });
  if (!res.ok) throw new Error('GitHub write failed: HTTP ' + res.status);
  return res.json();
}

/* ------------------------- the server-side merge -------------------------- */
/* Same rules as progress.js, applied again here so that three devices converge
 * no matter what order they sync in. A record the server has not seen change
 * keeps its old srvAt, so ordering is preserved across writes. */
function stamp(r) { return (r && (r.srvAt || r.at)) || 0; }

function pickLevel(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (stamp(a) > stamp(b)) return a;
  if (stamp(b) > stamp(a)) return b;
  if ((a.rev || 0) >= (b.rev || 0)) return a;
  return b;
}

function mergeQuests(a, b) {
  const out = { levels: {}, xpCarry: 0, streak: 0, questResetAt: 0, updatedAt: 0 };
  out.questResetAt = Math.max(a.questResetAt || 0, b.questResetAt || 0);
  const newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  out.xpCarry = newer.xpCarry || 0;
  out.streak = Math.max(a.streak || 0, b.streak || 0);
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  const ids = new Set([...Object.keys(a.levels || {}), ...Object.keys(b.levels || {})]);
  ids.forEach((lid) => {
    let win = pickLevel((a.levels || {})[lid], (b.levels || {})[lid]);
    if (!win) return;
    /* a quest reset newer than this level beats the level */
    if (out.questResetAt && stamp(win) < out.questResetAt && stamp(win) !== out.questResetAt) {
      win = { done: false, clear: true, hints: 0, ans: '', xp: 0, at: out.questResetAt, rev: (win.rev || 0) + 1 };
    }
    out.levels[lid] = win;
  });
  return out;
}

function mergeEnvelopes(stored, incoming) {
  const now = Date.now();
  const out = {
    schema: 'daq.progress', version: 2,
    device: incoming.device || stored.device || 'unknown',
    exportedAt: new Date(now).toISOString(),
    quests: {}
  };
  const ids = new Set([...Object.keys(stored.quests || {}), ...Object.keys(incoming.quests || {})]);
  ids.forEach((qid) => {
    const a = (stored.quests || {})[qid] || { levels: {} };
    const b = (incoming.quests || {})[qid] || { levels: {} };
    const merged = mergeQuests(a, b);
    /* stamp every record that changed, keep the old stamp on the rest */
    Object.keys(merged.levels).forEach((lid) => {
      const before = (a.levels || {})[lid];
      const after = merged.levels[lid];
      if (!before || JSON.stringify(before) !== JSON.stringify(after)) after.srvAt = now;
      else if (before.srvAt) after.srvAt = before.srvAt;
    });
    out.quests[qid] = merged;
  });
  return out;
}

/* -------------------------------- routes --------------------------------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'null',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    try {
      switch (url.pathname) {
        /* ---- sign in ---- */
        case '/login': {
          const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
          const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
          const challenge = base64url(new Uint8Array(await crypto.subtle.digest(
            'SHA-256', new TextEncoder().encode(verifier))));
          const target = GITHUB_AUTHORIZE + '?' + new URLSearchParams({
            client_id: env.GITHUB_APP_CLIENT_ID,
            redirect_uri: new URL('/callback', request.url).href,
            state: state,
            code_challenge: challenge,
            code_challenge_method: 'S256'
          }).toString();
          /* keep the state + PKCE verifier for the callback, in a signed cookie */
          const pending = await signSession({ state: state, verifier: verifier }, env.SESSION_SECRET);
          const res = redirect(target, env);
          res.headers.set('Set-Cookie',
            'daq_pending=' + pending + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600');
          return res;
        }

        case '/callback': {
          const pending = await readSession(request.headers.get('Cookie'), env.SESSION_SECRET, 'daq_pending');
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          if (!code || !state || !pending || pending.state !== state) {
            return json({ error: 'bad oauth state' }, 400, env);
          }
          const tokenRes = await fetch(GITHUB_TOKEN, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: env.GITHUB_APP_CLIENT_ID,
              client_secret: env.GITHUB_APP_CLIENT_SECRET,
              code: code,
              redirect_uri: new URL('/callback', request.url).href,
              code_verifier: pending.verifier
            })
          });
          const tokenBody = await tokenRes.json();
          if (!tokenBody.access_token) return json({ error: 'token exchange failed' }, 401, env);

          const userRes = await fetch(GITHUB_API + '/user', {
            headers: {
              Authorization: 'token ' + tokenBody.access_token,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'data-analyst-quest-sync'
            }
          });
          const user = await userRes.json();

          const sessionId = base64url(crypto.getRandomValues(new Uint8Array(16)));
          tokenCache.set(sessionId, tokenBody.access_token);
          const cookie = await signSession({ id: sessionId, user: user.login }, env.SESSION_SECRET);

          const back = (env.SITE_URL || '/') + (url.searchParams.get('to') || '');
          const res = redirect(back, env);
          res.headers.set('Set-Cookie',
            'daq_session=' + cookie + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000');
          res.headers.append('Set-Cookie', 'daq_pending=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
          return res;
        }

        case '/logout': {
          const res = redirect((env.SITE_URL || '/'), env);
          res.headers.set('Set-Cookie', 'daq_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
          return res;
        }

        /* ---- who am i ---- */
        case '/session': {
          const session = await readSession(request.headers.get('Cookie'), env.SESSION_SECRET);
          if (!session) return json({ connected: false, user: null }, 200, env);
          return json({ connected: true, user: session.user }, 200, env);
        }

        /* ---- read / write progress ---- */
        case '/progress': {
          const session = await readSession(request.headers.get('Cookie'), env.SESSION_SECRET);
          if (!session) return json({ error: 'not signed in' }, 401, env);
          if (!(await githubToken(session.id, env))) {
            return json({ error: 'session expired - sign in again' }, 401, env);
          }

          if (request.method === 'GET') {
            const stored = await readProgressFile(env, session.id);
            if (!stored) return json({ error: 'no progress stored yet' }, 404, env);
            return json(stored.envelope, 200, env);
          }

          if (request.method === 'PUT') {
            let incoming;
            try { incoming = await request.json(); }
            catch (e) { return json({ error: 'body must be JSON' }, 400, env); }
            if (!incoming || typeof incoming !== 'object' || !incoming.quests) {
              return json({ error: 'not a daq.progress envelope' }, 400, env);
            }
            const stored = await readProgressFile(env, session.id);
            const merged = mergeEnvelopes(stored ? stored.envelope : { quests: {} }, incoming);
            await writeProgressFile(env, session.id, merged, stored ? stored.sha : null);
            return json({ ok: true, updatedAt: merged.exportedAt }, 200, env);
          }

          return json({ error: 'method not allowed' }, 405, env);
        }

        default:
          return json({ error: 'not found' }, 404, env);
      }
    } catch (err) {
      /* never leak internals to the browser */
      return json({ error: 'sync backend error' }, 500, env);
    }
  }
};
