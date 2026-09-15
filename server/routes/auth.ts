// ============================================================
// Authentication Routes — Phase 5B
//
// Endpoints:
//   POST /api/auth/register (Rate limited)
//   POST /api/auth/login    (Rate limited)
//   POST /api/auth/logout
//   GET  /api/auth/me
// ============================================================

import { Router } from "express"
import { User } from "../models/User.js"
import { signUserToken, setAuthCookie, clearAuthCookie } from "../services/authService.js"
import { createAuthMiddleware } from "../middleware/auth.js"
import { createAuthRateLimiter } from "../middleware/rateLimit.js"
import type { ServerConfig } from "../config.js"
import type {
  AuthResponse,
  AuthErrorResponse,
  RegisterRequest,
  LoginRequest,
} from "../../shared/auth-contract.js"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export function createAuthRouter(config: ServerConfig): Router {
  const router = Router()
  const requireAuth = createAuthMiddleware(config)
  const authRateLimiter = createAuthRateLimiter({
    maxRequests: config.isProduction ? 10 : 1000,
  })

  // ── Register (Rate Limited) ────────────────────────────────
  router.post("/register", authRateLimiter, async (req, res) => {
    try {
      const { email, password, name } = req.body as Partial<RegisterRequest>

      // 1. Validate Email
      if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
        const error: AuthErrorResponse = {
          status: "error",
          errorCode: "INVALID_EMAIL",
          message: "Please enter a valid email address.",
        }
        res.status(400).json(error)
        return
      }

      // 2. Validate Password (length between 8 and 128 characters)
      if (
        !password ||
        typeof password !== "string" ||
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
      ) {
        const error: AuthErrorResponse = {
          status: "error",
          errorCode: "WEAK_PASSWORD",
          message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters long.`,
        }
        res.status(400).json(error)
        return
      }

      const normalizedEmail = email.trim().toLowerCase()

      // 3. Check for Existing Account
      const existingUser = await User.findOne({ email: normalizedEmail })
      if (existingUser) {
        const error: AuthErrorResponse = {
          status: "error",
          errorCode: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists.",
        }
        res.status(400).json(error)
        return
      }

      // 4. Create User & Hash Password
      const passwordHash = await User.hashPassword(password)
      const user = new User({
        email: normalizedEmail,
        passwordHash,
        name: typeof name === "string" ? name.trim() : undefined,
      })
      await user.save()

      const safeUser = user.toSafeUser()

      // 5. Issue Session Cookie
      const token = signUserToken(safeUser, config.jwtSecret)
      setAuthCookie(res, token, config.isProduction)

      const response: AuthResponse = {
        status: "success",
        user: safeUser,
      }
      res.status(201).json(response)
    } catch (err: unknown) {
      console.error("[Auth] Register error:", err)
      const error: AuthErrorResponse = {
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "Failed to create account. Please try again later.",
      }
      res.status(500).json(error)
    }
  })

  // ── Login (Rate Limited) ───────────────────────────────────
  router.post("/login", authRateLimiter, async (req, res) => {
    try {
      const { email, password } = req.body as Partial<LoginRequest>

      if (
        !email ||
        !password ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        password.length > MAX_PASSWORD_LENGTH
      ) {
        const error: AuthErrorResponse = {
          status: "error",
          errorCode: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        }
        res.status(400).json(error)
        return
      }

      const normalizedEmail = email.trim().toLowerCase()
      const user = await User.findOne({ email: normalizedEmail })

      if (!user) {
        const error: AuthErrorResponse = {
          status: "error",
          errorCode: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        }
        res.status(401).json(error)
        return
      }

      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        const error: AuthErrorResponse = {
          status: "error",
          errorCode: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        }
        res.status(401).json(error)
        return
      }

      const safeUser = user.toSafeUser()

      // Issue Session Cookie
      const token = signUserToken(safeUser, config.jwtSecret)
      setAuthCookie(res, token, config.isProduction)

      const response: AuthResponse = {
        status: "success",
        user: safeUser,
      }
      res.status(200).json(response)
    } catch (err: unknown) {
      console.error("[Auth] Login error:", err)
      const error: AuthErrorResponse = {
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "Failed to sign in. Please try again later.",
      }
      res.status(500).json(error)
    }
  })

  // ── Logout ─────────────────────────────────────────────────
  router.post("/logout", (_req, res) => {
    clearAuthCookie(res, config.isProduction)
    res.status(200).json({ status: "ok" })
  })

  // ── Me (Current User) ──────────────────────────────────────
  router.get("/me", requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({
        status: "error",
        errorCode: "UNAUTHENTICATED",
        message: "You are not signed in.",
      })
      return
    }

    const response: AuthResponse = {
      status: "success",
      user: req.user,
    }
    res.status(200).json(response)
  })

  return router
}
