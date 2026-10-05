# Excel — Learn / Skip
**Day 3 · ~15% of your interview · underestimated by most candidates**

> **Source:** the **Data Analyst roadmap** branch *"Analysis / Reporting with Excel"* —
> nodes: Learn Common Functions (SUM, MIN/MAX, AVERAGE, COUNT, IF, DATEDIF,
> VLOOKUP/HLOOKUP, CONCAT, TRIM, UPPER/LOWER/PROPER, REPLACE/SUBSTITUTE),
> Charting, Pivot Tables.
> There is no standalone Excel roadmap on roadmap.sh, so items marked **[+]** are
> additions of mine that the roadmap omits but interviews ask for.

Practice: grab a messy CSV from Kaggle and clean it

🔨 = practice · 📖 = explain only · ❌ = skip

---

## 🔨 LEARN

### Pivot Tables ← spend 2 of your 6 hours here
The #1 Excel interview topic. Non-negotiable.
- Build one from raw data
- Rows vs Columns vs Values vs Filters
- Change aggregation: Sum → Count → Average
- **Slicers**
- Group dates by month/quarter
- Show Values As → % of total
- Refresh after data changes

### Lookup functions
- **`VLOOKUP`** ← most-asked formula. Know the 4 arguments; use `FALSE` for exact matches, and use approximate matching only intentionally with a sorted lookup column.
- Its limitation: **can't look left**
- `HLOOKUP`
- **[+]** `INDEX` + `MATCH` — the fix for VLOOKUP's limitation
- **[+]** `XLOOKUP` if your version has it (mention it, it scores points)

### Core formulas
- `SUM`, `AVERAGE`, `COUNT`, `COUNTA`, `MIN`, `MAX`
- **[+]** `SUMIF` / `SUMIFS`, `COUNTIF` / `COUNTIFS`, `AVERAGEIF`
- `IF`, nested `IF`, `IFERROR`
- `TRIM` — removes leading/trailing ordinary spaces and collapses repeated internal ordinary spaces; it does not remove every whitespace character (for example, non-breaking spaces)

### Cleaning  **[+ mostly additions — the roadmap has no cleaning nodes for Excel]**
- Remove Duplicates
- Text to Columns
- Find & Replace
- Fixing data types (text-stored numbers, date formats)
- Filters and sorting
- Freeze Panes

### Charts
- Bar, Column, Line, Pie, Scatter, Combo
- Conditional formatting (highlight rules, data bars, colour scales)

---

## 📖 LEARN — explain only

- When you'd use Excel vs SQL vs Python
  → *Excel for quick ad-hoc work and sharing with business users; SQL for anything large or in a database; Python for repeatable, complex analysis.*
- What a pivot table does, in one sentence
- Absolute vs relative references (`$A$1` vs `A1`)

---

## ❌ SKIP

- `DATEDIF`, `CONCAT`, `UPPER`/`LOWER`/`PROPER`, `REPLACE`/`SUBSTITUTE`
  *(nice to know, never the deciding question)*
- Macros and VBA
- Power Pivot / Power Query in Excel *(you're learning Power Query inside Power BI instead)*
- Solver, Goal Seek, What-If, Scenario Manager
- Array formulas, dynamic arrays beyond XLOOKUP
- Advanced charting: sparklines, waterfall, custom combos

---

## Day 3 deliverable
Take a messy CSV → clean it (duplicates, spaces, data types) → build a pivot table summary with a slicer → add one chart.

**Save this dataset. It becomes your Day 6 project.**

## Likely interview questions
1. Explain VLOOKUP and its limitation
2. What's a pivot table and when would you use one?
3. How would you find duplicates in Excel?
4. VLOOKUP vs INDEX-MATCH
5. How do you clean a messy spreadsheet?
