// ============================================================
// Engine Types — Phase 2A
//
// These types are consumed by the deterministic rules engine.
// They intentionally do NOT depend on React or any UI code.
//
// The engine accepts TeaClassificationInput (defined in
// src/types/classification.ts and shared with the UI), so that
// Phase 2B can wire them together without an adapter layer.
// ============================================================

import type { TeaClassificationInput } from "@/types/classification"

// ── Classification result discriminated union ──────────────

export type ClassificationStatus =
  | "classified"
  | "insufficient_information"
  | "no_match"

export interface ClassifiedResult {
  status: "classified"
  hsCode: string
  /** Formatted with spaces for readability, e.g. "0902 30 20" */
  hsCodeFormatted: string
  description: string
  matchedRuleId: string
  explanation: string
  /** Hierarchical path: ["09", "0902 — Tea", "090230", "09023020"] */
  classificationPath: ClassificationPathEntry[]
  /** The original (un-normalized) input, echoed back for display */
  inputSummary: TeaClassificationInput
  /** Deterministic, structured breakdown of the explanation (Phase 3) */
  structuredExplanation: StructuredExplanation
  /** Machine-readable, step-by-step reasoning trace (Phase 3) */
  reasoning: ReasoningStep[]
}

export interface ClassificationPathEntry {
  code: string
  description: string
}

/**
 * Structured explanation of a classified result — built deterministically
 * from the matched rule and normalized input. No AI involved.
 */
export interface StructuredExplanation {
  productType: string
  teaType: string
  presentation: string
  form: string
  weightCondition: string
  matchedRuleId: string
  finalCode: string
}

export type ReasoningStepResult =
  | "matched"
  | "decision_relevant"
  | "provided_not_required"
  | "required_missing"
  | "not_applicable"

export interface ReasoningStep {
  step: number
  label: string
  value: string
  result: ReasoningStepResult
}

export interface InsufficientInformationResult {
  status: "insufficient_information"
  missingFields: string[]
  message: string
}

export interface NoMatchResult {
  status: "no_match"
  message: string
}

export type TeaClassificationResult =
  | ClassifiedResult
  | InsufficientInformationResult
  | NoMatchResult

// ── Required information analysis (Phase 3.5) ─────────────

export type FieldRequirementStatus =
  | "required"
  | "optional"
  | "not_required"
  | "satisfied"

export interface RequiredInformationAnalysis {
  sufficient: boolean
  missingFields: string[]
  reason?: string
  candidateRules: TeaRule[]
  fieldStatus: {
    productCategory: FieldRequirementStatus
    teaType: FieldRequirementStatus
    presentation: FieldRequirementStatus
    form: FieldRequirementStatus
    netWeight: FieldRequirementStatus
  }
}

// ── Internal normalized input (weight always in grams) ─────

export interface NormalizedTeaInput {
  teaType: "green" | "black" | "partly_fermented"
  presentation?: "immediate_packing" | "packet" | "bulk"
  form?:
    | "whole_leaf"
    | "dust"
    | "tea_bags"
    | "agglomerated"
    | "waste"
    | "other"
  /** Weight always in grams after normalization, if provided */
  netWeightGrams?: number
}

// ── JSON data shapes (mirroring the structure of the files) ─

export interface TeaRuleConditions {
  tea_type: string | string[]
  presentation?: string
  form?: string
  max_weight_g?: number
  min_weight_exclusive_g?: number
  fallback_within_090210?: boolean
  fallback_within_090220?: boolean
  fallback_within_090230?: boolean
  fallback_within_090240?: boolean
}

export interface TeaRule {
  rule_id: string
  priority: number
  conditions: TeaRuleConditions
  output_code: string
  explanation: string
}

export interface TeaRulesFile {
  source_file: string
  source_section: string
  rule_design_note: string
  required_attributes: string[]
  rules: TeaRule[]
}

export interface HsCodeEntry {
  hs_code: string
  parent_code: string | null
  level: "heading" | "subheading" | "national_line"
  category: string
  description: string
}

export interface HsCodesFile {
  source_file: string
  source_section: string
  source_note: string
  codes: HsCodeEntry[]
}
