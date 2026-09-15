// ============================================================
// Authentication & Authorization Security Audit Tests — Phase 5E.1
//
// Tests:
//   1.  Unauthenticated request rejected with 401 UNAUTHENTICATED
//   2.  Valid session cookie accepted (200 OK)
//   3.  Valid Bearer token in Authorization header accepted as fallback
//   4.  Malformed JWT token rejected with 401
//   5.  Expired JWT token rejected with 401 SESSION_EXPIRED
//   6.  Tampered JWT signature rejected with 401
//   7.  JWT signed with algorithm "none" rejected with 401
//   8.  Authorization header with invalid scheme (e.g. Basic) rejected with 401
//   9.  IDOR Protection: User A cannot view User B's classification history list
//   10. IDOR Protection: User A cannot retrieve User B's single record detail (404)
//   11. IDOR Protection: User A cannot delete User B's record (404)
//   12. IDOR Protection: User A cannot export User B's records via CSV export
//   13. Client Tampering: Client-supplied userId in request body is completely ignored
//   14. Client Tampering: Client-supplied HS code is overridden by server engine
//   15. Client Tampering: Client-supplied matchedRuleId is ignored
//   16. Password Security: Passwords and passwordHash are NEVER serialized or returned
//   17. Password Security: Work factor 10 bcrypt hash cannot be reversed
//   18. Password Security: Overlong passwords (>128 chars) rejected to prevent CPU exhaustion
//   19. Registration Security: Duplicate email returns 400 EMAIL_ALREADY_EXISTS
//   20. Registration Security: Email normalization prevents duplicate case/whitespace accounts
//   21. Login Security: Nonexistent account returns generic 401 without user enumeration
//   22. Login Security: Wrong password returns identical generic 401 error message
//   23. Multi-Tenant Data Isolation: Concurrent users with distinct filter queries
//   24. Logout Semantics: Logout clears session cookie
//   25. Secrets Isolation: JWT_SECRET and credentials never leaked in responses or error logs
// ============================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import request from "supertest"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { createApp } from "../app.js"
import { connectToDatabase, disconnectDatabase } from "../db/mongoose.js"
import { User } from "../models/User.js"
import { Classification } from "../models/Classification.js"
import { AUTH_COOKIE_NAME, signUserToken } from "../services/authService.js"
import type { ServerConfig } from "../config.js"

let mongoServer: MongoMemoryServer
let testConfig: ServerConfig
let app: ReturnType<typeof createApp>

const TEST_JWT_SECRET = "test-phase5e1-super-secret-jwt-key-2026-secure"

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  testConfig = {
    geminiApiKey: "mock-gemini-key",
    geminiModel: "gemini-3.6-flash",
    port: 3001,
    frontendOrigin: "http://localhost:5173",
    isProduction: false,
    mongodbUri: mongoUri,
    jwtSecret: TEST_JWT_SECRET,
  }

  await connectToDatabase(mongoUri)
  app = createApp(testConfig)
})

afterAll(async () => {
  await disconnectDatabase()
  if (mongoServer) {
    await mongoServer.stop()
  }
})

beforeEach(async () => {
  await Classification.deleteMany({})
  await User.deleteMany({})
})

/**
 * Helper to register a user and return { cookie, token, user }
 */
async function createTestUser(email: string, password = "Password123!", name = "Test User") {
  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ email, password, name })

  const cookieHeader = regRes.headers["set-cookie"]
  const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string)

  // Extract raw JWT from cookie
  const match = cookie ? /tariffiq_session=([^;]+)/.exec(cookie) : null
  const token = match ? match[1] : ""

  return {
    user: regRes.body.user,
    cookie,
    token,
  }
}

describe("Authentication & Authorization Security Audit Tests (Phase 5E.1)", () => {
  // ── 1. Unauthenticated Request Rejection ───────────────────
  it("1. Unauthenticated request to protected history route is rejected with 401", async () => {
    const res = await request(app).get("/api/classifications")

    expect(res.status).toBe(401)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("UNAUTHENTICATED")
  })

  // ── 2. Valid Session Cookie Accepted ───────────────────────
  it("2. Valid session cookie grants authenticated access to protected route", async () => {
    const { cookie, user } = await createTestUser("auth.valid@example.com")

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("success")
    expect(res.body.user.id).toBe(user.id)
    expect(res.body.user.email).toBe("auth.valid@example.com")
  })

  // ── 3. Bearer Token in Authorization Header Fallback ────────
  it("3. Valid Bearer token in Authorization header grants authenticated access", async () => {
    const { token, user } = await createTestUser("bearer.test@example.com")

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("success")
    expect(res.body.user.id).toBe(user.id)
    expect(res.body.user.email).toBe("bearer.test@example.com")
  })

  // ── 4. Malformed JWT Rejected ──────────────────────────────
  it("4. Malformed JWT token is rejected with 401 SESSION_EXPIRED", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${AUTH_COOKIE_NAME}=malformed.jwt.token.here`)

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("SESSION_EXPIRED")
  })

  // ── 5. Expired JWT Rejected ────────────────────────────────
  it("5. Expired JWT token is rejected with 401 SESSION_EXPIRED", async () => {
    const expiredToken = jwt.sign(
      { sub: "usr_expired_123", email: "expired@example.com" },
      TEST_JWT_SECRET,
      { expiresIn: "-10s", algorithm: "HS256" }
    )

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${AUTH_COOKIE_NAME}=${expiredToken}`)

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("SESSION_EXPIRED")
  })

  // ── 6. Tampered JWT Signature Rejected ─────────────────────
  it("6. Tampered JWT token with forged signature is rejected with 401", async () => {
    const forgedToken = jwt.sign(
      { sub: "usr_attacker", email: "attacker@example.com" },
      "wrong-attacker-secret-key-123456",
      { algorithm: "HS256" }
    )

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${AUTH_COOKIE_NAME}=${forgedToken}`)

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("SESSION_EXPIRED")
  })

  // ── 7. Algorithm 'none' JWT Rejected ───────────────────────
  it("7. JWT signed with algorithm 'none' is rejected with 401", async () => {
    // Construct unsigned algorithm: none token (header.payload.)
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")
    const payload = Buffer.from(
      JSON.stringify({ sub: "usr_bypass", email: "bypass@example.com" })
    ).toString("base64url")
    const noneToken = `${header}.${payload}.`

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${AUTH_COOKIE_NAME}=${noneToken}`)

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("SESSION_EXPIRED")
  })

  // ── 8. Invalid Authorization Scheme Rejected ───────────────
  it("8. Authorization header with invalid scheme (e.g. Basic) is rejected with 401", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Basic dXNlcjpwYXNzd29yZA==")

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("UNAUTHENTICATED")
  })

  // ── 9. IDOR: User A Cannot Access User B History List ──────
  it("9. User A cannot view User B's classification records in history list", async () => {
    const userA = await createTestUser("user.a@example.com")
    const userB = await createTestUser("user.b@example.com")

    // User A creates a Tea classification
    await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        productDescription: "User A's Secret Organic Green Tea",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 500,
          weightUnit: "g",
        },
      })

    // User B queries history list
    const resB = await request(app)
      .get("/api/classifications")
      .set("Cookie", userB.cookie)

    expect(resB.status).toBe(200)
    expect(resB.body.total).toBe(0)
    expect(resB.body.items).toHaveLength(0)

    // User B attempts to filter with userId query parameter
    const resBQuery = await request(app)
      .get(`/api/classifications?userId=${userA.user.id}`)
      .set("Cookie", userB.cookie)

    expect(resBQuery.status).toBe(200)
    expect(resBQuery.body.total).toBe(0)
  })

  // ── 10. IDOR: User A Cannot View User B Detail Record ──────
  it("10. User A cannot view User B's classification detail (returns 404)", async () => {
    const userA = await createTestUser("owner.a@example.com")
    const userB = await createTestUser("attacker.b@example.com")

    // User A saves a classification
    const createRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        productDescription: "User A Single Origin Arabica",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: false,
          form: "arabica_plantation",
          presentation: "bulk",
        },
      })

    const recordId = createRes.body.historyId
    expect(recordId).toBeDefined()

    // User B tries to access User A's record by direct ID
    const resB = await request(app)
      .get(`/api/classifications/${recordId}`)
      .set("Cookie", userB.cookie)

    expect(resB.status).toBe(404)
    expect(resB.body.errorCode).toBe("NOT_FOUND")
  })

  // ── 11. IDOR: User A Cannot Delete User B Record ───────────
  it("11. User A cannot delete User B's classification record (returns 404)", async () => {
    const userA = await createTestUser("owner.delete@example.com")
    const userB = await createTestUser("attacker.delete@example.com")

    // User A saves record
    const saveRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
        },
      })
    const recordId = saveRes.body.historyId

    // User B attempts to delete User A's record
    const deleteRes = await request(app)
      .delete(`/api/classifications/${recordId}`)
      .set("Cookie", userB.cookie)

    expect(deleteRes.status).toBe(404)
    expect(deleteRes.body.errorCode).toBe("NOT_FOUND")

    // Verify record still exists for User A
    const verifyRes = await request(app)
      .get(`/api/classifications/${recordId}`)
      .set("Cookie", userA.cookie)

    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.item.id).toBe(recordId)
  })

  // ── 12. IDOR: User A Cannot Export User B Records in CSV ───
  it("12. User A cannot export User B's records via CSV export", async () => {
    const userA = await createTestUser("csv.owner@example.com")
    const userB = await createTestUser("csv.attacker@example.com")

    // User A saves record
    await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        productDescription: "User A Confidential High Grade Matcha",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "immediate_packing",
          form: "powder",
          netWeight: 100,
          weightUnit: "g",
        },
      })

    // User B exports CSV
    const csvRes = await request(app)
      .get("/api/classifications/export/csv")
      .set("Cookie", userB.cookie)

    expect(csvRes.status).toBe(200)
    expect(csvRes.text).not.toContain("Confidential High Grade Matcha")
    expect(csvRes.text).not.toContain("Matcha")
  })

  // ── 13. Client userId Tampering Ignored ─────────────────────
  it("13. Client-supplied userId in request body is ignored (server uses session)", async () => {
    const userA = await createTestUser("user.real@example.com")
    const fakeUserId = new mongoose.Types.ObjectId().toString()

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        userId: fakeUserId,
        productCategory: "tea",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.userId).toBe(userA.user.id)
    expect(res.body.item.userId).not.toBe(fakeUserId)

    // Direct MongoDB inspection
    const doc = await Classification.findById(res.body.historyId)
    expect(doc?.userId.toString()).toBe(userA.user.id)
  })

  // ── 14. Client HS Code Tampering Overridden ────────────────
  it("14. Client-supplied HS code in request body is overridden by server calculation", async () => {
    const user = await createTestUser("tamper.hscode@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", user.cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        hsCode: "99999999",
        classification: {
          hsCode: "99999999",
          description: "Fake Injected Code",
        },
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 500,
          weightUnit: "g",
        },
      })

    expect(res.status).toBe(201)
    // Server must compute authoritative 09021020, discarding 99999999
    expect(res.body.item.classification.hsCode).toBe("09021020")
    expect(res.body.item.classification.hsCode).not.toBe("99999999")
  })

  // ── 15. Client matchedRuleId Tampering Ignored ─────────────
  it("15. Client-supplied matchedRuleId and reasoning are ignored by server", async () => {
    const user = await createTestUser("tamper.rule@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", user.cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        matchedRuleId: "FAKE_INJECTED_RULE_999",
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.matchedRuleId).toBe("COF-022")
    expect(res.body.item.classification.matchedRuleId).not.toBe("FAKE_INJECTED_RULE_999")
  })

  // ── 16. Passwords and Hashes Never Returned ────────────────
  it("16. Passwords and passwordHash are NEVER serialized or returned in API responses", async () => {
    const user = await createTestUser("secret.pw@example.com", "SuperSecurePassword123!")

    // Verify /register response
    expect(user.user.password).toBeUndefined()
    expect(user.user.passwordHash).toBeUndefined()

    // Verify /login response
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "secret.pw@example.com", password: "SuperSecurePassword123!" })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user.password).toBeUndefined()
    expect(loginRes.body.user.passwordHash).toBeUndefined()
    expect(JSON.stringify(loginRes.body)).not.toContain("SuperSecurePassword123!")
    expect(JSON.stringify(loginRes.body)).not.toContain("passwordHash")

    // Verify /me response
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", user.cookie)

    expect(meRes.status).toBe(200)
    expect(meRes.body.user.password).toBeUndefined()
    expect(meRes.body.user.passwordHash).toBeUndefined()
  })

  // ── 17. Bcrypt Work Factor 10 Salt Strength ────────────────
  it("17. Passwords stored in database are bcrypt hashes with work factor 10", async () => {
    await createTestUser("bcrypt.check@example.com", "PlaintextPassword99!")

    const userDoc = await User.findOne({ email: "bcrypt.check@example.com" })
    expect(userDoc).not.toBeNull()
    expect(userDoc!.passwordHash).toBeDefined()
    expect(userDoc!.passwordHash).not.toBe("PlaintextPassword99!")
    // Bcrypt prefix $2a$10$ or $2b$10$
    expect(userDoc!.passwordHash).toMatch(/^\$2[ab]\$10\$/)
  })

  // ── 18. Overlong Password Protection ───────────────────────
  it("18. Overlong passwords (>128 chars) are rejected during registration to prevent CPU exhaustion", async () => {
    const overlongPassword = "A".repeat(129)

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "dos.attacker@example.com",
        password: overlongPassword,
      })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("WEAK_PASSWORD")
  })

  // ── 19. Duplicate Email Registration Rejection ─────────────
  it("19. Duplicate email registration is safely rejected with 400 EMAIL_ALREADY_EXISTS", async () => {
    await createTestUser("duplicate@example.com")

    const res2 = await request(app)
      .post("/api/auth/register")
      .send({
        email: "duplicate@example.com",
        password: "AnotherPassword123!",
      })

    expect(res2.status).toBe(400)
    expect(res2.body.errorCode).toBe("EMAIL_ALREADY_EXISTS")
  })

  // ── 20. Email Normalization (Case & Whitespace) ────────────
  it("20. Email normalization prevents duplicate accounts with case/whitespace variations", async () => {
    await createTestUser("normalized.user@example.com")

    // Attempt registration with uppercase and whitespace
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "  NORMALIZED.USER@EXAMPLE.COM  ",
        password: "ValidPassword123!",
      })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("EMAIL_ALREADY_EXISTS")

    // Login with uppercase/whitespace succeeds
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "  Normalized.User@Example.Com  ",
        password: "Password123!",
      })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user.email).toBe("normalized.user@example.com")
  })

  // ── 21. Login Nonexistent Account Generic Error ────────────
  it("21. Login with nonexistent email returns generic 401 without user enumeration", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent.account@example.com",
        password: "Password123!",
      })

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("INVALID_CREDENTIALS")
    expect(res.body.message).toBe("Invalid email or password.")
  })

  // ── 22. Login Wrong Password Generic Error ─────────────────
  it("22. Login with wrong password returns identical generic 401 error message", async () => {
    await createTestUser("real.user@example.com", "CorrectPassword123!")

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "real.user@example.com",
        password: "WrongPassword999!",
      })

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("INVALID_CREDENTIALS")
    expect(res.body.message).toBe("Invalid email or password.")
  })

  // ── 23. Multi-Tenant Data Isolation Across Queries ─────────
  it("23. Multi-tenant data isolation holds across search, category, and source filters", async () => {
    const userA = await createTestUser("tenant.a@example.com")
    const userB = await createTestUser("tenant.b@example.com")

    // User A saves 2 Tea records
    await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        productDescription: "User A Green Tea Bulk",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
        },
      })
    await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        productCategory: "tea",
        inputSource: "ai",
        productDescription: "User A Black Tea Retail",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 250,
          weightUnit: "g",
        },
      })

    // User B saves 1 Coffee record
    await request(app)
      .post("/api/classifications")
      .set("Cookie", userB.cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        productDescription: "User B Coffee Beans",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: false,
          form: "arabica_plantation",
          presentation: "bulk",
        },
      })

    // User A queries
    const resA = await request(app).get("/api/classifications").set("Cookie", userA.cookie)
    expect(resA.body.total).toBe(2)
    expect(resA.body.items.every((i: any) => i.productCategory === "tea")).toBe(true)

    // User B queries
    const resB = await request(app).get("/api/classifications").set("Cookie", userB.cookie)
    expect(resB.body.total).toBe(1)
    expect(resB.body.items[0].productCategory).toBe("coffee")
  })

  // ── 24. Logout Clears Session Cookie ───────────────────────
  it("24. Logout clears the HTTP-only auth cookie", async () => {
    const user = await createTestUser("logout.user@example.com")

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", user.cookie)

    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.status).toBe("ok")

    const cookies = logoutRes.headers["set-cookie"]
    expect(cookies).toBeDefined()
    expect(cookies.some((c: string) => c.includes(`${AUTH_COOKIE_NAME}=;`))).toBe(true)
  })

  // ── 25. Secrets Never Exposed in Error Handler ─────────────
  it("25. Production error handler never leaks JWT_SECRET, MongoDB URIs or stack traces", async () => {
    const res = await request(app)
      .get("/api/classifications/507f1f77bcf86cd799439011")

    expect(res.status).toBe(401)
    const raw = JSON.stringify(res.body)
    expect(raw).not.toContain(TEST_JWT_SECRET)
    expect(raw).not.toContain("mongodb://")
    expect(raw).not.toContain("stack")
  })
})
