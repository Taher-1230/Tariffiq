# TariffIQ — Intelligent Tariff Classification Engine

TariffIQ is an enterprise-grade Harmonized System (HS) tariff classification application for agricultural commodities. It combines server-side AI attribute extraction with deterministic rules engines to deliver verified, auditable, and legally-grounded HS code determinations.

---

## 1. What TariffIQ Does

TariffIQ classifies goods into precise 8-digit Harmonized System (HS) tariff codes. It offers two classification entry paths:

1. **AI-Assisted Classification**: Users provide natural-language product descriptions (e.g. *"Organic green tea in 250g tins"* or *"Whole dried Tellicherry black pepper garbled"*). Server-side Gemini extracts factual physical and botanical attributes, presents them to the user for confirmation or correction, and passes confirmed attributes into the deterministic rules engine.
2. **Manual Wizard**: A guided, step-by-step questionnaire with dynamic field requirement discovery, dependent state invalidation, and input validation.

---

## 2. Supported Products & Tariff Headings

TariffIQ supports 3 product categories covering 11 HS headings and 160+ tariff lines:

| Category | HS Headings | Scope | Rules Count |
| :--- | :--- | :--- | :--- |
| **Tea** | `0902` | Green tea, black tea, fermented/partly fermented, immediate packaging, bulk, tea bags, dust, waste | 36 normalized rules |
| **Coffee** | `0901` | Roasted/unroasted, decaffeinated/not, Arabica/Robusta forms, grades A/B/C/PB/BBB, husks & skins, coffee substitutes | 39 normalized rules |
| **Spices** | `0904–0910` | Pepper, Capsicum/Pimenta, vanilla, cinnamon, cloves, nutmeg, mace, cardamom, coriander, cumin, caraway, fennel, ginger, saffron, turmeric, mixed spices | 94 normalized rules |

---

## 3. Architecture

```
                                  ┌────────────────────────────────┐
                                  │      Client (Browser)          │
                                  │  React 19 + TypeScript + Vite  │
                                  │  Tailwind CSS + Radix UI       │
                                  └───────────────┬────────────────┘
                                                  │
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │   Express Backend (Port 3001)  │
                                  │   TypeScript / Node.js         │
                                  │   Helmet + CORS + Rate Limit   │
                                  └───────┬───────────────┬────────┘
                                          │               │
                     Factual Extraction   │               │ Classification Re-Verification
                     (Attributes Only)    ▼               ▼
                        ┌───────────────────┐   ┌───────────────────────────┐
                        │ Google Gemini API │   │ Deterministic Rules       │
                        │ (Server-Side Only)│   │ Engine (ProductRegistry)  │
                        └───────────────────┘   └─────────────┬─────────────┘
                                                              │
                                                              ▼
                                                ┌───────────────────────────┐
                                                │ MongoDB / Mongoose        │
                                                │ (User Auth & History)     │
                                                └───────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS, Lucide icons, Radix UI primitives.
- **Backend**: Node.js, Express 5, TypeScript, Helmet security headers, CORS origin gating, rate limiters, request ID correlation.
- **Database**: MongoDB with Mongoose (user registration, password hashing via bcryptjs, JWT session cookies, scoped history queries).
- **AI Extraction**: Google Gemini API via official `@google/genai` SDK, executed strictly on the server.
- **Rules Engine**: In-memory deterministic rule matcher with canonical dataset validation.

---

## 4. How to Install

### Prerequisites
- Node.js 20+ (Node 22 or 24 recommended)
- npm 10+
- MongoDB 6+ (local or MongoDB Atlas; optional for stateless classification, required for user auth and history persistence)

### Installation
```bash
# Clone or navigate to the repository
cd d:/tariffiq-full

# Install dependencies
npm install
```

---

## 5. How to Configure Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

### Environment Variable Reference

| Variable | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** (server) | `AIzaSy...` | Server-side Gemini API key for attribute extraction. **Never exposed to browser.** |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Gemini model name for attribute extraction. |
| `PORT` | No | `3001` | Express backend listening port. |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for client requests. |
| `NODE_ENV` | No | `development` | Runtime environment (`development` or `production`). |
| `MONGODB_URI` | Production | `mongodb://127.0.0.1:27017/tariffiq` | MongoDB connection URI. |
| `JWT_SECRET` | Production | Min 16-character string | Secret key for signing user session JWTs. Enforced in production. |
| `AI_RATE_LIMIT` | No | `20` (prod) / `1000` (dev) | Max AI extraction requests per 15-minute window per IP. |
| `AUTH_RATE_LIMIT`| No | `10` (prod) / `1000` (dev) | Max auth requests per 15-minute window per IP. |
| `CLASSIFICATION_RATE_LIMIT` | No | `60` (prod) / `1000` (dev) | Max classification history saves per 15-minute window. |

> **Security Note**: Never commit `.env` to version control. `.env` is ignored in `.gitignore`.

---

## 6. How to Run Frontend and Backend

### Development Mode (Concurrent)

**Terminal 1 — Backend API:**
```bash
npm run server:dev
```
Server starts on `http://localhost:3001`.

**Terminal 2 — Frontend Dev Server:**
```bash
npm run dev
```
Vite dev server starts on `http://localhost:5173`.

### Production Build & Run
```bash
# Build frontend and server
npm run build
npm run server:build

# Run server in production
NODE_ENV=production npm run server:prod
```

---

## 7. How to Run Tests

```bash
# Run all tests (frontend + server test suites)
npm test

# Run server test suite specifically
npm run test:server

# Run linter
npm run lint

# Check production builds
npm run build
npm run server:build
```

---

## 8. How AI Extraction Works

1. **User Input**: The user enters free-form product descriptions in the UI.
2. **Server-Side Dispatch**: The client sends `{ productCategory, text }` to `POST /api/ai/extract`.
3. **Structured Prompting**: The server constructs a product-specific prompt asking Gemini to extract **only factual physical and botanical attributes** (e.g. spice type, form, packaging, processing state).
4. **Schema Validation**: Server validates Gemini's JSON response against strict Zod/TypeScript schemas (`validateTeaExtraction`, `validateCoffeeExtraction`, `validateSpicesExtraction`).
5. **Human-in-the-Loop Review**: The extracted facts are returned to the client and presented in an interactive review step (`SpicesAIExtractionReview`, `CoffeeAIExtractionReview`, etc.) where the user confirms or corrects attributes.
6. **Classification Trigger**: The user-confirmed facts are passed to the deterministic rules engine.

---

## 9. Critical Invariant: Why AI Does NOT Determine HS Classification

> **AI IS NEVER THE AUTHORITY FOR HS CLASSIFICATION.**

- The Gemini API is strictly limited to attribute extraction from natural text.
- Gemini is never asked for and **never returns HS codes, tariff lines, chapter rule IDs, or legal justifications**.
- If a corrupted or compromised Gemini response attempts to inject an `hsCode` or `ruleId`, the server validation pipeline immediately catches and rejects it (`INVALID_AI_RESPONSE`).
- When saving a classification to history (`POST /api/classifications`), the server **ignores any client-supplied HS code** and re-runs the deterministic classification engine on the confirmed physical facts before persistence.

---

## 10. How Deterministic Rules Determine Classification

Classification operates via product-specific deterministic rules engines registered with `ProductRegistry`:

1. **Attribute Normalization**: Inputs are normalized (lowercased, trimmed, enumerated).
2. **Input Validation**: Ensures mandatory attributes are present; returns `insufficient_information` if required fields are missing.
3. **Rule Matching**: Rules are evaluated in strict priority order against canonical tariff datasets:
   - Primary heading matching (e.g. `0904` for pepper, `0901` for coffee, `0902` for tea)
   - Subheading discrimination (e.g. whole vs. crushed/ground, roasted vs. unroasted, decaf vs. regular)
   - 8-digit tariff line resolution based on packaging, grade, botanical variety, or processing state
   - Scoped residual rules for explicitly defined "Other" categories
4. **Audit Trail**: Every classification produces:
   - 8-digit HS Code (formatted as `XXXX.XX.XX` and raw)
   - Official tariff description
   - Matched Rule ID
   - Full classification path from chapter down to 8-digit line
   - Structured reasoning explanation citing legal notes

---

## 11. MongoDB Setup Requirements

MongoDB stores user credentials and classification history:
- **Collections**: `users`, `classifications`.
- **User Isolation**: History queries are strictly scoped by `userId` extracted from the authenticated session JWT.
- **Indexes**: Compound indexes on `{ userId: 1, createdAt: -1 }`, `{ userId: 1, productCategory: 1, createdAt: -1 }`, and `{ userId: 1, inputSource: 1, createdAt: -1 }`.
- **Local Dev / Testing**: The automated test suite utilizes `mongodb-memory-server` for zero-dependency in-memory testing without requiring a live database. For local manual testing, any standard MongoDB instance running at `mongodb://127.0.0.1:27017` works out of the box.

---

## 12. Production Deployment Considerations

- **Secrets Management**: Set strong `GEMINI_API_KEY`, `MONGODB_URI`, and `JWT_SECRET` (minimum 16 characters, enforced by server startup check in production mode).
- **HTTPS & Security**: Express runs behind Helmet (frameguard, referrer policy, content-type sniffing protection). Ensure HTTPS reverse proxy (Nginx, Cloudflare, AWS ALB) terminates TLS and forwards `X-Forwarded-For`.
- **CORS**: Configure `FRONTEND_ORIGIN` to match your production domain.
- **Rate Limiting**: AI endpoints (`/api/ai/*`) are rate-limited to prevent API quota exhaustion and denial-of-service.
- **Error Sanitization**: Production errors never leak stack traces, database internals, or API keys to clients.

---

## 13. Data Provenance & Known Limitations

### Data Provenance
- Canonical tariff rules and HS codes are derived directly from the project reference document `HS PROJECT OVERVIEW.pdf` (Chapter 09 complete code structure).
- TariffIQ does **not** claim to be an official government source or substitute for formal customs ruling advice (such as CBP Binding Rulings or national customs advance rulings).

### Scope & Limitations
- **Current Headings**: Heading `0901` (Coffee), Heading `0902` (Tea), and Headings `0904` through `0910` (Spices).
- **Heading 0903 (Maté)** is reserved for future expansion.
- **Other Chapters**: Mixed seasonings or preparations where spices lose their essential character belong to Chapter 21 (heading 2103) and are intentionally flagged as non-Chapter 09.
