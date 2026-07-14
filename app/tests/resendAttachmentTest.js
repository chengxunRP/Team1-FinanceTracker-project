const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  normalizeResendAttachments,
  isRemoteAttachmentPath,
} = require("../emailService");

assert.strictEqual(isRemoteAttachmentPath("https://cdn.example/logo.png"), true);
assert.strictEqual(isRemoteAttachmentPath("http://cdn.example/logo.png"), true);
assert.strictEqual(isRemoteAttachmentPath("/app/public/favicon.svg"), false);
assert.strictEqual(
  isRemoteAttachmentPath("C:\\Team1-FinanceTracker-project\\app\\public\\favicon.svg"),
  false
);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spendwise-email-"));
const localLogoPath = path.join(tempDir, "spendwise-logo.svg");
fs.writeFileSync(localLogoPath, "<svg xmlns='http://www.w3.org/2000/svg'></svg>");

const localAttachments = normalizeResendAttachments([
  {
    filename: "spendwise-icon.svg",
    path: localLogoPath,
    cid: "spendwise-logo",
  },
]);

assert.strictEqual(localAttachments.length, 1);
assert.strictEqual(localAttachments[0].filename, "spendwise-icon.svg");
assert.strictEqual(localAttachments[0].content_id, "spendwise-logo");
assert.ok(localAttachments[0].content, "local file must become Base64 content");
assert.strictEqual(
  localAttachments[0].path,
  undefined,
  "local filesystem path must not be sent as Resend path"
);
assert.ok(
  !String(localAttachments[0].content || "").includes(localLogoPath),
  "attachment payload must not contain filesystem path"
);

const remoteAttachments = normalizeResendAttachments([
  {
    filename: "remote-logo.png",
    path: "https://example.com/logo.png",
    cid: "remote-logo",
  },
]);
assert.strictEqual(remoteAttachments.length, 1);
assert.strictEqual(remoteAttachments[0].path, "https://example.com/logo.png");
assert.strictEqual(remoteAttachments[0].content, undefined);

const missingAttachments = normalizeResendAttachments([
  {
    filename: "missing-logo.png",
    path: path.join(tempDir, "does-not-exist.png"),
    cid: "missing",
  },
]);
assert.strictEqual(
  missingAttachments.length,
  0,
  "unreadable decorative attachment must be omitted, not fail"
);

// Password-reset emails pass no attachments — ensure empty input stays empty.
assert.deepStrictEqual(normalizeResendAttachments([]), []);
assert.deepStrictEqual(normalizeResendAttachments(undefined), []);

fs.rmSync(tempDir, { recursive: true, force: true });

console.log("Resend attachment normalization checks passed");
console.log("Local logo attachment mode: local Base64");
console.log("Remote logo attachment mode: remote URL");
console.log("Missing decorative logo: omitted safely");
