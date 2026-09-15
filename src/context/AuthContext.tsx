// ============================================================
// AuthContext — Phase 5B
//
// Manages client-side authentication state using HTTP-only cookies.
// Does NOT store tokens in localStorage.
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type {
  SafeUser,
  AuthResponse,
  AuthErrorResponse,
  RegisterRequest,
  LoginRequest,
} from "../../shared/auth-contract.js"

export interface AuthContextType {
  user: SafeUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Refresh/Fetch Current User on Mount ────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (res.ok) {
        const data = (await res.json()) as AuthResponse
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // ── Login ──────────────────────────────────────────────────
  const login = useCallback(
    async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(credentials),
        })

        const data = (await res.json()) as AuthResponse | AuthErrorResponse

        if (res.ok && data.status === "success") {
          setUser((data as AuthResponse).user)
          return { success: true }
        }

        return {
          success: false,
          error: (data as AuthErrorResponse).message || "Invalid email or password.",
        }
      } catch {
        return {
          success: false,
          error: "Unable to connect to authentication server.",
        }
      }
    },
    []
  )

  // ── Register ───────────────────────────────────────────────
  const register = useCallback(
    async (data: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        })

        const result = (await res.json()) as AuthResponse | AuthErrorResponse

        if (res.ok && result.status === "success") {
          setUser((result as AuthResponse).user)
          return { success: true }
        }

        return {
          success: false,
          error: (result as AuthErrorResponse).message || "Failed to create account.",
        }
      } catch {
        return {
          success: false,
          error: "Unable to connect to authentication server.",
        }
      }
    },
    []
  )

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } finally {
      setUser(null)
    }
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
