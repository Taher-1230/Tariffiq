# TariffIQ Production Security Architecture & Hardening Guide

## 1. Executive Summary

TariffIQ enforces a defense-in-depth security model built around a core architectural invariant:
**The deterministic rules engines (`classifyTea` and `classifyCoffee`) are the sole classification authority. Gemini performs attribute extraction only, and MongoDB serves as an audit persistence store.**

---

## 2. Secrets Management & API Keys

### Principles
- **Zero Client Secrets**: The frontend browser client never receives or stores API keys, JWT secrets, or database connection strings.
- **Backend Proxying**: All interactions with Google Gemini pass through server endpoints (`POST /api/ai/extract`, `POST /api/ai/extract-tea`).
- **Environment Isolation**:
  - `GEMINI_API_KEY`: Kept exclusively on the backend server.
  - `MONGODB_URI`: Kept exclusively on the backend server.
  - `JWT_SECRET`: Minimum 16 characters in production, kept server-side only.
  - `VITE_*`: Only non-sensitive public variables (e.g. `VITE_APP_TITLE`) may use the `VITE_` prefix.

### Secrets Sanitization
- `.env` is ignored by Git in `.gitignore`.
- `.env.example` contains non-sensitive placeholders only.
- Continuous automated tests scan the built production bundle (`dist/`) and source code (`src/`) to ensure no API keys or SDK imports leak into client artifacts.

---

## 3. Rate Limiting & Denial of Service Protection

TariffIQ applies IP-based rate limiting via `express-rate-limit` using standard IETF draft-8 headers (`RateLimit-*`):

| Endpoint Group | Default Production Limit | Purpose |
|:---|:---|:---|
| `POST /api/ai/*` | 20 requests / 15 min | Prevents Gemini API quota exhaustion and abuse |
| `POST /api/auth/*` | 10 requests / 15 min | Mitigates credential stuffing and brute-force attacks |
| `/api/classifications/*` | 60 requests / 15 min | Prevents database exhaustion and mass scraping |

All rate limits are configurable via environment variables (`AI_RATE_LIMIT`, `AUTH_RATE_LIMIT`, `CLASSIFICATION_RATE_LIMIT`). When limits are exceeded, the server responds with `HTTP 429 Too Many Requests` and a sanitized JSON error response.

---

## 4. HTTP Security Headers & CORS

### Security Headers (via Helmet)
- **Frameguard**: `X-Frame-Options: DENY` (prevents clickjacking).
- **MIME Sniffing Prevention**: `X-Content-Type-Options: nosniff`.
- **Referrer Policy**: `Referrer-Policy: strict-origin-when-cross-origin`.
- **Content-Length Control**: Request body parsing is strictly clamped to `20kb` via `express.json({ limit: "20kb" })`.

### Cross-Origin Resource Sharing (CORS)
- Origin is strictly bound to `config.frontendOrigin` (e.g. `https://tariffiq.app`). Wildcard `*` is prohibited when credentials (`cookies`) are enabled.
- Allowed Methods: `GET`, `POST`, `DELETE`, `OPTIONS`.
- Allowed Headers: `Content-Type`, `X-Request-ID`, `Authorization`.
- Preflight Cache: 10 minutes (`maxAge: 600`).

---

## 5. Defense Against Client Tampering & Spoofing

TariffIQ enforces server-side authority on all classification persistence requests (`POST /api/classifications`):

1. **Client HS Code Discarding**: If a client sends an injected or malicious HS code (e.g. `"hsCode": "99999999"`), the server silently strips the client code and runs `verifyAndClassifyProduct(productCategory, confirmedInput)` to derive the authentic tariff code.
2. **Classification Object & Rule ID Stripping**: Client-supplied `matchedRuleId`, `classificationPath`, `description`, or `reasoning` payloads are completely ignored.
3. **Product Domain Isolation**: If a request claims `productCategory: "coffee"` but passes invalid or cross-product tea attributes, the server-side validator rejects the request with `400 INVALID_CLASSIFICATION_INPUT`.

---

## 6. Prompt Injection Defense

- User-submitted product descriptions are treated as **untrusted data**.
- System prompts instruct Gemini to extract physical facts only and forbid outputting HS codes or rule IDs.
- Server-side response schemas rigorously validate Gemini output shapes, rejecting any response containing unexpected fields or injected HS codes with `502 INVALID_AI_RESPONSE`.

---

## 7. CSV Formula Injection (Spreadsheet Injection) Prevention

Exporting classification records as CSV (`GET /api/classifications/export/csv` and frontend `generateHistoryCsv`) protects against spreadsheet formula execution:

- Any field starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is sanitized by prefixing with a single quote (`'`).
- All fields are wrapped in RFC-4180 double quotes, with internal quotes escaped as `""`.

---

## 8. Cross-Site Scripting (XSS) & React Rendering

- No usage of `dangerouslySetInnerHTML` exists anywhere in the codebase.
- User-provided product descriptions and evidence notes are rendered as escaped React text nodes.
- Script tags (`<script>alert(1)</script>`) and event handlers (`<img onerror=...>`) are treated as literal strings and never executed.

---

## 9. Error Handling & Safe Logging

- **Centralized Error Handler**: In production mode (`NODE_ENV=production`), unhandled errors return generic messages (`"An internal error occurred."`) without stack traces, file system paths, or environment data.
- **Log Sanitization**: Logs output request IDs and status codes without dumping sensitive request payloads, session tokens, passwords, or connection strings.

---

## 10. Health Check & Graceful Shutdown

- **Health Check (`GET /api/health`)**: Returns `{ status: "ok", database: "connected" | "disconnected" }` without exposing internal database hosts, ports, or credentials.
- **Graceful Shutdown**: Listens for `SIGTERM` and `SIGINT`, stops accepting new HTTP connections, disconnects Mongoose cleanly, and terminates with a 10-second timeout fallback.

---

## 11. Production Deployment Requirements

1. **HTTPS Enforcement**: Production environments must enforce TLS/HTTPS via reverse proxy (e.g. Cloudflare, AWS ALB, NGINX) or cloud platform.
2. **MongoDB Atlas / TLS**: Production MongoDB connections must use TLS (`mongodb+srv://`) with authentication enabled.
3. **Session Cookies**: In production (`NODE_ENV=production`), cookies are set with `HttpOnly: true`, `SameSite: "Strict"`, and `Secure: true`.
