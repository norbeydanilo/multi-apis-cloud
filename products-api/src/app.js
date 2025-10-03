import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;

/*
  Esquema/tabla recomendados en PostgreSQL:
  CREATE SCHEMA IF NOT EXISTS products_schema AUTHORIZATION <admin_user>;
  CREATE TABLE IF NOT EXISTS products_schema.products (
    id    SERIAL PRIMARY KEY,
    name  TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL
  );
*/

// Health DB
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", service: "products-api" }));

// GET /products
app.get("/products", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id, name, price FROM products_schema.products ORDER BY id ASC");
    res.json(r.rows);
  } catch (e) {
    console.error("GET /products error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /products/:id
app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM products_schema.products WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en GET /products/:id:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /products
app.post("/products", async (req, res) => {
  try {
    const { name, price } = req.body ?? {};
    if (!name || price == null) return res.status(400).json({ error: "name & price required" });

    const r = await pool.query(
      "INSERT INTO products_schema.products (name, price) VALUES ($1, $2) RETURNING id, name, price",
      [name, price]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("POST /products error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /products/:id
app.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body ?? {};

    const r = await pool.query(
      "UPDATE products_schema.products SET name = COALESCE($1, name), price = COALESCE($2, price) WHERE id = $3 RETURNING id, name, price",
      [name, price, id]
    );

    if (r.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json(r.rows[0]);
  } catch (e) {
    console.error("PUT /products/:id error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /products/:id
app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      "DELETE FROM products_schema.products WHERE id = $1 RETURNING id, name, price",
      [id]
    );

    if (r.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted", product: r.rows[0] });
  } catch (e) {
    console.error("DELETE /products/:id error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => console.log(`✅ users-api on http://localhost:${PORT}`));