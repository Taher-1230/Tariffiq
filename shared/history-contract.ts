// ============================================================
// Shared Classification History Contract Types — Phase 5B → Phase 5D
//
// Single source of truth for classification history API boundaries.
// ============================================================

import type { TeaExtraction } from "./ai-contract.js"
import type { CoffeeExtraction } from "./coffee-ai-contract.js"
import type { SpicesExtraction } from "./spices-ai-contract.js"

export type ProductExtractionData = TeaExtraction | CoffeeExtraction | SpicesExtraction

export interface StoredReasoningStep {
  condition: string
  matched: boolean
  ruleId?: string
  outputCode?: string
  details?: string
}

export type StoredStructuredExplanation = Record<string, any>

export interface StoredClassificationPathEntry {
  code: string
  description: string
}

export interface StoredClassificationResult {
  status: "classified" | "insufficient_information" | "no_match"
  hsCode?: string
  hsCodeFormatted?: string
  description?: string
  matchedRuleId?: string
  explanation?: string
  classificationPath?: StoredClassificationPathEntry[]
  structuredExplanation?: StoredStructuredExplanation
  reasoning?: StoredReasoningStep[]
  missingFields?: string[]
  message?: string
}

export interface ClassificationHistoryItem {
  id: string
  userId: string
  productCategory: "tea" | "coffee" | "spices" | string
  inputSource: "ai" | "manual"
  productDescription?: string
  extraction?: ProductExtractionData | null
  confirmedInput: Record<string, unknown>
  classification: StoredClassificationResult
  createdAt: string
  updatedAt?: string
}

export interface SaveClassificationRequest {
  inputSource?: "ai" | "manual"
  source?: "ai" | "manual"
  productCategory?: "tea" | "coffee" | "spices" | string
  productDescription?: string
  extraction?: ProductExtractionData | null
  confirmedInput?: Record<string, unknown>
  input?: Record<string, unknown>
}

export interface SaveClassificationResponse {
  status: "success"
  item: ClassificationHistoryItem
  historyId?: string
}

export interface ClassificationHistoryQueryParams {
  page?: number
  limit?: number
  productCategory?: "tea" | "coffee" | "spices" | string
  source?: "ai" | "manual" | string
  inputSource?: "ai" | "manual" | string
  search?: string
}

export interface PaginatedHistoryResponse {
  items: ClassificationHistoryItem[]
  page: number
  limit: number
  total: number
  totalPages?: number
}
