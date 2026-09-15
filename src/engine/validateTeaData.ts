// ============================================================
// Tea Rule/Data Integrity Checker — Phase 3
//
// A development-time (and test-time) diagnostic utility. It does
// NOT modify tea_rules.json or tea_hs_codes.json, and it does NOT
// decide that a rule is "wrong" — it only reports facts about the
// relationship between the two source files so a developer can
// review them.
//
// Two independent concerns are covered here:
//
//   1. validateTeaDataIntegrity() — structural/referential checks
//      (A–G from the Phase 3 spec).
//   2. findRuleOverlaps() — a diagnostic that flags pairs of
//      non-fallback rules whose conditions could both match the
//      same input. This is informational only; the rules engine's
//      own precedence logic (see teaClassifier.ts) is the source
//      of truth for how overlaps are actually resolved at runtime.
//
// No React dependency — consistent with the rest of src/engine/.
// ============================================================

import type { HsCodesFile, TeaRule, TeaRulesFile } from "@/engine/types"

// ── Integrity issues ─────────────────────────────────────────

export type DataIntegrityIssueCode =
  | "MISSING_HS_CODE"
  | "DUPLICATE_HS_CODE"
  | "DUPLICATE_RULE_ID"
  | "INCOMPLETE_RULE"
  | "MISSING_DESCRIPTION"
  | "UNMARKED_FALLBACK"
  | "MALFORMED_CONDITIONS"

export interface DataIntegrityIssue {
  code: DataIntegrityIssueCode
  ruleId?: string
  hsCode?: string
  message: string
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
 * Validate the relationship between tea_rules.json and
 * tea_hs_codes.json. Returns an empty array when the data is
 * internally consistent.
 */
export function validateTeaDataIntegrity(
  rulesFile: TeaRulesFile,
  hsCodesFile: HsCodesFile
): DataIntegrityIssue[] {
  const issues: DataIntegrityIssue[] = []
  const hsCodeSet = new Set(hsCodesFile.codes.map((c) => c.hs_code))

  // ── A. Every rule output_code exists in tea_hs_codes.json ──
  for (const rule of rulesFile.rules) {
    if (!hsCodeSet.has(rule.output_code)) {
      issues.push({
        code: "MISSING_HS_CODE",
        ruleId: rule.rule_id,
        hsCode: rule.output_code,
        message: `Rule ${rule.rule_id} resolves to output_code "${rule.output_code}", which does not exist in tea_hs_codes.json.`,
      })
    }
  }

  // ── B. No duplicate HS codes in the source dataset ──
  const hsCodeCounts = new Map<string, number>()
  for (const entry of hsCodesFile.codes) {
    hsCodeCounts.set(entry.hs_code, (hsCodeCounts.get(entry.hs_code) ?? 0) + 1)
  }
  for (const [code, count] of hsCodeCounts) {
    if (count > 1) {
      issues.push({
        code: "DUPLICATE_HS_CODE",
        hsCode: code,
        message: `HS code "${code}" appears ${count} times in tea_hs_codes.json.`,
      })
    }
  }

  // ── C. No duplicate rule IDs ──
  const ruleIdCounts = new Map<string, number>()
  for (const rule of rulesFile.rules) {
    ruleIdCounts.set(rule.rule_id, (ruleIdCounts.get(rule.rule_id) ?? 0) + 1)
  }
  for (const [id, count] of ruleIdCounts) {
    if (count > 1) {
      issues.push({
        code: "DUPLICATE_RULE_ID",
        ruleId: id,
        message: `Rule id "${id}" appears ${count} times in tea_rules.json.`,
      })
    }
  }

  // ── D. Every rule has rule_id, priority, conditions, output_code, explanation ──
  for (const rule of rulesFile.rules) {
    const missing: string[] = []
    if (!rule.rule_id) missing.push("rule_id")
    if (rule.priority === undefined || rule.priority === null) missing.push("priority")
    if (!rule.conditions) missing.push("conditions")
    if (!rule.output_code) missing.push("output_code")
    if (!rule.explanation) missing.push("explanation")
    if (missing.length > 0) {
      issues.push({
        code: "INCOMPLETE_RULE",
        ruleId: rule.rule_id ?? "(unknown)",
        message: `Rule ${rule.rule_id ?? "(unknown)"} is missing required field(s): ${missing.join(", ")}.`,
      })
    }
  }

  // ── E. Every output code has a description ──
  for (const entry of hsCodesFile.codes) {
    if (!entry.description || entry.description.trim() === "") {
      issues.push({
        code: "MISSING_DESCRIPTION",
        hsCode: entry.hs_code,
        message: `HS code "${entry.hs_code}" has no description.`,
      })
    }
  }

  // ── F. Every fallback rule is explicitly identifiable ──
  // A rule is a true catch-all "Other" line only if it carries no
  // weight bounds and no form condition — those are the only
  // conditions a genuinely unconstrained fallback can have (beyond
  // tea_type and, in some lines, presentation). A rule can mention
  // "Other" in its description while still being a specific,
  // weight-bounded tariff line (e.g. TEA-005 / TEA-014, which are
  // "Other ... packets exceeding 3 kg but not exceeding 20 kg" —
  // genuinely specific, not a catch-all), so text alone is not a
  // reliable signal.
  for (const rule of rulesFile.rules) {
    const c = rule.conditions
    const hasWeightBounds =
      c.max_weight_g !== undefined || c.min_weight_exclusive_g !== undefined
    const hasForm = c.form !== undefined
    const looksLikeFallback =
      !hasWeightBounds && !hasForm && /\bother\b/i.test(rule.explanation ?? "")
    if (looksLikeFallback && !isFallbackRule(rule)) {
      issues.push({
        code: "UNMARKED_FALLBACK",
        ruleId: rule.rule_id,
        message: `Rule ${rule.rule_id} looks like a fallback ("Other") rule but has no fallback_within_* flag set, so it cannot be reliably identified as a fallback rule.`,
      })
    }
  }

  // ── G. No malformed conditions ──
  for (const rule of rulesFile.rules) {
    const c = rule.conditions
    if (!c) continue

    const teaTypes = Array.isArray(c.tea_type) ? c.tea_type : [c.tea_type]
    if (teaTypes.length === 0 || teaTypes.some((t) => !t)) {
      issues.push({
        code: "MALFORMED_CONDITIONS",
        ruleId: rule.rule_id,
        message: `Rule ${rule.rule_id} has an empty or invalid tea_type condition.`,
      })
    }

    if (
      c.max_weight_g !== undefined &&
      c.min_weight_exclusive_g !== undefined &&
      c.min_weight_exclusive_g >= c.max_weight_g
    ) {
      issues.push({
        code: "MALFORMED_CONDITIONS",
        ruleId: rule.rule_id,
        message: `Rule ${rule.rule_id} has min_weight_exclusive_g (${c.min_weight_exclusive_g}) >= max_weight_g (${c.max_weight_g}).`,
      })
    }

    if (c.max_weight_g !== undefined && c.max_weight_g <= 0) {
      issues.push({
        code: "MALFORMED_CONDITIONS",
        ruleId: rule.rule_id,
        message: `Rule ${rule.rule_id} has a non-positive max_weight_g (${c.max_weight_g}).`,
      })
    }

    if (c.min_weight_exclusive_g !== undefined && c.min_weight_exclusive_g < 0) {
      issues.push({
        code: "MALFORMED_CONDITIONS",
        ruleId: rule.rule_id,
        message: `Rule ${rule.rule_id} has a negative min_weight_exclusive_g (${c.min_weight_exclusive_g}).`,
      })
    }
  }

  return issues
}

// ── Fallback derivation (no hardcoded codes) ────────────────

/**
 * Derive the rule_ids of every fallback rule directly from
 * tea_rules.json — never hardcoded.
 */
export function deriveFallbackRuleIds(rulesFile: TeaRulesFile): string[] {
  return rulesFile.rules.filter(isFallbackRule).map((r) => r.rule_id)
}

/**
 * Derive the output_codes of every fallback rule directly from
 * tea_rules.json — never hardcoded.
 */
export function deriveFallbackOutputCodes(rulesFile: TeaRulesFile): string[] {
  return rulesFile.rules.filter(isFallbackRule).map((r) => r.output_code)
}

// ── Rule overlap analysis (developer diagnostic) ────────────

export interface RuleOverlap {
  ruleA: string
  ruleB: string
  teaType: string
  /** Human-readable summary of each rule's relevant conditions */
  conditions: string
  /** True when the two rules have different priorities (so the
   *  engine's priority-first matching order picks one deterministically) */
  resolvedByPriority: boolean
}

function conditionsSummary(rule: TeaRule): string {
  const c = rule.conditions
  const parts: string[] = []
  if (c.presentation) parts.push(`presentation=${c.presentation}`)
  if (c.form) parts.push(`form=${c.form}`)
  if (c.max_weight_g !== undefined) parts.push(`max_weight_g=${c.max_weight_g}`)
  if (c.min_weight_exclusive_g !== undefined)
    parts.push(`min_weight_exclusive_g=${c.min_weight_exclusive_g}`)
  return parts.length > 0 ? parts.join(", ") : "(no additional conditions)"
}

function teaTypesOf(rule: TeaRule): string[] {
  return Array.isArray(rule.conditions.tea_type)
    ? rule.conditions.tea_type
    : [rule.conditions.tea_type]
}

function weightRangesOverlap(a: TeaRule, b: TeaRule): boolean {
  const aMin = a.conditions.min_weight_exclusive_g ?? -Infinity
  const aMax = a.conditions.max_weight_g ?? Infinity
  const bMin = b.conditions.min_weight_exclusive_g ?? -Infinity
  const bMax = b.conditions.max_weight_g ?? Infinity
  return aMin < bMax && bMin < aMax
}

/**
 * Detect pairs of non-fallback rules whose conditions could both
 * match the same input (same tea type, and no explicit
 * presentation/form/weight distinction ruling one of them out).
 *
 * This is a developer diagnostic only. It does NOT mean the rules
 * are wrong — the rules engine has its own, separately-documented
 * precedence logic (dedicated form rules taking priority over
 * generic presentation/weight rules) that resolves these cases at
 * runtime. This function exists so that relationship is visible
 * and reviewable rather than implicit.
 */
export function findRuleOverlaps(rulesFile: TeaRulesFile): RuleOverlap[] {
  const overlaps: RuleOverlap[] = []
  const rules = rulesFile.rules.filter((r) => !isFallbackRule(r))

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i]
      const b = rules[j]

      const sharedTypes = teaTypesOf(a).filter((t) => teaTypesOf(b).includes(t))
      if (sharedTypes.length === 0) continue

      if (
        a.conditions.presentation &&
        b.conditions.presentation &&
        a.conditions.presentation !== b.conditions.presentation
      ) {
        continue
      }

      if (
        a.conditions.form &&
        b.conditions.form &&
        a.conditions.form !== b.conditions.form
      ) {
        continue
      }

      const aHasWeight =
        a.conditions.max_weight_g !== undefined ||
        a.conditions.min_weight_exclusive_g !== undefined
      const bHasWeight =
        b.conditions.max_weight_g !== undefined ||
        b.conditions.min_weight_exclusive_g !== undefined
      if (aHasWeight && bHasWeight && !weightRangesOverlap(a, b)) continue

      for (const teaType of sharedTypes) {
        overlaps.push({
          ruleA: a.rule_id,
          ruleB: b.rule_id,
          teaType,
          conditions: `${a.rule_id}: ${conditionsSummary(a)} | ${b.rule_id}: ${conditionsSummary(b)}`,
          resolvedByPriority: a.priority !== b.priority,
        })
      }
    }
  }

  return overlaps
}
