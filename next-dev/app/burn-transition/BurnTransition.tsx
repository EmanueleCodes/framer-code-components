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

// Bloom Radius: UI 0-1 → Internal 0-0.3 (blur radius for bloom effect)
function mapBloomRadius(ui: number): number {
    return mapLinear(Math.max(0, Math.min(1, ui)), 0, 1, 0, 0.3)
}

interface BurnTransitionProps {
    preview?: boolean
    color?: string
    transitionColor?: string
    noiseScale?: number // UI: 0-1
    noiseIntensity?: number // UI: 0-1
    scrollSensitivity?: number // UI: 0-1
    baseAnimationSpeed?: number // UI: 0-1
    edgeSoftness?: number // UI: 0-1
    bloomIntensity?: number // UI: 0-1
    bloomRadius?: number // UI: 0-1
    parallaxEnabled?: boolean
    style?: React.CSSProperties
    movement?: {
        horizontal?: "left" | "center" | "right"
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
    preview = false,
    color = "#ff0000",
    transitionColor,
    noiseScale = 0.37, // UI default (maps to ~8.0 internally)
    noiseIntensity = 0.3, // UI default (maps to ~0.15 internally)
    scrollSensitivity = 0.01, // UI default (maps to ~0.0001 internally)
    baseAnimationSpeed = 0.1, // UI default (maps to ~0.01 internally)
    edgeSoftness = 0.4, // UI default (maps to ~0.08 internally)
    bloomIntensity = 0.5,
    bloomRadius = 0.5,
    parallaxEnabled = false,
    style,
    movement = {
        horizontal: "center",
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
    const internalBloomRadius = mapBloomRadius(bloomRadius)

    // Map horizontal movement enum to numeric value: left = 1, right = -1, center = 0
    const horizontalMovementValue =
        movement?.horizontal === "left"
            ? 1
            : movement?.horizontal === "right"
              ? -1
              : 0

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
    const movementHorizontalRef = useRef<number>(horizontalMovementValue)
    const movementVerticalRef = useRef<number>(movement?.vertical ?? 0.5)
    const scrollOffsetRef = useRef<number>(0)
    const lastScrollYRef = useRef<number>(0)
    const lastScrollTimeRef = useRef<number>(0)
    const scrollVelocityRef = useRef<number>(0)
    const animationFrameRef = useRef<number | null>(null)
    const baseTimeRef = useRef<number>(0)
    const startTimeRef = useRef<number>(0)
    const previewRef = useRef<boolean>(preview)
    const parallaxEnabledRef = useRef<boolean>(parallaxEnabled)

    // Check canvas mode ONCE at component mount and cache it
    const isCanvasRef = useRef<boolean | null>(null)
    if (isCanvasRef.current === null) {
        isCanvasRef.current = RenderTarget.current() === RenderTarget.canvas
    }
    const isCanvas = isCanvasRef.current
    // Hardcode parallax values: start = 0% (bottom), end = 100% (top)
    const parallaxStartRef = useRef<number>(0)
    const parallaxEndRef = useRef<number>(100)
    const parallaxOffsetRef = useRef<number>(0)
    const canvasSizeRef = useRef<{ width: number; height: number }>({
        width: 0,
        height: 0,
    })

    // Bloom refs
    const bloomIntensityRef = useRef<number>(bloomIntensity)
    const bloomRadiusRef = useRef<number>(internalBloomRadius)
    const extractProgramRef = useRef<WebGLProgram | null>(null)
    const blurProgramRef = useRef<WebGLProgram | null>(null)
    const compositeProgramRef = useRef<WebGLProgram | null>(null)
    const framebufferRef = useRef<WebGLFramebuffer | null>(null)
    const sceneTextureRef = useRef<WebGLTexture | null>(null)
    const extractFramebufferRef = useRef<WebGLFramebuffer | null>(null)
    const extractTextureRef = useRef<WebGLTexture | null>(null)
    const blurFramebuffer1Ref = useRef<WebGLFramebuffer | null>(null)
    const blurTexture1Ref = useRef<WebGLTexture | null>(null)
    const blurFramebuffer2Ref = useRef<WebGLFramebuffer | null>(null)
    const blurTexture2Ref = useRef<WebGLTexture | null>(null)
    const bloomDownsampleRef = useRef<number>(2) // Render bloom at half resolution for performance

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

    // Helper to create a framebuffer with texture
    const createFramebufferTexture = (
        gl: WebGLRenderingContext,
        width: number,
        height: number
    ): {
        framebuffer: WebGLFramebuffer | null
        texture: WebGLTexture | null
    } => {
        const texture = gl.createTexture()
        if (!texture) return { framebuffer: null, texture: null }

        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        const framebuffer = gl.createFramebuffer()
        if (!framebuffer) return { framebuffer: null, texture }

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        )
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        return { framebuffer, texture }
    }

    // Resize canvas and framebuffers
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

            const downsample = bloomDownsampleRef.current
            const bloomWidth = Math.floor(newWidth / downsample)
            const bloomHeight = Math.floor(newHeight / downsample)

            // Resize framebuffer textures
            if (sceneTextureRef.current) {
                gl.bindTexture(gl.TEXTURE_2D, sceneTextureRef.current)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    newWidth,
                    newHeight,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    null
                )
            }
            // Bloom textures at half resolution for performance
            if (extractTextureRef.current) {
                gl.bindTexture(gl.TEXTURE_2D, extractTextureRef.current)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    bloomWidth,
                    bloomHeight,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    null
                )
            }
            if (blurTexture1Ref.current) {
                gl.bindTexture(gl.TEXTURE_2D, blurTexture1Ref.current)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    bloomWidth,
                    bloomHeight,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    null
                )
            }
            if (blurTexture2Ref.current) {
                gl.bindTexture(gl.TEXTURE_2D, blurTexture2Ref.current)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    bloomWidth,
                    bloomHeight,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    null
                )
            }
            gl.bindTexture(gl.TEXTURE_2D, null)
        }
    }

    // Render the main scene to a target (framebuffer or screen)
    const renderScene = (targetFramebuffer: WebGLFramebuffer | null) => {
        const gl = glRef.current
        const program = programRef.current
        const buffer = bufferRef.current
        if (!gl || !program || !buffer) return

        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer)
        // Scene always renders at full resolution
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
        // In canvas mode with preview off, freeze time (set speed to 0)
        const currentTime = performance.now()
        if (startTimeRef.current === 0) {
            startTimeRef.current = currentTime
        }
        // Only update time if not in canvas mode with preview off
        const shouldAnimate = !(isCanvas && !previewRef.current)
        if (shouldAnimate) {
            const elapsedSeconds = (currentTime - startTimeRef.current) / 1000
            baseTimeRef.current = elapsedSeconds * baseAnimationSpeedRef.current
        }
        // If preview is off in canvas mode, baseTimeRef stays frozen at its current value

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

    // Extract pass - extracts only transition color pixels for bloom
    const renderExtract = (
        sourceTexture: WebGLTexture,
        targetFramebuffer: WebGLFramebuffer
    ) => {
        const gl = glRef.current
        const extractProgram = extractProgramRef.current
        const buffer = bufferRef.current
        if (!gl || !extractProgram || !buffer) return

        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer)
        // Use downsampled resolution for bloom for better performance
        const downsample = bloomDownsampleRef.current
        const bloomWidth = Math.floor(canvasSizeRef.current.width / downsample)
        const bloomHeight = Math.floor(
            canvasSizeRef.current.height / downsample
        )
        gl.viewport(0, 0, bloomWidth, bloomHeight)

        gl.useProgram(extractProgram)
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

        const positionLocation = gl.getAttribLocation(
            extractProgram,
            "a_position"
        )
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        // Bind source texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
        const textureLocation = gl.getUniformLocation(
            extractProgram,
            "u_texture"
        )
        gl.uniform1i(textureLocation, 0)

        // Set transition color
        const transitionColorLocation = gl.getUniformLocation(
            extractProgram,
            "u_transition_color"
        )
        if (transitionColorLocation) {
            const [tr, tg, tb] = transitionColorRef.current
            gl.uniform3f(transitionColorLocation, tr, tg, tb)
        }

        // Set base color (to exclude from bloom)
        const baseColorLocation = gl.getUniformLocation(
            extractProgram,
            "u_base_color"
        )
        if (baseColorLocation) {
            const [r, g, b] = colorRef.current
            gl.uniform3f(baseColorLocation, r, g, b)
        }

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.disable(gl.BLEND)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    // Blur pass
    const renderBlur = (
        sourceTexture: WebGLTexture,
        targetFramebuffer: WebGLFramebuffer | null,
        direction: [number, number]
    ) => {
        const gl = glRef.current
        const blurProgram = blurProgramRef.current
        const buffer = bufferRef.current
        if (!gl || !blurProgram || !buffer) return

        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer)
        // Use downsampled resolution for bloom for better performance
        const downsample = bloomDownsampleRef.current
        const bloomWidth = Math.floor(canvasSizeRef.current.width / downsample)
        const bloomHeight = Math.floor(
            canvasSizeRef.current.height / downsample
        )
        gl.viewport(0, 0, bloomWidth, bloomHeight)

        gl.useProgram(blurProgram)
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

        const positionLocation = gl.getAttribLocation(blurProgram, "a_position")
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        // Bind source texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
        const textureLocation = gl.getUniformLocation(blurProgram, "u_texture")
        gl.uniform1i(textureLocation, 0)

        // Set direction
        const directionLocation = gl.getUniformLocation(
            blurProgram,
            "u_direction"
        )
        gl.uniform2f(directionLocation, direction[0], direction[1])

        // Set resolution (use downsampled resolution for bloom)
        const resolutionLocation = gl.getUniformLocation(
            blurProgram,
            "u_resolution"
        )
        gl.uniform2f(resolutionLocation, bloomWidth, bloomHeight)

        // Set radius
        const radiusLocation = gl.getUniformLocation(blurProgram, "u_radius")
        gl.uniform1f(radiusLocation, bloomRadiusRef.current)

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.disable(gl.BLEND)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    // Composite pass - combine scene with bloom
    const renderComposite = (
        sceneTexture: WebGLTexture,
        bloomTexture: WebGLTexture
    ) => {
        const gl = glRef.current
        const compositeProgram = compositeProgramRef.current
        const buffer = bufferRef.current
        if (!gl || !compositeProgram || !buffer) return

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(
            0,
            0,
            canvasSizeRef.current.width,
            canvasSizeRef.current.height
        )

        gl.useProgram(compositeProgram)
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

        const positionLocation = gl.getAttribLocation(
            compositeProgram,
            "a_position"
        )
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        // Bind scene texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, sceneTexture)
        const sceneLocation = gl.getUniformLocation(compositeProgram, "u_scene")
        gl.uniform1i(sceneLocation, 0)

        // Bind bloom texture
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, bloomTexture)
        const bloomLocation = gl.getUniformLocation(compositeProgram, "u_bloom")
        gl.uniform1i(bloomLocation, 1)

        // Set bloom intensity
        const intensityLocation = gl.getUniformLocation(
            compositeProgram,
            "u_bloom_intensity"
        )
        gl.uniform1f(intensityLocation, bloomIntensityRef.current)

        // Set transition color for glow tinting
        const transitionColorLocation = gl.getUniformLocation(
            compositeProgram,
            "u_transition_color"
        )
        if (transitionColorLocation) {
            const [tr, tg, tb] = transitionColorRef.current
            gl.uniform3f(transitionColorLocation, tr, tg, tb)
        }

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        // Disable blending - we're compositing everything in the shader
        // This prevents GL from darkening our semi-transparent bloom pixels
        gl.disable(gl.BLEND)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        
        // Re-enable blending for future passes
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    }

    // Main render function with bloom
    const render = () => {
        const gl = glRef.current
        if (!gl || !programRef.current) return

        const hasBloom =
            bloomIntensityRef.current > 0 &&
            framebufferRef.current &&
            sceneTextureRef.current &&
            blurFramebuffer1Ref.current &&
            blurTexture1Ref.current &&
            blurFramebuffer2Ref.current &&
            blurTexture2Ref.current &&
            blurProgramRef.current &&
            compositeProgramRef.current

        if (
            hasBloom &&
            extractProgramRef.current &&
            extractFramebufferRef.current &&
            extractTextureRef.current
        ) {
            // Pass 1: Render scene to framebuffer
            renderScene(framebufferRef.current)

            // Pass 2: Extract only transition color pixels
            renderExtract(
                sceneTextureRef.current!,
                extractFramebufferRef.current
            )

            // Pass 3: Horizontal blur on extracted pixels
            renderBlur(
                extractTextureRef.current!,
                blurFramebuffer1Ref.current,
                [1, 0]
            )

            // Pass 4: Vertical blur
            renderBlur(
                blurTexture1Ref.current!,
                blurFramebuffer2Ref.current,
                [0, 1]
            )

            // Pass 5: Composite scene + bloom to screen
            renderComposite(sceneTextureRef.current!, blurTexture2Ref.current!)
        } else {
            // No bloom - render directly to screen
            renderScene(null)
        }
    }

    // Function to calculate parallax offset based on component position in viewport
    const updateParallaxOffset = () => {
        const container = containerRef.current
        if (!container) return

        // If parallax is disabled, set offset to 0 (don't render here, let animation loop handle it)
        if (!parallaxEnabledRef.current) {
            parallaxOffsetRef.current = 0
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
        // Note: render() is called by animation loop, no need to call it here
    }

    // Update preview ref when preview prop changes
    useEffect(() => {
        previewRef.current = preview
        // When preview turns on in canvas mode, reset start time to prevent jump
        if (isCanvas && preview && startTimeRef.current > 0) {
            startTimeRef.current = performance.now()
        }
    }, [preview, isCanvas])

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
        // Map horizontal movement enum to value: left = 1, right = -1, center = 0
        const horizontalValue =
            movement?.horizontal === "left"
                ? 1
                : movement?.horizontal === "right"
                  ? -1
                  : 0
        movementHorizontalRef.current = horizontalValue
        if (glRef.current && programRef.current) {
            render()
        }
    }, [movement?.horizontal])

    useEffect(() => {
        movementVerticalRef.current = movement?.vertical ?? 0.5
        if (glRef.current && programRef.current) {
            render()
        }
    }, [movement?.vertical])

    useEffect(() => {
        parallaxEnabledRef.current = parallaxEnabled
        // Hardcode parallax values: start = 0% (bottom), end = 100% (top)
        parallaxStartRef.current = 0
        parallaxEndRef.current = 100
        updateParallaxOffset()
    }, [parallaxEnabled])

    useEffect(() => {
        bloomIntensityRef.current = bloomIntensity
    }, [bloomIntensity])

    useEffect(() => {
        bloomRadiusRef.current = mapBloomRadius(bloomRadius)
        if (glRef.current && blurProgramRef.current) {
            render()
        }
    }, [bloomRadius])

    // Handle preview changes - re-render when preview toggles
    useEffect(() => {
        if (glRef.current && programRef.current) {
            render()
        }
    }, [preview])

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

    // Extraction shader - extracts transition area for bloom
    const extractFragmentShader = `
        precision mediump float;
        varying vec2 v_uv;
        uniform sampler2D u_texture;
        uniform vec3 u_transition_color;
        uniform vec3 u_base_color;
        
        void main() {
            vec4 pixel = texture2D(u_texture, v_uv);
            
            // Check how close this pixel is to the transition color
            float distToTransition = length(pixel.rgb - u_transition_color);
            float distToBase = length(pixel.rgb - u_base_color);
            
            // Extract transition pixels with smooth falloff
            float isTransition = 1.0 - smoothstep(0.0, 0.5, distToTransition);
            float notBase = smoothstep(0.0, 0.3, distToBase);
            
            // Create mask for bloom
            float mask = isTransition * notBase * pixel.a;
            
            // Apply smooth falloff for organic feel
            mask = pow(mask, 0.8);
            
            // Output intensity for bloom (white, we'll apply color in composite)
            gl_FragColor = vec4(1.0, 1.0, 1.0, mask);
        }
    `

    // Optimized blur shader - proper gaussian blur with more samples
    const blurFragmentShader = `
        precision mediump float;
        varying vec2 v_uv;
        uniform sampler2D u_texture;
        uniform vec2 u_direction;
        uniform vec2 u_resolution;
        uniform float u_radius;
        
        void main() {
            // Blur size - scale appropriately for downsampled texture
            float blur_size = u_radius * 12.0;
            
            // 13-tap gaussian blur with proper distribution
            float alpha = 0.0;
            float totalWeight = 0.0;
            
            // Proper gaussian weights for 13 samples
            for (int i = -6; i <= 6; i++) {
                float offset = float(i);
                
                // Gaussian weight with sigma = 2.0 for smooth falloff
                float weight = exp(-0.5 * (offset * offset) / 4.0);
                
                // Sample texture
                vec2 sampleOffset = u_direction * (offset * blur_size) / u_resolution;
                float sampleAlpha = texture2D(u_texture, v_uv + sampleOffset).a;
                
                alpha += sampleAlpha * weight;
                totalWeight += weight;
            }
            
            // Normalize to ensure proper blending
            alpha = totalWeight > 0.0 ? alpha / totalWeight : 0.0;
            
            // Always output pure white RGB, only blur the alpha
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
    `

    // Composite shader - combines scene with bloom using proper blending
    const compositeFragmentShader = `
        precision mediump float;
        varying vec2 v_uv;
        uniform sampler2D u_scene;
        uniform sampler2D u_bloom;
        uniform float u_bloom_intensity;
        uniform vec3 u_transition_color;
        
        void main() {
            vec4 scene = texture2D(u_scene, v_uv);
            vec4 bloom = texture2D(u_bloom, v_uv);
            
            // Bloom strength - use bloom alpha directly, scaled by intensity
            float bloomStrength = bloom.a * u_bloom_intensity;
            
            // Simple additive bloom that works on any background
            // For transparent areas, output the bloom glow directly
            // For solid areas, add bloom on top
            
            vec3 bloomColor = u_transition_color * bloomStrength * 2.0;
            
            if (scene.a < 0.001) {
                // Transparent area - output bloom glow directly
                // Use the transition color with bloom-derived alpha
                float glowAlpha = bloomStrength * 1.5;
                gl_FragColor = vec4(u_transition_color, glowAlpha);
            } else {
                // Solid area - add bloom on top (additive)
                vec3 result = scene.rgb + bloomColor;
                // Clamp to valid range
                result = min(result, vec3(1.0));
                gl_FragColor = vec4(result, scene.a);
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

        // Create extract program (for bloom extraction)
        const extractFragmentShaderObj = createShader(
            gl,
            gl.FRAGMENT_SHADER,
            extractFragmentShader
        )
        if (extractFragmentShaderObj) {
            const extractProgram = createProgram(
                gl,
                vertexShaderObj,
                extractFragmentShaderObj
            )
            if (extractProgram) {
                extractProgramRef.current = extractProgram
            }
        }

        // Create blur program
        const blurFragmentShaderObj = createShader(
            gl,
            gl.FRAGMENT_SHADER,
            blurFragmentShader
        )
        if (blurFragmentShaderObj) {
            const blurProgram = createProgram(
                gl,
                vertexShaderObj,
                blurFragmentShaderObj
            )
            if (blurProgram) {
                blurProgramRef.current = blurProgram
            }
        }

        // Create composite program
        const compositeFragmentShaderObj = createShader(
            gl,
            gl.FRAGMENT_SHADER,
            compositeFragmentShader
        )
        if (compositeFragmentShaderObj) {
            const compositeProgram = createProgram(
                gl,
                vertexShaderObj,
                compositeFragmentShaderObj
            )
            if (compositeProgram) {
                compositeProgramRef.current = compositeProgram
            }
        }

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

        // Create framebuffers for bloom (initial size, will be resized)
        const initialWidth = 256
        const initialHeight = 256

        const { framebuffer: fb1, texture: tex1 } = createFramebufferTexture(
            gl,
            initialWidth,
            initialHeight
        )
        framebufferRef.current = fb1
        sceneTextureRef.current = tex1

        const { framebuffer: fbExtract, texture: texExtract } =
            createFramebufferTexture(gl, initialWidth, initialHeight)
        extractFramebufferRef.current = fbExtract
        extractTextureRef.current = texExtract

        const { framebuffer: fb2, texture: tex2 } = createFramebufferTexture(
            gl,
            initialWidth,
            initialHeight
        )
        blurFramebuffer1Ref.current = fb2
        blurTexture1Ref.current = tex2

        const { framebuffer: fb3, texture: tex3 } = createFramebufferTexture(
            gl,
            initialWidth,
            initialHeight
        )
        blurFramebuffer2Ref.current = fb3
        blurTexture2Ref.current = tex3

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

        // Animation loop - optimized
        const animate = () => {
            if (glRef.current && programRef.current) {
                // Update parallax if enabled
                if (parallaxEnabledRef.current) {
                    updateParallaxOffset()
                }
                // Always render (updateParallaxOffset doesn't call render anymore)
                render()
            }
            animationFrameRef.current = requestAnimationFrame(animate)
        }
        animationFrameRef.current = requestAnimationFrame(animate)

        // Track scroll for animation and parallax
        const scrollHandler = () => {
            // In canvas mode with preview off, don't update scroll offset (freeze animation)
            const shouldAnimate = !(isCanvas && !previewRef.current)
            
            const currentScrollY = window.scrollY || window.pageYOffset
            const currentTime = performance.now()

            if (lastScrollTimeRef.current > 0 && shouldAnimate) {
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

            // Update parallax offset on scroll (still needed for parallax to work)
            if (shouldAnimate || parallaxEnabledRef.current) {
                updateParallaxOffset()
            }
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
                if (extractProgramRef.current)
                    gl.deleteProgram(extractProgramRef.current)
                if (blurProgramRef.current)
                    gl.deleteProgram(blurProgramRef.current)
                if (compositeProgramRef.current)
                    gl.deleteProgram(compositeProgramRef.current)
                if (framebufferRef.current)
                    gl.deleteFramebuffer(framebufferRef.current)
                if (sceneTextureRef.current)
                    gl.deleteTexture(sceneTextureRef.current)
                if (extractFramebufferRef.current)
                    gl.deleteFramebuffer(extractFramebufferRef.current)
                if (extractTextureRef.current)
                    gl.deleteTexture(extractTextureRef.current)
                if (blurFramebuffer1Ref.current)
                    gl.deleteFramebuffer(blurFramebuffer1Ref.current)
                if (blurTexture1Ref.current)
                    gl.deleteTexture(blurTexture1Ref.current)
                if (blurFramebuffer2Ref.current)
                    gl.deleteFramebuffer(blurFramebuffer2Ref.current)
                if (blurTexture2Ref.current)
                    gl.deleteTexture(blurTexture2Ref.current)
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
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#D9D6CA",
    },
    transitionColor: {
        type: ControlType.Color,
        title: "Transition",
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
    bloomIntensity: {
        type: ControlType.Number,
        title: "Bloom",
        defaultValue: 0.5,
        min: 0.0,
        max: 1.0,
        step: 0.1,
    },
    bloomRadius: {
        type: ControlType.Number,
        title: "Bloom Width",
        defaultValue: 0.1,
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
    movement: {
        type: ControlType.Object,
        title:"Movement",
        description:"More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            horizontal: {
                type: ControlType.Enum,
                title: "Horizontal",
                options: ["left", "center", "right"],
                optionTitles: ["<-", "•", "->"],
                defaultValue: "center",
                displaySegmentedControl: true,
            },
            vertical: {
                type: ControlType.Number,
                title: "Vertical",
                defaultValue: 0.5,
                step: 0.1,
                min: 0,
                max: 1,
                description:"Set parallax = Off to see better what this does."
            },
        },
        defaultValue: {
            horizontal: "center",
            vertical: 0.5,
        },
    },
    
})

BurnTransition.displayName="Burn Transition"