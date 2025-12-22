
import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

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

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()
    
    // Handle rgba() format
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a = rgbaMatch[4] !== undefined
            ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
            : 1
        return { r, g, b, a }
    }
    
    // Handle hex formats
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        }
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        }
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

function rgbaToCanvasColor(rgba: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(rgba.r * 255)
    const g = Math.round(rgba.g * 255)
    const b = Math.round(rgba.b * 255)
    if (rgba.a === 1) {
        return `rgb(${r}, ${g}, ${b})`
    }
    return `rgba(${r}, ${g}, ${b}, ${rgba.a})`
}

interface SparklesProps {
    preview?: boolean
    background?: string
    particleColor?: string
    particleDensity?: number
    minSize?: number
    maxSize?: number
    speed?: number
    particleSpeed?: number
    style?: React.CSSProperties
}

const DEFAULTS = {
    background: "#000000",
    particleColor: "#ffffff",
    particleDensity: 0.5, // UI value: 0.1 - 1.0
    minSize: 0.5,
    maxSize: 1,
    speed: 0.5, // UI value: 0.1 - 1.0 (flicker speed)
    particleSpeed: 0.5, // UI value: 0 - 1.0 (movement speed)
}

// Mapping function: UI 0.1..1 → internal 0.5..12
function mapFlickerUiToInternal(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    const t = (clamped - 0.1) / 0.9
    return 0.5 + t * 11.5 // Maps to 0.5..12
}

// Mapping function: UI 0.1..1 → internal 5..60
function mapDensityUiToInternal(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    const t = (clamped - 0.1) / 0.9
    return 5 + t * 55 // Maps to 5..60
}


type Particle = {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    opacity: number
    opacityVel: number
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function Sparkles({
    preview = false,
    background = DEFAULTS.background,
    particleColor = DEFAULTS.particleColor,
    particleDensity = DEFAULTS.particleDensity,
    minSize = DEFAULTS.minSize,
    maxSize = DEFAULTS.maxSize,
    speed = DEFAULTS.speed,
    particleSpeed = DEFAULTS.particleSpeed,
    style,
}: SparklesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const particlesRef = useRef<Particle[]>([])
    const animationRef = useRef<number | null>(null)
    const lastFrameTimeRef = useRef<number>(0) // Track last frame time for delta-time
    const lastRef = useRef<{
        w: number
        h: number
        aspect: number
        ts: number
    }>({ w: 0, h: 0, aspect: 0, ts: 0 })

    // Initialize particles
    const initParticles = (width: number, height: number) => {
        const particles: Particle[] = []
        const area = width * height
        const mappedDensity = mapDensityUiToInternal(particleDensity)
        const count = Math.floor((area / 10000) * mappedDensity)

        const velocityMultiplier = particleSpeed * 0.5 // Maps 0-1 to 0-0.5

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * velocityMultiplier,
                vy: (Math.random() - 0.5) * velocityMultiplier,
                size: minSize + Math.random() * (maxSize - minSize),
                opacity: Math.random(),
                opacityVel: (Math.random() - 0.5) * 0.04,
            })
        }
        particlesRef.current = particles
    }

    // Main canvas setup and animation
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1

            canvas.width = width * dpr
            canvas.height = height * dpr
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
            ctx.scale(dpr, dpr)

            initParticles(width, height)
        }

        resize()

        const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
        const shouldAnimate = !isCanvasMode || preview

        const mappedSpeed = mapFlickerUiToInternal(speed)

        // Parse colors with token and opacity support
        const resolvedBackground = resolveTokenColor(background)
        const backgroundRgba = parseColorToRgba(resolvedBackground)
        const backgroundColor = rgbaToCanvasColor(backgroundRgba)

        const resolvedParticleColor = resolveTokenColor(particleColor)
        const particleColorRgba = parseColorToRgba(resolvedParticleColor)
        const particleColorBase = rgbaToCanvasColor({ ...particleColorRgba, a: 1 }) // Base color without alpha

        const animate = (currentTime: number) => {
            if (!canvas || !ctx) return

            // Calculate delta time (time since last frame) for frame-rate independent animation
            // Target 60fps (16.67ms) as baseline
            const deltaTime = lastFrameTimeRef.current === 0 
                ? 1 
                : Math.min((currentTime - lastFrameTimeRef.current) / 16.67, 3) // Cap at 3x to prevent huge jumps
            lastFrameTimeRef.current = currentTime

            const width = canvas.width / (window.devicePixelRatio || 1)
            const height = canvas.height / (window.devicePixelRatio || 1)

            // Clear canvas completely first, then draw background
            ctx.clearRect(0, 0, width, height)
            ctx.fillStyle = backgroundColor
            ctx.fillRect(0, 0, width, height)

            // Update and draw particles
            const particles = particlesRef.current
            const particleCount = particles.length
            const baseAlpha = particleColorRgba.a
            
            // Set fill style once for all particles (performance optimization)
            ctx.fillStyle = particleColorBase
            
            for (let i = 0; i < particleCount; i++) {
                const particle = particles[i]
                
                // Update position
                if (shouldAnimate) {
                    particle.x += particle.vx * deltaTime
                    particle.y += particle.vy * deltaTime

                    // Wrap around edges
                    if (particle.x < 0) particle.x = width
                    if (particle.x > width) particle.x = 0
                    if (particle.y < 0) particle.y = height
                    if (particle.y > height) particle.y = 0

                    // Update opacity (flicker effect) - frame-rate independent
                    particle.opacity += particle.opacityVel * mappedSpeed * 0.5 * deltaTime
                    
                    // Bounce opacity at boundaries and clamp
                    if (particle.opacity <= 0.1) {
                        particle.opacity = 0.1
                        particle.opacityVel = Math.abs(particle.opacityVel) // Make positive
                    } else if (particle.opacity >= 1) {
                        particle.opacity = 1
                        particle.opacityVel = -Math.abs(particle.opacityVel) // Make negative
                    }
                }

                // Draw particle with combined opacity (particleColor alpha * particle opacity)
                ctx.globalAlpha = baseAlpha * particle.opacity
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.globalAlpha = 1

            if (shouldAnimate) {
                animationRef.current = requestAnimationFrame(animate)
            }
        }

        // Reset frame time and start animation
        lastFrameTimeRef.current = 0
        animationRef.current = requestAnimationFrame(animate)

        // Canvas resize detection for Framer Canvas
        let resizeRafId = 0
        if (RenderTarget.current() === RenderTarget.canvas) {
            const TICK_MS = 250
            const EPSPECT = 0.001

            const tick = (now?: number) => {
                const container = containerRef.current
                if (container) {
                    const cw = container.clientWidth || container.offsetWidth || 1
                    const ch = container.clientHeight || container.offsetHeight || 1
                    const aspect = cw / ch

                    const timeOk =
                        !lastRef.current.ts || (now || performance.now()) - lastRef.current.ts >= TICK_MS
                    const aspectChanged = Math.abs(aspect - lastRef.current.aspect) > EPSPECT
                    const sizeChanged =
                        Math.abs(cw - lastRef.current.w) > 1 || Math.abs(ch - lastRef.current.h) > 1

                    if (timeOk && (aspectChanged || sizeChanged)) {
                        lastRef.current = { w: cw, h: ch, aspect, ts: now || performance.now() }
                        resize()
                        if (!shouldAnimate) {
                            // Render one frame in canvas mode when preview is off
                            const particles = particlesRef.current
                            const particleCount = particles.length
                            const baseAlpha = particleColorRgba.a
                            
                            ctx.clearRect(0, 0, cw, ch)
                            ctx.fillStyle = backgroundColor
                            ctx.fillRect(0, 0, cw, ch)
                            ctx.fillStyle = particleColorBase
                            
                            for (let i = 0; i < particleCount; i++) {
                                const particle = particles[i]
                                ctx.globalAlpha = baseAlpha * particle.opacity
                                ctx.beginPath()
                                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
                                ctx.fill()
                            }
                            ctx.globalAlpha = 1
                        }
                    }
                }
                resizeRafId = requestAnimationFrame(tick)
            }
            resizeRafId = requestAnimationFrame(tick)
        } else {
            window.addEventListener("resize", resize)
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (resizeRafId) {
                cancelAnimationFrame(resizeRafId)
            }
            window.removeEventListener("resize", resize)
        }
    }, [background, particleColor, particleDensity, minSize, maxSize, speed, particleSpeed, preview])

    // Force render when colors change in canvas mode
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
        const shouldAnimate = !isCanvasMode || preview

        if (isCanvasMode && !shouldAnimate) {
            const ctx = canvas.getContext("2d")
            if (!ctx) return

            // Parse colors
            const resolvedBackground = resolveTokenColor(background)
            const backgroundRgba = parseColorToRgba(resolvedBackground)
            const backgroundColor = rgbaToCanvasColor(backgroundRgba)

            const resolvedParticleColor = resolveTokenColor(particleColor)
            const particleColorRgba = parseColorToRgba(resolvedParticleColor)
            const particleColorBase = rgbaToCanvasColor({ ...particleColorRgba, a: 1 })

            const width = canvas.width / (window.devicePixelRatio || 1)
            const height = canvas.height / (window.devicePixelRatio || 1)

            // Force render with new colors
            const particles = particlesRef.current
            const particleCount = particles.length
            const baseAlpha = particleColorRgba.a
            
            ctx.clearRect(0, 0, width, height)
            ctx.fillStyle = backgroundColor
            ctx.fillRect(0, 0, width, height)
            ctx.fillStyle = particleColorBase
            
            for (let i = 0; i < particleCount; i++) {
                const particle = particles[i]
                ctx.globalAlpha = baseAlpha * particle.opacity
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
                ctx.fill()
            }
            ctx.globalAlpha = 1
        }
    }, [background, particleColor, preview])

    return (
        <div 
            ref={containerRef} 
            style={{
                ...style,
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            }}
        >
            {/* Hidden 20x20 probe to detect editor zoom level in canvas */}
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
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

addPropertyControls(Sparkles, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    particleDensity: {
        type: ControlType.Number,
        title: "Density",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: DEFAULTS.particleDensity,
    },
    minSize: {
        type: ControlType.Number,
        title: "Min Size",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: DEFAULTS.minSize,
        unit: "px",
    },
    maxSize: {
        type: ControlType.Number,
        title: "Max Size",
        min: 0.5,
        max: 15,
        step: 0.5,
        defaultValue: DEFAULTS.maxSize,
        unit: "px",
    },
    speed: {
        type: ControlType.Number,
        title: "Flicker",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: DEFAULTS.speed,
    },
    particleSpeed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: DEFAULTS.particleSpeed,
  
    },

  particleColor: {
      type: ControlType.Color,
      title: "Sparkle",
      defaultValue: DEFAULTS.particleColor,
  },
  background: {
    type: ControlType.Color,
    title: "Background",
    defaultValue: DEFAULTS.background,
    description: "More components at [Framer University](https://frameruni.link/cc).",
},
})

Sparkles.displayName = "Sparkles"
