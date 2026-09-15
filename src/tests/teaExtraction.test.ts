// ============================================================
// AI Extraction Contract & Boundary Tests — Phase 4A
//
// Verifies:
//   1. Fully specified black tea extraction
//   2. Fully specified green tea extraction
//   3. Black tea bags extraction (presentation unknown)
//   4. Missing / unknown tea type handling
//   5. Missing / unknown weight handling
//   6. Missing / unknown presentation handling
//   7. Approximate weight preservation
//   8. Explicit uncertainty ("not_sure") preservation
//   9. Invalid weight / unit validation
//   10. Unknown / unsupported product category (e.g. coffee)
//   11. Adapter conversion (TeaExtraction → TeaClassificationInput)
//   12. Unknown values are never silently converted into guessed values
//   13. Extraction validation strictly rejects HS code fields
//   14. Evidence spans are preserved
//   15. End-to-end separation: Extraction != Classification
// ============================================================

import { describe, it, expect } from "vitest"
import {
  validateTeaExtraction,
  toTeaClassificationInput,
  EXTRACTION_EXAMPLES,
  buildTeaExtractionPrompt,
} from "@/ai/index"
import type { TeaExtraction } from "@/ai/index"
import { classifyTea } from "@/engine/index"

describe("AI Extraction Contract & Validation (Phase 4A)", () => {
  // ── 1. Fully specified Black Tea ──────────────────────────
  it("1. Validates fully specified black tea extraction", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
      weightPrecision: "exact",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])

    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.teaType).toBe("black")
      expect(conversion.input.netWeight).toBe(500)
    }
  })

  // ── 2. Fully specified Green Tea ──────────────────────────
  it("2. Validates fully specified green tea in bulk", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
      netWeight: 2,
      weightUnit: "kg",
      weightPrecision: "exact",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)

    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.teaType).toBe("green")
      expect(conversion.input.presentation).toBe("bulk")
      expect(conversion.input.netWeight).toBe(2)
      expect(conversion.input.weightUnit).toBe("kg")
    }
  })

  // ── 3. Black Tea Bags (Presentation Unknown) ──────────────
  it("3. Validates black tea bags where presentation is unstated (unknown)", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "black",
      presentation: "unknown",
      form: "tea_bags",
      netWeight: 100,
      weightUnit: "g",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)

    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.presentation).toBeUndefined()
      expect(conversion.input.form).toBe("tea_bags")

      // Should classify under TEA-017 (09024040) since rule does not require presentation
      const result = classifyTea(conversion.input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024040")
      }
    }
  })

  // ── 4. Missing Tea Type (Unknown) ──────────────────────────
  it("4. Handles unknown tea type without guessing", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "unknown",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)

    // Adapter must refuse to convert directly to engine input without clarification
    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(false)
    if (!conversion.success) {
      expect(conversion.missingRequiredFields).toContain("teaType")
      expect(conversion.reason).toMatch(/tea type is unknown/i)
    }
  })

  // ── 5. Missing Weight ──────────────────────────────────────
  it("5. Handles missing weight (null) cleanly", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "whole_leaf",
      netWeight: null,
      weightUnit: null,
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)

    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.netWeight).toBeUndefined()

      // Bulk leaf does not require weight (TEA-015)
      const result = classifyTea(conversion.input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024020")
      }
    }
  })

  // ── 6. Missing Presentation ────────────────────────────────
  it("6. Handles missing presentation (unknown)", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "black",
      presentation: "unknown",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)

    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.presentation).toBeUndefined()
    }
  })

  // ── 7. Approximate Weight ──────────────────────────────────
  it("7. Preserves approximate weight precision metadata", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "black",
      presentation: "unknown",
      form: "whole_leaf",
      netWeight: 1,
      weightUnit: "kg",
      weightPrecision: "approximate",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)
    expect(extraction.weightPrecision).toBe("approximate")
  })

  // ── 8. Explicit Uncertainty (Not Sure) ─────────────────────
  it("8. Preserves explicit user uncertainty ('not_sure')", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "not_sure",
      presentation: "unknown",
      form: "unknown",
      netWeight: null,
      weightUnit: null,
      weightPrecision: "unknown",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)

    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.teaType).toBe("not_sure")

      // Rules engine should reject 'not_sure' deterministically
      const result = classifyTea(conversion.input)
      expect(result.status).toBe("insufficient_information")
    }
  })

  // ── 9. Invalid Weight & Unit Validation ────────────────────
  it("9. Rejects invalid weight and inconsistent units", () => {
    // Negative weight
    expect(
      validateTeaExtraction({
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: -50,
        weightUnit: "g",
      }).valid
    ).toBe(false)

    // Weight provided with null unit
    expect(
      validateTeaExtraction({
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: null,
      }).valid
    ).toBe(false)

    // Unit provided with null weight
    expect(
      validateTeaExtraction({
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: null,
        weightUnit: "g",
      }).valid
    ).toBe(false)
  })

  // ── 10. Unknown / Unsupported Product Category ─────────────
  it("10. Rejects conversion for unsupported non-tea products", () => {
    const extraction: TeaExtraction = {
      productCategory: "unknown",
      teaType: "unknown",
      presentation: "unknown",
      form: "unknown",
      netWeight: 250,
      weightUnit: "g",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)

    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(false)
    if (!conversion.success) {
      expect(conversion.missingRequiredFields).toContain("productCategory")
      expect(conversion.reason).toMatch(/not identified as 'tea'/i)
    }
  })

  // ── 11. Adapter Conversion ─────────────────────────────────
  it("11. Adapter converts clean extraction to valid TeaClassificationInput", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    }
    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input).toEqual({
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      })
    }
  })

  // ── 12. Unknown values never become guessed values ─────────
  it("12. Unknown values are never silently converted to guessed values", () => {
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "unknown",
      presentation: "unknown",
      form: "unknown",
      netWeight: null,
      weightUnit: null,
    }
    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(false)
    // The adapter must not assume "black" or "whole_leaf" or "immediate_packing"
    if (!conversion.success) {
      expect(conversion.missingRequiredFields).toContain("teaType")
    }
  })

  // ── 13. Strict Prohibition of HS Codes in Extraction ───────
  it("13. Validation strictly rejects payloads containing HS codes or classification fields", () => {
    const forbiddenPayloads = [
      {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: null,
        weightUnit: null,
        hsCode: "09024020",
      },
      {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: null,
        weightUnit: null,
        suggestedHsCode: "09024020",
      },
      {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: null,
        weightUnit: null,
        tariff_code: "09024020",
      },
      {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: null,
        weightUnit: null,
        classification: "0902 40 20",
      },
    ]

    for (const payload of forbiddenPayloads) {
      const validation = validateTeaExtraction(payload)
      expect(validation.valid).toBe(false)
      expect(validation.forbiddenFieldsFound.length).toBeGreaterThan(0)
      expect(validation.errors.some((e) => e.includes("forbidden classification field"))).toBe(true)
    }
  })

  // ── 14. Evidence Spans Preservation ────────────────────────
  it("14. Benchmark examples preserve evidence spans correctly", () => {
    for (const example of EXTRACTION_EXAMPLES) {
      const validation = validateTeaExtraction(example.expectedExtraction)
      expect(validation.valid).toBe(true)
      expect(example.expectedResult.evidence).toBeInstanceOf(Array)
      for (const ev of example.expectedResult.evidence) {
        expect(ev.field).toBeTruthy()
        expect(ev.sourceText).toBeTruthy()
      }
    }
  })

  // ── 15. Extraction != Classification Flow ───────────────────
  it("15. Proves Natural-Language Extraction != Classification", () => {
    // 1. Extraction step (pure facts, no HS code)
    const extraction: TeaExtraction = {
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    }
    const validation = validateTeaExtraction(extraction)
    expect(validation.valid).toBe(true)
    expect((extraction as unknown as Record<string, unknown>).hsCode).toBeUndefined()

    // 3. Adapter step
    const conversion = toTeaClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (!conversion.success) return

    // 4. Deterministic classification step (engine assigns HS code)
    const result = classifyTea(conversion.input)
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09023020")
      expect(result.matchedRuleId).toBe("TEA-011")
    }
  })

  // ── 16. Prompt Specification Builder ───────────────────────
  it("16. Prompt template builder includes schema and negative constraints", () => {
    const prompt = buildTeaExtractionPrompt("500g black tea bags")
    expect(prompt.system).toContain("DO NOT determine or suggest an HS code")
    expect(prompt.system).toContain("DO NOT guess or infer missing information")
    expect(prompt.user).toContain("500g black tea bags")
    expect(prompt.schema.properties.teaType).toBeDefined()
    expect(prompt.schema.properties.productCategory).toBeDefined()
  })
})
