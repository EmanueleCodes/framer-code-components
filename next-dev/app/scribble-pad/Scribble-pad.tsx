import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence, easeOut } from "framer-motion"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

interface ScribblePadProps {
    preview?: boolean
    widgets?: boolean
    backgroundColor?: string
    strokeWidths?: number[]
    colors?: string[]
    strokeWidth?: number
    borderRadius?: string
    strokeColor?: string
    buttonType?: "default" | "custom"
    defaultButton?: {
        backgroundColor?: string
        color?: string
        hoverBackgroundColor?: string
        hoverColor?: string
        padding?: string
        borderRadius?: string
        text?: string
    }
    customButton?: React.ReactNode
    wiggle?: {
        enable?: boolean
        movement?: number
        speed?: number
    }
    transition?: {
        type?: string
        duration?: number
        ease?: string | number[]
        delay?: number
        [key: string]: any
    }
    style?: React.CSSProperties
}

interface Point {
    x: number
    y: number
    t: number
}

interface Stroke {
    points: Point[]
    color: string
    strokeWidth: number
    canvasWidth?: number // Store original canvas width for scaling
    canvasHeight?: number // Store original canvas height for scaling
}

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

function resolveTokenColor(input: any): string {
    if (typeof input !== "string") return input || "#000000"
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

// Resolve CSS variable to computed color value using DOM
function resolveCssVariableToColor(cssVar: string): string {
    if (!cssVar || typeof cssVar !== "string") return cssVar || "#000000"
    if (!cssVar.startsWith("var(")) return cssVar
    
    // Try to resolve CSS variable using getComputedStyle
    if (typeof window !== "undefined" && typeof document !== "undefined" && document.body) {
        try {
            // Create a temporary element to compute the CSS variable
            const tempEl = document.createElement("div")
            tempEl.style.color = cssVar
            tempEl.style.position = "absolute"
            tempEl.style.visibility = "hidden"
            tempEl.style.pointerEvents = "none"
            document.body.appendChild(tempEl)
            const computedColor = window.getComputedStyle(tempEl).color
            document.body.removeChild(tempEl)
            
            // If we got a valid RGB color (not transparent or invalid), return it
            if (computedColor && 
                computedColor !== "rgba(0, 0, 0, 0)" && 
                computedColor !== "transparent" &&
                computedColor.startsWith("rgb")) {
                return computedColor
            }
        } catch (e) {
            // Fall through to fallback
        }
    }
    
    // Fallback to extracting default value from var()
    const fallback = resolveTokenColor(cssVar)
    // If fallback is still a var(), return the original (canvas can handle it)
    if (fallback.startsWith("var(")) {
        return cssVar
    }
    return fallback
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function ScribblePad({
    preview = false,
    widgets = true,
    backgroundColor = "#333333",    
    strokeWidths = [8, 10, 12, 14, 16],
    borderRadius="10px",
    colors = ["#FF6B6B", "#FFA94D", "#69DB7C", "#4DABF7", "#CC5DE8"], 
    strokeWidth: defaultStrokeWidth = 12,
    strokeColor: defaultStrokeColor = "#CC5DE8",
    buttonType = "default",
    defaultButton = {
        backgroundColor: "transparent",
        color: "rgba(255, 255, 255, 0.5)",
        hoverBackgroundColor: "rgba(255, 255, 255, 0.1)",
        hoverColor: "rgba(255, 255, 255, 0.9)",
        padding: "0.5px 11px 1.5px 10px",
        borderRadius: "19px",
        text: "Clear",
    },
    customButton,
    wiggle = {
        enable: true,
        movement: 0.65,
        speed: 2,
    },
    transition = { type: "ease", ease: [0.44, 0, 0, 1], duration: 0.25, delay: 0 },
    style,
}: ScribblePadProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const contextRef = useRef<CanvasRenderingContext2D | null>(null)

    // Resolve all color props to handle Framer color tokens (CSS variables)
    const resolvedStrokeColor = useMemo(
        () => resolveCssVariableToColor(defaultStrokeColor || "#CC5DE8"),
        [defaultStrokeColor]
    )
    const resolvedBackgroundColor = useMemo(
        () => resolveCssVariableToColor(backgroundColor || "#333333"),
        [backgroundColor]
    )
    const resolvedColors = useMemo(
        () => (colors || []).map(c => resolveCssVariableToColor(c)),
        [colors]
    )
    
    // When widgets are visible, use state for selected color/strokeWidth
    // When widgets are hidden, use props directly
    // Initialize color to first color from colors array when widgets are visible, otherwise use strokeColor
    const initialColor = widgets && resolvedColors.length > 0 
        ? resolvedColors[0] 
        : resolvedStrokeColor
    const initialStrokeWidth = widgets && strokeWidths.length > 0
        ? strokeWidths[0]
        : defaultStrokeWidth
    
    const [color, setColor] = useState(initialColor)
    const [strokeWidth, setStrokeWidth] = useState(initialStrokeWidth)
    const [showColorPanel, setShowColorPanel] = useState(false)
    const [showStrokePanel, setShowStrokePanel] = useState(false)
    
    // Get the current color and strokeWidth based on widgets visibility
    // When widgets are visible, completely ignore strokeColor and use widget state
    // When widgets are hidden, use props directly
    const currentColor = widgets ? color : resolvedStrokeColor
    const currentStrokeWidth = widgets ? strokeWidth : defaultStrokeWidth

    const isDrawingRef = useRef(false)
    const pointsRef = useRef<Point[]>([])
    const allStrokesRef = useRef<Stroke[]>([])
    const startTimeRef = useRef(0)
    const turbulenceTimeRef = useRef(0)
    const animationIdRef = useRef<number | null>(null)
    const originalCanvasSizeRef = useRef<{ width: number; height: number } | null>(null)

    // Initialize refs with correct values based on widgets state
    const colorRef = useRef(initialColor)
    const strokeWidthRef = useRef(initialStrokeWidth)
    const wiggleEnableRef = useRef(wiggle?.enable ?? true)
    const wiggleMovementRef = useRef(wiggle?.movement ?? 0.65)
    const wiggleSpeedRef = useRef(wiggle?.speed ?? 2)
    const previewRef = useRef(preview)

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Update refs when current values change
    useEffect(() => {
        colorRef.current = currentColor
    }, [currentColor])

    useEffect(() => {
        strokeWidthRef.current = currentStrokeWidth
    }, [currentStrokeWidth])
    
    // Sync state with props when widgets visibility changes
    useEffect(() => {
        if (widgets) {
            // When widgets become visible, initialize to first color/strokeWidth from arrays
            if (resolvedColors.length > 0) {
                setColor(resolvedColors[0])
            }
            if (strokeWidths.length > 0) {
                setStrokeWidth(strokeWidths[0])
            }
        } else {
            // When widgets are hidden, use props directly
            setColor(resolvedStrokeColor)
            setStrokeWidth(defaultStrokeWidth)
        }
    }, [widgets, resolvedColors, strokeWidths, resolvedStrokeColor, defaultStrokeWidth])
    
    // Ensure refs are always updated when props change (critical for widgets=false)
    // Use useLayoutEffect for synchronous updates before paint
    useLayoutEffect(() => {
        if (!widgets) {
            colorRef.current = resolvedStrokeColor
            strokeWidthRef.current = defaultStrokeWidth || 12
        } else {
            // When widgets are visible, use state values (never strokeColor)
            colorRef.current = color
            strokeWidthRef.current = strokeWidth
        }
    }, [widgets, resolvedStrokeColor, defaultStrokeWidth, color, strokeWidth])
    
    // Also update refs in regular useEffect as backup
    useEffect(() => {
        if (!widgets) {
            colorRef.current = resolvedStrokeColor
            strokeWidthRef.current = defaultStrokeWidth || 12
        } else {
            // When widgets are visible, use state values (never strokeColor)
            colorRef.current = color
            strokeWidthRef.current = strokeWidth
        }
    }, [widgets, resolvedStrokeColor, defaultStrokeWidth, color, strokeWidth])
    
    // When colors array changes and widgets are visible, update color if current color is no longer in array
    useEffect(() => {
        if (widgets && resolvedColors.length > 0) {
            // If current color is not in the resolved colors array, switch to first color
            if (!resolvedColors.includes(color)) {
                setColor(resolvedColors[0])
            }
        }
    }, [widgets, resolvedColors, color])
    
    // When strokeWidths array changes and widgets are visible, update strokeWidth if current width is no longer in array
    useEffect(() => {
        if (widgets && strokeWidths.length > 0) {
            // If current strokeWidth is not in the strokeWidths array, switch to first width
            if (!strokeWidths.includes(strokeWidth)) {
                setStrokeWidth(strokeWidths[0])
            }
        }
    }, [widgets, strokeWidths, strokeWidth])

    useEffect(() => {
        wiggleEnableRef.current = wiggle?.enable ?? true
    }, [wiggle?.enable])

    useEffect(() => {
        wiggleMovementRef.current = wiggle?.movement ?? 0.65
    }, [wiggle?.movement])

    useEffect(() => {
        wiggleSpeedRef.current = wiggle?.speed ?? 2
    }, [wiggle?.speed])

    useEffect(() => {
        previewRef.current = preview
    }, [preview])

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        contextRef.current = ctx

        const dpr =
            typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio || 1, 2)
                : 1

        const resizeCanvas = () => {
            // Use clientWidth/clientHeight as per Framer guidelines for canvas sizing
            const w = container.clientWidth || container.offsetWidth || 1
            const h = container.clientHeight || container.offsetHeight || 1

            // Store original canvas size on first resize if not set
            if (!originalCanvasSizeRef.current) {
                originalCanvasSizeRef.current = { width: w, height: h }
            }

            canvas.style.width = `${w}px`
            canvas.style.height = `${h}px`

            canvas.width = w * dpr
            canvas.height = h * dpr

            ctx.scale(dpr, dpr)

            ctx.lineCap = "round"
            ctx.lineJoin = "round"

            redrawAllStrokes()
        }

        resizeCanvas()

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas()
        })
        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    // Canvas resize detection for Framer Canvas
    useEffect(() => {
        if (!isCanvas) return

        const container = containerRef.current
        if (!container) return

        let rafId = 0
        const TICK_MS = 250
        const EPSPECT = 0.001
        const lastSize = { w: 0, h: 0, aspect: 0, ts: 0 }

        const tick = (now?: number) => {
            // Use clientWidth/clientHeight as per Framer guidelines
            const cw = container.clientWidth || container.offsetWidth || 1
            const ch = container.clientHeight || container.offsetHeight || 1
            const aspect = cw / ch

            const timeOk =
                !lastSize.ts ||
                (now || performance.now()) - lastSize.ts >= TICK_MS
            const aspectChanged = Math.abs(aspect - lastSize.aspect) > EPSPECT
            const sizeChanged =
                Math.abs(cw - lastSize.w) > 1 || Math.abs(ch - lastSize.h) > 1

            if (timeOk && (aspectChanged || sizeChanged)) {
                lastSize.w = cw
                lastSize.h = ch
                lastSize.aspect = aspect
                lastSize.ts = now || performance.now()

                const canvas = canvasRef.current
                if (canvas) {
                    const dpr =
                        typeof window !== "undefined"
                            ? Math.min(window.devicePixelRatio || 1, 2)
                            : 1
                    canvas.style.width = `${cw}px`
                    canvas.style.height = `${ch}px`
                    canvas.width = cw * dpr
                    canvas.height = ch * dpr
                    const ctx = contextRef.current
                    if (ctx) {
                        ctx.scale(dpr, dpr)
                        redrawAllStrokes()
                    }
                }
            }

            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [isCanvas])

    const applyTurbulence = (
        x: number,
        y: number,
        t: number
    ): { x: number; y: number } => {
        if (!wiggleEnableRef.current) return { x, y }

        const amount = wiggleMovementRef.current
        if (amount <= 0) return { x, y }

        const frequency = 0.5
        const offsetX =
            Math.sin(x * frequency + t * 0.01) *
            Math.sin(y * frequency * 0.5 + t * 0.02) *
            amount

        const offsetY =
            Math.sin(y * frequency + t * 0.015) *
            Math.sin(x * frequency * 0.5 + t * 0.025) *
            amount

        return {
            x: x + offsetX,
            y: y + offsetY,
        }
    }

    const getCoordinates = (
        event: MouseEvent | TouchEvent
    ): { x: number; y: number } => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return { x: 0, y: 0 }

        // Use clientWidth/clientHeight as per Framer guidelines for canvas sizing
        const rectW = container.clientWidth || container.offsetWidth || 1
        const rectH = container.clientHeight || container.offsetHeight || 1
        const dpr =
            typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio || 1, 2)
                : 1

        const rect = container.getBoundingClientRect()

        // When the widget is "zoomed" via CSS transforms (e.g. parent scale),
        // client coords are in the transformed space. Normalize back into the
        // canvas drawing coordinate space (CSS px) using the rect vs backing store.
        const toCanvasCssX = (clientX: number) =>
            ((clientX - rect.left) * canvas.width) / rectW / dpr
        const toCanvasCssY = (clientY: number) =>
            ((clientY - rect.top) * canvas.height) / rectH / dpr

        if ("touches" in event && event.touches.length > 0) {
            return {
                x: toCanvasCssX(event.touches[0].clientX),
                y: toCanvasCssY(event.touches[0].clientY),
            }
        }

        if ("clientX" in event) {
            return {
                x: toCanvasCssX(event.clientX),
                y: toCanvasCssY(event.clientY),
            }
        }

        return { x: 0, y: 0 }
    }

    const startDrawing = (event: MouseEvent | TouchEvent) => {
        event.preventDefault()
        pointsRef.current = []
        startTimeRef.current = Date.now()

        const coords = getCoordinates(event)
        pointsRef.current.push({ ...coords, t: 0 })

        const ctx = contextRef.current
        if (ctx) {
            ctx.beginPath()
            ctx.moveTo(coords.x, coords.y)
        }

        isDrawingRef.current = true
    }

    const draw = (event: MouseEvent | TouchEvent) => {
        if (!isDrawingRef.current) return
        event.preventDefault()

        const coords = getCoordinates(event)
        const t = Date.now() - startTimeRef.current

        pointsRef.current.push({ ...coords, t })
        redrawCurrentStroke()
    }

    const finishDrawing = () => {
        if (!isDrawingRef.current) return

        isDrawingRef.current = false

        if (pointsRef.current.length > 0) {
            const canvas = canvasRef.current
            if (!canvas) return

            const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1
            const w = (canvas.width / dpr) || 1
            const h = (canvas.height / dpr) || 1

            // Store original canvas size if not set
            if (!originalCanvasSizeRef.current) {
                originalCanvasSizeRef.current = { width: w, height: h }
            }

            // When widgets are false, use resolved props directly to ensure correct values
            const strokeColor = widgets ? colorRef.current : resolvedStrokeColor
            const strokeW = widgets ? strokeWidthRef.current : (defaultStrokeWidth || 12)
            allStrokesRef.current.push({
                points: [...pointsRef.current],
                color: strokeColor,
                strokeWidth: strokeW,
                canvasWidth: w,
                canvasHeight: h,
            })
        }

        redrawAllStrokes()
    }

    const redrawCurrentStroke = () => {
        redrawAllStrokes()

        const ctx = contextRef.current
        if (!ctx || pointsRef.current.length === 0) return

        // When widgets are false, read directly from resolved props to ensure latest values
        const currentColor = widgets ? colorRef.current : resolvedStrokeColor
        const currentWidth = widgets ? strokeWidthRef.current : (defaultStrokeWidth || 12)
        const t = turbulenceTimeRef.current

        if (pointsRef.current.length === 1) {
            ctx.save()
            ctx.fillStyle = currentColor
            ctx.beginPath()
            const point = pointsRef.current[0]
            const turbulent = applyTurbulence(point.x, point.y, t)
            ctx.arc(turbulent.x, turbulent.y, currentWidth / 2, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
            return
        }

        ctx.save()
        ctx.strokeStyle = currentColor
        ctx.lineWidth = currentWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        ctx.beginPath()

        const firstPoint = pointsRef.current[0]
        const firstTurbulent = applyTurbulence(firstPoint.x, firstPoint.y, t)
        ctx.moveTo(firstTurbulent.x, firstTurbulent.y)

        for (let i = 1; i < pointsRef.current.length; i++) {
            const point = pointsRef.current[i]
            const turbulent = applyTurbulence(point.x, point.y, t)
            ctx.lineTo(turbulent.x, turbulent.y)
        }

        ctx.stroke()
        ctx.restore()
    }

    const redrawAllStrokes = () => {
        const ctx = contextRef.current
        const canvas = canvasRef.current
        if (!ctx || !canvas) return

        const w =
            canvas.width /
            (typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio || 1, 2)
                : 1)
        const h =
            canvas.height /
            (typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio || 1, 2)
                : 1)

        ctx.clearRect(0, 0, w, h)

        const t = turbulenceTimeRef.current

        for (const stroke of allStrokesRef.current) {
            // Calculate scale factors if original canvas size is stored
            let scaleX = 1
            let scaleY = 1
            let offsetX = 0
            let offsetY = 0

            if (stroke.canvasWidth && stroke.canvasHeight) {
                const origW = stroke.canvasWidth
                const origH = stroke.canvasHeight
                
                // Calculate scale to maintain aspect ratio and center
                const scale = Math.min(w / origW, h / origH)
                scaleX = scale
                scaleY = scale
                
                // Center the scaled drawing
                const scaledW = origW * scale
                const scaledH = origH * scale
                offsetX = (w - scaledW) / 2
                offsetY = (h - scaledH) / 2
            }

            ctx.save()
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.strokeWidth * scaleX
            ctx.lineCap = "round"
            ctx.lineJoin = "round"

            if (stroke.points.length === 1) {
                ctx.fillStyle = stroke.color
                ctx.beginPath()
                const point = stroke.points[0]
                const scaledX = point.x * scaleX + offsetX
                const scaledY = point.y * scaleY + offsetY
                const turbulent = applyTurbulence(scaledX, scaledY, t)
                ctx.arc(
                    turbulent.x,
                    turbulent.y,
                    stroke.strokeWidth * scaleX,
                    0,
                    Math.PI * 2
                )
                ctx.fill()
            } else if (stroke.points.length > 1) {
                ctx.beginPath()
                const firstPoint = stroke.points[0]
                const firstScaledX = firstPoint.x * scaleX + offsetX
                const firstScaledY = firstPoint.y * scaleY + offsetY
                const firstTurbulent = applyTurbulence(
                    firstScaledX,
                    firstScaledY,
                    t
                )
                ctx.moveTo(firstTurbulent.x, firstTurbulent.y)

                for (let i = 1; i < stroke.points.length; i++) {
                    const point = stroke.points[i]
                    const scaledX = point.x * scaleX + offsetX
                    const scaledY = point.y * scaleY + offsetY
                    const turbulent = applyTurbulence(scaledX, scaledY, t)
                    ctx.lineTo(turbulent.x, turbulent.y)
                }

                ctx.stroke()
            }

            ctx.restore()
        }
    }

    const clearCanvas = () => {
        const ctx = contextRef.current
        const canvas = canvasRef.current
        if (!ctx || !canvas) return

        const w =
            canvas.width /
            (typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio || 1, 2)
                : 1)
        const h =
            canvas.height /
            (typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio || 1, 2)
                : 1)

        ctx.clearRect(0, 0, w, h)
        pointsRef.current = []
        allStrokesRef.current = []
    }

    // Event handlers
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const handleMouseDown = (e: MouseEvent) => startDrawing(e)
        const handleMouseMove = (e: MouseEvent) => draw(e)
        const handleMouseUp = () => finishDrawing()
        const handleMouseLeave = () => finishDrawing()

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault()
            startDrawing(e)
        }
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault()
            draw(e)
        }
        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault()
            finishDrawing()
        }

        canvas.addEventListener("mousedown", handleMouseDown)
        canvas.addEventListener("mousemove", handleMouseMove)
        canvas.addEventListener("mouseup", handleMouseUp)
        canvas.addEventListener("mouseleave", handleMouseLeave)
        canvas.addEventListener("touchstart", handleTouchStart, {
            passive: false,
        })
        canvas.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        })
        canvas.addEventListener("touchend", handleTouchEnd, { passive: false })

        return () => {
            canvas.removeEventListener("mousedown", handleMouseDown)
            canvas.removeEventListener("mousemove", handleMouseMove)
            canvas.removeEventListener("mouseup", handleMouseUp)
            canvas.removeEventListener("mouseleave", handleMouseLeave)
            canvas.removeEventListener("touchstart", handleTouchStart)
            canvas.removeEventListener("touchmove", handleTouchMove)
            canvas.removeEventListener("touchend", handleTouchEnd)
        }
    }, [])

    // Wiggle animation
    useEffect(() => {
        const animate = () => {
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            const isPreviewOn = previewRef.current

            if (!(isCanvasMode && !isPreviewOn) && wiggleEnableRef.current) {
                turbulenceTimeRef.current += wiggleSpeedRef.current

                if (allStrokesRef.current.length > 0 || isDrawingRef.current) {
                    if (isDrawingRef.current) {
                        redrawCurrentStroke()
                    } else {
                        redrawAllStrokes()
                    }
                }
            }

            animationIdRef.current = requestAnimationFrame(animate)
        }

        animationIdRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current)
            }
        }
    }, [])

    const showControls = () => {
        setShowColorPanel(false)
        setShowStrokePanel(false)
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                backgroundColor: resolvedBackgroundColor,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: borderRadius,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    cursor: "crosshair",
                    touchAction: "none",
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />

            {/* Clear Button */}
            {widgets && (
                <AnimatePresence initial={false}>
                    {!(showColorPanel || showStrokePanel) && (
                        buttonType === "custom" && customButton ? (
                            React.isValidElement(customButton) ? (
                                React.cloneElement(customButton as React.ReactElement<any>, {
                                    onClick: (e: React.MouseEvent) => {
                                        clearCanvas()
                                        // Call original onClick if it exists
                                        if ((customButton as any).props?.onClick) {
                                            (customButton as any).props.onClick(e)
                                        }
                                    },
                                    style: {
                                        ...((customButton as any).props?.style || {}),
                                        position: "absolute",
                                        bottom: 12,
                                        left: 12,
                                    },
                                })
                            ) : (
                                <div
                                    onClick={clearCanvas}
                                    style={{
                                        cursor: "pointer",
                                        position: "absolute",
                                        bottom: 12,
                                        left: 12,
                                    }}
                                >
                                    {customButton}
                                </div>
                            )
                        ) : (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={
                                    transition?.type === "spring"
                                        ? {
                                              opacity: 1,
                                              scale: 1,
                                          }
                                        : {
                                              opacity: 1,
                                              scale: 1,
                                          }
                                }
                                exit={{
                                    opacity: 0,
                                    scale: 0.95,
                                }}
                                transition={{
                                    opacity: transition?.type === "spring" ? { duration: 0.3, ease: "easeInOut" } : transition,
                                    scale: transition?.type === "spring" ? { duration: 0.3, ease: "easeInOut" } : transition,
                                    backgroundColor: { duration: 0.2, ease: "easeOut" },
                                    color: { duration: 0.2, ease: "easeOut" },
                                }}
                                onClick={clearCanvas}
                                style={{
                                    position: "absolute",
                                    bottom: 12,
                                    left: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    padding: defaultButton?.padding || "6px 11px 6px 11px",
                                    color: defaultButton?.color || "rgba(255, 255, 255, 0.5)",
                                    fontFamily: '"Inter", sans-serif',
                                    height: "fitContent",
                                    width: "fitContent",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    backgroundColor: defaultButton?.backgroundColor || "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    borderRadius: defaultButton?.borderRadius || "19px",
                                    userSelect: "none",
                                }}
                                whileHover={{
                                    backgroundColor: defaultButton?.hoverBackgroundColor || "rgba(255, 255, 255, 0.1)",
                                    color: defaultButton?.hoverColor || "rgba(255, 255, 255, 0.9)",
                                }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {defaultButton?.text || "Clear"}
                            </motion.button>
                        )
                    )}
                </AnimatePresence>
            )}

            {/* Controls Wrapper */}
            {widgets && (
                <AnimatePresence initial={false}>
                    {!(showColorPanel || showStrokePanel) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                                opacity: 0,
                                scale: 0.95,
                            }}
                            transition={
                                transition?.type === "spring"
                                    ? {
                                          opacity: { duration: 0.3, ease: "easeInOut" },
                                          scale: { duration: 0.3, ease: "easeInOut" },
                                      }
                                    : transition
                            }
                            style={{
                                position: "absolute",
                                bottom: 12,
                                right: 12,
                                height: 38,
                                display: "flex",
                                alignItems: "center",
                                pointerEvents: "auto",
                            }}
                        >
                            <motion.div
                                style={{
                                    display: "flex",
                                    gap: 16,
                                    alignItems: "center",
                                    pointerEvents: "auto",
                                }}
                                initial={{ filter: "blur(4px)" }}
                                animate={{
                                    filter: "blur(0px)",
                                }}
                                exit={{
                                    filter: "blur(4px)",
                                }}
                                transition={
                                    transition?.type === "spring"
                                        ? {
                                              filter: { duration: 0.3, ease: "easeInOut" },
                                          }
                                        : transition
                                }
                            >
                                    <div
                                        onClick={() => {
                                            setShowStrokePanel(!showStrokePanel)
                                            setShowColorPanel(false)
                                        }}
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: "50%",
                                            backgroundColor: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            transition: "transform 0.2s ease",
                                        }}
                                        onMouseDown={(e) => {
                                            e.currentTarget.style.transform =
                                                "scale(0.9)"
                                        }}
                                        onMouseUp={(e) => {
                                            e.currentTarget.style.transform =
                                                "scale(1)"
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: currentStrokeWidth,
                                                height: currentStrokeWidth,
                                                backgroundColor: "#666",
                                                borderRadius: "50%",
                                            }}
                                        />
                                    </div>

                                    <div
                                        onClick={() => {
                                            setShowColorPanel(!showColorPanel)
                                            setShowStrokePanel(false)
                                        }}
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 10,
                                            backgroundColor: "white",
                                            padding: 0,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "transform 0.2s ease",
                                        }}
                                        onMouseDown={(e) => {
                                            e.currentTarget.style.transform =
                                                "scale(0.9)"
                                        }}
                                        onMouseUp={(e) => {
                                            e.currentTarget.style.transform =
                                                "scale(1)"
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 6,
                                                backgroundColor: currentColor,
                                                boxShadow:
                                                    "inset 0 0 0 0.5px rgba(0, 0, 0, 0.1)",
                                            }}
                                        />
                                    </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Color Panel */}
            <AnimatePresence initial={false}>
                {widgets && showColorPanel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={transition}
                        style={{
                            position: "absolute",
                            bottom: 12,
                            left: 12,
                            right: 12,
                            height: 38,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "auto",
                            gap: 16,
                        }}
                    >
                        {resolvedColors.map((c, index) => {
                            const isSpring = transition?.type === "spring"
                            return (
                                <motion.div
                                    key={`${colors[index] || index}-${c}`}
                                    initial={isSpring ? { opacity: 1, y: 50 } : { opacity: 0, y: 50 }}
                                    animate={
                                        isSpring
                                            ? {
                                                  y: 0,
                                                  transition: {
                                                      ...transition,
                                                      delay: index * 0.05,
                                                  },
                                              }
                                            : {
                                                  opacity: 1,
                                                  y: 0,
                                                  transition: {
                                                      ...transition,
                                                      delay: index * 0.05,
                                                  },
                                              }
                                    }
                                    exit={{
                                        opacity: 0,
                                        y: 50,
                                        transition: {
                                            duration: 0.1,
                                            delay: 0,
                                            ease: "easeInOut",
                                        },
                                    }}
                                    onClick={() => {
                                        setColor(c)
                                        showControls()
                                    }}
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 10,
                                        backgroundColor: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 6,
                                            backgroundColor: c,
                                            boxShadow:
                                                "inset 0 0 0 0.5px rgba(0, 0, 0, 0.1)",
                                        }}
                                    />
                                </motion.div>
                            )
                        })}
                        <motion.div
                            initial={transition?.type === "spring" ? { opacity: 1, y: 50 } : { opacity: 0, y: 50 }}
                            animate={
                                transition?.type === "spring"
                                    ? {
                                          y: 0,
                                          transition: {
                                              ...transition,
                                              delay: resolvedColors.length * 0.05,
                                          },
                                      }
                                    : {
                                          opacity: 1,
                                          y: 0,
                                          transition: {
                                              ...transition,
                                              delay: resolvedColors.length * 0.05,
                                          },
                                      }
                            }
                            exit={{
                                opacity: 0,
                                y: 50,
                                transition: {
                                    duration: 0.1,
                                    delay: 0,
                                    ease: "easeInOut",
                                },
                            }}
                            onClick={showControls}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                backdropFilter: "blur(12px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                            whileHover={{
                                backgroundColor: "rgba(0, 0, 0, 0.65)",
                            }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <path
                                    d="M8 8L12.5 3.5M8 8L3.5 3.5M8 8L3.5 12.5M8 8L12.5 12.5"
                                    stroke="white"
                                    strokeOpacity={0.5}
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stroke Panel */}
            <AnimatePresence initial={false}>
                {widgets && showStrokePanel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={
                            transition?.type === "spring"
                                ? { duration: 0.3, ease: "easeInOut" }
                                : transition
                        }
                        style={{
                            position: "absolute",
                            bottom: 12,
                            left: 12,
                            right: 12,
                            height: 38,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "auto",
                            gap: 16,
                        }}
                    >
                        {strokeWidths.map((width, index) => {
                            const isSpring = transition?.type === "spring"
                            return (
                                <motion.div
                                    key={width}
                                    initial={isSpring ? { opacity: 1, y: 50 } : { opacity: 0, y: 50 }}
                                    animate={
                                        isSpring
                                            ? {
                                                  y: 0,
                                                  transition: {
                                                      ...transition,
                                                      delay: index * 0.05,
                                                  },
                                              }
                                            : {
                                                  opacity: 1,
                                                  y: 0,
                                                  transition: {
                                                      ...transition,
                                                      delay: index * 0.05,
                                                  },
                                              }
                                    }
                                    exit={{
                                        opacity: 0,
                                        y: 50,
                                        transition: {
                                            duration: 0.1,
                                            delay: 0,
                                            ease: "easeInOut",
                                        },
                                    }}
                                    onClick={() => {
                                        setStrokeWidth(width)
                                        showControls()
                                    }}
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 19,
                                        backgroundColor: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div
                                        style={{
                                            width: width,
                                            height: width,
                                            backgroundColor: "#666",
                                            borderRadius: "50%",
                                        }}
                                    />
                                </motion.div>
                            )
                        })}
                        <motion.div
                            initial={transition?.type === "spring" ? { opacity: 1, y: 50 } : { opacity: 0, y: 50 }}
                            animate={
                                transition?.type === "spring"
                                    ? {
                                          y: 0,
                                          transition: {
                                              ...transition,
                                              delay: strokeWidths.length * 0.05,
                                          },
                                      }
                                    : {
                                          opacity: 1,
                                          y: 0,
                                          transition: {
                                              ...transition,
                                              delay: strokeWidths.length * 0.05,
                                          },
                                      }
                            }
                            exit={{
                                opacity: 0,
                                y: 50,
                                transition: {
                                    duration: 0.1,
                                    delay: 0,
                                    ease: "easeInOut",
                                },
                            }}
                            onClick={showControls}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                backdropFilter: "blur(12px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                            whileHover={{
                                backgroundColor: "rgba(0, 0, 0, 0.65)",
                            }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <path
                                    d="M8 8L12.5 3.5M8 8L3.5 3.5M8 8L3.5 12.5M8 8L12.5 12.5"
                                    stroke="white"
                                    strokeOpacity={0.5}
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

addPropertyControls(ScribblePad, {
    widgets: {
        type: ControlType.Boolean,
        title: "Widgets",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    colors: {
        type: ControlType.Array,
        title: "Colors",
        control: {
            type: ControlType.Color,
        },
        maxCount: 10,
        hidden: (props: ScribblePadProps) => props.widgets === false,
        defaultValue: ["#FF6B6B", "#FFA94D", "#69DB7C", "#4DABF7", "#CC5DE8"],
    },
    strokeWidths: {
        type: ControlType.Array,
        title: "Widths",
        control: {
            type: ControlType.Number,
            min: 1,
            max: 25,
            step: 1,
            unit: "px",
        },
        maxCount: 10,
        hidden: (props: ScribblePadProps) => props.widgets === false,
        defaultValue: [8, 10, 12, 14, 16],
    },
    strokeColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#CC5DE8",
        hidden: (props: ScribblePadProps) => props.widgets === true,
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Width",
        unit: "px",
        min: 1,
        max: 25,
        step: 1,
        defaultValue: 12,
        hidden: (props: ScribblePadProps) => props.widgets === true,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#333333",
    },
    borderRadius: {
        // @ts-ignore - ControlType.BorderRadius exists but may not be in types
        type: ControlType.BorderRadius,
        title: "Radius",
        defaultValue: "0px",
    },
    buttonType: {
        type: ControlType.Enum,
        title: "Button Type",
        options: ["default", "custom"],
        optionTitles: ["Default", "Custom"],
        defaultValue: "default",
        displaySegmentedControl:true,
        segmentedControlDirection:"vertical",
        hidden: (props: ScribblePadProps) => !props.widgets,
    },
    defaultButton: {
        type: ControlType.Object,
        title: "Button",
        controls: {
            text: {
                type: ControlType.String,
                title: "Text",
                defaultValue: "Clear",
            },
            backgroundColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "#424242",
            },
            color: {
                type: ControlType.Color,
                title: "Text Color",
                defaultValue: "rgba(255, 255, 255, 0.5)",
            },
            padding: {
                // @ts-ignore - ControlType.Padding exists but may not be in types
                type: ControlType.Padding,
                title: "Padding",
                defaultValue: "8px 12px 8px 12px",
            },
            borderRadius: {
                // @ts-ignore - ControlType.BorderRadius exists but may not be in types
                type: ControlType.BorderRadius,
                title: "Radius",
                defaultValue: "19px",
            },
            hoverBackgroundColor: {
                type: ControlType.Color,
                title: "Hover BG",
                defaultValue: "#006FFF",
            },
            hoverColor: {
                type: ControlType.Color,
                title: "Hover Text",
                defaultValue: "rgba(255, 255, 255, 0.9)",
            },
        },
        hidden: (props: ScribblePadProps) => props.buttonType !== "default" || !props.widgets,
    },
    customButton: {
        // @ts-ignore - ControlType.ComponentInstance exists but may not be in types
        type: ControlType.ComponentInstance,
        title: "Button",
        hidden: (props: ScribblePadProps) => props.buttonType !== "custom" || !props.widgets,
    },
    wiggle: {
        type: ControlType.Object,
        title: "Wiggle",
        controls: {
            enable: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            movement: {
                type: ControlType.Number,
                title: "Movement",
                min: 0,
                max: 2,
                step: 0.05,
                defaultValue: 0.65,
                hidden: (props) => !props.enable,
            },
            speed: {
                type: ControlType.Number,
                title: "Speed",
                min: 0,
                max: 5,
                step: 0.1,
                defaultValue: 2,
                hidden: (props) => !props.enable,
                
            },
        },
        defaultValue: {
            enable: true,
            movement: 0.65,
            speed: 2,
        },
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { duration: 0.25, ease: [0.44, 0, 0, 1] },
        description:"More components at [Framer University](https://frameruni.link/cc)."
        
    },
})

ScribblePad.displayName = "Scribble Pad"
