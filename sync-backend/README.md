# Sync backend (optional reference implementation)

**Nothing in this folder is deployed, and nothing here runs by default.** It exists so
that the GitHub sync design is concrete rather than hand-waved, and so you can deploy it
if you want cross-device sync.

The full walkthrough — creating the private progress repo, creating the GitHub App,
deploying this worker, and pointing the site at it — is in
[`../docs/sync.md`](../docs/sync.md). Read that first.

## Files

| File | What it is |
|---|---|
| `worker.js` | A Cloudflare Worker: OAuth handshake, session cookie, and read/write of `progress.json` in your private repo |
| `wrangler.toml` | Non-secret configuration (repo name, site origin, redirect URL) |

## What it does

* `GET /login` — redirects to GitHub with PKCE and a random state.
* `GET /callback` — exchanges the code for a token, fetches your login, sets an
  `HttpOnly; Secure; SameSite=Lax` cookie, sends you back to the site.
* `GET /session` — `{connected, user}`.
* `GET /progress` — returns the stored envelope.
* `PUT /progress` — merges the posted envelope into the stored one using the same
  tombstone-aware rules as `progress.js`, stamps changed records with the server time,
  and commits the result.
* `POST /logout` — clears the cookie.

## What it deliberately does not do

* It never sends a token to the browser. The cookie is opaque; the token lives in
  worker memory for the life of the session.
* It does not accept a token from the browser. There is no "paste your PAT" endpoint.
* It does not allow any origin. `ALLOWED_ORIGIN` is exact-match.
* It does not log tokens or progress.

## Deploying

```bash
cd sync-backend
npx wrangler login
npx wrangler secret put GITHUB_APP_CLIENT_ID
npx wrangler secret put GITHUB_APP_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
npx wrangler tail        # watch it while you test
```

## Not using Cloudflare?

The contract is five routes over HTTPS with a cookie session. Porting to Express,
Fastify, or a serverless function on any host is a afternoon's work; keep the same
rules — credential server-side only, exact-origin CORS, merge before write.
