// ============================================================
// Spices AI Extraction Contract Types — Phase 6.3A
//
// Frontend re-exports and adapter conversion types.
// ============================================================

export type {
  ExtractedSpicesProductCategory,
  ExtractedSpiceType,
  ExtractedBotanicalType,
  ExtractedCrushedOrGround,
  ExtractedSpiceSubType,
  ExtractedSpiceForm,
  ExtractedSpiceProcessingState,
  ExtractedSpiceQuality,
  ExtractedSpiceSizeCategory,
  ExtractedIsCubeb,
  ExtractedEssentialCharacter,
  SpicesExtraction,
  SpicesExtractionEvidence,
  SpicesExtractionAmbiguity,
  SpicesExtractionResult,
  ExtractionStatus,
  AIExtractionErrorCode,
  ExtractionValidationResult,
} from "../../../../shared/spices-ai-contract.js"

import type { SpicesExtraction } from "../../../../shared/spices-ai-contract.js"
import type { SpicesClassificationInput } from "../types"

// ── Adapter Result Types ───────────────────────────────────

export interface SpicesConversionSuccess {
  success: true
  input: SpicesClassificationInput
}

export interface SpicesConversionFailure {
  success: false
  reason: string
  missingRequiredFields: (keyof SpicesExtraction)[]
  unmappedFields: (keyof SpicesExtraction)[]
}

export type SpicesConversionResult =
  | SpicesConversionSuccess
  | SpicesConversionFailure
