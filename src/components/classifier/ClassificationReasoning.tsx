// ============================================================
// ClassificationReasoning — Phase 3
//
// Renders the deterministic reasoning trace produced by the
// rules engine as a clean vertical step list. Purely
// presentational — the trace is built entirely in
// src/engine/explainTeaClassification.ts, not here.
//
// This intentionally does NOT look like an AI chain-of-thought
// display: it shows fixed, decision-relevant facts (product,
// tea type, presentation, form, weight, matched rule, result),
// not free-text model reasoning.
// ============================================================

import { CheckCircle2, HelpCircle, Info, ListTree, MinusCircle } from "lucide-react"

import type { ReasoningStep } from "@/engine/index"

interface ClassificationReasoningProps {
  reasoning: ReasoningStep[]
}

function StepIcon({
  result,
  isLast,
}: {
  result: ReasoningStep["result"]
  isLast: boolean
}) {
  if (isLast) {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
  }

  switch (result) {
    case "matched":
    case "decision_relevant":
      return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
    case "provided_not_required":
      return <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    case "not_applicable":
      return <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    case "required_missing":
      return <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
    default:
      return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
  }
}

export function ClassificationReasoning({ reasoning }: ClassificationReasoningProps) {
  if (reasoning.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ListTree className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Classification Reasoning</h3>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <ol className="flex flex-col">
          {reasoning.map((step, index) => {
            const isLast = index === reasoning.length - 1
            const isNotRelevant =
              step.result === "provided_not_required" ||
              step.result === "not_applicable"

            return (
              <li
                key={step.step}
                className={`flex items-start gap-3 px-5 py-3.5 ${
                  isLast ? "" : "border-b border-border"
                } ${isLast ? "bg-primary/[0.03]" : ""}`}
              >
                <StepIcon result={step.result} isLast={isLast} />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {step.label}
                  </span>
                  <span
                    className={`break-words text-right text-sm font-medium ${
                      isLast
                        ? "font-mono text-primary"
                        : isNotRelevant
                        ? "text-muted-foreground font-normal"
                        : "text-foreground"
                    }`}
                  >
                    {step.value}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
