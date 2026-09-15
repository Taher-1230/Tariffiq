// ============================================================
// Google Gemini Extractor Service & Provider Tests — Phase 4B
//
// Verifies the end-to-end extraction pipeline using MockTeaExtractionProvider:
//   - Input validation (empty, whitespace, length limit)
//   - Extraction contract enforcement
//   - Strict HS code & classification field rejection
//   - Evidence span verification
//   - Gemini provider error normalization (auth, rate limit, quota, timeout, network)
//   - Critical invariants (Extraction != Classification)
// ============================================================

import { describe, it, expect } from "vitest"
import {
  extractTeaDescription,
  MockTeaExtractionProvider,
  MAX_INPUT_LENGTH,
  toTeaClassificationInput,
} from "@/ai/index"
import { GeminiTeaExtractionProvider, GeminiProviderError } from "@/ai/providers/gemini"
import { classifyTea } from "@/engine/index"

describe("Google Gemini Extractor Service (Phase 4B)", () => {
  // ── 1. Fully specified Black Tea ──────────────────────────
  it("1. Extracts fully specified black tea in retail packs", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Premium black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "immediate_packing",
            form: "whole_leaf",
            netWeight: 500,
            weightUnit: "g",
            weightPrecision: "exact",
          },
          evidence: [
            { field: "teaType", sourceText: "black tea" },
            { field: "netWeight", sourceText: "500g" },
          ],
          ambiguities: [],
        },
      },
    ])

    const result = await extractTeaDescription(
      "Premium black tea, whole leaf, packed in 500g retail packs.",
      { provider }
    )

    expect(result.status).toBe("extracted")
    expect(result.attributes.teaType).toBe("black")
    expect(result.attributes.presentation).toBe("immediate_packing")
    expect(result.attributes.netWeight).toBe(500)
    expect(result.attributes.weightUnit).toBe("g")
    expect(result.evidence.length).toBe(2)
  })

  // ── 2. Fully specified Green Tea ──────────────────────────
  it("2. Extracts fully specified green tea in bulk kilograms", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Green tea leaves",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "green",
            presentation: "bulk",
            form: "whole_leaf",
            netWeight: 2,
            weightUnit: "kg",
            weightPrecision: "exact",
          },
          evidence: [{ field: "teaType", sourceText: "Green tea" }],
          ambiguities: [],
        },
      },
    ])

    const result = await extractTeaDescription("Green tea leaves, 2 kg bulk bag.", {
      provider,
    })

    expect(result.status).toBe("extracted")
    expect(result.attributes.teaType).toBe("green")
    expect(result.attributes.presentation).toBe("bulk")
    expect(result.attributes.netWeight).toBe(2)
    expect(result.attributes.weightUnit).toBe("kg")
  })

  // ── 3. Black Tea Bags ─────────────────────────────────────
  it("3. Extracts black tea bags with unstated presentation", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Black tea bags",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "unknown",
            form: "tea_bags",
            netWeight: 100,
            weightUnit: "g",
          },
          evidence: [],
          ambiguities: [],
        },
      },
    ])

    const result = await extractTeaDescription("Black tea bags, 100 g.", {
      provider,
    })

    expect(result.status).toBe("extracted")
    expect(result.attributes.form).toBe("tea_bags")
    expect(result.attributes.presentation).toBe("unknown")
    expect(result.missingFields).toContain("presentation")
  })

  // ── 4. Missing Tea Type ───────────────────────────────────
  it("4. Flags missing tea type as needs_clarification", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Tea leaves, 500g",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "unknown",
            presentation: "unknown",
            form: "whole_leaf",
            netWeight: 500,
            weightUnit: "g",
          },
          evidence: [],
          ambiguities: [],
        },
      },
    ])

    const result = await extractTeaDescription("Tea leaves, 500g.", { provider })

    expect(result.status).toBe("needs_clarification")
    expect(result.attributes.teaType).toBe("unknown")
    expect(result.missingFields).toContain("teaType")
  })

  // ── 5. Missing Weight ─────────────────────────────────────
  it("5. Handles missing weight (null) cleanly", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Loose black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "bulk",
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
          },
          evidence: [],
          ambiguities: [],
        },
      },
    ])

    const result = await extractTeaDescription("Loose black tea in bulk.", {
      provider,
    })

    expect(result.status).toBe("extracted")
    expect(result.attributes.netWeight).toBeNull()
    expect(result.missingFields).toContain("netWeight")
  })

  // ── 6. Approximate Weight ─────────────────────────────────
  it("6. Preserves approximate weight metadata", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "approximately 1 kg",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "unknown",
            form: "unknown",
            netWeight: 1,
            weightUnit: "kg",
            weightPrecision: "approximate",
          },
          evidence: [{ field: "netWeight", sourceText: "approximately 1 kg" }],
          ambiguities: [],
        },
      },
    ])

    const result = await extractTeaDescription(
      "Black tea, approximately 1 kg package.",
      { provider }
    )

    expect(result.attributes.weightPrecision).toBe("approximate")
    expect(result.attributes.netWeight).toBe(1)
  })

  // ── 7. Explicit Uncertainty ───────────────────────────────
  it("7. Preserves explicit user uncertainty ('not_sure')", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "might be black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "not_sure",
            presentation: "unknown",
            form: "unknown",
            netWeight: 1,
            weightUnit: "kg",
            weightPrecision: "approximate",
          },
          evidence: [],
          ambiguities: [
            {
              field: "teaType",
              candidates: ["black"],
              reason: "User stated: 'I think this might be black tea'.",
            },
          ],
        },
      },
    ])

    const result = await extractTeaDescription(
      "I think this might be black tea, about 1 kg.",
      { provider }
    )

    expect(result.status).toBe("needs_clarification")
    expect(result.attributes.teaType).toBe("not_sure")
    expect(result.attributes.weightPrecision).toBe("approximate")
  })

  // ── 8. Multiple Possible Tea Types ────────────────────────
  it("8. Handles multiple possible tea types as ambiguities", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Black or green",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "unknown",
            presentation: "unknown",
            form: "whole_leaf",
            netWeight: 200,
            weightUnit: "g",
          },
          evidence: [],
          ambiguities: [
            {
              field: "teaType",
              candidates: ["black", "green"],
              reason: "The description identifies multiple possible tea types.",
            },
          ],
        },
      },
    ])

    const result = await extractTeaDescription("Black or green tea, 200g.", {
      provider,
    })

    expect(result.status).toBe("needs_clarification")
    expect(result.ambiguities.length).toBe(1)
    expect(result.ambiguities[0].candidates).toEqual(["black", "green"])
  })

  // ── 9. Unsupported Coffee Input ───────────────────────────
  it("9. Returns unsupported status for non-tea products", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "coffee beans",
        response: {
          attributes: {
            productCategory: "unknown",
            teaType: "unknown",
            presentation: "unknown",
            form: "unknown",
            netWeight: 500,
            weightUnit: "g",
          },
          evidence: [],
          ambiguities: [],
          notes: "Coffee is outside Chapter 0902.",
        },
      },
    ])

    const result = await extractTeaDescription("Arabica coffee beans, 500g.", {
      provider,
    })

    expect(result.status).toBe("unsupported")
    expect(result.attributes.productCategory).toBe("unknown")
  })

  // ── 10. Empty Input ───────────────────────────────────────
  it("10. Returns error for empty input without calling provider", async () => {
    const result = await extractTeaDescription("")
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("EMPTY_INPUT")
  })

  // ── 11. Whitespace-only Input ────────────────────────────
  it("11. Returns error for whitespace-only input", async () => {
    const result = await extractTeaDescription("     \n\t  ")
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("EMPTY_INPUT")
  })

  // ── 12. Excessively Long Input ───────────────────────────
  it("12. Returns error when input exceeds MAX_INPUT_LENGTH", async () => {
    const longText = "a".repeat(MAX_INPUT_LENGTH + 1)
    const result = await extractTeaDescription(longText)
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INPUT_TOO_LONG")
  })

  // ── 13. Invalid Model Output (null/non-object) ───────────
  it("13. Rejects invalid provider response payload", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "test",
        response: null as unknown as undefined,
      },
    ])

    const result = await extractTeaDescription("test product", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 14. Gemini Output Containing hsCode (Critical Test) ───
  it("14. Critical Security Invariant: Gemini output containing hsCode is rejected", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "immediate_packing",
            form: "whole_leaf",
            netWeight: 500,
            weightUnit: "g",
            hsCode: "09023020", // FORBIDDEN FIELD
          },
        },
      },
    ])

    const result = await extractTeaDescription("black tea in 500g packs", {
      provider,
    })

    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
    expect(result.errorMessage).toMatch(/forbidden classification field/i)
  })

  // ── 15. Gemini Output Containing classification (Critical Test) ──
  it("15. Critical Security Invariant: Gemini output containing classification is rejected", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "bulk",
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
            classification: "0902 40 20", // FORBIDDEN FIELD
          },
        },
      },
    ])

    const result = await extractTeaDescription("black tea", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 16. Gemini Output Containing tariffCode ───────────────
  it("16. Critical Security Invariant: Gemini output containing tariffCode is rejected", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "bulk",
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
            tariff_code: "09024020", // FORBIDDEN FIELD
          },
        },
      },
    ])

    const result = await extractTeaDescription("black tea", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 17. Unknown Extra Field ───────────────────────────────
  it("17. Rejects extraction containing unsupported extra attributes", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "bulk",
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
            brand: "Twinings", // UNSUPPORTED FIELD
            originCountry: "Sri Lanka", // UNSUPPORTED FIELD
          },
        },
      },
    ])

    const result = await extractTeaDescription("black tea from Twinings", {
      provider,
    })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
    expect(result.errorMessage).toMatch(/unsupported attribute/i)
  })

  // ── 18. Invalid Weight (Negative) ─────────────────────────
  it("18. Rejects negative netWeight", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "bulk",
            form: "whole_leaf",
            netWeight: -100,
            weightUnit: "g",
          },
        },
      },
    ])

    const result = await extractTeaDescription("tea with invalid weight", {
      provider,
    })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 19. Invalid Tea Type ──────────────────────────────────
  it("19. Rejects invalid teaType enum value", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "herbal_chamomile", // INVALID ENUM
            presentation: "bulk",
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
          },
        },
      },
    ])

    const result = await extractTeaDescription("chamomile tea", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 20. Invalid Presentation ──────────────────────────────
  it("20. Rejects invalid presentation enum value", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "glass_bottle", // INVALID ENUM
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
          },
        },
      },
    ])

    const result = await extractTeaDescription("tea in glass bottle", {
      provider,
    })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 21. Invalid Form ──────────────────────────────────────
  it("21. Rejects invalid form enum value", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "bulk",
            form: "liquid_syrup", // INVALID ENUM
            netWeight: null,
            weightUnit: null,
          },
        },
      },
    ])

    const result = await extractTeaDescription("tea syrup", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })

  // ── 22. Missing API Configuration ─────────────────────────
  it("22. Handles unconfigured Gemini provider cleanly", async () => {
    const provider = new GeminiTeaExtractionProvider({ apiKey: "" })
    const result = await extractTeaDescription("black tea", { provider })

    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("AI_PROVIDER_NOT_CONFIGURED")
    expect(result.errorMessage).toMatch(/gemini api key is not configured/i)
  })

  // ── 23. Provider Rate Limit / Quota Exceeded ──────────────
  it("23. Handles provider rate limiting and quota errors", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "tea",
        error: new GeminiProviderError(
          "AI_RATE_LIMITED",
          "Gemini API rate limit or quota exceeded."
        ),
      },
    ])

    const result = await extractTeaDescription("black tea", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("AI_RATE_LIMITED")
  })

  // ── 24. Provider Network Failure ──────────────────────────
  it("24. Handles network communication errors", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "tea",
        error: new GeminiProviderError(
          "AI_NETWORK_ERROR",
          "Failed to fetch."
        ),
      },
    ])

    const result = await extractTeaDescription("black tea", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("AI_NETWORK_ERROR")
  })

  // ── 25. Provider Timeout ──────────────────────────────────
  it("25. Handles extraction timeout gracefully", async () => {
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "tea",
        error: new GeminiProviderError(
          "AI_TIMEOUT",
          "Extraction request timed out."
        ),
      },
    ])

    const result = await extractTeaDescription("black tea", { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("AI_TIMEOUT")
  })

  // ── 26. Valid Evidence Spans ──────────────────────────────
  it("26. Accepts valid evidence with matching offsets", async () => {
    const text = "Premium black tea, whole leaf."
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Premium black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "unknown",
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
          },
          evidence: [
            {
              field: "teaType",
              sourceText: "black tea",
              startIndex: 8,
              endIndex: 17,
            },
          ],
        },
      },
    ])

    const result = await extractTeaDescription(text, { provider })
    expect(result.status).toBe("extracted")
    expect(result.evidence.length).toBe(1)
    expect(result.evidence[0].sourceText).toBe("black tea")
  })

  // ── 27. Invalid Evidence Spans (Mismatch) ─────────────────
  it("27. Rejects invalid evidence where slice does not match sourceText", async () => {
    const text = "Premium black tea, whole leaf."
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Premium black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "unknown",
            form: "whole_leaf",
            netWeight: null,
            weightUnit: null,
          },
          evidence: [
            {
              field: "teaType",
              sourceText: "green tea", // MISMATCH with slice(8, 17) which is "black tea"
              startIndex: 8,
              endIndex: 17,
            },
          ],
        },
      },
    ])

    const result = await extractTeaDescription(text, { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
    expect(result.errorMessage).toMatch(/does not match text slice/i)
  })

  // ── 28. Separation of Extraction and Classification ───────
  it("28. Critical Safety Invariant: Extractor returns pure facts, rules engine selects HS code", async () => {
    const text = "Organic black tea in 500g retail cartons."
    const provider = new MockTeaExtractionProvider([
      {
        pattern: "Organic black tea",
        response: {
          attributes: {
            productCategory: "tea",
            teaType: "black",
            presentation: "immediate_packing",
            form: "whole_leaf",
            netWeight: 500,
            weightUnit: "g",
          },
        },
      },
    ])

    // Step 1: Extract (Facts only)
    const extractionResult = await extractTeaDescription(text, { provider })
    expect(extractionResult.status).toBe("extracted")
    expect((extractionResult as unknown as Record<string, unknown>).hsCode).toBeUndefined()

    // Step 2: Adapt
    const conversion = toTeaClassificationInput(extractionResult.attributes)
    expect(conversion.success).toBe(true)
    if (!conversion.success) return

    // Step 3: Classify deterministically
    const classification = classifyTea(conversion.input)
    expect(classification.status).toBe("classified")
    if (classification.status === "classified") {
      expect(classification.hsCode).toBe("09023020")
      expect(classification.matchedRuleId).toBe("TEA-011")
    }
  })

  // ── 29. Live Gemini Provider Integration (Conditional) ────
  it.skipIf(!new GeminiTeaExtractionProvider().isConfigured())(
    "29. Live Gemini API extraction test when GEMINI_API_KEY is configured",
    async () => {
      const provider = new GeminiTeaExtractionProvider()
      const result = await extractTeaDescription(
        "Premium black tea, whole leaf, packed in 500g retail packs.",
        { provider }
      )

      expect(result.status).toBe("extracted")
      expect(result.attributes.productCategory).toBe("tea")
      expect(result.attributes.teaType).toBe("black")
      expect(["immediate_packing", "packet"]).toContain(result.attributes.presentation)
      expect(result.attributes.netWeight).toBe(500)
      expect(result.attributes.weightUnit).toBe("g")
      expect((result as unknown as Record<string, unknown>).hsCode).toBeUndefined()
    },
    30000
  )
})
