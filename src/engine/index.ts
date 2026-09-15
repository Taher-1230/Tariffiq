// ============================================================
// Engine barrel export — Phase 2A
// ============================================================

export { classifyTea } from "@/engine/teaClassifier"
export { normalizeTeaInput } from "@/engine/normalizeTeaInput"
export { validateTeaInput } from "@/engine/validateTeaInput"
export { getRequiredTeaInformation } from "@/engine/getRequiredTeaInformation"
export {
  buildReasoningTrace,
  buildStructuredExplanation,
  describeMatchedCondition,
  describeWeightCondition,
} from "@/engine/explainTeaClassification"
export {
  deriveFallbackOutputCodes,
  deriveFallbackRuleIds,
  findRuleOverlaps,
  validateTeaDataIntegrity,
} from "@/engine/validateTeaData"

export type {
  ClassificationPathEntry,
  ClassificationStatus,
  ClassifiedResult,
  FieldRequirementStatus,
  InsufficientInformationResult,
  NoMatchResult,
  NormalizedTeaInput,
  ReasoningStep,
  ReasoningStepResult,
  RequiredInformationAnalysis,
  StructuredExplanation,
  TeaClassificationResult,
} from "@/engine/types"
export type {
  DataIntegrityIssue,
  RuleOverlap,
} from "@/engine/validateTeaData"
