// Session cookie for in-memory FinBot chat history (Feature 8)

const crypto = require("crypto");

const COOKIE_NAME = "finbotSession";

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};

  header.split(";").forEach((part) => {
    const pieces = part.split("=");
    const key = pieces[0];

    if (!key) {
      return;
    }

    cookies[key.trim()] = decodeURIComponent(pieces.slice(1).join("=").trim());
  });

  return cookies;
}

function getSessionId(req, res) {
  const cookies = parseCookies(req);

  if (cookies[COOKIE_NAME]) {
    return cookies[COOKIE_NAME];
  }

  const id = crypto.randomUUID();
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${id}; Path=/; HttpOnly; SameSite=Lax`
  );

  return id;
}

module.exports = {
  getSessionId,
};
