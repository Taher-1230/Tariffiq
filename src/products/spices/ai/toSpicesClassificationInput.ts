// ============================================================
// Boundary Adapter: SpicesExtraction → SpicesClassificationInput — Phase 6.3A
//
// Converts structured AI extraction attributes into the internal
// SpicesClassificationInput consumed by the deterministic rules engine.
//
// Safety Enforcements:
//   1. Never converts "unknown" into guessed values.
//   2. Rejects conversion if productCategory is not 'spices'.
//   3. Does NOT call classifySpices() or make classification decisions.
//   4. Does NOT output HS codes.
// ============================================================

import type { SpicesConversionResult, SpicesExtraction } from "./types"
import type {
  BotanicalType,
  SpiceForm,
  SpiceProcessingState,
  SpiceQuality,
  SpiceSizeCategory,
  SpiceSubType,
  SpiceType,
  SpicesClassificationInput,
} from "../types"

/**
 * Converts a SpicesExtraction payload into a SpicesClassificationInput.
 *
 * @param extraction - The validated extraction object.
 * @returns SpicesConversionResult indicating success with input or failure with reasons.
 */
export function toSpicesClassificationInput(
  extraction: SpicesExtraction
): SpicesConversionResult {
  const unmappedFields: (keyof SpicesExtraction)[] = []

  // ── 1. Check Product Category ─────────────────────────────

  if (extraction.productCategory !== "spices") {
    return {
      success: false,
      reason:
        "Product category is not identified as 'spices'. TariffIQ only classifies Chapter 09 (0904–0910) spice products.",
      missingRequiredFields: ["productCategory"],
      unmappedFields: [],
    }
  }

  // ── 2. Map Spice Type ─────────────────────────────────────

  let spiceType: SpiceType | undefined
  if (extraction.spiceType !== "unknown") {
    spiceType = extraction.spiceType as SpiceType
  } else {
    unmappedFields.push("spiceType")
  }

  // ── 3. Map Botanical Type ─────────────────────────────────

  let botanicalType: BotanicalType | undefined
  if (extraction.botanicalType !== "unknown") {
    botanicalType = extraction.botanicalType as BotanicalType
  } else {
    unmappedFields.push("botanicalType")
  }

  // ── 4. Map Crushed / Ground ───────────────────────────────

  const crushedOrGround =
    extraction.crushedOrGround === "unknown" ? undefined : extraction.crushedOrGround

  if (extraction.crushedOrGround === "unknown") {
    unmappedFields.push("crushedOrGround")
  }

  // ── 5. Map SubType ────────────────────────────────────────

  let subType: SpiceSubType | undefined
  if (extraction.subType !== "unknown") {
    subType = extraction.subType as SpiceSubType
  } else {
    unmappedFields.push("subType")
  }

  // ── 6. Map Form ───────────────────────────────────────────

  let form: SpiceForm | undefined
  if (extraction.form !== "unknown") {
    form = extraction.form as SpiceForm
  } else {
    unmappedFields.push("form")
  }

  // ── 7. Map Processing State ───────────────────────────────

  let processingState: SpiceProcessingState | undefined
  if (extraction.processingState !== "unknown") {
    processingState = extraction.processingState as SpiceProcessingState
  } else {
    unmappedFields.push("processingState")
  }

  // ── 8. Map Quality ────────────────────────────────────────

  let quality: SpiceQuality | undefined
  if (extraction.quality !== "unknown") {
    quality = extraction.quality as SpiceQuality
  } else {
    unmappedFields.push("quality")
  }

  // ── 9. Map Size Category ──────────────────────────────────

  let sizeCategory: SpiceSizeCategory | undefined
  if (extraction.sizeCategory !== "unknown") {
    sizeCategory = extraction.sizeCategory as SpiceSizeCategory
  } else {
    unmappedFields.push("sizeCategory")
  }

  // ── 10. Map Statutory Exclusions ──────────────────────────

  const isCubeb =
    extraction.isCubeb === "unknown" ? undefined : extraction.isCubeb

  const essentialCharacter =
    extraction.essentialCharacter === "unknown" ? undefined : extraction.essentialCharacter

  const mixtureHeadings =
    Array.isArray(extraction.mixtureHeadings) && extraction.mixtureHeadings.length > 0
      ? [...extraction.mixtureHeadings]
      : undefined

  // ── 11. Assemble Classification Input ─────────────────────

  const input: SpicesClassificationInput = {
    productCategory: "spices",
    spiceType: spiceType ?? null,
    botanicalType: botanicalType ?? null,
    crushedOrGround: crushedOrGround ?? null,
    subType: subType ?? null,
    form: form ?? null,
    processingState: processingState ?? null,
    quality: quality ?? null,
    sizeCategory: sizeCategory ?? null,
    isCubeb: isCubeb ?? null,
    essentialCharacter: essentialCharacter ?? null,
    mixtureHeadings: mixtureHeadings ?? null,
  }

  return {
    success: true,
    input,
  }
}
