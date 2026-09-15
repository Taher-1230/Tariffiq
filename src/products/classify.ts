// ============================================================
// Generic Classification Entry Point — Phase 5C-A
//
// Product-agnostic classification dispatcher.
//
// Flow:
//   productCategory
//        ↓
//   ProductRegistry
//        ↓
//   Product-specific engine.classify()
//        ↓
//   Deterministic classification result
//
// At Phase 5C-A, only "tea" → classifyTea() is supported.
// ============================================================

import { productRegistry } from "@/products/registry"

// Ensure Tea and Coffee are registered
import "@/products/tea/index"
import "@/products/coffee/index"

/**
 * Classify a product using the registered deterministic engine.
 *
 * @param productCategory - The product category identifier.
 * @param input - Product-specific classification input.
 * @returns Product-specific classification result.
 * @throws Error if the product category is not supported.
 */
export function classifyProduct(
  productCategory: string,
  input: unknown
): unknown {
  const registration = productRegistry.getOrThrow(productCategory)
  return registration.engine.classify(input)
}
