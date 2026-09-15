// ============================================================
// Shared Coffee AI Extraction Validation — Phase 5C-B.2
//
// Validates raw or AI-generated extraction payloads against the
// strict Phase 5C-B.2 Coffee extraction contract.
//
// Safety Enforcements:
//   1. Strictly forbids HS code / classification fields.
//   2. Strictly forbids unsupported domain attributes.
//   3. Enforces valid enum values (including "unknown").
//   4. Fails closed on malformed or malicious payloads.
// ============================================================

import type { ExtractionValidationResult } from "./ai-contract.js"

const FORBIDDEN_CLASSIFICATION_FIELDS = new Set([
  "hscode",
  "hs_code",
  "suggestedhscode",
  "suggested_hs_code",
  "tariffcode",
  "tariff_code",
  "tariffline",
  "tariff_line",
  "classification",
  "classificationcode",
  "classification_code",
  "code",
  "heading",
  "subheading",
  "chapter",
  "ruleid",
  "rule_id",
  "matchedrule",
  "matched_rule",
])

const ALLOWED_EXTRACTION_KEYS = new Set([
  "productCategory",
  "productType",
  "roasted",
  "decaffeinated",
  "presentation",
  "form",
  "grade",
])

const VALID_PRODUCT_CATEGORIES = new Set(["coffee", "unknown"])

const VALID_PRODUCT_TYPES = new Set([
  "coffee",
  "husks_and_skins",
  "substitutes_containing_coffee",
  "unknown",
])

const VALID_ROASTED = new Set([true, false, "unknown"])

const VALID_DECAFFEINATED = new Set([true, false, "unknown"])

const VALID_PRESENTATIONS = new Set(["bulk", "other", "unknown"])

const VALID_FORMS = new Set([
  "arabica_plantation",
  "arabica_cherry",
  "rob_cherry",
  "other",
  "unknown",
])

const VALID_GRADES = new Set([
  "A",
  "B",
  "C",
  "AB",
  "PB",
  "BBB",
  "B/B/B",
  "other",
  "unknown",
])

/**
 * Validates an extracted coffee attributes object against the extraction contract.
 *
 * @param payload - The extraction object to validate.
 * @returns Structured validation result with error details.
 */
export function validateCoffeeExtraction(
  payload: unknown
): ExtractionValidationResult {
  const errors: string[] = []
  const forbiddenFieldsFound: string[] = []

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      valid: false,
      errors: ["Extraction payload must be a non-null object."],
      forbiddenFieldsFound: [],
    }
  }

  const record = payload as Record<string, unknown>
  const keys = Object.keys(record)

  // ── 1. Check for Forbidden & Unsupported Fields ───────────

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (FORBIDDEN_CLASSIFICATION_FIELDS.has(normalizedKey)) {
      forbiddenFieldsFound.push(key)
      errors.push(
        `Extraction contains forbidden classification field: '${key}'. The AI extractor must never output HS codes.`
      )
    } else if (!ALLOWED_EXTRACTION_KEYS.has(key)) {
      errors.push(
        `Extraction contains unsupported attribute: '${key}'. AI extractor must only extract supported coffee attributes.`
      )
    }
  }

  // ── 2. Validate Product Category ──────────────────────────

  if (!("productCategory" in record)) {
    errors.push("Missing required field 'productCategory'.")
  } else if (
    typeof record.productCategory !== "string" ||
    !VALID_PRODUCT_CATEGORIES.has(record.productCategory)
  ) {
    errors.push(
      `Invalid productCategory: '${String(record.productCategory)}'. Must be 'coffee' or 'unknown'.`
    )
  }

  // ── 3. Validate Product Type ──────────────────────────────

  if (!("productType" in record)) {
    errors.push("Missing required field 'productType'.")
  } else if (
    typeof record.productType !== "string" ||
    !VALID_PRODUCT_TYPES.has(record.productType)
  ) {
    errors.push(
      `Invalid productType: '${String(record.productType)}'. Must be 'coffee', 'husks_and_skins', 'substitutes_containing_coffee', or 'unknown'.`
    )
  }

  // ── 4. Validate Roasted ───────────────────────────────────

  if (!("roasted" in record)) {
    errors.push("Missing required field 'roasted'.")
  } else if (!VALID_ROASTED.has(record.roasted as boolean | "unknown")) {
    errors.push(
      `Invalid roasted: '${String(record.roasted)}'. Must be true, false, or 'unknown'.`
    )
  }

  // ── 5. Validate Decaffeinated ─────────────────────────────

  if (!("decaffeinated" in record)) {
    errors.push("Missing required field 'decaffeinated'.")
  } else if (!VALID_DECAFFEINATED.has(record.decaffeinated as boolean | "unknown")) {
    errors.push(
      `Invalid decaffeinated: '${String(record.decaffeinated)}'. Must be true, false, or 'unknown'.`
    )
  }

  // ── 6. Validate Presentation ──────────────────────────────

  if (!("presentation" in record)) {
    errors.push("Missing required field 'presentation'.")
  } else if (
    typeof record.presentation !== "string" ||
    !VALID_PRESENTATIONS.has(record.presentation)
  ) {
    errors.push(
      `Invalid presentation: '${String(record.presentation)}'. Must be 'bulk', 'other', or 'unknown'.`
    )
  }

  // ── 7. Validate Form ──────────────────────────────────────

  if (!("form" in record)) {
    errors.push("Missing required field 'form'.")
  } else if (
    typeof record.form !== "string" ||
    !VALID_FORMS.has(record.form)
  ) {
    errors.push(
      `Invalid form: '${String(record.form)}'. Must be 'arabica_plantation', 'arabica_cherry', 'rob_cherry', 'other', or 'unknown'.`
    )
  }

  // ── 8. Validate Grade ─────────────────────────────────────

  if (!("grade" in record)) {
    errors.push("Missing required field 'grade'.")
  } else if (
    typeof record.grade !== "string" ||
    !VALID_GRADES.has(record.grade)
  ) {
    errors.push(
      `Invalid grade: '${String(record.grade)}'. Must be one of A, B, C, AB, PB, BBB, B/B/B, other, or unknown.`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    forbiddenFieldsFound,
  }
}
