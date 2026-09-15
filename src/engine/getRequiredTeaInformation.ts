// ============================================================
// Rule-Driven Required Information Analysis — Phase 3.5
//
// Determines whether the information currently provided is
// sufficient to uniquely select a tariff classification rule,
// or what specific fields are required to resolve candidate rules.
//
// Core Principle:
//   Ask only for information that is necessary to determine
//   the classification.
//
// Architecture:
//   Input attributes
//        ↓
//   Identify candidate rules (compatible with known attributes)
//        ↓
//   Apply tariff rule precedence (dedicated forms take precedence)
//        ↓
//   Can exactly one applicable rule be selected?
//        ├── YES → sufficient: true, missingFields: []
//        └── NO  → sufficient: false, missingFields: [...]
//
// This utility contains ZERO hardcoded HS codes — all logic is
// driven directly from tea_rules.json.
// ============================================================

import type { TeaClassificationInput } from "@/types/classification"
import type {
  RequiredInformationAnalysis,
  TeaRule,
  TeaRulesFile,
} from "@/engine/types"

import teaRulesData from "@/data/tea_rules.json"

const rulesFile = teaRulesData as TeaRulesFile

const sortedRules: TeaRule[] = [...rulesFile.rules].sort(
  (a, b) => b.priority - a.priority
)

// ── Dedicated special forms ────────────────────────────────
//
// Forms that have dedicated specific rules in tea_rules.json.
// When one of these forms is present, generic presentation/weight
// rules without a form condition are excluded from candidacy.
//
// - For green tea: "agglomerated" (TEA-007), "waste" (TEA-008)
// - For black & partly fermented tea: "tea_bags" (TEA-017), "agglomerated" (TEA-018), "waste" (TEA-019)
const SPECIAL_FORMS_BY_TEA_TYPE: Record<
  "green" | "black" | "partly_fermented",
  ReadonlySet<string>
> = {
  green: new Set(["agglomerated", "waste"]),
  black: new Set(["tea_bags", "agglomerated", "waste"]),
  partly_fermented: new Set(["tea_bags", "agglomerated", "waste"]),
}

function hasDedicatedFormRule(
  teaType: "green" | "black" | "partly_fermented",
  form: string
): boolean {
  return SPECIAL_FORMS_BY_TEA_TYPE[teaType]?.has(form) ?? false
}

function normalizeFormForRule(form: string): string {
  return form === "whole_leaf" ? "leaf" : form
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

function hasWeightCondition(rule: TeaRule): boolean {
  return (
    rule.conditions.max_weight_g !== undefined ||
    rule.conditions.min_weight_exclusive_g !== undefined
  )
}

/**
 * Checks if a non-fallback rule is compatible with the known attributes.
 */
function isRuleCandidate(
  rule: TeaRule,
  teaType: "green" | "black" | "partly_fermented",
  presentation?: string | null,
  form?: string | null,
  weightGrams?: number
): boolean {
  const c = rule.conditions

  // Fallback rules are evaluated only when no specific candidates remain
  if (isFallbackRule(rule)) return false

  // 1. Tea type
  const teaTypes = Array.isArray(c.tea_type) ? c.tea_type : [c.tea_type]
  if (!teaTypes.includes(teaType)) return false

  // 2. Form matching & precedence
  if (form) {
    const inputFormForRule = normalizeFormForRule(form)
    if (c.form !== undefined) {
      if (c.form !== inputFormForRule) return false
    } else {
      // If the rule does not specify a form, but the user form has a dedicated rule,
      // the generic rule is not a candidate.
      if (hasDedicatedFormRule(teaType, form)) {
        return false
      }
    }
  }

  // 3. Presentation
  if (presentation && c.presentation !== undefined) {
    if (c.presentation !== presentation) return false
  }

  // 4. Weight bounds (only if weight is provided)
  if (weightGrams !== undefined && weightGrams > 0) {
    if (c.max_weight_g !== undefined && weightGrams > c.max_weight_g) {
      return false
    }
    if (
      c.min_weight_exclusive_g !== undefined &&
      weightGrams <= c.min_weight_exclusive_g
    ) {
      return false
    }
  }

  return true
}

/**
 * Analyze the classification input against candidate rules in tea_rules.json
 * and determine what information is required.
 */
export function getRequiredTeaInformation(
  input: Partial<TeaClassificationInput>
): RequiredInformationAnalysis {
  const missingFields: string[] = []
  let reason: string | undefined

  // ── 1. Basic Structural Checks ─────────────────────────────

  const categoryValid = input.productCategory === "tea"
  const fieldStatus: RequiredInformationAnalysis["fieldStatus"] = {
    productCategory: categoryValid ? "satisfied" : "required",
    teaType: "required",
    presentation: "required",
    form: "required",
    netWeight: "required",
  }

  if (!categoryValid) {
    missingFields.push("productCategory")
    return {
      sufficient: false,
      missingFields,
      reason: "Product category must be 'tea'.",
      candidateRules: [],
      fieldStatus,
    }
  }

  const teaType = input.teaType
  if (!teaType || teaType === "not_sure") {
    missingFields.push("teaType")
    if (
      input.presentation === "immediate_packing" &&
      (input.netWeight == null || !Number.isFinite(input.netWeight) || input.netWeight <= 0)
    ) {
      missingFields.push("netWeight")
    }
    return {
      sufficient: false,
      missingFields,
      reason:
        "Tea type must be identified before candidate tariff rules can be determined.",
      candidateRules: [],
      fieldStatus,
    }
  }

  const validTeaType = teaType as "green" | "black" | "partly_fermented"
  fieldStatus.teaType = "satisfied"

  // ── 2. Weight Normalization ────────────────────────────────

  const weightGrams =
    input.netWeight != null && Number.isFinite(input.netWeight) && input.netWeight > 0
      ? input.weightUnit === "kg"
        ? input.netWeight * 1000
        : input.netWeight
      : undefined

  // ── 3. Find Candidate Non-Fallback Rules ────────────────────

  const candidateRules = sortedRules.filter((rule) =>
    isRuleCandidate(
      rule,
      validTeaType,
      input.presentation,
      input.form,
      weightGrams
    )
  )

  // ── 4. Analyze Candidacy & Field Relevance ─────────────────

  const anyCandidateRequiresWeight = candidateRules.some(hasWeightCondition)

  // Check form requirements
  const userHasDedicatedForm =
    input.form != null && hasDedicatedFormRule(validTeaType, input.form)

  // Weight requirement determination
  if (candidateRules.length > 0 && !anyCandidateRequiresWeight) {
    fieldStatus.netWeight = weightGrams !== undefined ? "satisfied" : "not_required"
  } else if (anyCandidateRequiresWeight) {
    fieldStatus.netWeight = weightGrams !== undefined ? "satisfied" : "required"
  } else {
    fieldStatus.netWeight = weightGrams !== undefined ? "satisfied" : "not_required"
  }

  // Presentation requirement determination
  const anyCandidateRequiresPresentation = candidateRules.some(
    (r) => r.conditions.presentation !== undefined
  )
  if (userHasDedicatedForm) {
    fieldStatus.presentation =
      input.presentation != null ? "satisfied" : "not_required"
  } else if (input.presentation != null) {
    fieldStatus.presentation = "satisfied"
  } else if (!anyCandidateRequiresPresentation && candidateRules.length > 0) {
    fieldStatus.presentation = "not_required"
  } else {
    fieldStatus.presentation = "required"
  }

  // Form requirement determination
  if (input.form != null) {
    fieldStatus.form = "satisfied"
  } else {
    // If rules differ on form (e.g. bulk leaf vs bulk dust)
    const formsInCandidates = new Set(
      candidateRules.map((r) => r.conditions.form).filter(Boolean)
    )
    if (formsInCandidates.size > 0) {
      fieldStatus.form = "required"
    } else {
      fieldStatus.form = "optional"
    }
  }

  // ── 5. Uniqueness & Missing Information ────────────────────

  // Case A: Exactly 1 non-fallback candidate rule exists
  if (candidateRules.length === 1) {
    const singleRule = candidateRules[0]
    const c = singleRule.conditions

    // Check if the single candidate has conditions not yet provided
    if (c.presentation !== undefined && !input.presentation) {
      missingFields.push("presentation")
      reason = "Presentation is required for this classification rule."
    }

    if (c.form !== undefined && !input.form) {
      missingFields.push("form")
      reason = "Product form is required for this classification rule."
    }

    if (hasWeightCondition(singleRule) && weightGrams === undefined) {
      missingFields.push("netWeight")
      reason =
        input.presentation === "immediate_packing"
          ? "Package weight is required to determine the applicable immediate-packing tariff line."
          : "Package weight is required to determine the applicable tariff line."
    }

    return {
      sufficient: missingFields.length === 0,
      missingFields,
      reason,
      candidateRules,
      fieldStatus,
    }
  }

  // Case B: Multiple non-fallback candidate rules exist
  if (candidateRules.length > 1) {
    // Check what distinguishes the candidates
    const presentations = new Set(
      candidateRules.map((r) => r.conditions.presentation).filter(Boolean)
    )
    const forms = new Set(
      candidateRules.map((r) => r.conditions.form).filter(Boolean)
    )

    if (presentations.size > 1 && !input.presentation) {
      missingFields.push("presentation")
    }

    if (forms.size > 0 && !input.form) {
      missingFields.push("form")
    }

    if (anyCandidateRequiresWeight && weightGrams === undefined) {
      if (!missingFields.includes("netWeight")) {
        missingFields.push("netWeight")
      }
    }

    // Set descriptive reason message
    if (missingFields.includes("netWeight")) {
      reason =
        input.presentation === "immediate_packing"
          ? "Package weight is required to determine the applicable immediate-packing tariff line."
          : "Package weight is required to distinguish the applicable tariff lines."
    } else if (missingFields.includes("form")) {
      reason = "Product form is required to distinguish the applicable tariff lines."
    } else if (missingFields.includes("presentation")) {
      reason = "Presentation is required to determine the applicable tariff category."
    }

    return {
      sufficient: false,
      missingFields,
      reason,
      candidateRules,
      fieldStatus,
    }
  }

  // Case C: No non-fallback candidate rules matched
  // Fallback rules are evaluated.
  // For green: immediate_packing → TEA-004, other → TEA-009.
  // For black: immediate_packing → TEA-013, other → TEA-020.
  if (!input.presentation) {
    missingFields.push("presentation")
    reason = "Presentation is required to determine the applicable tariff line."
    return {
      sufficient: false,
      missingFields,
      reason,
      candidateRules: [],
      fieldStatus,
    }
  }

  // If presentation is known and no specific rules match, fallback rule is unique.
  return {
    sufficient: true,
    missingFields: [],
    candidateRules: [],
    fieldStatus,
  }
}
