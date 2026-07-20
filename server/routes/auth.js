const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { requireAuth, setAuthCookie, clearAuthCookie } = require("../middleware/auth");
const { sendVerificationEmail } = require("../lib/email");
const { buildGoogleAuthUrl, exchangeCodeForTokens, getGoogleUserInfo, randomState, isConfigured: googleConfigured } = require("../lib/google");

const router = express.Router();
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    currencyCode: row.currency_code,
    currencySymbol: row.currency_symbol,
    emailVerified: row.email_verified,
    hasPassword: Boolean(row.password_hash),
  };
}

function newVerificationToken() {
  return {
    token: crypto.randomBytes(24).toString("hex"),
    expires: new Date(Date.now() + VERIFICATION_TTL_MS),
  };
}

/* ---------------------------------- email + password ---------------------------------- */

router.post("/signup", async (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Вкажіть email і пароль (мінімум 6 символів)." });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "Користувач з таким email вже існує." });
  }
  const hash = await bcrypt.hash(password, 10);
  const { token, expires } = newVerificationToken();
  const result = await query(
    `INSERT INTO users (email, password_hash, display_name, verification_token, verification_token_expires)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [normalizedEmail, hash, displayName || null, token, expires]
  );
  const user = result.rows[0];
  setAuthCookie(res, user.id);
  console.log(`[auth] signup success: "${normalizedEmail}" (id ${user.id})`);
  sendVerificationEmail(user.email, token).catch((e) => console.error("[email] send failed:", e.message));
  res.json({ user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Вкажіть email і пароль." });
  const normalizedEmail = String(email).trim().toLowerCase();
  const result = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
  const user = result.rows[0];
  if (!user) {
    console.warn(`[auth] login failed — no account for email: "${normalizedEmail}"`);
    return res.status(401).json({ error: "Невірний email або пароль." });
  }
  if (!user.password_hash) {
    console.warn(`[auth] login failed — account is Google-only: "${normalizedEmail}"`);
    return res.status(401).json({ error: "Цей акаунт зареєстрований через Google. Увійдіть кнопкою «Google» нижче." });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    console.warn(`[auth] login failed — password mismatch for: "${normalizedEmail}" (length received: ${password.length})`);
    return res.status(401).json({ error: "Невірний email або пароль." });
  }
  console.log(`[auth] login success: "${normalizedEmail}"`);
  setAuthCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await query("SELECT * FROM users WHERE id = $1", [req.userId]);
  if (!result.rows[0]) return res.status(401).json({ error: "not_authenticated" });
  res.json({ user: publicUser(result.rows[0]) });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { displayName, currencyCode, currencySymbol } = req.body || {};
  const result = await query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       currency_code = COALESCE($2, currency_code),
       currency_symbol = COALESCE($3, currency_symbol)
     WHERE id = $4 RETURNING *`,
    [displayName ?? null, currencyCode ?? null, currencySymbol ?? null, req.userId]
  );
  res.json({ user: publicUser(result.rows[0]) });
});

/* ---------------------------------- email verification ---------------------------------- */

router.get("/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect("/?verify=invalid");
  const result = await query("SELECT * FROM users WHERE verification_token = $1", [token]);
  const user = result.rows[0];
  if (!user) return res.redirect("/?verify=invalid");
  if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
    return res.redirect("/?verify=expired");
  }
  await query(
    "UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = $1",
    [user.id]
  );
  res.redirect("/?verify=success");
});

router.post("/resend-verification", requireAuth, async (req, res) => {
  const result = await query("SELECT * FROM users WHERE id = $1", [req.userId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: "not_found" });
  if (user.email_verified) return res.json({ ok: true, alreadyVerified: true });
  const { token, expires } = newVerificationToken();
  await query("UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3", [token, expires, user.id]);
  try {
    await sendVerificationEmail(user.email, token);
  } catch (e) {
    console.error("[email] resend failed:", e.message);
    return res.status(500).json({ error: "Не вдалося надіслати лист. Спробуйте пізніше." });
  }
  res.json({ ok: true });
});

/* ---------------------------------- Google OAuth ---------------------------------- */

router.get("/google", (req, res) => {
  if (!googleConfigured()) {
    return res.status(500).send("Вхід через Google ще не налаштований на сервері.");
  }
  const state = randomState();
  res.cookie("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(buildGoogleAuthUrl(state));
});

router.get("/google/callback", async (req, res) => {
  const cookieState = req.cookies?.oauth_state;
  res.clearCookie("oauth_state");
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== cookieState) {
      return res.redirect("/?auth_error=google_state");
    }
    const tokens = await exchangeCodeForTokens(code);
    const info = await getGoogleUserInfo(tokens.access_token);
    const email = String(info.email || "").toLowerCase();
    if (!email) return res.redirect("/?auth_error=google_email");

    const existing = await query("SELECT * FROM users WHERE google_id = $1 OR email = $2", [info.sub, email]);
    let user = existing.rows[0];

    if (user) {
      if (!user.google_id) {
        const upd = await query(
          "UPDATE users SET google_id = $1, email_verified = true WHERE id = $2 RETURNING *",
          [info.sub, user.id]
        );
        user = upd.rows[0];
      }
    } else {
      const inserted = await query(
        `INSERT INTO users (email, password_hash, display_name, google_id, email_verified)
         VALUES ($1, NULL, $2, $3, true) RETURNING *`,
        [email, info.name || null, info.sub]
      );
      user = inserted.rows[0];
    }

    setAuthCookie(res, user.id);
    res.redirect("/");
  } catch (e) {
    console.error("[google] login failed:", e.message);
    res.redirect("/?auth_error=google");
  }
});

module.exports = router;
