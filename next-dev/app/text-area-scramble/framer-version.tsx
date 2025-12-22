import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef, useState } from "react"

// Do not fix the import, these are the imports for framer.
import {
    gsap,
    useGSAP,
    SplitText,
    ScrambleTextPlugin,
    //@ts-ignore
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/text-area-hover-scramble.js"

gsap.registerPlugin(SplitText, ScrambleTextPlugin, useGSAP)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface ScrambleTextProps {
    text: string
    radius: number
    speed: number
    percentage: number
    color: string
    scrambleColor: string
    scrambleChars?: string
    className?: string
    style?: React.CSSProperties
    font?: React.CSSProperties
    tag?: string
}

const DEFAULT_SCRAMBLE_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicWidth auto
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 * @framerDisableUnlink
 */
export default function ScrambledText(props: ScrambleTextProps) {
    const {
        text = "Hover over this text to see the scramble effect",
        radius,
        speed,
        percentage,
        color,
        scrambleColor,
        scrambleChars = ".:",
        className = "",
        style = {},
        font = {},
        tag = "p",
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const charsRef = useRef<Element[]>([])
    const charCentersRef = useRef<{ el: Element; cx: number; cy: number }[]>([])
    const recomputeCentersTimeoutRef = useRef<number | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isMouseOverText, setIsMouseOverText] = useState(false)
    const isMouseOverTextRef = useRef<boolean>(false)
    const currentMousePosRef = useRef({ x: 0, y: 0 })
    const scrambleIntervalRef = useRef<number | null>(null)
    const currentScrambledStates = useRef<Map<Element, string>>(new Map())
    const nearbyCharsRef = useRef<Element[]>([])
    const animationFrameRef = useRef<number | null>(null)
    const prevNearbySetRef = useRef<Set<Element>>(new Set())
    const displayingScrambledRef = useRef<Set<Element>>(new Set())

    const TAG = tag

    // Debounce percentage updates to avoid heavy re-initializations during slider drags
    const [debouncedPercentage, setDebouncedPercentage] = useState(percentage)
    useEffect(() => {
        const id = window.setTimeout(() => {
            setDebouncedPercentage(percentage)
        }, 100)
        return () => window.clearTimeout(id)
    }, [percentage])

    const toRgba = (hex: string, alpha: number): string => {
        const normalized = hex.replace("#", "")
        const bigint = parseInt(
            normalized.length === 3
                ? normalized
                      .split("")
                      .map((c) => c + c)
                      .join("")
                : normalized,
            16
        )
        const r = (bigint >> 16) & 255
        const g = (bigint >> 8) & 255
        const b = bigint & 255
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    useGSAP(() => {
        // Do not run animation logic in the Framer canvas
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (!rootRef.current) return

        const paragraph = rootRef.current.querySelector(
            "[data-scramble-element]"
        ) as HTMLElement | null
        if (!paragraph) return

        // First split by words to maintain proper text wrapping
        const wordSplit = SplitText.create(paragraph, {
            type: "words",
            wordsClass: "word",
        })

        // Then split each word into characters for scrambling
        const charSplit = SplitText.create(wordSplit.words, {
            type: "chars",
            charsClass: "char",
        })

        charsRef.current = charSplit.chars

        // Set initial styles for each character
        charsRef.current.forEach((char: Element) => {
            const rect = (char as HTMLElement).getBoundingClientRect()
            gsap.set(char, {
                display: "inline-block",
                color: color,
                width: `${rect.width}px`,
                textAlign: "center",
                // keep baseline alignment across mixed tags/sizes
                verticalAlign: "baseline",
                attr: { "data-content": char.innerHTML },
            })
            ;(char as HTMLElement).dataset.state = "normal"
            // Initialize scrambled state for each character
            currentScrambledStates.current.set(char, char.innerHTML)
        })

        const computeCharCenters = () => {
            charCentersRef.current = charsRef.current.map((char) => {
                const rect = (char as HTMLElement).getBoundingClientRect()
                return {
                    el: char,
                    cx: rect.left + rect.width / 2,
                    cy: rect.top + rect.height / 2,
                }
            })
        }

        // Initial compute of centers
        computeCharCenters()

        const scheduleRecomputeCenters = () => {
            if (recomputeCentersTimeoutRef.current) {
                window.clearTimeout(recomputeCentersTimeoutRef.current)
            }
            recomputeCentersTimeoutRef.current = window.setTimeout(() => {
                computeCharCenters()
            }, 100)
        }

        const handleResize = () => scheduleRecomputeCenters()
        const handleScroll = () => scheduleRecomputeCenters()

        window.addEventListener("resize", handleResize)
        // use capture to catch scrolls on any scrollable parent
        window.addEventListener("scroll", handleScroll, true)

        // Function to generate a random scrambled character
        const getRandomChar = () => {
            const charsToUse = scrambleChars || DEFAULT_SCRAMBLE_CHARS
            return charsToUse[Math.floor(Math.random() * charsToUse.length)]
        }

        // Ensure the scrambled character is different from the original one
        const getRandomCharDifferentFrom = (originalChar: string) => {
            const charsToUse = scrambleChars || DEFAULT_SCRAMBLE_CHARS
            if (!charsToUse || charsToUse.length === 0) return originalChar
            // Try a few times to avoid matching the original
            let candidate = charsToUse[Math.floor(Math.random() * charsToUse.length)]
            if (charsToUse.length === 1) return candidate
            for (let i = 0; i < 5 && candidate === originalChar; i++) {
                candidate = charsToUse[Math.floor(Math.random() * charsToUse.length)]
            }
            if (candidate === originalChar) {
                const idx = Math.max(0, charsToUse.indexOf(candidate))
                return charsToUse[(idx + 1) % charsToUse.length]
            }
            return candidate
        }

        // Function to check if mouse is within radius of any character
        const isMouseNearAnyChar = () => {
            if (!rootRef.current) return false
            const r2 = radius * radius
            for (let i = 0; i < charCentersRef.current.length; i++) {
                const { cx, cy } = charCentersRef.current[i]
                const dx = currentMousePosRef.current.x - cx
                const dy = currentMousePosRef.current.y - cy
                if (dx * dx + dy * dy < r2) return true
            }
            return false
        }

        // Time-based scrambling function that updates ALL characters continuously
        const updateScrambledStates = () => {
            // Always scramble all characters when mouse is near any character
            if (!isMouseNearAnyChar()) return

            // For 100%, scramble ALL characters including spaces
            // For <100%, only scramble non-space characters
            let charsToScramble: Element[]
            let total: number
            
            if (debouncedPercentage >= 100) {
                // 100% means ALL characters get scrambled
                charsToScramble = charsRef.current
                total = charsToScramble.length
            } else {
                // <100% means only non-space characters get scrambled
                charsToScramble = charsRef.current.filter((char: Element) => {
                    const originalChar = char.getAttribute("data-content") || ""
                    return originalChar.trim() !== "" // Don't scramble spaces
                })
                total = charsToScramble.length
                
                // Calculate how many characters to scramble based on percentage
                const charsToScrambleCount = Math.min(
                    total,
                    Math.max(0, Math.ceil((total * debouncedPercentage) / 100))
                )
                
                // Randomly select characters to scramble
                if (charsToScrambleCount >= total) {
                    // All scrambleable chars get scrambled
                } else if (charsToScrambleCount > 0) {
                    const indices = Array.from({ length: total }, (_, i) => i)
                    for (let i = 0; i < charsToScrambleCount; i++) {
                        const j = i + Math.floor(Math.random() * (total - i))
                        const tmp = indices[i]
                        indices[i] = indices[j]
                        indices[j] = tmp
                    }
                    charsToScramble = indices
                        .slice(0, charsToScrambleCount)
                        .map((idx) => charsToScramble[idx])
                } else {
                    charsToScramble = []
                }
            }

            // Build a set for O(1) membership checks
            const chosenSet = new Set(charsToScramble)

            // For this tick: chosen chars get a new scrambled glyph; all others revert to original
            charsRef.current.forEach((char: Element) => {
                const originalChar = char.getAttribute("data-content") || ""
                if (chosenSet.has(char)) {
                    currentScrambledStates.current.set(
                        char,
                        getRandomCharDifferentFrom(originalChar)
                    )
                } else {
                    currentScrambledStates.current.set(char, originalChar)
                }
            })

            // Update the display to show current states
            updateCharacterDisplay()
            // Scrambling can change glyph widths; recompute centers to keep the hover circle accurate
            computeCharCenters()
        }

        // Function to update character display based on current mouse position
        const updateCharacterDisplay = () => {
            if (!rootRef.current) return

            const r2 = radius * radius
            let anyNear = false
            const nearNow: Element[] = []
            const prevSet = prevNearbySetRef.current

            for (let i = 0; i < charCentersRef.current.length; i++) {
                const { el, cx, cy } = charCentersRef.current[i]
                const dx = currentMousePosRef.current.x - cx
                const dy = currentMousePosRef.current.y - cy
                const within = dx * dx + dy * dy < r2

                if (within) {
                    anyNear = true
                    nearNow.push(el)
                }

                const element = el as HTMLElement
                const originalChar = element.getAttribute("data-content") || ""

                if (within) {
                    // Show scrambled content when within radius
                    const scrambledChar = currentScrambledStates.current.get(el) || originalChar
                    if (element.textContent !== scrambledChar) {
                        element.textContent = scrambledChar
                    }

                    // Track if this character is actually showing scrambled content
                    const isShowingScrambled = element.textContent !== originalChar
                    if (isShowingScrambled) {
                        displayingScrambledRef.current.add(el)
                    } else {
                        displayingScrambledRef.current.delete(el)
                    }
                    element.dataset.state = isShowingScrambled ? "scrambled" : "hover"
                } else {
                    if (element.textContent !== originalChar)
                        element.textContent = originalChar
                    displayingScrambledRef.current.delete(el)
                    element.dataset.state = "normal"
                }

                // Enforce color strictly based on what is currently displayed
                const shouldUseScrambleColor = element.textContent !== originalChar
                element.style.color = shouldUseScrambleColor ? scrambleColor : color
            }

            nearbyCharsRef.current = nearNow
            setIsMouseOverText(anyNear)
            isMouseOverTextRef.current = anyNear

            // Keep the latest nearby set for potential future logic, but do not
            // force a re-scramble here. Scrambling should follow the timer only.
            prevNearbySetRef.current = new Set(nearNow)
        }

        // Global mouse move handler using requestAnimationFrame
        const handleGlobalMove = (e: PointerEvent) => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                currentMousePosRef.current = { x: e.clientX, y: e.clientY }
                setMousePos({ x: e.clientX, y: e.clientY })
                updateCharacterDisplay()

                // Start/stop scrambling based on proximity to characters
                const isNearAnyChar = isMouseNearAnyChar()
                if (isNearAnyChar && !scrambleIntervalRef.current) {
                    // Start scrambling interval when mouse gets near any character
                    // Trigger an immediate scramble so the effect starts instantly on hover
                    updateScrambledStates()
                    const clampedSpeed = Math.max(1, Math.min(100, speed))
                    const intervalSeconds = 1 + (0.95 / 99) * (1 - clampedSpeed) // 1 -> 1s, 100 -> 0.05s
                    scrambleIntervalRef.current = window.setInterval(
                        updateScrambledStates,
                        intervalSeconds * 1000
                    )
                } else if (!isNearAnyChar && scrambleIntervalRef.current) {
                    // Stop scrambling interval when mouse is far from all characters
                    window.clearInterval(scrambleIntervalRef.current)
                    scrambleIntervalRef.current = null
                }
            })
        }

        // Add global mouse move listener
        document.addEventListener("pointermove", handleGlobalMove)

        return () => {
            document.removeEventListener("pointermove", handleGlobalMove)

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            charSplit.revert()
            wordSplit.revert()

            // Clear the scrambling interval
            if (scrambleIntervalRef.current) {
                window.clearInterval(scrambleIntervalRef.current)
            }
            currentScrambledStates.current.clear()

            if (recomputeCentersTimeoutRef.current) {
                window.clearTimeout(recomputeCentersTimeoutRef.current)
            }
            window.removeEventListener("resize", handleResize)
            window.removeEventListener("scroll", handleScroll, true)
        }
    }, [
        radius,
        speed,
        debouncedPercentage,
        scrambleChars,
        color,
        scrambleColor,
        text,
        tag,
    ])

    return (
        <div
            ref={rootRef}
            className={`text-block ${className}`}
            style={{ ...font, ...style }}
        >
            {React.createElement(
                TAG,
                { 
                    style: { 
                        margin: 0, 
                        color,
                        // Apply font styles directly to the text element
                        fontSize: font.fontSize,
                        lineHeight: font.lineHeight,
                        fontFamily: font.fontFamily,
                        fontWeight: font.fontWeight,
                        fontStyle: font.fontStyle,
                        textDecoration: font.textDecoration,
                        letterSpacing: font.letterSpacing,
                        textAlign: font.textAlign,
                        // Reset any default browser styles that might interfere
                        marginBlock: 0,
                        marginInline: 0,
                        padding: 0,
                    }, 
                    "data-scramble-element": true 
                },
                text
            )}

            {/* Visual indicator circle around cursor - only show when mouse is over text */}
            {isMouseOverText && (
                <div
                    style={{
                        position: "fixed",
                        left: mousePos.x - radius,
                        top: mousePos.y - radius,
                        width: radius * 2,
                        height: radius * 2,
                        //border: "1px solid rgba(136, 85, 255, 0.3)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                        zIndex: 9999,
                        transition: "opacity 0.2s ease",
                    }}
                />
            )}
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(ScrambledText, {
    text: {
        type: ControlType.String,
        title: "Text",
        displayTextArea: true,
        defaultValue: "Hover over this text to see the scramble effect",
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["p", "h1", "h2", "h3", "h4", "h5", "h6"],
        defaultValue: "p",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        unit: "px",
        min: 10,
        max: 300,
        defaultValue: 100,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 56, // ~0.5s interval equivalent
    },
    percentage: {
        type: ControlType.Number,
        title: "Percentage",
        min: 0,
        max: 100,
        defaultValue: 100,
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
    },
    scrambleColor: {
        type: ControlType.Color,
        title: "Scramble",
        defaultValue: "#8855FF",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: 16,
            lineHeight: 1.5,
        },
    },
    scrambleChars: {
        type: ControlType.String,
        title: "Characters",
        placeholder: "Or leave empty",
        defaultValue: DEFAULT_SCRAMBLE_CHARS,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ScrambledText.displayName = "Scramble Area"
