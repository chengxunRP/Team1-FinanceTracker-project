(function (global) {
  "use strict";

  var iconLibrary = null;
  var selectedIconKey = "default-category";
  var pickerBuilt = false;

  function readGlobalLibrary() {
    if (
      global.__SW_ICON_LIBRARY__ &&
      global.__SW_ICON_LIBRARY__.svgs &&
      global.__SW_ICON_LIBRARY__.groups &&
      global.__SW_ICON_LIBRARY__.groups.length
    ) {
      return global.__SW_ICON_LIBRARY__;
    }
    return null;
  }

  function renderIconSvg(key, sizePx) {
    if (!iconLibrary) return "";
    var resolved = iconLibrary.svgs[key] ? key : iconLibrary.defaultKey;
    var paths = iconLibrary.svgs[resolved] || "";
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' +
      sizePx +
      '" height="' +
      sizePx +
      '" fill="none" aria-hidden="true">' +
      paths +
      "</svg>"
    );
  }

  function renderIconHtml(key, sizeClass, sizePx) {
    var resolved = key;
    if (!iconLibrary || !iconLibrary.svgs[key]) {
      resolved = iconLibrary ? iconLibrary.defaultKey : "default-category";
    }
    return (
      '<span class="sw-custom-category-icon sw-custom-category-icon--' +
      sizeClass +
      '" data-icon-key="' +
      resolved +
      '">' +
      renderIconSvg(resolved, sizePx) +
      "</span>"
    );
  }

  function loadLibrary() {
    if (iconLibrary) return Promise.resolve(iconLibrary);

    var globalLib = readGlobalLibrary();
    if (globalLib) {
      iconLibrary = globalLib;
      return Promise.resolve(iconLibrary);
    }

    return fetch("/categories/api/icons")
      .then(function (res) {
        if (!res.ok) throw new Error("Unable to load icons");
        return res.json();
      })
      .then(function (data) {
        iconLibrary = data;
        return data;
      });
  }

  function getSelectedIconKey() {
    return selectedIconKey;
  }

  function setSelectedIconKey(key) {
    if (!iconLibrary) {
      selectedIconKey = key || "default-category";
      return;
    }
    selectedIconKey =
      key && iconLibrary.svgs[key] ? key : iconLibrary.defaultKey;
  }

  function resetSelectedIcon() {
    selectedIconKey = iconLibrary ? iconLibrary.defaultKey : "default-category";
  }

  function updatePreview(previewEl, labelEl) {
    if (!previewEl) return;
    previewEl.innerHTML = renderIconSvg(selectedIconKey, 40);
    if (labelEl) {
      labelEl.textContent = "Choose an icon";
      labelEl.hidden =
        !!iconLibrary && selectedIconKey !== iconLibrary.defaultKey;
    }
  }

  function buildPicker(container, onSelect) {
    if (!container || !iconLibrary) return;
    if (pickerBuilt && container.children.length > 0) return;

    pickerBuilt = true;
    container.innerHTML = "";

    iconLibrary.groups.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "spb-icon-picker__section";

      var heading = document.createElement("h3");
      heading.className = "spb-icon-picker__heading";
      heading.textContent = group.group;
      section.appendChild(heading);

      var grid = document.createElement("div");
      grid.className = "spb-icon-picker__grid";

      group.icons.forEach(function (icon) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "spb-icon-picker__item";
        btn.setAttribute("data-icon-key", icon.key);
        btn.setAttribute("aria-label", icon.label);
        btn.title = icon.label;
        btn.innerHTML = renderIconSvg(icon.key, 28);
        btn.addEventListener("click", function () {
          setSelectedIconKey(icon.key);
          if (typeof onSelect === "function") onSelect(icon.key);
        });
        grid.appendChild(btn);
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function highlightPickerSelection(container) {
    if (!container) return;
    var items = container.querySelectorAll(".spb-icon-picker__item");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var isSelected = item.getAttribute("data-icon-key") === selectedIconKey;
      item.classList.toggle("spb-icon-picker__item--selected", isSelected);
    }
  }

  global.SwCreateCategory = {
    loadLibrary: loadLibrary,
    getSelectedIconKey: getSelectedIconKey,
    setSelectedIconKey: setSelectedIconKey,
    resetSelectedIcon: resetSelectedIcon,
    updatePreview: updatePreview,
    buildPicker: buildPicker,
    highlightPickerSelection: highlightPickerSelection,
    renderIconHtml: renderIconHtml,
  };
})(window);
