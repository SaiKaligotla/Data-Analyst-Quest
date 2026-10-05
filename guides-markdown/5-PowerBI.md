# Power BI — Learn / Skip
**Day 6 · ~10% of your interview, but it carries your portfolio project**

> **Source:** node-by-node against **roadmap.sh/power-bi** (fetched from the live roadmap).
> Every branch below is a real branch on that map.

🔨 = practice · 📖 = explain only · ❌ = skip

---

## ⚠️ Read this first

The Power BI roadmap is designed to make you a **Power BI Expert** — it covers governance,
deployment, tenant admin and Fabric. You need enough to **build one good dashboard and
talk about it.** You'll skip about 70% of this map.

Also: pick Power BI **only**. The Data Analyst roadmap offers Tableau too — it struck
Tableau out, correctly. Learning two BI tools in a week means knowing neither.

---

## ✅ "Introduction" branch
📖 **Power BI Ecosystem** — Desktop (build) · Service (share) · Mobile (view)
📖 **Desktop vs Service vs Mobile** ← common question
🔨 **Installing Power BI** — Desktop is free, Windows only
❌ Licensing Tiers *(Pro vs Premium vs PPU — 30 seconds of reading, not a study topic)*

## ✅ "Connecting to Data" branch
🔨 **Files** — CSV and Excel, the only ones you need
📖 **Databases** — know you *can* connect to SQL Server/Postgres
❌ Clouds · ❌ APIs

## ⚠️ "Connection Modes" branch — mostly skip
📖 **Import Mode vs DirectQuery** — Import copies data into the model and is usually fast; it reflects the last refresh. DirectQuery queries the source when visuals are queried/refreshed and may be fresher, but latency, caching and feature support depend on the source and setup.
❌ Direct Lake · ❌ Dual Storage Mode · ❌ On-premises Data Gateway

## ✅ "Power Query" branch ← this is your cleaning layer, learn it properly
🔨 **Applied Steps** — the step list on the right, and that it's reproducible; refresh reruns the steps against the configured source (new files appear only if the connector includes them)
🔨 **Data Types & Casting**
🔨 **Removing Duplicates**
🔨 **Changing Text / Changing Numbers / Changing Dates**
🔨 **Splitting Columns**
🔨 **Custom Columns**
🔨 **Conditional Columns**
🔨 **Appending Tables** — stacking
📖 **Joins** (Merge Queries) — same idea as SQL joins, which you already know
📖 **Data Profiling** — column quality/distribution view. Nice to mention.
📖 **Pivot & Transpose**

❌ M Language Basics · ❌ Advanced Editor · ❌ Parameters & Functions
❌ Query Folding · ❌ Incremental Refresh
📖 **DAX vs M Language** — one line: *M transforms data on load, DAX calculates after load.* Good answer to have.

## ✅ "Data Modeling" branch — keep the basics
🔨 **Relationships and Cardinality** — drag key to key, one-to-many
🔨 **Calculated Tables & Columns** *(the column half)*
📖 **Star vs Snowflake Schema** — star: one fact table surrounded by dimension tables. One line.
📖 **Facts & Dimensions** — facts = numbers/events, dimensions = descriptive attributes
📖 **Cross Filter Direction** — single vs both. Know it exists.
📖 **Granularity** — what one row represents

❌ Hierarchies · ❌ Aggregations · ❌ Performance Analyzer

## ✅ "DAX" branch — fundamentals only
🔨 **DAX Syntax**
🔨 **Columns vs Measures** ← **the most common Power BI interview question**
  → *A calculated column is computed per row and stored in the model; a measure is computed on the fly based on current filter context.*
🔨 **Aggregation Functions** — `SUM`, `AVERAGE`, `COUNT`, `DISTINCTCOUNT`
🔨 **Logical Functions** — `IF`, `SWITCH`, `DIVIDE` (safe division)
🔨 **CALCULATE Function** — the one that modifies filter context. Learn the basic form.
📖 **Row vs Filter Context** — hard concept, but be able to say the sentence
📖 **Quick Measures** — the UI shortcut

❌ Variables in DAX · ❌ Field Parameters · ❌ Visual Calculations
❌ Context Transition · ❌ Iterator Functions (SUMX/FILTER/ALL/EARLIER)
❌ DAX Window Functions · ❌ Table Manipulation · ❌ Time Intelligence
❌ Calculation Groups · ❌ DAX Performance

## ✅ "Data Visualization" branch — keep the core visuals
🔨 **Gauges, Cards & KPIs** — your headline numbers
🔨 **Bar & Column Charts**
🔨 **Line & Area Charts**
🔨 **Matrix & Table Visuals**
🔨 **Slicers and Filters**
🔨 **Sorting Data**
🔨 **Formatting & Themes** — titles, labels, consistent colours
🔨 **Cross-filtering** — clicking one visual filters the others
📖 **Scatter & Bubble Charts** · 📖 **Pie & Donut** *(use sparingly, and know why)*
📖 **Maps** — only if your data has geography
📖 **Conditional Formatting**
📖 **Accessibility** — colour-blind safe palettes. Nice thing to mention.

❌ Combination Charts · ❌ Custom Visuals · ❌ Drill-through & Drill-down
❌ Bookmarks · ❌ Buttons & Navigation · ❌ Explore Feature · ❌ Custom Tooltips
❌ Decomposition Tree · ❌ Key Influencers · ❌ Small Multiples · ❌ Q&A Visual

## ⚠️ "Power BI Service" branch — one node only
📖 **Publishing Reports** — know you publish from Desktop to the Service to share
📖 **Dashboards vs Reports** — a report is multi-page and interactive; a dashboard is a single-page pinned summary. ← occasionally asked
❌ Workspaces · ❌ Sharing & Permissions · ❌ Apps · ❌ Subscriptions and Alerts
❌ Refresh & Change Detection

## ❌ "Security & Governance" branch — SKIP ENTIRELY
Row-Level Security · Object-Level Security · Sensitivity Labels · Data Loss Prevention ·
Access Control · Tenant Settings · Workspace Roles · Audit Logs · Certified Datasets

## ❌ "Automation & Integration" branch — SKIP ENTIRELY
Power Automate · REST API · Deployment Pipelines · Power BI Embedded ·
Python & R visuals · Microsoft Fabric · Paginated Reports (RDL)

📖 *One exception:* **Power BI with Excel** — worth 30 seconds, since you're learning both.

---

# 🔨 Day 6 deliverable — the thing that actually wins the interview

Use the dataset you cleaned on Day 3 and analysed on Day 4.

**A one-page sales performance dashboard:**
- 3 KPI cards — Total Revenue · Total Orders · AOV
- Revenue trend over time *(line)*
- Top 10 products *(bar)*
- Revenue by region *(bar or map)*
- Slicers — date range, category

Then write **3–5 insights, each with a recommendation or next step.** Not *"revenue went up"* but
*"revenue is up 12%, concentrated in the East. I would investigate which products or channels drove it and test whether the campaign contributed before recommending that it be replicated."*

GitHub repo + README: the question, the data, what you cleaned, the insights, a screenshot.

## Rehearse — 2 minutes, out loud
1. What question was I answering?
2. Where did the data come from?
3. What was dirty, and how did I fix it?
4. What did I find?
5. What would I recommend?

**This narration matters more than any single technical topic in the entire plan.**

---

## Likely interview questions
1. **Columns vs Measures**
2. What is Power Query used for?
3. How do you create a relationship between two tables?
4. Import mode vs DirectQuery
5. Star schema — what is it?
6. Walk me through a dashboard you built
7. How do you choose a chart type?
