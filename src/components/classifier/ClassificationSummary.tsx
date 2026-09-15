// ============================================================
// ClassificationSummary — Input summary within the result
//
// Supports Tea, Coffee, and Spices input summaries.
// ============================================================

import type { TeaClassificationInput } from "@/types/classification"
import type { CoffeeClassificationInput } from "@/products/coffee/types"
import type { SpicesClassificationInput } from "@/products/spices/types"

const TEA_TYPE_LABELS: Record<TeaClassificationInput["teaType"], string> = {
  green: "Green Tea",
  black: "Black Tea",
  partly_fermented: "Partly Fermented Tea",
  not_sure: "Not Sure",
}

const PRESENTATION_LABELS: Record<NonNullable<TeaClassificationInput["presentation"]>, string> = {
  immediate_packing: "Immediate Packing",
  packet: "Packet",
  bulk: "Bulk",
}

const FORM_LABELS: Record<NonNullable<TeaClassificationInput["form"]>, string> = {
  whole_leaf: "Whole Leaf",
  dust: "Dust",
  tea_bags: "Tea Bags",
  agglomerated: "Agglomerated",
  waste: "Waste",
  other: "Other",
}

const COFFEE_FORM_LABELS: Record<string, string> = {
  arabica_plantation: "Arabica plantation",
  arabica_cherry: "Arabica Cherry",
  rob_cherry: "Rob cherry",
  other: "Other",
}

const COFFEE_GRADE_LABELS: Record<string, string> = {
  A: "Grade A",
  B: "Grade B",
  C: "Grade C",
  AB: "Grade AB",
  PB: "Grade PB (Peaberry)",
  BBB: "Grade BBB",
  "B/B/B": "Grade B/B/B",
  other: "Other",
}

interface ClassificationSummaryProps {
  input: TeaClassificationInput | CoffeeClassificationInput | SpicesClassificationInput
}

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ClassificationSummary({ input }: ClassificationSummaryProps) {
  if (input.productCategory === "spices") {
    const spicesInput = input as SpicesClassificationInput
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Classification Inputs
          </span>
        </div>
        <div className="px-5">
          <SummaryRow label="Product" value="Spices (0904–0910)" />
          <SummaryRow
            label="Spice Commodity"
            value={String(spicesInput.spiceType || "—").replace(/_/g, " ")}
          />
          {spicesInput.botanicalType && (
            <SummaryRow
              label="Botanical Type"
              value={String(spicesInput.botanicalType).replace(/_/g, " ")}
            />
          )}
          <SummaryRow
            label="Crushed / Ground"
            value={
              spicesInput.crushedOrGround === true
                ? "Crushed or Ground"
                : spicesInput.crushedOrGround === false
                ? "Whole (neither crushed nor ground)"
                : "Not specified"
            }
          />
          {spicesInput.subType && (
            <SummaryRow
              label="Subtype / Variety"
              value={String(spicesInput.subType).replace(/_/g, " ")}
            />
          )}
          {spicesInput.form && (
            <SummaryRow
              label="Physical Form"
              value={String(spicesInput.form).replace(/_/g, " ")}
            />
          )}
          {spicesInput.processingState && (
            <SummaryRow
              label="Processing State"
              value={String(spicesInput.processingState).replace(/_/g, " ")}
            />
          )}
        </div>
      </div>
    )
  }

  if (input.productCategory === "coffee") {
    const coffeeInput = input as CoffeeClassificationInput
    const productTypeLabel =
      coffeeInput.productType === "husks_and_skins"
        ? "Coffee husks & skins"
        : coffeeInput.productType === "substitutes_containing_coffee"
        ? "Coffee substitutes containing coffee"
        : "Coffee"

    const roastingLabel =
      coffeeInput.roasted === true
        ? "Roasted"
        : coffeeInput.roasted === false
        ? "Not roasted"
        : "Not required"

    const decafLabel =
      coffeeInput.decaffeinated === true
        ? "Decaffeinated"
        : coffeeInput.decaffeinated === false
        ? "Not decaffeinated"
        : "Not required"

    const presentationLabel =
      coffeeInput.presentation === "bulk"
        ? "Bulk"
        : coffeeInput.presentation === "other"
        ? "Other packaging"
        : "Not required"

    const formLabel = coffeeInput.form
      ? COFFEE_FORM_LABELS[coffeeInput.form] ?? coffeeInput.form
      : "Not required"

    const gradeLabel = coffeeInput.grade
      ? COFFEE_GRADE_LABELS[coffeeInput.grade] ?? coffeeInput.grade
      : "Not required"

    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Classification Inputs
          </span>
        </div>
        <div className="px-5">
          <SummaryRow label="Product" value="Coffee" />
          <SummaryRow label="Product Type" value={productTypeLabel} />
          <SummaryRow label="Roasting" value={roastingLabel} />
          <SummaryRow label="Decaffeination" value={decafLabel} />
          <SummaryRow label="Presentation" value={presentationLabel} />
          <SummaryRow label="Form / Variety" value={formLabel} />
          <SummaryRow label="Grade" value={gradeLabel} />
        </div>
      </div>
    )
  }

  // Tea summary (default)
  const teaInput = input as TeaClassificationInput
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Classification Inputs
        </span>
      </div>
      <div className="px-5">
        <SummaryRow label="Product" value="Tea" />
        <SummaryRow label="Tea Type" value={TEA_TYPE_LABELS[teaInput.teaType]} />
        <SummaryRow
          label="Presentation"
          value={
            teaInput.presentation
              ? PRESENTATION_LABELS[teaInput.presentation]
              : "Not required"
          }
        />
        <SummaryRow
          label="Form"
          value={teaInput.form ? FORM_LABELS[teaInput.form] : "Not specified"}
        />
        <SummaryRow
          label="Net Content"
          value={
            teaInput.netWeight != null && teaInput.netWeight > 0
              ? `${teaInput.netWeight} ${teaInput.weightUnit ?? "g"}`
              : "Not required"
          }
        />
      </div>
    </div>
  )
}
