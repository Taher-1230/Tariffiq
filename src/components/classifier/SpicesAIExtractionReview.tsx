// ============================================================
// SpicesAIExtractionReview — Review & Confirm Extracted Attributes (Phase 6.3B)
//
// Displays extracted Spices facts from Gemini in a structured,
// editable review UI.
//
// CRITICAL INVARIANT:
//   Gemini extracts facts.
//   The USER confirms or edits those facts.
//   The deterministic Spices classifier determines the HS code.
//   This UI MUST NEVER display an HS code or treat Gemini as a classifier.
// ============================================================

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  HelpCircle,
  Info,
  Pencil,
  RotateCcw,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getRequiredSpicesInformation } from "@/products/spices/requirements"
import { toSpicesClassificationInput } from "@/products/spices/ai/toSpicesClassificationInput"
import type { FieldRequirementStatus } from "@/engine/types"
import type {
  ExtractedBotanicalType,
  ExtractedCrushedOrGround,
  ExtractedSpiceForm,
  ExtractedSpiceProcessingState,
  ExtractedSpiceQuality,
  ExtractedSpiceSizeCategory,
  ExtractedSpiceSubType,
  ExtractedSpiceType,
  SpicesExtraction,
  SpicesExtractionAmbiguity,
  SpicesExtractionEvidence,
  SpicesExtractionResult,
} from "@/products/spices/ai/types"

// ── Display Labels ──────────────────────────────────────────

const SPICE_TYPE_DISPLAY: Record<ExtractedSpiceType, string> = {
  pepper: "Pepper (Piper / Capsicum / Pimenta)",
  capsicum_pimenta: "Capsicum or Pimenta",
  vanilla: "Vanilla",
  cinnamon: "Cinnamon & Cinnamon-Tree Flowers",
  cloves: "Cloves (Whole, Stems, etc.)",
  nutmeg: "Nutmeg",
  mace: "Mace",
  cardamom: "Cardamoms",
  coriander: "Coriander Seeds",
  cumin: "Cumin Seeds",
  anise: "Anise Seeds",
  badian: "Badian Seeds (Star Anise)",
  caraway_or_fennel: "Caraway or Fennel Seeds",
  juniper_berries: "Juniper Berries",
  ginger: "Ginger",
  saffron: "Saffron",
  turmeric: "Turmeric (Curcuma)",
  mixture: "Mixture of Spices",
  other_spice: "Other Spice (Thyme, Bay Leaves, Curry, etc.)",
  unknown: "Not Determined",
}

const BOTANICAL_TYPE_DISPLAY: Record<ExtractedBotanicalType, string> = {
  piper: "Piper (Piper nigrum / Piper spp.)",
  capsicum: "Capsicum (Chilly / Paprika)",
  pimenta: "Pimenta (Allspice)",
  cinnamomum_zeylanicum: "Cinnamomum zeylanicum (Ceylon Cinnamon)",
  cassia: "Cassia (Cinnamomum cassia)",
  unknown: "Not Specified",
}

function getCrushedOrGroundDisplay(val: ExtractedCrushedOrGround): string {
  if (val === true) return "Crushed, ground, or powdered"
  if (val === false) return "Whole (neither crushed nor ground)"
  return "Not determined"
}

const SUB_TYPE_DISPLAY: Record<ExtractedSpiceSubType, string> = {
  long_pepper: "Long Pepper",
  light_black_pepper: "Light Black Pepper",
  black_pepper_garbled: "Black Pepper — Garbled",
  black_pepper_ungarbled: "Black Pepper — Ungarbled",
  green_pepper_dehydrated: "Green Pepper — Dehydrated",
  pinheads: "Pinheads",
  green_pepper_frozen_or_dried: "Green Pepper — Frozen or Dried",
  non_green_frozen: "Non-Green Pepper — Frozen",
  alleppey_green: "Alleppey Green (Cardamom)",
  coorg_green: "Coorg Green (Cardamom)",
  bleached_half_bleached_bleachable: "Bleached / Half-Bleached (Cardamom)",
  mixed: "Mixed / Unsorted",
  black: "Black (Cumin / Seeds)",
  other_than_black: "Other than Black (White Cumin / Seeds)",
  unbleached: "Unbleached (Ginger)",
  bleached: "Bleached (Ginger)",
  cross_heading_mixture: "Cross-Heading Mixture (0904–0910)",
  celery: "Celery Seed",
  fenugreek: "Fenugreek Seed / Powder",
  dill: "Dill Seed",
  ajwain: "Ajwain Seed",
  cassia_torea: "Cassia Torea",
  cassia: "Cassia",
  poppy: "Poppy Seed",
  mustard: "Mustard Seed",
  unknown: "Not Specified",
}

const FORM_DISPLAY: Record<ExtractedSpiceForm, string> = {
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
  unknown: "Not Specified",
}

const PROCESSING_STATE_DISPLAY: Record<ExtractedSpiceProcessingState, string> = {
  fresh: "Fresh",
  dried: "Dried",
  extracted: "Extracted (oil/oleoresin removed)",
  not_extracted: "Not extracted",
  unknown: "Not Specified",
}

const QUALITY_DISPLAY: Record<ExtractedSpiceQuality, string> = {
  seed_quality: "Seed Quality (for sowing / agricultural standard)",
  unknown: "Standard Commercial Quality",
}

const SIZE_CATEGORY_DISPLAY: Record<ExtractedSpiceSizeCategory, string> = {
  large: "Large (Amomum / Big Cardamom)",
  small: "Small (Elettaria / Small Cardamom)",
  unknown: "Not Specified",
}

// ── Component Props ──────────────────────────────────────────

export interface SpicesAIExtractionReviewProps {
  extractionResult: SpicesExtractionResult
  editedAttributes: SpicesExtraction
  onAttributesChange: (attributes: SpicesExtraction) => void
  onConfirm: () => void
  onSwitchToManual: () => void
  onStartOver: () => void
  isSubmitting?: boolean
  error?: string | null
}

// ── Main Component ───────────────────────────────────────────

export function SpicesAIExtractionReview({
  extractionResult,
  editedAttributes,
  onAttributesChange,
  onConfirm,
  onSwitchToManual,
  onStartOver,
  isSubmitting = false,
  error,
}: SpicesAIExtractionReviewProps) {
  const [activeEditField, setActiveEditField] = useState<keyof SpicesExtraction | null>(null)
  const [resolvedAmbiguities, setResolvedAmbiguities] = useState<Set<string>>(new Set())

  // Dynamic tariff requirement analysis from deterministic engine
  const requirements = useMemo(() => {
    const adapterResult = toSpicesClassificationInput(editedAttributes)
    if (adapterResult.success) {
      return getRequiredSpicesInformation(adapterResult.input)
    }
    return {
      sufficient: false,
      missingFields: ["spiceType"],
      reason: "Spice type is required.",
      fieldStatus: {
        spiceType: "required" as FieldRequirementStatus,
        botanicalType: "not_applicable" as FieldRequirementStatus,
        crushedOrGround: "required" as FieldRequirementStatus,
        subType: "not_applicable" as FieldRequirementStatus,
        form: "not_applicable" as FieldRequirementStatus,
        processingState: "not_applicable" as FieldRequirementStatus,
        quality: "not_applicable" as FieldRequirementStatus,
        sizeCategory: "not_applicable" as FieldRequirementStatus,
        essentialCharacter: "not_applicable" as FieldRequirementStatus,
      },
    }
  }, [editedAttributes])

  // Helper to find evidence
  const findEvidence = (field: keyof SpicesExtraction): SpicesExtractionEvidence | undefined => {
    return extractionResult.evidence?.find((e) => e.field === field)
  }

  // Handle field update
  const handleFieldChange = <K extends keyof SpicesExtraction>(field: K, value: SpicesExtraction[K]) => {
    onAttributesChange({
      ...editedAttributes,
      [field]: value,
    })
    setActiveEditField(null)
  }

  // Handle ambiguity resolution
  const handleResolveAmbiguity = (ambiguity: SpicesExtractionAmbiguity, candidate: string) => {
    const field = ambiguity.field

    if (field === "isCubeb") {
      const isCubebVal = candidate.toLowerCase().includes("cubeb")
      onAttributesChange({
        ...editedAttributes,
        isCubeb: isCubebVal,
      })
    } else if (field === "spiceType") {
      onAttributesChange({
        ...editedAttributes,
        spiceType: candidate as ExtractedSpiceType,
      })
    } else if (field === "botanicalType") {
      onAttributesChange({
        ...editedAttributes,
        botanicalType: candidate as ExtractedBotanicalType,
      })
    } else if (field === "subType") {
      onAttributesChange({
        ...editedAttributes,
        subType: candidate as ExtractedSpiceSubType,
      })
    }

    setResolvedAmbiguities((prev) => new Set(prev).add(ambiguity.reason))
  }

  // Active ambiguities (unresolved)
  const activeAmbiguities = (extractionResult.ambiguities || []).filter(
    (a) => !resolvedAmbiguities.has(a.reason)
  )

  // Status badge helper
  const getStatusBadge = (field: keyof typeof requirements.fieldStatus, value: unknown) => {
    const isUnknown = value === "unknown" || value === undefined || value === null
    const reqStatus = requirements.fieldStatus[field]

    if (!isUnknown) {
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-3 w-3" />
          Provided
        </Badge>
      )
    }

    if (reqStatus === "required") {
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-medium text-destructive border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-3 w-3" />
          Required
        </Badge>
      )
    }

    if (reqStatus === "optional") {
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-muted-foreground">
          <Info className="h-3 w-3" />
          Optional
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-[11px] text-muted-foreground border-dashed">
        Not required for this product
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6" aria-label="Spices AI Extraction Review">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            Spices (Headings 0904–0910)
          </Badge>
          <Badge variant="default" className="text-xs">
            Review Extracted Facts
          </Badge>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Confirm Extracted Spices Attributes
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          TariffIQ extracted the physical and botanical attributes below from your description. Review, edit if needed, and confirm to proceed to deterministic classification.
        </p>
      </div>

      {/* ── Source Description Preview ── */}
      {extractionResult.sourceText && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Original Description
          </span>
          <p className="text-sm italic text-foreground leading-relaxed">
            &ldquo;{extractionResult.sourceText}&rdquo;
          </p>
        </div>
      )}

      {/* ── Ambiguity Clarification Banner ── */}
      {activeAmbiguities.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3" role="alert">
          <div className="flex items-start gap-2.5">
            <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Clarification Needed
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                The description contains ambiguity. Please select the correct candidate below to proceed.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {activeAmbiguities.map((ambiguity, idx) => (
              <div key={idx} className="rounded-md border border-amber-500/30 bg-card p-3 space-y-2">
                <span className="text-xs font-medium text-foreground block">
                  {ambiguity.reason}
                </span>
                <div className="flex flex-wrap gap-2">
                  {ambiguity.candidates.map((candidate) => (
                    <Button
                      key={candidate}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveAmbiguity(ambiguity, candidate)}
                      className="text-xs border-amber-500/40 hover:bg-amber-500/20"
                    >
                      {candidate.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cubeb Identification Notice (Note 4) ── */}
      {editedAttributes.isCubeb === true && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-blue-900 dark:text-blue-200">
            <span className="font-semibold block text-sm">Cubeb Pepper (Piper cubeba) Identified</span>
            <p>
              Under Chapter 09 Note 4, Cubeb pepper (*Piper cubeba*) is excluded from Chapter 09 and classified under Heading 1211. The deterministic engine will apply this statutory rule upon confirmation.
            </p>
          </div>
        </div>
      )}

      {/* ── Essential Character Warning (Note 3) ── */}
      {editedAttributes.essentialCharacter === false && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3" role="alert">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
            <span className="font-semibold block text-sm">Prepared Seasoning / Condiment Warning</span>
            <p>
              Description indicates the product may have lost the essential character of spices under Chapter 09 Note 3 (e.g. prepared sauces or mixed seasonings under Heading 2103).
            </p>
          </div>
        </div>
      )}

      {/* ── Extracted Attributes Grid ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Extracted Product Attributes
          </h3>
          <span className="text-xs text-muted-foreground">
            Click edit on any field to adjust facts
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* 1. Spice Type */}
          <AttributeCard
            label="Spice Commodity"
            value={SPICE_TYPE_DISPLAY[editedAttributes.spiceType]}
            evidence={findEvidence("spiceType")}
            statusBadge={getStatusBadge("spiceType", editedAttributes.spiceType)}
            onEdit={() => setActiveEditField("spiceType")}
          />

          {/* 2. Botanical Type */}
          <AttributeCard
            label="Botanical Genus / Species"
            value={BOTANICAL_TYPE_DISPLAY[editedAttributes.botanicalType]}
            evidence={findEvidence("botanicalType")}
            statusBadge={getStatusBadge("botanicalType", editedAttributes.botanicalType)}
            onEdit={() => setActiveEditField("botanicalType")}
          />

          {/* 3. Crushed / Ground */}
          <AttributeCard
            label="Crushed or Ground"
            value={getCrushedOrGroundDisplay(editedAttributes.crushedOrGround)}
            evidence={findEvidence("crushedOrGround")}
            statusBadge={getStatusBadge("crushedOrGround", editedAttributes.crushedOrGround)}
            onEdit={() => setActiveEditField("crushedOrGround")}
          />

          {/* 4. Subtype / Grade */}
          <AttributeCard
            label="Subtype / Commercial Variety"
            value={SUB_TYPE_DISPLAY[editedAttributes.subType]}
            evidence={findEvidence("subType")}
            statusBadge={getStatusBadge("subType", editedAttributes.subType)}
            onEdit={() => setActiveEditField("subType")}
          />

          {/* 5. Physical Form */}
          <AttributeCard
            label="Physical Form"
            value={FORM_DISPLAY[editedAttributes.form]}
            evidence={findEvidence("form")}
            statusBadge={getStatusBadge("form", editedAttributes.form)}
            onEdit={() => setActiveEditField("form")}
          />

          {/* 6. Processing State */}
          <AttributeCard
            label="Processing State"
            value={PROCESSING_STATE_DISPLAY[editedAttributes.processingState]}
            evidence={findEvidence("processingState")}
            statusBadge={getStatusBadge("processingState", editedAttributes.processingState)}
            onEdit={() => setActiveEditField("processingState")}
          />

          {/* 7. Size Category */}
          <AttributeCard
            label="Size Category (Cardamoms)"
            value={SIZE_CATEGORY_DISPLAY[editedAttributes.sizeCategory]}
            evidence={findEvidence("sizeCategory")}
            statusBadge={getStatusBadge("sizeCategory", editedAttributes.sizeCategory)}
            onEdit={() => setActiveEditField("sizeCategory")}
          />

          {/* 8. Quality Grade */}
          <AttributeCard
            label="Agricultural Quality"
            value={QUALITY_DISPLAY[editedAttributes.quality]}
            evidence={findEvidence("quality")}
            statusBadge={getStatusBadge("quality", editedAttributes.quality)}
            onEdit={() => setActiveEditField("quality")}
          />
        </div>
      </div>

      {/* ── Edit Modal / Control ── */}
      {activeEditField && (
        <EditFieldModal
          field={activeEditField}
          currentAttributes={editedAttributes}
          onSave={handleFieldChange}
          onClose={() => setActiveEditField(null)}
        />
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStartOver}
            disabled={isSubmitting}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSwitchToManual}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Enter Manually
          </Button>
        </div>

        <Button
          type="button"
          id="confirm-classify-spices"
          size="default"
          onClick={onConfirm}
          disabled={isSubmitting || activeAmbiguities.length > 0}
          className="gap-2 font-semibold shadow-sm"
        >
          <Flame className="h-4 w-4" />
          {isSubmitting ? "Classifying with Deterministic Rules..." : "Confirm & Classify"}
        </Button>
      </div>
    </div>
  )
}

// ── Attribute Card Subcomponent ──────────────────────────────

interface AttributeCardProps {
  label: string
  value: string
  evidence?: SpicesExtractionEvidence
  statusBadge: React.ReactNode
  onEdit: () => void
}

function AttributeCard({
  label,
  value,
  evidence,
  statusBadge,
  onEdit,
}: AttributeCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-lg border bg-card p-3.5 gap-2 transition-colors hover:border-primary/30">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          {statusBadge}
        </div>
        <p className="text-sm font-medium text-foreground leading-snug">{value}</p>
      </div>

      <div className="pt-1.5 border-t border-border/50 flex items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
          {evidence ? (
            <>
              Detected: <span className="italic font-medium text-foreground">&ldquo;{evidence.sourceText}&rdquo;</span>
            </>
          ) : (
            "Not explicitly found in description"
          )}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </div>
    </div>
  )
}

// ── Structured Edit Modal Subcomponent ───────────────────────

interface EditFieldModalProps {
  field: keyof SpicesExtraction
  currentAttributes: SpicesExtraction
  onSave: <K extends keyof SpicesExtraction>(field: K, value: SpicesExtraction[K]) => void
  onClose: () => void
}

function EditFieldModal({
  field,
  currentAttributes,
  onSave,
  onClose,
}: EditFieldModalProps) {
  const [selectedValue, setSelectedValue] = useState<unknown>(currentAttributes[field])

  const renderFieldOptions = () => {
    switch (field) {
      case "spiceType":
        return (
          <div className="grid gap-2 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
            {(Object.keys(SPICE_TYPE_DISPLAY) as ExtractedSpiceType[]).map((st) => (
              <label
                key={st}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                  selectedValue === st
                    ? "border-primary bg-primary/10 font-semibold"
                    : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  name="spiceType"
                  value={st}
                  checked={selectedValue === st}
                  onChange={() => setSelectedValue(st)}
                  className="sr-only"
                />
                <span>{SPICE_TYPE_DISPLAY[st]}</span>
              </label>
            ))}
          </div>
        )

      case "botanicalType":
        return (
          <div className="space-y-2">
            {(Object.keys(BOTANICAL_TYPE_DISPLAY) as ExtractedBotanicalType[]).map((bt) => (
              <label
                key={bt}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                  selectedValue === bt
                    ? "border-primary bg-primary/10 font-semibold"
                    : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  name="botanicalType"
                  value={bt}
                  checked={selectedValue === bt}
                  onChange={() => setSelectedValue(bt)}
                  className="sr-only"
                />
                <span>{BOTANICAL_TYPE_DISPLAY[bt]}</span>
              </label>
            ))}
          </div>
        )

      case "crushedOrGround":
        return (
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                selectedValue === false ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
              )}
            >
              <input
                type="radio"
                name="crushedOrGround"
                checked={selectedValue === false}
                onChange={() => setSelectedValue(false)}
                className="sr-only"
              />
              <span>Whole (neither crushed nor ground)</span>
            </label>
            <label
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                selectedValue === true ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
              )}
            >
              <input
                type="radio"
                name="crushedOrGround"
                checked={selectedValue === true}
                onChange={() => setSelectedValue(true)}
                className="sr-only"
              />
              <span>Crushed, ground, or powdered</span>
            </label>
            <label
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                selectedValue === "unknown" ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
              )}
            >
              <input
                type="radio"
                name="crushedOrGround"
                checked={selectedValue === "unknown"}
                onChange={() => setSelectedValue("unknown")}
                className="sr-only"
              />
              <span>Not determined</span>
            </label>
          </div>
        )

      case "subType":
        return (
          <div className="grid gap-2 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
            {(Object.keys(SUB_TYPE_DISPLAY) as ExtractedSpiceSubType[]).map((st) => (
              <label
                key={st}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                  selectedValue === st ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  name="subType"
                  value={st}
                  checked={selectedValue === st}
                  onChange={() => setSelectedValue(st)}
                  className="sr-only"
                />
                <span>{SUB_TYPE_DISPLAY[st]}</span>
              </label>
            ))}
          </div>
        )

      case "form":
        return (
          <div className="grid gap-2 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
            {(Object.keys(FORM_DISPLAY) as ExtractedSpiceForm[]).map((f) => (
              <label
                key={f}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                  selectedValue === f ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  name="form"
                  value={f}
                  checked={selectedValue === f}
                  onChange={() => setSelectedValue(f)}
                  className="sr-only"
                />
                <span>{FORM_DISPLAY[f]}</span>
              </label>
            ))}
          </div>
        )

      case "processingState":
        return (
          <div className="space-y-2">
            {(Object.keys(PROCESSING_STATE_DISPLAY) as ExtractedSpiceProcessingState[]).map((ps) => (
              <label
                key={ps}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                  selectedValue === ps ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  name="processingState"
                  value={ps}
                  checked={selectedValue === ps}
                  onChange={() => setSelectedValue(ps)}
                  className="sr-only"
                />
                <span>{PROCESSING_STATE_DISPLAY[ps]}</span>
              </label>
            ))}
          </div>
        )

      case "sizeCategory":
        return (
          <div className="space-y-2">
            {(Object.keys(SIZE_CATEGORY_DISPLAY) as ExtractedSpiceSizeCategory[]).map((sc) => (
              <label
                key={sc}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                  selectedValue === sc ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  name="sizeCategory"
                  value={sc}
                  checked={selectedValue === sc}
                  onChange={() => setSelectedValue(sc)}
                  className="sr-only"
                />
                <span>{SIZE_CATEGORY_DISPLAY[sc]}</span>
              </label>
            ))}
          </div>
        )

      case "quality":
        return (
          <div className="space-y-2">
            {(Object.keys(QUALITY_DISPLAY) as ExtractedSpiceQuality[]).map((q) => (
              <label
                key={q}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors",
                  selectedValue === q ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent/40"
                )}
              >
                <input
                  type="radio"
                  name="quality"
                  value={q}
                  checked={selectedValue === q}
                  onChange={() => setSelectedValue(q)}
                  className="sr-only"
                />
                <span>{QUALITY_DISPLAY[q]}</span>
              </label>
            ))}
          </div>
        )

      case "isCubeb":
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer">
              <input
                type="radio"
                name="isCubeb"
                checked={selectedValue === true}
                onChange={() => setSelectedValue(true)}
              />
              <span>Yes (Piper cubeba / Cubeb pepper)</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer">
              <input
                type="radio"
                name="isCubeb"
                checked={selectedValue === false}
                onChange={() => setSelectedValue(false)}
              />
              <span>No (Not Cubeb pepper)</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer">
              <input
                type="radio"
                name="isCubeb"
                checked={selectedValue === "unknown"}
                onChange={() => setSelectedValue("unknown")}
              />
              <span>Not determined</span>
            </label>
          </div>
        )

      case "essentialCharacter":
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer">
              <input
                type="radio"
                name="essentialCharacter"
                checked={selectedValue === true}
                onChange={() => setSelectedValue(true)}
              />
              <span>Retains essential character of spices</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer">
              <input
                type="radio"
                name="essentialCharacter"
                checked={selectedValue === false}
                onChange={() => setSelectedValue(false)}
              />
              <span>Lost essential character (Prepared seasoning / condiment)</span>
            </label>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border bg-card p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-semibold text-foreground">
            Edit Attribute: {String(field).replace(/([A-Z])/g, " $1")}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            ✕
          </Button>
        </div>

        <div className="py-2">{renderFieldOptions()}</div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(field, selectedValue as any)}
          >
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
