# Spices AI Review UI Specification

## 1. Overview & Architectural Invariants

The Spices AI Review UI (`SpicesAIExtractionReview.tsx`) is a specialized, accessible, user-confirmation interface for Chapter 09 Spices (Headings 0904–0910). It enforces TariffIQ's core architectural invariant:

```
Natural Language Description
            ↓
  Gemini AI Extraction (Server-side)
            ↓
    SpicesExtraction (Validated facts only)
            ↓
 User Review & Structured Editing (SpicesAIExtractionReview)
            ↓
  toSpicesClassificationInput() (Boundary Adapter)
            ↓
      classifySpices() (Deterministic Engine)
            ↓
     Final 8-Digit HS Code + Legal Trace
```

### Invariants:
1. **Gemini NEVER Classifies**: Gemini extracts factual physical attributes (e.g. `crushedOrGround`, `spiceType`, `botanicalType`, `subType`, `form`, `isCubeb`). It never emits HS codes, headings, rule IDs, or tariff lines.
2. **Deterministic Rules Sole Authority**: The final tariff line is computed solely by `classifySpices()` against the authoritative 94 normalized tariff rules.
3. **Client-Side Confirmation**: Users actively inspect evidence, resolve ambiguities, and confirm factual attributes before deterministic execution.
4. **Server Authority Persistence**: Classification records are re-verified server-side via `verifyAndClassifyProduct()` prior to MongoDB persistence.

---

## 2. Review Fields & Presentation

| Field | Extraction Key | UI Display Values | Status Logic |
|---|---|---|---|
| **Spice Commodity** | `spiceType` | Pepper, Vanilla, Cinnamon, Cloves, Nutmeg, Mace, Cardamoms, Coriander, Cumin, Anise, Badian, Fennel, Juniper Berries, Ginger, Saffron, Turmeric, Mixture, Other | Required for all Spices paths |
| **Botanical Genus** | `botanicalType` | Piper, Capsicum, Pimenta, Cinnamomum zeylanicum, Cassia, Not specified | Required for 0904 / 0906 lines |
| **Crushed / Ground** | `crushedOrGround` | Crushed, ground, or powdered / Whole (neither crushed nor ground) / Not determined | Required for all Heading paths |
| **Subtype / Grade** | `subType` | Long pepper, Garbled, Ungarbled, Dehydrated, Alleppey green, Coorg green, Bleached, Cross-heading mixture, Celery, Fenugreek, Dill, Ajwain, etc. | Conditionally required by heading |
| **Physical Form** | `form` | Bark, Tree flowers, Stem, Not stem, In shell, Shelled, Chilly powder, Seeds, Stigma, Stamen, Powder | Conditionally required by heading |
| **Processing State** | `processingState` | Fresh, Dried, Extracted, Not extracted | Conditionally required (Cloves, Ginger) |
| **Agricultural Quality**| `quality` | Seed quality (sowing) / Commercial standard | Optional / default |
| **Size Category** | `sizeCategory` | Large (Amomum) / Small (Elettaria) | Required for Cardamoms (0908) |

---

## 3. Evidence Display & Unknown Handling

- **Evidence Attribution**: Every attribute card inspects `extractionResult.evidence`. If found, it displays `Detected: "<sourceText>"`. If not present, it displays `"Not explicitly found in description"`.
- **Unknown Handling**: Extracted attributes with value `"unknown"` are explicitly labeled as `"Not determined"` or `"Not specified"`. They are never given silent or heuristic default values.
- **Dynamic Requirement Status**: The component dynamically computes field requirement status using `getRequiredSpicesInformation()` on the currently edited facts, displaying badges:
  - `Provided` (green badge with check icon)
  - `Required` (red/outline badge with warning icon)
  - `Optional` (secondary badge)
  - `Not required for this product` (muted dashed badge)

---

## 4. Ambiguity Resolution Workflow

When Gemini returns `status: "needs_clarification"`, the UI displays an alert banner explaining the ambiguity and presenting discrete candidate buttons (e.g., `[ Black pepper (Piper nigrum) ] [ Cubeb pepper (Piper cubeba) ]`).
- Clicking a candidate immediately applies the selected value to local extraction state.
- The ambiguity is marked resolved.
- **Zero API Re-invocations**: The resolution updates local state without triggering another network call to Gemini.

---

## 5. Statutory Exclusions & Warnings

1. **Cubeb Pepper Exclusion (Chapter 09 Note 4)**:
   - When `isCubeb === true`, the UI displays an informational notice informing the user that Cubeb pepper (*Piper cubeba*) is excluded from Chapter 09 and classified under Heading 1211.
2. **Essential Character Warning (Chapter 09 Note 3)**:
   - When `essentialCharacter === false`, the UI displays a warning banner that the product appears to be a prepared seasoning or mixed condiment excluded from Chapter 09 (Heading 2103).

---

## 6. Structured Inline Editing Controls

Clicking "Edit" on any attribute card opens a structured modal with discrete radio buttons corresponding strictly to schema-supported enum values:
- No free-text inputs for classification attributes.
- Booleans provide `Yes`, `No`, `Not determined`.
- Discrete options prevent client-side injection of invalid or malformed data.

---

## 7. Confirm & Classify Workflow

1. User clicks **"Confirm & Classify"** (`#confirm-classify-spices`).
2. Facts are converted via `toSpicesClassificationInput()`.
3. Requirement completeness is validated via `getRequiredSpicesInformation()`.
4. Deterministic engine `classifySpices()` is executed.
5. Deterministic classification result is rendered in `ClassificationResult.tsx` with full decision trace.
6. Record is persisted via `POST /api/history` with server-authoritative re-verification.
