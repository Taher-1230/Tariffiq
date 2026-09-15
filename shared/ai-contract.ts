// ============================================================
// Shared AI Extraction Contract Types — Phase 5A
//
// Single source of truth for the API boundary between the
// TariffIQ frontend and backend. Both sides import from here.
//
// Core Principles:
//   1. AI Extraction != Classification.
//   2. AI extracts structured facts only; deterministic rules engine
//      selects the HS code.
//   3. Uncertainty is preserved (unknown vs not_sure vs approximate).
//   4. Zero HS codes or classification fields in extraction.
//   5. No React/Vite/browser dependencies — pure TypeScript.
// ============================================================

// ── Weight Unit (inlined to avoid coupling to frontend types) ──

export type WeightUnit = "g" | "kg" | undefined

// ── Extracted Attribute Types ──────────────────────────────

export type ExtractedProductCategory = "tea" | "unknown"

export type ExtractedTeaType =
  | "green"
  | "black"
  | "partly_fermented"
  | "not_sure"
  | "unknown"

export type ExtractedPresentation =
  | "immediate_packing"
  | "packet"
  | "bulk"
  | "unknown"

export type ExtractedForm =
  | "whole_leaf"
  | "dust"
  | "tea_bags"
  | "agglomerated"
  | "waste"
  | "other"
  | "unknown"

export type ExtractedWeightUnit = WeightUnit | null

export type WeightPrecision = "exact" | "approximate" | "unknown"

/**
 * Structured product attributes extracted from natural language text.
 * Represents purely physical and packaging facts about the product.
 */
export interface TeaExtraction {
  productCategory: ExtractedProductCategory
  teaType: ExtractedTeaType
  presentation: ExtractedPresentation
  form: ExtractedForm
  netWeight: number | null
  weightUnit: ExtractedWeightUnit
  weightPrecision?: WeightPrecision
}

// ── Evidence & Ambiguity Tracking ──────────────────────────

/**
 * Text span from the source description supporting an extracted attribute.
 */
export interface ExtractionEvidence {
  field: keyof TeaExtraction
  sourceText: string
  startIndex?: number
  endIndex?: number
}

/**
 * Represents an ambiguity identified in the natural language text
 * where multiple plausible interpretations exist.
 */
export interface ExtractionAmbiguity {
  field: keyof TeaExtraction
  candidates: string[]
  reason: string
}

// ── Extraction Result Container ────────────────────────────

export type ExtractionStatus =
  | "extracted"
  | "needs_clarification"
  | "unsupported"
  | "error"

export type AIExtractionErrorCode =
  | "EMPTY_INPUT"
  | "INPUT_TOO_LONG"
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_AUTHENTICATION_ERROR"
  | "AI_RATE_LIMITED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_NETWORK_ERROR"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "INVALID_AI_RESPONSE"
  | "UNSUPPORTED_PRODUCT"

/**
 * Complete result returned by the natural language extraction layer.
 */
export interface TeaExtractionResult {
  status: ExtractionStatus
  attributes: TeaExtraction
  missingFields: (keyof TeaExtraction)[]
  ambiguities: ExtractionAmbiguity[]
  evidence: ExtractionEvidence[]
  sourceText: string
  notes?: string
  errorCode?: AIExtractionErrorCode
  errorMessage?: string
}

// ── Extraction Validation Types ────────────────────────────

export interface ExtractionValidationResult {
  valid: boolean
  errors: string[]
  forbiddenFieldsFound: string[]
}
