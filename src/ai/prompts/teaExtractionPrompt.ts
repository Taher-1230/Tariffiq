// ============================================================
// Google Gemini Extraction Prompt Specification — Phase 4B
//
// Formal prompt engineering template and JSON schema specification
// for Google Gemini AI extractor integrations.
//
// Critical Enforcements in Prompt:
//   1. AI extracts structured facts ONLY.
//   2. AI must NEVER output or guess HS codes.
//   3. AI must NEVER guess unstated attributes (use "unknown").
//   4. AI must preserve uncertainty ("not_sure", "approximate").
// ============================================================

export const TEA_EXTRACTION_SYSTEM_PROMPT = `You are an information extraction system for Tea product descriptions.

Your sole responsibility is to extract structured, physical product attributes from the provided text into the exact JSON schema requested.

STRICT RULES & CONSTRAINTS:
1. Extract ONLY the supported product attributes: productCategory, teaType, presentation, form, netWeight, weightUnit, weightPrecision.
2. DO NOT determine or suggest an HS code, tariff code, heading, or subheading under any circumstances.
3. DO NOT guess or infer missing information. If an attribute is not explicitly stated in the text, return "unknown" (or null for weight).
4. If the user text expresses doubt or uncertainty (e.g. "I think it might be black tea"), return "not_sure" and record the ambiguity.
5. If the package weight is stated as approximate (e.g. "about 500g", "approx 1kg"), set weightPrecision to "approximate".
6. DO NOT extract unsupported attributes such as brand, price, origin, seller, organic status, or flavor.
7. Provide exact evidence text substrings for all extracted attributes.
8. Output valid, raw JSON conforming to the response schema.`

export const TEA_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    productCategory: {
      type: "string",
      enum: ["tea", "unknown"],
      description: "Must be 'tea' if the product is tea leaves/bags/extracts under Chapter 0902, otherwise 'unknown'.",
    },
    teaType: {
      type: "string",
      enum: ["green", "black", "partly_fermented", "not_sure", "unknown"],
      description: "The botanical/processing type of tea. Use 'unknown' if not stated, or 'not_sure' if user expresses uncertainty.",
    },
    presentation: {
      type: "string",
      enum: ["immediate_packing", "packet", "bulk", "unknown"],
      description: "Packaging format. 'immediate_packing' (retail packs/boxes/tins), 'packet' (large packets), 'bulk' (bulk bags/sacks), or 'unknown'.",
    },
    form: {
      type: "string",
      enum: [
        "whole_leaf",
        "dust",
        "tea_bags",
        "agglomerated",
        "waste",
        "other",
        "unknown",
      ],
      description: "Physical form of the tea.",
    },
    netWeight: {
      type: ["number", "null"],
      description: "Numeric net content weight, or null if unstated.",
    },
    weightUnit: {
      type: ["string", "null"],
      enum: ["g", "kg", null],
      description: "Weight unit ('g' or 'kg'), or null if weight is unstated.",
    },
    weightPrecision: {
      type: "string",
      enum: ["exact", "approximate", "unknown"],
      description: "Whether the weight is an exact measurement or an approximation.",
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          sourceText: { type: "string" },
        },
        required: ["field", "sourceText"],
      },
    },
    ambiguities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          candidates: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
        required: ["field", "candidates", "reason"],
      },
    },
  },
  required: [
    "productCategory",
    "teaType",
    "presentation",
    "form",
    "netWeight",
    "weightUnit",
  ],
}

/**
 * Gemini-specific structured output schema definition.
 */
export const GEMINI_TEA_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    productCategory: {
      type: "STRING",
      enum: ["tea", "unknown"],
      description: "Must be 'tea' if product is tea leaves/bags/extracts under Chapter 0902, otherwise 'unknown'.",
    },
    teaType: {
      type: "STRING",
      enum: ["green", "black", "partly_fermented", "not_sure", "unknown"],
      description: "The botanical/processing type of tea.",
    },
    presentation: {
      type: "STRING",
      enum: ["immediate_packing", "packet", "bulk", "unknown"],
      description: "Packaging format.",
    },
    form: {
      type: "STRING",
      enum: [
        "whole_leaf",
        "dust",
        "tea_bags",
        "agglomerated",
        "waste",
        "other",
        "unknown",
      ],
      description: "Physical form of tea.",
    },
    netWeight: {
      type: "NUMBER",
      nullable: true,
      description: "Numeric net content weight, or null if unstated.",
    },
    weightUnit: {
      type: "STRING",
      enum: ["g", "kg"],
      nullable: true,
      description: "Weight unit ('g' or 'kg'), or null if unstated.",
    },
    weightPrecision: {
      type: "STRING",
      enum: ["exact", "approximate", "unknown"],
      nullable: true,
      description: "Whether the weight is exact or approximate.",
    },
    evidence: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          field: { type: "STRING" },
          sourceText: { type: "STRING" },
        },
        required: ["field", "sourceText"],
      },
    },
    ambiguities: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          field: { type: "STRING" },
          candidates: { type: "ARRAY", items: { type: "STRING" } },
          reason: { type: "STRING" },
        },
        required: ["field", "candidates", "reason"],
      },
    },
  },
  required: [
    "productCategory",
    "teaType",
    "presentation",
    "form",
  ],
}

/**
 * Builds the complete prompt payload for future LLM evaluation.
 *
 * @param userDescription - The raw user input text.
 * @returns Formatted prompt object ready for API consumption.
 */
export function buildTeaExtractionPrompt(userDescription: string): {
  system: string
  user: string
  schema: typeof TEA_EXTRACTION_JSON_SCHEMA
} {
  return {
    system: TEA_EXTRACTION_SYSTEM_PROMPT,
    user: `Extract structured tea attributes from the following description:\n\n"${userDescription}"`,
    schema: TEA_EXTRACTION_JSON_SCHEMA,
  }
}
