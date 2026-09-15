// ============================================================
// Spices AI Module Barrel Export — Phase 6.3A
// ============================================================

export { extractSpicesDescription } from "./extractor"
export type { SpicesExtractorOptions, SpicesExtractionProvider } from "./extractor"
export { validateSpicesExtraction } from "./validateSpicesExtraction"
export { toSpicesClassificationInput } from "./toSpicesClassificationInput"
export {
  SPICES_EXTRACTION_SYSTEM_PROMPT,
  SPICES_EXTRACTION_JSON_SCHEMA,
  GEMINI_SPICES_EXTRACTION_SCHEMA,
} from "./spicesExtractionPrompt"
export type * from "./types"
