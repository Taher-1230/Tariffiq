// ============================================================
// API Request/Response Types — Phase 5A
//
// Typed contracts for the TariffIQ backend API endpoints.
// ============================================================

import type { TeaExtractionResult } from "../../shared/ai-contract.js"

// ── Extract Tea Request ────────────────────────────────────

export interface ExtractTeaRequest {
  text: string
}

// ── API Error Response ─────────────────────────────────────

export interface ApiErrorResponse {
  status: "error"
  errorCode: string
  message: string
  requestId?: string
}

// ── API Success Response ───────────────────────────────────

export type ApiSuccessResponse = TeaExtractionResult

export interface HealthResponse {
  status: "ok"
  database?: "connected" | "disconnected"
}
