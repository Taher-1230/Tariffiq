# TariffIQ MongoDB Atlas & Data Persistence Guide (Production Edition)

This document provides setup instructions, schema specifications, and persistence invariants for MongoDB in TariffIQ.

---

## 1. Overview & Architectural Principles

TariffIQ uses **MongoDB** (or MongoDB Atlas in production) exclusively for user account storage and classification audit history.

```
Browser Client (React / Vite)
        │
        ▼ (HttpOnly Cookie / Session Token)
TariffIQ Express Backend
        │
        ├─► User Service (bcryptjs password hashing)
        ├─► Auth Middleware (JWT token validation)
        ├─► Product Registry (verifyAndClassifyProduct)
        │     ├─► Tea Deterministic Engine (classifyTea)
        │     └─► Coffee Deterministic Engine (classifyCoffee)
        │
        ▼ (Mongoose Connection)
MongoDB Database (Atlas / Local / In-Memory Test)
  ├── users collection
  └── classifications collection
```

### Core Invariants:
1. **Engine is the Authority**: MongoDB stores history and audit records. MongoDB is **NEVER** the source of truth for classification rules.
2. **Server-Side Re-verification**: When persisting a classification, the backend server **rejects/ignores client-computed HS codes** and runs `verifyAndClassifyProduct(productCategory, confirmedInput)` deterministically on the server.
3. **No Mixed Responsibilities**:
   - Gemini $\rightarrow$ extraction only
   - Deterministic engine $\rightarrow$ classification only
   - MongoDB $\rightarrow$ persistence and audit history only
   - JWT / Cookies $\rightarrow$ user identity and sessions only
4. **Data Isolation**: Every classification record is strictly scoped to `userId`. Users cannot read, update, or delete classifications belonging to other accounts.

---

## 2. MongoDB Atlas Setup for Production

### Step 1: Create a Cluster on MongoDB Atlas
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create an **M0 Shared Cluster** (for staging) or **M10+ Dedicated Cluster** (for production).
3. Select your cloud provider (AWS/GCP/Azure) and region closest to your server deployment.

### Step 2: Configure Database Access & TLS
1. Navigate to **Security** $\rightarrow$ **Database Access**.
2. Click **Add New Database User**.
3. Select **Password Authentication** and generate a high-entropy password.
4. Under **Database User Privileges**, assign `Read and write to any database` (or specific `tariffiq` database).
5. Production deployments must use TLS/SSL (`mongodb+srv://` protocol).

### Step 3: Configure Network Access & IP Whitelisting
1. Navigate to **Security** $\rightarrow$ **Network Access**.
2. Click **Add IP Address**.
3. Add your production server's elastic IP or VPC peering subnet.

### Step 4: Obtain Connection String
1. On your cluster overview, click **Connect** $\rightarrow$ **Drivers** $\rightarrow$ **Node.js**.
2. Format:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/tariffiq?retryWrites=true&w=majority
   ```
3. Set this URI as `MONGODB_URI` in server environment.

---

## 3. Database Collections & Compound Indexes

### 1. `users` Collection
Stores registered compliance and import user accounts.

```ts
interface User {
  _id: ObjectId;
  email: string;        // Lowercase, trimmed, unique index
  passwordHash: string; // bcryptjs hash (work factor 10)
  name?: string;        // Optional display name
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ email: 1 }` (unique)

---

### 2. `classifications` Collection
Stores deterministic classification audit history across Tea (0902) and Coffee (0901).

```ts
interface Classification {
  _id: ObjectId;
  userId: ObjectId;
  productCategory: "tea" | "coffee";
  inputSource: "ai" | "manual";
  productDescription?: string;
  extraction?: Record<string, unknown>;
  confirmedInput: Record<string, unknown>;
  classification: {
    status: "classified" | "insufficient_information" | "no_match";
    hsCode?: string;
    hsCodeFormatted?: string;
    description?: string;
    matchedRuleId?: string;
    explanation?: string;
    classificationPath?: Array<{ code: string; description: string }>;
    structuredExplanation?: Record<string, unknown>;
    reasoning?: Array<{
      condition: string;
      matched: boolean;
      ruleId?: string;
      outputCode?: string;
      details?: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Compound Query Indexes:**
- `{ userId: 1, createdAt: -1 }` (Newest-first paginated history)
- `{ userId: 1, productCategory: 1, createdAt: -1 }` (Category filtering)
- `{ userId: 1, inputSource: 1, createdAt: -1 }` (Source filtering: AI vs Manual)
- `{ userId: 1, "classification.hsCode": 1, createdAt: -1 }` (HS code lookups)

---

## 4. Connection Lifecycle & Graceful Shutdown

- TariffIQ connects to MongoDB on startup via `connectToDatabase(config.mongodbUri)`.
- Reuses active connections in testing/development environments.
- On receiving `SIGTERM` or `SIGINT`, closes the HTTP server and executes `disconnectDatabase()` to cleanly close connection pools.
