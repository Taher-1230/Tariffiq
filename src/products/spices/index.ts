// ============================================================
// Spices Product Registration — Phase 6.2
//
// Wires Spices engine into the ProductRegistration shape
// and registers Spices in the global ProductRegistry.
// ============================================================

import type {
  ProductClassificationEngine,
  ProductExtractionAdapter,
  ProductRegistration,
} from "@/products/types"
import { productRegistry } from "@/products/registry"
import { spicesProductDefinition } from "./definition"
import { classifySpices } from "./classifier"
import { validateSpicesInput } from "./validateSpicesInput"
import { getRequiredSpicesInformation } from "./requirements"
import type { SpicesClassificationInput } from "./types"

import { extractSpicesDescription, type SpicesExtractorOptions } from "./ai/extractor"
import { validateSpicesExtraction } from "./ai/validateSpicesExtraction"
import { toSpicesClassificationInput } from "./ai/toSpicesClassificationInput"
import type { SpicesExtraction } from "./ai/types"

// ── Spices Classification Engine ─────────────────────────────

const spicesEngine: ProductClassificationEngine = {
  classify(input: unknown) {
    return classifySpices(input as SpicesClassificationInput)
  },

  validate(input: unknown) {
    return validateSpicesInput(input as SpicesClassificationInput)
  },

  getRequiredInformation(input: unknown) {
    return getRequiredSpicesInformation(input as Partial<SpicesClassificationInput>)
  },
}

// ── Spices Extraction Adapter ────────────────────────────────

const spicesExtractor: ProductExtractionAdapter = {
  async extract(text: string, options?: unknown) {
    return extractSpicesDescription(text, options as SpicesExtractorOptions)
  },

  validate(payload: unknown) {
    return validateSpicesExtraction(payload)
  },

  toClassificationInput(extraction: unknown) {
    return toSpicesClassificationInput(extraction as SpicesExtraction)
  },
}

// ── Spices Registration Bundle ───────────────────────────────

export const spicesRegistration: ProductRegistration = {
  definition: spicesProductDefinition,
  engine: spicesEngine,
  extractor: spicesExtractor,
}

// Auto-register in global ProductRegistry
productRegistry.register(spicesRegistration)

// Re-exports
export { classifySpices, formatSpicesHsCode } from "./classifier"
export { validateSpicesInput } from "./validateSpicesInput"
export { getRequiredSpicesInformation } from "./requirements"
export { spicesProductDefinition } from "./definition"
export type * from "./types"
