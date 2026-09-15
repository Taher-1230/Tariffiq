// ============================================================
// Coffee Product Registration — Phase 5C-B.1
//
// Wires Coffee engine and adapter into the ProductRegistration shape
// and registers Coffee in the global ProductRegistry.
// ============================================================

import type {
  ProductClassificationEngine,
  ProductExtractionAdapter,
  ProductRegistration,
} from "@/products/types"
import { productRegistry } from "@/products/registry"
import { coffeeProductDefinition } from "./definition"
import { classifyCoffee } from "./classifier"
import { validateCoffeeInput } from "./validateCoffeeInput"
import { getRequiredCoffeeInformation } from "./requirements"
import type { CoffeeClassificationInput } from "./types"

import { extractCoffeeDescription, type CoffeeExtractorOptions } from "./ai/extractor"
import { validateCoffeeExtraction } from "./ai/validateCoffeeExtraction"
import { toCoffeeClassificationInput } from "./ai/toCoffeeClassificationInput"
import type { CoffeeExtraction } from "./ai/types"

// ── Coffee Classification Engine ─────────────────────────────

const coffeeEngine: ProductClassificationEngine = {
  classify(input: unknown) {
    return classifyCoffee(input as CoffeeClassificationInput)
  },

  validate(input: unknown) {
    return validateCoffeeInput(input as CoffeeClassificationInput)
  },

  getRequiredInformation(input: unknown) {
    return getRequiredCoffeeInformation(input as Partial<CoffeeClassificationInput>)
  },
}

// ── Coffee Extraction Adapter ────────────────────────────────

const coffeeExtractor: ProductExtractionAdapter = {
  async extract(text: string, options?: unknown) {
    return extractCoffeeDescription(text, options as CoffeeExtractorOptions)
  },

  validate(payload: unknown) {
    return validateCoffeeExtraction(payload)
  },

  toClassificationInput(extraction: unknown) {
    return toCoffeeClassificationInput(extraction as CoffeeExtraction)
  },
}

// ── Coffee Registration Bundle ───────────────────────────────

export const coffeeRegistration: ProductRegistration = {
  definition: coffeeProductDefinition,
  engine: coffeeEngine,
  extractor: coffeeExtractor,
}

// Auto-register in global ProductRegistry
productRegistry.register(coffeeRegistration)

// Re-exports
export { classifyCoffee } from "./classifier"
export { validateCoffeeInput } from "./validateCoffeeInput"
export { getRequiredCoffeeInformation } from "./requirements"
export { coffeeProductDefinition } from "./definition"
export type * from "./types"
