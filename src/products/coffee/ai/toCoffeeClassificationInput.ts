// ============================================================
// Boundary Adapter: CoffeeExtraction → CoffeeClassificationInput — Phase 5C-B.2
//
// Converts structured AI extraction attributes into the internal
// CoffeeClassificationInput consumed by the deterministic rules engine.
//
// Safety Enforcements:
//   1. Never converts "unknown" into guessed values.
//   2. Rejects conversion if productCategory is not 'coffee'.
//   3. Does NOT call classifyCoffee() or make classification decisions.
//   4. Does NOT output HS codes.
// ============================================================

import type { CoffeeConversionResult, CoffeeExtraction } from "./types"
import type { CoffeeClassificationInput, CoffeeProductType } from "../types"

/**
 * Converts a CoffeeExtraction payload into a CoffeeClassificationInput.
 *
 * @param extraction - The validated extraction object.
 * @returns CoffeeConversionResult indicating success with input or failure with reasons.
 */
export function toCoffeeClassificationInput(
  extraction: CoffeeExtraction
): CoffeeConversionResult {
  const unmappedFields: (keyof CoffeeExtraction)[] = []

  // ── 1. Check Product Category ─────────────────────────────

  if (extraction.productCategory !== "coffee") {
    return {
      success: false,
      reason:
        "Product category is not identified as 'coffee'. TariffIQ only classifies Chapter 0901 coffee products.",
      missingRequiredFields: ["productCategory"],
      unmappedFields: [],
    }
  }

  // ── 2. Map Product Type ───────────────────────────────────

  let productType: CoffeeProductType = "coffee"
  if (
    extraction.productType === "husks_and_skins" ||
    extraction.productType === "substitutes_containing_coffee"
  ) {
    productType = extraction.productType
  } else if (extraction.productType === "unknown") {
    unmappedFields.push("productType")
  }

  // ── 3. Map Roasting & Decaffeination ──────────────────────

  const roasted =
    extraction.roasted === "unknown" ? undefined : extraction.roasted

  if (extraction.roasted === "unknown") {
    unmappedFields.push("roasted")
  }

  const decaffeinated =
    extraction.decaffeinated === "unknown" ? undefined : extraction.decaffeinated

  if (extraction.decaffeinated === "unknown") {
    unmappedFields.push("decaffeinated")
  }

  // ── 4. Map Presentation, Form, Grade ──────────────────────

  const presentation =
    extraction.presentation === "unknown" ? undefined : extraction.presentation

  if (extraction.presentation === "unknown") {
    unmappedFields.push("presentation")
  }

  const form =
    extraction.form === "unknown" ? undefined : extraction.form

  if (extraction.form === "unknown") {
    unmappedFields.push("form")
  }

  const grade =
    extraction.grade === "unknown" ? undefined : extraction.grade

  if (extraction.grade === "unknown") {
    unmappedFields.push("grade")
  }

  // ── 5. Assemble Classification Input ──────────────────────

  const input: CoffeeClassificationInput = {
    productCategory: "coffee",
    productType,
    roasted,
    decaffeinated,
    presentation,
    form,
    grade,
  }

  return {
    success: true,
    input,
  }
}
