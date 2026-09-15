// ============================================================
// FormStep — Step 4: What is the form of the tea?
// ============================================================

import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { FormType } from "@/types/classification"

interface FormOption {
  value: FormType
  label: string
  description: string
  icon: React.ReactNode
}

const FORM_OPTIONS: FormOption[] = [
  {
    value: "whole_leaf",
    label: "Whole Leaf",
    description: "Intact or large leaf pieces.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "dust",
    label: "Dust",
    description: "Fine, granular tea particles.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
        <circle cx="6" cy="8" r="1" fill="currentColor"/>
        <circle cx="18" cy="8" r="1" fill="currentColor"/>
        <circle cx="6" cy="16" r="1" fill="currentColor"/>
        <circle cx="18" cy="16" r="1" fill="currentColor"/>
        <circle cx="12" cy="5" r="1" fill="currentColor"/>
        <circle cx="12" cy="19" r="1" fill="currentColor"/>
        <circle cx="8" cy="12" r="0.75" fill="currentColor"/>
        <circle cx="16" cy="12" r="0.75" fill="currentColor"/>
      </svg>
    ),
  },
  {
    value: "tea_bags",
    label: "Tea Bags",
    description: "Tea enclosed in filter bags.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <rect x="6" y="10" width="12" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 10V4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="3" r="1" fill="currentColor"/>
        <line x1="9" y1="14" x2="15" y2="14" strokeLinecap="round"/>
        <line x1="9" y1="17" x2="13" y2="17" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "agglomerated",
    label: "Agglomerated",
    description: "Compressed or granulated tea.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "waste",
    label: "Waste",
    description: "Tea waste or by-products.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "other",
    label: "Other",
    description: "A form not listed above.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
      </svg>
    ),
  },
]

interface FormStepProps {
  selected: FormType | null
  onSelect: (value: FormType) => void
}

export function FormStep({ selected, onSelect }: FormStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          What is the form of the tea?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Select the physical form that best describes the product.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Tea form"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FORM_OPTIONS.map((option) => {
          const isSelected = selected === option.value
          return (
            <button
              key={option.value}
              type="button"
              id={`form-${option.value}`}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option.value)}
              className={cn(
                "relative flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/[0.03] shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.icon}
              </div>

              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {option.label}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </div>

              {isSelected && (
                <CheckCircle2
                  className="absolute right-3 top-3 h-4 w-4 text-primary"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
