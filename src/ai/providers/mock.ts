// ============================================================
// Mock Extraction Provider — Phase 4B
//
// Deterministic mock provider for offline development and unit tests.
// Requires zero network access and produces predictable fixtures.
// ============================================================

import { EXTRACTION_EXAMPLES } from "@/ai/examples"
import type {
  ProviderExtractionPayload,
  ProviderOptions,
  TeaExtractionProvider,
} from "@/ai/providers/types"

export interface MockRule {
  pattern: string | RegExp
  response?: ProviderExtractionPayload
  error?: Error
}

export class MockTeaExtractionProvider implements TeaExtractionProvider {
  readonly name = "mock"
  private rules: MockRule[] = []
  private defaultDelayMs = 0

  constructor(rules?: MockRule[]) {
    if (rules) {
      this.rules = [...rules]
    }
  }

  /**
   * Registers a mock rule matching an input string or regex pattern.
   */
  addRule(rule: MockRule): this {
    this.rules.push(rule)
    return this
  }

  /**
   * Clears all custom mock rules.
   */
  clearRules(): this {
    this.rules = []
    return this
  }

  /**
   * Sets simulated delay in milliseconds.
   */
  setDelay(ms: number): this {
    this.defaultDelayMs = ms
    return this
  }

  async extract(
    text: string,
    options?: ProviderOptions
  ): Promise<ProviderExtractionPayload> {
    if (options?.signal?.aborted) {
      throw new Error("AbortError: Operation was aborted.")
    }

    if (this.defaultDelayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), this.defaultDelayMs)
        if (options?.signal) {
          options.signal.addEventListener("abort", () => {
            clearTimeout(timer)
            reject(new Error("AbortError: Operation was aborted."))
          })
        }
      })
    }

    // 1. Check custom rules
    for (const rule of this.rules) {
      const matches =
        typeof rule.pattern === "string"
          ? text.toLowerCase().includes(rule.pattern.toLowerCase())
          : rule.pattern.test(text)

      if (matches) {
        if (rule.error) {
          throw rule.error
        }
        if ("response" in rule) {
          return rule.response as ProviderExtractionPayload
        }
      }
    }

    // 2. Check EXTRACTION_EXAMPLES benchmark fixtures
    const normalizedInput = text.trim().toLowerCase()
    for (const ex of EXTRACTION_EXAMPLES) {
      if (
        normalizedInput.includes(ex.sourceText.trim().toLowerCase()) ||
        ex.sourceText.trim().toLowerCase().includes(normalizedInput)
      ) {
        return {
          attributes: { ...ex.expectedExtraction },
          evidence: [...ex.expectedResult.evidence],
          ambiguities: [...ex.expectedResult.ambiguities],
          notes: ex.expectedResult.notes,
        }
      }
    }

    // 3. Fallback mock extraction
    return {
      attributes: {
        productCategory: "tea",
        teaType: "unknown",
        presentation: "unknown",
        form: "unknown",
        netWeight: null,
        weightUnit: null,
      },
      evidence: [],
      ambiguities: [],
      notes: "Default mock fallback extraction.",
    }
  }
}
