const db = require("./config/db");
const financeHelpers = require("./financeHelpers");
const { runWithUserId } = require("./requestUserContext");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    console.warn("nodemailer is not installed; budget email alerts are disabled.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || "",
        }
      : undefined,
  });

  return transporter;
}

function resolveAlertEmail(user) {
  const alertEmail = user.alert_email && String(user.alert_email).trim();
  if (alertEmail) return alertEmail;
  return user.email && String(user.email).trim();
}

async function getUserAlertProfile(userId) {
  const [rows] = await db.query(
    `SELECT id, name, email, alert_email, email_alerts_enabled,
            budget_alert_warning_month, budget_alert_danger_month
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function sendBudgetAlertEmail(user, subject, text) {
  if (!user || !Number(user.email_alerts_enabled)) {
    return false;
  }

  const to = resolveAlertEmail(user);
  if (!to) return false;

  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[budget-alert] SMTP not configured; would email ${to}: ${subject}`);
    return false;
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@spendwise.local",
    to,
    subject,
    text,
  });

  return true;
}

async function maybeSendBudgetAlertsForUser(userId) {
  const user = await getUserAlertProfile(userId);
  if (!user || !Number(user.email_alerts_enabled)) {
    return;
  }

  const summary = await runWithUserId(userId, () =>
    financeHelpers.getCategoryBudgetTotalsSummary()
  );

  if (!summary || summary.budget <= 0) {
    return;
  }

  const budgetMonth = summary.budgetMonth;
  const pct = summary.percentUsed;
  const spentLabel = summary.spent.toFixed(2);
  const budgetLabel = summary.budget.toFixed(2);

  if (pct >= 100 && user.budget_alert_danger_month !== budgetMonth) {
    const sent = await sendBudgetAlertEmail(
      user,
      "SpendWise budget alert: budget exceeded",
      `Hi ${user.name},\n\nYou have reached or exceeded your monthly budget (${spentLabel} of ${budgetLabel}).\n\n— SpendWise`
    );
    if (sent) {
      await db.query(
        "UPDATE users SET budget_alert_danger_month = ? WHERE id = ?",
        [budgetMonth, userId]
      );
    }
    return;
  }

  if (
    pct >= 80 &&
    pct < 100 &&
    user.budget_alert_warning_month !== budgetMonth
  ) {
    const sent = await sendBudgetAlertEmail(
      user,
      "SpendWise budget alert: 80% used",
      `Hi ${user.name},\n\nYou have used ${pct}% of your monthly budget (${spentLabel} of ${budgetLabel}).\n\n— SpendWise`
    );
    if (sent) {
      await db.query(
        "UPDATE users SET budget_alert_warning_month = ? WHERE id = ?",
        [budgetMonth, userId]
      );
    }
  }
}

function scheduleBudgetAlertCheck(userId) {
  if (!userId) return;

  setImmediate(() => {
    maybeSendBudgetAlertsForUser(userId).catch((error) => {
      console.error("Budget alert check failed:", error);
    });
  });
}

module.exports = {
  maybeSendBudgetAlertsForUser,
  scheduleBudgetAlertCheck,
  resolveAlertEmail,
};
