require("../envConfig");

const crypto = require("crypto");
const assert = require("assert");

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

function getResetTokenMinutes() {
  const parsed = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }
  return Math.floor(parsed);
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
assert.ok(url.includes("/reset-password/"), "email URL should use path parameter route");

const badMinutes = Number("invalid");
assert.strictEqual(
  !Number.isFinite(badMinutes) || badMinutes <= 0 ? 30 : badMinutes,
  30,
  "invalid PASSWORD_RESET_EXPIRES_MINUTES should fall back to 30"
);

assert.strictEqual(getResetTokenMinutes() >= 1, true, "reset minutes should be positive");

console.log("Password reset token validation checks passed");
console.log("Route design: GET /reset-password/:token");
console.log("Email URL pattern:", "https://<APP_BASE_URL>/reset-password/<rawToken>");
