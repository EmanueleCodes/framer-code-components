import { useWebHaptics } from "./Sub/Bundle.tsx";
import { addPropertyControls, ControlType, RenderTarget } from "framer";
import { useEffect, useRef, useCallback } from "react";
import { HapticsPreset, PRESET_TRIGGERS } from "./Sub/Presets";

type PresetName =
    | "success"
    | "nudge"
    | "error"
    | "buzz"
    | "selection"
    | "light"
    | "medium"
    | "heavy"

type PatternMode = "preset" | "custom"

const DEFAULT_CUSTOM_PATTERN = `trigger([
  { "duration": 30 },
  { "delay": 40, "duration": 150 },
  { "delay": 30, "duration": 60, "intensity": 1 },
])`

interface HapticsProps {
    width?: number
    height?: number
    patternMode?: PatternMode
    preset?: PresetName
    customPattern?: string
    debug?: boolean
}

function parseCustomPattern(
    value: string
):
    | number[]
    | Array<{ duration: number; delay?: number; intensity?: number }>
    | null {
    if (!value || typeof value !== "string") return null
    const t = value.trim()
    if (!t) return null
    let toParse = t
    if (t.startsWith("trigger(")) {
        const inner = t.slice(8).trim()
        if (!inner.endsWith(")")) return null
        toParse = inner.slice(0, -1).trim()
    }
    try {
        const jsonLike = toParse.replace(
            /\b(duration|delay|intensity)\s*:/g,
            '"$1":'
        )
        const parsed = JSON.parse(jsonLike)
        if (!Array.isArray(parsed)) return null
        if (parsed.length === 0) return null
        if (typeof parsed[0] === "number") {
            const numbers = parsed.filter(
                (x): x is number => typeof x === "number"
            )
            return numbers.length === parsed.length ? numbers : null
        }
        const objects = parsed.filter(
            (
                x
            ): x is { duration: number; delay?: number; intensity?: number } =>
                x != null &&
                typeof x === "object" &&
                typeof (x as { duration?: number }).duration === "number"
        )
        return objects.length === parsed.length ? objects : null
    } catch {
        return null
    }
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */
export default function Haptics(props: HapticsProps) {
    const {
        patternMode = "preset",
        preset = "success",
        customPattern: customPatternStr = DEFAULT_CUSTOM_PATTERN,
        debug = false,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const [haptics, setHaptics] = useState<{
        trigger: (input: unknown) => Promise<void>
        destroy?: () => void
    } | null>(null)

    useEffect(() => {
        const instance = new WebHaptics({ debug })
        setHaptics(instance)
        return () => {
            instance.destroy()
            setHaptics(null)
        }
    }, [debug])

    useEffect(() => {
        if (!haptics) return
        const el = rootRef.current?.parentElement?.parentElement
        if (!el) return
        const trigger = () => {
            if (patternMode === "custom") {
                const custom = parseCustomPattern(customPatternStr)
                if (custom !== null) haptics.trigger(custom)
                else haptics.trigger(preset)
            } else {
                haptics.trigger(preset)
            }
        }
        let touchHandledAt = 0
        const handleTouchEnd = () => {
            touchHandledAt = Date.now()
            trigger()
        }
        const handleClick = () => {
            if (Date.now() - touchHandledAt < 400) return
            trigger()
        }
        el.addEventListener("touchend", handleTouchEnd, { passive: true })
        el.addEventListener("click", handleClick)
        return () => {
            el.removeEventListener("touchend", handleTouchEnd)
            el.removeEventListener("click", handleClick)
        }
    }, [haptics, patternMode, preset, customPatternStr])

    return (
        <div
            ref={rootRef}
            style={{
                width: "100%",
                height: "100%",

                position: "relative",
                pointerEvents: "none",
                background: "transparent",
            }}
            aria-hidden
        />
    )
}

Haptics.defaultProps = {
    patternMode: "preset" as PatternMode,
    preset: "success" as PresetName,
    customPattern: DEFAULT_CUSTOM_PATTERN,
    debug: false,
}

addPropertyControls(Haptics, {
    patternMode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["preset", "custom"],
        optionTitles: ["Preset", "Custom"],
        defaultValue: "preset",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    preset: {
        type: ControlType.Enum,
        title: "Preset",
        options: [
            "success",
            "nudge",
            "error",
            "buzz",
            "selection",
            "light",
            "medium",
            "heavy",
        ],
        optionTitles: [
            "Success",
            "Nudge",
            "Error",
            "Buzz",
            "Selection",
            "Light",
            "Medium",
            "Heavy",
        ],
        defaultValue: "success",
        hidden: (props) => props.patternMode === "custom",
    },
    customPattern: {
        type: ControlType.String,
        title: "Value",
        placeholder: DEFAULT_CUSTOM_PATTERN,
        description: "Create your pattern [here](https://haptics.lochie.me/).",
        hidden: (props) => props.patternMode === "preset",
    },
    debug: {
        type: ControlType.Boolean,
        title: "Debug",
        enabledTitle: "Sound",
        disabledTitle: "Off",
        defaultValue: true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

Haptics.displayName = "Mobile Haptics"
