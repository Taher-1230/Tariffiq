// ============================================================
// Product Registry — Phase 5C-A
//
// In-process singleton that maps ProductCategory values to their
// concrete ProductRegistration implementations.
//
// Design:
//   - No dynamic loading, no network, no microservices.
//   - Registered at module initialization time.
//   - Immutable after initialization — products cannot be
//     added or removed at runtime.
//
// Security Invariant:
//   The client submits a productCategory string. The server
//   resolves it through this registry. The client NEVER selects
//   a classifier implementation, tariff rule source, or HS code
//   authority directly.
// ============================================================

import type {
  ProductCategory,
  ProductDefinition,
  ProductRegistration,
} from "@/products/types"

class ProductRegistryImpl {
  private readonly products = new Map<ProductCategory, ProductRegistration>()

  /**
   * Register a product category. Called once per product at module init.
   * Throws if the product is already registered (prevents double-registration bugs).
   */
  register(registration: ProductRegistration): void {
    const { id } = registration.definition
    if (this.products.has(id)) {
      throw new Error(
        `Product "${id}" is already registered. Each product may only be registered once.`
      )
    }
    this.products.set(id, registration)
  }

  /**
   * Look up a product registration by category.
   * Returns undefined if the product is not supported.
   */
  get(productCategory: string): ProductRegistration | undefined {
    return this.products.get(productCategory as ProductCategory)
  }

  /**
   * Look up a product registration, throwing if not found.
   */
  getOrThrow(productCategory: string): ProductRegistration {
    const registration = this.get(productCategory)
    if (!registration) {
      throw new Error(
        `Unsupported product category: "${productCategory}". ` +
        `Supported categories: ${this.getSupportedCategories().join(", ") || "(none)"}.`
      )
    }
    return registration
  }

  /**
   * Check whether a product category is supported.
   */
  isSupported(productCategory: string): boolean {
    return this.products.has(productCategory as ProductCategory)
  }

  /**
   * Get all supported product definitions (ordered by registration).
   */
  getSupportedProducts(): ProductDefinition[] {
    return Array.from(this.products.values()).map((r) => r.definition)
  }

  /**
   * Get all supported product category IDs.
   */
  getSupportedCategories(): ProductCategory[] {
    return Array.from(this.products.keys())
  }
}

/**
 * Global product registry singleton.
 *
 * Products are registered via side-effect imports. At Phase 5C-A,
 * only the Tea registration module exists.
 */
export const productRegistry = new ProductRegistryImpl()
