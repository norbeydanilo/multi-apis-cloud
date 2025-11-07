import express from "express";
import cors from "cors";
import { Product } from "./models/product.js";
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(express.json());

// Health (sin tocar BD)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "products-api", driver: "mongoose" });
});

// Health de BD (consulta liviana)
app.get("/db/health", async (_req, res) => {
  try {
    // ping a admin:
    await mongoose.connection.db.admin().ping();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /products
app.get("/products", async (_req, res) => {
  try {
    const docs = await Product.find().sort({ _id: 1 }).lean();
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /products/:id
app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid ObjectId" });
    }

    const doc = await Product.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Product not found" });

    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /products
app.post("/products", async (req, res) => {
  try {
    const { name, price } = req.body ?? {};
    if (!name || price == null) {
      return res.status(400).json({ error: "name & price required" });
    }

    const doc = await Product.create({ name, price });
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: "Internal server error", detail: String(e) });
  }
});

// PUT /products/:id
app.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid ObjectId" });
    }

    const { name, price } = req.body ?? {};
    const doc = await Product.findByIdAndUpdate(
      id,
      { $set: { ...(name && { name }), ...(price != null && { price }) } },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ error: "Product not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /products/:id
app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid ObjectId" });
    }

    const r = await Product.deleteOne({ _id: id });
    if (r.deletedCount === 0) return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product deleted" });
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;