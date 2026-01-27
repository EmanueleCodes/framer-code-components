import { addPropertyControls, ControlType, RenderTarget } from "framer"
import React, { useEffect, useRef } from "react"

/**
 * Simple Theme Switcher
 * 
 * Flow:
 * 1. On mount: Apply theme from localStorage (theme persists across reloads)
 * 2. Watch parent's variant via data-framer-name
 * 3. When variant changes (user clicks), update theme and save to localStorage
 * 
 * NOTE: We cannot restore the parent's visual variant on reload (Framer controls that).
 * But the THEME will be correct based on localStorage.
 */

const STORAGE_KEY = "themeVariantSimpleR"

// Extract theme tokens and apply them
const extractAndApplyTheme = (theme: "light" | "dark") => {
    if (typeof document === "undefined") return

    const tokens = { light: {} as Record<string, string>, dark: {} as Record<string, string> }

    // Extract tokens from stylesheets
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules || []) {
                // Get light mode tokens from body selector
                if ("selectorText" in rule && rule.selectorText === "body" && "style" in rule) {
                    const style = (rule as CSSStyleRule).style
                    for (let i = 0; i < style.length; i++) {
                        const prop = style[i]
                        if (prop.startsWith("--token-")) {
                            tokens.light[prop] = style.getPropertyValue(prop).trim()
                        }
                    }
                }

                // Get dark mode tokens from media query
                if (
                    "media" in rule &&
                    rule.media &&
                    // @ts-ignore
                    rule.media.mediaText?.includes("prefers-color-scheme: dark")
                ) {
                    // @ts-ignore
                    for (const innerRule of rule.cssRules || []) {
                        if (
                            "selectorText" in innerRule &&
                            innerRule.selectorText === "body" &&
                            "style" in innerRule
                        ) {
                            const style = (innerRule as CSSStyleRule).style
                            for (let i = 0; i < style.length; i++) {
                                const prop = style[i]
                                if (prop.startsWith("--token-")) {
                                    tokens.dark[prop] = style.getPropertyValue(prop).trim()
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // CORS issues - skip
        }
    }

    // Apply tokens to body
    const sourceTokens = theme === "dark" ? tokens.dark : tokens.light
    for (const [key, value] of Object.entries(sourceTokens)) {
        document.body.style.setProperty(key, value)
    }
    
    console.log(`[SimpleThemeSwitcher] Applied ${theme} theme (${Object.keys(sourceTokens).length} tokens)`)
}

// Get parent's variant from data-framer-name
const getParentVariant = (element: HTMLElement | null): string | null => {
    if (!element) return null
    
    const subparent = element.parentElement
    if (!subparent) return null
    
    const parent = subparent.parentElement
    if (!parent) return null

    // Only check data-framer-name (Framer's actual variant indicator)
    return parent.getAttribute("data-framer-name")
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */
export default function SimpleThemeSwitcher(props: {
    lightVariant?: string
    darkVariant?: string
    style?: React.CSSProperties
}) {
    const { lightVariant = "Variant 1", darkVariant = "Variant 2" } = props
    const componentRef = useRef<HTMLDivElement>(null)
    const lastVariantRef = useRef<string | null>(null)
    const restoredFromStorageRef = useRef(false)
    const isCanvas = RenderTarget.hasRestrictions()

    // On mount: Apply theme from localStorage
    useEffect(() => {
        if (isCanvas || typeof window === "undefined") return

        const savedVariant = localStorage.getItem(STORAGE_KEY)
        console.log("[SimpleThemeSwitcher] Mount - saved variant:", savedVariant)
        
        if (savedVariant) {
            const theme = savedVariant === darkVariant ? "dark" : "light"
            console.log("[SimpleThemeSwitcher] Applying theme from localStorage:", theme)
            extractAndApplyTheme(theme)
            lastVariantRef.current = savedVariant
            restoredFromStorageRef.current = true
            
            // Clear the flag after a delay to allow normal observer behavior
            setTimeout(() => {
                restoredFromStorageRef.current = false
                console.log("[SimpleThemeSwitcher] Storage restore protection cleared")
            }, 500)
        }
    }, [darkVariant, isCanvas])

    // Watch parent's variant and apply theme when it changes
    useEffect(() => {
        if (isCanvas || typeof window === "undefined") return

        const checkAndApplyTheme = (isUserAction: boolean = false) => {
            if (!componentRef.current) return

            const currentVariant = getParentVariant(componentRef.current)
            if (!currentVariant) return
            
            // Skip if variant hasn't changed
            if (currentVariant === lastVariantRef.current) return
            
            // Skip observer updates right after storage restore (unless it's been a while)
            if (restoredFromStorageRef.current && !isUserAction) {
                console.log("[SimpleThemeSwitcher] Skipping observer update - recently restored from storage")
                return
            }
            
            console.log("[SimpleThemeSwitcher] Variant changed:", lastVariantRef.current, "->", currentVariant)
            lastVariantRef.current = currentVariant

            // Derive and apply theme
            const theme = currentVariant === darkVariant ? "dark" : "light"
            console.log("[SimpleThemeSwitcher] Applying theme:", theme)
            extractAndApplyTheme(theme)

            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, currentVariant)
            console.log("[SimpleThemeSwitcher] Saved to localStorage:", currentVariant)
        }

        // Check on mount (but only if no saved variant was applied)
        if (!lastVariantRef.current) {
            checkAndApplyTheme(false)
        }

        // Watch for variant changes
        const subparent = componentRef.current?.parentElement
        const parent = subparent?.parentElement
        
        if (parent) {
            const observer = new MutationObserver(() => {
                // Delay slightly to distinguish from initial render
                setTimeout(() => checkAndApplyTheme(false), 50)
            })
            observer.observe(parent, {
                attributes: true,
                attributeFilter: ["data-framer-name"],
            })

            return () => observer.disconnect()
        }
    }, [lightVariant, darkVariant, isCanvas])

    return (
        <div
            ref={componentRef}
            style={{
                ...props.style,
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
            }}
        />
    )
}

addPropertyControls(SimpleThemeSwitcher, {
    lightVariant: {
        type: ControlType.String,
        title: "Light Variant Name",
        defaultValue: "Variant 1",
        description: "The exact name of the variant for light theme",
    },
    darkVariant: {
        type: ControlType.String,
        title: "Dark Variant Name",
        defaultValue: "Variant 2",
        description: "The exact name of the variant for dark theme",
    },
})

SimpleThemeSwitcher.displayName = "Simple Theme Switcher"
