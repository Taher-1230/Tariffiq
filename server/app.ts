// ============================================================
// Express App Factory — Phase 5A & 5B
//
// Creates and configures the Express application with all
// middleware, routes, security protections, and error handling.
//
// Security layers:
//   1. Helmet (HTTP security headers)
//   2. CORS (restricted to FRONTEND_ORIGIN with credentials: true)
//   3. Cookie parser (for HTTP-only signed session cookies)
//   4. JSON body limit (20kb)
//   5. Request ID correlation
//   6. Rate limiting on AI and Auth endpoints
//   7. Centralized error handler
// ============================================================

import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { requestIdMiddleware } from "./middleware/requestId.js"
import { createAiRateLimiter, createClassificationRateLimiter } from "./middleware/rateLimit.js"
import { errorHandler } from "./middleware/errorHandler.js"
import healthRouter from "./routes/health.js"
import { createAiRouter } from "./routes/ai.js"
import { createAuthRouter } from "./routes/auth.js"
import { createClassificationRouter } from "./routes/classifications.js"
import type { ServerConfig } from "./config.js"

export function createApp(config: ServerConfig): express.Express {
  const app = express()

  // ── Security Headers ───────────────────────────────────────
  app.use(
    helmet({
      frameguard: { action: "deny" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xContentTypeOptions: true,
    })
  )

  // ── CORS ───────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-Request-ID", "Authorization"],
      exposedHeaders: ["X-Request-ID"],
      maxAge: 600, // 10 minutes preflight cache
    })
  )

  // ── Cookie Parser ──────────────────────────────────────────
  app.use(cookieParser())

  // ── Body Parsing ───────────────────────────────────────────
  app.use(express.json({ limit: "20kb" }))

  // ── Request ID ─────────────────────────────────────────────
  app.use(requestIdMiddleware)

  // ── Routes ─────────────────────────────────────────────────
  // 1. Health
  app.use("/api/health", healthRouter)

  // 2. AI extraction (with rate limiter)
  const aiRateLimiter = createAiRateLimiter({
    maxRequests: config.aiRateLimitMax ?? (config.isProduction ? 20 : 1000),
  })
  const aiRouter = createAiRouter(config)
  app.use("/api/ai", aiRateLimiter, aiRouter)

  // 3. Authentication
  const authRouter = createAuthRouter(config)
  app.use("/api/auth", authRouter)

  // 4. Classification & History (with rate limiter)
  const classificationRateLimiter = createClassificationRateLimiter({
    maxRequests: config.classificationRateLimitMax ?? (config.isProduction ? 60 : 1000),
  })
  const classificationRouter = createClassificationRouter(config)
  app.use("/api/classifications", classificationRateLimiter, classificationRouter)

  // ── Centralized Error Handling ─────────────────────────────
  app.use(errorHandler)

  return app
}
