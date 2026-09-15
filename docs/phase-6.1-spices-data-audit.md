# Phase 6.1 — Spices Data Audit Report

> **Date**: 2026-08-28
> **Auditor**: TariffIQ Data Normalization Engine (Phase 6.1)
> **Status**: **COMPLETE — DATA PREPARATION & INTEGRITY VERIFIED**

---

## 1. Source
- **Document Inspected**: `HS PROJECT OVERVIEW.pdf` (692,605 bytes)
- **Sections Utilized**:
  - Pages 4–5: Chapter 09 Legal Notes, Mixture Rules, Exclusions, and Supplementary Notes
  - Pages 8–12: Complete Chapter 09 Tariff Schedule for Headings 0904–0910
- **Integrity Rule**: Descriptions and structures were extracted verbatim from source text with zero fabrication of tariff lines, attributes, or thresholds.

---

## 2. Coverage (Headings 0904–0910)
Full coverage for all 7 spice headings under Chapter 09:
- **0904**: Pepper; capsicum/pimenta fruits
- **0905**: Vanilla
- **0906**: Cinnamon and cinnamon-tree flowers
- **0907**: Cloves
- **0908**: Nutmeg, mace and cardamoms
- **0909**: Seeds of anise, badian, fennel, coriander, cumin or caraway; juniper berries
- **0910**: Ginger, saffron, turmeric, thyme, bay leaves, curry and other spices

---

## 3. Extraction Summary

| Level | Count | Notes |
|-------|:-----:|-------|
| **Headings (4-digit)** | 7 | 0904, 0905, 0906, 0907, 0908, 0909, 0910 |
| **Subheadings (6-digit)** | 28 | 0904 11, 0904 12, 0904 21, 0904 22, 0905 10, 0905 20, 0906 11, 0906 19, 0906 20, 0907 10, 0907 20, 0908 11, 0908 12, 0908 21, 0908 22, 0908 31, 0908 32, 0909 21, 0909 22, 0909 31, 0909 32, 0909 61, 0909 62, 0910 11, 0910 12, 0910 20, 0910 30, 0910 91, 0910 99 |
| **National Tariff Lines (8-digit)** | 94 | Exact breakdown: 0904 (17), 0905 (2), 0906 (6), 0907 (5), 0908 (15), 0909 (20), 0910 (29) |
| **Rules Generated** | 94 | SPC-001 through SPC-094 with strict parentage, explicit conditions, and source references |
| **Chapter Legal Notes** | 7 | Mixture rules (Note 1a/1b), Essential character (Note 2), Exclusions (Note 3/4), Supplementary notes |

---

## 4. Validation & Structural Verification

The test suite `src/tests/spicesData.test.ts` (36 automated tests) validates:
1. **Code Format**: All 94 national lines adhere strictly to `^09\d{6}$`.
2. **Uniqueness**: Zero duplicate HS codes across headings/subheadings/national lines.
3. **Hierarchy Integrity**: Every national line has a valid parent subheading; every subheading has a valid parent heading; all headings have `parent_code: null`.
4. **Rule Alignment**: Every rule output code maps to an existing 8-digit tariff line in `spices_hs_codes.json`.
5. **No Cross-Contamination**: Zero spices codes overlap with Tea (0902) or Coffee (0901).
6. **Description Preservation**: All 94 tariff descriptions match source text verbatim.

---

## 5. Ambiguities & Fallback Scope ("Other" Lines)

23 tariff lines contain "Other" or residual designations. **None are treated as universal catch-alls.** Every residual line in `spices_rules.json` is annotated with `REQUIRES SOURCE CLARIFICATION` and scoped strictly to its parent subheading branch:

- `0904 11 90` — Scoped strictly to unlisted whole *Piper* pepper varieties.
- `0904 22 19` — Scoped strictly to crushed *Capsicum* forms other than chilly powder/seeds.
- `0904 22 29` — Scoped strictly to crushed *Pimenta* forms other than powder.
- `0906 11 90` — Scoped strictly to *C. zeylanicum* presentations other than bark or tree flowers.
- `0906 19 90` — Scoped strictly to whole cinnamon types other than *C. zeylanicum* and cassia.
- `0907 10 90` — Scoped strictly to whole clove forms other than extracted, unextracted whole, or stem.
- `0908 31 90` — Scoped strictly to whole cardamoms not matching the 5 specific lines.
- `0908 32 90` — Scoped strictly to crushed cardamoms not matching powder, seeds, or husk.
- `0909 21 90`, `0909 31 19`, `0909 31 29`, `0909 61 19`, `0909 61 29`, `0909 61 39`, `0909 61 49` — Scoped strictly to seed items not meeting "seed quality".
- `0910 11 90`, `0910 12 90`, `0910 20 90`, `0910 30 90` — Scoped strictly to unlisted forms of ginger, saffron, and turmeric.
- `0910 99 19`, `0910 99 29`, `0910 99 39`, `0910 99 90` — Scoped strictly to unlisted seeds, powders, husks, and residual other spices.

---

## 6. Existing Tea & Coffee Regression Protection

SHA-256 integrity hashes confirm zero regressions or modifications to existing product datasets:

| File | SHA-256 Hash | Status |
|------|-------------|:------:|
| `src/data/tea_hs_codes.json` | `d550559657676e77eba28df5f0c4b49baca8d695cfafc8a2d4084070cc704743` | ✅ UNCHANGED |
| `src/data/tea_rules.json` | `ffa2c0a3e1769af155faf6504528f2633c6d4153c1dc2f8b067a93c952216828` | ✅ UNCHANGED |
| `src/data/coffee_hs_codes.json` | `92f086faeb56a541af5dd6851cb68c9ce129f4da7908ead0b457fe11a59fcd5e` | ✅ UNCHANGED |
| `src/data/coffee_rules.json` | `c06f3a7f6af2dfdfca6bdac91408610dcc8363a57770af16e0a60d012ec21014` | ✅ UNCHANGED |

---

## 7. Test, Lint & Build Results

| Suite / Command | Result | Details |
|-----------------|:------:|---------|
| `npx vitest run src/tests/spicesData.test.ts` | ✅ **PASS** | 36 passed |
| `npm test` (All frontend unit tests) | ✅ **PASS** | 580 passed, 2 skipped across 26 test files |
| `npm run test:server` (Server API/Security tests) | ✅ **PASS** | 137 passed across 7 test files |
| `npm run lint` | ✅ **PASS** | 0 errors, 5 pre-existing warnings |
| `npm run build` (Vite Client Production Build) | ✅ **PASS** | Built cleanly |
| `npm run server:build` (TypeScript Server Build) | ✅ **PASS** | TypeScript compilation clean |

---

## 8. Files Summary

### Files Created
1. `src/data/spices_hs_codes.json` — 94 national lines, 28 subheadings, 7 headings, chapter notes
2. `src/data/spices_rules.json` — 94 normalized rule specifications (SPC-001 to SPC-094)
3. `spices_hs_codes.json` — Root-level dataset copy for architecture consistency
4. `spices_rules.json` — Root-level rules copy for architecture consistency
5. `src/tests/spicesData.test.ts` — 36 automated structural and regression tests
6. `docs/spices-data.md` — Complete technical documentation and attribute breakdown
7. `docs/phase-6.1-spices-data-audit.md` — This audit summary report

### Files Modified
- None. (Zero existing code or data files were modified).

---

## 9. Conclusion & Recommendation for Phase 6.2

Phase 6.1 objective is **100% complete**. All authoritative tariff lines for Spices (0904–0910) are captured, normalized, tested, and documented.

**Recommendation for Phase 6.2**:
Proceed to implement the deterministic Spices classification engine (`src/products/spices/classifier.ts`, `validateSpicesInput.ts`, `getRequiredSpicesInformation.ts`), register `spices` in the `ProductRegistry`, and connect the wizard and review workflow.
