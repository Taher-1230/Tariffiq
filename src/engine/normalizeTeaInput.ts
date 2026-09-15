// ============================================================
// Input Normalization — Phase 2A
//
// Converts a TeaClassificationInput (from the UI) into a
// NormalizedTeaInput that the rules engine can evaluate.
//
// Key transform: weight is always converted to grams.
// The original input is never mutated.
// ============================================================

import type { TeaClassificationInput } from "@/types/classification"
import type { NormalizedTeaInput } from "@/engine/types"

/**
 * Normalize a validated UI input into the internal representation
 * used by the rules engine.
 *
 * Precondition: the caller has already validated that the input
 * contains all required fields. This function does NOT validate.
 */
export function normalizeTeaInput(
  input: TeaClassificationInput
): NormalizedTeaInput {
  // Convert weight to grams if provided
  const netWeightGrams =
    input.netWeight != null && Number.isFinite(input.netWeight)
      ? input.weightUnit === "kg"
        ? input.netWeight * 1000
        : input.netWeight
      : undefined

  return {
    teaType: input.teaType as NormalizedTeaInput["teaType"],
    presentation: input.presentation ?? undefined,
    form: input.form ?? undefined,
    netWeightGrams,
  }
}
