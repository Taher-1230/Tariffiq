# Spices AI Extraction Contract & Architecture Specification

> **Phase**: 6.3A (Spices AI Extraction Contract & Gemini Integration)  
> **Status**: Production-Ready Server-Authoritative Architecture  
> **Product Category**: Chapter 09 Spices (Headings 0904–0910)

---

## 1. Architectural Overview & Critical Invariant

In TariffIQ, **Gemini is an information extraction system, NOT a classification system**.

```
Natural Language Description
      │
      ▼
Google Gemini (Server-side via @google/genai)
      │
      ▼
Raw Extraction JSON
      │
      ▼
Runtime Validation (validateSpicesExtraction)
      │
      ▼
SpicesExtraction (Pure Physical/Botanical Facts)
      │
      ▼
Boundary Adapter (toSpicesClassificationInput)
      │
      ▼
SpicesClassificationInput
      │
      ▼
Deterministic Classifier (classifySpices)
      │
      ▼
Authoritative HS Code & Tariff Hierarchy
```

### Invariants:
1. Gemini **never** produces an HS code, tariff heading, subheading, tariff line, or rule ID.
2. Gemini output containing any forbidden classification key is **instantly rejected**.
3. All HS code determinations occur solely inside [`classifySpices()`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/classifier.ts).
4. The server recalculates and re-validates classifications independently; client-supplied HS codes are ignored.

---

## 2. Spices Extraction Schema (`SpicesExtraction`)

Defined in [`shared/spices-ai-contract.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/shared/spices-ai-contract.ts):

| Field | Type | Description |
|---|---|---|
| `productCategory` | `"spices" \| "unknown"` | Product family check |
| `spiceType` | `ExtractedSpiceType` | Primary commodity (pepper, vanilla, cinnamon, cloves, nutmeg, mace, cardamom, coriander, cumin, anise, badian, caraway_or_fennel, juniper_berries, ginger, saffron, turmeric, mixture, other_spice, unknown) |
| `botanicalType` | `ExtractedBotanicalType` | Botanical genus/species (piper, capsicum, pimenta, cinnamomum_zeylanicum, cassia, unknown) |
| `crushedOrGround` | `boolean \| "unknown"` | Crushed, ground, or powdered state |
| `subType` | `ExtractedSpiceSubType` | Specific variety/grade (e.g. `black_pepper_garbled`, `alleppey_green`, `bleached`) |
| `form` | `ExtractedSpiceForm` | Physical part (bark, tree_flowers, stem, in_shell, shelled, powder, seed, stigma, stamen, etc.) |
| `processingState` | `ExtractedSpiceProcessingState` | Fresh, dried, extracted, not_extracted, unknown |
| `quality` | `ExtractedSpiceQuality` | Seed quality standard |
| `sizeCategory` | `ExtractedSpiceSizeCategory` | Cardamom size category (large vs small) |
| `isCubeb` | `boolean \| "unknown"` | Factual detection of Cubeb pepper (*Piper cubeba*) |
| `essentialCharacter` | `boolean \| "unknown"` | Factual retention of spice character (vs mixed condiments/seasonings) |
| `mixtureHeadings` | `string[]` (optional) | List of heading identifiers present in mixture |

---

## 3. Evidence & Ambiguity Tracking

### Evidence
Extracted attributes are linked directly to source substrings via `SpicesExtractionEvidence`:
```typescript
interface SpicesExtractionEvidence {
  field: keyof SpicesExtraction
  sourceText: string
  startIndex?: number
  endIndex?: number
}
```
Evidence is validated to ensure character offsets and substrings match the actual input text.

### Ambiguities & Uncertainty
When a user input contains multiple candidate interpretations or explicit uncertainty, the system records structured ambiguities rather than guessing:
```typescript
interface SpicesExtractionAmbiguity {
  field: keyof SpicesExtraction
  candidates: string[]
  reason: string
}
```

---

## 4. Unknown Handling & No-Guessing Rule

1. **Unstated attributes**: If a description omits processing, form, or grade, the field is assigned `"unknown"`.
2. **Generic text**: "Some spice" produces `spiceType: "unknown"`, resulting in `status: "needs_clarification"` or `insufficient_information`.
3. **Ambiguity preservation**: "Probably black pepper or cubeb" preserves candidates in `ambiguities` and sets `isCubeb: "unknown"`.

---

## 5. Mixture Extraction (Chapter 09 Legal Notes)

- Single spice -> Identified directly.
- Mixture of spices within same heading -> `spiceType: "mixture"`, `subType: "mixed"`.
- Mixture across different headings (0904–0910) -> `spiceType: "mixture"`, `subType: "cross_heading_mixture"`.
- Loss of essential character (mixed seasonings/prepared sauces) -> `essentialCharacter: false` (statutory exclusion to heading 2103 handled deterministically).

---

## 6. Statutory Exclusion Handling

- **Cubeb Pepper (*Piper cubeba*)**: Extractor identifies `isCubeb: true`. The extractor does **not** classify it into heading 1211; deterministic validation handles the Chapter Note 4 statutory exclusion.
- **Prepared Seasonings/Condiments**: Extractor identifies `essentialCharacter: false`. Deterministic validation handles the Chapter Note 3 exclusion to heading 2103.

---

## 7. Strict Runtime Validation & Forbidden Key Defense

[`shared/validateSpicesExtraction.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/shared/validateSpicesExtraction.ts) enforces:
- **Forbidden Classification Keys**: `hsCode`, `hs_code`, `suggestedHsCode`, `tariffCode`, `tariff_code`, `tariffLine`, `classification`, `classificationCode`, `code`, `heading`, `subheading`, `chapter`, `ruleId`, `rule_id`, `matchedRule`, `matchedRuleId`, `classificationPath`, `finalCode`.
- **Allowed Keys Only**: Any key not in the allowed factual attributes schema causes validation failure.
- **Enum Bounds**: Strict whitelist checking on all union values.

---

## 8. Boundary Adapter (`toSpicesClassificationInput`)

[`src/products/spices/ai/toSpicesClassificationInput.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/ai/toSpicesClassificationInput.ts) is the sole bridge between extraction facts and deterministic classification:
- Converts `"unknown"` to `null`/`undefined`.
- Preserves raw factual values without modification.
- Never calls Gemini, never calculates tariff codes, never overrides deterministic rules.

---

## 9. Server-Side Security & Secret Management

- `GEMINI_API_KEY` is accessed only within Node.js (`server/services/geminiService.ts`).
- No AI packages (`@google/genai`) or API keys exist in client bundles (`dist/`).
- Rate limiting is enforced uniformly across all product extractions via the shared AI rate limiter.
