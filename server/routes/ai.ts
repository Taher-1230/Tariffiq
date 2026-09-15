// ============================================================
// AI Extraction Route — Phase 5A
//
// POST /api/ai/extract-tea
//
// Accepts a product description, validates input, calls the
// server-side Gemini service, validates output, and returns
// a TeaExtractionResult.
//
// INVARIANT:
//   This route NEVER calls classifyTea() or returns HS codes.
// ============================================================

import { Router } from "express"
import {
  extractWithGemini,
  extractCoffeeWithGemini,
  extractSpicesWithGemini,
  GeminiServiceError,
} from "../services/geminiService.js"
import type { ServerConfig } from "../config.js"
import type { ApiErrorResponse } from "../types/api.js"

const MAX_INPUT_LENGTH = 10_000
const MIN_INPUT_LENGTH = 1

export function createAiRouter(config: ServerConfig): Router {
  const router = Router()

  router.post("/extract-tea", async (req, res) => {
    const requestId = req.requestId ?? "unknown"
    const startTime = Date.now()

    try {
      // ── 1. Validate request body ───────────────────────────
      const { text } = req.body as Record<string, unknown>

      if (text === undefined || text === null) {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Missing required field: text.",
          requestId,
        }
        res.status(400).json(error)
        return
      }

      if (typeof text !== "string") {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Field 'text' must be a string.",
          requestId,
        }
        res.status(400).json(error)
        return
      }

      const trimmedText = text.trim()

      if (trimmedText.length < MIN_INPUT_LENGTH) {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Enter a valid product description.",
          requestId,
        }
        res.status(400).json(error)
        return
      }

      if (text.length > MAX_INPUT_LENGTH) {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: `Product description is too long (maximum ${MAX_INPUT_LENGTH} characters; received ${text.length}).`,
          requestId,
        }
        res.status(400).json(error)
        return
      }

      // ── 2. Call Gemini service ─────────────────────────────
      const result = await extractWithGemini(text, {
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
      })

      const latencyMs = Date.now() - startTime
      console.log(
        `[${requestId}] POST /api/ai/extract-tea status=${result.status} latency=${latencyMs}ms`
      )

      res.json(result)
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime

      if (err instanceof GeminiServiceError) {
        console.error(
          `[${requestId}] Gemini error: code=${err.errorCode} latency=${latencyMs}ms`
        )

        const statusCode = mapErrorCodeToHttp(err.errorCode)
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: err.errorCode,
          message: mapErrorCodeToMessage(err.errorCode),
          requestId,
        }
        res.status(statusCode).json(error)
        return
      }

      // Unexpected error — delegate to centralized error handler
      console.error(`[${requestId}] Unexpected error in AI route: latency=${latencyMs}ms`)
      throw err
    }
  })

  // ── Generic Product Extraction (Phase 5C-A) ──────────────────
  //
  // POST /api/ai/extract
  //
  // Accepts { productCategory, text } and dispatches to the
  // product-specific extraction pipeline. At Phase 5C-A, only
  // "tea" is supported. Unsupported products receive a clean
  // rejection without fake extraction results.

  router.post("/extract", async (req, res) => {
    const requestId = req.requestId ?? "unknown"

    try {
      const { productCategory, text } = req.body as Record<string, unknown>

      // 1. Validate productCategory
      if (!productCategory || typeof productCategory !== "string") {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Missing required field: productCategory.",
          requestId,
        }
        res.status(400).json(error)
        return
      }

      // 2. Check if product is supported
      if (
        productCategory !== "tea" &&
        productCategory !== "coffee" &&
        productCategory !== "spices"
      ) {
        res.status(400).json({
          status: "unsupported",
          message: `Product category "${productCategory}" is not currently supported. Supported categories: tea, coffee, spices.`,
          requestId,
        })
        return
      }

      // 3. Validate text
      if (text === undefined || text === null) {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Missing required field: text.",
          requestId,
        }
        res.status(400).json(error)
        return
      }

      if (typeof text !== "string") {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Field 'text' must be a string.",
          requestId,
        }
        res.status(400).json(error)
        return
      }

      const trimmedText = text.trim()

      if (trimmedText.length < MIN_INPUT_LENGTH) {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Enter a valid product description.",
          requestId,
        }
        res.status(400).json(error)
        return
      }

      if (text.length > MAX_INPUT_LENGTH) {
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: `Product description is too long (maximum ${MAX_INPUT_LENGTH} characters; received ${text.length}).`,
          requestId,
        }
        res.status(400).json(error)
        return
      }

      // 4. Dispatch to product-specific extraction
      const startTime = Date.now()
      let result
      if (productCategory === "spices") {
        result = await extractSpicesWithGemini(text, {
          apiKey: config.geminiApiKey,
          model: config.geminiModel,
        })
      } else if (productCategory === "coffee") {
        result = await extractCoffeeWithGemini(text, {
          apiKey: config.geminiApiKey,
          model: config.geminiModel,
        })
      } else {
        result = await extractWithGemini(text, {
          apiKey: config.geminiApiKey,
          model: config.geminiModel,
        })
      }

      const latencyMs = Date.now() - startTime
      console.log(
        `[${requestId}] POST /api/ai/extract product=${productCategory} status=${result.status} latency=${latencyMs}ms`
      )

      res.json(result)
    } catch (err: unknown) {
      if (err instanceof GeminiServiceError) {
        console.error(
          `[${requestId}] Gemini error in generic extract: code=${err.errorCode}`
        )

        const statusCode = mapErrorCodeToHttp(err.errorCode)
        const error: ApiErrorResponse = {
          status: "error",
          errorCode: err.errorCode,
          message: mapErrorCodeToMessage(err.errorCode),
          requestId,
        }
        res.status(statusCode).json(error)
        return
      }

      console.error(`[${requestId}] Unexpected error in generic AI extract route`)
      throw err
    }
  })

  return router
}

// ── HTTP status mapping ──────────────────────────────────────

function mapErrorCodeToHttp(code: string): number {
  switch (code) {
    case "AI_PROVIDER_NOT_CONFIGURED":
    case "AI_AUTHENTICATION_ERROR":
      return 503
    case "AI_RATE_LIMITED":
    case "AI_QUOTA_EXCEEDED":
      return 429
    case "AI_NETWORK_ERROR":
    case "AI_TIMEOUT":
    case "AI_PROVIDER_ERROR":
      return 502
    case "INVALID_AI_RESPONSE":
      return 502
    default:
      return 500
  }
}

function mapErrorCodeToMessage(code: string): string {
  switch (code) {
    case "AI_PROVIDER_NOT_CONFIGURED":
      return "AI extraction service is not configured."
    case "AI_AUTHENTICATION_ERROR":
      return "AI extraction service authentication failed."
    case "AI_RATE_LIMITED":
    case "AI_QUOTA_EXCEEDED":
      return "Too many AI requests. Please try again later."
    case "AI_NETWORK_ERROR":
      return "Unable to reach AI extraction service."
    case "AI_TIMEOUT":
      return "AI extraction request timed out. Please try again."
    case "AI_PROVIDER_ERROR":
      return "AI extraction is temporarily unavailable."
    case "INVALID_AI_RESPONSE":
      return "AI extraction produced an invalid result."
    default:
      return "AI extraction is temporarily unavailable."
  }
}
