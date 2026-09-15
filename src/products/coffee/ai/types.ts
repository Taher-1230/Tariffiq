// ============================================================
// Coffee AI Extraction Contract Types — Phase 5C-B.2
//
// Frontend re-exports and adapter conversion types.
// ============================================================

export type {
  ExtractedCoffeeProductCategory,
  ExtractedCoffeeProductType,
  ExtractedRoasted,
  ExtractedDecaffeinated,
  ExtractedCoffeePresentation,
  ExtractedCoffeeForm,
  ExtractedCoffeeGrade,
  CoffeeExtraction,
  CoffeeExtractionEvidence,
  CoffeeExtractionAmbiguity,
  CoffeeExtractionResult,
  ExtractionStatus,
  AIExtractionErrorCode,
  ExtractionValidationResult,
} from "../../../../shared/coffee-ai-contract.js"

import type { CoffeeExtraction } from "../../../../shared/coffee-ai-contract.js"
import type { CoffeeClassificationInput } from "../types"

// ── Adapter Result Types ───────────────────────────────────

export interface CoffeeConversionSuccess {
  success: true
  input: CoffeeClassificationInput
}

export interface CoffeeConversionFailure {
  success: false
  reason: string
  missingRequiredFields: (keyof CoffeeExtraction)[]
  unmappedFields: (keyof CoffeeExtraction)[]
}

export type CoffeeConversionResult =
  | CoffeeConversionSuccess
  | CoffeeConversionFailure
