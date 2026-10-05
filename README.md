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

**Progress is per-browser.** Local storage, per game. Use the same browser each day and don't clear
site data. Each game has a reset button.

---

## Deliberately not covered

Machine learning · deep learning · big data (Hadoop, Spark) · Tableau · R · APIs and web scraping ·
database administration (indexes, transactions, stored procedures, replication) · Python OOP and
web frameworks · advanced DAX.

If an interviewer asks:

> "I focused on the analytics core — SQL, Python and Power BI. Machine learning and big data tools
> are my next step."
