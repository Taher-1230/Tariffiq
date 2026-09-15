// ============================================================
// TeaTypeStep — Step 2: Select the tea type
// ============================================================

import { CheckCircle2, HelpCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TeaType } from "@/types/classification"

interface TeaTypeOption {
  value: TeaType
  label: string
  description: string
  icon: React.ReactNode
}

const TEA_TYPE_OPTIONS: TeaTypeOption[] = [
  {
    value: "green",
    label: "Green Tea",
    description: "Tea that is not fermented.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "black",
    label: "Black Tea",
    description: "Fermented tea.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <path d="M17 8h1a4 4 0 0 1 0 8h-1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="6" y1="2" x2="6" y2="5" strokeLinecap="round"/>
        <line x1="10" y1="2" x2="10" y2="5" strokeLinecap="round"/>
        <line x1="14" y1="2" x2="14" y2="5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "partly_fermented",
    label: "Partly Fermented Tea",
    description: "Tea that is partly fermented.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "not_sure",
    label: "Not Sure",
    description: "I'm not certain of the fermentation type.",
    icon: <HelpCircle className="h-5 w-5" />,
  },
]

interface TeaTypeStepProps {
  selected: TeaType | null
  onSelect: (value: TeaType) => void
}

export function TeaTypeStep({ selected, onSelect }: TeaTypeStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          What type of tea is the product?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Select the fermentation type that best describes the tea.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Tea type"
        className="grid gap-3 sm:grid-cols-2"
      >
        {TEA_TYPE_OPTIONS.map((option) => {
          const isSelected = selected === option.value
          return (
            <button
              key={option.value}
              type="button"
              id={`tea-type-${option.value}`}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option.value)}
              className={cn(
                "relative flex items-start gap-4 rounded-lg border bg-card p-5 text-left transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/[0.03] shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.icon}
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-foreground">
                  {option.label}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </div>

              {isSelected && (
                <CheckCircle2
                  className="absolute right-4 top-4 h-5 w-5 text-primary"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
