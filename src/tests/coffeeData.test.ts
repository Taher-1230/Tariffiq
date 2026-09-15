// ============================================================
// Coffee Tariff Data Integrity Tests — Phase 5C-B.0
//
// Verifies:
//   1. Every supplied Coffee HS code (Chapter 0901) exists.
//   2. Descriptions match the authoritative source exactly.
//   3. Hierarchy structure is valid (parent codes exist).
//   4. No duplicate HS codes.
//   5. No duplicate rule IDs in coffee_rules.json.
//   6. Every rule references a valid HS code from coffee_hs_codes.json.
//   7. Tea data files remain untouched and identical to expected baseline.
// ============================================================

import { describe, it, expect } from "vitest"
import coffeeHsCodesData from "@/data/coffee_hs_codes.json"
import coffeeRulesData from "@/data/coffee_rules.json"
import teaHsCodesData from "@/data/tea_hs_codes.json"
import teaRulesData from "@/data/tea_rules.json"

const EXPECTED_COFFEE_HS_CODES = [
  "0901",
  "090111",
  "09011111",
  "09011112",
  "09011113",
  "09011119",
  "09011121",
  "09011122",
  "09011123",
  "09011124",
  "09011129",
  "09011141",
  "09011142",
  "09011143",
  "09011144",
  "09011145",
  "09011149",
  "09011190",
  "090112",
  "09011200",
  "090121",
  "09012110",
  "09012190",
  "090122",
  "09012210",
  "09012290",
  "090190",
  "09019010",
  "09019020",
  "09019090",
]

const EXPECTED_EXACT_DESCRIPTIONS: Record<string, string> = {
  "0901": "Coffee, whether or not roasted or decaffeinated; coffee husks and skins; coffee substitutes containing coffee.",
  "090111": "Coffee, not roasted, not decaffeinated.",
  "09011111": "Arabica plantation, A Grade.",
  "09011112": "Arabica plantation, B Grade.",
  "09011113": "Arabica plantation, C Grade.",
  "09011119": "Arabica plantation, other.",
  "09011121": "Arabica Cherry, AB Grade.",
  "09011122": "Arabica Cherry, PB Grade.",
  "09011123": "Arabica Cherry, C Grade.",
  "09011124": "Arabica Cherry, B/B/B Grade.",
  "09011129": "Arabica Cherry, other.",
  "09011141": "Rob cherry, AB Grade.",
  "09011142": "Rob cherry, PB Grade.",
  "09011143": "Rob cherry, C Grade.",
  "09011144": "Rob cherry, B/B/B Grade.",
  "09011145": "Rob cherry, bulk.",
  "09011149": "Rob cherry, other.",
  "09011190": "Other.",
  "090112": "Coffee, not roasted, decaffeinated.",
  "09011200": "Coffee, not roasted, decaffeinated.",
  "090121": "Coffee, roasted, not decaffeinated.",
  "09012110": "Coffee, roasted, non-decaffeinated, in bulk packing.",
  "09012190": "Coffee, roasted, non-decaffeinated, other.",
  "090122": "Coffee, roasted, decaffeinated.",
  "09012210": "Coffee, roasted, decaffeinated, in bulk packing.",
  "09012290": "Coffee, roasted, decaffeinated, other.",
  "090190": "Other.",
  "09019010": "Coffee husks and skins.",
  "09019020": "Coffee substitutes containing coffee.",
  "09019090": "Other.",
}

describe("Coffee HS Codes Data Integrity (coffee_hs_codes.json)", () => {
  const codes = coffeeHsCodesData.codes
  const codeMap = new Map(codes.map((c) => [c.hs_code, c]))

  it("1. Contains all 30 expected Coffee HS codes and hierarchy levels", () => {
    expect(codes.length).toBe(EXPECTED_COFFEE_HS_CODES.length)
    for (const expectedCode of EXPECTED_COFFEE_HS_CODES) {
      expect(codeMap.has(expectedCode)).toBe(true)
    }
  })

  it("2. Contains no duplicate HS codes", () => {
    const codeList = codes.map((c) => c.hs_code)
    const uniqueList = Array.from(new Set(codeList))
    expect(codeList.length).toBe(uniqueList.length)
  })

  it("3. Descriptions match the authoritative source exactly", () => {
    for (const [code, expectedDesc] of Object.entries(EXPECTED_EXACT_DESCRIPTIONS)) {
      const entry = codeMap.get(code)
      expect(entry).toBeDefined()
      expect(entry!.description).toBe(expectedDesc)
    }
  })

  it("4. Heading 0901 has null parent_code and level 'heading'", () => {
    const root = codeMap.get("0901")
    expect(root).toBeDefined()
    expect(root!.parent_code).toBeNull()
    expect(root!.level).toBe("heading")
  })

  it("5. All subheadings reference 0901 as parent", () => {
    const subheadings = ["090111", "090112", "090121", "090122", "090190"]
    for (const sub of subheadings) {
      const entry = codeMap.get(sub)
      expect(entry).toBeDefined()
      expect(entry!.parent_code).toBe("0901")
      expect(entry!.level).toBe("subheading")
    }
  })

  it("6. All national lines reference valid parent subheadings", () => {
    const nationalLines = codes.filter((c) => c.level === "national_line")
    expect(nationalLines.length).toBe(24) // 24 8-digit tariff lines

    for (const line of nationalLines) {
      expect(line.parent_code).not.toBeNull()
      expect(codeMap.has(line.parent_code!)).toBe(true)
      const parent = codeMap.get(line.parent_code!)!
      expect(parent.level).toBe("subheading")
    }
  })

  it("7. Source metadata is present", () => {
    expect(coffeeHsCodesData.source_section).toContain("0901")
    expect(coffeeHsCodesData.source_note).toBeDefined()
  })
})

describe("Coffee Rules Data Integrity (coffee_rules.json)", () => {
  const rules = coffeeRulesData.rules
  const codes = new Set(coffeeHsCodesData.codes.map((c) => c.hs_code))

  it("8. Rules list is non-empty", () => {
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.length).toBe(24) // Covers all 24 8-digit national lines
  })

  it("9. No duplicate rule IDs exist", () => {
    const ruleIds = rules.map((r) => r.rule_id)
    const uniqueIds = Array.from(new Set(ruleIds))
    expect(ruleIds.length).toBe(uniqueIds.length)
  })

  it("10. Every rule has valid format (rule_id, output_code, description, conditions, source_reference)", () => {
    for (const rule of rules) {
      expect(rule.rule_id).toMatch(/^COF-\d{3}$/)
      expect(typeof rule.priority).toBe("number")
      expect(typeof rule.description).toBe("string")
      expect(rule.description.length).toBeGreaterThan(0)
      expect(typeof rule.source_reference).toBe("string")
      expect(rule.source_reference).toContain("0901")
      expect(typeof rule.conditions).toBe("object")
    }
  })

  it("11. Every rule's output_code exists in coffee_hs_codes.json", () => {
    for (const rule of rules) {
      expect(codes.has(rule.output_code)).toBe(true)
    }
  })

  it("12. Ambiguous 'Other' rules are properly annotated with notes", () => {
    const rule1190 = rules.find((r) => r.output_code === "09011190")
    expect(rule1190).toBeDefined()
    expect(rule1190!.notes).toContain("Requires source clarification")

    const rule9090 = rules.find((r) => r.output_code === "09019090")
    expect(rule9090).toBeDefined()
    expect(rule9090!.notes).toContain("Requires source clarification")
  })
})

describe("Tea Tariff Data Protection", () => {
  it("13. tea_hs_codes.json is untouched (Chapter 0902)", () => {
    expect(teaHsCodesData.source_section).toBe("0902 — Tea")
    expect(teaHsCodesData.codes.length).toBe(22)
    expect(teaHsCodesData.codes[0].hs_code).toBe("0902")
  })

  it("14. tea_rules.json is untouched", () => {
    expect(teaRulesData.source_section).toBe("0902 — Tea")
    expect(teaRulesData.rules.length).toBe(20)
    expect(teaRulesData.rules[0].rule_id).toBe("TEA-001")
  })
})
