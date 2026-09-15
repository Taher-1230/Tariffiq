// ============================================================
// Server-Side Gemini Extraction Service — Phase 5A
//
// Calls the Google Gemini API server-side using @google/genai.
// Reuses the exact same prompt, JSON schema, timeout, and retry
// logic from the Phase 4B frontend provider.
//
// INVARIANT:
//   This service NEVER calls classifyTea() or returns HS codes.
//   It only extracts structured product attributes.
// ============================================================

import { GoogleGenAI } from "@google/genai"
import { validateTeaExtraction } from "../../shared/validateTeaExtraction.js"
import { validateCoffeeExtraction } from "../../shared/validateCoffeeExtraction.js"
import { validateSpicesExtraction } from "../../shared/validateSpicesExtraction.js"
import type {
  TeaExtraction,
  TeaExtractionResult,
  ExtractionEvidence,
  ExtractionAmbiguity,
  ExtractionStatus,
  AIExtractionErrorCode,
} from "../../shared/ai-contract.js"
import type {
  CoffeeExtraction,
  CoffeeExtractionResult,
  CoffeeExtractionEvidence,
  CoffeeExtractionAmbiguity,
} from "../../shared/coffee-ai-contract.js"
import type {
  SpicesExtraction,
  SpicesExtractionResult,
  SpicesExtractionEvidence,
  SpicesExtractionAmbiguity,
} from "../../shared/spices-ai-contract.js"

// ── Prompt & Schema (inlined from src/ai/prompts to avoid
//    coupling server to the Vite source tree) ─────────────────

const SYSTEM_PROMPT = `You are an information extraction system for Tea product descriptions.

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

const RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    productCategory: {
      type: "STRING" as const,
      enum: ["tea", "unknown"],
      description: "Must be 'tea' if product is tea leaves/bags/extracts under Chapter 0902, otherwise 'unknown'.",
    },
    teaType: {
      type: "STRING" as const,
      enum: ["green", "black", "partly_fermented", "not_sure", "unknown"],
      description: "The botanical/processing type of tea.",
    },
    presentation: {
      type: "STRING" as const,
      enum: ["immediate_packing", "packet", "bulk", "unknown"],
      description: "Packaging format.",
    },
    form: {
      type: "STRING" as const,
      enum: ["whole_leaf", "dust", "tea_bags", "agglomerated", "waste", "other", "unknown"],
      description: "Physical form of tea.",
    },
    netWeight: {
      type: "NUMBER" as const,
      nullable: true,
      description: "Numeric net content weight, or null if unstated.",
    },
    weightUnit: {
      type: "STRING" as const,
      enum: ["g", "kg"],
      nullable: true,
      description: "Weight unit ('g' or 'kg'), or null if unstated.",
    },
    weightPrecision: {
      type: "STRING" as const,
      enum: ["exact", "approximate", "unknown"],
      nullable: true,
      description: "Whether the weight is exact or approximate.",
    },
    evidence: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          field: { type: "STRING" as const },
          sourceText: { type: "STRING" as const },
        },
        required: ["field", "sourceText"],
      },
    },
    ambiguities: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          field: { type: "STRING" as const },
          candidates: { type: "ARRAY" as const, items: { type: "STRING" as const } },
          reason: { type: "STRING" as const },
        },
        required: ["field", "candidates", "reason"],
      },
    },
  },
  required: ["productCategory", "teaType", "presentation", "form"],
}

// ── Error classes ────────────────────────────────────────────

export class GeminiServiceError extends Error {
  readonly errorCode: AIExtractionErrorCode
  constructor(errorCode: AIExtractionErrorCode, message: string) {
    super(message)
    this.name = "GeminiServiceError"
    this.errorCode = errorCode
  }
}

// ── Default empty attributes ─────────────────────────────────

const DEFAULT_EMPTY_ATTRIBUTES: TeaExtraction = {
  productCategory: "unknown",
  teaType: "unknown",
  presentation: "unknown",
  form: "unknown",
  netWeight: null,
  weightUnit: null,
}

function createErrorResult(
  errorCode: AIExtractionErrorCode,
  errorMessage: string,
  sourceText: string
): TeaExtractionResult {
  return {
    status: "error",
    errorCode,
    errorMessage,
    attributes: { ...DEFAULT_EMPTY_ATTRIBUTES },
    missingFields: ["productCategory", "teaType", "presentation", "form"],
    ambiguities: [],
    evidence: [],
    sourceText,
  }
}

// ── Service ──────────────────────────────────────────────────

export interface GeminiServiceConfig {
  apiKey: string
  model: string
  timeoutMs?: number
}

export async function extractWithGemini(
  text: string,
  config: GeminiServiceConfig
): Promise<TeaExtractionResult> {
  const { apiKey, model, timeoutMs = 20_000 } = config

  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiServiceError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "Gemini API key is not configured on the server."
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const maxAttempts = 2 // 1 initial + 1 retry for transient errors
  let attempt = 0

  while (attempt < maxAttempts) {
    attempt++
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Extract structured tea attributes from the following description:\n\n"${text}"`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.0,
        },
      })

      clearTimeout(timer)

      const rawContent = response.text
      if (!rawContent || rawContent.trim().length === 0) {
        return createErrorResult(
          "INVALID_AI_RESPONSE",
          "Gemini returned an empty response.",
          text
        )
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(rawContent)
      } catch {
        return createErrorResult(
          "INVALID_AI_RESPONSE",
          "Failed to parse JSON response from Gemini.",
          text
        )
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return createErrorResult(
          "INVALID_AI_RESPONSE",
          "Gemini response root must be a JSON object.",
          text
        )
      }

      const parsedRecord = parsed as Record<string, unknown>
      const evidence = Array.isArray(parsedRecord.evidence)
        ? (parsedRecord.evidence as ExtractionEvidence[])
        : []
      const ambiguities = Array.isArray(parsedRecord.ambiguities)
        ? (parsedRecord.ambiguities as ExtractionAmbiguity[])
        : []
      const notes = typeof parsedRecord.notes === "string"
        ? parsedRecord.notes
        : undefined

      // Extract attributes (separate evidence/ambiguities/notes)
      const attributes: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(parsedRecord)) {
        if (k !== "evidence" && k !== "ambiguities" && k !== "notes") {
          attributes[k] = v
        }
      }

      // ── Validate extraction contract & HS code protection ──
      const validation = validateTeaExtraction(attributes)
      if (!validation.valid) {
        return createErrorResult(
          "INVALID_AI_RESPONSE",
          `AI returned invalid extraction: ${validation.errors.join("; ")}`,
          text
        )
      }

      const typedAttributes = attributes as unknown as TeaExtraction

      // ── Determine missing fields & status ──
      const missingFields: (keyof TeaExtraction)[] = []

      if (typedAttributes.productCategory === "unknown") {
        missingFields.push("productCategory", "teaType", "presentation", "form")
        return {
          status: "unsupported",
          attributes: typedAttributes,
          missingFields,
          ambiguities,
          evidence,
          sourceText: text,
          notes: notes ?? "The product is outside the Chapter 0902 tea scope.",
        }
      }

      if (typedAttributes.teaType === "unknown") missingFields.push("teaType")
      if (typedAttributes.presentation === "unknown") missingFields.push("presentation")
      if (typedAttributes.form === "unknown") missingFields.push("form")
      if (typedAttributes.netWeight === null) missingFields.push("netWeight")

      let status: ExtractionStatus = "extracted"
      if (
        ambiguities.length > 0 ||
        typedAttributes.teaType === "not_sure" ||
        typedAttributes.teaType === "unknown"
      ) {
        status = "needs_clarification"
      }

      return {
        status,
        attributes: typedAttributes,
        missingFields,
        ambiguities,
        evidence,
        sourceText: text,
        notes,
      }
    } catch (err: unknown) {
      clearTimeout(timer)

      const isTimeout =
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      if (isTimeout) {
        throw new GeminiServiceError(
          "AI_TIMEOUT",
          `AI extraction timed out after ${timeoutMs / 1000}s.`
        )
      }

      const errorMsg = err instanceof Error ? err.message : String(err)
      const lowerMsg = errorMsg.toLowerCase()

      if (
        lowerMsg.includes("api_key_invalid") ||
        lowerMsg.includes("unauthenticated") ||
        lowerMsg.includes("permission_denied") ||
        lowerMsg.includes("401") ||
        lowerMsg.includes("403")
      ) {
        throw new GeminiServiceError(
          "AI_AUTHENTICATION_ERROR",
          "Gemini API authentication failed."
        )
      }

      if (
        lowerMsg.includes("resource_exhausted") ||
        lowerMsg.includes("quota") ||
        lowerMsg.includes("rate limit") ||
        lowerMsg.includes("429")
      ) {
        throw new GeminiServiceError(
          "AI_RATE_LIMITED",
          "Gemini API rate limit or quota exceeded."
        )
      }

      // Retry once for transient network / 5xx errors
      if (attempt < maxAttempts) {
        continue
      }

      if (lowerMsg.includes("fetch") || lowerMsg.includes("network")) {
        throw new GeminiServiceError(
          "AI_NETWORK_ERROR",
          "Network error contacting Gemini."
        )
      }

      throw new GeminiServiceError(
        "AI_PROVIDER_ERROR",
        "Gemini API error."
      )
    }
  }

  throw new GeminiServiceError(
    "AI_NETWORK_ERROR",
    "Failed to obtain AI extraction from Gemini after retry."
  )
}

// ============================================================
// Coffee Extraction Implementation
// ============================================================

const COFFEE_SYSTEM_PROMPT = `You are an information extraction system for Coffee product descriptions.

Your sole responsibility is to extract structured, physical product attributes from the provided text into the exact JSON schema requested.

STRICT RULES & CONSTRAINTS:
1. Extract ONLY the supported product attributes: productCategory, productType, roasted, decaffeinated, presentation, form, grade.
2. DO NOT determine or suggest an HS code, tariff code, heading, or subheading under any circumstances.
3. DO NOT guess or infer missing information. If an attribute is not explicitly stated in the text, return "unknown".
4. If the user text expresses doubt or mentions multiple possibilities, record the candidates and reason in the ambiguities array.
5. DO NOT interpret generic words like "other", "regular", or "standard" as specific tariff subheadings.
6. Categorical presentation: "bulk" / "bulk packing" -> "bulk". Retail / small packaging -> "other" (or "unknown" if unspecified).
7. DO NOT extract unsupported attributes such as brand, price, origin country, seller, organic status, or tasting notes.
8. Provide exact evidence text substrings from the source text for all extracted attributes.
9. Output valid, raw JSON conforming to the response schema.`

const COFFEE_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    productCategory: {
      type: "STRING" as const,
      enum: ["coffee", "unknown"],
      description: "Must be 'coffee' if the product is coffee beans/husks/substitutes under Chapter 0901, otherwise 'unknown'.",
    },
    productType: {
      type: "STRING" as const,
      enum: ["coffee", "husks_and_skins", "substitutes_containing_coffee", "unknown"],
      description: "Type of coffee product.",
    },
    roasted: {
      type: "STRING" as const,
      enum: ["true", "false", "unknown"],
      description: "String boolean 'true' for roasted, 'false' for unroasted/green, or 'unknown'.",
    },
    decaffeinated: {
      type: "STRING" as const,
      enum: ["true", "false", "unknown"],
      description: "String boolean 'true' for decaffeinated, 'false' for non-decaf, or 'unknown'.",
    },
    presentation: {
      type: "STRING" as const,
      enum: ["bulk", "other", "unknown"],
      description: "Packaging format: 'bulk', 'other', or 'unknown'.",
    },
    form: {
      type: "STRING" as const,
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
      type: "STRING" as const,
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
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          field: { type: "STRING" as const },
          sourceText: { type: "STRING" as const },
        },
        required: ["field", "sourceText"],
      },
    },
    ambiguities: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          field: { type: "STRING" as const },
          candidates: { type: "ARRAY" as const, items: { type: "STRING" as const } },
          reason: { type: "STRING" as const },
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

const DEFAULT_EMPTY_COFFEE_ATTRIBUTES: CoffeeExtraction = {
  productCategory: "unknown",
  productType: "unknown",
  roasted: "unknown",
  decaffeinated: "unknown",
  presentation: "unknown",
  form: "unknown",
  grade: "unknown",
}

function createCoffeeErrorResult(
  errorCode: AIExtractionErrorCode,
  errorMessage: string,
  sourceText: string
): CoffeeExtractionResult {
  return {
    status: "error",
    errorCode,
    errorMessage,
    attributes: { ...DEFAULT_EMPTY_COFFEE_ATTRIBUTES },
    missingFields: [
      "productCategory",
      "productType",
      "roasted",
      "decaffeinated",
      "presentation",
      "form",
      "grade",
    ],
    ambiguities: [],
    evidence: [],
    sourceText,
  }
}

export async function extractCoffeeWithGemini(
  text: string,
  config: GeminiServiceConfig
): Promise<CoffeeExtractionResult> {
  const { apiKey, model, timeoutMs = 20_000 } = config

  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiServiceError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "Gemini API key is not configured on the server."
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const maxAttempts = 2
  let attempt = 0

  while (attempt < maxAttempts) {
    attempt++
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Extract structured coffee attributes from the following description:\n\n"${text}"`,
        config: {
          systemInstruction: COFFEE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: COFFEE_RESPONSE_SCHEMA,
          temperature: 0.0,
        },
      })

      clearTimeout(timer)

      const rawContent = response.text
      if (!rawContent || rawContent.trim().length === 0) {
        return createCoffeeErrorResult(
          "INVALID_AI_RESPONSE",
          "Gemini returned an empty response.",
          text
        )
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(rawContent)
      } catch {
        return createCoffeeErrorResult(
          "INVALID_AI_RESPONSE",
          "Failed to parse JSON response from Gemini.",
          text
        )
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return createCoffeeErrorResult(
          "INVALID_AI_RESPONSE",
          "Gemini response root must be a JSON object.",
          text
        )
      }

      const parsedRecord = parsed as Record<string, unknown>
      const evidence = Array.isArray(parsedRecord.evidence)
        ? (parsedRecord.evidence as CoffeeExtractionEvidence[])
        : []
      const ambiguities = Array.isArray(parsedRecord.ambiguities)
        ? (parsedRecord.ambiguities as CoffeeExtractionAmbiguity[])
        : []
      const notes = typeof parsedRecord.notes === "string"
        ? parsedRecord.notes
        : undefined

      // Extract attributes (separate evidence/ambiguities/notes)
      const attributes: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(parsedRecord)) {
        if (k !== "evidence" && k !== "ambiguities" && k !== "notes") {
          // Normalize string booleans if returned by schema
          if (k === "roasted" || k === "decaffeinated") {
            if (v === "true" || v === true) {
              attributes[k] = true
            } else if (v === "false" || v === false) {
              attributes[k] = false
            } else {
              attributes[k] = "unknown"
            }
          } else {
            attributes[k] = v
          }
        }
      }

      // ── Validate extraction contract & HS code protection ──
      const validation = validateCoffeeExtraction(attributes)
      if (!validation.valid) {
        return createCoffeeErrorResult(
          "INVALID_AI_RESPONSE",
          `AI returned invalid extraction: ${validation.errors.join("; ")}`,
          text
        )
      }

      const typedAttributes = attributes as unknown as CoffeeExtraction

      // ── Determine missing fields & status ──
      const missingFields: (keyof CoffeeExtraction)[] = []

      if (typedAttributes.productCategory === "unknown") {
        missingFields.push(
          "productCategory",
          "productType",
          "roasted",
          "decaffeinated",
          "presentation",
          "form",
          "grade"
        )
        return {
          status: "unsupported",
          errorCode: "UNSUPPORTED_PRODUCT",
          errorMessage: "This product is outside the Chapter 0901 coffee scope.",
          attributes: typedAttributes,
          missingFields,
          ambiguities,
          evidence,
          sourceText: text,
          notes: notes ?? "The product is outside the Chapter 0901 coffee scope.",
        }
      }

      if (typedAttributes.productType === "unknown") missingFields.push("productType")
      if (typedAttributes.roasted === "unknown") missingFields.push("roasted")
      if (typedAttributes.decaffeinated === "unknown") missingFields.push("decaffeinated")
      if (typedAttributes.presentation === "unknown") missingFields.push("presentation")
      if (typedAttributes.form === "unknown") missingFields.push("form")
      if (typedAttributes.grade === "unknown") missingFields.push("grade")

      let status: ExtractionStatus = "extracted"
      if (ambiguities.length > 0) {
        status = "needs_clarification"
      }

      return {
        status,
        attributes: typedAttributes,
        missingFields,
        ambiguities,
        evidence,
        sourceText: text,
        notes,
      }
    } catch (err: unknown) {
      clearTimeout(timer)

      const isTimeout =
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      if (isTimeout) {
        throw new GeminiServiceError(
          "AI_TIMEOUT",
          `AI extraction timed out after ${timeoutMs / 1000}s.`
        )
      }

      const errorMsg = err instanceof Error ? err.message : String(err)
      const lowerMsg = errorMsg.toLowerCase()

      if (
        lowerMsg.includes("api_key_invalid") ||
        lowerMsg.includes("unauthenticated") ||
        lowerMsg.includes("permission_denied") ||
        lowerMsg.includes("401") ||
        lowerMsg.includes("403")
      ) {
        throw new GeminiServiceError(
          "AI_AUTHENTICATION_ERROR",
          "Gemini API authentication failed."
        )
      }

      if (
        lowerMsg.includes("resource_exhausted") ||
        lowerMsg.includes("quota") ||
        lowerMsg.includes("rate limit") ||
        lowerMsg.includes("429")
      ) {
        throw new GeminiServiceError(
          "AI_RATE_LIMITED",
          "Gemini API rate limit or quota exceeded."
        )
      }

      // Retry once for transient network / 5xx errors
      if (attempt < maxAttempts) {
        continue
      }

      if (lowerMsg.includes("fetch") || lowerMsg.includes("network")) {
        throw new GeminiServiceError(
          "AI_NETWORK_ERROR",
          "Network error contacting Gemini."
        )
      }

      throw new GeminiServiceError(
        "AI_PROVIDER_ERROR",
        "Gemini API error."
      )
    }
  }

  throw new GeminiServiceError(
    "AI_NETWORK_ERROR",
    "Failed to obtain AI extraction from Gemini after retry."
  )
}

// ── Spices System Prompt & Schema ───────────────────────────

const SPICES_SYSTEM_PROMPT = `You are an information extraction system for Spices product descriptions (Chapter 09, Headings 0904–0910).

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

const SPICES_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    productCategory: {
      type: "STRING" as const,
      enum: ["spices", "unknown"],
      description: "Must be 'spices' if the product is a spice under Chapter 09 (0904–0910), otherwise 'unknown'.",
    },
    spiceType: {
      type: "STRING" as const,
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
      type: "STRING" as const,
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
      type: "STRING" as const,
      enum: ["true", "false", "unknown"],
      description: "String boolean 'true' for crushed/ground/powder, 'false' for whole, or 'unknown'.",
    },
    subType: {
      type: "STRING" as const,
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
      type: "STRING" as const,
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
      type: "STRING" as const,
      enum: ["fresh", "dried", "extracted", "not_extracted", "unknown"],
      description: "Processing state.",
    },
    quality: {
      type: "STRING" as const,
      enum: ["seed_quality", "unknown"],
      description: "Whether the seeds are of seed quality.",
    },
    sizeCategory: {
      type: "STRING" as const,
      enum: ["large", "small", "unknown"],
      description: "Size category for cardamoms.",
    },
    isCubeb: {
      type: "STRING" as const,
      enum: ["true", "false", "unknown"],
      description: "Whether the product is Cubeb pepper (Piper cubeba).",
    },
    essentialCharacter: {
      type: "STRING" as const,
      enum: ["true", "false", "unknown"],
      description: "Whether the product retains the essential character of Chapter 09 spices.",
    },
    evidence: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          field: { type: "STRING" as const },
          sourceText: { type: "STRING" as const },
        },
        required: ["field", "sourceText"],
      },
    },
    ambiguities: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          field: { type: "STRING" as const },
          candidates: { type: "ARRAY" as const, items: { type: "STRING" as const } },
          reason: { type: "STRING" as const },
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

export async function extractSpicesWithGemini(
  text: string,
  config: GeminiServiceConfig
): Promise<SpicesExtractionResult> {
  const { apiKey, model, timeoutMs = 20_000 } = config

  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiServiceError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "Gemini API key is not configured on the server."
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const maxAttempts = 2
  let attempt = 0

  while (attempt < maxAttempts) {
    attempt++
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await ai.models.generateContent({
        model,
        contents: text,
        config: {
          systemInstruction: SPICES_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: SPICES_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      })

      clearTimeout(timer)

      const responseText = response.text
      if (!responseText || responseText.trim().length === 0) {
        throw new GeminiServiceError(
          "INVALID_AI_RESPONSE",
          "Gemini returned an empty response."
        )
      }

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(responseText)
      } catch {
        throw new GeminiServiceError(
          "INVALID_AI_RESPONSE",
          "Gemini response was not valid JSON."
        )
      }

      // Convert boolean-like string enums to actual booleans
      if (parsed.crushedOrGround === "true") parsed.crushedOrGround = true
      else if (parsed.crushedOrGround === "false") parsed.crushedOrGround = false
      else if (parsed.crushedOrGround === undefined) parsed.crushedOrGround = "unknown"

      if (parsed.isCubeb === "true") parsed.isCubeb = true
      else if (parsed.isCubeb === "false") parsed.isCubeb = false
      else if (parsed.isCubeb === undefined) parsed.isCubeb = "unknown"

      if (parsed.essentialCharacter === "true") parsed.essentialCharacter = true
      else if (parsed.essentialCharacter === "false") parsed.essentialCharacter = false
      else if (parsed.essentialCharacter === undefined) parsed.essentialCharacter = "unknown"

      const validation = validateSpicesExtraction(parsed)
      if (!validation.valid) {
        throw new GeminiServiceError(
          "INVALID_AI_RESPONSE",
          `Gemini extraction failed validation: ${validation.errors.join("; ")}`
        )
      }

      const evidence = Array.isArray(parsed.evidence)
        ? (parsed.evidence as SpicesExtractionEvidence[])
        : []

      const ambiguities = Array.isArray(parsed.ambiguities)
        ? (parsed.ambiguities as SpicesExtractionAmbiguity[])
        : []

      const notes = typeof parsed.notes === "string" ? parsed.notes : undefined

      const typedAttributes: SpicesExtraction = {
        productCategory: (parsed.productCategory as any) ?? "unknown",
        spiceType: (parsed.spiceType as any) ?? "unknown",
        botanicalType: (parsed.botanicalType as any) ?? "unknown",
        crushedOrGround: (parsed.crushedOrGround as any) ?? "unknown",
        subType: (parsed.subType as any) ?? "unknown",
        form: (parsed.form as any) ?? "unknown",
        processingState: (parsed.processingState as any) ?? "unknown",
        quality: (parsed.quality as any) ?? "unknown",
        sizeCategory: (parsed.sizeCategory as any) ?? "unknown",
        isCubeb: (parsed.isCubeb as any) ?? "unknown",
        essentialCharacter: (parsed.essentialCharacter as any) ?? "unknown",
      }

      if (typedAttributes.productCategory === "unknown") {
        return {
          status: "unsupported",
          errorCode: "UNSUPPORTED_PRODUCT",
          errorMessage:
            "This description does not appear to describe a spice product under Chapter 09 (0904–0910).",
          attributes: typedAttributes,
          missingFields: [],
          ambiguities,
          evidence,
          sourceText: text,
          notes,
        }
      }

      const missingFields: (keyof SpicesExtraction)[] = []
      if (typedAttributes.spiceType === "unknown") missingFields.push("spiceType")
      if (typedAttributes.crushedOrGround === "unknown") missingFields.push("crushedOrGround")

      let status: ExtractionStatus = "extracted"
      if (ambiguities.length > 0) {
        status = "needs_clarification"
      }

      return {
        status,
        attributes: typedAttributes,
        missingFields,
        ambiguities,
        evidence,
        sourceText: text,
        notes,
      }
    } catch (err: unknown) {
      clearTimeout(timer)

      const isTimeout =
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      if (isTimeout) {
        throw new GeminiServiceError(
          "AI_TIMEOUT",
          `AI extraction timed out after ${timeoutMs / 1000}s.`
        )
      }

      const errorMsg = err instanceof Error ? err.message : String(err)
      const lowerMsg = errorMsg.toLowerCase()

      if (
        lowerMsg.includes("api_key_invalid") ||
        lowerMsg.includes("unauthenticated") ||
        lowerMsg.includes("permission_denied") ||
        lowerMsg.includes("401") ||
        lowerMsg.includes("403")
      ) {
        throw new GeminiServiceError(
          "AI_AUTHENTICATION_ERROR",
          "Gemini API authentication failed."
        )
      }

      if (
        lowerMsg.includes("resource_exhausted") ||
        lowerMsg.includes("quota") ||
        lowerMsg.includes("rate limit") ||
        lowerMsg.includes("429")
      ) {
        throw new GeminiServiceError(
          "AI_RATE_LIMITED",
          "Gemini API rate limit or quota exceeded."
        )
      }

      // Retry once for transient network / 5xx errors
      if (attempt < maxAttempts) {
        continue
      }

      if (lowerMsg.includes("fetch") || lowerMsg.includes("network")) {
        throw new GeminiServiceError(
          "AI_NETWORK_ERROR",
          "Network error contacting Gemini."
        )
      }

      throw new GeminiServiceError(
        "AI_PROVIDER_ERROR",
        "Gemini API error."
      )
    }
  }

  throw new GeminiServiceError(
    "AI_NETWORK_ERROR",
    "Failed to obtain AI extraction from Gemini after retry."
  )
}
