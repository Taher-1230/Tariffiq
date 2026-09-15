// ============================================================
// Coffee Deterministic Classification Engine — Phase 5C-B.1
//
// Authoritative deterministic tariff classifier for Chapter 0901 (Coffee).
// Evaluates rules from coffee_rules.json against validated coffee input.
//
// Invariants:
//   - Zero LLM involvement. 100% deterministic logic.
//   - Resolves hierarchy and descriptions dynamically from coffee_hs_codes.json.
//   - Does NOT treat 0901 11 90 or 0901 90 90 as universal fallbacks
//     (returns no_match with clarification notice).
// ============================================================

import coffeeHsCodesData from "@/data/coffee_hs_codes.json"
import coffeeRulesData from "@/data/coffee_rules.json"
import type {
  ClassificationPathEntry,
} from "@/engine/types"
import { normalizeCoffeeInput } from "./normalizeCoffeeInput"
import { validateCoffeeInput } from "./validateCoffeeInput"
import {
  buildCoffeeReasoningTrace,
  buildCoffeeStructuredExplanation,
} from "./explainCoffeeClassification"
import type {
  CoffeeClassificationInput,
  CoffeeClassificationResult,
  CoffeeClassifiedResult,
  CoffeeNoMatchResult,
  CoffeeRule,
  NormalizedCoffeeInput,
} from "./types"

// ── HS Code metadata lookup map ──────────────────────────────
interface HsCodeEntry {
  hs_code: string
  parent_code: string | null
  level: string
  category: string
  description: string
}

const CODES_MAP = new Map<string, HsCodeEntry>(
  coffeeHsCodesData.codes.map((c) => [c.hs_code, c as HsCodeEntry])
)

const RULES: CoffeeRule[] = (coffeeRulesData.rules as CoffeeRule[]).sort(
  (a, b) => b.priority - a.priority
)

/**
 * Format an 8-digit HS code into "0901 21 10" presentation format.
 */
export function formatCoffeeHsCode(code: string): string {
  const clean = code.replace(/\s+/g, "")
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)}`
  }
  return code
}

/**
 * Reconstruct the hierarchical classification path from 09 -> 0901 -> subheading -> line.
 */
function buildClassificationPath(outputCode: string): ClassificationPathEntry[] {
  const path: ClassificationPathEntry[] = []

  // Root chapter 09
  path.push({
    code: "09",
    description: "Coffee, tea, maté and spices",
  })

  // Heading 0901
  const heading = CODES_MAP.get("0901")
  if (heading) {
    path.push({
      code: "0901",
      description: heading.description,
    })
  }

  // Walk parent chain for subheadings
  const lineEntry = CODES_MAP.get(outputCode)
  if (lineEntry && lineEntry.parent_code && lineEntry.parent_code !== "0901") {
    const parent = CODES_MAP.get(lineEntry.parent_code)
    if (parent) {
      path.push({
        code: formatCoffeeHsCode(parent.hs_code),
        description: parent.description,
      })
    }
  }

  // Target national line
  if (lineEntry) {
    path.push({
      code: formatCoffeeHsCode(lineEntry.hs_code),
      description: lineEntry.description,
    })
  }

  return path
}

/**
 * Matches normalized input against a single rule's conditions.
 */
function matchesRule(
  normalized: NormalizedCoffeeInput,
  rule: CoffeeRule
): boolean {
  const c = rule.conditions

  // 1. Product type
  if (c.product_type && c.product_type !== normalized.productType) {
    return false
  }

  // If product_type is non-coffee (husks, substitutes), no further condition checks
  if (
    normalized.productType === "husks_and_skins" ||
    normalized.productType === "substitutes_containing_coffee"
  ) {
    return c.product_type === normalized.productType
  }

  // 2. Roasting state
  if (c.roasted !== undefined && c.roasted !== normalized.roasted) {
    return false
  }

  // 3. Decaffeination state
  if (
    c.decaffeinated !== undefined &&
    c.decaffeinated !== normalized.decaffeinated
  ) {
    return false
  }

  // 4. Presentation
  if (c.presentation !== undefined && c.presentation !== normalized.presentation) {
    return false
  }

  // 5. Form / variety
  if (c.form !== undefined && c.form !== normalized.form) {
    return false
  }

  // 6. Grade
  if (c.grade !== undefined && c.grade !== normalized.grade) {
    return false
  }

  // 7. Fallbacks (0901 11 90 and 0901 90 90)
  if (c.fallback_within_090111) {
    // Only matches if form is 'other'
    return normalized.form === "other"
  }

  if (c.fallback_within_090190) {
    return false // 0901 90 90 requires source clarification
  }

  return true
}

/**
 * Main deterministic Coffee classifier.
 */
export function classifyCoffee(
  input: CoffeeClassificationInput
): CoffeeClassificationResult {
  // ── 1. Validate input ──────────────────────────────────────
  const validationError = validateCoffeeInput(input)
  if (validationError !== null) {
    return validationError
  }

  // ── 2. Normalize input ────────────────────────────────────
  const normalized = normalizeCoffeeInput(input)

  // ── 3. Find matching rule ──────────────────────────────────
  let matchedRule: CoffeeRule | null = null

  for (const rule of RULES) {
    if (matchesRule(normalized, rule)) {
      matchedRule = rule
      break
    }
  }

  if (!matchedRule) {
    return {
      status: "no_match",
      message: "No applicable Coffee tariff rule matched the provided attributes.",
    } as CoffeeNoMatchResult
  }

  // ── 4. Handle ambiguous "Other" lines requiring clarification ─
  if (matchedRule.notes?.includes("Requires source clarification")) {
    return {
      status: "no_match",
      message: `Classification for HS ${formatCoffeeHsCode(matchedRule.output_code)} requires source clarification on exact scope.`,
    } as CoffeeNoMatchResult
  }

  // ── 5. Build full classification result ────────────────────
  const hsCodeFormatted = formatCoffeeHsCode(matchedRule.output_code)
  const classificationPath = buildClassificationPath(matchedRule.output_code)
  const structuredExplanation = buildCoffeeStructuredExplanation(
    input,
    normalized,
    matchedRule
  )
  const reasoning = buildCoffeeReasoningTrace(
    input,
    normalized,
    matchedRule
  )

  const lineEntry = CODES_MAP.get(matchedRule.output_code)
  const description = lineEntry?.description ?? matchedRule.description

  return {
    status: "classified",
    hsCode: matchedRule.output_code,
    hsCodeFormatted,
    description,
    matchedRuleId: matchedRule.rule_id,
    explanation: matchedRule.description,
    classificationPath,
    inputSummary: input,
    structuredExplanation,
    reasoning,
  } as CoffeeClassifiedResult
}
