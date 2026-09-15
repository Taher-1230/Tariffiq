// ============================================================
// Coffee AI Extractor Service — Phase 5C-B.2
//
// Core service orchestrating natural-language coffee extraction.
// Calls POST /api/ai/extract with productCategory="coffee".
// The API key never reaches the browser.
//
// INVARIANT:
//   This service NEVER selects an HS code or calls classifyCoffee().
// ============================================================

import type {
  AIExtractionErrorCode,
  CoffeeExtraction,
  CoffeeExtractionAmbiguity,
  CoffeeExtractionEvidence,
  CoffeeExtractionResult,
  ExtractionStatus,
} from "./types"
import { validateCoffeeExtraction } from "./validateCoffeeExtraction"

export const MAX_INPUT_LENGTH = 10_000

export interface CoffeeProviderExtractionPayload {
  attributes: CoffeeExtraction
  evidence?: CoffeeExtractionEvidence[]
  ambiguities?: CoffeeExtractionAmbiguity[]
  notes?: string
}

export interface CoffeeExtractionProvider {
  name: string
  extract(
    text: string,
    options?: { timeoutMs?: number }
  ): Promise<CoffeeProviderExtractionPayload>
}

export interface CoffeeExtractorOptions {
  timeoutMs?: number
  provider?: CoffeeExtractionProvider
}

const DEFAULT_EMPTY_ATTRIBUTES: CoffeeExtraction = {
  productCategory: "unknown",
  productType: "unknown",
  roasted: "unknown",
  decaffeinated: "unknown",
  presentation: "unknown",
  form: "unknown",
  grade: "unknown",
}

function createErrorResult(
  errorCode: AIExtractionErrorCode,
  errorMessage: string,
  sourceText: string
): CoffeeExtractionResult {
  return {
    status: "error",
    errorCode,
    errorMessage,
    attributes: { ...DEFAULT_EMPTY_ATTRIBUTES },
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
    sourceText: sourceText ?? "",
  }
}

function validateEvidenceSpans(
  evidenceList: CoffeeExtractionEvidence[],
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
 * Extracts structured Coffee facts from natural language text.
 */
export async function extractCoffeeDescription(
  text: string,
  options: CoffeeExtractorOptions = {}
): Promise<CoffeeExtractionResult> {
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
      "Enter a valid coffee product description.",
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

      const validation = validateCoffeeExtraction(payload.attributes)
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
            "This description does not appear to describe a coffee product under Chapter 0901.",
          attributes,
          missingFields: [],
          ambiguities,
          evidence: rawEvidence,
          sourceText: text,
          notes: payload.notes,
        }
      }

      const missingFields: (keyof CoffeeExtraction)[] = []
      if (attributes.productType === "unknown") missingFields.push("productType")
      if (attributes.roasted === "unknown") missingFields.push("roasted")
      if (attributes.decaffeinated === "unknown") missingFields.push("decaffeinated")
      if (attributes.presentation === "unknown") missingFields.push("presentation")
      if (attributes.form === "unknown") missingFields.push("form")
      if (attributes.grade === "unknown") missingFields.push("grade")

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
      body: JSON.stringify({ productCategory: "coffee", text }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const code = (errorBody.errorCode ?? "AI_PROVIDER_ERROR") as AIExtractionErrorCode
      const message = (errorBody.message ?? `HTTP error ${response.status}`) as string
      return createErrorResult(code, message, text)
    }

    const data = (await response.json()) as CoffeeExtractionResult

    // Validate payload shape
    const validation = validateCoffeeExtraction(data.attributes)
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
