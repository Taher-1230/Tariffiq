// ============================================================
// Input Validation — Phase 2A
//
// Validates a TeaClassificationInput before it reaches the
// classification engine. Returns either null (valid) or a
// structured InsufficientInformationResult describing what
// is missing or invalid.
//
// This function never throws for normal invalid user input.
// ============================================================

import type { TeaClassificationInput } from "@/types/classification"
import type { InsufficientInformationResult } from "@/engine/types"
import { getRequiredTeaInformation } from "@/engine/getRequiredTeaInformation"

const VALID_TEA_TYPES = ["green", "black", "partly_fermented"] as const
const VALID_PRESENTATIONS = ["immediate_packing", "packet", "bulk"] as const
const VALID_FORMS = [
  "whole_leaf",
  "dust",
  "tea_bags",
  "agglomerated",
  "waste",
  "other",
] as const
const VALID_WEIGHT_UNITS = ["g", "kg"] as const

/**
 * Validate a classification input against structural rules and
 * rule-driven candidate requirements.
 *
 * @returns `null` if the input is valid, or an
 *          `InsufficientInformationResult` describing the problem.
 */
export function validateTeaInput(
  input: TeaClassificationInput
): InsufficientInformationResult | null {
  const missingFields: string[] = []
  const messages: string[] = []

  // ── 1. Product category ───────────────────────────────────

  if (!input.productCategory || input.productCategory !== "tea") {
    missingFields.push("productCategory")
    messages.push("Product category must be 'tea'.")
  }

  // ── 2. Tea type ───────────────────────────────────────────

  if (!input.teaType) {
    missingFields.push("teaType")
    messages.push("Tea type is required.")
  } else if (input.teaType === "not_sure") {
    missingFields.push("teaType")
    messages.push(
      "Tea type must be identified before classification. 'Not sure' cannot be classified deterministically."
    )
  } else if (
    !(VALID_TEA_TYPES as readonly string[]).includes(input.teaType)
  ) {
    missingFields.push("teaType")
    messages.push(`Invalid tea type: '${input.teaType}'.`)
  }

  // ── 3. Presentation (if provided, must be valid) ──────────

  if (input.presentation != null) {
    if (
      !(VALID_PRESENTATIONS as readonly string[]).includes(input.presentation)
    ) {
      missingFields.push("presentation")
      messages.push(`Invalid presentation: '${input.presentation}'.`)
    }
  }

  // ── 4. Form (if provided, must be valid) ──────────────────

  if (input.form != null) {
    if (!(VALID_FORMS as readonly string[]).includes(input.form)) {
      missingFields.push("form")
      messages.push(`Invalid form: '${input.form}'.`)
    }
  }

  // ── 5. Weight (if provided, must be valid finite positive number)

  if (input.netWeight != null) {
    if (
      typeof input.netWeight !== "number" ||
      !Number.isFinite(input.netWeight)
    ) {
      missingFields.push("netWeight")
      messages.push("Net weight must be a valid number.")
    } else if (input.netWeight <= 0) {
      missingFields.push("netWeight")
      messages.push("Net weight must be greater than zero.")
    }
  }

  // ── 6. Weight unit ───────────────────────────────────────

  if (input.netWeight != null && !input.weightUnit) {
    missingFields.push("weightUnit")
    messages.push("Weight unit is required when net weight is provided.")
  } else if (input.weightUnit != null) {
    if (
      !(VALID_WEIGHT_UNITS as readonly string[]).includes(input.weightUnit)
    ) {
      missingFields.push("weightUnit")
      messages.push(`Invalid weight unit: '${input.weightUnit}'.`)
    }
  }

  // ── 7. Rule-Driven Required Information Analysis ──────────

  const requiredInfo = getRequiredTeaInformation(input)
  for (const field of requiredInfo.missingFields) {
    if (!missingFields.includes(field)) {
      missingFields.push(field)
    }
  }
  if (requiredInfo.reason && !messages.includes(requiredInfo.reason)) {
    messages.push(requiredInfo.reason)
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
