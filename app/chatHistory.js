// FinBot chat history stored in MySQL (chat_sessions + chat_messages)

const db = require("./config/db");

function createWelcomeMessage(welcomeText) {
  return { sender: "bot", text: welcomeText };
}

async function getOrCreateSession(sessionId) {
  const [existing] = await db.query(
    "SELECT id FROM chat_sessions WHERE session_id = ? LIMIT 1",
    [sessionId]
  );

  if (existing.length) {
    return existing[0].id;
  }

  const [result] = await db.query(
    "INSERT INTO chat_sessions (session_id) VALUES (?)",
    [sessionId]
  );

  return result.insertId;
}

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
