import { addPropertyControls, ControlType, RenderTarget } from "framer"
import React, { useEffect, useRef } from "react"

// Extract tokens and inject style element
function initThemeTokens() {
    if (typeof document === "undefined") return

    let light: string[] = []
    let dark: string = ""

    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules || []) {
                // Check for CSSStyleRule (body selector)
                if (rule instanceof CSSStyleRule && rule.selectorText === "body") {
                    for (let i = 0; i < rule.style.length; i++) {
                        const prop = rule.style[i]
                        if (prop.includes("--token")) {
                            light.push(`${prop}: ${rule.style.getPropertyValue(prop)};`)
                        }
                    }
                }
                // Check for CSSMediaRule (dark mode media query)
                else if (rule instanceof CSSMediaRule && rule.conditionText === "(prefers-color-scheme: dark)") {
                    const innerRule = rule.cssRules?.[0]
                    if (innerRule instanceof CSSStyleRule) {
                        dark = innerRule.cssText.replace("body", "").replace(/\s*{\s*/, "").replace(/\s*}\s*$/, "")
                    }
                }
            }
        } catch {}
    }

    const existing = document.getElementById("theme-switcher")
    if (existing) existing.remove()

    const style = document.createElement("style")
    style.id = "theme-switcher"
    style.textContent = `body[toggle-theme="light"] {${light.join(" ")}} body[toggle-theme="dark"]{${dark}} html[toggle-theme="light"] { color-scheme: light; } html[toggle-theme="dark"] { color-scheme: dark; }`
    document.head.appendChild(style)
}

// Apply theme
const applyTheme = (theme: "light" | "dark") => {
    const html = document.documentElement
    const body = document.body
    if (html && body) {
        html.setAttribute("toggle-theme", theme)
        body.setAttribute("toggle-theme", theme)
    }
}

// Get parent variant
const getParentVariant = (el: HTMLElement | null) => {
    return el?.parentElement?.parentElement?.getAttribute("data-framer-name") || null
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */
export default function ThemeSwitcher(props: {
    lightVariant?: string
    darkVariant?: string
    style?: React.CSSProperties
}) {
    const { lightVariant = "Variant 1", darkVariant = "Variant 2" } = props
    const ref = useRef<HTMLDivElement>(null)
    const lastVariant = useRef<string | null>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Init tokens once
    useEffect(() => {
        if (typeof document !== "undefined") initThemeTokens()
    }, [])

    // Watch variant changes
    useEffect(() => {
        if (isCanvas || typeof window === "undefined") return

        const checkTheme = () => {
            const variant = getParentVariant(ref.current)
            if (!variant || variant === lastVariant.current) return
            
            lastVariant.current = variant
            applyTheme(variant === darkVariant ? "dark" : "light")
        }

        checkTheme()

        const parent = ref.current?.parentElement?.parentElement
        if (!parent) return

        const observer = new MutationObserver(() => setTimeout(checkTheme, 50))
        observer.observe(parent, { attributes: true, attributeFilter: ["data-framer-name"] })
        return () => observer.disconnect()
    }, [lightVariant, darkVariant, isCanvas])

    return (
        <div
            ref={ref}
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

addPropertyControls(ThemeSwitcher, {
    lightVariant: {
        type: ControlType.String,
        title: "Light Variant",
        defaultValue: "Light",
        description: "The exact name of the variant for light theme",
    },
    darkVariant: {
        type: ControlType.String,
        title: "Dark Variant",
        defaultValue: "Dark",
        description: "The exact name of the variant for dark theme",
    },
})

ThemeSwitcher.displayName = "Theme Switcher"
