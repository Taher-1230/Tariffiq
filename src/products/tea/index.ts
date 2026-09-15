// ============================================================
// Tea Product Registration — Phase 5C-A
//
// Thin adapter that wires existing Tea implementations into the
// generic ProductRegistration shape and registers Tea in the
// ProductRegistry.
//
// CRITICAL:
//   This file does NOT duplicate any Tea logic.
//   Every method delegates to the existing Tea implementation.
//
// Existing authoritative implementations:
//   - classifyTea()              → src/engine/teaClassifier.ts
//   - validateTeaInput()         → src/engine/validateTeaInput.ts
//   - getRequiredTeaInformation()→ src/engine/getRequiredTeaInformation.ts
//   - extractTeaDescription()    → src/ai/extractor.ts
//   - validateTeaExtraction()    → shared/validateTeaExtraction.ts
//   - toTeaClassificationInput() → src/ai/toTeaClassificationInput.ts
// ============================================================

import type {
  ProductClassificationEngine,
  ProductExtractionAdapter,
  ProductRegistration,
} from "@/products/types"
import { productRegistry } from "@/products/registry"
import { teaProductDefinition } from "@/products/tea/definition"

// ── Existing Tea imports (delegate-only, no duplication) ──────

import { classifyTea } from "@/engine/teaClassifier"
import { validateTeaInput } from "@/engine/validateTeaInput"
import { getRequiredTeaInformation } from "@/engine/getRequiredTeaInformation"
import { extractTeaDescription } from "@/ai/extractor"
import { validateTeaExtraction } from "../../ai/validateTeaExtraction"
import { toTeaClassificationInput } from "@/ai/toTeaClassificationInput"

import type { TeaClassificationInput } from "@/types/classification"
import type { TeaExtraction } from "../../../shared/ai-contract.js"

// ── Tea Classification Engine ────────────────────────────────

const teaEngine: ProductClassificationEngine = {
  classify(input: unknown) {
    return classifyTea(input as TeaClassificationInput)
  },

  validate(input: unknown) {
    return validateTeaInput(input as TeaClassificationInput)
  },

  getRequiredInformation(input: unknown) {
    return getRequiredTeaInformation(input as Partial<TeaClassificationInput>)
  },
}

// ── Tea Extraction Adapter ───────────────────────────────────

const teaExtractor: ProductExtractionAdapter = {
  async extract(text: string, options?: unknown) {
    return extractTeaDescription(text, options as Parameters<typeof extractTeaDescription>[1])
  },

  validate(payload: unknown) {
    return validateTeaExtraction(payload)
  },

  toClassificationInput(extraction: unknown) {
    return toTeaClassificationInput(extraction as TeaExtraction)
  },
}

// ── Tea Registration ─────────────────────────────────────────

export const teaRegistration: ProductRegistration = {
  definition: teaProductDefinition,
  engine: teaEngine,
  extractor: teaExtractor,
}

// Register Tea in the global product registry
productRegistry.register(teaRegistration)
