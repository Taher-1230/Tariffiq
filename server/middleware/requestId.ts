// ============================================================
// Request ID Middleware — Phase 5A
//
// Generates a lightweight unique request ID for each incoming
// request and attaches it to both the request object and the
// X-Request-ID response header for log correlation.
// ============================================================

import type { Request, Response, NextFunction } from "express"
import { randomUUID } from "node:crypto"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const id = (req.headers["x-request-id"] as string) || randomUUID()
  req.requestId = id
  res.setHeader("X-Request-ID", id)
  next()
}
