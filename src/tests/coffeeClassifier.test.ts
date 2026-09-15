// ============================================================
// Coffee Deterministic Classification Engine Tests — Phase 5C-B.1
//
// Comprehensive test suite covering:
//   1. Product type branches (husks & substitutes).
//   2. Roasted branches (non-decaf & decaf, bulk & other).
//   3. Unroasted decaffeinated branch (0901 12 00).
//   4. Unroasted non-decaffeinated variety & grade lines (Arabica plantation, Arabica cherry, Rob cherry).
//   5. Ambiguous "Other" lines (0901 11 90 & 0901 90 90 require clarification).
//   6. Missing information handling.
//   7. Input validation.
//   8. Normalization (e.g. B/B/B -> BBB).
//   9. Structured explanation & reasoning trace generation.
//   10. Classification path reconstruction from coffee_hs_codes.json.
//   11. Determinism.
//   12. ProductRegistry integration and cross-product isolation.
// ============================================================

import { describe, it, expect } from "vitest"
import { classifyCoffee, formatCoffeeHsCode } from "@/products/coffee/classifier"
import { validateCoffeeInput } from "@/products/coffee/validateCoffeeInput"
import { getRequiredCoffeeInformation } from "@/products/coffee/requirements"
import { normalizeCoffeeInput } from "@/products/coffee/normalizeCoffeeInput"
import { classifyProduct } from "@/products/classify"
import { productRegistry } from "@/products/registry"
import type {
  CoffeeClassificationInput,
  CoffeeClassifiedResult,
  CoffeeInsufficientInformationResult,
  CoffeeNoMatchResult,
} from "@/products/coffee/types"

describe("Coffee Deterministic Engine — Product Type Branch", () => {
  it("1. Classifies coffee husks and skins to 09019010", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "husks_and_skins",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09019010")
    expect(result.hsCodeFormatted).toBe("0901 90 10")
    expect(result.matchedRuleId).toBe("COF-022")
    expect(result.description).toBe("Coffee husks and skins.")
  })

  it("2. Classifies coffee substitutes containing coffee to 09019020", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "substitutes_containing_coffee",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09019020")
    expect(result.hsCodeFormatted).toBe("0901 90 20")
    expect(result.matchedRuleId).toBe("COF-023")
    expect(result.description).toBe("Coffee substitutes containing coffee.")
  })
})

describe("Coffee Deterministic Engine — Roasted Branches", () => {
  it("3. Roasted + non-decaffeinated + bulk -> 09012110", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "bulk",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09012110")
    expect(result.hsCodeFormatted).toBe("0901 21 10")
    expect(result.matchedRuleId).toBe("COF-018")
  })

  it("4. Roasted + non-decaffeinated + other presentation -> 09012190", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "other",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09012190")
    expect(result.hsCodeFormatted).toBe("0901 21 90")
    expect(result.matchedRuleId).toBe("COF-019")
  })

  it("5. Roasted + decaffeinated + bulk -> 09012210", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: true,
      presentation: "bulk",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09012210")
    expect(result.hsCodeFormatted).toBe("0901 22 10")
    expect(result.matchedRuleId).toBe("COF-020")
  })

  it("6. Roasted + decaffeinated + other presentation -> 09012290", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: true,
      presentation: "other",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09012290")
    expect(result.hsCodeFormatted).toBe("0901 22 90")
    expect(result.matchedRuleId).toBe("COF-021")
  })
})

describe("Coffee Deterministic Engine — Unroasted Decaffeinated Branch", () => {
  it("7. Not roasted + decaffeinated -> 09011200", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "coffee",
      roasted: false,
      decaffeinated: true,
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011200")
    expect(result.hsCodeFormatted).toBe("0901 12 00")
    expect(result.matchedRuleId).toBe("COF-017")
    expect(result.description).toBe("Coffee, not roasted, decaffeinated.")
  })
})

describe("Coffee Deterministic Engine — Unroasted Non-Decaf Arabica Plantation", () => {
  it("8. Arabica plantation, A Grade -> 09011111", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_plantation",
      grade: "A",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011111")
    expect(result.matchedRuleId).toBe("COF-001")
  })

  it("9. Arabica plantation, B Grade -> 09011112", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_plantation",
      grade: "B",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011112")
    expect(result.matchedRuleId).toBe("COF-002")
  })

  it("10. Arabica plantation, C Grade -> 09011113", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_plantation",
      grade: "C",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011113")
    expect(result.matchedRuleId).toBe("COF-003")
  })

  it("11. Arabica plantation, other grade -> 09011119", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_plantation",
      grade: "other",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011119")
    expect(result.matchedRuleId).toBe("COF-004")
  })
})

describe("Coffee Deterministic Engine — Unroasted Non-Decaf Arabica Cherry", () => {
  it("12. Arabica Cherry, AB Grade -> 09011121", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_cherry",
      grade: "AB",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011121")
    expect(result.matchedRuleId).toBe("COF-005")
  })

  it("13. Arabica Cherry, PB Grade -> 09011122", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_cherry",
      grade: "PB",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011122")
    expect(result.matchedRuleId).toBe("COF-006")
  })

  it("14. Arabica Cherry, C Grade -> 09011123", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_cherry",
      grade: "C",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011123")
    expect(result.matchedRuleId).toBe("COF-007")
  })

  it("15. Arabica Cherry, B/B/B Grade (normalized) -> 09011124", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_cherry",
      grade: "B/B/B",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011124")
    expect(result.matchedRuleId).toBe("COF-008")
  })

  it("16. Arabica Cherry, other grade -> 09011129", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_cherry",
      grade: "other",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011129")
    expect(result.matchedRuleId).toBe("COF-009")
  })
})

describe("Coffee Deterministic Engine — Unroasted Non-Decaf Rob Cherry", () => {
  it("17. Rob cherry, AB Grade -> 09011141", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "rob_cherry",
      grade: "AB",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011141")
    expect(result.matchedRuleId).toBe("COF-010")
  })

  it("18. Rob cherry, PB Grade -> 09011142", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "rob_cherry",
      grade: "PB",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011142")
    expect(result.matchedRuleId).toBe("COF-011")
  })

  it("19. Rob cherry, C Grade -> 09011143", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "rob_cherry",
      grade: "C",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011143")
    expect(result.matchedRuleId).toBe("COF-012")
  })

  it("20. Rob cherry, BBB Grade -> 09011144", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "rob_cherry",
      grade: "BBB",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011144")
    expect(result.matchedRuleId).toBe("COF-013")
  })

  it("21. Rob cherry, bulk -> 09011145", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "rob_cherry",
      presentation: "bulk",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011145")
    expect(result.matchedRuleId).toBe("COF-014")
  })

  it("22. Rob cherry, other grade -> 09011149", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "rob_cherry",
      grade: "other",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.status).toBe("classified")
    expect(result.hsCode).toBe("09011149")
    expect(result.matchedRuleId).toBe("COF-015")
  })
})

describe("Coffee Deterministic Engine — Ambiguous 'Other' Lines", () => {
  it("23. 0901 11 90 returns no_match with clarification notice (not universal fallback)", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "other",
    }
    const result = classifyCoffee(input) as CoffeeNoMatchResult
    expect(result.status).toBe("no_match")
    expect(result.message).toContain("requires source clarification")
  })
})

describe("Coffee Deterministic Engine — Missing Information & Validation", () => {
  it("24. Missing roasting state returns insufficient_information", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      productType: "coffee",
    }
    const result = classifyCoffee(input) as CoffeeInsufficientInformationResult
    expect(result.status).toBe("insufficient_information")
    expect(result.missingFields).toContain("roasted")
  })

  it("25. Roasted + missing decaffeination returns insufficient_information", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: true,
      presentation: "bulk",
    }
    const result = classifyCoffee(input) as CoffeeInsufficientInformationResult
    expect(result.status).toBe("insufficient_information")
    expect(result.missingFields).toContain("decaffeinated")
  })

  it("26. Roasted + missing presentation returns insufficient_information", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: true,
      decaffeinated: false,
    }
    const result = classifyCoffee(input) as CoffeeInsufficientInformationResult
    expect(result.status).toBe("insufficient_information")
    expect(result.missingFields).toContain("presentation")
  })

  it("27. Unroasted + missing decaffeination returns insufficient_information", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
    }
    const result = classifyCoffee(input) as CoffeeInsufficientInformationResult
    expect(result.status).toBe("insufficient_information")
    expect(result.missingFields).toContain("decaffeinated")
  })

  it("28. Unroasted non-decaf + missing form returns insufficient_information", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
    }
    const result = classifyCoffee(input) as CoffeeInsufficientInformationResult
    expect(result.status).toBe("insufficient_information")
    expect(result.missingFields).toContain("form")
  })

  it("29. Unroasted non-decaf Arabica plantation + missing grade returns insufficient_information", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "arabica_plantation",
    }
    const result = classifyCoffee(input) as CoffeeInsufficientInformationResult
    expect(result.status).toBe("insufficient_information")
    expect(result.missingFields).toContain("grade")
  })

  it("30. Invalid productCategory is rejected", () => {
    // @ts-expect-error test invalid category
    const result = validateCoffeeInput({ productCategory: "tea" })
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("productCategory")
  })

  it("30b. Normalizes B/B/B grade to BBB", () => {
    const normalized = normalizeCoffeeInput({
      productCategory: "coffee",
      form: "arabica_cherry",
      grade: "B/B/B",
    })
    expect(normalized.grade).toBe("BBB")
  })

  it("30c. getRequiredCoffeeInformation returns rule-driven requirements", () => {
    const reqHusks = getRequiredCoffeeInformation({ productType: "husks_and_skins" })
    expect(reqHusks.sufficient).toBe(true)

    const reqRoasted = getRequiredCoffeeInformation({ roasted: true })
    expect(reqRoasted.sufficient).toBe(false)
    expect(reqRoasted.missingFields).toContain("decaffeinated")
    expect(reqRoasted.missingFields).toContain("presentation")
  })

  it("30d. formatCoffeeHsCode formats 8-digit codes with spaces", () => {
    expect(formatCoffeeHsCode("09012110")).toBe("0901 21 10")
    expect(formatCoffeeHsCode("0901")).toBe("0901")
  })
})

describe("Coffee Deterministic Engine — Explanation & Reasoning Trace", () => {
  it("31. Builds complete structured explanation and reasoning trace for classified result", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "bulk",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.structuredExplanation).toBeDefined()
    expect(result.structuredExplanation.productType).toBe("Coffee")
    expect(result.structuredExplanation.roastedState).toBe("Roasted")
    expect(result.structuredExplanation.decaffeinatedState).toBe("Non-decaffeinated")
    expect(result.structuredExplanation.presentation).toBe("Bulk packing")
    expect(result.structuredExplanation.finalCode).toBe("09012110")

    expect(result.reasoning).toBeDefined()
    expect(Array.isArray(result.reasoning)).toBe(true)
    expect(result.reasoning.length).toBeGreaterThanOrEqual(4)
    expect(result.reasoning[0].label).toBe("Product Category")
    expect(result.reasoning.at(-1)!.label).toBe("Classification Result")
  })

  it("32. Reconstructs hierarchical classification path", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "bulk",
    }
    const result = classifyCoffee(input) as CoffeeClassifiedResult
    expect(result.classificationPath.length).toBeGreaterThanOrEqual(3)
    expect(result.classificationPath[0].code).toBe("09")
    expect(result.classificationPath[1].code).toBe("0901")
    expect(result.classificationPath.at(-1)!.code).toBe("0901 21 10")
  })
})

describe("Coffee Engine — Determinism & Performance", () => {
  it("33. Same input produces strictly identical result across 100 iterations", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: false,
      decaffeinated: false,
      form: "rob_cherry",
      grade: "AB",
    }
    const firstResult = classifyCoffee(input)
    for (let i = 0; i < 100; i++) {
      const result = classifyCoffee(input)
      expect(result).toEqual(firstResult)
    }
  })
})

describe("ProductRegistry & Cross-Product Isolation", () => {
  it("34. ProductRegistry contains exactly Tea and Coffee", () => {
    const products = productRegistry.getSupportedProducts()
    expect(products.map((p) => p.id).sort()).toEqual(["coffee", "tea"])
  })

  it("35. classifyProduct('coffee', input) produces identical result to classifyCoffee(input)", () => {
    const input: CoffeeClassificationInput = {
      productCategory: "coffee",
      roasted: true,
      decaffeinated: true,
      presentation: "bulk",
    }
    const genericResult = classifyProduct("coffee", input)
    const directResult = classifyCoffee(input)
    expect(genericResult).toEqual(directResult)
  })

  it("36. Unsupported product 'electronics' is rejected", () => {
    expect(productRegistry.isSupported("electronics")).toBe(false)
    expect(() => classifyProduct("electronics" as any, {})).toThrow(/Unsupported product category/)
  })
})
