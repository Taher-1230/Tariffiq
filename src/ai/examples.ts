// ============================================================
// Natural Language Extraction Examples & Fixtures — Phase 4A
//
// Representative benchmark examples showing source text paired
// with expected structured extractions and metadata.
//
// These serve as deterministic test fixtures and reference patterns
// for future LLM prompt validation (Phase 4B).
// ============================================================

import type { TeaExtraction, TeaExtractionResult } from "@/ai/types"

export interface ExtractionExample {
  id: string
  title: string
  sourceText: string
  expectedExtraction: TeaExtraction
  expectedResult: TeaExtractionResult
}

export const EXTRACTION_EXAMPLES: ExtractionExample[] = [
  // ── 1. Fully specified Black Tea ──────────────────────────
  {
    id: "NL-001",
    title: "Fully specified black tea in retail packs",
    sourceText: "Premium black tea, whole leaf, packed in 500 g retail packs.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
      weightPrecision: "exact",
    },
    expectedResult: {
      status: "extracted",
      sourceText: "Premium black tea, whole leaf, packed in 500 g retail packs.",
      attributes: {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
        weightPrecision: "exact",
      },
      missingFields: [],
      ambiguities: [],
      evidence: [
        { field: "productCategory", sourceText: "tea" },
        { field: "teaType", sourceText: "black tea" },
        { field: "presentation", sourceText: "retail packs" },
        { field: "form", sourceText: "whole leaf" },
        { field: "netWeight", sourceText: "500 g" },
        { field: "weightUnit", sourceText: "g" },
      ],
    },
  },

  // ── 2. Fully specified Green Tea in Bulk ───────────────────
  {
    id: "NL-002",
    title: "Green tea bulk leaves in kilograms",
    sourceText: "Green tea leaves, 2 kg bulk bag.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
      netWeight: 2,
      weightUnit: "kg",
      weightPrecision: "exact",
    },
    expectedResult: {
      status: "extracted",
      sourceText: "Green tea leaves, 2 kg bulk bag.",
      attributes: {
        productCategory: "tea",
        teaType: "green",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: 2,
        weightUnit: "kg",
        weightPrecision: "exact",
      },
      missingFields: [],
      ambiguities: [],
      evidence: [
        { field: "productCategory", sourceText: "tea" },
        { field: "teaType", sourceText: "Green tea" },
        { field: "presentation", sourceText: "bulk bag" },
        { field: "form", sourceText: "leaves" },
        { field: "netWeight", sourceText: "2 kg" },
        { field: "weightUnit", sourceText: "kg" },
      ],
    },
  },

  // ── 3. Black Tea Bags (Presentation unstated) ─────────────
  {
    id: "NL-003",
    title: "Black tea bags with weight (presentation unstated)",
    sourceText: "Black tea bags, 100 g.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "black",
      presentation: "unknown",
      form: "tea_bags",
      netWeight: 100,
      weightUnit: "g",
      weightPrecision: "exact",
    },
    expectedResult: {
      status: "extracted",
      sourceText: "Black tea bags, 100 g.",
      attributes: {
        productCategory: "tea",
        teaType: "black",
        presentation: "unknown",
        form: "tea_bags",
        netWeight: 100,
        weightUnit: "g",
        weightPrecision: "exact",
      },
      missingFields: ["presentation"],
      ambiguities: [],
      evidence: [
        { field: "productCategory", sourceText: "tea" },
        { field: "teaType", sourceText: "Black tea" },
        { field: "form", sourceText: "tea bags" },
        { field: "netWeight", sourceText: "100 g" },
        { field: "weightUnit", sourceText: "g" },
      ],
    },
  },

  // ── 4. Missing Tea Type (Unknown) ──────────────────────────
  {
    id: "NL-004",
    title: "Tea leaves with unknown tea type",
    sourceText: "Tea leaves, 500g.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "unknown",
      presentation: "unknown",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
      weightPrecision: "exact",
    },
    expectedResult: {
      status: "needs_clarification",
      sourceText: "Tea leaves, 500g.",
      attributes: {
        productCategory: "tea",
        teaType: "unknown",
        presentation: "unknown",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
        weightPrecision: "exact",
      },
      missingFields: ["teaType", "presentation"],
      ambiguities: [],
      evidence: [
        { field: "productCategory", sourceText: "Tea" },
        { field: "form", sourceText: "leaves" },
        { field: "netWeight", sourceText: "500g" },
        { field: "weightUnit", sourceText: "g" },
      ],
      notes: "Tea type (green vs black vs partly fermented) is not stated.",
    },
  },

  // ── 5. Approximate Weight ──────────────────────────────────
  {
    id: "NL-005",
    title: "Black tea with approximate weight",
    sourceText: "Black tea, approximately 1 kg.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "black",
      presentation: "unknown",
      form: "unknown",
      netWeight: 1,
      weightUnit: "kg",
      weightPrecision: "approximate",
    },
    expectedResult: {
      status: "needs_clarification",
      sourceText: "Black tea, approximately 1 kg.",
      attributes: {
        productCategory: "tea",
        teaType: "black",
        presentation: "unknown",
        form: "unknown",
        netWeight: 1,
        weightUnit: "kg",
        weightPrecision: "approximate",
      },
      missingFields: ["presentation", "form"],
      ambiguities: [],
      evidence: [
        { field: "productCategory", sourceText: "tea" },
        { field: "teaType", sourceText: "Black tea" },
        { field: "netWeight", sourceText: "approximately 1 kg" },
        { field: "weightUnit", sourceText: "kg" },
      ],
      notes: "Weight was described as approximate ('approximately 1 kg').",
    },
  },

  // ── 6. Explicit Uncertainty (Not Sure) ─────────────────────
  {
    id: "NL-006",
    title: "Explicit user uncertainty regarding tea type",
    sourceText: "I think this may be black tea but I'm not sure.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "not_sure",
      presentation: "unknown",
      form: "unknown",
      netWeight: null,
      weightUnit: null,
      weightPrecision: "unknown",
    },
    expectedResult: {
      status: "needs_clarification",
      sourceText: "I think this may be black tea but I'm not sure.",
      attributes: {
        productCategory: "tea",
        teaType: "not_sure",
        presentation: "unknown",
        form: "unknown",
        netWeight: null,
        weightUnit: null,
        weightPrecision: "unknown",
      },
      missingFields: ["presentation", "form", "netWeight"],
      ambiguities: [
        {
          field: "teaType",
          candidates: ["black"],
          reason: "User explicitly stated uncertainty ('may be black tea but I'm not sure').",
        },
      ],
      evidence: [
        { field: "productCategory", sourceText: "tea" },
        { field: "teaType", sourceText: "may be black tea but I'm not sure" },
      ],
    },
  },

  // ── 7. Unsupported Product Category ────────────────────────
  {
    id: "NL-007",
    title: "Non-tea product (Coffee beans)",
    sourceText: "Organic roasted coffee beans, 250 g pouch.",
    expectedExtraction: {
      productCategory: "unknown",
      teaType: "unknown",
      presentation: "unknown",
      form: "unknown",
      netWeight: 250,
      weightUnit: "g",
      weightPrecision: "exact",
    },
    expectedResult: {
      status: "unsupported",
      sourceText: "Organic roasted coffee beans, 250 g pouch.",
      attributes: {
        productCategory: "unknown",
        teaType: "unknown",
        presentation: "unknown",
        form: "unknown",
        netWeight: 250,
        weightUnit: "g",
        weightPrecision: "exact",
      },
      missingFields: ["productCategory", "teaType", "presentation", "form"],
      ambiguities: [],
      evidence: [
        { field: "netWeight", sourceText: "250 g" },
        { field: "weightUnit", sourceText: "g" },
      ],
      notes: "Product is coffee beans, which is outside the Chapter 0902 tea scope.",
    },
  },

  // ── 8. Agglomerated Black Tea ──────────────────────────────
  {
    id: "NL-008",
    title: "Agglomerated tea in brick/ball form",
    sourceText: "Fermented black tea agglomerated in brick form.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "black",
      presentation: "unknown",
      form: "agglomerated",
      netWeight: null,
      weightUnit: null,
      weightPrecision: "unknown",
    },
    expectedResult: {
      status: "extracted",
      sourceText: "Fermented black tea agglomerated in brick form.",
      attributes: {
        productCategory: "tea",
        teaType: "black",
        presentation: "unknown",
        form: "agglomerated",
        netWeight: null,
        weightUnit: null,
        weightPrecision: "unknown",
      },
      missingFields: ["presentation", "netWeight"],
      ambiguities: [],
      evidence: [
        { field: "productCategory", sourceText: "tea" },
        { field: "teaType", sourceText: "Fermented black tea" },
        { field: "form", sourceText: "agglomerated in brick form" },
      ],
    },
  },

  // ── 9. Tea Waste / Sweepings ───────────────────────────────
  {
    id: "NL-009",
    title: "Green tea waste from factory",
    sourceText: "Green tea waste and sweepings from processing plant.",
    expectedExtraction: {
      productCategory: "tea",
      teaType: "green",
      presentation: "unknown",
      form: "waste",
      netWeight: null,
      weightUnit: null,
      weightPrecision: "unknown",
    },
    expectedResult: {
      status: "extracted",
      sourceText: "Green tea waste and sweepings from processing plant.",
      attributes: {
        productCategory: "tea",
        teaType: "green",
        presentation: "unknown",
        form: "waste",
        netWeight: null,
        weightUnit: null,
        weightPrecision: "unknown",
      },
      missingFields: ["presentation", "netWeight"],
      ambiguities: [],
      evidence: [
        { field: "productCategory", sourceText: "tea" },
        { field: "teaType", sourceText: "Green tea" },
        { field: "form", sourceText: "waste and sweepings" },
      ],
    },
  },
]
