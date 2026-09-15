// ============================================================
// Spices AI Extractor Service — Phase 6.3A
//
// Core service orchestrating natural-language spices extraction.
// Calls POST /api/ai/extract with productCategory="spices".
// The API key never reaches the browser.
//
// INVARIANT:
//   This service NEVER selects an HS code or calls classifySpices().
// ============================================================

import type {
  AIExtractionErrorCode,
  ExtractionStatus,
  SpicesExtraction,
  SpicesExtractionAmbiguity,
  SpicesExtractionEvidence,
  SpicesExtractionResult,
} from "./types"
import { validateSpicesExtraction } from "./validateSpicesExtraction"

export const MAX_INPUT_LENGTH = 10_000

export interface SpicesProviderExtractionPayload {
  attributes: SpicesExtraction
  evidence?: SpicesExtractionEvidence[]
  ambiguities?: SpicesExtractionAmbiguity[]
  notes?: string
}

export interface SpicesExtractionProvider {
  name: string
  extract(
    text: string,
    options?: { timeoutMs?: number }
  ): Promise<SpicesProviderExtractionPayload>
}

export interface SpicesExtractorOptions {
  timeoutMs?: number
  provider?: SpicesExtractionProvider
}

const DEFAULT_EMPTY_SPICES_ATTRIBUTES: SpicesExtraction = {
  productCategory: "unknown",
  spiceType: "unknown",
  botanicalType: "unknown",
  crushedOrGround: "unknown",
  subType: "unknown",
  form: "unknown",
  processingState: "unknown",
  quality: "unknown",
  sizeCategory: "unknown",
  isCubeb: "unknown",
  essentialCharacter: "unknown",
}

function createErrorResult(
  errorCode: AIExtractionErrorCode,
  errorMessage: string,
  sourceText: string
): SpicesExtractionResult {
  return {
    status: "error",
    errorCode,
    errorMessage,
    attributes: { ...DEFAULT_EMPTY_SPICES_ATTRIBUTES },
    missingFields: [
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
    ambiguities: [],
    evidence: [],
    sourceText: sourceText ?? "",
  }
}

function validateEvidenceSpans(
  evidenceList: SpicesExtractionEvidence[],
  sourceText: string
): { valid: boolean; error?: string } {
  for (const ev of evidenceList) {
    if (!ev.field || !ev.sourceText) {
      return {
        valid: false,
        error: "Evidence entry is missing 'field' or 'sourceText'.",
      }
    }

    if (ev.startIndex !== undefined && ev.endIndex !== undefined) {
      if (ev.startIndex < 0 || ev.endIndex > sourceText.length) {
        return {
          valid: false,
          error: `Evidence offset [${ev.startIndex}, ${ev.endIndex}] out of bounds for source length ${sourceText.length}.`,
        }
      }
      if (ev.startIndex > ev.endIndex) {
        return {
          valid: false,
          error: `Evidence startIndex (${ev.startIndex}) is greater than endIndex (${ev.endIndex}).`,
        }
      }
      const slice = sourceText.slice(ev.startIndex, ev.endIndex)
      if (slice !== ev.sourceText) {
        return {
          valid: false,
          error: `Evidence slice "${slice}" does not match reported sourceText "${ev.sourceText}".`,
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Extracts structured Spices facts from natural language text.
 */
export async function extractSpicesDescription(
  text: string,
  options: SpicesExtractorOptions = {}
): Promise<SpicesExtractionResult> {
  // ── 1. Input pre-validation ─────────────────────────────────

  if (text === undefined || text === null) {
    return createErrorResult(
      "EMPTY_INPUT",
      "Product description is required.",
      ""
    )
  }

  if (typeof text !== "string") {
    return createErrorResult(
      "EMPTY_INPUT",
      "Product description must be text.",
      String(text)
    )
  }

  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return createErrorResult(
      "EMPTY_INPUT",
      "Enter a valid spices product description.",
      text
    )
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return createErrorResult(
      "INPUT_TOO_LONG",
      `Product description is too long (maximum ${MAX_INPUT_LENGTH} characters; received ${text.length}).`,
      text
    )
  }

  // ── 2. Provider Escape Hatch (for unit / mock testing) ───────

  if (options.provider) {
    try {
      const payload = await options.provider.extract(text, {
        timeoutMs: options.timeoutMs,
      })

      const validation = validateSpicesExtraction(payload.attributes)
      if (!validation.valid) {
        return createErrorResult(
          "INVALID_AI_RESPONSE",
          `AI extraction failed validation: ${validation.errors.join("; ")}`,
          text
        )
      }

      const rawEvidence = payload.evidence ?? []
      const evidenceValidation = validateEvidenceSpans(rawEvidence, text)
      if (!evidenceValidation.valid) {
        return createErrorResult(
          "INVALID_AI_RESPONSE",
          `AI extraction returned invalid evidence: ${evidenceValidation.error}`,
          text
        )
      }

      const ambiguities = payload.ambiguities ?? []
      const attributes = payload.attributes

      if (attributes.productCategory === "unknown") {
        return {
          status: "unsupported",
          errorCode: "UNSUPPORTED_PRODUCT",
          errorMessage:
            "This description does not appear to describe a spice product under Chapter 09 (0904–0910).",
          attributes,
          missingFields: [],
          ambiguities,
          evidence: rawEvidence,
          sourceText: text,
          notes: payload.notes,
        }
      }

      const missingFields: (keyof SpicesExtraction)[] = []
      if (attributes.spiceType === "unknown") missingFields.push("spiceType")
      if (attributes.crushedOrGround === "unknown") missingFields.push("crushedOrGround")

      let status: ExtractionStatus = "extracted"
      if (ambiguities.length > 0) {
        status = "needs_clarification"
      }

      return {
        status,
        attributes,
        missingFields,
        ambiguities,
        evidence: rawEvidence,
        sourceText: text,
        notes: payload.notes,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return createErrorResult("AI_PROVIDER_ERROR", message, text)
    }
  }

  // ── 3. Production Path: POST /api/ai/extract ────────────────

  try {
    const controller = new AbortController()
    const timeout = options.timeoutMs ?? 30_000
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch("/api/ai/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCategory: "spices", text }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const code = (errorBody.errorCode ?? "AI_PROVIDER_ERROR") as AIExtractionErrorCode
      const message = (errorBody.message ?? `HTTP error ${response.status}`) as string
      return createErrorResult(code, message, text)
    }

    const data = (await response.json()) as SpicesExtractionResult

    // Validate payload shape
    const validation = validateSpicesExtraction(data.attributes)
    if (!validation.valid) {
      return createErrorResult(
        "INVALID_AI_RESPONSE",
        `AI extraction response failed validation: ${validation.errors.join("; ")}`,
        text
      )
    }

    return data
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return createErrorResult(
        "AI_TIMEOUT",
        "Extraction request timed out. Please try again.",
        text
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    return createErrorResult("AI_NETWORK_ERROR", message, text)
  }
}
