/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 60
 * @framerIntrinsicHeight 60
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
 
// This component is protected and should not be unlinkable or editable
// Only users with edit access to this project can modify this component
 
import { addPropertyControls, ControlType } from "framer"
import { useEffect, useState, startTransition } from "react"
import React from "react"
 
const changeTheme = (theme: string) => {
    const htmlElement = document.getElementsByTagName("html")[0]
    const bodyElement = document.getElementsByTagName("body")[0]
 
    htmlElement.setAttribute("toggle-theme", theme)
    bodyElement.setAttribute("toggle-theme", theme)
    localStorage.setItem("theme", theme)
 
    const event = new Event("themeChange")
    window.dispatchEvent(event)
}
 
// SVG Icons
const SunIcon = ({ size, color }: { size: number; color: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="12" cy="12" r="5" fill={color} />
        <path
            d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
)
 
const MoonIcon = ({ size, color }: { size: number; color: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill={color}
        />
    </svg>
)
 
// Utility function to apply color to custom SVG
const applyColorToSvg = (svgString: string, color: string): string => {
    if (!svgString) return ""
 
    // Replace fill attributes with the new color
    let modifiedSvg = svgString.replace(/fill="[^"]*"/g, `fill="${color}"`)
 
    // Replace stroke attributes with the new color
    modifiedSvg = modifiedSvg.replace(/stroke="[^"]*"/g, `stroke="${color}"`)
 
    // If no fill or stroke attributes exist, add fill to the first path or shape element
    if (!svgString.includes("fill=") && !svgString.includes("stroke=")) {
        modifiedSvg = modifiedSvg.replace(
            /<(path|circle|rect|ellipse|polygon|polyline)([^>]*?)>/g,
            `<$1$2 fill="${color}">`
        )
    }
 
    return modifiedSvg
}
 
// Custom SVG component
const CustomIcon = ({
    svgString,
    size,
    color,
}: {
    svgString: string
    size: number
    color: string
}) => {
    const coloredSvg = applyColorToSvg(svgString, color)
 
    return (
        <div
            style={{
                width: size,
                height: size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: coloredSvg }}
        />
    )
}
 
interface ThemeToggleProps {
    toggleType: string
    lightIconColor: string
    darkIconColor: string
    SunIconColor: string
    MoonIconColor: string
    size: number
    defaultTheme: string
    switchTrackColor: string
    switchActiveColor: string
    sunSvg?: string
    moonSvg?: string
}
 
/**
 * @framerDisableUnlink
 */
export default function ThemeToggleButton(props: ThemeToggleProps) {
    const {
        toggleType = "Button",
        lightIconColor = "#FF8C00",
        darkIconColor = "#949494",
        SunIconColor = "#FF9100", // Light mode knob icon
        MoonIconColor = "#6B6B6B", // Dark mode knob icon
        size = 30,
        defaultTheme = "Light",
        switchTrackColor = "#424242",
        switchActiveColor = "#DBDBDB",
        sunSvg,
        moonSvg,
    } = props
 
    const [theme, setTheme] = useState<string>("system")
    const [, setIsInitialized] = useState(false)
 
    useEffect(() => {
        if (typeof window === "undefined") return
 
        const savedTheme = localStorage.getItem("theme")
        const initialThemeProp = defaultTheme.toLowerCase() // "light" | "dark" | "system"
 
        let newTheme = "light"
 
        if (savedTheme) {
            newTheme = savedTheme
        } else {
            if (initialThemeProp === "light" || initialThemeProp === "dark") {
                newTheme = initialThemeProp
            } else {
                const mediaQuery = window.matchMedia(
                    "(prefers-color-scheme: dark)"
                )
                newTheme = mediaQuery.matches ? "dark" : "light"
            }
        }
 
        startTransition(() => setTheme(newTheme))
        changeTheme(newTheme)
 
        // CSS token extraction
        const htmlElement = document.getElementsByTagName("html")[0]
        const bodyElement = document.getElementsByTagName("body")[0]
        htmlElement.setAttribute("toggle-theme", newTheme)
        bodyElement.setAttribute("toggle-theme", newTheme)
 
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
                console.warn("Cannot access stylesheet:", sheet.href)
            }
        }
 
        const styleElement = document.createElement("style")
        styleElement.id = "toggle-theme"
        const customCssRule = `body[toggle-theme="light"] {${lightThemeTokens.join(
            " "
        )}} body[toggle-theme="dark"]{${darkThemeTokens}} html[toggle-theme="light"] { color-scheme: light; } html[toggle-theme="dark"] { color-scheme: dark; }`
        styleElement.textContent = customCssRule
        document.head.appendChild(styleElement)
 
        startTransition(() => setIsInitialized(true))
 
        return () => {
            const existingStyleElement = document.getElementById("toggle-theme")
            if (existingStyleElement) {
                document.head.removeChild(existingStyleElement)
            }
            htmlElement.setAttribute("toggle-theme", "system")
            bodyElement.setAttribute("toggle-theme", "system")
        }
    }, [defaultTheme])
 
    // ✅ Reverse toggle logic
    const handleClick = () => {
        const newTheme = theme === "dark" ? "light" : "dark"
        startTransition(() => setTheme(newTheme))
        changeTheme(newTheme)
    }
 
    const isLightMode = theme === "light"
    const buttonIconSize = size * 0.8
 
    // Button Style Toggle
    if (toggleType === "Button") {
        return (
            <div
                onClick={handleClick}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "transform 0.3s ease",
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                    padding: 0,
                    width: "100%",
                    height: "100%",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)"
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                }}
            >
                {isLightMode ? (
                    sunSvg ? (
                        <CustomIcon
                            svgString={sunSvg}
                            size={buttonIconSize}
                            color={lightIconColor}
                        />
                    ) : (
                        <SunIcon size={buttonIconSize} color={lightIconColor} />
                    )
                ) : moonSvg ? (
                    <CustomIcon
                        svgString={moonSvg}
                        size={buttonIconSize}
                        color={darkIconColor}
                    />
                ) : (
                    <MoonIcon size={buttonIconSize} color={darkIconColor} />
                )}
            </div>
        )
    }
 
    // Switch Style Toggle
    const switchWidth = size * 1.8
    const switchHeight = size * 1
    const knobSize = switchHeight * 0.8
    const knobIconSize = knobSize * 0.6
    const borderRadius = switchHeight / 2
 
    return (
        <button
            type="button"
            aria-pressed={isLightMode}
            onClick={handleClick}
            style={{
                width: switchWidth,
                height: switchHeight,
                background: isLightMode ? switchActiveColor : switchTrackColor,
                border: "none",
                borderRadius: borderRadius,
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
                boxShadow: isLightMode
                    ? "0 1px 3px rgba(0,0,0,0.06)"
                    : "0 2px 8px rgba(0,0,0,0.10)",
                outline: "none",
                padding: 0,
            }}
        >
            {/* Switch Knob with Icon */}
            <span
                style={{
                    position: "absolute",
                    top: (switchHeight - knobSize) / 2,
                    left: isLightMode
                        ? switchWidth - knobSize - (switchHeight - knobSize) / 2
                        : (switchHeight - knobSize) / 2,
                    width: knobSize,
                    height: knobSize,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                    transition: "left 0.2s cubic-bezier(.4,1.2,.6,1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                }}
            >
                {isLightMode ? (
                    sunSvg ? (
                        <CustomIcon
                            svgString={sunSvg}
                            size={knobIconSize}
                            color={SunIconColor}
                        />
                    ) : (
                        <SunIcon size={knobIconSize} color={SunIconColor} />
                    )
                ) : moonSvg ? (
                    <CustomIcon
                        svgString={moonSvg}
                        size={knobIconSize}
                        color={MoonIconColor}
                    />
                ) : (
                    <MoonIcon size={knobIconSize} color={MoonIconColor} />
                )}
            </span>
        </button>
    )
}
 
addPropertyControls(ThemeToggleButton, {
    toggleType: {
        type: ControlType.Enum,
        title: "Toggle Type",
        options: ["Button", "Switch"],
        defaultValue: "Button",
    },
    lightIconColor: {
        type: ControlType.Color,
        title: "Sun button Icon Color",
        defaultValue: "#FF8C00",
        hidden: (props) => props.toggleType !== "Button",
    },
    darkIconColor: {
        type: ControlType.Color,
        title: "Moon button Icon Color",
        defaultValue: "#949494",
        hidden: (props) => props.toggleType !== "Button",
    },
    SunIconColor: {
        type: ControlType.Color,
        title: "Sun Icon Color",
        defaultValue: "#FF9100",
        hidden: (props) => props.toggleType !== "Switch",
    },
    MoonIconColor: {
        type: ControlType.Color,
        title: "Moon Icon Color",
        defaultValue: "#6B6B6B",
        hidden: (props) => props.toggleType !== "Switch",
    },
    size: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 60,
        min: 20,
        max: 120,
        step: 5,
    },
    switchTrackColor: {
        type: ControlType.Color,
        title: "Switch Track Color",
        defaultValue: "#424242",
        hidden: (props) => props.toggleType !== "Switch",
    },
    switchActiveColor: {
        type: ControlType.Color,
        title: "Switch Active Color",
        defaultValue: "#DBDBDB",
        hidden: (props) => props.toggleType !== "Switch",
    },
    defaultTheme: {
        type: ControlType.Enum,
        title: "Default Theme",
        options: ["Light", "Dark", "System"],
        defaultValue: "Light",
    },
    sunSvg: {
        type: ControlType.String,
        title: "Sun SVG",
        placeholder: "Paste your sun SVG code here...",
        displayTextArea: true,
    },
    moonSvg: {
        type: ControlType.String,
        title: "Moon SVG",
        placeholder: "Paste your moon SVG code here...",
        displayTextArea: true,
    },
})