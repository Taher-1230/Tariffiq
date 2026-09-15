// ============================================================
// Rate Limit Middleware — Phase 5A & 5B
//
// IP-based rate limiting for AI and Authentication endpoints.
// ============================================================

import rateLimit from "express-rate-limit"
import type { ApiErrorResponse } from "../types/api.js"
import type { AuthErrorResponse } from "../../shared/auth-contract.js"

export interface RateLimitConfig {
  windowMs?: number
  maxRequests?: number
}

/**
 * Rate limiter for AI extraction endpoint (default: 20 req / 15 min).
 */
export function createAiRateLimiter(config?: RateLimitConfig) {
  const windowMs = config?.windowMs ?? 15 * 60 * 1000 // 15 minutes
  const max = config?.maxRequests ?? 20

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      status: "error",
      errorCode: "AI_RATE_LIMITED",
      message: "Too many AI requests. Please try again later.",
    } satisfies ApiErrorResponse,
  })
}

/**
 * Rate limiter for Auth endpoints (default: 10 req / 15 min).
 * Protects against brute-force credential stuffing.
 */
export function createAuthRateLimiter(config?: RateLimitConfig) {
  const windowMs = config?.windowMs ?? 15 * 60 * 1000 // 15 minutes
  const max = config?.maxRequests ?? 10

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      status: "error",
      errorCode: "AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Please try again later.",
    } satisfies AuthErrorResponse,
  })
}

/**
 * Rate limiter for Classification and History endpoints (default: 60 req / 15 min).
 * Protects against database exhaustion.
 */
export function createClassificationRateLimiter(config?: RateLimitConfig) {
  const windowMs = config?.windowMs ?? 15 * 60 * 1000 // 15 minutes
  const max = config?.maxRequests ?? 60

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      status: "error",
      errorCode: "RATE_LIMITED",
      message: "Too many classification requests. Please try again later.",
    },
  })
}
