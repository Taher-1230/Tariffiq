# TariffIQ Backend Setup & Security Architecture Guide (Phase 5A & Phase 5B)

This document describes the setup, development workflow, and production security architecture for the TariffIQ server-side API boundary, authentication system, and MongoDB classification history.

---

## 1. Overview & Security Architecture

TariffIQ implements a secure three-tier architecture:

```
Browser Client (React / Vite)
        │
        ▼ (HTTPS / JSON / HttpOnly Cookie)
TariffIQ Backend API (Express / Node.js)
  - Helmet security headers
  - Origin-restricted CORS with credentials
  - Request body limits (20kb)
  - Auth rate limiting (5 req / 15 min / IP)
  - AI extraction rate limiting (20 req / 15 min / IP)
  - JWT HttpOnly session management (tariffiq_session)
  - Server-side deterministic re-verification (classifyTea)
  - MongoDB user & history isolation
        │
        ├─► Google Gemini API (@google/genai) — Extraction only
        └─► MongoDB Atlas (Mongoose) — User accounts & audit history
```

**Key Architectural Invariants:**
- `GEMINI_API_KEY`, `MONGODB_URI`, and `JWT_SECRET` exist **only** on the backend server.
- No client-side `VITE_GEMINI_*` environment variables exist.
- Gemini $\rightarrow$ extraction only; `classifyTea()` $\rightarrow$ classification only; MongoDB $\rightarrow$ history persistence only; JWT/Cookie $\rightarrow$ user identity only.
- Unauthenticated users can use manual and AI-assisted classification freely without an account.
- Authenticated users automatically have their classifications saved to their personal audit history.

---

## 2. Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

### Configuration Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API secret key (server-side only) |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Gemini model name for natural-language extraction |
| `MONGODB_URI` | No | `mongodb://127.0.0.1:27017/tariffiq` | MongoDB Atlas or local connection URI |
| `JWT_SECRET` | No | `dev-jwt-secret-...` | Secret string for signing JWT session cookies |
| `PORT` | No | `3001` | Express backend listening port |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for browser client requests |

---

## 3. Development Workflow

### Prerequisites
- Node.js (v20+ recommended)
- npm
- (Optional) MongoDB running locally or MongoDB Atlas URI (in-memory MongoDB is used automatically for tests)

### Starting Development Servers

Run backend and frontend in separate terminals:

**Terminal 1 — Backend Server:**
```bash
npm run server:dev
```
Starts Express with auto-restart on port 3001.

**Terminal 2 — Frontend Application:**
```bash
npm run dev
```
Starts Vite dev server on port 5173 with API proxy to port 3001.

---

## 4. Complete API Endpoints Reference

### Health Check
- `GET /api/health` — Checks backend service status.

### Authentication Endpoints
- `POST /api/auth/register` — Registers a new user (`email`, `password`, `name`). Sets `tariffiq_session` HttpOnly cookie.
- `POST /api/auth/login` — Authenticates user credentials. Sets `tariffiq_session` HttpOnly cookie.
- `POST /api/auth/logout` — Clears `tariffiq_session` cookie.
- `GET /api/auth/me` — Returns current authenticated user profile (`SafeUser`).

### AI Extraction Endpoint
- `POST /api/ai/extract-tea` — Extracts structured physical attributes from natural-language tea descriptions. Rate-limited and validated against HS-code injection.

### Classification History Endpoints (Protected)
- `POST /api/classifications` — Persists a classification. Re-runs `classifyTea(confirmedInput)` server-side.
- `GET /api/classifications?page=1&limit=10` — Retrieves paginated history for the authenticated user.
- `GET /api/classifications/:id` — Retrieves full audit detail for a specific classification record (scoped to owner).
- `DELETE /api/classifications/:id` — Deletes a classification record from the user's history (scoped to owner).

---

## 5. Security Controls & Defenses

1. **HttpOnly Cookies**: Session tokens are stored in `HttpOnly`, `SameSite: "lax"`, `Secure` (production) cookies. Never exposed to client JavaScript or `localStorage`.
2. **Deterministic Re-verification**: Client cannot submit arbitrary HS codes or classifications to the history API. Server always executes `classifyTea(confirmedInput)`.
3. **Multi-Tenant Scoping**: All classification queries are indexed and filtered strictly by `userId: req.user.id`. Foreign record access returns 404.
4. **Helmet & Origin-Restricted CORS**: Restricts allowed origins, prevents clickjacking, and enforces MIME-type sniffing protections.
5. **Rate Limiting**:
   - `/api/auth/register`, `/api/auth/login`: 5 attempts per 15 minutes.
   - `/api/ai/*`: 20 requests per 15 minutes.
6. **Body Size Limiting**: `express.json({ limit: "20kb" })` prevents payload denial-of-service attacks.
7. **Error Sanitization**: Server exceptions never leak stack traces, database details, or API keys.

---

## 6. Build & Test Commands

| Command | Purpose |
|---|---|
| `npm test` | Runs all 307 frontend and backend unit & integration tests |
| `npm run test:server` | Runs all 53 backend server tests with in-memory MongoDB |
| `npm run build` | Compiles frontend TypeScript and creates production bundle (`dist/`) |
| `npm run server:build` | Typechecks backend server code (`tsconfig.server.json`) |
| `npm run lint` | Runs oxlint across all source files |
