// ============================================================
// EntryPathSelector — Choice between AI and Manual workflows
// ============================================================

import { Sparkles, SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface EntryPathSelectorProps {
  onSelectAI: () => void
  onSelectManual: () => void
}

export function EntryPathSelector({
  onSelectAI,
  onSelectManual,
}: EntryPathSelectorProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold text-foreground">
          How would you like to classify your product?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Choose between describing your product in natural language or entering product attributes step-by-step.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* ── Path A: Describe Product with AI ── */}
        <button
          type="button"
          id="entry-path-ai"
          onClick={onSelectAI}
          className={cn(
            "relative flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 text-left transition-all duration-150",
            "hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">
                Describe Product
              </span>
              <Badge variant="default" className="text-[10px]">
                Recommended
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Describe your product in plain text. TariffIQ extracts product attributes for your confirmation before classification.
            </p>
          </div>
        </button>

        {/* ── Path B: Enter Details Manually ── */}
        <button
          type="button"
          id="entry-path-manual"
          onClick={onSelectManual}
          className={cn(
            "relative flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 text-left transition-all duration-150",
            "hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <SlidersHorizontal className="h-6 w-6" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">
                Enter Manually
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Select product category, presentation, form, and specifications step-by-step using our structured wizard.
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
