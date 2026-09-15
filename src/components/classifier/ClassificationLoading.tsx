// ============================================================
// ClassificationLoading — Shown while "running" the mock
// ============================================================

import { Loader2 } from "lucide-react"

export function ClassificationLoading() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 py-12">
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <div className="absolute h-20 w-20 animate-pulse rounded-full border border-border" />
        {/* Spinner */}
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden
        />
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-[15px] font-medium text-foreground">
          Analyzing product information…
        </p>
        <p className="text-sm text-muted-foreground">
          This will take just a moment.
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center text-xs text-muted-foreground">
        <div className="h-px w-20 bg-border" />
        <span>Deterministic Rules Engine</span>
      </div>
    </div>
  )
}
