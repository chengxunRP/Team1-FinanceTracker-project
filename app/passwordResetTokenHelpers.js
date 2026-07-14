// Helpers for password-reset token status classification (no secrets in logs).
// Shared by auth routes and local unit tests.

function hasUsableDatetime(value) {
  if (value === null || value === undefined) return false;
  if (value === "" || value === "0000-00-00 00:00:00") return false;
  if (value instanceof Date && Number.isNaN(value.getTime())) return false;
  return true;
}

/**
 * Classify a password_reset_tokens row after hash lookup.
 * Expects aliased fields: userId, usedAt, expiresAt, dbNowUtc.
 */
function classifyResetTokenRow(row, databaseName) {
  if (!row) {
    return {
      status: "not_found",
      database: databaseName,
      hasUsedAt: false,
      hasExpiresAt: false,
    };
  }

  const usedAt = row.usedAt;
  const expiresAt = row.expiresAt;
  const dbNowUtc = row.dbNowUtc;
  const hasUsedAt = hasUsableDatetime(usedAt);
  const hasExpiresAt = hasUsableDatetime(expiresAt);

  if (hasUsedAt) {
    return {
      status: "already_used",
      userId: row.userId,
      database: databaseName,
      hasUsedAt: true,
      hasExpiresAt,
      expiresAt: hasExpiresAt ? expiresAt : null,
      dbNowUtc: hasUsableDatetime(dbNowUtc) ? dbNowUtc : null,
    };
  }

  if (!hasExpiresAt) {
    return {
      status: "invalid",
      userId: row.userId,
      database: databaseName,
      hasUsedAt: false,
      hasExpiresAt: false,
      expiresAt: null,
      dbNowUtc: hasUsableDatetime(dbNowUtc) ? dbNowUtc : null,
    };
  }

  // Prefer SQL-computed flag when present; otherwise compare Date/string values.
  let isExpired = false;
  if (row.isNotExpired === 0 || row.isNotExpired === false || row.isNotExpired === "0") {
    isExpired = true;
  } else if (row.isNotExpired === 1 || row.isNotExpired === true || row.isNotExpired === "1") {
    isExpired = false;
  } else if (hasUsableDatetime(dbNowUtc)) {
    isExpired = new Date(expiresAt).getTime() <= new Date(dbNowUtc).getTime();
  }

  if (isExpired) {
    return {
      status: "expired",
      userId: row.userId,
      database: databaseName,
      hasUsedAt: false,
      hasExpiresAt: true,
      expiresAt,
      dbNowUtc: hasUsableDatetime(dbNowUtc) ? dbNowUtc : null,
    };
  }

  return {
    status: "valid",
    userId: row.userId,
    database: databaseName,
    hasUsedAt: false,
    hasExpiresAt: true,
    expiresAt,
    dbNowUtc: hasUsableDatetime(dbNowUtc) ? dbNowUtc : null,
  };
}

module.exports = {
  hasUsableDatetime,
  classifyResetTokenRow,
};
