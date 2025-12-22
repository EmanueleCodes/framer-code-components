import { useEffect, useRef, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface ElectricBorderProps {
    children?: React.ReactNode
    borderColor?: string
    preview?: boolean
    showGlow?: boolean
    glowIntensity?: number
    speed?: number
    intensity?: number
    borderThickness?: number
    glowPadding?: number
    className?: string
    style?: React.CSSProperties
    // Noise and animation parameters (same as main.js)
    octaves?: number
    lacunarity?: number
    gain?: number
    amplitude?: number
    frequency?: number
    baseFlatness?: number
    displacement?: number
    borderOffset?: number
    borderRadius?: number
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function ElectricBorder({
    borderColor = "#FFD9BF",
    preview = true,
    showGlow = true,
    glowIntensity = 0.5,
    speed = 1.5,
    intensity = 2.5,
    borderThickness = 2,
    style,
    // Noise and animation parameters with defaults from main.js
    octaves = 10,
    lacunarity = 1.6,
    gain = 0.6,
    amplitude = 0.2,
    frequency = 5,
    baseFlatness = 0.2,
    displacement = 60,
    borderOffset = 0,
    borderRadius = 24,
}: ElectricBorderProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | null>(null)
    const electricBorderRef = useRef<any>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const timeRef = useRef<number>(0)
    const lastFrameTimeRef = useRef<number>(0)

    const shouldAnimate =
        speed > 0 &&
        (RenderTarget.current() === RenderTarget.preview ||
            (preview && RenderTarget.current() === RenderTarget.canvas))

    // Helper function to get current zoom scale for glow effects
    
    // Helper function to get current zoom scale for glow effects
    const getCurrentZoomScale = () => {
        const probe = zoomProbeRef.current
        const editorZoom = probe ? probe.getBoundingClientRect().width / 20 : 1
        return 1 / Math.max(editorZoom, 0.0001)
    }

    // Random function - creates pseudo-random values from coordinates
    const random = useCallback((x: number) => {
        return (Math.sin(x * 12.9898) * 43758.5453) % 1
    }, [])

    // 2D noise function for proper time animation
    const noise2D = useCallback((x: number, y: number) => {
        const i = Math.floor(x)
        const j = Math.floor(y)
        const fx = x - i
        const fy = y - j

        // Four corners of the 2D grid
        const a = random(i + j * 57)
        const b = random(i + 1 + j * 57)
        const c = random(i + (j + 1) * 57)
        const d = random(i + 1 + (j + 1) * 57)

        // Smoothstep
        const ux = fx * fx * (3.0 - 2.0 * fx)
        const uy = fy * fy * (3.0 - 2.0 * fy)

        // Bilinear interpolation
        return (
            a * (1 - ux) * (1 - uy) +
            b * ux * (1 - uy) +
            c * (1 - ux) * uy +
            d * ux * uy
        )
    }, [random])

    // Octaved noise function
    const octavedNoise = useCallback((
        x: number,
        octaves: number,
        lacunarity: number,
        gain: number,
        baseAmplitude: number,
        baseFrequency: number,
        time: number = 0,
        seed: number = 0,
        baseFlatness: number = 1.0
    ) => {
        let y = 0
        let amplitude = baseAmplitude
        let frequency = baseFrequency

        for (let i = 0; i < octaves; i++) {
            let octaveAmplitude = amplitude

            if (i === 0) {
                octaveAmplitude *= baseFlatness
            }

            y +=
                octaveAmplitude *
                noise2D(frequency * x + seed * 100, time * frequency * 0.3)
            frequency *= lacunarity
            amplitude *= gain
        }

        return y
    }, [noise2D])

    // Get a point on a rounded rectangle perimeter using arc-length parameterization
    const getRoundedRectPoint = useCallback((
        t: number,
        left: number,
        top: number,
        width: number,
        height: number,
        radius: number
    ) => {
        // Calculate perimeter sections
        const straightWidth = width - 2 * radius
        const straightHeight = height - 2 * radius
        const cornerArc = (Math.PI * radius) / 2
        const totalPerimeter =
            2 * straightWidth + 2 * straightHeight + 4 * cornerArc

        const distance = t * totalPerimeter

        let accumulated = 0

        // Top edge
        if (distance <= accumulated + straightWidth) {
            const progress = (distance - accumulated) / straightWidth
            return { x: left + radius + progress * straightWidth, y: top }
        }
        accumulated += straightWidth

        // Top-right corner
        if (distance <= accumulated + cornerArc) {
            const progress = (distance - accumulated) / cornerArc
            return getCornerPoint(
                left + width - radius,
                top + radius,
                radius,
                -Math.PI / 2,
                Math.PI / 2,
                progress
            )
        }
        accumulated += cornerArc

        // Right edge
        if (distance <= accumulated + straightHeight) {
            const progress = (distance - accumulated) / straightHeight
            return { x: left + width, y: top + radius + progress * straightHeight }
        }
        accumulated += straightHeight

        // Bottom-right corner
        if (distance <= accumulated + cornerArc) {
            const progress = (distance - accumulated) / cornerArc
            return getCornerPoint(
                left + width - radius,
                top + height - radius,
                radius,
                0,
                Math.PI / 2,
                progress
            )
        }
        accumulated += cornerArc

        // Bottom edge
        if (distance <= accumulated + straightWidth) {
            const progress = (distance - accumulated) / straightWidth
            return {
                x: left + width - radius - progress * straightWidth,
                y: top + height
            }
        }
        accumulated += straightWidth

        // Bottom-left corner
        if (distance <= accumulated + cornerArc) {
            const progress = (distance - accumulated) / cornerArc
            return getCornerPoint(
                left + radius,
                top + height - radius,
                radius,
                Math.PI / 2,
                Math.PI / 2,
                progress
            )
        }
        accumulated += cornerArc

        // Left edge
        if (distance <= accumulated + straightHeight) {
            const progress = (distance - accumulated) / straightHeight
            return { x: left, y: top + height - radius - progress * straightHeight }
        }
        accumulated += straightHeight

        // Top-left corner
        const progress = (distance - accumulated) / cornerArc
        return getCornerPoint(
            left + radius,
            top + radius,
            radius,
            Math.PI,
            Math.PI / 2,
            progress
        )
    }, [])

    // Get a point on a circular arc
    const getCornerPoint = useCallback((
        centerX: number,
        centerY: number,
        radius: number,
        startAngle: number,
        arcLength: number,
        progress: number
    ) => {
        const angle = startAngle + progress * arcLength
        return {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        }
    }, [])

    const drawElectricBorder = useCallback((currentTime: number = 0) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        // Update time based on speed (same as main.js)
        const deltaTime = (currentTime - (lastFrameTimeRef.current || 0)) / 1000
        const time = (timeRef.current || 0) + deltaTime * speed
        timeRef.current = time
        lastFrameTimeRef.current = currentTime

        // Get canvas dimensions (including the expanded area)
        const rect = canvas.getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        // Detect editor zoom using a hidden 20x20 probe element (same as pathReveal.tsx)
        const probe = zoomProbeRef.current
        const editorZoom = probe ? probe.getBoundingClientRect().width / 20 : 1

        // Get device pixel ratio for high-DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1
        
        // Calculate the actual scale factor accounting for editor zoom
        const safeZoom = Math.max(editorZoom, 0.0001)
        const scaleFactor = devicePixelRatio / safeZoom
        
        // Scale visual effects based on zoom level (same as pathReveal.tsx approach)
        const zoomScale = 1 / safeZoom

        // Set canvas size accounting for device pixel ratio and zoom correction
        const canvasWidth = width * scaleFactor
        const canvasHeight = height * scaleFactor
        
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth
            canvas.height = canvasHeight
            // Scale the context to match the display size
            ctx.scale(scaleFactor, scaleFactor)
        }

        // Adjust drawing area to account for the expanded canvas
        const canvasOffset = 20 * zoomScale // Scale canvas offset for zoom
        const drawWidth = width - (canvasOffset * 2)
        const drawHeight = height - (canvasOffset * 2)

        // Clear canvas with transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Set drawing properties
        ctx.strokeStyle = borderColor
        ctx.lineWidth = borderThickness * zoomScale // Scale stroke width for zoom
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        const scale = displacement * zoomScale // Scale displacement for zoom
        const scaledBorderRadius = borderRadius * zoomScale // Scale border radius for zoom

        const left = borderOffset + canvasOffset
        const top = borderOffset + canvasOffset
        const borderWidth = drawWidth - 2 * borderOffset
        const borderHeight = drawHeight - 2 * borderOffset
        const maxRadius = Math.min(borderWidth, borderHeight) / 2
        const radius = Math.min(scaledBorderRadius, maxRadius)

        const approximatePerimeter =
            2 * (borderWidth + borderHeight) + 2 * Math.PI * radius
        const sampleCount = Math.floor(approximatePerimeter / 2)

        ctx.beginPath()

        for (let i = 0; i <= sampleCount; i++) {
            const progress = i / sampleCount

            const point = getRoundedRectPoint(
                progress,
                left,
                top,
                borderWidth,
                borderHeight,
                radius
            )

            const xNoise = octavedNoise(
                progress * 8,
                octaves,
                lacunarity,
                gain,
                amplitude,
                frequency,
                time, // Use accumulated time like main.js
                0, // seed
                baseFlatness
            )

            const yNoise = octavedNoise(
                progress * 8,
                octaves,
                lacunarity,
                gain,
                amplitude,
                frequency,
                time, // Use accumulated time like main.js
                1, // seed
                baseFlatness
            )

            // Apply displacement to both coordinates for chaotic effect
            const displacedX = point.x + xNoise * scale
            const displacedY = point.y + yNoise * scale

            if (i === 0) {
                ctx.moveTo(displacedX, displacedY)
            } else {
                ctx.lineTo(displacedX, displacedY)
            }
        }

        // Close the path to ensure it's connected
        ctx.closePath()
        ctx.stroke()

        // Continue animation
        if (shouldAnimate) {
            animationRef.current = requestAnimationFrame(drawElectricBorder)
        }
    }, [
        borderColor, 
        borderThickness, 
        displacement, 
        octaves, 
        amplitude, 
        speed, 
        shouldAnimate, 
        getRoundedRectPoint, 
        octavedNoise,
        // Additional noise parameters
        lacunarity,
        gain,
        frequency,
        baseFlatness,
        borderOffset,
        borderRadius
    ])

    useEffect(() => {
        if (shouldAnimate) {
            animationRef.current = requestAnimationFrame(drawElectricBorder)
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [drawElectricBorder, shouldAnimate])

    useEffect(() => {
        if (shouldAnimate) {
            // Restart animation when properties change
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            animationRef.current = requestAnimationFrame(drawElectricBorder)
        }
    }, [
        speed, 
        intensity, 
        borderColor, 
        borderThickness, 
        shouldAnimate, 
        drawElectricBorder,
        // Noise and animation parameters
        octaves,
        lacunarity,
        gain,
        amplitude,
        frequency,
        baseFlatness,
        displacement,
        borderOffset,
        borderRadius
    ])

    // Handle zoom and resize changes
    useEffect(() => {
        if (!rootRef.current) return
        
        const handleResize = () => {
            if (shouldAnimate && animationRef.current) {
                cancelAnimationFrame(animationRef.current)
                animationRef.current = requestAnimationFrame(drawElectricBorder)
            }
        }

        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(rootRef.current)

        // Different behavior for canvas (editor) vs preview/live
        if (RenderTarget.current() === RenderTarget.canvas) {
            // In canvas: continuously monitor for zoom and size changes
            let rafId = 0
            const last = { ts: 0, zoom: 0, w: 0, h: 0 }
            const TICK_MS = 250 // throttle to 4Hz to avoid unnecessary work
            const EPS_ZOOM = 0.001
            const EPS_SIZE = 0.5

            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                const canvasEl = canvasRef.current
                if (probe && canvasEl) {
                    const currentZoom = probe.getBoundingClientRect().width / 20
                    const r = canvasEl.getBoundingClientRect()

                    // Only update if enough time has passed and something meaningful changed
                    const timeOk =
                        !last.ts ||
                        (now || performance.now()) - last.ts >= TICK_MS
                    const zoomChanged =
                        Math.abs(currentZoom - last.zoom) > EPS_ZOOM
                    const sizeChanged =
                        Math.abs(r.width - last.w) > EPS_SIZE ||
                        Math.abs(r.height - last.h) > EPS_SIZE

                    if (timeOk && (zoomChanged || sizeChanged)) {
                        last.ts = now || performance.now()
                        last.zoom = currentZoom
                        last.w = r.width
                        last.h = r.height
                        // Restart animation to apply new zoom
                        if (shouldAnimate && animationRef.current) {
                            cancelAnimationFrame(animationRef.current)
                            animationRef.current = requestAnimationFrame(drawElectricBorder)
                        }
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        }

        // Preview/Live: only respond to real size changes, not every animation frame
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize)
        }

        return () => {
            resizeObserver.disconnect()
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize)
            }
        }
    }, [shouldAnimate, drawElectricBorder])

    return (
        <div
            ref={rootRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
                boxSizing: "border-box",
                ...style,
            }}
        >
            {/* Hidden 20x20 probe element to detect editor zoom level in canvas */}
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            />
            
            {/* Canvas for electric border */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    overflow: "visible",
                    top: "-20px",
                    left: "-20px",
                    width: "calc(100% + 40px)",
                    height: "calc(100% + 40px)",
                    pointerEvents: "none",
                    zIndex: 10,
                }}
            />

            {/* Glow effects */}
            {showGlow && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            borderRadius: `${24 * getCurrentZoomScale()}px`,
                            border: `${borderThickness}px solid ${borderColor}${Math.floor(
                                glowIntensity * 255
                            )
                                .toString(16)
                                .padStart(2, "0")}`,
                            filter: "blur(1px)",
                            zIndex: 8,
                            pointerEvents: "none",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            borderRadius: `${24 * getCurrentZoomScale()}px`,
                            border: `${borderThickness}px solid ${borderColor}${Math.floor(
                                glowIntensity * 255
                            )
                                .toString(16)
                                .padStart(2, "0")}`,
                            filter: "blur(4px)",
                            zIndex: 7,
                            pointerEvents: "none",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: "0",
                            width: "100%",
                            height: "100%",
                            borderRadius: `${24 * getCurrentZoomScale()}px`,
                            background: `linear-gradient(-30deg, ${borderColor}, transparent, ${borderColor})`,
                            filter: "blur(32px)",
                            transform: "scale(1.1)",
                            opacity: glowIntensity * 0.3,
                            zIndex: 1,
                            pointerEvents: "none",
                        }}
                    />
                </>
            )}

            {/* Content area */}
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    zIndex: 15,
                    pointerEvents: "auto",
                    overflow:"visible",
                }}
            >
                {/* Content will be rendered here */}
            </div>
        </div>
    )
}

// Property Controls
addPropertyControls(ElectricBorder, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
    },
    showGlow: {
        type: ControlType.Boolean,
        title: "Glow",
        defaultValue: true,
    },
    glowIntensity: {
        type: ControlType.Number,
        title: "+ Glow -",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        hidden: (props) => !props.showGlow,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 3,
        step: 0.1,
        defaultValue: 1.5,
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 2.5,
    },
    borderThickness: {
        type: ControlType.Number,
        title: "Thickness",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 2,
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border Color",
        defaultValue: "#FFD9BF",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
    
    // Noise and animation parameters (same as main.js)
    octaves: {
        type: ControlType.Number,
        title: "Octaves",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 10,
        description: "Number of noise layers for complexity",
    },
    lacunarity: {
        type: ControlType.Number,
        title: "Lacunarity",
        min: 1.0,
        max: 4.0,
        step: 0.1,
        defaultValue: 1.6,
        description: "Frequency multiplier between octaves",
    },
    gain: {
        type: ControlType.Number,
        title: "Gain",
        min: 0.1,
        max: 1.0,
        step: 0.1,
        defaultValue: 0.6,
        description: "Amplitude multiplier between octaves",
    },
    amplitude: {
        type: ControlType.Number,
        title: "Amplitude",
        min: 0.01,
        max: 2.0,
        step: 0.01,
        defaultValue: 0.2,
        description: "Base noise amplitude",
    },
    frequency: {
        type: ControlType.Number,
        title: "Frequency",
        min: 0.1,
        max: 20.0,
        step: 0.1,
        defaultValue: 5.0,
        description: "Base noise frequency",
    },
    baseFlatness: {
        type: ControlType.Number,
        title: "Base Flatness",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.2,
        description: "First octave flatness (0 = flat, 1 = normal)",
    },
    displacement: {
        type: ControlType.Number,
        title: "Displacement",
        min: 1,
        max: 200,
        step: 1,
        defaultValue: 60,
        description: "Maximum border displacement",
    },
    borderOffset: {
        type: ControlType.Number,
        title: "Border Offset",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 0,
        description: "Distance from component edge",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Border Radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 24,
        description: "Corner rounding radius",
    },
})

ElectricBorder.displayName = "Electric Border (Safari Compatible)"
