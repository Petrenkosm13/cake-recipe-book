const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { requireAuth, setAuthCookie, clearAuthCookie } = require("../middleware/auth");

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    currencyCode: row.currency_code,
    currencySymbol: row.currency_symbol,
  };
}

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
  const result = await query(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *`,
    [normalizedEmail, hash, displayName || null]
  );
  const user = result.rows[0];
  setAuthCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Вкажіть email і пароль." });
  const normalizedEmail = String(email).trim().toLowerCase();
  const result = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Невірний email або пароль." });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Невірний email або пароль." });
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

module.exports = router;
