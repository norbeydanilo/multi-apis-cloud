import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  // (opcional) category: { type: String, index: true },
}, { timestamps: true, versionKey: false });

// Cosmos (Mongo) admite índices; crea si necesitas:
// ProductSchema.index({ category: 1 });

export const Product = mongoose.model("Product", ProductSchema, "products");
// tercer parámetro fija la colección explícitamente