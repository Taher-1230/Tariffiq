/**
 * Phase 6.1 — Spices Data Integrity Tests
 *
 * Validates the normalized spices tariff datasets extracted from
 * "HS PROJECT OVERVIEW.pdf" (Chapter 09, Headings 0904–0910).
 *
 * These tests verify structural integrity only.
 * They do NOT test classification logic (Phase 6.2+).
 */
import { describe, it, expect } from "vitest"
import spicesHsCodes from "../data/spices_hs_codes.json"
import spicesRules from "../data/spices_rules.json"
import teaHsCodes from "../data/tea_hs_codes.json"
import teaRules from "../data/tea_rules.json"
import coffeeHsCodes from "../data/coffee_hs_codes.json"
import coffeeRules from "../data/coffee_rules.json"
import { createHash } from "crypto"
import { readFileSync } from "fs"
import { resolve } from "path"

// ── Helper: compute SHA-256 of a file ──
function sha256(relPath: string): string {
  const abs = resolve(__dirname, "..", "data", relPath)
  return createHash("sha256").update(readFileSync(abs)).digest("hex")
}

// ── Constants ──
const EXPECTED_NATIONAL_LINE_COUNT = 94
const VALID_HEADINGS = ["0904", "0905", "0906", "0907", "0908", "0909", "0910"]
const VALID_LEVELS = ["heading", "subheading", "national_line"]

interface CodeEntry {
  hs_code: string
  parent_code: string | null
  level: string
  category: string
  description: string
}

// Pre-index HS codes for lookup
const hsCodeMap = new Map<string, CodeEntry>(
  spicesHsCodes.codes.map((c: CodeEntry) => [c.hs_code, c])
)

describe("Phase 6.1 — Spices HS Code Data Integrity", () => {
  // ── 1. Valid 8-digit format ──
  it("1. Every 8-digit national_line code is validly formatted", () => {
    const nationalLines = spicesHsCodes.codes.filter(
      (c: CodeEntry) => c.level === "national_line"
    )
    for (const line of nationalLines) {
      expect(line.hs_code).toMatch(/^09\d{6}$/)
    }
  })

  // ── 2. No duplicate codes ──
  it("2. No duplicate HS codes exist", () => {
    const codes = spicesHsCodes.codes.map((c: CodeEntry) => c.hs_code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })

  // ── 3. Every national line has a valid parent ──
  it("3. Every national_line has a valid parent_code that exists in the dataset", () => {
    const nationalLines = spicesHsCodes.codes.filter(
      (c: CodeEntry) => c.level === "national_line"
    )
    for (const line of nationalLines) {
      expect(line.parent_code).toBeTruthy()
      expect(hsCodeMap.has(line.parent_code!)).toBe(true)
    }
  })

  // ── 4. Every parent exists in the dataset ──
  it("4. Every non-null parent_code references an existing entry", () => {
    for (const code of spicesHsCodes.codes) {
      if (code.parent_code !== null) {
        expect(hsCodeMap.has(code.parent_code)).toBe(true)
      }
    }
  })

  // ── 5. Every 8-digit code belongs to 0904–0910 ──
  it("5. Every 8-digit national_line belongs to headings 0904–0910", () => {
    const nationalLines = spicesHsCodes.codes.filter(
      (c: CodeEntry) => c.level === "national_line"
    )
    for (const line of nationalLines) {
      const heading = line.hs_code.substring(0, 4)
      expect(VALID_HEADINGS).toContain(heading)
    }
  })

  // ── 6. Every tariff line has a non-empty description ──
  it("6. Every entry has a non-empty description", () => {
    for (const code of spicesHsCodes.codes) {
      expect(code.description).toBeTruthy()
      expect(code.description.trim().length).toBeGreaterThan(0)
    }
  })

  // ── 7. All headings 0904–0910 are present ──
  it("7. All seven spice headings (0904–0910) are present", () => {
    const headings = spicesHsCodes.codes
      .filter((c: CodeEntry) => c.level === "heading")
      .map((c: CodeEntry) => c.hs_code)
    for (const h of VALID_HEADINGS) {
      expect(headings).toContain(h)
    }
  })

  // ── 8. Expected national line count ──
  it(`8. Contains exactly ${EXPECTED_NATIONAL_LINE_COUNT} national 8-digit tariff lines`, () => {
    const count = spicesHsCodes.codes.filter(
      (c: CodeEntry) => c.level === "national_line"
    ).length
    expect(count).toBe(EXPECTED_NATIONAL_LINE_COUNT)
  })

  // ── 9. Valid hierarchy levels ──
  it("9. Every entry has a valid level (heading, subheading, or national_line)", () => {
    for (const code of spicesHsCodes.codes) {
      expect(VALID_LEVELS).toContain(code.level)
    }
  })

  // ── 10. Headings have null parent ──
  it("10. All heading-level entries have parent_code = null", () => {
    const headings = spicesHsCodes.codes.filter(
      (c: CodeEntry) => c.level === "heading"
    )
    for (const h of headings) {
      expect(h.parent_code).toBeNull()
    }
  })

  // ── 11. Subheadings have valid heading parent ──
  it("11. All subheadings have a heading-level parent", () => {
    const subheadings = spicesHsCodes.codes.filter(
      (c: CodeEntry) => c.level === "subheading"
    )
    for (const sh of subheadings) {
      const parent = hsCodeMap.get(sh.parent_code!)
      expect(parent).toBeDefined()
      expect(parent!.level).toBe("heading")
    }
  })

  // ── 12. National lines have subheading parent ──
  it("12. All national_lines have a subheading-level parent", () => {
    const nationalLines = spicesHsCodes.codes.filter(
      (c: CodeEntry) => c.level === "national_line"
    )
    for (const nl of nationalLines) {
      const parent = hsCodeMap.get(nl.parent_code!)
      expect(parent).toBeDefined()
      expect(parent!.level).toBe("subheading")
    }
  })

  // ── 13. Source references exist ──
  it("13. Source file and section references exist", () => {
    expect(spicesHsCodes.source_file).toBeTruthy()
    expect(spicesHsCodes.source_section).toBeTruthy()
    expect(spicesHsCodes.source_note).toBeTruthy()
  })

  // ── 14. Chapter notes are present ──
  it("14. Chapter notes (mixture rules, legal notes) are documented", () => {
    expect(spicesHsCodes.chapter_notes).toBeDefined()
    expect(spicesHsCodes.chapter_notes.length).toBeGreaterThanOrEqual(5)
  })

  // ── 15. No codes from Tea heading 0902 ──
  it("15. No codes accidentally belong to Tea (0902)", () => {
    for (const code of spicesHsCodes.codes) {
      expect(code.hs_code.startsWith("0902")).toBe(false)
    }
  })

  // ── 16. No codes from Coffee heading 0901 ──
  it("16. No codes accidentally belong to Coffee (0901)", () => {
    for (const code of spicesHsCodes.codes) {
      expect(code.hs_code.startsWith("0901")).toBe(false)
    }
  })
})

describe("Phase 6.1 — Spices Rules Data Integrity", () => {
  // ── 17. No duplicate rule IDs ──
  it("17. No duplicate rule IDs exist", () => {
    const ids = spicesRules.rules.map((r: { rule_id: string }) => r.rule_id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  // ── 18. Every rule output_code exists in spices_hs_codes.json ──
  it("18. Every rule output_code exists in spices_hs_codes.json", () => {
    for (const rule of spicesRules.rules) {
      expect(hsCodeMap.has(rule.output_code)).toBe(true)
    }
  })

  // ── 19. Every rule has a non-empty description ──
  it("19. Every rule has a non-empty description", () => {
    for (const rule of spicesRules.rules) {
      expect(rule.description).toBeTruthy()
      expect(rule.description.trim().length).toBeGreaterThan(0)
    }
  })

  // ── 20. Every rule has a source_reference ──
  it("20. Every rule has a source_reference", () => {
    for (const rule of spicesRules.rules) {
      expect(rule.source_reference).toBeTruthy()
    }
  })

  // ── 21. All rule IDs follow the SPC-NNN convention ──
  it("21. All rule IDs follow SPC-NNN naming convention", () => {
    for (const rule of spicesRules.rules) {
      expect(rule.rule_id).toMatch(/^SPC-\d{3}$/)
    }
  })

  // ── 22. Every rule has a numeric priority ──
  it("22. Every rule has a numeric priority", () => {
    for (const rule of spicesRules.rules) {
      expect(typeof rule.priority).toBe("number")
      expect(rule.priority).toBeGreaterThan(0)
    }
  })

  // ── 23. 'Other' rules have notes explaining scope ──
  it("23. Fallback/Other rules have explicit notes (not universal catch-alls)", () => {
    const fallbackRules = spicesRules.rules.filter((r: { output_code: string }) =>
      r.output_code.endsWith("90") ||
      r.output_code.endsWith("19") ||
      r.output_code.endsWith("29") ||
      r.output_code.endsWith("39") ||
      r.output_code.endsWith("49")
    )
    // Exclude non-"Other" codes that just happen to end in these digits
    const actualFallbacks = fallbackRules.filter(
      (r: { description: string; notes?: string; conditions: Record<string, unknown> }) =>
        r.description.toLowerCase().includes("other") ||
        Object.keys(r.conditions).some((k) => k.startsWith("fallback_"))
    )
    for (const rule of actualFallbacks) {
      expect(rule.notes).toBeTruthy()
      expect(
        rule.notes!.includes("REQUIRES SOURCE CLARIFICATION") ||
        rule.notes!.includes("implementation requires") ||
        rule.notes!.includes("This is the classification for mixtures")
      ).toBe(true)
    }
  })

  // ── 24. Source file and section exist in rules ──
  it("24. Rules source metadata is present", () => {
    expect(spicesRules.source_file).toBeTruthy()
    expect(spicesRules.source_section).toBeTruthy()
    expect(spicesRules.source_note).toBeTruthy()
  })

  // ── 25. Rule count matches national line count ──
  it("25. Rule count matches national line count (94 rules for 94 tariff lines)", () => {
    expect(spicesRules.rules.length).toBe(EXPECTED_NATIONAL_LINE_COUNT)
  })
})

describe("Phase 6.1 — Tea and Coffee Data Unchanged", () => {
  // ── 26. Tea HS codes unchanged ──
  it("26. Tea HS codes JSON is unchanged (SHA-256)", () => {
    const hash = sha256("tea_hs_codes.json")
    expect(hash).toBe(
      "d550559657676e77eba28df5f0c4b49baca8d695cfafc8a2d4084070cc704743"
    )
  })

  // ── 27. Tea rules unchanged ──
  it("27. Tea rules JSON is unchanged (SHA-256)", () => {
    const hash = sha256("tea_rules.json")
    expect(hash).toBe(
      "ffa2c0a3e1769af155faf6504528f2633c6d4153c1dc2f8b067a93c952216828"
    )
  })

  // ── 28. Coffee HS codes unchanged ──
  it("28. Coffee HS codes JSON is unchanged (SHA-256)", () => {
    const hash = sha256("coffee_hs_codes.json")
    expect(hash).toBe(
      "92f086faeb56a541af5dd6851cb68c9ce129f4da7908ead0b457fe11a59fcd5e"
    )
  })

  // ── 29. Coffee rules unchanged ──
  it("29. Coffee rules JSON is unchanged (SHA-256)", () => {
    const hash = sha256("coffee_rules.json")
    expect(hash).toBe(
      "c06f3a7f6af2dfdfca6bdac91408610dcc8363a57770af16e0a60d012ec21014"
    )
  })

  // ── 30. Tea code count unchanged ──
  it("30. Tea dataset has same number of entries (not accidentally modified)", () => {
    expect(teaHsCodes.codes.length).toBe(22)
  })

  // ── 31. Coffee code count unchanged ──
  it("31. Coffee dataset has same number of entries (not accidentally modified)", () => {
    expect(coffeeHsCodes.codes.length).toBe(30)
  })

  // ── 32. Tea rules count unchanged ──
  it("32. Tea rules count unchanged", () => {
    expect(teaRules.rules.length).toBe(20)
  })

  // ── 33. Coffee rules count unchanged ──
  it("33. Coffee rules count unchanged", () => {
    expect(coffeeRules.rules.length).toBe(24)
  })
})

describe("Phase 6.1 — Cross-Heading Code Integrity", () => {
  // ── 34. No overlap with Tea codes ──
  it("34. No spices code accidentally overlaps with Tea codes", () => {
    const teaCodes = new Set(
      teaHsCodes.codes.map((c: { hs_code: string }) => c.hs_code)
    )
    for (const code of spicesHsCodes.codes) {
      expect(teaCodes.has(code.hs_code)).toBe(false)
    }
  })

  // ── 35. No overlap with Coffee codes ──
  it("35. No spices code accidentally overlaps with Coffee codes", () => {
    const coffeeCodes = new Set(
      coffeeHsCodes.codes.map((c: { hs_code: string }) => c.hs_code)
    )
    for (const code of spicesHsCodes.codes) {
      expect(coffeeCodes.has(code.hs_code)).toBe(false)
    }
  })

  // ── 36. Verify per-heading national line counts ──
  it("36. Per-heading national line counts match PDF extraction", () => {
    const nationalLines = spicesHsCodes.codes.filter(
      (c: { level: string }) => c.level === "national_line"
    )
    const countByHeading: Record<string, number> = {}
    for (const nl of nationalLines) {
      const heading = nl.hs_code.substring(0, 4)
      countByHeading[heading] = (countByHeading[heading] || 0) + 1
    }
    expect(countByHeading["0904"]).toBe(17)
    expect(countByHeading["0905"]).toBe(2)
    expect(countByHeading["0906"]).toBe(6)
    expect(countByHeading["0907"]).toBe(5)
    expect(countByHeading["0908"]).toBe(15)
    expect(countByHeading["0909"]).toBe(20)
    expect(countByHeading["0910"]).toBe(29)
  })
})
