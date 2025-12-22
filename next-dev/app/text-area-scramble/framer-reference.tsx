import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface ScrambleTextProps {
    text: string
    font: any
    variable: {
        optical: number
        weight: number
    }
    color: string
    scrambleColor: string
    duration: number
    speed: number
    scramblePercent: number
    glitch: boolean
    scrambleChars?: string // <-- Add prop
    style?: React.CSSProperties
}

const DEFAULT_SCRAMBLE_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function TextGlitch(props: ScrambleTextProps) {
    const { text, font, color, scrambleColor, duration, style, glitch } = props
    const [display, setDisplay] = useState(text)
    const [scrambling, setScrambling] = useState(false)
    const intervalRef = useRef<number | null>(null)
    const timeoutRef = useRef<number | null>(null)
    // Use prop or default
    const chars = (props.scrambleChars || DEFAULT_SCRAMBLE_CHARS).split("")

    useEffect(() => {
        if (!glitch) {
            setDisplay(text)
            setScrambling(false)
            return
        }
        if (RenderTarget.current() !== RenderTarget.preview) {
            setDisplay(text)
            setScrambling(false)
            return
        }
        if (RenderTarget.current() === RenderTarget.thumbnail) {
            setDisplay(text)
            setScrambling(false)
            return
        }
        setDisplay(text)
        setScrambling(true)
        let frame = 0
        const scramble = () => {
            const percent = Math.max(
                0,
                Math.min(100, props.scramblePercent ?? 100)
            )
            let scrambled = text
                .split("")
                .map((c, i) => {
                    if (c === " ") return c
                    if (Math.random() * 100 > percent) return c
                    return `<span data-scramble=\"1\">${chars[Math.floor(Math.random() * chars.length)]}</span>`
                })
                .join("")
            setDisplay(scrambled)
            frame++
        }
        intervalRef.current = window.setInterval(scramble, props.speed || 40)
        timeoutRef.current = window.setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            setDisplay(text)
            setScrambling(false)
        }, duration)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [text, duration, glitch, props.scrambleChars]) // Add scrambleChars as dependency

    function renderText() {
        const { weight, optical } = props.variable || {
            weight: 400,
            optical: 22,
        }
        const fontVariation = {
            fontWeight: weight,
            fontVariationSettings: `'wght' ${weight}, 'opsz' ${optical}`,
        }
        const styleBase = { ...font, color, ...fontVariation }
        if (!scrambling) return <span style={styleBase}>{text}</span>
        const parts = display.split(/(<span data-scramble="1">.*?<\/span>)/g)
        return (
            <span style={styleBase}>
                {parts.map((part, i) => {
                    if (part.startsWith('<span data-scramble="1">')) {
                        const letter = part.replace(/<.*?>/g, "")
                        return (
                            <span key={i} style={{ color: scrambleColor }}>
                                {letter}
                            </span>
                        )
                    }
                    return <span key={i}>{part}</span>
                })}
            </span>
        )
    }

    const isFixedWidth = style && style.width === "100%"
    const isFixedHeight = style && style.height === "100%"
    return (
        <div
            style={{
                ...style,
                position: "relative",
                width: isFixedWidth ? "100%" : "max-content",
                minWidth: isFixedWidth ? undefined : "max-content",
                height: isFixedHeight ? "100%" : undefined,
            }}
        >
            {renderText()}
        </div>
    )
}

TextGlitch.displayName = "Text Glitch"

addPropertyControls(TextGlitch, {
    text: {
        type: ControlType.String,
        title: "Text",
        defaultValue: "Scramble Me!",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 22,
            variant: "Semibold",
            letterSpacing: "-0.01em",
            lineHeight: "1.2em",
        },
    },
    variable: {
        type: ControlType.Object,
        title: "Variable",
        controls: {
            optical: {
                type: ControlType.Number,
                title: "Optical",
                defaultValue: 22,
                min: 14,
                max: 32,
                step: 1,
            },
            weight: {
                type: ControlType.Number,
                title: "Weight",
                defaultValue: 400,
                min: 100,
                max: 900,
                step: 1,
            },
        },
        defaultValue: {
            optical: 22,
            weight: 400,
        },
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
    },
    scrambleColor: {
        type: ControlType.Color,
        title: "Scrambled",
        defaultValue: "#8855FF",
    },
    scrambleChars: {
        // <-- Add the control
        type: ControlType.String,
        title: "Chars",
        defaultValue: DEFAULT_SCRAMBLE_CHARS,
        displayTextArea: true,
    },
    scramblePercent: {
        type: ControlType.Number,
        title: "Scramble %",
        defaultValue: 100,
        min: 0,
        max: 100,
        unit: "%",
        step: 1,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 40,
        min: 10,
        max: 200,
        unit: "ms",
        step: 1,
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        defaultValue: 1200,
        min: 200,
        max: 5000,
        unit: "ms",
        step: 50,
    },
    glitch: {
        type: ControlType.Boolean,
        title: "Glitch",
        enabledTitle: "Yes",
        disabledTitle: "No",
        defaultValue: true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
