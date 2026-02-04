import { addPropertyControls, ControlType } from "framer"
import React, { useEffect, useRef, useState } from "react"

interface GridDot {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    targetSize: number
    brightness: number
}

interface TrailPoint {
    x: number
    y: number
    time: number
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 500
 * @framerDisableUnlink
 */
export default function KineticGrid(props: {
    cursorTrail?: boolean
    cursorTrailProps?: {
        trailMode?: "click" | "hover"
        trailLength?: number
        trailColor?: string
    }
    backgroundColor?: string
    gridColor?: string
    dotColor?: string
    hoverColor?: string
    gridSize?: number
    repulsionStrength?: number
    radius?: number
    dotSize?: number
    gridThickness?: number
    baseOpacity?: number
    style?: React.CSSProperties
}) {
    const {
        cursorTrail = false,
        cursorTrailProps = {},
        backgroundColor = "#121212",
        gridColor = "#FFFFFF",
        dotColor = "#FFFFFF",
        hoverColor = "#FFFFFF",
        gridSize = 60,
        repulsionStrength = -0.65,
        radius = 290,
        dotSize = 1.5,
        gridThickness = 0.5,
        baseOpacity = 0.09,
    } = props

    const {
        trailMode = "hover",
        trailLength = 0.1, // 0.1–1 in UI; internally × 100
        trailColor = "#FFFFFF",
    } = cursorTrailProps

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number | null>(null)
    const dotsRef = useRef<Map<string, GridDot>>(new Map())
    const mousePosRef = useRef<{ x: number; y: number } | null>(null)
    const trailPointsRef = useRef<TrailPoint[]>([])
    const isMouseDownRef = useRef(false)
    const [mounted, setMounted] = useState(false)

    // Store colors in refs to avoid re-initializing animation
    const colorsRef = useRef({
        backgroundColor,
        gridColor,
        dotColor,
        hoverColor,
        gridSize,
        repulsionStrength,
        radius,
        dotSize,
        gridThickness,
        baseOpacity,
        cursorTrail,
        trailMode,
        trailLength,
        trailColor,
    })

    // Track previous grid size to detect changes
    const prevGridSizeRef = useRef(gridSize)

    // Update colors ref when props change (without re-running effect)
    useEffect(() => {
        const gridSizeChanged = prevGridSizeRef.current !== gridSize
        prevGridSizeRef.current = gridSize

        colorsRef.current = {
            backgroundColor,
            gridColor,
            dotColor,
            hoverColor,
            gridSize,
            repulsionStrength,
            radius,
            dotSize,
            gridThickness,
            baseOpacity,
            cursorTrail,
            trailMode,
            trailLength,
            trailColor,
        }

        // Reinitialize dots if grid size changed
        if (gridSizeChanged && mounted && canvasRef.current) {
            const canvas = canvasRef.current
            // Use clientWidth/clientHeight for reliable sizing in Framer
            const width = canvas.clientWidth || canvas.offsetWidth || 1
            const height = canvas.clientHeight || canvas.offsetHeight || 1

            dotsRef.current.clear()
            for (
                let gx = -gridSize;
                gx < width + gridSize * 2;
                gx += gridSize
            ) {
                for (
                    let gy = -gridSize;
                    gy < height + gridSize * 2;
                    gy += gridSize
                ) {
                    const key = `${gx},${gy}`
                    dotsRef.current.set(key, {
                        x: gx,
                        y: gy,
                        vx: 0,
                        vy: 0,
                        size: 1,
                        targetSize: 1,
                        brightness: 1,
                    })
                }
            }
        }
    }, [
        mounted,
        backgroundColor,
        gridColor,
        dotColor,
        hoverColor,
        gridSize,
        repulsionStrength,
        radius,
        dotSize,
        gridThickness,
        baseOpacity,
        cursorTrail,
        trailMode,
        trailLength,
        trailColor,
    ])

    // Parse color to RGB and opacity - handles hex, rgb(), rgba()
    const parseColor = (
        color: string
    ): { r: number; g: number; b: number; a: number } => {
        if (!color) return { r: 160, g: 160, b: 160, a: 1 }

        // Handle rgba() with opacity
        const rgbaMatch = color.match(
            /rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)/i
        )
        if (rgbaMatch) {
            return {
                r: parseInt(rgbaMatch[1]),
                g: parseInt(rgbaMatch[2]),
                b: parseInt(rgbaMatch[3]),
                a: parseFloat(rgbaMatch[4]),
            }
        }

        // Handle rgb() without opacity (defaults to 1)
        const rgbMatch = color.match(
            /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i
        )
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
                a: 1,
            }
        }

        // Handle hex (with or without #) - check for 8 digit hex with alpha
        let hex = color.replace("#", "")

        // Handle 8 digit hex (RRGGBBAA)
        if (hex.length === 8) {
            const r = parseInt(hex.substring(0, 2), 16)
            const g = parseInt(hex.substring(2, 4), 16)
            const b = parseInt(hex.substring(4, 6), 16)
            const a = parseInt(hex.substring(6, 8), 16) / 255

            if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
                return { r, g, b, a }
            }
        }

        // Handle short hex like FFF
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }

        // Handle 4 digit short hex (RGBA)
        if (hex.length === 4) {
            const r = parseInt(hex[0] + hex[0], 16)
            const g = parseInt(hex[1] + hex[1], 16)
            const b = parseInt(hex[2] + hex[2], 16)
            const a = parseInt(hex[3] + hex[3], 16) / 255

            if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
                return { r, g, b, a }
            }
        }

        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)

        // Return fallback if parsing failed
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return { r: 160, g: 160, b: 160, a: 1 }
        }

        // Default opacity to 1 for hex colors
        return { r, g, b, a: 1 }
    }

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const maxDist = 400
        const springStiffness = 0.08
        const damping = 0.75

        // Get canvas container dimensions
        const getCanvasSize = () => {
            // Use clientWidth/clientHeight for reliable sizing in Framer
            const width = canvas.clientWidth || canvas.offsetWidth || 1
            const height = canvas.clientHeight || canvas.offsetHeight || 1
            return { width, height }
        }

        // Initialize dots
        const initDots = () => {
            dotsRef.current.clear()
            const { width, height } = getCanvasSize()
            const currentGridSize = colorsRef.current.gridSize

            for (
                let gx = -currentGridSize;
                gx < width + currentGridSize * 2;
                gx += currentGridSize
            ) {
                for (
                    let gy = -currentGridSize;
                    gy < height + currentGridSize * 2;
                    gy += currentGridSize
                ) {
                    const key = `${gx},${gy}`
                    dotsRef.current.set(key, {
                        x: gx,
                        y: gy,
                        vx: 0,
                        vy: 0,
                        size: 1,
                        targetSize: 1,
                        brightness: 1,
                    })
                }
            }
        }

        let { width, height } = getCanvasSize()
        canvas.width = width
        canvas.height = height

        initDots()

        let lastTime = performance.now()

        // Calculate hover glow intensity at a given point
        const getHoverIntensity = (x: number, y: number) => {
            const mouse = mousePosRef.current
            if (!mouse) return 0

            const hoverRadius = colorsRef.current.radius
            const dx = x - mouse.x
            const dy = y - mouse.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist > hoverRadius) return 0

            // Steeper falloff for more attenuation - returns 0 to 1
            // Using power of 3.5 for faster opacity drop-off as distance increases
            const intensity = Math.pow(1 - dist / hoverRadius, 3.5)
            return intensity
        }

        // Map repulsion from UI range (-1 to 1) to internal range (-13 to +40)
        const mapRepulsion = (value: number): number => {
            // value is between -1 and 1
            if (value <= 0) {
                // Map -1 to 0 -> -25 to 0
                return value * 25
            } else {
                // Map 0 to 1 -> 0 to 90
                return value * 90
            }
        }

        // Calculate push force from cursor (like panels in source)
        const getCursorPush = (baseX: number, baseY: number) => {
            const mouse = mousePosRef.current
            const currentRepulsion = colorsRef.current.repulsionStrength
            const mappedRepulsion = mapRepulsion(currentRepulsion)
            if (!mouse || mappedRepulsion === 0) return { x: 0, y: 0 }

            const dx = baseX - mouse.x
            const dy = baseY - mouse.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist === 0) return { x: 0, y: 0 }

            const normalizedDist = Math.min(dist / maxDist, 1)
            const pushAmount =
                Math.pow(1 - normalizedDist, 2) * mappedRepulsion

            return {
                x: dist > 0 ? (dx / dist) * pushAmount : 0,
                y: dist > 0 ? (dy / dist) * pushAmount : 0,
            }
        }

        const animate = () => {
            const now = performance.now()
            const deltaTime = now - lastTime
            lastTime = now

            // Get current colors from ref
            const currentColors = colorsRef.current
            const hoverColorParsed = parseColor(currentColors.hoverColor)
            const gridColorParsed = parseColor(currentColors.gridColor)
            const dotColorParsed = parseColor(currentColors.dotColor)
            const bgColorParsed = parseColor(currentColors.backgroundColor)
            const currentGridSize = currentColors.gridSize
            const currentDotSize = currentColors.dotSize
            const currentGridThickness = currentColors.gridThickness
            const currentBaseOpacity = currentColors.baseOpacity

            // Clear canvas first (for transparency support)
            ctx.clearRect(0, 0, width, height)

            // Fill background with parsed color (respects alpha)
            ctx.fillStyle = `rgba(${bgColorParsed.r}, ${bgColorParsed.g}, ${bgColorParsed.b}, ${bgColorParsed.a})`
            ctx.fillRect(0, 0, width, height)

            // Draw grid lines
            dotsRef.current.forEach((dot, key) => {
                const [gxStr, gyStr] = key.split(",")
                const gx = parseInt(gxStr)
                const gy = parseInt(gyStr)

                // Get neighbors (right and bottom)
                const rightKey = `${gx + currentGridSize},${gy}`
                const bottomKey = `${gx},${gy + currentGridSize}`
                const rightDot = dotsRef.current.get(rightKey)
                const bottomDot = dotsRef.current.get(bottomKey)

                // Get hover intensity at this dot's position
                const hoverIntensity = getHoverIntensity(dot.x, dot.y)

                if (rightDot) {
                    const rightHover = getHoverIntensity(rightDot.x, rightDot.y)
                    // Average hover intensity between endpoints for smooth line blending
                    const avgHover = (hoverIntensity + rightHover) / 2

                    // Blend between grid color and hover color based on intensity
                    const r = Math.round(
                        gridColorParsed.r +
                            (hoverColorParsed.r - gridColorParsed.r) * avgHover
                    )
                    const g = Math.round(
                        gridColorParsed.g +
                            (hoverColorParsed.g - gridColorParsed.g) * avgHover
                    )
                    const b = Math.round(
                        gridColorParsed.b +
                            (hoverColorParsed.b - gridColorParsed.b) * avgHover
                    )
                    // Opacity: start from baseOpacity when far from cursor, increase to 1.0 when hovering
                    const lineOpacity = currentBaseOpacity + (1 - currentBaseOpacity) * avgHover

                    ctx.beginPath()
                    ctx.moveTo(dot.x, dot.y)
                    ctx.lineTo(rightDot.x, rightDot.y)
                    ctx.lineWidth = currentGridThickness + avgHover * 2
                    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineOpacity})`
                    ctx.stroke()
                }

                if (bottomDot) {
                    const avgHover =
                        (hoverIntensity +
                            getHoverIntensity(bottomDot.x, bottomDot.y)) /
                        2

                    // Blend between grid color and hover color based on intensity
                    const r = Math.round(
                        gridColorParsed.r +
                            (hoverColorParsed.r - gridColorParsed.r) * avgHover
                    )
                    const g = Math.round(
                        gridColorParsed.g +
                            (hoverColorParsed.g - gridColorParsed.g) * avgHover
                    )
                    const b = Math.round(
                        gridColorParsed.b +
                            (hoverColorParsed.b - gridColorParsed.b) * avgHover
                    )
                    // Opacity: start from baseOpacity when far from cursor, increase to 1.0 when hovering
                    const lineOpacity = currentBaseOpacity + (1 - currentBaseOpacity) * avgHover

                    ctx.beginPath()
                    ctx.moveTo(dot.x, dot.y)
                    ctx.lineTo(bottomDot.x, bottomDot.y)
                    ctx.lineWidth = currentGridThickness + avgHover * 2
                    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineOpacity})`
                    ctx.stroke()
                }
            })

            // Draw dots
            dotsRef.current.forEach((dot, key) => {
                const [gxStr, gyStr] = key.split(",")
                const gx = parseInt(gxStr)
                const gy = parseInt(gyStr)

                // Base position
                const baseX = gx
                const baseY = gy

                // Calculate push from cursor (repulsion/attraction)
                const cursorPush = getCursorPush(baseX, baseY)

                // Target position with repulsion/attraction
                const targetX = baseX + cursorPush.x
                const targetY = baseY + cursorPush.y

                // Spring physics
                const forceX = (targetX - dot.x) * springStiffness
                const forceY = (targetY - dot.y) * springStiffness

                dot.vx = (dot.vx + forceX) * damping
                dot.vy = (dot.vy + forceY) * damping

                dot.x += dot.vx
                dot.y += dot.vy

                // Get hover intensity
                const hoverIntensity = getHoverIntensity(dot.x, dot.y)

                // Size: base from prop, grows to 2x on hover
                dot.targetSize = currentDotSize + hoverIntensity * currentDotSize
                dot.size += (dot.targetSize - dot.size) * 0.15

                // Blend dot color toward hover color when hovering
                const r = Math.round(
                    dotColorParsed.r +
                        (hoverColorParsed.r - dotColorParsed.r) * hoverIntensity
                )
                const g = Math.round(
                    dotColorParsed.g +
                        (hoverColorParsed.g - dotColorParsed.g) * hoverIntensity
                )
                const b = Math.round(
                    dotColorParsed.b +
                        (hoverColorParsed.b - dotColorParsed.b) * hoverIntensity
                )
                // Opacity: start from baseOpacity when far from cursor, increase to 1.0 when hovering
                const opacity = currentBaseOpacity + (1 - currentBaseOpacity) * hoverIntensity

                ctx.beginPath()
                ctx.arc(
                    dot.x,
                    dot.y,
                    Math.max(currentDotSize * 0.5, dot.size),
                    0,
                    Math.PI * 2
                )
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
                ctx.fill()
            })

            // Draw cursor trail when enabled
            const { cursorTrail: ct, trailLength: tlen, trailColor: tcolor } = currentColors
            const effectiveTrailLength = Math.max(1, Math.round(tlen * 50))
            if (ct && effectiveTrailLength > 0) {
                const trail = trailPointsRef.current
                if (trail.length > 1) {
                    const now = performance.now()
                    const maxAge = Math.max(200, effectiveTrailLength * 40)

                    ctx.save()
                    ctx.lineCap = "round"
                    ctx.lineJoin = "round"
                    ctx.lineWidth = 2

                    ctx.beginPath()
                    let started = false
                    for (let i = 0; i < trail.length; i++) {
                        const point = trail[i]
                        const age = now - point.time
                        if (age < maxAge) {
                            if (!started) {
                                ctx.moveTo(point.x, point.y)
                                started = true
                            } else {
                                ctx.lineTo(point.x, point.y)
                            }
                        }
                    }
                    const trailAlpha =
                        trail.length > 0
                            ? Math.max(0, 1 - (now - trail[trail.length - 1].time) / maxAge)
                            : 0
                    const tc = parseColor(tcolor)
                    const opacity = trailAlpha * 0.9 * tc.a
                    ctx.strokeStyle = `rgba(${tc.r}, ${tc.g}, ${tc.b}, ${opacity})`
                    ctx.stroke()
                    ctx.restore()
                }
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animationRef.current = requestAnimationFrame(animate)

        // Handle mouse move - convert to canvas coordinates
        const handleMouseMove = (e: MouseEvent) => {
            // Use the same coordinate system as canvas (clientWidth/clientHeight)
            const canvasWidth = canvas.clientWidth || canvas.offsetWidth || 1
            const canvasHeight = canvas.clientHeight || canvas.offsetHeight || 1
            const rect = canvas.getBoundingClientRect()

            // Calculate scale factors to convert from getBoundingClientRect to canvas coordinates
            const scaleX = rect.width > 0 ? canvasWidth / rect.width : 1
            const scaleY = rect.height > 0 ? canvasHeight / rect.height : 1

            const x = (e.clientX - rect.left) * scaleX
            const y = (e.clientY - rect.top) * scaleY

            mousePosRef.current = { x, y }

            // Cursor trail: record points in hover mode always, in click mode only while dragging
            const { cursorTrail: ct, trailMode: tm, trailLength: tlen } = colorsRef.current
            const effectiveLength = Math.max(1, Math.round(tlen * 100))
            if (ct && effectiveLength > 0 && (tm === "hover" || isMouseDownRef.current)) {
                const now = performance.now()
                const trail = trailPointsRef.current
                trail.push({ x, y, time: now })
                if (trail.length > effectiveLength) trail.splice(0, trail.length - effectiveLength)
            }
        }

        const handleMouseLeave = () => {
            mousePosRef.current = null
        }

        const handleMouseDown = () => {
            isMouseDownRef.current = true
        }

        const handleMouseUp = () => {
            if (colorsRef.current.trailMode === "click") {
                trailPointsRef.current = []
            }
            isMouseDownRef.current = false
        }

        // Use canvas element for mouse tracking
        canvas.addEventListener("mousemove", handleMouseMove)
        canvas.addEventListener("mouseleave", handleMouseLeave)
        canvas.addEventListener("mousedown", handleMouseDown)
        canvas.addEventListener("mouseup", handleMouseUp)

        const handleResize = () => {
            const newSize = getCanvasSize()
            width = newSize.width
            height = newSize.height
            canvas.width = width
            canvas.height = height
            initDots()
        }

        // Use ResizeObserver to watch canvas size changes
        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(canvas)

        return () => {
            canvas.removeEventListener("mousemove", handleMouseMove)
            canvas.removeEventListener("mouseleave", handleMouseLeave)
            canvas.removeEventListener("mousedown", handleMouseDown)
            canvas.removeEventListener("mouseup", handleMouseUp)
            resizeObserver.disconnect()
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [mounted])

    if (!mounted) return null

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "auto",
                ...props.style,
            }}
        />
    )
}

addPropertyControls(KineticGrid, {
    cursorTrail:{
        type: ControlType.Boolean,
        title: "Cursor Trail",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    cursorTrailProps:{
        type: ControlType.Object,
        hidden: (props: any) => !props.cursorTrail,
        title:"Trail Props",
        controls: {
            trailMode:{
                type: ControlType.Enum,
                title: "Trail Mode",
                options: ["click", "hover"],
                optionTitles: ["Click", "Hover"],
                defaultValue: "hover",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            trailLength: {
                type: ControlType.Number,
                title: "Trail Length",
                defaultValue: 0.1,
                min: 0.1,
                max: 1,
                step: 0.1,
            },
            trailColor: {
                type: ControlType.Color,
                title: "Trail Color",
                defaultValue: "#FFFFFF",
            },
        }
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#121212",
    },
    
    gridColor: {
        type: ControlType.Color,
        title: "Grid",
        defaultValue: "#FFFFFF",
    },
	gridThickness: {
        type: ControlType.Number,
        title: "Thickness",
        defaultValue: 0.5,
        min: 0.1,
        max: 3,
        step: 0.1,
    },
    dotColor: {
        type: ControlType.Color,
        title: "Dots",
        defaultValue: "#FFFFFF",
    },
	dotSize: {
        type: ControlType.Number,
        title: "Dot Size",
        defaultValue: 1.5,
        min: 0.5,
        max: 5,
        step: 0.1,
    },
    baseOpacity: {
        type: ControlType.Number,
        title: "Far Opacity",
        defaultValue: 0.09,
        min: 0,
        max: 1,
        step: 0.01,
    },
    hoverColor: {
        type: ControlType.Color,
        title: "Hover",
        defaultValue: "#0073FF",
    },
    gridSize: {
        type: ControlType.Number,
        title: "Grid Size",
        defaultValue: 60,
        min: 20,
        max: 100,
        step: 5,
    },
    repulsionStrength: {
        type: ControlType.Number,
        title: "Repulsion",
        defaultValue: -0.65,
        min: -1,
        max: 1,
        step: 0.01,
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 350,
        min: 50,
        max: 1000,
        step: 10,
		description:"More components at [Framer University](https://frameruni.link/cc).",
    },
})

KineticGrid.displayName = "Kinetic Grid"
