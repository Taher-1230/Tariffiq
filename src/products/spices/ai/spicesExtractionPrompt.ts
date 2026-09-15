// ============================================================
// Google Gemini Spices Extraction Prompt Specification — Phase 6.3A
//
// Formal prompt engineering template and JSON schema specification
// for Google Gemini AI Spices extractor integrations.
//
// Critical Enforcements in Prompt:
//   1. AI extracts structured facts ONLY.
//   2. AI must NEVER output or guess HS codes.
//   3. AI must NEVER guess unstated attributes (use "unknown").
//   4. AI must preserve uncertainty and record ambiguities.
// ============================================================

export const SPICES_EXTRACTION_SYSTEM_PROMPT = `You are an information extraction system for Spices product descriptions (Chapter 09, Headings 0904–0910).

Your sole responsibility is to extract structured, physical, botanical, and processing product attributes from the provided text into the exact JSON schema requested.

STRICT RULES & CONSTRAINTS:
1. Extract ONLY supported product attributes: productCategory, spiceType, botanicalType, crushedOrGround, subType, form, processingState, quality, sizeCategory, isCubeb, essentialCharacter, mixtureHeadings.
2. DO NOT determine or suggest an HS code, tariff code, heading, subheading, or rule ID under any circumstances.
3. DO NOT guess or infer missing information. If an attribute is not explicitly stated in the text, return "unknown".
4. If the user text expresses doubt or mentions multiple possibilities (e.g. "Maybe black pepper or cubeb", "Probably ginger or turmeric"), record the candidates and reason in the ambiguities array.
5. If the product is a mixture of multiple spices, set spiceType to "mixture" and record details in ambiguities or notes.
6. If the product is Cubeb pepper (Piper cubeba), set isCubeb to true (do not classify it as heading 1211; just extract the fact).
7. If the text indicates the product has lost the essential character of spices (e.g. prepared sauce, mixed condiment, prepared seasoning), set essentialCharacter to false.
8. DO NOT extract unsupported attributes such as brand, price, origin country, seller, organic status, or tasting notes.
9. Provide exact evidence text substrings from the source text for all extracted attributes.
10. Output valid, raw JSON conforming to the response schema.`

export const SPICES_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    productCategory: {
      type: "string",
      enum: ["spices", "unknown"],
      description: "Must be 'spices' if the product is a spice under Chapter 09 (0904–0910), otherwise 'unknown'.",
    },
    spiceType: {
      type: "string",
      enum: [
        "pepper",
        "capsicum_pimenta",
        "vanilla",
        "cinnamon",
        "cloves",
        "nutmeg",
        "mace",
        "cardamom",
        "coriander",
        "cumin",
        "anise",
        "badian",
        "caraway_or_fennel",
        "juniper_berries",
        "ginger",
        "saffron",
        "turmeric",
        "mixture",
        "other_spice",
        "unknown",
      ],
      description: "Commodity type of spice.",
    },
    botanicalType: {
      type: "string",
      enum: [
        "piper",
        "capsicum",
        "pimenta",
        "cinnamomum_zeylanicum",
        "cassia",
        "unknown",
      ],
      description: "Botanical genus/species if specified.",
    },
    crushedOrGround: {
      type: ["boolean", "string"],
      enum: [true, false, "unknown"],
      description: "Whether the spice is crushed/ground/powdered (true), whole/neither crushed nor ground (false), or unknown ('unknown').",
    },
    subType: {
      type: "string",
      enum: [
        "long_pepper",
        "light_black_pepper",
        "black_pepper_garbled",
        "black_pepper_ungarbled",
        "green_pepper_dehydrated",
        "pinheads",
        "green_pepper_frozen_or_dried",
        "non_green_frozen",
        "alleppey_green",
        "coorg_green",
        "bleached_half_bleached_bleachable",
        "mixed",
        "black",
        "other_than_black",
        "unbleached",
        "bleached",
        "cross_heading_mixture",
        "celery",
        "fenugreek",
        "dill",
        "ajwain",
        "cassia_torea",
        "cassia",
        "poppy",
        "mustard",
        "unknown",
      ],
      description: "Specific variety, subtype, or secondary spice seed/powder type.",
    },
    form: {
      type: "string",
      enum: [
        "bark",
        "tree_flowers",
        "stem",
        "not_stem",
        "in_shell",
        "shelled",
        "chilly_powder",
        "chilly_seeds",
        "powder",
        "small_cardamom_seeds",
        "husk",
        "stigma",
        "stamen",
        "seed",
        "unknown",
      ],
      description: "Physical presentation / plant part.",
    },
    processingState: {
      type: "string",
      enum: ["fresh", "dried", "extracted", "not_extracted", "unknown"],
      description: "Processing state: fresh, dried, extracted (for cloves), not_extracted, or unknown.",
    },
    quality: {
      type: "string",
      enum: ["seed_quality", "unknown"],
      description: "Whether the seeds are of seed quality (germination/agricultural standard).",
    },
    sizeCategory: {
      type: "string",
      enum: ["large", "small", "unknown"],
      description: "Size category for cardamoms: large (Amomum) or small (Elettaria).",
    },
    isCubeb: {
      type: ["boolean", "string"],
      enum: [true, false, "unknown"],
      description: "Whether the product is Cubeb pepper (Piper cubeba).",
    },
    essentialCharacter: {
      type: ["boolean", "string"],
      enum: [true, false, "unknown"],
      description: "Whether the product retains the essential character of Chapter 09 spices.",
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
    "spiceType",
    "botanicalType",
    "crushedOrGround",
    "subType",
    "form",
    "processingState",
    "quality",
    "sizeCategory",
  ],
}

/**
 * Gemini-specific structured output schema definition for Spices.
 */
export const GEMINI_SPICES_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    productCategory: {
      type: "STRING",
      enum: ["spices", "unknown"],
      description: "Must be 'spices' if the product is a spice under Chapter 09 (0904–0910), otherwise 'unknown'.",
    },
    spiceType: {
      type: "STRING",
      enum: [
        "pepper",
        "capsicum_pimenta",
        "vanilla",
        "cinnamon",
        "cloves",
        "nutmeg",
        "mace",
        "cardamom",
        "coriander",
        "cumin",
        "anise",
        "badian",
        "caraway_or_fennel",
        "juniper_berries",
        "ginger",
        "saffron",
        "turmeric",
        "mixture",
        "other_spice",
        "unknown",
      ],
      description: "Commodity type of spice.",
    },
    botanicalType: {
      type: "STRING",
      enum: [
        "piper",
        "capsicum",
        "pimenta",
        "cinnamomum_zeylanicum",
        "cassia",
        "unknown",
      ],
      description: "Botanical genus/species if specified.",
    },
    crushedOrGround: {
      type: "STRING",
      enum: ["true", "false", "unknown"],
      description: "String boolean 'true' for crushed/ground/powder, 'false' for whole, or 'unknown'.",
    },
    subType: {
      type: "STRING",
      enum: [
        "long_pepper",
        "light_black_pepper",
        "black_pepper_garbled",
        "black_pepper_ungarbled",
        "green_pepper_dehydrated",
        "pinheads",
        "green_pepper_frozen_or_dried",
        "non_green_frozen",
        "alleppey_green",
        "coorg_green",
        "bleached_half_bleached_bleachable",
        "mixed",
        "black",
        "other_than_black",
        "unbleached",
        "bleached",
        "cross_heading_mixture",
        "celery",
        "fenugreek",
        "dill",
        "ajwain",
        "cassia_torea",
        "cassia",
        "poppy",
        "mustard",
        "unknown",
      ],
      description: "Specific variety or subtype.",
    },
    form: {
      type: "STRING",
      enum: [
        "bark",
        "tree_flowers",
        "stem",
        "not_stem",
        "in_shell",
        "shelled",
        "chilly_powder",
        "chilly_seeds",
        "powder",
        "small_cardamom_seeds",
        "husk",
        "stigma",
        "stamen",
        "seed",
        "unknown",
      ],
      description: "Physical presentation / form.",
    },
    processingState: {
      type: "STRING",
      enum: ["fresh", "dried", "extracted", "not_extracted", "unknown"],
      description: "Processing state.",
    },
    quality: {
      type: "STRING",
      enum: ["seed_quality", "unknown"],
      description: "Whether the seeds are of seed quality.",
    },
    sizeCategory: {
      type: "STRING",
      enum: ["large", "small", "unknown"],
      description: "Size category for cardamoms.",
    },
    isCubeb: {
      type: "STRING",
      enum: ["true", "false", "unknown"],
      description: "Whether the product is Cubeb pepper (Piper cubeba).",
    },
    essentialCharacter: {
      type: "STRING",
      enum: ["true", "false", "unknown"],
      description: "Whether the product retains the essential character of Chapter 09 spices.",
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
    "spiceType",
    "botanicalType",
    "crushedOrGround",
    "subType",
    "form",
    "processingState",
    "quality",
    "sizeCategory",
  ],
}
