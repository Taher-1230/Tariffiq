// ============================================================
// Coffee Classification Engine Types — Phase 5C-B.1
//
// Domain-specific types for the deterministic Coffee classification
// engine. Contains ONLY attributes and results supported by Heading 0901.
// No weight fields, no tea attributes.
// ============================================================

import type {
  ClassificationPathEntry,
  FieldRequirementStatus,
  ReasoningStep,
} from "@/engine/types"

// ── Physical Attributes ──────────────────────────────────────

export type CoffeeProductType =
  | "coffee"
  | "husks_and_skins"
  | "substitutes_containing_coffee"

export type CoffeePresentation = "bulk" | "other"

export type CoffeeForm =
  | "arabica_plantation"
  | "arabica_cherry"
  | "rob_cherry"
  | "other"

export type CoffeeGrade =
  | "A"
  | "B"
  | "C"
  | "AB"
  | "PB"
  | "BBB"
  | "B/B/B"
  | "other"

// ── Classification Input ─────────────────────────────────────

export interface CoffeeClassificationInput {
  productCategory: "coffee"
  productType?: CoffeeProductType
  roasted?: boolean | null
  decaffeinated?: boolean | null
  presentation?: CoffeePresentation | null
  form?: CoffeeForm | null
  grade?: CoffeeGrade | null
}

// ── Normalized Input ─────────────────────────────────────────

export interface NormalizedCoffeeInput {
  productType: CoffeeProductType
  roasted?: boolean
  decaffeinated?: boolean
  presentation?: CoffeePresentation
  form?: CoffeeForm
  grade?: CoffeeGrade
}

// ── Structured Explanation ───────────────────────────────────

export interface CoffeeStructuredExplanation {
  productType: string
  roastedState: string
  decaffeinatedState: string
  presentation: string
  form: string
  grade: string
  matchedRuleId: string
  finalCode: string
}

// ── Rule Representation ──────────────────────────────────────

export interface CoffeeRuleConditions {
  product_type?: string
  roasted?: boolean
  decaffeinated?: boolean
  presentation?: string
  form?: string
  grade?: string
  fallback_within_090111?: boolean
  fallback_within_090190?: boolean
}

export interface CoffeeRule {
  rule_id: string
  priority: number
  conditions: CoffeeRuleConditions
  output_code: string
  description: string
  source_reference: string
  notes?: string
}

// ── Results Discriminated Union ──────────────────────────────

export interface CoffeeClassifiedResult {
  status: "classified"
  hsCode: string
  hsCodeFormatted: string
  description: string
  matchedRuleId: string
  explanation: string
  classificationPath: ClassificationPathEntry[]
  inputSummary: CoffeeClassificationInput
  structuredExplanation: CoffeeStructuredExplanation
  reasoning: ReasoningStep[]
}

export interface CoffeeInsufficientInformationResult {
  status: "insufficient_information"
  missingFields: string[]
  message: string
}

export interface CoffeeNoMatchResult {
  status: "no_match"
  message: string
}

export type CoffeeClassificationResult =
  | CoffeeClassifiedResult
  | CoffeeInsufficientInformationResult
  | CoffeeNoMatchResult

// ── Required Information Analysis ─────────────────────────────

export interface CoffeeRequiredInformationAnalysis {
  sufficient: boolean
  missingFields: string[]
  reason?: string
  fieldStatus: {
    productType: FieldRequirementStatus
    roasted: FieldRequirementStatus
    decaffeinated: FieldRequirementStatus
    presentation: FieldRequirementStatus
    form: FieldRequirementStatus
    grade: FieldRequirementStatus
  }
}
