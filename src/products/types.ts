// ============================================================
// Product Abstraction Types — Phase 5C-A
//
// Core type definitions that enable TariffIQ to support multiple
// product categories through a shared platform architecture.
//
// Design Principles:
//   1. The platform generalizes the PROCESS, not the data shape.
//   2. Product-specific schemas remain concrete within each product module.
//   3. The registry boundary uses opaque types (unknown) — callers
//      within a product module still use their concrete types.
//   4. No inheritance, no plugin systems, no dynamic module loading.
// ============================================================

// ── Product Category ──────────────────────────────────────────
//
// Extensible discriminated union.
// Supported products: "tea" | "coffee" | "spices".

export type ProductCategory = "tea" | "coffee" | "spices"

// ── Product Definition ────────────────────────────────────────
//
// Static metadata describing a supported product category.

export interface ProductDefinition {
  /** Unique product identifier — must match a ProductCategory value */
  id: ProductCategory
  /** Internal name (lowercase, for logging/storage) */
  name: string
  /** Human-readable display name */
  displayName: string
  /** Short description for UI display */
  description: string
  /** HS chapter(s) covered by this product */
  hsChapter: string
  /** Whether AI extraction is available for this product */
  supportsAI: boolean
  /** Whether manual step-by-step classification is available */
  supportsManualClassification: boolean
}

// ── Classification Engine Interface ───────────────────────────
//
// Generic contract for a product's deterministic classification engine.
// Each method accepts/returns `unknown` at the registry level; the
// concrete product adapter ensures type safety internally.

export interface ProductClassificationEngine {
  /**
   * Run deterministic classification on validated product input.
   * Returns a product-specific classification result.
   */
  classify(input: unknown): unknown

  /**
   * Validate product input before classification.
   * Returns null if valid, or a structured error result.
   */
  validate(input: unknown): unknown | null

  /**
   * Analyze which information fields are required/optional/satisfied
   * for the given (possibly partial) input.
   */
  getRequiredInformation(input: unknown): unknown
}

// ── AI Extraction Adapter Interface ───────────────────────────
//
// Generic contract for a product's AI extraction boundary.

export interface ProductExtractionAdapter {
  /**
   * Extract structured product attributes from natural language text.
   */
  extract(text: string, options?: unknown): Promise<unknown>

  /**
   * Validate an extraction payload against the product's contract.
   */
  validate(payload: unknown): { valid: boolean; errors: string[]; forbiddenFieldsFound: string[] }

  /**
   * Convert a validated extraction into the product's classification input.
   */
  toClassificationInput(extraction: unknown): unknown
}

// ── Product Registration ──────────────────────────────────────
//
// A complete registration bundle for a supported product category.

export interface ProductRegistration {
  definition: ProductDefinition
  engine: ProductClassificationEngine
  extractor: ProductExtractionAdapter
}
