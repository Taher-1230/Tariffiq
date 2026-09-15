// ============================================================
// Spices Required Information Analysis — Phase 6.2
//
// Dynamically analyzes partial or complete Spices classification inputs
// to determine which physical/botanical attributes are required,
// optional, or not applicable for the relevant tariff branch.
// ============================================================

import type {
  SpicesClassificationInput,
  SpicesRequiredInformationAnalysis,
} from "./types"

export function getRequiredSpicesInformation(
  input: Partial<SpicesClassificationInput>
): SpicesRequiredInformationAnalysis {
  const missingFields: string[] = []

  const fieldStatus: SpicesRequiredInformationAnalysis["fieldStatus"] = {
    spiceType: "not_required",
    botanicalType: "not_required",
    crushedOrGround: "not_required",
    subType: "not_required",
    form: "not_required",
    processingState: "not_required",
    quality: "not_required",
    sizeCategory: "not_required",
    essentialCharacter: "not_required",
  }

  // 1. Spice Type is always the root requirement
  if (!input.spiceType) {
    fieldStatus.spiceType = "required"
    missingFields.push("spiceType")
    return {
      sufficient: false,
      missingFields,
      reason: "Spice commodity type is required.",
      fieldStatus,
    }
  }

  fieldStatus.spiceType = "satisfied"

  const { spiceType } = input

  // 2. Branch-specific requirements
  switch (spiceType) {
    case "pepper": {
      // Heading 0904 Piper
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          // Whole piper pepper needs subtype
          if (!input.subType) {
            fieldStatus.subType = "required"
            missingFields.push("subType")
          } else {
            fieldStatus.subType = "satisfied"
          }
        }
      }
      break
    }

    case "capsicum_pimenta": {
      // Heading 0904 Capsicum/Pimenta
      if (!input.botanicalType) {
        fieldStatus.botanicalType = "required"
        missingFields.push("botanicalType")
      } else {
        fieldStatus.botanicalType = "satisfied"
      }

      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.processingState) {
            fieldStatus.processingState = "required"
            missingFields.push("processingState")
          } else {
            fieldStatus.processingState = "satisfied"
          }
        } else {
          // Crushed/ground Capsicum/Pimenta
          if (!input.form) {
            fieldStatus.form = "required"
            missingFields.push("form")
          } else {
            fieldStatus.form = "satisfied"
          }
        }
      }
      break
    }

    case "vanilla": {
      // Heading 0905
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
      }
      break
    }

    case "cinnamon": {
      // Heading 0906
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.botanicalType) {
            fieldStatus.botanicalType = "required"
            missingFields.push("botanicalType")
          } else {
            fieldStatus.botanicalType = "satisfied"
            if (input.botanicalType === "cinnamomum_zeylanicum") {
              if (!input.form) {
                fieldStatus.form = "required"
                missingFields.push("form")
              } else {
                fieldStatus.form = "satisfied"
              }
            }
          }
        }
      }
      break
    }

    case "cloves": {
      // Heading 0907
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.processingState && !input.form) {
            fieldStatus.processingState = "required"
            fieldStatus.form = "optional"
            missingFields.push("processingState")
          } else {
            if (input.processingState) fieldStatus.processingState = "satisfied"
            if (input.form) fieldStatus.form = "satisfied"
          }
        }
      }
      break
    }

    case "nutmeg": {
      // Heading 0908
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.form) {
            fieldStatus.form = "required"
            missingFields.push("form")
          } else {
            fieldStatus.form = "satisfied"
          }
        }
      }
      break
    }

    case "mace": {
      // Heading 0908
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
      }
      break
    }

    case "cardamom": {
      // Heading 0908
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.sizeCategory) {
            fieldStatus.sizeCategory = "required"
            missingFields.push("sizeCategory")
          } else {
            fieldStatus.sizeCategory = "satisfied"
            if (input.sizeCategory === "small") {
              if (!input.subType) {
                fieldStatus.subType = "required"
                missingFields.push("subType")
              } else {
                fieldStatus.subType = "satisfied"
              }
            }
          }
        } else {
          // Crushed/ground cardamom
          if (!input.form) {
            fieldStatus.form = "required"
            missingFields.push("form")
          } else {
            fieldStatus.form = "satisfied"
          }
        }
      }
      break
    }

    case "coriander": {
      // Heading 0909
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.quality) {
            fieldStatus.quality = "required"
            missingFields.push("quality")
          } else {
            fieldStatus.quality = "satisfied"
          }
        }
      }
      break
    }

    case "cumin": {
      // Heading 0909
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.subType) {
            fieldStatus.subType = "required"
            missingFields.push("subType")
          } else {
            fieldStatus.subType = "satisfied"
          }
          if (!input.quality) {
            fieldStatus.quality = "required"
            missingFields.push("quality")
          } else {
            fieldStatus.quality = "satisfied"
          }
        }
      }
      break
    }

    case "anise":
    case "badian":
    case "caraway_or_fennel":
    case "juniper_berries": {
      // Heading 0909
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.quality) {
            fieldStatus.quality = "required"
            missingFields.push("quality")
          } else {
            fieldStatus.quality = "satisfied"
          }
        }
      }
      break
    }

    case "ginger": {
      // Heading 0910
      if (input.crushedOrGround === undefined || input.crushedOrGround === null) {
        fieldStatus.crushedOrGround = "required"
        missingFields.push("crushedOrGround")
      } else {
        fieldStatus.crushedOrGround = "satisfied"
        if (input.crushedOrGround === false) {
          if (!input.processingState) {
            fieldStatus.processingState = "required"
            missingFields.push("processingState")
          } else {
            fieldStatus.processingState = "satisfied"
            if (input.processingState === "dried") {
              if (!input.subType) {
                fieldStatus.subType = "required"
                missingFields.push("subType")
              } else {
                fieldStatus.subType = "satisfied"
              }
            }
          }
        } else {
          // Crushed/ground ginger
          if (!input.form) {
            fieldStatus.form = "required"
            missingFields.push("form")
          } else {
            fieldStatus.form = "satisfied"
          }
        }
      }
      break
    }

    case "saffron": {
      // Heading 0910
      if (!input.form) {
        fieldStatus.form = "required"
        missingFields.push("form")
      } else {
        fieldStatus.form = "satisfied"
      }
      break
    }

    case "turmeric": {
      // Heading 0910
      if (!input.processingState && !input.form) {
        fieldStatus.processingState = "required"
        fieldStatus.form = "optional"
        missingFields.push("processingState")
      } else {
        if (input.processingState) fieldStatus.processingState = "satisfied"
        if (input.form) fieldStatus.form = "satisfied"
      }
      break
    }

    case "mixture": {
      // Heading 0910 91
      fieldStatus.subType = input.subType ? "satisfied" : "required"
      if (!input.subType) missingFields.push("subType")
      break
    }

    case "other_spice": {
      // Heading 0910 99
      if (!input.form) {
        fieldStatus.form = "required"
        missingFields.push("form")
      } else {
        fieldStatus.form = "satisfied"
        if (input.form === "seed" || input.form === "powder") {
          if (!input.subType) {
            fieldStatus.subType = "required"
            missingFields.push("subType")
          } else {
            fieldStatus.subType = "satisfied"
          }
        }
      }
      break
    }
  }

  const sufficient = missingFields.length === 0

  return {
    sufficient,
    missingFields,
    reason: sufficient
      ? undefined
      : `Missing required fields: ${missingFields.join(", ")}.`,
    fieldStatus,
  }
}
