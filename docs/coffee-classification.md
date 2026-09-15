# Coffee Deterministic Classification Engine — Phase 5C-B.1

## Overview

TariffIQ Phase 5C-B.1 implements the authoritative deterministic classification engine for **Coffee (`0901`)** under the generalized multi-product architecture.

Coffee classification is 100% deterministic code and data, driven by:
- [`src/data/coffee_hs_codes.json`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/data/coffee_hs_codes.json)
- [`src/data/coffee_rules.json`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/data/coffee_rules.json)

---

## 1. Supported Coffee Classifications (22 Deterministic National Lines)

| HS Code | Description | Branch / Conditions | Rule ID |
|---|---|---|---|
| `0901 11 11` | Arabica plantation, A Grade. | Unroasted, non-decaf, Arabica plantation, A Grade | `COF-001` |
| `0901 11 12` | Arabica plantation, B Grade. | Unroasted, non-decaf, Arabica plantation, B Grade | `COF-002` |
| `0901 11 13` | Arabica plantation, C Grade. | Unroasted, non-decaf, Arabica plantation, C Grade | `COF-003` |
| `0901 11 19` | Arabica plantation, other. | Unroasted, non-decaf, Arabica plantation, other grade | `COF-004` |
| `0901 11 21` | Arabica Cherry, AB Grade. | Unroasted, non-decaf, Arabica Cherry, AB Grade | `COF-005` |
| `0901 11 22` | Arabica Cherry, PB Grade. | Unroasted, non-decaf, Arabica Cherry, PB Grade | `COF-006` |
| `0901 11 23` | Arabica Cherry, C Grade. | Unroasted, non-decaf, Arabica Cherry, C Grade | `COF-007` |
| `0901 11 24` | Arabica Cherry, B/B/B Grade. | Unroasted, non-decaf, Arabica Cherry, B/B/B Grade | `COF-008` |
| `0901 11 29` | Arabica Cherry, other. | Unroasted, non-decaf, Arabica Cherry, other grade | `COF-009` |
| `0901 11 41` | Rob cherry, AB Grade. | Unroasted, non-decaf, Rob cherry, AB Grade | `COF-010` |
| `0901 11 42` | Rob cherry, PB Grade. | Unroasted, non-decaf, Rob cherry, PB Grade | `COF-011` |
| `0901 11 43` | Rob cherry, C Grade. | Unroasted, non-decaf, Rob cherry, C Grade | `COF-012` |
| `0901 11 44` | Rob cherry, B/B/B Grade. | Unroasted, non-decaf, Rob cherry, B/B/B Grade | `COF-013` |
| `0901 11 45` | Rob cherry, bulk. | Unroasted, non-decaf, Rob cherry, bulk presentation | `COF-014` |
| `0901 11 49` | Rob cherry, other. | Unroasted, non-decaf, Rob cherry, other grade | `COF-015` |
| `0901 12 00` | Coffee, not roasted, decaffeinated. | Unroasted, decaffeinated | `COF-017` |
| `0901 21 10` | Coffee, roasted, non-decaffeinated, in bulk packing. | Roasted, non-decaf, bulk packing | `COF-018` |
| `0901 21 90` | Coffee, roasted, non-decaffeinated, other. | Roasted, non-decaf, other packaging | `COF-019` |
| `0901 22 10` | Coffee, roasted, decaffeinated, in bulk packing. | Roasted, decaf, bulk packing | `COF-020` |
| `0901 22 90` | Coffee, roasted, decaffeinated, other. | Roasted, decaf, other packaging | `COF-021` |
| `0901 90 10` | Coffee husks and skins. | Product type `husks_and_skins` | `COF-022` |
| `0901 90 20` | Coffee substitutes containing coffee. | Product type `substitutes_containing_coffee` | `COF-023` |

---

## 2. Input Attributes & Schema

The Coffee engine uses a domain-specific `CoffeeClassificationInput` interface:

```typescript
export interface CoffeeClassificationInput {
  productCategory: "coffee"
  productType?: "coffee" | "husks_and_skins" | "substitutes_containing_coffee"
  roasted?: boolean | null
  decaffeinated?: boolean | null
  presentation?: "bulk" | "other" | null
  form?: "arabica_plantation" | "arabica_cherry" | "rob_cherry" | "other" | null
  grade?: "A" | "B" | "C" | "AB" | "PB" | "BBB" | "other" | string | null
}
```

*Note*: Unlike Tea, Coffee tariff lines do not have numerical weight cutoffs (e.g. 25g, 1kg, 3kg, 20kg). Presentation is purely categorical (`bulk` vs `other`).

---

## 3. Product Type & Decision Branching

```
                             [Product Input]
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [Non-Coffee Type]                       [Standard Coffee]
        - husks_and_skins → 0901 90 10                │
        - substitutes     → 0901 90 20        [Roasting Status]
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
                 [Unroasted]                                                     [Roasted]
                      │                                                              │
            [Decaffeination Status]                                       [Decaffeination Status]
             /                   \                                         /                   \
      [Decaf]                 [Non-Decaf]                           [Non-Decaf]               [Decaf]
         │                         │                                     │                       │
     0901 12 00             [Variety & Grade]                      [Presentation]          [Presentation]
                            - Arabica plantation:                   - bulk  → 0901 21 10    - bulk  → 0901 22 10
                              A, B, C, other                        - other → 0901 21 90    - other → 0901 22 90
                            - Arabica Cherry:
                              AB, PB, C, BBB, other
                            - Rob cherry:
                              AB, PB, C, BBB, bulk, other
```

---

## 4. Handling of Ambiguous "Other" Lines

Lines **`0901 11 90`** (Other unroasted non-decaf) and **`0901 90 90`** (Other coffee products) were identified in Phase 5C-B.0 as requiring source clarification regarding their exact legal scope.

**Deterministic Policy**:
- They are **NOT** treated as universal catch-all fallbacks.
- If an input cannot be mapped to an explicit variety/line or specifies an unspecified form, the engine returns `status: "no_match"` with an explanatory notice: *"Classification for this coffee product category requires source clarification on exact scope."*

---

## 5. Explanation & Reasoning Trace Architecture

Classification results include:
- `structuredExplanation`: A typed, machine-readable breakdown (`productType`, `roastedState`, `decaffeinatedState`, `presentation`, `form`, `grade`, `matchedRuleId`, `finalCode`).
- `reasoning`: A step-by-step trace of decision steps evaluated during classification.
- `classificationPath`: Dynamic parent hierarchy lookup from `09` → `0901` → Subheading → National Tariff Line.

---

## 6. Test Coverage

- **36 deterministic engine tests** in [`src/tests/coffeeClassifier.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/tests/coffeeClassifier.test.ts).
- **14 data integrity tests** in [`src/tests/coffeeData.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/tests/coffeeData.test.ts).
- **Architecture & Cross-product isolation tests** in [`src/tests/productArchitecture.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/src/tests/productArchitecture.test.ts).
- **Server integration tests** in [`server/tests/productApi.test.ts`](file:///c:/Users/HP/Downloads/tariffiq-phase3/tariffiq/server/tests/productApi.test.ts).
- **Total Test Suite**: 400 unit/integration tests passing.
