// ============================================================
// Coffee Required Information Analysis — Phase 5C-B.1
//
// Dynamically calculates which attributes are required, optional,
// satisfied, or not applicable for a given (possibly partial)
// CoffeeClassificationInput.
//
// Rule-driven:
//   - Husks & substitutes: only productType is required.
//   - Roasted coffee: needs roasting, decaffeination, and presentation.
//   - Unroasted decaf: needs roasting and decaffeination.
//   - Unroasted non-decaf: needs variety/form and grade.
// ============================================================

import type {
  CoffeeClassificationInput,
  CoffeeRequiredInformationAnalysis,
} from "./types"

export function getRequiredCoffeeInformation(
  input: Partial<CoffeeClassificationInput>
): CoffeeRequiredInformationAnalysis {
  const missingFields: string[] = []
  let reason: string | undefined = undefined

  const fieldStatus: CoffeeRequiredInformationAnalysis["fieldStatus"] = {
    productType: "satisfied",
    roasted: "not_required",
    decaffeinated: "not_required",
    presentation: "not_required",
    form: "not_required",
    grade: "not_required",
  }

  const productType = input.productType ?? "coffee"

  // ── 1. Non-coffee product types (husks, substitutes) ────────
  if (
    productType === "husks_and_skins" ||
    productType === "substitutes_containing_coffee"
  ) {
    return {
      sufficient: true,
      missingFields: [],
      fieldStatus,
    }
  }

  // ── 2. Standard Coffee: Roasting status ─────────────────────
  if (input.roasted === undefined || input.roasted === null) {
    fieldStatus.roasted = "required"
    missingFields.push("roasted")
    reason = "Roasting status (roasted vs unroasted) is required to determine the tariff subheading."
    return {
      sufficient: false,
      missingFields,
      reason,
      fieldStatus,
    }
  }

  fieldStatus.roasted = "satisfied"

  // ── 3. Roasted Branch ───────────────────────────────────────
  if (input.roasted === true) {
    // Decaffeination status
    if (input.decaffeinated === undefined || input.decaffeinated === null) {
      fieldStatus.decaffeinated = "required"
      missingFields.push("decaffeinated")
    } else {
      fieldStatus.decaffeinated = "satisfied"
    }

    // Presentation (bulk vs other)
    if (!input.presentation) {
      fieldStatus.presentation = "required"
      missingFields.push("presentation")
    } else {
      fieldStatus.presentation = "satisfied"
    }

    if (missingFields.length > 0) {
      reason = "Decaffeination status and packaging presentation (bulk vs other) are required for roasted coffee."
      return {
        sufficient: false,
        missingFields,
        reason,
        fieldStatus,
      }
    }

    return {
      sufficient: true,
      missingFields: [],
      fieldStatus,
    }
  }

  // ── 4. Unroasted Branch (roasted === false) ─────────────────
  if (input.decaffeinated === undefined || input.decaffeinated === null) {
    fieldStatus.decaffeinated = "required"
    missingFields.push("decaffeinated")
    reason = "Decaffeination status is required for unroasted coffee."
    return {
      sufficient: false,
      missingFields,
      reason,
      fieldStatus,
    }
  }

  fieldStatus.decaffeinated = "satisfied"

  // Unroasted Decaffeinated -> 0901 12 00 (Fully determined!)
  if (input.decaffeinated === true) {
    return {
      sufficient: true,
      missingFields: [],
      fieldStatus,
    }
  }

  // Unroasted Non-Decaffeinated -> Needs form and grade
  if (!input.form) {
    fieldStatus.form = "required"
    missingFields.push("form")
    reason = "Variety/processing form (e.g. Arabica plantation, Arabica cherry, Rob cherry) is required for unroasted non-decaffeinated coffee."
    return {
      sufficient: false,
      missingFields,
      reason,
      fieldStatus,
    }
  }

  fieldStatus.form = "satisfied"

  if (input.form === "arabica_plantation" || input.form === "arabica_cherry") {
    if (!input.grade) {
      fieldStatus.grade = "required"
      missingFields.push("grade")
      reason = `Grade is required for ${input.form === "arabica_plantation" ? "Arabica plantation" : "Arabica cherry"}.`
      return {
        sufficient: false,
        missingFields,
        reason,
        fieldStatus,
      }
    }
    fieldStatus.grade = "satisfied"
    return {
      sufficient: true,
      missingFields: [],
      fieldStatus,
    }
  }

  if (input.form === "rob_cherry") {
    if (input.presentation === "bulk") {
      fieldStatus.presentation = "satisfied"
      return {
        sufficient: true,
        missingFields: [],
        fieldStatus,
      }
    }

    if (input.grade) {
      fieldStatus.grade = "satisfied"
      return {
        sufficient: true,
        missingFields: [],
        fieldStatus,
      }
    }

    fieldStatus.grade = "required"
    fieldStatus.presentation = "optional"
    missingFields.push("grade")
    reason = "Grade (or bulk presentation) is required for Rob cherry coffee."
    return {
      sufficient: false,
      missingFields,
      reason,
      fieldStatus,
    }
  }

  // Other form (0901 11 90 - requires clarification)
  return {
    sufficient: true,
    missingFields: [],
    fieldStatus,
  }
}
