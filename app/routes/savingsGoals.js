const express = require("express");
const router = express.Router();
const budgetStore = require("../budgetStore");
const savingsGoalStore = require("../savingsGoalStore");

function getMonthFromRequest(req) {
  return budgetStore.normalizeBudgetMonth(
    req.body.goalMonth ||
      req.body.goal_month ||
      req.query.month ||
      budgetStore.getCurrentBudgetMonth()
  );
}

function buildFormValues(values = {}, month) {
  return {
    goalName: values.goalName || values.goal_name || "",
    targetAmount: values.targetAmount || values.target_amount || "",
    currentAmount: values.currentAmount || values.current_amount || "",
    goalMonth: budgetStore.normalizeBudgetMonth(
      values.goalMonth || values.goal_month || month
    ),
  };
}

function buildSavingsPageRedirect(month, statusKey) {
  const query = new URLSearchParams({
    month: budgetStore.normalizeBudgetMonth(month),
  });

  if (statusKey) query.set(statusKey, "1");

  return `/savings-goals?${query.toString()}#savings-goal-view`;
}

async function renderSavingsPage(res, month, locals = {}) {
  const pageData = await savingsGoalStore.getSavingsPageData(month);
  const isEditingGoal =
    typeof locals.isEditingGoal === "boolean" ? locals.isEditingGoal : false;

  return res.render("savings-goals", {
    pageTitle: "Savings Goal",
    activePage: "savings-goals",
    ...pageData,
    errors: locals.errors || [],
    successMessage: locals.successMessage || "",
    isEditingGoal,
    formValues:
      locals.formValues ||
      (pageData.goal
        ? {
            goalName: pageData.goal.goalName,
            targetAmount: pageData.goal.targetAmount,
            currentAmount: pageData.goal.currentAmount,
            goalMonth: pageData.goal.goalMonth,
          }
        : {
            goalName: "",
            targetAmount: "",
            currentAmount: "",
            goalMonth: month,
          }),
  });
}

router.get("/", async (req, res) => {
  const month = budgetStore.normalizeBudgetMonth(
    req.query.month || budgetStore.getCurrentBudgetMonth()
  );

  try {
    const successMessage =
      req.query.saved === "1"
        ? "Savings goal saved successfully."
        : req.query.progress === "1"
          ? "Savings progress updated."
          : req.query.deleted === "1"
            ? "Savings goal deleted."
            : "";

    await renderSavingsPage(res, month, {
      successMessage,
      isEditingGoal: req.query.edit === "1",
    });
  } catch (error) {
    console.error("Database error loading savings goal page:", error);
    res.status(500).render("savings-goals", {
      pageTitle: "Savings Goal",
      activePage: "savings-goals",
      goal: null,
      budgetMonth: month,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
      errors: ["Unable to load savings goals right now. Please try again."],
      successMessage: "",
      isEditingGoal: false,
      formValues: buildFormValues({}, month),
    });
  }
});

router.post("/", async (req, res) => {
  const validation = savingsGoalStore.validateSavingsGoalInput(req.body);
  const month = validation.values.goalMonth;

  if (!validation.valid) {
    return renderSavingsPage(res, month, {
      errors: validation.errors,
      isEditingGoal: true,
      formValues: buildFormValues(req.body, month),
    });
  }

  try {
    await savingsGoalStore.saveSavingsGoal(validation.values);
    res.redirect(buildSavingsPageRedirect(month, "saved"));
  } catch (error) {
    console.error("Database error saving savings goal:", error);
    res.status(500);
    await renderSavingsPage(res, month, {
      errors: ["Unable to save savings goal right now. Please try again."],
      isEditingGoal: true,
      formValues: buildFormValues(req.body, month),
    });
  }
});

router.post("/:id/progress", async (req, res) => {
  const validation = savingsGoalStore.validateSavingsProgressInput(req.body);
  const month = getMonthFromRequest(req);

  if (!validation.valid) {
    return renderSavingsPage(res, month, {
      errors: validation.errors,
      formValues: buildFormValues(req.body, month),
    });
  }

  try {
    const goal = await savingsGoalStore.addSavingsGoalProgress(
      req.params.id,
      validation.amountToAdd
    );
    res.redirect(buildSavingsPageRedirect(goal.goalMonth, "progress"));
  } catch (error) {
    console.error("Database error updating savings goal progress:", error);
    if (error.code === "NOT_FOUND") {
      return res.redirect(`/savings-goals?month=${encodeURIComponent(month)}`);
    }
    if (error.code === "AMOUNT_TOO_LARGE") {
      return renderSavingsPage(res, month, {
        errors: ["Saved amount is too large."],
        formValues: buildFormValues(req.body, month),
      });
    }
    res.status(500);
    await renderSavingsPage(res, month, {
      errors: ["Unable to update savings progress. Please try again."],
      formValues: buildFormValues(req.body, month),
    });
  }
});

router.delete("/:id", async (req, res) => {
  const month = getMonthFromRequest(req);

  try {
    await savingsGoalStore.deleteSavingsGoal(req.params.id);
    res.redirect(`/savings-goals?month=${encodeURIComponent(month)}&deleted=1`);
  } catch (error) {
    console.error("Database error deleting savings goal:", error);
    res.status(500);
    await renderSavingsPage(res, month, {
      errors: ["Unable to delete savings goal. Please try again."],
    });
  }
});

module.exports = router;
