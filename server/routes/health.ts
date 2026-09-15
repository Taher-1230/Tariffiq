// ============================================================
// Health Route — Phase 5A
//
// GET /api/health — simple service health endpoint.
// Does NOT expose API keys, configuration, or internal state.
// ============================================================

import { Router } from "express"
import { isDatabaseConnected } from "../db/mongoose.js"
import type { HealthResponse } from "../types/api.js"

const router = Router()

router.get("/", (_req, res) => {
  const body: HealthResponse = {
    status: "ok",
    database: isDatabaseConnected() ? "connected" : "disconnected",
  }
  res.json(body)
})

export default router
