const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function loadFullRecipe(client, id, userId) {
  const recipeRes = await client.query("SELECT * FROM recipes WHERE id = $1 AND user_id = $2", [id, userId]);
  const recipe = recipeRes.rows[0];
  if (!recipe) return null;
  const catRes = await client.query("SELECT category_id FROM recipe_categories WHERE recipe_id = $1", [id]);
  const ingRes = await client.query(
    "SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position ASC",
    [id]
  );
  return shapeRecipe(recipe, catRes.rows, ingRes.rows);
}

function shapeRecipe(r, categoryRows, ingredientRows) {
  return {
    id: r.id,
    name: r.name,
    photo: r.photo,
    servings: Number(r.servings),
    panDiameter: r.pan_diameter !== null ? Number(r.pan_diameter) : null,
    markupPercent: Number(r.markup_percent),
    steps: r.steps || "",
    notes: r.notes || "",
    categoryIds: categoryRows.map((c) => c.category_id),
    ingredients: ingredientRows.map((i) => ({
      id: String(i.id),
      productId: i.product_id,
      productName: i.product_name_snapshot,
      amount: Number(i.amount),
      unit: i.unit,
    })),
  };
}

router.get("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const recipesRes = await client.query("SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC", [req.userId]);
    const ids = recipesRes.rows.map((r) => r.id);
    let catsByRecipe = {};
    let ingsByRecipe = {};
    if (ids.length > 0) {
      const catsRes = await client.query("SELECT * FROM recipe_categories WHERE recipe_id = ANY($1)", [ids]);
      catsRes.rows.forEach((c) => { (catsByRecipe[c.recipe_id] ||= []).push(c); });
      const ingsRes = await client.query("SELECT * FROM recipe_ingredients WHERE recipe_id = ANY($1) ORDER BY position ASC", [ids]);
      ingsRes.rows.forEach((i) => { (ingsByRecipe[i.recipe_id] ||= []).push(i); });
    }
    const recipes = recipesRes.rows.map((r) => shapeRecipe(r, catsByRecipe[r.id] || [], ingsByRecipe[r.id] || []));
    console.log(`[data] GET /recipes — user_id=${req.userId} rows=${recipes.length}`);
    res.json({ recipes });
  } finally {
    client.release();
  }
});

async function upsertRecipeBody(client, req, recipeId) {
  const { name, photo, servings, panDiameter, markupPercent, steps, notes, categoryIds, ingredients } = req.body || {};

  let recipe;
  if (recipeId) {
    const result = await client.query(
      `UPDATE recipes SET
         name = $1, photo = $2, servings = $3, pan_diameter = $4,
         markup_percent = $5, steps = $6, notes = $7, updated_at = now()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [name, photo || null, servings || 0, panDiameter || null, markupPercent ?? 50, steps || "", notes || "", recipeId, req.userId]
    );
    recipe = result.rows[0];
    if (!recipe) return null;
    await client.query("DELETE FROM recipe_categories WHERE recipe_id = $1", [recipe.id]);
    await client.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [recipe.id]);
  } else {
    const result = await client.query(
      `INSERT INTO recipes (user_id, name, photo, servings, pan_diameter, markup_percent, steps, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.userId, name, photo || null, servings || 0, panDiameter || null, markupPercent ?? 50, steps || "", notes || ""]
    );
    recipe = result.rows[0];
  }

  for (const catId of categoryIds || []) {
    await client.query(
      "INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [recipe.id, catId]
    );
  }
  let pos = 0;
  for (const ing of ingredients || []) {
    if (!ing.productId || !Number(ing.amount)) continue;
    await client.query(
      `INSERT INTO recipe_ingredients (recipe_id, product_id, product_name_snapshot, amount, unit, position)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [recipe.id, ing.productId, ing.productName || null, ing.amount, ing.unit, pos++]
    );
  }
  return recipe.id;
}

router.post("/", async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: "Назва рецепта обов'язкова." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = await upsertRecipeBody(client, req, null);
    const full = await loadFullRecipe(client, id, req.userId);
    await client.query("COMMIT");
    res.json({ recipe: full });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Не вдалося зберегти рецепт." });
  } finally {
    client.release();
  }
});

router.patch("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = await upsertRecipeBody(client, req, req.params.id);
    if (!id) { await client.query("ROLLBACK"); return res.status(404).json({ error: "not_found" }); }
    const full = await loadFullRecipe(client, id, req.userId);
    await client.query("COMMIT");
    res.json({ recipe: full });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Не вдалося оновити рецепт." });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM recipes WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  res.json({ ok: true });
});

module.exports = router;
