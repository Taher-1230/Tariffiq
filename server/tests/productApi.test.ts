// ============================================================
// Product API Tests — Phase 5C-A
//
// Tests the product-agnostic API endpoints:
//   1. POST /api/ai/extract with productCategory: "tea"
//   2. POST /api/ai/extract with unsupported product
//   3. POST /api/ai/extract with missing productCategory
//   4. POST /api/ai/extract-tea still works (backward compat)
//   5. POST /api/classifications with productCategory
//   6. POST /api/classifications without productCategory (defaults to tea)
//   7. History items include productCategory
//   8. Classification with unsupported product is rejected
//   9. verifyAndClassifyProduct delegation tests
//
// Does NOT call the real Gemini API.
// ============================================================

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest"
import request from "supertest"
import express from "express"
import helmet from "helmet"
import { MongoMemoryServer } from "mongodb-memory-server"
import { requestIdMiddleware } from "../middleware/requestId.js"
import { errorHandler } from "../middleware/errorHandler.js"
import { createAiRouter } from "../routes/ai.js"
import { createApp } from "../app.js"
import { connectToDatabase, disconnectDatabase } from "../db/mongoose.js"
import { User } from "../models/User.js"
import { Classification } from "../models/Classification.js"
import type { ServerConfig } from "../config.js"
import {
  verifyAndClassifyProduct,
} from "../services/classificationService.js"

// ── Mock Gemini Service ──────────────────────────────────────

vi.mock("../services/geminiService.js", () => {
  return {
    extractWithGemini: vi.fn(),
    extractCoffeeWithGemini: vi.fn(),
    extractSpicesWithGemini: vi.fn(),
    GeminiServiceError: class GeminiServiceError extends Error {
      errorCode: string
      constructor(errorCode: string, message: string) {
        super(message)
        this.name = "GeminiServiceError"
        this.errorCode = errorCode
      }
    },
  }
})

import {
  extractWithGemini,
  extractCoffeeWithGemini,
  extractSpicesWithGemini,
} from "../services/geminiService.js"

const mockedExtract = vi.mocked(extractWithGemini)
const mockedCoffeeExtract = vi.mocked(extractCoffeeWithGemini)
const mockedSpicesExtract = vi.mocked(extractSpicesWithGemini)

const VALID_EXTRACTION_RESULT = {
  status: "extracted" as const,
  attributes: {
    productCategory: "tea" as const,
    teaType: "black" as const,
    presentation: "immediate_packing" as const,
    form: "whole_leaf" as const,
    netWeight: 500,
    weightUnit: "g" as const,
  },
  missingFields: [],
  ambiguities: [],
  evidence: [],
  sourceText: "Premium black tea 500g",
}

const VALID_COFFEE_EXTRACTION_RESULT = {
  status: "extracted" as const,
  attributes: {
    productCategory: "coffee" as const,
    productType: "coffee" as const,
    roasted: true,
    decaffeinated: false,
    presentation: "bulk" as const,
    form: "arabica_plantation" as const,
    grade: "A" as const,
  },
  missingFields: [],
  ambiguities: [],
  evidence: [],
  sourceText: "Roasted Arabica plantation coffee Grade A bulk",
}

const VALID_SPICES_EXTRACTION_RESULT = {
  status: "extracted" as const,
  attributes: {
    productCategory: "spices" as const,
    spiceType: "pepper" as const,
    botanicalType: "piper" as const,
    crushedOrGround: false,
    subType: "black_pepper_garbled" as const,
    form: "seed" as const,
    processingState: "dried" as const,
    quality: "unknown" as const,
    sizeCategory: "unknown" as const,
    isCubeb: false,
    essentialCharacter: true,
  },
  missingFields: [],
  ambiguities: [],
  evidence: [],
  sourceText: "Whole dried black pepper garbled",
}

const AI_TEST_CONFIG: ServerConfig = {
  geminiApiKey: "test-key-not-real",
  geminiModel: "gemini-3.6-flash",
  port: 3001,
  frontendOrigin: "http://localhost:5173",
  isProduction: false,
  mongodbUri: "mongodb://localhost:27017/test-unused",
  jwtSecret: "test-product-api-jwt-2026",
}

function createAiTestApp() {
  const app = express()
  app.use(helmet())
  app.use(express.json({ limit: "20kb" }))
  app.use(requestIdMiddleware)
  const aiRouter = createAiRouter(AI_TEST_CONFIG)
  app.use("/api/ai", aiRouter)
  app.use(errorHandler)
  return app
}

// ── Generic Extraction API Tests ─────────────────────────────

describe("POST /api/ai/extract (Generic Extraction)", () => {
  let aiApp: ReturnType<typeof createAiTestApp>

  beforeEach(() => {
    vi.clearAllMocks()
    aiApp = createAiTestApp()
  })

  it("1. Accepts productCategory: 'tea' and returns extraction result", async () => {
    mockedExtract.mockResolvedValue(VALID_EXTRACTION_RESULT)

    const res = await request(aiApp)
      .post("/api/ai/extract")
      .send({ productCategory: "tea", text: "Premium black tea 500g" })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("extracted")
    expect(res.body.attributes.productCategory).toBe("tea")
  })

  it("2. Accepts productCategory: 'coffee' and returns coffee extraction result", async () => {
    mockedCoffeeExtract.mockResolvedValue(VALID_COFFEE_EXTRACTION_RESULT)

    const res = await request(aiApp)
      .post("/api/ai/extract")
      .send({ productCategory: "coffee", text: "Roasted Arabica plantation coffee Grade A bulk" })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("extracted")
    expect(res.body.attributes.productCategory).toBe("coffee")
    expect(res.body.attributes.roasted).toBe(true)
    expect(mockedCoffeeExtract).toHaveBeenCalledTimes(1)
  })

  it("2b. Accepts productCategory: 'spices' and returns spices extraction result", async () => {
    mockedSpicesExtract.mockResolvedValue(VALID_SPICES_EXTRACTION_RESULT)

    const res = await request(aiApp)
      .post("/api/ai/extract")
      .send({ productCategory: "spices", text: "Whole dried black pepper garbled" })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("extracted")
    expect(res.body.attributes.productCategory).toBe("spices")
    expect(res.body.attributes.spiceType).toBe("pepper")
    expect(mockedSpicesExtract).toHaveBeenCalledTimes(1)
  })

  it("2c. Rejects unsupported productCategory: 'electronics'", async () => {
    const res = await request(aiApp)
      .post("/api/ai/extract")
      .send({ productCategory: "electronics", text: "Smartphone" })

    expect(res.status).toBe(400)
    expect(res.body.status).toBe("unsupported")
    expect(res.body.message).toContain("electronics")
    expect(res.body.message).toContain("not currently supported")
  })

  it("3. Rejects missing productCategory", async () => {
    const res = await request(aiApp)
      .post("/api/ai/extract")
      .send({ text: "Some product" })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
    expect(res.body.message).toContain("productCategory")
  })

  it("4. Rejects empty text with productCategory: 'tea'", async () => {
    const res = await request(aiApp)
      .post("/api/ai/extract")
      .send({ productCategory: "tea", text: "  " })

    expect(res.status).toBe(400)
  })

  it("5. Rejects missing text with productCategory: 'tea'", async () => {
    const res = await request(aiApp)
      .post("/api/ai/extract")
      .send({ productCategory: "tea" })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain("text")
  })
})

// ── Backward Compatibility: /extract-tea ──────────────────────

describe("POST /api/ai/extract-tea (Backward Compatibility)", () => {
  let aiApp: ReturnType<typeof createAiTestApp>

  beforeEach(() => {
    vi.clearAllMocks()
    aiApp = createAiTestApp()
  })

  it("6. POST /api/ai/extract-tea still works", async () => {
    mockedExtract.mockResolvedValue(VALID_EXTRACTION_RESULT)

    const res = await request(aiApp)
      .post("/api/ai/extract-tea")
      .send({ text: "Premium black tea 500g" })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("extracted")
  })
})

// ── Classification Service Tests ─────────────────────────────

describe("verifyAndClassifyProduct", () => {
  it("7. Classifies 'tea' correctly", () => {
    const result = verifyAndClassifyProduct("tea", {
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
    })

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.classification).toBeDefined()
  })

  it("8. Classifies 'coffee' correctly and rejects unsupported product 'electronics'", () => {
    const coffeeRes = verifyAndClassifyProduct("coffee", {
      productCategory: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "bulk",
    })

    expect(coffeeRes.valid).toBe(true)
    expect(coffeeRes.classification).toBeDefined()

    const spiceRes = verifyAndClassifyProduct("electronics", {
      productCategory: "electronics",
    })

    expect(spiceRes.valid).toBe(false)
    expect(spiceRes.errors[0]).toContain("Unsupported product category")
    expect(spiceRes.errors[0]).toContain("electronics")
  })

  it("9. Defaults to 'tea' when productCategory is undefined", () => {
    const result = verifyAndClassifyProduct(undefined, {
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "whole_leaf",
    })

    expect(result.valid).toBe(true)
    expect(result.classification).toBeDefined()
  })

  it("10. Rejects null confirmedInput", () => {
    const result = verifyAndClassifyProduct("tea", null)

    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("non-null object")
  })

  it("11. Returns validation errors for invalid tea input", () => {
    const result = verifyAndClassifyProduct("tea", {
      productCategory: "tea",
      teaType: "not_sure",
    })

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

// ── History with productCategory ─────────────────────────────

describe("Classification History with productCategory", () => {
  let mongoServer: MongoMemoryServer
  let fullApp: ReturnType<typeof createApp>

  async function createAuthenticatedUser(email: string) {
    const regRes = await request(fullApp)
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

    const historyConfig: ServerConfig = {
      ...AI_TEST_CONFIG,
      mongodbUri: mongoUri,
    }

    await connectToDatabase(mongoUri)
    fullApp = createApp(historyConfig)
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

  it("12. Saves classification with explicit productCategory: 'tea'", async () => {
    const { cookie } = await createAuthenticatedUser("product-test@example.com")

    const res = await request(fullApp)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        productCategory: "tea",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe("success")
    expect(res.body.item.productCategory).toBe("tea")
  })

  it("13. Saves classification without productCategory (defaults to tea)", async () => {
    const { cookie } = await createAuthenticatedUser("default-cat@example.com")

    const res = await request(fullApp)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        confirmedInput: {
          productCategory: "tea",
          teaType: "black",
          presentation: "bulk",
          form: "whole_leaf",
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.item.productCategory).toBe("tea")
  })

  it("14. History list includes productCategory", async () => {
    const { cookie } = await createAuthenticatedUser("history-cat@example.com")

    await request(fullApp)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        productCategory: "tea",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
        },
      })

    const listRes = await request(fullApp)
      .get("/api/classifications")
      .set("Cookie", cookie)

    expect(listRes.status).toBe(200)
    expect(listRes.body.items).toHaveLength(1)
    expect(listRes.body.items[0].productCategory).toBe("tea")
  })

  it("15. Saves coffee classification and rejects unsupported productCategory 'electronics'", async () => {
    const { cookie } = await createAuthenticatedUser("coffee-save@example.com")

    const coffeeRes = await request(fullApp)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        productCategory: "coffee",
        confirmedInput: {
          productCategory: "coffee",
          roasted: true,
          decaffeinated: false,
          presentation: "bulk",
        },
      })

    expect(coffeeRes.status).toBe(201)
    expect(coffeeRes.body.item.productCategory).toBe("coffee")
    expect(coffeeRes.body.item.classification.hsCode).toBe("09012110")

    const spiceRes = await request(fullApp)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        productCategory: "electronics",
        confirmedInput: {
          productCategory: "electronics",
        },
      })

    expect(spiceRes.status).toBe(400)
    expect(spiceRes.body.errorCode).toBe("INVALID_CLASSIFICATION_INPUT")
    expect(spiceRes.body.message).toContain("Unsupported product category")
  })

  it("16. History detail includes productCategory", async () => {
    const { cookie } = await createAuthenticatedUser("detail-cat@example.com")

    const saveRes = await request(fullApp)
      .post("/api/classifications")
      .set("Cookie", cookie)
      .send({
        inputSource: "manual",
        productCategory: "tea",
        confirmedInput: {
          productCategory: "tea",
          teaType: "green",
          presentation: "bulk",
          form: "whole_leaf",
        },
      })

    const detailRes = await request(fullApp)
      .get(`/api/classifications/${saveRes.body.item.id}`)
      .set("Cookie", cookie)

    expect(detailRes.status).toBe(200)
    expect(detailRes.body.item.productCategory).toBe("tea")
  })
})
