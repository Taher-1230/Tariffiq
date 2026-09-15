// ============================================================
// Google Gemini Coffee Extractor Live Tests — Phase 5C-B.2
//
// Conditional live tests that execute against Gemini API ONLY
// when GEMINI_API_KEY is configured in the environment.
// Automatically skipped in standard CI / test runs without API keys.
// ============================================================

import { describe, it, expect } from "vitest"
import { extractCoffeeDescription } from "@/products/coffee/ai/extractor"
import { toCoffeeClassificationInput } from "@/products/coffee/ai/toCoffeeClassificationInput"
import { classifyCoffee } from "@/products/coffee/classifier"
import type { CoffeeClassifiedResult } from "@/products/coffee/types"

const isApiKeyAvailable = Boolean(
  process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
)

describe("Google Gemini Coffee Live Integration (Phase 5C-B.2)", () => {
  it.skipIf(!isApiKeyAvailable)(
    "1. Live Gemini extracts roasted non-decaf coffee in bulk",
    async () => {
      const text = "Roasted Arabica plantation coffee, Grade A, non-decaf, in bulk packing."
      const result = await extractCoffeeDescription(text)

      expect(result.status).toBe("extracted")
      expect(result.attributes.productCategory).toBe("coffee")
      expect(result.attributes.roasted).toBe(true)
      expect(result.attributes.decaffeinated).toBe(false)
      expect(result.attributes.presentation).toBe("bulk")

      // Verify no HS code leakage
      expect((result as unknown as Record<string, unknown>).hsCode).toBeUndefined()

      // Verify deterministic classification boundary
      const conversion = toCoffeeClassificationInput(result.attributes)
      expect(conversion.success).toBe(true)
      if (conversion.success) {
        const classification = classifyCoffee(conversion.input) as CoffeeClassifiedResult
        expect(classification.status).toBe("classified")
        expect(classification.hsCode).toBe("09012110")
      }
    },
    30_000
  )
})
