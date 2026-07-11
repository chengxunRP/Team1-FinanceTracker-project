// Purchase Checker form draft — saves item name/price/category in localStorage (not MySQL) until user submits.
(function () {
  "use strict";

  var DRAFT_KEY = "spendwise_purchase_checker_draft";

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function writeDraft(draft) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      /* ignore quota errors */
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function getFields() {
    return {
      form: document.getElementById("spcPurchaseForm"),
      itemName: document.getElementById("itemName"),
      itemPrice: document.getElementById("itemPrice"),
      categoryId: document.getElementById("categoryId"),
      categoryValue: document.getElementById("spcCategoryValue"),
      categoryLabel: document.getElementById("expenseCategoryLabel"),
      categoryIconWrap: document.getElementById("expenseCategoryIconWrap"),
      clearBtn: document.getElementById("spcClearFormBtn"),
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

  function restoreCategoryIcon(categoryId) {
    var fields = getFields();
    if (!fields.categoryIconWrap) return;
    if (!categoryId) {
      fields.categoryIconWrap.innerHTML = defaultCategoryIconHtml();
      return;
    }
    var btn = document.querySelector(
      '.sw-cat-pick-item[data-category-id="' + categoryId + '"], .expense-cat-pick-item[data-category-id="' + categoryId + '"]'
    );
    if (!btn) {
      fields.categoryIconWrap.innerHTML = defaultCategoryIconHtml();
      return;
    }
    var iconEl = btn.querySelector(".sw-category-icon");
    fields.categoryIconWrap.innerHTML = iconEl ? iconEl.outerHTML : defaultCategoryIconHtml();
  }

  function applyCategorySelection(categoryId, categoryName) {
    var fields = getFields();
    if (fields.categoryId) fields.categoryId.value = categoryId || "";
    if (fields.categoryValue) fields.categoryValue.value = categoryName || "";
    if (fields.categoryLabel) {
      fields.categoryLabel.textContent = categoryName || "Choose category";
      fields.categoryLabel.classList.toggle(
        "expense-txn__category-value--placeholder",
        !categoryName
      );
    }
    restoreCategoryIcon(categoryId);
  }

  function collectDraft() {
    var fields = getFields();
    return {
      itemName: fields.itemName ? fields.itemName.value.trim() : "",
      itemPrice: fields.itemPrice ? fields.itemPrice.value : "",
      category: fields.categoryValue ? fields.categoryValue.value.trim() : "",
      categoryId: fields.categoryId ? fields.categoryId.value : "",
    };
  }

  function saveDraftFromForm() {
    writeDraft(collectDraft());
  }

  function applyDraft(draft) {
    if (!draft) return;
    var fields = getFields();
    if (fields.itemName && draft.itemName) fields.itemName.value = draft.itemName;
    if (fields.itemPrice && draft.itemPrice !== undefined && draft.itemPrice !== "") {
      fields.itemPrice.value = draft.itemPrice;
    }
    applyCategorySelection(draft.categoryId || "", draft.category || "");
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
    if (fields.itemName) fields.itemName.value = "";
    if (fields.itemPrice) fields.itemPrice.value = "";
    applyCategorySelection("", "");
    clearDraft();
    resetResultPanel();
  }

  function hasServerPrefill(fields) {
    return Boolean(
      (fields.itemName && fields.itemName.value.trim()) ||
        (fields.itemPrice && String(fields.itemPrice.value).trim()) ||
        (fields.categoryValue && fields.categoryValue.value.trim())
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var fields = getFields();
    if (!fields.form) return;

    if (hasServerPrefill(fields)) {
      saveDraftFromForm();
    } else {
      applyDraft(readDraft());
    }

    if (fields.itemName) {
      fields.itemName.addEventListener("input", saveDraftFromForm);
    }
    if (fields.itemPrice) {
      fields.itemPrice.addEventListener("input", saveDraftFromForm);
    }

    document.addEventListener("sw:category-selected", function (e) {
      var detail = (e && e.detail) || {};
      applyCategorySelection(detail.categoryId, detail.categoryName);
      saveDraftFromForm();
    });

    if (fields.clearBtn) {
      fields.clearBtn.addEventListener("click", clearForm);
    }

    fields.form.addEventListener("submit", function () {
      saveDraftFromForm();
    });
  });
})();
