// ============================================================
// Explanation & Reasoning Trace Builder — Phase 3
//
// Builds a structured, human-readable explanation and a
// machine-readable reasoning trace from:
//   - the original (un-normalized) UI input
//   - the normalized input used by the rules engine
//   - the matched rule
//
// This is entirely deterministic. No AI, no free text generation,
// no probabilistic scoring — every value is derived directly from
// structured data (the input and the matched rule's conditions).
//
// This module has no React dependency, matching the rest of
// src/engine/.
// ============================================================

import type { TeaClassificationInput } from "@/types/classification"
import type {
  NormalizedTeaInput,
  ReasoningStep,
  StructuredExplanation,
  TeaRule,
} from "@/engine/types"

// ── Human-readable labels ────────────────────────────────────
//
// Kept local to the engine (rather than imported from UI
// components) so the engine remains independent of React and
// of any particular presentation layer.

const TEA_TYPE_LABELS: Record<string, string> = {
  green: "Green / not fermented tea",
  black: "Black / fermented tea",
  partly_fermented: "Partly fermented tea",
}

const PRESENTATION_LABELS: Record<string, string> = {
  immediate_packing: "Immediate packing",
  packet: "Packet",
  bulk: "Bulk",
}

// Covers both the UI's form vocabulary ("whole_leaf") and the
// tea_rules.json vocabulary ("leaf") for the same physical form.
const FORM_LABELS: Record<string, string> = {
  whole_leaf: "Whole leaf",
  leaf: "Leaf",
  dust: "Dust",
  tea_bags: "Tea bags",
  agglomerated: "Agglomerated",
  waste: "Waste",
  other: "Other",
}

function labelFor(map: Record<string, string>, value: string): string {
  return map[value] ?? value
}

/**
 * Format a gram value using kg when it is a whole number of
 * kilograms, otherwise grams. Used only for describing rule
 * thresholds (e.g. "1 kg" instead of "1000 g"), never for
 * altering the user's own entered value.
 */
function formatThreshold(grams: number): string {
  if (grams >= 1000 && grams % 1000 === 0) {
    return `${grams / 1000} kg`
  }
  return `${grams} g`
}

function isFallbackRule(rule: TeaRule): boolean {
  const c = rule.conditions
  return !!(
    c.fallback_within_090210 ||
    c.fallback_within_090220 ||
    c.fallback_within_090230 ||
    c.fallback_within_090240
  )
}

/**
 * Describe the weight condition of a matched rule in plain language,
 * derived entirely from the rule's structured conditions.
 */
export function describeWeightCondition(rule: TeaRule): string {
  if (isFallbackRule(rule)) {
    return "Does not meet the conditions of a more specific weight or form rule (fallback / \"Other\")."
  }

  const { max_weight_g, min_weight_exclusive_g } = rule.conditions

  if (max_weight_g !== undefined && min_weight_exclusive_g !== undefined) {
    return `More than ${formatThreshold(min_weight_exclusive_g)} and not more than ${formatThreshold(max_weight_g)}`
  }
  if (max_weight_g !== undefined) {
    return `Not exceeding ${formatThreshold(max_weight_g)}`
  }
  if (min_weight_exclusive_g !== undefined) {
    return `More than ${formatThreshold(min_weight_exclusive_g)}`
  }
  return "No specific weight threshold applies to this rule."
}

/**
 * Describe the matched condition of a rule in plain language.
 */
export function describeMatchedCondition(rule: TeaRule): string {
  if (isFallbackRule(rule)) {
    return "Does not meet the conditions of a more specific weight or form rule (fallback / \"Other\")."
  }

  const { form, presentation, max_weight_g, min_weight_exclusive_g } =
    rule.conditions

  if (max_weight_g !== undefined && min_weight_exclusive_g !== undefined) {
    return `More than ${formatThreshold(min_weight_exclusive_g)} and not more than ${formatThreshold(max_weight_g)}`
  }
  if (max_weight_g !== undefined) {
    return `Not exceeding ${formatThreshold(max_weight_g)}`
  }
  if (min_weight_exclusive_g !== undefined) {
    return `More than ${formatThreshold(min_weight_exclusive_g)}`
  }

  if (form === "tea_bags") {
    return "Tea bags"
  }
  if (form === "agglomerated") {
    return "Agglomerated in forms such as ball, brick and tablets"
  }
  if (form === "waste") {
    return "Tea waste"
  }
  if (presentation === "bulk") {
    if (form === "leaf") return "Leaf in bulk"
    if (form === "dust") return "Dust in bulk"
    return "Bulk tea"
  }

  return "No specific weight threshold applies to this rule."
}

/**
 * Build the structured explanation object for a classified result.
 */
export function buildStructuredExplanation(
  normalized: NormalizedTeaInput,
  rule: TeaRule,
  finalCodeFormatted: string
): StructuredExplanation {
  return {
    productType: "Tea",
    teaType: labelFor(TEA_TYPE_LABELS, normalized.teaType),
    presentation: normalized.presentation
      ? labelFor(PRESENTATION_LABELS, normalized.presentation)
      : "Not required",
    form: normalized.form
      ? labelFor(FORM_LABELS, normalized.form)
      : "Not specified",
    weightCondition: describeWeightCondition(rule),
    matchedRuleId: rule.rule_id,
    finalCode: finalCodeFormatted,
  }
}

/**
 * Build the machine-readable, step-by-step reasoning trace for a
 * classified result. Each step reflects whether the attribute was
 * decision-relevant, provided but not required, or not applicable.
 */
export function buildReasoningTrace(
  input: TeaClassificationInput,
  normalized: NormalizedTeaInput,
  rule: TeaRule,
  finalCodeFormatted: string
): ReasoningStep[] {
  const steps: ReasoningStep[] = []
  let step = 1

  steps.push({ step: step++, label: "Product", value: "Tea", result: "matched" })

  steps.push({
    step: step++,
    label: "Tea Type",
    value: labelFor(TEA_TYPE_LABELS, normalized.teaType),
    result: "matched",
  })

  // Presentation is included if the rule specifies presentation
  if (rule.conditions.presentation !== undefined) {
    steps.push({
      step: step++,
      label: "Presentation",
      value: labelFor(PRESENTATION_LABELS, normalized.presentation ?? ""),
      result: "matched",
    })
  }

  // Form is included if the rule specifies form
  if (rule.conditions.form !== undefined) {
    steps.push({
      step: step++,
      label: "Form",
      value: labelFor(FORM_LABELS, normalized.form ?? ""),
      result: "matched",
    })
  }

  // Net Content relevance
  const ruleHasWeight =
    rule.conditions.max_weight_g !== undefined ||
    rule.conditions.min_weight_exclusive_g !== undefined

  if (ruleHasWeight) {
    steps.push({
      step: step++,
      label: "Net Content",
      value: `${input.netWeight} ${input.weightUnit ?? "g"}`,
      result: "matched",
    })
  } else if (input.netWeight != null && input.netWeight > 0) {
    steps.push({
      step: step++,
      label: "Net Content",
      value: `${input.netWeight} ${input.weightUnit ?? "g"} (Not required for this rule)`,
      result: "provided_not_required",
    })
  } else {
    steps.push({
      step: step++,
      label: "Net Content",
      value: "Not required for this rule",
      result: "not_applicable",
    })
  }

  steps.push({
    step: step++,
    label: "Applicable Rule",
    value: describeMatchedCondition(rule),
    result: "matched",
  })

  steps.push({
    step: step++,
    label: "Result",
    value: finalCodeFormatted,
    result: "matched",
  })

  return steps
}
