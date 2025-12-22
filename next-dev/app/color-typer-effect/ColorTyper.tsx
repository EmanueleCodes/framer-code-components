import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useRef, useEffect, useState, useCallback } from "react"

import {
    gsap,
    useGSAP,
    SplitText,
    ScrollTrigger,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"

// Register plugins
gsap.registerPlugin(SplitText, useGSAP, ScrollTrigger)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface ColorTyperEffectProps {
    mode: "appear" | "layer-in-view" | "toggle"
    enabled: boolean
    startAlign: "top" | "center" | "bottom"
    replay: boolean
    text: string
    appearColor: string
    finalColor: string
    splitType: "words" | "chars"
    font: React.CSSProperties
    tag: string
    style: React.CSSProperties
    delay: number
    colorDelay: number
    stagger: number
    direction?: string
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 420
 * @framerDisableUnlink
 */
export default function ColorTyperEffect(props: ColorTyperEffectProps) {
    const {
        text = "Type to reveal",
        appearColor = "#00FF00",
        finalColor = "#000000",
        font = {},
        tag = "h1",
        style = {},
        splitType = "chars",
        mode = "appear",
        enabled = true,
        startAlign = "top",
        replay = true,
        delay = 0.2,
        colorDelay = 0.3,
        stagger = 0.1,
        direction = "left-to-right",
    } = props

    const textRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const splitTextRef = useRef<any>(null)
    const animatedElementsRef = useRef<HTMLElement[]>([])
    const hasAnimatedRef = useRef(false)
    const TAG = tag

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Scroll trigger state (for layer-in-view mode)
    const [isInView, setIsInView] = useState(false)
    const [isOutOfView, setIsOutOfView] = useState(false)
    const [hasTriggered, setHasTriggered] = useState(false)

    // Update finalColor on split elements when changed in canvas (without replaying animation)
    useEffect(() => {
        if (!animatedElementsRef.current.length || !hasAnimatedRef.current)
            return

        gsap.killTweensOf(animatedElementsRef.current)
        gsap.set(animatedElementsRef.current, {
            opacity: 1,
            color: finalColor,
        })
    }, [finalColor])

    // Animation function
    const animateText = useCallback(() => {
        if (!animatedElementsRef.current.length) return

        gsap.killTweensOf(animatedElementsRef.current)
        hasAnimatedRef.current = false

        const totalElements = animatedElementsRef.current.length

        animatedElementsRef.current.forEach((element, index) => {
            const elementIndex =
                direction === "left-to-right"
                    ? index
                    : animatedElementsRef.current.length - 1 - index
            const baseDelay = elementIndex * stagger
            const isLastElement = index === totalElements - 1

            gsap.to(element, {
                opacity: 1,
                color: appearColor,
                duration: 0,
                delay: baseDelay + delay,
            })

            gsap.to(element, {
                color: finalColor,
                duration: 0,
                delay: baseDelay + delay + colorDelay,
                onComplete: isLastElement
                    ? () => {
                          hasAnimatedRef.current = true
                      }
                    : undefined,
            })
        })
    }, [appearColor, finalColor, delay, colorDelay, stagger, direction])

    // Reset to initial state (all elements hidden)
    const resetToInitial = useCallback(() => {
        if (!animatedElementsRef.current.length) return
        gsap.killTweensOf(animatedElementsRef.current)
        gsap.set(animatedElementsRef.current, { opacity: 0 })
        hasAnimatedRef.current = false
    }, [])

    // Show final state (all elements visible with final color)
    const showFinalState = useCallback(() => {
        if (!animatedElementsRef.current.length) return
        gsap.killTweensOf(animatedElementsRef.current)
        gsap.set(animatedElementsRef.current, {
            opacity: 1,
            color: finalColor,
        })
        hasAnimatedRef.current = true
    }, [finalColor])

    // Split text setup
    const setupSplitText = useCallback(() => {
        if (!textRef.current) return false

        // Clean up previous split
        if (splitTextRef.current) {
            splitTextRef.current.revert()
        }

        // Create SplitText based on splitType
        if (splitType === "words") {
            const wordSplit = SplitText.create(textRef.current, {
                type: "words",
                wordsClass: "word",
            })
            splitTextRef.current = wordSplit
            animatedElementsRef.current = wordSplit.words
        } else {
            const wordSplit = SplitText.create(textRef.current, {
                type: "words",
                wordsClass: "word",
            })
            const charSplit = SplitText.create(wordSplit.words, {
                type: "chars",
                charsClass: "char",
            })
            splitTextRef.current = charSplit
            animatedElementsRef.current = charSplit.chars
        }

        // Set initial state - all elements transparent
        gsap.set(animatedElementsRef.current, { opacity: 0 })

        return true
    }, [splitType])

    // ------------------------------------------------------------ //
    // SCROLL DETECTION (for layer-in-view mode)
    // ------------------------------------------------------------ //

    useEffect(() => {
        if (mode !== "layer-in-view" || isCanvas) return

        let rafId: number | null = null

        const checkAlignment = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight || 0
            const viewportBottom = viewportHeight

            let elementPoint: number
            if (startAlign === "top") {
                elementPoint = rect.top
            } else if (startAlign === "center") {
                elementPoint = rect.top + rect.height / 2
            } else {
                elementPoint = rect.bottom
            }

            const isAligned = elementPoint <= viewportBottom && rect.bottom >= 0
            setIsInView(isAligned)

            const completelyOutOfView = rect.top > viewportHeight
            setIsOutOfView(completelyOutOfView)
        }

        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(checkAlignment)
        }

        checkAlignment()
        window.addEventListener("scroll", handleScroll, { passive: true })
        window.addEventListener("resize", checkAlignment)

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", checkAlignment)
        }
    }, [mode, startAlign, isCanvas])

    // ------------------------------------------------------------ //
    // MODE: TOGGLE
    // ------------------------------------------------------------ //

    useGSAP(() => {
        if (mode !== "toggle") return
        if (!setupSplitText()) return

        if (enabled) {
            animateText()
        } else {
            showFinalState()
        }
    }, [mode, enabled, text, splitType, isCanvas, setupSplitText, animateText, showFinalState])

    // ------------------------------------------------------------ //
    // MODE: APPEAR
    // ------------------------------------------------------------ //

    useGSAP(() => {
        if (mode !== "appear") return
        if (!setupSplitText()) return

        if (isCanvas) {
            showFinalState()
        } else {
            animateText()
        }
    }, [mode, text, splitType, isCanvas, setupSplitText, animateText, showFinalState])

    // ------------------------------------------------------------ //
    // MODE: LAYER IN VIEW
    // ------------------------------------------------------------ //

    // Setup split text for layer-in-view mode
    useEffect(() => {
        if (mode !== "layer-in-view") return
        if (isCanvas) return

        setupSplitText()
    }, [mode, text, splitType, isCanvas, setupSplitText])

    // Canvas preview for layer-in-view
    useGSAP(() => {
        if (mode !== "layer-in-view" || !isCanvas) return
        if (!setupSplitText()) return

        showFinalState()
    }, [mode, text, splitType, isCanvas, setupSplitText, showFinalState])

    // Handle scroll triggers for layer-in-view
    useEffect(() => {
        if (mode !== "layer-in-view" || isCanvas) return

        if (isOutOfView && replay) {
            resetToInitial()
            setHasTriggered(false)
            return
        }

        if (isInView && !hasTriggered && animatedElementsRef.current.length > 0) {
            setHasTriggered(true)
            animateText()
        }
    }, [mode, isCanvas, isInView, isOutOfView, hasTriggered, replay, animateText, resetToInitial])

    // Reset hasTriggered when mode changes
    useEffect(() => {
        setHasTriggered(false)
    }, [mode])

    // Clean up on unmount
    useGSAP(() => {
        return () => {
            if (splitTextRef.current) {
                splitTextRef.current.revert()
            }
        }
    }, [])

    return (
        <div
            ref={containerRef}
            className="color-typer-effect"
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "auto",
                width: "fit-content",
                backgroundColor: "transparent",
                ...style,
            }}
        >
            {React.createElement(
                TAG,
                {
                    ref: textRef,
                    style: {
                        margin: 0,
                        color: finalColor,
                        fontSize: font.fontSize,
                        lineHeight: font.lineHeight,
                        fontWeight: font.fontWeight || "700",
                        fontFamily:
                            font.fontFamily ||
                            "system-ui, -apple-system, sans-serif",
                        fontStyle: font.fontStyle,
                        textDecoration: font.textDecoration,
                        letterSpacing: font.letterSpacing,
                        marginBlock: 0,
                        marginInline: 0,
                        padding: 0,
                    },
                },
                text
            )}
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(ColorTyperEffect, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["appear", "layer-in-view", "toggle"],
        optionTitles: ["Appear", "Layer in View", "Toggle"],
        defaultValue: "appear",
    },
    enabled: {
        type: ControlType.Boolean,
        title: "Enabled",
        defaultValue: true,
        hidden: (props) => props.mode !== "toggle",
    },
    startAlign: {
        type: ControlType.Enum,
        title: "Start At",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        defaultValue: "top",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        hidden: (props) => props.mode !== "layer-in-view",
    },
    replay: {
        type: ControlType.Boolean,
        title: "Replay",
        defaultValue: true,
        hidden: (props) => props.mode !== "layer-in-view",
    },
    text: {
        type: ControlType.String,
        title: "Text",
        defaultValue: "Type to reveal",
    },
    appearColor: {
        type: ControlType.Color,
        title: "Color 1",
        defaultValue: "#00FF00",
    },
    finalColor: {
        type: ControlType.Color,
        title: "Color 2",
        defaultValue: "#737373",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: 48,
            //@ts-ignore
            fontWeight: "600",
            fontFamily: "monospace, system-ui, -apple-system, sans-serif",
        },
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"],
        defaultValue: "h1",
    },
    splitType: {
        type: ControlType.Enum,
        title: "Split Per",
        options: ["words", "chars"],
        optionTitles: ["Words", "Characters"],
        defaultValue: "chars",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["right-to-left", "left-to-right"],
        optionIcons: ["direction-left", "direction-right"],
        defaultValue: "left-to-right",
        displaySegmentedControl: true,
    },
    delay: {
        type: ControlType.Number,
        title: "Delay",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 0.2,
        unit: "s",
    },
    colorDelay: {
        type: ControlType.Number,
        title: "Color Time",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 0.3,
        unit: "s",
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.1,
        unit: "s",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ColorTyperEffect.displayName = "Color Typer"
