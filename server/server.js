require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { runMigrations } = require("./db");

const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const recipeRoutes = require("./routes/recipes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "12mb" })); // base64 photos need a generous limit
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/recipes", recipeRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, "..", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

async function start() {
  try {
    await runMigrations();
  } catch (e) {
    console.error("[db] migration failed:", e.message);
  }
  app.listen(PORT, () => console.log(`Cake Recipe Book listening on port ${PORT}`));
}

start();
