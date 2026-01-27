/**
 * EXAMPLE: How to use variant persistence in your parent component
 * 
 * This shows how to listen to the themeVariantRestore event and apply the variant
 * to your parent component that contains ThemeSwitcher.
 * 
 * Apply this override to your parent component that has variants for light/dark themes.
 */

import { Override } from "framer"
import { useEffect, useState } from "react"

export const VariantPersistenceExample: Override = (props) => {
    const [variant, setVariant] = useState<string | undefined>(props.variant)

    useEffect(() => {
        // Listen for variant restore events from ThemeSwitcher
        const handleVariantRestore = (e: CustomEvent) => {
            const savedVariant = e.detail.variant
            console.log("[Parent] Restoring variant from ThemeSwitcher:", savedVariant)
            
            // Apply the variant to this component
            setVariant(savedVariant)
        }

        // Check localStorage on mount
        const savedVariant = typeof window !== "undefined" 
            ? localStorage.getItem("themeVariant") 
            : null
        
        if (savedVariant) {
            console.log("[Parent] Found saved variant in localStorage:", savedVariant)
            setVariant(savedVariant)
        }

        // Listen for restore events
        window.addEventListener("themeVariantRestore", handleVariantRestore as EventListener)
        
        return () => {
            window.removeEventListener("themeVariantRestore", handleVariantRestore as EventListener)
        }
    }, [])

    return {
        ...props,
        variant: variant || props.variant, // Use restored variant or fallback to prop
    }
}
