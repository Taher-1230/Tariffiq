// ============================================================
// Mongoose Database Connection Manager — Phase 5B
//
// Manages the MongoDB connection lifecycle.
// Reuses active connections in development/testing.
// ============================================================

import mongoose from "mongoose"

interface ConnectionState {
  isConnected: boolean
  uri?: string
}

const state: ConnectionState = {
  isConnected: false,
}

/**
 * Connects to MongoDB with safe retry and status reporting.
 *
 * @param uri - MongoDB connection string (e.g. Atlas or local/memory URI)
 */
export async function connectToDatabase(uri: string): Promise<typeof mongoose> {
  if (state.isConnected && mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (!uri || uri.trim().length === 0) {
    throw new Error("MONGODB_URI is required to connect to database.")
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    })

    state.isConnected = true
    state.uri = uri

    console.log("[MongoDB] Connected to database successfully.")
    return conn
  } catch (err: unknown) {
    state.isConnected = false
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[MongoDB] Connection error: ${msg}`)
    throw new Error("MongoDB connection is unavailable.")
  }
}

/**
 * Gracefully closes the MongoDB connection.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    state.isConnected = false
    console.log("[MongoDB] Disconnected successfully.")
  }
}

/**
 * Returns whether the database connection is currently active.
 */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1
}
