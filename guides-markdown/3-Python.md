# Python — Learn / Skip
**Day 4 · ~15% of your interview**

> **Source:** node-by-node against **roadmap.sh/python** (fetched from the live roadmap).
> pandas/seaborn come from the **Data Analyst roadmap** nodes *Data Manipulation Libraries → Pandas*
> and *Data Visualisation Libraries*, since the Python roadmap has no pandas node.

🔨 = practice · 📖 = explain only · ❌ = skip

---

## ⚠️ Read this first

The Python roadmap is a **Python developer** roadmap. Most of it — frameworks, testing,
packaging, concurrency, typing — exists to build software. You are not building software.

**You will skip roughly 80% of the Python roadmap.** That is correct, not lazy.
Your Python content mostly lives on the *Data Analyst* roadmap instead.

---

# PART 1 — roadmap.sh/python nodes

## ✅ "Learn the Basics" branch — KEEP most of it

🔨 **Basic Syntax**
🔨 **Variables and Data Types** — int, float, str, bool
🔨 **Comments**
🔨 **Operators** — arithmetic, comparison, logical
🔨 **Conditionals** — if / elif / else
🔨 **Loops** — for, while, `range`, `enumerate`
🔨 **Lists** — indexing, slicing, append, sort
🔨 **Dictionaries** — keys, values, lookup, `.items()`
🔨 **Functions, Builtin Functions** — `def`, arguments, `return`, `len`, `sum`, `max`, `min`, `sorted`
🔨 **Working with Strings** — f-strings, `.split()`, `.strip()`, `.lower()`, `.replace()`
🔨 **Modules → Builtin** — `import`

📖 **Tuples** — immutable list. Know the word.
📖 **Sets** — unique values, deduplication. Know the word.
📖 **Type Casting** — `int()`, `str()`, `float()`
📖 **Exceptions / Error Handling** — read a traceback; recognise `try/except`. Don't drill it.
📖 **Variable Scope** — local vs global, one line

❌ **File Handling** — `pd.read_csv` replaces this for you
❌ **Modules → Custom**

## ✅ "Paradigms" branch — keep one node only
🔨 **List Comprehensions** — `[x*2 for x in nums]`, used constantly in analysis

❌ Generator Expressions · ❌ Lambdas *(skip unless spare time — occasionally used in `.apply()`)*
❌ Decorators · ❌ Iterators · ❌ Context Manager
❌ **Regular Expressions** — useful but too expensive for 7 days

## ❌ "Data Structures & Algorithms" branch — SKIP ENTIRELY
Arrays and Linked Lists · Heaps, Stacks and Queues · HashMaps ·
Binary Search Tree · Recursion · Sorting Algorithms

*This branch is for software engineering interviews. Data analyst interviews test SQL instead.*

## ❌ "Object Oriented Programming" branch — SKIP ENTIRELY
Classes · Inheritance · Methods · Encapsulation

*The roadmap itself says you can get away without OOP. For an analyst, definitely.*

## ❌ "Package Managers" branch — SKIP
PyPI · Pip · Conda · Poetry · pdm
📖 *Exception:* know that `pip install pandas` installs a library. That's all.

## ❌ "Environments" branch — SKIP ENTIRELY
uv · pyproject.toml · Pipenv · virtualenv · pyenv · Configuration

## ❌ "Learn a Framework" branch — SKIP ENTIRELY
Django · Flask · FastAPI · Pyramid · Plotly Dash · Tornado · Sanic · aiohttp · gevent

## ❌ "Concurrency" branch — SKIP ENTIRELY
GIL · Threading · Multiprocessing · Async

## ❌ "Static Typing" branch — SKIP ENTIRELY
Pydantic · mypy · pyright · pyre · typing · Type Annotations

## ❌ "Code Formatting" branch — SKIP
ruff · black · yapf

## ❌ "Documentation" — SKIP
Sphinx

## ❌ "Testing" branch — SKIP ENTIRELY
doctest · pytest · unittest · tox

---

# PART 2 — Data Analyst roadmap: "Data Manipulation Libraries → Pandas"

**This is your actual Day 4.** The Python roadmap doesn't cover it; the Data Analyst roadmap
reduces it to one node. Here's that node expanded.

### 🔨 Load & inspect
`pd.read_csv()` · `read_excel()` · `.head()` `.info()` `.describe()` `.shape` `.dtypes` ·
`.value_counts()` · `.unique()` · `.nunique()`

### 🔨 Select & filter
`df['col']` · `df[['a','b']]` · boolean masks · `&` and `|` with parentheses ·
**`.loc` vs `.iloc`** ← guaranteed question · `.isin()` · `.between()` · `.str.contains()`

### 🔨 Clean *(Data Analyst roadmap: "Data Cleanup" branch)*
- **Handling Missing Data** — `.isnull().sum()`, `.fillna()`, `.dropna()` — **justify your choice**
- **Removing Duplicates** — `.drop_duplicates()`
- **Finding Outliers** *(roadmap struck this out — put it back)* — IQR: `Q1 − 1.5×IQR`, `Q3 + 1.5×IQR`, boxplot
- **Data Transformation** *(also struck out — put it back)* — `.apply()`, `.map()`, `pd.cut()`, new columns
- `.astype()` · `.rename()` · `.drop()` · `pd.to_datetime()` · `.str.strip()`

### 🔨 Aggregate
**`.groupby()` + `.agg()`** · `.pivot_table()` · `.sort_values()` · `.nlargest()`

### 🔨 Combine
**`pd.merge()`** with `how='inner'/'left'/'right'/'outer'` — map directly onto SQL joins ·
`pd.concat()` · **merge vs concat** ← common question

### 🔨 Dates
`.dt.year` · `.dt.month` · `.dt.day_name()`

### ❌ Skip in pandas
MultiIndex · `.pipe()` · `.melt()` / `.stack()` / `.unstack()` · performance tuning ·
`.eval()` / `.query()` · categorical dtype

---

# PART 3 — Data Analyst roadmap: "Data Visualisation Libraries"

### 🔨 Seaborn *(kept on your personalized roadmap)*
`barplot` · `lineplot` · `histplot` · `boxplot` · `scatterplot` ·
**`sns.heatmap(df.corr(), annot=True)`** *(roadmap struck Heatmap out — put it back)*

### 🔨 Matplotlib — minimum only
*Your personalized roadmap struck Matplotlib out, but it's the layer under seaborn.*
`plt.title()` · `xlabel` · `ylabel` · `figsize` · `plt.show()` — **always label your charts**

### ❌ Skip
ggplot2 · Plotly · Bokeh · Streamlit · Dash

---

# ❌ Libraries: skip entirely
scikit-learn and all ML · TensorFlow · PyTorch · BeautifulSoup / Scrapy / requests
*(Data Analyst roadmap struck out APIs and Web Scraping)* · statsmodels ·
**R, dplyr, ggplot2** *(the R Programming roadmap — ignore it completely)*

📖 **NumPy** — know it's the array library pandas is built on. One line.

---

## Likely interview questions
1. `.loc` vs `.iloc`
2. `merge` vs `concat`
3. **How do you handle missing values — and why that method?**
4. How do you detect and treat outliers?
5. Walk me through exploring a dataset you've never seen
6. Top 3 products per category in pandas?
7. List vs tuple vs set *(occasionally asked)*

## Day 4 deliverable
Load your Day 3 dataset → clean it → groupby summary → correlation heatmap → write 3 observations.
