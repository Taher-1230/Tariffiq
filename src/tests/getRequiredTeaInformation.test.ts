// ============================================================
// Required Information & Candidate Analysis Tests — Phase 3.5
//
// Tests that TariffIQ determines required attributes based on
// applicable tariff rules rather than assuming every classification
// requires every attribute.
// ============================================================

import { describe, it, expect } from "vitest"
import { getRequiredTeaInformation } from "@/engine/getRequiredTeaInformation"
import { classifyTea } from "@/engine/teaClassifier"

describe("getRequiredTeaInformation candidate analysis", () => {
  // ── Case A: Black + tea_bags ──────────────────────────────
  it("Case A: Black + tea_bags → uniquely candidate TEA-017 (weight not required)", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "black",
      form: "tea_bags",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.missingFields).toEqual([])
    expect(analysis.fieldStatus.netWeight).toBe("not_required")
    expect(analysis.fieldStatus.presentation).toBe("not_required")
    expect(analysis.candidateRules.map((r) => r.rule_id)).toEqual(["TEA-017"])

    const result = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "tea_bags",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09024040")
      expect(result.matchedRuleId).toBe("TEA-017")
    }
  })

  // ── Case B: Black + bulk + leaf ───────────────────────────
  it("Case B: Black + bulk + leaf → classified 09024020 without weight", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "whole_leaf",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.missingFields).toEqual([])
    expect(analysis.fieldStatus.netWeight).toBe("not_required")
    expect(analysis.candidateRules.map((r) => r.rule_id)).toEqual(["TEA-015"])

    const result = classifyTea({
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "whole_leaf",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09024020")
    }
  })

  // ── Case C: Black + bulk + dust ───────────────────────────
  it("Case C: Black + bulk + dust → classified 09024030 without weight", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "dust",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.missingFields).toEqual([])
    expect(analysis.fieldStatus.netWeight).toBe("not_required")
    expect(analysis.candidateRules.map((r) => r.rule_id)).toEqual(["TEA-016"])

    const result = classifyTea({
      productCategory: "tea",
      teaType: "black",
      presentation: "bulk",
      form: "dust",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09024030")
    }
  })

  // ── Case D: Black + agglomerated ──────────────────────────
  it("Case D: Black + agglomerated → classified 09024050 without weight", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "black",
      form: "agglomerated",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.missingFields).toEqual([])
    expect(analysis.fieldStatus.netWeight).toBe("not_required")
    expect(analysis.candidateRules.map((r) => r.rule_id)).toEqual(["TEA-018"])

    const result = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "agglomerated",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09024050")
    }
  })

  // ── Case E: Black + waste ─────────────────────────────────
  it("Case E: Black + waste → classified 09024060 without weight", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "black",
      form: "waste",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.missingFields).toEqual([])
    expect(analysis.fieldStatus.netWeight).toBe("not_required")
    expect(analysis.candidateRules.map((r) => r.rule_id)).toEqual(["TEA-019"])

    const result = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "waste",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09024060")
    }
  })

  // ── Case F: Green + agglomerated ──────────────────────────
  it("Case F: Green + agglomerated → classified 09022030 without weight", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "green",
      form: "agglomerated",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.missingFields).toEqual([])
    expect(analysis.fieldStatus.netWeight).toBe("not_required")
    expect(analysis.candidateRules.map((r) => r.rule_id)).toEqual(["TEA-007"])

    const result = classifyTea({
      productCategory: "tea",
      teaType: "green",
      form: "agglomerated",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09022030")
    }
  })

  // ── Case G: Green + waste ─────────────────────────────────
  it("Case G: Green + waste → classified 09022040 without weight", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "green",
      form: "waste",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.missingFields).toEqual([])
    expect(analysis.fieldStatus.netWeight).toBe("not_required")
    expect(analysis.candidateRules.map((r) => r.rule_id)).toEqual(["TEA-008"])

    const result = classifyTea({
      productCategory: "tea",
      teaType: "green",
      form: "waste",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09022040")
    }
  })

  // ── Case H: Black + immediate_packing + no weight ─────────
  it("Case H: Black + immediate_packing + no weight → insufficient_information", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
    })
    expect(analysis.sufficient).toBe(false)
    expect(analysis.missingFields).toContain("netWeight")
    expect(analysis.fieldStatus.netWeight).toBe("required")
    expect(analysis.reason).toMatch(/weight/i)

    const result = classifyTea({
      productCategory: "tea",
      teaType: "black",
      presentation: "immediate_packing",
      form: "whole_leaf",
    })
    expect(result.status).toBe("insufficient_information")
    if (result.status === "insufficient_information") {
      expect(result.missingFields).toContain("netWeight")
    }
  })

  // ── Case I: Green + immediate_packing + no weight ─────────
  it("Case I: Green + immediate_packing + no weight → insufficient_information", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "green",
      presentation: "immediate_packing",
      form: "whole_leaf",
    })
    expect(analysis.sufficient).toBe(false)
    expect(analysis.missingFields).toContain("netWeight")
    expect(analysis.fieldStatus.netWeight).toBe("required")

    const result = classifyTea({
      productCategory: "tea",
      teaType: "green",
      presentation: "immediate_packing",
      form: "whole_leaf",
    })
    expect(result.status).toBe("insufficient_information")
    if (result.status === "insufficient_information") {
      expect(result.missingFields).toContain("netWeight")
    }
  })

  // ── Case J: Black + tea_bags + arbitrary weight ───────────
  it("Case J: Black + tea_bags + arbitrary weight (100g or 5000g) → same 09024040 classification", () => {
    const rNoWeight = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "tea_bags",
    })
    const r100g = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "tea_bags",
      netWeight: 100,
      weightUnit: "g",
    })
    const r5000g = classifyTea({
      productCategory: "tea",
      teaType: "black",
      form: "tea_bags",
      netWeight: 5000,
      weightUnit: "g",
    })

    expect(rNoWeight.status).toBe("classified")
    expect(r100g.status).toBe("classified")
    expect(r5000g.status).toBe("classified")

    if (
      rNoWeight.status === "classified" &&
      r100g.status === "classified" &&
      r5000g.status === "classified"
    ) {
      expect(rNoWeight.hsCode).toBe("09024040")
      expect(r100g.hsCode).toBe("09024040")
      expect(r5000g.hsCode).toBe("09024040")

      // Check reasoning trace for non-weight-dependent classification with provided weight
      const weightStep = r100g.reasoning.find((s) => s.label === "Net Content")
      expect(weightStep).toBeDefined()
      expect(weightStep!.result).toBe("provided_not_required")

      // When weight was omitted
      const weightStepOmitted = rNoWeight.reasoning.find((s) => s.label === "Net Content")
      expect(weightStepOmitted).toBeDefined()
      expect(weightStepOmitted!.result).toBe("not_applicable")
    }
  })

  // ── Green Tea Bulk ────────────────────────────────────────
  it("Green + bulk → classified 09022020 without weight", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
    })
    expect(analysis.sufficient).toBe(true)
    expect(analysis.fieldStatus.netWeight).toBe("not_required")

    const result = classifyTea({
      productCategory: "tea",
      teaType: "green",
      presentation: "bulk",
      form: "whole_leaf",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09022020")
    }
  })

  // ── Green Tea with Tea Bags (no special green tea bag rule) ─
  it("Green + tea_bags without presentation requests presentation", () => {
    const analysis = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "green",
      form: "tea_bags",
    })
    expect(analysis.sufficient).toBe(false)
    expect(analysis.missingFields).toContain("presentation")

    // With immediate_packing, green tea bags require weight
    const analysisImmediate = getRequiredTeaInformation({
      productCategory: "tea",
      teaType: "green",
      presentation: "immediate_packing",
      form: "tea_bags",
    })
    expect(analysisImmediate.sufficient).toBe(false)
    expect(analysisImmediate.missingFields).toContain("netWeight")

    // With immediate_packing + 25g, green tea bags classify under 09021010
    const resultImmediate = classifyTea({
      productCategory: "tea",
      teaType: "green",
      presentation: "immediate_packing",
      form: "tea_bags",
      netWeight: 25,
      weightUnit: "g",
    })
    expect(resultImmediate.status).toBe("classified")
    if (resultImmediate.status === "classified") {
      expect(resultImmediate.hsCode).toBe("09021010")
    }
  })

  // ── Partly Fermented Tea ──────────────────────────────────
  it("Partly fermented + tea_bags classifies to 09024040 without weight", () => {
    const result = classifyTea({
      productCategory: "tea",
      teaType: "partly_fermented",
      form: "tea_bags",
    })
    expect(result.status).toBe("classified")
    if (result.status === "classified") {
      expect(result.hsCode).toBe("09024040")
    }
  })
})
