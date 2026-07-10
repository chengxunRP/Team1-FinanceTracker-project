(function () {
  "use strict";

  function getListRows(listEl) {
    if (!listEl) return [];
    return Array.prototype.slice.call(listEl.querySelectorAll(":scope > li"));
  }

  function stampListOrder(listEl) {
    if (!listEl || listEl.getAttribute("data-order-stamped") === "1") return;
    var rows = getListRows(listEl);
    for (var i = 0; i < rows.length; i++) {
      rows[i].setAttribute("data-sort-order", String(i));
    }
    listEl.setAttribute("data-order-stamped", "1");
  }

  function restoreListOrder(listEl) {
    if (!listEl) return;
    var rows = getListRows(listEl);
    if (!rows.length) return;
    rows.sort(function (a, b) {
      return (
        Number(a.getAttribute("data-sort-order") || 0) -
        Number(b.getAttribute("data-sort-order") || 0)
      );
    });
    for (var i = 0; i < rows.length; i++) {
      listEl.appendChild(rows[i]);
    }
  }

  function stampPickerOrders(listIds) {
    if (!listIds) return;
    for (var i = 0; i < listIds.length; i++) {
      stampListOrder(document.getElementById(listIds[i]));
    }
  }

  function restorePickerOrders(listIds) {
    if (!listIds) return;
    for (var i = 0; i < listIds.length; i++) {
      restoreListOrder(document.getElementById(listIds[i]));
    }
  }

  function highlightSelected(overlay, categoryId, pickSelector) {
    if (!overlay) return;
    var id = String(categoryId || "");
    var rows = overlay.querySelectorAll(".spb-category-row");
    for (var r = 0; r < rows.length; r++) {
      rows[r].classList.remove("spb-category-row--selected");
    }
    var items = overlay.querySelectorAll(pickSelector);
    for (var i = 0; i < items.length; i++) {
      var match =
        id !== "" &&
        String(items[i].getAttribute("data-category-id")) === id;
      items[i].classList.toggle("spb-category-item--selected", match);
      if (match) {
        var row = items[i].closest(".spb-category-row");
        if (row) row.classList.add("spb-category-row--selected");
      }
    }
  }

  function findCategoryRow(overlay, categoryId, pickSelector) {
    if (!overlay) return null;
    var id = String(categoryId || "");
    if (!id) return null;
    var items = overlay.querySelectorAll(pickSelector);
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].getAttribute("data-category-id")) === id) {
        return items[i].closest("li");
      }
    }
    return null;
  }

  function updatePinnedCurrent(overlay, categoryId, config) {
    var section = document.getElementById(config.currentSectionId);
    var currentList = document.getElementById(config.currentListId);
    if (!section || !currentList) return;

    currentList.innerHTML = "";
    if (!categoryId) {
      section.hidden = true;
      return;
    }

    var sourceRow = findCategoryRow(overlay, categoryId, config.pickSelector);
    if (!sourceRow) {
      section.hidden = true;
      return;
    }

    var clone = sourceRow.cloneNode(true);
    clone.classList.add("sw-cat-picker-current-row");
    clone.removeAttribute("hidden");
    currentList.appendChild(clone);
    section.hidden = false;
  }

  function applyPickerState(overlay, categoryId, config) {
    restorePickerOrders(config.listIds);
    updatePinnedCurrent(overlay, categoryId, config);
    highlightSelected(overlay, categoryId, config.pickSelector);
  }

  function clearPinnedCurrent(config) {
    var section = document.getElementById(config.currentSectionId);
    var currentList = document.getElementById(config.currentListId);
    if (currentList) currentList.innerHTML = "";
    if (section) section.hidden = true;
  }

  function onPickerClose(overlay, config) {
    clearPinnedCurrent(config);
    restorePickerOrders(config.listIds);
  }

  function filterPinnedCurrent(query, config) {
    var section = document.getElementById(config.currentSectionId);
    var currentList = document.getElementById(config.currentListId);
    if (!section || !currentList || section.hidden) return;

    var q = String(query || "").trim().toLowerCase();
    var row = currentList.querySelector("li");
    if (!row) {
      section.hidden = true;
      return;
    }

    var btn = row.querySelector(config.pickSelector);
    var name = btn
      ? (btn.getAttribute("data-category-name") || "").toLowerCase()
      : "";
    var show = !q || name.indexOf(q) !== -1;
    section.hidden = !show;
  }

  window.SwCategoryPickerHelpers = {
    stampPickerOrders: stampPickerOrders,
    restorePickerOrders: restorePickerOrders,
    highlightSelected: highlightSelected,
    applyPickerState: applyPickerState,
    onPickerClose: onPickerClose,
    filterPinnedCurrent: filterPinnedCurrent,
    findCategoryRow: findCategoryRow,
  };
})();
