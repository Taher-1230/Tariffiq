// ============================================================
// ClassificationProgress — Multi-step progress indicator
//
// Phase 6.4: Dynamic product-aware steps.
// Supports Tea (6 steps) and Spices (up to 5 steps) wizards.
// ============================================================

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { WizardStep } from "@/types/classification"

// ── Step definitions ────────────────────────────────────────

export interface ProgressStepDef {
  id: WizardStep
  label: string
  shortLabel: string
}

export const TEA_STEPS: ProgressStepDef[] = [
  { id: "product",      label: "Product",      shortLabel: "Product" },
  { id: "tea-type",     label: "Tea Type",     shortLabel: "Tea Type" },
  { id: "presentation", label: "Presentation", shortLabel: "Pres." },
  { id: "form",         label: "Form",         shortLabel: "Form" },
  { id: "weight",       label: "Weight",       shortLabel: "Weight" },
  { id: "review",       label: "Review",       shortLabel: "Review" },
]

export const SPICES_STEPS: ProgressStepDef[] = [
  { id: "product",          label: "Product",    shortLabel: "Product" },
  { id: "spice-type",       label: "Spice",      shortLabel: "Spice" },
  { id: "spice-processing", label: "Processing", shortLabel: "Proc." },
  { id: "spice-details",    label: "Details",    shortLabel: "Details" },
  { id: "spice-review",     label: "Review",     shortLabel: "Review" },
]

// ── Component ───────────────────────────────────────────────

interface ClassificationProgressProps {
  currentStep: WizardStep
  steps?: ProgressStepDef[]
}

export function ClassificationProgress({
  currentStep,
  steps,
}: ClassificationProgressProps) {
  // Default to TEA steps for backward compatibility
  const activeSteps = steps ?? TEA_STEPS
  const stepIds = activeSteps.map((s) => s.id)
  const currentIndex = stepIds.indexOf(currentStep)

  // Hide the progress indicator on loading / result screens
  if (currentIndex === -1) return null

  const percentage = Math.round(((currentIndex) / (activeSteps.length - 1)) * 100)

  return (
    <div className="flex flex-col gap-3">
      {/* ── Desktop horizontal stepper (md+) ── */}
      <nav
        aria-label="Classification progress"
        className="hidden items-center gap-0 md:flex"
      >
        {activeSteps.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent   = index === currentIndex
          const isUpcoming  = index > currentIndex

          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent  && "border-primary bg-background text-primary shadow-sm",
                    isUpcoming && "border-border bg-background text-muted-foreground"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium leading-none tracking-wide",
                    isCurrent  && "text-primary",
                    isCompleted && "text-primary/70",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after last item) */}
              {index < activeSteps.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px flex-1 transition-all",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Mobile compact progress (below md) ── */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Step {currentIndex + 1} of {activeSteps.length}
            <span className="ml-1.5 text-muted-foreground">
              — {activeSteps[currentIndex]?.label}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">{percentage}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </div>
  )
}
