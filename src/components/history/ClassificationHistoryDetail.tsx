// ============================================================
// ClassificationHistoryDetail — Phase 5B → Phase 5D
//
// Modal dialog displaying complete breakdown of a past
// classification record from user history. Supports both
// Tea (0902) and Coffee (0901) product categories.
// ============================================================

import {
  Calendar,
  CheckCircle2,
  FileText,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ClassificationHistoryItem } from "../../../shared/history-contract.js"

interface ClassificationHistoryDetailProps {
  item: ClassificationHistoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COFFEE_FORM_LABELS: Record<string, string> = {
  arabica_plantation: "Arabica plantation",
  arabica_cherry: "Arabica Cherry",
  rob_cherry: "Rob cherry",
  other: "Other variety/form",
}

const COFFEE_GRADE_LABELS: Record<string, string> = {
  A: "Grade A",
  B: "Grade B",
  C: "Grade C",
  AB: "Grade AB",
  PB: "Grade PB",
  BBB: "Grade BBB",
  "B/B/B": "Grade B/B/B",
  other: "Other grade",
}

export function ClassificationHistoryDetail({
  item,
  open,
  onOpenChange,
}: ClassificationHistoryDetailProps) {
  if (!item) return null

  const isAi = item.inputSource === "ai"
  const isCoffee = item.productCategory === "coffee"
  const isSpices = item.productCategory === "spices"
  const classification = item.classification
  const confirmed = (item.confirmedInput || {}) as Record<string, unknown>

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoString))
    } catch {
      return isoString
    }
  }

  const categoryBadgeLabel = isSpices
    ? "Spices (Headings 0904–0910)"
    : isCoffee
    ? "Coffee (Heading 0901)"
    : "Tea (Heading 0902)"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className="text-xs font-semibold">
              {categoryBadgeLabel}
            </Badge>

            <Badge
              variant={isAi ? "default" : "secondary"}
              className="gap-1 text-xs"
            >
              {isAi ? (
                <>
                  <Sparkles className="h-3 w-3" />
                  AI-Assisted
                </>
              ) : (
                <>
                  <Tag className="h-3 w-3" />
                  Manual Entry
                </>
              )}
            </Badge>

            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(item.createdAt)}
            </span>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight">
            Classification Record Details
          </DialogTitle>
          <DialogDescription>
            Deterministic tariff classification breakdown and audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ── 1. Classification Output Highlight ── */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  HS Code
                </span>
                <span className="font-mono text-xl font-bold tracking-tight text-primary">
                  {classification.hsCodeFormatted || classification.hsCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  <ShieldCheck className="h-3 w-3" />
                  Deterministic tariff rules
                </Badge>
                {classification.matchedRuleId && (
                  <Badge variant="outline" className="font-mono text-xs">
                    Rule {classification.matchedRuleId}
                  </Badge>
                )}
              </div>
            </div>

            {classification.description && (
              <p className="text-sm font-medium text-foreground leading-snug">
                {classification.description}
              </p>
            )}
          </div>

          {/* ── 2. Original Description (if AI) ── */}
          {isAi && item.productDescription && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Original Product Description
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm italic text-muted-foreground">
                &ldquo;{item.productDescription}&rdquo;
              </div>
            </div>
          )}

          {/* ── 3. Confirmed Physical Attributes ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Package className="h-4 w-4 text-muted-foreground" />
              Confirmed Product Facts
            </div>

            {isSpices ? (
              // ── Spices attributes ──
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-xs">
                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Spice Commodity</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.spiceType || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Botanical Type</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.botanicalType || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Crushed / Ground</span>
                  <span className="font-medium text-foreground">
                    {confirmed.crushedOrGround === true
                      ? "Crushed / Ground"
                      : confirmed.crushedOrGround === false
                      ? "Whole"
                      : "—"}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Subtype / Variety</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.subType || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Form</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.form || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Processing</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.processingState || "—").replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ) : isCoffee ? (
              // ── Coffee attributes ──
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-xs">
                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Product Type</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.productType || "Coffee").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Roasting State</span>
                  <span className="font-medium text-foreground">
                    {confirmed.roasted === true
                      ? "Roasted"
                      : confirmed.roasted === false
                      ? "Not roasted (green)"
                      : "—"}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Decaffeination</span>
                  <span className="font-medium text-foreground">
                    {confirmed.decaffeinated === true
                      ? "Decaffeinated"
                      : confirmed.decaffeinated === false
                      ? "Non-decaffeinated"
                      : "—"}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Presentation</span>
                  <span className="font-medium capitalize text-foreground">
                    {confirmed.presentation === "bulk"
                      ? "Bulk"
                      : confirmed.presentation === "other"
                      ? "Other packaging"
                      : "—"}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Variety / Form</span>
                  <span className="font-medium text-foreground">
                    {confirmed.form
                      ? COFFEE_FORM_LABELS[String(confirmed.form)] ?? String(confirmed.form)
                      : "—"}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Grade</span>
                  <span className="font-medium text-foreground">
                    {confirmed.grade
                      ? COFFEE_GRADE_LABELS[String(confirmed.grade)] ?? String(confirmed.grade)
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              // ── Tea attributes ──
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Tea Type</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.teaType || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Presentation</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.presentation || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Form</span>
                  <span className="font-medium capitalize text-foreground">
                    {String(confirmed.form || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-md border p-2.5 bg-card">
                  <span className="text-muted-foreground block text-[11px]">Net Weight</span>
                  <span className="font-medium text-foreground">
                    {confirmed.netWeight !== undefined && confirmed.netWeight !== null
                      ? `${confirmed.netWeight} ${confirmed.weightUnit || "g"}`
                      : "Not specified"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── 4. Classification Hierarchy Path ── */}
          {classification.classificationPath && classification.classificationPath.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Route className="h-4 w-4 text-muted-foreground" />
                Tariff Hierarchy Path
              </div>

              <div className="rounded-md border divide-y bg-card text-xs">
                {classification.classificationPath.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5">
                    <span className="font-mono font-semibold text-primary shrink-0">
                      {step.code}
                    </span>
                    <span className="text-muted-foreground leading-tight">
                      {step.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Reasoning Steps Trace ── */}
          {classification.reasoning && classification.reasoning.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Deterministic Decision Trace
              </div>

              <div className="rounded-md border divide-y bg-card text-xs">
                {classification.reasoning.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          step.matched ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="font-medium text-foreground">{step.condition}:</span>
                      {step.details && <span className="text-muted-foreground">{step.details}</span>}
                    </div>
                    {step.matched && (
                      <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                        Matched
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

