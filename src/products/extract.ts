// ============================================================
// Generic Extraction Entry Point — Phase 5C-A
//
// Product-agnostic AI extraction dispatcher.
//
// Flow:
//   productCategory
//        ↓
//   ProductRegistry
//        ↓
//   Product-specific extractor.extract()
//        ↓
//   Product-specific extraction result
//
// At Phase 5C-A, only "tea" → extractTeaDescription() is supported.
// ============================================================

import { productRegistry } from "@/products/registry"

// Ensure Tea and Coffee are registered
import "@/products/tea/index"
import "@/products/coffee/index"

/**
 * Extract structured product attributes from natural language text
 * using the registered product-specific AI extraction adapter.
 *
 * @param productCategory - The product category identifier.
 * @param text - Natural language product description.
 * @param options - Product-specific extraction options.
 * @returns Product-specific extraction result.
 * @throws Error if the product category is not supported.
 */
export async function extractProductDescription(
  productCategory: string,
  text: string,
  options?: unknown
): Promise<unknown> {
  const registration = productRegistry.getOrThrow(productCategory)
  return registration.extractor.extract(text, options)
}
