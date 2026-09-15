# TariffIQ Authentication & Authorization Security Guide (Phase 5E.1)

## 1. Authentication Architecture

TariffIQ implements a session-based authentication architecture using cryptographically signed JSON Web Tokens (JWT) conveyed through `HttpOnly`, `SameSite` cookies, with a fallback for `Authorization: Bearer <token>` headers.

```
Client (React Browser)
    │
    ├─► POST /api/auth/register ──► Email validation & normalization
    │                                Password length clamp (8 - 128 chars)
    │                                bcrypt salt work factor 10
    │                                MongoDB `users` collection insert
    │                                HS256 JWT issue & HttpOnly cookie
    │
    ├─► POST /api/auth/login ─────► Normalized email query
    │                                Constant-error credential verification
    │                                HS256 JWT issue & HttpOnly cookie
    │
    ├─► POST /api/auth/logout ────► Clear `tariffiq_session` cookie
    │
    └─► GET /api/auth/me ─────────► `createAuthMiddleware` validation
                                     Returns SafeUser DTO (id, email, name)
```

---

## 2. Authorization Architecture & IDOR Defense

All classification persistence and audit routes (`/api/classifications/*`) enforce user ownership at the database query level:

- **Identity Derivation**: User identity is derived **strictly** from the verified token payload (`req.user.id`).
- **Client User ID Discarding**: Any client-supplied `userId`, `ownerId`, or user metadata in the request body, query parameters, or URL parameters is discarded.
- **Strict Query Isolation**:
  ```ts
  // Conceptually enforced on every database query:
  {
    _id: requestedRecordId,
    userId: new mongoose.Types.ObjectId(req.user.id)
  }
  ```
- **Anti-Enumeration 404s**: Attempts to access or delete another user's classification return `404 Not Found` rather than `403 Forbidden`, preventing resource enumeration attacks.
- **CSV Export Isolation**: The CSV export route (`GET /api/classifications/export/csv`) strictly filters rows by `userId = req.user.id` and sanitizes formulas against spreadsheet injection (`=`, `+`, `-`, `@`).

---

## 3. Token & Session Security

- **Algorithm Hardening**: Token signing and verification explicitly enforce the `HS256` HMAC-SHA256 algorithm. Algorithm switching attacks (such as unsigned tokens with `alg: "none"` or RSA-HMAC confusion) are cryptographically rejected.
- **Token Claims**:
  - `sub`: User ObjectId string.
  - `email`: Normalized user email address.
  - `name`: User display name.
  - `iat`: Timestamp of issuance.
  - `exp`: Expiration set to 7 days (`7d`).
- **Storage**: Tokens are stored exclusively in HTTP-only cookies (`tariffiq_session`) and never placed in `localStorage`, `sessionStorage`, or JavaScript global variables.

---

## 4. Password Security

- **Algorithm**: Passwords are hashed using `bcrypt` (via `bcryptjs`) with a salt work factor of `10`.
- **Length Boundaries**:
  - Minimum Length: 8 characters.
  - Maximum Length: 128 characters (mitigates CPU exhaustion and ReDoS denial-of-service vectors).
- **Serialization Safety**: `toJSON` schema transforms on the `User` model delete `passwordHash`, `_id`, and `__v`.
- **Unified Failure Responses**: Login failure responses return a constant, generic error: `Invalid email or password`, preventing username enumeration.

---

## 5. Logout Semantics

- TariffIQ issues stateless JWTs. Calling `POST /api/auth/logout` clears the client session cookie (`tariffiq_session`) by setting its expiration date in the past.
- **Enterprise Consideration**: Because JWTs are stateless, an intercepted token remains valid until its 7-day expiration timestamp unless revoked via a server-side denylist or Redis cache. For environments requiring instant revocation across distributed nodes, short-lived tokens (e.g. 15 minutes) with refresh tokens or Redis blocklists can be layered on top of this architecture.

---

## 6. CORS & CSRF Defense

- **Explicit Origin**: In production, CORS restricts requests to the configured `FRONTEND_ORIGIN` (e.g. `https://tariffiq.app`). Wildcard origins (`*`) are disallowed when `credentials: true` is enabled.
- **SameSite Cookie**: Set to `sameSite: "lax"` in local development and `sameSite: "none"` with `secure: true` in HTTPS cross-subdomain deployments.
- **Preflight Enforcement**: State-mutating API routes (`POST`, `DELETE`) require `Content-Type: application/json`, requiring browser CORS preflight checks (`OPTIONS`) and protecting against cross-site request forgery from simple form submissions.
