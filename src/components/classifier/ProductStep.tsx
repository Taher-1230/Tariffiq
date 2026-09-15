// ============================================================
// ProductStep — Step 1: Select the product category
//
// Phase 5C-B.1: Tea and Coffee product metadata is driven from the
// ProductRegistry. Spices remains as a planned placeholder.
// ============================================================

import { CheckCircle2, Coffee, Flame, Leaf } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { productRegistry } from "@/products/registry"
import type { ProductCategory } from "@/products/types"
import "@/products/tea/index"
import "@/products/coffee/index"
import "@/products/spices/index"

interface ProductStepProps {
  selected: ProductCategory | null
  onSelect: (value: ProductCategory) => void
}

export function ProductStep({ selected, onSelect }: ProductStepProps) {
  const teaDef = productRegistry.get("tea")?.definition
  const coffeeDef = productRegistry.get("coffee")?.definition
  const spicesDef = productRegistry.get("spices")?.definition

  const isTeaSelected = selected === "tea"
  const isCoffeeSelected = selected === "coffee"
  const isSpicesSelected = selected === "spices"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          What product are you classifying?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Select the product category. Additional categories will be added in future phases.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* ── Tea card (available — from registry) ── */}
        <button
          type="button"
          id="product-tea"
          role="radio"
          aria-checked={isTeaSelected}
          onClick={() => onSelect("tea")}
          className={cn(
            "relative flex flex-col items-start gap-3 rounded-lg border bg-card p-5 text-left transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isTeaSelected
              ? "border-primary bg-primary/[0.03] shadow-sm"
              : "border-border hover:border-primary/30 hover:bg-accent/50"
          )}
        >
          {/* Selection indicator */}
          {isTeaSelected && (
            <CheckCircle2
              className="absolute right-4 top-4 h-5 w-5 text-primary"
              aria-hidden
            />
          )}

          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
              isTeaSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Leaf className="h-5 w-5" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground">
                {teaDef?.displayName ?? "Tea"}
              </span>
              <Badge variant="success" className="text-[10px]">
                Available
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {teaDef?.description ?? "Tea products classified under HS heading 0902."}
            </p>
          </div>
        </button>

        {/* ── Coffee card (available — from registry) ── */}
        <button
          type="button"
          id="product-coffee"
          role="radio"
          aria-checked={isCoffeeSelected}
          onClick={() => onSelect("coffee")}
          className={cn(
            "relative flex flex-col items-start gap-3 rounded-lg border bg-card p-5 text-left transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isCoffeeSelected
              ? "border-primary bg-primary/[0.03] shadow-sm"
              : "border-border hover:border-primary/30 hover:bg-accent/50"
          )}
        >
          {/* Selection indicator */}
          {isCoffeeSelected && (
            <CheckCircle2
              className="absolute right-4 top-4 h-5 w-5 text-primary"
              aria-hidden
            />
          )}

          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
              isCoffeeSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Coffee className="h-5 w-5" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground">
                {coffeeDef?.displayName ?? "Coffee"}
              </span>
              <Badge variant="success" className="text-[10px]">
                Available
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {coffeeDef?.description ?? "Coffee products classified under HS heading 0901."}
            </p>
          </div>
        </button>

        {/* ── Spices card (available — from registry) ── */}
        <button
          type="button"
          id="product-spices"
          role="radio"
          aria-checked={isSpicesSelected}
          onClick={() => onSelect("spices")}
          className={cn(
            "relative flex flex-col items-start gap-3 rounded-lg border bg-card p-5 text-left transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isSpicesSelected
              ? "border-primary bg-primary/[0.03] shadow-sm"
              : "border-border hover:border-primary/30 hover:bg-accent/50"
          )}
        >
          {/* Selection indicator */}
          {isSpicesSelected && (
            <CheckCircle2
              className="absolute right-4 top-4 h-5 w-5 text-primary"
              aria-hidden
            />
          )}

          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
              isSpicesSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Flame className="h-5 w-5" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground">
                {spicesDef?.displayName ?? "Spices"}
              </span>
              <Badge variant="success" className="text-[10px]">
                Available
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {spicesDef?.description ?? "Spices and related products classified under HS headings 0904–0910."}
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}

