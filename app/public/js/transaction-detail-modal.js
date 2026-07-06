(function () {
  "use strict";

  var overlay = document.getElementById("transactionDetailOverlay");
  if (!overlay) return;

  var closeBtn = document.getElementById("closeTransactionDetailModal");
  var heroBg = document.getElementById("transactionDetailHeroBg");
  var headerAmount = document.getElementById("transactionDetailHeaderAmount");
  var headerTitle = document.getElementById("transactionDetailHeaderTitle");
  var categoryIconEl = document.getElementById("transactionDetailCategoryIcon");
  var notesInput = document.getElementById("transactionDetailNotesInput");
  var notesDisplay = document.getElementById("transactionDetailNotesDisplay");
  var receiptRoot = document.getElementById("transactionDetailReceipt");
  var receiptController =
    window.SwReceiptUpload && receiptRoot
      ? window.SwReceiptUpload.get(receiptRoot)
      : null;
  var dontCountToggle = document.getElementById("transactionDetailDontCount");
  var dontCountSaving = false;
  var deleteBtn = document.getElementById("transactionDetailDelete");
  var deleteInProgress = false;
  var prevBtn = document.getElementById("transactionDetailPrev");
  var nextBtn = document.getElementById("transactionDetailNext");
  // Mount on body so position:fixed is viewport-based (overlay backdrop-filter
  // would otherwise pin arrows next to the modal card).
  if (prevBtn) document.body.appendChild(prevBtn);
  if (nextBtn) document.body.appendChild(nextBtn);
  var currentExpenseId = null;
  var currentTrigger = null;
  var currentExpenseSnapshot = null;
  var fieldEditOverlay = document.getElementById("transactionFieldEditOverlay");
  var fieldEditTitle = document.getElementById("transactionFieldEditTitle");
  var fieldEditInput = document.getElementById("transactionFieldEditInput");
  var fieldEditTextarea = document.getElementById("transactionFieldEditTextarea");
  var fieldEditHelper = document.getElementById("transactionFieldEditHelper");
  var fieldEditError = document.getElementById("transactionFieldEditError");
  var fieldEditClear = document.getElementById("transactionFieldEditClear");
  var saveFieldEditBtn = document.getElementById("saveTransactionFieldEdit");
  var closeFieldEditBtn = document.getElementById("closeTransactionFieldEdit");
  var activeFieldEdit = null;
  var fieldEditSaving = false;
  var fields = {
    date: document.getElementById("transactionDetailDate"),
    amount: document.getElementById("transactionDetailAmount"),
    merchant: document.getElementById("transactionDetailMerchant"),
    expenseTitle: document.getElementById("transactionDetailExpenseTitle"),
    category: document.getElementById("transactionDetailCategory"),
  };

  var UNTITLED_TRANSACTION = "Untitled transaction";

  function readData(el, name) {
    return el.getAttribute("data-" + name) || "";
  }

  function parseJsonResponse(response) {
    var contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") === -1) {
      if (response.status === 404) {
        throw new Error(
          "Save endpoint not found. Restart the server and try again."
        );
      }
      throw new Error("Unable to save changes. Please refresh the page and try again.");
    }
    return response.json().then(function (data) {
      if (!response.ok || !data.success) {
        throw new Error((data && data.error) || "Unable to save changes.");
      }
      return data;
    });
  }

  function formatDateLong(dateStr) {
    if (!dateStr) return "—";
    var parts = String(dateStr).slice(0, 10).split("-");
    if (parts.length < 3) return dateStr;
    var date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      12,
      0,
      0
    );
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-SG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatAmount(value) {
    var num = Number(value);
    if (Number.isNaN(num)) return "—";
    return "-$" + Math.abs(num).toFixed(2);
  }

  function formatHeaderLabel(title, merchantName) {
    var expenseTitle = String(title || "").trim();
    if (expenseTitle) return expenseTitle;
    var merchant = String(merchantName || "").trim();
    if (merchant) return merchant;
    return UNTITLED_TRANSACTION;
  }

  function formatFieldValue(value) {
    var text = String(value || "").trim();
    return text || "—";
  }

  function applyHeroBackground(trigger) {
    if (!heroBg) return;

    var categoryName = readData(trigger, "category");
    var categoryIcon = readData(trigger, "category-icon");
    var iconImage = readData(trigger, "category-icon-image");
    var categoryColor = readData(trigger, "category-color");
    var isCustom =
      readData(trigger, "category-is-custom") === "1" ||
      readData(trigger, "category-is-custom") === "true";

    var imageUrl = "";
    if (
      window.SwTransactionHeaderImages &&
      typeof window.SwTransactionHeaderImages.resolveHeaderImage === "function"
    ) {
      imageUrl = window.SwTransactionHeaderImages.resolveHeaderImage(
        categoryName,
        categoryIcon,
        iconImage,
        isCustom
      );
    }

    heroBg.style.backgroundImage = "";
    heroBg.style.backgroundColor = "";

    if (imageUrl) {
      heroBg.style.backgroundImage = 'url("' + imageUrl.replace(/"/g, '\\"') + '")';
      heroBg.classList.remove("transaction-detail-modal__hero-bg--color");
      heroBg.classList.remove("transaction-detail-modal__hero-bg--placeholder");
      return;
    }

    if (isCustom && categoryColor) {
      heroBg.style.backgroundColor = categoryColor;
      heroBg.classList.add("transaction-detail-modal__hero-bg--color");
      heroBg.classList.remove("transaction-detail-modal__hero-bg--placeholder");
      return;
    }

    heroBg.classList.add("transaction-detail-modal__hero-bg--placeholder");
    heroBg.classList.remove("transaction-detail-modal__hero-bg--color");
  }

  function applyCategoryIcon(trigger) {
    if (!categoryIconEl) return;

    var categoryName = readData(trigger, "category");
    var categoryIcon = readData(trigger, "category-icon");
    var iconImage = readData(trigger, "category-icon-image");
    var categoryColor = readData(trigger, "category-color");
    var isCustom =
      readData(trigger, "category-is-custom") === "1" ||
      readData(trigger, "category-is-custom") === "true";

    categoryIconEl.className = "transaction-detail-modal__category-icon";
    categoryIconEl.style.backgroundColor = "";
    categoryIconEl.textContent = "";

    var iconUrl = "";
    if (
      window.SwTransactionHeaderImages &&
      typeof window.SwTransactionHeaderImages.resolveCategoryFieldIcon === "function"
    ) {
      iconUrl = window.SwTransactionHeaderImages.resolveCategoryFieldIcon(
        categoryName,
        categoryIcon,
        iconImage,
        isCustom
      );
    }

    if (iconUrl) {
      var img = document.createElement("img");
      img.src = iconUrl;
      img.alt = "";
      img.className = "transaction-detail-modal__category-icon-img";
      img.loading = "lazy";
      categoryIconEl.appendChild(img);
      return;
    }

    if (isCustom && categoryColor) {
      categoryIconEl.classList.add("transaction-detail-modal__category-icon--color");
      categoryIconEl.style.backgroundColor = categoryColor;
      return;
    }

    categoryIconEl.classList.add("transaction-detail-modal__category-icon--default");
    var letter = (categoryName || "?").trim().charAt(0).toUpperCase() || "?";
    categoryIconEl.textContent = letter;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return "";
    var parts = String(dateStr).slice(0, 10).split("-");
    if (parts.length < 3) return dateStr;
    var months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
    return months[Number(parts[1]) - 1] + " " + Number(parts[2]);
  }

  function readCurrentExpenseFromTrigger(trigger) {
    if (!trigger) return null;
    return {
      id: readData(trigger, "expense-id"),
      date: readData(trigger, "expense-date").slice(0, 10),
      amount: Number(readData(trigger, "amount")) || 0,
      title: readData(trigger, "title") || readData(trigger, "expense-title") || "",
      merchantName: readData(trigger, "merchant-name").trim(),
      notes: readData(trigger, "notes") || "",
      categoryId: readData(trigger, "category-id"),
      categoryName: readData(trigger, "category"),
      isExcludedFromBudget: readExcludedFromTrigger(trigger),
      isExcludedFromAllBudget: readExcludedFromTrigger(trigger),
    };
  }

  function readExcludedFromTrigger(trigger) {
    if (!trigger) return false;
    var categoryVal = readData(trigger, "excluded-from-budget");
    var allVal = readData(trigger, "excluded-from-all-budget");
    return (
      categoryVal === "1" ||
      categoryVal === "true" ||
      allVal === "1" ||
      allVal === "true"
    );
  }

  function shouldGreyBudgetRow(excluded) {
    if (!excluded) return false;
    var page = getTransactionPageContext();
    return page.type === "category" || page.type === "overall";
  }

  function setDontCountToggle(excluded) {
    if (!dontCountToggle) return;
    dontCountToggle.checked = !!excluded;
    dontCountToggle.disabled = dontCountSaving;
  }

  function syncDontCountToTrigger(excluded) {
    if (!currentTrigger) return;
    var flag = excluded ? "1" : "0";
    var expenseId = currentExpenseId || readData(currentTrigger, "expense-id");

    document
      .querySelectorAll(
        '.js-transaction-detail-trigger[data-expense-id="' + expenseId + '"]'
      )
      .forEach(function (trigger) {
        trigger.setAttribute("data-excluded-from-budget", flag);
        trigger.setAttribute("data-excluded-from-all-budget", flag);
        var listItem = trigger.closest(".spb-transaction-item");
        if (listItem) {
          listItem.setAttribute("data-excluded-from-budget", flag);
          listItem.setAttribute("data-excluded-from-all-budget", flag);
          listItem.classList.toggle("is-not-counted", shouldGreyBudgetRow(excluded));
        }
      });
  }

  function saveDontCount(excluded) {
    if (!currentExpenseId || dontCountSaving) return;

    dontCountSaving = true;
    setDontCountToggle(excluded);

    fetch(
      "/expenses/" +
        encodeURIComponent(currentExpenseId) +
        "/update-excluded-from-budget",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ excluded: excluded }),
      }
    )
      .then(function (response) {
        return parseJsonResponse(response);
      })
      .then(function (data) {
        var saved = !!data.isExcludedFromBudget;
        setDontCountToggle(saved);
        syncDontCountToTrigger(saved);
        if (currentExpenseSnapshot) {
          currentExpenseSnapshot.isExcludedFromBudget = saved;
          currentExpenseSnapshot.isExcludedFromAllBudget = saved;
        }
        document.dispatchEvent(
          new CustomEvent("sw-expense-updated", {
            detail: {
              expense: { id: currentExpenseId },
              isExcludedFromBudget: saved,
              isExcludedFromAllBudget: saved,
              fieldsChanged: ["isExcludedFromBudget", "isExcludedFromAllBudget"],
            },
          })
        );
      })
      .catch(function (error) {
        setDontCountToggle(!excluded);
        window.alert(error.message || "Unable to save preference.");
      })
      .finally(function () {
        dontCountSaving = false;
        if (dontCountToggle) dontCountToggle.disabled = false;
      });
  }

  function setDeleteBusy(busy) {
    deleteInProgress = !!busy;
    if (deleteBtn) deleteBtn.disabled = !!busy;
  }

  function performDeleteTransaction(expenseId) {
    setDeleteBusy(true);

    fetch("/expenses/" + encodeURIComponent(expenseId) + "/delete", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
      .then(function (response) {
        return parseJsonResponse(response);
      })
      .then(function () {
        var triggersBefore = getVisibleTransactionTriggers();
        var indexBefore = findTriggerIndex(
          triggersBefore,
          currentTrigger,
          expenseId
        );

        removeTransactionRowFromList(expenseId);

        var expenseRow = document.querySelector(
          'tr.expense-table-row[data-expense-id="' + expenseId + '"]'
        );
        if (expenseRow) expenseRow.remove();

        var remaining = getVisibleTransactionTriggers();
        if (remaining.length) {
          var nextIndex = indexBefore >= 0 ? Math.min(indexBefore, remaining.length - 1) : 0;
          openModal(remaining[nextIndex]);
        } else {
          closeModal();
        }

        // Reload so budget summary cards, charts, and page totals stay accurate.
        window.location.reload();
      })
      .catch(function (error) {
        setDeleteBusy(false);
        window.alert(error.message || "Unable to delete transaction.");
      });
  }

  function deleteTransaction() {
    if (!currentExpenseId || deleteInProgress) return;

    var expenseId = currentExpenseId;
    var runDelete = function () {
      performDeleteTransaction(expenseId);
    };

    if (window.SwConfirm && typeof window.SwConfirm.ask === "function") {
      window.SwConfirm.ask({
        title: "Are you sure?",
        message: "This cannot be undone.",
        actionText: "Delete",
        type: "danger",
      }).then(function (confirmed) {
        if (confirmed) runDelete();
      });
      return;
    }

    runDelete();
  }

  function getTransactionPageContext() {
    var budgetDataEl = document.getElementById("budgetCategoryData");
    if (budgetDataEl && budgetDataEl.textContent) {
      try {
        var data = JSON.parse(budgetDataEl.textContent);
        return {
          type: data.budgetType === "overall" ? "overall" : "category",
          categoryId: data.categoryId || null,
          budgetMonth: data.budgetMonth || "",
        };
      } catch (e) {
        return { type: "unknown", budgetMonth: "" };
      }
    }

    var eeDataEl = document.getElementById("budgetPageData");
    if (eeDataEl && eeDataEl.textContent) {
      try {
        var eeData = JSON.parse(eeDataEl.textContent);
        return {
          type: "everything-else",
          budgetMonth: eeData.budgetMonth || "",
        };
      } catch (e2) {
        return { type: "unknown", budgetMonth: "" };
      }
    }

    return { type: "unknown", budgetMonth: "" };
  }

  function applyCategoryAttrsToTrigger(trigger, expense) {
    if (!trigger || !expense) return;
    trigger.setAttribute("data-category-id", expense.categoryId || "");
    trigger.setAttribute("data-category", expense.categoryName || "");
    trigger.setAttribute("data-category-icon", expense.categoryIcon || "");
    trigger.setAttribute(
      "data-category-icon-image",
      expense.categoryIconImage || ""
    );
    trigger.setAttribute("data-category-color", expense.categoryColor || "");
    trigger.setAttribute(
      "data-category-is-custom",
      expense.categoryIsCustom ? "1" : "0"
    );
  }

  function syncCategoryAcrossSite(expense) {
    if (!expense || expense.id == null) return;
    var expenseId = String(expense.id);

    document
      .querySelectorAll(
        '.js-transaction-detail-trigger[data-expense-id="' + expenseId + '"]'
      )
      .forEach(function (trigger) {
        applyCategoryAttrsToTrigger(trigger, expense);

        var tagEl = trigger.querySelector(".spb-transaction-item__tag");
        if (tagEl) tagEl.textContent = expense.categoryName || "CASH";

        var eeCategoryEl = trigger.querySelector(".everything-transaction-category");
        if (eeCategoryEl) eeCategoryEl.textContent = expense.categoryName || "";

        var listItem = trigger.closest(".spb-transaction-item");
        if (listItem) {
          listItem.setAttribute("data-category", expense.categoryName || "");
        }
      });

    var expenseRow = document.querySelector(
      'tr.expense-table-row[data-expense-id="' + expenseId + '"]'
    );
    if (expenseRow) {
      var pill = expenseRow.querySelector(".expense-cat-pill");
      if (pill) {
        var nameEl = pill.querySelector(".spb-category-item__name");
        if (nameEl) {
          nameEl.textContent = expense.categoryName || "";
        } else {
          var textNodes = pill.childNodes;
          if (textNodes.length) {
            pill.lastChild.textContent = " " + (expense.categoryName || "");
          }
        }
      }
    }
  }

  function removeTransactionRowFromList(expenseId) {
    var id = String(expenseId);
    document
      .querySelectorAll('.js-transaction-detail-trigger[data-expense-id="' + id + '"]')
      .forEach(function (trigger) {
        var listItem = trigger.closest(".spb-transaction-item");
        if (listItem) {
          listItem.remove();
          return;
        }

        if (trigger.classList.contains("everything-transaction-row")) {
          var group = trigger.closest(".everything-date-group");
          trigger.remove();
          if (group) {
            var visibleRows = group.querySelectorAll(".everything-transaction-row");
            if (!visibleRows.length) group.hidden = true;
          }
        }
      });

    var list = document.getElementById("transactionList");
    var emptyEl = document.getElementById("transactionEmpty");
    if (list && emptyEl && !list.querySelector(".spb-transaction-item")) {
      emptyEl.hidden = false;
    }
  }

  function handleCategoryMovement(expense, previous) {
    var page = getTransactionPageContext();
    var newCategoryId = String(expense.categoryId || "");
    var expenseId = expense.id;

    if (page.type === "category" && String(page.categoryId) !== newCategoryId) {
      removeTransactionRowFromList(expenseId);
      return true;
    }

    if (page.type === "everything-else" && expense.hasBudgetForMonth) {
      removeTransactionRowFromList(expenseId);
      return true;
    }

    if (previous && String(previous.categoryId) === newCategoryId) {
      return false;
    }

    syncCategoryAcrossSite(expense);
    return false;
  }

  function openCategoryPicker() {
    if (!currentExpenseId || !currentTrigger) return;
    if (!window.SwTxnCategoryPicker) return;

    var snapshot = currentExpenseSnapshot || readCurrentExpenseFromTrigger(currentTrigger);
    var page = getTransactionPageContext();

    window.SwTxnCategoryPicker.open({
      expenseId: currentExpenseId,
      categoryId: snapshot ? snapshot.categoryId : readData(currentTrigger, "category-id"),
      budgetMonth: page.budgetMonth || (snapshot ? snapshot.date.slice(0, 7) : ""),
      onSaved: function (expense, previous) {
        if (!expense) return;

        var previousSnapshot = previous || snapshot || {};
        currentExpenseSnapshot = Object.assign({}, snapshot || {}, expense);

        if (fields.category) {
          fields.category.textContent = expense.categoryName || "—";
        }
        applyCategoryAttrsToTrigger(currentTrigger, expense);
        applyCategoryIcon(currentTrigger);
        applyHeroBackground(currentTrigger);

        var removed = handleCategoryMovement(expense, previousSnapshot);
        if (!removed) {
          syncCategoryAcrossSite(expense);
          updateNavArrows();
        } else {
          var remaining = getVisibleTransactionTriggers();
          if (remaining.length) {
            openModal(remaining[0]);
          } else {
            closeModal();
          }
        }

        dispatchExpenseUpdated(
          expense,
          {
            categoryId: previousSnapshot.categoryId,
            categoryName: previousSnapshot.categoryName,
            amount: snapshot ? snapshot.amount : expense.amount,
            date: snapshot ? snapshot.date : expense.date,
          },
          ["category"]
        );
      },
    });
  }

  function dispatchExpenseUpdated(expense, previous, fieldsChanged) {
    document.dispatchEvent(
      new CustomEvent("sw-expense-updated", {
        detail: {
          expense: expense,
          previous: previous,
          fieldsChanged: fieldsChanged || [],
        },
      })
    );
  }

  function syncExpenseTitleAcrossSite(expense) {
    if (!expense || expense.id == null) return;
    var expenseId = String(expense.id);
    var title = expense.title || "";

    document
      .querySelectorAll(
        '.js-transaction-detail-trigger[data-expense-id="' + expenseId + '"]'
      )
      .forEach(function (trigger) {
        trigger.setAttribute("data-title", title);

        var listTitle = trigger.querySelector(".spb-transaction-item__title");
        if (listTitle) listTitle.textContent = title;

        var eeTitle = trigger.querySelector(".everything-transaction-title");
        if (eeTitle) eeTitle.textContent = title;

        var listItem = trigger.closest(".spb-transaction-item");
        if (listItem) listItem.setAttribute("data-title", title);
      });

    var expenseRowTitle = document.querySelector(
      '.expense-row-details__title[href="/expenses/' + expenseId + '"]'
    );
    if (expenseRowTitle) expenseRowTitle.textContent = title;
  }

  function syncTriggerFromExpense(expense) {
    if (!currentTrigger || !expense) return;
    currentTrigger.setAttribute("data-expense-date", expense.date);
    currentTrigger.setAttribute("data-amount", String(expense.amount));
    currentTrigger.setAttribute("data-merchant-name", expense.merchantName || "");
    currentTrigger.setAttribute("data-notes", expense.notes || "");
    currentTrigger.setAttribute("data-title", expense.title || "");

    var listItem = currentTrigger.closest(".spb-transaction-item");
    if (listItem) {
      listItem.setAttribute("data-budget-month", expense.date.slice(0, 7));
      listItem.setAttribute("data-amount", String(expense.amount));
      listItem.setAttribute("data-merchant-name", expense.merchantName || "");
      listItem.setAttribute("data-notes", expense.notes || "");
      listItem.setAttribute("data-title", expense.title || "");

      var dateEl = listItem.querySelector(".spb-transaction-item__date");
      if (dateEl) dateEl.textContent = formatDateShort(expense.date);

      var amountEl = listItem.querySelector(".spb-transaction-item__amount");
      if (amountEl) amountEl.textContent = formatAmount(expense.amount);

      var listTitleEl = listItem.querySelector(".spb-transaction-item__title");
      if (listTitleEl) listTitleEl.textContent = expense.title || "";

      var merchantEl = listItem.querySelector(".spb-transaction-item__merchant-name");
      if (expense.merchantName) {
        if (merchantEl) {
          merchantEl.textContent = expense.merchantName;
        } else {
          var merchantWrap = listItem.querySelector(".spb-transaction-item__merchant");
          if (merchantWrap) {
            var span = document.createElement("span");
            span.className = "spb-transaction-item__merchant-name";
            span.textContent = expense.merchantName;
            merchantWrap.appendChild(span);
          }
        }
      } else if (merchantEl) {
        merchantEl.remove();
      }
    }

    var eeRow = currentTrigger.closest(".everything-transaction-row");
    if (eeRow && eeRow === currentTrigger) {
      var eeAmountEl = currentTrigger.querySelector(".everything-transaction-amount");
      if (eeAmountEl) eeAmountEl.textContent = formatAmount(expense.amount);

      var eeTitleEl = currentTrigger.querySelector(".everything-transaction-title");
      if (eeTitleEl) eeTitleEl.textContent = expense.title || "";

      var eeMerchantEl = currentTrigger.querySelector(".everything-transaction-merchant");
      if (expense.merchantName) {
        if (eeMerchantEl) {
          eeMerchantEl.textContent = expense.merchantName;
        } else {
          var bodyEl = currentTrigger.querySelector(".everything-transaction-body");
          if (bodyEl) {
            var titleEl = bodyEl.querySelector(".everything-transaction-title");
            var merchantSpan = document.createElement("span");
            merchantSpan.className = "everything-transaction-merchant";
            merchantSpan.textContent = expense.merchantName;
            if (titleEl && titleEl.nextSibling) {
              bodyEl.insertBefore(merchantSpan, titleEl.nextSibling);
            } else {
              bodyEl.appendChild(merchantSpan);
            }
          }
        }
      } else if (eeMerchantEl) {
        eeMerchantEl.remove();
      }
    }

    syncExpenseTitleAcrossSite(expense);
  }

  function applyExpenseToPopup(expense) {
    if (!expense) return;
    currentExpenseSnapshot = expense;

    var amountText = formatAmount(expense.amount);
    var titleText = expense.title || "";
    var merchantName = (expense.merchantName || "").trim();

    if (headerAmount) headerAmount.textContent = amountText;
    if (headerTitle) {
      headerTitle.textContent = formatHeaderLabel(titleText, merchantName);
    }
    if (fields.date) fields.date.textContent = formatDateLong(expense.date);
    if (fields.amount) fields.amount.textContent = amountText;
    if (fields.merchant) fields.merchant.textContent = formatFieldValue(merchantName);
    if (fields.expenseTitle) {
      fields.expenseTitle.textContent = formatFieldValue(titleText);
    }
    setNotesField(expense.notes || "");
    syncNotesToTrigger(expense.notes || "");
  }

  var FIELD_EDIT_CONFIG = {
    date: {
      title: "Change date",
      helper: "Enter transaction date.",
      inputType: "date",
      endpoint: "update-date",
      bodyKey: "date",
    },
    amount: {
      title: "Change amount",
      helper: "Enter transaction amount.",
      inputType: "amount",
      endpoint: "update-amount",
      bodyKey: "amount",
    },
    title: {
      title: "Change expense title",
      helper: "Enter expense title.",
      inputType: "text",
      endpoint: "update-title",
      bodyKey: "title",
    },
    merchant: {
      title: "Change merchant",
      helper: "Enter merchant name.",
      inputType: "text",
      endpoint: "update-merchant",
      bodyKey: "merchantName",
    },
    notes: {
      title: "Change notes",
      helper: "Enter notes for this transaction.",
      inputType: "notes",
      endpoint: "update-notes",
      bodyKey: "notes",
    },
  };

  function getActiveFieldEditor() {
    if (!activeFieldEdit) return null;
    if (activeFieldEdit === "notes" && fieldEditTextarea) return fieldEditTextarea;
    return fieldEditInput;
  }

  function clearFieldEditError() {
    if (!fieldEditError) return;
    fieldEditError.hidden = true;
    fieldEditError.textContent = "";
  }

  function showFieldEditError(message) {
    if (!fieldEditError) return;
    fieldEditError.textContent = message;
    fieldEditError.hidden = false;
  }

  function updateFieldEditClearVisibility() {
    if (!fieldEditClear) return;
    var editor = getActiveFieldEditor();
    var hasValue = editor && String(editor.value || "").length > 0;
    fieldEditClear.hidden = !hasValue;
  }

  function getFieldEditInitialValue(fieldName) {
    var expense = currentExpenseSnapshot || readCurrentExpenseFromTrigger(currentTrigger);
    if (!expense) return "";

    if (fieldName === "date") return expense.date || "";
    if (fieldName === "amount") {
      var num = Number(expense.amount);
      return Number.isNaN(num) ? "" : String(Math.abs(num));
    }
    if (fieldName === "title") return expense.title || "";
    if (fieldName === "merchant") {
      return expense.merchantName || "";
    }
    if (fieldName === "notes") return expense.notes || "";
    return "";
  }

  function openFieldEditModal(fieldName) {
    if (!fieldEditOverlay || !currentExpenseId) return;

    var config = FIELD_EDIT_CONFIG[fieldName];
    if (!config) return;

    activeFieldEdit = fieldName;
    clearFieldEditError();

    if (fieldEditTitle) fieldEditTitle.textContent = config.title;
    if (fieldEditHelper) fieldEditHelper.textContent = config.helper;

    var initialValue = getFieldEditInitialValue(fieldName);
    var isNotes = fieldName === "notes";

    if (fieldEditInput) {
      fieldEditInput.hidden = isNotes;
      fieldEditInput.type = fieldName === "date" ? "date" : "text";
      fieldEditInput.inputMode = fieldName === "amount" ? "decimal" : "text";
      fieldEditInput.value = isNotes ? "" : initialValue;
      fieldEditInput.setAttribute("aria-hidden", isNotes ? "true" : "false");
      fieldEditInput.tabIndex = isNotes ? -1 : 0;
    }

    if (fieldEditTextarea) {
      fieldEditTextarea.hidden = !isNotes;
      fieldEditTextarea.value = isNotes ? initialValue : "";
      fieldEditTextarea.setAttribute("aria-hidden", isNotes ? "false" : "true");
      fieldEditTextarea.tabIndex = isNotes ? 0 : -1;
    }

    updateFieldEditClearVisibility();
    fieldEditOverlay.hidden = false;

    var editor = getActiveFieldEditor();
    if (editor) {
      window.requestAnimationFrame(function () {
        editor.focus();
        if (typeof editor.select === "function" && fieldName !== "date") {
          editor.select();
        }
      });
    }
  }

  function closeFieldEditModal() {
    if (!fieldEditOverlay) return;
    fieldEditOverlay.hidden = true;
    activeFieldEdit = null;
    fieldEditSaving = false;
    clearFieldEditError();
    if (saveFieldEditBtn) saveFieldEditBtn.disabled = false;
  }

  function parseAmountInput(raw) {
    var cleaned = String(raw || "").replace(/[$,\s]/g, "");
    var amount = parseFloat(cleaned);
    if (!cleaned || Number.isNaN(amount) || amount <= 0) {
      return { valid: false, error: "Amount must be a positive number." };
    }
    return { valid: true, value: amount };
  }

  function saveFieldEdit() {
    if (!activeFieldEdit || !currentExpenseId || fieldEditSaving) return;

    var config = FIELD_EDIT_CONFIG[activeFieldEdit];
    if (!config) return;

    var editor = getActiveFieldEditor();
    if (!editor) return;

    var rawValue = editor.value;
    var body = {};
    var previous = currentExpenseSnapshot || readCurrentExpenseFromTrigger(currentTrigger);

    if (activeFieldEdit === "amount") {
      var amountCheck = parseAmountInput(rawValue);
      if (!amountCheck.valid) {
        showFieldEditError(amountCheck.error);
        return;
      }
      body.amount = amountCheck.value;
    } else if (activeFieldEdit === "date") {
      body.date = String(rawValue).trim().slice(0, 10);
      if (!body.date) {
        showFieldEditError("Date is required.");
        return;
      }
    } else if (activeFieldEdit === "merchant") {
      body.merchantName = String(rawValue).trim();
    } else if (activeFieldEdit === "title") {
      body.title = String(rawValue).trim();
      if (!body.title) {
        showFieldEditError("Title is required.");
        return;
      }
      if (body.title.length > 255) {
        showFieldEditError("Title must be 255 characters or less.");
        return;
      }
    } else if (activeFieldEdit === "notes") {
      body.notes = String(rawValue).trim();
      if (body.notes.length > 255) {
        showFieldEditError("Notes must be 255 characters or less.");
        return;
      }
    }

    fieldEditSaving = true;
    clearFieldEditError();
    if (saveFieldEditBtn) saveFieldEditBtn.disabled = true;

    fetch(
      "/expenses/" + encodeURIComponent(currentExpenseId) + "/" + config.endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      }
    )
      .then(function (response) {
        return parseJsonResponse(response);
      })
      .then(function (data) {
        var expense = data.expense || {
          id: currentExpenseId,
          date: body.date || previous.date,
          amount: body.amount != null ? body.amount : previous.amount,
          merchantName:
            body.merchantName != null ? body.merchantName : previous.merchantName,
          title: body.title != null ? body.title : previous.title,
          notes: body.notes != null ? body.notes : data.notes || previous.notes,
        };

        applyExpenseToPopup(expense);
        syncTriggerFromExpense(expense);
        dispatchExpenseUpdated(expense, previous, [activeFieldEdit]);
        closeFieldEditModal();
      })
      .catch(function (error) {
        showFieldEditError(error.message || "Unable to save changes.");
      })
      .finally(function () {
        fieldEditSaving = false;
        if (saveFieldEditBtn) saveFieldEditBtn.disabled = false;
      });
  }

  function syncNotesToTrigger(notes) {
    if (!currentTrigger) return;
    currentTrigger.setAttribute("data-notes", notes);
    var listItem = currentTrigger.closest(".spb-transaction-item");
    if (listItem) {
      listItem.setAttribute("data-notes", notes);
    }
  }

  var NOTES_PLACEHOLDER = "Add notes for this transaction...";

  function setNotesField(notes) {
    if (notesInput) notesInput.value = notes || "";
    if (!notesDisplay) return;
    var text = (notes || "").trim();
    if (text) {
      notesDisplay.textContent = text;
      notesDisplay.classList.remove("transaction-detail-modal__notes-display--empty");
    } else {
      notesDisplay.textContent = NOTES_PLACEHOLDER;
      notesDisplay.classList.add("transaction-detail-modal__notes-display--empty");
    }
  }

  function applyNotes(notes) {
    setNotesField(notes);
  }

  var RECEIPT_ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.5 12.5l7.2-7.2a3 3 0 114.2 4.2l-8.4 8.4a4.5 4.5 0 01-6.4-6.4l9-9a6 6 0 018.5 8.5l-9.2 9.2a7.5 7.5 0 01-10.6-10.6l8.5-8.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function ensureTitleRow(trigger, titleSelector, rowClass) {
    var titleEl = trigger.querySelector(titleSelector);
    if (!titleEl) return null;
    var row = titleEl.parentElement;
    if (row && row.classList.contains(rowClass)) return row;
    var wrap = document.createElement("span");
    wrap.className = rowClass;
    titleEl.parentNode.insertBefore(wrap, titleEl);
    wrap.appendChild(titleEl);
    return wrap;
  }

  function upsertReceiptIcon(container, iconClass, hasReceipt) {
    if (!container) return;
    var existing = container.querySelector("." + iconClass);
    if (hasReceipt && !existing) {
      var icon = document.createElement("span");
      icon.className = iconClass;
      icon.setAttribute("aria-label", "Receipt attached");
      icon.setAttribute("title", "Receipt attached");
      icon.innerHTML = RECEIPT_ICON_SVG;
      container.appendChild(icon);
    } else if (!hasReceipt && existing) {
      existing.remove();
    }
  }

  function syncReceiptIconOnTrigger(hasReceipt) {
    if (!currentTrigger) return;

    var titleRow = currentTrigger.querySelector(".spb-transaction-item__title-row");
    if (!titleRow) {
      titleRow = ensureTitleRow(
        currentTrigger,
        ".spb-transaction-item__title",
        "spb-transaction-item__title-row"
      );
    }
    if (titleRow) {
      upsertReceiptIcon(titleRow, "spb-transaction-item__receipt", hasReceipt);
      return;
    }

    var eeTitleRow = currentTrigger.querySelector(".everything-transaction-title-row");
    if (!eeTitleRow) {
      eeTitleRow = ensureTitleRow(
        currentTrigger,
        ".everything-transaction-title",
        "everything-transaction-title-row"
      );
    }
    if (eeTitleRow) {
      upsertReceiptIcon(eeTitleRow, "everything-transaction-receipt", hasReceipt);
      return;
    }

    var expenseRow =
      currentTrigger.closest("tr.expense-table-row") ||
      document.querySelector(
        'tr.expense-table-row[data-expense-id="' +
          (currentExpenseId || readData(currentTrigger, "expense-id")) +
          '"]'
      );
    if (!expenseRow) return;
    var expenseTitleRow = expenseRow.querySelector(".expense-row-details__title-row");
    upsertReceiptIcon(expenseTitleRow, "expense-row-details__receipt", hasReceipt);
  }

  function syncReceiptToTrigger(imagePath) {
    if (!currentTrigger) return;
    var hasReceipt = imagePath ? "1" : "0";
    currentTrigger.setAttribute("data-has-receipt", hasReceipt);
    currentTrigger.setAttribute("data-image-path", imagePath || "");
    var listItem = currentTrigger.closest(".spb-transaction-item");
    if (listItem) {
      listItem.setAttribute("data-has-receipt", hasReceipt);
    }
    syncReceiptIconOnTrigger(!!imagePath);
  }

  function applyReceipt(trigger) {
    var imagePath = readData(trigger, "image-path") || "";
    if (!receiptController && window.SwReceiptUpload && receiptRoot) {
      receiptController = window.SwReceiptUpload.get(receiptRoot);
    }
    if (!receiptController) return;
    receiptController.setExpenseId(currentExpenseId || readData(trigger, "expense-id"));
    receiptController.setExisting(imagePath);
  }

  function isTransactionTriggerVisible(trigger) {
    if (!trigger || !trigger.isConnected) return false;
    if (trigger.hidden) return false;
    if (trigger.classList.contains("everything-transaction-row--hidden")) return false;

    var listItem = trigger.closest(".spb-transaction-item");
    if (listItem && listItem.hidden) return false;

    var group = trigger.closest(".everything-date-group");
    if (group && (group.hidden || group.classList.contains("everything-date-group--hidden"))) {
      return false;
    }

    return true;
  }

  function getVisibleTransactionTriggers() {
    var nodes = document.querySelectorAll(".js-transaction-detail-trigger");
    var visible = [];
    for (var i = 0; i < nodes.length; i++) {
      if (isTransactionTriggerVisible(nodes[i])) {
        visible.push(nodes[i]);
      }
    }
    return visible;
  }

  function findTriggerIndex(triggers, trigger, expenseId) {
    var id = expenseId != null ? String(expenseId) : "";
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i] === trigger) return i;
      if (id && readData(triggers[i], "expense-id") === id) return i;
    }
    return -1;
  }

  function setNavArrowsVisible(visible) {
    if (prevBtn) {
      prevBtn.hidden = !visible;
      prevBtn.disabled = false;
      prevBtn.removeAttribute("aria-disabled");
    }
    if (nextBtn) {
      nextBtn.hidden = !visible;
      nextBtn.disabled = false;
      nextBtn.removeAttribute("aria-disabled");
    }
  }

  function updateNavArrows() {
    // Both arrows stay visible and active while the popup is open,
    // except on pages that opt out (e.g. Expenses list).
    if (overlay.hidden || document.querySelector("[data-hide-txn-nav]")) {
      setNavArrowsVisible(false);
      return;
    }

    var triggers = getVisibleTransactionTriggers();
    var index = findTriggerIndex(triggers, currentTrigger, currentExpenseId);
    if (index >= 0) {
      currentTrigger = triggers[index];
    }

    setNavArrowsVisible(true);
  }

  function closeNestedTransactionUi() {
    closeFieldEditModal();
    var txnCategoryOverlay = document.getElementById("txnCategoryOverlay");
    if (txnCategoryOverlay && !txnCategoryOverlay.hidden) {
      txnCategoryOverlay.hidden = true;
    }
  }

  function navigateTransaction(direction) {
    if (overlay.hidden || deleteInProgress || dontCountSaving || fieldEditSaving) {
      return;
    }

    var triggers = getVisibleTransactionTriggers();
    if (!triggers.length) {
      closeModal();
      return;
    }

    var index = findTriggerIndex(triggers, currentTrigger, currentExpenseId);
    if (index < 0) {
      closeNestedTransactionUi();
      openModal(triggers[0]);
      return;
    }

    if (triggers.length === 1) {
      closeNestedTransactionUi();
      openModal(triggers[0]);
      return;
    }

    var nextIndex = index + direction;
    if (nextIndex < 0) nextIndex = triggers.length - 1;
    if (nextIndex >= triggers.length) nextIndex = 0;

    closeNestedTransactionUi();
    openModal(triggers[nextIndex]);
  }

  function openModal(trigger) {
    if (!trigger) return;

    var notes = readData(trigger, "notes");
    var amountText = formatAmount(readData(trigger, "amount"));
    var titleText =
      readData(trigger, "title") ||
      readData(trigger, "expense-title") ||
      "";
    var merchantName = readData(trigger, "merchant-name").trim();
    var categoryName = readData(trigger, "category").trim();

    currentExpenseId = readData(trigger, "expense-id");
    currentTrigger = trigger;
    currentExpenseSnapshot = readCurrentExpenseFromTrigger(trigger);
    dontCountSaving = false;
    setDeleteBusy(false);

    if (headerAmount) headerAmount.textContent = amountText;
    if (headerTitle) {
      headerTitle.textContent = formatHeaderLabel(titleText, merchantName);
    }

    applyHeroBackground(trigger);
    applyCategoryIcon(trigger);

    if (fields.date) fields.date.textContent = formatDateLong(readData(trigger, "expense-date"));
    if (fields.amount) fields.amount.textContent = amountText;
    if (fields.merchant) fields.merchant.textContent = formatFieldValue(merchantName);
    if (fields.expenseTitle) fields.expenseTitle.textContent = formatFieldValue(titleText);
    if (fields.category) fields.category.textContent = categoryName || "—";

    applyNotes(notes);
    applyReceipt(trigger);
    setDontCountToggle(readExcludedFromTrigger(trigger));

    if (window.SwModalScroll) {
      SwModalScroll.relocate();
    }
    overlay.hidden = false;
    if (window.SwModalScroll) {
      SwModalScroll.onOpen(overlay);
    } else {
      overlay.scrollTop = 0;
    }
    updateNavArrows();
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    if (window.SwModalScroll) {
      SwModalScroll.onClose();
    }
    currentExpenseId = null;
    currentTrigger = null;
    currentExpenseSnapshot = null;
    dontCountSaving = false;
    setDeleteBusy(false);
    closeFieldEditModal();
    if (receiptController) receiptController.reset();
    updateNavArrows();
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest(".js-transaction-detail-trigger");
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    openModal(trigger);
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (receiptRoot) {
    receiptRoot.addEventListener("sw-receipt-updated", function (event) {
      var imagePath = (event.detail && event.detail.imagePath) || "";
      syncReceiptToTrigger(imagePath);
      if (currentExpenseSnapshot) {
        currentExpenseSnapshot.imagePath = imagePath;
      }
    });
  }

  if (dontCountToggle) {
    dontCountToggle.addEventListener("change", function () {
      saveDontCount(dontCountToggle.checked);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      deleteTransaction();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      navigateTransaction(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      navigateTransaction(1);
    });
  }

  overlay.querySelectorAll("[data-txn-edit-field]").forEach(function (fieldBtn) {
    fieldBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var fieldName = fieldBtn.getAttribute("data-txn-edit-field");
      if (fieldName === "category") {
        openCategoryPicker();
        return;
      }
      openFieldEditModal(fieldName);
    });
  });

  if (closeFieldEditBtn) {
    closeFieldEditBtn.addEventListener("click", closeFieldEditModal);
  }

  if (saveFieldEditBtn) {
    saveFieldEditBtn.addEventListener("click", saveFieldEdit);
  }

  if (fieldEditClear) {
    fieldEditClear.addEventListener("click", function () {
      var editor = getActiveFieldEditor();
      if (!editor) return;
      editor.value = "";
      editor.focus();
      updateFieldEditClearVisibility();
    });
  }

  if (fieldEditInput) {
    fieldEditInput.addEventListener("input", updateFieldEditClearVisibility);
    fieldEditInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        saveFieldEdit();
      }
    });
  }

  if (fieldEditTextarea) {
    fieldEditTextarea.addEventListener("input", updateFieldEditClearVisibility);
  }

  if (fieldEditOverlay) {
    fieldEditOverlay.addEventListener("click", function (event) {
      if (event.target === fieldEditOverlay) closeFieldEditModal();
    });
  }

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var txnCategoryOverlay = document.getElementById("txnCategoryOverlay");
    if (txnCategoryOverlay && !txnCategoryOverlay.hidden) return;
    if (fieldEditOverlay && !fieldEditOverlay.hidden) {
      closeFieldEditModal();
      return;
    }
    if (!overlay.hidden) closeModal();
  });
})();
