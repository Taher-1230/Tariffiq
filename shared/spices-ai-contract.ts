// ============================================================
// Shared Spices AI Extraction Contract Types — Phase 6.3A
//
// Single source of truth for the Spices AI extraction API boundary.
// Represents ONLY physical, botanical, and processing facts about spices.
// Zero HS codes, zero tariff codes, zero classification fields.
// ============================================================

import type {
  ExtractionStatus,
  AIExtractionErrorCode,
  ExtractionValidationResult,
} from "./ai-contract.js"

export type {
  ExtractionStatus,
  AIExtractionErrorCode,
  ExtractionValidationResult,
}

// ── Extracted Attribute Types ──────────────────────────────

export type ExtractedSpicesProductCategory = "spices" | "unknown"

export type ExtractedSpiceType =
  | "pepper"
  | "capsicum_pimenta"
  | "vanilla"
  | "cinnamon"
  | "cloves"
  | "nutmeg"
  | "mace"
  | "cardamom"
  | "coriander"
  | "cumin"
  | "anise"
  | "badian"
  | "caraway_or_fennel"
  | "juniper_berries"
  | "ginger"
  | "saffron"
  | "turmeric"
  | "mixture"
  | "other_spice"
  | "unknown"

export type ExtractedBotanicalType =
  | "piper"
  | "capsicum"
  | "pimenta"
  | "cinnamomum_zeylanicum"
  | "cassia"
  | "unknown"

export type ExtractedCrushedOrGround = boolean | "unknown"

export type ExtractedSpiceSubType =
  | "long_pepper"
  | "light_black_pepper"
  | "black_pepper_garbled"
  | "black_pepper_ungarbled"
  | "green_pepper_dehydrated"
  | "pinheads"
  | "green_pepper_frozen_or_dried"
  | "non_green_frozen"
  | "alleppey_green"
  | "coorg_green"
  | "bleached_half_bleached_bleachable"
  | "mixed"
  | "black"
  | "other_than_black"
  | "unbleached"
  | "bleached"
  | "cross_heading_mixture"
  | "celery"
  | "fenugreek"
  | "dill"
  | "ajwain"
  | "cassia_torea"
  | "cassia"
  | "poppy"
  | "mustard"
  | "unknown"

export type ExtractedSpiceForm =
  | "bark"
  | "tree_flowers"
  | "stem"
  | "not_stem"
  | "in_shell"
  | "shelled"
  | "chilly_powder"
  | "chilly_seeds"
  | "powder"
  | "small_cardamom_seeds"
  | "husk"
  | "stigma"
  | "stamen"
  | "seed"
  | "unknown"

export type ExtractedSpiceProcessingState =
  | "fresh"
  | "dried"
  | "extracted"
  | "not_extracted"
  | "unknown"

export type ExtractedSpiceQuality = "seed_quality" | "unknown"

export type ExtractedSpiceSizeCategory = "large" | "small" | "unknown"

export type ExtractedIsCubeb = boolean | "unknown"

export type ExtractedEssentialCharacter = boolean | "unknown"

/**
 * Structured Spices product attributes extracted from natural language text.
 * Contains purely physical, botanical, and processing facts.
 */
export interface SpicesExtraction {
  productCategory: ExtractedSpicesProductCategory
  spiceType: ExtractedSpiceType
  botanicalType: ExtractedBotanicalType
  crushedOrGround: ExtractedCrushedOrGround
  subType: ExtractedSpiceSubType
  form: ExtractedSpiceForm
  processingState: ExtractedSpiceProcessingState
  quality: ExtractedSpiceQuality
  sizeCategory: ExtractedSpiceSizeCategory
  isCubeb: ExtractedIsCubeb
  essentialCharacter: ExtractedEssentialCharacter
  mixtureHeadings?: string[]
}

// ── Evidence & Ambiguity Tracking ──────────────────────────

export interface SpicesExtractionEvidence {
  field: keyof SpicesExtraction
  sourceText: string
  startIndex?: number
  endIndex?: number
}

export interface SpicesExtractionAmbiguity {
  field: keyof SpicesExtraction
  candidates: string[]
  reason: string
}

// ── Spices Extraction Result Container ─────────────────────

export interface SpicesExtractionResult {
  status: ExtractionStatus
  attributes: SpicesExtraction
  missingFields: (keyof SpicesExtraction)[]
  ambiguities: SpicesExtractionAmbiguity[]
  evidence: SpicesExtractionEvidence[]
  sourceText: string
  notes?: string
  errorCode?: AIExtractionErrorCode
  errorMessage?: string
}
