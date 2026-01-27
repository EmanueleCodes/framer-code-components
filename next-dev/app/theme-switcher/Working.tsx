import * as React from "react"
import { Frame, addPropertyControls, ControlType } from "framer"
 
/**
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 60
 * @framerIntrinsicHeight 30
 */
export default function ThemeSwitch({
    backgroundColor,
    iconColor,
    switchSize,
    iconPadding,
    circleColor,
}) {
    const [isOn, setIsOn] = React.useState(false)
    const [isThemeSet, setIsThemeSet] = React.useState(false)
    const tokenMapRef = React.useRef(null)
 
    const toggle = () => {
        const newTheme = isOn ? "light" : "dark"
        console.log("Toggle clicked. New theme:", newTheme)
        setIsOn(!isOn)
        localStorage.setItem("currentToggleState", newTheme)
        updateTheme(newTheme)
    }
 
    const extractTokenValues = () => {
        console.log("Extracting token values from stylesheets...")
        const tokens = { light: {}, dark: {} }
 
        // Find the body style rules
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText === "body" && rule.style) {
                        // Get light mode tokens
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i]
                            if (prop.startsWith("--token-")) {
                                tokens.light[prop] = rule.style
                                    .getPropertyValue(prop)
                                    .trim()
                            }
                        }
                    }
 
                    // Get dark mode tokens from media query
                    if (
                        rule.media &&
                        rule.media.mediaText.includes(
                            "prefers-color-scheme: dark"
                        )
                    ) {
                        for (const innerRule of rule.cssRules || []) {
                            if (
                                innerRule.selectorText === "body" &&
                                innerRule.style
                            ) {
                                for (
                                    let i = 0;
                                    i < innerRule.style.length;
                                    i++
                                ) {
                                    const prop = innerRule.style[i]
                                    if (prop.startsWith("--token-")) {
                                        tokens.dark[prop] = innerRule.style
                                            .getPropertyValue(prop)
                                            .trim()
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // CORS issues with external stylesheets - skip
            }
        }
 
        console.log("Extracted tokens:", tokens)
        return tokens
    }
 
    const updateTheme = (theme) => {
        console.log("Updating theme to:", theme)
 
        if (!tokenMapRef.current) {
            tokenMapRef.current = extractTokenValues()
        }
 
        const tokens = tokenMapRef.current
        const sourceTokens = theme === "dark" ? tokens.dark : tokens.light
 
        console.log(
            `Applying ${theme} theme with ${Object.keys(sourceTokens).length} tokens`
        )
 
        // Apply tokens directly to body
        for (const [key, value] of Object.entries(sourceTokens)) {
            document.body.style.setProperty(key, value)
        }
 
        console.log("Theme applied")
    }
 
    React.useEffect(() => {
        const storedTheme = localStorage.getItem("currentToggleState")
        console.log("Stored theme:", storedTheme)
 
        if (storedTheme) {
            setIsOn(storedTheme === "dark")
            updateTheme(storedTheme)
        } else {
            const darkModeMediaQuery = window.matchMedia(
                "(prefers-color-scheme: dark)"
            )
            const systemTheme = darkModeMediaQuery.matches ? "dark" : "light"
            console.log("System theme:", systemTheme)
            setIsOn(systemTheme === "dark")
        }
        setIsThemeSet(true)
    }, [])
 
    const circleSize = switchSize / 2 - switchSize / 8
    const iconSize = circleSize - iconPadding * 2
 
    return (
        <Frame
            width={switchSize}
            height={switchSize / 2}
            background={backgroundColor}
            style={{
                borderRadius: switchSize / 4,
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `0 ${switchSize / 8}px`,
            }}
            onClick={toggle}
        >
            {isThemeSet && (
                <Frame
                    width={circleSize}
                    height={circleSize}
                    background={circleColor}
                    style={{
                        borderRadius: "50%",
                        position: "absolute",
                        left: isOn
                            ? `calc(100% - ${circleSize + switchSize / 16}px)`
                            : `${switchSize / 16}px`,
                        transition: "left 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    initial={false}
                    animate={{
                        left: isOn
                            ? `calc(100% - ${circleSize + switchSize / 16}px)`
                            : `${switchSize / 16}px`,
                    }}
                >
                    <Frame
                        width={iconSize}
                        height={iconSize}
                        background="transparent"
                        style={{ overflow: "hidden" }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={iconColor}
                            width={iconSize}
                            height={iconSize}
                        >
                            <path d="M12 21.9967C6.47715 21.9967 2 17.5196 2 11.9967C2 6.47386 6.47715 1.9967 12 1.9967C17.5228 1.9967 22 6.47386 22 11.9967C22 17.5196 17.5228 21.9967 12 21.9967ZM12 19.9967C16.4183 19.9967 20 16.415 20 11.9967C20 7.57843 16.4183 3.9967 12 3.9967C7.58172 3.9967 4 7.57843 4 11.9967C4 16.415 7.58172 19.9967 12 19.9967ZM12 17.9967V5.9967C15.3137 5.9967 18 8.683 18 11.9967C18 15.3104 15.3137 17.9967 12 17.9967Z"></path>
                        </svg>
                    </Frame>
                </Frame>
            )}
        </Frame>
    )
}
 
ThemeSwitch.defaultProps = {
    backgroundColor: "#e0e0e0",
    iconColor: "#000000",
    switchSize: 60,
    iconPadding: 4,
    circleColor: "#ffffff",
}
 
addPropertyControls(ThemeSwitch, {
    backgroundColor: {
        title: "Background Color",
        type: ControlType.Color,
        defaultValue: "#e0e0e0",
    },
    iconColor: {
        title: "Icon Color",
        type: ControlType.Color,
        defaultValue: "#000000",
    },
    switchSize: {
        title: "Switch Size",
        type: ControlType.Number,
        defaultValue: 60,
        min: 20,
        max: 200,
        step: 1,
    },
    iconPadding: {
        title: "Icon Padding",
        type: ControlType.Number,
        defaultValue: 4,
        min: 0,
        max: 20,
        step: 1,
    },
    circleColor: {
        title: "Circle Color",
        type: ControlType.Color,
        defaultValue: "#ffffff",
        description:
            "This component will only work when you publish your site, not inside Framer preview \n2.0 \n[via SegmentUI](https://www.segmentUI.com)",
    },
})