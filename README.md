# Data Analyst Quest

A 7-day interview prep sprint for an entry-level Data Analyst role — **five interactive games
(159 levels) plus written learn/skip guides**, filtered down from the
[roadmap.sh](https://roadmap.sh/data-analyst) Data Analyst, SQL, Python and Power BI roadmaps.

Everything is a static HTML file. No build step, no dependencies, no internet required.

---

## Live site

Once GitHub Pages is on (instructions below):

```
https://<your-username>.github.io/<your-repo>/
```

## Run it locally

Just open `index.html` in a browser. That's it.

Or serve it properly:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Run the tests

```bash
node tests/run-tests.mjs
```

No dependencies, no browser, no network. It drives all five games through their real
page scripts (every one of the 159 levels is answered with its own model answer and
then with a deliberately wrong one), checks the progress engine, the resets, the
import/export merge, the HTML validity of every page, and that no credential-shaped
string is present in any shipped file. `node tests/run-tests.mjs A` runs one section
(A engine, B pages, C answers, D html, E security).

---

## What's inside

### The games

| Game | Levels | Day | Interview weight |
|---|---|---|---|
| [SQL Quest](sql-quest.html) | 34 | 1–2 | 40% |
| [Excel Quest](excel-quest.html) | 30 | 3 | 15% |
| [Python Quest](python-quest.html) | 35 | 4 | 15% |
| [Statistics Quest](stats-quest.html) | 31 | 5 | 10% |
| [Power BI Quest](powerbi-quest.html) | 29 | 6 | 10% |

Each level teaches a concept, then tests it. Levels unlock in order. Three hints per level,
XP for clean solves, progress saved to browser local storage.

Three answer types:
- **Write code** — SQL queries, Excel formulas, pandas, DAX
- **Numeric** — work the answer out yourself
- **Multiple choice** — judgement and interview questions

### The guides

| Guide | Covers |
|---|---|
| [Start here](start-here.html) | How the whole thing fits together |
| [7-day plan](plan.html) | Day-by-day schedule and progress log |
| [SQL](guide-sql.html) | Full learn / explain / skip breakdown |
| [Excel](guide-excel.html) | |
| [Python](guide-python.html) | |
| [Statistics](guide-statistics.html) | |
| [Power BI](guide-powerbi.html) | |
| [SQL practice prompts](sql-written.html) | 40 written questions for self-testing |
| [PostgreSQL list verdict](guide-postgres.html) | Why a DBA-oriented syllabus is the wrong list |

Every topic is tagged one of three ways:

- 🔨 **Practice** — must be able to write it from a blank screen
- 📖 **Explain** — must be able to say it correctly out loud
- ❌ **Skip** — deliberately out of scope for this interview

Markdown sources for the guides live in [`guides-markdown/`](guides-markdown/).

---

## Publish to GitHub Pages

```bash
git init
git add .
git commit -m "Data Analyst Quest"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then in your repo: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.**

Give it a minute, then load `https://<your-username>.github.io/<your-repo>/`.

> `.nojekyll` is included so GitHub serves the files as-is rather than running them through Jekyll.

---

## Notes

**Answers are checked structurally.** There's no database or Python runtime in the browser, so
code answers are validated by pattern — the game confirms your answer contains the right clauses
and functions. It will catch a missing `GROUP BY` or the wrong join type, but not a typo in a
column name. Every code level shows the **real target output** to compare against.

**Those outputs are genuine.** SQL results were computed by running the model answers against a
real SQLite database; the pandas and Excel figures were computed with pandas. Nothing is invented.

**Progress is per-browser** — one versioned envelope in `localStorage`
(`daq_progress_v2`) holding all five games, mirrored back into the old per-game keys
(`sqlquest_v1`, `excelquest_v1`, `pyquest_v1`, `statsquest_v1`, `pbiquest_v1`) so an older
cached copy of the site still reads it correctly. Existing progress is migrated
automatically the first time you load a page; nothing is deleted and no XP is lost.

---

## Progress: backup, restore, replay and reset

Every game page (and the index) has a **Progress data** panel at the bottom of the map.

| Control | What it does |
|---|---|
| **Download export (.json)** | A complete versioned copy of all five games — levels, XP, hints, saved answers |
| **Copy JSON** | The same thing to the clipboard |
| **Save backup copy** | A timestamped snapshot in this browser (the last 8 are kept) |
| **Import / restore** | Paste or pick a file. **Merge** (default) adds what the file has and keeps everything already cleared here; **Replace** uses the file instead. Either way a backup of your current progress is written first and the panel tells you its key |
| **Local backups** | Pick any earlier snapshot and restore it |

**Importing never silently overwrites anything.** Merge is a union with
last-write-wins on conflicts, and every reset writes a *tombstone* so a level you
cleared on one device is not quietly restored from another. If you import something by
mistake, restore the backup it just made.

**Already have a progress file from another browser?** Look inside it first, without
touching your browser and without uploading it anywhere:

```bash
node tools/inspect-export.mjs my-progress.json                     # just report
node tools/inspect-export.mjs my-progress.json --normalize v2.json  # convert old format
```

It prints per-game level counts, XP, hints and reset levels, tells you if it is not a
format the site understands, and can rewrite an old-format export into the current one.
Then import that file with **Merge** (the default) and everything you have already
cleared here survives.

**Replay and reset.** Any cleared level can be replayed as often as you like — replays
never award XP again. Each level has its own **Reset this level** button in the level
view: it clears only that level's tick, hints, saved answer and the XP it earned, and
touches nothing else. **Reset all progress** on the map still resets the whole quest
(and only that quest). Both take a backup first.

## Quest navigation

Every game page has **Previous Quest** and **Next Quest** controls above the map, in
play order:

```
SQL → Excel → Python → Statistics → Power BI
```

Previous is disabled on SQL (the first quest) and Next is disabled on Power BI (the
last); the label always says where you are and what the button would do. Level
navigation, unlocking and per-game progress are unchanged.

## Cross-device sync (optional, and OFF by default)

**Sync is not configured, and this site does not pretend otherwise.** No credential is
stored in the frontend, nothing is uploaded anywhere, and the panel says so in plain
words. Moving progress between devices by hand with export/import works today.

GitHub Pages is static, so a GitHub OAuth secret cannot live in the page — it would be
readable by every visitor. The design therefore splits in two:

* `progress.js` / `sync.js` in this repo — the offline cache, the merge rules, and a
  sync client that knows only a URL. No tokens, no GitHub API calls.
* a small backend you deploy — holds the GitHub App credentials, does the OAuth
  handshake, and is the only thing that talks to `api.github.com`. Progress is stored
  as `progress.json` in a **private repo you own**, never in this public one.

`sync-backend/worker.js` is a working reference implementation (Cloudflare Worker) and
[`docs/sync.md`](docs/sync.md) is the step-by-step setup: create the private repo,
create the GitHub App, deploy the worker, add a gitignored `sync-config.js`. Until you
finish those steps the UI reports *"GitHub sync: not configured"* and everything else
keeps working.

---

## Deliberately not covered

Machine learning · deep learning · big data (Hadoop, Spark) · Tableau · R · APIs and web scraping ·
database administration (indexes, transactions, stored procedures, replication) · Python OOP and
web frameworks · advanced DAX.

If an interviewer asks:

> "I focused on the analytics core — SQL, Python and Power BI. Machine learning and big data tools
> are my next step."
