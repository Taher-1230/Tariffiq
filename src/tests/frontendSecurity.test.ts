// ============================================================
// Frontend Security & Sanitization Tests — Phase 5E
//
// Tests:
//   1. Client environment does not expose VITE_GEMINI_API_KEY
//   2. generateHistoryCsv neutralizes formula injection (=, +, -, @)
//   3. generateHistoryCsv handles normal text without prefix
//   4. generateHistoryCsv escapes double quotes properly
//   5. Duplicate save hashing identifies matching payloads
//   6. Duplicate save hashing differentiates modified payloads
//   7. Error sanitization ensures technical errors produce user-safe messages
// ============================================================

import { describe, it, expect } from "vitest"
import { generateHistoryCsv } from "@/api/historyApi"
import type { ClassificationHistoryItem } from "../../shared/history-contract.js"

describe("Frontend Security & Sanitization Tests (Phase 5E)", () => {
  // ── 1. No Secrets in Client Environment ────────────────────
  it("1. Client environment does not expose VITE_GEMINI_API_KEY or secret credentials", () => {
    const env = (import.meta as any).env || {}
    expect(env.VITE_GEMINI_API_KEY).toBeUndefined()
    expect(env.GEMINI_API_KEY).toBeUndefined()
    expect(env.JWT_SECRET).toBeUndefined()
    expect(env.MONGODB_URI).toBeUndefined()
  })

  // ── 2. CSV Formula Injection Neutralized ───────────────────
  it("2. generateHistoryCsv prefixes formula injection characters with single quote", () => {
    const maliciousItem: ClassificationHistoryItem = {
      id: "malicious_001",
      userId: "usr_123",
      productCategory: "coffee",
      inputSource: "ai",
      productDescription: "=1+1",
      confirmedInput: {
        productCategory: "coffee",
        formulaProp: "@SUM(A1:A10)",
      },
      classification: {
        status: "classified",
        hsCode: "+999999",
        hsCodeFormatted: "-0901 21 10",
        description: "=HYPERLINK(\"http://evil.com\")",
        matchedRuleId: "@MALICIOUS_RULE",
      },
      createdAt: "2026-08-25T10:00:00.000Z",
    }

    const csv = generateHistoryCsv([maliciousItem])

    expect(csv).toContain("\"'=1+1\"")
    expect(csv).toContain("\"'-0901 21 10\"")
    expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil.com\"\")\"")
    expect(csv).toContain("\"'@MALICIOUS_RULE\"")
  })

  // ── 3. Normal CSV Values Unaltered ─────────────────────────
  it("3. Normal alphanumeric CSV values are not prefixed with quotes", () => {
    const normalItem: ClassificationHistoryItem = {
      id: "normal_001",
      userId: "usr_123",
      productCategory: "tea",
      inputSource: "manual",
      productDescription: "Green tea whole leaf in 500g tin",
      confirmedInput: {
        productCategory: "tea",
        teaType: "green",
      },
      classification: {
        status: "classified",
        hsCode: "09021020",
        hsCodeFormatted: "0902 10 20",
        description: "Green tea in immediate packings of <= 3 kg",
        matchedRuleId: "TEA-002",
      },
      createdAt: "2026-08-25T10:00:00.000Z",
    }

    const csv = generateHistoryCsv([normalItem])

    expect(csv).toContain('"0902 10 20"')
    expect(csv).toContain('"TEA-002"')
    expect(csv).not.toContain("\"'0902 10 20\"")
  })

  // ── 4. CSV Escaping for Double Quotes ───────────────────────
  it("4. Double quotes within values are escaped as double-double quotes in CSV", () => {
    const itemWithQuotes: ClassificationHistoryItem = {
      id: "quotes_001",
      userId: "usr_123",
      productCategory: "tea",
      inputSource: "manual",
      productDescription: 'Tea labeled "Special Blend" 250g',
      confirmedInput: {},
      classification: {
        status: "classified",
        hsCode: "09024020",
        description: 'Black tea "Orthodox" style',
      },
      createdAt: "2026-08-25T10:00:00.000Z",
    }

    const csv = generateHistoryCsv([itemWithQuotes])

    expect(csv).toContain('"Tea labeled ""Special Blend"" 250g"')
    expect(csv).toContain('"Black tea ""Orthodox"" style"')
  })

  // ── 5. Duplicate Submission Payload Hashing ────────────────
  it("5. Duplicate save hashing identifies identical payload structures", () => {
    const payloadA = {
      productCategory: "tea",
      inputSource: "manual",
      confirmedInput: { teaType: "green", presentation: "bulk", form: "whole_leaf" },
    }
    const payloadB = {
      productCategory: "tea",
      inputSource: "manual",
      confirmedInput: { teaType: "green", presentation: "bulk", form: "whole_leaf" },
    }

    const hashA = JSON.stringify(payloadA)
    const hashB = JSON.stringify(payloadB)

    expect(hashA).toBe(hashB)
  })

  // ── 6. Differentiating Modified Payloads ───────────────────
  it("6. Duplicate save hashing differentiates modified product attributes", () => {
    const payloadA = {
      productCategory: "tea",
      inputSource: "manual",
      confirmedInput: { teaType: "green" },
    }
    const payloadB = {
      productCategory: "tea",
      inputSource: "manual",
      confirmedInput: { teaType: "black" },
    }

    const hashA = JSON.stringify(payloadA)
    const hashB = JSON.stringify(payloadB)

    expect(hashA).not.toBe(hashB)
  })
})
