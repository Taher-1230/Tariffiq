# Coffee AI Confirmation & Review UI (Phase 5C-B.3)

## Architectural Overview

TariffIQ implements a strict **Human-in-the-Loop** confirmation architecture for Chapter 0901 (Coffee) AI extraction.

### Core Pipeline

```
User description
      ↓
Gemini 2.5 Flash (via secure backend POST /api/ai/extract)
      ↓
CoffeeExtraction (Physical facts only: roasting, decaf, presentation, form, grade)
      ↓
AI Review Screen (CoffeeAIExtractionReview.tsx)
      ↓
User edits / confirms attributes
      ↓
CoffeeClassificationInput (Adapter conversion & validation)
      ↓
classifyCoffee() (Deterministic rules engine)
      ↓
Classification Result (HS code, explanation, reasoning trace)
```

> **CRITICAL INVARIANT:**
> **User confirmation occurs before deterministic classification.**
> Gemini extracts facts. The USER confirms or edits those facts. The deterministic Coffee classifier determines the HS code.
> The UI **MUST NEVER** treat the Gemini response as a classification result or display an AI-generated HS code.

---

## 1. Coffee AI Review Component

The review screen (`src/components/classifier/CoffeeAIExtractionReview.tsx`) renders the extracted attributes in a structured, accessible interface:

1. **Product Type**:
   - `Coffee`
   - `Coffee husks & skins`
   - `Coffee substitutes containing coffee`
2. **Roasting State**:
   - `Roasted`
   - `Not roasted (green / raw)`
   - `Not determined` (with clear notification that roasting is unknown)
3. **Decaffeination**:
   - `Decaffeinated`
   - `Not decaffeinated (contains caffeine)`
   - `Not determined` (with explicit notification)
4. **Presentation**:
   - `Bulk`
   - `Other packaging (retail / non-bulk)`
5. **Coffee Form / Variety**:
   - `Arabica plantation`
   - `Arabica Cherry`
   - `Rob cherry`
   - `Other`
6. **Grade**:
   - `Grade A`, `Grade B`, `Grade C`, `Grade AB`, `Grade PB`, `Grade BBB`, `Grade B/B/B`, `Other`

---

## 2. Evidence Tracking

For each extracted attribute, the review UI renders the exact verbatim span detected in the user's description:

```
Roasting State
Roasted
Detected from: "roasted Arabica plantation coffee"
```

If an attribute was not explicitly mentioned in the description, the UI displays:
`Not explicitly found in description`

Evidence is validated against source text boundary offsets and never fabricated.

---

## 3. Inline Structured Editing

Users can modify any attribute by clicking the **Edit** control.

- **Strictly Typed Controls**: Editing uses structured button grids and select options matching the Coffee tariff contract enums. Free-form text injection is prevented.
- **Zero Gemini Re-Calls**: Editing an attribute directly updates local component state (`coffeeEditedAttributes`). **Gemini is never invoked on user edits.**

---

## 4. Ambiguity Resolution

When Gemini detects ambiguity (for example, `"Arabica Cherry or Rob cherry"` or `"Grade A or B"`), the review screen renders an **Information Needs Clarification** banner with interactive candidate chips:

- The user clicks the appropriate candidate chip to resolve the ambiguity.
- The attribute is updated immediately in local state.
- Confirmation is blocked until all required ambiguities are resolved.

---

## 5. Required Information Engine

The review UI integrates dynamically with `getRequiredCoffeeInformation()`:

- **Field Badges**:
  - `Provided` (emerald): Field is satisfied.
  - `Required` (amber): Field is required for the current classification branch.
  - `Optional` (outline): Field is optional for this branch.
  - `Not required for this product` (secondary): Field does not apply (e.g. grade for roasted coffee).
- **Branch-Specific Rules**:
  - *Roasted Coffee*: Requires roasting, decaffeination, and presentation (bulk vs other).
  - *Unroasted Decaffeinated*: Requires roasting and decaffeination (`0901 12 00`).
  - *Unroasted Non-Decaffeinated*: Requires variety/form and grade.
  - *Husks & Skins / Substitutes*: Requires product type only.

---

## 6. Confirmation & Deterministic Classification

When the user clicks **Confirm & Classify**:

1. Validates the edited extraction state.
2. Converts to `CoffeeClassificationInput` via `toCoffeeClassificationInput()`.
3. Evaluates `getRequiredCoffeeInformation(input)`.
4. If required fields are missing:
   - Remains on the review screen.
   - Displays a prominent alert detailing missing fields.
   - Does **NOT** call `classifyCoffee()`.
5. Once valid and complete:
   - Calls `classifyCoffee(input)`.
   - Renders `ClassificationResult` with the deterministic 8-digit HS code (e.g. `0901 21 10`), hierarchy path, rule ID (e.g. `COF-018`), and structured reasoning trace.
   - Classification method is explicitly badged as **"Deterministic tariff rules"**.

---

## 7. Error Handling & Recovery

- **Non-Coffee Input**: Rejections (`productCategory === "unknown"`) display a friendly notice (*"This product doesn't appear to be Coffee"*) with options to re-describe or enter details manually.
- **API Failures & Rate Limits**: Network errors, timeouts, or quota limits display recovery guidance and a direct **Enter Details Manually** fallback.
- **No-Match Lines**: Lines requiring tariff source clarification (such as `0901 11 90` or `0901 90 90`) display a definitive explanation without guessing.

---

## 8. Dual-Product & Tea Compatibility

- Both **Tea (Heading 0902)** and **Coffee (Heading 0901)** operate independently within `ClassificationWizard`.
- Switching between Tea and Coffee updates input placeholders, extraction endpoints, review schemas, and deterministic rule engines without state collision.
- Existing Tea manual and AI workflows remain 100% backward-compatible.
