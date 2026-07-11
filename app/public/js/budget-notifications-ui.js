// Builds stable alert IDs for the banner UI (must match server-side IDs for dismiss to work).
(function () {
  "use strict";

  var VISIBLE_LIMIT = 2;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sortCategoryAlerts(alerts) {
    var levelOrder = { danger: 0, warning: 1 };
    return (alerts || []).slice().sort(function (a, b) {
      var byLevel = levelOrder[a.level] - levelOrder[b.level];
      if (byLevel !== 0) return byLevel;
      return (Number(b.usedPct) || 0) - (Number(a.usedPct) || 0);
    });
  }

  function normalizeToken(value) {
    return String(value == null ? "" : value).replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function buildAlertId(alert, userId, month) {
    if (!alert) return "";
    var uid = normalizeToken(userId || "guest");
    var m = normalizeToken(month || "unknown");
    if (alert.scope === "overall") {
      return (
        "user-" +
        uid +
        "-" +
        m +
        "-overall-" +
        normalizeToken(alert.level || "warning")
      );
    }
    return (
      "user-" +
      uid +
      "-" +
      m +
      "-category-" +
      normalizeToken(alert.categoryId || alert.name || "unknown") +
      "-" +
      normalizeToken(alert.level || "warning")
    );
  }

  function collectAlerts(notifications) {
    if (!notifications) {
      return { alerts: [], hasAlerts: false };
    }

    if (Array.isArray(notifications.alerts) && notifications.alerts.length) {
      var overall = null;
      var categories = [];
      notifications.alerts.forEach(function (alert) {
        if (alert.scope === "overall") overall = alert;
        else categories.push(alert);
      });
      var ordered = [];
      if (overall) ordered.push(overall);
      ordered = ordered.concat(sortCategoryAlerts(categories));
      return { alerts: ordered, hasAlerts: Boolean(notifications.hasAlerts || ordered.length) };
    }

    var overallAlert = notifications.overallAlert || null;
    var categoryAlerts = sortCategoryAlerts(
      [].concat(
        notifications.visibleCategoryAlerts || [],
        notifications.hiddenCategoryAlerts || [],
        notifications.categoryAlerts || []
      )
    );
    var orderedAlerts = [];
    if (overallAlert) orderedAlerts.push(overallAlert);
    orderedAlerts = orderedAlerts.concat(categoryAlerts);

    return {
      alerts: orderedAlerts,
      hasAlerts: Boolean(notifications.hasAlerts || orderedAlerts.length),
    };
  }

  function renderAlertBanner(alert) {
    var levelClass = alert.level === "danger" ? "danger" : "warning";
    var icon = alert.level === "danger" ? "!" : "%";
    return (
      '<div class="budget-notification-alert budget-alert-banner budget-alert-banner--' +
      levelClass +
      '" role="alert" data-alert-id="' +
      escapeHtml(alert.alertId || "") +
      '">' +
      '<span class="budget-alert-banner__icon" aria-hidden="true">' +
      icon +
      "</span>" +
      "<div><strong>" +
      escapeHtml(alert.title) +
      "</strong><p>" +
      escapeHtml(alert.message) +
      " " +
      escapeHtml(alert.detail) +
      '</p></div><button type="button" class="budget-alert-banner__dismiss js-dismiss-budget-alert" aria-label="Dismiss alert">&times;</button></div>'
    );
  }

  function renderBudgetNotifications(container, notifications, options) {
    if (!container) return;

    options = options || {};
    var showEmpty = options.showEmpty !== false;
    var userId = options.userId || container.getAttribute("data-user-id") || "guest";
    var month = options.month || container.getAttribute("data-budget-month") || "unknown";
    var collected = collectAlerts(notifications);

    container.setAttribute("data-user-id", String(userId));
    container.setAttribute("data-budget-month", String(month));
    container.setAttribute("data-budget-alerts-ui", "1");
    container.setAttribute("data-alerts-expanded", "false");
    container.setAttribute(
      "data-has-alerts",
      collected.hasAlerts && collected.alerts.length ? "1" : "0"
    );

    if (!collected.hasAlerts || !collected.alerts.length) {
      container.innerHTML = showEmpty
        ? '<p class="budget-notifications__empty">No budget alerts right now.</p>'
        : "";
      return;
    }

    var alertsWithIds = collected.alerts.map(function (alert) {
      return Object.assign({}, alert, {
        alertId: buildAlertId(alert, userId, month),
      });
    });

    container.setAttribute(
      "data-active-alert-ids",
      JSON.stringify(
        alertsWithIds.map(function (alert) {
          return alert.alertId;
        })
      )
    );

    var html = "";
    alertsWithIds.forEach(function (alert) {
      html += renderAlertBanner(alert);
    });
    container.innerHTML = html;

    if (typeof window.applyBudgetAlertDisplayState === "function") {
      window.applyBudgetAlertDisplayState(container);
    }
  }

  window.SpendWiseBudgetNotifications = {
    render: renderBudgetNotifications,
    buildAlertId: buildAlertId,
    VISIBLE_LIMIT: VISIBLE_LIMIT,
  };
})();
