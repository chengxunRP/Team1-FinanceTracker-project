// Loads app/.env before Groq, Resend, or SMTP code runs.
// GROQ_API_KEY, RESEND_API_KEY, EMAIL_FROM, SMTP_*, and APP_BASE_URL must live in .env.
const path = require("path");
const fs = require("fs");

const ENV_PATH = path.resolve(__dirname, ".env");

function trimGroqApiKey() {
  const key = process.env.GROQ_API_KEY;

  if (typeof key === "string") {
    process.env.GROQ_API_KEY = key.replace(/^\uFEFF/, "").trim();
  }
}

function loadEnvFileFromDisk() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  const raw = fs.readFileSync(ENV_PATH, "utf8").replace(/^\uFEFF/, "");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsAt).trim().replace(/^\uFEFF/, "");
    let value = trimmed.slice(equalsAt + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "GROQ_API_KEY") {
      process.env.GROQ_API_KEY = value;
      return;
    }
  }
}

function loadEnvFile() {
  require("dotenv").config({ path: ENV_PATH, override: true, quiet: true });
  trimGroqApiKey();

  if (!process.env.GROQ_API_KEY) {
    loadEnvFileFromDisk();
    trimGroqApiKey();
  }
}

function hasGroqApiKey() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 0);
}

function logGroqKeyStatus() {
  if (hasGroqApiKey()) {
    console.log("Groq API key loaded");
    return;
  }

  console.log("Groq API key missing");

  if (!fs.existsSync(ENV_PATH)) {
    console.log("Create app/.env and add GROQ_API_KEY (see app/.env.example)");
  }
}

loadEnvFile();

module.exports = {
  hasGroqApiKey,
  logGroqKeyStatus,
};
