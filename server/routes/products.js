const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const shape = (r) => ({
  id: r.id,
  name: r.name,
  photo: r.photo,
  icon: r.icon,
  unitType: r.unit_type,
  packageAmount: Number(r.package_amount),
  packageUnit: r.package_unit,
  price: Number(r.price),
});
const historyShape = (r) => ({
  date: r.recorded_at,
  packageAmount: Number(r.package_amount),
  packageUnit: r.package_unit,
  price: Number(r.price),
});

router.get("/", async (req, res) => {
  const result = await query("SELECT * FROM products WHERE user_id = $1 ORDER BY name ASC", [req.userId]);
  console.log(`[data] GET /products — user_id=${req.userId} rows=${result.rows.length}`);
  res.json({ products: result.rows.map(shape) });
});

router.get("/:id/history", async (req, res) => {
  const owns = await query("SELECT id FROM products WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  if (!owns.rows[0]) return res.status(404).json({ error: "not_found" });
  const result = await query(
    "SELECT * FROM product_price_history WHERE product_id = $1 ORDER BY recorded_at ASC",
    [req.params.id]
  );
  res.json({ history: result.rows.map(historyShape) });
});

router.post("/", async (req, res) => {
  const { name, photo, icon, unitType, packageAmount, packageUnit, price } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Назва продукту обов'язкова." });
  const result = await query(
    `INSERT INTO products (user_id, name, photo, icon, unit_type, package_amount, package_unit, price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.userId, name.trim(), photo || null, icon || null, unitType || "weight", packageAmount || 1, packageUnit || "kg", price || 0]
  );
  const product = result.rows[0];
  await query(
    `INSERT INTO product_price_history (product_id, package_amount, package_unit, price) VALUES ($1,$2,$3,$4)`,
    [product.id, product.package_amount, product.package_unit, product.price]
  );
  res.json({ product: shape(product) });
});

router.patch("/:id", async (req, res) => {
  const { name, photo, icon, unitType, packageAmount, packageUnit, price } = req.body || {};
  const existing = await query("SELECT * FROM products WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const prev = existing.rows[0];

  const result = await query(
    `UPDATE products SET
       name = COALESCE($1, name),
       photo = $2,
       icon = COALESCE($3, icon),
       unit_type = COALESCE($4, unit_type),
       package_amount = COALESCE($5, package_amount),
       package_unit = COALESCE($6, package_unit),
       price = COALESCE($7, price),
       updated_at = now()
     WHERE id = $8 AND user_id = $9 RETURNING *`,
    [name ?? null, photo ?? prev.photo, icon ?? null, unitType ?? null, packageAmount ?? null, packageUnit ?? null, price ?? null, req.params.id, req.userId]
  );
  const product = result.rows[0];
  const priceChanged =
    Number(prev.price) !== Number(product.price) ||
    Number(prev.package_amount) !== Number(product.package_amount) ||
    prev.package_unit !== product.package_unit;
  if (priceChanged) {
    await query(
      `INSERT INTO product_price_history (product_id, package_amount, package_unit, price) VALUES ($1,$2,$3,$4)`,
      [product.id, product.package_amount, product.package_unit, product.price]
    );
  }
  res.json({ product: shape(product) });
});

router.delete("/:id", async (req, res) => {
  await query("DELETE FROM products WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  res.json({ ok: true });
});

module.exports = router;
