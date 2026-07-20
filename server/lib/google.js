const crypto = require("crypto");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "";
const REDIRECT_URI = `${APP_URL}/api/auth/google/callback`;

function buildGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Не вдалося обміняти код Google на токен.");
  return res.json();
}

async function getGoogleUserInfo(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Не вдалося отримати профіль Google.");
  return res.json(); // { sub, email, email_verified, name, picture, ... }
}

const randomState = () => crypto.randomBytes(16).toString("hex");

module.exports = {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  randomState,
  isConfigured: () => Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && APP_URL),
};
