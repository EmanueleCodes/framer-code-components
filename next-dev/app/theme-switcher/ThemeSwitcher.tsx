import { addPropertyControls, ControlType } from "framer"
import React, { useEffect } from "react"

const changeTheme = (theme: string) => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    const htmlElement = document.getElementsByTagName("html")[0]
    const bodyElement = document.getElementsByTagName("body")[0]

    htmlElement.setAttribute("toggle-theme", theme)
    bodyElement.setAttribute("toggle-theme", theme)
    localStorage.setItem("theme", theme)

    const event = new Event("themeChange")
    window.dispatchEvent(event)
}

function extractAndApplyThemeTokens() {
    if (typeof document === "undefined") return

    let lightThemeTokens: string[] = []
    let darkThemeTokens: string = ""

    for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i]
        try {
            // @ts-ignore
            const rules = sheet.cssRules || []
            for (let k = 0; k < rules.length; k++) {
                const rule = rules[k]
                if (
                    "selectorText" in rule &&
                    rule.selectorText === "body"
                ) {
                    const style = (rule as CSSStyleRule).style
                    for (let j = 0; j < style.length; j++) {
                        const propertyName = style[j]
                        if (propertyName.includes("--token")) {
                            const value =
                                style.getPropertyValue(propertyName)
                            const combinedCssRule = `${propertyName}: ${value};`
                            lightThemeTokens.push(combinedCssRule)
                        }
                    }
                } else if (
                    "conditionText" in rule &&
                    rule.conditionText === "(prefers-color-scheme: dark)"
                ) {
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
                    }
                }
            }
        } catch (e) {
            // Cannot access stylesheet (cross-origin)
        }
    }

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
    style?: React.CSSProperties
}) {
    const { theme = "light" } = props

    // Initialize theme tokens extraction on mount (only once)
    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return

        // Extract CSS tokens and create style element
        extractAndApplyThemeTokens()

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

    // Apply theme when prop changes
    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return
        changeTheme(theme)
    }, [theme])

    // Return invisible component
    return (
        <div
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
})

ThemeSwitcher.displayName = "Dark/Light Mode Toggle"