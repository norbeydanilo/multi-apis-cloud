# 🧭 ETAPA C — **Monorepo** con `products-api` usando **Azure Cosmos DB (API MongoDB)**  
> Mantendremos **`users-api`** con PostgreSQL (Etapas A/B) y migraremos **`products-api`** a **NoSQL** (Cosmos DB API Mongo).  
> Seguimos con: **Docker/Compose**, **ACR**, **App Service (Containers)**, **GitHub Actions**, y **seguridad** básica.

---

## ✅ 0) Supuestos y objetivo

**Supuestos**
- Monorepo con dos servicios (`users-api`, `products-api`).
- ACR + Web Apps (sidecar) + Actions ya configurados (Etapa B).
- `users-api` seguirá con la misma `DATABASE_URL` (PostgreSQL).
- `products-api` pasará a usar `MONGO_URI` (Cosmos).

**Objetivo**
- Crear **Cosmos DB (API Mongo)**, **DB** y **colección** `products`.
- Conectar **local (Compose)** y **nube (App Service)**.
- Mantener **CI/CD** (el workflow matrix sigue igual; no se toca).

---

# 🧱 1) Crear **Azure Cosmos DB – API MongoDB** (Portal)

1. Ve a **Azure Portal** → busca **Azure Cosmos DB** → **Create**.  
2. **API option**: elige **Azure Cosmos DB for MongoDB**.  
3. **Basics**  
   - **Resource group**: `rg-multiapis`  
   - **Account name**: `cosmos-multiapis-<algo>` (único)  
   - **Location**: la misma región de tus Web Apps  
   - **Capacity mode**: *Serverless* (barato para demos) **o** *Provisioned throughput* (empieza en 400 RU/s)  
   - *(Opcional)* **Apply Free Tier** si está disponible (ahorra costo).  
4. **Review + Create** → **Create**.

> 👀 Puedes usar *Serverless* para clase. Si eliges *Provisioned*, configura 400 RU/s o **Autoscale** (100–1000 RU/s).

---

# 📁 2) Crear **Base de datos** y **Colección** `products`

1. Abre tu **Cosmos account** → **Data Explorer**.  
2. **New Database**  
   - **Database id**: `shop` (ejemplo)  
3. **New Collection** dentro de `shop`  
   - **Collection id**: `products`  
   - **Shard/Partition key**: `/_id` (simple para demos con Mongo API)  
   - **Throughput**:  
     - *Serverless*: no eliges.  
     - *Provisioned*: 400 RU/s (o autoscale).  
4. **Create**.

> 🧠 Para escenarios reales, escogerías una partición semántica (p.ej., `/category`). Para clase, `/_id` va bien.

**Si no está la opción de Data Explorer:**

### 🔹 Opción A: Azure Cloud Shell
1. Entra a [https://portal.azure.com](https://portal.azure.com)
2. Haz clic en el icono **>_ Cloud Shell** (barra superior)
3. Elige **Bash**
4. Espera a que cargue el entorno (se crea un almacenamiento temporal la primera vez)

### 🔹 Opción B: Local con `mongosh`
1. Descarga [MongoDB Shell (mongosh)](https://www.mongodb.com/try/download/shell)
2. Instálalo en tu sistema (Windows, macOS o Linux)
3. Abre una terminal (CMD / PowerShell / VSCode terminal)
4. Usa tu connection string de Cosmos

Copia el **Primary connection string** desde **Azure Portal → Keys → Primary connection string (Mongo)**  
Debe verse similar a esto:

```bash
mongosh "mongodb://<USERNAME>:<PRIMARY_KEY>@cosmos-multiapis-ud.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&replicaSet=globaldb&appName=@cosmos-multiapis-ud@"
```

Una vez dentro de la consola mongosh, ejecuta:

```bash
// Crear base de datos (se crea al insertar datos)
use shop

// Crear colección "products"
db.createCollection("products")

// Verificar
show dbs
show collections
```

Insertar documentos de ejemplo:

```bash
db.products.insertMany([
  { name: "Laptop Dell XPS", price: 1299.99 },
  { name: "Monitor LG UltraWide", price: 499.50 },
  { name: "Teclado Mecánico Keychron", price: 89.00 }
])
```

Verifica:

```bash
db.products.find().pretty()

// Listar
db.products.find()

// Buscar por nombre
db.products.find({ name: "Laptop Dell XPS" })

// Actualizar precio
db.products.updateOne({ name: "Monitor LG UltraWide" }, { $set: { price: 459.00 } })

// Eliminar
db.products.deleteOne({ name: "Teclado Mecánico Keychron" })
```

---

# 🔑 3) Obtener el **connection string** (Mongo)

1. En el **Cosmos account** → **Keys**.  
2. Copia **Primary connection string** (formato Mongo).  
   - Suele verse así:  
     ```
     mongodb://<USERNAME>:<PRIMARY_KEY>@cosmos-multiapis-<algo>.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&replicaSet=globaldb&appName=@cosmos-multiapis-<algo>@
     ```
   - O con `mongodb+srv://...` (según versión).  
3. **Guárdalo**: lo usaremos como `MONGO_URI`.

> ⚠️ **Cosmos (Mongo)** exige **TLS** y **`retryWrites=false`**. No borres esos parámetros.

---

# 🧪 4) Probar **local** (Docker Compose)

## 4.1 `.env` en la **raíz** del monorepo (NO subir a Git)
```env
# PostgreSQL (users-api) → ya existente
USERS_DATABASE_URL=postgres://<admin>:<PASS>@pg-multiapis-demo.postgres.database.azure.com:5432/multiapisdb?sslmode=require

# Cosmos (products-api)
PRODUCTS_MONGO_URI=mongodb://<USERNAME>:<PRIMARY_KEY>@cosmos-multiapis-<algo>.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&replicaSet=globaldb&appName=@cosmos-multiapis-<algo>@
```

## 4.2 `docker-compose.yml` (inyecta `MONGO_URI` a products)
```yaml
version: "3.9"

services:
  users-api:
    build: ./users-api
    environment:
      - PORT=4001
      - SERVICE_NAME=users-api
      - DATABASE_URL=${USERS_DATABASE_URL}
    ports:
      - "4001:4001"
    restart: unless-stopped

  products-api:
    build: ./products-api
    environment:
      - PORT=4002
      - SERVICE_NAME=products-api
      - MONGO_URI=${PRODUCTS_MONGO_URI}   # 👈 cambia a Cosmos
      # (opcional) si consumes users por HTTP:
      # - USERS_API_URL=http://users-api:4001
    ports:
      - "4002:4002"
    depends_on:
      - users-api
    restart: unless-stopped
```

---

# 🧩 5) Código en **`products-api`** (Mongoose)

## 5.1 Dependencias (`products-api/package.json`)
```json
{
  "name": "products-api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": { "start": "node src/index.js" },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongoose": "^8.6.0"
  }
}
```

> Instala/actualiza local para generar `package-lock.json`:  
> `cd products-api && npm install && cd ..`

## 5.2 Conexión **`products-api/src/db.js`**
```js
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
```

## 5.3 Modelo y esquema **`products-api/src/models/product.js`**
```js
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
```

## 5.4 App con endpoints **`products-api/src/app.js`**
```js
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
```

## 5.5 Arranque **`products-api/src/index.js`**
```js
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
```

---

# 🐳 6) Dockerfile (sin cambios mayores)

**`products-api/Dockerfile`**
```dockerfile
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 4002
ENV PORT=4002 SERVICE_NAME=products-api
CMD ["node", "src/index.js"]
```

> Si no usas `package-lock.json`, cambia `npm ci` por `npm install --omit=dev`.

---

# ▶️ 7) Ejecutar **local** con Compose

```bash
docker compose up --build
```

**Pruebas:**
- `GET http://localhost:4002/health` → ok  
- `GET http://localhost:4002/db/health` → `{ ok: true }`  
- `POST http://localhost:4002/products`  
  ```json
  { "name": "Laptop", "price": 1299.99 }
  ```
- `GET http://localhost:4002/products` → lista  
- `GET http://localhost:4002/products/<_id>` → uno  
- `PUT/DELETE` idem.

> Si falla conexión: revisa que **`MONGO_URI`** sea la **Primary connection string** (Mongo), con `ssl=true` y `retrywrites=false`.

---

# ☸️ 8) **Despliegue en la nube** (App Service) — products con Cosmos

## 8.1 CI/CD (Actions → ACR)
- Tu **workflow matrix** ya construye y **pushea `products-api:latest`** a ACR (Etapa B).  
- No cambies nada del YAML.

## 8.2 Web App `products-api-cloud` (Container)
- Ya creada en Etapa B. Solo **agrega/cambia** variables:

**Configuration → Application settings**
- `WEBSITES_PORT = 4002`
- `MONGO_URI = <Primary connection string (Mongo) de Cosmos>`
- *(opcional)* `USERS_API_URL = https://users-api-cloud.azurewebsites.net`

**Autenticación ACR ↔ Web App**
- Sigue usando **Identidad administrada + rol `AcrPull`** o **Admin user** del ACR (como en B).

**Webhook**
- `products-api:latest` con **Implementación continua** activada (ACR → Webhook → App Service pull).

## 8.3 **Firewall / redes** en Cosmos
- **Rápido (demo)**: “**All networks**” (poco seguro) o **Selected networks** agregando las **Outbound IPs** de `products-api-cloud` (en *Properties* de la Web App).  
- **Recomendado (prod)**: **Private Endpoint** + **VNet Integration** (mismo patrón que para PostgreSQL).

---

# 🔎 9) Pruebas en la nube

- `GET https://products-api-cloud.azurewebsites.net/health`  
- `GET https://products-api-cloud.azurewebsites.net/db/health` → `{ ok: true }`  
- CRUD en `/products` (usa `_id` de Mongo en el path).

> Si ves **AggregateError** o **timeout**: típicamente firewall/red (Cosmos) o string sin `ssl=true`.  
> Revisa **Log stream** y **Keys** en Cosmos.

---

# 🧯 Troubleshooting rápido

- **401 Webhook** → falta `AcrPull`/credenciales: configura **Identidad administrada** o **Admin user**.  
- **Timeout a Cosmos** → revisa **Firewall** (Outbound IPs de la Web App) o habilita *All networks* para probar.  
- **Error de ObjectId** → valida con `mongoose.isValidObjectId(id)` (ya incluido).  
- **Índices** → si agregas filtros (p.ej., `category`), crea índices en el esquema y vuelve a desplegar.

--- 