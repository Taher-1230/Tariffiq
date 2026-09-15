// ============================================================
// Phase 4D — Real-World Tea Test Matrix & Boundary Hardening
//
// Verifies:
//   1. 13 Deterministic Real-World Test Cases from Section 2
//   2. Numerical Boundaries (25g, 1000g, 3000g, 20000g, fractional bounds)
//   3. Unit Equivalences (grams vs kilograms parity)
//   4. Dedicated Special Form Precedence (tea bags, agglomerated, waste)
//   5. Unknown / Missing Attribute Classification & Requirement Analysis
//   6. Explanation Consistency (HS code, rule ID, reasoning trace alignment)
//   7. Source Tariff Data Integrity & Immutability
// ============================================================

import { describe, it, expect } from "vitest"
import { classifyTea, getRequiredTeaInformation } from "@/engine/index"
import type { TeaClassificationInput } from "@/types/classification"
import teaRulesData from "@/data/tea_rules.json"
import teaHsCodesData from "@/data/tea_hs_codes.json"

describe("Phase 4D — Real-World Tea Test Matrix", () => {
  // ── 1. Real-World Case Matrix (Section 2) ───────────────────
  describe("13 Deterministic Real-World Test Cases", () => {
    it("Case 1: Premium black tea, whole leaf, 500g retail pack -> 0902 30 20 (TEA-011)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09023020")
        expect(result.matchedRuleId).toBe("TEA-011")
      }
    })

    it("Case 2: Green tea, 25g packet -> 0902 10 10 (TEA-001)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "green",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 25,
        weightUnit: "g",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09021010")
        expect(result.matchedRuleId).toBe("TEA-001")
      }
    })

    it("Case 3: Black tea, 25g retail pack -> 0902 30 10 (TEA-010)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 25,
        weightUnit: "g",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09023010")
        expect(result.matchedRuleId).toBe("TEA-010")
      }
    })

    it("Case 4: Black tea, 500g retail pack -> 0902 30 20 (TEA-011)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09023020")
        expect(result.matchedRuleId).toBe("TEA-011")
      }
    })

    it("Case 5: Black tea, 1kg retail pack -> 0902 30 20 (TEA-011)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 1,
        weightUnit: "kg",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09023020")
        expect(result.matchedRuleId).toBe("TEA-011")
      }
    })

    it("Case 6: Black tea, 1.001kg retail pack -> 0902 30 30 (TEA-012)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 1.001,
        weightUnit: "kg",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09023030")
        expect(result.matchedRuleId).toBe("TEA-012")
      }
    })

    it("Case 7: Black tea, 3kg retail pack -> 0902 30 30 (TEA-012)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 3,
        weightUnit: "kg",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09023030")
        expect(result.matchedRuleId).toBe("TEA-012")
      }
    })

    it("Case 8: Black tea, 3.001kg packet -> 0902 40 10 (TEA-014)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "packet",
        form: "whole_leaf",
        netWeight: 3.001,
        weightUnit: "kg",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024010")
        expect(result.matchedRuleId).toBe("TEA-014")
      }
    })

    it("Case 9: Black tea tea bags, 100g -> 0902 40 40 (TEA-017)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "tea_bags",
        netWeight: 100,
        weightUnit: "g",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024040")
        expect(result.matchedRuleId).toBe("TEA-017")
      }
    })

    it("Case 10: Black tea agglomerated, 2kg bulk -> 0902 40 50 (TEA-018)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "agglomerated",
        netWeight: 2,
        weightUnit: "kg",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024050")
        expect(result.matchedRuleId).toBe("TEA-018")
      }
    })

    it("Case 11: Black tea waste -> 0902 40 60 (TEA-019)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "waste",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024060")
        expect(result.matchedRuleId).toBe("TEA-019")
      }
    })

    it("Case 12: Green tea agglomerated, 2kg bulk -> 0902 20 30 (TEA-007)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "green",
        presentation: "bulk",
        form: "agglomerated",
        netWeight: 2,
        weightUnit: "kg",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09022030")
        expect(result.matchedRuleId).toBe("TEA-007")
      }
    })

    it("Case 13: Green tea waste -> 0902 20 40 (TEA-008)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "green",
        presentation: "bulk",
        form: "waste",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09022040")
        expect(result.matchedRuleId).toBe("TEA-008")
      }
    })
  })

  // ── 2. Boundary Condition Testing ───────────────────────────
  describe("Numerical Boundary Thresholds & Unit Equivalence", () => {
    // 25g boundary for Green Tea
    it("Green tea immediate packing 25g vs 25.0001g boundary", () => {
      const at25g = classifyTea({
        productCategory: "tea",
        teaType: "green",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 25,
        weightUnit: "g",
      })
      expect(at25g.status).toBe("classified")
      if (at25g.status === "classified") expect(at25g.hsCode).toBe("09021010")

      const above25g = classifyTea({
        productCategory: "tea",
        teaType: "green",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 25.0001,
        weightUnit: "g",
      })
      expect(above25g.status).toBe("classified")
      if (above25g.status === "classified") expect(above25g.hsCode).toBe("09021020")
    })

    // 1000g boundary for Black Tea
    it("Black tea immediate packing 1000g vs 1000.0001g boundary", () => {
      const at1000g = classifyTea({
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 1000,
        weightUnit: "g",
      })
      expect(at1000g.status).toBe("classified")
      if (at1000g.status === "classified") expect(at1000g.hsCode).toBe("09023020")

      const above1000g = classifyTea({
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 1000.0001,
        weightUnit: "g",
      })
      expect(above1000g.status).toBe("classified")
      if (above1000g.status === "classified") expect(above1000g.hsCode).toBe("09023030")
    })

    // 3000g boundary for Green Tea
    it("Green tea immediate packing 3000g vs 3000.0001g boundary", () => {
      const at3000g = classifyTea({
        productCategory: "tea",
        teaType: "green",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 3000,
        weightUnit: "g",
      })
      expect(at3000g.status).toBe("classified")
      if (at3000g.status === "classified") expect(at3000g.hsCode).toBe("09021030")

      const above3000g = classifyTea({
        productCategory: "tea",
        teaType: "green",
        presentation: "packet",
        form: "whole_leaf",
        netWeight: 3000.0001,
        weightUnit: "g",
      })
      expect(above3000g.status).toBe("classified")
      if (above3000g.status === "classified") expect(above3000g.hsCode).toBe("09022010")
    })

    // 20000g boundary for Black Tea Packet
    it("Black tea packet 20000g vs 20000.0001g boundary", () => {
      const at20kg = classifyTea({
        productCategory: "tea",
        teaType: "black",
        presentation: "packet",
        form: "whole_leaf",
        netWeight: 20000,
        weightUnit: "g",
      })
      expect(at20kg.status).toBe("classified")
      if (at20kg.status === "classified") expect(at20kg.hsCode).toBe("09024010")

      const above20kg = classifyTea({
        productCategory: "tea",
        teaType: "black",
        presentation: "packet",
        form: "whole_leaf",
        netWeight: 20000.0001,
        weightUnit: "g",
      })
      expect(above20kg.status).toBe("classified")
      if (above20kg.status === "classified") expect(above20kg.hsCode).toBe("09024090") // Fallback
    })

    // Unit Parity (g vs kg)
    it("Equivalent weight in grams and kilograms produce identical classifications", () => {
      const cases: { grams: number; kgs: number; type: "green" | "black"; pres: "immediate_packing" | "packet"; form: "whole_leaf"; expectedCode: string }[] = [
        { grams: 25, kgs: 0.025, type: "green", pres: "immediate_packing", form: "whole_leaf", expectedCode: "09021010" },
        { grams: 500, kgs: 0.5, type: "black", pres: "immediate_packing", form: "whole_leaf", expectedCode: "09023020" },
        { grams: 1000, kgs: 1, type: "black", pres: "immediate_packing", form: "whole_leaf", expectedCode: "09023020" },
        { grams: 3000, kgs: 3, type: "green", pres: "immediate_packing", form: "whole_leaf", expectedCode: "09021030" },
        { grams: 10000, kgs: 10, type: "black", pres: "packet", form: "whole_leaf", expectedCode: "09024010" },
      ]

      for (const c of cases) {
        const resGrams = classifyTea({
          productCategory: "tea",
          teaType: c.type,
          presentation: c.pres,
          form: c.form,
          netWeight: c.grams,
          weightUnit: "g",
        })
        const resKg = classifyTea({
          productCategory: "tea",
          teaType: c.type,
          presentation: c.pres,
          form: c.form,
          netWeight: c.kgs,
          weightUnit: "kg",
        })

        expect(resGrams.status).toBe("classified")
        expect(resKg.status).toBe("classified")
        if (resGrams.status === "classified" && resKg.status === "classified") {
          expect(resGrams.hsCode).toBe(c.expectedCode)
          expect(resKg.hsCode).toBe(c.expectedCode)
          expect(resGrams.matchedRuleId).toBe(resKg.matchedRuleId)
        }
      }
    })
  })

  // ── 3. Dedicated Special Form Precedence ─────────────────────
  describe("Special Form Precedence", () => {
    it("Black tea bags override generic presentation and weight rules (TEA-017)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "tea_bags",
        netWeight: 500, // Normally 500g immediate packing would be 09023020, but tea_bags is 09024040
        weightUnit: "g",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024040")
        expect(result.matchedRuleId).toBe("TEA-017")
      }
    })

    it("Black agglomerated tea overrides generic bulk rules (TEA-018)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "agglomerated",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024050")
        expect(result.matchedRuleId).toBe("TEA-018")
      }
    })

    it("Black tea waste overrides generic rules (TEA-019)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "waste",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024060")
        expect(result.matchedRuleId).toBe("TEA-019")
      }
    })

    it("Green agglomerated tea overrides generic bulk rules (TEA-007)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "green",
        presentation: "bulk",
        form: "agglomerated",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09022030")
        expect(result.matchedRuleId).toBe("TEA-007")
      }
    })

    it("Green tea waste overrides generic rules (TEA-008)", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "green",
        presentation: "bulk",
        form: "waste",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09022040")
        expect(result.matchedRuleId).toBe("TEA-008")
      }
    })
  })

  // ── 4. Rule-Driven Required Information Tests ───────────────
  describe("Rule-Driven Required Information Analysis", () => {
    it("Does NOT require weight for bulk leaf black tea", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "bulk",
        form: "whole_leaf",
      }
      const req = getRequiredTeaInformation(input)
      expect(req.fieldStatus.netWeight).toBe("not_required")
      expect(req.sufficient).toBe(true)

      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024020")
      }
    })

    it("Does NOT require weight for black tea bags", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        form: "tea_bags",
      }
      const req = getRequiredTeaInformation(input)
      expect(req.fieldStatus.netWeight).toBe("not_required")
      expect(req.sufficient).toBe(true)

      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09024040")
      }
    })

    it("Requires weight when presentation is immediate_packing", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
      }
      const req = getRequiredTeaInformation(input)
      expect(req.fieldStatus.netWeight).toBe("required")
      expect(req.sufficient).toBe(false)
      expect(req.missingFields).toContain("netWeight")
    })
  })

  // ── 5. Explanation Consistency ──────────────────────────────
  describe("Explanation & Reasoning Trace Consistency", () => {
    it("All classification output fields correspond to the identical matched rule", () => {
      const input: TeaClassificationInput = {
        productCategory: "tea",
        teaType: "black",
        presentation: "immediate_packing",
        form: "whole_leaf",
        netWeight: 500,
        weightUnit: "g",
      }
      const result = classifyTea(input)
      expect(result.status).toBe("classified")
      if (result.status === "classified") {
        expect(result.hsCode).toBe("09023020")
        expect(result.matchedRuleId).toBe("TEA-011")
        expect(result.structuredExplanation.matchedRuleId).toBe("TEA-011")
        expect(result.structuredExplanation.finalCode).toBe("0902 30 20")
        expect(result.reasoning.length).toBeGreaterThan(0)
        expect(result.reasoning.every((s) => s.result === "matched" || s.result === "decision_relevant" || s.result === "provided_not_required")).toBe(true)
      }
    })
  })

  // ── 6. Source Data Integrity ────────────────────────────────
  describe("Source Data Integrity & Immutability", () => {
    it("tea_rules.json contains exactly 20 authoritative rules with unique IDs TEA-001 through TEA-020", () => {
      expect(teaRulesData.rules.length).toBe(20)
      const ruleIds = teaRulesData.rules.map((r) => r.rule_id)
      const uniqueIds = new Set(ruleIds)
      expect(uniqueIds.size).toBe(20)

      for (let i = 1; i <= 20; i++) {
        const expectedId = `TEA-${String(i).padStart(3, "0")}`
        expect(ruleIds).toContain(expectedId)
      }
    })

    it("tea_hs_codes.json contains definitions for all 0902 tariff lines", () => {
      const expectedCodes = [
        "09021010",
        "09021020",
        "09021030",
        "09021090",
        "09022010",
        "09022020",
        "09022030",
        "09022040",
        "09022090",
        "09023010",
        "09023020",
        "09023030",
        "09023090",
        "09024010",
        "09024020",
        "09024030",
        "09024040",
        "09024050",
        "09024060",
        "09024090",
      ]
      const availableCodes = teaHsCodesData.codes.map((c) => c.hs_code)
      for (const code of expectedCodes) {
        expect(availableCodes).toContain(code)
      }
    })
  })
})
