// ============================================================
// Shared Spices AI Extraction Validation — Phase 6.3A
//
// Validates raw or AI-generated extraction payloads against the
// strict Spices extraction contract.
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
  "matchedruleid",
  "matched_rule_id",
  "classificationpath",
  "finalcode",
])

const ALLOWED_EXTRACTION_KEYS = new Set([
  "productCategory",
  "spiceType",
  "botanicalType",
  "crushedOrGround",
  "subType",
  "form",
  "processingState",
  "quality",
  "sizeCategory",
  "isCubeb",
  "essentialCharacter",
  "mixtureHeadings",
])

const VALID_PRODUCT_CATEGORIES = new Set(["spices", "unknown"])

const VALID_SPICE_TYPES = new Set([
  "pepper",
  "capsicum_pimenta",
  "vanilla",
  "cinnamon",
  "cloves",
  "nutmeg",
  "mace",
  "cardamom",
  "coriander",
  "cumin",
  "anise",
  "badian",
  "caraway_or_fennel",
  "juniper_berries",
  "ginger",
  "saffron",
  "turmeric",
  "mixture",
  "other_spice",
  "unknown",
])

const VALID_BOTANICAL_TYPES = new Set([
  "piper",
  "capsicum",
  "pimenta",
  "cinnamomum_zeylanicum",
  "cassia",
  "unknown",
])

const VALID_CRUSHED_OR_GROUND = new Set([true, false, "unknown"])

const VALID_SUB_TYPES = new Set([
  "long_pepper",
  "light_black_pepper",
  "black_pepper_garbled",
  "black_pepper_ungarbled",
  "green_pepper_dehydrated",
  "pinheads",
  "green_pepper_frozen_or_dried",
  "non_green_frozen",
  "alleppey_green",
  "coorg_green",
  "bleached_half_bleached_bleachable",
  "mixed",
  "black",
  "other_than_black",
  "unbleached",
  "bleached",
  "cross_heading_mixture",
  "celery",
  "fenugreek",
  "dill",
  "ajwain",
  "cassia_torea",
  "cassia",
  "poppy",
  "mustard",
  "unknown",
])

const VALID_FORMS = new Set([
  "bark",
  "tree_flowers",
  "stem",
  "not_stem",
  "in_shell",
  "shelled",
  "chilly_powder",
  "chilly_seeds",
  "powder",
  "small_cardamom_seeds",
  "husk",
  "stigma",
  "stamen",
  "seed",
  "unknown",
])

const VALID_PROCESSING_STATES = new Set([
  "fresh",
  "dried",
  "extracted",
  "not_extracted",
  "unknown",
])

const VALID_QUALITIES = new Set(["seed_quality", "unknown"])

const VALID_SIZE_CATEGORIES = new Set(["large", "small", "unknown"])

const VALID_IS_CUBEB = new Set([true, false, "unknown"])

const VALID_ESSENTIAL_CHARACTER = new Set([true, false, "unknown"])

/**
 * Validates an extracted spices attributes object against the extraction contract.
 *
 * @param payload - The extraction object to validate.
 * @returns Structured validation result with error details.
 */
export function validateSpicesExtraction(
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
        `Extraction contains forbidden classification field: '${key}'. The AI extractor must never output HS codes or classification fields.`
      )
    } else if (!ALLOWED_EXTRACTION_KEYS.has(key)) {
      errors.push(
        `Extraction contains unsupported attribute: '${key}'. AI extractor must only extract supported spices attributes.`
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
      `Invalid productCategory: '${String(record.productCategory)}'. Must be 'spices' or 'unknown'.`
    )
  }

  // ── 3. Validate Spice Type ────────────────────────────────

  if (!("spiceType" in record)) {
    errors.push("Missing required field 'spiceType'.")
  } else if (
    typeof record.spiceType !== "string" ||
    !VALID_SPICE_TYPES.has(record.spiceType)
  ) {
    errors.push(
      `Invalid spiceType: '${String(record.spiceType)}'. Must be one of the supported Chapter 09 spice types or 'unknown'.`
    )
  }

  // ── 4. Validate Botanical Type ────────────────────────────

  if (!("botanicalType" in record)) {
    errors.push("Missing required field 'botanicalType'.")
  } else if (
    typeof record.botanicalType !== "string" ||
    !VALID_BOTANICAL_TYPES.has(record.botanicalType)
  ) {
    errors.push(
      `Invalid botanicalType: '${String(record.botanicalType)}'.`
    )
  }

  // ── 5. Validate Crushed / Ground ──────────────────────────

  if (!("crushedOrGround" in record)) {
    errors.push("Missing required field 'crushedOrGround'.")
  } else if (!VALID_CRUSHED_OR_GROUND.has(record.crushedOrGround as boolean | "unknown")) {
    errors.push(
      `Invalid crushedOrGround: '${String(record.crushedOrGround)}'. Must be true, false, or 'unknown'.`
    )
  }

  // ── 6. Validate SubType ───────────────────────────────────

  if (!("subType" in record)) {
    errors.push("Missing required field 'subType'.")
  } else if (
    typeof record.subType !== "string" ||
    !VALID_SUB_TYPES.has(record.subType)
  ) {
    errors.push(
      `Invalid subType: '${String(record.subType)}'.`
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
      `Invalid form: '${String(record.form)}'.`
    )
  }

  // ── 8. Validate Processing State ──────────────────────────

  if (!("processingState" in record)) {
    errors.push("Missing required field 'processingState'.")
  } else if (
    typeof record.processingState !== "string" ||
    !VALID_PROCESSING_STATES.has(record.processingState)
  ) {
    errors.push(
      `Invalid processingState: '${String(record.processingState)}'.`
    )
  }

  // ── 9. Validate Quality ───────────────────────────────────

  if (!("quality" in record)) {
    errors.push("Missing required field 'quality'.")
  } else if (
    typeof record.quality !== "string" ||
    !VALID_QUALITIES.has(record.quality)
  ) {
    errors.push(
      `Invalid quality: '${String(record.quality)}'.`
    )
  }

  // ── 10. Validate Size Category ────────────────────────────

  if (!("sizeCategory" in record)) {
    errors.push("Missing required field 'sizeCategory'.")
  } else if (
    typeof record.sizeCategory !== "string" ||
    !VALID_SIZE_CATEGORIES.has(record.sizeCategory)
  ) {
    errors.push(
      `Invalid sizeCategory: '${String(record.sizeCategory)}'.`
    )
  }

  // ── 11. Validate isCubeb ──────────────────────────────────

  if ("isCubeb" in record && !VALID_IS_CUBEB.has(record.isCubeb as boolean | "unknown")) {
    errors.push(
      `Invalid isCubeb: '${String(record.isCubeb)}'. Must be true, false, or 'unknown'.`
    )
  }

  // ── 12. Validate essentialCharacter ───────────────────────

  if (
    "essentialCharacter" in record &&
    !VALID_ESSENTIAL_CHARACTER.has(record.essentialCharacter as boolean | "unknown")
  ) {
    errors.push(
      `Invalid essentialCharacter: '${String(record.essentialCharacter)}'. Must be true, false, or 'unknown'.`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    forbiddenFieldsFound,
  }
}
