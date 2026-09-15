// ============================================================
// Shared Coffee AI Extraction Contract Types — Phase 5C-B.2
//
// Single source of truth for the Coffee AI extraction API boundary.
// Represents ONLY physical and packaging facts about coffee products.
// Zero HS codes, zero tariff codes, zero classification fields.
// ============================================================

import type {
  ExtractionStatus,
  AIExtractionErrorCode,
  ExtractionValidationResult,
} from "./ai-contract.js"

// Re-export common status & error codes
export type {
  ExtractionStatus,
  AIExtractionErrorCode,
  ExtractionValidationResult,
}

// ── Extracted Attribute Types ──────────────────────────────

export type ExtractedCoffeeProductCategory = "coffee" | "unknown"

export type ExtractedCoffeeProductType =
  | "coffee"
  | "husks_and_skins"
  | "substitutes_containing_coffee"
  | "unknown"

export type ExtractedRoasted = boolean | "unknown"

export type ExtractedDecaffeinated = boolean | "unknown"

export type ExtractedCoffeePresentation = "bulk" | "other" | "unknown"

export type ExtractedCoffeeForm =
  | "arabica_plantation"
  | "arabica_cherry"
  | "rob_cherry"
  | "other"
  | "unknown"

export type ExtractedCoffeeGrade =
  | "A"
  | "B"
  | "C"
  | "AB"
  | "PB"
  | "BBB"
  | "B/B/B"
  | "other"
  | "unknown"

/**
 * Structured Coffee product attributes extracted from natural language text.
 * Contains purely physical and presentation facts.
 */
export interface CoffeeExtraction {
  productCategory: ExtractedCoffeeProductCategory
  productType: ExtractedCoffeeProductType
  roasted: ExtractedRoasted
  decaffeinated: ExtractedDecaffeinated
  presentation: ExtractedCoffeePresentation
  form: ExtractedCoffeeForm
  grade: ExtractedCoffeeGrade
}

// ── Evidence & Ambiguity Tracking ──────────────────────────

export interface CoffeeExtractionEvidence {
  field: keyof CoffeeExtraction
  sourceText: string
  startIndex?: number
  endIndex?: number
}

export interface CoffeeExtractionAmbiguity {
  field: keyof CoffeeExtraction
  candidates: string[]
  reason: string
}

// ── Coffee Extraction Result ───────────────────────────────

export interface CoffeeExtractionResult {
  status: ExtractionStatus
  attributes: CoffeeExtraction
  missingFields: (keyof CoffeeExtraction)[]
  ambiguities: CoffeeExtractionAmbiguity[]
  evidence: CoffeeExtractionEvidence[]
  sourceText: string
  notes?: string
  errorCode?: AIExtractionErrorCode
  errorMessage?: string
}
