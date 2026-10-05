/* ============================================================================
 * Example sync configuration - COPY THIS FILE TO sync-config.js AND EDIT.
 *
 * sync-config.js is listed in .gitignore and must NEVER be committed: it is
 * the only place the site learns where your sync backend lives. It holds no
 * secrets - just a URL. All GitHub credentials stay on the backend.
 *
 * See docs/sync.md for the backend setup this URL points at.
 * ========================================================================== */

window.DAQ_SYNC_CONFIG = {
  // The https URL of the backend you deployed (Cloudflare Worker, Fly.io,
  // Render, a VPS, ...). No trailing slash. Must be https.
  endpoint: 'https://example.com',

  // Optional: label shown in the sync status line.
  label: 'my sync backend'
};
