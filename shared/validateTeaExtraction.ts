// ============================================================
// Shared AI Extraction Validation — Phase 5A
//
// Validates raw or AI-generated extraction payloads against the
// strict Phase 4A extraction contract.
//
// This module lives in shared/ so both the Express backend and
// the Vite frontend can import it without duplication.
//
// Safety Enforcements:
//   1. Strictly forbids HS code / classification fields.
//   2. Strictly forbids unsupported domain attributes.
//   3. Enforces valid enum values (including "unknown" / "not_sure").
//   4. Validates weight and unit consistency.
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
  "code",
  "heading",
  "subheading",
  "chapter",
])

const ALLOWED_EXTRACTION_KEYS = new Set([
  "productCategory",
  "teaType",
  "presentation",
  "form",
  "netWeight",
  "weightUnit",
  "weightPrecision",
])

const VALID_PRODUCT_CATEGORIES = new Set(["tea", "unknown"])

const VALID_TEA_TYPES = new Set([
  "green",
  "black",
  "partly_fermented",
  "not_sure",
  "unknown",
])

const VALID_PRESENTATIONS = new Set([
  "immediate_packing",
  "packet",
  "bulk",
  "unknown",
])

const VALID_FORMS = new Set([
  "whole_leaf",
  "dust",
  "tea_bags",
  "agglomerated",
  "waste",
  "other",
  "unknown",
])

const VALID_WEIGHT_UNITS = new Set(["g", "kg", null])

const VALID_WEIGHT_PRECISIONS = new Set([
  "exact",
  "approximate",
  "unknown",
  undefined,
])

/**
 * Validates an extracted attributes object against the extraction contract.
 *
 * @param payload - The extraction object to validate.
 * @returns Structured validation result with error details.
 */
export function validateTeaExtraction(
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
        `Extraction contains unsupported attribute: '${key}'. AI extractor must only extract supported tea attributes.`
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
      `Invalid productCategory: '${String(record.productCategory)}'. Must be 'tea' or 'unknown'.`
    )
  }

  // ── 3. Validate Tea Type ──────────────────────────────────

  if (!("teaType" in record)) {
    errors.push("Missing required field 'teaType'.")
  } else if (
    typeof record.teaType !== "string" ||
    !VALID_TEA_TYPES.has(record.teaType)
  ) {
    errors.push(
      `Invalid teaType: '${String(record.teaType)}'. Must be 'green', 'black', 'partly_fermented', 'not_sure', or 'unknown'.`
    )
  }

  // ── 4. Validate Presentation ──────────────────────────────

  if (!("presentation" in record)) {
    errors.push("Missing required field 'presentation'.")
  } else if (
    typeof record.presentation !== "string" ||
    !VALID_PRESENTATIONS.has(record.presentation)
  ) {
    errors.push(
      `Invalid presentation: '${String(record.presentation)}'. Must be 'immediate_packing', 'packet', 'bulk', or 'unknown'.`
    )
  }

  // ── 5. Validate Form ──────────────────────────────────────

  if (!("form" in record)) {
    errors.push("Missing required field 'form'.")
  } else if (
    typeof record.form !== "string" ||
    !VALID_FORMS.has(record.form)
  ) {
    errors.push(
      `Invalid form: '${String(record.form)}'. Must be one of whole_leaf, dust, tea_bags, agglomerated, waste, other, or unknown.`
    )
  }

  // ── 6. Validate Net Weight ────────────────────────────────

  if (!("netWeight" in record)) {
    errors.push("Missing required field 'netWeight'.")
  } else if (record.netWeight !== null) {
    if (
      typeof record.netWeight !== "number" ||
      !Number.isFinite(record.netWeight)
    ) {
      errors.push("netWeight must be null or a valid finite number.")
    } else if (record.netWeight <= 0) {
      errors.push("netWeight must be greater than zero.")
    }
  }

  // ── 7. Validate Weight Unit ───────────────────────────────

  if (!("weightUnit" in record)) {
    errors.push("Missing required field 'weightUnit'.")
  } else if (
    record.weightUnit !== null &&
    (typeof record.weightUnit !== "string" ||
      !VALID_WEIGHT_UNITS.has(record.weightUnit))
  ) {
    errors.push(
      `Invalid weightUnit: '${String(record.weightUnit)}'. Must be 'g', 'kg', or null.`
    )
  }

  // ── 8. Validate Weight / Unit Consistency ─────────────────

  if (record.netWeight !== null && record.weightUnit === null) {
    errors.push("weightUnit cannot be null when netWeight is provided.")
  } else if (record.netWeight === null && record.weightUnit !== null) {
    errors.push("weightUnit must be null when netWeight is null.")
  }

  // ── 9. Validate Weight Precision ──────────────────────────

  if ("weightPrecision" in record) {
    const wp = record.weightPrecision
    if (
      wp !== undefined &&
      (typeof wp !== "string" || !VALID_WEIGHT_PRECISIONS.has(wp))
    ) {
      errors.push(
        `Invalid weightPrecision: '${String(wp)}'. Must be 'exact', 'approximate', or 'unknown'.`
      )
    }
  }

  return {
    valid: errors.length === 0 && forbiddenFieldsFound.length === 0,
    errors,
    forbiddenFieldsFound,
  }
}
