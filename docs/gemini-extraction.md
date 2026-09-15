# Google Gemini AI Extraction Architecture — TariffIQ

## Overview
TariffIQ utilizes Google Gemini as an upstream information extractor. Its sole purpose is to convert unstructured natural-language product descriptions into strongly typed, structured product facts conforming to the Phase 4A extraction contract.

The deterministic rules engine remains the sole source of truth for HS code selection.

```text
Natural Language Product Description
              ↓
  Gemini Extraction Provider (@google/genai)
  - System instruction & JSON schema
  - Temperature = 0.0
              ↓
      Extraction Validation (validateTeaExtraction)
  - Strict prohibition of HS codes / classification fields
  - Attribute & evidence validation
              ↓
    User Confirmation (Phase 4C)
              ↓
  Boundary Adapter (toTeaClassificationInput)
              ↓
  Deterministic Rules Engine (classifyTea)
              ↓
            HS Code
```

---

## SDK & Provider Architecture

### Official SDK
- Package: `@google/genai`
- Import: `import { GoogleGenAI } from "@google/genai"`

### Supported Models
- **Default Model**: `gemini-2.5-flash` (recommended for fast, low-latency, structured JSON extraction)
- Configurable via `GEMINI_MODEL` or `VITE_GEMINI_MODEL`.

### Structured Output Configuration
Gemini's structured outputs API guarantees that responses conform to the requested schema:
- `responseMimeType: "application/json"`
- `responseSchema`: [`GEMINI_TEA_EXTRACTION_SCHEMA`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/ai/prompts/teaExtractionPrompt.ts)
- `temperature: 0.0` (deterministic factual extraction)

---

## Environment Configuration

Set the following variables in your environment or local `.env`:

```bash
# Standard Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Override the model
GEMINI_MODEL=gemini-2.5-flash
```

For local Vite client-side testing, you may optionally prefix with `VITE_`:
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Strict Safety Invariants

1. **The AI Never Selects HS Codes**:
   - Gemini is strictly forbidden from outputting or determining HS codes.
   - The extraction schema contains zero classification fields.
   - If an AI response contains `hsCode`, `tariffCode`, or `classification`, it is rejected with an `INVALID_AI_RESPONSE` error.
2. **Zero Tariff Rules Sent to Gemini**:
   - Gemini only receives the user description, system instructions, and JSON extraction schema.
   - Tariff rules ([`tea_rules.json`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/data/tea_rules.json)) and HS codes ([`tea_hs_codes.json`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/data/tea_hs_codes.json)) remain strictly within the deterministic engine.
3. **Preserving Uncertainty**:
   - Information not stated in the text is returned as `"unknown"` (or `null`).
   - Explicit user doubt is returned as `"not_sure"`.
   - Approximate measurements are marked with `weightPrecision: "approximate"`.
   - Gemini never guesses missing values.

---

## Production Security Notice

> [!WARNING]
> **Client-Side Secret Exposure**:
> In client-side Vite builds, variables prefixed with `VITE_` are embedded directly into browser bundles.
> 
> - **Local Development**: Direct browser-side calls are acceptable for local prototyping and evaluation.
> - **Production Deployment**: For production, AI extraction requests must be proxied through a secure backend API (e.g., Node.js server, Next.js API route, Cloud Functions, AWS Lambda) where `GEMINI_API_KEY` is kept secret from end users.
