import { useState } from "react"
import { CircleHelp, FileStack, LogIn, LogOut } from "lucide-react"

import { LogoMark } from "@/components/common/LogoMark"
import { NavList } from "@/components/layout/NavList"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { AuthDialog } from "@/components/auth/AuthDialog"

export function AppSidebar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(" ")
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      return name.slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return "CU"
  }

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <LogoMark />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              TariffIQ
            </span>
            <span className="text-[11px] text-muted-foreground">
              HS Classification Assistant
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <NavList />

          <div className="flex flex-col gap-3 pt-6">
            <Separator />

            <div className="px-1">
              <Badge variant="secondary" className="gap-1.5 font-medium">
                <FileStack className="h-3 w-3" />
                HS Chapter 09
              </Badge>
            </div>

            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CircleHelp className="h-[18px] w-[18px]" />
              Help &amp; documentation
            </button>

            <Separator />

            {/* ── User Auth State ── */}
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between rounded-md p-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(user.name, user.email)}
                  </div>
                  <div className="flex flex-col leading-none overflow-hidden">
                    <span className="text-sm font-medium text-foreground truncate">
                      {user.name || user.email.split("@")[0]}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => logout()}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="px-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs font-medium"
                  onClick={() => setAuthOpen(true)}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In / Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  )
}
