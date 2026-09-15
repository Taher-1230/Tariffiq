// ============================================================
// Tea Classifier Tests — Phase 2A
//
// Comprehensive test suite covering:
//   1. Input normalization (kg → g)
//   2. Input validation (missing / invalid fields)
//   3. Green tea classification (all branches)
//   4. Black / partly fermented tea classification (all branches)
//   5. Boundary weight tests (exact thresholds)
//   6. Special form precedence (tea bags, agglomerated, waste)
//   7. Fallback rule behaviour
//   8. Edge cases and error paths
// ============================================================

import { describe, it, expect } from "vitest"
import { classifyTea } from "@/engine/teaClassifier"
import { normalizeTeaInput } from "@/engine/normalizeTeaInput"
import { validateTeaInput } from "@/engine/validateTeaInput"
import type { TeaClassificationInput } from "@/types/classification"

// ── Helpers ────────────────────────────────────────────────

/** Build a complete valid input with overridable fields. */
function makeInput(
  overrides: Partial<TeaClassificationInput> = {}
): TeaClassificationInput {
  return {
    productCategory: "tea",
    teaType: "black",
    presentation: "immediate_packing",
    form: "whole_leaf",
    netWeight: 500,
    weightUnit: "g",
    ...overrides,
  }
}

// ============================================================
// 1. NORMALIZATION
// ============================================================

describe("normalizeTeaInput", () => {
  it("preserves grams as-is", () => {
    const result = normalizeTeaInput(makeInput({ netWeight: 500, weightUnit: "g" }))
    expect(result.netWeightGrams).toBe(500)
  })

  it("converts 1 kg → 1000 g", () => {
    const result = normalizeTeaInput(makeInput({ netWeight: 1, weightUnit: "kg" }))
    expect(result.netWeightGrams).toBe(1000)
  })

  it("converts 3 kg → 3000 g", () => {
    const result = normalizeTeaInput(makeInput({ netWeight: 3, weightUnit: "kg" }))
    expect(result.netWeightGrams).toBe(3000)
  })

  it("converts 20 kg → 20000 g", () => {
    const result = normalizeTeaInput(makeInput({ netWeight: 20, weightUnit: "kg" }))
    expect(result.netWeightGrams).toBe(20000)
  })

  it("converts fractional kg correctly", () => {
    const result = normalizeTeaInput(makeInput({ netWeight: 0.5, weightUnit: "kg" }))
    expect(result.netWeightGrams).toBe(500)
  })

  it("does not mutate the original input", () => {
    const original = makeInput({ netWeight: 2, weightUnit: "kg" })
    const frozen = { ...original }
    normalizeTeaInput(original)
    expect(original).toEqual(frozen)
  })
})

// ============================================================
// 2. VALIDATION
// ============================================================

describe("validateTeaInput", () => {
  it("returns null for valid input", () => {
    expect(validateTeaInput(makeInput())).toBeNull()
  })

  it("rejects missing teaType", () => {
    const result = validateTeaInput(
      makeInput({ teaType: undefined as unknown as TeaClassificationInput["teaType"] })
    )
    expect(result).not.toBeNull()
    expect(result!.status).toBe("insufficient_information")
    expect(result!.missingFields).toContain("teaType")
  })

  it("rejects teaType = 'not_sure'", () => {
    const result = validateTeaInput(makeInput({ teaType: "not_sure" }))
    expect(result).not.toBeNull()
    expect(result!.status).toBe("insufficient_information")
    expect(result!.missingFields).toContain("teaType")
  })

  it("rejects missing presentation", () => {
    const result = validateTeaInput(
      makeInput({ presentation: undefined as unknown as TeaClassificationInput["presentation"] })
    )
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("presentation")
  })

  it("rejects missing form", () => {
    const result = validateTeaInput(
      makeInput({ form: undefined as unknown as TeaClassificationInput["form"] })
    )
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("form")
  })

  it("rejects missing netWeight", () => {
    const result = validateTeaInput(
      makeInput({ netWeight: undefined as unknown as number })
    )
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("netWeight")
  })

  it("rejects zero weight", () => {
    const result = validateTeaInput(makeInput({ netWeight: 0 }))
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("netWeight")
  })

  it("rejects negative weight", () => {
    const result = validateTeaInput(makeInput({ netWeight: -100 }))
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("netWeight")
  })

  it("rejects NaN weight", () => {
    const result = validateTeaInput(makeInput({ netWeight: NaN }))
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("netWeight")
  })

  it("rejects Infinity weight", () => {
    const result = validateTeaInput(makeInput({ netWeight: Infinity }))
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("netWeight")
  })

  it("rejects wrong product category", () => {
    const result = validateTeaInput(
      makeInput({ productCategory: "coffee" as "tea" })
    )
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("productCategory")
  })

  it("rejects missing weight unit", () => {
    const result = validateTeaInput(
      makeInput({ weightUnit: undefined as unknown as TeaClassificationInput["weightUnit"] })
    )
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("weightUnit")
  })

  it("collects multiple missing fields at once", () => {
    const result = validateTeaInput(
      makeInput({
        teaType: undefined as unknown as TeaClassificationInput["teaType"],
        netWeight: undefined as unknown as number,
      })
    )
    expect(result).not.toBeNull()
    expect(result!.missingFields).toContain("teaType")
    expect(result!.missingFields).toContain("netWeight")
    expect(result!.missingFields.length).toBeGreaterThanOrEqual(2)
  })
})

// ============================================================
// 3. GREEN TEA — IMMEDIATE PACKING BOUNDARY TESTS
// ============================================================

describe("Green tea — immediate packing boundaries", () => {
  const greenImmediate = (weight: number, unit: "g" | "kg" = "g") =>
    makeInput({
      teaType: "green",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: weight,
      weightUnit: unit,
    })

  it("25 g → 09021010", () => {
    const r = classifyTea(greenImmediate(25))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021010")
  })

  it("25.0001 g → 09021020", () => {
    const r = classifyTea(greenImmediate(25.0001))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021020")
  })

  it("1000 g → 09021020", () => {
    const r = classifyTea(greenImmediate(1000))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021020")
  })

  it("1 kg (= 1000 g) → 09021020", () => {
    const r = classifyTea(greenImmediate(1, "kg"))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021020")
  })

  it("1000.0001 g → 09021030", () => {
    const r = classifyTea(greenImmediate(1000.0001))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021030")
  })

  it("3000 g → 09021030", () => {
    const r = classifyTea(greenImmediate(3000))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021030")
  })

  it("3 kg (= 3000 g) → 09021030", () => {
    const r = classifyTea(greenImmediate(3, "kg"))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021030")
  })

  it("3000.01 g → 09021090 (fallback for immediate packing >3kg)", () => {
    const r = classifyTea(greenImmediate(3000.01))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021090")
  })

  it("1 g → 09021010", () => {
    const r = classifyTea(greenImmediate(1))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021010")
  })

  it("0.5 g → 09021010", () => {
    const r = classifyTea(greenImmediate(0.5))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09021010")
  })
})

// ============================================================
// 4. BLACK TEA — IMMEDIATE PACKING BOUNDARY TESTS
// ============================================================

describe("Black tea — immediate packing boundaries", () => {
  const blackImmediate = (weight: number, unit: "g" | "kg" = "g") =>
    makeInput({
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: weight,
      weightUnit: unit,
    })

  it("25 g → 09023010", () => {
    const r = classifyTea(blackImmediate(25))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023010")
  })

  it("25.0001 g → 09023020", () => {
    const r = classifyTea(blackImmediate(25.0001))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023020")
  })

  it("1000 g → 09023020", () => {
    const r = classifyTea(blackImmediate(1000))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023020")
  })

  it("1 kg (= 1000 g) → 09023020", () => {
    const r = classifyTea(blackImmediate(1, "kg"))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023020")
  })

  it("1000.0001 g → 09023030", () => {
    const r = classifyTea(blackImmediate(1000.0001))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023030")
  })

  it("3000 g → 09023030", () => {
    const r = classifyTea(blackImmediate(3000))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023030")
  })

  it("3 kg (= 3000 g) → 09023030", () => {
    const r = classifyTea(blackImmediate(3, "kg"))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023030")
  })

  it("3000.01 g → 09023090 (fallback for immediate packing >3kg)", () => {
    const r = classifyTea(blackImmediate(3000.01))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023090")
  })
})

// ============================================================
// 5. PARTLY FERMENTED TEA (same rules as black)
// ============================================================

describe("Partly fermented tea — immediate packing", () => {
  const pfImmediate = (weight: number) =>
    makeInput({
      teaType: "partly_fermented",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: weight,
      weightUnit: "g",
    })

  it("25 g → 09023010", () => {
    const r = classifyTea(pfImmediate(25))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023010")
  })

  it("500 g → 09023020", () => {
    const r = classifyTea(pfImmediate(500))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023020")
  })

  it("2000 g → 09023030", () => {
    const r = classifyTea(pfImmediate(2000))
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09023030")
  })
})

// ============================================================
// 6. GREEN TEA — OTHER BRANCHES
// ============================================================

describe("Green tea — non-immediate branches", () => {
  it("packet, 5000 g → 09022010", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "packet",
        form: "whole_leaf",
        netWeight: 5000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09022010")
  })

  it("packet, 20 kg (= 20000 g) → 09022010", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "packet",
        form: "whole_leaf",
        netWeight: 20,
        weightUnit: "kg",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09022010")
  })

  it("bulk → 09022020", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: 50000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09022020")
  })

  it("agglomerated → 09022030 (regardless of presentation)", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "immediate_packing",
        form: "agglomerated",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09022030")
  })

  it("waste → 09022040 (regardless of presentation)", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "immediate_packing",
        form: "waste",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09022040")
  })
})

// ============================================================
// 7. BLACK TEA — OTHER BRANCHES
// ============================================================

describe("Black tea — non-immediate branches", () => {
  it("packet, 5000 g → 09024010", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "packet",
        form: "whole_leaf",
        netWeight: 5000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09024010")
  })

  it("bulk, leaf → 09024020", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: 50000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09024020")
  })

  it("bulk, dust → 09024030", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "bulk",
        form: "dust",
        netWeight: 50000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09024030")
  })

  it("tea bags → 09024040", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "tea_bags",
        netWeight: 100,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09024040")
  })

  it("agglomerated → 09024050", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "agglomerated",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09024050")
  })

  it("waste → 09024060", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "bulk",
        form: "waste",
        netWeight: 50000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09024060")
  })
})

// ============================================================
// 8. SPECIAL FORM PRECEDENCE
// ============================================================

describe("Special form precedence", () => {
  it("black tea + tea_bags + immediate_packing + 100 g → TEA-017 (09024040)", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "tea_bags",
        netWeight: 100,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.matchedRuleId).toBe("TEA-017")
      expect(r.hsCode).toBe("09024040")
    }
  })

  it("green tea + tea_bags + immediate_packing + 100 g → TEA-002 (09021020)", () => {
    // Green tea does not have a dedicated tea_bags rule in source data,
    // so it evaluates under standard green tea immediate packing rules
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "immediate_packing",
        form: "tea_bags",
        netWeight: 100,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.matchedRuleId).toBe("TEA-002")
      expect(r.hsCode).toBe("09021020")
    }
  })

  it("black tea bags at 500g must NOT be overridden by weight-based immediate packing rules", () => {
    // Black tea bags at 500g in immediate packing — the form rule for tea_bags (TEA-017)
    // should win over the weight-based immediate packing rule (TEA-011)
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "tea_bags",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.matchedRuleId).toBe("TEA-017")
      expect(r.hsCode).toBe("09024040")
    }
  })

  it("agglomerated green tea must match TEA-007 (09022030) and not fall through to weight rules", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "bulk",
        form: "agglomerated",
        netWeight: 2000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.matchedRuleId).toBe("TEA-007")
      expect(r.hsCode).toBe("09022030")
    }
  })

  it("agglomerated black tea must match TEA-018 (09024050)", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "agglomerated",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.matchedRuleId).toBe("TEA-018")
      expect(r.hsCode).toBe("09024050")
    }
  })

  it("waste black tea must match TEA-019 (09024060) and not fall through to weight rules", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "waste",
        netWeight: 10,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.matchedRuleId).toBe("TEA-019")
      expect(r.hsCode).toBe("09024060")
    }
  })

  it("waste green tea must match TEA-008 (09022040) and not fall through to weight rules", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "immediate_packing",
        form: "waste",
        netWeight: 10,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.matchedRuleId).toBe("TEA-008")
      expect(r.hsCode).toBe("09022040")
    }
  })
})

// ============================================================
// 9. FALLBACK RULE BEHAVIOUR
// ============================================================

describe("Fallback rules", () => {
  it("green tea fallback 09022090 only when no specific rule matches", () => {
    // Green tea, packet, but weight outside the 3-20 kg range
    // and not a special form → should hit the fallback
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "packet",
        form: "other",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09022090")
  })

  it("black tea fallback 09024090 only when no specific rule matches", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "packet",
        form: "other",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") expect(r.hsCode).toBe("09024090")
  })

  it("fallback never overrides tea bags", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "packet",
        form: "tea_bags",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024040")
      expect(r.hsCode).not.toBe("09024090")
    }
  })

  it("fallback never overrides agglomerated tea", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "packet",
        form: "agglomerated",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024050")
      expect(r.hsCode).not.toBe("09024090")
    }
  })

  it("fallback never overrides waste", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "packet",
        form: "waste",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024060")
      expect(r.hsCode).not.toBe("09024090")
    }
  })

  it("fallback never overrides bulk leaf", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
        netWeight: 50000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024020")
      expect(r.hsCode).not.toBe("09024090")
    }
  })

  it("fallback never overrides bulk dust", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "bulk",
        form: "dust",
        netWeight: 50000,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024030")
      expect(r.hsCode).not.toBe("09024090")
    }
  })
})

// ============================================================
// 10. INSUFFICIENT INFORMATION (via classifyTea)
// ============================================================

describe("Insufficient information through classifyTea", () => {
  it("returns insufficient_information for not_sure teaType", () => {
    const r = classifyTea(makeInput({ teaType: "not_sure" }))
    expect(r.status).toBe("insufficient_information")
    if (r.status === "insufficient_information") {
      expect(r.missingFields).toContain("teaType")
    }
  })

  it("returns insufficient_information for missing weight", () => {
    const r = classifyTea(
      makeInput({ netWeight: undefined as unknown as number })
    )
    expect(r.status).toBe("insufficient_information")
  })

  it("returns insufficient_information for zero weight", () => {
    const r = classifyTea(makeInput({ netWeight: 0 }))
    expect(r.status).toBe("insufficient_information")
  })

  it("returns insufficient_information for negative weight", () => {
    const r = classifyTea(makeInput({ netWeight: -5 }))
    expect(r.status).toBe("insufficient_information")
  })

  it("never throws on invalid input", () => {
    expect(() => classifyTea(makeInput({ netWeight: NaN }))).not.toThrow()
    expect(() => classifyTea(makeInput({ teaType: "not_sure" }))).not.toThrow()
    expect(() =>
      classifyTea(makeInput({ productCategory: "coffee" as "tea" }))
    ).not.toThrow()
  })
})

// ============================================================
// 11. RESULT STRUCTURE
// ============================================================

describe("Classified result structure", () => {
  it("contains all required fields", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09023020")
      expect(r.hsCodeFormatted).toBe("0902 30 20")
      expect(r.description).toBeTruthy()
      expect(r.matchedRuleId).toBeTruthy()
      expect(r.explanation).toBeTruthy()
      expect(r.classificationPath).toBeInstanceOf(Array)
      expect(r.classificationPath.length).toBeGreaterThanOrEqual(2)
      expect(r.inputSummary).toBeTruthy()
      expect(r.inputSummary.netWeight).toBe(500)
    }
  })

  it("classification path starts with chapter 09", () => {
    const r = classifyTea(makeInput())
    if (r.status === "classified") {
      expect(r.classificationPath[0].code).toBe("09")
    }
  })

  it("classification path ends with the matched code", () => {
    const r = classifyTea(makeInput())
    if (r.status === "classified") {
      const last = r.classificationPath[r.classificationPath.length - 1]
      expect(last.code).toBe(r.hsCode)
    }
  })

  it("hsCodeFormatted is correctly spaced", () => {
    const r = classifyTea(makeInput())
    if (r.status === "classified") {
      // "09023020" → "0902 30 20"
      expect(r.hsCodeFormatted).toMatch(/^\d{4} \d{2} \d{2}$/)
    }
  })

  it("echoes back the original input unchanged", () => {
    const input = makeInput({ netWeight: 2, weightUnit: "kg" })
    const r = classifyTea(input)
    if (r.status === "classified") {
      // netWeight should still be 2 (kg), not 2000 (g)
      expect(r.inputSummary.netWeight).toBe(2)
      expect(r.inputSummary.weightUnit).toBe("kg")
    }
  })
})

// ============================================================
// 12. DETERMINISM
// ============================================================

describe("Determinism", () => {
  it("same input always produces the same result", () => {
    const input = makeInput({
      teaType: "green",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    })
    const r1 = classifyTea(input)
    const r2 = classifyTea(input)
    const r3 = classifyTea(input)
    expect(r1).toEqual(r2)
    expect(r2).toEqual(r3)
  })
})

// ============================================================
// 13. PHASE 2B INTEGRATION CASES
//     These verify the exact cases required by the UI integration.
// ============================================================

describe("Phase 2B Integration: mandatory UI test cases", () => {
  // Case 1 — Black tea, immediate packing, whole leaf, 500 g → 09023020
  it("Case 1: black + immediate_packing + whole_leaf + 500g → 09023020", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09023020")
      expect(r.hsCodeFormatted).toBe("0902 30 20")
      expect(r.classificationPath.length).toBeGreaterThanOrEqual(2)
      expect(r.classificationPath[r.classificationPath.length - 1].code).toBe("09023020")
      expect(r.inputSummary.netWeight).toBe(500)
      expect(r.inputSummary.weightUnit).toBe("g")
    }
  })

  // Case 2 — Green tea, immediate packing, whole leaf, 25 g → 09021010
  it("Case 2: green + immediate_packing + whole_leaf + 25g → 09021010", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 25,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09021010")
      expect(r.classificationPath[r.classificationPath.length - 1].code).toBe("09021010")
    }
  })

  // Case 3 — Black tea, immediate packing, tea bags, 100 g → 09024040
  it("Case 3: black + immediate_packing + tea_bags + 100g → 09024040", () => {
    const r = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "tea_bags",
        netWeight: 100,
        weightUnit: "g",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024040")
      expect(r.classificationPath[r.classificationPath.length - 1].code).toBe("09024040")
    }
  })

  // Case 4 — Green tea, bulk, agglomerated, 2 kg → 09022030
  it("Case 4: green + bulk + agglomerated + 2kg → 09022030", () => {
    const r = classifyTea(
      makeInput({
        teaType: "green",
        presentation: "bulk",
        form: "agglomerated",
        netWeight: 2,
        weightUnit: "kg",
      })
    )
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09022030")
    }
  })

  // Case 5 — Edit: weight from 500 g to 1 kg changes result
  it("Case 5: changing weight from 500g to 1kg does not change result (both ≤1kg → same code)", () => {
    const r500g = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    const r1kg = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 1,
        weightUnit: "kg",
      })
    )
    // Both should classify to the same code (>25g and ≤1000g)
    expect(r500g.status).toBe("classified")
    expect(r1kg.status).toBe("classified")
    if (r500g.status === "classified" && r1kg.status === "classified") {
      expect(r500g.hsCode).toBe("09023020")
      expect(r1kg.hsCode).toBe("09023020")
      // Weight echoed back in original unit
      expect(r500g.inputSummary.netWeight).toBe(500)
      expect(r500g.inputSummary.weightUnit).toBe("g")
      expect(r1kg.inputSummary.netWeight).toBe(1)
      expect(r1kg.inputSummary.weightUnit).toBe("kg")
    }
  })

  // Case 5b — Weight that crosses a boundary changes the result
  it("Case 5b: changing weight from 500g to 2kg crosses 1kg boundary → different HS code", () => {
    const r500g = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      })
    )
    const r2kg = classifyTea(
      makeInput({
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 2,
        weightUnit: "kg",
      })
    )
    expect(r500g.status).toBe("classified")
    expect(r2kg.status).toBe("classified")
    if (r500g.status === "classified" && r2kg.status === "classified") {
      expect(r500g.hsCode).toBe("09023020") // ≤1kg
      expect(r2kg.hsCode).toBe("09023030")  // >1kg and ≤3kg
    }
  })

  // Integration: insufficient_information result is safe to inspect
  it("insufficient_information: result is safe and has expected shape", () => {
    const r = classifyTea(
      makeInput({ teaType: "not_sure" })
    )
    expect(r.status).toBe("insufficient_information")
    if (r.status === "insufficient_information") {
      expect(r.missingFields).toBeInstanceOf(Array)
      expect(r.missingFields.length).toBeGreaterThan(0)
      expect(r.message).toBeTruthy()
      // Must not throw or have undefined fields
      expect(() => r.missingFields.map(f => f.toUpperCase())).not.toThrow()
    }
  })

  // Integration: no_match result (impossible state with current rules — engine always matches
  // or returns insufficient_information; verify the result is never undefined)
  it("no result is ever undefined regardless of input", () => {
    const inputs: Partial<TeaClassificationInput>[] = [
      { teaType: "not_sure" },
      { netWeight: 0 },
      { netWeight: -1 },
      { teaType: "green", form: "other", presentation: "packet", netWeight: 100, weightUnit: "g" },
    ]
    for (const override of inputs) {
      const r = classifyTea(makeInput(override))
      expect(r).toBeDefined()
      expect(["classified", "insufficient_information", "no_match"]).toContain(r.status)
    }
  })
})

// ============================================================
// 14. PHASE 3.5 RULE-DRIVEN REQUIRED INFORMATION & EXPLAINABILITY
// ============================================================

describe("Phase 3.5: Rule-Driven Required Information & Explainability", () => {
  it("A: black + tea_bags classifies to 09024040 without requiring weight", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "tea_bags",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024040")
      expect(r.matchedRuleId).toBe("TEA-017")
      const weightStep = r.reasoning.find((s) => s.label === "Net Content")
      expect(weightStep).toBeDefined()
      expect(weightStep!.result).toBe("not_applicable")
      expect(weightStep!.value).toBe("Not required for this rule")
    }
  })

  it("B: black + bulk + leaf classifies to 09024020 without weight", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "whole_leaf",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024020")
      expect(r.matchedRuleId).toBe("TEA-015")
    }
  })

  it("C: black + bulk + dust classifies to 09024030 without weight", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "dust",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024030")
      expect(r.matchedRuleId).toBe("TEA-016")
    }
  })

  it("D: black + agglomerated classifies to 09024050 without weight", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "agglomerated",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024050")
      expect(r.matchedRuleId).toBe("TEA-018")
    }
  })

  it("E: black + waste classifies to 09024060 without weight", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "waste",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024060")
      expect(r.matchedRuleId).toBe("TEA-019")
    }
  })

  it("F: green + agglomerated classifies to 09022030 without weight", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "green",
      form: "agglomerated",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09022030")
      expect(r.matchedRuleId).toBe("TEA-007")
    }
  })

  it("G: green + waste classifies to 09022040 without weight", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "green",
      form: "waste",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09022040")
      expect(r.matchedRuleId).toBe("TEA-008")
    }
  })

  it("H: black + immediate_packing + no weight → insufficient_information", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
    })
    expect(r.status).toBe("insufficient_information")
    if (r.status === "insufficient_information") {
      expect(r.missingFields).toContain("netWeight")
    }
  })

  it("I: green + immediate_packing + no weight → insufficient_information", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "green",
      presentation: "immediate_packing",
      form: "whole_leaf",
    })
    expect(r.status).toBe("insufficient_information")
    if (r.status === "insufficient_information") {
      expect(r.missingFields).toContain("netWeight")
    }
  })

  it("J: black + tea_bags with weight marks weight as provided_not_required in reasoning", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "tea_bags",
      netWeight: 100,
      weightUnit: "g",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09024040")
      const weightStep = r.reasoning.find((s) => s.label === "Net Content")
      expect(weightStep).toBeDefined()
      expect(weightStep!.result).toBe("provided_not_required")
    }
  })

  it("Immediate packing with weight marks weight as matched in reasoning", () => {
    const r = classifyTea({
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    })
    expect(r.status).toBe("classified")
    if (r.status === "classified") {
      expect(r.hsCode).toBe("09023020")
      const weightStep = r.reasoning.find((s) => s.label === "Net Content")
      expect(weightStep).toBeDefined()
      expect(weightStep!.result).toBe("matched")
    }
  })
})
