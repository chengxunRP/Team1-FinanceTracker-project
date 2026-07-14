require("../envConfig");

const crypto = require("crypto");
const db = require("../config/db");
const { classifyResetTokenRow } = require("../passwordResetTokenHelpers");

async function main() {
  const conn = await db.getConnection();
  try {
    const [users] = await conn.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    if (!users.length) throw new Error("No users in local DB");
    const userId = users[0].id;
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const minutes = 30;

    await conn.beginTransaction();
    await conn.query(
      "UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL",
      [userId]
    );
    const [ins] = await conn.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at, created_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), NULL, UTC_TIMESTAMP())`,
      [userId, tokenHash, minutes]
    );
    await conn.query(
      `UPDATE password_reset_tokens
       SET used_at = NULL,
           expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
       WHERE id = ?`,
      [minutes, ins.insertId]
    );
    await conn.commit();

    async function lookup() {
      const [rows] = await conn.query(
        `SELECT user_id AS userId,
                used_at AS usedAt,
                expires_at AS expiresAt,
                UTC_TIMESTAMP() AS dbNowUtc,
                (expires_at IS NOT NULL AND expires_at > UTC_TIMESTAMP()) AS isNotExpired
         FROM password_reset_tokens
         WHERE token_hash = ?
         LIMIT 1`,
        [tokenHash]
      );
      return classifyResetTokenRow(rows[0], process.env.DB_NAME);
    }

    const fresh = await lookup();
    if (fresh.status !== "valid") throw new Error("Expected valid, got " + fresh.status);

    const afterGet = await lookup();
    if (afterGet.status !== "valid") throw new Error("GET mutated token status to " + afterGet.status);
    if (afterGet.hasUsedAt) throw new Error("GET set usedAt");

    await conn.query("UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?", [
      ins.insertId,
    ]);
    const afterPost = await lookup();
    if (afterPost.status !== "already_used") {
      throw new Error("Expected already_used after POST, got " + afterPost.status);
    }

    console.log(
      JSON.stringify({
        ok: true,
        userId,
        insertId: ins.insertId,
        fresh: fresh.status,
        afterGet: afterGet.status,
        afterPost: afterPost.status,
        hasUsedAtFresh: fresh.hasUsedAt,
        hasExpiresAtFresh: fresh.hasExpiresAt,
      })
    );
  } finally {
    conn.release();
    await db.end();
  }
}

main().catch((err) => {
  console.error("INTEGRATION_FAIL", err.message);
  process.exit(1);
});
