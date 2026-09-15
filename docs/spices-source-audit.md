# Phase 6.0 — Spices Source Audit

> **Date**: 2026-08-28
> **Auditor**: Automated Phase 6.0 audit
> **Scope**: Headings 0904–0910 (Spices), Chapter 09
> **Outcome**: **STOP — NO AUTHORITATIVE SOURCE DATA FOUND**

---

## 1. Sources Searched

| Location | Description | Spice Data Found |
|----------|-------------|:----------------:|
| `src/data/` | Primary tariff data directory (4 files: tea/coffee HS codes + rules) | ❌ None |
| `docs/` | Project documentation (11 markdown files) | ❌ None |
| `shared/` | Shared contracts and validators (6 files) | ❌ None |
| `server/` | Backend code and tests | ❌ None |
| `src/products/` | Product adapters (tea, coffee) | ❌ None |
| `src/tests/` | Frontend test suites (18 files) | ❌ None |
| `src/engine/` | Classification engine | ❌ None |
| `src/components/` | UI components | ❌ None (placeholder only) |
| `src/pages/` | Application pages | ❌ None (label only) |
| Root project directory | Root-level JSON/XLSX files | ❌ None |
| `C:\Users\HP\Downloads\` | User downloads folder | ❌ None |
| Binary files (xlsx, pdf, csv) in project | All binary data files | ❌ None (only tea_hs_codes.xlsx, tea_rules.xlsx exist) |

### Files Explicitly Searched For (Not Found)

- `spices_hs_codes.json` — **NOT FOUND**
- `spices_hs_codes.xlsx` — **NOT FOUND**
- `spice_hs_codes.json` — **NOT FOUND**
- `spice_rules.json` — **NOT FOUND**
- `spices_rules.json` — **NOT FOUND**
- `spices_rules.xlsx` — **NOT FOUND**
- Any PDF containing Heading 0904–0910 tariff schedules — **NOT FOUND**

### Keyword Search Results

The following keywords were searched across the entire project (excluding `node_modules/` and `dist/`):

| Keyword | Hits | Nature of Hits |
|---------|:----:|----------------|
| `0904` | 2 | UI label/placeholder only |
| `0905` | 0 | — |
| `0906` | 0 | — |
| `0907` | 0 | — |
| `0908` | 0 | — |
| `0909` | 0 | — |
| `0910` | 2 | UI label/placeholder only (same lines as 0904) |
| `spice` / `spices` | 43 | UI placeholder, negative test guards, Chapter 09 title |
| `pepper` | 3 | UI placeholder text, test fixture string |
| `vanilla` | 1 | UI placeholder text |
| `cinnamon` | 1 | UI placeholder text |
| `turmeric` | 0 | — |
| `saffron` | 0 | — |
| `cardamom` | 0 | — |
| `cloves` | 0 | — |
| `nutmeg` | 0 | — |
| `ginger` | 0 | — |
| `cumin` | 0 | — |
| `coriander` | 0 | — |
| `fennel` | 0 | — |
| `caraway` | 0 | — |
| `capsicum` | 0 | — |
| `chilli` | 0 | — |
| `mace` | 0 | — |

> **Conclusion**: Every hit is either a UI placeholder label (e.g., `"Spices — Planned"`), the Chapter 09 title string (`"Coffee, tea, maté and spices"`), or a **negative test guard** asserting that `"spices"` is unsupported and correctly rejected.

---

## 2. Authoritative Sources Found

**NONE.**

No file in the project or user's file system contains authoritative tariff data for any spice heading (0904–0910).

The existing authoritative source referenced by Tea and Coffee data is:
- **Tea**: `HS PROJECT OVERVIEW(1).pdf` (referenced in `tea_hs_codes.json` and `tea_rules.json`)
- **Coffee**: Referenced as "authoritative Coffee tariff schedule" (in `coffee_hs_codes.json` and `coffee_rules.json`)

A file named `HS PROJECT OVERVIEW.pdf` (692,605 bytes) exists at `C:\Users\HP\Downloads\HS PROJECT OVERVIEW.pdf`. This PDF was used as the Tea source. It is **not confirmed** whether this PDF contains Headings 0904–0910. Even if it does, no extraction of spice data from this PDF has been performed or is present in the project.

---

## 3. Headings 0904–0910 Status

| Heading | Description (International HS) | Source Found | 8-digit Lines | Rules Available | Status |
|---------|-------------------------------|:------------:|:-------------:|:---------------:|--------|
| 0904 | Pepper; capsicum; pimenta | ❌ No | 0 | ❌ No | **MISSING-SOURCE** |
| 0905 | Vanilla | ❌ No | 0 | ❌ No | **MISSING-SOURCE** |
| 0906 | Cinnamon and cinnamon-tree flowers | ❌ No | 0 | ❌ No | **MISSING-SOURCE** |
| 0907 | Cloves | ❌ No | 0 | ❌ No | **MISSING-SOURCE** |
| 0908 | Nutmeg, mace and cardamoms | ❌ No | 0 | ❌ No | **MISSING-SOURCE** |
| 0909 | Seeds of anise, badian, fennel, coriander, cumin or caraway; juniper berries | ❌ No | 0 | ❌ No | **MISSING-SOURCE** |
| 0910 | Ginger, saffron, turmeric, thyme, bay leaves, curry and other spices | ❌ No | 0 | ❌ No | **MISSING-SOURCE** |

> **Note**: The heading descriptions above are from general international HS knowledge, included for identification purposes only. They are NOT authoritative India-specific tariff descriptions and MUST NOT be used to create classification rules.

---

## 4. Available Tariff Hierarchy

**NONE.**

No tariff hierarchy exists for any spice heading. The required structure is:

```
Chapter 09
  └── Heading 0904
        └── Subheading (6-digit)
              └── National tariff line (8-digit)
```

This hierarchy must come from the authoritative India-specific tariff schedule.

---

## 5. Classification Attributes Supported by Source

**NONE.**

No source exists to identify classification-relevant attributes. Potential attributes that would need to be confirmed by the authoritative source include:

- Product type / botanical identity
- Whole vs crushed vs ground
- Dried vs fresh
- Variety / cultivar
- Grade
- Processing state
- Presentation / packaging
- Origin distinctions

> **IMPORTANT**: These are hypothetical attribute categories only. The actual attributes MUST come from the source's tariff line distinctions. Do NOT use this list to create classification rules.

---

## 6. "Other" / Fallback Lines

**NONE.**

No "Other", "Others", "Residual", "Remaining", or "Not elsewhere specified" tariff lines exist for spices in the project.

These lines, when eventually provided by the authoritative source, will each require explicit scope determination before being implemented as classification rules.

---

## 7. Weight / Packaging Conditions

**NONE.**

No weight thresholds, package size distinctions, bulk/retail boundaries, or container size conditions have been identified for spice tariff lines.

> **IMPORTANT**: Tea uses weight thresholds (e.g., ≤25g, 25g–3kg, >3kg). Coffee uses bulk/other presentation logic. Neither pattern should be assumed to apply to Spices. Weight/packaging conditions for spices must come directly from the authoritative source.

---

## 8. India-Specific Tariff Information

**NONE.**

No India-specific 8-digit tariff codes, descriptions, grades, varieties, or tariff notes exist in the project for Headings 0904–0910.

The project's existing products demonstrate the expected India-specific data structure:
- **Tea**: 17 national 8-digit tariff lines under Heading 0902
- **Coffee**: 30+ national 8-digit tariff lines under Heading 0901

An equivalent India-specific schedule is required for each spice heading before classification can be implemented.

---

## 9. Files Created

| File | Purpose |
|------|---------|
| `docs/spices-source-audit.md` | This audit report |

**No tariff data files were created.** This is correct — no authoritative source exists to create them from.

---

## 10. Files Modified

**NONE.**

No existing files were modified during this audit.

---

## 11. Existing Tea/Coffee Integrity

### Data File Integrity (SHA-256)

| File | SHA-256 Hash | Status |
|------|-------------|--------|
| `src/data/tea_hs_codes.json` | `D550559657676E77EBA28DF5F0C4B49BACA8D695CFAFC8A2D4084070CC704743` | ✅ Untouched |
| `src/data/tea_rules.json` | `FFA2C0A3E1769AF155FAF6504528F2633C6D4153C1DC2F8B067A93C952216828` | ✅ Untouched |
| `src/data/coffee_hs_codes.json` | `92F086FAEB56A541AF5DD6851CB68C9CE129F4DA7908EAD0B457FE11A59FCD5E` | ✅ Untouched |
| `src/data/coffee_rules.json` | `C06F3A7F6AF2DFDFCA6BDAC91408610DCC8363A57770AF16E0A60D012EC21014` | ✅ Untouched |

### Classifier / Adapter Integrity

- Tea classifier: **Untouched**
- Coffee classifier: **Untouched**
- Tea AI extraction: **Untouched**
- Coffee AI extraction: **Untouched**
- Tea rules: **Untouched**
- Coffee rules: **Untouched**

Root-level copies (`tea_hs_codes.json`, `tea_rules.json`, `coffee_hs_codes.json`, `coffee_rules.json`, `tea_hs_codes.xlsx`, `tea_rules.xlsx`) are byte-identical to their `src/data/` counterparts (confirmed via `fc.exe /B`).

---

## 12. Tests and Build Results

### Baseline (Pre-Audit = Post-Audit, No Changes Made)

| Command | Result | Details |
|---------|--------|---------|
| `npm test` (vitest) | ✅ **544 passed**, 2 skipped | 25 test files (24 passed, 1 skipped) |
| `npm run test:server` (vitest server) | ✅ **137 passed** | 7 test files, all passed |
| `npm run build` | ✅ **Success** | Built in 6.49s |
| `npm run server:build` | ✅ **Success** | TypeScript compilation clean |
| `npm run lint` | ✅ **0 errors**, 5 warnings | Warnings are pre-existing (React compiler guidance) |

### Spices Negative Test Guards (Already Exist — Not Created by This Audit)

The following tests already assert that `"spices"` is correctly **rejected** as unsupported:

| Test File | Test Description |
|-----------|-----------------|
| `src/tests/productArchitecture.test.ts` | #6: Unsupported product 'spices' is not in registry |
| `src/tests/productArchitecture.test.ts` | #7: getOrThrow throws for unsupported product 'spices' |
| `src/tests/productArchitecture.test.ts` | #16: classifyProduct throws for unsupported product 'spices' |
| `src/tests/coffeeClassifier.test.ts` | #36: Unsupported product 'spices' is rejected |
| `server/tests/productApi.test.ts` | #2b: Rejects unsupported productCategory: 'spices' |
| `server/tests/productApi.test.ts` | #8: Rejects unsupported product 'spices' |
| `server/tests/productApi.test.ts` | #15: Rejects unsupported productCategory 'spices' |
| `server/tests/security.test.ts` | #3: Unsupported product category 'spices' cleanly rejected |
| `server/tests/classificationHistory.test.ts` | #15: Security: Unsupported category 'spices' is rejected |

These tests confirm the platform's current correct behavior: spices are planned but not yet supported.

---

## 13. Missing Information

### ❌ ALL spice tariff data is missing.

To proceed with Phase 6.1 (Spices classification implementation), the following authoritative source data is required:

### Required Source Files

One of the following formats is acceptable:

| Option | File | Description |
|--------|------|-------------|
| A | `spices_hs_codes.xlsx` | Excel spreadsheet containing the complete India-specific 8-digit tariff schedule for Headings 0904–0910 |
| B | `spices_hs_codes.json` | Pre-normalized JSON in the same structure as `tea_hs_codes.json` or `coffee_hs_codes.json` |
| C | Authoritative PDF | A PDF containing the complete India Customs Tariff Schedule for Chapter 09, Headings 0904–0910, with 8-digit national tariff lines |

### Required Data Per Heading (0904–0910)

For each heading, the source must provide:

1. **Complete 8-digit national tariff line codes** (India-specific)
2. **Exact tariff descriptions** at each level (heading → subheading → 8-digit line)
3. **Parent-child hierarchy** (which 8-digit code belongs to which 6-digit subheading)
4. **Classification-distinguishing attributes** (e.g., whether "whole vs ground" or "dried vs fresh" creates distinct tariff lines)
5. **Weight/packaging thresholds** (if any tariff lines depend on weight or packaging)
6. **Scope of "Other" lines** (what each residual/fallback tariff line actually covers)
7. **India-specific grades, varieties, or notes** (if they affect tariff classification)

### Missing by Heading

| Heading | What Is Missing |
|---------|----------------|
| **0904** | All 8-digit codes, descriptions, hierarchy, rules, attributes |
| **0905** | All 8-digit codes, descriptions, hierarchy, rules, attributes |
| **0906** | All 8-digit codes, descriptions, hierarchy, rules, attributes |
| **0907** | All 8-digit codes, descriptions, hierarchy, rules, attributes |
| **0908** | All 8-digit codes, descriptions, hierarchy, rules, attributes |
| **0909** | All 8-digit codes, descriptions, hierarchy, rules, attributes |
| **0910** | All 8-digit codes, descriptions, hierarchy, rules, attributes |

---

## 14. Recommendation for Phase 6.1

### STOP. Do not proceed to classification implementation.

**Status**: 🛑 **BLOCKED — Awaiting authoritative source data.**

### Next Steps

1. **Provide** an authoritative India-specific tariff schedule for Headings 0904–0910 in any of the formats listed in Section 13.
2. **Verify** that the source contains 8-digit national tariff lines (not merely international 6-digit HS codes).
3. **Confirm** whether the PDF at `C:\Users\HP\Downloads\HS PROJECT OVERVIEW.pdf` contains spice headings (0904–0910). If it does, it should be uploaded/referenced for extraction.
4. Once the source is provided, Phase 6.1 will:
   - Extract and normalize the tariff data into `src/data/spices_hs_codes.json`
   - Create deterministic classification rules in `src/data/spices_rules.json`
   - Create data integrity tests in `src/tests/spicesData.test.ts`
   - Implement the spices classifier, AI extraction, and product registration

### What Was NOT Done (By Design)

- ❌ No `src/data/spices_hs_codes.json` created (no source)
- ❌ No `src/data/spices_rules.json` created (no source)
- ❌ No `src/tests/spicesData.test.ts` created (no data to test)
- ❌ No `src/products/spices/` directory created
- ❌ No spices classifier implemented
- ❌ No spices AI extraction implemented
- ❌ No spices UI activated
- ❌ No ProductRegistry registration for spices
- ❌ No tariff data fabricated or inferred

---

> **Phase 6.0 Complete. Audit status: PASS (no data available, no data fabricated).**
