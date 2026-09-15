// ============================================================
// AI Extraction Validation — Phase 4A → Phase 5A
//
// Re-exports validateTeaExtraction() from the shared module.
// Both the Express backend and the Vite frontend import the
// same validation logic from shared/validateTeaExtraction.ts.
// ============================================================

export { validateTeaExtraction } from "../../shared/validateTeaExtraction.js"
