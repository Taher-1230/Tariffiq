// ============================================================
// Products Module Barrel Export — Phase 5C-A
//
// Central entry point for the product abstraction layer.
// ============================================================

// ── Product Registration (side-effects: registers Tea, Coffee & Spices) ─
import "@/products/tea/index"
import "@/products/coffee/index"
import "@/products/spices/index"

// ── Registry ─────────────────────────────────────────────────
export { productRegistry } from "@/products/registry"

// ── Generic Entry Points ─────────────────────────────────────
export { classifyProduct } from "@/products/classify"
export { extractProductDescription } from "@/products/extract"
export { getRequiredInformation } from "@/products/requirements"

// ── Tea-Specific Exports ─────────────────────────────────────
export { teaRegistration } from "@/products/tea/index"
export { teaProductDefinition } from "@/products/tea/definition"

// ── Coffee-Specific Exports ───────────────────────────────────
export { coffeeRegistration, classifyCoffee, validateCoffeeInput, getRequiredCoffeeInformation } from "@/products/coffee/index"
export { coffeeProductDefinition } from "@/products/coffee/definition"

// ── Spices-Specific Exports ───────────────────────────────────
export { spicesRegistration, classifySpices, validateSpicesInput, getRequiredSpicesInformation } from "@/products/spices/index"
export { spicesProductDefinition } from "@/products/spices/definition"

// ── Types ────────────────────────────────────────────────────
export type {
  ProductCategory,
  ProductDefinition,
  ProductClassificationEngine,
  ProductExtractionAdapter,
  ProductRegistration,
} from "@/products/types"
export type * from "@/products/coffee/types"
export type * from "@/products/spices/types"
