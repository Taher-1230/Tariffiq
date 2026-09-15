# TariffIQ Multi-Product Architecture — Phase 5C-A

## Overview

TariffIQ Phase 5C-A generalizes the classification and AI extraction architecture from a single hardcoded product (Tea) to a multi-product platform structure. The platform provides a product-agnostic classification and extraction workflow, delegating domain-specific rules, schemas, and AI prompts to registered product adapters.

At Phase 5C-A, **Tea (`0902`)** is the sole active, registered product. No coffee or spice rules, tariff lines, or classifications have been added.

---

## Architectural Principles

1. **Process Generalization, Not Schema Blurring**:
   - The platform standardizes the classification *lifecycle* (input validation → deterministic classification → explainability → history persistence).
   - Product-specific schemas remain strongly typed and concrete within their domain modules.
2. **Deterministic Engine Authority**:
   - Tariff rules and HS code determinations are 100% deterministic code and data.
   - LLMs / AI are strictly restricted to attribute extraction and never determine tariff codes.
3. **In-Process Registry Pattern**:
   - Products are registered into an in-process singleton (`ProductRegistry`).
   - No dynamic runtime code evaluation or microservice hops.
4. **Strict Isolation & Zero Duplication**:
   - Product adapters delegate directly to authoritative product implementations.
   - Existing tariff datasets (`tea_rules.json`, `tea_hs_codes.json`) remain untouched and isolated.
5. **Client Boundary Security**:
   - Clients supply product identifiers (e.g. `productCategory: "tea"`).
   - The server validates and dispatches via the internal registry. Clients cannot choose rule engines or bypass deterministic verification.

---

## Architecture Diagram

```
                        ┌───────────────────────────────┐
                        │        Client Request         │
                        │  (Natural Language / Wizard)  │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │   Generic Entry Points        │
                        │   - classifyProduct()         │
                        │   - extractProductDescription │
                        │   - getRequiredInformation()  │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │       ProductRegistry         │
                        │  (Map: "tea" -> Registration) │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │    Tea Product Adapter        │
                        │    (src/products/tea)         │
                        └───┬───────────────────────┬───┘
                            │                       │
                            ▼                       ▼
            ┌────────────────────────┐    ┌──────────────────────┐
            │ Deterministic Engine   │    │ AI Extraction        │
            │ - classifyTea()        │    │ - extractTea...()    │
            │ - validateTeaInput()   │    │ - validateTea...()   │
            │ - tea_rules.json       │    │ - toTea...Input()    │
            └────────────────────────┘    └──────────────────────┘
```

---

## Core Abstractions

### 1. `ProductCategory` & `ProductDefinition`

```typescript
// src/products/types.ts
export type ProductCategory = "tea" // Extensible union

export interface ProductDefinition {
  id: ProductCategory
  name: string
  displayName: string
  description: string
  hsChapter: string
  supportsAI: boolean
  supportsManualClassification: boolean
}
```

### 2. `ProductClassificationEngine`

Defines the required deterministic engine operations for a product category:

```typescript
export interface ProductClassificationEngine {
  classify(input: unknown): unknown
  validate(input: unknown): unknown | null
  getRequiredInformation(input: unknown): unknown
}
```

### 3. `ProductExtractionAdapter`

Defines the AI extraction boundary for a product category:

```typescript
export interface ProductExtractionAdapter {
  extract(text: string, options?: unknown): Promise<unknown>
  validate(payload: unknown): { valid: boolean; errors: string[]; forbiddenFieldsFound: string[] }
  toClassificationInput(extraction: unknown): unknown
}
```

### 4. `ProductRegistry`

An in-memory singleton mapping `ProductCategory` to `ProductRegistration`:

```typescript
// src/products/registry.ts
export const productRegistry = new ProductRegistryImpl()
```

Methods:
- `get(productCategory: string): ProductRegistration | undefined`
- `getOrThrow(productCategory: string): ProductRegistration`
- `isSupported(productCategory: string): boolean`
- `getSupportedProducts(): ProductDefinition[]`
- `getSupportedCategories(): ProductCategory[]`

---

## Server & Persistence Integration

### Re-verification Service

The backend verification service (`server/services/classificationService.ts`) utilizes `verifyAndClassifyProduct(productCategory, confirmedInput)`:
- Validates the product category against `productRegistry`.
- Validates input format via the product engine's `validate()`.
- Runs deterministic classification via the product engine's `classify()`.
- Prevents client-side spoofing of HS codes or tariff results.

### History Storage (`Classification` Model)

MongoDB documents store `productCategory`:
- Default: `"tea"`.
- Backward Compatible: Existing records without `productCategory` default automatically to `"tea"`.
- Indexed and validated by Mongoose schema.

---

## How to Add Future Product Categories (e.g., Coffee)

When adding a new product category in future phases:

1. **Define Data & Rules**:
   - Create `src/data/coffee_rules.json` and `src/data/coffee_hs_codes.json`.
2. **Implement Deterministic Classifier**:
   - Create `src/engine/coffeeClassifier.ts`, `validateCoffeeInput.ts`, `getRequiredCoffeeInformation.ts`.
3. **Implement Extraction Adapter**:
   - Create `src/ai/extractCoffee.ts`, `validateCoffeeExtraction.ts`, `toCoffeeClassificationInput.ts`.
4. **Register in ProductRegistry**:
   - Extend `ProductCategory = "tea" | "coffee"`.
   - Create `src/products/coffee/index.ts` and `src/products/coffee/definition.ts`.
   - Register the `coffeeRegistration` bundle into `productRegistry`.
5. **No core architectural changes needed**:
   - All generic entry points (`classifyProduct`, `extractProductDescription`, `verifyAndClassifyProduct`) will route to Coffee automatically based on category ID.
