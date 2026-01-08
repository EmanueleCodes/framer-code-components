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

function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

function parseColorToRgba(input: string | undefined): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input || input.trim() === "") return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()

    // Handle rgba() format
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

// Mapping functions for UI (0-1) to internal values
// Noise Scale: UI 0-1 → Internal 1-20
function mapNoiseScale(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 1, 20)
}

// Noise Intensity: UI 0-1 → Internal 0-0.5
function mapNoiseIntensity(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 0, 0.5)
}

// Scroll Sensitivity: UI 0-1 → Internal 0-0.01
function mapScrollSensitivity(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 0, 0.01)
}

// Base Animation Speed: UI 0-1 → Internal 0-0.1
function mapBaseAnimationSpeed(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 0, 0.1)
}

// Edge Softness: UI 0-1 → Internal 0.01-0.2 (transition zone width)
function mapEdgeSoftness(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 0.01, 0.2)
}

// Grain Scale: UI 0-1 → Internal 50-500 (noise frequency for grain)
function mapGrainScale(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 50, 500)
}

interface BurnTransitionProps {
    color?: string
    transitionColor?: string
    noiseScale?: number // UI: 0-1
    noiseIntensity?: number // UI: 0-1
    scrollSensitivity?: number // UI: 0-1
    baseAnimationSpeed?: number // UI: 0-1
    edgeSoftness?: number // UI: 0-1
    parallaxEnabled?: boolean
    parallaxStart?: number // 0-100, percentage where wave starts when component enters viewport (0% = bottom, 50% = middle, 100% = top)
    parallaxEnd?: number // 0-100, percentage where wave ends when component exits viewport (0% = bottom, 50% = middle, 100% = top)
    style?: React.CSSProperties
    movement?: {
        horizontal: number
        vertical: number
    }
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function BurnTransition({
    color = "#ff0000",
    transitionColor,
    noiseScale = 0.37, // UI default (maps to ~8.0 internally)
    noiseIntensity = 0.3, // UI default (maps to ~0.15 internally)
    scrollSensitivity = 0.01, // UI default (maps to ~0.0001 internally)
    baseAnimationSpeed = 0.1, // UI default (maps to ~0.01 internally)
    edgeSoftness = 0.4, // UI default (maps to ~0.08 internally)
    parallaxEnabled = false,
    parallaxStart = 50, // 0-100, default 50% (middle)
    parallaxEnd = 100, // 0-100, default 100% (top)
    style,
    movement = {
        horizontal: 0.5,
        vertical: 0.5,
    },
}: BurnTransitionProps) {
    // Map UI values to internal values
    const internalNoiseScale = mapNoiseScale(noiseScale)
    const internalNoiseIntensity = mapNoiseIntensity(noiseIntensity)
    const internalScrollSensitivity = mapScrollSensitivity(scrollSensitivity)
    const internalBaseAnimationSpeed = mapBaseAnimationSpeed(baseAnimationSpeed)
    const internalEdgeSoftness = mapEdgeSoftness(edgeSoftness)
    const internalGrainScale = 0

    // Resolve color token and parse to RGBA
    const resolvedColor = resolveTokenColor(color)
    const colorRgba = parseColorToRgba(resolvedColor)

    // Resolve transition color (defaults to a lighter version of base color if not provided)
    const resolvedTransitionColor = transitionColor
        ? resolveTokenColor(transitionColor)
        : resolvedColor
    const transitionColorRgba = parseColorToRgba(resolvedTransitionColor)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const bufferRef = useRef<WebGLBuffer | null>(null)
    const colorRef = useRef<[number, number, number]>([
        colorRgba.r,
        colorRgba.g,
        colorRgba.b,
    ])
    const transitionColorRef = useRef<[number, number, number]>([
        transitionColorRgba.r,
        transitionColorRgba.g,
        transitionColorRgba.b,
    ])
    const noiseScaleRef = useRef<number>(internalNoiseScale)
    const noiseIntensityRef = useRef<number>(internalNoiseIntensity)
    const scrollSensitivityRef = useRef<number>(internalScrollSensitivity)
    const baseAnimationSpeedRef = useRef<number>(internalBaseAnimationSpeed)
    const edgeSoftnessRef = useRef<number>(internalEdgeSoftness)
    const grainScaleRef = useRef<number>(internalGrainScale)
    const movementHorizontalRef = useRef<number>(movement.horizontal)
    const movementVerticalRef = useRef<number>(movement.vertical)
    const scrollOffsetRef = useRef<number>(0)
    const lastScrollYRef = useRef<number>(0)
    const lastScrollTimeRef = useRef<number>(0)
    const scrollVelocityRef = useRef<number>(0)
    const animationFrameRef = useRef<number | null>(null)
    const baseTimeRef = useRef<number>(0)
    const startTimeRef = useRef<number>(0)
    const parallaxEnabledRef = useRef<boolean>(parallaxEnabled)
    const parallaxStartRef = useRef<number>(parallaxStart)
    const parallaxEndRef = useRef<number>(parallaxEnd)
    const parallaxOffsetRef = useRef<number>(0)
    const canvasSizeRef = useRef<{ width: number; height: number }>({
        width: 0,
        height: 0,
    })

    // Helper function to create shader
    const createShader = (
        gl: WebGLRenderingContext,
        type: number,
        source: string
    ): WebGLShader | null => {
        const shader = gl.createShader(type)
        if (!shader) return null

        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(
                "Shader compilation error:",
                gl.getShaderInfoLog(shader)
            )
            gl.deleteShader(shader)
            return null
        }

        return shader
    }

    // Helper function to create program
    const createProgram = (
        gl: WebGLRenderingContext,
        vertexShader: WebGLShader,
        fragmentShader: WebGLShader
    ): WebGLProgram | null => {
        const program = gl.createProgram()
        if (!program) return null

        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(
                "Program linking error:",
                gl.getProgramInfoLog(program)
            )
            gl.deleteProgram(program)
            return null
        }

        return program
    }

    // Resize canvas
    const resizeCanvas = () => {
        const canvas = canvasRef.current
        const container = containerRef.current
        const gl = glRef.current
        if (!canvas || !container) return

        const rect = container.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        const newWidth = Math.floor(rect.width * dpr)
        const newHeight = Math.floor(rect.height * dpr)

        // Only resize if dimensions changed
        if (canvas.width === newWidth && canvas.height === newHeight) return

        canvas.width = newWidth
        canvas.height = newHeight
        canvasSizeRef.current = { width: newWidth, height: newHeight }

        if (gl) {
            gl.viewport(0, 0, canvas.width, canvas.height)
        }
    }

    // Render the main scene
    const renderScene = () => {
        const gl = glRef.current
        const program = programRef.current
        const buffer = bufferRef.current
        if (!gl || !program || !buffer) return

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(
            0,
            0,
            canvasSizeRef.current.width,
            canvasSizeRef.current.height
        )

        // Use program
        gl.useProgram(program)

        // Bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

        // Set up position attribute
        const positionLocation = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        // Set color uniform
        const colorLocation = gl.getUniformLocation(program, "u_color")
        const [r, g, b] = colorRef.current
        gl.uniform3f(colorLocation, r, g, b)

        // Set transition color uniform
        const transitionColorLocation = gl.getUniformLocation(
            program,
            "u_transition_color"
        )
        if (transitionColorLocation) {
            const [tr, tg, tb] = transitionColorRef.current
            gl.uniform3f(transitionColorLocation, tr, tg, tb)
        }

        // Set noise uniforms
        const noiseScaleLocation = gl.getUniformLocation(
            program,
            "u_noise_scale"
        )
        if (noiseScaleLocation) {
            gl.uniform1f(noiseScaleLocation, noiseScaleRef.current)
        }

        const noiseIntensityLocation = gl.getUniformLocation(
            program,
            "u_noise_intensity"
        )
        if (noiseIntensityLocation) {
            gl.uniform1f(noiseIntensityLocation, noiseIntensityRef.current)
        }

        // Update base time (linear, constant speed animation)
        const currentTime = performance.now()
        if (startTimeRef.current === 0) {
            startTimeRef.current = currentTime
        }
        const elapsedSeconds = (currentTime - startTimeRef.current) / 1000
        baseTimeRef.current = elapsedSeconds * baseAnimationSpeedRef.current

        // Set scroll offset uniform for animation (base time + scroll offset)
        const scrollOffsetLocation = gl.getUniformLocation(
            program,
            "u_scroll_offset"
        )
        if (scrollOffsetLocation) {
            gl.uniform1f(
                scrollOffsetLocation,
                baseTimeRef.current + scrollOffsetRef.current
            )
        }

        // Set edge softness uniform
        const edgeSoftnessLocation = gl.getUniformLocation(
            program,
            "u_edge_softness"
        )
        if (edgeSoftnessLocation) {
            gl.uniform1f(edgeSoftnessLocation, edgeSoftnessRef.current)
        }

        // Set grain scale uniform
        const grainScaleLocation = gl.getUniformLocation(
            program,
            "u_grain_scale"
        )
        if (grainScaleLocation) {
            gl.uniform1f(grainScaleLocation, grainScaleRef.current)
        }

        // Set movement uniforms
        const movementHorizontalLocation = gl.getUniformLocation(
            program,
            "u_movement_horizontal"
        )
        if (movementHorizontalLocation) {
            gl.uniform1f(
                movementHorizontalLocation,
                movementHorizontalRef.current
            )
        }

        const movementVerticalLocation = gl.getUniformLocation(
            program,
            "u_movement_vertical"
        )
        if (movementVerticalLocation) {
            gl.uniform1f(movementVerticalLocation, movementVerticalRef.current)
        }

        // Set parallax offset uniform
        const parallaxOffsetLocation = gl.getUniformLocation(
            program,
            "u_parallax_offset"
        )
        if (parallaxOffsetLocation) {
            gl.uniform1f(parallaxOffsetLocation, parallaxOffsetRef.current)
        }

        // Set aspect ratio uniform for consistent noise scaling
        const aspectRatioLocation = gl.getUniformLocation(
            program,
            "u_aspect_ratio"
        )
        if (aspectRatioLocation) {
            const width = canvasSizeRef.current.width
            const height = canvasSizeRef.current.height
            const aspectRatio = height > 0 ? width / height : 1.0
            gl.uniform1f(aspectRatioLocation, aspectRatio)
        }

        // Clear with transparent background
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        // Enable blending for transparency
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    // Main render function
    const render = () => {
        if (glRef.current && programRef.current) {
            renderScene()
        }
    }

    // Function to calculate parallax offset based on component position in viewport
    const updateParallaxOffset = () => {
        const container = containerRef.current
        if (!container) return

        // If parallax is disabled, set offset to 0
        if (!parallaxEnabledRef.current) {
            parallaxOffsetRef.current = 0
            if (glRef.current && programRef.current) {
                render()
            }
            return
        }

        const rect = container.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        // Calculate scroll progress based on component's position in viewport
        // progress = 0 when component top enters viewport (at bottom)
        // progress = 1 when component bottom exits viewport (at top)
        const componentTop = rect.top
        const componentBottom = rect.bottom
        const componentHeight = rect.height

        // Calculate progress: inverted so progress=1 when entering, progress=0 when exiting
        // This should make wave move in correct direction
        let progress = 0
        
        if (componentTop >= viewportHeight) {
            // Component hasn't entered yet (below viewport) - use 1 (about to enter)
            progress = 1
        } else if (componentBottom <= 0) {
            // Component has exited (above viewport) - use 0 (has exited)
            progress = 0
        } else {
            // Component is visible - calculate inverted progress
            // When top = viewportHeight (entering): progress should be 1
            // When bottom = 0 (exiting): progress should be 0
            // Invert: progress = 1 - ((viewportHeight - componentTop) / (viewportHeight + componentHeight))
            progress = 1 - ((viewportHeight - componentTop) / (viewportHeight + componentHeight))
            progress = Math.max(0, Math.min(1, progress))
        }

        // Convert percentages to UV coordinates (0-1)
        // In UV: 0 = top, 1 = bottom
        // User interface: 0% = bottom, 50% = middle, 100% = top
        const startPosition = parallaxStartRef.current / 100
        const endPosition = parallaxEndRef.current / 100

        // With inverted progress: progress=1 when entering, progress=0 when exiting
        // We want: progress=1 → startPosition, progress=0 → endPosition
        // So: targetPosition = startPosition + (endPosition - startPosition) * (1 - progress)
        // When progress=1 (entering): startPosition + (endPosition - startPosition) * 0 = startPosition ✓
        // When progress=0 (exiting): startPosition + (endPosition - startPosition) * 1 = endPosition ✓
        const targetPosition = startPosition + (endPosition - startPosition) * (1 - progress)
        
        // Calculate offset from center (0.5)
        // baseLine = 0.5 + offset, so offset = targetPosition - 0.5
        parallaxOffsetRef.current = targetPosition - 0.5

        if (glRef.current && programRef.current) {
            render()
        }
    }

    // Update refs when props change
    useEffect(() => {
        const resolved = resolveTokenColor(color)
        const rgba = parseColorToRgba(resolved)
        colorRef.current = [rgba.r, rgba.g, rgba.b]
        if (glRef.current && programRef.current) {
            render()
        }
    }, [color])

    useEffect(() => {
        const resolved = transitionColor
            ? resolveTokenColor(transitionColor)
            : resolveTokenColor(color)
        const rgba = parseColorToRgba(resolved)
        transitionColorRef.current = [rgba.r, rgba.g, rgba.b]
        if (glRef.current && programRef.current) {
            render()
        }
    }, [transitionColor, color])

    useEffect(() => {
        noiseScaleRef.current = mapNoiseScale(noiseScale)
        if (glRef.current && programRef.current) {
            render()
        }
    }, [noiseScale])

    useEffect(() => {
        noiseIntensityRef.current = mapNoiseIntensity(noiseIntensity)
        if (glRef.current && programRef.current) {
            render()
        }
    }, [noiseIntensity])

    useEffect(() => {
        scrollSensitivityRef.current = mapScrollSensitivity(scrollSensitivity)
    }, [scrollSensitivity])

    useEffect(() => {
        baseAnimationSpeedRef.current =
            mapBaseAnimationSpeed(baseAnimationSpeed)
    }, [baseAnimationSpeed])

    useEffect(() => {
        edgeSoftnessRef.current = mapEdgeSoftness(edgeSoftness)
        if (glRef.current && programRef.current) {
            render()
        }
    }, [edgeSoftness])

    useEffect(() => {
        grainScaleRef.current = mapGrainScale(0)
        if (glRef.current && programRef.current) {
            render()
        }
    }, [])

    useEffect(() => {
        movementHorizontalRef.current = movement.horizontal
        if (glRef.current && programRef.current) {
            render()
        }
    }, [movement.horizontal])

    useEffect(() => {
        movementVerticalRef.current = movement.vertical
        if (glRef.current && programRef.current) {
            render()
        }
    }, [movement.vertical])

    useEffect(() => {
        parallaxEnabledRef.current = parallaxEnabled
        updateParallaxOffset()
    }, [parallaxEnabled])

    useEffect(() => {
        parallaxStartRef.current = Math.max(0, Math.min(100, parallaxStart))
        updateParallaxOffset()
    }, [parallaxStart])

    useEffect(() => {
        parallaxEndRef.current = Math.max(0, Math.min(100, parallaxEnd))
        updateParallaxOffset()
    }, [parallaxEnd])

    // Vertex shader - simple fullscreen quad
    const vertexShader = `
        attribute vec2 a_position;
        varying vec2 v_uv;

        void main() {
            v_uv = 0.5 * (a_position + 1.0);
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `

    // Fragment shader - torn paper effect with uneven transition thickness
    const fragmentShader = `
        precision mediump float;
        varying vec2 v_uv;
        uniform vec3 u_color;
        uniform vec3 u_transition_color;
        uniform float u_noise_scale;
        uniform float u_noise_intensity;
        uniform float u_scroll_offset;
        uniform float u_edge_softness;
        uniform float u_grain_scale;
        uniform float u_movement_horizontal;
        uniform float u_movement_vertical;
        uniform float u_parallax_offset;
        uniform float u_aspect_ratio;

        // Random function
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // 2D Noise function
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        // Fractal noise (multiple octaves)
        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            
            for (int i = 0; i < 4; i++) {
                value += amplitude * noise(st);
                st *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }

        // High-frequency detailed noise for fiber-like grain
        float detailedNoise(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            
            for (int i = 0; i < 6; i++) {
                value += amplitude * noise(st);
                st *= 2.2;
                amplitude *= 0.45;
            }
            return value;
        }

        void main() {
            // === STEP 1: Define the main wavy edge (the "tear line") ===
            // Apply parallax offset to translate the wave vertically
            float baseLine = 0.5 + u_parallax_offset;
            // Apply movement controls: horizontal controls direction/speed, vertical controls evolution amount
            // horizontal: -1 = right to left, 1 = left to right, 0 = no horizontal movement
            // vertical: 0 = no vertical evolution, 1 = full vertical evolution
            float horizontalOffset = u_scroll_offset * u_movement_horizontal;
            float verticalOffset = u_scroll_offset * u_movement_vertical;
            
            // Use aspect-ratio-corrected x-coordinates to prevent noise stretching
            // Keep original y-scaling for the "mountain-ish" profile
            vec2 noiseCoord = vec2(
                v_uv.x * u_aspect_ratio * u_noise_scale + horizontalOffset,
                v_uv.y * 3.0 + verticalOffset * 0.6
            );
            float edgeNoise = fbm(noiseCoord);
            float mainEdge = baseLine + (edgeNoise - 0.5) * u_noise_intensity;
            
            // === STEP 2: Create UNEVEN transition thickness ===
            // Use a different noise to vary how thick the transition zone is at each point
            // Apply movement controls for consistent animation
            // Use aspect-ratio-corrected x-coordinates, original y-scaling
            vec2 thicknessNoiseCoord = vec2(
                v_uv.x * u_aspect_ratio * u_noise_scale * 2.3 + horizontalOffset * 0.7,
                v_uv.y * 2.0 + verticalOffset * 0.4 + 100.0
            );
            float thicknessNoise = fbm(thicknessNoiseCoord);
            // Transition width varies from very thin to full width
            float minThickness = u_edge_softness * 0.1;
            float maxThickness = u_edge_softness;
            float localThickness = mix(minThickness, maxThickness, thicknessNoise);
            
            // === STEP 3: Define the two boundaries ===
            // Lower boundary: where solid base color ends
            // Upper boundary: where transparency begins
            // The transition color fills the space between
            float lowerBound = mainEdge - localThickness * 0.4;  // Solid color edge
            float upperBound = mainEdge + localThickness * 0.6;  // Transparency edge
            
            // === STEP 4: High-frequency grain for fiber effect ===
            // Animate grain both horizontally and vertically using movement controls
            // Use aspect-ratio-corrected coordinates
            vec2 grainCoord = vec2(
                v_uv.x * u_aspect_ratio * u_grain_scale * 3.0 + horizontalOffset * 0.5,
                v_uv.y * u_grain_scale * 3.0 + verticalOffset * 0.3
            );
            float grain = detailedNoise(grainCoord);
            
            // Additional "fiber" noise - elongated in Y direction for torn paper fibers
            // Apply movement controls for consistent animation
            // Use aspect-ratio-corrected coordinates
            vec2 fiberCoord = vec2(
                v_uv.x * u_aspect_ratio * u_grain_scale * 8.0 + horizontalOffset * 0.3,
                v_uv.y * u_grain_scale * 2.0 + verticalOffset * 0.2
            );
            float fiberNoise = noise(fiberCoord);
            
            // Combine grain patterns
            float combinedGrain = grain * 0.6 + fiberNoise * 0.4;
            
            // Distance from the main edge
            float distFromEdge = v_uv.y - mainEdge;
            
            // === STEP 5: Render based on position ===
            
            // Below lower bound - solid base color
            if (v_uv.y < lowerBound) {
                gl_FragColor = vec4(u_color, 1.0);
            }
            // Between lower bound and main edge - base color with transition color fibers bleeding in
            else if (v_uv.y < mainEdge) {
                // How far into the transition zone (0 at lowerBound, 1 at mainEdge)
                float t = (v_uv.y - lowerBound) / max(mainEdge - lowerBound, 0.001);
                
                // Grain threshold: less grain near solid, more grain near edge
                // Use exponential curve for more natural distribution
                float grainThreshold = 1.0 - pow(t, 1.5);
                
                // Add some randomness to threshold based on position
                grainThreshold -= thicknessNoise * 0.2;
                
                if (combinedGrain > grainThreshold) {
                    // Solid grain pixel
                    gl_FragColor = vec4(u_transition_color, 1.0);
                } else {
                    gl_FragColor = vec4(u_color, 1.0);
                }
            }
            // Between main edge and upper bound - transition color with transparency bleeding in
            else if (v_uv.y < upperBound) {
                // How far into the upper transition zone (0 at mainEdge, 1 at upperBound)
                float t = (v_uv.y - mainEdge) / max(upperBound - mainEdge, 0.001);
                
                // Grain threshold: more visible near edge, fading to transparent
                float grainThreshold = pow(t, 1.2);
                
                // Add variation
                grainThreshold += thicknessNoise * 0.15;
                
                if (combinedGrain > grainThreshold) {
                    // Solid grain pixel
                    gl_FragColor = vec4(u_transition_color, 1.0);
                } else {
                    discard;
                }
            }
            // Above upper bound - fully transparent
            else {
                discard;
            }
        }
    `

    // Initialize WebGL
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        // Get WebGL context
        const gl = canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: false,
        })
        if (!gl) {
            console.error("WebGL not supported")
            return
        }

        glRef.current = gl

        // Create shaders
        const vertexShaderObj = createShader(gl, gl.VERTEX_SHADER, vertexShader)
        const fragmentShaderObj = createShader(
            gl,
            gl.FRAGMENT_SHADER,
            fragmentShader
        )

        if (!vertexShaderObj || !fragmentShaderObj) return

        // Create program
        const program = createProgram(gl, vertexShaderObj, fragmentShaderObj)
        if (!program) return

        programRef.current = program

        // Create fullscreen quad
        const positions = new Float32Array([
            -1,
            -1, // bottom left
            1,
            -1, // bottom right
            -1,
            1, // top left
            1,
            1, // top right
        ])

        const buffer = gl.createBuffer()
        if (!buffer) return

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        bufferRef.current = buffer

        // Initialize base animation time
        startTimeRef.current = performance.now()

        // Setup resize observer
        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas()
        })
        resizeObserver.observe(container)

        // Initial render
        resizeCanvas()
        updateParallaxOffset()
        render()

        // Animation loop
        const animate = () => {
            if (glRef.current && programRef.current) {
                // Update parallax offset continuously for smooth effect
                updateParallaxOffset()
                render()
            }
            animationFrameRef.current = requestAnimationFrame(animate)
        }
        animationFrameRef.current = requestAnimationFrame(animate)

        // Track scroll for animation and parallax
        const scrollHandler = () => {
            const currentScrollY = window.scrollY || window.pageYOffset
            const currentTime = performance.now()

            if (lastScrollTimeRef.current > 0) {
                const deltaY = currentScrollY - lastScrollYRef.current
                const deltaTime = currentTime - lastScrollTimeRef.current

                if (deltaTime > 0 && Math.abs(deltaY) > 0) {
                    // Calculate scroll velocity (pixels per second) for tracking
                    scrollVelocityRef.current = (deltaY / deltaTime) * 1000

                    // Use deltaY directly with sensitivity for more controlled animation
                    // This prevents velocity spikes from causing huge animations
                    scrollOffsetRef.current +=
                        deltaY * scrollSensitivityRef.current
                }
            }

            lastScrollYRef.current = currentScrollY
            lastScrollTimeRef.current = currentTime

            // Update parallax offset on scroll
            updateParallaxOffset()
        }

        // Initialize scroll tracking
        lastScrollYRef.current = window.scrollY || window.pageYOffset
        lastScrollTimeRef.current = performance.now()

        // Add scroll listener
        window.addEventListener("scroll", scrollHandler, { passive: true })

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener("scroll", scrollHandler)
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (glRef.current) {
                const gl = glRef.current
                if (bufferRef.current) gl.deleteBuffer(bufferRef.current)
                if (programRef.current) gl.deleteProgram(programRef.current)
            }
        }
    }, [])

    const containerStyle: React.CSSProperties = {
        ...(style as React.CSSProperties),
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
    }

    const canvasStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
    }

    return (
        <div ref={containerRef} style={containerStyle}>
            <canvas ref={canvasRef} style={canvasStyle} />
        </div>
    )
}

// Property controls for Framer
addPropertyControls(BurnTransition, {
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ff0000",
    },
    transitionColor: {
        type: ControlType.Color,
        title: "Transition Color",
        defaultValue: "#ffffff",
        optional: true,
    },

    noiseScale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 0.37,
        min: 0.0,
        max: 1.0,
        step: 0.1,
    },
    noiseIntensity: {
        type: ControlType.Number,
        title: "Noise",
        defaultValue: 0.3,
        min: 0.0,
        max: 1.0,
        step: 0.1,
    },
    scrollSensitivity: {
        type: ControlType.Number,
        title: "Scroll",
        defaultValue: 0.4,
        min: 0.0,
        max: 1.0,
        step: 0.1,
    },
    baseAnimationSpeed: {
        type: ControlType.Number,
        title: "Base Speed",
        defaultValue: 0.1,
        min: 0.0,
        max: 1.0,
        step: 0.1,
    },
    edgeSoftness: {
        type: ControlType.Number,
        title: "Edge",
        defaultValue: 0.4,
        min: 0.0,
        max: 1.0,
        step: 0.1,
    },
    parallaxEnabled: {
        type: ControlType.Boolean,
        title: "Parallax",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    parallaxStart: {
        type: ControlType.Number,
        title: "Start",
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        hidden: (props: BurnTransitionProps) => !props.parallaxEnabled,
    },
    parallaxEnd: {
        type: ControlType.Number,
        title: "End",
        defaultValue: 100,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        description: "0% = bottom, 50% = middle, 100% = top",
        hidden: (props: BurnTransitionProps) => !props.parallaxEnabled,
    },
    movement: {
        type: ControlType.Object,
        controls: {
            horizontal: {
                type: ControlType.Number,
                title: "Horizontal",
                defaultValue: 0,
                step: 0.1,
                min: -1,
                max: 1,
                description: "-1 = right to left, 1 = left to right",
            },
            vertical: {
                type: ControlType.Number,
                title: "Vertical",
                defaultValue: 0,
                step: 0.1,
                min: 0,
                max: 1,
            },
        },
        defaultValue: {
            horizontal: 0.5,
            vertical: 0.5,
        },
    },
})

BurnTransition.displayName="Burn Transition"