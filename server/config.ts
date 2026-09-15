// ============================================================
// Server Configuration — Phase 5A & 5B
//
// Loads and validates environment variables for the TariffIQ
// backend API server. Fails fast if required configuration
// is missing.
// ============================================================

export interface ServerConfig {
  geminiApiKey: string
  geminiModel: string
  port: number
  frontendOrigin: string
  isProduction: boolean
  mongodbUri: string
  jwtSecret: string
  aiRateLimitMax?: number
  authRateLimitMax?: number
  classificationRateLimitMax?: number
}

/**
 * Loads server configuration from process.env.
 * Throws if required variables are missing.
 */
export function loadServerConfig(): ServerConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() ?? ""
  const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash"
  const port = Number(process.env.PORT) || 3001
  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || "http://localhost:5173"
  const isProduction = process.env.NODE_ENV === "production"
  const mongodbUri = process.env.MONGODB_URI?.trim() || "mongodb://127.0.0.1:27017/tariffiq"
  const jwtSecret = process.env.JWT_SECRET?.trim() || "tariffiq-jwt-secret-phase5b-dev-2026-secure"

  const aiRateLimitMax = process.env.AI_RATE_LIMIT ? Number(process.env.AI_RATE_LIMIT) : undefined
  const authRateLimitMax = process.env.AUTH_RATE_LIMIT ? Number(process.env.AUTH_RATE_LIMIT) : undefined
  const classificationRateLimitMax = process.env.CLASSIFICATION_RATE_LIMIT
    ? Number(process.env.CLASSIFICATION_RATE_LIMIT)
    : undefined

  if (!geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY is required. Set it in your .env file or environment."
    )
  }

  if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16)) {
    throw new Error(
      "JWT_SECRET is required and must be at least 16 characters in production."
    )
  }

  return {
    geminiApiKey,
    geminiModel,
    port,
    frontendOrigin,
    isProduction,
    mongodbUri,
    jwtSecret,
    aiRateLimitMax,
    authRateLimitMax,
    classificationRateLimitMax,
  }
}
