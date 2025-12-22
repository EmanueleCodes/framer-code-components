import React, { useEffect, useRef, useState, useId, useMemo } from "react"
import { ControlType, addPropertyControls, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// import { ComponentMessage } from "../../utils/ComponentMessage"

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //
interface FontProps {
    fontFamily?: string
    fontWeight?: string | number
    fontSize?: string
    letterSpacing?: string
    lineHeight?: string
    textAlign?: "left" | "center" | "right" | "justify"
}

interface TextItem {
    text: string
    color: string
}

interface FlipTextCycleProps {
    texts: TextItem[]
    font: FontProps
    cycleDelay: number
    flipDuration: number
    staggerDelay: number
    preview: boolean
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //
addPropertyControls(FlipTextCycle, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        enabledTitle: "On",
        disabledTitle: "Off",
        defaultValue: false,
    },
    texts: {
        title: "Texts",
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: {
                text: { type: ControlType.String },
                color: { type: ControlType.Color, title: "Text Color" },
            },
        },
    },
    font: {
        type: ControlType.Font,
        defaultFontType: "sans-serif",
        controls: "extended",
        title: "Font",
        //@ts-check
        fontWeight: "500",
        defaultValue: {
            //@ts-ignore
            fontFamily: "Geist",
            fontWeight: "500",
            letterSpacing: "-0.02em",
            lineHeight: "1.5em",
            textAlign: "left",
            fontSize: 40,
        },
    },
    cycleDelay: {
        title: "Delay",
        type: ControlType.Number,
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 1.5,
        unit: "s",
    },
    staggerDelay: {
        title: "Stagger",
        type: ControlType.Number,
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.015,
        unit: "s",
    },
    flipDuration: {
        title: "Duration",
        type: ControlType.Number,
        min: 0.1,
        max: 2,
        step: 0.1,
        defaultValue: 0.2,
        unit: "s",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// ------------------------------------------------------------ //
// DEFAULT PROPS
// ------------------------------------------------------------ //
FlipTextCycle.defaultProps = {
    cycleDelay: 2,
    flipDuration: 0.6,
    staggerDelay: 0.05,
    preview: true,
    font: {
        fontFamily: "Geist",
        fontWeight: "medium",
        letterSpacing: "-0.02em",
        lineHeight: "1.5em",
        textAlign: "left" as const,
        fontSize: "40px",
    },
    texts: [
        {
            text: "Framer University",
            color: "#45ED8E",
        },
        {
            text: "Learn Framer",
            color: "#8754EB",
        },
    ],
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerDisableUnlink
 */
export default function FlipTextCycle(props: FlipTextCycleProps) {
    const areTextsEmpty = props.texts.length === 0 || !props.texts
    const [currentTextIndex, setCurrentTextIndex] = useState<number>(0)
    const [isAnimating, setIsAnimating] = useState<boolean>(false)
    const [cycleId, setCycleId] = useState<number>(0)
    const [isInViewport, setIsInViewport] = useState<boolean>(true)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const pauseInCanvas = isCanvas && !props.preview
    const containerRef = useRef<HTMLDivElement>(null)

    // Unique id to avoid clashes between multiple component instances
    const reactId = useId()
    const safeId = useMemo(
        () => reactId.replace(/[^a-zA-Z0-9_-]/g, "-"),
        [reactId]
    )

    const currentText = props.texts[currentTextIndex]

    // Stable refs to avoid re-scheduling loops
    const indexRef = useRef<number>(0)
    const textsRef = useRef(props.texts)
    const cycleDelayRef = useRef(props.cycleDelay)
    const flipDurationRef = useRef(props.flipDuration)
    const staggerDelayRef = useRef(props.staggerDelay)
    const animationTimeoutRef = useRef<number | null>(null)
    const gapTimeoutRef = useRef<number | null>(null)

    // Keep refs in sync with latest props
    useEffect(() => {
        textsRef.current = props.texts
        if (indexRef.current >= props.texts.length) {
            indexRef.current = 0
            setCurrentTextIndex(0)
        }
    }, [props.texts])

    useEffect(() => {
        cycleDelayRef.current = props.cycleDelay
    }, [props.cycleDelay])

    useEffect(() => {
        flipDurationRef.current = props.flipDuration
    }, [props.flipDuration])

    useEffect(() => {
        staggerDelayRef.current = props.staggerDelay
    }, [props.staggerDelay])

    // Viewport detection for performance optimization
    useEffect(() => {
        if (!containerRef.current) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInViewport(entry.isIntersecting)
            },
            { threshold: 0.1 }
        )

        observer.observe(containerRef.current)

        return () => {
            observer.disconnect()
        }
    }, [])

    // Single scheduler loop: animate -> wait -> next
    useEffect(() => {
        if (areTextsEmpty) return

        const clearTimers = () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current)
                animationTimeoutRef.current = null
            }
            if (gapTimeoutRef.current) {
                clearTimeout(gapTimeoutRef.current)
                gapTimeoutRef.current = null
            }
        }

        if (pauseInCanvas || !isInViewport) {
            clearTimers()
            return () => clearTimers()
        }

        const scheduleNext = () => {
            // Start animating current word
            setIsAnimating(true)
            const current = textsRef.current[indexRef.current]
            const letterCount = current?.text?.length ?? 0
            const staggerDelay = staggerDelayRef.current // seconds
            const totalDurationSec = Math.max(
                0,
                (letterCount - 1) * staggerDelay + flipDurationRef.current
            )

            // When the last letter finishes, keep the word visible during the gap
            animationTimeoutRef.current = window.setTimeout(() => {
                // Wait for the configured gap while keeping letters visible
                gapTimeoutRef.current = window.setTimeout(() => {
                    // Prepare next cycle: briefly hide, swap text, then animate in
                    setIsAnimating(false)
                    // Allow DOM to apply the hidden state before swapping text
                    window.setTimeout(() => {
                        const next =
                            (indexRef.current + 1) % textsRef.current.length
                        indexRef.current = next
                        setCurrentTextIndex(next)
                        // Force new letter elements so transitions retrigger even for repeated words
                        setCycleId((id) => id + 1)
                        // Ensure the DOM commits the new letters at rest before animating
                        window.requestAnimationFrame(() => {
                            window.requestAnimationFrame(() => {
                                scheduleNext()
                            })
                        })
                    }, 0)
                }, cycleDelayRef.current * 1000)
            }, totalDurationSec * 1000)
        }

        // Kick off first cycle on mount with two RAFs to ensure initial state paints
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                scheduleNext()
            })
        })

        return () => {
            clearTimers()
        }
    }, [areTextsEmpty, pauseInCanvas, isInViewport])

    const baseStyle = `
    @layer demo {
      .flip-text-container-${safeId} {
        perspective: 1000px;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transform-style: preserve-3d;
      }
      .flip-text-${safeId} {
        font-family: ${props.font.fontFamily};
        font-weight: ${props.font.fontWeight};
        font-size: ${props.font.fontSize};
        letter-spacing: ${props.font.letterSpacing};
        line-height: ${props.font.lineHeight};
        text-align: ${props.font.textAlign};
        margin: 0;
        display: inline-block;
        white-space: break-spaces;
        transform-style: preserve-3d;
      }
      .flip-letter-${safeId} {
        display: inline-block;
        color: ${currentText?.color || "#000"};
        transform-style: preserve-3d;
        transition: transform ${props.flipDuration}s ease-in, opacity ${props.flipDuration}s ease-in;
        transform: rotateY(90deg);
        opacity: 0;
      }
      .flip-letter-${safeId}.animate {
        transform: rotateY(0deg);
        opacity: 1;
      }
      .flip-letter-${safeId}.no-anim {
        transition: none;
        transform: rotateY(0deg);
        opacity: 1;
      }
    }
`

    const style = useMemo(() => {
        return baseStyle
    }, [
        safeId,
        props.font.fontFamily,
        props.font.fontWeight,
        props.font.fontSize,
        props.font.letterSpacing,
        props.font.lineHeight,
        props.font.textAlign,
        currentText?.color,
        isAnimating,
        props.flipDuration,
    ])

    // Split text into tokens (words and spaces) so wrapping happens between words only
    const tokens = useMemo(() => {
        return currentText?.text ? currentText.text.split(/(\s+)/) : []
    }, [currentText?.text, currentTextIndex, cycleId])
    
    // Memoize the rendered content to avoid unnecessary re-renders
    const renderedContent = useMemo(() => {
        let letterCounter = 0
        return tokens.map((token, tIndex) => {
            const isSpace = token.trim() === ""
            if (isSpace) {
                // render a single normal space so the next line never starts with an extra gap
                return (
                    <span
                        key={`${currentTextIndex}-${cycleId}-space-${tIndex}`}
                    >
                        {" "}
                    </span>
                )
            }
            return (
                <span
                    key={`${currentTextIndex}-${cycleId}-word-${tIndex}`}
                    style={{ display: "inline-block", whiteSpace: "nowrap" }}
                >
                    {token.split("").map((letter, lIndex) => {
                        const globalIndex = letterCounter++
                        return (
                            <span
                                key={`${currentTextIndex}-${cycleId}-${tIndex}-${lIndex}`}
                                className={`flip-letter-${safeId} ${pauseInCanvas ? "no-anim" : isAnimating ? "animate" : ""}`}
                                style={{
                                    transitionDelay: pauseInCanvas
                                        ? "0s"
                                        : `${globalIndex * props.staggerDelay}s`,
                                }}
                            >
                                {letter}
                            </span>
                        )
                    })}
                </span>
            )
        })
    }, [tokens, currentTextIndex, cycleId, pauseInCanvas, isAnimating, safeId, props.staggerDelay])

    if (areTextsEmpty) {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <ComponentMessage
                    title="Flip Text Cycle"
                    subtitle="Set up the component by adding texts to the component properties."
                />
            </div>
        )
    }

    return (
        <>
            <style>{style}</style>
            <div
                ref={containerRef}
                className={`flip-text-container-${safeId}`}
                style={{
                    width: "100%",
                    height: "100%",
                }}
            >
                <span className={`flip-text-${safeId}`}>
                    {renderedContent}
                </span>
            </div>
        </>
    )
}

FlipTextCycle.displayName = "Flip Text Cycle"
