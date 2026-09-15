// ============================================================
// AI Provider Abstraction Types — Phase 4B
//
// Defines the provider interface separating vendor-specific
// LLM API communication from the core TariffIQ extraction service.
// ============================================================

export interface ProviderExtractionPayload {
  attributes: Record<string, unknown>
  evidence?: Array<{
    field: string
    sourceText: string
    startIndex?: number
    endIndex?: number
  }>
  ambiguities?: Array<{
    field: string
    candidates: string[]
    reason: string
  }>
  notes?: string
}

export interface ProviderOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Pluggable extraction provider contract.
 * Concrete implementations communicate with specific LLM backends (OpenAI, Anthropic, Mock).
 */
export interface TeaExtractionProvider {
  readonly name: string
  extract(text: string, options?: ProviderOptions): Promise<ProviderExtractionPayload>
}
