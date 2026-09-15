// ============================================================
// Authentication Middleware — Phase 5B
//
// Extracts, verifies, and attaches authenticated user identity
// from the HTTP-only session cookie (or Authorization header).
// ============================================================

import type { Request, Response, NextFunction } from "express"
import { verifyUserToken, AUTH_COOKIE_NAME } from "../services/authService.js"
import type { ServerConfig } from "../config.js"
import type { SafeUser, AuthErrorResponse } from "../../shared/auth-contract.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser
    }
  }
}

/**
 * Creates authentication middleware with the provided server configuration.
 */
export function createAuthMiddleware(config: ServerConfig) {
  return function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // 1. Extract token from cookie (preferred) or Authorization header (fallback)
    let token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim()
    }

    if (!token) {
      const error: AuthErrorResponse = {
        status: "error",
        errorCode: "UNAUTHENTICATED",
        message: "You must be signed in to perform this action.",
      }
      res.status(401).json(error)
      return
    }

    // 2. Verify token
    try {
      const payload = verifyUserToken(token, config.jwtSecret)

      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      }

      next()
    } catch {
      const error: AuthErrorResponse = {
        status: "error",
        errorCode: "SESSION_EXPIRED",
        message: "Your session has expired. Please sign in again.",
      }
      res.status(401).json(error)
    }
  }
}
