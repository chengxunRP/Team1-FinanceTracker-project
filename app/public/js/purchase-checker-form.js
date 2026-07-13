// Purchase Checker form helpers — keep category card + hidden inputs in sync.
// Drafts are not persisted in localStorage.
(function () {
  "use strict";

  var LEGACY_DRAFT_KEY = "spendwise_purchase_checker_draft";

  function clearLegacyDraft() {
    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function getForm() {
    return document.getElementById("spcPurchaseForm");
  }

  function getFields() {
    var form = getForm();
    if (!form) return null;
    return {
      form: form,
      itemName: form.querySelector("#itemName"),
      itemPrice: form.querySelector("#itemPrice"),
      categoryId:
        form.querySelector("#spcCategoryId") ||
        form.querySelector('[name="categoryId"]'),
      categoryValue: form.querySelector("#spcCategoryValue"),
      categoryLabel: form.querySelector("#spcCategoryLabel"),
      categoryIconWrap: form.querySelector("#spcCategoryIconWrap"),
      openBtn: form.querySelector("#openExpenseCategoryPicker"),
      clearBtn: form.querySelector("#spcClearFormBtn"),
    };
  }

  function defaultCategoryIconHtml() {
    return (
      '<span class="sw-category-icon sw-category-icon--sm">' +
      '<span class="sw-category-icon__fallback" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" width="20" height="20">' +
      '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75"/>' +
      '<path d="M8.5 12h7M12 8.5v7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
      "</svg></span></span>"
    );
  }

  function findPickerButton(categoryId) {
    var overlay = document.getElementById("expenseCategoryOverlay");
    if (!overlay || !categoryId) return null;
    return overlay.querySelector(
      '.sw-cat-pick-item[data-category-id="' +
        categoryId +
        '"], .expense-cat-pick-item[data-category-id="' +
        categoryId +
        '"]'
    );
  }

  function applyCategorySelection(categoryId, categoryName) {
    var fields = getFields();
    if (!fields) return;

    var id = categoryId ? String(categoryId) : "";
    var name = categoryName ? String(categoryName) : "";

    if (fields.categoryId) fields.categoryId.value = id;
    if (fields.categoryValue) fields.categoryValue.value = name;

    if (fields.categoryLabel) {
      fields.categoryLabel.textContent = name || "Choose category";
      fields.categoryLabel.classList.toggle(
        "expense-txn__category-value--placeholder",
        !name
      );
    }

    if (fields.categoryIconWrap) {
      if (!id) {
        fields.categoryIconWrap.innerHTML = defaultCategoryIconHtml();
      } else {
        var btn = findPickerButton(id);
        var iconEl = btn ? btn.querySelector(".sw-category-icon") : null;
        fields.categoryIconWrap.innerHTML = iconEl
          ? iconEl.outerHTML
          : defaultCategoryIconHtml();
      }
    }

    if (fields.form) {
      if (id) fields.form.setAttribute("data-selected-category-id", id);
      else fields.form.removeAttribute("data-selected-category-id");
      if (name) fields.form.setAttribute("data-selected-category-name", name);
      else fields.form.removeAttribute("data-selected-category-name");
    }

    if (fields.openBtn) {
      if (id) fields.openBtn.setAttribute("data-selected-category-id", id);
      else fields.openBtn.removeAttribute("data-selected-category-id");
      if (name) fields.openBtn.setAttribute("data-selected-category-name", name);
      else fields.openBtn.removeAttribute("data-selected-category-name");
    }
  }

  function syncFromServerAttributes() {
    var fields = getFields();
    if (!fields || !fields.form) return;
    var id = fields.form.getAttribute("data-selected-category-id") || "";
    var name = fields.form.getAttribute("data-selected-category-name") || "";
    if (!id && !name) return;
    applyCategorySelection(id, name);
  }

  function resetResultPanel() {
    var panel = document.getElementById("spcResultPanel");
    if (!panel) return;
    panel.innerHTML =
      '<div class="spc-empty result-empty">' +
      '<div class="spc-empty-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M16 24h16M24 16v16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      "</div>" +
      "<h3>Your purchase insight appears here</h3>" +
      "<p>Enter an item on the left and tap <strong>Check purchase</strong> to see whether it is safe, risky, or not recommended.</p>" +
      '<ul class="rule-list rule-list--center spc-status-preview">' +
      '<li><span class="pill pill--success">Safe</span></li>' +
      '<li><span class="pill pill--warning">Risky</span></li>' +
      '<li><span class="pill pill--danger">Not recommended</span></li>' +
      "</ul></div>";
  }

  function clearForm() {
    var fields = getFields();
    if (!fields) return;
    if (fields.itemName) fields.itemName.value = "";
    if (fields.itemPrice) fields.itemPrice.value = "";
    applyCategorySelection("", "");
    resetResultPanel();
  }

  document.addEventListener("DOMContentLoaded", function () {
    clearLegacyDraft();

    var fields = getFields();
    if (!fields || !fields.form) return;

    // Re-apply the server-rendered selected category after any browser form restore.
    syncFromServerAttributes();

    document.addEventListener("sw:category-selected", function (e) {
      var detail = (e && e.detail) || {};
      applyCategorySelection(detail.categoryId, detail.categoryName);
    });

    fields.form.addEventListener("submit", function () {
      var latest = getFields();
      if (!latest || !latest.form) return;
      var id = latest.form.getAttribute("data-selected-category-id") || "";
      var name = latest.form.getAttribute("data-selected-category-name") || "";
      if (id && latest.categoryId) latest.categoryId.value = id;
      if (name && latest.categoryValue) latest.categoryValue.value = name;
    });

    if (fields.clearBtn) {
      fields.clearBtn.addEventListener("click", clearForm);
    }
  });
})();
