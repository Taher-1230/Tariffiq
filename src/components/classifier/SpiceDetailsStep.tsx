// ============================================================
// SpiceDetailsStep — Step 4: Subtype, Quality, Size
//
// Phase 6.4: Manual Spices wizard.
// Shows remaining branch-specific detail fields that are
// conditional on the spice type AND the processing state.
//
// CRITICAL INVARIANT:
//   This component collects factual product attributes ONLY.
//   Uses getRequiredSpicesInformation() to determine visibility.
//   No tariff logic, no HS code determination.
// ============================================================

import { useMemo } from "react"
import { CheckCircle2, Info, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getRequiredSpicesInformation } from "@/products/spices/requirements"
import type { FieldRequirementStatus } from "@/engine/types"
import type {
  BotanicalType,
  SpiceForm,
  SpiceProcessingState,
  SpiceQuality,
  SpiceSizeCategory,
  SpiceSubType,
  SpiceType,
  SpicesClassificationInput,
} from "@/products/spices/types"

// ── Sub-type options filtered by spice type ──────────────────

interface SubTypeOption {
  value: SpiceSubType
  label: string
}

const SUB_TYPE_BY_SPICE: Partial<Record<SpiceType, SubTypeOption[]>> = {
  pepper: [
    { value: "long_pepper", label: "Long Pepper" },
    { value: "light_black_pepper", label: "Light Black Pepper" },
    { value: "black_pepper_garbled", label: "Black Pepper — Garbled" },
    { value: "black_pepper_ungarbled", label: "Black Pepper — Ungarbled" },
    { value: "green_pepper_dehydrated", label: "Green Pepper — Dehydrated" },
    { value: "pinheads", label: "Pinheads" },
    { value: "green_pepper_frozen_or_dried", label: "Green Pepper — Frozen or Dried" },
    { value: "non_green_frozen", label: "Non-Green Pepper — Frozen" },
  ],
  cardamom: [
    { value: "alleppey_green", label: "Alleppey Green" },
    { value: "coorg_green", label: "Coorg Green" },
    { value: "bleached_half_bleached_bleachable", label: "Bleached / Half-Bleached / Bleachable" },
    { value: "mixed", label: "Mixed / Unsorted" },
  ],
  cumin: [
    { value: "black", label: "Black Cumin" },
    { value: "other_than_black", label: "Other than Black (White Cumin)" },
  ],
  ginger: [
    { value: "unbleached", label: "Unbleached" },
    { value: "bleached", label: "Bleached" },
  ],
  mixture: [
    { value: "cross_heading_mixture", label: "Cross-Heading Mixture (from two or more headings 0904–0910)" },
  ],
  other_spice: [
    { value: "celery", label: "Celery Seed" },
    { value: "fenugreek", label: "Fenugreek" },
    { value: "dill", label: "Dill Seed" },
    { value: "ajwain", label: "Ajwain Seed" },
    { value: "cassia_torea", label: "Cassia Torea" },
    { value: "cassia", label: "Cassia" },
    { value: "poppy", label: "Poppy Seed" },
    { value: "mustard", label: "Mustard Seed" },
  ],
}

const QUALITY_OPTIONS: { value: SpiceQuality; label: string }[] = [
  { value: "seed_quality", label: "Of seed quality (for sowing / agricultural standard)" },
]

const SIZE_CATEGORY_OPTIONS: { value: SpiceSizeCategory; label: string }[] = [
  { value: "large", label: "Large (Amomum / Big Cardamom)" },
  { value: "small", label: "Small (Elettaria / Small Cardamom)" },
]

// ── Status Badge Helper ──────────────────────────────────────

function RequirementBadge({ status }: { status: FieldRequirementStatus }) {
  if (status === "satisfied") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
        <CheckCircle2 className="h-3 w-3" />
        Provided
      </Badge>
    )
  }
  if (status === "required") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px] font-medium text-destructive border-destructive/30 bg-destructive/10">
        <AlertTriangle className="h-3 w-3" />
        Required
      </Badge>
    )
  }
  if (status === "optional") {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] font-medium text-muted-foreground">
        <Info className="h-3 w-3" />
        Optional
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
      Not required for this product
    </Badge>
  )
}

// ── Component Props ──────────────────────────────────────────

interface SpiceDetailsStepProps {
  spiceType: SpiceType | null
  crushedOrGround: boolean | null
  botanicalType: BotanicalType | null
  processingState: SpiceProcessingState | null
  form: SpiceForm | null
  subType: SpiceSubType | null
  quality: SpiceQuality | null
  sizeCategory: SpiceSizeCategory | null
  onSubTypeChange: (value: SpiceSubType) => void
  onQualityChange: (value: SpiceQuality | null) => void
  onSizeCategoryChange: (value: SpiceSizeCategory) => void
}

// ── Main Component ───────────────────────────────────────────

export function SpiceDetailsStep({
  spiceType,
  crushedOrGround,
  botanicalType,
  processingState,
  form,
  subType,
  quality,
  sizeCategory,
  onSubTypeChange,
  onQualityChange,
  onSizeCategoryChange,
}: SpiceDetailsStepProps) {
  // Build partial input for dynamic requirement analysis
  const partialInput: Partial<SpicesClassificationInput> = useMemo(
    () => ({
      productCategory: "spices",
      spiceType,
      crushedOrGround,
      botanicalType,
      processingState,
      form,
      subType,
      quality,
      sizeCategory,
    }),
    [spiceType, crushedOrGround, botanicalType, processingState, form, subType, quality, sizeCategory]
  )

  const requirements = useMemo(
    () => getRequiredSpicesInformation(partialInput),
    [partialInput]
  )

  const fs = requirements.fieldStatus

  // Determine which field sections to show
  const showSubType = fs.subType !== "not_required"
  const showQuality = fs.quality !== "not_required"
  const showSizeCategory = fs.sizeCategory !== "not_required"

  const subTypeOptions = spiceType ? (SUB_TYPE_BY_SPICE[spiceType] ?? []) : []

  const noFieldsNeeded = !showSubType && !showQuality && !showSizeCategory

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          Additional Classification Details
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Specify variety, quality, and size details relevant to the selected spice category.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* ── Size Category (Cardamom) ── */}
        {showSizeCategory && (
          <fieldset className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                Size Category
              </legend>
              <RequirementBadge status={fs.sizeCategory} />
            </div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Size category selection">
              {SIZE_CATEGORY_OPTIONS.map((option) => {
                const isSelected = sizeCategory === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`size-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`size-${option.value}`}
                      name="sizeCategory"
                      checked={isSelected}
                      onChange={() => onSizeCategoryChange(option.value)}
                      className="h-4 w-4 text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* ── Sub-Type / Variety ── */}
        {showSubType && subTypeOptions.length > 0 && (
          <fieldset className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                Subtype / Variety
              </legend>
              <RequirementBadge status={fs.subType} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Sub-type selection">
              {subTypeOptions.map((option) => {
                const isSelected = subType === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`subtype-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`subtype-${option.value}`}
                      name="subType"
                      checked={isSelected}
                      onChange={() => onSubTypeChange(option.value)}
                      className="h-4 w-4 text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* ── Quality ── */}
        {showQuality && (
          <fieldset className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                Quality Standard
              </legend>
              <RequirementBadge status={fs.quality} />
            </div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Quality selection">
              {QUALITY_OPTIONS.map((option) => {
                const isSelected = quality === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`quality-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`quality-${option.value}`}
                      name="quality"
                      checked={isSelected}
                      onChange={() => onQualityChange(option.value)}
                      className="h-4 w-4 text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                  </label>
                )
              })}
              <label
                htmlFor="quality-standard"
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                  quality === null
                    ? "border-primary bg-primary/[0.03]"
                    : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  id="quality-standard"
                  name="quality"
                  checked={quality === null}
                  onChange={() => onQualityChange(null)}
                  className="h-4 w-4 text-primary focus:ring-ring"
                />
                <span className="text-sm font-medium text-foreground">
                  Standard commercial quality (not seed quality)
                </span>
              </label>
            </div>
          </fieldset>
        )}

        {/* No fields needed notice */}
        {noFieldsNeeded && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No additional details are required for this product configuration.
            You can proceed to the review step.
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Checks whether the details step has any fields to display
 * given the current partial spices input.
 */
export function spiceDetailsStepHasFields(
  input: Partial<SpicesClassificationInput>
): boolean {
  const req = getRequiredSpicesInformation(input)
  const fs = req.fieldStatus
  return (
    fs.subType !== "not_required" ||
    fs.quality !== "not_required" ||
    fs.sizeCategory !== "not_required"
  )
}
