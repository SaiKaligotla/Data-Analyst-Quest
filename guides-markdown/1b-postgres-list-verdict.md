# The 21-section PostgreSQL list — verdict

**Short answer: this is not your list. Do not follow it.**

It is a **PostgreSQL Database Developer → Senior Developer → Architect** syllabus.
Its own closing line says so, and it's written for someone migrating from Oracle.
That's a different job from Data Analyst — a backend/DBA job.

Rough split for your goal:
- **Relevant: sections 2, 3, 4** (+ a little of 1) — about **15%** of the list
- **Irrelevant: sections 5–21** — about **85%**

Following it would burn your 7 days on VACUUM, MVCC, replication and PL/pgSQL,
and you'd still be unable to answer "find the 2nd highest salary."

---

## Section-by-section

| # | Section | Verdict |
|---|---|---|
| 1 | PostgreSQL Fundamentals | ⚠️ **Partly.** Keep: data types, NULL handling, primary key, foreign key. 📖 only. Skip: architecture, roles/users, tablespaces, sequences, identity columns, SERIAL vs BIGSERIAL. |
| 2 | **SQL** | ✅ **YES — this is your Day 1–2.** See below. |
| 3 | **PostgreSQL Functions** | ✅ **Mostly yes.** See below. |
| 4 | **Window Functions** | ✅ **YES — the most important section in the whole list.** |
| 5 | Views | ❌ Skip. Materialized views, concurrent refresh = DBA. |
| 6 | Indexes | ❌ **Skip all of it.** B-tree/GiST/GIN/BRIN, partial, covering, index-only scans — pure DBA. 📖 one line: "an index speeds up lookups at the cost of write speed." |
| 7 | Query Performance & Optimization | ❌ Skip. EXPLAIN ANALYZE, VACUUM, REINDEX, join strategies — not asked of analysts. |
| 8 | Transactions & Concurrency | ❌ Skip. ACID, MVCC, isolation levels, locks, deadlocks — backend. |
| 9 | PL/pgSQL | ❌ **Skip entirely.** Procedural programming in the database. Not an analyst skill. |
| 10 | Triggers | ❌ Skip entirely. |
| 11 | Partitioning | ❌ Skip entirely. |
| 12 | JSON / JSONB | ❌ Skip. *(Useful later in some analyst jobs — not in 7 days.)* |
| 13 | Arrays | ❌ Skip. |
| 14 | Temporary & Special Tables | ❌ Skip — **except CTEs**, which are listed here and are essential. Covered in §2. |
| 15 | Security | ❌ Skip entirely. GRANT/REVOKE, RLS, pg_hba.conf. |
| 16 | Backup & Recovery | ❌ Skip entirely. pg_dump, WAL, PITR. |
| 17 | High Availability & Replication | ❌ Skip entirely. |
| 18 | PostgreSQL Architecture | ❌ Skip entirely. Shared buffers, autovacuum, checkpoints. |
| 19 | Administration | ❌ Skip. 🔨 *One exception:* install **pgAdmin** or **psql** so you have somewhere to run queries. |
| 20 | Advanced PostgreSQL | ❌ Skip entirely. FDW, PostGIS, JIT, connection pooling. |
| 21 | PostgreSQL vs Oracle | ❌ **Not applicable to you.** This section exists for someone with an Oracle background. |

---

## What to actually take from it

### From §2 — SQL 🔨
✅ SELECT · WHERE · GROUP BY · HAVING · ORDER BY · DISTINCT · LIMIT/OFFSET
✅ Joins: Inner, Left, Right, Full, **Self**
✅ Subqueries · Correlated subqueries · **CTEs**
✅ UNION / UNION ALL
📖 INSERT, UPDATE, DELETE — recognise the syntax, don't drill
📖 INTERSECT / EXCEPT — know they exist
❌ MERGE · ❌ Cross join · ❌ **Recursive CTEs**

### From §3 — Functions 🔨
✅ String · Date/time · Numeric · Aggregate functions
✅ Conditional: **CASE, COALESCE, NULLIF**
📖 Conversion functions (`CAST`)
❌ JSON/JSONB functions · ❌ Array functions

### From §4 — Window Functions 🔨 ← your Day 2
✅ ROW_NUMBER · RANK · DENSE_RANK · LAG · LEAD · FIRST_VALUE
✅ **PARTITION BY** · **Running totals** · **Moving averages**
📖 NTILE · LAST_VALUE
⚠️ Window frames (ROWS BETWEEN) — only after everything above is solid

**That's it. Three sections out of twenty-one.**

---

## Where this list is genuinely better than mine

Two additions worth taking:

1. **Moving averages** — `AVG() OVER (ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`.
   A realistic analyst task. Add it to Day 2.
2. **NTILE()** — quartiles/deciles, used for customer segmentation. Worth 10 minutes. 📖

Everything else in `1-SQL.md` already covers what's relevant here.

---

## One thing to check

This list says *"Important for You — since you're coming from Oracle"* and targets a
**PostgreSQL Developer/Architect** career path. That doesn't match a fresher preparing
for a Data Analyst interview.

Either it was written for somebody else, or the person who gave it to you was aiming at
a different role than the one you're interviewing for. **Worth confirming with them
before you spend a day on it.**

If you *are* actually interviewing for a PostgreSQL developer role, tell me — the whole
7-day plan changes and this list becomes largely correct.
