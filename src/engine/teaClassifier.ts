// ============================================================
// Tea Classifier — Phase 2A  (Deterministic Rules Engine)
//
// Architecture:
//   TeaClassificationInput
//       → validate
//       → normalize (kg → g)
//       → match rules (sorted by specificity / priority)
//       → look up HS code metadata
//       → return structured ClassificationResult
//
// The engine is driven entirely by the JSON data files:
//   - tea_rules.json   → rule conditions & output codes
//   - tea_hs_codes.json → official HS code descriptions
//
// No AI, no LLM, no probabilistic scoring.
// Same input always produces the same result.
// ============================================================

import type { TeaClassificationInput } from "@/types/classification"
import type {
  ClassificationPathEntry,
  ClassifiedResult,
  HsCodeEntry,
  HsCodesFile,
  NormalizedTeaInput,
  NoMatchResult,
  TeaClassificationResult,
  TeaRule,
  TeaRulesFile,
} from "@/engine/types"

import { normalizeTeaInput } from "@/engine/normalizeTeaInput"
import { validateTeaInput } from "@/engine/validateTeaInput"
import {
  buildReasoningTrace,
  buildStructuredExplanation,
} from "@/engine/explainTeaClassification"

// ── Load data at module level (executed once) ──────────────

import teaRulesData from "@/data/tea_rules.json"
import teaHsCodesData from "@/data/tea_hs_codes.json"

const rulesFile = teaRulesData as TeaRulesFile
const hsCodesFile = teaHsCodesData as HsCodesFile

// Pre-index HS codes by code string for O(1) lookup
const hsCodeMap = new Map<string, HsCodeEntry>(
  hsCodesFile.codes.map((entry) => [entry.hs_code, entry])
)

// ── Rule precedence ────────────────────────────────────────
//
// The JSON rules carry a numeric `priority` field where higher values
// indicate more specific rules.
//
// Precedence Strategy:
// Specific form rules take precedence only when an applicable rule
// exists for the current tea type and input.
//
//   A. Form-specific rules with dedicated entries for that tea type:
//      - Black / Partly Fermented: tea_bags (TEA-017), agglomerated (TEA-018), waste (TEA-019)
//      - Green: agglomerated (TEA-007), waste (TEA-008)
//      * Note: There is NO separate green-tea-specific tea_bags rule in tea_rules.json,
//        so green tea in tea bags evaluates under the applicable green tea presentation/weight rules.
//
//   B. Bulk-specific forms:
//      - Black: bulk leaf (TEA-015), bulk dust (TEA-016)
//      - Green: bulk (TEA-006)
//
//   C. Presentation + weight rules:
//      - Immediate packing ranges (≤25g, >25g & ≤1kg, >1kg & ≤3kg)
//      - Packet ranges (>3kg & ≤20kg)
//
//   D. Fallback / "Other" rules (priority 1):
//      - Evaluated only when no non-fallback rule for that tea type matches.
//
// We sort descending by priority and ensure generic rules without a form
// condition only exclude inputs that have a dedicated form rule for their tea type.
// ────────────────────────────────────────────────────────────

/**
 * Sort rules descending by priority (highest = most specific first).
 * This is done once at module load, not per-call.
 */
const sortedRules: TeaRule[] = [...rulesFile.rules].sort(
  (a, b) => b.priority - a.priority
)

// ── Public API ─────────────────────────────────────────────

/**
 * Classify a tea product deterministically.
 *
 * @param input - The user's classification input from the UI.
 * @returns A discriminated union result.
 */
export function classifyTea(
  input: TeaClassificationInput
): TeaClassificationResult {
  // 1. Validate
  const validationError = validateTeaInput(input)
  if (validationError) return validationError

  // 2. Normalize
  const normalized = normalizeTeaInput(input)

  // 3. Match rules
  const matchedRule = findMatchingRule(normalized)

  if (!matchedRule) {
    return {
      status: "no_match",
      message:
        "No classification rule matched the provided product information. " +
        "Please verify the inputs and try again.",
    } satisfies NoMatchResult
  }

  // 4. Look up HS code metadata
  const hsEntry = hsCodeMap.get(matchedRule.output_code)

  if (!hsEntry) {
    return {
      status: "no_match",
      message:
        `Rule ${matchedRule.rule_id} resolved to HS code ` +
        `${matchedRule.output_code} but this code was not found in the ` +
        `HS code reference data. This indicates a data integrity issue.`,
    } satisfies NoMatchResult
  }

  // 5. Build classification path
  const classificationPath = buildClassificationPath(matchedRule.output_code)

  // 6. Build formatted code
  const hsCodeFormatted = formatHsCode(matchedRule.output_code)

  // 7. Build structured explanation + reasoning trace (deterministic,
  //    derived only from the normalized input and matched rule)
  const structuredExplanation = buildStructuredExplanation(
    normalized,
    matchedRule,
    hsCodeFormatted
  )
  const reasoning = buildReasoningTrace(
    input,
    normalized,
    matchedRule,
    hsCodeFormatted
  )

  return {
    status: "classified",
    hsCode: matchedRule.output_code,
    hsCodeFormatted,
    description: hsEntry.description,
    matchedRuleId: matchedRule.rule_id,
    explanation: matchedRule.explanation,
    classificationPath,
    inputSummary: input,
    structuredExplanation,
    reasoning,
  } satisfies ClassifiedResult
}

// ── Rule matching ──────────────────────────────────────────

/**
 * Returns true if `rule` is a fallback rule (contains any
 * fallback_within_* flag set to true).
 */
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
 * Forms that have dedicated specific rules in tea_rules.json for a given tea type.
 * Specific form rules take precedence only when an applicable rule exists
 * for the current tea type and input.
 *
 * - For green tea: "agglomerated" (TEA-007), "waste" (TEA-008).
 *   (There is NO green-tea-specific tea_bags rule in source data, so green tea
 *   with tea_bags continues to evaluate regular green tea presentation/weight rules).
 *
 * - For black & partly fermented tea: "tea_bags" (TEA-017), "agglomerated" (TEA-018), "waste" (TEA-019).
 */
const SPECIAL_FORMS_BY_TEA_TYPE: Record<
  NormalizedTeaInput["teaType"],
  ReadonlySet<string>
> = {
  green: new Set(["agglomerated", "waste"]),
  black: new Set(["tea_bags", "agglomerated", "waste"]),
  partly_fermented: new Set(["tea_bags", "agglomerated", "waste"]),
}

/**
 * Checks if a dedicated specific form rule exists for the given tea type and form.
 */
function hasDedicatedFormRule(
  teaType: NormalizedTeaInput["teaType"],
  form: string
): boolean {
  return SPECIAL_FORMS_BY_TEA_TYPE[teaType]?.has(form) ?? false
}

/**
 * Normalize the UI form value to the form value used in tea_rules.json.
 * The UI uses "whole_leaf"; the rules JSON uses "leaf".
 */
function normalizeFormForRule(form: string): string {
  return form === "whole_leaf" ? "leaf" : form
}

/**
 * Check whether a single rule's conditions match the normalized input.
 *
 * Fallback rules match only if no non-fallback rule has matched
 * (controlled by the caller via `allowFallback`).
 */
function ruleMatchesInput(
  rule: TeaRule,
  input: NormalizedTeaInput,
  allowFallback: boolean
): boolean {
  const c = rule.conditions

  // ── Fallback gate ──
  if (isFallbackRule(rule)) {
    if (!allowFallback) return false
    // For a fallback, only tea_type needs to match
  }

  // ── Tea type ──
  const teaTypes = Array.isArray(c.tea_type) ? c.tea_type : [c.tea_type]
  if (!teaTypes.includes(input.teaType)) return false

  // ── Presentation (if specified in the rule) ──
  if (c.presentation !== undefined) {
    if (c.presentation !== input.presentation) return false
  }

  // ── Form matching ──
  //
  // Key precedence logic:
  //
  // 1. If the rule SPECIFIES a form:
  //    The input form must match the rule's form.
  //
  // 2. If the rule does NOT specify a form (generic presentation/weight rule):
  //    It must NOT match inputs that have a dedicated form rule for their tea type
  //    (e.g., black tea bags → TEA-017, agglomerated green tea → TEA-007).
  //    However, if NO dedicated form rule exists for that tea type (e.g. green tea bags),
  //    the generic presentation/weight rule is evaluated normally.
  //
  if (c.form !== undefined) {
    const inputFormForRule = input.form ? normalizeFormForRule(input.form) : undefined
    if (c.form !== inputFormForRule) return false
  } else if (!isFallbackRule(rule)) {
    if (input.form && hasDedicatedFormRule(input.teaType, input.form)) {
      return false
    }
  }

  // ── Weight bounds (only on non-fallback rules that specify them) ──
  if (!isFallbackRule(rule)) {
    if (c.max_weight_g !== undefined) {
      if (input.netWeightGrams === undefined || input.netWeightGrams > c.max_weight_g) return false
    }
    if (c.min_weight_exclusive_g !== undefined) {
      if (input.netWeightGrams === undefined || input.netWeightGrams <= c.min_weight_exclusive_g) return false
    }
  }

  return true
}

/**
 * Walk the sorted rules (most specific first). Return the first
 * non-fallback match. If no non-fallback rule matches, return
 * the first applicable fallback.
 */
function findMatchingRule(input: NormalizedTeaInput): TeaRule | null {
  // First pass: try all non-fallback rules
  for (const rule of sortedRules) {
    if (isFallbackRule(rule)) continue
    if (ruleMatchesInput(rule, input, false)) return rule
  }

  // Second pass: try fallback rules only
  for (const rule of sortedRules) {
    if (!isFallbackRule(rule)) continue
    if (ruleMatchesInput(rule, input, true)) return rule
  }

  return null
}

// ── HS code path building ──────────────────────────────────

/**
 * Build a classification path from the heading down to the
 * national line, using the parent_code chain in tea_hs_codes.json.
 *
 * Example for "09023020":
 *   [
 *     { code: "09",   description: "Chapter 09" },
 *     { code: "0902", description: "Tea, whether or not flavoured." },
 *     { code: "090230", description: "..." },
 *     { code: "09023020", description: "..." }
 *   ]
 */
function buildClassificationPath(
  hsCode: string
): ClassificationPathEntry[] {
  const path: ClassificationPathEntry[] = []

  // Walk up the parent chain
  let current: HsCodeEntry | undefined = hsCodeMap.get(hsCode)
  while (current) {
    path.unshift({
      code: current.hs_code,
      description: current.description,
    })
    current = current.parent_code
      ? hsCodeMap.get(current.parent_code)
      : undefined
  }

  // Always prepend the chapter (09) — it's not in the HS codes file
  // since the file starts at heading level.
  if (path.length === 0 || path[0].code !== "09") {
    path.unshift({
      code: "09",
      description: "Coffee, tea, maté and spices",
    })
  }

  return path
}

// ── Formatting ─────────────────────────────────────────────

/**
 * Format an 8-digit HS code with spaces: "09023020" → "0902 30 20"
 */
function formatHsCode(code: string): string {
  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4, 6)} ${code.slice(6, 8)}`
  }
  return code
}
