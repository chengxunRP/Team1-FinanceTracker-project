/**
 * Shared modal scroll lock — companion to modal-shell.css.
 * Call SwModalScroll.onOpen(overlay) when showing a .spb-modal-overlay.
 * Call SwModalScroll.onClose() when hiding one (syncs lock if others remain open).
 */
(function (global) {
  "use strict";

  function hasOpenOverlay() {
    return Boolean(document.querySelector(".spb-modal-overlay:not([hidden])"));
  }

  function relocateOverlaysToBody() {
    document.querySelectorAll(".spb-modal-overlay").forEach(function (overlay) {
      if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }
    });
  }

  function syncBodyScrollLock() {
    var locked = hasOpenOverlay();
    document.documentElement.classList.toggle("modal-open", locked);
    document.body.classList.toggle("modal-open", locked);
  }

  function onOpen(overlay) {
    if (overlay) overlay.scrollTop = 0;
    syncBodyScrollLock();
  }

  function onClose() {
    syncBodyScrollLock();
  }

  function init() {
    relocateOverlaysToBody();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.SwModalScroll = {
    onOpen: onOpen,
    onClose: onClose,
    sync: syncBodyScrollLock,
    relocate: relocateOverlaysToBody,
  };
})(window);
