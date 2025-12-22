/**
 * ROI Calculator - Form Input & Calculation Overrides
 *
 * This file contains overrides for:
 * - Form input handling (GMV, AOV, LMN, Transaction Volume, Email)
 * - Calculations (Incremental GMV, ROI)
 * - Form validation (including work email validation)
 * - Step listeners for individual components
 * - Button interactions (including email button disable/enable)
 * - Error message display
 *
 * For FLOW CONTROL overrides (withOneStepFlow, withThreeStepFlow, etc.),
 * see FlowSteps.tsx
 */

import type { ComponentType } from "react"
import { useEffect, useState } from "react"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// Hide number input spinners (up/down arrows)
if (typeof document !== "undefined") {
    const style = document.createElement("style")
    style.textContent = `
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
    `
    document.head.appendChild(style)
}

interface OverrideProps {
    style?: React.CSSProperties
    text?: string
    value?: string
    nextStep?: number
    [key: string]: unknown
}

export const useFormStore = createStore({
    merchantGMV: 0,
    averageOrderValue: 0,
    lmnAttachRate: 0,
    transactionVolume: 0,
    isFormValid: false,
    workEmail: "",
    isWorkEmailValid: false,
})

export const useVariantStore = createStore({
    currentStep: 1,
    flowType: "1to2to3",
    isInitialized: false,
    resetCounter: 0,
    errors: {
        merchantGMV: false,
        averageOrderValue: false,
        lmnAttachRate: false,
    },
    emailErrorVisible: false,
})

// Constants for calculations
const VOLUME_UPLIFT = 0.1 // 10%
const TRANSACTION_FEE_PERCENT = 0.045 // 4.50%
const TRANSACTION_FEE_DOLLAR = 0.3 // $0.30
const LMN_FEE = 10 // $10

// Utility function to format currency
function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

// Utility function to format number with commas and up to 2 decimals
function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

// Utility function to parse input value
function parseInputValue(value: string): number {
    const cleaned = value.replace(/[^0-9.]/g, "")
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : Math.floor(parsed)
}

function configureNumericInput(input: HTMLInputElement): void {
    if (input.getAttribute("data-has-commas") === "true") {
        return
    }

    input.setAttribute("type", "text")
    input.setAttribute("inputmode", "numeric")
    input.setAttribute("data-has-commas", "true")
}

// 1. withGMV - Reads and validates Merchant Annual GMV input
export function withGMV<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [variantStore] = useVariantStore()
        const [localValue, setLocalValue] = useState("")

        // Initialize input value from store on mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="MerchantGMV"]'
            ) as HTMLInputElement

            if (!input) {
                return
            }

            configureNumericInput(input)

            const targetValue =
                store.merchantGMV > 0 ? formatNumber(store.merchantGMV) : ""

            if (input.value !== targetValue) {
                input.value = targetValue
            }

            setLocalValue((current) =>
                current === targetValue ? current : targetValue
            )
        }, [store.merchantGMV])

        useEffect(() => {
            const interval = setInterval(() => {
                const input = document.querySelector(
                    'input[name="MerchantGMV"]'
                ) as HTMLInputElement

                if (!input) {
                    return
                }

                configureNumericInput(input)

                const rawValue = input.value

                if (rawValue === localValue) {
                    return
                }

                const digitsOnly = rawValue.replace(/[^0-9]/g, "")

                if (digitsOnly === "") {
                    if (localValue !== "") {
                        setLocalValue("")
                    }

                    if (input.value !== "") {
                        input.value = ""
                    }

                    if (store.merchantGMV !== 0) {
                        setStore({
                            ...store,
                            merchantGMV: 0,
                        })
                    }

                    return
                }

                const parsedValue = parseInputValue(rawValue)
                const formattedValue = formatNumber(parsedValue)

                if (input.value !== formattedValue) {
                    input.value = formattedValue
                }

                if (localValue !== formattedValue) {
                    setLocalValue(formattedValue)
                }

                if (parsedValue !== store.merchantGMV) {
                    setStore({
                        ...store,
                        merchantGMV: parsedValue,
                    })
                }
            }, 100)

            return () => clearInterval(interval)
        }, [localValue, store, setStore])

        // Determine variant based on error state
        const hasError = variantStore.showInputErrors && store.merchantGMV <= 0
        const variant = hasError ? "Error" : undefined

        return <Component {...props} variant={variant} />
    }
}

// 2. withAOV - Reads and validates Average Order Value input
export function withAOV<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [variantStore] = useVariantStore()
        const [localValue, setLocalValue] = useState("")

        // Initialize input value from store on mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="AOV"]'
            ) as HTMLInputElement

            if (!input) {
                return
            }

            configureNumericInput(input)

            const targetValue =
                store.averageOrderValue > 0
                    ? formatNumber(store.averageOrderValue)
                    : ""

            if (input.value !== targetValue) {
                input.value = targetValue
            }

            setLocalValue((current) =>
                current === targetValue ? current : targetValue
            )
        }, [store.averageOrderValue])

        useEffect(() => {
            const interval = setInterval(() => {
                const input = document.querySelector(
                    'input[name="AOV"]'
                ) as HTMLInputElement

                if (!input) {
                    return
                }

                configureNumericInput(input)

                const rawValue = input.value

                if (rawValue === localValue) {
                    return
                }

                const digitsOnly = rawValue.replace(/[^0-9]/g, "")

                if (digitsOnly === "") {
                    if (localValue !== "") {
                        setLocalValue("")
                    }

                    if (input.value !== "") {
                        input.value = ""
                    }

                    if (store.averageOrderValue !== 0) {
                        setStore({
                            ...store,
                            averageOrderValue: 0,
                        })
                    }

                    return
                }

                const parsedValue = parseInputValue(rawValue)
                const formattedValue = formatNumber(parsedValue)

                if (input.value !== formattedValue) {
                    input.value = formattedValue
                }

                if (localValue !== formattedValue) {
                    setLocalValue(formattedValue)
                }

                if (parsedValue !== store.averageOrderValue) {
                    setStore({
                        ...store,
                        averageOrderValue: parsedValue,
                    })
                }
            }, 100)

            return () => clearInterval(interval)
        }, [localValue, store, setStore])

        // Determine variant based on error state
        const hasError = variantStore.showInputErrors && store.averageOrderValue <= 0
        const variant = hasError ? "Error" : undefined

        return <Component {...props} variant={variant} />
    }
}

// 3. withLMN - Reads and validates LMN Attach Rate input
export function withLMN<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [variantStore] = useVariantStore()
        const [localValue, setLocalValue] = useState("")

        // Initialize input value from store on mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="LMN"]'
            ) as HTMLInputElement

            if (!input) {
                return
            }

            configureNumericInput(input)

            const percentageValue = Math.floor(store.lmnAttachRate * 100)
            const targetValue =
                percentageValue > 0 ? formatNumber(percentageValue) : ""

            if (input.value !== targetValue) {
                input.value = targetValue
            }

            setLocalValue((current) =>
                current === targetValue ? current : targetValue
            )
        }, [store.lmnAttachRate])

        useEffect(() => {
            const interval = setInterval(() => {
                const input = document.querySelector(
                    'input[name="LMN"]'
                ) as HTMLInputElement

                if (!input) {
                    return
                }

                configureNumericInput(input)

                const rawValue = input.value

                if (rawValue === localValue) {
                    return
                }

                const digitsOnly = rawValue.replace(/[^0-9]/g, "")

                if (digitsOnly === "") {
                    if (localValue !== "") {
                        setLocalValue("")
                    }

                    if (input.value !== "") {
                        input.value = ""
                    }

                    if (store.lmnAttachRate !== 0) {
                        setStore({
                            ...store,
                            lmnAttachRate: 0,
                        })
                    }

                    return
                }

                const parsedValue = parseInputValue(rawValue)
                const formattedValue = formatNumber(parsedValue)

                if (input.value !== formattedValue) {
                    input.value = formattedValue
                }

                if (localValue !== formattedValue) {
                    setLocalValue(formattedValue)
                }

                const decimalValue = parsedValue / 100

                if (decimalValue !== store.lmnAttachRate) {
                    setStore({
                        ...store,
                        lmnAttachRate: decimalValue,
                    })
                }
            }, 100)

            return () => clearInterval(interval)
        }, [localValue, store, setStore])

        // Determine variant based on error state
        const hasError = variantStore.showInputErrors && store.lmnAttachRate <= 0
        const variant = hasError ? "Error" : undefined

        return <Component {...props} variant={variant} />
    }
}

// 4. withTransactionVolume - Calculates and displays Transaction Volume
// Can be applied to TEXT element (for display only) or INPUT element (for display + update)
export function withTransactionVolume<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [displayValue, setDisplayValue] = useState("0")

        // Initialize transaction volume to 0 on component mount and make it non-focusable
        useEffect(() => {
            const input = document.querySelector(
                'input[name="TransactionVolume"]'
            ) as HTMLInputElement

            if (input) {
                configureNumericInput(input)
                input.value = "0"
                input.setAttribute("tabindex", "-1")
                input.setAttribute("readonly", "true")
            }
        }, [])

        useEffect(() => {
            const { merchantGMV, averageOrderValue } = store

            // Calculate Transaction Volume as an integer
            let transactionVolume = 0
            if (averageOrderValue > 0) {
                transactionVolume = Math.floor(merchantGMV / averageOrderValue)
            }

            // Update store with calculated value (only if significantly changed to avoid loops)
            const difference = Math.abs(
                store.transactionVolume - transactionVolume
            )

            if (difference > 0) {
                setStore({
                    ...store,
                    transactionVolume,
                })
            }

            // Format for display with commas and up to 2 decimals
            const formatted =
                transactionVolume > 0 ? formatNumber(transactionVolume) : "0"

            setDisplayValue(formatted)

            // Also update the input field if it exists
            // NOTE: Use unformatted value for input (no commas) - HTML number inputs reject commas
            const input = document.querySelector(
                'input[name="TransactionVolume"]'
            ) as HTMLInputElement

            if (input) {
                const formattedInput =
                    transactionVolume > 0
                        ? formatNumber(transactionVolume)
                        : "0"

                if (input.value !== formattedInput) {
                    input.value = formattedInput
                }

                // Ensure it remains non-focusable and readonly
                input.setAttribute("tabindex", "-1")
                input.setAttribute("readonly", "true")
            }
        }, [
            store.merchantGMV,
            store.averageOrderValue,
            store.transactionVolume,
            setStore,
        ])

        return (
            <Component
                {...props}
                text={displayValue}
                style={{
                    ...props.style,
                    opacity: store.transactionVolume > 0 ? 1 : 0.5,
                }}
            />
        )
    }
}

// 5. withIncrementalGMV - Calculates and displays Incremental GMV
export function withIncrementalGMV<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()
        const [displayValue, setDisplayValue] = useState("$0")

        useEffect(() => {
            const { merchantGMV } = store

            // Calculate Incremental GMV
            const incrementalGMV = merchantGMV * VOLUME_UPLIFT

            // Format for display
            setDisplayValue(formatCurrency(incrementalGMV))
        }, [store.merchantGMV])

        return <Component {...props} text={displayValue} />
    }
}

// 6. withROI - Calculates and displays Merchant ROI (Flex)
export function withROI<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()
        const [displayValue, setDisplayValue] = useState("0.00x")

        useEffect(() => {
            const { merchantGMV, transactionVolume, lmnAttachRate } = store

            // Calculate Incremental GMV
            const incrementalGMV = merchantGMV * VOLUME_UPLIFT

            // Calculate Total Flex Fee
            const component1 =
                TRANSACTION_FEE_PERCENT *
                merchantGMV *
                (1 + VOLUME_UPLIFT) *
                VOLUME_UPLIFT
            const component2 =
                TRANSACTION_FEE_DOLLAR * transactionVolume * VOLUME_UPLIFT
            const component3 =
                LMN_FEE * transactionVolume * VOLUME_UPLIFT * lmnAttachRate

            const totalFlexFee = component1 + component2 + component3

            // Calculate ROI
            let roi = 0
            if (totalFlexFee > 0) {
                roi = incrementalGMV / totalFlexFee
            }

            // Format for display
            setDisplayValue(`${roi.toFixed(2)}x`)
        }, [store.merchantGMV, store.transactionVolume, store.lmnAttachRate])

        return <Component {...props} text={displayValue} />
    }
}

// Helper function for form validation
function validateForm(
    formStore: Record<string, number>
): Record<string, boolean> {
    return {
        merchantGMV: formStore.merchantGMV <= 0,
        averageOrderValue: formStore.averageOrderValue <= 0,
        lmnAttachRate: formStore.lmnAttachRate <= 0,
    }
}

// 7. withStepListener - Apply to INDIVIDUAL COMPONENTS (Desktop, Tablet, Phone)
// Simply reads the currentStep from the store and applies the correct variant
// Does NOT modify the store - purely reactive
export function withStepListener<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore] = useVariantStore()
        const [localVariant, setLocalVariant] = useState<string>("Step 1")

        // Map step number to variant name
        const variantMap: Record<number, string> = {
            1: "Step 1",
            2: "Step 2",
            3: "Step 3",
        }

        // Update local variant whenever store changes
        useEffect(() => {
            const targetVariant =
                variantMap[variantStore.currentStep] || "Step 1"
            console.log("🎨 withStepListener: store changed", {
                currentStep: variantStore.currentStep,
                targetVariant,
                currentLocalVariant: localVariant,
            })
            setLocalVariant(targetVariant)
        }, [variantStore.currentStep])

        console.log("🎨 withStepListener: rendering", {
            currentStep: variantStore.currentStep,
            localVariant,
            propsVariant: props.variant,
        })

        return <Component {...props} variant={localVariant} />
    }
}

// 8. withStepButton - Apply to BUTTON to advance from Step 1 ONLY
// Determines next step based on flowType:
// - "1to3": Step 1 → Step 3
// - "1to2to3": Step 1 → Step 2
// All other transitions (Step 2 → Step 3) are handled by Framer variants
export function withStepButton<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [formStore] = useFormStore()
        const [variantStore, setVariantStore] = useVariantStore()

        const handleClick = () => {
            console.log("🔘 withStepButton: button clicked", {
                currentStep: variantStore.currentStep,
                flowType: variantStore.flowType,
                formStore,
            })

            // ONLY handle clicks when on Step 1
            if (variantStore.currentStep !== 1) {
                console.log("⚠️ withStepButton: ignoring click, not on Step 1")
                return
            }

            // Clear all error messages first
            clearErrorMessages()

            // Validate all required fields
            const errors = validateForm(formStore)
            const hasErrors = Object.values(errors).some(Boolean)

            console.log("✅ withStepButton: validation result", {
                errors,
                hasErrors,
            })

            if (hasErrors) {
                console.log("❌ withStepButton: showing errors")
                displayErrorMessages(errors)
            } else {
                // Determine next step based on flow type
                let nextStep = 2 // Default to Step 2

                if (variantStore.flowType === "1to3") {
                    nextStep = 3 // Skip to Step 3
                } else if (variantStore.flowType === "1to2to3") {
                    nextStep = 2 // Go to Step 2 (email gate)
                }

                console.log("🚀 withStepButton: advancing to next step", {
                    flowType: variantStore.flowType,
                    nextStep,
                })

                setVariantStore({
                    ...variantStore,
                    currentStep: nextStep,
                    errors: {
                        merchantGMV: false,
                        averageOrderValue: false,
                        lmnAttachRate: false,
                    },
                })
            }
        }

        return <Component {...props} onClick={handleClick} />
    }
}

// Helper function to clear all error messages
function clearErrorMessages(): void {
    document.querySelectorAll("[data-error-message]").forEach((el) => {
        el.remove()
    })
}

// Helper function to display error messages
function displayErrorMessages(errors: Record<string, boolean>): void {
    // Add error messages for invalid fields
    if (errors.merchantGMV) {
        addErrorMessage("MerchantGMV", "This field is required")
    }
    if (errors.averageOrderValue) {
        addErrorMessage("AOV", "This field is required")
    }
    if (errors.lmnAttachRate) {
        addErrorMessage("LMN", "This field is required")
    }
}

// Helper function to add an error message below an input
function addErrorMessage(inputName: string, message: string): void {
    const input = document.querySelector(
        `input[name="${inputName}"]`
    ) as HTMLInputElement

    if (!input) return

    // Create error message element
    const errorEl = document.createElement("div")
    errorEl.setAttribute("data-error-message", inputName)
    errorEl.style.cssText = `
        display: flex;
        width:100%;
        text-align:right;
        position:absolute;
        opacity:1;
        bottom:-22px;
        right:0,
        color:#060045;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: -1.5%;
        white-space: nowrap;
    `
    errorEl.textContent = message

    // Insert after input in the DOM
    input.parentElement?.parentElement?.appendChild(errorEl)
}

// List of common personal email domains to reject
const PERSONAL_DOMAINS = [
    "gmail.com",
    "gmail.co",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "aol.com",
    "protonmail.com",
    "mail.com",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "live.com",
    "msn.com",
    "me.com",
    "mac.com",
]

// Utility function to validate work email
// Returns true if email is valid and NOT from a personal domain
function isWorkEmail(email: string): boolean {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return false
    }

    // Extract domain from email
    const domain = email.split("@")[1]?.toLowerCase()

    // Check if domain is in the personal domains list
    return !PERSONAL_DOMAINS.includes(domain)
}

// 9. withWorkEmailCheck - Validates work email input
export function withWorkEmailCheck<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [variantStore, setVariantStore] = useVariantStore()
        const [localValue, setLocalValue] = useState("")

        // Initialize input value from store on mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="Email"]'
            ) as HTMLInputElement

            if (!input) {
                return
            }

            const targetValue = store.workEmail || ""

            if (input.value !== targetValue) {
                input.value = targetValue
            }

            setLocalValue((current) =>
                current === targetValue ? current : targetValue
            )
        }, [store.workEmail])

        // Monitor input changes
        useEffect(() => {
            const interval = setInterval(() => {
                const input = document.querySelector(
                    'input[name="Email"]'
                ) as HTMLInputElement

                if (!input) {
                    return
                }

                const rawValue = input.value.trim()

                if (rawValue === localValue) {
                    return
                }

                setLocalValue(rawValue)

                // Validate email
                const isValid = isWorkEmail(rawValue)

                // Check if user started typing email
                const emailStarted = rawValue.length > 0

                // Check if inputs are invalid
                const inputsInvalid =
                    store.merchantGMV <= 0 ||
                    store.averageOrderValue <= 0 ||
                    store.lmnAttachRate <= 0

                // Update store
                if (
                    rawValue !== store.workEmail ||
                    isValid !== store.isWorkEmailValid
                ) {
                    setStore({
                        ...store,
                        workEmail: rawValue,
                        isWorkEmailValid: isValid,
                    })

                    // Hide error message when typing a valid email
                    if (isValid && variantStore.emailErrorVisible) {
                        setVariantStore({
                            ...variantStore,
                            emailErrorVisible: false,
                        })
                    }
                }

                // Show input errors when user starts typing email and inputs are invalid
                // Hide errors when all inputs are filled or email is cleared
                const shouldShowInputErrors = emailStarted && inputsInvalid
                
                if (shouldShowInputErrors !== variantStore.showInputErrors) {
                    setVariantStore({
                        ...variantStore,
                        showInputErrors: shouldShowInputErrors,
                    })
                }
            }, 100)

            return () => clearInterval(interval)
        }, [localValue, store, setStore, variantStore, setVariantStore])

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                const target = e.target as HTMLInputElement
                const val = target.value?.trim() || ""

                // Check validity directly
                if (!isWorkEmail(val)) {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
        }

        return <Component {...props} onKeyDown={handleKeyDown} />
    }
}

// 10. withDisableEmailButton - Disables button when email is invalid or inputs are incomplete
export function withDisableEmailButton<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [formStore] = useFormStore()
        const [variantStore, setVariantStore] = useVariantStore()

        // Check if inputs are invalid
        const inputsInvalid =
            formStore.merchantGMV <= 0 ||
            formStore.averageOrderValue <= 0 ||
            formStore.lmnAttachRate <= 0

        // Determine button variant based on email validity and input validity
        const isDisabled = !formStore.isWorkEmailValid || inputsInvalid
        const buttonVariant = isDisabled ? "Disabled" : "Default"

        return (
            <>

            {isDisabled ?
                <Component
                {...props}
                variant={buttonVariant}
                style={{
                    ...props.style,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                }}
                onClick={(e:Event)=>{e.preventDefault()}}
            />
                :
                <Component
                {...props}
                
                style={{
                    ...props.style,
                }}
            />
            }
            </>
            
        )
    }
}

// 11. withShowErrorMessage - Shows error message when email uses a personal domain
export function withShowErrorMessage<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()

        // Check if current email uses a personal domain
        const domain = store.workEmail.split("@")[1]?.toLowerCase()
        const isPersonal = domain && PERSONAL_DOMAINS.includes(domain)

        // Show error message ONLY if it's a personal email domain
        const shouldShow = isPersonal

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: shouldShow ? 1 : 0,
                    pointerEvents: shouldShow ? "auto" : "none",
                }}
            />
        )
    }
}

