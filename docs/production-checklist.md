# TariffIQ Production Readiness Checklist

This checklist must be verified prior to deploying TariffIQ to staging or production environments.

---

## 1. Secrets & Credentials
- [x] No API keys, passwords, or secrets committed in git repository.
- [x] `.env` is listed in `.gitignore` and never checked into source control.
- [x] `.env.example` contains sanitized placeholders only.
- [x] `GEMINI_API_KEY` is restricted to backend server only.
- [x] `JWT_SECRET` is at least 16 characters with high entropy in production.
- [x] No `VITE_GEMINI_API_KEY` or client-side secret variables exist.

---

## 2. Authentication & Authorization Security (Phase 5E.1)
- [x] Passwords are encrypted with bcrypt (salt work factor 10) and never stored in plaintext.
- [x] Password lengths bounded between 8 and 128 characters to prevent CPU exhaustion.
- [x] Passwords and password hashes excluded from all JSON serializations and API responses.
- [x] Login errors return generic unified messages to prevent username enumeration.
- [x] JWT token signing and verification explicitly enforce `HS256` to prevent algorithm confusion.
- [x] Tokens with algorithm `none`, expired tokens, and tampered signatures are rejected.
- [x] Session tokens conveyed via `HttpOnly`, `SameSite` cookies; never stored in localStorage.
- [x] Multi-tenant data isolation: all classification queries strictly scoped to `req.user.id`.
- [x] IDOR protection: attempts to access/delete another user's records return 404.
- [x] Client-supplied `userId`, `hsCode`, `matchedRuleId`, or classification results in request body are discarded.
- [x] Logout properly clears the HTTP-only session cookie.

---

## 3. API & Application Security
- [x] Client cannot dictate HS codes, rule IDs, or classification metadata.
- [x] Server re-verifies classification deterministically via `verifyAndClassifyProduct()`.
- [x] Gemini response shapes are strictly validated before entering engine pipeline.
- [x] Prompt injection attempts cannot bypass deterministic rule engine.
- [x] Request body limit clamped to `20kb`.
- [x] Rate limiting active on AI (`/api/ai/*`), Auth (`/api/auth/*`), and History (`/api/classifications/*`).
- [x] Pagination limit is bounded (`limit <= 100`).
- [x] Search query input escapes regex characters to prevent ReDoS.
- [x] MongoDB ObjectIds validated before query execution (returns 400 on invalid format).
- [x] CORS origin restricted to configured `FRONTEND_ORIGIN`.
- [x] Helmet security headers active (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- [x] Production errors return sanitized responses without stack traces.
- [x] Server logging does not leak credentials, passwords, or full secret payloads.
- [x] CSV export neutralizes formula injection (`=`, `+`, `-`, `@` prefixes).
- [x] React components render user strings safely without `dangerouslySetInnerHTML`.

---

## 4. Operations & Infrastructure
- [x] Health check endpoint `GET /api/health` reports status without leaking database host/credentials.
- [x] Graceful shutdown handles `SIGTERM` and `SIGINT`, cleanly closing HTTP and MongoDB connections.
- [x] Dependency vulnerability scan (`npm audit`) reports 0 vulnerabilities.
- [x] HTTPS/TLS configured on production load balancer / reverse proxy.

---

## 5. Tariff Data Integrity
- [x] `src/data/tea_rules.json` matches baseline SHA-256 (`FFA2C0A3E1769AF155FAF6504528F2633C6D4153C1DC2F8B067A93C952216828`).
- [x] `src/data/tea_hs_codes.json` matches baseline SHA-256 (`D550559657676E77EBA28DF5F0C4B49BACA8D695CFAFC8A2D4084070CC704743`).
- [x] `src/data/coffee_rules.json` matches baseline SHA-256 (`C06F3A7F6AF2DFDFCA6BDAC91408610DCC8363A57770AF16E0A60D012EC21014`).
- [x] `src/data/coffee_hs_codes.json` matches baseline SHA-256 (`92F086FAEB56A541AF5DD6851CB68C9CE129F4DA7908EAD0B457FE11A59FCD5E`).
- [x] Full tea and coffee regression test suites passing 100%.
