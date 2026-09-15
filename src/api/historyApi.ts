// ============================================================
// Classification History API Client — Phase 5D
//
// Centralized API client for saving, fetching, filtering, deleting,
// and exporting classification history records.
// ============================================================

import type {
  ClassificationHistoryItem,
  ClassificationHistoryQueryParams,
  PaginatedHistoryResponse,
  SaveClassificationRequest,
  SaveClassificationResponse,
} from "../../shared/history-contract.js"

/**
 * Persists a confirmed classification record.
 * Server runs the deterministic classification engine before saving.
 */
export async function saveClassification(
  payload: SaveClassificationRequest
): Promise<SaveClassificationResponse> {
  const res = await fetch("/api/classifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(errorBody.message || `Failed to save classification (${res.status})`)
  }

  return (await res.json()) as SaveClassificationResponse
}

/**
 * Retrieves paginated classification history with optional filters.
 */
export async function fetchClassificationHistory(
  params: ClassificationHistoryQueryParams = {}
): Promise<PaginatedHistoryResponse> {
  const searchParams = new URLSearchParams()

  if (params.page !== undefined) searchParams.set("page", String(params.page))
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit))
  if (params.productCategory && params.productCategory !== "all") {
    searchParams.set("productCategory", params.productCategory)
  }
  if (params.source && params.source !== "all") {
    searchParams.set("source", params.source)
  } else if (params.inputSource && params.inputSource !== "all") {
    searchParams.set("source", params.inputSource)
  }
  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim())
  }

  const queryString = searchParams.toString()
  const url = `/api/classifications${queryString ? `?${queryString}` : ""}`

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Failed to load classification history (${res.status})`)
  }

  return (await res.json()) as PaginatedHistoryResponse
}

/**
 * Fetches a single classification record by ID.
 */
export async function fetchClassificationById(
  id: string
): Promise<{ status: string; item: ClassificationHistoryItem }> {
  const res = await fetch(`/api/classifications/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch classification details (${res.status})`)
  }

  return (await res.json()) as { status: string; item: ClassificationHistoryItem }
}

/**
 * Deletes a classification record by ID.
 */
export async function deleteClassification(id: string): Promise<boolean> {
  const res = await fetch(`/api/classifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Failed to delete classification (${res.status})`)
  }

  return true
}

/**
 * Generates an RFC-4180 compliant CSV string from classification items.
 */
export function generateHistoryCsv(items: ClassificationHistoryItem[]): string {
  const headers = [
    "Date",
    "Product Category",
    "Source",
    "HS Code",
    "Description",
    "Matched Rule",
    "Product / Input Summary",
  ]

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""'
    let str = String(val)
    // Prevent spreadsheet formula injection (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`
    }
    return `"${str.replace(/"/g, '""')}"`
  }

  const rows = items.map((item) => {
    const isAi = item.inputSource === "ai"
    const cat =
      item.productCategory === "spices"
        ? "Spices (0904–0910)"
        : item.productCategory === "coffee"
        ? "Coffee (0901)"
        : "Tea (0902)"
    const sourceLabel = isAi ? "AI-assisted" : "Manual"
    const hsCode = item.classification.hsCodeFormatted || item.classification.hsCode || "N/A"
    const desc = item.classification.description || ""
    const rule = item.classification.matchedRuleId || "N/A"

    let inputSummary = item.productDescription || ""
    if (!inputSummary) {
      const confirmed = item.confirmedInput || {}
      inputSummary = Object.entries(confirmed)
        .filter(([k]) => k !== "productCategory")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    }

    return [
      escapeCsv(item.createdAt),
      escapeCsv(cat),
      escapeCsv(sourceLabel),
      escapeCsv(hsCode),
      escapeCsv(desc),
      escapeCsv(rule),
      escapeCsv(inputSummary),
    ].join(",")
  })

  return [headers.map(escapeCsv).join(","), ...rows].join("\r\n")
}

/**
 * Triggers client-side browser download of CSV string.
 */
export function downloadCsvFile(csvContent: string, filename = "tariffiq-classifications.csv") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
