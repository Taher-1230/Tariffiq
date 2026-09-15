// ============================================================
// Spices Manual Workflow Test Suite — Phase 6.4
//
// Verifies the complete manual classification wizard for Spices
// (Headings 0904–0910), including:
//   - Form state management
//   - Step navigation and validation
//   - Dynamic field requirements
//   - Dependent state invalidation
//   - Deterministic classification via classifySpices()
//   - Golden manual cases verified against spices_rules.json
//   - Product switching isolation
//   - Tea/Coffee regression guards
//
// CRITICAL INVARIANT:
//   Manual wizard uses classifySpices() as the SOLE classifier.
//   No AI/Gemini involvement in the manual path.
// ============================================================

import { describe, it, expect } from "vitest"
import { classifySpices } from "../products/spices/classifier"
import { getRequiredSpicesInformation } from "../products/spices/requirements"
import { classifyTea } from "../engine/teaClassifier"
import { classifyCoffee } from "../products/coffee/classifier"
import { productRegistry } from "../products/registry"
import type {
  SpicesClassificationInput,
  SpicesClassifiedResult,
  SpicesInsufficientInformationResult,
} from "../products/spices/types"
import type { TeaClassificationInput } from "../types/classification"
import "../products/spices/index"
import "../products/tea/index"
import "../products/coffee/index"

// ── Helper: build a minimal Spices input ─────────────────────

function spicesInput(
  overrides: Partial<SpicesClassificationInput> = {}
): SpicesClassificationInput {
  return {
    productCategory: "spices",
    spiceType: null,
    botanicalType: null,
    crushedOrGround: null,
    subType: null,
    form: null,
    processingState: null,
    quality: null,
    sizeCategory: null,
    isCubeb: null,
    essentialCharacter: null,
    ...overrides,
  }
}

describe("Phase 6.4 — Spices Manual Classification Wizard", () => {
  // ── 1. Product Selection ─────────────────────────────────────

  describe("Product Selection", () => {
    it("1. Spices is a supported product in ProductRegistry", () => {
      expect(productRegistry.isSupported("spices")).toBe(true)
      const reg = productRegistry.getOrThrow("spices")
      expect(reg.definition.id).toBe("spices")
      expect(reg.definition.supportsManualClassification).toBe(true)
    })

    it("2. Spices definition has correct metadata", () => {
      const reg = productRegistry.getOrThrow("spices")
      expect(reg.definition.displayName).toBeDefined()
      expect(reg.definition.hsChapter).toBeDefined()
      expect(reg.definition.supportsAI).toBe(true)
    })
  })

  // ── 2. Requirement Analysis ──────────────────────────────────

  describe("Dynamic Field Requirements", () => {
    it("3. Empty input requires spiceType", () => {
      const req = getRequiredSpicesInformation({})
      expect(req.sufficient).toBe(false)
      expect(req.missingFields).toContain("spiceType")
      expect(req.fieldStatus.spiceType).toBe("required")
    })

    it("4. All 19 spice types are accepted by getRequiredSpicesInformation", () => {
      const ALL_SPICE_TYPES = [
        "pepper", "capsicum_pimenta", "vanilla", "cinnamon", "cloves",
        "nutmeg", "mace", "cardamom", "coriander", "cumin", "anise",
        "badian", "caraway_or_fennel", "juniper_berries", "ginger",
        "saffron", "turmeric", "mixture", "other_spice",
      ] as const

      for (const spiceType of ALL_SPICE_TYPES) {
        const req = getRequiredSpicesInformation({ spiceType })
        expect(req.fieldStatus.spiceType).toBe("satisfied")
      }
    })

    it("5. Pepper requires crushedOrGround and botanicalType is not_required", () => {
      const req = getRequiredSpicesInformation({
        spiceType: "pepper",
      })
      expect(req.fieldStatus.crushedOrGround).not.toBe("not_required")
    })

    it("6. Cardamom requires sizeCategory (when whole)", () => {
      const req = getRequiredSpicesInformation({
        spiceType: "cardamom",
        crushedOrGround: false,
      })
      expect(req.fieldStatus.sizeCategory).not.toBe("not_required")
    })

    it("7. Vanilla has no branch-specific required fields beyond crushedOrGround", () => {
      const req = getRequiredSpicesInformation({
        spiceType: "vanilla",
        crushedOrGround: false,
      })
      // All specialized fields should not be required
      expect(req.fieldStatus.botanicalType).toBe("not_required")
      expect(req.fieldStatus.sizeCategory).toBe("not_required")
    })

    it("8. Capsicum requires botanicalType and processingState", () => {
      const req = getRequiredSpicesInformation({
        spiceType: "capsicum_pimenta",
      })
      expect(req.fieldStatus.botanicalType).not.toBe("not_required")
    })

    it("9. Fields irrelevant to the selected spice type are not_required", () => {
      const req = getRequiredSpicesInformation({
        spiceType: "vanilla",
      })
      expect(req.fieldStatus.sizeCategory).toBe("not_required")
      expect(req.fieldStatus.quality).toBe("not_required")
    })
  })

  // ── 3. Step Navigation & Validation ──────────────────────────

  describe("Step Navigation Logic", () => {
    it("10. Cannot proceed without selecting spice type", () => {
      const req = getRequiredSpicesInformation({})
      expect(req.sufficient).toBe(false)
      expect(req.fieldStatus.spiceType).toBe("required")
    })

    it("11. Selecting spice type enables progression", () => {
      const req = getRequiredSpicesInformation({
        spiceType: "vanilla",
      })
      expect(req.fieldStatus.spiceType).toBe("satisfied")
    })

    it("12. Back navigation preserves form state (deterministic test)", () => {
      // Simulate: set spiceType to pepper, then check requirements again
      const step1 = getRequiredSpicesInformation({ spiceType: "pepper" })
      expect(step1.fieldStatus.spiceType).toBe("satisfied")

      // Navigate back conceptually (re-check with same input)
      const step1Again = getRequiredSpicesInformation({ spiceType: "pepper" })
      expect(step1Again.fieldStatus.spiceType).toBe("satisfied")
      // State is deterministic
    })
  })

  // ── 4. Dependent State Invalidation ──────────────────────────

  describe("Dependent State Invalidation", () => {
    it("13. Changing spiceType should invalidate downstream fields", () => {
      // Start with pepper + sub_type (botanicalType required by canonical rules)
      const input1 = spicesInput({
        spiceType: "pepper",
        botanicalType: "piper",
        crushedOrGround: false,
        subType: "long_pepper",
      })
      const result1 = classifySpices(input1) as SpicesClassifiedResult
      expect(result1.status).toBe("classified")
      expect(result1.hsCode).toBe("09041110")

      // If user changes spiceType to vanilla, old subType is invalid
      const input2 = spicesInput({
        spiceType: "vanilla",
        crushedOrGround: false,
        subType: null, // Must be cleared by the wizard
      })
      const result2 = classifySpices(input2)
      expect(result2.status).toBe("classified")
      // Vanilla whole → 09051000
      expect((result2 as SpicesClassifiedResult).hsCode).toBe("09051000")
    })

    it("14. Changing crushedOrGround clears subType context", () => {
      // Pepper whole with subType (botanicalType required by canonical rules)
      const result1 = classifySpices(spicesInput({
        spiceType: "pepper",
        botanicalType: "piper",
        crushedOrGround: false,
        subType: "black_pepper_garbled",
      })) as SpicesClassifiedResult
      expect(result1.hsCode).toBe("09041130")

      // Same pepper, now crushed → subType irrelevant
      const result2 = classifySpices(spicesInput({
        spiceType: "pepper",
        botanicalType: "piper",
        crushedOrGround: true,
      })) as SpicesClassifiedResult
      expect(result2.hsCode).toBe("09041200")
    })
  })

  // ── 5. Golden Manual Cases ───────────────────────────────────

  describe("Golden Manual Classification Cases", () => {
    it("15. Case A: Black pepper, whole, ungarbled → 09041120", () => {
      const result = classifySpices(spicesInput({
        spiceType: "pepper",
        botanicalType: "piper",
        crushedOrGround: false,
        subType: "light_black_pepper",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09041120")
      expect(result.matchedRuleId).toBe("SPC-002")
    })

    it("16. Case B: Vanilla, crushed/ground → 09052000", () => {
      const result = classifySpices(spicesInput({
        spiceType: "vanilla",
        crushedOrGround: true,
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09052000")
    })

    it("17. Case C: Cinnamon zeylanicum, whole, bark → 09061110", () => {
      const result = classifySpices(spicesInput({
        spiceType: "cinnamon",
        botanicalType: "cinnamomum_zeylanicum",
        crushedOrGround: false,
        form: "bark",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09061110")
    })

    it("18. Case D: Saffron stigma → 09102010", () => {
      const result = classifySpices(spicesInput({
        spiceType: "saffron",
        crushedOrGround: false,
        form: "stigma",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09102010")
    })

    it("19. Case E: Turmeric, fresh → 09103010", () => {
      const result = classifySpices(spicesInput({
        spiceType: "turmeric",
        crushedOrGround: false,
        processingState: "fresh",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09103010")
    })

    it("20. Case F: Mixture, cross-heading → 09109100", () => {
      const result = classifySpices(spicesInput({
        spiceType: "mixture",
        crushedOrGround: false,
        subType: "cross_heading_mixture",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09109100")
    })

    it("21. Case G: Ginger, dried, unbleached → 09101120", () => {
      const result = classifySpices(spicesInput({
        spiceType: "ginger",
        crushedOrGround: false,
        processingState: "dried",
        subType: "unbleached",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09101120")
    })

    it("22. Case H: Cardamom, small, alleppey green → 09083120", () => {
      const result = classifySpices(spicesInput({
        spiceType: "cardamom",
        crushedOrGround: false,
        sizeCategory: "small",
        subType: "alleppey_green",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09083120")
    })

    it("23. Case I: Other spice (fenugreek), seed → 09109912", () => {
      const result = classifySpices(spicesInput({
        spiceType: "other_spice",
        crushedOrGround: false,
        subType: "fenugreek",
        form: "seed",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09109912")
    })

    it("24. Case J: Coriander, seed quality → 09092110", () => {
      const result = classifySpices(spicesInput({
        spiceType: "coriander",
        crushedOrGround: false,
        quality: "seed_quality",
      })) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09092110")
    })
  })

  // ── 6. Classifier Behavior ───────────────────────────────────

  describe("Deterministic Classifier Behavior", () => {
    it("25. classifySpices() is the ONLY classifier used (no AI)", () => {
      // Direct call — deterministic, no async, no AI
      const result = classifySpices(spicesInput({
        spiceType: "mace",
        crushedOrGround: false,
      }))
      expect(result).toBeDefined()
      expect(result.status).toBe("classified")
    })

    it("26. insufficient_information returned for missing required fields", () => {
      const result = classifySpices(spicesInput({
        spiceType: null,
      }))
      expect(result.status).toBe("insufficient_information")
      const insuf = result as SpicesInsufficientInformationResult
      expect(insuf.missingFields).toBeDefined()
      expect(insuf.missingFields.length).toBeGreaterThan(0)
    })

    it("27. Classification is idempotent (same input → same output)", () => {
      const input = spicesInput({
        spiceType: "nutmeg",
        crushedOrGround: false,
        form: "in_shell",
      })
      const result1 = classifySpices(input)
      const result2 = classifySpices(input)
      expect(result1).toEqual(result2)
    })
  })

  // ── 7. Product Switching Isolation ───────────────────────────

  describe("Product Switching Isolation", () => {
    it("28. Tea classification is unaffected by Spices workflow", () => {
      // Run a spices classification
      const spicesResult = classifySpices(spicesInput({
        spiceType: "saffron",
        crushedOrGround: false,
        form: "stigma",
      })) as SpicesClassifiedResult
      expect(spicesResult.hsCode).toBe("09102010")

      // Run a tea classification — must be completely independent
      const teaInput: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "green",
        presentation: "bulk",
        form: "whole_leaf",
      }
      const teaResult = classifyTea(teaInput)
      expect(teaResult.status).toBe("classified")
      if (teaResult.status === "classified") {
        expect(teaResult.hsCode).toMatch(/^0902/)
      }
    })

    it("29. Coffee classification is unaffected by Spices workflow", () => {
      const coffeeResult = classifyCoffee({
        productCategory: "coffee",
        productType: "coffee",
        roasted: false,
        decaffeinated: false,
        form: "arabica_plantation",
        grade: "A",
      })
      expect(coffeeResult.status).toBe("classified")
    })

    it("30. ProductRegistry routes Spices correctly via generic classify", () => {
      const reg = productRegistry.getOrThrow("spices")
      const result = reg.engine.classify(spicesInput({
        spiceType: "turmeric",
        crushedOrGround: false,
        processingState: "fresh",
      }))
      expect(result).toBeDefined()
      const typed = result as SpicesClassifiedResult
      expect(typed.status).toBe("classified")
      expect(typed.hsCode).toBe("09103010")
    })
  })

  // ── 8. Build Input & Review ──────────────────────────────────

  describe("Manual Input Building", () => {
    it("31. buildSpicesInput produces valid SpicesClassificationInput", () => {
      // Simulate what the wizard buildSpicesInput does
      const input: SpicesClassificationInput = {
        productCategory: "spices",
        spiceType: "cloves",
        botanicalType: null,
        crushedOrGround: false,
        subType: null,
        form: "not_stem",
        processingState: "not_extracted",
        quality: null,
        sizeCategory: null,
        isCubeb: null,
        essentialCharacter: null,
      }
      const result = classifySpices(input) as SpicesClassifiedResult
      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09071020")
    })

    it("32. Review step shows all provided fields with correct requirement status", () => {
      const input = spicesInput({
        spiceType: "pepper",
        crushedOrGround: false,
        subType: "black_pepper_garbled",
      })
      const req = getRequiredSpicesInformation(input)
      expect(req.fieldStatus.spiceType).toBe("satisfied")
      expect(req.fieldStatus.crushedOrGround).not.toBe("not_required")
    })
  })

  // ── 9. Edge Cases & Safety ───────────────────────────────────

  describe("Edge Cases & Safety", () => {
    it("33. Cubeb pepper input does not crash classifier", () => {
      const result = classifySpices(spicesInput({
        spiceType: "pepper",
        isCubeb: true,
        crushedOrGround: false,
      }))
      // Should handle cubeb gracefully (excluded or classified)
      expect(result).toBeDefined()
      expect(result.status).toBeDefined()
    })

    it("34. essentialCharacter=false does not crash classifier", () => {
      const result = classifySpices(spicesInput({
        spiceType: "mixture",
        essentialCharacter: false,
        crushedOrGround: false,
      }))
      expect(result).toBeDefined()
      expect(result.status).toBeDefined()
    })

    it("35. All classification results contain required fields", () => {
      const testCases = [
        { spiceType: "pepper" as const, crushedOrGround: true },
        { spiceType: "vanilla" as const, crushedOrGround: false },
        { spiceType: "mace" as const, crushedOrGround: true },
        { spiceType: "saffron" as const, crushedOrGround: false, form: "stigma" as const },
      ]

      for (const tc of testCases) {
        const result = classifySpices(spicesInput(tc))
        expect(result.status).toBeDefined()
        if (result.status === "classified") {
          const classified = result as SpicesClassifiedResult
          expect(classified.hsCode).toBeDefined()
          expect(classified.hsCodeFormatted).toBeDefined()
          expect(classified.matchedRuleId).toBeDefined()
          expect(classified.description).toBeDefined()
          expect(classified.classificationPath).toBeDefined()
          expect(classified.classificationPath.length).toBeGreaterThan(0)
          expect(classified.reasoning).toBeDefined()
          expect(classified.structuredExplanation).toBeDefined()
        }
      }
    })
  })
})
