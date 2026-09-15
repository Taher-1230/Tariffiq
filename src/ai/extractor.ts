// ============================================================
// AI Extractor Service — Phase 4B → Phase 5A
//
// Core service orchestrating natural-language product extraction.
//
// Phase 5A Migration:
//   Default path now calls POST /api/ai/extract-tea instead of
//   invoking the Gemini SDK directly. The API key never reaches
//   the browser.
//
//   The `options.provider` escape hatch is preserved for unit
//   tests using MockTeaExtractionProvider — when a provider is
//   given, it bypasses HTTP and calls the provider directly.
//
// INVARIANT:
//   This service NEVER selects an HS code or calls classifyTea().
// ============================================================

import type {
  ProviderExtractionPayload,
  ProviderOptions,
  TeaExtractionProvider,
} from "@/ai/providers/types"
import type {
  AIExtractionErrorCode,
  ExtractionAmbiguity,
  ExtractionEvidence,
  ExtractionStatus,
  TeaExtraction,
  TeaExtractionResult,
} from "@/ai/types"
import { validateTeaExtraction } from "@/ai/validateTeaExtraction"

export const MAX_INPUT_LENGTH = 10_000

export interface ExtractorOptions extends ProviderOptions {
  provider?: TeaExtractionProvider
}

const DEFAULT_EMPTY_ATTRIBUTES: TeaExtraction = {
  productCategory: "unknown",
  teaType: "unknown",
  presentation: "unknown",
  form: "unknown",
  netWeight: null,
  weightUnit: null,
}

/**
 * Creates an error TeaExtractionResult container.
 */
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
    sourceText: sourceText ?? "",
  }
}

/**
 * Validates that evidence substrings and character offsets conform to source text.
 */
function validateEvidenceSpans(
  evidenceList: ExtractionEvidence[],
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
          error: `Evidence text '${ev.sourceText}' does not match text slice '${slice}' at [${ev.startIndex}, ${ev.endIndex}].`,
        }
      }
    }
  }
  return { valid: true }
}

// ── API-based extraction (Phase 5A default path) ─────────────

async function extractViaApi(
  text: string,
  options?: ProviderOptions
): Promise<TeaExtractionResult> {
  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? 25_000 // slightly longer than server timeout to account for network
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  if (options?.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    })
  }

  try {
    const response = await fetch("/api/ai/extract-tea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (response.ok) {
      const result = (await response.json()) as TeaExtractionResult
      return result
    }

    // Map HTTP error status to appropriate error result
    const errorBody = await response.json().catch(() => null) as Record<string, unknown> | null
    const serverMessage = typeof errorBody?.message === "string" ? errorBody.message : undefined
    const serverErrorCode = typeof errorBody?.errorCode === "string" ? errorBody.errorCode : undefined

    switch (response.status) {
      case 400:
        return createErrorResult(
          "EMPTY_INPUT",
          serverMessage ?? "Invalid product description.",
          text
        )
      case 429:
        return createErrorResult(
          "AI_RATE_LIMITED",
          serverMessage ?? "Too many AI requests. Please try again later.",
          text
        )
      case 502:
      case 503:
        return createErrorResult(
          (serverErrorCode as AIExtractionErrorCode) ?? "AI_PROVIDER_ERROR",
          serverMessage ?? "AI extraction is temporarily unavailable.",
          text
        )
      default:
        return createErrorResult(
          "AI_PROVIDER_ERROR",
          serverMessage ?? "Something went wrong. Please try again.",
          text
        )
    }
  } catch (err: unknown) {
    clearTimeout(timer)

    if (err instanceof Error && (err.name === "AbortError" || controller.signal.aborted)) {
      return createErrorResult(
        "AI_TIMEOUT",
        "AI extraction request timed out.",
        text
      )
    }

    // Network failure
    return createErrorResult(
      "AI_NETWORK_ERROR",
      "Unable to reach AI service. Check your connection and try again.",
      text
    )
  }
}

// ── Provider-based extraction (test/mock path) ───────────────

async function extractViaProvider(
  text: string,
  provider: TeaExtractionProvider,
  options?: ProviderOptions
): Promise<TeaExtractionResult> {
  let payload: ProviderExtractionPayload
  try {
    payload = await provider.extract(text, options)
  } catch (err) {
    const { errorCode, message } = mapProviderError(err)
    return createErrorResult(errorCode, message, text)
  }

  if (!payload || !payload.attributes || typeof payload.attributes !== "object") {
    return createErrorResult(
      "INVALID_AI_RESPONSE",
      "The AI provider returned an invalid or empty response payload.",
      text
    )
  }

  // Validate extraction contract & HS code protection
  const validation = validateTeaExtraction(payload.attributes)
  if (!validation.valid) {
    return createErrorResult(
      "INVALID_AI_RESPONSE",
      `The AI returned an invalid extraction result: ${validation.errors.join("; ")}`,
      text
    )
  }

  const attributes = payload.attributes as unknown as TeaExtraction
  const evidence = (payload.evidence ?? []) as ExtractionEvidence[]
  const evidenceValidation = validateEvidenceSpans(evidence, text)
  if (!evidenceValidation.valid) {
    return createErrorResult(
      "INVALID_AI_RESPONSE",
      `Invalid evidence span returned by AI: ${evidenceValidation.error}`,
      text
    )
  }

  const ambiguities = (payload.ambiguities ?? []) as ExtractionAmbiguity[]

  // Determine missing fields & status
  const missingFields: (keyof TeaExtraction)[] = []

  if (attributes.productCategory === "unknown") {
    missingFields.push("productCategory", "teaType", "presentation", "form")
    return {
      status: "unsupported",
      attributes,
      missingFields,
      ambiguities,
      evidence,
      sourceText: text,
      notes: payload.notes ?? "The product is outside the Chapter 0902 tea scope.",
    }
  }

  if (attributes.teaType === "unknown") missingFields.push("teaType")
  if (attributes.presentation === "unknown") missingFields.push("presentation")
  if (attributes.form === "unknown") missingFields.push("form")
  if (attributes.netWeight === null) missingFields.push("netWeight")

  let status: ExtractionStatus = "extracted"
  if (
    ambiguities.length > 0 ||
    attributes.teaType === "not_sure" ||
    attributes.teaType === "unknown"
  ) {
    status = "needs_clarification"
  }

  return {
    status,
    attributes,
    missingFields,
    ambiguities,
    evidence,
    sourceText: text,
    notes: payload.notes,
  }
}

function mapProviderError(
  err: unknown
): { errorCode: AIExtractionErrorCode; message: string } {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.message.includes("aborted")) {
      return {
        errorCode: "AI_TIMEOUT",
        message: "AI extraction request timed out or was aborted.",
      }
    }
    // Check for GeminiProviderError-style errorCode
    if ("errorCode" in err && typeof (err as Record<string, unknown>).errorCode === "string") {
      return {
        errorCode: (err as Record<string, unknown>).errorCode as AIExtractionErrorCode,
        message: err.message,
      }
    }
    return {
      errorCode: "AI_PROVIDER_ERROR",
      message: err.message,
    }
  }

  return {
    errorCode: "AI_PROVIDER_ERROR",
    message: "An unexpected error occurred during AI extraction.",
  }
}

/**
 * Extracts structured product attributes from a natural-language description.
 *
 * Phase 5A: Default path calls POST /api/ai/extract-tea (server-side Gemini).
 * If options.provider is given (tests), it calls the provider directly.
 *
 * @param text - The natural language product description.
 * @param options - Extraction options (custom provider, timeout, abort signal).
 * @returns Promise resolving to the validated TeaExtractionResult.
 */
export async function extractTeaDescription(
  text: string,
  options?: ExtractorOptions
): Promise<TeaExtractionResult> {
  // ── 1. Validate Input Length & Emptiness ────────────────────

  if (!text || text.trim().length === 0) {
    return createErrorResult(
      "EMPTY_INPUT",
      "Enter a product description to analyze.",
      text ?? ""
    )
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return createErrorResult(
      "INPUT_TOO_LONG",
      `The product description is too long (maximum ${MAX_INPUT_LENGTH} characters; received ${text.length}).`,
      text
    )
  }

  // ── 2. Route to provider (test) or API (production) ────────

  if (options?.provider) {
    return extractViaProvider(text, options.provider, options)
  }

  return extractViaApi(text, options)
}
