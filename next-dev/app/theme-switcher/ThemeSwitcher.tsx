import { addPropertyControls, ControlType, RenderTarget } from "framer"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

/**
 * VARIANT PERSISTENCE (No Overrides Required - Variant is Source of Truth):
 * 
 * This component uses VARIANT as the single source of truth:
 * 1. Set the "Light Variant Name" and "Dark Variant Name" props to match your parent component's variant names
 * 2. On mount, finds parent's parent component and sets its variant attribute
 * 3. Theme is derived from variant, not saved separately
 * 
 * How it works:
 * - VARIANT is saved to localStorage (not theme)
 * - On mount: reads variant from localStorage, sets parent's parent variant, derives theme from variant
 * - On theme prop change: converts theme to variant, saves variant, derives theme from variant
 * - Only affects parent's parent component on initialization - does not interfere with Framer's variant system
 */

// Function to find and update parent's parent component variant (initialization only)
// Variant is the source of truth - we derive theme from variant
const initializeParentVariant = (variantName: string, elementRef?: HTMLElement | null, lightVariant?: string, darkVariant?: string) => {
    if (typeof window === "undefined" || typeof document === "undefined") return false
    
    console.log("[ThemeSwitcher] Initializing parent's parent variant to:", variantName)
    
    // Find parent's parent component - look for Framer component wrapper
    const findParentsParent = (startElement?: HTMLElement | null): HTMLElement | null => {
        if (!startElement) {
            console.log("[ThemeSwitcher] No starting element provided")
            return null
        }
        
        console.log("[ThemeSwitcher] Starting from element:", startElement.tagName, startElement.className)
        
        // Go up to parent
        const parent = startElement.parentElement
        if (!parent) {
            console.log("[ThemeSwitcher] No parent element found")
            return null
        }
        console.log("[ThemeSwitcher] Parent element:", parent.tagName, parent.className, parent.hasAttribute('data-framer-name') ? parent.getAttribute('data-framer-name') : 'no framer-name')
        
        // Go up to parent's parent
        const parentsParent = parent.parentElement
        if (!parentsParent) {
            console.log("[ThemeSwitcher] No parent's parent element found")
            return null
        }
        console.log("[ThemeSwitcher] Parent's parent element:", parentsParent.tagName, parentsParent.className, parentsParent.hasAttribute('data-framer-name') ? parentsParent.getAttribute('data-framer-name') : 'no framer-name')
        
        // Check if parent's parent has data-framer-name (it's a Framer component)
        if (parentsParent.hasAttribute('data-framer-name')) {
            const componentName = parentsParent.getAttribute('data-framer-name') || 'unknown'
            console.log("[ThemeSwitcher] ✅ Found parent's parent component:", componentName)
            return parentsParent
        }
        
        // If not found, try going up more levels to find a Framer component
        let current = parentsParent.parentElement
        let depth = 0
        const maxDepth = 5
        
        while (current && depth < maxDepth) {
            console.log("[ThemeSwitcher] Checking level", depth + 3, ":", current.tagName, current.className, current.hasAttribute('data-framer-name') ? current.getAttribute('data-framer-name') : 'no framer-name')
            
            if (current.hasAttribute('data-framer-name')) {
                const componentName = current.getAttribute('data-framer-name') || 'unknown'
                console.log("[ThemeSwitcher] ✅ Found parent's parent component at depth", depth + 3, ":", componentName)
                return current
            }
            
            current = current.parentElement
            depth++
        }
        
        console.log("[ThemeSwitcher] ❌ Could not find parent's parent component with data-framer-name")
        return null
    }
    
    const parentsParentComponent = findParentsParent(elementRef)
    
    if (parentsParentComponent) {
        const componentName = parentsParentComponent.getAttribute('data-framer-name') || 'unknown'
        console.log("[ThemeSwitcher] Setting parent's parent component variant:", componentName, "to", variantName)
        
        // Function to set variant - will be called multiple times
        const setVariant = () => {
            // Set the variant attribute - this is the source of truth
            parentsParentComponent.setAttribute('variant', variantName)
            
            // Also try setting it as a data attribute
            parentsParentComponent.setAttribute('data-variant', variantName)
            
            // Update class names - Framer might be reading variant from class
            const currentClasses = parentsParentComponent.className
            // Remove any existing variant class (Variant 1, Variant 2, etc.)
            const cleanedClasses = currentClasses.split(' ').filter(cls => 
                !cls.startsWith('Variant ') && !cls.includes('Variant')
            ).join(' ')
            // Add the correct variant to class name
            parentsParentComponent.className = `${cleanedClasses} ${variantName}`.trim()
            
            console.log("[ThemeSwitcher] Updated classes to:", parentsParentComponent.className)
            
            // Try to find React fiber/instance and update props directly
            // @ts-ignore
            const reactKey = Object.keys(parentsParentComponent).find(key => 
                key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
            )
            
            if (reactKey) {
                // @ts-ignore
                const fiber = parentsParentComponent[reactKey]
                if (fiber) {
                    try {
                        // Try to update memoizedProps
                        if (fiber.memoizedProps) {
                            fiber.memoizedProps.variant = variantName
                        }
                        // Try to update pendingProps
                        if (fiber.pendingProps) {
                            fiber.pendingProps.variant = variantName
                        }
                        // Try to update stateNode props if it's a class component
                        if (fiber.stateNode && fiber.stateNode.props) {
                            fiber.stateNode.props.variant = variantName
                        }
                        console.log("[ThemeSwitcher] Updated React fiber props for variant")
                    } catch (e) {
                        console.log("[ThemeSwitcher] Could not update React fiber:", e)
                    }
                }
            }
        }
        
        // Set immediately
        setVariant()
        
        // Set using requestAnimationFrame to ensure it happens after Framer's render
        requestAnimationFrame(() => {
            setVariant()
            requestAnimationFrame(setVariant) // Double RAF for safety
        })
        
        // Use MutationObserver to keep variant set if Framer tries to change it
        const observer = new MutationObserver((mutations) => {
            const currentVariant = parentsParentComponent.getAttribute('variant') || 
                                 parentsParentComponent.getAttribute('data-variant')
            if (currentVariant !== variantName) {
                console.log("[ThemeSwitcher] ⚠️ Variant changed to", currentVariant, "- restoring to", variantName)
                setVariant()
            }
        })
        
        observer.observe(parentsParentComponent, {
            attributes: true,
            attributeFilter: ['variant', 'data-variant', 'class']
        })
        
        // Keep observer active for 5 seconds to catch any late changes
        setTimeout(() => {
            observer.disconnect()
            console.log("[ThemeSwitcher] Stopped observing variant changes")
        }, 5000)
        
        // Derive theme from variant and apply it
        const theme = variantName === darkVariant ? 'dark' : 'light'
        console.log("[ThemeSwitcher] Derived theme from variant:", theme)
        
        // Apply theme based on variant
        const htmlElement = document.getElementsByTagName("html")[0]
        const bodyElement = document.getElementsByTagName("body")[0]
        if (htmlElement && bodyElement) {
            htmlElement.setAttribute("toggle-theme", theme)
            bodyElement.setAttribute("toggle-theme", theme)
        }
        
        console.log("[ThemeSwitcher] ✅ Variant and theme set on parent's parent component with persistence")
        return true
    } else {
        console.log("[ThemeSwitcher] ❌ Could not find parent's parent component to set variant")
        return false
    }
}

// Apply theme based on variant - variant is the source of truth
const applyThemeFromVariant = (variantName: string, lightVariant: string, darkVariant: string) => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    // Derive theme from variant
    const theme = variantName === darkVariant ? 'dark' : 'light'
    
    console.log("[ThemeSwitcher] Applying theme from variant:", variantName, "->", theme)

    const htmlElement = document.getElementsByTagName("html")[0]
    const bodyElement = document.getElementsByTagName("body")[0]

    if (htmlElement && bodyElement) {
        htmlElement.setAttribute("toggle-theme", theme)
        bodyElement.setAttribute("toggle-theme", theme)
    }
    
    // Save ONLY variant to localStorage (variant is the source of truth)
    localStorage.setItem("themeVariant", variantName)
    console.log("[ThemeSwitcher] Saved variant to localStorage (source of truth):", variantName)

    // Dispatch events
    const themeEvent = new CustomEvent("themeChange", { 
        detail: { theme, variant: variantName } 
    })
    window.dispatchEvent(themeEvent)
}

// Extract tokens - try both conditionText (Framer preview) and rule.media.mediaText (production)
function extractAndApplyThemeTokens(): { lightCount: number; darkCount: number; darkTokens: Record<string, string> } {
    if (typeof document === "undefined") return { lightCount: 0, darkCount: 0, darkTokens: {} }

    console.log("[ThemeSwitcher] Starting token extraction...")
    
    let lightThemeTokens: string[] = []
    let darkThemeTokens: string = ""
    let darkTokensMap: Record<string, string> = {}

    for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i]
        try {
            // @ts-ignore
            const rules = sheet.cssRules || []
            for (let k = 0; k < rules.length; k++) {
                const rule = rules[k]
                
                // Get light mode tokens from body selector
                if ("selectorText" in rule && rule.selectorText === "body") {
                    const style = (rule as CSSStyleRule).style
                    for (let j = 0; j < style.length; j++) {
                        const propertyName = style[j]
                        if (propertyName.includes("--token")) {
                            const value = style.getPropertyValue(propertyName)
                            const combinedCssRule = `${propertyName}: ${value};`
                            lightThemeTokens.push(combinedCssRule)
                        }
                    }
                }
                
                // Method 1: Try conditionText (works in Framer preview)
                if (
                    "conditionText" in rule &&
                    rule.conditionText === "(prefers-color-scheme: dark)"
                ) {
                    console.log("[ThemeSwitcher] Found dark tokens via conditionText")
                    // @ts-ignore
                    const cssRules = rule.cssRules || []
                    if (cssRules.length > 0) {
                        // @ts-ignore
                        let mediaRulesString = cssRules[0].cssText
                        mediaRulesString = mediaRulesString
                            .replace("body", "")
                            .replace(/\s*{\s*/, "")
                            .replace(/\s*}\s*$/, "")
                        darkThemeTokens = mediaRulesString
                        
                        // Also extract to map for direct application
                        // @ts-ignore
                        const innerRule = cssRules[0]
                        if (innerRule && "style" in innerRule) {
                            const style = (innerRule as CSSStyleRule).style
                            for (let j = 0; j < style.length; j++) {
                                const prop = style[j]
                                if (prop.startsWith("--token-")) {
                                    darkTokensMap[prop] = style.getPropertyValue(prop).trim()
                                }
                            }
                        }
                    }
                }
                
                // Method 2: Try rule.media.mediaText (works in production)
                if (
                    "media" in rule &&
                    rule.media &&
                    // @ts-ignore
                    rule.media.mediaText &&
                    // @ts-ignore
                    rule.media.mediaText.includes("prefers-color-scheme: dark")
                ) {
                    console.log("[ThemeSwitcher] Found dark tokens via media.mediaText")
                    // @ts-ignore
                    for (const innerRule of rule.cssRules || []) {
                        if (
                            "selectorText" in innerRule &&
                            innerRule.selectorText === "body" &&
                            "style" in innerRule
                        ) {
                            const style = (innerRule as CSSStyleRule).style
                            for (let j = 0; j < style.length; j++) {
                                const prop = style[j]
                                if (prop.startsWith("--token-")) {
                                    darkTokensMap[prop] = style.getPropertyValue(prop).trim()
                                }
                            }
                        }
                    }
                    
                    // Build darkThemeTokens string if not already set
                    if (!darkThemeTokens && Object.keys(darkTokensMap).length > 0) {
                        darkThemeTokens = Object.entries(darkTokensMap)
                            .map(([key, value]) => `${key}: ${value};`)
                            .join(" ")
                    }
                }
            }
        } catch (e) {
            console.log("[ThemeSwitcher] Error accessing stylesheet:", e)
        }
    }

    console.log("[ThemeSwitcher] Extracted light tokens:", lightThemeTokens.length)
    console.log("[ThemeSwitcher] Extracted dark tokens:", Object.keys(darkTokensMap).length)
    console.log("[ThemeSwitcher] Dark tokens map:", darkTokensMap)

    // Remove existing style element if it exists
    const existingStyleElement = document.getElementById("toggle-theme")
    if (existingStyleElement) {
        document.head.removeChild(existingStyleElement)
    }

    // Create new style element with theme tokens
    const styleElement = document.createElement("style")
    styleElement.id = "toggle-theme"
    const customCssRule = `body[toggle-theme="light"] {${lightThemeTokens.join(
        " "
    )}} body[toggle-theme="dark"]{${darkThemeTokens}} html[toggle-theme="light"] { color-scheme: light; } html[toggle-theme="dark"] { color-scheme: dark; }`
    styleElement.textContent = customCssRule
    document.head.appendChild(styleElement)
    
    console.log("[ThemeSwitcher] Style element created with CSS rule")

    return { 
        lightCount: lightThemeTokens.length, 
        darkCount: Object.keys(darkTokensMap).length,
        darkTokens: darkTokensMap
    }
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */
export default function ThemeSwitcher(props: {
    theme?: "light" | "dark"
    lightVariant?: string // Variant name for light theme (e.g., "Variant 1")
    darkVariant?: string // Variant name for dark theme (e.g., "Variant 2")
    style?: React.CSSProperties
}) {
    const { theme: themeProp = "light", lightVariant = "Variant 1", darkVariant = "Variant 2" } = props
    const hasInitializedRef = useRef(false)
    const componentRef = useRef<HTMLDivElement>(null)
    const restoredVariantRef = useRef<string | null>(null) // Track what variant was restored on mount
    const mountTimeRef = useRef<number | null>(null) // Track when component mounted
    
    // Callback ref to set variant immediately when element mounts
    const setRefAndVariant = (element: HTMLDivElement | null) => {
        // @ts-ignore - Callback refs can assign to ref.current
        componentRef.current = element
        
        if (element && !isCanvas && typeof window !== "undefined") {
            const savedVariant = localStorage.getItem("themeVariant")
            if (savedVariant && (savedVariant === lightVariant || savedVariant === darkVariant)) {
                console.log("[ThemeSwitcher] 🚀 IMMEDIATE: Setting variant via callback ref:", savedVariant)
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                    initializeParentVariant(savedVariant, element, lightVariant, darkVariant)
                })
            }
        }
    }
    
    // Debug state
    const [debugInfo, setDebugInfo] = useState<any>({
        themeProp: themeProp,
        hasInitialized: false,
        isCanvas: false,
        renderTarget: "unknown",
        localStorageTheme: null,
        localStorageOnMount: null,
        localStorageVariant: null,
        lastUpdateTheme: null,
        lastUpdateTime: null,
        lightTokenCount: 0,
        darkTokenCount: 0,
        styleElementExists: false,
        skippedReason: null,
    })

    // Check if we're in canvas mode
    let isCanvas = false
    let renderTargetStatus = "unknown"
    try {
        const currentTarget = RenderTarget.current()
        isCanvas = currentTarget === RenderTarget.canvas
        renderTargetStatus = currentTarget === RenderTarget.canvas ? "canvas" : 
                           currentTarget === RenderTarget.preview ? "preview" :
                           currentTarget === RenderTarget.export ? "export" : "production"
    } catch (e) {
        renderTargetStatus = "error: " + (e as Error).message
    }

    // Initialize theme tokens extraction on mount (only once)
    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return
        if (hasInitializedRef.current) return

        console.log("=== [ThemeSwitcher] MOUNT EFFECT START ===")
        console.log("[ThemeSwitcher] RenderTarget:", renderTargetStatus)
        console.log("[ThemeSwitcher] isCanvas:", isCanvas)
        console.log("[ThemeSwitcher] themeProp:", themeProp)
        
        // Check if we're in canvas mode - don't apply theme changes to avoid affecting Framer's UI
        if (isCanvas) {
            console.log("[ThemeSwitcher] Canvas mode detected - skipping theme application")
            hasInitializedRef.current = true
            setDebugInfo((prev: any) => ({
                ...prev,
                hasInitialized: true,
                skippedReason: "Canvas mode - skipped to avoid affecting Framer UI",
            }))
            return
        }
        
        // VARIANT IS THE SOURCE OF TRUTH
        // Check localStorage for saved variant FIRST
        console.log("[ThemeSwitcher] Checking localStorage for variant (source of truth)...")
        let savedVariant: string | null = null
        try {
            savedVariant = localStorage.getItem("themeVariant")
            console.log("[ThemeSwitcher] localStorage.getItem('themeVariant') =", savedVariant)
        } catch (e) {
            console.log("[ThemeSwitcher] Error reading localStorage:", e)
        }
        
        // Determine variant to use: saved variant takes priority, otherwise derive from themeProp
        let variantToUse: string
        if (savedVariant && (savedVariant === lightVariant || savedVariant === darkVariant)) {
            variantToUse = savedVariant
            console.log("[ThemeSwitcher] Using saved variant from localStorage:", variantToUse)
        } else {
            // Derive variant from themeProp
            variantToUse = themeProp === "dark" ? darkVariant : lightVariant
            console.log("[ThemeSwitcher] No saved variant, deriving from themeProp:", themeProp, "->", variantToUse)
        }
        
        // Extract CSS tokens and create style element
        console.log("[ThemeSwitcher] Extracting tokens...")
        const { lightCount, darkCount, darkTokens } = extractAndApplyThemeTokens()
        
        // STEP 1: Set parent's parent variant FIRST (this is the source of truth)
        console.log("[ThemeSwitcher] Setting parent's parent variant:", variantToUse)
        
        // Function to set variant - will be called when ref is available
        const setVariant = () => {
            if (componentRef.current) {
                const success = initializeParentVariant(variantToUse, componentRef.current, lightVariant, darkVariant)
                if (success) {
                    console.log("[ThemeSwitcher] ✅ Successfully set parent's parent variant")
                    return true
                } else {
                    console.log("[ThemeSwitcher] ⚠️ Failed to set parent's parent variant, will retry")
                    return false
                }
            }
            return false
        }
        
        // Try immediately if ref is available
        if (componentRef.current) {
            setVariant()
        }
        
        // Retry after delays to ensure DOM is ready
        setTimeout(() => setVariant(), 0) // Next tick
        setTimeout(() => setVariant(), 50)
        setTimeout(() => setVariant(), 100)
        setTimeout(() => setVariant(), 200)
        setTimeout(() => setVariant(), 300)
        setTimeout(() => setVariant(), 500)
        
        // STEP 2: Derive theme from variant and apply it
        const themeFromVariant = variantToUse === darkVariant ? 'dark' : 'light'
        console.log("[ThemeSwitcher] Derived theme from variant:", variantToUse, "->", themeFromVariant)
        applyThemeFromVariant(variantToUse, lightVariant, darkVariant)
        
        // Track what variant was restored
        restoredVariantRef.current = variantToUse
        mountTimeRef.current = Date.now()
        hasInitializedRef.current = true
        
        console.log("[ThemeSwitcher] Tracked restored variant:", variantToUse, "at", mountTimeRef.current)
        
        // Update debug info
        const finalVariant = localStorage.getItem("themeVariant")
        const themeFromFinalVariant = finalVariant === darkVariant ? 'dark' : 'light'
        console.log("[ThemeSwitcher] Final variant:", finalVariant, "-> theme:", themeFromFinalVariant)
        console.log("=== [ThemeSwitcher] MOUNT EFFECT END ===")
        
        setDebugInfo((prev: any) => ({
            ...prev,
            hasInitialized: true,
            localStorageTheme: themeFromFinalVariant, // Show derived theme
            localStorageOnMount: savedVariant ? (savedVariant === darkVariant ? 'dark' : 'light') : null,
            localStorageVariant: finalVariant,
            lastUpdateTheme: themeFromVariant,
            lastUpdateTime: new Date().toLocaleTimeString(),
            lightTokenCount: lightCount,
            darkTokenCount: darkCount,
            styleElementExists: !!document.getElementById("toggle-theme"),
        }))

        // Cleanup function
        return () => {
            const existingStyleElement = document.getElementById("toggle-theme")
            if (existingStyleElement) {
                document.head.removeChild(existingStyleElement)
            }
            const htmlElement = document.getElementsByTagName("html")[0]
            const bodyElement = document.getElementsByTagName("body")[0]
            htmlElement.setAttribute("toggle-theme", "system")
            bodyElement.setAttribute("toggle-theme", "system")
        }
    }, [])

    // Apply theme when prop changes (after initialization)
    useEffect(() => {
        if (!hasInitializedRef.current) return
        if (typeof window === "undefined" || typeof document === "undefined") return
        
        // Skip theme changes in canvas mode to avoid affecting Framer's UI
        if (isCanvas) {
            console.log("[ThemeSwitcher] Canvas mode - skipping prop change")
            setDebugInfo((prev: any) => ({
                ...prev,
                themeProp,
                skippedReason: "Canvas mode - skipped to avoid affecting Framer UI",
            }))
            return
        }
        
        console.log("[ThemeSwitcher] Prop changed to:", themeProp)
        
        // Convert theme prop to variant
        const propVariant = themeProp === "dark" ? darkVariant : lightVariant
        const savedVariant = localStorage.getItem("themeVariant")
        const restoredVariant = restoredVariantRef.current
        const mountTime = mountTimeRef.current
        const timeSinceMount = mountTime ? Date.now() - mountTime : Infinity
        
        console.log("[ThemeSwitcher] Prop variant:", propVariant, "Saved variant:", savedVariant, "Restored variant:", restoredVariant)
        console.log("[ThemeSwitcher] Time since mount:", timeSinceMount, "ms")
        
        // If we're within 1000ms of mount and prop variant differs from restored variant,
        // ignore the prop change - it's Framer's default overriding our saved preference
        if (timeSinceMount < 1000 && restoredVariant && propVariant !== restoredVariant) {
            console.log("[ThemeSwitcher] ⚠️ Ignoring prop change - within mount window and prop conflicts with restored variant")
            console.log("[ThemeSwitcher] Prop:", propVariant, "Restored:", restoredVariant, "- preserving restored variant")
            setDebugInfo((prev: any) => ({
                ...prev,
                themeProp,
                skippedReason: `Prop (${propVariant}) conflicts with restored variant (${restoredVariant}) - preserving restored`,
            }))
            return
        }
        
        // Otherwise, update variant from prop (user intentionally changed variant in Framer)
        console.log("[ThemeSwitcher] Updating variant from prop:", propVariant)
        applyThemeFromVariant(propVariant, lightVariant, darkVariant)
        
        // Update debug info
        const finalVariant = localStorage.getItem("themeVariant")
        const themeFromVariant = finalVariant === darkVariant ? 'dark' : 'light'
        setDebugInfo((prev: any) => ({
            ...prev,
            themeProp,
            lastUpdateTheme: themeFromVariant,
            lastUpdateTime: new Date().toLocaleTimeString(),
            localStorageTheme: themeFromVariant,
            localStorageVariant: finalVariant,
            skippedReason: null,
        }))
    }, [themeProp, isCanvas, lightVariant, darkVariant])

    // Update debug info on render
    useEffect(() => {
        const storedVariant = typeof window !== "undefined" ? localStorage.getItem("themeVariant") : null
        // Derive theme from variant (variant is source of truth)
        const derivedTheme = storedVariant 
            ? (storedVariant === darkVariant ? 'dark' : 'light')
            : null
        const styleExists = typeof document !== "undefined" ? !!document.getElementById("toggle-theme") : false
        
        setDebugInfo((prev: any) => ({
            ...prev,
            themeProp,
            hasInitialized: hasInitializedRef.current,
            isCanvas,
            renderTarget: renderTargetStatus,
            localStorageTheme: derivedTheme, // Derived from variant
            localStorageVariant: storedVariant,
            styleElementExists: styleExists,
        }))
    }, [themeProp, isCanvas, renderTargetStatus, lightVariant, darkVariant])

    // Debug panel component
    const DebugPanel = () => {
        const panelContent = (
            <div
                style={{
                    position: "fixed",
                    top: 10,
                    right: 10,
                    background: "rgba(0, 0, 0, 0.9)",
                    color: "#fff",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    zIndex: 999999,
                    maxWidth: "320px",
                    border: "1px solid #333",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    pointerEvents: "auto",
                }}
            >
                <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#4CAF50" }}>
                    ThemeSwitcher Debug
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div>
                        <span style={{ color: "#888" }}>Theme Prop:</span>{" "}
                        <span style={{ color: debugInfo.themeProp === "dark" ? "#FFD700" : "#87CEEB" }}>
                            {debugInfo.themeProp}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>RenderTarget:</span>{" "}
                        <span style={{ color: debugInfo.renderTarget === "canvas" ? "#FF6B6B" : "#4CAF50" }}>
                            {debugInfo.renderTarget}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>Is Canvas:</span>{" "}
                        <span style={{ color: debugInfo.isCanvas ? "#FF6B6B" : "#4CAF50" }}>
                            {debugInfo.isCanvas ? "YES" : "NO"}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>Initialized:</span>{" "}
                        <span style={{ color: debugInfo.hasInitialized ? "#4CAF50" : "#FF6B6B" }}>
                            {debugInfo.hasInitialized ? "YES" : "NO"}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>localStorage (current):</span>{" "}
                        <span style={{ color: debugInfo.localStorageTheme ? "#4CAF50" : "#888" }}>
                            {debugInfo.localStorageTheme || "none"}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>localStorage (on mount):</span>{" "}
                        <span style={{ color: debugInfo.localStorageOnMount ? "#4CAF50" : "#888" }}>
                            {debugInfo.localStorageOnMount || "none"}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>Saved Variant:</span>{" "}
                        <span style={{ color: debugInfo.localStorageVariant ? "#4CAF50" : "#888" }}>
                            {debugInfo.localStorageVariant || "none"}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>Last Update:</span>{" "}
                        <span style={{ color: debugInfo.lastUpdateTheme ? "#4CAF50" : "#888" }}>
                            {debugInfo.lastUpdateTheme || "none"} {debugInfo.lastUpdateTime ? `(${debugInfo.lastUpdateTime})` : ""}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>Style Element:</span>{" "}
                        <span style={{ color: debugInfo.styleElementExists ? "#4CAF50" : "#FF6B6B" }}>
                            {debugInfo.styleElementExists ? "EXISTS" : "MISSING"}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: "#888" }}>Tokens:</span>{" "}
                        <span style={{ color: debugInfo.darkTokenCount > 0 ? "#4CAF50" : "#FF6B6B" }}>
                            Light: {debugInfo.lightTokenCount}, Dark: {debugInfo.darkTokenCount}
                        </span>
                    </div>
                    {debugInfo.skippedReason && (
                        <div>
                            <span style={{ color: "#888" }}>Skipped:</span>{" "}
                            <span style={{ color: "#FF6B6B" }}>
                                {debugInfo.skippedReason}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        )
        
        // Render to document.body via portal
        if (typeof document !== "undefined" && document.body) {
            return createPortal(panelContent, document.body)
        }
        return panelContent
    }

    // Return invisible component with debug panel
    return (
        <>
            <DebugPanel />
            <div
                ref={setRefAndVariant}
                style={{
                    ...props.style,
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
        </>
    )
}

ThemeSwitcher.defaultProps = {
    theme: "light" as const,
}

addPropertyControls(ThemeSwitcher, {
    theme: {
        type: ControlType.Enum,
        title: "Theme",
        options: ["light", "dark"],
        optionTitles: ["Light", "Dark"],
        defaultValue: "light",
        displaySegmentedControl: true,
    },
    lightVariant: {
        type: ControlType.String,
        title: "Light Variant Name",
        defaultValue: "Variant 1",
        description: "The exact name of the variant for light theme (e.g., 'Variant 1')",
    },
    darkVariant: {
        type: ControlType.String,
        title: "Dark Variant Name",
        defaultValue: "Variant 2",
        description: "The exact name of the variant for dark theme (e.g., 'Variant 2')",
    },
})

ThemeSwitcher.displayName = "Dark/Light Mode Toggle"
