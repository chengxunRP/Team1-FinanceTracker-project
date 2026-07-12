// FinBot chat UI — sends user messages to POST /chatbot (JSON), displays Groq or rule-based replies.
(function () {
  var messagesEl = document.getElementById("finbotMessages");
  var inputForm = document.getElementById("finbotChatForm");
  var input = document.getElementById("finbotInput");
  if (!messagesEl || !inputForm || !input) return;

  var sendBtn = inputForm.querySelector(".finbot-send-btn");
  var suggestionForms = document.querySelectorAll(".finbot-suggestions form");
  var clearForm = document.querySelector(".finbot-clear-form");
  var modeStatusEl = document.getElementById("finbotModeStatus");
  var modeNoteEl = document.getElementById("finbotModeNote");
  var pendingController = null;
  var isSubmitting = false;
  var TYPING_ID = "finbotTypingIndicator";

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function applyInlineMarkdown(line) {
    return line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function formatFinBotMarkdown(text) {
    var lines = String(text || "").split("\n");
    var html = [];
    var inList = false;

    lines.forEach(function (line) {
      var trimmed = line.trim();

      if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) {
          html.push('<ul class="finbot-md-list">');
          inList = true;
        }
        html.push(
          "<li>" + applyInlineMarkdown(trimmed.replace(/^[-*]\s+/, "")) + "</li>"
        );
        return;
      }

      if (inList) {
        html.push("</ul>");
        inList = false;
      }

      if (!trimmed) return;
      html.push("<p>" + applyInlineMarkdown(trimmed) + "</p>");
    });

    if (inList) html.push("</ul>");
    return html.join("");
  }

  function formatBotBubbleText(el) {
    if (!el || el.dataset.formatted === "true") return;
    var raw = el.textContent || "";
    if (!raw.trim()) return;
    el.innerHTML = formatFinBotMarkdown(raw);
    el.dataset.formatted = "true";
    el.classList.add("finbot-bubble__text--formatted");
  }

  function formatAllBotMessages(root) {
    var scope = root || messagesEl;
    scope
      .querySelectorAll(
        ".finbot-bubble--assistant:not(.finbot-bubble--welcome):not(.finbot-bubble--typing):not(.finbot-bubble--error) .finbot-bubble__text"
      )
      .forEach(formatBotBubbleText);
  }

  // Add the user's message as a chat bubble on the page before waiting for the server.
  function appendUserBubble(text) {
    var article = document.createElement("article");
    article.className = "finbot-bubble finbot-bubble--user";

    var label = document.createElement("span");
    label.className = "finbot-bubble__label";
    label.textContent = "You";

    var body = document.createElement("div");
    body.className = "finbot-bubble__text";
    body.textContent = text;

    article.appendChild(label);
    article.appendChild(body);
    messagesEl.appendChild(article);
    scrollToBottom();
  }

  // Add FinBot's reply as a chat bubble after the server responds.
  function appendBotBubble(text) {
    var article = document.createElement("article");
    article.className = "finbot-bubble finbot-bubble--assistant";

    var label = document.createElement("span");
    label.className = "finbot-bubble__label";
    label.textContent = "FinBot";

    var body = document.createElement("div");
    body.className = "finbot-bubble__text";
    body.textContent = text;

    article.appendChild(label);
    article.appendChild(body);
    messagesEl.appendChild(article);
    formatBotBubbleText(body);
    scrollToBottom();
  }

  // Show "FinBot is thinking..." while the POST /chatbot request is in progress.
  function showTypingIndicator() {
    removeTypingIndicator();

    var article = document.createElement("article");
    article.className = "finbot-bubble finbot-bubble--assistant finbot-bubble--typing";
    article.id = TYPING_ID;
    article.setAttribute("aria-live", "polite");
    article.setAttribute("aria-busy", "true");

    var label = document.createElement("span");
    label.className = "finbot-bubble__label";
    label.textContent = "FinBot";

    var body = document.createElement("div");
    body.className = "finbot-bubble__text finbot-bubble__text--typing";

    var status = document.createElement("span");
    status.className = "finbot-typing-label";
    status.textContent = "FinBot is thinking...";

    var dots = document.createElement("span");
    dots.className = "finbot-typing-dots";
    dots.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 3; i += 1) {
      dots.appendChild(document.createElement("span"));
    }

    body.appendChild(status);
    body.appendChild(dots);
    article.appendChild(label);
    article.appendChild(body);
    messagesEl.appendChild(article);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    var el = document.getElementById(TYPING_ID);
    if (el) el.remove();
  }

  function showErrorBubble() {
    removeTypingIndicator();

    var article = document.createElement("article");
    article.className = "finbot-bubble finbot-bubble--assistant finbot-bubble--error";

    var label = document.createElement("span");
    label.className = "finbot-bubble__label";
    label.textContent = "FinBot";

    var body = document.createElement("div");
    body.className = "finbot-bubble__text";
    body.textContent =
      "Sorry, I could not process that right now. Please try again.";

    article.appendChild(label);
    article.appendChild(body);
    messagesEl.appendChild(article);
    scrollToBottom();
  }

  function updateModeLabel(modeLabel) {
    var label = String(modeLabel || "").trim();
    if (!label) return;

    if (modeStatusEl) {
      modeStatusEl.textContent = "Online · " + label;
    }
    if (modeNoteEl) {
      modeNoteEl.textContent =
        label === "Groq AI ready"
          ? "Groq AI replies — numbers always come from your MySQL data."
          : "Rule-based replies — add GROQ_API_KEY in app/.env for Groq AI mode.";
    }
  }

  function setLoading(loading) {
    isSubmitting = loading;
    input.disabled = loading;
    sendBtn.disabled = loading;

    if (loading) {
      sendBtn.setAttribute("aria-busy", "true");
      inputForm.classList.add("finbot-input-row--loading");
    } else {
      sendBtn.removeAttribute("aria-busy");
      inputForm.classList.remove("finbot-input-row--loading");
    }

    suggestionForms.forEach(function (form) {
      var btn = form.querySelector("button");
      if (btn) btn.disabled = loading;
    });
  }

  function abortPending() {
    if (pendingController) {
      pendingController.abort();
      pendingController = null;
    }
    removeTypingIndicator();
    isSubmitting = false;
    setLoading(false);
  }

  // Send one FinBot question to the server and display the reply.
  // Validates the text, disables the form to avoid duplicate requests, POSTs JSON
  // to /chatbot, then adds FinBot's reply bubble and re-enables the form.
  // If the request fails, shows a friendly error bubble instead.
  function submitMessage(messageText) {
    if (isSubmitting) return;

    var text = String(messageText || "").trim();
    if (!text) return;

    pendingController = new AbortController();
    setLoading(true);
    showTypingIndicator();

    fetch("/chatbot", {
      method: "POST",
      signal: pendingController.signal,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ message: text }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var err = new Error(data.error || "Request failed");
            err.status = res.status;
            throw err;
          }
          return data;
        });
      })
      .then(function (data) {
        removeTypingIndicator();
        updateModeLabel(data.modeLabel);
        appendBotBubble(data.reply || "");
      })
      .catch(function (err) {
        // Ignore intentional cancels; otherwise show an error bubble to the user.
        if (err && err.name === "AbortError") return;
        showErrorBubble();
      })
      .finally(function () {
        pendingController = null;
        setLoading(false);
        input.focus();
      });
  }

  inputForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (isSubmitting) return;

    var text = input.value.trim();
    if (!text) return;

    input.value = "";
    appendUserBubble(text);
    submitMessage(text);
  });

  suggestionForms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      var btn = form.querySelector('button[name="question"]');
      var question = btn ? String(btn.value || "").trim() : "";
      if (!question) return;

      input.value = "";
      appendUserBubble(question);
      submitMessage(question);
    });
  });

  if (clearForm) {
    clearForm.addEventListener("submit", function () {
      abortPending();
    });
  }

  formatAllBotMessages(messagesEl);
  scrollToBottom();
  input.focus();
})();
