// ============================================================
// Tea Product Definition — Phase 5C-A
//
// Static metadata for the Tea product category.
// ============================================================

import type { ProductDefinition } from "@/products/types"

export const teaProductDefinition: ProductDefinition = {
  id: "tea",
  name: "tea",
  displayName: "Tea",
  description: "Tea products classified under HS heading 0902.",
  hsChapter: "09",
  supportsAI: true,
  supportsManualClassification: true,
}
