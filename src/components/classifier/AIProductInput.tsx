// ============================================================
// AIProductInput — Natural Language Description UI Step
// ============================================================

import { useState } from "react"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MAX_INPUT_LENGTH } from "@/ai/extractor"

interface AIProductInputProps {
  initialText?: string
  isExtracting: boolean
  productCategory?: string
  placeholder?: string
  title?: string
  onAnalyze: (text: string) => void
  onSwitchToManual: () => void
  onBackToSelection?: () => void
}

export function AIProductInput({
  initialText = "",
  isExtracting,
  productCategory = "tea",
  placeholder,
  title,
  onAnalyze,
  onSwitchToManual,
  onBackToSelection,
}: AIProductInputProps) {
  const [text, setText] = useState(initialText)

  const trimmedLength = text.trim().length
  const isSubmitDisabled = trimmedLength === 0 || isExtracting || text.length > MAX_INPUT_LENGTH

  const defaultPlaceholder =
    productCategory === "spices"
      ? "Example: Whole dried black pepper, garbled, in bulk."
      : productCategory === "coffee"
      ? "Example: Roasted Arabica plantation coffee, Grade A, non-decaffeinated, packed in bulk."
      : "Example: Premium black tea, whole leaf, packed in 500g retail packs."

  const displayPlaceholder = placeholder ?? defaultPlaceholder

  const defaultTitle =
    productCategory === "spices"
      ? "Describe your spices product"
      : productCategory === "coffee"
      ? "Describe your coffee product"
      : "Describe your product"

  const displayTitle = title ?? defaultTitle

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSubmitDisabled) {
      onAnalyze(text)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header section ── */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold text-foreground">
          {displayTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Describe the product in your own words. TariffIQ will extract the relevant product details for review.
        </p>
      </div>

      {/* ── Loading state ── */}
      {isExtracting ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-10 text-center animate-fade-in"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-foreground">
              Analyzing product description...
            </h3>
            <p className="text-sm text-muted-foreground">
              Extracting product details for review.
            </p>
          </div>
        </div>
      ) : (
        /* ── Input form ── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="ai-product-description"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Product Description
            </label>
            <textarea
              id="ai-product-description"
              name="productDescription"
              aria-describedby="char-counter"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isExtracting}
              rows={5}
              placeholder={displayPlaceholder}
              className="w-full resize-y rounded-lg border border-input bg-background p-4 text-sm leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />

            {/* Character counter */}
            <div className="flex justify-end">
              <span
                id="char-counter"
                className={`text-xs ${
                  text.length > MAX_INPUT_LENGTH
                    ? "font-semibold text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {text.length.toLocaleString()} / {MAX_INPUT_LENGTH.toLocaleString()} characters
              </span>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex gap-2">
              {onBackToSelection && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBackToSelection}
                  disabled={isExtracting}
                  className="gap-2"
                  id="ai-input-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={onSwitchToManual}
                disabled={isExtracting}
                className="text-muted-foreground hover:text-foreground"
                id="ai-input-manual"
              >
                Enter Details Manually
              </Button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="gap-2"
              id="ai-input-submit"
            >
              <Sparkles className="h-4 w-4" />
              Analyze with AI
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
