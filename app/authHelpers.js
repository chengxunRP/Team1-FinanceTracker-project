const { getRequestUserId } = require("./requestUserContext");

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
};
