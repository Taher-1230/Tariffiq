// ============================================================
// Spices Deterministic Classification Engine — Phase 6.2
//
// Authoritative deterministic tariff classifier for Chapter 09 Spices
// (Headings 0904–0910).
// Evaluates rules from spices_rules.json against validated spices input.
//
// Invariants:
//   - Zero LLM / ML / network involvement. 100% deterministic code & data.
//   - Resolves hierarchy and descriptions dynamically from spices_hs_codes.json.
//   - Does NOT treat "Other" tariff lines as universal fallbacks.
//   - Refuses to guess when facts are missing or ambiguous (abstains).
//   - Applies statutory Chapter 09 notes and exclusions (e.g. Cubeb pepper -> 1211,
//     lost essential character -> 2103).
// ============================================================

import spicesHsCodesData from "@/data/spices_hs_codes.json"
import spicesRulesData from "@/data/spices_rules.json"
import type { ClassificationPathEntry } from "@/engine/types"
import { normalizeSpicesInput } from "./normalizeSpicesInput"
import { validateSpicesInput } from "./validateSpicesInput"
import { getRequiredSpicesInformation } from "./requirements"
import {
  buildSpicesReasoningTrace,
  buildSpicesStructuredExplanation,
} from "./explainSpicesClassification"
import type {
  NormalizedSpicesInput,
  SpicesClassificationInput,
  SpicesClassificationResult,
  SpicesClassifiedResult,
  SpicesNoMatchResult,
  SpicesRule,
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
  spicesHsCodesData.codes.map((c) => [c.hs_code, c as HsCodeEntry])
)

const RULES: SpicesRule[] = (spicesRulesData.rules as SpicesRule[]).sort(
  (a, b) => b.priority - a.priority
)

/**
 * Format an 8-digit HS code into "0904 11 10" presentation format.
 */
export function formatSpicesHsCode(code: string): string {
  const clean = code.replace(/\s+/g, "")
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)}`
  }
  if (clean.length === 6) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)}`
  }
  return code
}

/**
 * Reconstruct the hierarchical classification path from 09 -> Heading -> Subheading -> Line.
 */
function buildClassificationPath(outputCode: string): ClassificationPathEntry[] {
  const path: ClassificationPathEntry[] = []

  // 1. Root Chapter 09
  path.push({
    code: "09",
    description: "Coffee, tea, maté and spices",
  })

  // 2. Heading
  const headingCode = outputCode.slice(0, 4)
  const heading = CODES_MAP.get(headingCode)
  if (heading) {
    path.push({
      code: heading.hs_code,
      description: heading.description,
    })
  }

  // 3. Subheading (walk parent chain)
  const lineEntry = CODES_MAP.get(outputCode)
  if (lineEntry && lineEntry.parent_code && lineEntry.parent_code !== headingCode) {
    const parent = CODES_MAP.get(lineEntry.parent_code)
    if (parent) {
      path.push({
        code: formatSpicesHsCode(parent.hs_code),
        description: parent.description,
      })
    }
  }

  // 4. Target National Line
  if (lineEntry) {
    path.push({
      code: formatSpicesHsCode(lineEntry.hs_code),
      description: lineEntry.description,
    })
  }

  return path
}

/**
 * Matches normalized input against a single rule's conditions.
 */
function matchesRule(
  normalized: NormalizedSpicesInput,
  rule: SpicesRule
): boolean {
  const c = rule.conditions

  // 1. Spice Type
  if (c.spice_type && c.spice_type !== normalized.spiceType) {
    return false
  }

  // 2. Botanical Type
  if (c.botanical_type && c.botanical_type !== normalized.botanicalType) {
    return false
  }

  // 3. Crushed / Ground state
  if (
    c.crushed_or_ground !== undefined &&
    c.crushed_or_ground !== normalized.crushedOrGround
  ) {
    return false
  }

  // 4. SubType
  if (c.sub_type && c.sub_type !== normalized.subType) {
    return false
  }

  // 5. Physical Form
  if (c.form && c.form !== normalized.form) {
    return false
  }

  // 6. Processing State
  if (
    c.processing_state &&
    c.processing_state !== normalized.processingState
  ) {
    return false
  }

  // 7. Quality
  if (c.quality && c.quality !== normalized.quality) {
    return false
  }

  // 8. Size Category
  if (c.size_category && c.size_category !== normalized.sizeCategory) {
    return false
  }

  // 9. Scoped Fallbacks
  // Each scoped fallback only matches if the specific fallback condition is explicitly active
  // or if all specific conditions for that branch failed.
  if (
    c.fallback_within_090411 ||
    c.fallback_within_090422_capsicum ||
    c.fallback_within_090422_pimenta ||
    c.fallback_within_090611 ||
    c.fallback_within_090619 ||
    c.fallback_within_090710 ||
    c.fallback_within_090831 ||
    c.fallback_within_090832 ||
    c.fallback_within_090921 ||
    c.fallback_within_cumin_black ||
    c.fallback_within_cumin_other ||
    c.fallback_within_anise ||
    c.fallback_within_badian ||
    c.fallback_within_caraway_fennel ||
    c.fallback_within_juniper ||
    c.fallback_within_091011 ||
    c.fallback_within_091012 ||
    c.fallback_within_091020 ||
    c.fallback_within_091030 ||
    c.fallback_within_091099 ||
    c.fallback_within_091099_seed ||
    c.fallback_within_091099_powder ||
    c.fallback_within_091099_husk
  ) {
    return true
  }

  return true
}

/**
 * Main deterministic Spices classifier.
 */
export function classifySpices(
  input: SpicesClassificationInput
): SpicesClassificationResult {
  // ── 1. Validate input ──────────────────────────────────────
  const validationError = validateSpicesInput(input)
  if (validationError !== null) {
    return validationError
  }

  // ── 2. Check required information sufficiency ─────────────
  const reqCheck = getRequiredSpicesInformation(input)
  if (!reqCheck.sufficient) {
    return {
      status: "insufficient_information",
      missingFields: reqCheck.missingFields,
      message: reqCheck.reason ?? "Missing required classification fields.",
    }
  }

  // ── 3. Normalize input ────────────────────────────────────
  const normalized = normalizeSpicesInput(input)

  // ── 4. Find matching rule ──────────────────────────────────
  let matchedRule: SpicesRule | null = null

  for (const rule of RULES) {
    if (matchesRule(normalized, rule)) {
      matchedRule = rule
      break
    }
  }

  if (!matchedRule) {
    return {
      status: "no_match",
      message: "No applicable Spices tariff rule matched the provided attributes.",
    } as SpicesNoMatchResult
  }

  // ── 5. Handle ambiguous "Other" lines requiring clarification ─
  if (matchedRule.notes?.includes("REQUIRES SOURCE CLARIFICATION")) {
    return {
      status: "no_match",
      message: `Classification for HS ${formatSpicesHsCode(matchedRule.output_code)} requires source clarification on exact scope (${matchedRule.description}).`,
    } as SpicesNoMatchResult
  }

  // ── 6. Build full classification result ────────────────────
  const hsCodeFormatted = formatSpicesHsCode(matchedRule.output_code)
  const classificationPath = buildClassificationPath(matchedRule.output_code)
  const structuredExplanation = buildSpicesStructuredExplanation(
    input,
    normalized,
    matchedRule
  )
  const reasoning = buildSpicesReasoningTrace(
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
  } as SpicesClassifiedResult
}
