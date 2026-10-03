# SQL — Days 1 & 2 (audited against my personalized SQL roadmap)

## Audit: the personalization is excellent

**Correctly struck out (~60% of the roadmap):**
DDL (Create/Alter/Drop/Truncate Table) · INSERT / UPDATE / DELETE · Views ·
Indexes & Managing Indexes · Query Optimization · Transactions (BEGIN, COMMIT,
ROLLBACK, SAVEPOINT, ACID, Isolation Levels) · Data Integrity & Security ·
GRANT/Revoke · Stored Procedures · Performance Optimization · Recursive Queries ·
Dynamic SQL · Pivot/Unpivot · Cross Join · ABS/MOD · REPLACE · TIME/TIMESTAMP ·
Unique/NOT NULL/CHECK · MongoDB / PostgreSQL admin

**Correctly kept:** everything an analyst actually queries with. Including Self Join
and FULL OUTER JOIN — I expected it to drop Self Join, it didn't. Good.

### ⚠️ The one bug
**HAVING appears twice.** It's struck out in the DML branch but kept under Aggregate
Queries. Ignore the strike — HAVING is essential. It's covered.

### Minor
Subquery "Different Types" (Scalar, Column, Row, Table) all struck out. Fine —
but know what a **scalar subquery** is: a subquery returning one single value.
2 minutes.

---

# DAY 1

## Morning — foundations (2 hrs)
- What are Relational Databases · SQL vs NoSQL — 15 min, one-liners
- SQL Keywords, Data Types, Operators
- SELECT, FROM, WHERE, ORDER BY, LIMIT
- **GROUP BY + HAVING**
- Aggregates: SUM, COUNT, AVG, MIN, MAX
- Data Constraints: Primary Key, Foreign Key — definitions only

## Afternoon — JOINs (3 hrs) ← the highest-value branch
INNER · LEFT · RIGHT · FULL OUTER · **Self Join**

## Day 1 practice questions

1. Select all employees in the Sales department, sorted by salary descending.
2. Count how many employees are in each department.
3. Show departments with more than 5 employees. *(GROUP BY + HAVING)*
4. Find the average salary per department, rounded to 2 decimals.
5. Total revenue per product category.
6. Count orders per customer, showing only customers with 3+ orders.
7. List all customers **and** their orders, including customers who never ordered. *(LEFT JOIN)*
8. List only customers who have placed at least one order. *(INNER JOIN)*
9. Find customers who have **never** placed an order. *(LEFT JOIN + WHERE o.id IS NULL)*
10. Join orders to products to show order id, product name, quantity, line total.
11. Find employees who earn more than their manager. *(**Self Join** — classic)*
12. List each employee alongside their manager's name. *(Self Join)*
13. Total sales per region per month, sorted highest first.
14. Use CASE WHEN to bucket salaries into Low / Medium / High and count each bucket.
15. Replace NULL commission with 0 using COALESCE, then compute total compensation.

### Concepts you must be able to say out loud after Day 1
- WHERE vs HAVING → WHERE filters rows *before* grouping, HAVING filters groups *after*
- INNER vs LEFT JOIN
- Why `WHERE col = NULL` never works → use `IS NULL`
- What COUNT(*) vs COUNT(column) do differently → COUNT(column) ignores NULLs
- Logical execution order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY

---

# DAY 2

## Morning — Subqueries & CTEs (2 hrs)
- Nested subqueries · Correlated subqueries · scalar subquery
- **Common Table Expressions** (`WITH`)

## Afternoon — Window Functions (3 hrs) ← THE interview topic
`ROW_NUMBER` · `RANK` · `DENSE_RANK` · `LEAD` · `LAG` · `FIRST_VALUE` · `PARTITION BY`

## Evening — Functions (1 hr)
String: CONCAT, LENGTH, SUBSTRING, UPPER, LOWER
Numeric: ROUND, FLOOR, CEILING
Conditional: CASE, NULLIF, COALESCE
Date: DATE, DATEPART, DATEADD

## Day 2 practice questions

16. Find employees earning above the company average. *(scalar subquery)*
17. Find the department with the highest total payroll.
18. For each department, find employees earning above **their own department's** average. *(correlated subquery)*
19. Rewrite question 18 using a CTE. Compare readability.
20. Use a CTE to find the top 3 customers by revenue, then join back for their details.
21. **Find the 2nd highest salary.** Three ways: subquery, DENSE_RANK, OFFSET.
22. **Find the Nth highest salary per department.** *(DENSE_RANK + PARTITION BY)*
23. Rank employees by salary within each department. *(RANK vs DENSE_RANK vs ROW_NUMBER — know the difference)*
24. Top 3 selling products in each category. *(top-N per group)*
25. Running total of daily sales. *(SUM OVER ORDER BY)*
26. **Month-over-month revenue growth %.** *(LAG)*
27. Days between each customer's consecutive orders. *(LAG on order date)*
28. For each employee, show the highest salary in their department. *(MAX OVER PARTITION BY)*
29. Flag each customer's first-ever order. *(ROW_NUMBER = 1)*
30. Compare each month's revenue to the next month. *(LEAD)*
31. **Find duplicate rows in a table.** *(GROUP BY HAVING COUNT(*) > 1)*
32. Delete-proof version: identify duplicates keeping the earliest. *(ROW_NUMBER)*
33. Find dates with no sales — gaps in a date sequence.
34. Percentage each product contributes to total revenue. *(SUM OVER ())*
35. Cumulative percentage of revenue by customer, ranked. *(running total + window)*
36. Extract year and month from order_date and aggregate by it. *(DATEPART)*
37. Build full_name from first and last name, properly capitalised. *(CONCAT + UPPER/LOWER/SUBSTRING)*
38. Use NULLIF to avoid divide-by-zero in a conversion-rate calculation.
39. Customer retention: customers who ordered in both Jan and Feb.
40. A simple funnel: count users at each stage, with conversion % between stages.

### Concepts you must be able to say out loud after Day 2
- RANK vs DENSE_RANK vs ROW_NUMBER — ties, and whether numbers get skipped
- What PARTITION BY does vs GROUP BY → GROUP BY collapses rows, PARTITION BY doesn't
- When to use a CTE over a subquery → readability, reuse, chaining
- What a correlated subquery is → runs once per outer row, slower

---

## Where to practice
**DataLemur** (free tier, real company questions) or **StrataScratch**.
LeetCode Database as backup.

## The rule
Stuck 10 minutes → read the solution → understand it → **close it and rewrite from blank.**
That last step is the entire point.

## Self-test before moving to Day 3
Write, from a blank screen, with no help:
- Month-over-month growth % using LAG
- Top 3 per group using DENSE_RANK
- Customers with no orders using LEFT JOIN

If you can do those three, your SQL is interview-ready.
