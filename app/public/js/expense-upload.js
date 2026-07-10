(function () {
  "use strict";

  var MAX_BYTES = 2 * 1024 * 1024;
  var ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function validateFile(file) {
    if (!file) return "Please choose a PNG or JPG image.";
    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      return "Only PNG or JPG files are allowed.";
    }
    if (file.size > MAX_BYTES) return "Image must be 2 MB or smaller.";
    return "";
  }

  function askConfirm(options) {
    if (window.SwConfirm && typeof window.SwConfirm.ask === "function") {
      return window.SwConfirm.ask(options);
    }
    return Promise.resolve(
      window.confirm((options && options.message) || "Are you sure?")
    );
  }

  function createController(root) {
    if (!root || root._swReceiptBound) return root._swReceiptController || null;

    var input = qs(root, "[data-receipt-input]");
    var removeInput = qs(root, "[data-receipt-remove]");
    var emptyEl = qs(root, '[data-receipt-state="empty"]');
    var pendingEl = qs(root, '[data-receipt-state="pending"]');
    var savedEl = qs(root, '[data-receipt-state="saved"]');
    var filenameEl = qs(root, "[data-receipt-filename]");
    var previewEl = qs(root, "[data-receipt-preview]");
    var feedbackEl = qs(root, "[data-receipt-feedback]");
    var mode = root.getAttribute("data-receipt-mode") || "form";
    var busy = false;
    var existingPath = root.getAttribute("data-existing-path") || "";

    function getExpenseId() {
      return root.getAttribute("data-expense-id") || "";
    }

    function isRemoved() {
      return removeInput && removeInput.value === "1";
    }

    function setRemoved(flag) {
      if (removeInput) removeInput.value = flag ? "1" : "0";
    }

    function showFeedback(message, isError) {
      if (!feedbackEl) return;
      feedbackEl.textContent = message || "";
      feedbackEl.hidden = !message;
      feedbackEl.classList.toggle("sw-receipt__feedback--error", !!isError);
    }

    function clearFeedback() {
      showFeedback("", false);
    }

    function setState(state) {
      if (emptyEl) emptyEl.hidden = state !== "empty";
      if (pendingEl) pendingEl.hidden = state !== "pending";
      if (savedEl) savedEl.hidden = state !== "saved";
      root.classList.toggle("sw-receipt--saved", state === "saved");
      root.classList.toggle("sw-receipt--pending", state === "pending");
    }

    function refreshState() {
      var file = input && input.files && input.files[0];
      if (file) {
        if (filenameEl) filenameEl.textContent = file.name;
        setState("pending");
        return;
      }
      if (existingPath && !isRemoved()) {
        if (previewEl) {
          previewEl.src = existingPath;
          previewEl.hidden = false;
        }
        setState("saved");
        return;
      }
      if (previewEl) {
        previewEl.removeAttribute("src");
      }
      if (filenameEl) filenameEl.textContent = "";
      setState("empty");
    }

    function clearSelectedFile() {
      if (!input) return;
      input.value = "";
      if (filenameEl) filenameEl.textContent = "";
      clearFeedback();
      refreshState();
      emitPendingChanged();
    }

    function openPicker() {
      if (busy || !input) return;
      input.click();
    }

    function emitPendingChanged() {
      root.dispatchEvent(
        new CustomEvent("sw-receipt-pending-changed", {
          bubbles: true,
          detail: { pending: hasPendingFile() },
        })
      );
    }

    function hasPendingFile() {
      return !!(input && input.files && input.files[0]);
    }

    function uploadSelectedFile(file) {
      var expenseId = getExpenseId();
      if (!expenseId || !file) {
        return Promise.resolve({ imagePath: "", skipped: true });
      }

      var error = validateFile(file);
      if (error) {
        showFeedback(error, true);
        clearSelectedFile();
        return Promise.reject(new Error(error));
      }

      busy = true;
      clearFeedback();
      showFeedback("Uploading…", false);
      root.classList.add("sw-receipt--busy");

      var formData = new FormData();
      formData.append("expenseImage", file);

      return fetch("/expenses/" + encodeURIComponent(expenseId) + "/receipt", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          var contentType = response.headers.get("content-type") || "";
          if (contentType.indexOf("application/json") === -1) {
            throw new Error("Unable to save receipt.");
          }
          return response.json().then(function (data) {
            if (!response.ok || !data.success) {
              throw new Error((data && data.error) || "Unable to save receipt.");
            }
            return data;
          });
        })
        .then(function (data) {
          existingPath = data.imagePath || "";
          root.setAttribute("data-existing-path", existingPath);
          setRemoved(false);
          if (input) input.value = "";
          clearFeedback();
          refreshState();
          emitPendingChanged();
          root.dispatchEvent(
            new CustomEvent("sw-receipt-updated", {
              bubbles: true,
              detail: { imagePath: existingPath, expenseId: expenseId },
            })
          );
          return { imagePath: existingPath, skipped: false };
        })
        .catch(function (err) {
          showFeedback(err.message || "Unable to save receipt.", true);
          // Keep pending filename state so user can retry Save or clear with X.
          if (filenameEl && file && file.name) filenameEl.textContent = file.name;
          setState("pending");
          emitPendingChanged();
          throw err;
        })
        .finally(function () {
          busy = false;
          root.classList.remove("sw-receipt--busy");
        });
    }

    function savePending() {
      if (busy) {
        return Promise.reject(new Error("Receipt upload already in progress."));
      }
      var file = input && input.files && input.files[0];
      if (!file) {
        return Promise.resolve({
          imagePath: existingPath && !isRemoved() ? existingPath : "",
          skipped: true,
        });
      }
      return uploadSelectedFile(file);
    }

    function deleteSavedReceipt() {
      if (busy) return;

      askConfirm({
        title: "Are you sure?",
        message: "Delete this receipt?",
        actionText: "Delete",
        type: "danger",
      }).then(function (confirmed) {
        if (!confirmed) return;

        if (mode === "form") {
          setRemoved(true);
          existingPath = root.getAttribute("data-existing-path") || existingPath;
          if (input) input.value = "";
          clearFeedback();
          refreshState();
          return;
        }

        var expenseId = getExpenseId();
        if (!expenseId) return;

        busy = true;
        root.classList.add("sw-receipt--busy");
        clearFeedback();

        fetch("/expenses/" + encodeURIComponent(expenseId) + "/receipt", {
          method: "DELETE",
          headers: { Accept: "application/json" },
        })
          .then(function (response) {
            var contentType = response.headers.get("content-type") || "";
            if (contentType.indexOf("application/json") === -1) {
              throw new Error("Unable to delete receipt.");
            }
            return response.json().then(function (data) {
              if (!response.ok || !data.success) {
                throw new Error((data && data.error) || "Unable to delete receipt.");
              }
              return data;
            });
          })
          .then(function () {
            existingPath = "";
            root.setAttribute("data-existing-path", "");
            setRemoved(false);
            if (input) input.value = "";
            clearFeedback();
            refreshState();
            root.dispatchEvent(
              new CustomEvent("sw-receipt-updated", {
                bubbles: true,
                detail: { imagePath: "", expenseId: expenseId },
              })
            );
          })
          .catch(function (err) {
            showFeedback(err.message || "Unable to delete receipt.", true);
          })
          .finally(function () {
            busy = false;
            root.classList.remove("sw-receipt--busy");
          });
      });
    }

    root.querySelectorAll("[data-receipt-pick]").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPicker();
      });
    });

    var clearBtn = qs(root, "[data-receipt-clear]");
    if (clearBtn) {
      clearBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        clearSelectedFile();
      });
    }

    var deleteBtn = qs(root, "[data-receipt-delete]");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        deleteSavedReceipt();
      });
    }

    if (input) {
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) {
          refreshState();
          return;
        }

        var error = validateFile(file);
        if (error) {
          showFeedback(error, true);
          clearSelectedFile();
          return;
        }

        clearFeedback();
        setRemoved(false);
        if (filenameEl) filenameEl.textContent = file.name;
        setState("pending");
        emitPendingChanged();
        // Form mode: stay on filename until the parent form is submitted.
        // API mode (transaction popup): upload now, then show saved preview.
        if (mode === "api") {
          uploadSelectedFile(file);
        }
      });
    }

    var controller = {
      refresh: refreshState,
      hasPendingFile: hasPendingFile,
      savePending: savePending,
      setExisting: function (path) {
        existingPath = path || "";
        root.setAttribute("data-existing-path", existingPath);
        setRemoved(false);
        if (input) input.value = "";
        clearFeedback();
        refreshState();
        emitPendingChanged();
      },
      setExpenseId: function (id) {
        if (id) root.setAttribute("data-expense-id", String(id));
        else root.removeAttribute("data-expense-id");
      },
      reset: function () {
        existingPath = "";
        root.setAttribute("data-existing-path", "");
        setRemoved(false);
        if (input) input.value = "";
        clearFeedback();
        refreshState();
        emitPendingChanged();
      },
      getExistingPath: function () {
        return existingPath && !isRemoved() ? existingPath : "";
      },
    };

    root._swReceiptBound = true;
    root._swReceiptController = controller;
    refreshState();
    return controller;
  }

  function init(root) {
    return createController(root);
  }

  function initAll(scope) {
    var nodes = (scope || document).querySelectorAll("[data-receipt-upload]");
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      list.push(init(nodes[i]));
    }
    return list;
  }

  function get(rootOrId) {
    var root =
      typeof rootOrId === "string"
        ? document.getElementById(rootOrId)
        : rootOrId;
    if (!root) return null;
    return root._swReceiptController || init(root);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initAll(document);
  });

  // Also init immediately if DOM is already ready (scripts at end of body).
  if (document.readyState !== "loading") {
    initAll(document);
  }

  window.SwReceiptUpload = {
    init: init,
    initAll: initAll,
    get: get,
  };
})();
