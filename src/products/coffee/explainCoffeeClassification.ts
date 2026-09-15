// ============================================================
// Coffee Explanation & Reasoning Builder — Phase 5C-B.1
//
// Generates structured explanations and step-by-step reasoning traces
// for deterministic Coffee classification results.
// Entirely deterministic. No LLM generation.
// ============================================================

import type { ReasoningStep } from "@/engine/types"
import type {
  CoffeeClassificationInput,
  CoffeeRule,
  CoffeeStructuredExplanation,
  NormalizedCoffeeInput,
} from "./types"

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  coffee: "Coffee",
  husks_and_skins: "Coffee husks and skins",
  substitutes_containing_coffee: "Coffee substitutes containing coffee",
}

const FORM_LABELS: Record<string, string> = {
  arabica_plantation: "Arabica plantation",
  arabica_cherry: "Arabica Cherry",
  rob_cherry: "Rob cherry",
  other: "Other variety/form",
}

const GRADE_LABELS: Record<string, string> = {
  A: "A Grade",
  B: "B Grade",
  C: "C Grade",
  AB: "AB Grade",
  PB: "PB Grade",
  BBB: "B/B/B Grade",
  other: "Other grade",
}

export function buildCoffeeStructuredExplanation(
  _input: CoffeeClassificationInput,
  normalized: NormalizedCoffeeInput,
  rule: CoffeeRule
): CoffeeStructuredExplanation {
  const productType = PRODUCT_TYPE_LABELS[normalized.productType] ?? "Coffee"

  let roastedState = "N/A"
  if (normalized.roasted === true) roastedState = "Roasted"
  else if (normalized.roasted === false) roastedState = "Not roasted"

  let decaffeinatedState = "N/A"
  if (normalized.decaffeinated === true) decaffeinatedState = "Decaffeinated"
  else if (normalized.decaffeinated === false) decaffeinatedState = "Non-decaffeinated"

  let presentation = "N/A"
  if (normalized.presentation === "bulk") presentation = "Bulk packing"
  else if (normalized.presentation === "other") presentation = "Other packaging"

  const form = normalized.form ? FORM_LABELS[normalized.form] ?? normalized.form : "N/A"
  const grade = normalized.grade ? GRADE_LABELS[normalized.grade] ?? normalized.grade : "N/A"

  return {
    productType,
    roastedState,
    decaffeinatedState,
    presentation,
    form,
    grade,
    matchedRuleId: rule.rule_id,
    finalCode: rule.output_code,
  }
}

export function buildCoffeeReasoningTrace(
  _input: CoffeeClassificationInput,
  normalized: NormalizedCoffeeInput,
  rule: CoffeeRule
): ReasoningStep[] {
  const steps: ReasoningStep[] = []
  let stepNum = 1

  // 1. Product Category
  steps.push({
    step: stepNum++,
    label: "Product Category",
    value: "Heading 0901: Coffee, husks, skins & substitutes",
    result: "matched",
  })

  // 2. Product Type Branch
  if (normalized.productType !== "coffee") {
    steps.push({
      step: stepNum++,
      label: "Product Type",
      value: PRODUCT_TYPE_LABELS[normalized.productType] ?? normalized.productType,
      result: "matched",
    })
  } else {
    // 3. Roasting Status
    steps.push({
      step: stepNum++,
      label: "Roasting State",
      value: normalized.roasted ? "Roasted" : "Not roasted",
      result: "matched",
    })

    // 4. Decaffeination Status
    steps.push({
      step: stepNum++,
      label: "Decaffeination State",
      value: normalized.decaffeinated ? "Decaffeinated" : "Non-decaffeinated",
      result: "matched",
    })

    // 5. Roasted Branch Presentation
    if (normalized.roasted) {
      steps.push({
        step: stepNum++,
        label: "Packaging Presentation",
        value: normalized.presentation === "bulk" ? "In bulk packing" : "Other packaging",
        result: "matched",
      })
    }

    // 6. Unroasted Non-Decaf Form & Grade
    if (!normalized.roasted && !normalized.decaffeinated) {
      if (normalized.form) {
        steps.push({
          step: stepNum++,
          label: "Variety / Processing Form",
          value: FORM_LABELS[normalized.form] ?? normalized.form,
          result: "matched",
        })
      }

      if (normalized.form === "rob_cherry" && normalized.presentation === "bulk") {
        steps.push({
          step: stepNum++,
          label: "Presentation",
          value: "Bulk",
          result: "matched",
        })
      } else if (normalized.grade) {
        steps.push({
          step: stepNum++,
          label: "Grade",
          value: GRADE_LABELS[normalized.grade] ?? normalized.grade,
          result: "matched",
        })
      }
    }
  }

  // 7. Matched Rule
  steps.push({
    step: stepNum++,
    label: "Applicable Rule",
    value: `${rule.rule_id} (${rule.source_reference}): ${rule.description}`,
    result: "matched",
  })

  // 8. Resulting Tariff Line
  const formattedCode =
    rule.output_code.length === 8
      ? `${rule.output_code.slice(0, 4)} ${rule.output_code.slice(4, 6)} ${rule.output_code.slice(6, 8)}`
      : rule.output_code

  steps.push({
    step: stepNum,
    label: "Classification Result",
    value: `HS ${formattedCode} — ${rule.description}`,
    result: "matched",
  })

  return steps
}
