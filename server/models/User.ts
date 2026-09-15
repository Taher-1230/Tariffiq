// ============================================================
// User Mongoose Model — Phase 5B
//
// Represents authenticated user accounts.
// Enforces password hashing via bcryptjs and unique email index.
// ============================================================

import mongoose, { Schema, type Document, type Model } from "mongoose"
import bcrypt from "bcryptjs"
import type { SafeUser } from "../../shared/auth-contract.js"

export interface IUser extends Document {
  email: string
  passwordHash: string
  name?: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidate: string): Promise<boolean>
  toSafeUser(): SafeUser
}

interface IUserModel extends Model<IUser> {
  hashPassword(password: string): Promise<string>
}

const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required."],
    },
    name: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id)
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        return ret
      },
    },
  }
)

/**
 * Hashes a plaintext password using bcrypt with standard work factor 10.
 */
UserSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * Compares candidate password against the stored bcrypt hash.
 */
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash)
}

/**
 * Transforms Mongoose User document to safe client-facing DTO.
 */
UserSchema.methods.toSafeUser = function (): SafeUser {
  return {
    id: String(this._id),
    email: this.email,
    name: this.name,
    createdAt: this.createdAt ? this.createdAt.toISOString() : undefined,
  }
}

export const User = (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>("User", UserSchema)
