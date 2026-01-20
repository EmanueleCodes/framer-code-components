import { useEffect, useRef } from "react"
import { useFormStore } from "./Overrides.tsx"

/**
 * HiddenInputs Component
 * 
 * Creates 4 hidden input fields that are constantly updated by listening to the visible input fields.
 * These inputs can be used for form submission or integration with other systems.
 * 
 * Hidden Inputs:
 * - GMV (listens to input[name="MerchantGMV"])
 * - AOV (listens to input[name="AOV"])
 * - Transaction-Volume (listens to input[name="TransactionVolume"])
 * - LMN (listens to input[name="LMN"])
 */
export default function HiddenInputs() {
    const [formStore] = useFormStore()
    const gmvRef = useRef<HTMLInputElement>(null)
    const aovRef = useRef<HTMLInputElement>(null)
    const transactionVolumeRef = useRef<HTMLInputElement>(null)
    const lmnRef = useRef<HTMLInputElement>(null)

    // Listen to MerchantGMV input and update GMV hidden input
    useEffect(() => {
        const updateGMV = () => {
            const sourceInput = document.querySelector(
                'input[name="MerchantGMV"]'
            ) as HTMLInputElement
            if (sourceInput && gmvRef.current) {
                // Extract numeric value (remove commas and formatting)
                const numericValue = sourceInput.value.replace(/[^0-9]/g, "")
                gmvRef.current.value = numericValue || "0"
            }
        }

        // Initial update
        updateGMV()

        // Set up interval to constantly listen for changes
        const interval = setInterval(updateGMV, 100)

        return () => clearInterval(interval)
    }, [])

    // Listen to AOV input and update AOV hidden input
    useEffect(() => {
        const updateAOV = () => {
            const sourceInput = document.querySelector(
                'input[name="AOV"]'
            ) as HTMLInputElement
            if (sourceInput && aovRef.current) {
                // Extract numeric value (remove commas and formatting)
                const numericValue = sourceInput.value.replace(/[^0-9]/g, "")
                aovRef.current.value = numericValue || "0"
            }
        }

        // Initial update
        updateAOV()

        // Set up interval to constantly listen for changes
        const interval = setInterval(updateAOV, 100)

        return () => clearInterval(interval)
    }, [])

    // Listen to TransactionVolume input and update Transaction-Volume hidden input
    useEffect(() => {
        const updateTransactionVolume = () => {
            const sourceInput = document.querySelector(
                'input[name="TransactionVolume"]'
            ) as HTMLInputElement
            if (sourceInput && transactionVolumeRef.current) {
                // Extract numeric value (remove commas and formatting)
                const numericValue = sourceInput.value.replace(/[^0-9]/g, "")
                transactionVolumeRef.current.value = numericValue || "0"
            }
        }

        // Initial update
        updateTransactionVolume()

        // Set up interval to constantly listen for changes
        const interval = setInterval(updateTransactionVolume, 100)

        return () => clearInterval(interval)
    }, [])

    // Listen to LMN input and update LMN hidden input
    useEffect(() => {
        const updateLMN = () => {
            const sourceInput = document.querySelector(
                'input[name="LMN"]'
            ) as HTMLInputElement
            if (sourceInput && lmnRef.current) {
                // Extract numeric value (remove commas and formatting)
                const numericValue = sourceInput.value.replace(/[^0-9]/g, "")
                lmnRef.current.value = numericValue || "0"
            }
        }

        // Initial update
        updateLMN()

        // Set up interval to constantly listen for changes
        const interval = setInterval(updateLMN, 100)

        return () => clearInterval(interval)
    }, [])

    return (
        <div style={{ display: "none" }}>
            <input
                ref={gmvRef}
                type="hidden"
                name="GMV"
                defaultValue="0"
            />
            <input
                ref={aovRef}
                type="hidden"
                name="AOV"
                defaultValue="0"
            />
            <input
                ref={transactionVolumeRef}
                type="hidden"
                name="Transaction-Volume"
                defaultValue="0"
            />
            <input
                ref={lmnRef}
                type="hidden"
                name="LMN"
                defaultValue="0"
            />
        </div>
    )
}
