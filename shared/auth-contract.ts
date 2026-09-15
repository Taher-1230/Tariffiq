// ============================================================
// Shared Authentication Contract Types — Phase 5B
//
// Single source of truth for auth API boundaries.
// ============================================================

export interface SafeUser {
  id: string
  email: string
  name?: string
  createdAt?: string
}

export interface AuthResponse {
  status: "success"
  user: SafeUser
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthErrorResponse {
  status: "error"
  errorCode: string
  message: string
}
