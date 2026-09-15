// ============================================================
// Authentication Service — Phase 5B
//
// Handles JWT issuance, verification, and cookie configuration.
// ============================================================

import jwt from "jsonwebtoken"
import type { Response } from "express"
import type { SafeUser } from "../../shared/auth-contract.js"

export interface JwtPayload {
  sub: string
  email: string
  name?: string
  iat?: number
  exp?: number
}

export const AUTH_COOKIE_NAME = "tariffiq_session"
export const TOKEN_EXPIRY_DAYS = 7
export const TOKEN_EXPIRY_SECONDS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60

/**
 * Signs a JWT with the user ID, email, and name.
 */
export function signUserToken(user: SafeUser, secret: string): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: `${TOKEN_EXPIRY_DAYS}d`,
    }
  )
}

/**
 * Verifies a JWT and returns the typed payload.
 * Restricts allowed algorithms to HS256 to prevent algorithm switching attacks.
 */
export function verifyUserToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
  }) as JwtPayload
}

/**
 * Sets the HTTP-only signed session cookie on the Express response.
 */
export function setAuthCookie(
  res: Response,
  token: string,
  isProduction: boolean
): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: TOKEN_EXPIRY_SECONDS * 1000,
    path: "/",
  })
}

/**
 * Clears the auth cookie on logout.
 */
export function clearAuthCookie(res: Response, isProduction: boolean): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  })
}
