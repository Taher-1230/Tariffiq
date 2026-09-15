// ============================================================
// Product Architecture Tests — Phase 5C-A
//
// Verifies the generic product abstraction layer:
//   1. ProductRegistry contains Tea.
//   2. Tea resolves to correct classifier/extractor/requirements.
//   3. Unsupported products are rejected.
//   4. Generic classifyProduct("tea") matches classifyTea().
//   5. Product-specific tariff data remains isolated.
//   6. No duplicate classifiers or tariff data.
//   7. AI extraction invariant (no HS codes in extraction).
//   8. ReasoningStep[] compatibility.
//
// INVARIANT: No Coffee or Spice rules are tested or expected.
// ============================================================

import { describe, it, expect } from "vitest"

import { productRegistry } from "@/products/registry"
import { classifyProduct } from "@/products/classify"
import { getRequiredInformation } from "@/products/requirements"
import { teaRegistration } from "@/products/tea/index"
import { teaProductDefinition } from "@/products/tea/definition"
import "@/products/coffee/index"
import "@/products/spices/index"

import { classifyTea } from "@/engine/teaClassifier"
import { getRequiredTeaInformation } from "@/engine/getRequiredTeaInformation"
import type { TeaClassificationInput } from "@/types/classification"
import type { TeaClassificationResult, ClassifiedResult, RequiredInformationAnalysis } from "@/engine/types"

// ── Test Inputs ──────────────────────────────────────────────

const GREEN_TEA_BULK_LEAF: TeaClassificationInput = {
  productCategory: "tea",
  teaType: "green",
  presentation: "bulk",
  form: "whole_leaf",
}

const BLACK_TEA_IMMEDIATE: TeaClassificationInput = {
  productCategory: "tea",
  teaType: "black",
  presentation: "immediate_packing",
  form: "whole_leaf",
  netWeight: 500,
  weightUnit: "g",
}

const PARTIAL_INPUT: Partial<TeaClassificationInput> = {
  productCategory: "tea",
  teaType: "green",
}

// ── 1. ProductRegistry ───────────────────────────────────────

describe("ProductRegistry", () => {
  it("1. Contains Tea", () => {
    expect(productRegistry.isSupported("tea")).toBe(true)
  })

  it("2. Tea registration has correct definition", () => {
    const reg = productRegistry.get("tea")
    expect(reg).toBeDefined()
    expect(reg!.definition.id).toBe("tea")
    expect(reg!.definition.displayName).toBe("Tea")
    expect(reg!.definition.hsChapter).toBe("09")
    expect(reg!.definition.supportsAI).toBe(true)
    expect(reg!.definition.supportsManualClassification).toBe(true)
  })

  it("3. getSupportedProducts returns Tea, Coffee and Spices", () => {
    const products = productRegistry.getSupportedProducts()
    expect(products).toHaveLength(3)
    expect(products.map((p) => p.id).sort()).toEqual(["coffee", "spices", "tea"])
  })

  it("4. getSupportedCategories returns ['tea', 'coffee', 'spices']", () => {
    expect(productRegistry.getSupportedCategories().sort()).toEqual(["coffee", "spices", "tea"])
  })

  it("5. Supported product 'coffee' is in registry", () => {
    expect(productRegistry.isSupported("coffee")).toBe(true)
    expect(productRegistry.get("coffee")).toBeDefined()
  })

  it("5b. Supported product 'spices' is in registry", () => {
    expect(productRegistry.isSupported("spices")).toBe(true)
    expect(productRegistry.get("spices")).toBeDefined()
  })

  it("6. Unsupported product 'electronics' is not in registry", () => {
    expect(productRegistry.isSupported("electronics")).toBe(false)
  })

  it("7. getOrThrow throws for unsupported product 'electronics'", () => {
    expect(() => productRegistry.getOrThrow("electronics")).toThrow(
      /Unsupported product category: "electronics"/
    )
  })
})

// ── 2. Tea Resolves to Correct Implementations ──────────────

describe("Tea Registration", () => {
  it("8. Tea resolves to Tea classifier", () => {
    const reg = productRegistry.get("tea")!
    const result = reg.engine.classify(GREEN_TEA_BULK_LEAF)
    expect(result).toBeDefined()
    const typedResult = result as TeaClassificationResult
    expect(typedResult.status).toBe("classified")
  })

  it("9. Tea resolves to Tea requirements provider", () => {
    const reg = productRegistry.get("tea")!
    const result = reg.engine.getRequiredInformation(PARTIAL_INPUT)
    expect(result).toBeDefined()
    const typedResult = result as RequiredInformationAnalysis
    expect(typedResult).toHaveProperty("sufficient")
    expect(typedResult).toHaveProperty("fieldStatus")
  })

  it("10. Tea resolves to Tea extractor (validate)", () => {
    const reg = productRegistry.get("tea")!
    const valid = reg.extractor.validate({
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
      netWeight: null,
      weightUnit: null,
    })
    expect(valid.valid).toBe(true)
    expect(valid.errors).toEqual([])
  })

  it("11. Tea resolves to Tea extractor (toClassificationInput)", () => {
    const reg = productRegistry.get("tea")!
    const result = reg.extractor.toClassificationInput({
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
      netWeight: null,
      weightUnit: null,
    })
    expect(result).toBeDefined()
    const typedResult = result as { success: boolean }
    expect(typedResult.success).toBe(true)
  })

  it("12. Tea product definition matches expected values", () => {
    expect(teaProductDefinition.id).toBe("tea")
    expect(teaProductDefinition.name).toBe("tea")
    expect(teaProductDefinition.displayName).toBe("Tea")
  })

  it("13. teaRegistration is the same as what's in the registry", () => {
    const fromRegistry = productRegistry.get("tea")
    expect(fromRegistry).toBe(teaRegistration)
  })
})

// ── 3. Generic classifyProduct Equivalence ──────────────────

describe("classifyProduct equivalence with classifyTea", () => {
  it("14. classifyProduct('tea') for green bulk leaf matches classifyTea()", () => {
    const genericResult = classifyProduct("tea", GREEN_TEA_BULK_LEAF) as ClassifiedResult
    const directResult = classifyTea(GREEN_TEA_BULK_LEAF) as ClassifiedResult

    expect(genericResult.status).toBe(directResult.status)
    expect(genericResult.hsCode).toBe(directResult.hsCode)
    expect(genericResult.hsCodeFormatted).toBe(directResult.hsCodeFormatted)
    expect(genericResult.matchedRuleId).toBe(directResult.matchedRuleId)
    expect(genericResult.description).toBe(directResult.description)
  })

  it("15. classifyProduct('tea') for black immediate packing matches classifyTea()", () => {
    const genericResult = classifyProduct("tea", BLACK_TEA_IMMEDIATE) as ClassifiedResult
    const directResult = classifyTea(BLACK_TEA_IMMEDIATE) as ClassifiedResult

    expect(genericResult.status).toBe(directResult.status)
    expect(genericResult.hsCode).toBe(directResult.hsCode)
    expect(genericResult.hsCodeFormatted).toBe(directResult.hsCodeFormatted)
    expect(genericResult.matchedRuleId).toBe(directResult.matchedRuleId)
    expect(genericResult.reasoning).toEqual(directResult.reasoning)
    expect(genericResult.structuredExplanation).toEqual(directResult.structuredExplanation)
    expect(genericResult.classificationPath).toEqual(directResult.classificationPath)
  })

  it("16. classifyProduct throws for unsupported product 'electronics'", () => {
    expect(() => classifyProduct("electronics" as any, {})).toThrow(/Unsupported product category/)
  })

  it("17. classifyProduct('tea') with invalid input returns insufficient_information", () => {
    const result = classifyProduct("tea", { productCategory: "tea" }) as TeaClassificationResult
    expect(result.status).toBe("insufficient_information")
  })
})

// ── 4. Generic getRequiredInformation Equivalence ────────────

describe("getRequiredInformation equivalence with getRequiredTeaInformation", () => {
  it("18. getRequiredInformation('tea') matches getRequiredTeaInformation()", () => {
    const genericResult = getRequiredInformation("tea", PARTIAL_INPUT) as RequiredInformationAnalysis
    const directResult = getRequiredTeaInformation(PARTIAL_INPUT)

    expect(genericResult.sufficient).toBe(directResult.sufficient)
    expect(genericResult.missingFields).toEqual(directResult.missingFields)
    expect(genericResult.fieldStatus).toEqual(directResult.fieldStatus)
  })

  it("19. getRequiredInformation throws for unsupported product", () => {
    expect(() => getRequiredInformation("electronics" as any, {})).toThrow(/Unsupported product category/)
  })
})

// ── 5. AI Extraction Invariant ──────────────────────────────

describe("AI Extraction Invariant", () => {
  it("20. Tea extractor validation rejects HS code fields", () => {
    const reg = productRegistry.get("tea")!
    const result = reg.extractor.validate({
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
      netWeight: null,
      weightUnit: null,
      hsCode: "09021010",
    })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFieldsFound.length).toBeGreaterThan(0)
  })

  it("21. Tea extractor validation rejects classification fields", () => {
    const reg = productRegistry.get("tea")!
    const result = reg.extractor.validate({
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
      netWeight: null,
      weightUnit: null,
      classification: "some value",
      chapter: "09",
    })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFieldsFound).toContain("classification")
    expect(result.forbiddenFieldsFound).toContain("chapter")
  })
})

// ── 6. Product-Specific Tariff Data Isolation ───────────────

describe("Tariff Data Isolation", () => {
  it("22. Tea classification uses tea_rules.json data (produces valid HS codes)", () => {
    const result = classifyProduct("tea", GREEN_TEA_BULK_LEAF) as ClassifiedResult
    expect(result.hsCode).toMatch(/^0902/)
  })

  it("23. Tea classification path starts with Chapter 09", () => {
    const result = classifyProduct("tea", GREEN_TEA_BULK_LEAF) as ClassifiedResult
    expect(result.classificationPath[0].code).toBe("09")
    expect(result.classificationPath[0].description).toContain("Coffee, tea")
  })
})

// ── 7. Reasoning Trace Compatibility ─────────────────────────

describe("Reasoning Trace Compatibility", () => {
  it("24. classifyProduct produces ReasoningStep[] with expected structure", () => {
    const result = classifyProduct("tea", BLACK_TEA_IMMEDIATE) as ClassifiedResult
    expect(result.reasoning).toBeDefined()
    expect(Array.isArray(result.reasoning)).toBe(true)
    expect(result.reasoning.length).toBeGreaterThan(0)

    for (const step of result.reasoning) {
      expect(step).toHaveProperty("step")
      expect(step).toHaveProperty("label")
      expect(step).toHaveProperty("value")
      expect(step).toHaveProperty("result")
      expect(typeof step.step).toBe("number")
      expect(typeof step.label).toBe("string")
    }
  })

  it("25. classifyProduct produces StructuredExplanation with expected structure", () => {
    const result = classifyProduct("tea", GREEN_TEA_BULK_LEAF) as ClassifiedResult
    expect(result.structuredExplanation).toBeDefined()
    expect(result.structuredExplanation.productType).toBe("Tea")
    expect(result.structuredExplanation.teaType).toContain("Green")
    expect(result.structuredExplanation.matchedRuleId).toMatch(/^TEA-/)
  })
})

// ── 8. Security: Client Cannot Select Arbitrary Implementation ─

describe("Security Invariants", () => {
  it("26. Client-provided string only resolves registered products", () => {
    // Simulates a malicious client trying arbitrary product categories
    const maliciousCategories = ["COFFEE", "Tea", "TEA", "__proto__", "constructor", ""]
    for (const cat of maliciousCategories) {
      expect(productRegistry.isSupported(cat)).toBe(false)
    }
  })

  it("27. Only lowercase 'tea' is accepted", () => {
    expect(productRegistry.isSupported("tea")).toBe(true)
    expect(productRegistry.isSupported("Tea")).toBe(false)
    expect(productRegistry.isSupported("TEA")).toBe(false)
  })
})

// ── 9. No Duplicate Implementations ──────────────────────────

describe("No Duplicate Implementations", () => {
  it("28. Double registration of Tea is prevented", () => {
    // The registry should throw on duplicate registration
    expect(() => productRegistry.register(teaRegistration)).toThrow(
      /Product "tea" is already registered/
    )
  })
})
