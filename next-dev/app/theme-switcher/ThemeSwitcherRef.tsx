import type { ComponentType } from "react"
import { addPropertyControls, ControlType } from "framer"
import React, { useEffect, useState } from "react"

function getOSTheme() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
        return window.matchMedia &&
            window.matchMedia("(prefers-color-scheme:dark)").matches
            ? "dark"
            : "light"
    }
    return "light"
}

function setInitialState() {
    const osTheme = getOSTheme()
    const currentToggleState =
        localStorage.getItem("currentToggleState") ||
        (osTheme === "dark" ? "dark" : "light")
    localStorage.setItem("currentToggleState", currentToggleState)

    if (typeof document !== "undefined") {
        // CHANGED: pick Framer SSR style tag (new attr name, with fallback)
        const styleTag =
            document.querySelector("style[data-framer-css-ssr]") ||
            document.querySelector("style[data-framer-css-ssr-minified]")

        if (styleTag) {
            const newCSS = styleTag.innerHTML.replace(
                /prefers-color-scheme:\w+/,
                `prefers-color-scheme:${
                    (currentToggleState === "dark" && osTheme === "dark") ||
                    (currentToggleState === "light" && osTheme === "light")
                        ? "dark"
                        : "light"
                }`
            )
            styleTag.innerHTML = newCSS
        }
    }

    return currentToggleState === "dark"
}

export function themeSwictherBasedOnSystem(Component): ComponentType {
    return (props) => {
        const [isOn, setIsOn] = useState(setInitialState())

        const toggle = () => {
            const newToggleState = !isOn ? "dark" : "light"
            setIsOn(!isOn)
            localStorage.setItem("currentToggleState", newToggleState)
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("themeChange"))
            }
        }

        useEffect(() => {
            if (typeof window !== "undefined") {
                const mediaQuery = window.matchMedia(
                    "(prefers-color-scheme:dark)"
                )
                mediaQuery.addListener((e) => {
                    const newTheme = e.matches ? "dark" : "light"
                    localStorage.setItem("currentOsTheme", newTheme)
                    localStorage.setItem("currentToggleState", newTheme)
                    setIsOn(newTheme === "dark")

                    if (typeof document !== "undefined") {
                        // CHANGED: pick Framer SSR style tag (new attr name, with fallback)
                        const styleTag =
                            document.querySelector(
                                "style[data-framer-css-ssr]"
                            ) ||
                            document.querySelector(
                                "style[data-framer-css-ssr-minified]"
                            )

                        if (styleTag) {
                            const newCSS = styleTag.innerHTML.replace(
                                /prefers-color-scheme:\w+/,
                                `prefers-color-scheme:${
                                    (newTheme === "dark" &&
                                        newTheme === "dark") ||
                                    (newTheme === "light" &&
                                        newTheme === "light")
                                        ? "dark"
                                        : "light"
                                }`
                            )
                            styleTag.innerHTML = newCSS
                        }
                    }

                    window.dispatchEvent(new CustomEvent("themeChange"))
                })
            }
        }, [])

        useEffect(() => {
            if (
                typeof window !== "undefined" &&
                typeof document !== "undefined"
            ) {
                const currentToggleState = isOn ? "dark" : "light"
                const currentOsTheme =
                    localStorage.getItem("currentOsTheme") || getOSTheme()

                // CHANGED: pick Framer SSR style tag (new attr name, with fallback)
                const styleTag =
                    document.querySelector("style[data-framer-css-ssr]") ||
                    document.querySelector(
                        "style[data-framer-css-ssr-minified]"
                    )

                if (styleTag) {
                    const newCSS = styleTag.innerHTML.replace(
                        /prefers-color-scheme:\w+/,
                        `prefers-color-scheme:${
                            (currentToggleState === "dark" &&
                                currentOsTheme === "dark") ||
                            (currentToggleState === "light" &&
                                currentOsTheme === "light")
                                ? "dark"
                                : "light"
                        }`
                    )
                    styleTag.innerHTML = newCSS
                }

                localStorage.setItem("currentToggleState", currentToggleState)
            }
        }, [isOn])

        const [isClient, setIsClient] = useState(false)

        useEffect(() => {
            setIsClient(true)
        }, [])

        return <Component {...props} onClick={toggle} />
    }
}
