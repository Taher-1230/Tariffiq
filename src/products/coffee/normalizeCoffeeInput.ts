// ============================================================
// Coffee Input Normalization — Phase 5C-B.1
//
// Converts a CoffeeClassificationInput into a NormalizedCoffeeInput
// for deterministic rule evaluation.
//
// Key transforms:
//   - Defaults productType to "coffee" if omitted.
//   - Normalizes grade notations (e.g. "B/B/B" -> "BBB").
//   - Preserves original input object without mutation.
// ============================================================

import type {
  CoffeeClassificationInput,
  CoffeeForm,
  CoffeeGrade,
  CoffeePresentation,
  CoffeeProductType,
  NormalizedCoffeeInput,
} from "./types"

export function normalizeCoffeeInput(
  input: CoffeeClassificationInput
): NormalizedCoffeeInput {
  const productType: CoffeeProductType = input.productType ?? "coffee"

  let roasted: boolean | undefined = undefined
  if (typeof input.roasted === "boolean") {
    roasted = input.roasted
  }

  let decaffeinated: boolean | undefined = undefined
  if (typeof input.decaffeinated === "boolean") {
    decaffeinated = input.decaffeinated
  }

  let presentation: CoffeePresentation | undefined = undefined
  if (input.presentation === "bulk" || input.presentation === "other") {
    presentation = input.presentation
  }

  let form: CoffeeForm | undefined = undefined
  if (
    input.form === "arabica_plantation" ||
    input.form === "arabica_cherry" ||
    input.form === "rob_cherry" ||
    input.form === "other"
  ) {
    form = input.form
  }

  let grade: CoffeeGrade | undefined = undefined
  if (typeof input.grade === "string") {
    const cleanGrade = input.grade.trim().toUpperCase()
    if (cleanGrade === "B/B/B" || cleanGrade === "BBB") {
      grade = "BBB"
    } else if (
      cleanGrade === "A" ||
      cleanGrade === "B" ||
      cleanGrade === "C" ||
      cleanGrade === "AB" ||
      cleanGrade === "PB"
    ) {
      grade = cleanGrade as CoffeeGrade
    } else if (cleanGrade.toLowerCase() === "other") {
      grade = "other"
    }
  }

  return {
    productType,
    roasted,
    decaffeinated,
    presentation,
    form,
    grade,
  }
}
