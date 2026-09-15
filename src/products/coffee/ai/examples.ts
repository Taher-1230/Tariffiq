// ============================================================
// Coffee AI Extraction Examples — Phase 5C-B.2
//
// Representative input-output pairs illustrating expected extraction
// behavior across roasting, decaffeination, varieties, grades,
// presentation, uncertainty, and non-coffee descriptions.
// ============================================================

import type { CoffeeExtractionResult } from "./types"

export interface CoffeeExtractionExample {
  id: string
  description: string
  inputText: string
  expectedResult: Partial<CoffeeExtractionResult>
}

export const COFFEE_EXTRACTION_EXAMPLES: CoffeeExtractionExample[] = [
  {
    id: "ex-1-roasted-arabica-plantation-a-bulk",
    description: "Roasted Arabica plantation coffee, Grade A, non-decaf, bulk",
    inputText:
      "Roasted Arabica plantation coffee, Grade A, non-decaffeinated, packed in bulk.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "coffee",
        roasted: true,
        decaffeinated: false,
        presentation: "bulk",
        form: "arabica_plantation",
        grade: "A",
      },
      missingFields: [],
    },
  },
  {
    id: "ex-2-green-arabica-cherry-ab",
    description: "Green Arabica Cherry coffee, AB Grade",
    inputText: "Green Arabica Cherry coffee, AB Grade.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "coffee",
        roasted: false,
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "arabica_cherry",
        grade: "AB",
      },
      missingFields: ["decaffeinated", "presentation"],
    },
  },
  {
    id: "ex-3-rob-cherry-pb-green",
    description: "Rob cherry coffee, PB grade, green beans",
    inputText: "Rob cherry coffee, PB grade, green beans.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "coffee",
        roasted: false,
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "rob_cherry",
        grade: "PB",
      },
      missingFields: ["decaffeinated", "presentation"],
    },
  },
  {
    id: "ex-4-unroasted-decaf",
    description: "Decaffeinated green coffee",
    inputText: "Decaffeinated green coffee.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "coffee",
        roasted: false,
        decaffeinated: true,
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      },
      missingFields: ["presentation", "form", "grade"],
    },
  },
  {
    id: "ex-5-roasted-decaf-bulk",
    description: "Roasted decaf coffee in bulk packing",
    inputText: "Roasted decaf coffee in bulk packing.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "coffee",
        roasted: true,
        decaffeinated: true,
        presentation: "bulk",
        form: "unknown",
        grade: "unknown",
      },
      missingFields: ["form", "grade"],
    },
  },
  {
    id: "ex-6-husks-and-skins",
    description: "Coffee husks and skins",
    inputText: "Coffee husks and skins.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "husks_and_skins",
        roasted: "unknown",
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      },
      missingFields: ["roasted", "decaffeinated", "presentation", "form", "grade"],
    },
  },
  {
    id: "ex-7-substitutes",
    description: "Coffee substitute containing coffee",
    inputText: "Coffee substitute containing coffee.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "substitutes_containing_coffee",
        roasted: "unknown",
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      },
      missingFields: ["roasted", "decaffeinated", "presentation", "form", "grade"],
    },
  },
  {
    id: "ex-8-variety-ambiguity",
    description: "Coffee, probably Arabica Cherry or Rob cherry",
    inputText: "Coffee, probably Arabica Cherry or Rob cherry.",
    expectedResult: {
      status: "needs_clarification",
      attributes: {
        productCategory: "coffee",
        productType: "coffee",
        roasted: "unknown",
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      },
      ambiguities: [
        {
          field: "form",
          candidates: ["arabica_cherry", "rob_cherry"],
          reason: "The description mentions multiple possible varieties.",
        },
      ],
    },
  },
  {
    id: "ex-9-roasted-coffee-sparse",
    description: "Roasted coffee",
    inputText: "Roasted coffee.",
    expectedResult: {
      status: "extracted",
      attributes: {
        productCategory: "coffee",
        productType: "coffee",
        roasted: true,
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      },
      missingFields: ["decaffeinated", "presentation", "form", "grade"],
    },
  },
  {
    id: "ex-10-non-coffee-cocoa",
    description: "500g cocoa beans (non-coffee product)",
    inputText: "500g cocoa beans.",
    expectedResult: {
      status: "unsupported",
      attributes: {
        productCategory: "unknown",
        productType: "unknown",
        roasted: "unknown",
        decaffeinated: "unknown",
        presentation: "unknown",
        form: "unknown",
        grade: "unknown",
      },
    },
  },
]
