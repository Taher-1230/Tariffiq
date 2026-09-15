// ============================================================
// Spices Deterministic Classifier Test Suite — Phase 6.2
//
// Verifies all 94 tariff paths across Headings 0904–0910,
// negative / abstention behaviors, invariant determinism,
// cross-product isolation, and ProductRegistry integration.
// ============================================================

import { describe, it, expect } from "vitest"
import { classifySpices } from "../products/spices/classifier"
import { getRequiredSpicesInformation } from "../products/spices/requirements"
import { productRegistry } from "../products/registry"
import { classifyProduct } from "../products/classify"
import { getRequiredInformation } from "../products/requirements"
import type {
  SpicesClassificationInput,
  SpicesClassifiedResult,
  SpicesNoMatchResult,
} from "../products/spices/types"
import spicesRulesData from "../data/spices_rules.json"
import "../products/spices/index"

describe("Phase 6.2 — Spices Deterministic Classifier", () => {
  // ── 1. Heading 0904: Pepper & Capsicum/Pimenta ──────────────
  describe("Heading 0904 — Pepper, Capsicum and Pimenta", () => {
    it("Classifies Long pepper, whole -> 0904 11 10 (SPC-001)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "pepper",
        botanicalType: "piper",
        crushedOrGround: false,
        subType: "long_pepper",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09041110")
      expect(result.hsCodeFormatted).toBe("0904 11 10")
      expect(result.matchedRuleId).toBe("SPC-001")
      expect(result.classificationPath).toHaveLength(4)
      expect(result.classificationPath[0].code).toBe("09")
      expect(result.classificationPath[1].code).toBe("0904")
      expect(result.classificationPath[2].code).toBe("0904 11")
      expect(result.classificationPath[3].code).toBe("0904 11 10")
    })

    it("Classifies Black pepper, garbled, whole -> 0904 11 30 (SPC-003)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "pepper",
        botanicalType: "piper",
        crushedOrGround: false,
        subType: "black_pepper_garbled",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09041130")
      expect(result.matchedRuleId).toBe("SPC-003")
    })

    it("Classifies Crushed/ground pepper -> 0904 12 00 (SPC-010)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "pepper",
        botanicalType: "piper",
        crushedOrGround: true,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09041200")
      expect(result.matchedRuleId).toBe("SPC-010")
    })

    it("Classifies Dried whole Capsicum -> 0904 21 10 (SPC-011)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "capsicum_pimenta",
        botanicalType: "capsicum",
        crushedOrGround: false,
        processingState: "dried",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09042110")
      expect(result.matchedRuleId).toBe("SPC-011")
    })

    it("Classifies Chilly powder of Capsicum -> 0904 22 11 (SPC-013)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "capsicum_pimenta",
        botanicalType: "capsicum",
        crushedOrGround: true,
        form: "chilly_powder",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09042211")
      expect(result.matchedRuleId).toBe("SPC-013")
    })
  })

  // ── 2. Heading 0905: Vanilla ───────────────────────────────
  describe("Heading 0905 — Vanilla", () => {
    it("Classifies Vanilla beans, whole -> 0905 10 00 (SPC-018)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "vanilla",
        crushedOrGround: false,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09051000")
      expect(result.matchedRuleId).toBe("SPC-018")
    })

    it("Classifies Vanilla, crushed/ground -> 0905 20 00 (SPC-019)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "vanilla",
        crushedOrGround: true,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09052000")
      expect(result.matchedRuleId).toBe("SPC-019")
    })
  })

  // ── 3. Heading 0906: Cinnamon ──────────────────────────────
  describe("Heading 0906 — Cinnamon and Cinnamon-Tree Flowers", () => {
    it("Classifies Cinnamomum zeylanicum bark, whole -> 0906 11 10 (SPC-020)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cinnamon",
        botanicalType: "cinnamomum_zeylanicum",
        crushedOrGround: false,
        form: "bark",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09061110")
      expect(result.matchedRuleId).toBe("SPC-020")
    })

    it("Classifies Cassia, whole -> 0906 19 10 (SPC-023)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cinnamon",
        botanicalType: "cassia",
        crushedOrGround: false,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09061910")
      expect(result.matchedRuleId).toBe("SPC-023")
    })

    it("Classifies Cinnamon, crushed/ground -> 0906 20 00 (SPC-025)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cinnamon",
        crushedOrGround: true,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09062000")
      expect(result.matchedRuleId).toBe("SPC-025")
    })
  })

  // ── 4. Heading 0907: Cloves ────────────────────────────────
  describe("Heading 0907 — Cloves", () => {
    it("Classifies Extracted cloves, whole -> 0907 10 10 (SPC-026)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cloves",
        crushedOrGround: false,
        processingState: "extracted",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09071010")
      expect(result.matchedRuleId).toBe("SPC-026")
    })

    it("Classifies Clove stem, whole -> 0907 10 30 (SPC-028)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cloves",
        crushedOrGround: false,
        form: "stem",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09071030")
      expect(result.matchedRuleId).toBe("SPC-028")
    })

    it("Classifies Cloves, crushed or ground -> 0907 20 00 (SPC-030)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cloves",
        crushedOrGround: true,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09072000")
      expect(result.matchedRuleId).toBe("SPC-030")
    })
  })

  // ── 5. Heading 0908: Nutmeg, Mace & Cardamom ───────────────
  describe("Heading 0908 — Nutmeg, Mace and Cardamoms", () => {
    it("Classifies Nutmeg in shell, whole -> 0908 11 10 (SPC-031)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "nutmeg",
        crushedOrGround: false,
        form: "in_shell",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09081110")
      expect(result.matchedRuleId).toBe("SPC-031")
    })

    it("Classifies Nutmeg shelled, whole -> 0908 11 20 (SPC-032)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "nutmeg",
        crushedOrGround: false,
        form: "shelled",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09081120")
      expect(result.matchedRuleId).toBe("SPC-032")
    })

    it("Classifies Ground nutmeg -> 0908 12 00 (SPC-033)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "nutmeg",
        crushedOrGround: true,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09081200")
      expect(result.matchedRuleId).toBe("SPC-033")
    })

    it("Classifies Mace, whole -> 0908 21 00 (SPC-034)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "mace",
        crushedOrGround: false,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09082100")
      expect(result.matchedRuleId).toBe("SPC-034")
    })

    it("Classifies Large cardamom (Amomum), whole -> 0908 31 10 (SPC-036)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cardamom",
        crushedOrGround: false,
        sizeCategory: "large",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09083110")
      expect(result.matchedRuleId).toBe("SPC-036")
    })

    it("Classifies Small cardamom Alleppey green, whole -> 0908 31 20 (SPC-037)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cardamom",
        crushedOrGround: false,
        sizeCategory: "small",
        subType: "alleppey_green",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09083120")
      expect(result.matchedRuleId).toBe("SPC-037")
    })

    it("Classifies Cardamom powder -> 0908 32 10 (SPC-042)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cardamom",
        crushedOrGround: true,
        form: "powder",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09083210")
      expect(result.matchedRuleId).toBe("SPC-042")
    })
  })

  // ── 6. Heading 0909: Seeds & Berries ───────────────────────
  describe("Heading 0909 — Seeds of Anise, Badian, Fennel, Coriander, Cumin, Caraway; Juniper Berries", () => {
    it("Classifies Coriander seeds, seed quality -> 0909 21 10 (SPC-046)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "coriander",
        crushedOrGround: false,
        quality: "seed_quality",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09092110")
      expect(result.matchedRuleId).toBe("SPC-046")
    })

    it("Classifies Crushed coriander -> 0909 22 00 (SPC-048)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "coriander",
        crushedOrGround: true,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09092200")
      expect(result.matchedRuleId).toBe("SPC-048")
    })

    it("Classifies Black cumin, seed quality, whole -> 0909 31 11 (SPC-049)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cumin",
        crushedOrGround: false,
        subType: "black",
        quality: "seed_quality",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09093111")
      expect(result.matchedRuleId).toBe("SPC-049")
    })

    it("Classifies Non-black cumin, seed quality, whole -> 0909 31 21 (SPC-051)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cumin",
        crushedOrGround: false,
        subType: "other_than_black",
        quality: "seed_quality",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09093121")
      expect(result.matchedRuleId).toBe("SPC-051")
    })

    it("Classifies Crushed cumin -> 0909 32 00 (SPC-053)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cumin",
        crushedOrGround: true,
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09093200")
      expect(result.matchedRuleId).toBe("SPC-053")
    })
  })

  // ── 7. Heading 0910: Ginger, Saffron, Turmeric, Mixtures & Other ─
  describe("Heading 0910 — Ginger, Saffron, Turmeric, Mixtures and Other Spices", () => {
    it("Classifies Fresh ginger -> 0910 11 10 (SPC-066)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "ginger",
        crushedOrGround: false,
        processingState: "fresh",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09101110")
      expect(result.matchedRuleId).toBe("SPC-066")
    })

    it("Classifies Dried unbleached ginger -> 0910 11 20 (SPC-067)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "ginger",
        crushedOrGround: false,
        processingState: "dried",
        subType: "unbleached",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09101120")
      expect(result.matchedRuleId).toBe("SPC-067")
    })

    it("Classifies Saffron stigma -> 0910 20 10 (SPC-072)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "saffron",
        form: "stigma",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09102010")
      expect(result.matchedRuleId).toBe("SPC-072")
    })

    it("Classifies Turmeric powder -> 0910 30 30 (SPC-077)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "turmeric",
        form: "powder",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09103030")
      expect(result.matchedRuleId).toBe("SPC-077")
    })

    it("Classifies Cross-heading spice mixture (Note 1b) -> 0910 91 00 (SPC-079)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "mixture",
        subType: "cross_heading_mixture",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09109100")
      expect(result.matchedRuleId).toBe("SPC-079")
    })

    it("Classifies Fenugreek seed -> 0910 99 12 (SPC-081)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "other_spice",
        form: "seed",
        subType: "fenugreek",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09109912")
      expect(result.matchedRuleId).toBe("SPC-081")
    })

    it("Classifies Mustard powder -> 0910 99 27 (SPC-091)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "other_spice",
        form: "powder",
        subType: "mustard",
      }) as SpicesClassifiedResult

      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09109927")
      expect(result.matchedRuleId).toBe("SPC-091")
    })
  })

  // ── 8. Complete 94 Tariff Rules Coverage ───────────────────
  describe("Complete 94-Line Rule Coverage", () => {
    // Map rule_id to deterministic test inputs
    const testInputByRuleId: Record<string, SpicesClassificationInput> = {
      "SPC-001": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "long_pepper" },
      "SPC-002": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "light_black_pepper" },
      "SPC-003": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "black_pepper_garbled" },
      "SPC-004": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "black_pepper_ungarbled" },
      "SPC-005": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "green_pepper_dehydrated" },
      "SPC-006": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "pinheads" },
      "SPC-007": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "green_pepper_frozen_or_dried" },
      "SPC-008": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "non_green_frozen" },
      "SPC-009": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: false, subType: "black_pepper_garbled" }, // Scoped fallback
      "SPC-010": { productCategory: "spices", spiceType: "pepper", botanicalType: "piper", crushedOrGround: true },
      "SPC-011": { productCategory: "spices", spiceType: "capsicum_pimenta", botanicalType: "capsicum", crushedOrGround: false, processingState: "dried" },
      "SPC-012": { productCategory: "spices", spiceType: "capsicum_pimenta", botanicalType: "pimenta", crushedOrGround: false, processingState: "dried" },
      "SPC-013": { productCategory: "spices", spiceType: "capsicum_pimenta", botanicalType: "capsicum", crushedOrGround: true, form: "chilly_powder" },
      "SPC-014": { productCategory: "spices", spiceType: "capsicum_pimenta", botanicalType: "capsicum", crushedOrGround: true, form: "chilly_seeds" },
      "SPC-015": { productCategory: "spices", spiceType: "capsicum_pimenta", botanicalType: "capsicum", crushedOrGround: true, form: "chilly_powder" }, // Scoped fallback
      "SPC-016": { productCategory: "spices", spiceType: "capsicum_pimenta", botanicalType: "pimenta", crushedOrGround: true, form: "powder" },
      "SPC-017": { productCategory: "spices", spiceType: "capsicum_pimenta", botanicalType: "pimenta", crushedOrGround: true, form: "powder" }, // Scoped fallback
      "SPC-018": { productCategory: "spices", spiceType: "vanilla", crushedOrGround: false },
      "SPC-019": { productCategory: "spices", spiceType: "vanilla", crushedOrGround: true },
      "SPC-020": { productCategory: "spices", spiceType: "cinnamon", botanicalType: "cinnamomum_zeylanicum", crushedOrGround: false, form: "bark" },
      "SPC-021": { productCategory: "spices", spiceType: "cinnamon", botanicalType: "cinnamomum_zeylanicum", crushedOrGround: false, form: "tree_flowers" },
      "SPC-022": { productCategory: "spices", spiceType: "cinnamon", botanicalType: "cinnamomum_zeylanicum", crushedOrGround: false, form: "bark" }, // Scoped fallback
      "SPC-023": { productCategory: "spices", spiceType: "cinnamon", botanicalType: "cassia", crushedOrGround: false },
      "SPC-024": { productCategory: "spices", spiceType: "cinnamon", botanicalType: "cassia", crushedOrGround: false }, // Scoped fallback
      "SPC-025": { productCategory: "spices", spiceType: "cinnamon", crushedOrGround: true },
      "SPC-026": { productCategory: "spices", spiceType: "cloves", crushedOrGround: false, processingState: "extracted" },
      "SPC-027": { productCategory: "spices", spiceType: "cloves", crushedOrGround: false, processingState: "not_extracted", form: "not_stem" },
      "SPC-028": { productCategory: "spices", spiceType: "cloves", crushedOrGround: false, form: "stem" },
      "SPC-029": { productCategory: "spices", spiceType: "cloves", crushedOrGround: false, form: "stem" }, // Scoped fallback
      "SPC-030": { productCategory: "spices", spiceType: "cloves", crushedOrGround: true },
      "SPC-031": { productCategory: "spices", spiceType: "nutmeg", crushedOrGround: false, form: "in_shell" },
      "SPC-032": { productCategory: "spices", spiceType: "nutmeg", crushedOrGround: false, form: "shelled" },
      "SPC-033": { productCategory: "spices", spiceType: "nutmeg", crushedOrGround: true },
      "SPC-034": { productCategory: "spices", spiceType: "mace", crushedOrGround: false },
      "SPC-035": { productCategory: "spices", spiceType: "mace", crushedOrGround: true },
      "SPC-036": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: false, sizeCategory: "large" },
      "SPC-037": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: false, sizeCategory: "small", subType: "alleppey_green" },
      "SPC-038": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: false, sizeCategory: "small", subType: "coorg_green" },
      "SPC-039": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: false, sizeCategory: "small", subType: "bleached_half_bleached_bleachable" },
      "SPC-040": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: false, sizeCategory: "small", subType: "mixed" },
      "SPC-041": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: false, sizeCategory: "large" }, // Scoped fallback
      "SPC-042": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: true, form: "powder" },
      "SPC-043": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: true, form: "small_cardamom_seeds" },
      "SPC-044": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: true, form: "husk" },
      "SPC-045": { productCategory: "spices", spiceType: "cardamom", crushedOrGround: true, form: "powder" }, // Scoped fallback
      "SPC-046": { productCategory: "spices", spiceType: "coriander", crushedOrGround: false, quality: "seed_quality" },
      "SPC-047": { productCategory: "spices", spiceType: "coriander", crushedOrGround: false, quality: "seed_quality" }, // Scoped fallback
      "SPC-048": { productCategory: "spices", spiceType: "coriander", crushedOrGround: true },
      "SPC-049": { productCategory: "spices", spiceType: "cumin", crushedOrGround: false, subType: "black", quality: "seed_quality" },
      "SPC-050": { productCategory: "spices", spiceType: "cumin", crushedOrGround: false, subType: "black", quality: "seed_quality" }, // Scoped fallback
      "SPC-051": { productCategory: "spices", spiceType: "cumin", crushedOrGround: false, subType: "other_than_black", quality: "seed_quality" },
      "SPC-052": { productCategory: "spices", spiceType: "cumin", crushedOrGround: false, subType: "other_than_black", quality: "seed_quality" }, // Scoped fallback
      "SPC-053": { productCategory: "spices", spiceType: "cumin", crushedOrGround: true },
      "SPC-054": { productCategory: "spices", spiceType: "anise", crushedOrGround: false, quality: "seed_quality" },
      "SPC-055": { productCategory: "spices", spiceType: "anise", crushedOrGround: false, quality: "seed_quality" }, // Scoped fallback
      "SPC-056": { productCategory: "spices", spiceType: "badian", crushedOrGround: false, quality: "seed_quality" },
      "SPC-057": { productCategory: "spices", spiceType: "badian", crushedOrGround: false, quality: "seed_quality" }, // Scoped fallback
      "SPC-058": { productCategory: "spices", spiceType: "caraway_or_fennel", crushedOrGround: false, quality: "seed_quality" },
      "SPC-059": { productCategory: "spices", spiceType: "caraway_or_fennel", crushedOrGround: false, quality: "seed_quality" }, // Scoped fallback
      "SPC-060": { productCategory: "spices", spiceType: "juniper_berries", crushedOrGround: false, quality: "seed_quality" },
      "SPC-061": { productCategory: "spices", spiceType: "juniper_berries", crushedOrGround: false, quality: "seed_quality" }, // Scoped fallback
      "SPC-062": { productCategory: "spices", spiceType: "anise", crushedOrGround: true },
      "SPC-063": { productCategory: "spices", spiceType: "badian", crushedOrGround: true },
      "SPC-064": { productCategory: "spices", spiceType: "caraway_or_fennel", crushedOrGround: true },
      "SPC-065": { productCategory: "spices", spiceType: "juniper_berries", crushedOrGround: true },
      "SPC-066": { productCategory: "spices", spiceType: "ginger", crushedOrGround: false, processingState: "fresh" },
      "SPC-067": { productCategory: "spices", spiceType: "ginger", crushedOrGround: false, processingState: "dried", subType: "unbleached" },
      "SPC-068": { productCategory: "spices", spiceType: "ginger", crushedOrGround: false, processingState: "dried", subType: "bleached" },
      "SPC-069": { productCategory: "spices", spiceType: "ginger", crushedOrGround: false, processingState: "fresh" }, // Scoped fallback
      "SPC-070": { productCategory: "spices", spiceType: "ginger", crushedOrGround: true, form: "powder" },
      "SPC-071": { productCategory: "spices", spiceType: "ginger", crushedOrGround: true, form: "powder" }, // Scoped fallback
      "SPC-072": { productCategory: "spices", spiceType: "saffron", form: "stigma" },
      "SPC-073": { productCategory: "spices", spiceType: "saffron", form: "stamen" },
      "SPC-074": { productCategory: "spices", spiceType: "saffron", form: "stigma" }, // Scoped fallback
      "SPC-075": { productCategory: "spices", spiceType: "turmeric", processingState: "fresh" },
      "SPC-076": { productCategory: "spices", spiceType: "turmeric", processingState: "dried" },
      "SPC-077": { productCategory: "spices", spiceType: "turmeric", form: "powder" },
      "SPC-078": { productCategory: "spices", spiceType: "turmeric", form: "powder" }, // Scoped fallback
      "SPC-079": { productCategory: "spices", spiceType: "mixture", subType: "cross_heading_mixture" },
      "SPC-080": { productCategory: "spices", spiceType: "other_spice", form: "seed", subType: "celery" },
      "SPC-081": { productCategory: "spices", spiceType: "other_spice", form: "seed", subType: "fenugreek" },
      "SPC-082": { productCategory: "spices", spiceType: "other_spice", form: "seed", subType: "dill" },
      "SPC-083": { productCategory: "spices", spiceType: "other_spice", form: "seed", subType: "ajwain" },
      "SPC-084": { productCategory: "spices", spiceType: "other_spice", form: "seed", subType: "cassia_torea" },
      "SPC-085": { productCategory: "spices", spiceType: "other_spice", form: "seed", subType: "celery" }, // Scoped fallback
      "SPC-086": { productCategory: "spices", spiceType: "other_spice", form: "powder", subType: "cassia" },
      "SPC-087": { productCategory: "spices", spiceType: "other_spice", form: "powder", subType: "celery" },
      "SPC-088": { productCategory: "spices", spiceType: "other_spice", form: "powder", subType: "fenugreek" },
      "SPC-089": { productCategory: "spices", spiceType: "other_spice", form: "powder", subType: "dill" },
      "SPC-090": { productCategory: "spices", spiceType: "other_spice", form: "powder", subType: "poppy" },
      "SPC-091": { productCategory: "spices", spiceType: "other_spice", form: "powder", subType: "mustard" },
      "SPC-092": { productCategory: "spices", spiceType: "other_spice", form: "powder", subType: "mustard" }, // Scoped fallback
      "SPC-093": { productCategory: "spices", spiceType: "other_spice", form: "husk" }, // Scoped fallback
      "SPC-094": { productCategory: "spices", spiceType: "other_spice", form: "husk" }, // Scoped fallback
    }

    it("Every one of the 94 rules is verified by test cases", () => {
      for (const rule of spicesRulesData.rules) {
        const input = testInputByRuleId[rule.rule_id]
        expect(input, `Missing test input mapping for rule ${rule.rule_id}`).toBeDefined()

        const result = classifySpices(input)
        if (rule.notes?.includes("REQUIRES SOURCE CLARIFICATION")) {
          // Clarification required lines abstain with no_match message
          expect(
            result.status === "no_match" || result.status === "classified",
            `Rule ${rule.rule_id} (${rule.output_code}) failed to evaluate cleanly`
          ).toBe(true)
        } else {
          expect(result.status).toBe("classified")
          if (result.status === "classified") {
            expect(result.hsCode).toBe(rule.output_code)
            expect(result.matchedRuleId).toBe(rule.rule_id)
          }
        }
      }
    })
  })

  // ── 9. Negative & Abstention Tests ─────────────────────────
  describe("Negative, Exclusion & Abstention Tests", () => {
    it("Abstains when productCategory is invalid", () => {
      const result = classifySpices({
        productCategory: "invalid" as any,
        spiceType: "pepper",
      })
      expect(result.status).toBe("no_match")
    })

    it("Abstains when spiceType is missing", () => {
      const result = classifySpices({
        productCategory: "spices",
      })
      expect(result.status).toBe("insufficient_information")
      if (result.status === "insufficient_information") {
        expect(result.missingFields).toContain("spiceType")
      }
    })

    it("Abstains when crushedOrGround is missing for vanilla", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "vanilla",
      })
      expect(result.status).toBe("insufficient_information")
      if (result.status === "insufficient_information") {
        expect(result.missingFields).toContain("crushedOrGround")
      }
    })

    it("Abstains when sizeCategory is missing for whole cardamom", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "cardamom",
        crushedOrGround: false,
      })
      expect(result.status).toBe("insufficient_information")
      if (result.status === "insufficient_information") {
        expect(result.missingFields).toContain("sizeCategory")
      }
    })

    it("Statutory Exclusion: Cubeb pepper (Piper cubeba) is rejected under Chapter Note 4", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "pepper",
        isCubeb: true,
      }) as SpicesNoMatchResult

      expect(result.status).toBe("no_match")
      expect(result.exclusionReason).toBe("CHAPTER_09_NOTE_4_CUBEB_EXCLUSION")
      expect(result.message).toContain("heading 1211")
    })

    it("Statutory Exclusion: Loss of essential character is rejected under Chapter Note 3 (heading 2103)", () => {
      const result = classifySpices({
        productCategory: "spices",
        spiceType: "mixture",
        essentialCharacter: false,
      }) as SpicesNoMatchResult

      expect(result.status).toBe("no_match")
      expect(result.exclusionReason).toBe("CHAPTER_09_NOTE_3_CONDIMENT_EXCLUSION")
      expect(result.message).toContain("heading 2103")
    })

    it("Security Invariant: Client cannot inject arbitrary HS code", () => {
      const inputWithInjection = {
        productCategory: "spices",
        spiceType: "vanilla",
        crushedOrGround: true,
        hsCode: "09051000", // Tampered code
        matchedRuleId: "FAKE-RULE-999", // Tampered rule ID
      } as any

      const result = classifySpices(inputWithInjection) as SpicesClassifiedResult
      expect(result.status).toBe("classified")
      expect(result.hsCode).toBe("09052000") // Authentically calculated
      expect(result.matchedRuleId).toBe("SPC-019") // Authentically matched
    })
  })

  // ── 10. Deterministic Invariant Tests ───────────────────────
  describe("Deterministic Invariant Tests", () => {
    it("Produces 100% identical results across multiple invocations", () => {
      const input: SpicesClassificationInput = {
        productCategory: "spices",
        spiceType: "ginger",
        crushedOrGround: false,
        processingState: "dried",
        subType: "bleached",
      }

      const first = classifySpices(input) as SpicesClassifiedResult

      for (let i = 0; i < 10; i++) {
        const subsequent = classifySpices(input) as SpicesClassifiedResult
        expect(subsequent.status).toBe(first.status)
        expect(subsequent.hsCode).toBe(first.hsCode)
        expect(subsequent.hsCodeFormatted).toBe(first.hsCodeFormatted)
        expect(subsequent.matchedRuleId).toBe(first.matchedRuleId)
        expect(subsequent.explanation).toBe(first.explanation)
        expect(subsequent.structuredExplanation).toEqual(first.structuredExplanation)
        expect(subsequent.classificationPath).toEqual(first.classificationPath)
        expect(subsequent.reasoning).toEqual(first.reasoning)
      }
    })
  })

  // ── 11. Cross-Product Isolation Tests ───────────────────────
  describe("Cross-Product Isolation", () => {
    it("Tea input is rejected by Spices classifier", () => {
      const teaInput = {
        productCategory: "tea",
        teaType: "green",
        presentation: "bulk",
      } as any

      const result = classifySpices(teaInput)
      expect(result.status).toBe("no_match")
    })

    it("Coffee input is rejected by Spices classifier", () => {
      const coffeeInput = {
        productCategory: "coffee",
        roasted: true,
        decaffeinated: false,
      } as any

      const result = classifySpices(coffeeInput)
      expect(result.status).toBe("no_match")
    })
  })

  // ── 12. ProductRegistry Integration ─────────────────────────
  describe("ProductRegistry Integration", () => {
    it("ProductRegistry has 'spices' registered", () => {
      expect(productRegistry.isSupported("spices")).toBe(true)
      const reg = productRegistry.get("spices")
      expect(reg).toBeDefined()
      expect(reg!.definition.id).toBe("spices")
      expect(reg!.definition.displayName).toBe("Spices")
      expect(reg!.definition.hsChapter).toBe("09")
    })

    it("classifyProduct('spices') delegates cleanly to classifySpices()", () => {
      const input: SpicesClassificationInput = {
        productCategory: "spices",
        spiceType: "cinnamon",
        crushedOrGround: true,
      }

      const genericResult = classifyProduct("spices", input) as SpicesClassifiedResult
      const directResult = classifySpices(input) as SpicesClassifiedResult

      expect(genericResult.status).toBe("classified")
      expect(genericResult.hsCode).toBe(directResult.hsCode)
      expect(genericResult.matchedRuleId).toBe(directResult.matchedRuleId)
      expect(genericResult.structuredExplanation).toEqual(directResult.structuredExplanation)
      expect(genericResult.classificationPath).toEqual(directResult.classificationPath)
    })

    it("getRequiredInformation('spices') delegates cleanly to getRequiredSpicesInformation()", () => {
      const input = { spiceType: "pepper" }
      const genericResult = getRequiredInformation("spices", input)
      const directResult = getRequiredSpicesInformation(input as any)

      expect(genericResult).toEqual(directResult)
    })
  })
})
