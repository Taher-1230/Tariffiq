// ============================================================
// Classification History Routes — Phase 5B → Phase 5D
//
// Endpoints:
//   POST   /api/classifications             (Save confirmed classification)
//   GET    /api/classifications             (Get paginated user history with filter/search)
//   GET    /api/classifications/export/csv  (Export filtered history as CSV)
//   GET    /api/classifications/:id         (Get single history detail)
//   DELETE /api/classifications/:id         (Delete single history record)
//
// INVARIANTS:
//   1. All routes require authentication.
//   2. All queries are strictly scoped to req.user.id.
//   3. Server re-runs deterministic engine on confirmed input via ProductRegistry.
//   4. Server ignores any client-supplied HS code, rule ID, or classification object.
//   5. 404 is returned if record not found or owned by another user.
// ============================================================

import { Router } from "express"
import mongoose from "mongoose"
import { Classification } from "../models/Classification.js"
import { verifyAndClassifyProduct } from "../services/classificationService.js"
import { createAuthMiddleware } from "../middleware/auth.js"
import type { ServerConfig } from "../config.js"
import type {
  SaveClassificationRequest,
  PaginatedHistoryResponse,
} from "../../shared/history-contract.js"

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function createClassificationRouter(config: ServerConfig): Router {
  const router = Router()
  const requireAuth = createAuthMiddleware(config)

  // Apply authentication to all classification history routes
  router.use(requireAuth)

  // ── 1. Save Classification ──────────────────────────────────
  router.post("/", async (req, res) => {
    try {
      const body = req.body as Partial<SaveClassificationRequest>

      const inputSource = body.inputSource ?? body.source
      const confirmedInput = body.confirmedInput ?? body.input
      const productCategory = body.productCategory ?? "tea"
      const productDescription = body.productDescription
      const extraction = body.extraction

      // 1. Validate Input Source
      if (!inputSource || (inputSource !== "ai" && inputSource !== "manual")) {
        res.status(400).json({
          status: "error",
          errorCode: "INVALID_REQUEST",
          message: "Field 'inputSource' (or 'source') must be either 'ai' or 'manual'.",
        })
        return
      }

      // 2. Validate & Re-Verify Classification Deterministically
      //    Uses product-agnostic verification via ProductRegistry
      //    CRITICAL: Ignores any client-supplied hsCode or classification
      const verification = verifyAndClassifyProduct(productCategory, confirmedInput)
      if (!verification.valid || !verification.classification) {
        res.status(400).json({
          status: "error",
          errorCode: "INVALID_CLASSIFICATION_INPUT",
          message: `Classification input validation failed: ${verification.errors.join("; ")}`,
        })
        return
      }

      // 3. Persist Document (Scoped strictly to authenticated user)
      const doc = new Classification({
        userId: new mongoose.Types.ObjectId(req.user!.id),
        productCategory,
        inputSource,
        productDescription:
          typeof productDescription === "string" ? productDescription.trim() : undefined,
        extraction: extraction && typeof extraction === "object" ? extraction : null,
        confirmedInput,
        classification: verification.classification,
      })

      await doc.save()

      res.status(201).json({
        status: "success",
        item: doc.toHistoryItem(),
        historyId: doc.id,
      })
    } catch (err: unknown) {
      console.error("[History] Save error:", err)
      res.status(500).json({
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "Failed to save classification history.",
      })
    }
  })

  // ── 2. Export Filtered History as CSV ───────────────────────
  router.get("/export/csv", async (req, res) => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(req.user!.id)
      const filter: Record<string, unknown> = { userId: userObjectId }

      // Category filter
      const categoryQuery = req.query.productCategory as string | undefined
      if (categoryQuery && categoryQuery !== "all") {
        filter.productCategory = categoryQuery
      }

      // Source filter
      const sourceQuery = (req.query.source || req.query.inputSource) as string | undefined
      if (sourceQuery && sourceQuery !== "all") {
        filter.inputSource = sourceQuery
      }

      // Search filter
      const searchQuery = typeof req.query.search === "string" ? req.query.search.trim() : ""
      if (searchQuery) {
        const regex = new RegExp(escapeRegex(searchQuery), "i")
        filter.$or = [
          { "classification.hsCode": regex },
          { "classification.description": regex },
          { productDescription: regex },
        ]
      }

      const docs = await Classification.find(filter)
        .sort({ createdAt: -1 })
        .limit(1000)
        .exec()

      const headers = [
        "Date",
        "Product Category",
        "Source",
        "HS Code",
        "Description",
        "Matched Rule",
        "Product / Input Summary",
      ]

      const escapeCsv = (val: unknown): string => {
        if (val === null || val === undefined) return '""'
        let str = String(val)
        // Prevent spreadsheet formula injection (=, +, -, @, \t, \r)
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'${str}`
        }
        return `"${str.replace(/"/g, '""')}"`
      }

      const rows = docs.map((doc) => {
        const item = doc.toHistoryItem()
        const isAi = item.inputSource === "ai"
        const cat =
          item.productCategory === "spices"
            ? "Spices (0904–0910)"
            : item.productCategory === "coffee"
            ? "Coffee (0901)"
            : "Tea (0902)"
        const sourceLabel = isAi ? "AI-assisted" : "Manual"
        const hsCode = item.classification.hsCodeFormatted || item.classification.hsCode || "N/A"
        const desc = item.classification.description || ""
        const rule = item.classification.matchedRuleId || "N/A"

        let inputSummary = item.productDescription || ""
        if (!inputSummary) {
          const confirmed = item.confirmedInput || {}
          inputSummary = Object.entries(confirmed)
            .filter(([k]) => k !== "productCategory")
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        }

        return [
          escapeCsv(item.createdAt),
          escapeCsv(cat),
          escapeCsv(sourceLabel),
          escapeCsv(hsCode),
          escapeCsv(desc),
          escapeCsv(rule),
          escapeCsv(inputSummary),
        ].join(",")
      })

      const csvContent = [headers.map(escapeCsv).join(","), ...rows].join("\r\n")

      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader("Content-Disposition", 'attachment; filename="tariffiq-classifications.csv"')
      res.status(200).send(csvContent)
    } catch (err: unknown) {
      console.error("[History] Export error:", err)
      res.status(500).json({
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "Failed to export classification history.",
      })
    }
  })

  // ── 3. Get Paginated History with Filter & Search ───────────
  router.get("/", async (req, res) => {
    try {
      const pageQuery = Number(req.query.page) || 1
      const limitQuery = Number(req.query.limit) || 20

      const page = Math.max(1, Math.floor(pageQuery))
      const limit = Math.min(100, Math.max(1, Math.floor(limitQuery)))
      const skip = (page - 1) * limit

      const userObjectId = new mongoose.Types.ObjectId(req.user!.id)
      const filter: Record<string, unknown> = { userId: userObjectId }

      // Category filter
      const categoryQuery = req.query.productCategory as string | undefined
      if (categoryQuery && categoryQuery !== "all") {
        filter.productCategory = categoryQuery
      }

      // Source filter
      const sourceQuery = (req.query.source || req.query.inputSource) as string | undefined
      if (sourceQuery && sourceQuery !== "all") {
        filter.inputSource = sourceQuery
      }

      // Search filter across HS code, description, and product description
      const searchQuery = typeof req.query.search === "string" ? req.query.search.trim() : ""
      if (searchQuery) {
        const regex = new RegExp(escapeRegex(searchQuery), "i")
        filter.$or = [
          { "classification.hsCode": regex },
          { "classification.description": regex },
          { productDescription: regex },
        ]
      }

      const [total, docs] = await Promise.all([
        Classification.countDocuments(filter),
        Classification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
      ])

      const totalPages = Math.max(1, Math.ceil(total / limit))

      const response: PaginatedHistoryResponse = {
        items: docs.map((d) => d.toHistoryItem()),
        page,
        limit,
        total,
        totalPages,
      }

      res.status(200).json(response)
    } catch (err: unknown) {
      console.error("[History] Query error:", err)
      res.status(500).json({
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "Failed to retrieve classification history.",
      })
    }
  })

  // ── 4. Get Single History Detail ────────────────────────────
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          status: "error",
          errorCode: "INVALID_ID",
          message: "Invalid classification ID format.",
        })
        return
      }

      const userObjectId = new mongoose.Types.ObjectId(req.user!.id)
      const doc = await Classification.findOne({
        _id: new mongoose.Types.ObjectId(id),
        userId: userObjectId,
      })

      if (!doc) {
        res.status(404).json({
          status: "error",
          errorCode: "NOT_FOUND",
          message: "Classification not found.",
        })
        return
      }

      res.status(200).json({
        status: "success",
        item: doc.toHistoryItem(),
      })
    } catch (err: unknown) {
      console.error("[History] Find error:", err)
      res.status(500).json({
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "Failed to retrieve classification record.",
      })
    }
  })

  // ── 5. Delete Single History Record ─────────────────────────
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          status: "error",
          errorCode: "INVALID_ID",
          message: "Invalid classification ID format.",
        })
        return
      }

      const userObjectId = new mongoose.Types.ObjectId(req.user!.id)
      const result = await Classification.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: userObjectId,
      })

      if (!result) {
        res.status(404).json({
          status: "error",
          errorCode: "NOT_FOUND",
          message: "Classification not found.",
        })
        return
      }

      res.status(200).json({
        status: "ok",
        message: "Classification deleted successfully.",
      })
    } catch (err: unknown) {
      console.error("[History] Delete error:", err)
      res.status(500).json({
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "Failed to delete classification record.",
      })
    }
  })

  return router
}

