import React, { useEffect, useRef, useState, useId, useMemo } from "react"
import { useAnimationFrame } from "framer-motion"
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
    cursorColor: string
    contentColor: string
}

interface DigitalTypewriterProps {
    texts: TextItem[]
    font: FontProps
    delay: number
    probability: number
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //
addPropertyControls(DigitalTypewriter, {
    texts: {
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: {
                text: { type: ControlType.String },
                cursorColor: { type: ControlType.Color, title: "Cursor" },
                contentColor: { type: ControlType.Color, title: "Words" },
            },
        },
    },
    font: {
        type: ControlType.Font,
        defaultFontType: "monospace",
        controls: "extended",
        defaultValue: {
            letterSpacing: "1px",
            lineHeight: "1.5em",
            textAlign: "left",
            fontSize: 32,
        },
    },

    probability: {
        type: ControlType.Number,
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.1,
        description: "Probability of pausing when a space character is typed.",
    },
    delay: {
        type: ControlType.Number,
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 1,
        unit: "s",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// ------------------------------------------------------------ //
// DEFAULT PROPS
// ------------------------------------------------------------ //
DigitalTypewriter.defaultProps = {
    delay: 1,
    font: {
        fontFamily: "monospace",
        fontWeight: 300,
        letterSpacing: "1px",
        lineHeight: "1.5em",
        textAlign: "left",
        fontSize: "32px",
    },
    probability: 0.1,
    texts: [
        {
            text: "Framer University",
            cursorColor: "#999999",
            contentColor: "#999999",
        },
        {
            text: "Learn Framer",
            cursorColor: "#895BE4",
            contentColor: "#895BE4",
        },
    ],
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function DigitalTypewriter(props: DigitalTypewriterProps) {
    const areTextsEmpty = props.texts.length === 0 || !props.texts
    const inOnFramerCanvas = RenderTarget.hasRestrictions()
    const [currentTextIndex, setCurrentTextIndex] = useState<number>(0)

    // Get current text item's colors
    const currentText = props.texts[currentTextIndex]
    const currentCursorColor = currentText?.cursorColor
    const currentContentColor = currentText?.contentColor

    // Unique id to avoid clashes between multiple component instances
    const reactId = useId()
    const safeId = useMemo(
        () => reactId.replace(/[^a-zA-Z0-9_-]/g, "-"),
        [reactId]
    )
    const cursorHighlightName = `cursor-${safeId}`
    const contentHighlightName = `content-${safeId}`

    const typewriterId = useTypewriterColors({
        cursorColor: currentCursorColor,
        contentColor: currentContentColor,
    })

    const { isPaused, pRef } = useTypewriter({
        texts: props.texts,
        currentTextIndex,
        setCurrentTextIndex,
        delay: props.delay,
        probability: props.probability,
        cursorHighlightName,
        contentHighlightName,
    })

    const baseStyle = `
    @layer demo {
      @property --alpha {
        syntax: "<number>";
        inherits: true;
        initial-value: 1;
      }
      #mainDigitalTypewriter-${safeId} {
        animation: cursor-blink 0.8s infinite steps(1) paused;
        position: relative;
      }
      [data-paused="false"] {
        animation: none;
      }
      [data-paused="false"] [data-type] {
        --alpha: 0;
      }
      /* "{mainDigitalTypewriter" element will itself carry the data-paused attribute. */
      #mainDigitalTypewriter-${safeId}[data-paused="true"] {
        animation-play-state: running;
      }
      @keyframes cursor-blink { 50% { --alpha: 0; } }
      ::highlight(__CURSOR__) { color: transparent; }
      [data-type] {
        --cursor-blink: color-mix(in hsl, var(--cursor), #0000 calc(var(--alpha) * 100%));
      }
      ::highlight(__CONTENT__) { color: var(--content); }
      ::highlight(__CURSOR__) { background-color: var(--cursor-blink); }
      [data-type] {
        width: 100%;
        color: transparent;
        white-space: break-spaces;
        font-family: ${props.font.fontFamily};
        font-weight: ${props.font.fontWeight};
        margin: 0;
        letter-spacing: ${props.font.letterSpacing};
        font-size: ${props.font.fontSize};
        line-height: ${props.font.lineHeight};
        text-align: ${props.font.textAlign};
      }
      /* Handle text wrapping based on parent width */
      .typewriter-container:has(+ [data-type="hidden"]:not(:empty)) {
        white-space: nowrap;
      }
      .typewriter-container:has(+ [data-type="hidden"]:empty) {
        white-space: break-spaces;
      }
    }
`

    // Generate style string with unique highlight names to avoid collisions
    const style = useMemo(() => {
        return baseStyle
            .replace(/__CURSOR__/g, cursorHighlightName)
            .replace(/__CONTENT__/g, contentHighlightName)
    }, [
        cursorHighlightName,
        contentHighlightName,
        props.font.fontFamily,
        props.font.fontWeight,
        props.font.fontSize,
        props.font.letterSpacing,
        props.font.lineHeight,
        props.font.textAlign,
    ])

    // get the 20% of the font size
    const fontSize = Number(props.font.fontSize?.replace("px", ""))
    const letterSpacingReserve = fontSize ? `${fontSize * 0.15}px` : "3px"

    const findLongestText = (texts: TextItem[]) => {
        return texts.reduce((longest, current) => {
            return current.text.length > longest.text.length ? current : longest
        }, texts[0])
    }
    const longestText = findLongestText(props.texts)

    if (areTextsEmpty) {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <ComponentMessage
                    title="Digital Typewriter"
                    subtitle="Set up the component by adding texts to the component properties."
                />
            </div>
        )
    }

    return (
        <>
            <div
                id={`mainDigitalTypewriter-${safeId}`}
                data-paused={isPaused}
                data-typewriter-id={typewriterId}
                style={{
                    width: "100%",
                    height: "100%",
                }}
            >
                <style>{style}</style>
                <div
                    className="typewriter-container"
                    style={{
                        position: "relative",
                        width: "fit-content",
                        height: "100%",
                        minWidth: "100%",
                    }}
                >
                    {props.texts.map((_, index) => (
                        <p
                            key={index}
                            className={`typewriter-text-${safeId}`}
                            data-type={index === currentTextIndex ? "" : null}
                            ref={index === currentTextIndex ? pRef : null}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                opacity: index === currentTextIndex ? 1 : 0,
                                pointerEvents: "none",
                                width: "100%",
                                whiteSpace: "inherit",
                            }}
                        />
                    ))}
                    {/* invisible element of current text to set the width and height properly for fit-content sizes */}
                    {!inOnFramerCanvas && (
                        <p
                            data-type="hidden"
                            style={{
                                position: "relative",
                                opacity: 0,
                                pointerEvents: "none",
                                width: "100%",
                                whiteSpace: "inherit",
                                letterSpacing: letterSpacingReserve, // trick to prevent jumping the last word to next line
                            }}
                            aria-hidden="true"
                        >
                            {currentText?.text}
                        </p>
                    )}
                </div>
                {/* render all texts, but only the first one with colors and opacity*/}
                {inOnFramerCanvas && (
                    <>
                        <p
                            style={{
                                opacity: 0,
                                color: "transparent",
                                margin: 0,
                                whiteSpace: "nowrap",
                                fontFamily: props.font.fontFamily,
                                fontWeight: props.font.fontWeight,
                                letterSpacing: props.font.letterSpacing,
                                fontSize: props.font.fontSize,
                                lineHeight: props.font.lineHeight,
                                textAlign: props.font.textAlign,
                                width: "100%",
                            }}
                        >
                            {longestText.text}
                        </p>
                        <p
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                color: props.texts[0].contentColor,
                                margin: 0,
                                whiteSpace: "break-spaces",
                                fontFamily: props.font.fontFamily,
                                fontWeight: props.font.fontWeight,
                                letterSpacing: props.font.letterSpacing,
                                fontSize: props.font.fontSize,
                                lineHeight: props.font.lineHeight,
                                textAlign: props.font.textAlign,
                                width: "100%",
                            }}
                        >
                            {props.texts[0].text}
                        </p>
                    </>
                )}
            </div>
        </>
    )
}

// ---------------------------------------------------- //
// HOOKS
// ---------------------------------------------------- //
interface UseTypewriterColorsProps {
    cursorColor: string
    contentColor: string
}

const useTypewriterColors = ({
    cursorColor,
    contentColor,
}: UseTypewriterColorsProps): string => {
    const reactId = useId()
    const safeId = useMemo(
        () => reactId.replace(/[^a-zA-Z0-9_-]/g, "-"),
        [reactId]
    )

    useEffect(() => {
        if (typeof document === "undefined") return

        const style = document.createElement("style")
        style.textContent = `
      [data-typewriter-id="${safeId}"] {
        --cursor: ${cursorColor};
        --content: ${contentColor};
      }
    `
        document.head.appendChild(style)

        return () => {
            document.head.removeChild(style)
        }
    }, [cursorColor, contentColor, safeId])

    return safeId
}

interface UseTypewriterProps {
    texts: TextItem[]
    currentTextIndex: number
    setCurrentTextIndex: React.Dispatch<React.SetStateAction<number>>
    delay: number
    probability: number
    cursorHighlightName: string
    contentHighlightName: string
}

interface UseTypewriterReturn {
    isPaused: boolean
    pRef: React.RefObject<HTMLParagraphElement | null>
    highlightsInitialized: boolean
}

const random = (min: number, max: number, step = 1) => {
    const delta = max - min
    const steps = Math.round(delta / step)
    const rand = Math.floor(Math.random() * (steps + 1))
    return min + rand * step
}

const useTypewriter = ({
    texts,
    currentTextIndex,
    setCurrentTextIndex,
    delay,
    probability,
    cursorHighlightName,
    contentHighlightName,
}: UseTypewriterProps): UseTypewriterReturn => {
    const [isPaused, setIsPaused] = useState(true)
    const pRef = useRef<HTMLParagraphElement>(null)

    const indexRef = useRef(0)
    const fpsRef = useRef(12)
    const accRef = useRef(0)
    const nodeRef = useRef<Text | null>(null)
    const cursorRangeRef = useRef<Range | null>(null)
    const contentRangeRef = useRef<Range | null>(null)
    const highlightsInitializedRef = useRef(false)

    const pause = () => {
        setIsPaused(true)
    }

    const unpause = () => {
        setIsPaused(false)
    }

    const moveToNextText = () => {
        setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length)
        indexRef.current = 0
        if (
            nodeRef.current &&
            contentRangeRef.current &&
            cursorRangeRef.current
        ) {
            contentRangeRef.current.setEnd(nodeRef.current, 0)
            cursorRangeRef.current.setStart(nodeRef.current, 0)
            cursorRangeRef.current.setEnd(nodeRef.current, 1)
        }
        window.setTimeout(() => {
            unpause()
        }, delay * 1000)
    }

    const update = (_: number, delta: number) => {
        if (!highlightsInitializedRef.current || isPaused) return

        const node = nodeRef.current
        const cursorRange = cursorRangeRef.current
        const contentRange = contentRangeRef.current
        if (!node || !cursorRange || !contentRange) return

        accRef.current += delta
        if (accRef.current < 1000 / fpsRef.current) return
        accRef.current = 0

        const index = indexRef.current
        if (index > node.textContent!.length - 1) {
            pause()
            window.setTimeout(() => {
                moveToNextText()
            }, 1000)
            return
        }

        cursorRange.setStart(node, index)
        cursorRange.setEnd(node, index + 1)
        contentRange.setEnd(node, index)

        indexRef.current += 1

        if (
            Math.random() > 1 - probability &&
            node.textContent!.charAt(index - 1) === " "
        ) {
            pause()
            fpsRef.current = random(8, 22, 1)
            window.setTimeout(
                () => {
                    fpsRef.current = 12
                    unpause()
                },
                random(200, 2000, 100)
            )
        }
    }

    useAnimationFrame(update)

    useEffect(() => {
        if (
            !pRef.current ||
            typeof window === "undefined" ||
            !(window as any).CSS?.highlights
        ) {
            return
        }

        highlightsInitializedRef.current = false
        indexRef.current = 0
        fpsRef.current = 12
        accRef.current = 0

        const p = pRef.current
        const currentText = texts[currentTextIndex]
        p.innerHTML = `${currentText.text.replace(/\s+/g, " ").trim()}&nbsp;`

        const treeWalker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
        const node = treeWalker.nextNode() as Text | null
        if (!node) return
        nodeRef.current = node

        const cursorRange = new Range()
        const contentRange = new Range()

        cursorRange.setStart(node, 0)
        cursorRange.setEnd(node, 1)

        contentRange.setStart(node, 0)
        contentRange.setEnd(node, 0)

        cursorRangeRef.current = cursorRange
        contentRangeRef.current = contentRange

        const cursorHighlight = new (window as any).Highlight(cursorRange)
        const contentHighlight = new (window as any).Highlight(contentRange)
        ;(window as any).CSS.highlights.set(
            cursorHighlightName,
            cursorHighlight
        )
        ;(window as any).CSS.highlights.set(
            contentHighlightName,
            contentHighlight
        )

        const startTimeout = window.setTimeout(() => {
            highlightsInitializedRef.current = true
            unpause()
        }, delay * 1000)

        return () => {
            window.clearTimeout(startTimeout)
            ;(window as any).CSS.highlights.delete(cursorHighlightName)
            ;(window as any).CSS.highlights.delete(contentHighlightName)
            highlightsInitializedRef.current = false
        }
    }, [
        texts,
        currentTextIndex,
        delay,
        probability,
        cursorHighlightName,
        contentHighlightName,
    ])

    return {
        isPaused,
        pRef,
        highlightsInitialized: highlightsInitializedRef.current,
    }
}

DigitalTypewriter.displayName = "Digital Typewriter"
