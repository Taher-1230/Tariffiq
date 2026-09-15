// ============================================================
// Coffee Input Validation — Phase 5C-B.1
//
// Validates a CoffeeClassificationInput before deterministic classification.
// Returns null if valid, or a structured InsufficientInformationResult.
// ============================================================

import type { InsufficientInformationResult } from "@/engine/types"
import type { CoffeeClassificationInput } from "./types"
import { getRequiredCoffeeInformation } from "./requirements"

const VALID_PRODUCT_TYPES = [
  "coffee",
  "husks_and_skins",
  "substitutes_containing_coffee",
] as const

const VALID_PRESENTATIONS = ["bulk", "other"] as const
const VALID_FORMS = [
  "arabica_plantation",
  "arabica_cherry",
  "rob_cherry",
  "other",
] as const

export function validateCoffeeInput(
  input: CoffeeClassificationInput
): InsufficientInformationResult | null {
  const missingFields: string[] = []
  const messages: string[] = []

  // ── 1. Product category ───────────────────────────────────
  if (!input || typeof input !== "object") {
    return {
      status: "insufficient_information",
      missingFields: ["productCategory"],
      message: "Coffee classification input must be a non-null object.",
    }
  }

  if (input.productCategory !== "coffee") {
    return {
      status: "insufficient_information",
      missingFields: ["productCategory"],
      message: "Product category must be 'coffee'.",
    }
  }

  // ── 2. Product type ───────────────────────────────────────
  if (
    input.productType &&
    !VALID_PRODUCT_TYPES.includes(input.productType as (typeof VALID_PRODUCT_TYPES)[number])
  ) {
    missingFields.push("productType")
    messages.push(
      `Invalid productType: "${String(input.productType)}". Must be 'coffee', 'husks_and_skins', or 'substitutes_containing_coffee'.`
    )
  }

  // Husks and substitutes require no further physical fields
  if (
    input.productType === "husks_and_skins" ||
    input.productType === "substitutes_containing_coffee"
  ) {
    return messages.length > 0
      ? {
          status: "insufficient_information",
          missingFields,
          message: messages.join(" "),
        }
      : null
  }

  // ── 3. Presentation enum ───────────────────────────────────
  if (
    input.presentation &&
    !VALID_PRESENTATIONS.includes(input.presentation as (typeof VALID_PRESENTATIONS)[number])
  ) {
    missingFields.push("presentation")
    messages.push(
      `Invalid presentation: "${String(input.presentation)}". Must be 'bulk' or 'other'.`
    )
  }

  // ── 4. Form enum ───────────────────────────────────────────
  if (
    input.form &&
    !VALID_FORMS.includes(input.form as (typeof VALID_FORMS)[number])
  ) {
    missingFields.push("form")
    messages.push(
      `Invalid form: "${String(input.form)}". Must be 'arabica_plantation', 'arabica_cherry', 'rob_cherry', or 'other'.`
    )
  }

  // ── 5. Rule-driven required fields analysis ───────────────
  const reqInfo = getRequiredCoffeeInformation(input)
  if (!reqInfo.sufficient) {
    for (const field of reqInfo.missingFields) {
      if (!missingFields.includes(field)) {
        missingFields.push(field)
      }
    }
    if (reqInfo.reason) {
      messages.push(reqInfo.reason)
    }
  }

  if (missingFields.length > 0) {
    return {
      status: "insufficient_information",
      missingFields,
      message: messages.join(" "),
    }
  }

  return null
}
