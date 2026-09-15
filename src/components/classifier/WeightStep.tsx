// ============================================================
// WeightStep — Step 5: Net content of the immediate package
// ============================================================

import { Info, Scale } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import type { WeightUnit } from "@/types/classification"

interface WeightStepProps {
  netWeight: number | null
  weightUnit: WeightUnit
  isRequired?: boolean
  requirementReason?: string | null
  onWeightChange: (weight: number | null) => void
  onUnitChange: (unit: WeightUnit) => void
}

export function WeightStep({
  netWeight,
  weightUnit,
  isRequired = true,
  requirementReason,
  onWeightChange,
  onUnitChange,
}: WeightStepProps) {
  const [touched, setTouched] = useState(false)

  const rawValue = netWeight !== null ? String(netWeight) : ""

  // Derive error message
  let error: string | null = null
  if (touched) {
    if (isRequired && (netWeight === null || rawValue.trim() === "")) {
      error = "Please enter the net content."
    } else if (netWeight !== null && (!Number.isFinite(netWeight) || netWeight <= 0)) {
      error = "Net content must be a number greater than zero."
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value

    // Allow empty string (clearing the field)
    if (val === "") {
      onWeightChange(null)
      return
    }

    // Only allow digits and a single decimal point
    if (!/^\d*\.?\d*$/.test(val)) return

    const parsed = parseFloat(val)
    if (isNaN(parsed)) {
      onWeightChange(null)
    } else {
      onWeightChange(parsed)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          What is the net content of the immediate package?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {isRequired
            ? "Enter the net content of the immediate package."
            : "Package weight is optional for this classification path."}
        </p>
      </div>

      {/* ── Requirement notice ── */}
      {!isRequired && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground">
              Not required for this classification
            </span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              {requirementReason ??
                "The selected tariff rule does not depend on package weight. You can leave this blank and continue, or enter a value for record-keeping."}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* ── Input row ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="weight-input"
              className="text-sm font-medium text-foreground"
            >
              Net content
            </label>
            {!isRequired && (
              <span className="text-xs font-medium text-muted-foreground">
                Optional
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {/* Numeric input */}
            <div className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "flex h-11 items-center overflow-hidden rounded-md border bg-card transition-colors",
                  error
                    ? "border-destructive focus-within:ring-2 focus-within:ring-destructive/30"
                    : "border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20"
                )}
              >
                <div className="flex h-full items-center border-r border-border px-3 text-muted-foreground">
                  <Scale className="h-4 w-4" aria-hidden />
                </div>
                <input
                  id="weight-input"
                  type="text"
                  inputMode="decimal"
                  placeholder={isRequired ? "e.g. 500" : "e.g. 500 (optional)"}
                  value={rawValue}
                  onChange={handleChange}
                  onBlur={() => setTouched(true)}
                  aria-describedby={error ? "weight-error" : "weight-helper"}
                  aria-invalid={!!error}
                  className="h-full flex-1 bg-transparent px-3 text-[15px] font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {error && (
                <p id="weight-error" role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            {/* Unit selector */}
            <div className="flex flex-col gap-1.5">
              <div
                className="flex h-11 overflow-hidden rounded-md border border-input bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20"
              >
                <select
                  id="weight-unit"
                  aria-label="Weight unit"
                  value={weightUnit}
                  onChange={(e) => onUnitChange(e.target.value as WeightUnit)}
                  className="h-full cursor-pointer bg-transparent px-3 pr-8 text-sm font-medium text-foreground focus:outline-none"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
          </div>

          {!error && (
            <p id="weight-helper" className="text-xs text-muted-foreground">
              {isRequired
                ? "Enter the net content of the immediate package. The rules engine will normalise the value internally."
                : "Package weight is not required to classify this product. You can continue directly."}
            </p>
          )}
        </div>

        {/* ── Unit context ── */}
        <div className="flex gap-4">
          {(["g", "kg"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={weightUnit === unit}
              onClick={() => onUnitChange(unit)}
              className={cn(
                "flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                weightUnit === unit
                  ? "border-primary bg-primary/[0.06] text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {unit === "g" ? "Grams (g)" : "Kilograms (kg)"}
            </button>
          ))}
        </div>

        {/* ── State preview ── */}
        {netWeight !== null && netWeight > 0 && (
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {netWeight} {weightUnit}
              </span>{" "}
              will be recorded.{" "}
              {weightUnit === "kg" && (
                <span className="text-muted-foreground">
                  ({netWeight * 1000} g equivalent)
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
