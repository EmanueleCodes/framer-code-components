import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

/** Width resize when word length changes (blind stays full until this finishes). */
const WIDTH_RESIZE_SEC = 0.1

const ZOOM_PROBE_CSS_PX = 20

function getCanvasZoomFactor(probe: HTMLElement | null): number {
    if (!probe) return 1
    const rw = probe.getBoundingClientRect().width
    return Math.max(rw / ZOOM_PROBE_CSS_PX, 0.0001)
}

interface FontProps {
    fontFamily?: string
    fontWeight?: string | number
    fontSize?: string | number
    letterSpacing?: string
    lineHeight?: string
    textAlign?: "left" | "center" | "right" | "justify"
}

interface WordItem {
    text: string
    color: string
}

type Direction =
    | "left-to-right"
    | "right-to-left"
    | "top-to-bottom"
    | "bottom-to-top"

interface BlindsWordCycleProps {
    preview: boolean
    pauseOffscreen: boolean
    words: WordItem[]
    color: string
    font: FontProps
    delay: number
    direction: Direction
    transitionIn?: {
        type?: "tween" | "spring" | "keyframes" | "inertia"
        duration?: number
        ease?: string | number[]
        delay?: number
        stiffness?: number
        damping?: number
        mass?: number
        bounce?: number
        restDelta?: number
        restSpeed?: number
    }
    transitionOut?: {
        type?: "tween" | "spring" | "keyframes" | "inertia"
        duration?: number
        ease?: string | number[]
        delay?: number
        stiffness?: number
        damping?: number
        mass?: number
        bounce?: number
        restDelta?: number
        restSpeed?: number
    }
}

function getCoverOrigin(direction: Direction): string {
    switch (direction) {
        case "left-to-right":
            return "left center"
        case "right-to-left":
            return "right center"
        case "top-to-bottom":
            return "center top"
        case "bottom-to-top":
            return "center bottom"
        default:
            return "left center"
    }
}

function getUncoverOrigin(direction: Direction): string {
    switch (direction) {
        case "left-to-right":
            return "right center"
        case "right-to-left":
            return "left center"
        case "top-to-bottom":
            return "center bottom"
        case "bottom-to-top":
            return "center top"
        default:
            return "right center"
    }
}

function getBlindTransform(direction: Direction, scale: number): string {
    if (direction === "top-to-bottom" || direction === "bottom-to-top") {
        return `scaleY(${scale})`
    }
    return `scaleX(${scale})`
}

function getTimingFunction(ease?: string | number[]): string {
    if (!ease) return "ease-in-out"
    if (Array.isArray(ease) && ease.length === 4) {
        return `cubic-bezier(${ease[0]}, ${ease[1]}, ${ease[2]}, ${ease[3]})`
    }
    if (typeof ease === "string") {
        return ease
    }
    return "ease-in-out"
}

function getTransitionDuration(transition?: {
    type?: "tween" | "spring" | "keyframes" | "inertia"
    duration?: number
}): number {
    if (transition?.type === "spring") return 0.45
    return transition?.duration ?? 0.35
}

function measureSpanWidth(span: HTMLElement, zoom: number): number {
    const rectW = span.getBoundingClientRect().width / zoom
    const w = Math.max(span.offsetWidth, span.scrollWidth, rectW)
    return Math.ceil(w)
}

function measureSpanHeight(span: HTMLElement, zoom: number): number {
    return span.getBoundingClientRect().height / zoom
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 220
 * @framerDisableUnlink
 */
export default function BlindsWordCycle(props: BlindsWordCycleProps) {
    const {
        preview,
        pauseOffscreen,
        words,
        color,
        font,
        delay,
        direction,
        transitionIn,
        transitionOut,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const pauseInCanvas = isCanvas && !preview

    const containerRef = useRef<HTMLDivElement>(null)
    const measureContainerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const loopTimeoutRef = useRef<number | null>(null)
    const inTimeoutRef = useRef<number | null>(null)
    const widthTimeoutRef = useRef<number | null>(null)
    const outTimeoutRef = useRef<number | null>(null)

    const wordsRef = useRef<WordItem[]>(words)
    const wordWidthsRef = useRef<number[]>([])
    const indexRef = useRef(0)
    const delayRef = useRef(delay)
    const directionRef = useRef<Direction>(direction)
    const transitionInRef = useRef<BlindsWordCycleProps["transitionIn"]>(transitionIn)
    const transitionOutRef = useRef<BlindsWordCycleProps["transitionOut"]>(transitionOut)

    const [isInViewport, setIsInViewport] = useState(true)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [blindColor, setBlindColor] = useState(words[0]?.color || "rgba(0,0,0,0.3)")
    const [blindScale, setBlindScale] = useState(0)
    const [blindOrigin, setBlindOrigin] = useState(getCoverOrigin(direction))
    const [blindDuration, setBlindDuration] = useState(0)
    const [blindEase, setBlindEase] = useState("ease-in-out")

    const [wrapperWidth, setWrapperWidth] = useState<number | null>(null)
    const [widthTransitionDuration, setWidthTransitionDuration] = useState(0)
    const [widthTransitionEase, setWidthTransitionEase] = useState("ease-in-out")
    const [maxHeight, setMaxHeight] = useState<number | null>(null)

    const areWordsEmpty = !words || words.length === 0
    const canLoop = words.length > 1
    const currentWord = words[currentIndex]

    useEffect(() => {
        wordsRef.current = words
        if (indexRef.current >= words.length) {
            indexRef.current = 0
            setCurrentIndex(0)
        }
        setBlindColor(words[indexRef.current]?.color || "rgba(0,0,0,0.3)")
    }, [words])

    useEffect(() => {
        delayRef.current = delay
    }, [delay])

    useEffect(() => {
        directionRef.current = direction
    }, [direction])

    useEffect(() => {
        transitionInRef.current = transitionIn
    }, [transitionIn])

    useEffect(() => {
        transitionOutRef.current = transitionOut
    }, [transitionOut])

    useLayoutEffect(() => {
        if (!measureContainerRef.current) return
        const zoom = getCanvasZoomFactor(zoomProbeRef.current)
        const spans =
            measureContainerRef.current.querySelectorAll<HTMLSpanElement>("[data-measure]")
        const widths: number[] = []
        let mh = 0
        spans.forEach((span) => {
            widths.push(measureSpanWidth(span, zoom))
            const h = measureSpanHeight(span, zoom)
            if (h > mh) mh = h
        })
        wordWidthsRef.current = widths
        if (mh > 0) setMaxHeight(Math.ceil(mh))
        const idx = indexRef.current
        const w = widths[idx]
        if (w && w > 0) {
            setWidthTransitionDuration(0)
            setWidthTransitionEase("linear")
            setWrapperWidth((prev) =>
                prev != null && Math.abs(prev - w) < 0.5 ? prev : w
            )
        }
    }, [words, font, color])

    useEffect(() => {
        if (!pauseOffscreen) {
            setIsInViewport(true)
            return
        }
        if (!containerRef.current) return
        const observer = new IntersectionObserver(
            ([entry]) => setIsInViewport(entry.isIntersecting),
            { threshold: 0.1 }
        )
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [pauseOffscreen])

    useEffect(() => {
        if (!isCanvas) return
        indexRef.current = 0
        setCurrentIndex(0)
        setBlindScale(0)
        setBlindDuration(0)
        setBlindEase("linear")
        setBlindOrigin(getCoverOrigin(directionRef.current))
        setBlindColor(wordsRef.current[0]?.color || "rgba(0,0,0,0.3)")
        setWidthTransitionDuration(0)
        setWidthTransitionEase("linear")
        const w0 = wordWidthsRef.current[0]
        if (w0 && w0 > 0) {
            setWrapperWidth(w0)
        }
    }, [pauseInCanvas, isCanvas])

    useEffect(() => {
        if (!isCanvas || !pauseInCanvas) return
        setBlindOrigin(getCoverOrigin(direction))
    }, [direction, pauseInCanvas, isCanvas])

    useEffect(() => {
        const clearTimers = () => {
            if (loopTimeoutRef.current) {
                clearTimeout(loopTimeoutRef.current)
                loopTimeoutRef.current = null
            }
            if (inTimeoutRef.current) {
                clearTimeout(inTimeoutRef.current)
                inTimeoutRef.current = null
            }
            if (widthTimeoutRef.current) {
                clearTimeout(widthTimeoutRef.current)
                widthTimeoutRef.current = null
            }
            if (outTimeoutRef.current) {
                clearTimeout(outTimeoutRef.current)
                outTimeoutRef.current = null
            }
        }

        if (
            areWordsEmpty ||
            !canLoop ||
            pauseInCanvas ||
            (pauseOffscreen && !isInViewport)
        ) {
            clearTimers()
            return () => clearTimers()
        }

        const runCycle = () => {
            const current = wordsRef.current[indexRef.current]
            const nextIndex = (indexRef.current + 1) % wordsRef.current.length
            const activeDirection = directionRef.current
            const currentTransitionIn = transitionInRef.current
            const currentTransitionOut = transitionOutRef.current
            const inDurationSec = getTransitionDuration(currentTransitionIn)
            const outDurationSec = getTransitionDuration(currentTransitionOut)
            const inEase = getTimingFunction(currentTransitionIn?.ease)
            const outEase = getTimingFunction(currentTransitionOut?.ease)

            const currentW = wordWidthsRef.current[indexRef.current] ?? 0
            const nextW = wordWidthsRef.current[nextIndex] || currentW
            const widthDelta = Math.abs(nextW - currentW)
            const widthAnimMs =
                widthDelta < 1 ? 0 : Math.round(WIDTH_RESIZE_SEC * 1000)

            setBlindColor(current?.color || "rgba(0,0,0,0.3)")
            setBlindOrigin(getCoverOrigin(activeDirection))
            setBlindDuration(0)
            setBlindEase("linear")
            setBlindScale(0)

            requestAnimationFrame(() => {
                setBlindDuration(inDurationSec)
                setBlindEase(inEase)
                setBlindScale(1)
            })

            inTimeoutRef.current = window.setTimeout(() => {
                setWidthTransitionDuration(0)
                setWidthTransitionEase("linear")
                requestAnimationFrame(() => {
                    setWidthTransitionDuration(WIDTH_RESIZE_SEC)
                    setWidthTransitionEase("ease-in-out")
                    setWrapperWidth(nextW)
                })

                widthTimeoutRef.current = window.setTimeout(() => {
                    indexRef.current = nextIndex
                    setCurrentIndex(nextIndex)
                    setWidthTransitionDuration(0)
                    setWidthTransitionEase("linear")

                    setBlindOrigin(getUncoverOrigin(activeDirection))
                    setBlindDuration(outDurationSec)
                    setBlindEase(outEase)

                    requestAnimationFrame(() => {
                        setBlindScale(0)
                    })

                    outTimeoutRef.current = window.setTimeout(() => {
                        loopTimeoutRef.current = window.setTimeout(
                            runCycle,
                            delayRef.current * 1000
                        )
                    }, outDurationSec * 1000)
                }, widthAnimMs)
            }, inDurationSec * 1000)
        }

        loopTimeoutRef.current = window.setTimeout(runCycle, delayRef.current * 1000)
        return () => clearTimers()
    }, [areWordsEmpty, canLoop, pauseInCanvas, pauseOffscreen, isInViewport])

    const rootStyle: React.CSSProperties = useMemo(
        () => ({
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent:
                font.textAlign === "left"
                    ? "flex-start"
                    : font.textAlign === "right"
                      ? "flex-end"
                      : "center",
            position: "relative",
            overflow: "visible",
        }),
        [font.textAlign]
    )

    const textStyle: React.CSSProperties = useMemo(
        () => ({
            margin: 0,
            color,
            fontFamily: font.fontFamily,
            fontWeight: font.fontWeight,
            fontSize: font.fontSize,
            letterSpacing: font.letterSpacing,
            lineHeight: font.lineHeight,
            textAlign: font.textAlign,
            display: "inline-block",
            whiteSpace: "nowrap",
        }),
        [color, font]
    )

    if (areWordsEmpty) {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <ComponentMessage
                    title="Blinds Word Cycle"
                    subtitle="Set up the component by adding words in the properties."
                />
            </div>
        )
    }

    return (
        <div ref={containerRef} style={rootStyle}>
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                        font.textAlign === "left"
                            ? "flex-start"
                            : font.textAlign === "right"
                              ? "flex-end"
                              : "center",
                    width: wrapperWidth != null ? `${wrapperWidth}px` : "auto",
                    height: maxHeight ? `${maxHeight}px` : "auto",
                    transitionProperty: "width",
                    transitionDuration: `${widthTransitionDuration}s`,
                    transitionTimingFunction: widthTransitionEase,
                    overflow: "hidden",
                }}
            >
                <span style={textStyle}>{currentWord?.text}</span>

                <span
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: blindColor,
                        transformOrigin: blindOrigin,
                        transform: getBlindTransform(direction, blindScale),
                        transitionProperty: "transform",
                        transitionDuration: `${blindDuration}s`,
                        transitionTimingFunction: blindEase,
                        pointerEvents: "none",
                    }}
                />
            </div>

            <div
                ref={measureContainerRef}
                aria-hidden
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    visibility: "hidden",
                    pointerEvents: "none",
                    width: "max-content",
                    height: "auto",
                    overflow: "visible",
                }}
            >
                <div
                    ref={zoomProbeRef}
                    style={{
                        position: "absolute",
                        width: ZOOM_PROBE_CSS_PX,
                        height: ZOOM_PROBE_CSS_PX,
                        left: 0,
                        top: 0,
                        opacity: 0,
                        pointerEvents: "none",
                    }}
                />
                {words.map((item, index) => (
                    <div
                        key={`measure-row-${index}`}
                        style={{
                            display: "block",
                            width: "max-content",
                            whiteSpace: "nowrap",
                        }}
                    >
                        <span data-measure style={textStyle}>
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

BlindsWordCycle.defaultProps = {
    preview: true,
    pauseOffscreen: true,
    words: [
        { text: "Framer University", color: "#F0C766" },
        { text: "Code Components", color: "#87D1FF" },
        { text: "And cool resources", color: "#C6A2FF" },
    ],
    color: "#111111",
    font: {
        fontFamily: "Inter",
        fontWeight: "400",
        fontSize: 56,
        lineHeight: "1.5em",
        letterSpacing: "0em",
        textAlign: "center" as const,
    },
    delay: 1.4,
    direction: "left-to-right" as Direction,
    transitionIn: {
        type: "tween",
        ease: [0.89, -0.02, 0.57, 0.51],
        duration: 0.8,
        delay: 0,
    },
    transitionOut: {
        type: "tween",
        ease: [0.48, 0.42, 0.18, 0.98],
        duration: 0.8,
        delay: 0,
    },
}

addPropertyControls(BlindsWordCycle as any, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        enabledTitle: "On",
        disabledTitle: "Off",
        defaultValue: true,
    },
    pauseOffscreen: {
        type: ControlType.Boolean,
        title: "Offscreen",
        enabledTitle: "Pause",
        disabledTitle: "Run",
        defaultValue: true,
    },
    words: {
        type: ControlType.Array,
        title: "Words",
        control: {
            type: ControlType.Object,
            controls: {
                text: {
                    type: ControlType.String,
                    title: "Text",
                },
                color: {
                    type: ControlType.Color,
                    title: "Blind",
                },
            },
        },
        defaultValue: [
            { text: "Framer University", color: "#F0C766" },
            { text: "Code Components", color: "#87D1FF" },
            { text: "And cool resources", color: "#C6A2FF" },
        ],
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#777777",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            // @ts-ignore
            fontWeight: "400",
            fontSize: 56,
            letterSpacing: "0em",
            lineHeight: "1.5em",
            textAlign: "center",
        },
    },
    delay: {
        type: ControlType.Number,
        title: "Delay",
        min: 0.2,
        max: 8,
        step: 0.05,
        unit: "s",
        defaultValue: 1.4,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: [
            "left-to-right",
            "right-to-left",
            "top-to-bottom",
            "bottom-to-top",
        ],
        optionTitles: ["Left", "Right", "Down", "Up"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "left-to-right",
    },
    transitionIn: {
        type: ControlType.Transition,
        title: "In",
        defaultValue: {
            type: "tween",
            ease: [0.89, -0.02, 0.57, 0.51],
            duration: 0.8,
            delay: 0,
        },
    },
    transitionOut: {
        type: ControlType.Transition,
        title: "Out",
        defaultValue: {
            type: "tween",
            ease: [0.48, 0.42, 0.18, 0.98],
            duration: 0.8,
            delay: 0,
        },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

BlindsWordCycle.displayName = "Text Mask Cycler"
