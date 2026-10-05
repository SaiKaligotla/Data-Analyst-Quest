# Statistics — Learn / Skip
**Day 5 · ~10% of your interview · mostly 📖, very little 🔨**

> **Source:** the **Data Analyst roadmap** branches *"Data Analysis Techniques →
> Descriptive Analysis"* (Central Tendency: Mean/Median/Mode · Dispersion: Range/Variance/
> Standard Deviation · Distribution Shape: Skewness/Kurtosis · Generating Statistics ·
> Visualizing Distributions) and *"Statistical Analysis"* (Hypothesis Testing ·
> Correlation Analysis · Regression).
> There is no standalone statistics roadmap, so items marked **[+]** are additions of
> mine that the roadmap omits but interviews ask for.

Best resource: StatQuest on YouTube — genuinely worth watching here

🔨 = practice · 📖 = explain only · ❌ = skip

---

## The rule for this whole document
Statistics in a fresher DA interview is tested by **conversation, not calculation.**
Nobody will ask you to compute a p-value. They will ask you what it means.
So: understand the intuition, be able to say it in one clear sentence, move on.

---

## 🔨 LEARN — compute these on real data

### Central tendency
- **Mean, Median, Mode**
- **When median beats mean** ← the actual question. Skewed data and outliers: income, house prices, salaries.

### Dispersion
- Range
- **Variance** — population variance is the mean squared deviation; sample variance commonly divides by *n − 1* to estimate population variance
- **Standard deviation** — square root of variance, back in the original units
- **Variance vs standard deviation** ← very commonly asked. Answer: *"Same idea, but std dev is in the same units as the data, so it's interpretable."*

### Descriptive summary
- `df.describe()` — be able to read and explain **every row** of that output
- Percentiles and quartiles: Q1, median, Q3, IQR

### Distributions
- Normal distribution and the bell curve
- **Skew** — right/positive (tail to the right; mean is often greater than median) vs left/negative (tail to the left; mean is often lower). These are patterns, not guarantees.
- Reading a histogram
- Reading a **boxplot** — median and quartiles; whiskers usually reach the most extreme observations within 1.5×IQR fences, with points beyond shown separately

### Outliers  **[+ roadmap has this under Data Cleanup, and struck it out — put it back]**
- **IQR method:** below `Q1 − 1.5×IQR` or above `Q3 + 1.5×IQR`
- Z-score method — values more than 3 standard deviations away are a rough flag under suitable distribution assumptions, not an automatic error
- And the judgement question: *do you remove it, cap it, or keep it?* → depends whether it's an error or a real extreme value

### Correlation
- Correlation coefficient, −1 to +1
- **Correlation heatmap** — `sns.heatmap(df.select_dtypes(include='number').corr(), annot=True)`
- **Correlation ≠ causation** ← have a concrete example ready (ice cream sales and drownings — both driven by summer)

---

## 📖 LEARN — vocabulary only, 30–45 minutes

- **Population vs sample**
- **Hypothesis testing:** null hypothesis (no effect), alternative hypothesis, p-value, the 0.05 threshold
  → *"Assuming the null hypothesis and test assumptions, a p-value is the chance of seeing a result at least this extreme. If a pre-set α is 0.05 and p < 0.05, the result is statistically significant; this is not the probability that the null is true or that the result is merely ‘due to chance’."*
- **Confidence interval** — a range from a procedure that captures the true value in 95% of repeated samples (for a 95% method); not a 95% probability statement about this one fixed interval
- **A/B testing** — split users into two groups, change one thing, compare. Know what it *is*.
- **Regression — 10 minutes only.** *"Fits a line to predict a continuous outcome. R² tells you how much of the variance is explained."* **Stop there.**
- **[+] Population vs sample, sampling bias** — one example
- **Simpson's paradox** — a trend that reverses when you split by group. Bonus points, not essential.
- Central Limit Theorem — one line, if you have time

---

## 📖 [+] LEARN — Business metrics ← NOT on the roadmap at all, but freshers get caught out here
Worth an hour. Interviewers love these because they test analytical thinking, not memorisation.

- **DAU / MAU** and stickiness (DAU÷MAU)
- **Retention** vs **Churn**
- **Conversion rate** and the **funnel** (visit → signup → purchase)
- **AOV** — average order value
- **CAC** and **LTV** (LTV often means expected lifetime gross profit, though definitions vary); a 3:1 LTV:CAC ratio is a common rule of thumb, not a universal threshold
- **Cohort analysis** — grouping users by join month and tracking them over time
- Which metric matters for which product — be ready for *"what would you track for a food delivery app?"*

---

## 🔨 [+] The analytical-thinking drill — NOT on the roadmap
Practise answering this out loud:

> **"Sales dropped 20% last month. How would you investigate?"**

A good structure:
1. **Verify** — is the data correct? Tracking bug? Reporting change?
2. **Segment** — which region, product, channel, customer type? Is it everywhere or concentrated?
3. **Time** — sudden drop or gradual? Seasonal? Compare year-on-year.
4. **External** — competitor, pricing change, campaign ended, holiday?
5. **Internal** — site outage, stock-out, policy change?
6. **Conclude** — state the likely driver, quantify it, recommend an action.

This structure works for almost any "why did metric X change" question. Memorise the shape of it.

---

## ❌ SKIP

- All machine learning: supervised, unsupervised, reinforcement
- Algorithms: decision trees, Naive Bayes, KNN, K-means, logistic regression, random forest
- Model evaluation: precision, recall, F1, ROC/AUC, confusion matrix, cross-validation
- Deep learning, neural networks, CNN, RNN
- Doing regression properly — coefficients, residuals, assumptions, multicollinearity
- Probability theory, Bayes' theorem, distributions beyond normal
- t-tests, chi-square, ANOVA — the mechanics
- Time-series forecasting, ARIMA
- Kurtosis *(know the word exists; that's all)*
- Experiment design, statistical power, sample size calculations

---

## Likely interview questions
1. Variance vs standard deviation
2. When would you use median instead of mean?
3. Give me an example of correlation without causation
4. How do you detect outliers — and do you always remove them?
5. What's a p-value? *(one sentence)*
6. Sales dropped 20% — how would you investigate?
7. What metrics would you track for [some app]?
