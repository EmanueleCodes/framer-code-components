/**
 * Haptics – invisible Framer component for haptic feedback on mobile (iOS & Android).
 * Place inside a frame; when the frame's parent (grandparent of this component) is
 * clicked, the configured haptic pattern runs. Uses web-haptics (https://haptics.lochie.me/).
 * Uses the React hook useWebHaptics so first-tap works; bundle must export it (see web-haptics-bundle).
 */
import React, { useEffect, useRef, useState, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useWebHaptics } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/haptics2.js"

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
type DebugMode = "off" | "canvas" | "always"

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
    onDesktop?: "sound" | "silent"
    debug?: DebugMode | boolean
}

function parseCustomPattern(value: string): number[] | Array<{ duration: number; delay?: number; intensity?: number }> | null {
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
        const jsonLike = toParse.replace(/\b(duration|delay|intensity)\s*:/g, '"$1":')
        const parsed = JSON.parse(jsonLike)
        if (!Array.isArray(parsed)) return null
        if (parsed.length === 0) return null
        if (typeof parsed[0] === "number") {
            const numbers = parsed.filter((x): x is number => typeof x === "number")
            return numbers.length === parsed.length ? numbers : null
        }
        const objects = parsed.filter(
            (x): x is { duration: number; delay?: number; intensity?: number } =>
                x != null && typeof x === "object" && typeof (x as { duration?: number }).duration === "number"
        )
        return objects.length === parsed.length ? objects : null
    } catch {
        return null
    }
}

function resolveDebugMode(value: HapticsProps["debug"]): DebugMode {
    if (value === true) return "always"
    if (value === false || value == null) return "off"
    if (value === "off" || value === "canvas" || value === "always") return value
    return "off"
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
        onDesktop = "silent",
        debug = "off",
    } = props
    const debugMode = resolveDebugMode(debug)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const showDebug = debugMode === "always" || (debugMode === "canvas" && isCanvas)
    const isOnFramerCanvas = RenderTarget.hasRestrictions?.() ?? isCanvas

    const { trigger } = useWebHaptics({ debug: onDesktop === "sound" })

    const rootRef = useRef<HTMLDivElement>(null)
    const [debugLines, setDebugLines] = useState<string[]>([])
    const settingsRef = useRef({ showDebug })
    settingsRef.current = { showDebug }

    const pushDebug = (message: string) => {
        if (!settingsRef.current.showDebug) return
        const stamp = new Date().toISOString().slice(11, 23)
        setDebugLines((prev) => [`${stamp} ${message}`, ...prev].slice(0, 14))
    }

    useEffect(() => {
        if (!showDebug) return
        const support = typeof navigator !== "undefined" && typeof navigator.vibrate === "function" ? "yes" : "no"
        const secure = typeof window !== "undefined" && window.isSecureContext ? "yes" : "no"
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
        pushDebug(`debug:on support:${support} secure:${secure}`)
        pushDebug(`ua:${ua}`)
    }, [showDebug])

    const initializeParent = useCallback(() => {
        if (!rootRef.current || isOnFramerCanvas) return

        const subparent = rootRef.current.parentElement
        if (!subparent) return

        const parent = subparent.parentElement
        if (!parent) return

        const handleClick = () => {
            if (patternMode === "custom") {
                const custom = parseCustomPattern(customPatternStr)
                if (custom !== null) trigger(custom)
                else trigger(preset)
            } else {
                trigger(preset)
            }
        }

        parent.addEventListener("click", handleClick, { capture: true })
        pushDebug("listeners:attached(click,capture)")

        return () => {
            parent.removeEventListener("click", handleClick, { capture: true })
            pushDebug("listeners:removed")
        }
    }, [trigger, patternMode, preset, customPatternStr, isOnFramerCanvas])

    useEffect(() => {
        const cleanup = initializeParent()
        return () => {
            if (cleanup) cleanup()
        }
    }, [initializeParent])

    return (
        <>
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
            {showDebug && (
                <div
                    style={{
                        position: "fixed",
                        left: 12,
                        bottom: 12,
                        width: "min(92vw, 420px)",
                        maxHeight: "40vh",
                        overflow: "auto",
                        zIndex: 999999,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.25)",
                        background: "rgba(10, 10, 10, 0.84)",
                        color: "#fff",
                        fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace",
                        fontSize: 11,
                        lineHeight: 1.35,
                        pointerEvents: "none",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {debugLines.length > 0 ? debugLines.join("\n") : "debug:on waiting for events..."}
                </div>
            )}
        </>
    )
}

Haptics.defaultProps = {
    patternMode: "preset" as PatternMode,
    preset: "success" as PresetName,
    customPattern: DEFAULT_CUSTOM_PATTERN,
    onDesktop: "silent" as const,
    debug: "off" as DebugMode,
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
        options: ["success", "nudge", "error", "buzz", "selection", "light", "medium", "heavy"],
        optionTitles: ["Success", "Nudge", "Error", "Buzz", "Selection", "Light", "Medium", "Heavy"],
        defaultValue: "success",
        hidden: (props) => props.patternMode === "custom",
    },
    customPattern: {
        type: ControlType.String,
        title: "Value",
        defaultValue: DEFAULT_CUSTOM_PATTERN,
        displayTextArea: true,
        description: "Create your custom haptic feedback [here](https://haptics.lochie.me/).",
        hidden: (props) => props.patternMode === "preset",
    },
    onDesktop: {
        type: ControlType.Enum,
        title: "Desktop",
        options: ["silent", "sound"],
        optionTitles: ["Silent", "Play Sound"],
        defaultValue: "silent",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    debug: {
        type: ControlType.Enum,
        title: "Debug",
        options: ["off", "canvas", "always"],
        optionTitles: ["Off", "Canvas", "Always"],
        defaultValue: "off",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

Haptics.displayName = "Mobile Haptics"
