// ============================================================
// Backend API Tests — Phase 5A
//
// Tests the Express API endpoints with a mocked Gemini service.
// Does NOT call the real Gemini API.
//
// Test coverage:
//   1.  GET /api/health
//   2.  Valid tea extraction request
//   3.  Empty text
//   4.  Whitespace text
//   5.  Missing text field
//   6.  Non-string text
//   7.  Input too long
//   8.  Invalid Gemini response
//   9.  Gemini HS-code injection
//   10. Gemini classification injection
//   11. Provider unavailable
//   12. Rate limiting
//   13. CORS rejection
//   14. Generic internal error
//   15. Successful extraction response shape
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import { requestIdMiddleware } from "../middleware/requestId.js"
import { createAiRateLimiter } from "../middleware/rateLimit.js"
import { errorHandler } from "../middleware/errorHandler.js"
import { createAiRouter } from "../routes/ai.js"
import healthRouter from "../routes/health.js"
import type { ServerConfig } from "../config.js"

// ── Mock Gemini Service ──────────────────────────────────────

vi.mock("../services/geminiService.js", () => {
  return {
    extractWithGemini: vi.fn(),
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

import { extractWithGemini, GeminiServiceError } from "../services/geminiService.js"

const mockedExtract = vi.mocked(extractWithGemini)

// ── Test App Factory ─────────────────────────────────────────

const TEST_CONFIG: ServerConfig = {
  geminiApiKey: "test-key-not-real",
  geminiModel: "gemini-3.6-flash",
  port: 3001,
  frontendOrigin: "http://localhost:5173",
  isProduction: false,
}

function createTestApp(config: ServerConfig = TEST_CONFIG) {
  const app = express()
  app.use(helmet())
  app.use(cors({
    origin: config.frontendOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
  }))
  app.use(express.json({ limit: "20kb" }))
  app.use(requestIdMiddleware)
  app.use("/api/health", healthRouter)
  const aiRouter = createAiRouter(config)
  app.use("/api/ai", aiRouter)
  app.use(errorHandler)
  return app
}

function createRateLimitedApp() {
  const app = express()
  app.use(express.json({ limit: "20kb" }))
  app.use(requestIdMiddleware)
  const limiter = createAiRateLimiter({ windowMs: 60_000, maxRequests: 2 })
  const aiRouter = createAiRouter(TEST_CONFIG)
  app.use("/api/ai", limiter, aiRouter)
  app.use(errorHandler)
  return app
}

// ── Valid mock response ──────────────────────────────────────

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
  evidence: [
    { field: "teaType" as const, sourceText: "black tea" },
  ],
  sourceText: "Premium black tea, whole leaf, packed in 500g retail packs.",
}

// ── Tests ────────────────────────────────────────────────────

describe("Phase 5A Backend API Tests", () => {
  const app = createTestApp()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. GET /api/health returns 200 with status 'ok'", async () => {
    const res = await request(app).get("/api/health")
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("ok")
  })

  it("1b. Health endpoint does not expose secrets", async () => {
    const res = await request(app).get("/api/health")
    const body = JSON.stringify(res.body)
    expect(body).not.toContain("test-key-not-real")
    expect(body).not.toContain("GEMINI_API_KEY")
  })

  // ── 2. Valid extraction request ──────────────────────────
  it("2. Valid tea extraction returns 200 with TeaExtractionResult", async () => {
    mockedExtract.mockResolvedValueOnce(VALID_EXTRACTION_RESULT)

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Premium black tea, whole leaf, packed in 500g retail packs." })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("extracted")
    expect(res.body.attributes.productCategory).toBe("tea")
    expect(res.body.attributes.teaType).toBe("black")
    expect(res.body.attributes.netWeight).toBe(500)
  })

  // ── 3. Empty text ────────────────────────────────────────
  it("3. Empty text returns 400 INVALID_REQUEST", async () => {
    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "" })

    expect(res.status).toBe(400)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
  })

  // ── 4. Whitespace text ───────────────────────────────────
  it("4. Whitespace-only text returns 400 INVALID_REQUEST", async () => {
    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "   \n\t  " })

    expect(res.status).toBe(400)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
  })

  // ── 5. Missing text field ────────────────────────────────
  it("5. Missing text field returns 400", async () => {
    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ description: "Black tea" })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
    expect(res.body.message).toContain("text")
  })

  // ── 6. Non-string text ───────────────────────────────────
  it("6. Non-string text (number) returns 400", async () => {
    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: 12345 })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
    expect(res.body.message).toContain("string")
  })

  it("6b. Non-string text (array) returns 400", async () => {
    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: ["black", "tea"] })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
  })

  // ── 7. Input too long ────────────────────────────────────
  it("7. Input exceeding 10,000 characters returns 400", async () => {
    const longText = "a".repeat(10_001)
    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: longText })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe("INVALID_REQUEST")
    expect(res.body.message).toContain("10000")
  })

  // ── 8. Invalid Gemini response ───────────────────────────
  it("8. Invalid Gemini response returns 502", async () => {
    mockedExtract.mockRejectedValueOnce(
      new GeminiServiceError("INVALID_AI_RESPONSE", "Gemini returned invalid output")
    )

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea 500g" })

    expect(res.status).toBe(502)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 9. Gemini HS-code injection ──────────────────────────
  it("9. Gemini HS-code injection is caught by validation and returns 502", async () => {
    // The server's geminiService validates output — if hsCode appears,
    // it returns an error result, not a thrown error. But if the service
    // itself throws, we get 502.
    mockedExtract.mockRejectedValueOnce(
      new GeminiServiceError("INVALID_AI_RESPONSE", "Extraction contains forbidden classification field: 'hsCode'")
    )

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Green tea 1kg" })

    expect(res.status).toBe(502)
    expect(res.body.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 10. Gemini classification injection ──────────────────
  it("10. Gemini classification field injection returns 502", async () => {
    mockedExtract.mockRejectedValueOnce(
      new GeminiServiceError("INVALID_AI_RESPONSE", "Extraction contains forbidden classification field: 'chapter'")
    )

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Tea leaves" })

    expect(res.status).toBe(502)
    expect(res.body.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 11. Provider unavailable ─────────────────────────────
  it("11. Provider unavailable returns 503", async () => {
    mockedExtract.mockRejectedValueOnce(
      new GeminiServiceError("AI_PROVIDER_NOT_CONFIGURED", "API key not configured")
    )

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea" })

    expect(res.status).toBe(503)
    expect(res.body.errorCode).toBe("AI_PROVIDER_NOT_CONFIGURED")
  })

  // ── 12. Rate limiting ────────────────────────────────────
  it("12. Rate limiting returns 429 after exceeding limit", async () => {
    const rateLimitedApp = createRateLimitedApp()
    mockedExtract.mockResolvedValue(VALID_EXTRACTION_RESULT)

    // First two requests should succeed
    await request(rateLimitedApp)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea" })
      .expect(200)

    await request(rateLimitedApp)
      .post("/api/ai/extract-tea")
      .send({ text: "Green tea" })
      .expect(200)

    // Third request should be rate limited
    const res = await request(rateLimitedApp)
      .post("/api/ai/extract-tea")
      .send({ text: "Oolong tea" })

    expect(res.status).toBe(429)
    expect(res.body.errorCode).toBe("AI_RATE_LIMITED")
  })

  // ── 13. CORS rejection ──────────────────────────────────
  it("13. CORS rejects disallowed origins", async () => {
    const res = await request(app)
      .post("/api/ai/extract-tea")
      .set("Origin", "http://evil.example.com")
      .send({ text: "Black tea" })

    // CORS headers should not include the evil origin
    expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil.example.com")
  })

  it("13b. CORS allows configured frontend origin", async () => {
    mockedExtract.mockResolvedValueOnce(VALID_EXTRACTION_RESULT)

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .set("Origin", "http://localhost:5173")
      .send({ text: "Black tea" })

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173")
  })

  // ── 14. Generic internal error ───────────────────────────
  it("14. Generic internal error returns 500 with safe message", async () => {
    mockedExtract.mockRejectedValueOnce(new Error("Unexpected crash with secret-info"))

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea" })

    expect(res.status).toBe(500)
    expect(res.body.status).toBe("error")
    expect(res.body.errorCode).toBe("INTERNAL_ERROR")
    expect(res.body.message).not.toContain("secret-info")
    expect(res.body.message).not.toContain("crash")
  })

  // ── 15. Successful extraction response shape ─────────────
  it("15. Successful response has correct TeaExtractionResult shape", async () => {
    mockedExtract.mockResolvedValueOnce(VALID_EXTRACTION_RESULT)

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea in 500g retail packs" })

    expect(res.status).toBe(200)
    const body = res.body

    // Required fields
    expect(body).toHaveProperty("status")
    expect(body).toHaveProperty("attributes")
    expect(body).toHaveProperty("missingFields")
    expect(body).toHaveProperty("ambiguities")
    expect(body).toHaveProperty("evidence")
    expect(body).toHaveProperty("sourceText")

    // Attributes shape
    expect(body.attributes).toHaveProperty("productCategory")
    expect(body.attributes).toHaveProperty("teaType")
    expect(body.attributes).toHaveProperty("presentation")
    expect(body.attributes).toHaveProperty("form")
    expect(body.attributes).toHaveProperty("netWeight")
    expect(body.attributes).toHaveProperty("weightUnit")

    // Must NOT contain HS codes
    expect(body).not.toHaveProperty("hsCode")
    expect(body.attributes).not.toHaveProperty("hsCode")
    expect(body.attributes).not.toHaveProperty("classification")
    expect(body.attributes).not.toHaveProperty("chapter")
    expect(body.attributes).not.toHaveProperty("heading")
    expect(body.attributes).not.toHaveProperty("subheading")
  })

  // ── Extra: Request ID ────────────────────────────────────
  it("Responses include X-Request-ID header", async () => {
    mockedExtract.mockResolvedValueOnce(VALID_EXTRACTION_RESULT)

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea" })

    expect(res.headers["x-request-id"]).toBeDefined()
    expect(res.headers["x-request-id"].length).toBeGreaterThan(0)
  })

  // ── Extra: Security headers ──────────────────────────────
  it("Responses include Helmet security headers", async () => {
    const res = await request(app).get("/api/health")

    // Helmet sets various security headers
    expect(res.headers["x-content-type-options"]).toBe("nosniff")
    expect(res.headers["x-frame-options"]).toBeDefined()
  })

  // ── Extra: Gemini timeout ────────────────────────────────
  it("Gemini timeout returns 502", async () => {
    mockedExtract.mockRejectedValueOnce(
      new GeminiServiceError("AI_TIMEOUT", "Timed out after 20s")
    )

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea" })

    expect(res.status).toBe(502)
    expect(res.body.errorCode).toBe("AI_TIMEOUT")
  })

  // ── Extra: Gemini rate limit ─────────────────────────────
  it("Gemini rate limit returns 429", async () => {
    mockedExtract.mockRejectedValueOnce(
      new GeminiServiceError("AI_RATE_LIMITED", "Quota exceeded")
    )

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Black tea" })

    expect(res.status).toBe(429)
    expect(res.body.errorCode).toBe("AI_RATE_LIMITED")
  })

  // ── Extra: Unsupported product flows correctly ───────────
  it("Unsupported product returns 200 with 'unsupported' status", async () => {
    mockedExtract.mockResolvedValueOnce({
      status: "unsupported",
      attributes: {
        productCategory: "unknown",
        teaType: "unknown",
        presentation: "unknown",
        form: "unknown",
        netWeight: null,
        weightUnit: null,
      },
      missingFields: ["productCategory", "teaType", "presentation", "form"],
      ambiguities: [],
      evidence: [],
      sourceText: "Arabica coffee beans, 500g",
      notes: "The product is outside the Chapter 0902 tea scope.",
    })

    const res = await request(app)
      .post("/api/ai/extract-tea")
      .send({ text: "Arabica coffee beans, 500g" })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("unsupported")
  })
})
