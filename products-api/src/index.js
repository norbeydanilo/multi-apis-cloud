import app from "./app.js";
import { connectMongo } from "./db.js";

const PORT = process.env.PORT || 4002;

async function main() {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`🚀 products-api on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("❌ Fatal on startup:", e);
  process.exit(1);
});