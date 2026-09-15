// ============================================================
// Coffee AI Extraction Module Exports — Phase 5C-B.2
// ============================================================

export * from "./types"
export { validateCoffeeExtraction } from "./validateCoffeeExtraction"
export { toCoffeeClassificationInput } from "./toCoffeeClassificationInput"
export {
  COFFEE_EXTRACTION_SYSTEM_PROMPT,
  COFFEE_EXTRACTION_JSON_SCHEMA,
  GEMINI_COFFEE_EXTRACTION_SCHEMA,
} from "./coffeeExtractionPrompt"
export { COFFEE_EXTRACTION_EXAMPLES } from "./examples"
export {
  extractCoffeeDescription,
  type CoffeeExtractorOptions,
  type CoffeeExtractionProvider,
  type CoffeeProviderExtractionPayload,
} from "./extractor"
