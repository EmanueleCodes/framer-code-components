import React, { useRef, useState, useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import Snowfall from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/snow-final.js"

// CSS variable token and color parsing (hex/rgba/var())
const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/

function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}

function resolveTokenColor(input: string | undefined): string {
    if (!input || typeof input !== "string") return input || ""
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

// Linear mapping function for normalizing UI values to internal values
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}

// Mapping functions for UI (0-1 or -1 to 1) to internal values
// Speed: UI 0-1 → Internal 0.1-10
function mapSpeed(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 0.1, 10)
}

// Wind: UI -1 to 1 → Internal -10 to 10
function mapWind(ui: number): number {
    return mapLinear(Math.max(-1, Math.min(1, ui)), -1, 1, -10, 10)
}

// Radius: UI 0-1 → Internal 0.1-20
function mapRadius(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 0.1, 5)
}

interface SnowFallProps {
    preview?: boolean
    background?: string
    color?: string
    snowflakeCount?: number
    speed?: { min: number; max: number }
    wind?: { min: number; max: number }
    radius?: { min: number; max: number }
    opacity?: { min: number; max: number }
    direction?: "down" | "up"
    transitionTime?: number
    style?: React.CSSProperties
}

// UI defaults (normalized values that users see)
// Speed: 0-1, Wind: -1 to 1, Radius: 0-1, Opacity: 0-1 (no mapping)
const DEFAULTS = {
    background: "#000000",
    color: "#dee4fd",
    snowflakeCount: 150,
    speed: { min: 0.1, max: 0.3 },      // UI: 0-1 → Internal: 0.1-10 (maps to ~1.0-3.0)
    wind: { min: -0.05, max: 0.2 },     // UI: -1 to 1 → Internal: -10 to 10 (maps to ~-0.5-2.0)
    radius: { min: 0.1, max: 0.4 },   // UI: 0-1 → Internal: 0.1-20 (maps to ~0.5-3.0)
    opacity: { min: 0.5, max: 1 },    // No mapping needed (already 0-1)
    direction: "down" as const,
    transitionTime: 0.5, // Transition time in seconds (0 = instant)
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function SnowFall({
    preview = false,
    background,
    color = DEFAULTS.color,
    snowflakeCount = DEFAULTS.snowflakeCount,
    speed = DEFAULTS.speed,
    wind = DEFAULTS.wind,
    radius = DEFAULTS.radius,
    opacity = DEFAULTS.opacity,
    direction = DEFAULTS.direction,
    transitionTime = DEFAULTS.transitionTime,
    style,
}: SnowFallProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
    const [isInViewport, setIsInViewport] = useState(true)
    const [isPageVisible, setIsPageVisible] = useState(true)

    // Track viewport visibility using IntersectionObserver
    useEffect(() => {
        if (isCanvasMode) {
            // In canvas mode, always consider it visible
            setIsInViewport(true)
            return
        }

        const element = containerRef.current
        if (!element) return

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                setIsInViewport(!!entry?.isIntersecting)
            },
            {
                threshold: 0, // Trigger when any part of element is visible
                rootMargin: "0px",
            }
        )

        observer.observe(element)

        return () => {
            observer.disconnect()
        }
    }, [isCanvasMode])

    // Track page visibility (tab hidden/visible)
    useEffect(() => {
        if (isCanvasMode) {
            setIsPageVisible(true)
            return
        }

        const handleVisibilityChange = () => {
            setIsPageVisible(!document.hidden)
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [isCanvasMode])

    // Combine all conditions: should animate only if in viewport, page visible, and (preview enabled or not in canvas)
    const shouldAnimate = isInViewport && isPageVisible && (!isCanvasMode || preview)

    // Resolve colors with token support
    const resolvedBackground = resolveTokenColor(background)
    const resolvedColor = resolveTokenColor(color)

    // Map UI values (normalized 0-1 or -1 to 1) to internal values
    const mappedSpeed: [number, number] = [mapSpeed(speed.min), mapSpeed(speed.max)]
    const mappedWind: [number, number] = [mapWind(wind.min), mapWind(wind.max)]
    const mappedRadius: [number, number] = [mapRadius(radius.min), mapRadius(radius.max)]

    // Prepare snowfall config
    // Convert transitionTime from seconds to milliseconds for the bundle
    const snowfallConfig = {
        color: resolvedColor,
        snowflakeCount,
        speed: mappedSpeed,
        wind: mappedWind,
        radius: mappedRadius,
        opacity: [opacity.min, opacity.max] as [number, number], // Opacity is already 0-1, no mapping needed
        direction,
        transitionTime: transitionTime * 1000, // Convert seconds to milliseconds for the bundle
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                backgroundColor: resolvedBackground,
            }}
        >
            <Snowfall
                {...snowfallConfig}
                paused={!shouldAnimate}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}

addPropertyControls(SnowFall, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    snowflakeCount: {
        type: ControlType.Number,
        title: "Count",
        min: 10,
        max: 1000,
        step: 10,
        defaultValue: DEFAULTS.snowflakeCount,
    },
    speed: {
        type: ControlType.Object,
        title: "Speed",
        controls: {
            min: {
                type: ControlType.Number,
                title: "Min",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: DEFAULTS.speed.min,
            },
            max: {
                type: ControlType.Number,
                title: "Max",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: DEFAULTS.speed.max,
            },
        },
        defaultValue: DEFAULTS.speed,
    },
    wind: {
        type: ControlType.Object,
        title: "Wind",
        controls: {
            min: {
                type: ControlType.Number,
                title: "Min",
                min: -1,
                max: 1,
                step: 0.1,
                defaultValue: DEFAULTS.wind.min,
            },
            max: {
                type: ControlType.Number,
                title: "Max",
                min: -1,
                max: 1,
                step: 0.1,
                defaultValue: DEFAULTS.wind.max,
            },
        },
        defaultValue: DEFAULTS.wind,
    },
    radius: {
        type: ControlType.Object,
        title: "Radius",
        controls: {
            min: {
                type: ControlType.Number,
                title: "Min",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: DEFAULTS.radius.min,
            },
            max: {
                type: ControlType.Number,
                title: "Max",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: DEFAULTS.radius.max,
            },
        },
        defaultValue: DEFAULTS.radius,
    },
    opacity: {
        type: ControlType.Object,
        title: "Opacity",
        controls: {
            min: {
                type: ControlType.Number,
                title: "Min",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: DEFAULTS.opacity.min,
            },
            max: {
                type: ControlType.Number,
                title: "Max",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: DEFAULTS.opacity.max,
            },
        },
        defaultValue: DEFAULTS.opacity,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["down", "up"],
        optionTitles: ["Down", "Up"],
        defaultValue: DEFAULTS.direction,
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    transitionTime: {
        type: ControlType.Number,
        title: "Transition",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: DEFAULTS.transitionTime,
        unit: "s",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: DEFAULTS.color,
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: DEFAULTS.background,
        optional:true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

SnowFall.displayName = "Snow Fall"
