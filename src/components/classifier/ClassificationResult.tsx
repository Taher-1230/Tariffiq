// ============================================================
// ClassificationResult — Renders the deterministic engine output
//
// Phase 2B, 5B & 5C-B.3: handles all three ClassificationResult states
// for both Tea and Coffee:
//   "classified"               → HS code + path + explanation + persistence status
//   "insufficient_information" → missing-field guidance
//   "no_match"                 → no-match message + actions
//
// CRITICAL INVARIANT:
//   This component is purely presentational.
//   No classification logic or AI guessing lives here.
//   The classification method is strictly "Deterministic tariff rules".
// ============================================================

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClassificationSummary } from "@/components/classifier/ClassificationSummary"
import { ClassificationReasoning } from "@/components/classifier/ClassificationReasoning"
import type { TeaClassificationResult } from "@/engine/index"
import type { CoffeeClassificationResult } from "@/products/coffee/types"
import type { SpicesClassificationResult } from "@/products/spices/types"
import type { WizardStep } from "@/types/classification"

// ── Prop types ─────────────────────────────────────────────

export type AnyClassificationResult = 
  | TeaClassificationResult 
  | CoffeeClassificationResult
  | SpicesClassificationResult

export type SaveStatus = "idle" | "saved" | "error" | "unauthenticated"

interface ClassificationResultProps {
  result: AnyClassificationResult
  onReclassify: () => void
  onReview: () => void
  onEdit?: (step: WizardStep) => void
  saveStatus?: SaveStatus
  onSignIn?: () => void
  onRetrySave?: () => void
}

/** Shared action row rendered at the bottom of every result state */
function ResultActions({
  onReclassify,
  onReview,
  showReview = true,
}: {
  onReclassify: () => void
  onReview?: () => void
  showReview?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={onReclassify} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Classify Another Product
      </Button>
      {showReview && onReview && (
        <Button variant="outline" onClick={onReview} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Review Details
        </Button>
      )}
    </div>
  )
}

/** Small label/value pair used inside the "Why this result?" card */
function ExplanationField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

// ── Classified result ───────────────────────────────────────

function ClassifiedView({
  result,
  onReclassify,
  onReview,
  saveStatus,
  onSignIn,
  onRetrySave,
}: {
  result: Extract<AnyClassificationResult, { status: "classified" }>
  onReclassify: () => void
  onReview: () => void
  saveStatus?: SaveStatus
  onSignIn?: () => void
  onRetrySave?: () => void
}) {
  // Check if Spices, Coffee or Tea structured explanation
  const isSpices = "spiceType" in result.structuredExplanation
  const isCoffee = !isSpices && "roastedState" in result.structuredExplanation

  const spicesExpl = isSpices
    ? (result.structuredExplanation as {
        spiceType: string
        botanicalType: string
        crushedOrGroundState: string
        subType: string
        form: string
        processingState: string
        quality: string
        sizeCategory: string
        matchedRuleId: string
        finalCode: string
      })
    : null

  const coffeeExpl = isCoffee
    ? (result.structuredExplanation as {
        productType: string
        roastedState: string
        decaffeinatedState: string
        presentation: string
        form: string
        grade: string
        matchedRuleId: string
      })
    : null

  const teaExpl = !isSpices && !isCoffee
    ? (result.structuredExplanation as {
        productType: string
        teaType: string
        presentation: string
        form: string
        weightCondition: string
        matchedRuleId: string
      })
    : null

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-semibold text-foreground">
            Classification Result
          </h2>
          <Badge variant="outline" className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            Deterministic tariff rules
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Determined using confirmed product facts and the TariffIQ deterministic rules engine.
        </p>
      </div>

      {/* ── Persistence status banner ── */}
      {saveStatus === "saved" && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Saved to your classification history.</span>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Could not save to history.</span>
          </div>
          {onRetrySave && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetrySave}
              className="h-7 text-xs"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {saveStatus === "unauthenticated" && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span>Sign in to automatically save classifications to your history.</span>
          </div>
          {onSignIn && (
            <Button variant="outline" size="sm" onClick={onSignIn} className="h-7 text-xs">
              Sign In
            </Button>
          )}
        </div>
      )}

      {/* ── Main result card ── */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Harmonized System (HS) Code
        </span>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-wider text-foreground">
              {result.hsCodeFormatted}
            </span>
            <CheckCircle2
              className="h-5 w-5 translate-y-0.5 text-emerald-600"
              aria-hidden
            />
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {result.description}
          </p>
        </div>
      </div>

      {/* ── Classification path ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">Classification Path</h3>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          {result.classificationPath.map((entry, index) => {
            const isFinal = index === result.classificationPath.length - 1
            return (
              <div
                key={entry.code}
                className={`flex items-start gap-3 px-5 py-3.5 ${
                  index < result.classificationPath.length - 1
                    ? "border-b border-border"
                    : ""
                } ${isFinal ? "bg-primary/[0.03]" : ""}`}
              >
                {/* Connector */}
                <div className="flex flex-col items-center">
                  {index > 0 && (
                    <div className="mb-1 h-2 w-px bg-border" />
                  )}
                  <ChevronRight
                    className={`h-3.5 w-3.5 ${
                      isFinal ? "text-primary" : "text-muted-foreground"
                    }`}
                    aria-hidden
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={`font-mono text-sm font-semibold ${
                      isFinal ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {entry.code}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground break-words">
                    {entry.description}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Classification reasoning ── */}
      <ClassificationReasoning reasoning={result.reasoning} />

      {/* ── Why this result? — Structured explanation ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">Why this result?</h3>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          {spicesExpl ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ExplanationField
                label="Spice Commodity"
                value={spicesExpl.spiceType}
              />
              <ExplanationField
                label="Botanical Genus"
                value={spicesExpl.botanicalType}
              />
              <ExplanationField
                label="Crushed / Ground"
                value={spicesExpl.crushedOrGroundState}
              />
              <ExplanationField
                label="Subtype / Variety"
                value={spicesExpl.subType}
              />
              <ExplanationField
                label="Physical Form"
                value={spicesExpl.form}
              />
              <ExplanationField
                label="Processing State"
                value={spicesExpl.processingState}
              />
              <ExplanationField
                label="Matched Rule"
                value={spicesExpl.matchedRuleId}
              />
            </div>
          ) : coffeeExpl ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ExplanationField
                label="Product Type"
                value={coffeeExpl.productType}
              />
              <ExplanationField
                label="Roasting"
                value={coffeeExpl.roastedState}
              />
              <ExplanationField
                label="Decaffeination"
                value={coffeeExpl.decaffeinatedState}
              />
              <ExplanationField
                label="Presentation"
                value={coffeeExpl.presentation}
              />
              <ExplanationField
                label="Form / Variety"
                value={coffeeExpl.form}
              />
              <ExplanationField
                label="Grade"
                value={coffeeExpl.grade}
              />
              <ExplanationField
                label="Matched Rule"
                value={coffeeExpl.matchedRuleId}
              />
            </div>
          ) : teaExpl ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ExplanationField
                label="Product Type"
                value={teaExpl.productType}
              />
              <ExplanationField
                label="Tea Type"
                value={teaExpl.teaType}
              />
              <ExplanationField
                label="Presentation"
                value={teaExpl.presentation}
              />
              <ExplanationField
                label="Form"
                value={teaExpl.form}
              />
              <ExplanationField
                label="Weight Condition"
                value={teaExpl.weightCondition}
              />
              <ExplanationField
                label="Matched Rule"
                value={teaExpl.matchedRuleId}
              />
            </div>
          ) : null}

          <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {result.explanation}
          </p>
        </div>
      </div>

      {/* ── User input summary ── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Classified Information</h3>
        <ClassificationSummary input={result.inputSummary} />
      </div>

      {/* ── Actions ── */}
      <ResultActions
        onReclassify={onReclassify}
        onReview={onReview}
      />
    </div>
  )
}

// ── Insufficient information result ─────────────────────────

function InsufficientInformationView({
  result,
  onReclassify,
  onEdit,
}: {
  result: Extract<AnyClassificationResult, { status: "insufficient_information" }>
  onReclassify: () => void
  onEdit?: (step: WizardStep) => void
}) {
  const missingFieldLabels: Record<string, { label: string; step?: WizardStep }> = {
    productCategory: { label: "Product Category", step: "product" },
    teaType:         { label: "Tea Type",         step: "tea-type" },
    presentation:    { label: "Presentation",     step: "presentation" },
    form:            { label: "Form",             step: "form" },
    netWeight:       { label: "Net Weight",       step: "weight" },
    roasted:         { label: "Roasting State" },
    decaffeinated:   { label: "Decaffeination" },
    grade:           { label: "Grade" },
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden />
          <h2 className="text-xl font-semibold text-foreground">
            More Information Required
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A definitive classification could not be determined with the provided information.
        </p>
      </div>

      {/* ── Engine message ── */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
        <p className="text-sm leading-relaxed text-foreground">
          {result.message}
        </p>
      </div>

      {/* ── Missing fields guidance ── */}
      {result.missingFields.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Missing or Incomplete Fields
          </h3>

          <div className="flex flex-col gap-2">
            {result.missingFields.map((field) => {
              const info = missingFieldLabels[field] ?? {
                label: field,
              }
              return (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">
                    {info.label}
                  </span>
                  {info.step && onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(info.step!)}
                      className="text-xs"
                    >
                      Provide Information
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onReclassify} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Start Again
        </Button>
      </div>
    </div>
  )
}

// ── No match result ─────────────────────────────────────────

function NoMatchView({
  result,
  onReclassify,
  onReview,
}: {
  result: Extract<AnyClassificationResult, { status: "no_match" }>
  onReclassify: () => void
  onReview: () => void
}) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          <h2 className="text-xl font-semibold text-foreground">
            Classification could not be determined
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The available tariff source does not currently define enough information to safely determine the applicable tariff line.
        </p>
      </div>

      {/* ── Engine message ── */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {result.message}
        </p>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onReview} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Review Information
        </Button>
        <Button variant="outline" onClick={onReclassify} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Start Again
        </Button>
      </div>
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────

export function ClassificationResult({
  result,
  onReclassify,
  onReview,
  onEdit,
  saveStatus,
  onSignIn,
  onRetrySave,
}: ClassificationResultProps) {
  if (result.status === "classified") {
    return (
      <ClassifiedView
        result={result}
        onReclassify={onReclassify}
        onReview={onReview}
        saveStatus={saveStatus}
        onSignIn={onSignIn}
        onRetrySave={onRetrySave}
      />
    )
  }

  if (result.status === "insufficient_information") {
    return (
      <InsufficientInformationView
        result={result}
        onReclassify={onReclassify}
        onEdit={onEdit}
      />
    )
  }

  // status === "no_match"
  return (
    <NoMatchView
      result={result}
      onReclassify={onReclassify}
      onReview={onReview}
    />
  )
}
