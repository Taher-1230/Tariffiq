// ============================================================
// AIExtractionReview — Review & Confirm Extracted Attributes
// ============================================================

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  HelpCircle,
  Info,
  Pencil,
  RotateCcw,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getRequiredTeaInformation } from "@/engine/index"
import type { FieldRequirementStatus } from "@/engine/types"
import type {
  ExtractedForm,
  ExtractedPresentation,
  ExtractedTeaType,
  ExtractionEvidence,
  TeaExtraction,
  TeaExtractionResult,
} from "@/ai/types"
import type {
  FormType,
  PresentationType,
  TeaClassificationInput,
  TeaType,
  WeightUnit,
} from "@/types/classification"

// ── Human Readable Labels ──────────────────────────────────

const TEA_TYPE_DISPLAY: Record<ExtractedTeaType, string> = {
  green: "Green Tea",
  black: "Black Tea",
  partly_fermented: "Partly Fermented Tea",
  not_sure: "Not Sure",
  unknown: "Not Identified",
}

const PRESENTATION_DISPLAY: Record<ExtractedPresentation, string> = {
  immediate_packing: "Immediate Packing",
  packet: "Packet",
  bulk: "Bulk",
  unknown: "Not Identified",
}

const FORM_DISPLAY: Record<ExtractedForm, string> = {
  whole_leaf: "Whole Leaf",
  dust: "Dust",
  tea_bags: "Tea Bags",
  agglomerated: "Agglomerated",
  waste: "Waste",
  other: "Other",
  unknown: "Not Identified",
}

// ── Types ──────────────────────────────────────────────────

export interface EditableExtractionState {
  productCategory: "tea" | "unknown"
  teaType: ExtractedTeaType
  presentation: ExtractedPresentation
  form: ExtractedForm
  netWeight: number | null
  weightUnit: WeightUnit
  weightPrecision?: "exact" | "approximate" | "unknown"
}

interface AIExtractionReviewProps {
  extractionResult: TeaExtractionResult
  editedAttributes: EditableExtractionState
  onUpdateAttributes: (updated: EditableExtractionState) => void
  onConfirm: () => void
  onStartOver: () => void
  onBackToDescription: () => void
  insufficientInfoError?: string | null
}

// ── Component ──────────────────────────────────────────────

export function AIExtractionReview({
  extractionResult,
  editedAttributes,
  onUpdateAttributes,
  onConfirm,
  onStartOver,
  onBackToDescription,
  insufficientInfoError,
}: AIExtractionReviewProps) {
  const [editingField, setEditingField] = useState<
    "teaType" | "presentation" | "form" | "netWeight" | null
  >(null)

  // Map editedAttributes to partial input for requirement evaluation
  const partialInput: TeaClassificationInput = useMemo(() => {
    return {
      productCategory: "tea",
      teaType:
        editedAttributes.teaType === "unknown"
          ? "not_sure"
          : (editedAttributes.teaType as TeaType),
      presentation:
        editedAttributes.presentation === "unknown"
          ? undefined
          : (editedAttributes.presentation as PresentationType),
      form:
        editedAttributes.form === "unknown"
          ? undefined
          : (editedAttributes.form as FormType),
      netWeight:
        editedAttributes.netWeight != null && editedAttributes.netWeight > 0
          ? editedAttributes.netWeight
          : undefined,
      weightUnit: editedAttributes.weightUnit,
    }
  }, [editedAttributes])

  const requiredInfo = useMemo(
    () => getRequiredTeaInformation(partialInput),
    [partialInput]
  )

  // Quick lookup for evidence by field
  const evidenceMap = useMemo(() => {
    const map = new Map<keyof TeaExtraction, ExtractionEvidence>()
    for (const ev of extractionResult.evidence) {
      if (ev.field && ev.sourceText) {
        map.set(ev.field, ev)
      }
    }
    return map
  }, [extractionResult.evidence])

  // Field status badges
  function renderRequirementBadge(status: FieldRequirementStatus) {
    switch (status) {
      case "satisfied":
        return (
          <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
            Provided
          </Badge>
        )
      case "required":
        return (
          <Badge variant="default" className="text-[10px] bg-amber-600 hover:bg-amber-600">
            Required
          </Badge>
        )
      case "optional":
        return (
          <Badge variant="outline" className="text-[10px]">
            Optional
          </Badge>
        )
      case "not_required":
        return (
          <Badge variant="secondary" className="text-[10px]">
            Not required for this path
          </Badge>
        )
    }
  }

  // Weight display text
  const weightText = useMemo(() => {
    if (editedAttributes.netWeight == null || editedAttributes.netWeight <= 0) {
      return "Not Identified"
    }
    const unit = editedAttributes.weightUnit ?? "g"
    if (editedAttributes.weightPrecision === "approximate") {
      return `Approximately ${editedAttributes.netWeight} ${unit}`
    }
    return `${editedAttributes.netWeight} ${unit}`
  }, [editedAttributes.netWeight, editedAttributes.weightUnit, editedAttributes.weightPrecision])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-foreground">
            I understood your product as
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Review the extracted details below. You can edit any value if needed before running deterministic classification.
        </p>
      </div>

      {/* ── Insufficient info alert (if confirmed with missing fields) ── */}
      {insufficientInfoError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">More information is required</span>
            <p className="leading-relaxed">{insufficientInfoError}</p>
          </div>
        </div>
      )}

      {/* ── Ambiguities Banner (if any) ── */}
      {extractionResult.ambiguities.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <span>Information Needs Clarification</span>
          </div>
          {extractionResult.ambiguities.map((amb, idx) => (
            <div key={idx} className="flex flex-col gap-2 text-xs">
              <p className="text-muted-foreground">{amb.reason}</p>
              {amb.candidates.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="font-medium text-foreground">Select candidate:</span>
                  {amb.candidates.map((cand) => (
                    <Button
                      key={cand}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs capitalize"
                      onClick={() => {
                        if (amb.field === "teaType") {
                          onUpdateAttributes({
                            ...editedAttributes,
                            teaType: cand as ExtractedTeaType,
                          })
                        }
                      }}
                    >
                      {cand.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Extracted Attributes Card ── */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Extracted Attributes
          </span>
          <span className="text-xs text-muted-foreground">
            Click Edit to modify any field
          </span>
        </div>

        <div className="divide-y divide-border px-5">
          {/* ── 1. Tea Type ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tea Type
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.teaType)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {TEA_TYPE_DISPLAY[editedAttributes.teaType]}
                </span>
                {evidenceMap.has("teaType") && (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("teaType")?.sourceText}&rdquo;
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit tea type"
                aria-expanded={editingField === "teaType"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "teaType" ? null : "teaType"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "teaType" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Inline Editor for Tea Type */}
            {editingField === "teaType" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Select Tea Type:
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["green", "black", "partly_fermented", "not_sure"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onUpdateAttributes({ ...editedAttributes, teaType: type })
                        setEditingField(null)
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                        editedAttributes.teaType === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{TEA_TYPE_DISPLAY[type]}</span>
                      {editedAttributes.teaType === type && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Presentation ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Presentation
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.presentation)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {PRESENTATION_DISPLAY[editedAttributes.presentation]}
                </span>
                {evidenceMap.has("presentation") && (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("presentation")?.sourceText}&rdquo;
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit presentation"
                aria-expanded={editingField === "presentation"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "presentation" ? null : "presentation"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "presentation" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Inline Editor for Presentation */}
            {editingField === "presentation" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Select Presentation:
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["immediate_packing", "packet", "bulk"] as const).map((pres) => (
                    <button
                      key={pres}
                      type="button"
                      onClick={() => {
                        onUpdateAttributes({ ...editedAttributes, presentation: pres })
                        setEditingField(null)
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                        editedAttributes.presentation === pres
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{PRESENTATION_DISPLAY[pres]}</span>
                      {editedAttributes.presentation === pres && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Product Form ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Product Form
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.form)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {FORM_DISPLAY[editedAttributes.form]}
                </span>
                {evidenceMap.has("form") && (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("form")?.sourceText}&rdquo;
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit product form"
                aria-expanded={editingField === "form"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "form" ? null : "form"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "form" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Inline Editor for Form */}
            {editingField === "form" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Select Product Form:
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["whole_leaf", "dust", "tea_bags", "agglomerated", "waste", "other"] as const).map(
                    (f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          onUpdateAttributes({ ...editedAttributes, form: f })
                          setEditingField(null)
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                          editedAttributes.form === f
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-foreground hover:bg-accent"
                        )}
                      >
                        <span>{FORM_DISPLAY[f]}</span>
                        {editedAttributes.form === f && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── 4. Net Content (Weight) ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Net Content
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.netWeight)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {weightText}
                </span>
                {evidenceMap.has("netWeight") && (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("netWeight")?.sourceText}&rdquo;
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit net content"
                aria-expanded={editingField === "netWeight"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "netWeight" ? null : "netWeight"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "netWeight" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Approximate weight warning if precision is approximate */}
            {editedAttributes.weightPrecision === "approximate" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                Note: Approximate weight detected. If your product is near a tariff boundary (e.g. 25 g, 1 kg, or 3 kg), please edit to confirm the exact package weight.
              </p>
            )}

            {/* Inline Editor for Net Content */}
            {editingField === "netWeight" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Enter Net Content:
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    aria-label="Net weight value"
                    value={editedAttributes.netWeight ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null
                      onUpdateAttributes({
                        ...editedAttributes,
                        netWeight: val,
                        weightPrecision: "exact",
                      })
                    }}
                    placeholder="e.g. 500"
                    className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <select
                    aria-label="Weight unit"
                    value={editedAttributes.weightUnit}
                    onChange={(e) =>
                      onUpdateAttributes({
                        ...editedAttributes,
                        weightUnit: e.target.value as WeightUnit,
                      })
                    }
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="g">g (Grams)</option>
                    <option value="kg">kg (Kilograms)</option>
                  </select>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setEditingField(null)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Requirement Info Note ── */}
      <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-lg border border-border">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <span>{requiredInfo.reason}</span>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToDescription}
            className="gap-2 text-xs"
            id="ai-review-back"
          >
            Back
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onStartOver}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            id="ai-review-start-over"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </Button>
        </div>

        <Button
          type="button"
          onClick={onConfirm}
          className="gap-2"
          id="ai-review-confirm"
        >
          <FlaskConical className="h-4 w-4" />
          Confirm & Classify
        </Button>
      </div>
    </div>
  )
}
