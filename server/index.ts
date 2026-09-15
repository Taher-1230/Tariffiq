// ============================================================
// Server Entry Point — Phase 5A & 5B
//
// Loads environment configuration, initializes database connection,
// and starts the Express API server.
// ============================================================

import { loadServerConfig } from "./config.js"
import { createApp } from "./app.js"
import { connectToDatabase, disconnectDatabase } from "./db/mongoose.js"

const config = loadServerConfig()

// Initialize MongoDB Connection
try {
  await connectToDatabase(config.mongodbUri)
} catch {
  console.warn(
    "[Server Warning] MongoDB connection is unavailable. Authentication and classification history persistence will fail until database is accessible."
  )
}

const app = createApp(config)

const server = app.listen(config.port, () => {
  console.log(`TariffIQ API server running on port ${config.port}`)
  console.log(`CORS origin: ${config.frontendOrigin}`)
  console.log(`Gemini model: ${config.geminiModel}`)
  console.log(`Environment: ${config.isProduction ? "production" : "development"}`)
})

// ── Graceful Shutdown ───────────────────────────────────────
async function handleShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`)

  server.close(async () => {
    console.log("[Server] HTTP server closed.")
    try {
      await disconnectDatabase()
    } catch (err: unknown) {
      console.error("[Server] Error disconnecting from database:", err)
    }
    process.exit(0)
  })

  // Force shutdown if cleanup hangs past 10 seconds
  setTimeout(() => {
    console.error("[Server] Forced shutdown after timeout.")
    process.exit(1)
  }, 10_000).unref()
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"))
process.on("SIGINT", () => handleShutdown("SIGINT"))
