// ============================================================
// Boundary Adapter: TeaExtraction → TeaClassificationInput — Phase 4A
//
// Converts structured AI extraction attributes into the internal
// TeaClassificationInput consumed by the deterministic rules engine.
//
// Safety Enforcements:
//   1. Never converts "unknown" into guessed values.
//   2. Rejects conversion if fundamental attributes (productCategory,
//      teaType) are unknown.
//   3. Does NOT call classifyTea() or make classification decisions.
// ============================================================

import type { ConversionResult, TeaExtraction } from "@/ai/types"
import type { TeaClassificationInput } from "@/types/classification"

/**
 * Converts a TeaExtraction payload into a TeaClassificationInput.
 *
 * @param extraction - The validated extraction object.
 * @returns ConversionResult indicating success with input or failure with reasons.
 */
export function toTeaClassificationInput(
  extraction: TeaExtraction
): ConversionResult {
  const unmappedFields: (keyof TeaExtraction)[] = []

  // ── 1. Check Product Category ─────────────────────────────

  if (extraction.productCategory !== "tea") {
    return {
      success: false,
      reason:
        "Product category is not identified as 'tea'. TariffIQ only classifies Chapter 0902 tea products.",
      missingRequiredFields: ["productCategory"],
      unmappedFields: [],
    }
  }

  // ── 2. Check Tea Type ─────────────────────────────────────

  if (extraction.teaType === "unknown") {
    return {
      success: false,
      reason:
        "Tea type is unknown. Classification requires identifying whether the tea is green, black, or partly fermented.",
      missingRequiredFields: ["teaType"],
      unmappedFields: [],
    }
  }

  // ── 3. Map Optional / Presentational Attributes ───────────

  // Map presentation: "unknown" maps to undefined (rules engine determines relevance)
  const presentation =
    extraction.presentation === "unknown"
      ? undefined
      : extraction.presentation

  if (extraction.presentation === "unknown") {
    unmappedFields.push("presentation")
  }

  // Map form: "unknown" maps to undefined
  const form =
    extraction.form === "unknown"
      ? undefined
      : extraction.form

  if (extraction.form === "unknown") {
    unmappedFields.push("form")
  }

  // Map weight
  const netWeight =
    extraction.netWeight !== null && extraction.netWeight > 0
      ? extraction.netWeight
      : undefined

  const weightUnit =
    extraction.weightUnit !== null
      ? extraction.weightUnit
      : undefined

  if (extraction.netWeight === null) {
    unmappedFields.push("netWeight")
  }

  // Build input
  const input: TeaClassificationInput = {
    productCategory: "tea",
    teaType: extraction.teaType,
    presentation,
    form,
    netWeight,
    weightUnit,
  }

  return {
    success: true,
    input,
  }
}
