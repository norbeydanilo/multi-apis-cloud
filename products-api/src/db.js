import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.warn("[DB] MONGO_URI no está definida");
}

export async function connectMongo() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000 // 30s para evitar AggregateError por timeout
      // useNewUrlParser/useUnifiedTopology ya no son necesarios en Mongoose >= 6
    });
    console.log("✅ Conectado a CosmosDB (Mongo API)");
  } catch (err) {
    console.error("❌ Error conectando a CosmosDB:", err);
    throw err;
  }
}