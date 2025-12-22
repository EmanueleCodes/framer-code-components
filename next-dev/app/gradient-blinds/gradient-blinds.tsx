import React, { useEffect, useRef, useState } from "react"
import {
    Renderer,
    Program,
    Mesh,
    Triangle,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/blinds.js"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface GradientBlindsProps {
    dpr?: number
    paused?: boolean
    angle?: number
    noise?: number
    amount?: number
    mirrorGradient?: "no mirror" | "mirror"
    spotlight?: {
        radius?: number
        softness?: number
        opacity?: number
        mouseDampening?: number
    }
    distortAmount?: number
    shineDirection?: "left" | "right"
    colors?: {
        paletteCount?: number
        color1?: string
        color2?: string
        color3?: string
        color4?: string
        color5?: string
        color6?: string
        color7?: string
        color8?: string
        bgColor?: string
    }
}

const MAX_COLORS = 8

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

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()

    // rgba(R,G,B,A)
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

    // #RRGGBBAA or #RRGGBB
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        const a = parseInt(hex.slice(6, 8), 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return { r, g, b, a: 1 }
    }
    if (hex.length === 4) {
        // #RGBA
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        const a = parseInt(hex[3] + hex[3], 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 3) {
        // #RGB
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        return { r, g, b, a: 1 }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

const hexToRGB = (hex: string): [number, number, number] => {
    const c = hex.replace("#", "").padEnd(6, "0")
    const r = parseInt(c.slice(0, 2), 16) / 255
    const g = parseInt(c.slice(2, 4), 16) / 255
    const b = parseInt(c.slice(4, 6), 16) / 255
    return [r, g, b]
}
const prepStops = (stops?: string[], paletteCount?: number) => {
    // Ensure we have valid colors and handle edge cases
    let base: string[]

    if (stops && Array.isArray(stops) && stops.length > 0) {
        // Filter out invalid colors, resolve CSS variables, and ensure they have # prefix
        base = stops
            .filter(
                (color) =>
                    color && typeof color === "string" && color.trim() !== ""
            )
            .map((color) => {
                const resolved = resolveTokenColor(color)
                const rgba = parseColorToRgba(resolved)
                // Convert back to hex for the shader
                const toHex = (v: number) =>
                    Math.round(v * 255)
                        .toString(16)
                        .padStart(2, "0")
                return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`
            })
            .slice(0, MAX_COLORS)
    } else {
        base = ["#FF9FFC", "#5227FF"]
    }

    // Ensure we have at least 2 colors
    if (base.length === 0) {
        base = ["#FF9FFC", "#5227FF"]
    } else if (base.length === 1) {
        base.push(base[0])
    }

    // Fill remaining slots with the last color
    while (base.length < MAX_COLORS) {
        base.push(base[base.length - 1])
    }

    const arr: [number, number, number][] = []
    for (let i = 0; i < MAX_COLORS; i++) {
        arr.push(hexToRGB(base[i]))
    }

    // Use the actual number of colors provided, not the padded array length
    const actualCount = Math.max(
        1,
        Math.min(MAX_COLORS, paletteCount || stops?.length || 2)
    )

    return { arr, count: actualCount }
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function GradientBlinds({
    dpr,
    paused = false,
    angle = 0,
    noise = 0.3,
    amount = 50,
    mirrorGradient = "no mirror",
    spotlight = { radius: 0.5, softness: 1, opacity: 1, mouseDampening: 0.3 },
    distortAmount = 0,
    shineDirection = "left",
    colors = {
        paletteCount: 2,
        color1: "#FF9FFC",
        color2: "#5227FF",
        bgColor: "#000000",
    },
}: GradientBlindsProps) {
    const mouseDampening = spotlight?.mouseDampening || 0.3

    // Convert amount (1-100) to blindMinWidth (500-10px) - inverted mapping
    const blindMinWidth = 500 - ((amount - 1) * (500 - 10)) / (100 - 1)

    const containerRef = useRef<HTMLDivElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const programRef = useRef<typeof Program | null>(null)
    const meshRef = useRef<typeof Mesh | null>(null)
    const geometryRef = useRef<typeof Triangle | null>(null)
    const rendererRef = useRef<typeof Renderer | null>(null)
    const mouseTargetRef = useRef<[number, number]>([0, 0]) // Will be set to center in useEffect
    const lastTimeRef = useRef<number>(0)
    const firstResizeRef = useRef<boolean>(true)
    const isPreviewMode = RenderTarget.current() === RenderTarget.preview
    const uniformsRef = useRef<any>(null) // Store uniforms reference for updates

    // Detect mobile: disable mouse interaction on mobile devices
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const checkMobile = () => {
            const coarse =
                typeof window !== "undefined" && window.matchMedia
                    ? window.matchMedia("(pointer: coarse)").matches
                    : false
            const small =
                typeof window !== "undefined" && window.matchMedia
                    ? window.matchMedia("(max-width: 768px)").matches
                    : false
            setIsMobile(coarse || small)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Update uniforms when properties change (especially important for Canvas mode)
    useEffect(() => {
        if (!uniformsRef.current) return

        const uniforms = uniformsRef.current

        // Update angle
        uniforms.uAngle.value = (angle * Math.PI) / 180

        // Update noise
        uniforms.uNoise.value = noise

        // Update spotlight properties
        if (spotlight) {
            uniforms.uSpotlightRadius.value = (spotlight.radius ?? 0.5) * 2
            uniforms.uSpotlightSoftness.value = (spotlight.softness ?? 1) * 3
            uniforms.uSpotlightOpacity.value = spotlight.opacity ?? 1
        }

        // Update mirror gradient
        uniforms.uMirror.value = mirrorGradient === "mirror" ? 1 : 0

        // Update distort amount
        uniforms.uDistort.value = distortAmount * 10

        // Update shine direction
        uniforms.uShineFlip.value = shineDirection === "right" ? 1 : 0

        // Update colors
        const { arr: colorArr, count: colorCount } = prepStops(
            [
                colors?.color1,
                colors?.color2,
                colors?.color3,
                colors?.color4,
                colors?.color5,
                colors?.color6,
                colors?.color7,
                colors?.color8,
            ].filter(Boolean) as string[],
            colors?.paletteCount
        )

        uniforms.uColor0.value = colorArr[0]
        uniforms.uColor1.value = colorArr[1]
        uniforms.uColor2.value = colorArr[2]
        uniforms.uColor3.value = colorArr[3]
        uniforms.uColor4.value = colorArr[4]
        uniforms.uColor5.value = colorArr[5]
        uniforms.uColor6.value = colorArr[6]
        uniforms.uColor7.value = colorArr[7]
        uniforms.uColorCount.value = colorCount

        // Update blind count if amount changed
        if (rendererRef.current && containerRef.current) {
            const container = containerRef.current
            const containerWidth = Math.max(container.clientWidth, 2)
            const containerHeight = Math.max(container.clientHeight, 2)

            // Calculate dimensions using "cover" behavior - canvas overflows container while maintaining 1:1 aspect ratio
            const containerAspect = containerWidth / containerHeight

            let width, height
            if (containerAspect > 1) {
                // Container is wider than tall - use width as base (canvas will be taller than container)
                width = containerWidth
                height = containerWidth // 1:1 aspect ratio
            } else {
                // Container is taller than wide - use height as base (canvas will be wider than container)
                height = containerHeight
                width = containerHeight // 1:1 aspect ratio
            }

            // Recalculate blind count - always recalculate when amount changes
            const calculatedBlindCount =
                blindMinWidth && blindMinWidth > 0
                    ? Math.max(1, Math.floor(width / blindMinWidth))
                    : 16

            uniforms.uBlindCount.value = calculatedBlindCount
        }
    }, [
        angle,
        noise,
        spotlight,
        mirrorGradient,
        distortAmount,
        shineDirection,
        colors,
        amount, // Include amount for blind count updates
    ])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const renderer = new Renderer({
            dpr: dpr
                ? dpr * 3 // Multiply normalized value (0.1-1) by 3 to get range 0.3-3
                : typeof window !== "undefined"
                  ? window.devicePixelRatio || 1
                  : 1,
            alpha: true,
            antialias: true,
            background: null, // Ensure no background color is set
            premultipliedAlpha: false, // Important for proper alpha blending
        })
        rendererRef.current = renderer
        const gl = renderer.gl
        const canvas = gl.canvas as HTMLCanvasElement

        // Initialize mouse target to center to prevent spotlight animation from bottom-left
        const initialCenterX = gl.drawingBufferWidth / 2
        const initialCenterY = gl.drawingBufferHeight / 2
        mouseTargetRef.current = [initialCenterX, initialCenterY]

        // In Preview or Canvas mode, ensure mouseTargetRef stays at center (simulating "last known mouse position")
        if (isPreviewMode || RenderTarget.current() === RenderTarget.canvas) {
            const mode =
                RenderTarget.current() === RenderTarget.canvas
                    ? "Canvas"
                    : "Preview"
        }

        // Ensure WebGL context is transparent
        gl.clearColor(0, 0, 0, 0)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        canvas.style.display = "block"
        canvas.style.position = "absolute"
        canvas.style.margin = "0"
        canvas.style.padding = "0"
        canvas.style.background = "transparent" // Ensure canvas background is transparent
        canvas.style.backgroundColor = "transparent" // Double-check canvas background
        // Center the canvas (will overflow container)
        canvas.style.top = "50%"
        canvas.style.left = "50%"
        canvas.style.transform = "translate(-50%, -50%)"
        container.appendChild(canvas)

        const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

        const fragment = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform float uAngle;
uniform float uNoise;
uniform float uBlindCount;
uniform float uSpotlightRadius;
uniform float uSpotlightSoftness;
uniform float uSpotlightOpacity;
uniform float uMirror;
uniform float uDistort;
uniform float uShineFlip;
uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

varying vec2 vUv;

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rotate2D(vec2 p, float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

vec3 getGradientColor(float t){
  float tt = clamp(t, 0.0, 1.0);
  int count = uColorCount;
  if (count < 2) count = 2;
  float scaled = tt * float(count - 1);
  float seg = floor(scaled);
  float f = fract(scaled);

  if (seg < 1.0) return mix(uColor0, uColor1, f);
  if (seg < 2.0 && count > 2) return mix(uColor1, uColor2, f);
  if (seg < 3.0 && count > 3) return mix(uColor2, uColor3, f);
  if (seg < 4.0 && count > 4) return mix(uColor3, uColor4, f);
  if (seg < 5.0 && count > 5) return mix(uColor4, uColor5, f);
  if (seg < 6.0 && count > 6) return mix(uColor5, uColor6, f);
  if (seg < 7.0 && count > 7) return mix(uColor6, uColor7, f);
  if (count > 7) return uColor7;
  if (count > 6) return uColor6;
  if (count > 5) return uColor5;
  if (count > 4) return uColor4;
  if (count > 3) return uColor3;
  if (count > 2) return uColor2;
  return uColor1;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv0 = fragCoord.xy / iResolution.xy;

    float aspect = iResolution.x / iResolution.y;
    vec2 p = uv0 * 2.0 - 1.0;
    p.x *= aspect;
    vec2 pr = rotate2D(p, uAngle);
    pr.x /= aspect;
    vec2 uv = pr * 0.5 + 0.5;

    vec2 uvMod = uv;
    if (uDistort > 0.0) {
      float a = uvMod.y * 6.0;
      float b = uvMod.x * 6.0;
      float w = 0.01 * uDistort;
      uvMod.x += sin(a) * w;
      uvMod.y += cos(b) * w;
    }
    float t = uvMod.x;
    if (uMirror > 0.5) {
      t = 1.0 - abs(1.0 - 2.0 * fract(t));
    }
    vec3 base = getGradientColor(t);

    vec2 offset = vec2(iMouse.x/iResolution.x, iMouse.y/iResolution.y);
  float d = length(uv0 - offset);
  float r = max(uSpotlightRadius, 1e-4);
  float dn = d / r;
  
  // Calculate spotlight shape first (softness/blur effect)
  float spotShape = 1.0 - 2.0 * pow(dn, uSpotlightSoftness);
  spotShape = clamp(spotShape, 0.0, 1.0);
  
  // Apply opacity to control the intensity/brightness
  float spot = spotShape * uSpotlightOpacity;
  
  vec3 cir = vec3(spot);
  float stripe = fract(uvMod.x * max(uBlindCount, 1.0));
  if (uShineFlip > 0.5) stripe = 1.0 - stripe;
    vec3 ran = vec3(stripe);

    // Use spotlight as a mask for the gradient blinds
    // Only show gradient blinds where spotlight is active
    vec3 col;
    if (uSpotlightOpacity > 0.0) {
      // Show gradient blinds only within spotlight area
      col = base * spot - ran;
    } else {
      // No spotlight = no gradient blinds visible
      col = vec3(0.0);
    }
    col += (rand(gl_FragCoord.xy + iTime) - 0.5) * uNoise;

    // Calculate alpha based on content - transparent where there's no effect
    float alpha = max(max(col.r, col.g), col.b);
    alpha = clamp(alpha, 0.0, 1.0);
    
    fragColor = vec4(col, alpha);
}

void main() {
    vec4 color;
    mainImage(color, vUv * iResolution.xy);
    gl_FragColor = color;
}
`

        const { arr: colorArr, count: colorCount } = prepStops(
            [
                colors?.color1,
                colors?.color2,
                colors?.color3,
                colors?.color4,
                colors?.color5,
                colors?.color6,
                colors?.color7,
                colors?.color8,
            ].filter(Boolean) as string[],
            colors?.paletteCount
        )

        const uniforms: {
            iResolution: { value: [number, number, number] }
            iMouse: { value: [number, number] }
            iTime: { value: number }
            uAngle: { value: number }
            uNoise: { value: number }
            uBlindCount: { value: number }
            uSpotlightRadius: { value: number }
            uSpotlightSoftness: { value: number }
            uSpotlightOpacity: { value: number }
            uMirror: { value: number }
            uDistort: { value: number }
            uShineFlip: { value: number }
            uColor0: { value: [number, number, number] }
            uColor1: { value: [number, number, number] }
            uColor2: { value: [number, number, number] }
            uColor3: { value: [number, number, number] }
            uColor4: { value: [number, number, number] }
            uColor5: { value: [number, number, number] }
            uColor6: { value: [number, number, number] }
            uColor7: { value: [number, number, number] }
            uColorCount: { value: number }
        } = {
            iResolution: {
                value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1],
            },
            iMouse: { value: [initialCenterX, initialCenterY] }, // Initialize to center immediately
            iTime: { value: 0 },
            uAngle: { value: (angle * Math.PI) / 180 },
            uNoise: { value: noise },
            uBlindCount: { value: 1 }, // Will be calculated in resize function
            uSpotlightRadius: { value: (spotlight?.radius ?? 0.5) * 2 },
            uSpotlightSoftness: { value: (spotlight?.softness ?? 1) * 3 },
            uSpotlightOpacity: { value: spotlight?.opacity ?? 1 },
            uMirror: { value: mirrorGradient === "mirror" ? 1 : 0 },
            uDistort: { value: distortAmount * 30 },
            uShineFlip: { value: shineDirection === "right" ? 1 : 0 },
            uColor0: { value: colorArr[0] },
            uColor1: { value: colorArr[1] },
            uColor2: { value: colorArr[2] },
            uColor3: { value: colorArr[3] },
            uColor4: { value: colorArr[4] },
            uColor5: { value: colorArr[5] },
            uColor6: { value: colorArr[6] },
            uColor7: { value: colorArr[7] },
            uColorCount: { value: colorCount },
        }

        const program = new Program(gl, {
            vertex,
            fragment,
            uniforms,
        })
        programRef.current = program
        uniformsRef.current = uniforms // Store uniforms reference

        const geometry = new Triangle(gl)
        geometryRef.current = geometry
        const mesh = new Mesh(gl, { geometry, program })
        meshRef.current = mesh

        const resize = () => {
            // Use clientWidth/clientHeight for more reliable sizing in Framer Canvas
            const containerWidth = Math.max(container.clientWidth, 2)
            const containerHeight = Math.max(container.clientHeight, 2)

            // Calculate dimensions using "cover" behavior - canvas overflows container while maintaining 1:1 aspect ratio
            const containerAspect = containerWidth / containerHeight

            let width, height
            if (containerAspect > 1) {
                // Container is wider than tall - use width as base (canvas will be taller than container)
                width = containerWidth
                height = containerWidth // 1:1 aspect ratio
            } else {
                // Container is taller than wide - use height as base (canvas will be wider than container)
                height = containerHeight
                width = containerHeight // 1:1 aspect ratio
            }

            // Set canvas size to the calculated dimensions (will overflow container)
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`

            renderer.setSize(width, height)

            uniforms.iResolution.value = [
                gl.drawingBufferWidth,
                gl.drawingBufferHeight,
                1,
            ]

            // Calculate blind count dynamically (always recalculate)
            const calculatedBlindCount =
                blindMinWidth && blindMinWidth > 0
                    ? Math.max(1, Math.floor(width / blindMinWidth))
                    : 16 // fallback default
            uniforms.uBlindCount.value = calculatedBlindCount

            // In Preview or Canvas mode, always keep mouse position centered
            if (
                RenderTarget.current() === RenderTarget.preview ||
                RenderTarget.current() === RenderTarget.canvas
            ) {
                const cx = gl.drawingBufferWidth / 2
                const cy = gl.drawingBufferHeight / 2

                uniforms.iMouse.value = [cx, cy]
                mouseTargetRef.current = [cx, cy] // Keep mouseTargetRef at center in Canvas mode
            } else if (firstResizeRef.current) {
                firstResizeRef.current = false
                const cx = gl.drawingBufferWidth / 2
                const cy = gl.drawingBufferHeight / 2
                uniforms.iMouse.value = [cx, cy]
                mouseTargetRef.current = [cx, cy]
            }
        }

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(container)

        // In Canvas mode, force extra resizes to settle layout and avoid padding issues
        if (RenderTarget.current() === RenderTarget.canvas) {
            setTimeout(resize, 50)
            setTimeout(resize, 150)
        }

        const onPointerMove = (e: PointerEvent) => {
            // In Canvas mode or on mobile, ignore pointer events (spotlight stays centered)
            if (RenderTarget.current() === RenderTarget.canvas || isMobile) {
                return
            }

            const rect = canvas.getBoundingClientRect()
            const scale = (renderer as unknown as { dpr?: number }).dpr || 1
            
            // Calculate mouse position relative to the canvas center
            const canvasCenterX = rect.left + rect.width / 2
            const canvasCenterY = rect.top + rect.height / 2
            
            // Get mouse position relative to canvas center
            const mouseX = e.clientX - canvasCenterX
            const mouseY = e.clientY - canvasCenterY
            
            // Convert to canvas coordinate system (centered at origin)
            const x = (mouseX * scale) + (gl.drawingBufferWidth / 2)
            const y = (-mouseY * scale) + (gl.drawingBufferHeight / 2)

            // Ensure we never set invalid coordinates
            if (
                x >= 0 &&
                y >= 0 &&
                x <= gl.drawingBufferWidth &&
                y <= gl.drawingBufferHeight
            ) {
                mouseTargetRef.current = [x, y]
                if (mouseDampening <= 0) {
                    uniforms.iMouse.value = [x, y]
                }
            }
        }
        canvas.addEventListener("pointermove", onPointerMove)

        const loop = (t: number) => {
            rafRef.current = requestAnimationFrame(loop)
            uniforms.iTime.value = t * 0.001

            // In Preview or Canvas mode, handle mouse position appropriately
            if (
                RenderTarget.current() === RenderTarget.preview ||
                RenderTarget.current() === RenderTarget.canvas
            ) {
                const cx = gl.drawingBufferWidth / 2
                const cy = gl.drawingBufferHeight / 2
                const currentMouse = uniforms.iMouse.value
                const isCanvas = RenderTarget.current() === RenderTarget.canvas

                if (isCanvas) {
                    // In Canvas mode, ALWAYS force center position (no cursor interaction)
                    uniforms.iMouse.value = [cx, cy]
                    mouseTargetRef.current = [cx, cy]
                } else {
                    // In Preview mode, only force center if mouse hasn't been moved yet (to prevent [0,0] flash)
                    if (
                        (currentMouse[0] === 0 && currentMouse[1] === 0) ||
                        mouseDampening <= 0
                    ) {
                        uniforms.iMouse.value = [cx, cy]
                        mouseTargetRef.current = [cx, cy]
                    } else if (mouseDampening > 0) {
                        // Allow normal mouse dampening when mouse has been moved
                        if (!lastTimeRef.current) lastTimeRef.current = t
                        const dt = (t - lastTimeRef.current) / 1000
                        lastTimeRef.current = t
                        const tau = Math.max(1e-4, mouseDampening)
                        let factor = 1 - Math.exp(-dt / tau)
                        if (factor > 1) factor = 1

                        const target = mouseTargetRef.current
                        const cur = uniforms.iMouse.value
                        cur[0] += (target[0] - cur[0]) * factor
                        cur[1] += (target[1] - cur[1]) * factor
                    }
                }
            } else if (mouseDampening > 0) {
                if (!lastTimeRef.current) lastTimeRef.current = t
                const dt = (t - lastTimeRef.current) / 1000
                lastTimeRef.current = t
                const tau = Math.max(1e-4, mouseDampening)
                let factor = 1 - Math.exp(-dt / tau)
                if (factor > 1) factor = 1

                const target = mouseTargetRef.current
                const cur = uniforms.iMouse.value
                cur[0] += (target[0] - cur[0]) * factor
                cur[1] += (target[1] - cur[1]) * factor
            } else {
                lastTimeRef.current = t
            }
            if (!paused && programRef.current && meshRef.current) {
                try {
                    renderer.render({ scene: meshRef.current })
                } catch (e) {
                    console.error(e)
                }
            }
        }
        rafRef.current = requestAnimationFrame(loop)

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            canvas.removeEventListener("pointermove", onPointerMove)
            ro.disconnect()
            if (canvas.parentElement === container) {
                container.removeChild(canvas)
            }
            const callIfFn = <T extends object, K extends keyof T>(
                obj: T | null,
                key: K
            ) => {
                if (obj && typeof obj[key] === "function") {
                    ;(obj[key] as unknown as () => void).call(obj)
                }
            }
            callIfFn(programRef.current, "remove")
            callIfFn(geometryRef.current, "remove")
            callIfFn(
                meshRef.current as unknown as { remove?: () => void },
                "remove"
            )
            callIfFn(
                rendererRef.current as unknown as { destroy?: () => void },
                "destroy"
            )
            programRef.current = null
            geometryRef.current = null
            meshRef.current = null
            rendererRef.current = null
        }
    }, [
        dpr,
        paused,
        angle,
        noise,
        amount,
        mirrorGradient,
        spotlight,
        distortAmount,
        shineDirection,
        colors,
        isMobile,
    ])

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                position: "relative",
                background: colors?.bgColor || "#000000",
            }}
        >
            {/* WebGL canvas container */}
            <div
                ref={containerRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                }}
            />
        </div>
    )
}

GradientBlinds.defaultProps = {
    dpr: 0.5,
    paused: false,
    angle: 0,
    noise: 0.3,
    amount: 50,
    mirrorGradient: "no mirror" as const,
    spotlight: { radius: 0.5, softness: 1, opacity: 1, mouseDampening: 0.3 },
    distortAmount: 0,
    shineDirection: "left" as const,
    colors: {
        paletteCount: 2,
        color1: "#FF9FFC",
        color2: "#5227FF",
        bgColor: "#000000",
    },
}

addPropertyControls(GradientBlinds, {
    dpr: {
        type: ControlType.Number,
        title: "Resolution",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.8,
    },
    paused: {
        type: ControlType.Boolean,
        title: "paused",
        hidden: () => true,
        defaultValue: false,
    },
    amount: {
        type: ControlType.Number,
        title: "Amount",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 80,
    },
    angle: {
        type: ControlType.Number,
        title: "Angle",
        min: 0,
        max: 360,
        unit: "°",
    },
    noise: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.1,
    },
    distortAmount: {
        type: ControlType.Number,
        title: "Waveness",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    shineDirection: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["left", "right"],
        optionTitles: ["Left", "Right"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    mirrorGradient: {
        type: ControlType.Enum,
        title: "Gradient",
        options: ["no mirror", "mirror"],
        optionTitles: ["No mirror", "Mirror"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "no mirror",
    },
    spotlight: {
        type: ControlType.Object,
        title: "Spotlight",
        controls: {
            radius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0.1,
                max: 1,
                step: 0.1,
                // Controls the size/area of the spotlight effect
            },
            mouseDampening: {
                type: ControlType.Number,
                title: "Smoothing",
                min: 0.1,
                max: 1,
                step: 0.1,
                defaultValue: 0.3,
                // Controls how smoothly the mouse follows the cursor
            },

            softness: {
                type: ControlType.Number,
                title: "Presence",
                min: 0.1,
                max: 1,
                step: 0.1,
                // Controls the blur/softness of the spotlight edges
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
                // Controls the visibility of gradient blinds within the spotlight area
                // 0 = no blinds visible anywhere, 1 = full visibility within spotlight
            },
        },
    },

    colors: {
        type: ControlType.Object,
        title: "Colors",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            paletteCount: {
                type: ControlType.Number,
                title: "Palette Size",
                min: 2,
                max: 8,
                step: 1,
                defaultValue: 2,
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                defaultValue: "#FF9FFC",
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "#5227FF",
                hidden: (props: any) => (props?.paletteCount ?? 2) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "#FF9FFC",
                hidden: (props: any) => (props?.paletteCount ?? 2) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                defaultValue: "#5227FF",
                hidden: (props: any) => (props?.paletteCount ?? 2) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                defaultValue: "#FF9FFC",
                hidden: (props: any) => (props?.paletteCount ?? 2) < 5,
            },
            color6: {
                type: ControlType.Color,
                title: "Color 6",
                defaultValue: "#5227FF",
                hidden: (props: any) => (props?.paletteCount ?? 2) < 6,
            },
            color7: {
                type: ControlType.Color,
                title: "Color 7",
                defaultValue: "#FF9FFC",
                hidden: (props: any) => (props?.paletteCount ?? 2) < 7,
            },
            color8: {
                type: ControlType.Color,
                title: "Color 8",
                defaultValue: "#FF9FFC",
                hidden: (props: any) => (props?.paletteCount ?? 2) < 8,
            },
            bgColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "#000000",
            },
        },
    },
})

GradientBlinds.displayName = "Gradient Blinds DEV"
