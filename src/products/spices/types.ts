// ============================================================
// Spices Classification Engine Types — Phase 6.2
//
// Domain-specific types for the deterministic Spices classification
// engine (Chapter 09, Headings 0904–0910).
// Supported strictly by spices_hs_codes.json and spices_rules.json.
// ============================================================

import type {
  ClassificationPathEntry,
  FieldRequirementStatus,
  ReasoningStep,
} from "@/engine/types"

// ── Physical & Botanical Attributes ─────────────────────────

export type SpiceType =
  | "pepper"
  | "capsicum_pimenta"
  | "vanilla"
  | "cinnamon"
  | "cloves"
  | "nutmeg"
  | "mace"
  | "cardamom"
  | "coriander"
  | "cumin"
  | "anise"
  | "badian"
  | "caraway_or_fennel"
  | "juniper_berries"
  | "ginger"
  | "saffron"
  | "turmeric"
  | "mixture"
  | "other_spice"

export type BotanicalType =
  | "piper"
  | "capsicum"
  | "pimenta"
  | "cinnamomum_zeylanicum"
  | "cassia"

export type SpiceSubType =
  // 0904 Pepper
  | "long_pepper"
  | "light_black_pepper"
  | "black_pepper_garbled"
  | "black_pepper_ungarbled"
  | "green_pepper_dehydrated"
  | "pinheads"
  | "green_pepper_frozen_or_dried"
  | "non_green_frozen"
  // 0908 Cardamom
  | "alleppey_green"
  | "coorg_green"
  | "bleached_half_bleached_bleachable"
  | "mixed"
  // 0909 Cumin
  | "black"
  | "other_than_black"
  // 0910 Ginger
  | "unbleached"
  | "bleached"
  // 0910 Mixtures
  | "cross_heading_mixture"
  // 0910 Other Spices
  | "celery"
  | "fenugreek"
  | "dill"
  | "ajwain"
  | "cassia_torea"
  | "cassia"
  | "poppy"
  | "mustard"

export type SpiceForm =
  | "bark"
  | "tree_flowers"
  | "stem"
  | "not_stem"
  | "in_shell"
  | "shelled"
  | "chilly_powder"
  | "chilly_seeds"
  | "powder"
  | "small_cardamom_seeds"
  | "husk"
  | "stigma"
  | "stamen"
  | "seed"

export type SpiceProcessingState =
  | "fresh"
  | "dried"
  | "extracted"
  | "not_extracted"

export type SpiceQuality = "seed_quality"

export type SpiceSizeCategory = "large" | "small"

// ── Classification Input ─────────────────────────────────────

export interface SpicesClassificationInput {
  productCategory: "spices"
  spiceType?: SpiceType | null
  botanicalType?: BotanicalType | null
  crushedOrGround?: boolean | null
  subType?: SpiceSubType | null
  form?: SpiceForm | null
  processingState?: SpiceProcessingState | null
  quality?: SpiceQuality | null
  sizeCategory?: SpiceSizeCategory | null
  // Statutory exclusions / notes
  isCubeb?: boolean | null
  essentialCharacter?: boolean | null
  mixtureHeadings?: string[] | null
}

// ── Normalized Input ─────────────────────────────────────────

export interface NormalizedSpicesInput {
  spiceType: SpiceType
  botanicalType?: BotanicalType
  crushedOrGround?: boolean
  subType?: SpiceSubType
  form?: SpiceForm
  processingState?: SpiceProcessingState
  quality?: SpiceQuality
  sizeCategory?: SpiceSizeCategory
  isCubeb?: boolean
  essentialCharacter?: boolean
  mixtureHeadings?: string[]
}

// ── Structured Explanation ───────────────────────────────────

export interface SpicesStructuredExplanation {
  spiceType: string
  botanicalType: string
  crushedOrGroundState: string
  subType: string
  form: string
  processingState: string
  quality: string
  sizeCategory: string
  matchedRuleId: string
  finalCode: string
}

// ── Rule Representation ──────────────────────────────────────

export interface SpicesRuleConditions {
  spice_type?: string
  botanical_type?: string
  crushed_or_ground?: boolean
  sub_type?: string
  form?: string
  processing_state?: string
  quality?: string
  size_category?: string
  // Scoped fallbacks
  fallback_within_090411?: boolean
  fallback_within_090422_capsicum?: boolean
  fallback_within_090422_pimenta?: boolean
  fallback_within_090611?: boolean
  fallback_within_090619?: boolean
  fallback_within_090710?: boolean
  fallback_within_090831?: boolean
  fallback_within_090832?: boolean
  fallback_within_090921?: boolean
  fallback_within_cumin_black?: boolean
  fallback_within_cumin_other?: boolean
  fallback_within_anise?: boolean
  fallback_within_badian?: boolean
  fallback_within_caraway_fennel?: boolean
  fallback_within_juniper?: boolean
  fallback_within_091011?: boolean
  fallback_within_091012?: boolean
  fallback_within_091020?: boolean
  fallback_within_091030?: boolean
  fallback_within_091099?: boolean
  fallback_within_091099_seed?: boolean
  fallback_within_091099_powder?: boolean
  fallback_within_091099_husk?: boolean
}

export interface SpicesRule {
  rule_id: string
  priority: number
  heading: string
  conditions: SpicesRuleConditions
  output_code: string
  description: string
  source_reference: string
  notes?: string
}

// ── Results Discriminated Union ──────────────────────────────

export interface SpicesClassifiedResult {
  status: "classified"
  hsCode: string
  hsCodeFormatted: string
  description: string
  matchedRuleId: string
  explanation: string
  classificationPath: ClassificationPathEntry[]
  inputSummary: SpicesClassificationInput
  structuredExplanation: SpicesStructuredExplanation
  reasoning: ReasoningStep[]
}

export interface SpicesInsufficientInformationResult {
  status: "insufficient_information"
  missingFields: string[]
  message: string
}

export interface SpicesNoMatchResult {
  status: "no_match"
  message: string
  exclusionReason?: string
}

export type SpicesClassificationResult =
  | SpicesClassifiedResult
  | SpicesInsufficientInformationResult
  | SpicesNoMatchResult

// ── Required Information Analysis ─────────────────────────────

export interface SpicesRequiredInformationAnalysis {
  sufficient: boolean
  missingFields: string[]
  reason?: string
  fieldStatus: {
    spiceType: FieldRequirementStatus
    botanicalType: FieldRequirementStatus
    crushedOrGround: FieldRequirementStatus
    subType: FieldRequirementStatus
    form: FieldRequirementStatus
    processingState: FieldRequirementStatus
    quality: FieldRequirementStatus
    sizeCategory: FieldRequirementStatus
    essentialCharacter: FieldRequirementStatus
  }
}
