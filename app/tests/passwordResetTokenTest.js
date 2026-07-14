require("../envConfig");

const crypto = require("crypto");
const assert = require("assert");
const { classifyResetTokenRow } = require("../passwordResetTokenHelpers");

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function normalizeRawToken(rawToken) {
  const value = String(rawToken || "").trim();
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch (error) {
    return value;
  }
}

function buildResetPasswordUrl(baseUrl, rawToken) {
  return `${baseUrl.replace(/\/+$/, "")}/reset-password/${encodeURIComponent(rawToken)}`;
}

const rawToken = crypto.randomBytes(32).toString("hex");
const encoded = encodeURIComponent(rawToken);
const normalized = normalizeRawToken(encoded);
const hashA = hashResetToken(rawToken);
const hashB = hashResetToken(normalized);

assert.strictEqual(rawToken.length, 64, "raw token length should be 64");
assert.strictEqual(normalized, rawToken, "encoded token should round-trip");
assert.strictEqual(hashA, hashB, "hash should match after normalization");

const url = buildResetPasswordUrl("https://example.up.railway.app", rawToken);
assert.ok(
  url === `https://example.up.railway.app/reset-password/${rawToken}`,
  "email URL should match GET /reset-password/:token route"
);

// Newly created token row must be valid (used_at NULL, future expiry).
const now = new Date("2026-07-14T09:00:00.000Z");
const expires = new Date("2026-07-14T09:30:00.000Z");
const fresh = classifyResetTokenRow(
  {
    userId: 2,
    usedAt: null,
    expiresAt: expires,
    dbNowUtc: now,
    isNotExpired: 1,
  },
  "railway"
);
assert.strictEqual(fresh.status, "valid", "fresh token must be valid");
assert.strictEqual(fresh.hasUsedAt, false, "fresh token must not be marked used");
assert.strictEqual(fresh.hasExpiresAt, true, "fresh token must have expiry");

// Opening GET does not mutate usedAt — classification alone never marks used.
const afterGetView = classifyResetTokenRow(
  {
    userId: 2,
    usedAt: null,
    expiresAt: expires,
    dbNowUtc: now,
    isNotExpired: 1,
  },
  "railway"
);
assert.strictEqual(afterGetView.status, "valid", "GET view must keep token valid");

const usedRow = classifyResetTokenRow(
  {
    userId: 2,
    usedAt: new Date("2026-07-14T09:05:00.000Z"),
    expiresAt: expires,
    dbNowUtc: now,
    isNotExpired: 1,
  },
  "railway"
);
assert.strictEqual(usedRow.status, "already_used", "token becomes already_used only when usedAt is set");

const expiredRow = classifyResetTokenRow(
  {
    userId: 2,
    usedAt: null,
    expiresAt: new Date("2026-07-14T08:00:00.000Z"),
    dbNowUtc: now,
    isNotExpired: 0,
  },
  "railway"
);
assert.strictEqual(expiredRow.status, "expired", "past expiry must be expired");

const missingExpiry = classifyResetTokenRow(
  {
    userId: 2,
    usedAt: null,
    expiresAt: null,
    dbNowUtc: now,
    isNotExpired: 0,
  },
  "railway"
);
assert.strictEqual(missingExpiry.status, "invalid", "missing expiry must be invalid");

const notFound = classifyResetTokenRow(null, "railway");
assert.strictEqual(notFound.status, "not_found", "missing row must be not_found");

console.log("Password reset token validation checks passed");
console.log("Route design: GET /reset-password/:token");
console.log("Email URL pattern:", "https://<APP_BASE_URL>/reset-password/<rawToken>");
console.log("Fresh token status:", fresh.status);
console.log("After GET status:", afterGetView.status);
console.log("After successful password change status:", usedRow.status);
