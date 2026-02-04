import React, { useEffect, useRef, useCallback } from "react"
import { addPropertyControls, ControlType } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// ============================================================================
// TYPES
// ============================================================================

type ResponsiveImageSource =
    | string
    | {
          src?: string
          srcSet?: string | Array<{ src?: string }>
          url?: string
          default?: string
          asset?: { url?: string }
          alt?: string
      }
    | null
    | undefined

interface StickerDragProps {
    image?: ResponsiveImageSource
    tiltSensitivity?: number
    tiltSmoothing?: number
    sheenStrength?: number
    sheenMode?: "sheen" | "holo"
    style?: React.CSSProperties
}

// ============================================================================
// CONSTANTS (matching original source exactly)
// ============================================================================

const RENDER_SCALE = 2
const PAD = 20
const MESH_GRID_SIZE = 32 // Must use grid for smooth wave deformation
const DRAG_Z_INDEX_BASE = 1000 // Base z-index for dragged stickers

// Global counter to ensure each dragged sticker gets a unique, incrementing z-index
let zIndexCounter = DRAG_Z_INDEX_BASE

/**
 * Get the next z-index value for a dragged sticker
 * Increments the global counter so the most recently dragged sticker is always on top
 */
function getNextZIndex(): number {
    zIndexCounter += 1
    return zIndexCounter
}

// Tweakables from original
const DRAG_TILT_SENSITIVITY = 3
const DRAG_MAX_TILT_DEG = 30
const DRAG_TILT_SMOOTHING = 0.05
const SHEEN_STRENGTH = 0.6
const SHEEN_TILT_SHIFT = 0.05
const SHEEN_TILT_DEADZONE = 0.035
const ANIM_SPEED = 1.92

// ============================================================================
// WebGL Shaders (from original source)
// ============================================================================

const VERTEX_SHADER = `
attribute vec2 aPos;
attribute vec2 aUV;
uniform float uPeel;
uniform float uLift;
uniform float uPeelAngle;
uniform float uPasting;
uniform float uScale;
varying vec2 vUV;
varying float vHi;
varying float vSh;

void main() {
    vUV = aUV;
    vec2 p = aPos;
    vHi = 0.0;
    vSh = 0.0;
    
    if (uPeel > 0.0) {
        vec2 peelAxis = vec2(cos(uPeelAngle), sin(uPeelAngle));
        vec2 uvCentered = aUV - vec2(0.5);
        float proj = dot(uvCentered, peelAxis);
        float diag = 0.5 - proj;
        
        // Peel line travels across sticker and EXITS completely
        float peelLine = -0.3 + uPeel * 2.0;
        
        // How "lifted" is this vertex? 0 = flat, 1 = fully lifted
        float rampWidth = 0.6;
        float lifted = smoothstep(peelLine - rampWidth, peelLine, diag);
        lifted = 1.0 - lifted;
        
        // Scale based on how lifted
        float scale = 1.0 + lifted * 0.12;
        p *= scale;
        
        // Curve outward at the ramp (creates the bent paper look)
        float inRamp = smoothstep(peelLine - rampWidth, peelLine - rampWidth * 0.5, diag) *
                       smoothstep(peelLine + 0.05, peelLine - rampWidth * 0.3, diag);
        
        float curveAmount = uPasting > 0.5 ? 0.06 : 0.12;
        p += (-peelAxis) * inRamp * curveAmount;
        
        // Shading on the curved ramp
        float t = smoothstep(peelLine - rampWidth, peelLine, diag);
        vHi = inRamp * 0.75 * pow(1.0 - t, 1.2);
        vSh = inRamp * 0.75 * pow(t, 1.2);
    }
    
    // Apply scale to fit within padded canvas area
    gl_Position = vec4(p * uScale, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uTilt;
uniform float uSheenStrength;
uniform float uSheenTiltShift;
uniform float uSheenTiltDeadzone;
uniform float uMaxTiltDeg;
uniform float uHoloMode;
varying vec2 vUV;
varying float vHi;
varying float vSh;

vec3 overlayBlend(vec3 base, vec3 blend) {
    return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
}

vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

void main() {
    vec4 tex = texture2D(uTex, vUV);
    if (tex.a < 0.01) discard;
    
    vec3 c = tex.rgb * 0.95;
    
    // Sheen/holo effect
    float maxTilt = max(0.001, uMaxTiltDeg);
    float tiltMag = clamp(length(uTilt) / maxTilt, 0.0, 1.0);
    float tiltGate = smoothstep(uSheenTiltDeadzone, 1.0, tiltMag);
    
    float gradient = fract(vUV.x * 0.5 + vUV.y * 0.5 + uTilt.x * uSheenTiltShift + uTilt.y * uSheenTiltShift);
    
    if (uHoloMode > 0.5) {
        float holoStrength = uSheenStrength;
        float distFromWhite = length(tex.rgb - vec3(1.0));
        float nonWhiteMask = smoothstep(0.06, 0.22, distFromWhite);
        vec3 rainbow = hsl2rgb(gradient, 0.8, 0.55);
        c = mix(c, rainbow, holoStrength * nonWhiteMask * tex.a);
    } else {
        float effectStrength = uSheenStrength * tiltGate;
        float sheen = smoothstep(0.2, 0.5, gradient) * (1.0 - smoothstep(0.5, 0.8, gradient));
        c = mix(c, vec3(1.0), sheen * effectStrength * tex.a);
    }
    
    // Peel/paste lighting
    float hiW = clamp(vHi, 0.0, 1.0) * 0.55;
    float shW = clamp(vSh, 0.0, 1.0) * 0.60;

    vec3 hi = overlayBlend(c, vec3(1.0));
    c = mix(c, hi, hiW);

    vec3 sh = overlayBlend(c, vec3(0.0));
    c = mix(c, sh, shW);
    c *= (1.0 - shW * 0.35);
    
    c = clamp(c, 0.0, 1.0);
    gl_FragColor = vec4(c, tex.a);
}
`

// ============================================================================
// UTILITIES
// ============================================================================

const resolveImageSource = (
    input?: ResponsiveImageSource
): string | undefined => {
    if (!input) return undefined
    if (typeof input === "string") return input.trim() || undefined
    return input.src || input.url || input.asset?.url || undefined
}

/**
 * Calculates contained dimensions (like CSS object-fit: contain)
 * Maintains image aspect ratio while fitting within container bounds
 */
function calculateContainedDimensions(
    containerWidth: number,
    containerHeight: number,
    imageAspectRatio: number | null
): { width: number; height: number } {
    // If no image aspect ratio yet, use container dimensions
    if (!imageAspectRatio) {
        return { width: containerWidth, height: containerHeight }
    }

    const containerAspect = containerWidth / containerHeight

    if (containerAspect > imageAspectRatio) {
        // Container is wider than image: fit to height
        return {
            width: containerHeight * imageAspectRatio,
            height: containerHeight,
        }
    } else {
        // Container is taller than image: fit to width
        return {
            width: containerWidth,
            height: containerWidth / imageAspectRatio,
        }
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function StickerDrag({
    image,
    tiltSensitivity = DRAG_TILT_SENSITIVITY,
    tiltSmoothing = DRAG_TILT_SMOOTHING,
    sheenStrength = SHEEN_STRENGTH,
    sheenMode = "sheen" as const,
    style,
}: StickerDragProps) {
    // Check if image is missing
    const imageSrc = resolveImageSource(image)
    const hasImage = !!imageSrc

    // Show ComponentMessage if no image is provided
    if (!hasImage) {
        return (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    position: "relative",
                    ...style,
                }}
            >
                <div
                    style={{
                        height: "100%",
                        width: "100%",
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <ComponentMessage
                        style={{
                            position: "absolute",
                            inset: 0,
                            
                            
                        }}
                        title="Sticker Drag"
                        subtitle="Add an image to create an interactive draggable sticker with 3D effects"
                    />
                </div>
            </div>
        )
    }

    const containerRef = useRef<HTMLDivElement>(null)
    const stickerRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // WebGL refs
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const textureRef = useRef<WebGLTexture | null>(null)
    const vboRef = useRef<WebGLBuffer | null>(null)
    const iboRef = useRef<WebGLBuffer | null>(null)
    const indexCountRef = useRef<number>(0)

    // State refs (using refs instead of state for animation performance)
    const stateRef = useRef({
        // Position
        x: 0,
        y: 0,
        width: 200,
        height: 200,

        // Image aspect ratio for contained sizing
        imageAspectRatio: null as number | null,

        // Scale factor for fitting content within padded canvas
        scale: 1.0,

        // Drag state
        held: false,
        peeling: false,
        sticking: false,
        dragStartX: 0,
        dragStartY: 0,
        dragOrigX: 0,
        dragOrigY: 0,

        // Peel/wave animation
        peel: 0,
        lift: 0,
        peelAngle: -Math.PI / 4,

        // Tilt (CSS 3D transform)
        dragTiltX: 0,
        dragTiltY: 0,
        currentTiltX: 0,
        currentTiltY: 0,

        // Velocity tracking
        lastMoveX: 0,
        lastMoveY: 0,
        lastMoveT: 0,

        // Animation
        texReady: false,
    })

    const animationRef = useRef<number | null>(null)
    const lastTickTRef = useRef<number | null>(null)

    // Draw function
    const draw = useCallback(() => {
        const gl = glRef.current
        const program = programRef.current
        const texture = textureRef.current
        const state = stateRef.current

        if (!gl || !program || !texture || !state.texReady) return

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        gl.useProgram(program)

        gl.bindBuffer(gl.ARRAY_BUFFER, vboRef.current)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboRef.current)

        const aPos = gl.getAttribLocation(program, "aPos")
        const aUV = gl.getAttribLocation(program, "aUV")
        gl.enableVertexAttribArray(aPos)
        gl.enableVertexAttribArray(aUV)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0)
        gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8)

        // Set uniforms
        gl.uniform1f(gl.getUniformLocation(program, "uPeel"), state.peel)
        gl.uniform1f(gl.getUniformLocation(program, "uLift"), state.lift)
        gl.uniform1f(
            gl.getUniformLocation(program, "uPeelAngle"),
            state.peelAngle
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uPasting"),
            state.sticking ? 1.0 : 0.0
        )
        gl.uniform1f(gl.getUniformLocation(program, "uScale"), state.scale)

        gl.uniform2f(
            gl.getUniformLocation(program, "uTilt"),
            state.currentTiltX,
            state.currentTiltY
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uSheenStrength"),
            sheenStrength
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uSheenTiltShift"),
            SHEEN_TILT_SHIFT
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uSheenTiltDeadzone"),
            SHEEN_TILT_DEADZONE
        )
        gl.uniform1f(gl.getUniformLocation(program, "uMaxTiltDeg"), DRAG_MAX_TILT_DEG)
        gl.uniform1f(
            gl.getUniformLocation(program, "uHoloMode"),
            sheenMode === "holo" ? 1.0 : 0.0
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0)

        gl.drawElements(
            gl.TRIANGLES,
            indexCountRef.current,
            gl.UNSIGNED_SHORT,
            0
        )
    }, [sheenStrength, sheenMode])

    // Update shadow CSS based on peel/lift
    const updateShadowCSS = useCallback(() => {
        const canvas = canvasRef.current
        const state = stateRef.current
        if (!canvas) return

        const tRaw = Math.max(state.lift, state.peel)
        const t = tRaw * tRaw * (3 - 2 * tRaw) // smoothstep easing

        const y = 1 + t * 12
        const blur = 2 + t * 12
        canvas.style.filter = `drop-shadow(0px ${y.toFixed(2)}px ${blur.toFixed(2)}px rgba(0, 0, 0, 0.30))`
    }, [])

    // Animation tick (from original source)
    const tick = useCallback(
        (timestamp: number) => {
            const state = stateRef.current

            if (lastTickTRef.current === null) {
                lastTickTRef.current = timestamp
            }

            const dt = Math.min((timestamp - lastTickTRef.current) / 1000, 0.1)
            lastTickTRef.current = timestamp

            const step = ANIM_SPEED * dt
            let changed = false

            if (state.peeling) {
                // Peel and lift animate up together
                if (state.peel < 1 || state.lift < 1) {
                    state.peel = Math.min(1, state.peel + step)
                    state.lift = Math.min(1, state.lift + step)
                    changed = true
                }
            }

            if (state.sticking) {
                // Paste animation: peel and lift animate down together
                if (state.peel > 0 || state.lift > 0) {
                    state.peel = Math.max(0, state.peel - step)
                    state.lift = Math.max(0, state.lift - step)
                    changed = true
                } else {
                    state.sticking = false
                }
            }

            if (changed) {
                updateShadowCSS()
            }

            // Redraw while held or animating
            if (changed || state.held) {
                draw()
            }

            // Continue ticking if needed
            if (state.held || state.peeling || state.sticking) {
                animationRef.current = requestAnimationFrame(tick)
            } else {
                animationRef.current = null
                lastTickTRef.current = null
            }
        },
        [draw, updateShadowCSS]
    )

    // Start animation loop
    const ensureTickRunning = useCallback(() => {
        if (animationRef.current !== null) return
        lastTickTRef.current = null
        animationRef.current = requestAnimationFrame(tick)
    }, [tick])

    // Initialize WebGL
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
        })
        if (!gl) return

        glRef.current = gl

        // Compile shaders
        const compileShader = (
            source: string,
            type: number
        ): WebGLShader | null => {
            const shader = gl.createShader(type)
            if (!shader) return null
            gl.shaderSource(shader, source)
            gl.compileShader(shader)
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(
                    "Shader compile error:",
                    gl.getShaderInfoLog(shader)
                )
                gl.deleteShader(shader)
                return null
            }
            return shader
        }

        const vs = compileShader(VERTEX_SHADER, gl.VERTEX_SHADER)
        const fs = compileShader(FRAGMENT_SHADER, gl.FRAGMENT_SHADER)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return

        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program))
            return
        }

        programRef.current = program

        // Create grid mesh (32x32 for smooth wave deformation)
        const N = MESH_GRID_SIZE
        const verts: number[] = []
        const inds: number[] = []

        for (let j = 0; j <= N; j++) {
            for (let i = 0; i <= N; i++) {
                // Position: -1 to 1
                // UV: 0 to 1 (flip V coordinate so image is right-side up)
                verts.push(
                    (i / N) * 2 - 1,
                    (j / N) * 2 - 1,
                    i / N,
                    1 - j / N // Flip V coordinate
                )
            }
        }

        for (let j = 0; j < N; j++) {
            for (let i = 0; i < N; i++) {
                const a = j * (N + 1) + i
                inds.push(a, a + 1, a + N + 1, a + 1, a + N + 2, a + N + 1)
            }
        }

        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
        vboRef.current = vbo

        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(inds),
            gl.STATIC_DRAW
        )
        iboRef.current = ibo
        indexCountRef.current = inds.length

        // Clear immediately
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            gl.deleteProgram(program)
            if (vboRef.current) gl.deleteBuffer(vboRef.current)
            if (iboRef.current) gl.deleteBuffer(iboRef.current)
            if (textureRef.current) gl.deleteTexture(textureRef.current)
        }
    }, [])

    // Resize handler
    const handleResize = useCallback(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        const sticker = stickerRef.current
        const gl = glRef.current
        const state = stateRef.current

        if (!container || !canvas || !sticker || !gl) return

        const containerWidth = container.clientWidth || 200
        const containerHeight = container.clientHeight || 200

        // Calculate contained dimensions (maintain aspect ratio)
        const { width, height } = calculateContainedDimensions(
            containerWidth,
            containerHeight,
            state.imageAspectRatio
        )

        // Add padding to canvas for extra space to prevent clipping during animations
        const canvasWidth = width + PAD * 2
        const canvasHeight = height + PAD * 2

        // Calculate scale factor to fit content within padded canvas
        // Use the smaller scale to ensure content fits in both dimensions
        const scaleX = width / canvasWidth
        const scaleY = height / canvasHeight
        const scale = Math.min(scaleX, scaleY)

        // Center the sticker within the container
        const x = (containerWidth - width) / 2
        const y = (containerHeight - height) / 2

        // Update canvas size (larger with padding)
        canvas.width = Math.round(canvasWidth * RENDER_SCALE)
        canvas.height = Math.round(canvasHeight * RENDER_SCALE)
        canvas.style.width = `${canvasWidth}px`
        canvas.style.height = `${canvasHeight}px`
        
        // Center canvas within sticker element (canvas is larger due to padding)
        canvas.style.position = "absolute"
        canvas.style.left = `${-PAD}px`
        canvas.style.top = `${-PAD}px`

        // Update sticker element size and position (centered, visible size without padding)
        sticker.style.width = `${width}px`
        sticker.style.height = `${height}px`
        sticker.style.left = `${x}px`
        sticker.style.top = `${y}px`

        // Update state
        state.width = width
        state.height = height
        state.x = x
        state.y = y
        state.scale = scale

        // Update WebGL viewport
        gl.viewport(0, 0, canvas.width, canvas.height)

        // Redraw if texture is ready
        if (state.texReady) {
            draw()
        }
    }, [draw])

    // Load image
    useEffect(() => {
        const imageSrc = resolveImageSource(image)
        if (!imageSrc) return

        const gl = glRef.current
        if (!gl || !programRef.current) return

        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
            const state = stateRef.current

            // Store image aspect ratio for contained sizing
            state.imageAspectRatio = img.width / img.height

            // Load texture
            if (textureRef.current) {
                gl.deleteTexture(textureRef.current)
            }

            const texture = gl.createTexture()
            if (!texture) return

            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

            textureRef.current = texture
            state.texReady = true

            // Resize with contained dimensions
            handleResize()
            updateShadowCSS()
        }

        img.onerror = () => {
            console.error("Failed to load image")
        }

        img.src = imageSrc

        return () => {
            stateRef.current.texReady = false
        }
    }, [image, handleResize, updateShadowCSS])

    // Handle container resize
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Initial resize
        handleResize()

        // Use ResizeObserver to watch for size changes
        const resizeObserver = new ResizeObserver(() => {
            handleResize()
        })

        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
        }
    }, [handleResize])

    // Mouse down handler
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            const state = stateRef.current
            const container = containerRef.current
            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!container || !sticker || !inner) return

            const rect = sticker.getBoundingClientRect()

            // Calculate grab point for tilt pivot
            const grabOffsetX = e.clientX - rect.left
            const grabOffsetY = e.clientY - rect.top
            inner.style.transformOrigin = `${grabOffsetX}px ${grabOffsetY}px`

            // Calculate angle from sticker center to click point
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const dx = e.clientX - centerX
            const dy = e.clientY - centerY // Y goes down in screen coords, matches flipped UV
            state.peelAngle = Math.atan2(dy, dx)

            // Store drag start
            state.dragStartX = e.clientX
            state.dragStartY = e.clientY
            state.dragOrigX = state.x
            state.dragOrigY = state.y

            // Reset state for new peel
            state.peel = 0
            state.lift = 0

            state.held = true
            state.peeling = true
            state.sticking = false

            // Reset velocity tracking
            state.lastMoveX = e.clientX
            state.lastMoveY = e.clientY
            state.lastMoveT = performance.now()

            // Bring container to front by setting incrementing z-index
            container.style.zIndex = `${getNextZIndex()}`

            // Start animation loop
            ensureTickRunning()
        },
        [ensureTickRunning]
    )

    // Mouse move handler
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const state = stateRef.current
            if (!state.held) return

            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!sticker || !inner) return

            // Update position
            state.x = state.dragOrigX + (e.clientX - state.dragStartX)
            state.y = state.dragOrigY + (e.clientY - state.dragStartY)
            sticker.style.left = `${state.x}px`
            sticker.style.top = `${state.y}px`

            // Calculate velocity
            const now = performance.now()
            const dt = Math.max(1, now - state.lastMoveT)
            const velX = ((e.clientX - state.lastMoveX) / dt) * 16 // normalize to ~60fps
            const velY = ((e.clientY - state.lastMoveY) / dt) * 16
            state.lastMoveX = e.clientX
            state.lastMoveY = e.clientY
            state.lastMoveT = now

            // Tilt based on velocity (clamped)
            const targetTiltY = Math.max(
                -DRAG_MAX_TILT_DEG,
                Math.min(DRAG_MAX_TILT_DEG, velX * tiltSensitivity)
            )
            const targetTiltX = Math.max(
                -DRAG_MAX_TILT_DEG,
                Math.min(DRAG_MAX_TILT_DEG, -velY * tiltSensitivity)
            )

            // Smooth toward target
            state.dragTiltX += (targetTiltX - state.dragTiltX) * tiltSmoothing
            state.dragTiltY += (targetTiltY - state.dragTiltY) * tiltSmoothing

            // Store for shader
            state.currentTiltX = state.dragTiltX
            state.currentTiltY = state.dragTiltY

            // Apply CSS 3D transform for tilt
            inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
        }

        const handleMouseUp = () => {
            const state = stateRef.current
            if (!state.held) return

            const inner = innerRef.current

            state.held = false
            state.peeling = false
            state.sticking = true

            // Reverse peel angle for paste if peel completed
            if (state.peel >= 0.95 && inner) {
                const rect = inner.getBoundingClientRect()
                const centerX = rect.left + rect.width / 2
                const centerY = rect.top + rect.height / 2
                const dx = state.lastMoveX - centerX
                const dy = state.lastMoveY - centerY // Y goes down in screen coords
                state.peelAngle = Math.atan2(-dy, -dx)
                state.peel = 1
            }

            // Animate tilt back to zero
            const settleTilt = () => {
                state.dragTiltX *= 0.9
                state.dragTiltY *= 0.9
                state.currentTiltX = state.dragTiltX
                state.currentTiltY = state.dragTiltY

                if (inner) {
                    inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
                }

                if (
                    Math.abs(state.dragTiltX) > 0.1 ||
                    Math.abs(state.dragTiltY) > 0.1
                ) {
                    requestAnimationFrame(settleTilt)
                } else {
                    state.dragTiltX = 0
                    state.dragTiltY = 0
                    state.currentTiltX = 0
                    state.currentTiltY = 0
                    if (inner) {
                        inner.style.transform = ""
                    }
                }
            }
            settleTilt()

            // Continue animation for paste
            ensureTickRunning()
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [tiltSensitivity, tiltSmoothing, ensureTickRunning])

    // Touch handlers
    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault()
            const touch = e.touches[0]
            if (!touch) return

            const state = stateRef.current
            const container = containerRef.current
            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!container || !sticker || !inner) return

            const rect = sticker.getBoundingClientRect()

            const grabOffsetX = touch.clientX - rect.left
            const grabOffsetY = touch.clientY - rect.top
            inner.style.transformOrigin = `${grabOffsetX}px ${grabOffsetY}px`

            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const dx = touch.clientX - centerX
            const dy = touch.clientY - centerY // Y goes down in screen coords, matches flipped UV
            state.peelAngle = Math.atan2(dy, dx)

            state.dragStartX = touch.clientX
            state.dragStartY = touch.clientY
            state.dragOrigX = state.x
            state.dragOrigY = state.y

            state.peel = 0
            state.lift = 0

            state.held = true
            state.peeling = true
            state.sticking = false

            state.lastMoveX = touch.clientX
            state.lastMoveY = touch.clientY
            state.lastMoveT = performance.now()

            // Bring container to front by setting incrementing z-index
            container.style.zIndex = `${getNextZIndex()}`

            ensureTickRunning()
        },
        [ensureTickRunning]
    )

    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0]
            if (!touch) return

            const state = stateRef.current
            if (!state.held) return

            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!sticker || !inner) return

            state.x = state.dragOrigX + (touch.clientX - state.dragStartX)
            state.y = state.dragOrigY + (touch.clientY - state.dragStartY)
            sticker.style.left = `${state.x}px`
            sticker.style.top = `${state.y}px`

            const now = performance.now()
            const dt = Math.max(1, now - state.lastMoveT)
            const velX = ((touch.clientX - state.lastMoveX) / dt) * 16
            const velY = ((touch.clientY - state.lastMoveY) / dt) * 16
            state.lastMoveX = touch.clientX
            state.lastMoveY = touch.clientY
            state.lastMoveT = now

            const targetTiltY = Math.max(
                -DRAG_MAX_TILT_DEG,
                Math.min(DRAG_MAX_TILT_DEG, velX * tiltSensitivity)
            )
            const targetTiltX = Math.max(
                -DRAG_MAX_TILT_DEG,
                Math.min(DRAG_MAX_TILT_DEG, -velY * tiltSensitivity)
            )

            state.dragTiltX += (targetTiltX - state.dragTiltX) * tiltSmoothing
            state.dragTiltY += (targetTiltY - state.dragTiltY) * tiltSmoothing

            state.currentTiltX = state.dragTiltX
            state.currentTiltY = state.dragTiltY

            inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
        }

        const handleTouchEnd = () => {
            const state = stateRef.current
            if (!state.held) return

            const inner = innerRef.current

            state.held = false
            state.peeling = false
            state.sticking = true

            if (state.peel >= 0.95 && inner) {
                const rect = inner.getBoundingClientRect()
                const centerX = rect.left + rect.width / 2
                const centerY = rect.top + rect.height / 2
                const dx = state.lastMoveX - centerX
                const dy = state.lastMoveY - centerY // Y goes down in screen coords
                state.peelAngle = Math.atan2(-dy, -dx)
                state.peel = 1
            }

            const settleTilt = () => {
                state.dragTiltX *= 0.9
                state.dragTiltY *= 0.9
                state.currentTiltX = state.dragTiltX
                state.currentTiltY = state.dragTiltY

                if (inner) {
                    inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
                }

                if (
                    Math.abs(state.dragTiltX) > 0.1 ||
                    Math.abs(state.dragTiltY) > 0.1
                ) {
                    requestAnimationFrame(settleTilt)
                } else {
                    state.dragTiltX = 0
                    state.dragTiltY = 0
                    state.currentTiltX = 0
                    state.currentTiltY = 0
                    if (inner) {
                        inner.style.transform = ""
                    }
                }
            }
            settleTilt()

            ensureTickRunning()
        }

        window.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        })
        window.addEventListener("touchend", handleTouchEnd)

        return () => {
            window.removeEventListener("touchmove", handleTouchMove)
            window.removeEventListener("touchend", handleTouchEnd)
        }
    }, [tiltSensitivity, tiltSmoothing, ensureTickRunning])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
                perspective: "800px",
                ...style,
            }}
        >
            <div
                ref={stickerRef}
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    cursor: "grab",
                    userSelect: "none",
                    perspective: "800px",
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                    overflow: "visible",
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div
                    ref={innerRef}
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        transformStyle: "preserve-3d",
                        overflow: "visible",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: "block",
                            pointerEvents: "none",
                            position: "absolute",
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// PROPERTY CONTROLS
// ============================================================================

addPropertyControls(StickerDrag, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    tiltSensitivity: {
        type: ControlType.Number,
        title: "Tilt",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: DRAG_TILT_SENSITIVITY,
    },
    sheenStrength: {
        type: ControlType.Number,
        title: "Lighting",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: SHEEN_STRENGTH,
    },
    sheenMode: {
        type: ControlType.Enum,
        title: "Sheen",
        options: ["sheen", "holo"],
        optionTitles: ["Sheen", "Holographic"],
        defaultValue: "sheen",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

StickerDrag.displayName = "Sticker Drag"
