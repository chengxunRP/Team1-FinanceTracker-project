// Shared email delivery: Resend (production) with optional SMTP fallback for local dev.
require("./envConfig");

let resendClient = null;
let smtpTransporter = null;

function trimEnv(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasResendConfig() {
  return Boolean(trimEnv(process.env.RESEND_API_KEY));
}

function hasSmtpConfig() {
  return Boolean(trimEnv(process.env.SMTP_HOST));
}

function getEmailProvider() {
  if (hasResendConfig()) return "resend";
  if (hasSmtpConfig()) return "smtp";
  return null;
}

function getResendClient() {
  if (!hasResendConfig()) return null;
  if (!resendClient) {
    const { Resend } = require("resend");
    resendClient = new Resend(trimEnv(process.env.RESEND_API_KEY));
  }
  return resendClient;
}

function getSmtpTransporter() {
  if (!hasSmtpConfig()) return null;
  if (smtpTransporter) return smtpTransporter;

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    console.warn("[Email] nodemailer is not installed; SMTP fallback is unavailable.");
    return null;
  }

  smtpTransporter = nodemailer.createTransport({
    host: trimEnv(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: trimEnv(process.env.SMTP_USER)
      ? {
          user: trimEnv(process.env.SMTP_USER),
          pass: process.env.SMTP_PASS || "",
        }
      : undefined,
  });

  return smtpTransporter;
}

function getFromAddress(provider) {
  if (provider === "resend") {
    return trimEnv(process.env.EMAIL_FROM);
  }
  return (
    trimEnv(process.env.SMTP_FROM) ||
    trimEnv(process.env.SMTP_USER) ||
    "noreply@spendwise.local"
  );
}

function normalizeResendAttachments(attachments = []) {
  return attachments.map((attachment) => {
    const item = {
      filename: attachment.filename,
      content_id: attachment.cid,
    };
    if (attachment.path) item.path = attachment.path;
    if (attachment.content) item.content = attachment.content;
    if (attachment.content_type) item.content_type = attachment.content_type;
    return item;
  });
}

function logProviderError(provider, error) {
  console.error("[Email] provider error:", {
    provider: provider === "resend" ? "Resend" : "SMTP",
    code: error.code || error.name || null,
    message: error.message || String(error),
    statusCode: error.statusCode || null,
  });
}

/**
 * Send an email via Resend (preferred) or SMTP fallback.
 * @param {{ to: string, subject: string, html: string, text: string, attachments?: Array }} options
 * @returns {Promise<{ provider: string, messageId: string|null }>}
 */
async function sendEmail({ to, subject, html, text, attachments }) {
  const provider = getEmailProvider();
  if (!provider) {
    const error = new Error("No email provider configured");
    error.code = "EMAIL_PROVIDER_MISSING";
    throw error;
  }

  console.log(
    `[Email] provider selected: ${provider === "resend" ? "Resend" : "SMTP"}`
  );

  const from = getFromAddress(provider);
  if (!from) {
    const error = new Error(
      provider === "resend"
        ? "EMAIL_FROM is not configured"
        : "SMTP_FROM or SMTP_USER is not configured"
    );
    error.code = "EMAIL_FROM_MISSING";
    throw error;
  }

  if (provider === "resend") {
    const resend = getResendClient();
    const payload = {
      from,
      to,
      subject,
      html,
      text,
    };

    if (attachments && attachments.length) {
      payload.attachments = normalizeResendAttachments(attachments);
    }

    const result = await resend.emails.send(payload);
    if (result.error) {
      const error = new Error(result.error.message || "Resend send failed");
      error.code = result.error.name || "RESEND_ERROR";
      error.statusCode = result.error.statusCode;
      logProviderError("resend", error);
      throw error;
    }

    return {
      provider: "resend",
      messageId: result.data && result.data.id ? result.data.id : null,
    };
  }

  const mailer = getSmtpTransporter();
  if (!mailer) {
    const error = new Error("SMTP transporter is not available");
    error.code = "SMTP_UNAVAILABLE";
    throw error;
  }

  try {
    const info = await mailer.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments: attachments || [],
    });

    return {
      provider: "smtp",
      messageId: info.messageId || null,
    };
  } catch (error) {
    logProviderError("smtp", error);
    throw error;
  }
}

function isEmailConfigured() {
  return Boolean(getEmailProvider());
}

function getEmailConfigFlags() {
  return {
    provider: getEmailProvider(),
    hasResendApiKey: hasResendConfig(),
    hasEmailFrom: Boolean(trimEnv(process.env.EMAIL_FROM)),
    hasSmtpHost: hasSmtpConfig(),
    hasSmtpUser: Boolean(trimEnv(process.env.SMTP_USER)),
    hasSmtpPass: Boolean(process.env.SMTP_PASS),
    hasSmtpFrom: Boolean(trimEnv(process.env.SMTP_FROM) || trimEnv(process.env.SMTP_USER)),
  };
}

module.exports = {
  sendEmail,
  getEmailProvider,
  hasResendConfig,
  hasSmtpConfig,
  isEmailConfigured,
  getEmailConfigFlags,
};
