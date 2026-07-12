// FinBot chat persistence — one session per user in chat_sessions; messages in chat_messages.
// user_id on every query keeps each user's conversation isolated from other accounts.
const db = require("./config/db");
const { getRequestUserId } = require("./requestUserContext");
const { requireUserId } = require("./userScope");

function createWelcomeMessage(welcomeText) {
  return { sender: "bot", text: welcomeText };
}

// Find or create the chat_sessions row owned by the logged-in user.
// Every conversation is linked with user_id so different users never share history.
async function getOrCreateSession(sessionId) {
  const userId = getRequestUserId() || requireUserId();

  const [existingByUser] = await db.query(
    "SELECT id FROM chat_sessions WHERE user_id = ? LIMIT 1",
    [userId]
  );

  if (existingByUser.length) {
    return existingByUser[0].id;
  }

  const stableSessionId = `user-${userId}`;
  const [result] = await db.query(
    "INSERT INTO chat_sessions (session_id, user_id) VALUES (?, ?)",
    [stableSessionId, userId]
  );
  return result.insertId;
}

// Load this user's messages from chat_messages (oldest to newest).
// Recent history lets FinBot understand follow-up questions. If the chat is empty,
// inserts the welcome message first so the page always has a starting bot line.
async function getChatHistory(sessionId, welcomeText) {
  const dbSessionId = await getOrCreateSession(sessionId);

  const [rows] = await db.query(
    `SELECT sender, message_text AS text
    FROM chat_messages
    WHERE session_id = ?
    ORDER BY created_at ASC, id ASC`,
    [dbSessionId]
  );

  if (rows.length) {
    return rows.map((row) => ({ sender: row.sender, text: row.text }));
  }

  const welcome = createWelcomeMessage(welcomeText);
  await db.query(
    "INSERT INTO chat_messages (session_id, sender, message_text) VALUES (?, ?, ?)",
    [dbSessionId, welcome.sender, welcome.text]
  );

  return [welcome];
}

// Save one user or FinBot message into chat_messages for this logged-in user.
// Stored messages are loaded again on the next question so follow-ups work.
async function addChatMessage(sessionId, sender, text, welcomeText) {
  const dbSessionId = await getOrCreateSession(sessionId);

  const [countRows] = await db.query(
    "SELECT COUNT(*) AS count FROM chat_messages WHERE session_id = ?",
    [dbSessionId]
  );

  if (Number(countRows[0].count) === 0) {
    const welcome = createWelcomeMessage(welcomeText);
    await db.query(
      "INSERT INTO chat_messages (session_id, sender, message_text) VALUES (?, ?, ?)",
      [dbSessionId, welcome.sender, welcome.text]
    );
  }

  await db.query(
    "INSERT INTO chat_messages (session_id, sender, message_text) VALUES (?, ?, ?)",
    [dbSessionId, sender, text]
  );

  return getChatHistory(sessionId, welcomeText);
}

// Delete chat_messages for the current user only, then insert a fresh welcome message.
// Other users' chat history is not affected because the session is tied to user_id.
async function clearChatHistory(sessionId, welcomeText) {
  const dbSessionId = await getOrCreateSession(sessionId);

  await db.query("DELETE FROM chat_messages WHERE session_id = ?", [dbSessionId]);

  const welcome = createWelcomeMessage(welcomeText);
  await db.query(
    "INSERT INTO chat_messages (session_id, sender, message_text) VALUES (?, ?, ?)",
    [dbSessionId, welcome.sender, welcome.text]
  );

  return [welcome];
}

module.exports = {
  getChatHistory,
  addChatMessage,
  clearChatHistory,
};
