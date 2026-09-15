// ============================================================
// Coffee Product Definition — Phase 5C-B.1
//
// Static metadata for the Coffee product category.
// Note: supportsAI is false in Phase 5C-B.1 (AI extraction implemented in later phase).
// ============================================================

import type { ProductDefinition } from "@/products/types"

export const coffeeProductDefinition: ProductDefinition = {
  id: "coffee",
  name: "coffee",
  displayName: "Coffee",
  description: "Coffee products classified under HS heading 0901.",
  hsChapter: "09",
  supportsAI: true,
  supportsManualClassification: true,
}
