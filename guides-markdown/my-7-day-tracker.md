# My 7-Day Data Analyst Interview Plan
**Fresher · basic SQL + Python · ~8 hrs/day**
Companion file: `sql-days-1-2.md` (40 SQL practice questions)

---

## How to use this document

Two buckets. Everything in this plan is one or the other — never confuse them.

| Bucket | What it means | Time spent |
|---|---|---|
| 🔨 **PRACTICE** | You must be able to *write it from a blank screen* | 80% of your week |
| 📖 **EXPLAIN** | You only need to *say it out loud correctly* | 20% — read once, revise Day 7 |

**The daily loop, per topic:** 10 min input → 45 min doing → write one line in your own words → tick the node on roadmap.sh.
If you can't write that line without looking, don't tick it.

**When stuck:** 10 minutes → read the solution → understand → **close it and redo from blank.** That last step is the whole thing.

---

# DAY 1 — SQL foundations + JOINs

### 📖 Theory block (1 hr — do this first, get it out of the way)
- 4 Types of Analytics: Descriptive (what happened) · Diagnostic (why) · Predictive (what will) · Prescriptive (what to do)
- Relational databases · SQL vs NoSQL — one line each
- Primary Key vs Foreign Key
- **DDL vs DML vs DCL**
  - DDL = structure: CREATE, ALTER, DROP, TRUNCATE
  - DML = data: SELECT, INSERT, UPDATE, DELETE
  - DCL = permissions: GRANT, REVOKE
- **DELETE vs TRUNCATE vs DROP** ← commonly asked

  | | Does | Rollback behavior | Speed |
  |---|---|---|---|
  | DELETE | removes rows; can take a WHERE clause | Usually transactional, depending on the database | Varies with the amount of data and indexes |
  | TRUNCATE | removes all rows, keeps the table (where supported) | Database/transaction dependent | Often fast |
  | DROP | removes the table itself | Database/transaction dependent | Not comparable to row deletion |

  Transaction and rollback behavior differs by DBMS; do not assume `TRUNCATE` or `DROP` always auto-commit or can never be rolled back.

- Recognise the syntax shape only:
  ```sql
  CREATE TABLE t (id INT PRIMARY KEY, name VARCHAR(50));
  ALTER TABLE t ADD COLUMN dept VARCHAR(30);
  INSERT INTO t (id, name) VALUES (1, 'Asha');
  UPDATE t SET name = 'Ravi' WHERE id = 1;
  DELETE FROM t WHERE id = 1;
  ```

### 🔨 Practice block (5 hrs)
- SELECT, WHERE, ORDER BY, LIMIT, DISTINCT
- Aggregates: SUM, COUNT, AVG, MIN, MAX
- **GROUP BY + HAVING**
- CASE WHEN · COALESCE · IS NULL
- **JOINs: INNER, LEFT, RIGHT, FULL OUTER, Self Join**

→ **Do questions 1–15 in `sql-days-1-2.md`** on DataLemur.

### ✅ End of Day 1 — say these out loud
- WHERE vs HAVING (before grouping vs after)
- INNER vs LEFT JOIN
- Why `= NULL` fails
- COUNT(*) vs COUNT(column)
- DELETE vs TRUNCATE

---

# DAY 2 — SQL advanced *(highest-value day of the week)*

### 🔨 Morning (3 hrs)
- Nested subqueries · Correlated subqueries · scalar subquery
- **CTEs** (`WITH`)

### 🔨 Afternoon (4 hrs) — Window Functions
`ROW_NUMBER` · `RANK` · `DENSE_RANK` · `LEAD` · `LAG` · `FIRST_VALUE` · `PARTITION BY`

### 🔨 Evening (1 hr) — functions
CONCAT, LENGTH, SUBSTRING, UPPER/LOWER · ROUND, FLOOR, CEILING · CASE, NULLIF, COALESCE · DATE, DATEPART, DATEADD

→ **Do questions 16–40 in `sql-days-1-2.md`.**

### ✅ Gate — do not move to Day 3 until you can write these from blank
1. Month-over-month growth % using LAG
2. Top 3 per group using DENSE_RANK
3. Customers with no orders using LEFT JOIN

Also be able to say: RANK vs DENSE_RANK vs ROW_NUMBER · PARTITION BY vs GROUP BY · why use a CTE.

---

# DAY 3 — Excel

### 🔨 Practice (6 hrs)
- SUM, AVERAGE, COUNT, MIN/MAX
- IF
- **VLOOKUP / HLOOKUP** ← most-asked Excel question
- TRIM, and cleaning: remove duplicates, text-to-columns, find & replace
- **PIVOT TABLES** ← #1 Excel interview topic. Spend 2 hours here.
- Charting + conditional formatting

*Skipped (roadmap struck these, correctly): DATEDIF, CONCAT, UPPER/LOWER/PROPER, REPLACE/SUBSTITUTE*

### 🔨 Deliverable
Download a messy CSV from Kaggle. Clean it. Build a pivot table summary with a slicer.
**Keep this dataset — it becomes your Day 6 project.**

### ✅ Say out loud
- What a pivot table does, and when you'd use one
- VLOOKUP vs INDEX-MATCH (and VLOOKUP's limitation: can't look left)

---

# DAY 4 — Python / pandas

### 🔨 Practice (6 hrs)
- Load: `pd.read_csv`, `.head() .info() .describe() .shape`
- Filter: boolean masks, `loc` vs `iloc`
- **Cleaning:** `isnull().sum()`, `fillna`, `dropna`, `drop_duplicates`, `astype`, `rename`
- **Outliers (added back — roadmap wrongly cut this):** IQR method — `Q1 - 1.5*IQR`, `Q3 + 1.5*IQR`, boxplot
- **Data transformation (added back):** `apply`, `map`, creating new columns, binning
- Aggregate: `groupby().agg()`, `pivot_table`, `value_counts`, `sort_values`
- Combine: `merge` — map each type directly onto the SQL joins you learned Day 1
- Plot: seaborn — bar, line, hist, box, **heatmap**

### ✅ Say out loud
- loc vs iloc
- merge vs concat
- **How you handle missing data — and why** (drop vs fill, and what you'd fill with)
- How you detect outliers

---

# DAY 5 — Statistics

### 📖 + 🔨 (5 hrs) — StatQuest on YouTube is worth watching here
- **Central tendency:** Mean, Median, Mode — *and when median beats mean* (skewed data, outliers, income)
- **Dispersion (added back — roadmap wrongly cut these):** Range, **Variance**, **Standard Deviation**
  - Variance = average squared deviation. Std dev = its square root, back in original units.
- `df.describe()` — read every row of the output and know what it means
- Distributions: normal, skew (left/right), what a histogram tells you
- **Correlation Analysis** + **correlation ≠ causation** ← guaranteed talking point
- Correlation heatmap on your dataset

### 📖 Vocabulary only — 30 min, do not go deeper
- Hypothesis testing: null hypothesis, p-value, 0.05 threshold
- **Regression: 10 minutes.** "Fits a line to predict a continuous outcome; R² = variance explained." Stop there.
- A/B testing: what it is, at a concept level

### 📖 Business metrics (1 hr) — freshers get caught out here
DAU/MAU · retention · churn · conversion rate · funnel · AOV · CAC · LTV · cohort

### ✅ Say out loud
- Variance vs standard deviation
- When you'd use median over mean
- An example of correlation without causation

---

# DAY 6 — Power BI + THE PROJECT

### 🔨 Power BI (3 hrs)
- Power Query: import + clean
- Relationships between tables
- Basic DAX: `SUM`, `AVERAGE`, `CALCULATE`, `DIVIDE` · measure vs calculated column
- Build a **one-page dashboard**: KPI cards, bar, line, slicer

### 🔨 The project (5 hrs) — this matters more than any remaining topic
Use the dataset from Day 3. **Do a sales-performance analysis.**
*(Ignore the roadmap's suggested projects — "predicting sales trends" and "customer segmentation" are both ML.)*

Full loop:
1. SQL queries to pull and aggregate
2. pandas to clean and explore
3. Power BI dashboard
4. **Write 3–5 insights, each with a recommendation**
5. GitHub repo + README

### ✅ Rehearse
A 2-minute narration: what the data was → what you cleaned and why → what you found → what you'd recommend.

---

# DAY 7 — Revision + mock

### Morning (3 hrs)
25 mixed SQL problems, timed, no notes. Weakest topics first.

### Afternoon (3 hrs) — rehearse **out loud**, not in your head
1. Tell me about yourself *(60 sec)*
2. Walk me through your project *(2 min)*
3. How do you handle missing data and outliers?
4. WHERE vs HAVING · INNER vs LEFT JOIN · RANK vs DENSE_RANK
5. Variance vs standard deviation · mean vs median
6. DELETE vs TRUNCATE vs DROP
7. Explain a pivot table
8. Descriptive vs predictive analytics
9. Explain a technical finding to a non-technical stakeholder
10. "Sales dropped 20% last month — how would you investigate?"
11. What metric would you track for a food delivery app?

### Evening (2 hrs)
Your own one-line notes only. **No new topics.**

---

# Not learning — and the honest answer

Machine Learning · Deep Learning · Big Data (Hadoop/Spark) · Tableau · R ·
APIs & Web Scraping · Views · Indexes · Transactions/ACID · Stored Procedures ·
Query Optimization · Recursive & Dynamic SQL

> *"I focused on the analytics core — SQL, Python and Power BI. Machine learning and big data tools are my next step."*

Perfectly fine from a fresher. **Never pretend to know ML.**

---

# Progress log

| Day | Focus | Nodes done | Problems | Gate passed? |
|---|---|---|---|---|
| 1 | SQL basics + JOINs | | /15 | ☐ |
| 2 | CTEs + Window fns | | /25 | ☐ |
| 3 | Excel + pivot tables | | | ☐ |
| 4 | pandas + cleaning | | | ☐ |
| 5 | Statistics | | | ☐ |
| 6 | Power BI + project | | | ☐ |
| 7 | Mock interview | | /25 | ☐ |

### Non-negotiables by Day 7
1. Write a window function from a blank screen
2. Narrate your project in 2 minutes
3. Build a pivot table live
4. Explain variance vs standard deviation in plain English
5. Answer DELETE vs TRUNCATE without hesitating
