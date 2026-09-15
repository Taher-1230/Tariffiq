// ============================================================
// ClassificationWizard — Phase 6.4 Dual-Entry Architecture
//
// Dual Entry Paths:
//   Path A: Natural Language (AI) → Extract → Review/Edit → Confirm → Deterministic Classifier
//   Path B: Manual Wizard → Deterministic Classifier
//
// Products:
//   - Tea (Chapter 0902): classifyTea()
//   - Coffee (Chapter 0901): classifyCoffee()
//   - Spices (Chapter 0904–0910): classifySpices()
//
// CRITICAL INVARIANT:
//   The final HS code MUST always come from the deterministic classifier.
//   Gemini ONLY extracts attributes. Gemini NEVER determines HS codes.
// ============================================================

import { useCallback, useRef, useState } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, Coffee, Flame, FlaskConical, Leaf, RotateCcw, SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ClassificationProgress, TEA_STEPS, SPICES_STEPS } from "@/components/classifier/ClassificationProgress"
import { ProductStep } from "@/components/classifier/ProductStep"
import { TeaTypeStep } from "@/components/classifier/TeaTypeStep"
import { PresentationStep } from "@/components/classifier/PresentationStep"
import { FormStep } from "@/components/classifier/FormStep"
import { WeightStep } from "@/components/classifier/WeightStep"
import { ReviewStep } from "@/components/classifier/ReviewStep"
import { SpiceTypeStep } from "@/components/classifier/SpiceTypeStep"
import { SpiceProcessingStep } from "@/components/classifier/SpiceProcessingStep"
import { SpiceDetailsStep, spiceDetailsStepHasFields } from "@/components/classifier/SpiceDetailsStep"
import { SpiceReviewStep } from "@/components/classifier/SpiceReviewStep"
import { ClassificationLoading } from "@/components/classifier/ClassificationLoading"
import {
  ClassificationResult,
  type AnyClassificationResult,
  type SaveStatus,
} from "@/components/classifier/ClassificationResult"
import { EntryPathSelector } from "@/components/classifier/EntryPathSelector"
import { AIProductInput } from "@/components/classifier/AIProductInput"
import { AIExtractionReview, type EditableExtractionState } from "@/components/classifier/AIExtractionReview"
import { CoffeeAIExtractionReview } from "@/components/classifier/CoffeeAIExtractionReview"
import { SpicesAIExtractionReview } from "@/components/classifier/SpicesAIExtractionReview"
import { useAuth } from "@/context/AuthContext"
import { AuthDialog } from "@/components/auth/AuthDialog"
import { saveClassification } from "@/api/historyApi"
import type { SaveClassificationRequest } from "../../../shared/history-contract.js"
import { extractTeaDescription, type ExtractorOptions } from "@/ai/extractor"
import { toTeaClassificationInput } from "@/ai/toTeaClassificationInput"
import type { TeaExtractionResult } from "@/ai/types"
import { classifyTea, getRequiredTeaInformation } from "@/engine/index"
import {
  extractCoffeeDescription,
  type CoffeeExtractorOptions,
} from "@/products/coffee/ai/extractor"
import { toCoffeeClassificationInput } from "@/products/coffee/ai/toCoffeeClassificationInput"
import type {
  CoffeeExtraction,
  CoffeeExtractionResult,
} from "@/products/coffee/ai/types"
import {
  classifyCoffee,
  getRequiredCoffeeInformation,
} from "@/products/coffee/index"
import type {
  CoffeeClassificationInput,
} from "@/products/coffee/types"
import {
  extractSpicesDescription,
  type SpicesExtractorOptions,
} from "@/products/spices/ai/extractor"
import { toSpicesClassificationInput } from "@/products/spices/ai/toSpicesClassificationInput"
import type {
  SpicesExtraction,
  SpicesExtractionResult,
} from "@/products/spices/ai/types"
import {
  classifySpices,
  getRequiredSpicesInformation,
} from "@/products/spices/index"
import type {
  BotanicalType,
  SpiceForm,
  SpiceProcessingState,
  SpiceQuality,
  SpiceSizeCategory,
  SpiceSubType,
  SpiceType,
  SpicesClassificationInput,
} from "@/products/spices/types"
import type {
  FormType,
  PresentationType,
  TeaClassificationInput,
  TeaType,
  WizardStep,
  WeightUnit,
} from "@/types/classification"
import type { ProductCategory } from "@/products/types"

// ── Wizard form state ──────────────────────────────────────

interface WizardFormState {
  product: ProductCategory | null
  productCategory: ProductCategory
  teaType: TeaType | null
  presentation: PresentationType | null
  form: FormType | null
  netWeight: number | null
  weightUnit: WeightUnit
}

const INITIAL_FORM: WizardFormState = {
  product: null,
  productCategory: "tea",
  teaType: null,
  presentation: null,
  form: null,
  netWeight: null,
  weightUnit: "g",
}

// ── Spices Manual Form State ────────────────────────────────

interface SpicesManualFormState {
  spiceType: SpiceType | null
  botanicalType: BotanicalType | null
  crushedOrGround: boolean | null
  subType: SpiceSubType | null
  form: SpiceForm | null
  processingState: SpiceProcessingState | null
  quality: SpiceQuality | null
  sizeCategory: SpiceSizeCategory | null
  isCubeb: boolean | null
  essentialCharacter: boolean | null
}

const INITIAL_SPICES_FORM: SpicesManualFormState = {
  spiceType: null,
  botanicalType: null,
  crushedOrGround: null,
  subType: null,
  form: null,
  processingState: null,
  quality: null,
  sizeCategory: null,
  isCubeb: null,
  essentialCharacter: null,
}

const ORDERED_TEA_STEPS: WizardStep[] = [
  "product",
  "tea-type",
  "presentation",
  "form",
  "weight",
  "review",
]

const ORDERED_SPICES_STEPS: WizardStep[] = [
  "product",
  "spice-type",
  "spice-processing",
  "spice-details",
  "spice-review",
]

export type EntryMode = "selection" | "ai" | "manual"
export type AIState = "idle" | "extracting" | "review" | "error" | "unsupported"

// ── Helpers ────────────────────────────────────────────────

function canContinue(
  step: WizardStep,
  form: WizardFormState,
  isWeightRequired: boolean
): boolean {
  switch (step) {
    case "product":      return form.product !== null
    case "tea-type":     return form.teaType !== null
    case "presentation": return form.presentation !== null
    case "form":         return form.form !== null
    case "weight":
      if (!isWeightRequired) return true
      return (
        form.netWeight !== null &&
        Number.isFinite(form.netWeight) &&
        form.netWeight > 0
      )
    case "review":       return true
    default:             return false
  }
}

function continueBlockedMessage(
  step: WizardStep,
  form: WizardFormState,
  isWeightRequired: boolean
): string | null {
  switch (step) {
    case "product":
      return form.product === null ? "Select a product category to continue." : null
    case "tea-type":
      return form.teaType === null ? "Select the tea type to continue." : null
    case "presentation":
      return form.presentation === null ? "Select a presentation to continue." : null
    case "form":
      return form.form === null ? "Select the product form to continue." : null
    case "weight":
      if (!isWeightRequired) return null
      if (form.netWeight === null) return "Enter the net content to continue."
      if (!Number.isFinite(form.netWeight) || form.netWeight <= 0) {
        return "Enter a weight greater than 0."
      }
      return null
    default:
      return null
  }
}

function buildInput(form: WizardFormState): TeaClassificationInput {
  return {
    productCategory: "tea",
    teaType: form.teaType!,
    presentation: form.presentation!,
    form: form.form!,
    netWeight: form.netWeight ?? undefined,
    weightUnit: form.weightUnit,
  }
}

function buildSpicesInput(form: SpicesManualFormState): SpicesClassificationInput {
  return {
    productCategory: "spices",
    spiceType: form.spiceType,
    botanicalType: form.botanicalType,
    crushedOrGround: form.crushedOrGround,
    subType: form.subType,
    form: form.form,
    processingState: form.processingState,
    quality: form.quality,
    sizeCategory: form.sizeCategory,
    isCubeb: form.isCubeb,
    essentialCharacter: form.essentialCharacter,
  }
}

function canContinueSpices(
  step: WizardStep,
  form: SpicesManualFormState
): boolean {
  switch (step) {
    case "product":          return true // already selected spices
    case "spice-type":       return form.spiceType !== null
    case "spice-processing": {
      const partial = buildSpicesInput(form)
      const req = getRequiredSpicesInformation(partial)
      const fs = req.fieldStatus
      // All processing-step fields must be satisfied (or not_required)
      const cogOk = fs.crushedOrGround !== "required"
      const botOk = fs.botanicalType !== "required"
      const procOk = fs.processingState !== "required"
      const formOk = fs.form !== "required"
      return cogOk && botOk && procOk && formOk
    }
    case "spice-details": {
      const partial = buildSpicesInput(form)
      const req = getRequiredSpicesInformation(partial)
      const fs = req.fieldStatus
      const subOk = fs.subType !== "required"
      const qualOk = fs.quality !== "required"
      const sizeOk = fs.sizeCategory !== "required"
      return subOk && qualOk && sizeOk
    }
    case "spice-review":     return true
    default:                 return false
  }
}

function continueBlockedMessageSpices(
  step: WizardStep,
  form: SpicesManualFormState
): string | null {
  switch (step) {
    case "spice-type":
      return form.spiceType === null ? "Select a spice category to continue." : null
    case "spice-processing": {
      const partial = buildSpicesInput(form)
      const req = getRequiredSpicesInformation(partial)
      const fs = req.fieldStatus
      if (fs.crushedOrGround === "required") return "Select whether the product is crushed or ground."
      if (fs.botanicalType === "required") return "Select the botanical type."
      if (fs.processingState === "required") return "Select the processing state."
      if (fs.form === "required") return "Select the physical form."
      return null
    }
    case "spice-details": {
      const partial = buildSpicesInput(form)
      const req = getRequiredSpicesInformation(partial)
      const fs = req.fieldStatus
      if (fs.sizeCategory === "required") return "Select the size category."
      if (fs.subType === "required") return "Select the subtype or variety."
      if (fs.quality === "required") return "Specify the quality grade."
      return null
    }
    default:
      return null
  }
}

/**
 * Reset downstream spices fields when an upstream field changes.
 */
function resetDependentSpicesFields(
  form: SpicesManualFormState,
  changedField: keyof SpicesManualFormState
): SpicesManualFormState {
  const updated = { ...form }
  if (changedField === "spiceType") {
    updated.botanicalType = null
    updated.crushedOrGround = null
    updated.subType = null
    updated.form = null
    updated.processingState = null
    updated.quality = null
    updated.sizeCategory = null
    updated.isCubeb = null
    updated.essentialCharacter = null
  } else if (changedField === "crushedOrGround") {
    updated.subType = null
    updated.form = null
    updated.processingState = null
    updated.quality = null
    updated.sizeCategory = null
  } else if (changedField === "botanicalType") {
    updated.form = null
  }
  return updated
}

// ── Component ──────────────────────────────────────────────

export interface ClassificationWizardProps {
  initialProductCategory?: ProductCategory
  extractorOptions?: ExtractorOptions
  coffeeExtractorOptions?: CoffeeExtractorOptions
  spicesExtractorOptions?: SpicesExtractorOptions
}

export function ClassificationWizard({
  initialProductCategory = "tea",
  extractorOptions,
  coffeeExtractorOptions,
  spicesExtractorOptions,
}: ClassificationWizardProps = {}) {
  const { isAuthenticated } = useAuth()

  // Selected product category for AI/flow (Tea vs Coffee vs Spices)
  const [activeCategory, setActiveCategory] = useState<ProductCategory>(
    initialProductCategory
  )

  // Mode & workflow state
  const [entryMode, setEntryMode] = useState<"selection" | "ai" | "manual">("selection")
  const [aiState, setAIState] = useState<"idle" | "extracting" | "review" | "unsupported" | "error">("idle")
  const [aiInputText, setAIInputText] = useState<string>("")

  // Tea AI State
  const [teaExtractionResult, setTeaExtractionResult] = useState<TeaExtractionResult | null>(null)
  const [teaEditedAttributes, setTeaEditedAttributes] = useState<EditableExtractionState | null>(null)

  // Coffee AI State
  const [coffeeExtractionResult, setCoffeeExtractionResult] = useState<CoffeeExtractionResult | null>(null)
  const [coffeeEditedAttributes, setCoffeeEditedAttributes] = useState<CoffeeExtraction | null>(null)

  // Spices AI State
  const [spicesExtractionResult, setSpicesExtractionResult] = useState<SpicesExtractionResult | null>(null)
  const [spicesEditedAttributes, setSpicesEditedAttributes] = useState<SpicesExtraction | null>(null)

  const [insufficientInfoError, setInsufficientInfoError] = useState<string | null>(null)

  // Persistence & Auth modal state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [lastSavePayload, setLastSavePayload] = useState<SaveClassificationRequest | null>(null)
  const isPersistingRef = useRef(false)
  const lastPersistedHashRef = useRef<string>("")
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  // Manual wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("product")
  const [formState, setFormState] = useState<WizardFormState>(INITIAL_FORM)
  const [spicesFormState, setSpicesFormState] = useState<SpicesManualFormState>(INITIAL_SPICES_FORM)
  const [result, setResult] = useState<AnyClassificationResult | null>(null)

  // ── History Persistence Helper ──

  const persistClassification = useCallback(
    async (
      input: TeaClassificationInput | CoffeeClassificationInput | SpicesClassificationInput,
      source: "ai" | "manual",
      desc?: string,
      extr?: unknown,
      productCat?: string
    ) => {
      const payload: SaveClassificationRequest = {
        inputSource: source,
        productCategory: productCat ?? activeCategory,
        productDescription: desc,
        extraction: extr as any,
        confirmedInput: input as unknown as Record<string, unknown>,
      }

      setLastSavePayload(payload)

      if (!isAuthenticated) {
        setSaveStatus("unauthenticated")
        return
      }

      // Duplicate protection: Check hash and concurrency flag
      const payloadHash = JSON.stringify({
        productCategory: payload.productCategory,
        inputSource: payload.inputSource,
        confirmedInput: payload.confirmedInput,
      })

      if (isPersistingRef.current || lastPersistedHashRef.current === payloadHash) {
        return
      }

      isPersistingRef.current = true

      try {
        await saveClassification(payload)
        lastPersistedHashRef.current = payloadHash
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      } finally {
        isPersistingRef.current = false
      }
    },
    [isAuthenticated, activeCategory]
  )

  const handleRetrySave = useCallback(async () => {
    if (!lastSavePayload) return
    setSaveStatus("idle")
    try {
      await saveClassification(lastSavePayload)
      setSaveStatus("saved")
    } catch {
      setSaveStatus("error")
    }
  }, [lastSavePayload])

  // ── Navigation helpers ──

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleStartOver = useCallback(() => {
    setEntryMode("selection")
    setAIState("idle")
    setAIInputText("")
    setTeaExtractionResult(null)
    setTeaEditedAttributes(null)
    setCoffeeExtractionResult(null)
    setCoffeeEditedAttributes(null)
    setSpicesExtractionResult(null)
    setSpicesEditedAttributes(null)
    setInsufficientInfoError(null)
    setFormState(INITIAL_FORM)
    setSpicesFormState(INITIAL_SPICES_FORM)
    setResult(null)
    setSaveStatus("idle")
    setLastSavePayload(null)
    lastPersistedHashRef.current = ""
    setCurrentStep("product")
  }, [])

  // ── AI Extraction Flow ──

  const handleAnalyzeAI = useCallback(
    async (text: string) => {
      setAIInputText(text)
      setAIState("extracting")
      setInsufficientInfoError(null)

      if (activeCategory === "spices") {
        const res = await extractSpicesDescription(text, spicesExtractorOptions)
        setSpicesExtractionResult(res)

        if (res.status === "extracted" || res.status === "needs_clarification") {
          setSpicesEditedAttributes({ ...res.attributes })
          setAIState("review")
        } else if (res.status === "unsupported") {
          setAIState("unsupported")
        } else {
          setAIState("error")
        }
      } else if (activeCategory === "coffee") {
        const res = await extractCoffeeDescription(text, coffeeExtractorOptions)
        setCoffeeExtractionResult(res)

        if (res.status === "extracted" || res.status === "needs_clarification") {
          setCoffeeEditedAttributes({
            productCategory: res.attributes.productCategory,
            productType: res.attributes.productType,
            roasted: res.attributes.roasted,
            decaffeinated: res.attributes.decaffeinated,
            presentation: res.attributes.presentation,
            form: res.attributes.form,
            grade: res.attributes.grade,
          })
          setAIState("review")
        } else if (res.status === "unsupported") {
          setAIState("unsupported")
        } else {
          setAIState("error")
        }
      } else {
        // Tea category
        const res = await extractTeaDescription(text, extractorOptions)
        setTeaExtractionResult(res)

        if (res.status === "extracted" || res.status === "needs_clarification") {
          setTeaEditedAttributes({
            productCategory: res.attributes.productCategory,
            teaType: res.attributes.teaType,
            presentation: res.attributes.presentation,
            form: res.attributes.form,
            netWeight: res.attributes.netWeight,
            weightUnit: res.attributes.weightUnit ?? "g",
            weightPrecision: res.attributes.weightPrecision,
          })
          setAIState("review")
        } else if (res.status === "unsupported") {
          setAIState("unsupported")
        } else {
          setAIState("error")
        }
      }
    },
    [activeCategory, coffeeExtractorOptions, extractorOptions, spicesExtractorOptions]
  )

  // ── AI Confirmation Flow (Tea) ──

  const handleConfirmTeaAI = useCallback(() => {
    if (!teaEditedAttributes) return

    const conversion = toTeaClassificationInput({
      productCategory: teaEditedAttributes.productCategory,
      teaType: teaEditedAttributes.teaType,
      presentation: teaEditedAttributes.presentation,
      form: teaEditedAttributes.form,
      netWeight: teaEditedAttributes.netWeight,
      weightUnit: teaEditedAttributes.weightUnit,
      weightPrecision: teaEditedAttributes.weightPrecision,
    })

    if (!conversion.success) {
      setInsufficientInfoError(conversion.reason)
      return
    }

    const input = conversion.input
    const reqInfo = getRequiredTeaInformation(input)

    if (reqInfo.missingFields.length > 0) {
      setInsufficientInfoError(reqInfo.reason ?? "More information is required to classify this product.")
      return
    }

    setInsufficientInfoError(null)
    goToStep("loading")

    setTimeout(() => {
      const engineResult = classifyTea(input)
      setResult(engineResult)
      if (engineResult.status === "classified") {
        persistClassification(
          input,
          "ai",
          aiInputText,
          teaExtractionResult && "attributes" in teaExtractionResult ? teaExtractionResult.attributes : null,
          "tea"
        )
      }
      goToStep("result")
    }, 500)
  }, [teaEditedAttributes, goToStep, persistClassification, aiInputText, teaExtractionResult])

  // ── AI Confirmation Flow (Coffee) ──

  const handleConfirmCoffeeAI = useCallback(() => {
    if (!coffeeEditedAttributes) return

    const conversion = toCoffeeClassificationInput(coffeeEditedAttributes)

    if (!conversion.success) {
      setInsufficientInfoError(conversion.reason)
      return
    }

    const input = conversion.input
    const reqInfo = getRequiredCoffeeInformation(input)

    if (!reqInfo.sufficient || reqInfo.missingFields.length > 0) {
      setInsufficientInfoError(
        reqInfo.reason ?? "More information is required to classify this coffee product."
      )
      return
    }

    setInsufficientInfoError(null)
    goToStep("loading")

    setTimeout(() => {
      const engineResult = classifyCoffee(input)
      setResult(engineResult)
      if (engineResult.status === "classified") {
        persistClassification(
          input,
          "ai",
          aiInputText,
          coffeeExtractionResult && "attributes" in coffeeExtractionResult
            ? coffeeExtractionResult.attributes
            : null,
          "coffee"
        )
      }
      goToStep("result")
    }, 500)
  }, [coffeeEditedAttributes, goToStep, persistClassification, aiInputText, coffeeExtractionResult])

  // ── AI Confirmation Flow (Spices) ──

  const handleConfirmSpicesAI = useCallback(() => {
    if (!spicesEditedAttributes) return

    const conversion = toSpicesClassificationInput(spicesEditedAttributes)

    if (!conversion.success) {
      setInsufficientInfoError(conversion.reason)
      return
    }

    const input = conversion.input
    const reqInfo = getRequiredSpicesInformation(input)

    if (!reqInfo.sufficient || reqInfo.missingFields.length > 0) {
      setInsufficientInfoError(
        reqInfo.reason ?? "More information is required to classify this spice product."
      )
      return
    }

    setInsufficientInfoError(null)
    goToStep("loading")

    setTimeout(() => {
      const engineResult = classifySpices(input)
      setResult(engineResult)
      if (engineResult.status === "classified") {
        persistClassification(
          input,
          "ai",
          aiInputText,
          spicesExtractionResult && "attributes" in spicesExtractionResult
            ? spicesExtractionResult.attributes
            : null,
          "spices"
        )
      }
      goToStep("result")
    }, 500)
  }, [spicesEditedAttributes, goToStep, persistClassification, aiInputText, spicesExtractionResult])

  // ── Manual Wizard Flow ──

  // Determine ordered steps based on active product
  const getOrderedSteps = useCallback((): WizardStep[] => {
    if (activeCategory === "spices") {
      const partial = buildSpicesInput(spicesFormState)
      const hasDetails = spiceDetailsStepHasFields(partial)
      if (hasDetails) return ORDERED_SPICES_STEPS
      // Skip spice-details step if no fields needed
      return ORDERED_SPICES_STEPS.filter((s) => s !== "spice-details")
    }
    return ORDERED_TEA_STEPS
  }, [activeCategory, spicesFormState])

  const handleContinueManual = useCallback(() => {
    const orderedSteps = getOrderedSteps()
    const currentIndex = orderedSteps.indexOf(currentStep)
    if (currentIndex === -1) return

    // Tea review → classify
    if (currentStep === "review") {
      goToStep("loading")
      const input = buildInput(formState)

      setTimeout(() => {
        const engineResult = classifyTea(input)
        setResult(engineResult)
        if (engineResult.status === "classified") {
          persistClassification(input, "manual", undefined, undefined, "tea")
        }
        goToStep("result")
      }, 500)
      return
    }

    // Spices review → classify
    if (currentStep === "spice-review") {
      goToStep("loading")
      const input = buildSpicesInput(spicesFormState)

      setTimeout(() => {
        const engineResult = classifySpices(input)
        setResult(engineResult)
        if (engineResult.status === "classified") {
          persistClassification(input, "manual", undefined, undefined, "spices")
        }
        goToStep("result")
      }, 500)
      return
    }

    const nextStep = orderedSteps[currentIndex + 1]
    if (nextStep) goToStep(nextStep)
  }, [currentStep, formState, spicesFormState, goToStep, persistClassification, getOrderedSteps])

  const handleBackManual = useCallback(() => {
    const orderedSteps = getOrderedSteps()
    const currentIndex = orderedSteps.indexOf(currentStep)
    if (currentIndex > 0) {
      goToStep(orderedSteps[currentIndex - 1])
    } else {
      setEntryMode("selection")
    }
  }, [currentStep, goToStep, getOrderedSteps])

  const updateForm = useCallback(
    <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Spices form updater with dependent state invalidation
  const updateSpicesForm = useCallback(
    <K extends keyof SpicesManualFormState>(key: K, value: SpicesManualFormState[K]) => {
      setSpicesFormState((prev) => {
        const updated = { ...prev, [key]: value }
        // Reset dependent fields when upstream changes
        if (key === "spiceType" || key === "crushedOrGround" || key === "botanicalType") {
          return resetDependentSpicesFields(updated, key)
        }
        return updated
      })
    },
    []
  )

  // Handle product selection in manual mode → route to correct next step
  const handleProductSelectManual = useCallback((v: ProductCategory) => {
    updateForm("product", v)
    updateForm("productCategory", v)
    setActiveCategory(v)
    // Reset cross-product state
    if (v === "spices") {
      setFormState(INITIAL_FORM)
    } else {
      setSpicesFormState(INITIAL_SPICES_FORM)
    }
  }, [updateForm])

  // Override continue for product step to route correctly
  const handleContinueManualWrapped = useCallback(() => {
    if (currentStep === "product") {
      if (activeCategory === "spices") {
        goToStep("spice-type")
        return
      }
      // Tea: go to tea-type
      goToStep("tea-type")
      return
    }
    handleContinueManual()
  }, [currentStep, activeCategory, goToStep, handleContinueManual])

  // ── Render ──

  const isLoading = currentStep === "loading"
  const isResult  = currentStep === "result"

  // 1. Loading screen
  if (isLoading) {
    return <ClassificationLoading />
  }

  // 2. Result screen
  if (isResult && result) {
    return (
      <>
        <ClassificationResult
          result={result}
          onReclassify={handleStartOver}
          onReview={() => {
            if (entryMode === "ai") {
              setCurrentStep("product")
              setAIState("review")
            } else {
              goToStep("review")
            }
          }}
          onEdit={(step) => {
            if (entryMode === "ai") {
              setCurrentStep("product")
              setAIState("review")
            } else {
              goToStep(step)
            }
          }}
          saveStatus={saveStatus}
          onSignIn={() => setAuthDialogOpen(true)}
          onRetrySave={handleRetrySave}
        />
        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      </>
    )
  }

  // 3. Selection screen (Dual entry path choice)
  if (entryMode === "selection") {
    return (
      <div className="flex flex-col gap-6">
        {/* Product Switcher Pills */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selected Product:
            </span>
            <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
              <button
                type="button"
                id="select-tea-category"
                onClick={() => {
                  setActiveCategory("tea")
                  updateForm("productCategory", "tea")
                  updateForm("product", "tea")
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  activeCategory === "tea"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Leaf className="h-3.5 w-3.5" />
                Tea (0902)
              </button>
              <button
                type="button"
                id="select-coffee-category"
                onClick={() => {
                  setActiveCategory("coffee")
                  updateForm("productCategory", "coffee")
                  updateForm("product", "coffee")
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  activeCategory === "coffee"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Coffee className="h-3.5 w-3.5" />
                Coffee (0901)
              </button>
              <button
                type="button"
                id="select-spices-category"
                onClick={() => {
                  setActiveCategory("spices")
                  updateForm("productCategory", "spices")
                  updateForm("product", "spices")
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  activeCategory === "spices"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Flame className="h-3.5 w-3.5" />
                Spices (0904–0910)
              </button>
            </div>
          </div>
        </div>

        <EntryPathSelector
          onSelectAI={() => {
            setEntryMode("ai")
            setAIState("idle")
          }}
          onSelectManual={() => {
            setEntryMode("manual")
            setCurrentStep("product")
          }}
        />
      </div>
    )
  }

  // 4. AI Entry Path
  if (entryMode === "ai") {
    if (aiState === "idle" || aiState === "extracting") {
      return (
        <div className="flex flex-col gap-6">
          {/* Product Switcher Pills */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product:
              </span>
              <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
                <button
                  type="button"
                  id="ai-select-tea"
                  onClick={() => setActiveCategory("tea")}
                  disabled={aiState === "extracting"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                    activeCategory === "tea"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Leaf className="h-3.5 w-3.5" />
                  Tea (0902)
                </button>
                <button
                  type="button"
                  id="ai-select-coffee"
                  onClick={() => setActiveCategory("coffee")}
                  disabled={aiState === "extracting"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                    activeCategory === "coffee"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Coffee className="h-3.5 w-3.5" />
                  Coffee (0901)
                </button>
                <button
                  type="button"
                  id="ai-select-spices"
                  onClick={() => setActiveCategory("spices")}
                  disabled={aiState === "extracting"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                    activeCategory === "spices"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Flame className="h-3.5 w-3.5" />
                  Spices (0904–0910)
                </button>
              </div>
            </div>
          </div>

          <AIProductInput
            initialText={aiInputText}
            isExtracting={aiState === "extracting"}
            productCategory={activeCategory}
            onAnalyze={handleAnalyzeAI}
            onSwitchToManual={() => {
              setEntryMode("manual")
              setCurrentStep("product")
            }}
            onBackToSelection={() => setEntryMode("selection")}
          />
        </div>
      )
    }

    // Spices Review
    if (
      aiState === "review" &&
      activeCategory === "spices" &&
      spicesExtractionResult &&
      spicesEditedAttributes
    ) {
      return (
        <SpicesAIExtractionReview
          extractionResult={spicesExtractionResult}
          editedAttributes={spicesEditedAttributes}
          onAttributesChange={(updated) => setSpicesEditedAttributes(updated)}
          onConfirm={handleConfirmSpicesAI}
          onStartOver={handleStartOver}
          onSwitchToManual={() => {
            setEntryMode("manual")
            setCurrentStep("product")
          }}
          isSubmitting={false}
          error={insufficientInfoError}
        />
      )
    }

    // Coffee Review
    if (
      aiState === "review" &&
      activeCategory === "coffee" &&
      coffeeExtractionResult &&
      coffeeEditedAttributes
    ) {
      return (
        <CoffeeAIExtractionReview
          extractionResult={coffeeExtractionResult}
          editedAttributes={coffeeEditedAttributes}
          onUpdateAttributes={(updated) => setCoffeeEditedAttributes(updated)}
          onConfirm={handleConfirmCoffeeAI}
          onStartOver={handleStartOver}
          onBackToDescription={() => setAIState("idle")}
          insufficientInfoError={insufficientInfoError}
        />
      )
    }

    // Tea Review
    if (
      aiState === "review" &&
      activeCategory === "tea" &&
      teaExtractionResult &&
      teaEditedAttributes
    ) {
      return (
        <AIExtractionReview
          extractionResult={teaExtractionResult}
          editedAttributes={teaEditedAttributes}
          onUpdateAttributes={(updated) => setTeaEditedAttributes(updated)}
          onConfirm={handleConfirmTeaAI}
          onStartOver={handleStartOver}
          onBackToDescription={() => setAIState("idle")}
          insufficientInfoError={insufficientInfoError}
        />
      )
    }

    if (aiState === "unsupported") {
      const productName =
        activeCategory === "spices"
          ? "Spices"
          : activeCategory === "coffee"
          ? "Coffee"
          : "Tea"
      const notes =
        activeCategory === "spices"
          ? spicesExtractionResult?.notes ??
            "TariffIQ currently supports Chapter 09 (0904–0910) Spice products. The description entered does not appear to describe a supported spice product."
          : activeCategory === "coffee"
          ? coffeeExtractionResult?.notes ??
            "TariffIQ currently supports Chapter 0901 Coffee products. The description entered does not appear to describe a coffee product."
          : teaExtractionResult?.notes ??
            "TariffIQ currently supports Chapter 0902 Tea products. The description entered does not match tea."

      return (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground">
                This product doesn&apos;t appear to be {productName}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {notes}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setAIState("idle")}
                className="gap-2"
                id="unsupported-try-again"
              >
                <RotateCcw className="h-4 w-4" />
                Enter another description
              </Button>
              <Button
                onClick={() => {
                  setEntryMode("manual")
                  setCurrentStep("product")
                }}
                className="gap-2"
                id="unsupported-manual"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Enter Details Manually
              </Button>
            </div>
          </div>
        </div>
      )
    }

    if (aiState === "error") {
      const activeResult =
        activeCategory === "spices"
          ? spicesExtractionResult
          : activeCategory === "coffee"
          ? coffeeExtractionResult
          : teaExtractionResult
      const errorCode = activeResult?.errorCode
      let friendlyError =
        "We couldn't analyze the description right now. You can try again or enter the product details manually."

      if (errorCode === "AI_PROVIDER_NOT_CONFIGURED") {
        friendlyError = "AI classification is not configured."
      } else if (errorCode === "AI_QUOTA_EXCEEDED" || errorCode === "AI_RATE_LIMITED") {
        friendlyError =
          "AI analysis is temporarily unavailable. You can continue by entering the product details manually."
      }

      return (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground">
                Couldn&apos;t analyze the description
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {friendlyError}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {errorCode !== "AI_PROVIDER_NOT_CONFIGURED" && (
                <Button
                  variant="outline"
                  onClick={() => handleAnalyzeAI(aiInputText)}
                  className="gap-2"
                  id="ai-error-try-again"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => {
                  setEntryMode("manual")
                  setCurrentStep("product")
                }}
                className="gap-2"
                id="ai-error-manual"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Enter Details Manually
              </Button>
            </div>
          </div>
        </div>
      )
    }
  }

  // 5. Manual Wizard Entry Path
  const isSpicesManual = activeCategory === "spices"

  // Tea requirement analysis
  const partialInput = buildInput(formState)
  const requiredInfo = getRequiredTeaInformation(partialInput)
  const isWeightRequired = requiredInfo.fieldStatus.netWeight === "required"

  // Determine navigation logic based on product
  let continueAllowed: boolean
  let blockedMessage: string | null

  if (isSpicesManual && currentStep !== "product") {
    continueAllowed = canContinueSpices(currentStep, spicesFormState)
    blockedMessage = continueAllowed
      ? null
      : continueBlockedMessageSpices(currentStep, spicesFormState)
  } else if (currentStep === "product") {
    continueAllowed = formState.product !== null || activeCategory !== null
    blockedMessage = continueAllowed ? null : "Select a product category to continue."
  } else {
    continueAllowed = canContinue(currentStep, formState, isWeightRequired)
    blockedMessage = continueAllowed
      ? null
      : continueBlockedMessage(currentStep, formState, isWeightRequired)
  }

  const isReviewStep = currentStep === "review" || currentStep === "spice-review"
  const continueLabel = isReviewStep ? "Run Classification" : "Continue"
  const continueIcon =
    isReviewStep ? (
      <FlaskConical className="h-4 w-4" />
    ) : (
      <ArrowRight className="h-4 w-4" />
    )

  // Dynamic progress steps
  const progressSteps = isSpicesManual
    ? (() => {
        const partial = buildSpicesInput(spicesFormState)
        const hasDetails = spiceDetailsStepHasFields(partial)
        if (hasDetails) return SPICES_STEPS
        return SPICES_STEPS.filter((s) => s.id !== "spice-details")
      })()
    : TEA_STEPS


  return (
    <div className="flex flex-col gap-6">
      {/* Top bar with back to path selection */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEntryMode("selection")}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          id="manual-switch-mode"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change Entry Mode
        </Button>
      </div>

      {/* Progress bar */}
      <ClassificationProgress currentStep={currentStep} steps={progressSteps} />

      <div className="h-px bg-border" />

      {/* Step content */}
      <div className={cn("animate-fade-in")}>
        {currentStep === "product" && (
          <ProductStep
            selected={formState.product ?? (activeCategory !== "tea" ? activeCategory : null)}
            onSelect={handleProductSelectManual}
          />
        )}

        {/* ── Tea Steps ── */}
        {currentStep === "tea-type" && (
          <TeaTypeStep
            selected={formState.teaType}
            onSelect={(v) => updateForm("teaType", v)}
          />
        )}

        {currentStep === "presentation" && (
          <PresentationStep
            selected={formState.presentation}
            onSelect={(v) => updateForm("presentation", v)}
          />
        )}

        {currentStep === "form" && (
          <FormStep
            selected={formState.form}
            onSelect={(v) => updateForm("form", v)}
          />
        )}

        {currentStep === "weight" && (
          <WeightStep
            netWeight={formState.netWeight}
            weightUnit={formState.weightUnit}
            isRequired={isWeightRequired}
            requirementReason={requiredInfo.reason}
            onWeightChange={(v) => updateForm("netWeight", v)}
            onUnitChange={(v) => updateForm("weightUnit", v)}
          />
        )}

        {currentStep === "review" && (
          <ReviewStep input={buildInput(formState)} onEdit={goToStep} />
        )}

        {/* ── Spices Steps ── */}
        {currentStep === "spice-type" && (
          <SpiceTypeStep
            selectedSpiceType={spicesFormState.spiceType}
            isCubeb={spicesFormState.isCubeb}
            essentialCharacter={spicesFormState.essentialCharacter}
            onSpiceTypeChange={(v) => updateSpicesForm("spiceType", v)}
            onIsCubebChange={(v) => updateSpicesForm("isCubeb", v)}
            onEssentialCharacterChange={(v) => updateSpicesForm("essentialCharacter", v)}
          />
        )}

        {currentStep === "spice-processing" && (
          <SpiceProcessingStep
            spiceType={spicesFormState.spiceType}
            crushedOrGround={spicesFormState.crushedOrGround}
            botanicalType={spicesFormState.botanicalType}
            processingState={spicesFormState.processingState}
            form={spicesFormState.form}
            onCrushedOrGroundChange={(v) => updateSpicesForm("crushedOrGround", v)}
            onBotanicalTypeChange={(v) => updateSpicesForm("botanicalType", v)}
            onProcessingStateChange={(v) => updateSpicesForm("processingState", v)}
            onFormChange={(v) => updateSpicesForm("form", v)}
          />
        )}

        {currentStep === "spice-details" && (
          <SpiceDetailsStep
            spiceType={spicesFormState.spiceType}
            crushedOrGround={spicesFormState.crushedOrGround}
            botanicalType={spicesFormState.botanicalType}
            processingState={spicesFormState.processingState}
            form={spicesFormState.form}
            subType={spicesFormState.subType}
            quality={spicesFormState.quality}
            sizeCategory={spicesFormState.sizeCategory}
            onSubTypeChange={(v) => updateSpicesForm("subType", v)}
            onQualityChange={(v) => updateSpicesForm("quality", v)}
            onSizeCategoryChange={(v) => updateSpicesForm("sizeCategory", v)}
          />
        )}

        {currentStep === "spice-review" && (
          <SpiceReviewStep
            spiceType={spicesFormState.spiceType}
            botanicalType={spicesFormState.botanicalType}
            crushedOrGround={spicesFormState.crushedOrGround}
            subType={spicesFormState.subType}
            form={spicesFormState.form}
            processingState={spicesFormState.processingState}
            quality={spicesFormState.quality}
            sizeCategory={spicesFormState.sizeCategory}
            isCubeb={spicesFormState.isCubeb}
            essentialCharacter={spicesFormState.essentialCharacter}
            onEdit={goToStep}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex flex-col gap-2 pt-2">
        {blockedMessage && (
          <p
            id="wizard-continue-hint"
            role="status"
            className="text-right text-xs text-muted-foreground"
          >
            {blockedMessage}
          </p>
        )}
        <div className="flex gap-3 justify-between">
          <Button
            variant="outline"
            onClick={handleBackManual}
            className="gap-2"
            id="wizard-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleContinueManualWrapped}
            disabled={!continueAllowed}
            aria-describedby={blockedMessage ? "wizard-continue-hint" : undefined}
            className="gap-2"
            id="wizard-continue"
          >
            {continueLabel}
            {continueIcon}
          </Button>
        </div>
      </div>
    </div>
  )
}
