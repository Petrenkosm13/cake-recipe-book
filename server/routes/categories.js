const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const shape = (r) => ({ id: r.id, name: r.name });

router.get("/", async (req, res) => {
  const result = await query("SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC", [req.userId]);
  res.json({ categories: result.rows.map(shape) });
});

router.post("/", async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Назва категорії обов'язкова." });
  const result = await query(
    "INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING *",
    [req.userId, name.trim()]
  );
  res.json({ category: shape(result.rows[0]) });
});

router.patch("/:id", async (req, res) => {
  const { name } = req.body || {};
  const result = await query(
    "UPDATE categories SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
    [name, req.params.id, req.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "not_found" });
  res.json({ category: shape(result.rows[0]) });
});

router.delete("/:id", async (req, res) => {
  await query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  res.json({ ok: true });
});

module.exports = router;
