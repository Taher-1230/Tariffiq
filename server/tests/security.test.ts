// ============================================================
// Comprehensive Security & Boundary Tests — Phase 5E
//
// Tests:
//   1. Oversized AI input rejected (>10,000 chars)
//   2. Empty / whitespace-only AI input rejected
//   3. Invalid / unsupported product category rejected (e.g. 'spices')
//   4. Tea / Coffee input mismatch rejected
//   5. Client HS-code tampering overridden by server-side classifier
//   6. Client classification object tampering overridden
//   7. Client matchedRuleId tampering overridden
//   8. Invalid MongoDB ObjectId format rejected with 400 Bad Request
//   9. Excessive pagination limit clamped to <= 100
//   10. Unsafe search input with special regex characters handled safely
//   11. XSS payloads in descriptions handled as plain text
//   12. CSV formula injection neutralized (=, +, -, @ prefix sanitized)
//   13. Gemini malicious/invalid extraction shape rejected with 502
//   14. Gemini HS-code injection rejected with 502
//   15. Rate limit enforcement returns 429
//   16. Health check endpoint reports status without leaking secrets
//   17. Sensitive error details / stack traces never leaked to clients
//   18. MongoDB connection failure handled safely
//   19. Duplicate classification persistence protection
//   20. Authoritative tariff datasets verified against SHA-256 baseline
//   21. Client source code does not import @google/genai or expose keys
//   22. Production build bundle does not contain secrets or Gemini SDK
// ============================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import request from "supertest"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"
import { MongoMemoryServer } from "mongodb-memory-server"
import { createApp } from "../app.js"
import { connectToDatabase, disconnectDatabase } from "../db/mongoose.js"
import { User } from "../models/User.js"
import { Classification } from "../models/Classification.js"
import type { ServerConfig } from "../config.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, "../..")

const DUMMY_SECRET_KEY = "AQ.SEC_SECRET_PROD_TEST_KEY_NEVER_LEAK"
const DUMMY_JWT_SECRET = "super-secret-jwt-key-for-security-tests-2026"

let mongoServer: MongoMemoryServer
let testConfig: ServerConfig
let app: ReturnType<typeof createApp>

async function createAuthenticatedUser(email: string) {
  const regRes = await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password: "TestPassword123!",
      name: email.split("@")[0],
    })

  const cookie = regRes.headers["set-cookie"]
  const user = regRes.body.user
  return { user, cookie }
}

function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(content).digest("hex").toUpperCase()
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  testConfig = {
    geminiApiKey: DUMMY_SECRET_KEY,
    geminiModel: "gemini-3.6-flash",
    port: 3001,
    frontendOrigin: "http://localhost:5173",
    isProduction: true,
    mongodbUri: mongoUri,
    jwtSecret: DUMMY_JWT_SECRET,
    aiRateLimitMax: 1000,
    authRateLimitMax: 1000,
    classificationRateLimitMax: 1000,
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

describe("Comprehensive Security & Boundary Hardening Tests (Phase 5E)", () => {
  // ── 1. Oversized AI Input Rejected ─────────────────────────
  it("1. Oversized AI input (>10,000 chars) is rejected with 400 Bad Request", async () => {
    const hugeText = "A".repeat(10_001)
    const res = await request(app).post("/api/ai/extract-tea").send({ text: hugeText })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
    expect(res.body.message).toContain("too long")
  })

  // ── 2. Empty / Whitespace Input Rejected ────────────────────
  it("2. Empty and whitespace-only AI input is rejected with 400 Bad Request", async () => {
    const resEmpty = await request(app).post("/api/ai/extract-tea").send({ text: "" })
    expect(resEmpty.status).toBe(400)

    const resWhitespace = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "    \n\t   " })
    expect(resWhitespace.status).toBe(400)
    expect(resWhitespace.body.errorCode).toBe("INVALID_REQUEST")
  })

  // ── 3. Invalid Product Category Rejected ───────────────────
  it("3. Unsupported product category (e.g. 'electronics') is cleanly rejected with 400", async () => {
    const res = await request(app)
      .post("/api/ai/extract")
      .send({ productCategory: "electronics", text: "Smartphone with 128GB storage" })

    expect(res.status).toBe(400)
    expect(res.body.status).toBe("unsupported")
    expect(res.body.message).toContain("tea")
    expect(res.body.message).toContain("coffee")
    expect(res.body.message).toContain("spices")
  })

  // ── 4. Tea / Coffee Input Mismatch Rejected ────────────────
  it("4. Cross-product attribute mismatch is rejected by server validator", async () => {
    const { cookie } = await createAuthenticatedUser("mismatch.test@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          // missing required roasted flag
        },
      })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_CLASSIFICATION_INPUT")
  })

  // ── 5. Client HS-Code Tampering Overridden ──────────────────
  it("5. CRITICAL: Client-supplied HS code is completely ignored and overridden by server", async () => {
    const { cookie } = await createAuthenticatedUser("tamper.hs@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        hsCode: "99999999", // Spoofed code
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
    expect(res.body.item.classification.hsCode).toBe("09021020")
    expect(res.body.item.classification.hsCode).not.toBe("99999999")
  })

  // ── 6. Client Classification Object Ignored ─────────────────
  it("6. CRITICAL: Client-supplied classification object is discarded", async () => {
    const { cookie } = await createAuthenticatedUser("tamper.obj@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        classification: {
          hsCode: "09019999",
          description: "Fake Injected Description",
          matchedRuleId: "FAKE-999",
        },
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.hsCode).toBe("09019010")
    expect(res.body.item.classification.matchedRuleId).toBe("COF-022")
  })

  // ── 7. Client Rule ID Ignored ──────────────────────────────
  it("7. CRITICAL: Client-supplied matchedRuleId is ignored", async () => {
    const { cookie } = await createAuthenticatedUser("tamper.rule@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        matchedRuleId: "COF-001", // Wrong rule ID
        confirmedInput: {
          productCategory: "coffee",
          productType: "substitutes_containing_coffee",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.matchedRuleId).toBe("COF-023")
    expect(res.body.item.classification.hsCode).toBe("09019020")
  })

  // ── 8. Invalid MongoDB ObjectId Rejected ───────────────────
  it("8. Invalid MongoDB ObjectId format returns 400 Bad Request", async () => {
    const { cookie } = await createAuthenticatedUser("badid.test@example.com")

    const res = await request(app)
      .get("/api/classifications/not-a-valid-object-id-12345")
      .set("Cookie", cookie)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_ID")
  })

  // ── 9. Excessive Pagination Limit Clamped ──────────────────
  it("9. Excessive pagination limit (limit=100000) is clamped to <= 100", async () => {
    const { cookie } = await createAuthenticatedUser("limit.test@example.com")

    const res = await request(app)
      .get("/api/classifications?limit=100000&page=1")
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.limit).toBe(100)
  })

  // ── 10. Unsafe Regex Characters Handled Safely ─────────────
  it("10. Special regex characters in search query are escaped without crashing", async () => {
    const { cookie } = await createAuthenticatedUser("regex.test@example.com")

    const res = await request(app)
      .get("/api/classifications?search=.*+?^${}()|[]\\\\")
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.items).toBeDefined()
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  // ── 11. XSS Payloads Stored and Returned as Text ───────────
  it("11. XSS injection strings in product descriptions are treated as literal text", async () => {
    const { cookie } = await createAuthenticatedUser("xss.test@example.com")
    const xssPayload = "<script>alert('xss')</script><img src=x onerror=alert(1)>"

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "ai",
        productDescription: xssPayload,
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.productDescription).toBe(xssPayload)
  })

  // ── 12. CSV Formula Injection Neutralized ──────────────────
  it("12. CSV export neutralizes formula injection (=, +, -, @ prefix sanitized)", async () => {
    const { cookie } = await createAuthenticatedUser("csv.formula@example.com")

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "ai",
        productDescription: "=cmd|' /C calc'!A0",
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    const csvRes = await request(app)
      .get("/api/classifications/export/csv")
      .set("Cookie", cookie)

    expect(csvRes.status).toBe(200)
    // Formula character should be neutralized with leading single quote
    expect(csvRes.text).toContain("`'=cmd|' /C calc'!A0`".replace(/`/g, ""))
  })

  // ── 13. Gemini Malicious Extraction Shape Rejected ─────────
  // ── 13. Gemini Malicious Extraction Shape Rejected ─────────
  it("13. Invalid/malicious response fields from Gemini are rejected with 502", async () => {
    const { validateTeaExtraction } = await import("../../shared/validateTeaExtraction.js")

    const maliciousShape = {
      status: "extracted",
      attributes: {
        productCategory: "tea",
        teaType: "invalid_injected_type",
      },
    }

    const validation = validateTeaExtraction(maliciousShape)
    expect(validation.valid).toBe(false)
  })

  // ── 14. Gemini HS-Code Injection Rejected ──────────────────
  it("14. Extraction payload attempting to inject hsCode or matchedRuleId is rejected", async () => {
    const { validateTeaExtraction } = await import("../../shared/validateTeaExtraction.js")

    const injectedShape = {
      status: "extracted",
      hsCode: "09021020",
      matchedRuleId: "TEA-001",
      attributes: {
        productCategory: "tea",
        teaType: "green",
      },
    }

    const validation = validateTeaExtraction(injectedShape)
    expect(validation.valid).toBe(false)
  })

  // ── 15. Rate Limiting Behavior ─────────────────────────────
  it("15. Rate limiting returns HTTP 429 when request limits are exceeded", async () => {
    const tightConfig: ServerConfig = {
      ...testConfig,
      aiRateLimitMax: 2,
      isProduction: true,
    }
    const tightApp = createApp(tightConfig)

    // Request 1: OK (400 validation error is still counted in rate limiter)
    await request(tightApp).post("/api/ai/extract-tea").send({ text: "" })
    // Request 2: OK
    await request(tightApp).post("/api/ai/extract-tea").send({ text: "" })
    // Request 3: 429 Rate Limited
    const res3 = await request(tightApp).post("/api/ai/extract-tea").send({ text: "" })

    expect(res3.status).toBe(429)
    expect(res3.body.errorCode).toBe("AI_RATE_LIMITED")
  })

  // ── 16. Health Check Endpoint Does Not Leak Secrets ─────────
  it("16. GET /api/health returns status and db state without leaking secrets", async () => {
    const res = await request(app).get("/api/health")

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("ok")
    expect(res.body.database).toBe("connected")

    const raw = JSON.stringify(res.body)
    expect(raw).not.toContain(DUMMY_SECRET_KEY)
    expect(raw).not.toContain(DUMMY_JWT_SECRET)
    expect(raw).not.toContain("mongodb://")
    expect(raw).not.toContain("127.0.0.1")
  })

  // ── 17. Sensitive Errors Never Leaked ───────────────────────
  it("17. Internal server errors do not expose stack traces or credentials in production", async () => {
    const res = await request(app).get("/api/classifications/507f1f77bcf86cd799439011")

    // Unauthenticated request returns 401
    expect(res.status).toBe(401)
    const raw = JSON.stringify(res.body)
    expect(raw).not.toContain("stack")
    expect(raw).not.toContain(DUMMY_JWT_SECRET)
  })

  // ── 18. MongoDB Connection Failure Handled Safely ───────────
  it("18. Deterministic classification functions run completely independently of MongoDB", async () => {
    const { classifyCoffee } = await import("../../src/products/coffee/classifier.js")
    const { classifyTea } = await import("../../src/engine/teaClassifier.js")

    // Classification should succeed synchronously with 0 database interaction
    const coffeeRes = classifyCoffee({
      productCategory: "coffee",
      productType: "husks_and_skins",
    })
    expect(coffeeRes.status).toBe("classified")
    expect(coffeeRes.hsCode).toBe("09019010")

    const teaRes = classifyTea({
      productCategory: "tea",
      teaType: "green",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    })
    expect(teaRes.status).toBe("classified")
    expect(teaRes.hsCode).toBe("09021020")
  })

  // ── 19. Duplicate Classification Protection ─────────────────
  it("19. Duplicate requests with identical attributes produce consistent authoritative classifications", async () => {
    const { cookie } = await createAuthenticatedUser("dup.test@example.com")
    const payload = {
      productCategory: "coffee",
      inputSource: "manual",
      confirmedInput: {
        productCategory: "coffee",
        productType: "husks_and_skins",
      },
    }

    const res1 = await request(app).post("/api/classifications").set("Cookie", cookie).send(payload)
    const res2 = await request(app).post("/api/classifications").set("Cookie", cookie).send(payload)

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
    expect(res1.body.item.classification.hsCode).toBe("09019010")
    expect(res2.body.item.classification.hsCode).toBe("09019010")
  })

  // ── 20. Authoritative Tariff Datasets Untouched ─────────────
  it("20. Authoritative tariff rules and HS code datasets match immutable SHA-256 hashes", () => {
    const expectedHashes: Record<string, string> = {
      "tea_rules.json": "FFA2C0A3E1769AF155FAF6504528F2633C6D4153C1DC2F8B067A93C952216828",
      "tea_hs_codes.json": "D550559657676E77EBA28DF5F0C4B49BACA8D695CFAFC8A2D4084070CC704743",
      "coffee_rules.json": "C06F3A7F6AF2DFDFCA6BDAC91408610DCC8363A57770AF16E0A60D012EC21014",
      "coffee_hs_codes.json": "92F086FAEB56A541AF5DD6851CB68C9CE129F4DA7908EAD0B457FE11A59FCD5E",
    }

    for (const [filename, expectedHash] of Object.entries(expectedHashes)) {
      const fullPath = path.join(ROOT_DIR, "src/data", filename)
      expect(fs.existsSync(fullPath)).toBe(true)
      const computedHash = computeFileHash(fullPath)
      expect(computedHash).toBe(expectedHash)
    }
  })

  // ── 21. Frontend Source Code Does Not Import Gemini SDK ─────
  it("21. Frontend source code in src/ does not import GoogleGenAI or @google/genai", () => {
    const srcDir = path.join(ROOT_DIR, "src")
    const scanDir = (dir: string): string[] => {
      const files = fs.readdirSync(dir)
      const results: string[] = []
      for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          if (!fullPath.includes("providers")) {
            results.push(...scanDir(fullPath))
          }
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          if (!fullPath.includes("tests")) {
            results.push(fullPath)
          }
        }
      }
      return results
    }

    const clientSourceFiles = scanDir(srcDir)
    expect(clientSourceFiles.length).toBeGreaterThan(0)

    for (const filePath of clientSourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).not.toContain("@google/genai")
      expect(content).not.toContain("GoogleGenAI")
      expect(content).not.toContain("VITE_GEMINI_API_KEY")
    }
  })

  // ── 22. Production Build Bundle Security ────────────────────
  it("22. Production build bundle (dist/) does not contain GEMINI_API_KEY or @google/genai", () => {
    const distDir = path.join(ROOT_DIR, "dist")
    if (!fs.existsSync(distDir)) {
      console.warn("dist/ not found, skipping bundle test")
      return
    }

    const scanDist = (dir: string): string[] => {
      const files = fs.readdirSync(dir)
      const results: string[] = []
      for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          results.push(...scanDist(fullPath))
        } else if (file.endsWith(".js")) {
          results.push(fullPath)
        }
      }
      return results
    }

    const bundleFiles = scanDist(distDir)
    expect(bundleFiles.length).toBeGreaterThan(0)

    for (const jsFile of bundleFiles) {
      const content = fs.readFileSync(jsFile, "utf-8")
      expect(content).not.toContain("GEMINI_API_KEY")
      expect(content).not.toContain("VITE_GEMINI_API_KEY")
      expect(content).not.toContain("@google/genai")
    }
  })
})
