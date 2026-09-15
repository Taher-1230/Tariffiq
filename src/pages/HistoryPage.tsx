// ============================================================
// HistoryPage — Phase 5B → Phase 5D
//
// Displays the authenticated user's past classification history.
// Features category & source filtering, full-text search, CSV export,
// pagination, detailed modal view, deletion confirmation, and loading states.
// ============================================================

import { useState, useEffect, useCallback } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  Filter,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { AuthDialog } from "@/components/auth/AuthDialog"
import { ClassificationHistoryDetail } from "@/components/history/ClassificationHistoryDetail"
import {
  fetchClassificationHistory,
  deleteClassification,
  generateHistoryCsv,
  downloadCsvFile,
} from "@/api/historyApi"
import type { ClassificationHistoryItem } from "../../shared/history-contract.js"

export default function HistoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [activeSource, setActiveSource] = useState<string>("all")

  // History state
  const [items, setItems] = useState<ClassificationHistoryItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals state
  const [selectedItem, setSelectedItem] = useState<ClassificationHistoryItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<ClassificationHistoryItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Fetch History ──────────────────────────────────────────
  const fetchHistory = useCallback(
    async (targetPage: number) => {
      if (!isAuthenticated) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchClassificationHistory({
          page: targetPage,
          limit,
          productCategory: activeCategory !== "all" ? activeCategory : undefined,
          source: activeSource !== "all" ? activeSource : undefined,
          search: searchTerm.trim() || undefined,
        })

        setItems(data.items)
        setPage(data.page)
        setTotal(data.total)
      } catch {
        setError("Couldn't load your classification history.")
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, limit, activeCategory, activeSource, searchTerm]
  )

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory(page)
    }
  }, [isAuthenticated, fetchHistory, page])

  // Reset page to 1 when filters change
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setPage(1)
  }

  const handleSourceChange = (src: string) => {
    setActiveSource(src)
    setPage(1)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchHistory(1)
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    setPage(1)
  }

  // ── Handle Delete Record ───────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return

    setIsDeleting(true)
    try {
      await deleteClassification(deletingItem.id)
      setDeletingItem(null)
      // Refresh current page (or previous if last item deleted)
      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        fetchHistory(page)
      }
    } catch {
      alert("Error deleting record. Please check your connection.")
    } finally {
      setIsDeleting(false)
    }
  }

  // ── CSV Export ─────────────────────────────────────────────
  const handleExportCsv = () => {
    if (items.length === 0) return
    const csvData = generateHistoryCsv(items)
    downloadCsvFile(csvData, `tariffiq-history-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(isoString))
    } catch {
      return isoString
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ── 1. Unauthenticated View ────────────────────────────────
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Classification History"
          description="View and review your previous product classifications."
        />

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Sign In to Access Your History
          </h2>
          <p className="max-w-md text-sm text-muted-foreground mb-6">
            Classification history is saved securely to your user account. Sign in
            or create a free account to track and audit your classifications.
          </p>
          <Button onClick={() => setAuthDialogOpen(true)} className="gap-2">
            Sign In / Register
          </Button>
        </div>

        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Classification History"
          description="Audit trail of all your deterministic and AI-assisted Tea and Coffee classifications."
        />

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 text-xs"
              title="Export filtered records as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
          <Button asChild size="sm" className="gap-2">
            <Link to="/">Classify a Product</Link>
          </Button>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg border bg-card/60 backdrop-blur-xs">
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by HS code or product description..."
            className="w-full h-9 pl-9 pr-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-medium">Filter:</span>
          </div>

          {/* Product Category Pills */}
          <div className="flex rounded-md border border-border p-0.5 bg-muted/30">
            <button
              type="button"
              onClick={() => handleCategoryChange("all")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeCategory === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Products
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange("tea")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeCategory === "tea"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tea (0902)
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange("coffee")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeCategory === "coffee"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Coffee (0901)
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange("spices")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeCategory === "spices"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Spices (0904–0910)
            </button>
          </div>

          {/* Source Pills */}
          <div className="flex rounded-md border border-border p-0.5 bg-muted/30">
            <button
              type="button"
              onClick={() => handleSourceChange("all")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeSource === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Sources
            </button>
            <button
              type="button"
              onClick={() => handleSourceChange("ai")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeSource === "ai"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AI-assisted
            </button>
            <button
              type="button"
              onClick={() => handleSourceChange("manual")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeSource === "manual"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading State ── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Loading classifications...
          </p>
        </div>
      )}

      {/* ── Error State ── */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium text-destructive mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHistory(page)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={
            searchTerm || activeCategory !== "all" || activeSource !== "all"
              ? "No matching classifications found."
              : "Your classification history is empty."
          }
          description={
            searchTerm || activeCategory !== "all" || activeSource !== "all"
              ? "Try adjusting your search query or filters to find what you're looking for."
              : "Your completed Tea and Coffee classifications will appear here with full deterministic audit trails."
          }
          action={
            searchTerm || activeCategory !== "all" || activeSource !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setActiveCategory("all")
                  setActiveSource("all")
                  setPage(1)
                }}
              >
                Reset Filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/">Classify a Product</Link>
              </Button>
            )
          }
        />
      )}

      {/* ── History Items List ── */}
      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {items.map((item) => {
              const isAi = item.inputSource === "ai"
              const isCoffee = item.productCategory === "coffee"
              const isSpices = item.productCategory === "spices"
              const confirmed = (item.confirmedInput || {}) as Record<string, unknown>
              const classification = item.classification

              // Formulate title based on product category
              let title = item.productDescription || ""
              if (!title) {
                if (isCoffee) {
                  if (confirmed.productType === "husks_and_skins") {
                    title = "Coffee husks and skins"
                  } else if (confirmed.productType === "substitutes_containing_coffee") {
                    title = "Coffee substitutes containing coffee"
                  } else {
                    const roastedPart = confirmed.roasted ? "Roasted Coffee" : "Unroasted Coffee"
                    const varietyPart = confirmed.form ? ` (${String(confirmed.form).replace(/_/g, " ")})` : ""
                    const gradePart = confirmed.grade ? ` — Grade ${confirmed.grade}` : ""
                    title = `${roastedPart}${varietyPart}${gradePart}`
                  }
                } else if (isSpices) {
                  const spice = confirmed.spiceType ? String(confirmed.spiceType).replace(/_/g, " ") : "Spices"
                  const form = confirmed.form ? ` (${String(confirmed.form).replace(/_/g, " ")})` : ""
                  title = `${spice.charAt(0).toUpperCase() + spice.slice(1)}${form}`
                } else {
                  title = `${String(confirmed.teaType || "Tea").toUpperCase()} — ${String(
                    confirmed.presentation || ""
                  ).replace(/_/g, " ")} (${confirmed.netWeight || ""} ${
                    confirmed.weightUnit || ""
                  })`
                }
              }

              return (
                <Card
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition-colors hover:border-primary/40 hover:shadow-xs"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[11px] py-0 px-2 font-medium">
                        {isSpices ? "Spices (0904–0910)" : isCoffee ? "Coffee (0901)" : "Tea (0902)"}
                      </Badge>

                      <Badge
                        variant={isAi ? "default" : "secondary"}
                        className="gap-1 text-[11px] py-0 px-2 font-medium"
                      >
                        {isAi ? (
                          <>
                            <Sparkles className="h-2.5 w-2.5" />
                            AI-assisted
                          </>
                        ) : (
                          <>
                            <Tag className="h-2.5 w-2.5" />
                            Manual
                          </>
                        )}
                      </Badge>

                      <Badge variant="outline" className="font-mono text-[11px] py-0 px-2 font-semibold">
                        HS: {classification.hsCodeFormatted || classification.hsCode}
                      </Badge>

                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {title}
                    </h3>

                    {classification.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {classification.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => {
                        setSelectedItem(item)
                        setDetailOpen(true)
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletingItem(item)}
                      title="Delete entry"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ── Pagination Bar ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({total} classifications)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      <ClassificationHistoryDetail
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Classification?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this classification record from your history?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingItem(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

