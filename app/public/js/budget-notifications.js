// In-app budget alerts on the page: dismiss, localStorage, and View More / Show Fewer.
;(function () {
  "use strict";

  var STORAGE_KEY = "spendwise_dismissed_budget_alerts";
  var VISIBLE_LIMIT = 2;
  console.log("budget-notifications.js loaded v9");

  // Save and read dismissed alert IDs in the browser's localStorage.
  // Refreshing the page keeps dismissed alerts hidden. This does not delete
  // the expense or budget, and it does not stop email alerts from being sent.
  function readDismissedIds() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeDismissedIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      /* ignore storage errors */
    }
  }

  function getDismissedSet() {
    var set = {};
    readDismissedIds().forEach(function (id) {
      set[id] = true;
    });
    return set;
  }

  function saveDismissedId(alertId) {
    var ids = readDismissedIds();
    if (ids.indexOf(alertId) === -1) {
      ids.push(alertId);
      writeDismissedIds(ids);
    }
  }

  function pruneDismissedIds(activeAlertIds) {
    var activeSet = {};
    (activeAlertIds || []).forEach(function (id) {
      if (id) activeSet[id] = true;
    });
    var dismissed = readDismissedIds();
    var pruned = dismissed.filter(function (id) {
      return activeSet[id];
    });
    if (pruned.length !== dismissed.length) {
      writeDismissedIds(pruned);
    }
    return pruned;
  }

  function buildCategoryDismissIds(userId, month, categoryId) {
    var uid = String(userId);
    var m = String(month);
    var cid = String(categoryId);
    return [
      "user-" + uid + "-" + m + "-category-" + cid + "-warning",
      "user-" + uid + "-" + m + "-category-" + cid + "-danger",
    ];
  }

  function buildOverallDismissIds(userId, month) {
    var uid = String(userId);
    var m = String(month);
    return [
      "user-" + uid + "-" + m + "-overall-warning",
      "user-" + uid + "-" + m + "-overall-danger",
    ];
  }

  function removeDismissIds(idsToRemove) {
    var removeSet = {};
    (idsToRemove || []).forEach(function (id) {
      if (id) removeSet[id] = true;
    });
    if (!Object.keys(removeSet).length) return;
    writeDismissedIds(
      readDismissedIds().filter(function (id) {
        return !removeSet[id];
      })
    );
  }

  function clearDismissedBudgetAlertsForCategory(userId, month, categoryId) {
    if (!userId || !month || categoryId == null || categoryId === "") return;
    removeDismissIds(buildCategoryDismissIds(userId, month, categoryId));
  }

  function clearDismissedBudgetAlertsForOverall(userId, month) {
    if (!userId || !month) return;
    removeDismissIds(buildOverallDismissIds(userId, month));
  }

  function applyBudgetAlertResetFromMeta(meta) {
    if (!meta || !meta.affectedUserId || !meta.affectedMonth) return;

    if (meta.affectedCategoryId != null && meta.affectedCategoryId !== "") {
      clearDismissedBudgetAlertsForCategory(
        meta.affectedUserId,
        meta.affectedMonth,
        meta.affectedCategoryId
      );
    }

    if (
      meta.affectedPreviousCategoryId != null &&
      meta.affectedPreviousCategoryId !== "" &&
      String(meta.affectedPreviousCategoryId) !== String(meta.affectedCategoryId)
    ) {
      clearDismissedBudgetAlertsForCategory(
        meta.affectedUserId,
        meta.affectedMonth,
        meta.affectedPreviousCategoryId
      );
    }

    if (
      meta.affectedPreviousMonth &&
      meta.affectedCategoryId != null &&
      meta.affectedCategoryId !== "" &&
      String(meta.affectedPreviousMonth) !== String(meta.affectedMonth)
    ) {
      clearDismissedBudgetAlertsForCategory(
        meta.affectedUserId,
        meta.affectedPreviousMonth,
        meta.affectedCategoryId
      );
    }
  }

  function consumeBudgetAlertResetFromUrl() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.get("resetBudgetAlertDismiss") !== "category") return;

      var userId = url.searchParams.get("userId");
      var categoryId = url.searchParams.get("categoryId");
      var month = url.searchParams.get("month");
      var previousCategoryId = url.searchParams.get("previousCategoryId");
      var previousMonth = url.searchParams.get("previousMonth");

      if (!userId) {
        var section = document.querySelector(
          ".budget-notifications[data-user-id]"
        );
        if (section) userId = section.getAttribute("data-user-id");
      }

      applyBudgetAlertResetFromMeta({
        affectedUserId: userId,
        affectedMonth: month,
        affectedCategoryId: categoryId,
        affectedPreviousCategoryId: previousCategoryId,
        affectedPreviousMonth: previousMonth,
      });

      url.searchParams.delete("resetBudgetAlertDismiss");
      url.searchParams.delete("userId");
      url.searchParams.delete("categoryId");
      url.searchParams.delete("month");
      url.searchParams.delete("previousCategoryId");
      url.searchParams.delete("previousMonth");
      window.history.replaceState(
        {},
        "",
        url.pathname + url.search + url.hash
      );
    } catch (error) {
      /* ignore malformed URL params */
    }
  }

  function pluralAlerts(count) {
    return count === 1 ? "alert" : "alerts";
  }

  function getAlertCards(section) {
    return Array.prototype.slice.call(
      section.querySelectorAll(".budget-notification-alert[data-alert-id]")
    );
  }

  function getActiveAlertIds(section) {
    var raw = section.getAttribute("data-active-alert-ids");
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean);
        }
      } catch (error) {
        /* fall through to DOM-derived ids */
      }
    }

    var fromDom = getAlertCards(section)
      .map(function (card) {
        return card.getAttribute("data-alert-id");
      })
      .filter(Boolean);

    if (fromDom.length) {
      section.setAttribute("data-active-alert-ids", JSON.stringify(fromDom));
    }

    return fromDom;
  }

  function removeChrome(section) {
    var empty = section.querySelector(".budget-notifications__empty");
    var toggle = section.querySelector(".js-budget-alert-toggle");
    var legacyMore = section.querySelector(".budget-notifications__more");
    if (empty) empty.remove();
    if (toggle) toggle.remove();
    if (legacyMore) {
      var cardsInMore = legacyMore.querySelectorAll(".budget-notification-alert");
      cardsInMore.forEach(function (card) {
        section.appendChild(card);
      });
      legacyMore.remove();
    }
    var legacyToggle = section.querySelector(
      ".budget-notifications__toggle:not(.js-budget-alert-toggle)"
    );
    if (legacyToggle) legacyToggle.remove();
  }

  function isExpanded(section) {
    return section.getAttribute("data-alerts-expanded") === "true";
  }

  function setExpanded(section, value) {
    section.setAttribute("data-alerts-expanded", value ? "true" : "false");
  }

  function setCardHidden(card, hidden) {
    card.hidden = hidden;
    if (hidden) {
      card.setAttribute("hidden", "hidden");
    } else {
      card.removeAttribute("hidden");
    }
  }

  // Control how many alerts are visible at once.
  // Only the first few alerts show; View More / Show Fewer reveals or hides the rest.
  // This only changes what the user sees — it does not change budgets or emails.
  function applyBudgetAlertDisplayState(root) {
    var sections = [];

    if (root && root.classList && root.classList.contains("budget-notifications")) {
      sections = [root];
    } else if (root && root.querySelectorAll) {
      sections = Array.prototype.slice.call(
        root.querySelectorAll(".budget-notifications[data-budget-alerts-ui]")
      );
    } else {
      sections = Array.prototype.slice.call(
        document.querySelectorAll(".budget-notifications[data-budget-alerts-ui]")
      );
    }

    sections.forEach(function (section) {
      removeChrome(section);

      var activeIds = getActiveAlertIds(section);
      pruneDismissedIds(activeIds);

      var dismissedSet = getDismissedSet();
      var allCards = getAlertCards(section);

      allCards.forEach(function (card) {
        var id = card.getAttribute("data-alert-id");
        if (id && dismissedSet[id]) {
          card.setAttribute("data-budget-alert-dismissed", "1");
          setCardHidden(card, true);
        } else {
          card.removeAttribute("data-budget-alert-dismissed");
        }
      });

      var remaining = allCards.filter(function (card) {
        var id = card.getAttribute("data-alert-id");
        return id && !dismissedSet[id];
      });

      var hasBackendAlerts = section.getAttribute("data-has-alerts") === "1";

      if (!remaining.length) {
        var empty = document.createElement("p");
        empty.className = "budget-notifications__empty";
        if (hasBackendAlerts && activeIds.length > 0) {
          empty.textContent = "All budget alerts dismissed for now.";
        } else {
          empty.textContent = "No budget alerts right now.";
        }
        section.appendChild(empty);
        setExpanded(section, false);
        return;
      }

      var hiddenCount = Math.max(0, remaining.length - VISIBLE_LIMIT);
      var expanded = hiddenCount > 0 && isExpanded(section);

      if (hiddenCount === 0) {
        setExpanded(section, false);
        expanded = false;
      }

      remaining.forEach(function (card, index) {
        var collapseHidden = !expanded && index >= VISIBLE_LIMIT;
        setCardHidden(card, collapseHidden);
      });

      allCards.forEach(function (card) {
        if (card.getAttribute("data-budget-alert-dismissed") === "1") {
          setCardHidden(card, true);
        }
      });

      if (hiddenCount > 0) {
        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "budget-notifications__toggle js-budget-alert-toggle";
        toggle.setAttribute("data-expanded", expanded ? "true" : "false");
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        toggle.textContent = expanded
          ? "Show fewer alerts"
          : "View " + hiddenCount + " more " + pluralAlerts(hiddenCount);
        section.appendChild(toggle);
      }
    });
  }

  // When the user clicks Dismiss, hide that alert and save its stable ID in localStorage
  // so it stays hidden after a refresh. The underlying budget and expense are unchanged.
  document.addEventListener("click", function (event) {
    var dismissButton = event.target.closest(".js-dismiss-budget-alert");
    if (dismissButton) {
      event.preventDefault();
      event.stopPropagation();

      var alertCard = dismissButton.closest(".budget-notification-alert");
      if (!alertCard) return;

      var alertId = alertCard.getAttribute("data-alert-id");
      if (!alertId) return;

      saveDismissedId(alertId);

      var section = dismissButton.closest(".budget-notifications");
      applyBudgetAlertDisplayState(section);
      return;
    }

    var toggleButton = event.target.closest(".js-budget-alert-toggle");
    if (toggleButton) {
      event.preventDefault();

      var toggleSection = toggleButton.closest(".budget-notifications");
      if (!toggleSection) return;

      setExpanded(toggleSection, !isExpanded(toggleSection));
      applyBudgetAlertDisplayState(toggleSection);
    }
  });

  window.applyBudgetAlertDisplayState = applyBudgetAlertDisplayState;
  window.initBudgetNotificationDismiss = applyBudgetAlertDisplayState;
  window.SpendWiseBudgetNotificationDismiss = {
    STORAGE_KEY: STORAGE_KEY,
    VISIBLE_LIMIT: VISIBLE_LIMIT,
    readDismissedIds: readDismissedIds,
    writeDismissedIds: writeDismissedIds,
    pruneDismissedIds: pruneDismissedIds,
    clearDismissedBudgetAlertsForCategory: clearDismissedBudgetAlertsForCategory,
    clearDismissedBudgetAlertsForOverall: clearDismissedBudgetAlertsForOverall,
    applyBudgetAlertResetFromMeta: applyBudgetAlertResetFromMeta,
  };

  document.addEventListener("sw-expense-updated", function (event) {
    var detail = event && event.detail ? event.detail : {};
    if (detail.budgetAlertReset) {
      applyBudgetAlertResetFromMeta(detail.budgetAlertReset);
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    consumeBudgetAlertResetFromUrl();
    applyBudgetAlertDisplayState(document);
  });
})();
