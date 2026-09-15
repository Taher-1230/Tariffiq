// ============================================================
// SpiceTypeStep — Step 2: Select the spice category
//
// Phase 6.4: Manual Spices wizard.
// Displays all canonical SpiceType values from
// src/products/spices/types.ts.
//
// CRITICAL INVARIANT:
//   This component collects factual product attributes ONLY.
//   No tariff logic, no HS code determination, no classification.
// ============================================================

import { AlertTriangle, CheckCircle2, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { SpiceType } from "@/products/spices/types"

// ── Canonical spice type options with display metadata ───────

interface SpiceTypeOption {
  value: SpiceType
  label: string
  heading: string
  description: string
}

const SPICE_TYPE_OPTIONS: SpiceTypeOption[] = [
  { value: "pepper", label: "Pepper", heading: "0904", description: "Pepper of the genus Piper" },
  { value: "capsicum_pimenta", label: "Capsicum / Pimenta", heading: "0904", description: "Fruits of Capsicum or Pimenta" },
  { value: "vanilla", label: "Vanilla", heading: "0905", description: "Vanilla beans" },
  { value: "cinnamon", label: "Cinnamon", heading: "0906", description: "Cinnamon and cinnamon-tree flowers" },
  { value: "cloves", label: "Cloves", heading: "0907", description: "Cloves (whole fruit, cloves, and stems)" },
  { value: "nutmeg", label: "Nutmeg", heading: "0908", description: "Nutmeg" },
  { value: "mace", label: "Mace", heading: "0908", description: "Mace" },
  { value: "cardamom", label: "Cardamom", heading: "0908", description: "Cardamoms" },
  { value: "coriander", label: "Coriander", heading: "0909", description: "Seeds of coriander" },
  { value: "cumin", label: "Cumin", heading: "0909", description: "Seeds of cumin" },
  { value: "anise", label: "Anise", heading: "0909", description: "Seeds of anise" },
  { value: "badian", label: "Badian (Star Anise)", heading: "0909", description: "Seeds of badian" },
  { value: "caraway_or_fennel", label: "Caraway or Fennel", heading: "0909", description: "Seeds of caraway or fennel" },
  { value: "juniper_berries", label: "Juniper Berries", heading: "0909", description: "Juniper berries" },
  { value: "ginger", label: "Ginger", heading: "0910", description: "Ginger" },
  { value: "saffron", label: "Saffron", heading: "0910", description: "Saffron" },
  { value: "turmeric", label: "Turmeric", heading: "0910", description: "Turmeric (Curcuma)" },
  { value: "mixture", label: "Mixture of Spices", heading: "0910", description: "Mixtures of spices from two or more headings" },
  { value: "other_spice", label: "Other Spice", heading: "0910", description: "Other spices (thyme, bay leaves, curry, etc.)" },
]

// ── Component Props ──────────────────────────────────────────

interface SpiceTypeStepProps {
  selectedSpiceType: SpiceType | null
  isCubeb: boolean | null
  essentialCharacter: boolean | null
  onSpiceTypeChange: (value: SpiceType) => void
  onIsCubebChange: (value: boolean) => void
  onEssentialCharacterChange: (value: boolean | null) => void
}

export function SpiceTypeStep({
  selectedSpiceType,
  isCubeb,
  essentialCharacter,
  onSpiceTypeChange,
  onIsCubebChange,
  onEssentialCharacterChange,
}: SpiceTypeStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            What type of spice are you classifying?
          </h2>
          <Badge variant="outline" className="text-[10px]">
            Headings 0904–0910
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Select the spice commodity category. Each category corresponds to specific HS headings within Chapter 09.
        </p>
      </div>

      {/* ── Spice Type Selection Grid ── */}
      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="radiogroup"
        aria-label="Spice type selection"
      >
        {SPICE_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedSpiceType === option.value
          return (
            <button
              key={option.value}
              type="button"
              id={`spice-type-${option.value}`}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSpiceTypeChange(option.value)}
              className={cn(
                "relative flex flex-col items-start gap-1.5 rounded-lg border p-3.5 text-left transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/[0.03] shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
              )}
            >
              {isSelected && (
                <CheckCircle2
                  className="absolute right-3 top-3 h-4 w-4 text-primary"
                  aria-hidden
                />
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {option.label}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {option.heading}
                </span>
              </div>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Statutory Exclusion: Cubeb Pepper ── */}
      {selectedSpiceType === "pepper" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chapter 09 Note 4 — Cubeb Pepper
          </span>
          <label
            htmlFor="spice-cubeb-check"
            className={cn(
              "flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors",
              isCubeb === true
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-border hover:bg-accent/40"
            )}
          >
            <input
              type="checkbox"
              id="spice-cubeb-check"
              checked={isCubeb === true}
              onChange={(e) => onIsCubebChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                This is Cubeb pepper (Piper cubeba)
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Cubeb pepper is subject to a Chapter 09 exclusion and is not classified under Heading 0904.
              </span>
            </div>
          </label>

          {isCubeb === true && (
            <div
              className="flex items-start gap-2.5 rounded-md border border-blue-500/30 bg-blue-500/10 p-3"
              role="alert"
            >
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                Cubeb pepper (Piper cubeba) is excluded from Chapter 09 per Note 4. The deterministic classifier will apply this statutory rule upon classification.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Statutory Exclusion: Essential Character ── */}
      {selectedSpiceType === "mixture" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chapter 09 Note 3 — Essential Character
          </span>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="essential-char-yes"
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                essentialCharacter === true
                  ? "border-primary bg-primary/[0.03]"
                  : "border-border hover:bg-accent/40"
              )}
            >
              <input
                type="radio"
                id="essential-char-yes"
                name="essentialCharacter"
                checked={essentialCharacter === true}
                onChange={() => onEssentialCharacterChange(true)}
                className="h-4 w-4 text-primary focus:ring-ring"
              />
              <span className="text-sm font-medium text-foreground">
                Retains essential character of spices
              </span>
            </label>
            <label
              htmlFor="essential-char-no"
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                essentialCharacter === false
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-border hover:bg-accent/40"
              )}
            >
              <input
                type="radio"
                id="essential-char-no"
                name="essentialCharacter"
                checked={essentialCharacter === false}
                onChange={() => onEssentialCharacterChange(false)}
                className="h-4 w-4 text-primary focus:ring-ring"
              />
              <span className="text-sm font-medium text-foreground">
                Does not retain essential character
              </span>
            </label>
            <label
              htmlFor="essential-char-unknown"
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                essentialCharacter === null
                  ? "border-primary bg-primary/[0.03]"
                  : "border-border hover:bg-accent/40"
              )}
            >
              <input
                type="radio"
                id="essential-char-unknown"
                name="essentialCharacter"
                checked={essentialCharacter === null}
                onChange={() => onEssentialCharacterChange(null)}
                className="h-4 w-4 text-primary focus:ring-ring"
              />
              <span className="text-sm font-medium text-foreground">
                Not determined
              </span>
            </label>
          </div>

          {essentialCharacter === false && (
            <div
              className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3"
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                Products that have lost the essential character of spices (e.g. mixed condiments or seasonings) are excluded from Chapter 09 per Note 3. The deterministic classifier will apply this statutory rule.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
