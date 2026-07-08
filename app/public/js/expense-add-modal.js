(function () {
  "use strict";

  var overlay = document.getElementById("addExpenseOverlay");
  if (!overlay) return;

  var closeBtn = document.getElementById("closeAddExpenseModalBtn");
  var cancelBtn = document.getElementById("closeAddExpenseModal");
  var form = document.getElementById("addExpenseForm");
  var categoryOverlay = document.getElementById("expenseCategoryOverlay");
  var isSubmitting = false;

  var PLACEHOLDER_ICON =
    '<span class="sw-category-icon sw-category-icon--sm">' +
    '<span class="sw-category-icon__fallback" aria-hidden="true">' +
    '<svg viewBox="0 0 24 24" fill="none" width="20" height="20">' +
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75"/>' +
    '<path d="M8.5 12h7M12 8.5v7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
    "</svg></span></span>";

  function getTodayLocalDateString() {
    var now = new Date();
    return (
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0")
    );
  }

  function getModalDefaults() {
    var el = document.getElementById("expenseModalDefaults");
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (error) {
      return null;
    }
  }

  function applyDateDefaults(defaults) {
    var dateInput = document.getElementById("date");
    if (!dateInput) return;

    var defaultDate =
      (defaults && defaults.defaultDate) ||
      (defaults && defaults.maxDate) ||
      getTodayLocalDateString();
    dateInput.value = defaultDate;
    dateInput.removeAttribute("max");
    dateInput.classList.remove("expense-date-input--invalid");

    var dateError = document.getElementById("dateError");
    if (dateError) dateError.hidden = true;
  }

  function applyCategoryDefaults(defaults) {
    if (!defaults || !defaults.categoryId) return false;

    var categoryIdInput = document.getElementById("categoryId");
    var categoryLabel = document.getElementById("expenseCategoryLabel");
    var categoryIconWrap = document.getElementById("expenseCategoryIconWrap");
    if (!categoryIdInput) return false;

    categoryIdInput.value = String(defaults.categoryId);

    if (categoryLabel) {
      categoryLabel.textContent = defaults.categoryName || "Choose category";
      categoryLabel.classList.remove("expense-txn__category-value--placeholder");
    }

    var pickBtn = document.querySelector(
      '.expense-cat-pick-item[data-category-id="' + String(defaults.categoryId) + '"]'
    );
    if (pickBtn && categoryIconWrap) {
      var iconEl = pickBtn.querySelector(".sw-category-icon");
      categoryIconWrap.innerHTML = iconEl ? iconEl.outerHTML : PLACEHOLDER_ICON;
    }

    overlay.querySelectorAll(".spb-category-row").forEach(function (row) {
      row.classList.remove("spb-category-row--selected");
    });
    document.querySelectorAll(".expense-cat-pick-item").forEach(function (item) {
      var match =
        String(item.getAttribute("data-category-id")) === String(defaults.categoryId);
      item.classList.toggle("spb-category-item--selected", match);
      if (match) {
        var row = item.closest(".spb-category-row");
        if (row) row.classList.add("spb-category-row--selected");
      }
    });

    return true;
  }

  function clearCategorySelection() {
    var categoryIdInput = document.getElementById("categoryId");
    if (categoryIdInput) categoryIdInput.value = "";

    var categoryLabel = document.getElementById("expenseCategoryLabel");
    if (categoryLabel) {
      categoryLabel.textContent = "Choose category";
      categoryLabel.classList.add("expense-txn__category-value--placeholder");
    }

    var categoryIconWrap = document.getElementById("expenseCategoryIconWrap");
    if (categoryIconWrap) categoryIconWrap.innerHTML = PLACEHOLDER_ICON;

    var categoryOverlayEl = document.getElementById("expenseCategoryOverlay");
    if (categoryOverlayEl) {
      categoryOverlayEl.querySelectorAll(".spb-category-row").forEach(function (row) {
        row.classList.remove("spb-category-row--selected");
      });
    }
    document.querySelectorAll(".expense-cat-pick-item").forEach(function (item) {
      item.classList.remove("spb-category-item--selected");
    });
  }

  function clearFieldErrors() {
    var dateInput = document.getElementById("date");
    var dateError = document.getElementById("dateError");
    if (dateInput) dateInput.classList.remove("expense-date-input--invalid");
    if (dateError) {
      dateError.hidden = true;
      dateError.textContent = "";
    }

    var amountInput = document.getElementById("amount");
    if (amountInput) amountInput.classList.remove("expense-txn__input--invalid");

    var titleInput = document.getElementById("title");
    if (titleInput) titleInput.classList.remove("expense-txn__input--invalid");

    var categoryBtn = document.getElementById("openExpenseCategoryPicker");
    if (categoryBtn) categoryBtn.classList.remove("expense-txn__category-btn--invalid");

    if (window.SwReceiptUpload) {
      var receipt = window.SwReceiptUpload.get("addExpenseReceipt");
      if (receipt) receipt.reset();
    } else {
      var receiptRoot = document.getElementById("addExpenseReceipt");
      if (receiptRoot) {
        var feedback = receiptRoot.querySelector("[data-receipt-feedback]");
        if (feedback) {
          feedback.textContent = "";
          feedback.hidden = true;
          feedback.classList.remove("sw-receipt__feedback--error");
        }
      }
    }
  }

  function applyFieldErrors(fieldErrors) {
    if (!fieldErrors) return;

    if (fieldErrors.amount) {
      var amountInput = document.getElementById("amount");
      if (amountInput) amountInput.classList.add("expense-txn__input--invalid");
    }

    if (fieldErrors.title) {
      var titleInput = document.getElementById("title");
      if (titleInput) titleInput.classList.add("expense-txn__input--invalid");
    }

    var dateMsg = fieldErrors.date || fieldErrors.expense_date;
    if (dateMsg) {
      var dateInput = document.getElementById("date");
      var dateError = document.getElementById("dateError");
      if (dateInput) dateInput.classList.add("expense-date-input--invalid");
      if (dateError) {
        dateError.textContent = dateMsg;
        dateError.hidden = false;
      }
    }

    var categoryMsg = fieldErrors.categoryId || fieldErrors.category_id;
    if (categoryMsg) {
      var categoryBtn = document.getElementById("openExpenseCategoryPicker");
      if (categoryBtn) categoryBtn.classList.add("expense-txn__category-btn--invalid");
    }

    var receiptMsg = fieldErrors.receipt || fieldErrors.expenseImage;
    if (receiptMsg) {
      var receiptRoot = document.getElementById("addExpenseReceipt");
      if (receiptRoot) {
        var feedback = receiptRoot.querySelector("[data-receipt-feedback]");
        if (feedback) {
          feedback.textContent = receiptMsg;
          feedback.hidden = false;
          feedback.classList.add("sw-receipt__feedback--error");
        }
      }
    }
  }

  function resetForm() {
    if (!form) return;
    hideErrors();
    clearFieldErrors();
    form.reset();

    var defaults = getModalDefaults();
    applyDateDefaults(defaults);

    if (!applyCategoryDefaults(defaults)) {
      clearCategorySelection();
    }

    if (window.SwReceiptUpload) {
      var receipt = window.SwReceiptUpload.get("addExpenseReceipt");
      if (receipt) receipt.reset();
    }
  }

  function showModalShell() {
    if (window.SwModalScroll) {
      SwModalScroll.relocate();
    }
    overlay.hidden = false;
    if (window.SwModalScroll) {
      SwModalScroll.onOpen(overlay);
    } else {
      overlay.scrollTop = 0;
    }
  }

  function openModal() {
    resetForm();
    showModalShell();
    var titleInput = document.getElementById("title");
    if (titleInput) {
      window.setTimeout(function () {
        titleInput.focus();
      }, 50);
    }
  }

  function openModalPreservingForm() {
    hideErrors();
    showModalShell();
  }

  function closeModal() {
    overlay.hidden = true;
    if (window.SwModalScroll) {
      SwModalScroll.onClose();
    }
    hideErrors();
    clearFieldErrors();
  }

  function hideErrors() {
    var errBox = document.getElementById("addExpenseFormErrors");
    if (errBox) {
      errBox.hidden = true;
      errBox.innerHTML = "";
    }
  }

  function showFormErrors(message, fieldErrors) {
    hideErrors();
    clearFieldErrors();
    var errBox = document.getElementById("addExpenseFormErrors");
    if (errBox) {
      errBox.hidden = false;
      errBox.textContent =
        message || "Unable to save expense. Please check the form and try again.";
    }
    applyFieldErrors(fieldErrors);
  }

  function setSubmitting(submitting) {
    isSubmitting = submitting;
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.disabled = submitting;
  }

  function validateBeforeSubmit() {
    var categoryIdInput = document.getElementById("categoryId");
    if (!categoryIdInput || !categoryIdInput.value) {
      showFormErrors("Category is missing.", { categoryId: "Category is missing." });
      var openPicker = document.getElementById("openExpenseCategoryPicker");
      if (openPicker) openPicker.click();
      return false;
    }

    var dateInput = document.getElementById("date");
    if (dateInput && !dateInput.value) {
      showFormErrors("Date is required.", { date: "Date is required." });
      dateInput.focus();
      return false;
    }

    return true;
  }

  function submitExpenseForm() {
    if (!form || isSubmitting) return;
    if (!validateBeforeSubmit()) return;

    hideErrors();
    clearFieldErrors();
    setSubmitting(true);

    var formData = new FormData(form);

    fetch(form.action, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
    })
      .then(function (response) {
        return response
          .json()
          .then(function (data) {
            return { response: response, data: data };
          })
          .catch(function () {
            return { response: response, data: null };
          });
      })
      .then(function (result) {
        setSubmitting(false);
        var response = result.response;
        var data = result.data || {};

        if (response.ok && data.success) {
          window.location.href = data.redirectUrl || "/expenses";
          return;
        }

        if (response.status === 401) {
          showFormErrors(
            data.message ||
              data.error ||
              "Session expired. Please log in again.",
            data.fieldErrors
          );
          return;
        }

        showFormErrors(
          data.message ||
            data.error ||
            (data.errors && data.errors[0]) ||
            "Unable to save expense. Please check the form and try again.",
          data.fieldErrors
        );
      })
      .catch(function () {
        setSubmitting(false);
        showFormErrors("Unable to save expense due to a server error.");
      });
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".js-open-add-expense")) return;
    e.preventDefault();
    openModal();
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || overlay.hidden) return;
    if (categoryOverlay && !categoryOverlay.hidden) return;
    closeModal();
  });

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitExpenseForm();
    });
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get("openAdd") === "1") {
    openModal();
    if (window.history.replaceState) {
      var cleanUrl = window.location.pathname;
      var kept = [];
      params.forEach(function (val, key) {
        if (
          key !== "openAdd" &&
          key !== "addExpenseError" &&
          key !== "addExpenseErrorMsg"
        ) {
          kept.push(encodeURIComponent(key) + "=" + encodeURIComponent(val));
        }
      });
      if (kept.length) cleanUrl += "?" + kept.join("&");
      window.history.replaceState({}, "", cleanUrl);
    }
  }

  if (params.get("addExpenseError") === "1" && getModalDefaults()) {
    openModalPreservingForm();
    var fallbackMsg =
      params.get("addExpenseErrorMsg") ||
      "Unable to save expense. Please check the form and try again.";
    try {
      fallbackMsg = decodeURIComponent(fallbackMsg);
    } catch (error) {
      /* keep raw message */
    }
    showFormErrors(fallbackMsg);
    if (window.history.replaceState) {
      var errorCleanUrl = window.location.pathname;
      var errorKept = [];
      params.forEach(function (val, key) {
        if (key !== "addExpenseError" && key !== "addExpenseErrorMsg") {
          errorKept.push(encodeURIComponent(key) + "=" + encodeURIComponent(val));
        }
      });
      if (errorKept.length) errorCleanUrl += "?" + errorKept.join("&");
      window.history.replaceState({}, "", errorCleanUrl);
    }
  }

  window.openAddExpenseModal = openModal;
})();
