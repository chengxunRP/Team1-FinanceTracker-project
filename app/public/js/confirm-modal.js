(function () {
  "use strict";

  var overlay = document.getElementById("swConfirmOverlay");
  if (!overlay) return;

  var titleEl = document.getElementById("swConfirmTitle");
  var messageEl = document.getElementById("swConfirmMessage");
  var cancelBtn = document.getElementById("swConfirmCancel");
  var actionBtn = document.getElementById("swConfirmAction");
  var activeResolver = null;
  var previousFocus = null;

  function closeModal(result) {
    overlay.hidden = true;
    document.body.classList.remove("sw-confirm-open");
    var resolver = activeResolver;
    activeResolver = null;
    if (resolver) resolver(!!result);
    if (previousFocus && typeof previousFocus.focus === "function") {
      try {
        previousFocus.focus();
      } catch (e) {
        /* ignore */
      }
    }
    previousFocus = null;
  }

  function openModal(options) {
    options = options || {};
    var title = options.title || "Are you sure?";
    var message = options.message || "This cannot be undone.";
    var actionText = options.actionText || "Delete";
    var type = options.type || "danger";

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (actionBtn) {
      actionBtn.textContent = actionText;
      actionBtn.classList.remove("sw-confirm__action--danger", "sw-confirm__action--warning");
      actionBtn.classList.add(
        type === "warning" ? "sw-confirm__action--warning" : "sw-confirm__action--danger"
      );
    }

    previousFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("sw-confirm-open");
    if (actionBtn) actionBtn.focus();
  }

  function ask(options) {
    return new Promise(function (resolve) {
      if (activeResolver) {
        activeResolver(false);
        activeResolver = null;
      }
      activeResolver = resolve;
      openModal(options);
    });
  }

  function readFormOptions(form) {
    return {
      title: form.getAttribute("data-confirm-title") || "Are you sure?",
      message: form.getAttribute("data-confirm-message") || "This cannot be undone.",
      actionText: form.getAttribute("data-confirm-action-text") || "Delete",
      type: form.getAttribute("data-confirm-type") || "danger",
    };
  }

  function submitFormAfterConfirm(form) {
    form.setAttribute("data-confirm-accepted", "1");
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      HTMLFormElement.prototype.submit.call(form);
    }
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      closeModal(false);
    });
  }

  if (actionBtn) {
    actionBtn.addEventListener("click", function () {
      closeModal(true);
    });
  }

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeModal(false);
  });

  document.addEventListener("keydown", function (event) {
    if (overlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeModal(false);
    }
  });

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form || form.tagName !== "FORM") return;
      if (!form.hasAttribute("data-confirm")) return;

      if (form.getAttribute("data-confirm-accepted") === "1") {
        form.removeAttribute("data-confirm-accepted");
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      ask(readFormOptions(form)).then(function (confirmed) {
        if (confirmed) submitFormAfterConfirm(form);
      });
    },
    true
  );

  window.SwConfirm = {
    ask: ask,
  };
})();
