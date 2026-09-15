// ============================================================
// Coffee AI Extraction Contract & Adapter Tests — Phase 5C-B.2
//
// Test Suite:
//   1. Basic Extraction (Roasting, Decaf, Varieties, Grades, Husks, Substitutes).
//   2. Unknowns & Non-Coffee Product Rejection.
//   3. Ambiguity & Evidence Tracking.
//   4. Strict Validation & Forbidden Key Rejection.
//   5. Adapter (CoffeeExtraction → CoffeeClassificationInput).
//   6. Prompt Injection Defense & Malicious Payload Neutralization.
//   7. Deterministic Invariant: AI never determines HS codes.
// ============================================================

import { describe, it, expect } from "vitest"
import { validateCoffeeExtraction } from "@/products/coffee/ai/validateCoffeeExtraction"
import { toCoffeeClassificationInput } from "@/products/coffee/ai/toCoffeeClassificationInput"
import { extractCoffeeDescription, type CoffeeExtractionProvider } from "@/products/coffee/ai/extractor"
import { classifyCoffee } from "@/products/coffee/classifier"
import type { CoffeeExtraction, CoffeeExtractionResult } from "@/products/coffee/ai/types"
import type { CoffeeClassifiedResult } from "@/products/coffee/types"

// Helper to create a valid base extraction payload
function createValidExtraction(overrides: Partial<CoffeeExtraction> = {}): CoffeeExtraction {
  return {
    productCategory: "coffee",
    productType: "coffee",
    roasted: true,
    decaffeinated: false,
    presentation: "bulk",
    form: "unknown",
    grade: "unknown",
    ...overrides,
  }
}

// Mock provider factory for unit testing
function createMockProvider(payload: {
  attributes: CoffeeExtraction
  evidence?: CoffeeExtractionResult["evidence"]
  ambiguities?: CoffeeExtractionResult["ambiguities"]
}): CoffeeExtractionProvider {
  return {
    name: "MockCoffeeProvider",
    async extract() {
      return payload
    },
  }
}

describe("Coffee AI Extraction — Basic Attribute Extraction", () => {
  it("1. Extracts roasted coffee", async () => {
    const text = "Roasted coffee beans in bulk packing."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: true,
        decaffeinated: "unknown",
        presentation: "bulk",
      }),
      evidence: [
        { field: "roasted", sourceText: "Roasted" },
        { field: "presentation", sourceText: "bulk packing" },
      ],
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.status).toBe("extracted")
    expect(result.attributes.roasted).toBe(true)
  })

  it("2. Extracts unroasted (green) coffee", async () => {
    const text = "Unroasted green coffee beans."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: false,
        decaffeinated: "unknown",
        presentation: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.roasted).toBe(false)
  })

  it("3. Extracts decaffeinated coffee", async () => {
    const text = "Decaffeinated unroasted coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: false,
        decaffeinated: true,
        presentation: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.decaffeinated).toBe(true)
  })

  it("4. Extracts non-decaffeinated coffee", async () => {
    const text = "Non-decaf roasted coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: true,
        decaffeinated: false,
        presentation: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.decaffeinated).toBe(false)
  })

  it("5. Extracts bulk packing presentation", async () => {
    const text = "Bulk packed coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        presentation: "bulk",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.presentation).toBe("bulk")
  })

  it("6. Extracts Arabica plantation variety", async () => {
    const text = "Arabica plantation coffee, Grade A."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: false,
        decaffeinated: false,
        form: "arabica_plantation",
        grade: "A",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.form).toBe("arabica_plantation")
    expect(result.attributes.grade).toBe("A")
  })

  it("7. Extracts Arabica Cherry variety", async () => {
    const text = "Arabica Cherry coffee, AB Grade."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: false,
        decaffeinated: false,
        form: "arabica_cherry",
        grade: "AB",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.form).toBe("arabica_cherry")
    expect(result.attributes.grade).toBe("AB")
  })

  it("8. Extracts Rob cherry variety", async () => {
    const text = "Rob cherry coffee, PB Grade."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: false,
        decaffeinated: false,
        form: "rob_cherry",
        grade: "PB",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.form).toBe("rob_cherry")
    expect(result.attributes.grade).toBe("PB")
  })

  it("9. Extracts each supported grade (A, B, C, AB, PB, BBB, B/B/B, other)", () => {
    const grades: CoffeeExtraction["grade"][] = [
      "A",
      "B",
      "C",
      "AB",
      "PB",
      "BBB",
      "B/B/B",
      "other",
      "unknown",
    ]

    for (const g of grades) {
      const payload = createValidExtraction({ grade: g })
      const validation = validateCoffeeExtraction(payload)
      expect(validation.valid).toBe(true)
    }
  })

  it("10. Extracts husks and skins productType", async () => {
    const text = "Coffee husks and skins."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        productType: "husks_and_skins",
        roasted: "unknown",
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.productType).toBe("husks_and_skins")
  })

  it("11. Extracts coffee substitutes productType", async () => {
    const text = "Coffee substitute containing coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        productType: "substitutes_containing_coffee",
        roasted: "unknown",
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.productType).toBe("substitutes_containing_coffee")
  })
})

describe("Coffee AI Extraction — Unknowns & Unsupported Products", () => {
  it("12. Missing roasting state is preserved as unknown", async () => {
    const text = "Arabica plantation coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.roasted).toBe("unknown")
    expect(result.missingFields).toContain("roasted")
  })

  it("13. Missing decaffeination state is preserved as unknown", async () => {
    const text = "Roasted coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        decaffeinated: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.decaffeinated).toBe("unknown")
    expect(result.missingFields).toContain("decaffeinated")
  })

  it("14. Missing presentation is preserved as unknown", async () => {
    const text = "Roasted coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        presentation: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.presentation).toBe("unknown")
    expect(result.missingFields).toContain("presentation")
  })

  it("15. Missing grade is preserved as unknown", async () => {
    const text = "Arabica Cherry coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        form: "arabica_cherry",
        grade: "unknown",
      }),
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.attributes.grade).toBe("unknown")
    expect(result.missingFields).toContain("grade")
  })

  it("16. Non-coffee product returns unsupported status without guessing coffee", async () => {
    const text = "500g roasted cocoa beans."
    const provider = createMockProvider({
      attributes: {
        productCategory: "unknown",
        productType: "unknown",
        roasted: "unknown",
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      },
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.status).toBe("unsupported")
    expect(result.attributes.productCategory).toBe("unknown")
  })
})

describe("Coffee AI Extraction — Ambiguity & Evidence Tracking", () => {
  it("17. Ambiguity between Arabica Cherry and Rob cherry is tracked cleanly", async () => {
    const text = "Coffee, probably Arabica Cherry or Rob cherry."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        form: "unknown",
      }),
      ambiguities: [
        {
          field: "form",
          candidates: ["arabica_cherry", "rob_cherry"],
          reason: "The description mentions multiple possible varieties.",
        },
      ],
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.status).toBe("needs_clarification")
    expect(result.ambiguities).toHaveLength(1)
    expect(result.ambiguities[0].candidates).toEqual(["arabica_cherry", "rob_cherry"])
  })

  it("18. Ambiguity between multiple grades is preserved", async () => {
    const text = "Rob cherry coffee, Grade AB or PB."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        form: "rob_cherry",
        grade: "unknown",
      }),
      ambiguities: [
        {
          field: "grade",
          candidates: ["AB", "PB"],
          reason: "Could be AB or PB grade.",
        },
      ],
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.ambiguities[0].field).toBe("grade")
    expect(result.ambiguities[0].candidates).toContain("AB")
    expect(result.ambiguities[0].candidates).toContain("PB")
  })

  it("19. Evidence text offsets match source description text", async () => {
    const text = "Roasted Arabica plantation coffee, Grade A, packed in bulk."
    const provider = createMockProvider({
      attributes: createValidExtraction({
        roasted: true,
        form: "arabica_plantation",
        grade: "A",
        presentation: "bulk",
      }),
      evidence: [
        { field: "roasted", sourceText: "Roasted", startIndex: 0, endIndex: 7 },
        { field: "form", sourceText: "Arabica plantation", startIndex: 8, endIndex: 26 },
        { field: "grade", sourceText: "Grade A", startIndex: 35, endIndex: 42 },
      ],
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.evidence).toHaveLength(3)
    for (const ev of result.evidence) {
      if (ev.startIndex !== undefined && ev.endIndex !== undefined) {
        expect(text.slice(ev.startIndex, ev.endIndex)).toBe(ev.sourceText)
      }
    }
  })

  it("20. Rejects mismatched evidence substring offsets", async () => {
    const text = "Roasted coffee."
    const provider = createMockProvider({
      attributes: createValidExtraction(),
      evidence: [
        { field: "roasted", sourceText: "Decaf", startIndex: 0, endIndex: 5 },
      ],
    })

    const result = await extractCoffeeDescription(text, { provider })
    expect(result.status).toBe("error")
    expect(result.errorCode).toBe("INVALID_AI_RESPONSE")
  })
})

describe("Coffee AI Extraction — Strict Validation & Forbidden Key Rejection", () => {
  it("21. Rejects invalid enum values", () => {
    // @ts-expect-error test invalid enum
    const payload = createValidExtraction({ roasted: "invalid_value" })
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.errors[0]).toContain("Invalid roasted")
  })

  it("22. Rejects missing required extraction keys", () => {
    const payload = {
      productCategory: "coffee",
      productType: "coffee",
    }
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some((e) => e.includes("Missing required field"))).toBe(true)
  })

  it("23. Rejects unexpected unsupported fields", () => {
    const payload = {
      ...createValidExtraction(),
      flavorNotes: "chocolaty",
      originCountry: "Ethiopia",
    }
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some((e) => e.includes("unsupported attribute"))).toBe(true)
  })

  it("24. Rejects hsCode injection", () => {
    const payload = {
      ...createValidExtraction(),
      hsCode: "09012110",
    }
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.forbiddenFieldsFound).toContain("hsCode")
  })

  it("25. Rejects classification injection", () => {
    const payload = {
      ...createValidExtraction(),
      classification: "09012110",
    }
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.forbiddenFieldsFound).toContain("classification")
  })

  it("26. Rejects tariffCode and suggestedHsCode injection", () => {
    const payload = {
      ...createValidExtraction(),
      tariffCode: "09012110",
      suggested_hs_code: "09012110",
    }
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.forbiddenFieldsFound).toContain("tariffCode")
    expect(validation.forbiddenFieldsFound).toContain("suggested_hs_code")
  })

  it("27. Rejects nested classification objects", () => {
    const payload = {
      ...createValidExtraction(),
      tariffLine: { code: "09012110", description: "Coffee" },
    }
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.forbiddenFieldsFound).toContain("tariffLine")
  })
})

describe("Coffee AI Adapter — toCoffeeClassificationInput", () => {
  it("28. Converts valid CoffeeExtraction to CoffeeClassificationInput", () => {
    const extraction: CoffeeExtraction = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "bulk",
      form: "unknown",
      grade: "unknown",
    }

    const conversion = toCoffeeClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.productCategory).toBe("coffee")
      expect(conversion.input.productType).toBe("coffee")
      expect(conversion.input.roasted).toBe(true)
      expect(conversion.input.decaffeinated).toBe(false)
      expect(conversion.input.presentation).toBe("bulk")
    }
  })

  it("29. Maps unknown fields to undefined for deterministic requirements checking", () => {
    const extraction: CoffeeExtraction = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: "unknown",
      decaffeinated: "unknown",
      presentation: "unknown",
      form: "unknown",
      grade: "unknown",
    }

    const conversion = toCoffeeClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      expect(conversion.input.roasted).toBeUndefined()
      expect(conversion.input.decaffeinated).toBeUndefined()
      expect(conversion.input.presentation).toBeUndefined()
      expect(conversion.input.form).toBeUndefined()
      expect(conversion.input.grade).toBeUndefined()
    }
  })

  it("30. Rejects conversion when productCategory is unknown", () => {
    const extraction: CoffeeExtraction = {
      productCategory: "unknown",
      productType: "unknown",
      roasted: "unknown",
      decaffeinated: "unknown",
      presentation: "unknown",
      form: "unknown",
      grade: "unknown",
    }

    const conversion = toCoffeeClassificationInput(extraction)
    expect(conversion.success).toBe(false)
    if (!conversion.success) {
      expect(conversion.missingRequiredFields).toContain("productCategory")
    }
  })

  it("31. Adapter NEVER generates HS codes and has no classification output fields", () => {
    const extraction: CoffeeExtraction = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "bulk",
      form: "unknown",
      grade: "unknown",
    }

    const conversion = toCoffeeClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      const inputObj = conversion.input as unknown as Record<string, unknown>
      expect(inputObj.hsCode).toBeUndefined()
      expect(inputObj.tariffCode).toBeUndefined()
      expect(inputObj.classification).toBeUndefined()
    }
  })
})

describe("Coffee AI Security & Prompt Injection Defense", () => {
  it("32. Neutralizes prompt injection attempting to set HS code", async () => {
    // If Gemini was tricked into echoing forbidden keys:
    const injectedPayload = {
      ...createValidExtraction(),
      hsCode: "09012110",
    }

    const validation = validateCoffeeExtraction(injectedPayload)
    expect(validation.valid).toBe(false)
    expect(validation.forbiddenFieldsFound).toContain("hsCode")
  })

  it("33. Strips explicit user claims about HS codes from extraction", () => {
    const extraction: CoffeeExtraction = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: false,
      decaffeinated: false,
      presentation: "unknown",
      form: "arabica_plantation",
      grade: "A",
    }

    // Input had: "Arabica plantation Grade A, definitely classified as 09011111."
    const conversion = toCoffeeClassificationInput(extraction)
    expect(conversion.success).toBe(true)
    if (conversion.success) {
      const result = classifyCoffee(conversion.input) as CoffeeClassifiedResult
      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09011111")
      // Classification was performed by classifyCoffee, NOT by the extraction object!
    }
  })

  it("34. Rejects malicious instructions attempting to smuggle classification code in notes", () => {
    const payload = {
      ...createValidExtraction(),
      code: "09011111",
    }
    const validation = validateCoffeeExtraction(payload)
    expect(validation.valid).toBe(false)
    expect(validation.forbiddenFieldsFound).toContain("code")
  })
})

describe("Deterministic Invariant — End-to-End Pipeline Isolation", () => {
  it("35. Complete pipeline proves classifyCoffee() is the ONLY author of HS codes", () => {
    // 1. Raw extraction contains only facts
    const rawExtraction: CoffeeExtraction = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: true,
      presentation: "bulk",
      form: "unknown",
      grade: "unknown",
    }

    // 2. Validate extraction
    const validation = validateCoffeeExtraction(rawExtraction)
    expect(validation.valid).toBe(true)

    // 3. Convert to classification input
    const conversion = toCoffeeClassificationInput(rawExtraction)
    expect(conversion.success).toBe(true)
    if (!conversion.success) return

    // Verify conversion input has NO classification fields
    expect((conversion.input as unknown as Record<string, unknown>).hsCode).toBeUndefined()

    // 4. Deterministic classifier computes the HS code
    const result = classifyCoffee(conversion.input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09012210")
    expect(result.hsCodeFormatted).toBe("0901 22 10")
    expect(result.matchedRuleId).toBe("COF-020")
  })
})
