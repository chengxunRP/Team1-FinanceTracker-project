# Budget Alerts Plan

This document describes how budget alerts will work in the Finance Tracker project.

## Purpose of Budget Alerts

Budget alerts help users stay aware of their spending before they run out of money. When spending gets close to or goes over a monthly budget, the app will notify the user so they can adjust their habits early.

Goals:

- Warn users when they are approaching their limit (80% of budget used).
- Alert users when they have spent their full budget or more (100% or over).
- Keep calculations simple and easy to understand.

## How Budget Percentage Is Calculated

Budget percentage shows how much of the monthly budget has been spent.

**Formula:**

```
budget percentage = (total spent / monthly budget) × 100
```

**Example:**

- Monthly budget: $500
- Total spent so far: $350

```
budget percentage = (350 / 500) × 100 = 70%
```

The result is rounded to a whole number for display (e.g. 70%, not 69.8%).

## 80% Warning Alert

When spending reaches **80% or more** of the budget (but is still below 100%), the app shows a **warning** alert.

| Condition | Alert type | Message idea |
|-----------|------------|--------------|
| 80% ≤ percentage < 100% | Warning | "You have used 80% of your budget. Consider slowing down spending." |

**Example:**

- Budget: $400
- Spent: $320 → 80% → **warning alert**

## 100% Overspending Alert

When spending reaches **100% or more** of the budget, the app shows an **overspending** alert.

| Condition | Alert type | Message idea |
|-----------|------------|--------------|
| percentage ≥ 100% | Overspending | "You have reached or exceeded your budget. Review your expenses." |

**Example:**

- Budget: $400
- Spent: $400 → 100% → **overspending alert**
- Spent: $450 → 112.5% → **overspending alert**

## Validation Rules

Before calculating alerts, all inputs must be valid:

| Field | Rule | Error if invalid |
|-------|------|------------------|
| Monthly budget | Required, must be a number greater than 0 | "Budget must be greater than zero" |
| Total spent | Required, must be a number ≥ 0 | "Spent amount cannot be negative" |
| Budget percentage | Computed only when budget and spent are valid | — |

Additional rules for later API endpoints:

- Reject missing or non-numeric values.
- Do not divide by zero (budget must be > 0).
- Return clear error messages for beginners testing the API.

## Next Steps (Future Work)

- Add API routes to submit budget and spending data.
- Return alert type (`none`, `warning`, `overspending`) in JSON responses.
- Connect the frontend to display alerts to the user.
