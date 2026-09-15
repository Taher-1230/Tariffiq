// ============================================================
// Classification History API & Integrity Tests — Phase 5D
//
// Tests:
//   1. Save Tea classification (Manual & AI)
//   2. Save Coffee classification (Manual & AI)
//   3. Save AI-assisted classification with extraction facts
//   4. Save manual classification
//   5. List classifications (newest-first default)
//   6. Pagination controls (page, limit, total, totalPages)
//   7. Category filter (productCategory: 'tea' | 'coffee')
//   8. Source filter (source: 'ai' | 'manual')
//   9. Search filter (HS code, description, product text)
//   10. Get single history record detail
//   11. Security: Client HS-code tampering is overridden by server classifier
//   12. Security: Client classification object tampering is overridden
//   13. Security: Client matchedRuleId tampering is overridden
//   14. Security: Wrong product category / input mismatch returns 400
//   15. Security: Unsupported category (e.g. 'spices') is rejected
//   16. Error: Missing record returns 404
//   17. Error: Invalid request body / missing source returns 400
//   18. Error: Malformed MongoDB ID returns 400
//   19. Integrity: Saved HS code matches server-side deterministic classifier
//   20. Integrity: Saved rule ID matches deterministic classifier
//   21. Integrity: Saved explanation matches deterministic classifier
//   22. Integrity: Tea classification behavior unchanged
//   23. Integrity: Coffee classification behavior unchanged
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
    jwtSecret: "test-history-5d-jwt-secret-2026",
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

describe("Classification History & Server Authority Tests (Phase 5D)", () => {
  // ── Save ───────────────────────────────────────────────────

  it("1. Save Tea classification (Manual)", async () => {
    const { cookie } = await createAuthenticatedUser("tea.manual@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
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
    expect(res.body.item.productCategory).toBe("tea")
    expect(res.body.item.inputSource).toBe("manual")
    expect(res.body.item.classification.hsCode).toBe("09021020")
    expect(res.body.item.classification.matchedRuleId).toBe("TEA-002")
  })

  it("2. Save Coffee classification (Manual)", async () => {
    const { cookie } = await createAuthenticatedUser("coffee.manual@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        source: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: false,
          presentation: "bulk",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe("success")
    expect(res.body.item.productCategory).toBe("coffee")
    expect(res.body.item.classification.hsCode).toBe("09012110")
    expect(res.body.item.classification.matchedRuleId).toBe("COF-018")
  })

  it("3. Save AI-assisted classification with extraction facts", async () => {
    const { cookie } = await createAuthenticatedUser("ai.save@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "ai",
        productDescription: "Roasted Arabica plantation coffee beans, Grade A, bulk packaging",
        extraction: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: false,
          presentation: "bulk",
          form: "arabica_plantation",
          grade: "A",
        },
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: false,
          presentation: "bulk",
          form: "arabica_plantation",
          grade: "A",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.inputSource).toBe("ai")
    expect(res.body.item.productDescription).toContain("Arabica plantation")
    expect(res.body.item.extraction).toBeDefined()
    expect(res.body.item.classification.hsCode).toBe("09012110")
  })

  it("4. Save manual classification via 'source' and 'input' aliases", async () => {
    const { cookie } = await createAuthenticatedUser("alias.save@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        source: "manual",
        input: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 50,
          weightUnit: "kg",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.hsCode).toBe("09024020")
    expect(res.body.historyId).toBeDefined()
  })

  // ── Retrieve ───────────────────────────────────────────────

  it("5. List classifications ordered newest-first", async () => {
    const { cookie } = await createAuthenticatedUser("list.user@example.com")

    // Record 1 (Older: Green tea)
    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
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

    // Record 2 (Newer: Coffee)
    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    const res = await request(app).get("/api/classifications").set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(2)
    expect(res.body.items[0].productCategory).toBe("coffee")
    expect(res.body.items[1].productCategory).toBe("tea")
  })

  it("6. Pagination controls (page, limit, total, totalPages)", async () => {
    const { cookie } = await createAuthenticatedUser("paged.user@example.com")

    for (let i = 0; i < 7; i++) {
      await request(app)
        .post("/api/classifications")
        .set("Cookie", cookie)
        .send({
          productCategory: "tea",
          inputSource: "manual",
          confirmedInput: {
            productCategory: "tea",
            teaType: "black",
            presentation: "immediate_packing",
            form: "whole_leaf",
            netWeight: 100 * (i + 1),
            weightUnit: "g",
          },
        })
    }

    const res = await request(app)
      .get("/api/classifications?page=2&limit=3")
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(3)
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(3)
    expect(res.body.total).toBe(7)
    expect(res.body.totalPages).toBe(3)
  })

  it("7. Category filter (productCategory: 'tea' | 'coffee')", async () => {
    const { cookie } = await createAuthenticatedUser("filter.cat@example.com")

    // 2 Tea records
    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 5,
          weightUnit: "kg",
        },
      })

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 10,
          weightUnit: "kg",
        },
      })

    // 1 Coffee record
    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    const teaRes = await request(app)
      .get("/api/classifications?productCategory=tea")
      .set("Cookie", cookie)

    expect(teaRes.status).toBe(200)
    expect(teaRes.body.items.length).toBe(2)
    expect(teaRes.body.total).toBe(2)
    expect(teaRes.body.items.every((i: any) => i.productCategory === "tea")).toBe(true)

    const coffeeRes = await request(app)
      .get("/api/classifications?productCategory=coffee")
      .set("Cookie", cookie)

    expect(coffeeRes.status).toBe(200)
    expect(coffeeRes.body.items.length).toBe(1)
    expect(coffeeRes.body.total).toBe(1)
    expect(coffeeRes.body.items[0].productCategory).toBe("coffee")
  })

  it("8. Source filter (source: 'ai' | 'manual')", async () => {
    const { cookie } = await createAuthenticatedUser("filter.source@example.com")

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 5,
          weightUnit: "kg",
        },
      })

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "ai",
        productDescription: "Roasted decaffeinated bulk coffee",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: true,
          presentation: "bulk",
        },
      })

    const aiRes = await request(app)
      .get("/api/classifications?source=ai")
      .set("Cookie", cookie)

    expect(aiRes.status).toBe(200)
    expect(aiRes.body.items.length).toBe(1)
    expect(aiRes.body.items[0].inputSource).toBe("ai")

    const manualRes = await request(app)
      .get("/api/classifications?source=manual")
      .set("Cookie", cookie)

    expect(manualRes.status).toBe(200)
    expect(manualRes.body.items.length).toBe(1)
    expect(manualRes.body.items[0].inputSource).toBe("manual")
  })

  it("9. Search filter across HS code and description", async () => {
    const { cookie } = await createAuthenticatedUser("search.user@example.com")

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
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

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "ai",
        productDescription: "Arabica cherry coffee AB grade",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: false,
          decaffeinated: false,
          form: "arabica_cherry",
          grade: "AB",
        },
      })

    // Search by HS code
    const hsSearch = await request(app)
      .get("/api/classifications?search=09021020")
      .set("Cookie", cookie)

    expect(hsSearch.status).toBe(200)
    expect(hsSearch.body.items.length).toBe(1)
    expect(hsSearch.body.items[0].classification.hsCode).toBe("09021020")

    // Search by product text
    const textSearch = await request(app)
      .get("/api/classifications?search=Arabica")
      .set("Cookie", cookie)

    expect(textSearch.status).toBe(200)
    expect(textSearch.body.items.length).toBe(1)
    expect(textSearch.body.items[0].productCategory).toBe("coffee")
  })

  it("10. Get single history record detail", async () => {
    const { cookie } = await createAuthenticatedUser("detail.user@example.com")

    const saveRes = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    const id = saveRes.body.item.id

    const res = await request(app)
      .get(`/api/classifications/${id}`)
      .set("Cookie", cookie)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("success")
    expect(res.body.item.id).toBe(id)
    expect(res.body.item.classification.hsCode).toBe("09019010")
    expect(res.body.item.classification.matchedRuleId).toBe("COF-022")
  })

  // ── Security & Authority ───────────────────────────────────

  it("11. CRITICAL: Client HS-code tampering is completely ignored by server", async () => {
    const { cookie } = await createAuthenticatedUser("tamper.hs@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        hsCode: "99999999", // Malicious HS code
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: false,
          presentation: "bulk",
        },
      })

    expect(res.status).toBe(201)
    // Server must determine 0901 21 10 deterministically
    expect(res.body.item.classification.hsCode).toBe("09012110")
    expect(res.body.item.classification.hsCode).not.toBe("99999999")
  })

  it("12. CRITICAL: Client classification object tampering is ignored", async () => {
    const { cookie } = await createAuthenticatedUser("tamper.obj@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        classification: {
          hsCode: "12345678",
          description: "Fake Injected Description",
          matchedRuleId: "FAKE-001",
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
    expect(res.body.item.classification.hsCode).toBe("09021020")
    expect(res.body.item.classification.matchedRuleId).toBe("TEA-002")
  })

  it("13. CRITICAL: Client matchedRuleId tampering is ignored", async () => {
    const { cookie } = await createAuthenticatedUser("tamper.rule@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        matchedRuleId: "COF-999",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: true,
          presentation: "bulk",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.matchedRuleId).toBe("COF-020")
    expect(res.body.item.classification.hsCode).toBe("09022210".replace("0902", "0901"))
  })

  it("14. Rejects input mismatch / invalid physical attributes with 400", async () => {
    const { cookie } = await createAuthenticatedUser("mismatch.user@example.com")

    // Coffee category with missing required attributes
    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          // missing roasted
        },
      })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_CLASSIFICATION_INPUT")
  })

  it("15. Rejects unsupported product category with 400", async () => {
    const { cookie } = await createAuthenticatedUser("unsupported.cat@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "electronics",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "electronics",
        },
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain("Unsupported product category")
  })

  // ── Errors & Edge Cases ────────────────────────────────────

  it("16. Missing record returns 404", async () => {
    const { cookie } = await createAuthenticatedUser("notfound.user@example.com")

    const res = await request(app)
      .get("/api/classifications/507f1f77bcf86cd799439011")
      .set("Cookie", cookie)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe("NOT_FOUND")
  })

  it("17. Missing or invalid inputSource returns 400", async () => {
    const { cookie } = await createAuthenticatedUser("badsource.user@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        inputSource: "invalid_source",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
          netWeight: 10,
          weightUnit: "kg",
        },
      })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
  })

  it("18. Malformed MongoDB ID returns 400", async () => {
    const { cookie } = await createAuthenticatedUser("badid.user@example.com")

    const res = await request(app)
      .get("/api/classifications/invalid-id")
      .set("Cookie", cookie)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_ID")
  })

  // ── Integrity ──────────────────────────────────────────────

  it("19. Saved HS code matches server-side deterministic classifier", async () => {
    const { cookie } = await createAuthenticatedUser("integrity.hs@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "immediate_packing",
          form: "whole_leaf",
          netWeight: 500,
          weightUnit: "g",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.hsCode).toBe("09023020")
    expect(res.body.item.classification.hsCodeFormatted).toBe("0902 30 20")
  })

  it("20. Saved rule ID matches deterministic classifier", async () => {
    const { cookie } = await createAuthenticatedUser("integrity.rule@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "substitutes_containing_coffee",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.matchedRuleId).toBe("COF-023")
    expect(res.body.item.classification.hsCode).toBe("09019020")
  })

  it("21. Saved explanation matches deterministic structured explanation", async () => {
    const { cookie } = await createAuthenticatedUser("integrity.expl@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: true,
          decaffeinated: false,
          presentation: "other",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.structuredExplanation).toBeDefined()
    expect(res.body.item.classification.structuredExplanation.roastedState).toBe("Roasted")
    expect(res.body.item.classification.structuredExplanation.decaffeinatedState).toBe("Non-decaffeinated")
  })

  it("22. Tea classification behavior unchanged across all branches", async () => {
    const { cookie } = await createAuthenticatedUser("tea.branches@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "tea",
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

    expect(res.status).toBe(201)
    expect(res.body.item.classification.hsCode).toBe("09024040")
    expect(res.body.item.classification.matchedRuleId).toBe("TEA-017")
  })

  it("23. Coffee classification behavior unchanged across all branches", async () => {
    const { cookie } = await createAuthenticatedUser("coffee.branches@example.com")

    const res = await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "coffee",
          roasted: false,
          decaffeinated: false,
          form: "arabica_plantation",
          grade: "A",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.classification.hsCode).toBe("09011111")
    expect(res.body.item.classification.matchedRuleId).toBe("COF-001")
  })

  // ── CSV Export ─────────────────────────────────────────────

  it("24. Export filtered classifications as CSV", async () => {
    const { cookie } = await createAuthenticatedUser("csv.export@example.com")

    await request(app)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        productCategory: "coffee",
        inputSource: "manual",
        confirmedInput: {
          productCategory: "coffee",
          productType: "husks_and_skins",
        },
      })

    const csvRes = await request(app)
      .get("/api/classifications/export/csv?productCategory=coffee")
      .set("Cookie", cookie)

    expect(csvRes.status).toBe(200)
    expect(csvRes.headers["content-type"]).toContain("text/csv")
    expect(csvRes.text).toContain('"Date","Product Category","Source","HS Code","Description","Matched Rule"')
    expect(csvRes.text).toContain("Coffee (0901)")
    expect(csvRes.text).toContain("0901 90 10")
    expect(csvRes.text).toContain("COF-022")
  })
})
