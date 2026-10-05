# START HERE — Data Analyst in 7 Days
Fresher · basic SQL + Python · ~8 hrs/day

---

## The documents

| # | File | Day | Weight | roadmap.sh source |
|---|---|---|---|---|
| 1 | **[1-SQL.md](1-SQL.md)** | Days 1–2 | **40%** | roadmap.sh/sql |
| 2 | **[2-Excel.md](2-Excel.md)** | Day 3 | 15% | Data Analyst → *Analysis/Reporting with Excel* |
| 3 | **[3-Python.md](3-Python.md)** | Day 4 | 15% | roadmap.sh/python + Data Analyst → *Pandas* |
| 4 | **[4-Statistics.md](4-Statistics.md)** | Day 5 | 10% | Data Analyst → *Data Analysis Techniques* + *Statistical Analysis* |
| 5 | **[5-PowerBI.md](5-PowerBI.md)** | Day 6 | 10% | roadmap.sh/power-bi |

### How these are anchored to roadmap.sh
Every document walks the **real branches of the real roadmap**, in the roadmap's own
node names, and marks each node 🔨 / 📖 / ❌.

- **SQL** and **Power BI** have dedicated roadmaps — those two files follow them node by node.
- **Python** has a dedicated roadmap, but it's a *developer* roadmap with no pandas node.
  So `3-Python.md` is split: Part 1 walks roadmap.sh/python (you skip ~80%), Part 2 and 3
  expand the Data Analyst roadmap's *Pandas* and *Data Visualisation Libraries* nodes.
- **Excel** and **Statistics** have no standalone roadmaps. Those files follow the Data
  Analyst roadmap's branches, and anything I've added beyond it is marked **[+]**.

**Roadmaps deliberately ignored:** R Programming · AI & Data Scientist · BI Analyst ·
Backend · PostgreSQL · MongoDB · Prompt Engineering.

Alongside these source guides:
- `../index.html` — **the games.** 159 interactive levels across five quests. This is where
  you actually practise; the documents in this folder are the reference.
- `my-7-day-tracker.md` — the day-by-day schedule and progress log
- `sql-days-1-2.md` — 40 SQL practice prompts (printable)

### Read vs play
| Use | When |
|---|---|
| **Games** (`../index.html`) | Daily learning and drilling. Start here each morning. |
| **Documents** (`guides-markdown/`) | Reference — the full learn/skip verdict per topic. Revise from these on Day 7. |

The remaining 10% is **communication** — narrating your project and thinking out loud. Day 7.

---

## The two buckets — this is the key idea

Every topic in every document is tagged one of three ways:

| Tag | Meaning | How to study it |
|---|---|---|
| 🔨 | **Practice** — must write it from a blank screen | Solve problems. 80% of your time. |
| 📖 | **Explain** — must say it correctly out loud | Read once, revise Day 7. |
| ❌ | **Skip** — not for this interview | Don't open it. |

Most people fail by treating 📖 topics as 🔨 (wasting days on ACID and regression) or by treating 🔨 topics as 📖 (reading about joins instead of writing them).

---

## The daily loop

**Topic → 10 min input → 45 min doing → write one line in your own words → tick the node**

If you can't write that line without looking it up, don't tick it.

**When stuck:** 10 minutes → look at the solution → understand it → **close it and redo from blank.**
That last step is where the learning actually happens.

**Ratio:** never more than 2 hours of video in a day. Interviews test doing, not watching.

---

## Order matters

Do not go in parallel. **Finish SQL completely before touching anything else.**
A candidate who is strong at SQL and average elsewhere gets hired. The reverse does not.

---

## The thread running through the week

One dataset, carried forward — so your project builds itself as you learn:

- **Day 3** — clean it in Excel, pivot it
- **Day 4** — load it in pandas, explore it, correlation heatmap
- **Day 6** — build the Power BI dashboard, write the insights

Pick something with sales/orders/customers: Superstore, an e-commerce set, HR attrition.

---

## What you are deliberately not learning

Machine Learning · Deep Learning · Big Data (Hadoop, Spark) · Tableau · R ·
APIs & Web Scraping · Views, Indexes, Transactions, Stored Procedures ·
Query Optimization · Python OOP and web frameworks · Advanced DAX

**If asked:**
> *"I focused on the analytics core — SQL, Python and Power BI. Machine learning and big data tools are my next step."*

That is a completely acceptable answer from a fresher. **Never pretend to know ML.**

---

## Checkpoints — be honest with yourself

| End of | You can... |
|---|---|
| Day 2 | Write a window function from a blank screen |
| Day 3 | Build a pivot table live, explain VLOOKUP's limitation |
| Day 4 | Explain how and why you handled missing data |
| Day 5 | Explain variance vs std dev, and give a correlation≠causation example |
| Day 6 | Narrate your project in 2 minutes |
| Day 7 | Answer all 11 mock questions without hesitating |

**Start with `1-SQL.md`. Go now.**
