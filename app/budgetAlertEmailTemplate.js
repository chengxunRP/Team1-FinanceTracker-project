// HTML + plain-text bodies for budget alert emails.
// APP_BASE_URL from .env builds the "Open Spending & Budgets" button link in the email.
const path = require("path");
const fs = require("fs");
const budgetStore = require("./budgetStore");
const currencyService = require("./currencyService");

const SPENDWISE_LOGO_CID = "spendwise-logo";
const ICON_PATH = path.join(__dirname, "public", "favicon.svg");

const SEVERITY_STYLES = {
  warning: {
    label: "Budget warning",
    accent: "#fb8c00",
    background: "#fff8f0",
    border: "#ffd8a8",
  },
  reached: {
    label: "Budget reached",
    accent: "#7c4dff",
    background: "#f6f3ff",
    border: "#d9ccff",
  },
  exceeded: {
    label: "Budget exceeded",
    accent: "#d32f2f",
    background: "#fff5f5",
    border: "#ffc9c9",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAlertUsageState(alert) {
  if (alert.usageState === "warning" || alert.usageState === "reached" || alert.usageState === "exceeded") {
    return alert.usageState;
  }
  return alert.level === "danger" ? "exceeded" : "warning";
}

function getSeverityStyle(alert) {
  return SEVERITY_STYLES[getAlertUsageState(alert)] || SEVERITY_STYLES.warning;
}

function getAppBaseUrl() {
  // Public site URL for email links — set APP_BASE_URL in app/.env (e.g. http://localhost:3000).
  const raw =
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    "http://localhost:3000";
  return String(raw).trim().replace(/\/$/, "");
}

// Build the "Open Spending & Budgets" link for the email.
// Uses APP_BASE_URL from .env and adds ?month=YYYY-MM so the button opens
// the Budget page for the same month as the alert. This file does not send email.
function buildBudgetPageUrl(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const budgetUrl = new URL("/budget", `${getAppBaseUrl()}/`);
  budgetUrl.searchParams.set("month", month);
  return budgetUrl.toString();
}

function buildEmailSubject(newAlerts) {
  if (!newAlerts.length) return "spendWise Alert: Budget update";
  if (newAlerts.length === 1) {
    return `spendWise Alert: ${newAlerts[0].title}`;
  }
  return `spendWise Alert: ${newAlerts.length} new budget alerts`;
}

function getSpendWiseIconAttachment() {
  if (!fs.existsSync(ICON_PATH)) return null;
  return {
    filename: "spendwise-icon.svg",
    path: ICON_PATH,
    cid: SPENDWISE_LOGO_CID,
  };
}

function formatEmailMoney(value, currency) {
  const code = currency || currencyService.BASE_CURRENCY;
  try {
    return currencyService.formatFromBase(value, code);
  } catch (error) {
    return currencyService.formatFromBase(value, currencyService.BASE_CURRENCY);
  }
}

function formatAlertDetail(alert, currency) {
  return `${formatEmailMoney(alert.spent, currency)} spent of ${formatEmailMoney(alert.budget, currency)} (${alert.usedPct}% used)`;
}

function renderMainAlertTextBlock(alert, index, currency) {
  const prefix = index > 0 ? "\n" : "";
  return (
    `${prefix}${alert.title}\n` +
    `${alert.message}\n` +
    `${formatAlertDetail(alert, currency)}`
  );
}

function renderOtherAlertTextLine(alert) {
  const state = getAlertUsageState(alert);
  const stateLabel =
    state === "exceeded" ? "exceeded" : state === "reached" ? "reached" : "warning";
  return `- ${alert.name} ${stateLabel} (${alert.usedPct}% used)`;
}

function buildBudgetAlertPlainText(user, budgetMonth, newAlerts, otherActiveAlerts, currency) {
  const monthLabel = budgetStore.formatBudgetMonthLabel(budgetMonth);
  const lines = [
    `Hi ${user.name || "there"},`,
    "",
    newAlerts.length === 1
      ? "NEW BUDGET ALERT TRIGGERED"
      : `${newAlerts.length} NEW BUDGET ALERTS TRIGGERED`,
    `Month: ${monthLabel}`,
    "",
  ];

  newAlerts.forEach((alert, index) => {
    lines.push(renderMainAlertTextBlock(alert, index, currency).trim());
    lines.push("");
  });

  if (otherActiveAlerts.length) {
    lines.push("OTHER ACTIVE BUDGET ALERTS");
    otherActiveAlerts.forEach((alert) => {
      lines.push(renderOtherAlertTextLine(alert));
    });
    lines.push("");
  }

  const budgetUrl = buildBudgetPageUrl(budgetMonth);
  lines.push("Review your budgets:");
  lines.push(budgetUrl);
  lines.push("");
  lines.push("— spendWise");
  return lines.join("\n");
}

function renderAlertCardHtml(alert, compact, currency) {
  const style = getSeverityStyle(alert);
  const title = escapeHtml(alert.title);
  const message = escapeHtml(alert.message);
  const detail = escapeHtml(formatAlertDetail(alert, currency));
  const badge = escapeHtml(style.label);
  const padding = compact ? "14px 16px" : "18px 20px";
  const titleSize = compact ? "15px" : "18px";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 12px 0;border-collapse:separate;border-spacing:0;">
      <tr>
        <td style="background:${style.background};border:1px solid ${style.border};border-left:4px solid ${style.accent};border-radius:12px;padding:${padding};">
          <div style="font:600 11px/1.4 Arial,Helvetica,sans-serif;color:${style.accent};letter-spacing:0.04em;text-transform:uppercase;margin:0 0 8px 0;">
            ${badge}
          </div>
          <div style="font:700 ${titleSize}/1.35 Arial,Helvetica,sans-serif;color:#1f2937;margin:0 0 6px 0;">
            ${title}
          </div>
          <div style="font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#4b5563;margin:0 0 8px 0;">
            ${message}
          </div>
          <div style="font:600 13px/1.4 Arial,Helvetica,sans-serif;color:#111827;margin:0;">
            ${detail}
          </div>
        </td>
      </tr>
    </table>
  `;
}

function buildBudgetAlertHtml(user, budgetMonth, newAlerts, otherActiveAlerts, currency) {
  const monthLabel = escapeHtml(budgetStore.formatBudgetMonthLabel(budgetMonth));
  const userName = escapeHtml(user.name || "there");
  const budgetUrl = escapeHtml(buildBudgetPageUrl(budgetMonth));
  const mainHeading =
    newAlerts.length === 1
      ? "New budget alert triggered"
      : `${newAlerts.length} new budget alerts triggered`;

  const mainCards = newAlerts.map((alert) => renderAlertCardHtml(alert, false, currency)).join("");
  const otherSection = otherActiveAlerts.length
    ? `
      <div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:20px;">
        <div style="font:700 15px/1.4 Arial,Helvetica,sans-serif;color:#374151;margin:0 0 12px 0;">
          Other active budget alerts
        </div>
        ${otherActiveAlerts.map((alert) => renderAlertCardHtml(alert, true, currency)).join("")}
      </div>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(buildEmailSubject(newAlerts))}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fb;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#0d9488 100%);border-radius:16px 16px 0 0;padding:20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="44" valign="middle" style="padding-right:12px;">
                    <img src="cid:${SPENDWISE_LOGO_CID}" width="36" height="36" alt="spendWise" style="display:block;border:0;border-radius:8px;">
                  </td>
                  <td valign="middle">
                    <div style="font:700 22px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;">
                      spend<span style="color:#d1fae5;">Wise</span>
                    </div>
                    <div style="font:400 13px/1.4 Arial,Helvetica,sans-serif;color:#e0f2fe;margin-top:4px;">
                      Budget alert for ${monthLabel}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <div style="font:400 15px/1.5 Arial,Helvetica,sans-serif;color:#4b5563;margin:0 0 16px 0;">
                Hi ${userName},
              </div>
              <div style="font:700 18px/1.35 Arial,Helvetica,sans-serif;color:#111827;margin:0 0 16px 0;">
                ${escapeHtml(mainHeading)}
              </div>
              ${mainCards}
              ${otherSection}
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:0 24px 24px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;border-radius:0 0 16px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:8px auto 0 auto;">
                <tr>
                  <td align="center" bgcolor="#1976d2" style="border-radius:10px;">
                    <a href="${budgetUrl}" style="display:inline-block;padding:12px 22px;font:700 14px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Open Spending &amp; Budgets
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font:400 12px/1.5 Arial,Helvetica,sans-serif;color:#9ca3af;text-align:center;margin-top:18px;">
                You are receiving this because email budget notifications are enabled in your spendWise profile.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Build the complete budget alert email content (subject, plain text and HTML).
// Puts the newly triggered alert first and may list other active alerts below.
// Returns the object that sendBudgetAlertEmail() passes to the shared email service.
// No SMTP sending happens in this file.
async function buildBudgetAlertEmail(user, budgetMonth, newAlerts, otherActiveAlerts) {
  const iconAttachment = getSpendWiseIconAttachment();
  const attachments = iconAttachment ? [iconAttachment] : [];
  const actionUrl = buildBudgetPageUrl(budgetMonth);
  const currency =
    user && user.id
      ? await currencyService.getUserCurrency(user.id)
      : currencyService.BASE_CURRENCY;

  return {
    subject: buildEmailSubject(newAlerts),
    text: buildBudgetAlertPlainText(user, budgetMonth, newAlerts, otherActiveAlerts, currency),
    html: buildBudgetAlertHtml(user, budgetMonth, newAlerts, otherActiveAlerts, currency),
    attachments,
    actionUrl,
  };
}

module.exports = {
  buildBudgetAlertEmail,
  buildEmailSubject,
  buildBudgetPageUrl,
  getAlertUsageState,
  getSeverityStyle,
};
