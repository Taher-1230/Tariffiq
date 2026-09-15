// ============================================================
// SpiceReviewStep — Step 5: Review confirmed Spices facts
//
// Phase 6.4: Manual Spices wizard.
// Renders all classification-relevant confirmed facts with
// requirement status badges and edit navigation.
//
// CRITICAL INVARIANT:
//   Purely presentational. No tariff logic. No HS codes.
//   No AI/evidence language in manual mode.
// ============================================================

import { useMemo } from "react"
import { AlertTriangle, CheckCircle2, Info, Pencil } from "lucide-react"

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
import type { WizardStep } from "@/types/classification"

// ── Display labels ───────────────────────────────────────────

const SPICE_TYPE_LABELS: Record<SpiceType, string> = {
  pepper: "Pepper (Piper)",
  capsicum_pimenta: "Capsicum / Pimenta",
  vanilla: "Vanilla",
  cinnamon: "Cinnamon",
  cloves: "Cloves",
  nutmeg: "Nutmeg",
  mace: "Mace",
  cardamom: "Cardamom",
  coriander: "Coriander",
  cumin: "Cumin",
  anise: "Anise",
  badian: "Badian (Star Anise)",
  caraway_or_fennel: "Caraway / Fennel",
  juniper_berries: "Juniper Berries",
  ginger: "Ginger",
  saffron: "Saffron",
  turmeric: "Turmeric",
  mixture: "Mixture of Spices",
  other_spice: "Other Spice",
}

const BOTANICAL_LABELS: Record<BotanicalType, string> = {
  piper: "Genus Piper",
  capsicum: "Genus Capsicum",
  pimenta: "Genus Pimenta",
  cinnamomum_zeylanicum: "Cinnamomum zeylanicum (Ceylon Cinnamon)",
  cassia: "Cassia",
}

const FORM_LABELS: Record<SpiceForm, string> = {
  bark: "Bark",
  tree_flowers: "Tree Flowers",
  stem: "Stem",
  not_stem: "Not Stem (Whole Fruit / Bud)",
  in_shell: "In Shell",
  shelled: "Shelled",
  chilly_powder: "Chilly Powder",
  chilly_seeds: "Chilly Seeds",
  powder: "Powder",
  small_cardamom_seeds: "Cardamom Seeds",
  husk: "Husk",
  stigma: "Stigma",
  stamen: "Stamen",
  seed: "Seed / Grain / Berry",
}

const PROCESSING_LABELS: Record<SpiceProcessingState, string> = {
  fresh: "Fresh",
  dried: "Dried",
  extracted: "Extracted (oil/oleoresin removed)",
  not_extracted: "Not extracted",
}

const SUB_TYPE_LABELS: Record<SpiceSubType, string> = {
  long_pepper: "Long Pepper",
  light_black_pepper: "Light Black Pepper",
  black_pepper_garbled: "Black Pepper — Garbled",
  black_pepper_ungarbled: "Black Pepper — Ungarbled",
  green_pepper_dehydrated: "Green Pepper — Dehydrated",
  pinheads: "Pinheads",
  green_pepper_frozen_or_dried: "Green Pepper — Frozen or Dried",
  non_green_frozen: "Non-Green Pepper — Frozen",
  alleppey_green: "Alleppey Green",
  coorg_green: "Coorg Green",
  bleached_half_bleached_bleachable: "Bleached / Half-Bleached / Bleachable",
  mixed: "Mixed / Unsorted",
  black: "Black Cumin",
  other_than_black: "Other than Black (White Cumin)",
  unbleached: "Unbleached",
  bleached: "Bleached",
  cross_heading_mixture: "Cross-Heading Mixture",
  celery: "Celery Seed",
  fenugreek: "Fenugreek",
  dill: "Dill Seed",
  ajwain: "Ajwain Seed",
  cassia_torea: "Cassia Torea",
  cassia: "Cassia",
  poppy: "Poppy Seed",
  mustard: "Mustard Seed",
}

const QUALITY_LABELS: Record<SpiceQuality, string> = {
  seed_quality: "Of seed quality",
}

const SIZE_LABELS: Record<SpiceSizeCategory, string> = {
  large: "Large (Amomum / Big Cardamom)",
  small: "Small (Elettaria / Small Cardamom)",
}

// ── Status Badge Helper ──────────────────────────────────────

function ReviewStatusBadge({
  status,
  hasValue,
}: {
  status: FieldRequirementStatus
  hasValue: boolean
}) {
  if (hasValue) {
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
      Not required
    </Badge>
  )
}

// ── Review Row ───────────────────────────────────────────────

interface ReviewRowProps {
  label: string
  value: string
  status: FieldRequirementStatus
  hasValue: boolean
  editStep: WizardStep
  onEdit: (step: WizardStep) => void
}

function ReviewRow({ label, value, status, hasValue, editStep, onEdit }: ReviewRowProps) {
  // Don't show rows for fields that are not required and have no value
  if (status === "not_required" && !hasValue) return null

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3.5",
        "border-b border-border last:border-0"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <ReviewStatusBadge status={status} hasValue={hasValue} />
        </div>
        <span className="text-[15px] font-medium text-foreground">{value}</span>
      </div>

      <button
        type="button"
        aria-label={`Edit ${label}`}
        onClick={() => onEdit(editStep)}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Pencil className="h-3 w-3" aria-hidden />
        Edit
      </button>
    </div>
  )
}

// ── Component Props ──────────────────────────────────────────

interface SpiceReviewStepProps {
  spiceType: SpiceType | null
  botanicalType: BotanicalType | null
  crushedOrGround: boolean | null
  subType: SpiceSubType | null
  form: SpiceForm | null
  processingState: SpiceProcessingState | null
  quality: SpiceQuality | null
  sizeCategory: SpiceSizeCategory | null
  isCubeb: boolean | null
  essentialCharacter: boolean | null
  onEdit: (step: WizardStep) => void
}

// ── Main Component ───────────────────────────────────────────

export function SpiceReviewStep({
  spiceType,
  botanicalType,
  crushedOrGround,
  subType,
  form,
  processingState,
  quality,
  sizeCategory,
  isCubeb,
  essentialCharacter,
  onEdit,
}: SpiceReviewStepProps) {
  const partialInput: Partial<SpicesClassificationInput> = useMemo(
    () => ({
      productCategory: "spices",
      spiceType,
      botanicalType,
      crushedOrGround,
      subType,
      form,
      processingState,
      quality,
      sizeCategory,
    }),
    [spiceType, botanicalType, crushedOrGround, subType, form, processingState, quality, sizeCategory]
  )

  const requirements = useMemo(
    () => getRequiredSpicesInformation(partialInput),
    [partialInput]
  )

  const fs = requirements.fieldStatus

  // Format values
  const crushedOrGroundValue =
    crushedOrGround === true
      ? "Crushed or ground"
      : crushedOrGround === false
      ? "Whole (neither crushed nor ground)"
      : "Not specified"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          Review Product Information
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Verify the information below before running the classification.
        </p>
      </div>

      {/* ── Cubeb Warning ── */}
      {isCubeb === true && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4"
          role="alert"
        >
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-200 block">
              Cubeb Pepper Identified
            </span>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              Cubeb pepper is subject to a Chapter 09 exclusion. The deterministic classifier will apply the statutory rule.
            </p>
          </div>
        </div>
      )}

      {/* ── Essential Character Warning ── */}
      {essentialCharacter === false && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-sm font-semibold text-amber-900 dark:text-amber-200 block">
              Essential Character — Lost
            </span>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Products that have lost the essential character of spices are excluded from Chapter 09 per Note 3. The deterministic classifier will apply this statutory rule.
            </p>
          </div>
        </div>
      )}

      {/* ── Mixture Notice ── */}
      {spiceType === "mixture" && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-4"
          role="status"
        >
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-sm font-semibold text-foreground block">
              Mixture detected
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {subType === "cross_heading_mixture"
                ? "Cross-heading mixture — spices from two or more headings (0904–0910)."
                : "Mixture of spices. The deterministic classifier will determine the applicable heading."}
            </p>
          </div>
        </div>
      )}

      {/* ── Facts Review Card ── */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Product Summary — Spices (0904–0910)
          </span>
        </div>

        <div className="px-5">
          {/* Product Category */}
          <ReviewRow
            label="Product"
            value="Spices"
            status="satisfied"
            hasValue={true}
            editStep="product"
            onEdit={onEdit}
          />

          {/* Spice Type */}
          <ReviewRow
            label="Spice Category"
            value={spiceType ? SPICE_TYPE_LABELS[spiceType] : "Not specified"}
            status={fs.spiceType}
            hasValue={!!spiceType}
            editStep="spice-type"
            onEdit={onEdit}
          />

          {/* Botanical Type */}
          <ReviewRow
            label="Botanical Type"
            value={botanicalType ? BOTANICAL_LABELS[botanicalType] : "Not specified"}
            status={fs.botanicalType}
            hasValue={!!botanicalType}
            editStep="spice-processing"
            onEdit={onEdit}
          />

          {/* Crushed / Ground */}
          <ReviewRow
            label="Crushed / Ground"
            value={crushedOrGroundValue}
            status={fs.crushedOrGround}
            hasValue={crushedOrGround !== null}
            editStep="spice-processing"
            onEdit={onEdit}
          />

          {/* Processing State */}
          <ReviewRow
            label="Processing State"
            value={processingState ? PROCESSING_LABELS[processingState] : "Not specified"}
            status={fs.processingState}
            hasValue={!!processingState}
            editStep="spice-processing"
            onEdit={onEdit}
          />

          {/* Physical Form */}
          <ReviewRow
            label="Physical Form"
            value={form ? FORM_LABELS[form] : "Not specified"}
            status={fs.form}
            hasValue={!!form}
            editStep="spice-processing"
            onEdit={onEdit}
          />

          {/* Size Category */}
          <ReviewRow
            label="Size Category"
            value={sizeCategory ? SIZE_LABELS[sizeCategory] : "Not specified"}
            status={fs.sizeCategory}
            hasValue={!!sizeCategory}
            editStep="spice-details"
            onEdit={onEdit}
          />

          {/* Sub-Type */}
          <ReviewRow
            label="Subtype / Variety"
            value={subType ? SUB_TYPE_LABELS[subType] : "Not specified"}
            status={fs.subType}
            hasValue={!!subType}
            editStep="spice-details"
            onEdit={onEdit}
          />

          {/* Quality */}
          <ReviewRow
            label="Quality"
            value={quality ? QUALITY_LABELS[quality] : "Standard commercial quality"}
            status={fs.quality}
            hasValue={!!quality}
            editStep="spice-details"
            onEdit={onEdit}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        If any information is incorrect, use the{" "}
        <span className="font-medium text-foreground">Edit</span> links above to go
        back to the relevant step.
      </p>
    </div>
  )
}
