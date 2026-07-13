// Email Budget Notifications — sends SMTP alerts after real budget/expense changes, not on page refresh.
// SMTP_USER is the sender account; the recipient comes from the logged-in user's email (or alert_email).
// Credentials are read from .env via envConfig — never hardcoded in source.
require("./envConfig");

const db = require("./config/db");
const budgetStore = require("./budgetStore");
const { getBudgetNotifications } = require("./budgetNotificationService");
const { buildBudgetAlertEmail } = require("./budgetAlertEmailTemplate");
const { runWithUserId } = require("./requestUserContext");

let transporter = null;

function getSmtpConfigFlags() {
  return {
    hasHost: Boolean(process.env.SMTP_HOST),
    hasPort: Boolean(process.env.SMTP_PORT),
    hasUser: Boolean(process.env.SMTP_USER),
    hasPass: Boolean(process.env.SMTP_PASS),
    hasFrom: Boolean(process.env.SMTP_FROM || process.env.SMTP_USER),
  };
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    console.warn("[BudgetEmail] nodemailer is not installed; budget email alerts are disabled.");
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
  // users table: load email, optional alert_email, and email_alerts_enabled for this user only.
  const [rows] = await db.query(
    `SELECT id, name, email, alert_email, email_alerts_enabled
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
}

/** Stable per-alert key: overall | category-{id} */
function buildAlertKey(alert) {
  if (alert.scope === "overall") return "overall";
  if (alert.categoryId != null && alert.categoryId !== "") {
    return `category-${alert.categoryId}`;
  }

  const alertId = String(alert.alertId || "");
  const match = alertId.match(/^category-budget-(\d+)-/);
  if (match) return `category-${match[1]}`;

  return alertId.slice(0, 64) || "unknown";
}

// Build a unique key so the same alert is not emailed twice in one month.
// Combines overall-or-category id with the severity (warning / danger).
// Used together with user_id and budget_month when reading budget_email_alert_logs.
function buildAlertDedupeKey(alert) {
  return `${buildAlertKey(alert)}:${alert.level}`;
}

// Read budget_email_alert_logs for this user and month.
// Returns the set of alert keys already emailed so they can be skipped.
async function getAlreadySentAlertKeys(userId, budgetMonth) {
  const [rows] = await db.query(
    `SELECT alert_key, severity
     FROM budget_email_alert_logs
     WHERE user_id = ? AND budget_month = ?`,
    [userId, budgetMonth]
  );

  return new Set(rows.map((row) => `${row.alert_key}:${row.severity}`));
}

function filterNewAlerts(alerts, sentKeys) {
  return alerts.filter((alert) => !sentKeys.has(buildAlertDedupeKey(alert)));
}

// Insert successfully sent alerts into budget_email_alert_logs.
// Called only after Nodemailer send succeeds, so a failed send can be retried
// next time. Prevents the same warning or exceeded email from being repeated.
async function recordSentAlerts(userId, budgetMonth, alerts) {
  if (!alerts.length) return;

  for (const alert of alerts) {
    await db.query(
      `INSERT INTO budget_email_alert_logs
        (user_id, budget_month, alert_key, severity, alert_name, sent_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE sent_at = sent_at`,
      [userId, budgetMonth, buildAlertKey(alert), alert.level, alert.name]
    );
  }
}

// Send one budget alert email with Nodemailer.
// Checks email_alerts_enabled on the users row, chooses alert_email or normal email
// as the recipient, then sends the subject/text/html built by the template file.
async function sendBudgetAlertEmail(user, emailContent) {
  if (!user || !Number(user.email_alerts_enabled)) {
    return { sent: false, skipReason: "email_alerts_enabled off" };
  }

  const to = resolveAlertEmail(user);
  if (!to) {
    return { sent: false, skipReason: "user email missing" };
  }

  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, skipReason: "SMTP missing" };
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@spendwise.local",
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      attachments: emailContent.attachments || [],
    });
    return { sent: true, recipient: to, subject: emailContent.subject };
  } catch (error) {
    console.error("[BudgetEmail] sendMail failed:", error.message || error);
    return { sent: false, skipReason: "sendMail failed" };
  }
}

// Main email-alert flow after a budget or expense change.
// Loads the user from users, checks email_alerts_enabled, chooses the recipient,
// calculates current active alerts, reads budget_email_alert_logs to remove ones
// already sent, builds and sends the email, then records successes in the log.
async function maybeSendBudgetAlertsForUser(userId, budgetMonthInput, meta = {}) {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    budgetMonthInput || budgetStore.getCurrentBudgetMonth()
  );

  console.log("[BudgetEmail] maybeSendBudgetAlertsForUser", {
    route: meta.route || null,
    userId: userId || null,
    affectedMonth: budgetMonth,
    affectedCategoryId: meta.affectedCategoryId || null,
    smtp: getSmtpConfigFlags(),
  });

  if (!userId) {
    console.log("[BudgetEmail] skip: no userId");
    return;
  }

  const user = await getUserAlertProfile(userId);
  if (!user) {
    console.log("[BudgetEmail] skip: user not found", { userId });
    return;
  }

  console.log("[BudgetEmail] user loaded", {
    userId: user.id,
    email: user.email || null,
    alert_email: user.alert_email || null,
    email_alerts_enabled: Number(user.email_alerts_enabled) || 0,
  });

  if (!Number(user.email_alerts_enabled)) {
    console.log("[BudgetEmail] skip: email_alerts_enabled off");
    return;
  }

  const recipient = resolveAlertEmail(user);
  if (!recipient) {
    console.log("[BudgetEmail] skip: user email missing");
    return;
  }

  let notifications;
  try {
    notifications = await runWithUserId(userId, () =>
      getBudgetNotifications(budgetMonth)
    );
  } catch (error) {
    console.error("[BudgetEmail] skip: alert calculation failed:", error.message || error);
    return;
  }

  const alerts = notifications && notifications.alerts ? notifications.alerts : [];
  console.log("[BudgetEmail] active alerts found", {
    count: alerts.length,
    names: alerts.map((a) => a.name),
    severity: alerts.map((a) => a.level),
    alertKeys: alerts.map((a) => buildAlertDedupeKey(a)),
  });

  if (!alerts.length) {
    console.log("[BudgetEmail] skip: no active alerts");
    return;
  }

  let sentKeys;
  try {
    sentKeys = await getAlreadySentAlertKeys(userId, budgetMonth);
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.error(
        "[BudgetEmail] skip: budget_email_alert_logs table missing. Run db/budget_email_alert_logs_update.sql"
      );
      return;
    }
    throw error;
  }

  const newAlerts = filterNewAlerts(alerts, sentKeys);
  const otherActiveAlerts = alerts.filter((alert) =>
    sentKeys.has(buildAlertDedupeKey(alert))
  );
  console.log("[BudgetEmail] new unsent alerts", {
    count: newAlerts.length,
    names: newAlerts.map((a) => a.name),
    severity: newAlerts.map((a) => a.level),
    alertKeys: newAlerts.map((a) => buildAlertDedupeKey(a)),
    alreadySentCount: otherActiveAlerts.length,
  });

  if (!newAlerts.length) {
    console.log("[BudgetEmail] skip: no new email alerts to send");
    return;
  }

  const emailContent = await buildBudgetAlertEmail(
    user,
    budgetMonth,
    newAlerts,
    otherActiveAlerts
  );
  console.log("[BudgetEmail] action URL:", emailContent.actionUrl);
  const result = await sendBudgetAlertEmail(user, emailContent);

  if (!result.sent) {
    console.log("[BudgetEmail] skip:", result.skipReason || "send failed");
    return;
  }

  try {
    await recordSentAlerts(userId, budgetMonth, newAlerts);
  } catch (error) {
    console.error("[BudgetEmail] email sent but failed to record alert logs:", error.message || error);
    return;
  }

  console.log("[BudgetEmail] email sent", {
    recipient: result.recipient,
    subject: result.subject,
    alertCount: newAlerts.length,
    alertKeys: newAlerts.map((a) => buildAlertDedupeKey(a)),
  });
}

// Start the email alert check after a budget or expense is saved.
// Runs maybeSendBudgetAlertsForUser in the background so the HTTP response is not delayed.
// Opening or refreshing a Budget page (GET) does not call this function.
function scheduleBudgetAlertCheck(userId, budgetMonth, meta = {}) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  console.log("[BudgetEmail] scheduleBudgetAlertCheck", {
    route: meta.route || null,
    userId: userId || null,
    affectedMonth: month,
    affectedCategoryId: meta.affectedCategoryId || null,
  });

  if (!userId) {
    console.log("[BudgetEmail] skip schedule: no userId");
    return;
  }

  setImmediate(() => {
    maybeSendBudgetAlertsForUser(userId, month, meta).catch((error) => {
      console.error("[BudgetEmail] Budget alert check failed:", error);
    });
  });
}

module.exports = {
  maybeSendBudgetAlertsForUser,
  scheduleBudgetAlertCheck,
  resolveAlertEmail,
  buildAlertKey,
  buildAlertDedupeKey,
};
