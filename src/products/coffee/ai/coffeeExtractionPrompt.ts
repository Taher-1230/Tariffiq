// ============================================================
// Google Gemini Coffee Extraction Prompt Specification — Phase 5C-B.2
//
// Formal prompt engineering template and JSON schema specification
// for Google Gemini AI Coffee extractor integrations.
//
// Critical Enforcements in Prompt:
//   1. AI extracts structured facts ONLY.
//   2. AI must NEVER output or guess HS codes.
//   3. AI must NEVER guess unstated attributes (use "unknown").
//   4. AI must preserve uncertainty and record ambiguities.
// ============================================================

export const COFFEE_EXTRACTION_SYSTEM_PROMPT = `You are an information extraction system for Coffee product descriptions.

Your sole responsibility is to extract structured, physical product attributes from the provided text into the exact JSON schema requested.

STRICT RULES & CONSTRAINTS:
1. Extract ONLY the supported product attributes: productCategory, productType, roasted, decaffeinated, presentation, form, grade.
2. DO NOT determine or suggest an HS code, tariff code, heading, or subheading under any circumstances.
3. DO NOT guess or infer missing information. If an attribute is not explicitly stated in the text, return "unknown".
4. If the user text expresses doubt or mentions multiple possibilities (e.g. "probably Arabica Cherry or Rob cherry"), record the candidates and reason in the ambiguities array.
5. DO NOT interpret generic words like "other", "regular", or "standard" as specific tariff subheadings.
6. Categorical presentation: "bulk" / "bulk packing" -> "bulk". Retail / small packaging -> "other" (or "unknown" if unspecified).
7. DO NOT extract unsupported attributes such as brand, price, origin country, seller, organic status, or tasting notes.
8. Provide exact evidence text substrings from the source text for all extracted attributes.
9. Output valid, raw JSON conforming to the response schema.`

export const COFFEE_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    productCategory: {
      type: "string",
      enum: ["coffee", "unknown"],
      description: "Must be 'coffee' if the product is coffee beans/husks/substitutes under Chapter 0901, otherwise 'unknown'.",
    },
    productType: {
      type: "string",
      enum: ["coffee", "husks_and_skins", "substitutes_containing_coffee", "unknown"],
      description: "Type of coffee product: 'coffee' (beans/coffee), 'husks_and_skins' (coffee husks and skins), 'substitutes_containing_coffee' (coffee substitutes containing coffee), or 'unknown'.",
    },
    roasted: {
      type: ["boolean", "string"],
      enum: [true, false, "unknown"],
      description: "Whether the coffee is roasted (true), unroasted / green (false), or unknown ('unknown').",
    },
    decaffeinated: {
      type: ["boolean", "string"],
      enum: [true, false, "unknown"],
      description: "Whether the coffee is decaffeinated (true), non-decaffeinated (false), or unknown ('unknown').",
    },
    presentation: {
      type: "string",
      enum: ["bulk", "other", "unknown"],
      description: "Packaging presentation: 'bulk' (bulk packing/sacks), 'other' (retail/other packs), or 'unknown'.",
    },
    form: {
      type: "string",
      enum: [
        "arabica_plantation",
        "arabica_cherry",
        "rob_cherry",
        "other",
        "unknown",
      ],
      description: "Variety / processing form: 'arabica_plantation', 'arabica_cherry', 'rob_cherry', 'other', or 'unknown'.",
    },
    grade: {
      type: "string",
      enum: [
        "A",
        "B",
        "C",
        "AB",
        "PB",
        "BBB",
        "B/B/B",
        "other",
        "unknown",
      ],
      description: "Commercial grade: 'A', 'B', 'C', 'AB', 'PB', 'BBB', 'B/B/B', 'other', or 'unknown'.",
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
    "productType",
    "roasted",
    "decaffeinated",
    "presentation",
    "form",
    "grade",
  ],
}

/**
 * Gemini-specific structured output schema definition for Coffee.
 */
export const GEMINI_COFFEE_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    productCategory: {
      type: "STRING",
      enum: ["coffee", "unknown"],
      description: "Must be 'coffee' if the product is coffee beans/husks/substitutes under Chapter 0901, otherwise 'unknown'.",
    },
    productType: {
      type: "STRING",
      enum: ["coffee", "husks_and_skins", "substitutes_containing_coffee", "unknown"],
      description: "Type of coffee product: 'coffee', 'husks_and_skins', 'substitutes_containing_coffee', or 'unknown'.",
    },
    roasted: {
      type: "STRING",
      enum: ["true", "false", "unknown"],
      description: "String boolean 'true' for roasted, 'false' for unroasted/green, or 'unknown'.",
    },
    decaffeinated: {
      type: "STRING",
      enum: ["true", "false", "unknown"],
      description: "String boolean 'true' for decaffeinated, 'false' for non-decaf, or 'unknown'.",
    },
    presentation: {
      type: "STRING",
      enum: ["bulk", "other", "unknown"],
      description: "Packaging format: 'bulk', 'other', or 'unknown'.",
    },
    form: {
      type: "STRING",
      enum: [
        "arabica_plantation",
        "arabica_cherry",
        "rob_cherry",
        "other",
        "unknown",
      ],
      description: "Variety / processing form of coffee.",
    },
    grade: {
      type: "STRING",
      enum: [
        "A",
        "B",
        "C",
        "AB",
        "PB",
        "BBB",
        "B/B/B",
        "other",
        "unknown",
      ],
      description: "Commercial grade of coffee.",
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
    "productType",
    "roasted",
    "decaffeinated",
    "presentation",
    "form",
    "grade",
  ],
}
