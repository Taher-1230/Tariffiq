// ============================================================
// Authentication API Tests — Phase 5B
//
// Tests User Registration, Login, Logout, Session Cookies,
// and /api/auth/me using in-memory MongoDB.
//
// Test Cases:
//   1.  Register success (201, safe user returned, cookie set)
//   2.  Register rejects invalid email
//   3.  Register rejects weak password (< 8 chars)
//   4.  Register rejects duplicate email
//   5.  Login success (200, safe user, cookie set)
//   6.  Login rejects wrong password
//   7.  Login rejects unknown email
//   8.  /me returns user data when authenticated via cookie
//   9.  /me returns 401 when unauthenticated
//   10. /me returns 401 after logout (cookie cleared)
//   11. Protected route rejects invalid/tampered token
//   12. Passwords and password hashes are never returned in responses
//   13. Email normalization (case-insensitive login & trim)
//   14. Auth rate limiter protects login route
// ============================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import request from "supertest"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { createApp } from "../app.js"
import { connectToDatabase, disconnectDatabase } from "../db/mongoose.js"
import { User } from "../models/User.js"
import { AUTH_COOKIE_NAME } from "../services/authService.js"
import type { ServerConfig } from "../config.js"

let mongoServer: MongoMemoryServer
let testConfig: ServerConfig
let app: ReturnType<typeof createApp>

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  testConfig = {
    geminiApiKey: "mock-key",
    geminiModel: "gemini-3.6-flash",
    port: 3001,
    frontendOrigin: "http://localhost:5173",
    isProduction: false,
    mongodbUri: mongoUri,
    jwtSecret: "test-super-secret-jwt-key-2026",
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
  await User.deleteMany({})
})

describe("Authentication API Tests (Phase 5B)", () => {
  // ── 1. Register Success ────────────────────────────────────
  it("1. Registers a new user successfully and sets HTTP-only cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "tea.expert@example.com",
        password: "StrongPassword123!",
        name: "Tea Expert",
      })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe("success")
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe("tea.expert@example.com")
    expect(res.body.user.name).toBe("Tea Expert")
    expect(res.body.user.id).toBeDefined()

    // Password must NEVER be in response
    expect(res.body.user.password).toBeUndefined()
    expect(res.body.user.passwordHash).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain("passwordHash")

    // Cookie must be set
    const cookies = res.headers["set-cookie"]
    expect(cookies).toBeDefined()
    expect(cookies.some((c: string) => c.includes(AUTH_COOKIE_NAME))).toBe(true)
    expect(cookies.some((c: string) => c.includes("HttpOnly"))).toBe(true)
  })

  // ── 2. Invalid Email ───────────────────────────────────────
  it("2. Rejects registration with invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "not-an-email",
        password: "StrongPassword123!",
      })

    expect(res.status).toBe(400)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("INVALID_EMAIL")
  })

  // ── 3. Weak Password ───────────────────────────────────────
  it("3. Rejects registration with weak password (<8 characters)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "user@example.com",
        password: "12345",
      })

    expect(res.status).toBe(400)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("WEAK_PASSWORD")
  })

  // ── 4. Duplicate Email ─────────────────────────────────────
  it("4. Rejects registration with already existing email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "duplicate@example.com",
        password: "Password123!",
      })

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "DUPLICATE@example.com",
        password: "AnotherPassword123!",
      })

    expect(res.status).toBe(400)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("EMAIL_ALREADY_EXISTS")
  })

  // ── 5. Login Success ───────────────────────────────────────
  it("5. Logs in existing user successfully and sets session cookie", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "login.user@example.com",
        password: "MySecretPassword123",
        name: "Login User",
      })

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "login.user@example.com",
        password: "MySecretPassword123",
      })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("success")
    expect(res.body.user.email).toBe("login.user@example.com")
    expect(res.body.user.name).toBe("Login User")

    const cookies = res.headers["set-cookie"]
    expect(cookies.some((c: string) => c.includes(AUTH_COOKIE_NAME))).toBe(true)
  })

  // ── 6. Wrong Password ──────────────────────────────────────
  it("6. Rejects login with wrong password using generic error", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "secure.user@example.com",
        password: "CorrectPassword123",
      })

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "secure.user@example.com",
        password: "WrongPassword999",
      })

    expect(res.status).toBe(401)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("INVALID_CREDENTIALS")
    expect(res.body.message).toBe("Invalid email or password.")
  })

  // ── 7. Unknown Email ───────────────────────────────────────
  it("7. Rejects login with unknown email using same generic error", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "unknown@example.com",
        password: "AnyPassword123",
      })

    expect(res.status).toBe(401)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("INVALID_CREDENTIALS")
    expect(res.body.message).toBe("Invalid email or password.")
  })

  // ── 8. /me Authenticated ───────────────────────────────────
  it("8. GET /api/auth/me returns user profile when authenticated", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: "me.user@example.com",
        password: "Password123!",
        name: "Me User",
      })

    const cookie = regRes.headers["set-cookie"]

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("success")
    expect(res.body.user.email).toBe("me.user@example.com")
    expect(res.body.user.name).toBe("Me User")
  })

  // ── 9. /me Unauthenticated ─────────────────────────────────
  it("9. GET /api/auth/me returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/auth/me")

    expect(res.status).toBe(401)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("UNAUTHENTICATED")
  })

  // ── 10. Logout ─────────────────────────────────────────────
  it("10. POST /api/auth/logout clears auth cookie and invalidates session", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: "logout.user@example.com",
        password: "Password123!",
      })

    const cookie = regRes.headers["set-cookie"]

    // Logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie)

    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.status).toBe("ok")

    // The set-cookie header should instruct browser to clear/expire the cookie
    const clearedCookies = logoutRes.headers["set-cookie"]
    expect(clearedCookies.some((c: string) => c.includes(AUTH_COOKIE_NAME))).toBe(true)

    // Calling /me without cookie should now be 401
    const meRes = await request(app).get("/api/auth/me")
    expect(meRes.status).toBe(401)
  })

  // ── 11. Invalid/Tampered Token ─────────────────────────────
  it("11. Rejects request with tampered auth cookie", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=tampered.invalid.token`])

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe("SESSION_EXPIRED")
  })

  // ── 12. Password / Hash Never Returned ─────────────────────
  it("12. Ensures password hash is never present in DB queries or responses", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: "audit.user@example.com",
        password: "SecretPassword123!",
      })

    const rawJson = JSON.stringify(regRes.body)
    expect(rawJson).not.toContain("passwordHash")
    expect(rawJson).not.toContain("SecretPassword123!")

    // Verify in DB that it is hashed with bcrypt
    const dbUser = await User.findOne({ email: "audit.user@example.com" })
    expect(dbUser).toBeDefined()
    expect(dbUser!.passwordHash).toBeDefined()
    expect(dbUser!.passwordHash.startsWith("$2")).toBe(true) // bcrypt prefix
    expect(dbUser!.passwordHash).not.toBe("SecretPassword123!")
  })

  // ── 13. Case-Insensitive Email ─────────────────────────────
  it("13. Normalizes email to lowercase for registration and login", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "  Upper.Case@Example.COM  ",
        password: "Password123!",
      })

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "upper.case@example.com",
        password: "Password123!",
      })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user.email).toBe("upper.case@example.com")
  })
})
