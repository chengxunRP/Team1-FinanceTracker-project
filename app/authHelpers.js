const { getRequestUserId } = require("./requestUserContext");

const REGISTRATION_PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include at least 1 letter and 1 number.";

function validateRegistrationPassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    return { valid: false, message: REGISTRATION_PASSWORD_MESSAGE };
  }
  if (!/[A-Za-z]/.test(value)) {
    return { valid: false, message: REGISTRATION_PASSWORD_MESSAGE };
  }
  if (!/\d/.test(value)) {
    return { valid: false, message: REGISTRATION_PASSWORD_MESSAGE };
  }
  return { valid: true, message: "" };
}

function getCurrentUserId(req) {
  if (req && req.session && req.session.userId) {
    return req.session.userId;
  }
  return getRequestUserId();
}

function requireLogin(req, res, next) {
  const currentUserId = getCurrentUserId(req);
  if (!currentUserId) {
    const wantsJson =
      req.xhr ||
      (req.get("Accept") || "").includes("application/json") ||
      (req.get("Content-Type") || "").includes("application/json");
    if (wantsJson) {
      return res.status(401).json({ error: "Login required." });
    }
    return res.redirect("/login");
  }
  next();
}

module.exports = {
  getCurrentUserId,
  requireLogin,
  validateRegistrationPassword,
  REGISTRATION_PASSWORD_MESSAGE,
};
