import * as React from "react"
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Simple 2D noise function for wave generation with seed support
function createNoise2D(seed: number = 0.5) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0
    const G22 = (3.0 - Math.sqrt(3.0)) / 3.0

    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
        p[i] = i
    }

    // Use seed to create deterministic random values
    const seededRandom = (index: number) => {
        const x = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
        return x - Math.floor(x)
    }

    // Shuffle the permutation table using seeded random
    for (let i = 255; i > 0; i--) {
        const n = Math.floor((i + 1) * seededRandom(i))
        const q = p[i]
        p[i] = p[n]
        p[n] = q
    }

    const perm = new Uint8Array(512)
    const permMod12 = new Uint8Array(512)
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255]
        permMod12[i] = perm[i] % 12
    }

    const grad2 = new Float64Array([
        1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1,
        0, -1,
    ])

    const fastFloor = (x: number) => Math.floor(x) | 0

    return function noise2D(x: number, y: number): number {
        const s = (x + y) * F2
        const i = fastFloor(x + s)
        const j = fastFloor(y + s)

        const t = (i + j) * G2
        const x0 = x - (i - t)
        const y0 = y - (j - t)

        let i1: number, j1: number
        if (x0 > y0) {
            i1 = 1
            j1 = 0
        } else {
            i1 = 0
            j1 = 1
        }

        const x1 = x0 - i1 + G2
        const y1 = y0 - j1 + G2
        const x2 = x0 - 1 + G22
        const y2 = y0 - 1 + G22

        const ii = i & 255
        const jj = j & 255
        const gi0 = permMod12[ii + perm[jj]]
        const gi1 = permMod12[ii + i1 + perm[jj + j1]]
        const gi2 = permMod12[ii + 1 + perm[jj + 1]]

        let t0 = 0.5 - x0 * x0 - y0 * y0
        let n0: number
        if (t0 < 0) {
            n0 = 0
        } else {
            t0 *= t0
            n0 = t0 * t0 * (grad2[gi0 * 2] * x0 + grad2[gi0 * 2 + 1] * y0)
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1
        let n1: number
        if (t1 < 0) {
            n1 = 0
        } else {
            t1 *= t1
            n1 = t1 * t1 * (grad2[gi1 * 2] * x1 + grad2[gi1 * 2 + 1] * y1)
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2
        let n2: number
        if (t2 < 0) {
            n2 = 0
        } else {
            t2 *= t2
            n2 = t2 * t2 * (grad2[gi2 * 2] * x2 + grad2[gi2 * 2 + 1] * y2)
        }

        return 70 * (n0 + n1 + n2)
    }
}

interface Point {
    x: number
    y: number
    wave: { x: number; y: number }
    cursor: {
        x: number
        y: number
        vx: number
        vy: number
    }
}

interface WavesProps {
    strokeColor?: string
    backgroundColor?: string
    waveSpeed?: number
    waveAmplitude?: number
    mouseInfluence?: number
    lineSpacing?: number
    seed?: number
    resolution?: number
    preview?: boolean
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function InteractiveWaveBackground({
    strokeColor = "#ffffff",
    backgroundColor = "transparent",
    waveSpeed = 0.5,
    waveAmplitude = 0.5,
    mouseInfluence = 0.5,
    lineSpacing = 0.5,
    seed = 0.5,
    resolution = 0.5,
    preview = true,
}: WavesProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const mouseRef = useRef({
        x: -10,
        y: 0,
        lx: 0,
        ly: 0,
        sx: 0,
        sy: 0,
        v: 0,
        vs: 0,
        a: 0,
        set: false,
    })
    const pathsRef = useRef<SVGPathElement[]>([])
    const linesRef = useRef<Point[][]>([])
    const noiseRef = useRef<((x: number, y: number) => number) | null>(null)
    const rafRef = useRef<number | null>(null)
    const boundingRef = useRef<DOMRect | null>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lastSizeRef = useRef({ width: 0, height: 0, zoom: 1 })
    const isVisibleRef = useRef(true)
    const isCanvasRef = useRef(RenderTarget.current() === RenderTarget.canvas)

    // Initialization
    useEffect(() => {
        if (!containerRef.current || !svgRef.current) return

        // Store canvas state
        isCanvasRef.current = RenderTarget.current() === RenderTarget.canvas

        // Initialize noise generator
        noiseRef.current = createNoise2D(seed)

        // Initialize size and lines
        setSize()
        setLines()
        // Always compute initial wave shape (use time 0 for initial state)
        movePoints(0)
        drawLines()

        // Bind events (resize is bound in a separate effect to always use latest props)
        window.addEventListener("mousemove", onMouseMove)
        containerRef.current.addEventListener("touchmove", onTouchMove, {
            passive: false,
        })

        // Set up intersection observer for viewport detection
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    isVisibleRef.current = entry.isIntersecting
                })
            },
            { threshold: 0.1 }
        )
        observer.observe(containerRef.current)

        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            containerRef.current?.removeEventListener("touchmove", onTouchMove)
            observer.disconnect()
        }
    }, [seed])

    // Monitor size changes and re-render when component is resized
    useEffect(() => {
        if (!containerRef.current || !zoomProbeRef.current) return

        let rafId = 0
        const TICK_MS = 100 // Check every 100ms
        const EPSILON = 1 // 1px tolerance

        const checkSize = () => {
            const container = containerRef.current
            const probe = zoomProbeRef.current
            if (!container || !probe) return

            const rawWidth = container.clientWidth || container.offsetWidth || 1
            const rawHeight = container.clientHeight || container.offsetHeight || 1
            const zoom = probe.getBoundingClientRect().width / 20
            const safeZoom = Math.max(zoom, 0.0001)

            // Normalize sizes by zoom so editor zoom doesn't count as a resize
            const width = rawWidth / safeZoom
            const height = rawHeight / safeZoom

            const lastSize = lastSizeRef.current
            const sizeChanged =
                Math.abs(width - lastSize.width) > EPSILON ||
                Math.abs(height - lastSize.height) > EPSILON

            if (sizeChanged) {
                lastSizeRef.current = { width, height, zoom: safeZoom }
                setSize()
                setLines()
                // When preview is off or component not visible, initialize static wave positions immediately
                // When preview is on and visible, let the animation loop handle rendering (no interruption)
                const shouldAnimate = (!isCanvasRef.current || preview) && isVisibleRef.current
                if (!shouldAnimate) {
                    movePoints(0)
                    drawLines()
                }
            }

            rafId = requestAnimationFrame(checkSize)
        }

        rafId = requestAnimationFrame(checkSize)

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [resolution, preview, lineSpacing, seed, waveSpeed, waveAmplitude, mouseInfluence])

    // Keep window resize listener in sync with latest props/closures
    useEffect(() => {
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [lineSpacing, seed, resolution, preview, waveSpeed, waveAmplitude, mouseInfluence])

    // Stroke color change should not rebuild geometry; only update stroke
    useEffect(() => {
        pathsRef.current.forEach((path) => {
            path.setAttribute("stroke", strokeColor)
        })
        drawLines()
    }, [strokeColor])

    // Geometry-affecting controls: rebuild and redraw
    useEffect(() => {
        setLines()
        // Always draw at least one frame so lines aren't empty
        const shouldAnimate = (!isCanvasRef.current || preview) && isVisibleRef.current
        if (shouldAnimate) {
            movePoints(performance.now())
        } else {
            movePoints(0)
        }
        drawLines()
    }, [lineSpacing, seed, resolution, preview])

    // Shape-affecting controls: recompute wave positions
    useEffect(() => {
        // Recompute wave shape
        const shouldAnimate = (!isCanvasRef.current || preview) && isVisibleRef.current
        if (shouldAnimate) {
            movePoints(performance.now())
        } else {
            movePoints(0)
        }
        drawLines()
    }, [waveSpeed, waveAmplitude, mouseInfluence])

    // Restart animation loop when props change to ensure new values are used
    useEffect(() => {
        // Cancel existing animation
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }

        // Check if animation should run
        // In canvas mode: respect preview toggle
        // In production: always animate (ignore preview)
        const shouldAnimate = 
            (!isCanvasRef.current || preview) && isVisibleRef.current

        // If animation is disabled (preview off in canvas), don't start the loop
        // Only render when props/size change, not every frame
        if (!shouldAnimate) {
            return
        }

        // Start new animation loop with updated props
        const tick = (time: number) => {
            // Check again in case visibility/preview changed
            const stillShouldAnimate = 
                (!isCanvasRef.current || preview) && isVisibleRef.current

            // If animation should stop, cancel the loop
            if (!stillShouldAnimate) {
                rafRef.current = null
                return
            }

            // Always schedule next frame to keep animation loop alive
            rafRef.current = requestAnimationFrame(tick)

            // Check if paths/lines have been recreated (e.g., during zoom)
            // If so, ensure we have valid data before animating
            if (!pathsRef.current || pathsRef.current.length === 0 || 
                !linesRef.current || linesRef.current.length === 0) {
                return
            }

            const { current: mouse } = mouseRef

            // Smooth mouse movement
            mouse.sx += (mouse.x - mouse.sx) * 0.1
            mouse.sy += (mouse.y - mouse.sy) * 0.1

            // Mouse velocity
            const dx = mouse.x - mouse.lx
            const dy = mouse.y - mouse.ly
            const d = Math.hypot(dx, dy)

            mouse.v = d
            mouse.vs += (d - mouse.vs) * 0.1
            mouse.vs = Math.min(100, mouse.vs)

            // Previous mouse position
            mouse.lx = mouse.x
            mouse.ly = mouse.y

            // Mouse angle (not currently used but kept for potential future use)
            mouse.a = Math.atan2(dy, dx)

            movePoints(time)
            drawLines()
        }

        // Start animation loop
        rafRef.current = requestAnimationFrame(tick)

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [waveSpeed, waveAmplitude, mouseInfluence, seed, preview])

    // Set SVG size using clientWidth/clientHeight for proper Framer canvas sizing
    const setSize = () => {
        if (!containerRef.current || !svgRef.current) return

        const container = containerRef.current
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1

        // Store dimensions for mouse calculations
        boundingRef.current = {
            width,
            height,
            left: 0,
            top: 0,
            right: width,
            bottom: height,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect

        svgRef.current.style.width = `${width}px`
        svgRef.current.style.height = `${height}px`
    }

    // Setup lines - more points for smoother curves
    const setLines = () => {
        if (!svgRef.current || !boundingRef.current) return

        const { width, height } = boundingRef.current
        linesRef.current = []

        // Clear existing paths
        pathsRef.current.forEach((path) => {
            path.remove()
        })
        pathsRef.current = []

        // Use configurable spacing based on lineSpacing prop
        // When lineSpacing = 1: xGap = 8 (dense, many lines)
        // When lineSpacing = 0: xGap = 167 (sparse, ~6 lines for typical width)
        const baseSpacing = 8
        const xGap = baseSpacing + (1 - lineSpacing) * 159 // Range: 8-167

        // Use resolution to control point density (higher resolution = more points = smoother lines)
        const baseYGap = 4
        const yGap = baseYGap + (1 - resolution) * 20 // Range: 8-28 (lower resolution = bigger gaps = fewer points)

        const oWidth = width + 200
        const oHeight = height + 30

        const totalLines = Math.ceil(oWidth / xGap)
        const totalPoints = Math.ceil(oHeight / yGap)

        const xStart = (width - xGap * totalLines) / 2
        const yStart = (height - yGap * totalPoints) / 2

        // Create vertical lines
        for (let i = 0; i < totalLines; i++) {
            const points: Point[] = []

            for (let j = 0; j < totalPoints; j++) {
                const point: Point = {
                    x: xStart + xGap * i,
                    y: yStart + yGap * j,
                    wave: { x: 0, y: 0 },
                    cursor: { x: 0, y: 0, vx: 0, vy: 0 },
                }

                points.push(point)
            }

            // Create SVG path
            const path = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            )
            path.classList.add("a__line")
            path.classList.add("js-line")
            path.setAttribute("fill", "none")
            path.setAttribute("stroke", strokeColor)
            path.setAttribute("stroke-width", "1")

            svgRef.current.appendChild(path)
            pathsRef.current.push(path)

            // Add points
            linesRef.current.push(points)
        }
    }

    // Resize handler
    const onResize = () => {
        const container = containerRef.current
        const probe = zoomProbeRef.current
        if (!container || !probe) return

        const rawWidth = container.clientWidth || container.offsetWidth || 1
        const rawHeight = container.clientHeight || container.offsetHeight || 1
        const zoom = probe.getBoundingClientRect().width / 20
        const safeZoom = Math.max(zoom, 0.0001)
        const width = rawWidth / safeZoom
        const height = rawHeight / safeZoom
        const EPSILON = 1

        const lastSize = lastSizeRef.current
        const sizeChanged =
            Math.abs(width - lastSize.width) > EPSILON ||
            Math.abs(height - lastSize.height) > EPSILON

        if (!sizeChanged) return

        lastSizeRef.current = { width, height, zoom: safeZoom }
        setSize()
        setLines()
        // When preview is off or component not visible, initialize static wave positions immediately
        // When preview is on and visible, let the animation loop handle rendering (no interruption)
        const shouldAnimate = (!isCanvasRef.current || preview) && isVisibleRef.current
        if (!shouldAnimate) {
            movePoints(0)
            drawLines()
        }
    }

    // Mouse handler
    const onMouseMove = (e: MouseEvent) => {
        updateMousePosition(e.pageX, e.pageY)
    }

    // Touch handler
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        const touch = e.touches[0]
        updateMousePosition(touch.clientX, touch.clientY)
    }

    // Update mouse position using proper container bounds
    const updateMousePosition = (x: number, y: number) => {
        if (!boundingRef.current || !containerRef.current) return

        const mouse = mouseRef.current
        const rect = containerRef.current.getBoundingClientRect()
        mouse.x = x - rect.left
        mouse.y = y - rect.top + window.scrollY

        if (!mouse.set) {
            mouse.sx = mouse.x
            mouse.sy = mouse.y
            mouse.lx = mouse.x
            mouse.ly = mouse.y

            mouse.set = true
        }
    }

    // Move points - smoother wave motion (optimized)
    const movePoints = (time: number) => {
        const { current: lines } = linesRef
        const { current: mouse } = mouseRef
        const { current: noise } = noiseRef

        if (!noise) return

        // Cache common calculations
        const speedMultiplier = waveSpeed * 0.002
        const amplitudeMultiplier = waveAmplitude * 2
        const influenceMultiplier = mouseInfluence * 0.0007
        const mouseSx = mouse.sx
        const mouseSy = mouse.sy
        const mouseVs = mouse.vs
        const l = Math.max(175, mouseVs)

        for (let i = 0; i < lines.length; i++) {
            const points = lines[i]
            for (let j = 0; j < points.length; j++) {
                const p = points[j]
                
                // Wave movement
                const baseMove = noise(p.x * 0.003, p.y * 0.002) * 8
                const move = waveSpeed > 0 ? baseMove + time * speedMultiplier : baseMove
                
                p.wave.x = Math.cos(move) * 12 * amplitudeMultiplier
                p.wave.y = Math.sin(move) * 6 * amplitudeMultiplier

                // Mouse effect - use direction from point to mouse
                const dx = p.x - mouseSx
                const dy = p.y - mouseSy
                const d = Math.hypot(dx, dy)

                if (d < l) {
                    const s = 1 - d / l
                    const f = Math.cos(d * 0.001) * s * l * mouseVs * influenceMultiplier
                    const angleToPoint = Math.atan2(dy, dx)

                    p.cursor.vx += Math.cos(angleToPoint) * f
                    p.cursor.vy += Math.sin(angleToPoint) * f
                }

                // Spring restoration
                p.cursor.vx += -p.cursor.x * 0.01
                p.cursor.vy += -p.cursor.y * 0.01

                // Damping
                p.cursor.vx *= 0.95
                p.cursor.vy *= 0.95

                // Update position
                p.cursor.x += p.cursor.vx
                p.cursor.y += p.cursor.vy

                // Clamp
                p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x))
                p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y))
            }
        }
    }

    // Get moved point coordinates
    const moved = (point: Point, withCursorForce = true) => {
        const coords = {
            x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
            y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
        }

        return coords
    }

    // Draw lines - using line segments (optimized with array join)
    const drawLines = () => {
        const { current: lines } = linesRef
        const { current: paths } = pathsRef

        for (let lIndex = 0; lIndex < lines.length; lIndex++) {
            const points = lines[lIndex]
            const path = paths[lIndex]
            if (!points || points.length < 2 || !path) continue

            // Build path string with array (faster than string concatenation)
            const pathParts: string[] = []
            
            // First point
            const firstPoint = moved(points[0], false)
            pathParts.push(`M ${firstPoint.x} ${firstPoint.y}`)

            // Connect points with lines
            for (let i = 1; i < points.length; i++) {
                const current = moved(points[i])
                pathParts.push(`L ${current.x} ${current.y}`)
            }

            path.setAttribute("d", pathParts.join(""))
        }
    }


    return (
        <div
            ref={containerRef}
            style={{
                backgroundColor: backgroundColor || "transparent",
                position: "relative",
                margin: 0,
                padding: 0,
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        >
            <svg
                ref={svgRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
                xmlns="http://www.w3.org/2000/svg"
            />
            {/* Hidden 20x20 probe element to detect editor zoom level and size changes */}
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
            {/* Invisible sizing element to prevent collapse */}
            <div
                style={{
                    position: "relative",
                    width: boundingRef.current?.width || 800,
                    height: boundingRef.current?.height || 600,
                    opacity: 0,
                    pointerEvents: "none",
                    zIndex: -1,
                }}
            />
        </div>
    )
}

// Property controls for Framer
addPropertyControls(InteractiveWaveBackground, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
    },
    lineSpacing: {
        type: ControlType.Number,
        title: "Amount",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
    },
    waveSpeed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    waveAmplitude: {
        type: ControlType.Number,
        title: "Amplitude",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    mouseInfluence: {
        type: ControlType.Number,
        title: "Hover Force",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    seed: {
        type: ControlType.Number,
        title: "Seed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    resolution: {
        type: ControlType.Number,
        title: "Resolution",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    strokeColor: {
        type: ControlType.Color,
        title: "Stroke",
        defaultValue: "#ffffff",
    },
    backgroundColor: {
        type: ControlType.Color,
        optional: true,
        title: "Background",
        defaultValue: "#000000",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// Display name for Framer UI
InteractiveWaveBackground.displayName = "Interactive Wave Background"
