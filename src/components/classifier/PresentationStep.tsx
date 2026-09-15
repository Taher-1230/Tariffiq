// ============================================================
// PresentationStep — Step 3: How is the tea presented?
// ============================================================

import { CheckCircle2, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PresentationType } from "@/types/classification"

interface PresentationOption {
  value: PresentationType
  label: string
  description: string
  icon: React.ReactNode
}

const PRESENTATION_OPTIONS: PresentationOption[] = [
  {
    value: "immediate_packing",
    label: "Immediate Packing",
    description: "Tea presented in an immediate package.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="22.08" x2="12" y2="12" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "packet",
    label: "Packet",
    description: "Tea supplied in packets.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="3" y1="9" x2="21" y2="9" strokeLinecap="round"/>
        <line x1="3" y1="15" x2="21" y2="15" strokeLinecap="round"/>
        <line x1="9" y1="3" x2="9" y2="21" strokeLinecap="round"/>
        <line x1="15" y1="3" x2="15" y2="21" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "bulk",
    label: "Bulk",
    description: "Tea supplied in bulk.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <ellipse cx="12" cy="5" rx="9" ry="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

interface PresentationStepProps {
  selected: PresentationType | null
  onSelect: (value: PresentationType) => void
}

export function PresentationStep({ selected, onSelect }: PresentationStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          How is the tea presented?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Select the packaging or presentation type that applies to this product.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Tea presentation"
        className="grid gap-3 sm:grid-cols-3"
      >
        {PRESENTATION_OPTIONS.map((option) => {
          const isSelected = selected === option.value
          return (
            <button
              key={option.value}
              type="button"
              id={`presentation-${option.value}`}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option.value)}
              className={cn(
                "relative flex flex-col items-start gap-3 rounded-lg border bg-card p-5 text-left transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/[0.03] shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.icon}
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-foreground">
                  {option.label}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </div>

              {isSelected && (
                <CheckCircle2
                  className="absolute right-4 top-4 h-5 w-5 text-primary"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Informational note */}
      <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">
          The packaging and presentation information helps determine the applicable tariff line.
        </p>
      </div>
    </div>
  )
}
