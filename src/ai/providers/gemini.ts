// ============================================================
// Google Gemini Extraction Provider — Phase 4B
//
// Implements TeaExtractionProvider using the official @google/genai SDK
// with structured JSON Schema output enforcement.
//
// SECURITY NOTICE:
// Client-side API key usage via VITE_GEMINI_API_KEY is suitable only
// for local development and prototyping. Production deployments must
// route AI requests through a secure backend server.
// ============================================================

import { GoogleGenAI } from "@google/genai"
import { DEFAULT_GEMINI_MODEL } from "@/ai/config"
import {
  GEMINI_TEA_EXTRACTION_SCHEMA,
  TEA_EXTRACTION_SYSTEM_PROMPT,
} from "@/ai/prompts/teaExtractionPrompt"
import type {
  ProviderExtractionPayload,
  ProviderOptions,
  TeaExtractionProvider,
} from "@/ai/providers/types"
import type { AIExtractionErrorCode } from "@/ai/types"

export interface GeminiProviderConfig {
  apiKey?: string
  model?: string
  timeoutMs?: number
}

export class GeminiProviderError extends Error {
  readonly errorCode: AIExtractionErrorCode
  readonly cause?: unknown

  constructor(errorCode: AIExtractionErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = "GeminiProviderError"
    this.errorCode = errorCode
    this.cause = cause
  }
}

/**
 * Reads the Gemini API key from available environment sources.
 * Used only by the live test — production uses the server-side service.
 */
function resolveApiKey(): string {
  let key = ""
  if (typeof import.meta !== "undefined" && import.meta.env) {
    key = import.meta.env.GEMINI_API_KEY || ""
  }
  if (!key && typeof process !== "undefined" && process.env) {
    key = process.env.GEMINI_API_KEY || ""
  }
  return key
}

function resolveModel(): string {
  let model = ""
  if (typeof import.meta !== "undefined" && import.meta.env) {
    model = import.meta.env.GEMINI_MODEL || ""
  }
  if (!model && typeof process !== "undefined" && process.env) {
    model = process.env.GEMINI_MODEL || ""
  }
  return model || DEFAULT_GEMINI_MODEL
}

export class GeminiTeaExtractionProvider implements TeaExtractionProvider {
  readonly name = "gemini"
  private readonly apiKey: string
  private readonly model: string
  private readonly defaultTimeoutMs: number

  constructor(config?: GeminiProviderConfig) {
    this.apiKey = config?.apiKey ?? resolveApiKey()
    this.model = config?.model ?? resolveModel()
    this.defaultTimeoutMs = config?.timeoutMs ?? 20_000
  }

  /**
   * Checks whether an API key is configured.
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0)
  }

  async extract(
    text: string,
    options?: ProviderOptions
  ): Promise<ProviderExtractionPayload> {
    if (!this.isConfigured()) {
      throw new GeminiProviderError(
        "AI_PROVIDER_NOT_CONFIGURED",
        "Gemini API key is not configured. Set GEMINI_API_KEY or VITE_GEMINI_API_KEY in your environment."
      )
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs
    let attempt = 0
    const maxAttempts = 2 // 1 initial attempt + 1 retry for transient network errors

    while (attempt < maxAttempts) {
      attempt++
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      if (options?.signal) {
        options.signal.addEventListener("abort", () => controller.abort(), {
          once: true,
        })
      }

      try {
        const response = await ai.models.generateContent({
          model: this.model,
          contents: `Extract structured tea attributes from the following description:\n\n"${text}"`,
          config: {
            systemInstruction: TEA_EXTRACTION_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: GEMINI_TEA_EXTRACTION_SCHEMA,
            temperature: 0.0,
          },
        })

        clearTimeout(timer)

        const rawContent = response.text
        if (!rawContent || rawContent.trim().length === 0) {
          throw new GeminiProviderError(
            "INVALID_AI_RESPONSE",
            "Gemini returned an empty completion message."
          )
        }

        let parsed: unknown
        try {
          parsed = JSON.parse(rawContent)
        } catch (jsonErr) {
          throw new GeminiProviderError(
            "INVALID_AI_RESPONSE",
            "Failed to parse JSON response from Gemini.",
            jsonErr
          )
        }

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new GeminiProviderError(
            "INVALID_AI_RESPONSE",
            "Gemini response root must be a JSON object."
          )
        }

        const parsedRecord = parsed as Record<string, unknown>
        const evidence = Array.isArray(parsedRecord.evidence)
          ? (parsedRecord.evidence as ProviderExtractionPayload["evidence"])
          : []
        const ambiguities = Array.isArray(parsedRecord.ambiguities)
          ? (parsedRecord.ambiguities as ProviderExtractionPayload["ambiguities"])
          : []
        const notes =
          typeof parsedRecord.notes === "string"
            ? parsedRecord.notes
            : undefined

        // Clean attributes (separate evidence/ambiguities/notes from attributes block)
        const attributes: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(parsedRecord)) {
          if (k !== "evidence" && k !== "ambiguities" && k !== "notes") {
            attributes[k] = v
          }
        }

        return {
          attributes,
          evidence,
          ambiguities,
          notes,
        }
      } catch (err: unknown) {
        clearTimeout(timer)

        if (err instanceof GeminiProviderError) {
          if (
            err.errorCode === "INVALID_AI_RESPONSE" ||
            err.errorCode === "AI_PROVIDER_NOT_CONFIGURED"
          ) {
            throw err
          }
        }

        const isTimeout =
          controller.signal.aborted ||
          (err instanceof Error && err.name === "AbortError")
        if (isTimeout) {
          throw new GeminiProviderError(
            "AI_TIMEOUT",
            `AI extraction timed out after ${timeoutMs / 1000}s.`,
            err
          )
        }

        // Inspect error messages / status codes from @google/genai
        const errorMsg = err instanceof Error ? err.message : String(err)
        const lowerMsg = errorMsg.toLowerCase()

        if (
          lowerMsg.includes("api_key_invalid") ||
          lowerMsg.includes("unauthenticated") ||
          lowerMsg.includes("permission_denied") ||
          lowerMsg.includes("401") ||
          lowerMsg.includes("403")
        ) {
          throw new GeminiProviderError(
            "AI_AUTHENTICATION_ERROR",
            "Gemini API authentication failed. Verify your GEMINI_API_KEY.",
            err
          )
        }

        if (
          lowerMsg.includes("resource_exhausted") ||
          lowerMsg.includes("quota") ||
          lowerMsg.includes("rate limit") ||
          lowerMsg.includes("429")
        ) {
          throw new GeminiProviderError(
            "AI_RATE_LIMITED",
            "Gemini API rate limit or quota exceeded. Please try again shortly.",
            err
          )
        }

        // Retry once for transient network / 5xx errors
        if (attempt < maxAttempts) {
          continue
        }

        if (lowerMsg.includes("fetch") || lowerMsg.includes("network")) {
          throw new GeminiProviderError(
            "AI_NETWORK_ERROR",
            `Network error contacting Gemini: ${errorMsg}`,
            err
          )
        }

        throw new GeminiProviderError(
          "AI_PROVIDER_ERROR",
          `Gemini API error: ${errorMsg}`,
          err
        )
      }
    }

    throw new GeminiProviderError(
      "AI_NETWORK_ERROR",
      "Failed to obtain AI extraction from Gemini after retry."
    )
  }
}
