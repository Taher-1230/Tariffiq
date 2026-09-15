# Phase 6.2 — Spices Deterministic Classifier Report

> **Date**: 2026-08-28
> **Phase**: 6.2 (Spices Deterministic Classification Engine)
> **Status**: **COMPLETE — DETERMINISTIC ENGINE & PRODUCT REGISTRY READY**

---

## 1. Scope

Phase 6.2 implemented the **authoritative, deterministic classification engine** for Chapter 09 Spices (Headings 0904–0910).
- **Core Principle**: Zero AI, zero ML, zero probabilistic models, zero heuristic guessing.
- **Product Coverage**: Pepper (0904), Vanilla (0905), Cinnamon (0906), Cloves (0907), Nutmeg/Mace/Cardamom (0908), Anise/Badian/Fennel/Coriander/Cumin/Caraway/Juniper (0909), and Ginger/Saffron/Turmeric/Mixtures/Other Spices (0910).
- **Registration**: Wires Spices into the platform's `ProductRegistry` singleton under category identifier `"spices"`.

---

## 2. Files Created and Modified

### Created Files
1. [`src/products/spices/types.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/types.ts) — Strongly-typed domain models, discrete union enums, and discriminated result interfaces.
2. [`src/products/spices/validateSpicesInput.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/validateSpicesInput.ts) — Schema validator with statutory exclusion checks (Cubeb Note 4, essential character Note 3).
3. [`src/products/spices/normalizeSpicesInput.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/normalizeSpicesInput.ts) — Pure normalizer creating immutable internal records.
4. [`src/products/spices/explainSpicesClassification.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/explainSpicesClassification.ts) — Pure deterministic builder for structured explanations and reasoning steps.
5. [`src/products/spices/requirements.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/requirements.ts) — Dynamic field requirement analyzer across all 7 headings.
6. [`src/products/spices/classifier.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/classifier.ts) — Data-driven deterministic rule matcher and hierarchy builder.
7. [`src/products/spices/definition.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/definition.ts) — Static metadata for ProductDefinition (`supportsAI: false`, `supportsManualClassification: true`).
8. [`src/products/spices/index.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/spices/index.ts) — Product registration bundle auto-registering in `productRegistry`.
9. [`src/tests/spicesClassifier.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/tests/spicesClassifier.test.ts) — 46 comprehensive unit tests verifying all 94 tariff rules, determinism, negative cases, and cross-product isolation.
10. [`docs/spices-classifier.md`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/docs/spices-classifier.md) — Architectural and specification documentation.
11. [`docs/phase-6.2-spices-classifier.md`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/docs/phase-6.2-spices-classifier.md) — This phase report.

### Modified Files
1. [`src/products/types.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/types.ts) — Updated `ProductCategory` union to `"tea" | "coffee" | "spices"`.
2. [`src/products/index.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/products/index.ts) — Added Spices barrel exports and registration side-effect.
3. [`server/services/classificationService.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/server/services/classificationService.ts) — Added Spices registration side-effect import for backend verification.
4. [`src/tests/productArchitecture.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/tests/productArchitecture.test.ts) — Updated registry assertions to reflect Spices as supported and tested unsupported category rejection using `'electronics'`.
5. [`src/tests/coffeeClassifier.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/tests/coffeeClassifier.test.ts) — Updated test 36 to test unsupported category rejection using `'electronics'`.
6. [`server/tests/productApi.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/server/tests/productApi.test.ts) — Updated unsupported category assertions to use `'electronics'`.
7. [`server/tests/classificationHistory.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/server/tests/classificationHistory.test.ts) — Updated unsupported category assertions to use `'electronics'`.

---

## 3. Handling of 94 Tariff Rules

All 94 rules from `spices_rules.json` (SPC-001 through SPC-094) are evaluated data-driven based on priority:
- **Specific Rules (71 rules)**: Match when all required factual attributes (botanical type, form, variety, processing state, quality grade, size) are satisfied.
- **Scoped Fallback Rules (23 rules)**: Scoped strictly to their parent branches. When matched, they require explicit source clarification and return `status: "no_match"` with a clear abstention message rather than guessing.

---

## 4. Deterministic Guarantee

- **Invariant**: Identical input facts always produce identical classification results.
- **Traceability**: Reasoning traces and structured explanations are constructed deterministically from matched rule definitions and normalized attributes without LLM generation.
- **Multi-Invocation Test**: Test verifies 10 repeated runs produce bitwise-equivalent result objects.

---

## 5. Abstention Behavior (Never Guess)

The classifier abstains (`insufficient_information` or `no_match`) when:
1. `spiceType` is missing or unknown.
2. `crushedOrGround` is missing when required by the branch.
3. Botanical variety, size, form, or quality grade is missing for narrow lines.
4. An ambiguous "Other" fallback is triggered without explicit domain boundaries.
5. Cubeb pepper (*Piper cubeba*) is identified (excluded to heading 1211).
6. Essential character of spices is lost (excluded to heading 2103).

---

## 6. Security & Server Authority

- The client cannot force or tamper with classification outcomes.
- Any client-submitted `hsCode`, `matchedRuleId`, `classificationPath`, or `reasoning` is ignored.
- The server re-runs the deterministic classifier on confirmed physical attributes before saving or returning results.

---

## 7. Data Integrity Hashes (SHA-256)

| File | SHA-256 Checksum | Status |
|------|------------------|:------:|
| `src/data/tea_hs_codes.json` | `d550559657676e77eba28df5f0c4b49baca8d695cfafc8a2d4084070cc704743` | ✅ UNCHANGED |
| `src/data/tea_rules.json` | `ffa2c0a3e1769af155faf6504528f2633c6d4153c1dc2f8b067a93c952216828` | ✅ UNCHANGED |
| `src/data/coffee_hs_codes.json` | `92f086faeb56a541af5dd6851cb68c9ce129f4da7908ead0b457fe11a59fcd5e` | ✅ UNCHANGED |
| `src/data/coffee_rules.json` | `c06f3a7f6af2dfdfca6bdac91408610dcc8363a57770af16e0a60d012ec21014` | ✅ UNCHANGED |
| `src/data/spices_hs_codes.json` | `226da7ee10396b967787604dfd5afa603dc3bc4d27e30f0c06f01925164c491a` | ✅ UNCHANGED |
| `src/data/spices_rules.json` | `be43b6fa22fdbddc265c6ade3964ee3d209588bf8c8d4cdec9bd46a10d05be9f` | ✅ UNCHANGED |

---

## 8. Test Execution & Build Verification

| Test Suite / Command | Result | Metrics |
|----------------------|:------:|---------|
| `npx vitest run src/tests/spicesClassifier.test.ts` | ✅ **PASS** | 46 passed |
| `npx vitest run src/tests/spicesData.test.ts` | ✅ **PASS** | 36 passed |
| `npm test` (Full frontend Vitest suite) | ✅ **PASS** | 627 passed, 2 skipped (27 test files) |
| `npm run test:server` (Server API/Security tests) | ✅ **PASS** | 137 passed (7 test files) |
| `npm run lint` | ✅ **PASS** | 0 errors, 5 pre-existing compiler warnings |
| `npm run build` (Vite Client Production Build) | ✅ **PASS** | Bundled cleanly (527 kB bundle) |
| `npm run server:build` (TypeScript Server Build) | ✅ **PASS** | Clean TypeScript compilation |

---

## 9. Known Limitations

- **23 Scoped Fallback Lines**: Boundaries for residual lines (e.g. `0904 11 90`, `0906 19 90`, `0910 99 90`) require further statutory/trade notes before being enabled as automatic fallbacks.
- **AI Extraction & UI**: Spices AI extraction and dedicated UI wizard are explicitly excluded from this phase and reserved for Phase 6.3+.
