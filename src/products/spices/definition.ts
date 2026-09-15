// ============================================================
// Spices Product Definition — Phase 6.2
//
// Static metadata for the Spices product category (Headings 0904–0910).
// Note: supportsAI is false in Phase 6.2 (AI extraction in later phase).
// ============================================================

import type { ProductDefinition } from "@/products/types"

export const spicesProductDefinition: ProductDefinition = {
  id: "spices",
  name: "spices",
  displayName: "Spices",
  description: "Spices and related products classified under HS headings 0904–0910.",
  hsChapter: "09",
  supportsAI: true,
  supportsManualClassification: true,
}
