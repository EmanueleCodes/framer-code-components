import React from "react"
//@ts-ignore
import { Heatmap } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/heatmap.js"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface HeatmapProps {
    colors?: {
        paletteCount?: number
        color1?: string
        color2?: string
        color3?: string
        color4?: string
        color5?: string
        color6?: string
        color7?: string
        color8?: string
        bgColor?: string
    }
    speed?: number
    contour?: number
    angle?: number
    noise?: number
    innerGlow?: number
    outerGlow?: number
    scale?: number
    image?: string
}

const MAX_COLORS = 8

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

function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()

    // rgba(R,G,B,A)
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1
        return { r, g, b, a }
    }

    // #RRGGBBAA or #RRGGBB
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        const a = parseInt(hex.slice(6, 8), 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return { r, g, b, a: 1 }
    }
    if (hex.length === 4) {
        // #RGBA
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        const a = parseInt(hex[3] + hex[3], 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 3) {
        // #RGB
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        return { r, g, b, a: 1 }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

const hexToRGB = (hex: string): [number, number, number] => {
    const c = hex.replace("#", "").padEnd(6, "0")
    const r = parseInt(c.slice(0, 2), 16) / 255
    const g = parseInt(c.slice(2, 4), 16) / 255
    const b = parseInt(c.slice(4, 6), 16) / 255
    return [r, g, b]
}

const prepStops = (stops?: string[], paletteCount?: number) => {
    // Ensure we have valid colors and handle edge cases
    let base: string[]

    if (stops && Array.isArray(stops) && stops.length > 0) {
        // Filter out invalid colors, resolve CSS variables, and ensure they have # prefix
        base = stops
            .filter(
                (color) =>
                    color && typeof color === "string" && color.trim() !== ""
            )
            .map((color) => {
                const resolved = resolveTokenColor(color)
                const rgba = parseColorToRgba(resolved)
                // Convert back to hex for the shader
                const toHex = (v: number) =>
                    Math.round(v * 255)
                        .toString(16)
                        .padStart(2, "0")
                return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`
            })
            .slice(0, MAX_COLORS)
    } else {
        base = [
            "#11206a",
            "#1f3ba2",
            "#2f63e7",
            "#6bd7ff",
            "#ffe679",
            "#ff991e",
            "#ff4c00",
        ]
    }

    // Ensure we have at least 2 colors
    if (base.length === 0) {
        base = [
            "#11206a",
            "#1f3ba2",
            "#2f63e7",
            "#6bd7ff",
            "#ffe679",
            "#ff991e",
            "#ff4c00",
        ]
    } else if (base.length === 1) {
        base.push(base[0])
    }

    // Fill remaining slots with the last color
    while (base.length < MAX_COLORS) {
        base.push(base[base.length - 1])
    }

    const arr: [number, number, number][] = []
    for (let i = 0; i < MAX_COLORS; i++) {
        arr.push(hexToRGB(base[i]))
    }

    // Use the actual number of colors provided, not the padded array length
    const actualCount = Math.max(
        1,
        Math.min(MAX_COLORS, paletteCount || stops?.length || 7)
    )

    return { arr, count: actualCount }
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function HeatmapComponent({
    colors = {
        paletteCount: 7,
        color1: "#11206a",
        color2: "#1f3ba2",
        color3: "#2f63e7",
        color4: "#6bd7ff",
        color5: "#ffe679",
        color6: "#ff991e",
        color7: "#ff4c00",
        bgColor: "#000000",
    },
    speed = 1,
    contour = 0.5,
    angle = 0,
    noise = 0.05,
    innerGlow = 0.5,
    outerGlow = 0.5,
    scale = 0.75,
    image = "https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png",
}: HeatmapProps) {
    // Prepare colors array
    const { arr: colorArr, count: colorCount } = prepStops(
        [
            colors?.color1,
            colors?.color2,
            colors?.color3,
            colors?.color4,
            colors?.color5,
            colors?.color6,
            colors?.color7,
            colors?.color8,
        ].filter(Boolean) as string[],
        colors?.paletteCount
    )

    // Convert color array to hex strings for the Heatmap component
    const colorStrings = colorArr.slice(0, colorCount).map(([r, g, b]) => {
        const toHex = (v: number) =>
            Math.round(v * 255)
                .toString(16)
                .padStart(2, "0")
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    })

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                position: "relative",
                background: colors?.bgColor || "#000000",
            }}
        >
            <Heatmap
                colors={colorStrings}
                colorBack="#00000000"
                speed={speed}
                contour={contour}
                angle={angle}
                noise={noise}
                innerGlow={innerGlow}
                outerGlow={outerGlow}
                scale={scale}
                image={image}
                frame={0}
                style={{
                    backgroundColor: colors?.bgColor || "#000000",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}

HeatmapComponent.defaultProps = {
    colors: {
        paletteCount: 7,
        color1: "#11206a",
        color2: "#1f3ba2",
        color3: "#2f63e7",
        color4: "#6bd7ff",
        color5: "#ffe679",
        color6: "#ff991e",
        color7: "#ff4c00",
        bgColor: "#000000",
    },
    speed: 1,
    contour: 0.5,
    angle: 0,
    noise: 0.05,
    innerGlow: 0.5,
    outerGlow: 0.5,
    scale: 0.75,
    image: "https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png",
    frame: 0,
}

addPropertyControls(HeatmapComponent, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        description:
            "A high quality black on white (or black on transparent) image",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: 1,
    },
    contour: {
        type: ControlType.Number,
        title: "Contour",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    angle: {
        type: ControlType.Number,
        title: "Angle",
        min: 0,
        max: 360,
        unit: "°",
        defaultValue: 0,
    },
    noise: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.05,
    },
    innerGlow: {
        type: ControlType.Number,
        title: "Glow In",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    outerGlow: {
        type: ControlType.Number,
        title: "Glow Out",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0.1,
        max: 2,
        step: 0.1,
        defaultValue: 0.75,
    },
    colors: {
        type: ControlType.Object,
        title: "Colors",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            paletteCount: {
                type: ControlType.Number,
                title: "Palette Size",
                min: 2,
                max: 8,
                step: 1,
                defaultValue: 7,
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                defaultValue: "#11206a",
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "#1f3ba2",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "#2f63e7",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                defaultValue: "#6bd7ff",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                defaultValue: "#ffe679",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 5,
            },
            color6: {
                type: ControlType.Color,
                title: "Color 6",
                defaultValue: "#ff991e",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 6,
            },
            color7: {
                type: ControlType.Color,
                title: "Color 7",
                defaultValue: "#ff4c00",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 7,
            },
            color8: {
                type: ControlType.Color,
                title: "Color 8",
                defaultValue: "#ff4c00",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 8,
            },
            bgColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "#000000",
            },
        },
    },
})

HeatmapComponent.displayName = "Heatmap"
