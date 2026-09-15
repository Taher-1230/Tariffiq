// ============================================================
// Spices Input Validation — Phase 6.2
//
// Validates raw or confirmed input against the Spices schema before
// classification. Rejects malformed types, impossible combinations,
// and enforces client-boundary security.
// ============================================================

import type {
  BotanicalType,
  SpiceForm,
  SpiceProcessingState,
  SpiceQuality,
  SpiceSizeCategory,
  SpiceSubType,
  SpiceType,
  SpicesClassificationInput,
  SpicesInsufficientInformationResult,
  SpicesNoMatchResult,
} from "./types"

const VALID_SPICE_TYPES: Set<SpiceType> = new Set([
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
])

const VALID_BOTANICAL_TYPES: Set<BotanicalType> = new Set([
  "piper",
  "capsicum",
  "pimenta",
  "cinnamomum_zeylanicum",
  "cassia",
])

const VALID_SUB_TYPES: Set<SpiceSubType> = new Set([
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
])

const VALID_FORMS: Set<SpiceForm> = new Set([
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
])

const VALID_PROCESSING_STATES: Set<SpiceProcessingState> = new Set([
  "fresh",
  "dried",
  "extracted",
  "not_extracted",
])

const VALID_QUALITIES: Set<SpiceQuality> = new Set(["seed_quality"])

const VALID_SIZE_CATEGORIES: Set<SpiceSizeCategory> = new Set(["large", "small"])

/**
 * Validates a SpicesClassificationInput object.
 * Returns null if valid, or a SpicesInsufficientInformationResult / SpicesNoMatchResult error.
 */
export function validateSpicesInput(
  input: SpicesClassificationInput
): SpicesInsufficientInformationResult | SpicesNoMatchResult | null {
  // 1. Structure Check
  if (!input || typeof input !== "object") {
    return {
      status: "no_match",
      message: "Spices classification input must be a non-null object.",
    }
  }

  // 2. Category Check
  if (input.productCategory !== "spices") {
    return {
      status: "no_match",
      message: `Invalid product category: "${(input as { productCategory?: string }).productCategory}". Expected "spices".`,
    }
  }

  // 3. Statutory Exclusion: Cubeb Pepper (Piper cubeba) is excluded from Chapter 09 (falls under heading 1211)
  if (input.isCubeb === true) {
    return {
      status: "no_match",
      message: "Cubeb pepper (Piper cubeba) is excluded from Chapter 09 per Chapter Note 4 and classified under heading 1211.",
      exclusionReason: "CHAPTER_09_NOTE_4_CUBEB_EXCLUSION",
    }
  }

  // 4. Statutory Exclusion: Loss of essential character (mixed condiments / seasonings go to 2103)
  if (input.essentialCharacter === false) {
    return {
      status: "no_match",
      message: "Goods that have lost the essential character of spices (e.g. mixed condiments or seasonings) are excluded from Chapter 09 per Chapter Note 3 and classified under heading 2103.",
      exclusionReason: "CHAPTER_09_NOTE_3_CONDIMENT_EXCLUSION",
    }
  }

  // 5. Spice Type Presence
  if (!input.spiceType) {
    return {
      status: "insufficient_information",
      missingFields: ["spiceType"],
      message: "Spice commodity type is required for classification (e.g. pepper, vanilla, cinnamon, cloves, nutmeg, cardamom, ginger, etc.).",
    }
  }

  // 6. Spice Type Value Validation
  if (!VALID_SPICE_TYPES.has(input.spiceType)) {
    return {
      status: "no_match",
      message: `Unsupported spice type: "${input.spiceType}". Must be one of the supported Chapter 09 spice types.`,
    }
  }

  // 7. Botanical Type Validation
  if (
    input.botanicalType !== undefined &&
    input.botanicalType !== null &&
    !VALID_BOTANICAL_TYPES.has(input.botanicalType)
  ) {
    return {
      status: "no_match",
      message: `Invalid botanical type: "${input.botanicalType}".`,
    }
  }

  // 8. Crushed / Ground Status Type Check
  if (
    input.crushedOrGround !== undefined &&
    input.crushedOrGround !== null &&
    typeof input.crushedOrGround !== "boolean"
  ) {
    return {
      status: "no_match",
      message: "Field 'crushedOrGround' must be a boolean (true or false).",
    }
  }

  // 9. SubType Validation
  if (
    input.subType !== undefined &&
    input.subType !== null &&
    !VALID_SUB_TYPES.has(input.subType)
  ) {
    return {
      status: "no_match",
      message: `Invalid subType: "${input.subType}".`,
    }
  }

  // 10. Form Validation
  if (
    input.form !== undefined &&
    input.form !== null &&
    !VALID_FORMS.has(input.form)
  ) {
    return {
      status: "no_match",
      message: `Invalid form: "${input.form}".`,
    }
  }

  // 11. Processing State Validation
  if (
    input.processingState !== undefined &&
    input.processingState !== null &&
    !VALID_PROCESSING_STATES.has(input.processingState)
  ) {
    return {
      status: "no_match",
      message: `Invalid processing state: "${input.processingState}".`,
    }
  }

  // 12. Quality Validation
  if (
    input.quality !== undefined &&
    input.quality !== null &&
    !VALID_QUALITIES.has(input.quality)
  ) {
    return {
      status: "no_match",
      message: `Invalid quality: "${input.quality}".`,
    }
  }

  // 13. Size Category Validation
  if (
    input.sizeCategory !== undefined &&
    input.sizeCategory !== null &&
    !VALID_SIZE_CATEGORIES.has(input.sizeCategory)
  ) {
    return {
      status: "no_match",
      message: `Invalid size category: "${input.sizeCategory}".`,
    }
  }

  return null
}
