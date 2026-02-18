import React, { useRef, useState, useEffect, useCallback } from "react"
import { addPropertyControls, ControlType } from "framer"

type StrokeMode = "default" | "custom"
type BrushShape = "circle" | "square" | "triangle" | "hexagon" | "pentagon" | "star"

type BrushImageSource =
    | string
    | { src?: string; url?: string; asset?: { url?: string } }
    | null
    | undefined

function resolveBrushImageUrl(input: BrushImageSource): string | null {
    if (!input) return null
    if (typeof input === "string") return input.trim() || null
    const obj = input as { src?: string; url?: string; asset?: { url?: string } }
    return obj?.src ?? obj?.url ?? obj?.asset?.url ?? null
}

// Framer color tokens: resolve var(--token) to fallback (see how-to-build-framer-components/colorInFramerCanvas.md)
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
    if (typeof input !== "string") return "#1a1a1a"
    if (!input.trim().startsWith("var(")) return input.trim()
    return extractDefaultValue(input) || "#1a1a1a"
}

interface ImageScratchProps {
    color: string
    borderRadius: string | number
    brushSize: number
    stroke: StrokeMode
    brushShape: BrushShape
    brushImage: BrushImageSource
    style?: React.CSSProperties
}


function drawPolygon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    sides: number,
    startAngle = -Math.PI / 2
) {
    ctx.beginPath()
    for (let i = 0; i <= sides; i++) {
        const a = startAngle + (i * 2 * Math.PI) / sides
        const px = cx + radius * Math.cos(a)
        const py = cy + radius * Math.sin(a)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
    const points = 5
    const innerRadius = radius * 0.4
    const startAngle = -Math.PI / 2
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? radius : innerRadius
        const a = startAngle + (i * Math.PI) / points
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
}

/**
 * Scratchable rectangle: a colored overlay that becomes transparent where the user scratches (drags).
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 500
 * @framerIntrinsicHeight 400
 */

export default function ImageScratch(props: ImageScratchProps) {
    const {
        color = "#1a1a1a",
        borderRadius = 0,
        brushSize = 40,
        stroke = "default",
        brushShape = "circle",
        brushImage,
        style,
    } = props
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const brushImageRef = useRef<HTMLImageElement | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [brushImageLoaded, setBrushImageLoaded] = useState(false)
    const lastPosRef = useRef<{ x: number; y: number } | null>(null)

    const brushImageUrl = resolveBrushImageUrl(brushImage)
    const useCustomBrush = stroke === "custom" && !!brushImageUrl && brushImageLoaded

    useEffect(() => {
        if (!brushImageUrl) {
            brushImageRef.current = null
            setBrushImageLoaded(false)
            return
        }
        const img = new Image()
        img.crossOrigin = "anonymous"
        let cancelled = false
        img.onload = () => {
            if (!cancelled) {
                brushImageRef.current = img
                setBrushImageLoaded(true)
            }
        }
        img.onerror = () => {
            if (!cancelled) {
                brushImageRef.current = null
                setBrushImageLoaded(false)
            }
        }
        img.src = brushImageUrl
        return () => {
            cancelled = true
            img.src = ""
            brushImageRef.current = null
        }
    }, [brushImageUrl])

    const drawOverlay = useCallback(
        (ctx: CanvasRenderingContext2D, width: number, height: number) => {
            ctx.fillStyle = resolveTokenColor(color)
            ctx.fillRect(0, 0, width, height)
        },
        [color]
    )

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return

        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            if (width <= 0 || height <= 0) return
            const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
            canvas.width = width * dpr
            canvas.height = height * dpr
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
            const ctx = canvas.getContext("2d")
            if (ctx) {
                ctx.scale(dpr, dpr)
                drawOverlay(ctx, width, height)
            }
        })
        ro.observe(container)
        return () => ro.disconnect()
    }, [drawOverlay])

    const getPoint = useCallback((e: React.PointerEvent) => {
        const container = containerRef.current
        if (!container) return null
        const rect = container.getBoundingClientRect()
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        }
    }, [])

    const scratch = useCallback(
        (ctx: CanvasRenderingContext2D, x: number, y: number) => {
            const size = Math.max(8, brushSize)
            const half = size / 2
            ctx.globalCompositeOperation = "destination-out"

            if (useCustomBrush && brushImageRef.current) {
                const img = brushImageRef.current
                const w = img.naturalWidth
                const h = img.naturalHeight
                if (w > 0 && h > 0) {
                    ctx.drawImage(img, x - half, y - half, size, size)
                } else {
                    ctx.beginPath()
                    ctx.arc(x, y, half, 0, Math.PI * 2)
                    ctx.fill()
                }
                return
            }

            const radius = Math.max(4, half)
            switch (brushShape) {
                case "square":
                    ctx.fillRect(x - half, y - half, size, size)
                    break
                case "triangle":
                    drawPolygon(ctx, x, y, radius, 3)
                    break
                case "hexagon":
                    drawPolygon(ctx, x, y, radius, 6)
                    break
                case "pentagon":
                    drawPolygon(ctx, x, y, radius, 5)
                    break
                case "star":
                    drawStar(ctx, x, y, radius)
                    break
                default: {
                    // circle
                    ctx.beginPath()
                    ctx.arc(x, y, radius, 0, Math.PI * 2)
                    ctx.fill()
                }
            }
        },
        [brushSize, brushShape, useCustomBrush]
    )

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault()
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            const pt = getPoint(e)
            if (!ctx || !pt) return
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            setIsDrawing(true)
            lastPosRef.current = pt
            scratch(ctx, pt.x, pt.y)
        },
        [getPoint, scratch]
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isDrawing) return
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            const pt = getPoint(e)
            if (!ctx || !pt) return
            const last = lastPosRef.current
            const stepRadius = Math.max(4, brushSize / 2)
            if (last) {
                const dist = Math.hypot(pt.x - last.x, pt.y - last.y)
                const steps = Math.max(1, Math.ceil(dist / (stepRadius * 0.4)))
                for (let i = 1; i <= steps; i++) {
                    const t = i / steps
                    const x = last.x + (pt.x - last.x) * t
                    const y = last.y + (pt.y - last.y) * t
                    scratch(ctx, x, y)
                }
            } else {
                scratch(ctx, pt.x, pt.y)
            }
            lastPosRef.current = pt
        },
        [isDrawing, getPoint, scratch, brushSize]
    )

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
        setIsDrawing(false)
        lastPosRef.current = null
    }, [])

    const onPointerLeave = useCallback(() => {
        setIsDrawing(false)
        lastPosRef.current = null
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                width: "100%",
                height: "100%",
                borderRadius,
                overflow: "hidden",
                position: "relative",
                touchAction: "none",
                cursor: "crosshair",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    display: "block",
                }}
            />
        </div>
    )
}

ImageScratch.displayName = "Image Scratch"

addPropertyControls(ImageScratch, {
    stroke: {
        type: ControlType.Enum,
        title: "Stroke",
        options: ["default", "custom"],
        optionTitles: ["Default", "Custom"],
        defaultValue: "default",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    brushShape: {
        type: ControlType.Enum,
        title: "Shape",
        options: ["circle", "square", "triangle", "hexagon", "pentagon", "star"],
        optionTitles: ["Circle", "Square", "Triangle", "Hexagon", "Pentagon", "Star"],
        defaultValue: "circle",
        hidden: (props: ImageScratchProps) => props.stroke !== "default",
    },
    brushImage: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        hidden: (props: ImageScratchProps) => props.stroke !== "custom",
    },
    color: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#1a1a1a",
    },
    brushSize: {
        type: ControlType.Number,
        title: "Brush size",
        min: 8,
        max: 120,
        step: 4,
        defaultValue: 40,
    },
    
    borderRadius: {
        // @ts-ignore
        type: ControlType.BorderRadius,
        title: "Radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 0,
        unit: "px",
    },
    
    
})
