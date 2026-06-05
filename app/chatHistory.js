// In-memory FinBot chat history per session (Feature 8)

const sessions = new Map();

function createWelcomeMessage(welcomeText) {
  return { sender: "bot", text: welcomeText };
}

function getChatHistory(sessionId, welcomeText) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, [createWelcomeMessage(welcomeText)]);
  }

  return sessions.get(sessionId);
}

function addChatMessage(sessionId, sender, text, welcomeText) {
  const history = getChatHistory(sessionId, welcomeText);
  history.push({ sender, text });
  return history;
}

function clearChatHistory(sessionId, welcomeText) {
  sessions.set(sessionId, [createWelcomeMessage(welcomeText)]);
  return sessions.get(sessionId);
}

module.exports = {
  getChatHistory,
  addChatMessage,
  clearChatHistory,
};
