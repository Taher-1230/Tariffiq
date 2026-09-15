// ============================================================
// Classification History API & Integrity Tests — Phase 5B
//
// Tests Classification Saving, Retrieval, Authorization Boundaries,
// Pagination, Deletion, and Server-Side Deterministic Re-Verification.
//
// Test Cases:
//   1.  Save authenticated manual classification
//   2.  Save authenticated AI classification with extraction facts
//   3.  Server re-runs classifyTea() and overrides malicious client HS code
//   4.  Get own paginated history (newest first)
//   5.  Pagination controls (page, limit, total)
//   6.  Get own classification detail
//   7.  Security: User A cannot view User B's classification (returns 404)
//   8.  Delete own classification
//   9.  Security: User A cannot delete User B's classification (returns 404)
//   10. Empty history returns empty items array
//   11. Invalid MongoDB ObjectId returns 400
//   12. Unauthenticated request to history returns 401
//   13. Client cannot inject arbitrary userId (server derives identity)
//   14. Invalid physical classification input returns 400
// ============================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import request from "supertest"
import { MongoMemoryServer } from "mongodb-memory-server"
import { createApp } from "../app.js"
import { connectToDatabase, disconnectDatabase } from "../db/mongoose.js"
import { User } from "../models/User.js"
import { Classification } from "../models/Classification.js"
import type { ServerConfig } from "../config.js"

let mongoServer: MongoMemoryServer
let testConfig: ServerConfig
let app: ReturnType<typeof createApp>

// Helper to register and get session cookie
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
    jwtSecret: "test-history-jwt-secret-2026",
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

describe("Classification History & Integrity Tests (Phase 5B)", () => {
  // ── 1. Save Manual Classification ──────────────────────────
  it("1. Saves manual classification for authenticated user", async () => {
    const { cookie } = await createAuthenticatedUser("manual@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
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
    expect(res.body.status).toBe("success")
    expect(res.body.item).toBeDefined()
    expect(res.body.item.inputSource).toBe("manual")
    expect(res.body.item.classification.hsCode).toBe("09021020")
    expect(res.body.item.classification.matchedRuleId).toBe("TEA-002")
  })

  // ── 2. Save AI Classification ──────────────────────────────
  it("2. Saves AI classification with original description and extraction facts", async () => {
    const { cookie } = await createAuthenticatedUser("ai.user@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "ai",
        productDescription: "Organic green tea leaves in 250g tins",
        extraction: {
          productCategory: "tea",
          teaType: "green",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 250,
          weightUnit: "g",
        },
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 250,
          weightUnit: "g",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe("success")
    expect(res.body.item.inputSource).toBe("ai")
    expect(res.body.item.productDescription).toBe("Organic green tea leaves in 250g tins")
    expect(res.body.item.extraction).toBeDefined()
    expect(res.body.item.classification.hsCode).toBe("09021020")
  })

  // ── 3. Server Re-Runs classifyTea() / Security Invariant ────
  it("3. CRITICAL: Server re-runs classifyTea() and overrides spoofed client HS code", async () => {
    const { cookie } = await createAuthenticatedUser("security@example.com")

    // Client attempts to spoof an arbitrary HS code "99999999" and rule "FAKE-999"
    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 500,
          weightUnit: "g",
        },
        classification: {
          hsCode: "99999999",
          matchedRuleId: "FAKE-999",
          description: "Maliciously Injected Tariff Code",
        },
      })

    expect(res.status).toBe(201)
    // Server must ignore client's classification and calculate the authentic deterministic result
    expect(res.body.item.classification.hsCode).toBe("09023020")
    expect(res.body.item.classification.matchedRuleId).toBe("TEA-011")
    expect(res.body.item.classification.hsCode).not.toBe("99999999")
  })

  // ── 4. Get Own Paginated History ───────────────────────────
  it("4. Retrieves own history ordered newest first", async () => {
    const { cookie } = await createAuthenticatedUser("history@example.com")

    // Create 3 classifications
    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 50,
          weightUnit: "kg",
        },
      })

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 50,
          weightUnit: "kg",
        },
      })

    const res = await request(app)
      .get("/api/classifications")
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(2)
    expect(res.body.total).toBe(2)
    // First item should be the newest (Black tea)
    expect(res.body.items[0].confirmedInput.teaType).toBe("black")
    expect(res.body.items[1].confirmedInput.teaType).toBe("green")
  })

  // ── 5. Pagination Controls ─────────────────────────────────
  it("5. Supports pagination parameters (page, limit, total)", async () => {
    const { cookie } = await createAuthenticatedUser("page.user@example.com")

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/classifications")
        .set("Cookie", cookie)
        .send({
          inputSource: "manual",
          confirmedInput: {
            productCategory: "tea",
            teaType: "green",
            presentation: "immediate_packing",
            form: "whole_leaf",
            netWeight: 100 * (i + 1),
            weightUnit: "g",
          },
        })
    }

    // Page 1, limit 2
    const p1 = await request(app)
      .get("/api/classifications?page=1&limit=2")
      .set("Cookie", cookie)

    expect(p1.status).toBe(200)
    expect(p1.body.items.length).toBe(2)
    expect(p1.body.total).toBe(5)
    expect(p1.body.page).toBe(1)
    expect(p1.body.limit).toBe(2)

    // Page 2, limit 2
    const p2 = await request(app)
      .get("/api/classifications?page=2&limit=2")
      .set("Cookie", cookie)

    expect(p2.status).toBe(200)
    expect(p2.body.items.length).toBe(2)
    expect(p2.body.page).toBe(2)
  })

  // ── 6. Get Own Detail ──────────────────────────────────────
  it("6. Retrieves single classification detail for owner", async () => {
    const { cookie } = await createAuthenticatedUser("detail@example.com")

    const saveRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "immediate_packing",
          form: "tea_bags",
          netWeight: 200,
          weightUnit: "g",
        },
      })

    const itemId = saveRes.body.item.id

    const res = await request(app)
      .get(`/api/classifications/${itemId}`)
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("success")
    expect(res.body.item.id).toBe(itemId)
    expect(res.body.item.classification.hsCode).toBe("09024040")
    expect(res.body.item.classification.structuredExplanation).toBeDefined()
  })

  // ── 7. Multi-User Isolation: Cannot View Other's Record ───
  it("7. User A cannot view User B's classification detail (returns 404)", async () => {
    const userA = await createAuthenticatedUser("userA@example.com")
    const userB = await createAuthenticatedUser("userB@example.com")

    // User A creates a record
    const saveRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 100,
          weightUnit: "kg",
        },
      })

    const itemAId = saveRes.body.item.id

    // User B tries to view User A's record
    const res = await request(app)
      .get(`/api/classifications/${itemAId}`)
      .set("Cookie", userB.cookie)

    expect(res.status).toBe(404)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("NOT_FOUND")
  })

  // ── 8. Delete Own Classification ───────────────────────────
  it("8. Allows owner to delete their own classification", async () => {
    const { cookie } = await createAuthenticatedUser("delete@example.com")

    const saveRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 10,
          weightUnit: "kg",
        },
      })

    const itemId = saveRes.body.item.id

    const deleteRes = await request(app)
      .delete(`/api/classifications/${itemId}`)
      .set("Cookie", cookie)

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.status).toBe("ok")

    // Subsequent find should be 404
    const findRes = await request(app)
      .get(`/api/classifications/${itemId}`)
      .set("Cookie", cookie)

    expect(findRes.status).toBe(404)
  })

  // ── 9. Multi-User Isolation: Cannot Delete Other's Record ─
  it("9. User A cannot delete User B's classification (returns 404)", async () => {
    const userA = await createAuthenticatedUser("userA.del@example.com")
    const userB = await createAuthenticatedUser("userB.del@example.com")

    // User A creates a record
    const saveRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 50,
          weightUnit: "kg",
        },
      })

    const itemAId = saveRes.body.item.id

    // User B tries to delete User A's record
    const delRes = await request(app)
      .delete(`/api/classifications/${itemAId}`)
      .set("Cookie", userB.cookie)

    expect(delRes.status).toBe(404)
    expect(delRes.body.errorCode).toBe("NOT_FOUND")

    // Record should still exist for User A
    const checkRes = await request(app)
      .get(`/api/classifications/${itemAId}`)
      .set("Cookie", userA.cookie)

    expect(checkRes.status).toBe(200)
  })

  // ── 10. Empty History ──────────────────────────────────────
  it("10. Returns empty list with zero total for new users", async () => {
    const { cookie } = await createAuthenticatedUser("empty@example.com")

    const res = await request(app)
      .get("/api/classifications")
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
    expect(res.body.total).toBe(0)
  })

  // ── 11. Invalid ID Format ──────────────────────────────────
  it("11. Rejects malformed MongoDB ObjectId with 400", async () => {
    const { cookie } = await createAuthenticatedUser("badid@example.com")

    const res = await request(app)
      .get("/api/classifications/not-a-valid-object-id")
      .set("Cookie", cookie)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_ID")
  })

  // ── 12. Unauthenticated Access Rejected ────────────────────
  it("12. Rejects unauthenticated access to classification history endpoints", async () => {
    const getRes = await request(app).get("/api/classifications")
    expect(getRes.status).toBe(401)

    const postRes = await request(app)
      .post("/api/classifications")
      .send({ inputSource: "manual" })
    expect(postRes.status).toBe(401)
  })

  // ── 13. Client Cannot Inject userId ────────────────────────
  it("13. Client cannot inject arbitrary userId (server derives from session)", async () => {
    const userA = await createAuthenticatedUser("userA.id@example.com")
    const userB = await createAuthenticatedUser("userB.id@example.com")

    // User A passes User B's userId in the body
    const saveRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", userA.cookie)
      .send({
        userId: userB.user.id,
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 500,
          weightUnit: "g",
        },
      })

    expect(saveRes.status).toBe(201)
    // The stored record must belong to User A, not User B
    expect(saveRes.body.item.userId).toBe(userA.user.id)
    expect(saveRes.body.item.userId).not.toBe(userB.user.id)
  })
})
