# Progress sync: how it works, and what you have to set up

**Status right now: sync is OFF.** Nothing in this repository talks to GitHub, and no
credential of any kind is stored in the site. Progress lives in your browser's
`localStorage`, and you can move it between devices by hand with the export/import
buttons (see "Manual transfer" below). That works today, with zero setup.

This document describes the design for optional GitHub-backed cross-device sync,
what it needs from you, and why it is built this way. **Do not assume sync works
until you have completed every step in "Setup" — the site tells you plainly when
it is not configured.**

---

## 1. The constraints, and what they rule out

This is a static site: HTML, CSS and JavaScript served by GitHub Pages. There is no
server, no build step, and no secrets that can be hidden from the visitor. Everything
in the page is public by definition — anyone can view source.

That rules out, permanently:

| Approach | Why not |
|---|---|
| Personal access token in the JavaScript | Every visitor could read it and push to your repos. A PAT is your whole account. |
| OAuth client secret in the JavaScript | Same problem: the secret is the "password" of your OAuth app. |
| GitHub App private key in the JavaScript | Same problem, and it is the strongest credential of the three. |
| Asking the user to paste a token into the site | It would sit in `localStorage` in plain text, readable by any script on the page, and would end up in screenshots and bug reports. |
| Storing progress in the public site repo | Your progress is personal data. It does not belong in a public repository, and GitHub Pages cannot write to a repo anyway. |
| Pure client-side OAuth (implicit flow / PKCE in the browser) | It needs a client secret or a public-client registration, and a public client cannot keep a refresh token secret. It also puts a live access token in the page. |

What is left is the standard, boring, correct answer: **a tiny backend that you own**
holds the credential, performs the OAuth handshake, and is the only thing that ever
talks to `api.github.com`. The browser talks only to your backend, over a session
cookie. That is what `sync-backend/worker.js` implements.

### Where your progress is stored

In a **private repository you own** — `<your-username>/data-analyst-quest-progress`,
file `progress.json`. Not in this public site repo, not in a gist. A private repo is
the only GitHub storage that is genuinely access-controlled and versioned, so you can
see every change your sync made and roll one back.

---

## 2. Architecture

```
 browser (this site)                     your backend                  GitHub
 ---------------------                   -------------                -------
 progress.js  (offline cache,
               merge rules)   <------>  /login /callback   ------->  OAuth authorize
                                       /session                      token exchange
 sync.js      (only knows               /progress GET/PUT  ------->  Contents API
               a URL)                                              (private repo)
```

* **`progress.js`** — owns the format, the merge rules, the resets, the backups. No
  network code. Works with sync.js absent.
* **`sync.js`** — knows exactly one thing: the URL of your backend. It calls
  `/session`, `/progress`. It has no credential and never talks to GitHub.
* **your backend** — holds `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET`,
  exchanges the OAuth code for a token, keeps the token in an encrypted session
  cookie (or KV), and reads/writes `progress.json` in your private repo.
* **GitHub** — sees a normal OAuth app installation. It never sees the browser.

The browser never receives an access token. It receives a cookie that only your
backend can read, and that cookie is `HttpOnly; Secure; SameSite=Lax`.

---

## 3. The progress format

Versioned, with stable ids. Current: `schema: "daq.progress"`, `version: 2`.

```json
{
  "schema": "daq.progress",
  "version": 2,
  "exportedAt": "2026-10-06T09:15:00.000Z",
  "device": "dev-a1b2c3-xyz",
  "quests": {
    "sql": {
      "levels": {
        "L1": { "done": true,  "clear": false, "hints": 0, "ans": "SELECT * FROM employees;", "xp": 30, "at": 1791242347750, "rev": 3 },
        "L7": { "done": false, "clear": true,  "hints": 0, "ans": "", "xp": 0, "at": 1791242400000, "rev": 2 }
      },
      "xpCarry": 0,
      "streak": 3,
      "questResetAt": 0,
      "updatedAt": 1791242400000
    }
  }
}
```

* **Quest ids** are stable: `sql`, `excel`, `python`, `stats`, `powerbi`. They are not
  the filenames and not the old localStorage keys, so renaming a file never orphans
  your progress.
* **Level ids** are `L1` … `L34`. They are positional, and they are stable because the
  level lists are static content. If levels are ever inserted, the format version goes
  up and the importer refuses what it does not understand rather than guessing.
* **Per-level records** carry everything needed to merge safely: `done`, `clear`
  (a tombstone), `hints`, `ans`, `xp`, `at` (local clock), `rev` (revision counter) and,
  once sync is involved, `srvAt` (when the server last saw a change to this record).
* **`xpCarry`** holds XP that cannot be attributed to a single level — XP migrated
  from the old format, where only a per-game total was stored. Nothing is thrown away
  during migration.
* **Unknown quest ids and out-of-range level ids are dropped** on read, so a corrupt or
  hostile file cannot inject state.

## 4. Merge rules (this is the part that matters)

Every sync is a **merge, never an overwrite**. The rule per level record:

1. Compare `srvAt` if the server stamped it, else `at`.
2. If those tie, compare `rev`.
3. If those tie too, prefer the record that says *cleared* over the one that says
   *not cleared* — a merge can lose a tie, but it can never invent progress or
   silently delete it.

On top of that, **tombstones**:

* Resetting one level writes `clear: true` with a fresh timestamp. A later merge
  therefore treats that level as cleared even if another device still believes it is
  solved. This is what stops a reset from being undone by a stale device.
* Resetting a whole quest writes `questResetAt`. Any level record older than that
  timestamp is treated as cleared. A level solved *after* the reset keeps its
  timestamp and survives. This is what stops "I cleared my progress on my laptop" from
  being quietly restored from my phone an hour later.
* `xpCarry` and `streak` follow the side with the newer `updatedAt`; the level set is
  the union. XP per level is stored once, at the moment of the first clean solve, so
  replaying a level can never double it.

The server applies the same rules again when it receives a push, so three devices
converge even if they sync in a strange order.

---

## 5. Setup

You need: a GitHub account, ~15 minutes, and somewhere to run a worker. The reference
implementation targets **Cloudflare Workers** (free tier is plenty). The same code runs
on Fly.io, Render, Railway or a VPS with small changes.

### 5.1 Create the private progress repo

```bash
# on github.com: New repository
#   name:    data-analyst-quest-progress
#   visibility: PRIVATE
#   initialise with a README: yes
```

Note the owner and name; you will need them as `PROGRESS_REPO`.

### 5.2 Create the GitHub App

GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**

* **GitHub App name**: `data-analyst-quest-sync` (must be globally unique)
* **Homepage URL**: your Pages URL, e.g. `https://<you>.github.io/<repo>/`
* **Callback URL**: `https://<your-worker>.workers.dev/callback`
* **Webhook**: uncheck *Active* (not used)
* **Permissions → Repository permissions → Contents**: **Read and write**
* **Create**, then on the app page:
  * copy **Client ID** → `GITHUB_APP_CLIENT_ID`
  * generate a **Client secret** → `GITHUB_APP_CLIENT_SECRET`
  * **Install App** → install on *Only select repositories* → your
    `data-analyst-quest-progress` repo. **Not** this public site repo.

A GitHub App (rather than an OAuth App) is used because its tokens are scoped to the
repos you installed it on and expire, so a leaked token is worth very little.

### 5.3 Deploy the backend

```bash
cd sync-backend
npm install -g wrangler        # or: npx wrangler
npx wrangler login
npx wrangler secret put GITHUB_APP_CLIENT_ID
npx wrangler secret put GITHUB_APP_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET      # any long random string
npx wrangler deploy
```

Then set the non-secret variables in `wrangler.toml`:

```toml
[vars]
PROGRESS_REPO   = "your-username/data-analyst-quest-progress"
PROGRESS_FILE   = "progress.json"
ALLOWED_ORIGIN  = "https://your-username.github.io"
SITE_URL        = "https://your-username.github.io/your-repo/"
```

`SESSION_SECRET` is only used to sign the session cookie. It is not a GitHub
credential, and it never leaves the worker.

### 5.4 Point the site at it

Create `sync-config.js` next to `index.html` (it is gitignored — never commit it):

```js
window.DAQ_SYNC_CONFIG = { endpoint: 'https://<your-worker>.workers.dev' };
```

`sync-config.example.js` is the template. If you would rather not add a file, put a
meta tag in each page instead:

```html
<meta name="daq-sync-endpoint" content="https://<your-worker>.workers.dev">
```

### 5.5 Verify

1. Open any quest page. The **Progress data** panel should read
   *GitHub sync: not connected*.
2. Click **Sync now** → you are redirected to GitHub → *Authorize* → back to the site.
3. It should now read *connected as \<your login\>*, and `progress.json` should appear
   in your private repo.
4. Open the site on your phone, sign in, press **Sync now**. Progress from the laptop
   appears; nothing already on the phone is lost.
5. Reset a level on the laptop, sync the phone. The level stays reset on the phone.

If step 3 does not happen, the backend is not configured — check the worker logs with
`npx wrangler tail`. The site will keep working offline regardless.

---

## 6. If you do not want a backend

You do not need one. Every page has a **Progress data** panel:

* **Download export (.json)** — a complete, versioned copy of all five games.
* **Copy JSON** — same thing, to the clipboard.
* **Save backup copy** — a timestamped snapshot kept in this browser (last 8).
* **Import / restore** — paste a file or pick one. **Merge** (the default) adds what
  the file has and keeps everything you have already cleared; **Replace** throws your
  current progress away and uses the file. Either way a backup of what you had is
  written first, and the panel tells you the backup's key.
* **Local backups** — pick any earlier snapshot and restore it.

Move devices by exporting on one and importing on the other. It is manual, it is
private, and it cannot break.

---

## 7. Security notes

* No credential is committed to this repository, and none belongs in the frontend.
  The test suite (`node tests/run-tests.mjs`) fails the build if a token-shaped
  string, private key or client secret appears in any shipped file.
* `sync-config.js` is in `.gitignore`. If you fork this repo and commit your own
  endpoint, that is a URL, not a secret — but keep it out anyway.
* The export file contains your answers and progress. Treat it like a password
  manager export: store it somewhere private, and do not paste it into a public issue.
* If you ever think a token leaked, revoke it on the GitHub App page. The site will
  simply stop syncing until you re-authorize; your local progress is untouched.
