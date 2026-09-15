// ============================================================
// Centralized Error Handler Middleware — Phase 5A
//
// Catches all unhandled errors in Express routes and returns
// sanitized responses. Never exposes stack traces, API keys,
// or internal details to clients.
// ============================================================

import type { Request, Response, NextFunction } from "express"
import type { ApiErrorResponse } from "../types/api.js"

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId ?? "unknown"
  const isProduction = process.env.NODE_ENV === "production"

  // Development logging (never log secrets)
  if (!isProduction) {
    console.error(`[${requestId}] Unhandled error:`, err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) {
      console.error(`[${requestId}] Stack:`, err.stack)
    }
  } else {
    console.error(`[${requestId}] Internal server error`)
  }

  const response: ApiErrorResponse = {
    status: "error",
    errorCode: "INTERNAL_ERROR",
    message: "An internal error occurred. Please try again later.",
    requestId,
  }

  res.status(500).json(response)
}
