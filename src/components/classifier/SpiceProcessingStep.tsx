// ============================================================
// SpiceProcessingStep — Step 3: Processing, Botanical & Form
//
// Phase 6.4: Manual Spices wizard.
// Dynamically shows fields based on the selected spice type
// using getRequiredSpicesInformation() as the authority.
//
// CRITICAL INVARIANT:
//   This component collects factual product attributes ONLY.
//   Field visibility/requirement driven entirely by the
//   deterministic requirements engine — NOT duplicated here.
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
  SpiceType,
  SpicesClassificationInput,
} from "@/products/spices/types"

// ── Display label maps ───────────────────────────────────────

const CRUSHED_OR_GROUND_OPTIONS = [
  { value: false as const, label: "Whole (neither crushed nor ground)" },
  { value: true as const, label: "Crushed, ground, or powdered" },
]

const BOTANICAL_TYPE_OPTIONS: { value: BotanicalType; label: string }[] = [
  { value: "piper", label: "Piper (Piper nigrum / Piper spp.)" },
  { value: "capsicum", label: "Capsicum (Chilly / Paprika)" },
  { value: "pimenta", label: "Pimenta (Allspice)" },
  { value: "cinnamomum_zeylanicum", label: "Cinnamomum zeylanicum (Ceylon Cinnamon)" },
  { value: "cassia", label: "Cassia (Cinnamomum cassia)" },
]

const PROCESSING_STATE_OPTIONS: { value: SpiceProcessingState; label: string }[] = [
  { value: "fresh", label: "Fresh" },
  { value: "dried", label: "Dried" },
  { value: "extracted", label: "Extracted (oil/oleoresin removed)" },
  { value: "not_extracted", label: "Not extracted" },
]

const FORM_OPTIONS: { value: SpiceForm; label: string }[] = [
  { value: "bark", label: "Bark" },
  { value: "tree_flowers", label: "Tree Flowers" },
  { value: "stem", label: "Stem" },
  { value: "not_stem", label: "Not Stem (Whole Fruit / Bud)" },
  { value: "in_shell", label: "In Shell" },
  { value: "shelled", label: "Shelled" },
  { value: "chilly_powder", label: "Chilly Powder" },
  { value: "chilly_seeds", label: "Chilly Seeds" },
  { value: "powder", label: "Powder" },
  { value: "small_cardamom_seeds", label: "Cardamom Seeds" },
  { value: "husk", label: "Husk" },
  { value: "stigma", label: "Stigma" },
  { value: "stamen", label: "Stamen" },
  { value: "seed", label: "Seed / Grain / Berry" },
]

// Contextually filter form options by spice type
function getRelevantFormOptions(spiceType: SpiceType | null): typeof FORM_OPTIONS {
  if (!spiceType) return FORM_OPTIONS
  switch (spiceType) {
    case "cinnamon":
      return FORM_OPTIONS.filter((o) => ["bark", "tree_flowers"].includes(o.value))
    case "cloves":
      return FORM_OPTIONS.filter((o) => ["stem", "not_stem"].includes(o.value))
    case "nutmeg":
      return FORM_OPTIONS.filter((o) => ["in_shell", "shelled"].includes(o.value))
    case "capsicum_pimenta":
      return FORM_OPTIONS.filter((o) => ["chilly_powder", "chilly_seeds"].includes(o.value))
    case "cardamom":
      return FORM_OPTIONS.filter((o) => ["small_cardamom_seeds"].includes(o.value))
    case "saffron":
      return FORM_OPTIONS.filter((o) => ["stigma", "stamen"].includes(o.value))
    case "ginger":
      return FORM_OPTIONS.filter((o) => ["powder"].includes(o.value))
    case "turmeric":
      return FORM_OPTIONS.filter((o) => ["powder"].includes(o.value))
    case "other_spice":
      return FORM_OPTIONS.filter((o) => ["seed", "powder", "husk"].includes(o.value))
    default:
      return FORM_OPTIONS
  }
}

// Contextually filter botanical types by spice type
function getRelevantBotanicalOptions(spiceType: SpiceType | null): typeof BOTANICAL_TYPE_OPTIONS {
  if (!spiceType) return BOTANICAL_TYPE_OPTIONS
  switch (spiceType) {
    case "capsicum_pimenta":
      return BOTANICAL_TYPE_OPTIONS.filter((o) => ["capsicum", "pimenta"].includes(o.value))
    case "cinnamon":
      return BOTANICAL_TYPE_OPTIONS.filter((o) => ["cinnamomum_zeylanicum", "cassia"].includes(o.value))
    default:
      return BOTANICAL_TYPE_OPTIONS
  }
}

// Contextually filter processing states by spice type
function getRelevantProcessingOptions(spiceType: SpiceType | null): typeof PROCESSING_STATE_OPTIONS {
  if (!spiceType) return PROCESSING_STATE_OPTIONS
  switch (spiceType) {
    case "capsicum_pimenta":
      return PROCESSING_STATE_OPTIONS.filter((o) => ["fresh", "dried"].includes(o.value))
    case "cloves":
      return PROCESSING_STATE_OPTIONS.filter((o) => ["extracted", "not_extracted"].includes(o.value))
    case "ginger":
      return PROCESSING_STATE_OPTIONS.filter((o) => ["fresh", "dried"].includes(o.value))
    case "turmeric":
      return PROCESSING_STATE_OPTIONS.filter((o) => ["fresh", "dried"].includes(o.value))
    default:
      return PROCESSING_STATE_OPTIONS
  }
}

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

interface SpiceProcessingStepProps {
  spiceType: SpiceType | null
  crushedOrGround: boolean | null
  botanicalType: BotanicalType | null
  processingState: SpiceProcessingState | null
  form: SpiceForm | null
  onCrushedOrGroundChange: (value: boolean) => void
  onBotanicalTypeChange: (value: BotanicalType) => void
  onProcessingStateChange: (value: SpiceProcessingState) => void
  onFormChange: (value: SpiceForm) => void
}

// ── Main Component ───────────────────────────────────────────

export function SpiceProcessingStep({
  spiceType,
  crushedOrGround,
  botanicalType,
  processingState,
  form,
  onCrushedOrGroundChange,
  onBotanicalTypeChange,
  onProcessingStateChange,
  onFormChange,
}: SpiceProcessingStepProps) {
  // Build partial input for dynamic requirement analysis
  const partialInput: Partial<SpicesClassificationInput> = useMemo(
    () => ({
      productCategory: "spices",
      spiceType,
      crushedOrGround,
      botanicalType,
      processingState,
      form,
    }),
    [spiceType, crushedOrGround, botanicalType, processingState, form]
  )

  const requirements = useMemo(
    () => getRequiredSpicesInformation(partialInput),
    [partialInput]
  )

  const fs = requirements.fieldStatus

  // Determine which field sections to show
  const showCrushedOrGround = fs.crushedOrGround !== "not_required"
  const showBotanical = fs.botanicalType !== "not_required"
  const showProcessingState = fs.processingState !== "not_required"
  const showForm = fs.form !== "not_required"

  const relevantBotanical = getRelevantBotanicalOptions(spiceType)
  const relevantProcessing = getRelevantProcessingOptions(spiceType)
  const relevantForms = getRelevantFormOptions(spiceType)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          Processing & Physical Characteristics
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Specify the processing state and physical characteristics of the spice product.
          Fields are shown based on the selected spice category.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* ── Crushed / Ground ── */}
        {showCrushedOrGround && (
          <fieldset className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                Is the product crushed or ground?
              </legend>
              <RequirementBadge status={fs.crushedOrGround} />
            </div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Crushed or ground selection">
              {CRUSHED_OR_GROUND_OPTIONS.map((option) => {
                const isSelected = crushedOrGround === option.value
                return (
                  <label
                    key={String(option.value)}
                    htmlFor={`cog-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`cog-${option.value}`}
                      name="crushedOrGround"
                      checked={isSelected}
                      onChange={() => onCrushedOrGroundChange(option.value)}
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

        {/* ── Botanical Type ── */}
        {showBotanical && (
          <fieldset className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                Botanical Type
              </legend>
              <RequirementBadge status={fs.botanicalType} />
            </div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Botanical type selection">
              {relevantBotanical.map((option) => {
                const isSelected = botanicalType === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`bot-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`bot-${option.value}`}
                      name="botanicalType"
                      checked={isSelected}
                      onChange={() => onBotanicalTypeChange(option.value)}
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

        {/* ── Processing State ── */}
        {showProcessingState && (
          <fieldset className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                Processing State
              </legend>
              <RequirementBadge status={fs.processingState} />
            </div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Processing state selection">
              {relevantProcessing.map((option) => {
                const isSelected = processingState === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`proc-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`proc-${option.value}`}
                      name="processingState"
                      checked={isSelected}
                      onChange={() => onProcessingStateChange(option.value)}
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

        {/* ── Physical Form ── */}
        {showForm && (
          <fieldset className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                Physical Form
              </legend>
              <RequirementBadge status={fs.form} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Physical form selection">
              {relevantForms.map((option) => {
                const isSelected = form === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`form-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/[0.03]"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`form-${option.value}`}
                      name="spiceForm"
                      checked={isSelected}
                      onChange={() => onFormChange(option.value)}
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

        {/* No fields needed notice */}
        {!showCrushedOrGround && !showBotanical && !showProcessingState && !showForm && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No processing or form details are required for this spice category.
          </div>
        )}
      </div>
    </div>
  )
}
