// ============================================================
// ReviewStep — Step 6: Review collected information
// ============================================================

import { Pencil } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TeaClassificationInput, WizardStep } from "@/types/classification"

// ── Human-readable labels ──────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────

interface ReviewStepProps {
  input: TeaClassificationInput
  onEdit: (step: WizardStep) => void
}

// ── Sub-component: single review row ──────────────────────

interface ReviewRowProps {
  label: string
  value: string
  onEdit: () => void
  editLabel: string
  className?: string
}

function ReviewRow({ label, value, onEdit, editLabel, className }: ReviewRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3.5",
        "border-b border-border last:border-0",
        className
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-[15px] font-medium text-foreground">{value}</span>
      </div>

      <button
        type="button"
        aria-label={`Edit ${editLabel}`}
        onClick={onEdit}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Pencil className="h-3 w-3" aria-hidden />
        Edit
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────

export function ReviewStep({ input, onEdit }: ReviewStepProps) {

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          Review Product Information
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Verify the information below before running the classification.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Product Summary
          </span>
        </div>

        <div className="px-5">
          <ReviewRow
            label="Product"
            value="Tea"
            editLabel="product category"
            onEdit={() => onEdit("product")}
          />
          <ReviewRow
            label="Tea Type"
            value={input.teaType ? TEA_TYPE_LABELS[input.teaType] : "Not specified"}
            editLabel="tea type"
            onEdit={() => onEdit("tea-type")}
          />
          <ReviewRow
            label="Presentation"
            value={
              input.presentation
                ? PRESENTATION_LABELS[input.presentation]
                : "Not specified (Not required)"
            }
            editLabel="presentation"
            onEdit={() => onEdit("presentation")}
          />
          <ReviewRow
            label="Product Form"
            value={input.form ? FORM_LABELS[input.form] : "Not specified"}
            editLabel="product form"
            onEdit={() => onEdit("form")}
          />
          <ReviewRow
            label="Net Content"
            value={
              input.netWeight != null && input.netWeight > 0
                ? `${input.netWeight} ${input.weightUnit ?? "g"}`
                : "Not specified (Not required)"
            }
            editLabel="net content"
            onEdit={() => onEdit("weight")}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        If any information is incorrect, use the{" "}
        <span className="font-medium text-foreground">Edit</span> links above to go
        back to the relevant step.
      </p>
    </div>
  )
}
