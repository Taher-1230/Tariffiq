// ============================================================
// Tea Classification Types
//
// Shared UI types consumed by the wizard, review step, and
// classification summary components. The rules engine result
// types (TeaClassificationResult, ClassifiedResult, etc.) live
// in src/engine/types.ts and are exported via src/engine/index.ts.
// ============================================================

export interface TeaClassificationInput {
  productCategory: "tea"
  teaType: "green" | "black" | "partly_fermented" | "not_sure"
  presentation?: "immediate_packing" | "packet" | "bulk" | null
  form?:
    | "whole_leaf"
    | "dust"
    | "tea_bags"
    | "agglomerated"
    | "waste"
    | "other"
    | null
  netWeight?: number | null
  weightUnit?: "g" | "kg"
}

// -------------------------------------------------------
// Wizard state — tracks the multi-step form
// -------------------------------------------------------
export type WizardStep =
  | "product"
  | "tea-type"
  | "presentation"
  | "form"
  | "weight"
  | "review"
  | "spice-type"
  | "spice-processing"
  | "spice-details"
  | "spice-review"
  | "loading"
  | "result"

export type TeaType = TeaClassificationInput["teaType"]
export type PresentationType = TeaClassificationInput["presentation"]
export type FormType = TeaClassificationInput["form"]
export type WeightUnit = TeaClassificationInput["weightUnit"]
