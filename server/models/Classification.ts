// ============================================================
// Classification History Mongoose Model — Phase 5B → Phase 5D
//
// Represents stored user classification records.
// Compound indexed by (userId, createdAt DESC), (userId, productCategory, createdAt),
// and (userId, inputSource, createdAt) for fast paginated queries.
// ============================================================

import mongoose, { Schema, type Document, type Model } from "mongoose"
import type {
  ClassificationHistoryItem,
  StoredClassificationResult,
  ProductExtractionData,
} from "../../shared/history-contract.js"

export interface IClassification extends Document {
  userId: mongoose.Types.ObjectId
  productCategory: string
  inputSource: "ai" | "manual"
  productDescription?: string
  extraction?: ProductExtractionData | null
  confirmedInput: Record<string, unknown>
  classification: StoredClassificationResult
  createdAt: Date
  updatedAt: Date
  toHistoryItem(): ClassificationHistoryItem
}

const ClassificationSchema = new Schema<IClassification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required."],
      index: true,
    },
    productCategory: {
      type: String,
      enum: ["tea", "coffee", "spices"],
      default: "tea",
    },
    inputSource: {
      type: String,
      enum: ["ai", "manual"],
      required: [true, "inputSource is required."],
    },
    productDescription: {
      type: String,
      trim: true,
    },
    extraction: {
      type: Schema.Types.Mixed,
      default: null,
    },
    confirmedInput: {
      type: Schema.Types.Mixed,
      required: [true, "confirmedInput is required."],
    },
    classification: {
      type: Schema.Types.Mixed,
      required: [true, "classification result is required."],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id)
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Compound indexes for user history ordered newest-first and filtered by category/source
ClassificationSchema.index({ userId: 1, createdAt: -1 })
ClassificationSchema.index({ userId: 1, productCategory: 1, createdAt: -1 })
ClassificationSchema.index({ userId: 1, inputSource: 1, createdAt: -1 })
ClassificationSchema.index({ userId: 1, "classification.hsCode": 1, createdAt: -1 })

/**
 * Transforms Mongoose document to strongly typed ClassificationHistoryItem.
 */
ClassificationSchema.methods.toHistoryItem = function (): ClassificationHistoryItem {
  return {
    id: String(this._id),
    userId: String(this.userId),
    productCategory: this.productCategory ?? "tea",
    inputSource: this.inputSource,
    productDescription: this.productDescription,
    extraction: this.extraction,
    confirmedInput: this.confirmedInput,
    classification: this.classification,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : undefined,
  }
}

export const Classification =
  (mongoose.models.Classification as Model<IClassification>) ||
  mongoose.model<IClassification>("Classification", ClassificationSchema)
