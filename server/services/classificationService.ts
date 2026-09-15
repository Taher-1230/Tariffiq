// ============================================================
// Server-Side Classification Service — Phase 5B → Phase 5C-A
//
// Executes the deterministic rules engine on the server to
// re-verify and compute authentic tariff classification records
// before persistence.
//
// Phase 5C-A:
//   Added verifyAndClassifyProduct() which resolves the correct
//   engine via ProductRegistry. The existing verifyAndClassifyTea()
//   remains for backward compatibility.
//
// INVARIANT:
//   The server NEVER trusts client-submitted HS codes or rule IDs.
//   It always re-runs the deterministic engine on confirmed input.
// ============================================================

import { classifyTea } from "../../src/engine/teaClassifier.js"
import { validateTeaInput } from "../../src/engine/validateTeaInput.js"
import type { TeaClassificationInput } from "../../src/types/classification.js"
import type { TeaClassificationResult } from "../../src/engine/types.js"

// Product registry (importing Tea, Coffee & Spices registration side-effects)
import { productRegistry } from "../../src/products/registry.js"
import "../../src/products/tea/index.js"
import "../../src/products/coffee/index.js"
import "../../src/products/spices/index.js"

export interface ClassificationVerificationResult {
  valid: boolean
  errors: string[]
  classification?: TeaClassificationResult | unknown
}

/**
 * Re-runs deterministic classification on the server.
 *
 * @param confirmedInput - The user-confirmed physical product attributes.
 * @returns Validated classification result or validation errors.
 */
export function verifyAndClassifyTea(
  confirmedInput: unknown
): ClassificationVerificationResult {
  if (!confirmedInput || typeof confirmedInput !== "object") {
    return {
      valid: false,
      errors: ["Confirmed input must be a non-null object."],
    }
  }

  const input = confirmedInput as TeaClassificationInput

  // 1. Validate Input
  const validationError = validateTeaInput(input)
  if (validationError !== null) {
    return {
      valid: false,
      errors: [validationError.message],
      classification: validationError,
    }
  }

  // 2. Deterministic Classification Execution
  const classification = classifyTea(input)

  return {
    valid: true,
    errors: [],
    classification,
  }
}

/**
 * Product-agnostic classification verification via ProductRegistry.
 *
 * @param productCategory - The product category identifier.
 * @param confirmedInput - The user-confirmed physical product attributes.
 * @returns Validated classification result or validation/unsupported errors.
 */
export function verifyAndClassifyProduct(
  productCategory: string | undefined,
  confirmedInput: unknown
): ClassificationVerificationResult {
  // Default to "tea" for backward compatibility
  const category = productCategory ?? "tea"

  if (!productRegistry.isSupported(category)) {
    return {
      valid: false,
      errors: [
        `Unsupported product category: "${category}". ` +
        `Supported categories: ${productRegistry.getSupportedCategories().join(", ")}.`
      ],
    }
  }

  if (!confirmedInput || typeof confirmedInput !== "object") {
    return {
      valid: false,
      errors: ["Confirmed input must be a non-null object."],
    }
  }

  const registration = productRegistry.getOrThrow(category)

  // 1. Validate Input
  const validationError = registration.engine.validate(confirmedInput)
  if (validationError !== null) {
    const errorResult = validationError as { message?: string }
    return {
      valid: false,
      errors: [errorResult.message ?? "Classification input validation failed."],
      classification: validationError,
    }
  }

  // 2. Deterministic Classification Execution
  const classification = registration.engine.classify(confirmedInput)

  return {
    valid: true,
    errors: [],
    classification,
  }
}
