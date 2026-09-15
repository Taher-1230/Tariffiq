// ============================================================
// Spices Explanation & Reasoning Builder — Phase 6.2
//
// Generates structured explanations and step-by-step reasoning traces
// for deterministic Spices classification results.
// Entirely deterministic. Zero LLM involvement.
// ============================================================

import type { ReasoningStep } from "@/engine/types"
import type {
  NormalizedSpicesInput,
  SpicesClassificationInput,
  SpicesRule,
  SpicesStructuredExplanation,
} from "./types"

const SPICE_TYPE_LABELS: Record<string, string> = {
  pepper: "Pepper (Piper)",
  capsicum_pimenta: "Capsicum / Pimenta fruits",
  vanilla: "Vanilla",
  cinnamon: "Cinnamon & cinnamon-tree flowers",
  cloves: "Cloves",
  nutmeg: "Nutmeg",
  mace: "Mace",
  cardamom: "Cardamom",
  coriander: "Seeds of coriander",
  cumin: "Seeds of cumin",
  anise: "Seeds of anise",
  badian: "Seeds of badian (star anise)",
  caraway_or_fennel: "Seeds of caraway or fennel",
  juniper_berries: "Juniper berries",
  ginger: "Ginger",
  saffron: "Saffron",
  turmeric: "Turmeric (Curcuma)",
  mixture: "Cross-heading spice mixture (Note 1b)",
  other_spice: "Other spices",
}

const BOTANICAL_LABELS: Record<string, string> = {
  piper: "Genus Piper",
  capsicum: "Genus Capsicum",
  pimenta: "Genus Pimenta",
  cinnamomum_zeylanicum: "Cinnamomum zeylanicum Blume",
  cassia: "Cassia",
}

const FORM_LABELS: Record<string, string> = {
  bark: "Bark",
  tree_flowers: "Tree flowers",
  stem: "Stem",
  not_stem: "Other than stem",
  in_shell: "In shell",
  shelled: "Shelled",
  chilly_powder: "Chilly powder",
  chilly_seeds: "Chilly seeds",
  powder: "Powder",
  small_cardamom_seeds: "Small cardamom seeds",
  husk: "Husk",
  stigma: "Stigma",
  stamen: "Stamen",
  seed: "Seed",
}

const SUB_TYPE_LABELS: Record<string, string> = {
  long_pepper: "Long pepper",
  light_black_pepper: "Light black pepper",
  black_pepper_garbled: "Black pepper, garbled",
  black_pepper_ungarbled: "Black pepper, ungarbled",
  green_pepper_dehydrated: "Green pepper, dehydrated",
  pinheads: "Pepper pinheads",
  green_pepper_frozen_or_dried: "Green pepper, frozen or dried",
  non_green_frozen: "Pepper other than green, frozen",
  alleppey_green: "Alleppey green",
  coorg_green: "Coorg green",
  bleached_half_bleached_bleachable: "Bleached / half bleached / bleachable",
  mixed: "Mixed small cardamom",
  black: "Black cumin",
  other_than_black: "Cumin other than black",
  unbleached: "Unbleached",
  bleached: "Bleached",
  cross_heading_mixture: "Cross-heading spice mixture (Chapter Note 1b)",
  celery: "Celery",
  fenugreek: "Fenugreek",
  dill: "Dill",
  ajwain: "Ajwain",
  cassia_torea: "Cassia torea",
  cassia: "Cassia",
  poppy: "Poppy",
  mustard: "Mustard",
}

export function buildSpicesStructuredExplanation(
  _input: SpicesClassificationInput,
  normalized: NormalizedSpicesInput,
  rule: SpicesRule
): SpicesStructuredExplanation {
  const spiceType = SPICE_TYPE_LABELS[normalized.spiceType] ?? normalized.spiceType
  const botanicalType = normalized.botanicalType ? BOTANICAL_LABELS[normalized.botanicalType] ?? normalized.botanicalType : "N/A"

  let crushedOrGroundState = "N/A"
  if (normalized.crushedOrGround === true) crushedOrGroundState = "Crushed or ground"
  else if (normalized.crushedOrGround === false) crushedOrGroundState = "Neither crushed nor ground (whole)"

  const subType = normalized.subType ? SUB_TYPE_LABELS[normalized.subType] ?? normalized.subType : "N/A"
  const form = normalized.form ? FORM_LABELS[normalized.form] ?? normalized.form : "N/A"
  const processingState = normalized.processingState ? normalized.processingState.replace(/_/g, " ") : "N/A"
  const quality = normalized.quality === "seed_quality" ? "Of seed quality" : "N/A"
  const sizeCategory = normalized.sizeCategory ? (normalized.sizeCategory === "large" ? "Large (Amomum)" : "Small (Elettaria)") : "N/A"

  return {
    spiceType,
    botanicalType,
    crushedOrGroundState,
    subType,
    form,
    processingState,
    quality,
    sizeCategory,
    matchedRuleId: rule.rule_id,
    finalCode: rule.output_code,
  }
}

export function buildSpicesReasoningTrace(
  _input: SpicesClassificationInput,
  normalized: NormalizedSpicesInput,
  rule: SpicesRule
): ReasoningStep[] {
  const steps: ReasoningStep[] = []
  let stepNum = 1

  // 1. Chapter 09 Heading Branch
  steps.push({
    step: stepNum++,
    label: "Chapter 09 Heading",
    value: `Heading ${rule.heading} — ${SPICE_TYPE_LABELS[normalized.spiceType] ?? normalized.spiceType}`,
    result: "matched",
  })

  // 2. Botanical identity if specified
  if (normalized.botanicalType) {
    steps.push({
      step: stepNum++,
      label: "Botanical Genus / Species",
      value: BOTANICAL_LABELS[normalized.botanicalType] ?? normalized.botanicalType,
      result: "matched",
    })
  }

  // 3. Crushed / Ground state
  if (normalized.crushedOrGround !== undefined) {
    steps.push({
      step: stepNum++,
      label: "Crushed / Ground Status",
      value: normalized.crushedOrGround ? "Crushed or ground (powdered/broken)" : "Neither crushed nor ground (whole)",
      result: "matched",
    })
  }

  // 4. Processing state
  if (normalized.processingState) {
    steps.push({
      step: stepNum++,
      label: "Processing State",
      value: normalized.processingState.replace(/_/g, " "),
      result: "matched",
    })
  }

  // 5. Size category (e.g. Cardamom)
  if (normalized.sizeCategory) {
    steps.push({
      step: stepNum++,
      label: "Size Category",
      value: normalized.sizeCategory === "large" ? "Large (Amomum)" : "Small (Elettaria)",
      result: "matched",
    })
  }

  // 6. Variety / Subtype
  if (normalized.subType) {
    steps.push({
      step: stepNum++,
      label: "Subtype / Variety",
      value: SUB_TYPE_LABELS[normalized.subType] ?? normalized.subType,
      result: "matched",
    })
  }

  // 7. Physical Form
  if (normalized.form) {
    steps.push({
      step: stepNum++,
      label: "Physical Form",
      value: FORM_LABELS[normalized.form] ?? normalized.form,
      result: "matched",
    })
  }

  // 8. Quality grade
  if (normalized.quality) {
    steps.push({
      step: stepNum++,
      label: "Quality Standard",
      value: normalized.quality === "seed_quality" ? "Of seed quality" : normalized.quality,
      result: "matched",
    })
  }

  // 9. Matched Rule
  steps.push({
    step: stepNum++,
    label: "Applicable Rule",
    value: `${rule.rule_id} (${rule.source_reference}): ${rule.description}`,
    result: "matched",
  })

  // 10. Final Result
  const formattedCode =
    rule.output_code.length === 8
      ? `${rule.output_code.slice(0, 4)} ${rule.output_code.slice(4, 6)} ${rule.output_code.slice(6, 8)}`
      : rule.output_code

  steps.push({
    step: stepNum,
    label: "Classification Result",
    value: `HS ${formattedCode} — ${rule.description}`,
    result: "matched",
  })

  return steps
}
