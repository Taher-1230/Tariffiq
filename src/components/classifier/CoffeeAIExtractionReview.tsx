// ============================================================
// CoffeeAIExtractionReview — Review & Confirm Extracted Attributes (Phase 5C-B.3)
//
// Displays extracted Coffee facts from Gemini in a structured,
// editable review UI.
//
// CRITICAL INVARIANT:
//   Gemini extracts facts.
//   The USER confirms or edits those facts.
//   The deterministic Coffee classifier determines the HS code.
//   This UI MUST NEVER display an HS code or treat Gemini as a classifier.
// ============================================================

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Coffee,
  FlaskConical,
  HelpCircle,
  Info,
  Pencil,
  RotateCcw,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getRequiredCoffeeInformation } from "@/products/coffee/requirements"
import type { FieldRequirementStatus } from "@/engine/types"
import type {
  CoffeeExtraction,
  CoffeeExtractionEvidence,
  CoffeeExtractionResult,
  ExtractedCoffeeForm,
  ExtractedCoffeeGrade,
  ExtractedCoffeePresentation,
  ExtractedCoffeeProductType,
  ExtractedDecaffeinated,
  ExtractedRoasted,
} from "@/products/coffee/ai/types"
import type {
  CoffeeClassificationInput,
  CoffeeForm,
  CoffeeGrade,
  CoffeePresentation,
  CoffeeProductType,
} from "@/products/coffee/types"

// ── Display Labels ──────────────────────────────────────────

const PRODUCT_TYPE_DISPLAY: Record<ExtractedCoffeeProductType, string> = {
  coffee: "Coffee",
  husks_and_skins: "Coffee husks & skins",
  substitutes_containing_coffee: "Coffee substitutes containing coffee",
  unknown: "Not Identified",
}

function getRoastingDisplay(val: ExtractedRoasted): string {
  if (val === true) return "Roasted"
  if (val === false) return "Not roasted (green / raw)"
  return "Not determined"
}

function getDecafDisplay(val: ExtractedDecaffeinated): string {
  if (val === true) return "Decaffeinated"
  if (val === false) return "Not decaffeinated (contains caffeine)"
  return "Not determined"
}

const PRESENTATION_DISPLAY: Record<ExtractedCoffeePresentation, string> = {
  bulk: "Bulk",
  other: "Other packaging (retail / non-bulk)",
  unknown: "Not Identified",
}

const FORM_DISPLAY: Record<ExtractedCoffeeForm, string> = {
  arabica_plantation: "Arabica plantation",
  arabica_cherry: "Arabica Cherry",
  rob_cherry: "Rob cherry",
  other: "Other",
  unknown: "Not Identified",
}

const GRADE_DISPLAY: Record<ExtractedCoffeeGrade, string> = {
  A: "Grade A",
  B: "Grade B",
  C: "Grade C",
  AB: "Grade AB",
  PB: "Grade PB (Peaberry)",
  BBB: "Grade BBB",
  "B/B/B": "Grade B/B/B",
  other: "Other",
  unknown: "Not Identified",
}

// ── Component Props ──────────────────────────────────────────

export interface CoffeeAIExtractionReviewProps {
  extractionResult: CoffeeExtractionResult
  editedAttributes: CoffeeExtraction
  onUpdateAttributes: (updated: CoffeeExtraction) => void
  onConfirm: () => void
  onStartOver: () => void
  onBackToDescription: () => void
  insufficientInfoError?: string | null
}

type EditableField =
  | "productType"
  | "roasted"
  | "decaffeinated"
  | "presentation"
  | "form"
  | "grade"

// ── Component ──────────────────────────────────────────────

export function CoffeeAIExtractionReview({
  extractionResult,
  editedAttributes,
  onUpdateAttributes,
  onConfirm,
  onStartOver,
  onBackToDescription,
  insufficientInfoError,
}: CoffeeAIExtractionReviewProps) {
  const [editingField, setEditingField] = useState<EditableField | null>(null)

  // Map edited attributes to partial input for requirement evaluation
  const partialInput: Partial<CoffeeClassificationInput> = useMemo(() => {
    return {
      productCategory: "coffee",
      productType:
        editedAttributes.productType === "unknown"
          ? "coffee"
          : (editedAttributes.productType as CoffeeProductType),
      roasted:
        editedAttributes.roasted === "unknown"
          ? undefined
          : editedAttributes.roasted,
      decaffeinated:
        editedAttributes.decaffeinated === "unknown"
          ? undefined
          : editedAttributes.decaffeinated,
      presentation:
        editedAttributes.presentation === "unknown"
          ? undefined
          : (editedAttributes.presentation as CoffeePresentation),
      form:
        editedAttributes.form === "unknown"
          ? undefined
          : (editedAttributes.form as CoffeeForm),
      grade:
        editedAttributes.grade === "unknown"
          ? undefined
          : (editedAttributes.grade as CoffeeGrade),
    }
  }, [editedAttributes])

  const requiredInfo = useMemo(
    () => getRequiredCoffeeInformation(partialInput),
    [partialInput]
  )

  // Evidence lookup map
  const evidenceMap = useMemo(() => {
    const map = new Map<keyof CoffeeExtraction, CoffeeExtractionEvidence>()
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
          <Badge
            variant="outline"
            className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          >
            Provided
          </Badge>
        )
      case "required":
        return (
          <Badge
            variant="default"
            className="text-[10px] bg-amber-600 hover:bg-amber-600"
          >
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
            Not required for this product
          </Badge>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-foreground">
            I understood your coffee product as
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
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 animate-fade-in"
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
        <div className="flex flex-col gap-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-blue-900 dark:text-blue-200 animate-fade-in">
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
                        if (amb.field === "form") {
                          onUpdateAttributes({
                            ...editedAttributes,
                            form: cand as ExtractedCoffeeForm,
                          })
                        } else if (amb.field === "grade") {
                          onUpdateAttributes({
                            ...editedAttributes,
                            grade: cand as ExtractedCoffeeGrade,
                          })
                        } else if (amb.field === "presentation") {
                          onUpdateAttributes({
                            ...editedAttributes,
                            presentation: cand as ExtractedCoffeePresentation,
                          })
                        } else if (amb.field === "productType") {
                          onUpdateAttributes({
                            ...editedAttributes,
                            productType: cand as ExtractedCoffeeProductType,
                          })
                        }
                      }}
                    >
                      {cand.replace(/_/g, " ")}
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
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extracted Coffee Attributes
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Click Edit to modify any field
          </span>
        </div>

        <div className="divide-y divide-border px-5">
          {/* ── 1. Product Type ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Product Type
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.productType)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {PRODUCT_TYPE_DISPLAY[editedAttributes.productType]}
                </span>
                {evidenceMap.has("productType") ? (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("productType")?.sourceText}&rdquo;
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/70 italic">
                    Not explicitly found in description
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit product type"
                aria-expanded={editingField === "productType"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "productType" ? null : "productType"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "productType" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Inline Editor for Product Type */}
            {editingField === "productType" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Select Product Type:
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      "coffee",
                      "husks_and_skins",
                      "substitutes_containing_coffee",
                    ] as const
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onUpdateAttributes({
                          ...editedAttributes,
                          productType: type,
                        })
                        setEditingField(null)
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                        editedAttributes.productType === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{PRODUCT_TYPE_DISPLAY[type]}</span>
                      {editedAttributes.productType === type && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Roasting State ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Roasting State
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.roasted)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {getRoastingDisplay(editedAttributes.roasted)}
                </span>
                {editedAttributes.roasted === "unknown" && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Gemini could not determine whether this product is roasted.
                  </span>
                )}
                {evidenceMap.has("roasted") ? (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("roasted")?.sourceText}&rdquo;
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/70 italic">
                    Not explicitly found in description
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit roasting state"
                aria-expanded={editingField === "roasted"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "roasted" ? null : "roasted"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "roasted" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Inline Editor for Roasting */}
            {editingField === "roasted" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Select Roasting State:
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: true, label: "Roasted" },
                    { value: false, label: "Not roasted" },
                    { value: "unknown", label: "Unknown" },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        onUpdateAttributes({
                          ...editedAttributes,
                          roasted: opt.value as ExtractedRoasted,
                        })
                        setEditingField(null)
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                        editedAttributes.roasted === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{opt.label}</span>
                      {editedAttributes.roasted === opt.value && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Decaffeination ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Decaffeination
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.decaffeinated)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {getDecafDisplay(editedAttributes.decaffeinated)}
                </span>
                {editedAttributes.decaffeinated === "unknown" && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Gemini could not determine whether this product is decaffeinated.
                  </span>
                )}
                {evidenceMap.has("decaffeinated") ? (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("decaffeinated")?.sourceText}&rdquo;
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/70 italic">
                    Not explicitly found in description
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit decaffeination status"
                aria-expanded={editingField === "decaffeinated"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "decaffeinated" ? null : "decaffeinated"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "decaffeinated" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Inline Editor for Decaffeination */}
            {editingField === "decaffeinated" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Select Decaffeination Status:
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: true, label: "Decaffeinated" },
                    { value: false, label: "Not decaffeinated" },
                    { value: "unknown", label: "Unknown" },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        onUpdateAttributes({
                          ...editedAttributes,
                          decaffeinated: opt.value as ExtractedDecaffeinated,
                        })
                        setEditingField(null)
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                        editedAttributes.decaffeinated === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{opt.label}</span>
                      {editedAttributes.decaffeinated === opt.value && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 4. Presentation ── */}
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
                {evidenceMap.has("presentation") ? (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("presentation")?.sourceText}&rdquo;
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/70 italic">
                    Not explicitly found in description
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
                  {(["bulk", "other", "unknown"] as const).map((pres) => (
                    <button
                      key={pres}
                      type="button"
                      onClick={() => {
                        onUpdateAttributes({
                          ...editedAttributes,
                          presentation: pres,
                        })
                        setEditingField(null)
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                        editedAttributes.presentation === pres
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      <span className="capitalize">{pres.replace("_", " ")}</span>
                      {editedAttributes.presentation === pres && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 5. Coffee Form / Variety ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Coffee Form / Variety
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.form)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {FORM_DISPLAY[editedAttributes.form]}
                </span>
                {evidenceMap.has("form") ? (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("form")?.sourceText}&rdquo;
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/70 italic">
                    Not explicitly found in description
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit coffee form"
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
                  Select Coffee Form / Variety:
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      "arabica_plantation",
                      "arabica_cherry",
                      "rob_cherry",
                      "other",
                      "unknown",
                    ] as const
                  ).map((f) => (
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
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 6. Grade ── */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Grade
                  </span>
                  {renderRequirementBadge(requiredInfo.fieldStatus.grade)}
                </div>
                <span className="text-base font-semibold text-foreground">
                  {GRADE_DISPLAY[editedAttributes.grade]}
                </span>
                {evidenceMap.has("grade") ? (
                  <span className="text-xs text-muted-foreground italic">
                    Detected from: &ldquo;{evidenceMap.get("grade")?.sourceText}&rdquo;
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/70 italic">
                    Not explicitly found in description
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit coffee grade"
                aria-expanded={editingField === "grade"}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setEditingField((prev) => (prev === "grade" ? null : "grade"))
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingField === "grade" ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Inline Editor for Grade */}
            {editingField === "grade" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 animate-fade-in flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground">
                  Select Grade:
                </span>
                <div className="grid gap-2 sm:grid-cols-4">
                  {(
                    [
                      "A",
                      "B",
                      "C",
                      "AB",
                      "PB",
                      "BBB",
                      "B/B/B",
                      "other",
                      "unknown",
                    ] as const
                  ).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        onUpdateAttributes({ ...editedAttributes, grade: g })
                        setEditingField(null)
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-xs font-medium transition-all text-left",
                        editedAttributes.grade === g
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{GRADE_DISPLAY[g]}</span>
                      {editedAttributes.grade === g && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Requirement Info Note ── */}
      {requiredInfo.reason && (
        <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-lg border border-border">
          <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <span>{requiredInfo.reason}</span>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToDescription}
            className="gap-2 text-xs"
            id="coffee-review-back"
          >
            Back
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onStartOver}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            id="coffee-review-start-over"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </Button>
        </div>

        <Button
          type="button"
          onClick={onConfirm}
          className="gap-2"
          id="coffee-review-confirm"
        >
          <FlaskConical className="h-4 w-4" />
          Confirm & Classify
        </Button>
      </div>
    </div>
  )
}
