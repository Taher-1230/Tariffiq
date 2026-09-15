// ============================================================
// Spices Input Normalizer — Phase 6.2
//
// Converts raw/confirmed SpicesClassificationInput into clean
// NormalizedSpicesInput without modifying original input.
// ============================================================

import type {
  NormalizedSpicesInput,
  SpicesClassificationInput,
} from "./types"

export function normalizeSpicesInput(
  input: SpicesClassificationInput
): NormalizedSpicesInput {
  const normalized: NormalizedSpicesInput = {
    spiceType: input.spiceType!,
  }

  if (input.botanicalType) {
    normalized.botanicalType = input.botanicalType
  }

  if (input.crushedOrGround !== undefined && input.crushedOrGround !== null) {
    normalized.crushedOrGround = input.crushedOrGround
  }

  if (input.subType) {
    normalized.subType = input.subType
  }

  if (input.form) {
    normalized.form = input.form
  }

  if (input.processingState) {
    normalized.processingState = input.processingState
  }

  if (input.quality) {
    normalized.quality = input.quality
  }

  if (input.sizeCategory) {
    normalized.sizeCategory = input.sizeCategory
  }

  if (input.isCubeb !== undefined && input.isCubeb !== null) {
    normalized.isCubeb = input.isCubeb
  }

  if (input.essentialCharacter !== undefined && input.essentialCharacter !== null) {
    normalized.essentialCharacter = input.essentialCharacter
  }

  if (Array.isArray(input.mixtureHeadings) && input.mixtureHeadings.length > 0) {
    normalized.mixtureHeadings = [...input.mixtureHeadings]
  }

  return normalized
}
