// ============================================================
// AI Extraction Module Barrel Export — Phase 5A
//
// Phase 5A changes:
//   - Removed GeminiTeaExtractionProvider (now server-only)
//   - Removed getGeminiConfig (no client-side key access)
//   - Removed GeminiProviderError (server-only)
//   - Removed GeminiProviderConfig (server-only)
// ============================================================

export {
  extractTeaDescription,
  MAX_INPUT_LENGTH,
} from "@/ai/extractor"

export {
  DEFAULT_GEMINI_MODEL,
} from "@/ai/config"

export {
  MockTeaExtractionProvider,
} from "@/ai/providers/mock"

export {
  validateTeaExtraction,
} from "@/ai/validateTeaExtraction"

export {
  toTeaClassificationInput,
} from "@/ai/toTeaClassificationInput"

export {
  EXTRACTION_EXAMPLES,
} from "@/ai/examples"

export {
  TEA_EXTRACTION_SYSTEM_PROMPT,
  TEA_EXTRACTION_JSON_SCHEMA,
  GEMINI_TEA_EXTRACTION_SCHEMA,
  buildTeaExtractionPrompt,
} from "@/ai/prompts/teaExtractionPrompt"

export type {
  AIExtractionErrorCode,
  ConfirmationFieldState,
  ConversionFailure,
  ConversionResult,
  ConversionSuccess,
  ExtractedForm,
  ExtractedPresentation,
  ExtractedProductCategory,
  ExtractedTeaType,
  ExtractedWeightUnit,
  ExtractionAmbiguity,
  ExtractionEvidence,
  ExtractionStatus,
  ExtractionValidationResult,
  ExtractionConfirmationState,
  TeaExtraction,
  TeaExtractionResult,
  WeightPrecision,
} from "@/ai/types"

export type {
  ExtractionExample,
} from "@/ai/examples"

export type {
  ProviderExtractionPayload,
  ProviderOptions,
  TeaExtractionProvider,
} from "@/ai/providers/types"
