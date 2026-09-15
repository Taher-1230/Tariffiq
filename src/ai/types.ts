// ============================================================
// AI Extraction Contract Types — Phase 4A → Phase 5A
//
// Re-exports from the shared ai-contract module (single source
// of truth for the API boundary) plus frontend-only types that
// the server does not need.
//
// Core Principles:
//   1. AI Extraction != Classification.
//   2. AI extracts structured facts only; deterministic rules engine
//      selects the HS code.
//   3. Uncertainty is preserved (unknown vs not_sure vs approximate).
//   4. Zero HS codes or classification fields in extraction.
// ============================================================

// Re-export all shared contract types so existing frontend imports
// from "@/ai/types" continue to work unchanged.
export type {
  WeightUnit,
  ExtractedProductCategory,
  ExtractedTeaType,
  ExtractedPresentation,
  ExtractedForm,
  ExtractedWeightUnit,
  WeightPrecision,
  TeaExtraction,
  ExtractionEvidence,
  ExtractionAmbiguity,
  ExtractionStatus,
  AIExtractionErrorCode,
  TeaExtractionResult,
  ExtractionValidationResult,
} from "../../shared/ai-contract.js"

import type {
  TeaClassificationInput,
} from "@/types/classification"

import type { TeaExtraction, ExtractedProductCategory, ExtractedTeaType, ExtractedPresentation, ExtractedForm, ExtractedWeightUnit } from "../../shared/ai-contract.js"

// ── User Confirmation Workflow Contract ────────────────────

/**
 * A single field in the confirmation UI state, connecting the
 * extracted value with user-editable state and source evidence.
 */
export interface ConfirmationFieldState<T> {
  field: keyof TeaExtraction
  label: string
  extractedValue: T
  confirmedValue: T
  evidence?: string
  isAmbiguous: boolean
  isUnknown: boolean
  isApproximate?: boolean
}

/**
 * Full state used by the user confirmation screen (Phase 4C).
 */
export interface ExtractionConfirmationState {
  sourceText: string
  fields: {
    productCategory: ConfirmationFieldState<ExtractedProductCategory>
    teaType: ConfirmationFieldState<ExtractedTeaType>
    presentation: ConfirmationFieldState<ExtractedPresentation>
    form: ConfirmationFieldState<ExtractedForm>
    netWeight: ConfirmationFieldState<number | null>
    weightUnit: ConfirmationFieldState<ExtractedWeightUnit>
  }
  isConfirmed: boolean
}

// ── Adapter Result Types ───────────────────────────────────

export interface ConversionSuccess {
  success: true
  input: TeaClassificationInput
}

export interface ConversionFailure {
  success: false
  reason: string
  missingRequiredFields: (keyof TeaExtraction)[]
  unmappedFields: (keyof TeaExtraction)[]
}

export type ConversionResult = ConversionSuccess | ConversionFailure
