import { useWebHaptics } from "./Sub/Bundle.tsx"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef, useCallback } from "react"
import { HapticsPreset, PRESET_TRIGGERS } from "./Sub/Presets.tsx"

export interface CustomHapticStep {
    duration: number
    intensity: number
    delay: number
}

interface HapticsFramerProps {
    patternMode: "preset" | "custom"
    preset: HapticsPreset
    customPattern: string
    debug?: "sound" | "silent"
}

interface HapticsPropertyControlsProps {
    patternMode: "preset" | "custom"
}

const DEFAULT_CUSTOM_PATTERN = `trigger([
  { duration: 40 },
  { delay: 40, duration: 40 },
], { intensity: 0.9 })`

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 * @framerDisableUnlink
 */
export default function Haptics(props: HapticsFramerProps) {
    const { trigger } = useWebHaptics({ debug: props.debug === "sound" })
    const mainRef = useRef<HTMLDivElement>(null)
    const isOnFramerCanvas = RenderTarget.hasRestrictions()

    const initializeParent = useCallback(() => {
        if (!mainRef.current || isOnFramerCanvas) return

        const subparent = mainRef.current.parentElement
        if (!subparent) return

        const parent = subparent.parentElement
        if (!parent) return

        const handleTouchStart = () => {
            if (props.patternMode === "preset") {
                const { pattern, options } = PRESET_TRIGGERS[props.preset]
                trigger(pattern, options)
                return
            }

            // Custom mode - parse customPattern string
            if (props.customPattern?.trim()) {
                const parsed = parseCustomPatternCode(props.customPattern)
                if (parsed?.pattern?.length) {
                    const pattern = parsed.pattern.map((step) => ({
                        duration: step.duration,
                        intensity: step.intensity,
                        delay: step.delay,
                    }))
                    trigger(pattern, parsed.options)
                }
            }
        }

        parent.addEventListener("click", handleTouchStart, { capture: true })
        return () => {
            parent.removeEventListener("click", handleTouchStart, {
                capture: true,
            })
        }
    }, [
        trigger,
        props.patternMode,
        props.preset,
        props.customPattern,
        isOnFramerCanvas,
    ])

    useEffect(() => {
        const cleanup = initializeParent()
        return cleanup
    }, [initializeParent])

    return (
        <div
            ref={mainRef}
            style={{
                width: "0px",
                height: "0px",
            }}
            aria-hidden
        />
    )
}

interface ParsedCustomPattern {
    pattern: CustomHapticStep[]
    options?: { intensity?: number }
}

/**
 * Parses customPatternCode string (e.g. from Web Haptics) and extracts the
 * array from trigger([...]) and optional options trigger([...], { intensity }).
 * Returns null if parsing fails.
 */
function parseCustomPatternCode(code: string): ParsedCustomPattern | null {
    if (!code?.trim()) return null

    // Match trigger([...]) or trigger([...], { ... }) - use non-greedy to stop at first ]
    const match = code.match(
        /trigger\s*\(\s*\[([\s\S]*?)\]\s*(?:,\s*(\{[^}]*\}))?\s*\)/
    )
    if (!match) return null

    const arrayContent = match[1].trim()
    if (!arrayContent) return null

    const steps: CustomHapticStep[] = []
    const objectRegex = /\{\s*([^}]*)\s*\}/g
    let objectMatch

    while ((objectMatch = objectRegex.exec(arrayContent)) !== null) {
        const innerContent = objectMatch[1]
        const step: CustomHapticStep = {
            duration: 30,
            intensity: 0.7,
            delay: 0,
        }

        const pairs = innerContent.split(",")
        for (const pair of pairs) {
            const colonIndex = pair.indexOf(":")
            if (colonIndex === -1) continue
            const key = pair.slice(0, colonIndex).trim()
            const valueStr = pair.slice(colonIndex + 1).trim()
            const value = parseFloat(valueStr)
            if (key === "duration" && !isNaN(value)) step.duration = value
            else if (key === "intensity" && !isNaN(value))
                step.intensity = value
            else if (key === "delay" && !isNaN(value)) step.delay = value
        }

        steps.push(step)
    }

    if (steps.length === 0) return null

    const result: ParsedCustomPattern = { pattern: steps }

    // Parse optional second argument: { intensity: 0.9 }
    const optionsStr = match[2]
    if (optionsStr) {
        const optionsMatch = optionsStr.match(/intensity\s*:\s*([\d.]+)/)
        if (optionsMatch) {
            const intensity = parseFloat(optionsMatch[1])
            if (!isNaN(intensity)) result.options = { intensity }
        }
    }

    return result
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
        hidden: (props: HapticsPropertyControlsProps) =>
            props.patternMode === "custom",
    },
    customPattern: {
        type: ControlType.String,
        title: "Value",
        placeholder: DEFAULT_CUSTOM_PATTERN,
        displayTextArea: true,
        description: "Create your custom haptic feedback [here](https://haptics.lochie.me/).",
        hidden: (props: HapticsPropertyControlsProps) =>
            props.patternMode === "preset",
    },
    debug: {
        type: ControlType.Enum,
        title: "Debug",
        options: ["sound", "silent"],
        optionTitles: ["Play Sound", "Silent"],
        defaultValue: "sound",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

Haptics.displayName = "Mobile Haptics"
