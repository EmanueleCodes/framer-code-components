import React, { useRef, useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Parse Framer color string to [r,g,b] in 0-1
function parseColorToRgb(c: string): [number, number, number] {
    if (!c || typeof c !== "string") return [0.9, 0.4, 0.3]
    const hex = c.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    if (hex) {
        const s = hex[1]
        if (s.length === 3) {
            return [
                parseInt(s[0] + s[0], 16) / 255,
                parseInt(s[1] + s[1], 16) / 255,
                parseInt(s[2] + s[2], 16) / 255,
            ]
        }
        return [
            parseInt(s.slice(0, 2), 16) / 255,
            parseInt(s.slice(2, 4), 16) / 255,
            parseInt(s.slice(4, 6), 16) / 255,
        ]
    }
    const rgba = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (rgba) {
        return [
            Number(rgba[1]) / 255,
            Number(rgba[2]) / 255,
            Number(rgba[3]) / 255,
        ]
    }
    return [0.9, 0.4, 0.3]
}

function lerp(
    a: [number, number, number],
    b: [number, number, number],
    t: number
): [number, number, number] {
    t = Math.max(0, Math.min(1, t))
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ]
}

interface NoisyGradientProps {
    preview?: boolean
    speed?: number
    colorTop?: string
    colorBottomLeft?: string
    colorBottomRight?: string
    style?: React.CSSProperties
}

const DEFAULT_PEACH = "#e6664d"
const DEFAULT_PURPLE = "#331a99"
const DEFAULT_TEAL = "#00cccc"

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 300
 * @framerDisableUnlink
 */
export default function NoisyGradient({
    preview = false,
    speed = 1,
    colorTop = DEFAULT_PEACH,
    colorBottomLeft = DEFAULT_PURPLE,
    colorBottomRight = DEFAULT_TEAL,
    style,
}: NoisyGradientProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef<number>(0)
    const startRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const runAnimation = preview || isCanvas

        const draw = (time: number) => {
            const width = canvas.width
            const height = canvas.height
            if (width <= 0 || height <= 0) return

            const peach = parseColorToRgb(colorTop)
            const purple = parseColorToRgb(colorBottomLeft)
            const teal = parseColorToRgb(colorBottomRight)

            const imageData = ctx.getImageData(0, 0, width, height)
            const data = imageData.data
            const t0 = (time / 1000) * speed

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const uvx = x / width
                    const uvy = y / height

                    // Same logic as Metal shader: vertical gradient with sine wave distortion
                    const t = uvy + 0.2 * Math.sin(t0 + uvx * 3.0)
                    const p = uvx + 0.2 * Math.cos(t0 + uvy * 6.0)

                    const pt = Math.max(0, Math.min(1, p))
                    const tt = Math.max(0, Math.min(1, t))

                    const bottomColor = lerp(purple, teal, pt)
                    const color = lerp(bottomColor, peach, tt)

                    const i = (y * width + x) * 4
                    data[i] = Math.round(color[0] * 255)
                    data[i + 1] = Math.round(color[1] * 255)
                    data[i + 2] = Math.round(color[2] * 255)
                    data[i + 3] = 255
                }
            }

            ctx.putImageData(imageData, 0, 0)
        }

        const resize = () => {
            const w = canvas.clientWidth
            const h = canvas.clientHeight
            const maxSize = 512
            let cw = w
            let ch = h
            if (w > maxSize || h > maxSize) {
                if (w >= h) {
                    cw = maxSize
                    ch = Math.round((h / w) * maxSize)
                } else {
                    ch = maxSize
                    cw = Math.round((w / h) * maxSize)
                }
            }
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }
            if (!startRef.current) startRef.current = performance.now()
            const time = runAnimation ? performance.now() - startRef.current : 0
            draw(time)
        }

        resize()

        if (runAnimation) {
            const loop = () => {
                const time = performance.now() - startRef.current
                draw(time)
                rafRef.current = requestAnimationFrame(loop)
            }
            rafRef.current = requestAnimationFrame(loop)
        }

        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        return () => {
            ro.disconnect()
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [preview, speed, colorTop, colorBottomLeft, colorBottomRight])

    return (
        <div
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}

addPropertyControls(NoisyGradient, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 3,
        step: 0.1,
        defaultValue: 1,
    },
    colorTop: {
        type: ControlType.Color,
        title: "Top",
        defaultValue: DEFAULT_PEACH,
    },
    colorBottomLeft: {
        type: ControlType.Color,
        title: "Left",
        defaultValue: DEFAULT_PURPLE,
    },
    colorBottomRight: {
        type: ControlType.Color,
        title: "Right",
        defaultValue: DEFAULT_TEAL,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

NoisyGradient.displayName = "Noisy Gradient"
