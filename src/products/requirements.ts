// ============================================================
// Generic Required Information Entry Point — Phase 5C-A
//
// Product-agnostic required information dispatcher.
//
// Flow:
//   productCategory
//        ↓
//   ProductRegistry
//        ↓
//   Product-specific engine.getRequiredInformation()
//        ↓
//   Product-specific RequiredInformationAnalysis
//
// At Phase 5C-A, only "tea" → getRequiredTeaInformation() is supported.
// ============================================================

import { productRegistry } from "@/products/registry"

// Ensure Tea and Coffee are registered
import "@/products/tea/index"
import "@/products/coffee/index"

/**
 * Determine what information is required for classification
 * using the registered product-specific engine.
 *
 * @param productCategory - The product category identifier.
 * @param input - Partial product-specific classification input.
 * @returns Product-specific required information analysis.
 * @throws Error if the product category is not supported.
 */
export function getRequiredInformation(
  productCategory: string,
  input: unknown
): unknown {
  const registration = productRegistry.getOrThrow(productCategory)
  return registration.engine.getRequiredInformation(input)
}
