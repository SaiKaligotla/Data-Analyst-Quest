# SQL — Learn / Skip
**Days 1–2 · 40% of your interview · the single most important document here**

> **Source:** node-by-node against **roadmap.sh/sql**, cross-checked against your own
> personalized PDF export. Branch names below match the roadmap's branches:
> Learn the Basics · Basic SQL Syntax · DDL · DML · Aggregate Queries · Data Constraints ·
> JOIN Queries · Subqueries · Advanced Functions · Views · Indexes · Transactions ·
> Data Integrity & Security · Stored Procedures · Performance Optimization · Advanced SQL

Practice: DataLemur, StrataScratch

🔨 = practice until you can write it from blank · 📖 = just be able to explain it · ❌ = skip

---

## 🔨 LEARN — Core querying

### Basics
- `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `LIMIT`, `DISTINCT`
- Operators: `=`, `<>`, `>`, `<`, `IN`, `BETWEEN`, `LIKE`, `AND/OR/NOT`
- `IS NULL` / `IS NOT NULL` — **never `= NULL`**
- Data types: INT, VARCHAR, DATE, DECIMAL, BOOLEAN

### Aggregation
- `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`
- `COUNT(*)` vs `COUNT(column)` — the second ignores NULLs
- **`GROUP BY`**
- **`HAVING`** — filters groups, WHERE filters rows

### JOINs ← highest-value branch
- `INNER JOIN` · `LEFT JOIN` · `RIGHT JOIN` · `FULL OUTER JOIN`
- **`SELF JOIN`** — "employees earning more than their manager", "employee + manager name"
- Anti-join pattern: `LEFT JOIN ... WHERE right.id IS NULL` (find non-matches)
- Joining 3+ tables

### Subqueries
- Scalar subquery (returns one value)
- Nested subquery in WHERE / IN
- **Correlated subquery** — runs once per outer row

### CTEs
- `WITH name AS (...)` — chaining multiple CTEs
- When to prefer a CTE over a subquery: readability, reuse

### Window Functions ← THE interview differentiator
- `ROW_NUMBER()` · `RANK()` · `DENSE_RANK()` — know exactly how ties differ
- `LAG()` / `LEAD()` — month-over-month growth, time between events
- `FIRST_VALUE()`
- `SUM() OVER (ORDER BY ...)` — running totals
- `PARTITION BY` — and how it differs from GROUP BY (doesn't collapse rows)

### Functions
- Conditional: `CASE WHEN`, `COALESCE`, `NULLIF`
- String: `CONCAT`, `LENGTH`, `SUBSTRING`, `UPPER`, `LOWER`, `TRIM`
- Numeric: `ROUND`, `FLOOR`, `CEILING`
- Date: `DATE`, `DATEPART`, `DATEADD`, extracting year/month

### Set operations
- `UNION` vs `UNION ALL` (the second keeps duplicates and is faster)

---

## 📖 LEARN — Explain only, ~1 hour total

- **DDL vs DML vs DCL**
  - DDL = structure: CREATE, ALTER, DROP, TRUNCATE
  - DML = data: SELECT, INSERT, UPDATE, DELETE
  - DCL = permissions: GRANT, REVOKE
- **DELETE vs TRUNCATE vs DROP** ← commonly asked

  | | Does | Rollback | Speed |
  |---|---|---|---|
  | DELETE | removes rows, takes WHERE | Yes | Slow |
  | TRUNCATE | wipes all rows, keeps table | No | Fast |
  | DROP | removes the table itself | No | Fast |

- Primary Key vs Foreign Key · Unique vs NOT NULL
- What a relational database is · SQL vs NoSQL in one line
- Normalization 1NF/2NF/3NF — one sentence each
- **Logical execution order:** FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
- Recognise the syntax of CREATE / ALTER / INSERT / UPDATE / DELETE — don't drill it
- What an index is, in one sentence ("speeds up lookups, costs write speed")

---

## ❌ SKIP ENTIRELY

- Writing DDL from scratch, table design
- Views: creating, modifying, dropping
- Index management, query optimization, execution plans
- Transactions: BEGIN, COMMIT, ROLLBACK, SAVEPOINT, **ACID, isolation levels**
- Stored procedures, triggers, user-defined functions
- GRANT/REVOKE, database security
- Recursive queries, Dynamic SQL, PIVOT/UNPIVOT
- `CROSS JOIN`
- Database-specific admin (PostgreSQL config, MongoDB, NoSQL)

**All of this is backend/DBA territory. You are a read-only analyst.**

---

## The 6 questions you will actually be asked

1. WHERE vs HAVING
2. INNER vs LEFT JOIN
3. Find the 2nd/Nth highest salary
4. RANK vs DENSE_RANK vs ROW_NUMBER
5. Find duplicate rows
6. DELETE vs TRUNCATE

## Gate — write these from a blank screen before moving on
- Month-over-month growth % using LAG
- Top 3 per group using DENSE_RANK
- Customers with zero orders using LEFT JOIN

→ Practise: `../practice/sql-quest.html` (34 levels) or `../sql-days-1-2.md` (40 written Q&A)
