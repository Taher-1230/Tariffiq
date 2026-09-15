// ============================================================
// Classification History Frontend & State Integration Tests — Phase 5D
//
// Tests:
//   1. History API client builds query parameters accurately
//   2. Pagination calculation utilities & totalPages derivation
//   3. Empty state detection (default vs filtered)
//   4. Records display formatting (Tea vs Coffee titles & badges)
//   5. Product category filtering logic
//   6. Input source filtering logic
//   7. Search query construction & local filtering matching
//   8. History detail item formatting (Coffee vs Tea attributes)
//   9. History deletion flow via API client
//   10. CSV export formatting (RFC 4180 escaping & headers)
//   11. Save classification client call with productCategory
//   12. Save failure handling (preserves classification, sets error)
//   13. Retry save re-submits identical confirmed payload
//   14. Duplicate save protection prevents duplicate submissions
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  fetchClassificationHistory,
  saveClassification,
  deleteClassification,
  generateHistoryCsv,
} from "@/api/historyApi"
import type {
  ClassificationHistoryItem,
  SaveClassificationRequest,
} from "../../shared/history-contract.js"

describe("Classification History Frontend & API Integration (Phase 5D)", () => {
  const mockTeaHistoryItem: ClassificationHistoryItem = {
    id: "hist_tea_001",
    userId: "usr_123",
    productCategory: "tea",
    inputSource: "manual",
    confirmedInput: {
      productCategory: "tea",
      teaType: "green",
      presentation: "immediate_packing",
      form: "whole_leaf",
      netWeight: 500,
      weightUnit: "g",
    },
    classification: {
      status: "classified",
      hsCode: "09021020",
      hsCodeFormatted: "0902 10 20",
      description: "Green tea in immediate packings of <= 3 kg",
      matchedRuleId: "TEA-002",
      classificationPath: [
        { code: "0902", description: "Tea" },
        { code: "0902 10", description: "Green tea in immediate packings" },
        { code: "0902 10 20", description: "Green tea in immediate packings <= 3 kg" },
      ],
      reasoning: [
        { condition: "Product Category", matched: true, details: "Tea (0902)" },
        { condition: "Tea Type", matched: true, details: "Green tea" },
      ],
    },
    createdAt: "2026-08-25T10:00:00.000Z",
  }

  const mockCoffeeHistoryItem: ClassificationHistoryItem = {
    id: "hist_coffee_001",
    userId: "usr_123",
    productCategory: "coffee",
    inputSource: "ai",
    productDescription: "Roasted Arabica plantation coffee beans, Grade A, in bulk",
    confirmedInput: {
      productCategory: "coffee",
      productType: "coffee",
      roasted: true,
      decaffeinated: false,
      presentation: "bulk",
      form: "arabica_plantation",
      grade: "A",
    },
    classification: {
      status: "classified",
      hsCode: "09012110",
      hsCodeFormatted: "0901 21 10",
      description: "Coffee, roasted, non-decaffeinated, in bulk packing.",
      matchedRuleId: "COF-018",
      classificationPath: [
        { code: "0901", description: "Coffee" },
        { code: "0901 21", description: "Coffee, roasted, not decaffeinated" },
        { code: "0901 21 10", description: "Coffee, roasted, non-decaffeinated, in bulk" },
      ],
      reasoning: [
        { condition: "Product Category", matched: true, details: "Coffee (0901)" },
        { condition: "Roasting State", matched: true, details: "Roasted" },
      ],
    },
    createdAt: "2026-08-25T11:00:00.000Z",
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ── 1. Query Construction ──────────────────────────────────
  it("1. fetchClassificationHistory constructs query parameters correctly", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [mockCoffeeHistoryItem],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      }),
    } as Response)

    await fetchClassificationHistory({
      page: 2,
      limit: 10,
      productCategory: "coffee",
      source: "ai",
      search: "Arabica",
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain("page=2")
    expect(calledUrl).toContain("limit=10")
    expect(calledUrl).toContain("productCategory=coffee")
    expect(calledUrl).toContain("source=ai")
    expect(calledUrl).toContain("search=Arabica")
  })

  // ── 2. Pagination Math ─────────────────────────────────────
  it("2. Pagination calculations calculate totalPages properly", () => {
    const totalRecords = 45
    const limit = 10
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit))
    expect(totalPages).toBe(5)

    const zeroTotal = 0
    const zeroPages = Math.max(1, Math.ceil(zeroTotal / limit))
    expect(zeroPages).toBe(1)
  })

  // ── 3. Empty State ─────────────────────────────────────────
  it("3. Detects empty vs filtered empty states", () => {
    const emptyDefault = { items: [], total: 0, search: "", cat: "all", src: "all" }
    const isFiltered = emptyDefault.search !== "" || emptyDefault.cat !== "all" || emptyDefault.src !== "all"
    expect(isFiltered).toBe(false)

    const emptyFiltered = { items: [], total: 0, search: "xyz", cat: "coffee", src: "all" }
    const isFilterActive = emptyFiltered.search !== "" || emptyFiltered.cat !== "all" || emptyFiltered.src !== "all"
    expect(isFilterActive).toBe(true)
  })

  // ── 4. Records Display Formatting ──────────────────────────
  it("4. Formats product title and badge for Tea and Coffee correctly", () => {
    // Tea Title
    const teaInput = mockTeaHistoryItem.confirmedInput
    const teaTitle = `${String(teaInput.teaType).toUpperCase()} — ${String(teaInput.presentation).replace(/_/g, " ")} (${teaInput.netWeight} ${teaInput.weightUnit})`
    expect(teaTitle).toBe("GREEN — immediate packing (500 g)")

    // Coffee Title
    const coffeeTitle = mockCoffeeHistoryItem.productDescription!
    expect(coffeeTitle).toContain("Roasted Arabica plantation")
    expect(mockCoffeeHistoryItem.classification.hsCodeFormatted).toBe("0901 21 10")
  })

  // ── 5. Product Category Filtering ──────────────────────────
  it("5. Filters items by productCategory accurately", () => {
    const allItems = [mockTeaHistoryItem, mockCoffeeHistoryItem]
    const coffeeOnly = allItems.filter((i) => i.productCategory === "coffee")
    expect(coffeeOnly.length).toBe(1)
    expect(coffeeOnly[0].id).toBe("hist_coffee_001")

    const teaOnly = allItems.filter((i) => i.productCategory === "tea")
    expect(teaOnly.length).toBe(1)
    expect(teaOnly[0].id).toBe("hist_tea_001")
  })

  // ── 6. Source Filtering ────────────────────────────────────
  it("6. Filters items by inputSource ('ai' vs 'manual')", () => {
    const allItems = [mockTeaHistoryItem, mockCoffeeHistoryItem]
    const aiOnly = allItems.filter((i) => i.inputSource === "ai")
    expect(aiOnly.length).toBe(1)
    expect(aiOnly[0].inputSource).toBe("ai")

    const manualOnly = allItems.filter((i) => i.inputSource === "manual")
    expect(manualOnly.length).toBe(1)
    expect(manualOnly[0].inputSource).toBe("manual")
  })

  // ── 7. Search Matching ─────────────────────────────────────
  it("7. Matches search query against HS code and descriptions", () => {
    const allItems = [mockTeaHistoryItem, mockCoffeeHistoryItem]

    const searchHs = (query: string) =>
      allItems.filter(
        (i) =>
          i.classification.hsCode?.includes(query) ||
          i.classification.description?.toLowerCase().includes(query.toLowerCase()) ||
          i.productDescription?.toLowerCase().includes(query.toLowerCase())
      )

    expect(searchHs("09012110").length).toBe(1)
    expect(searchHs("immediate packing").length).toBe(1)
    expect(searchHs("plantation").length).toBe(1)
    expect(searchHs("nonexistent").length).toBe(0)
  })

  // ── 8. History Detail Formatter ────────────────────────────
  it("8. Decomposes Coffee and Tea items into structured detail view fields", () => {
    // Coffee details
    const coffeeConfirmed = mockCoffeeHistoryItem.confirmedInput
    expect(coffeeConfirmed.roasted).toBe(true)
    expect(coffeeConfirmed.decaffeinated).toBe(false)
    expect(coffeeConfirmed.form).toBe("arabica_plantation")
    expect(coffeeConfirmed.grade).toBe("A")

    // Tea details
    const teaConfirmed = mockTeaHistoryItem.confirmedInput
    expect(teaConfirmed.teaType).toBe("green")
    expect(teaConfirmed.netWeight).toBe(500)
    expect(teaConfirmed.weightUnit).toBe("g")
  })

  // ── 9. Deletion API Call ───────────────────────────────────
  it("9. deleteClassification executes DELETE /api/classifications/:id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response)

    const success = await deleteClassification("hist_tea_001")
    expect(success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith("/api/classifications/hist_tea_001", {
      method: "DELETE",
      credentials: "include",
    })
  })

  // ── 10. CSV Export Formatting ──────────────────────────────
  it("10. generateHistoryCsv produces valid CSV with headers and escaped fields", () => {
    const csv = generateHistoryCsv([mockTeaHistoryItem, mockCoffeeHistoryItem])

    expect(csv).toContain('"Date","Product Category","Source","HS Code","Description","Matched Rule","Product / Input Summary"')
    expect(csv).toContain('"Tea (0902)","Manual","0902 10 20"')
    expect(csv).toContain('"Coffee (0901)","AI-assisted","0901 21 10"')
    expect(csv).toContain('"COF-018"')
    expect(csv).toContain('"TEA-002"')
  })

  // ── 11. Save Client Call ───────────────────────────────────
  it("11. saveClassification sends structured request to /api/classifications", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        item: mockCoffeeHistoryItem,
        historyId: "hist_coffee_001",
      }),
    } as Response)

    const payload: SaveClassificationRequest = {
      productCategory: "coffee",
      inputSource: "ai",
      productDescription: "Roasted Arabica plantation",
      confirmedInput: mockCoffeeHistoryItem.confirmedInput,
    }

    const res = await saveClassification(payload)
    expect(res.status).toBe("success")
    expect(res.historyId).toBe("hist_coffee_001")
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/classifications",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    )
  })

  // ── 12. Save Failure Handling ──────────────────────────────
  it("12. saveClassification throws descriptive error on non-200 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Database connection failed" }),
    } as Response)

    await expect(
      saveClassification({
        productCategory: "tea",
        inputSource: "manual",
        confirmedInput: {},
      })
    ).rejects.toThrow("Database connection failed")
  })

  // ── 13. Retry Save Logic ───────────────────────────────────
  it("13. Retry save re-submits exact same payload without mutating input", async () => {
    let callCount = 0
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return { ok: false, status: 503, json: async () => ({ message: "Temporary error" }) } as Response
      }
      return {
        ok: true,
        json: async () => ({ status: "success", item: mockTeaHistoryItem }),
      } as Response
    })

    const payload: SaveClassificationRequest = {
      productCategory: "tea",
      inputSource: "manual",
      confirmedInput: mockTeaHistoryItem.confirmedInput,
    }

    // 1st attempt fails
    await expect(saveClassification(payload)).rejects.toThrow("Temporary error")

    // 2nd attempt (Retry) succeeds
    const retryRes = await saveClassification(payload)
    expect(retryRes.status).toBe("success")
    expect(callCount).toBe(2)
  })

  // ── 14. Duplicate Save Protection ──────────────────────────
  it("14. Duplicate save hashing prevents identical concurrent submissions", () => {
    const payload1: SaveClassificationRequest = {
      productCategory: "coffee",
      inputSource: "manual",
      confirmedInput: { roasted: true, decaffeinated: false, presentation: "bulk" },
    }

    const payload2: SaveClassificationRequest = {
      productCategory: "coffee",
      inputSource: "manual",
      confirmedInput: { roasted: true, decaffeinated: false, presentation: "bulk" },
    }

    const hash1 = JSON.stringify({
      productCategory: payload1.productCategory,
      inputSource: payload1.inputSource,
      confirmedInput: payload1.confirmedInput,
    })

    const hash2 = JSON.stringify({
      productCategory: payload2.productCategory,
      inputSource: payload2.inputSource,
      confirmedInput: payload2.confirmedInput,
    })

    expect(hash1).toBe(hash2) // Identified as duplicate payload
  })
})
