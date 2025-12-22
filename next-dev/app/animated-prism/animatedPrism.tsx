import React, { useEffect, useRef } from "react"
import {
    Renderer,
    Program,
    Mesh,
    Triangle,
    Texture,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/ogl-prism.js"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

type Offset = { x?: number; y?: number }
type AnimationType = "rotate" | "rotate3d" | "hover"

export type PrismaticBurstProps = {
    intensity?: number
    speed?: number
    animationType?: AnimationType
    colors?: string[]
    distort?: number
    preview?: boolean
    offset?: Offset
    hoverDampness?: number
    rayCount?: number
    mixBlendMode?: React.CSSProperties["mixBlendMode"] | "none"
    quality?: "low" | "medium" | "high"
    maxFPS?: number
}

const vertexShader = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;

uniform float uIntensity;
uniform float uSpeed;
uniform int   uAnimType;
uniform vec2  uMouse;
uniform int   uColorCount;
uniform float uDistort;
uniform vec2  uOffset;
uniform sampler2D uGradient;
uniform float uNoiseAmount;
uniform int   uRayCount;
uniform int   uMaxIterations;

float hash21(vec2 p){
    p = floor(p);
    float f = 52.9829189 * fract(dot(p, vec2(0.065, 0.005)));
    return fract(f);
}

mat2 rot30(){ return mat2(0.8, -0.5, 0.5, 0.8); }

float layeredNoise(vec2 fragPx){
    vec2 p = mod(fragPx + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
    vec2 q = rot30() * p;
    float n = 0.0;
    n += 0.40 * hash21(q);
    n += 0.25 * hash21(q * 2.0 + 17.0);
    n += 0.20 * hash21(q * 4.0 + 47.0);
    n += 0.10 * hash21(q * 8.0 + 113.0);
    n += 0.05 * hash21(q * 16.0 + 191.0);
    return n;
}

vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
    float focal = res.y * max(dist, 1e-3);
    return normalize(vec3(2.0 * (frag - offset) - res, focal));
}

float edgeFade(vec2 frag, vec2 res, vec2 offset){
    vec2 toC = frag - 0.5 * res - offset;
    float r = length(toC) / (0.5 * min(res.x, res.y));
    float x = clamp(r, 0.0, 1.0);
    float q = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    float s = q * 0.5;
    s = pow(s, 1.5);
    float tail = 1.0 - pow(1.0 - s, 2.0);
    s = mix(s, tail, 0.2);
    float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
    return clamp(s + dn, 0.0, 1.0);
}

mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }

vec3 sampleGradient(float t){
    t = clamp(t, 0.0, 1.0);
    return texture(uGradient, vec2(t, 0.5)).rgb;
}

vec2 rot2(vec2 v, float a){
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c) * v;
}

float bendAngle(vec3 q, float t){
    float a = 0.8 * sin(q.x * 0.55 + t * 0.6)
            + 0.7 * sin(q.y * 0.50 - t * 0.5)
            + 0.6 * sin(q.z * 0.60 + t * 0.7);
    return a;
}

void main(){
    vec2 frag = gl_FragCoord.xy;
    float t = uTime * uSpeed;
    float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
    vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
    float marchT = 0.0;
    vec3 col = vec3(0.0);
    float n = layeredNoise(frag);
    vec4 c = cos(t * 0.2 + vec4(0.0, 33.0, 11.0, 0.0));
    mat2 M2 = mat2(c.x, c.y, c.z, c.w);
    float amp = clamp(uDistort, 0.0, 50.0) * 0.15;

    mat3 rot3dMat = mat3(1.0);
    if(uAnimType == 1){
      vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
      rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
    }
    mat3 hoverMat = mat3(1.0);
    if(uAnimType == 2){
      vec2 m = uMouse * 2.0 - 1.0;
      vec3 ang = vec3(m.y * 0.6, m.x * 0.6, 0.0);
      hoverMat = rotY(ang.y) * rotX(ang.x);
    }

    for (int i = 0; i < uMaxIterations; ++i) {
        vec3 P = marchT * dir;
        P.z -= 2.0;
        float rad = length(P);
        vec3 Pl = P * (10.0 / max(rad, 1e-6));

        if(uAnimType == 0){
            Pl.xz *= M2;
        } else if(uAnimType == 1){
      Pl = rot3dMat * Pl;
        } else {
      Pl = hoverMat * Pl;
        }

        float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;

        float grow = smoothstep(0.35, 3.0, marchT);
        float a1 = amp * grow * bendAngle(Pl * 0.6, t);
        float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
        vec3 Pb = Pl;
        Pb.xz = rot2(Pb.xz, a1);
        Pb.xy = rot2(Pb.xy, a2);

        float rayPattern = smoothstep(
            0.5, 0.7,
            sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
            sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
        );

        if (uRayCount > 0) {
            float ang = atan(Pb.y, Pb.x);
            // Create equal-width bright and dark sections
            float comb = cos(float(uRayCount) * ang);
            // Small 5-degree transition between bright and dark areas
            rayPattern = rayPattern * smoothstep(-0.5, 0.5, comb);
        }

        vec3 spectralDefault = 1.0 + vec3(
            cos(marchT * 3.0 + 0.0),
            cos(marchT * 3.0 + 1.0),
            cos(marchT * 3.0 + 2.0)
        );

        float saw = fract(marchT * 0.25);
        float tRay = saw * saw * (3.0 - 2.0 * saw);
        vec3 userGradient = 2.0 * sampleGradient(tRay);
        vec3 spectral = (uColorCount > 0) ? userGradient : spectralDefault;
        vec3 base = (0.05 / (0.4 + stepLen))
                  * smoothstep(5.0, 0.0, rad)
                  * spectral;

        col += base * rayPattern;
        marchT += stepLen;
    }

    col *= edgeFade(frag, uResolution, uOffset);
    col *= uIntensity;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

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
function colorStringToVec4(input: string): [number, number, number, number] {
    const resolved = resolveTokenColor(input)
    const { r, g, b, a } = parseColorToRgba(resolved)
    return [r, g, b, a]
}

// Convert percentage offset to pixel offset based on component dimensions
const getOffsetPixels = (offset: Offset, width: number, height: number): [number, number] => {
    const x = offset.x ?? 0
    const y = offset.y ?? 0
    // Convert percentage (-50% to +50%) to pixels
    const xPx = (x / 100) * width
    const yPx = (y / 100) * height
    return [xPx, yPx]
}

// Mapping functions for prettier property controls
const mapIntensity = (value: number): number => {
    // Map from UI range [1, 10] to shader range [0, 5]
    return ((value - 1) / 9) * 5
}

const mapSpeed = (value: number): number => {
    // Map from UI range [0, 1] to shader range [0, 2]
    return value * 2
}

const mapDistort = (value: number): number => {
    // Map from UI range [0, 100] to shader range [0, 50]
    return (value / 100) * 50
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 500
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function PrismaticBurst(
    props: PrismaticBurstProps
): JSX.Element {
    const {
        intensity = 2,
        speed = 0.5,
        animationType = "rotate3d",
        colors,
        distort = 0,
        preview = true,
        offset = { x: 0, y: 0 },
        hoverDampness = 0,
        rayCount,
        mixBlendMode = "normal",
        quality = "medium",
        maxFPS = 60,
    } = props
    const containerRef = useRef<HTMLDivElement>(null)
    const programRef = useRef<typeof Program | null>(null)
    const rendererRef = useRef<typeof Renderer | null>(null)
    const mouseTargetRef = useRef<[number, number]>([0.5, 0.5])
    const mouseSmoothRef = useRef<[number, number]>([0.5, 0.5])
    const previewRef = useRef<boolean>(preview)
    const gradTexRef = useRef<InstanceType<typeof Texture> | null>(null)
    const hoverDampRef = useRef<number>(hoverDampness)
    const isVisibleRef = useRef<boolean>(true)
    const meshRef = useRef<typeof Mesh | null>(null)
    const triRef = useRef<typeof Triangle | null>(null)
    const lastFrameTimeRef = useRef<number>(0)
    const frameSkipRef = useRef<number>(0)
    const maxFPSRef = useRef<number>(maxFPS)
    const rafRef = useRef<number | null>(null)
    const updateRef = useRef<(now: number) => void>()
    const lastRef = useRef<number>(0)

    // Performance settings based on quality
    const getPerformanceSettings = () => {
        switch (quality) {
            case "low":
                return { maxIterations: 20, dpr: 1, frameSkip: 2 }
            case "high":
                return {
                    maxIterations: 60,
                    dpr: Math.min(window.devicePixelRatio || 1, 2),
                    frameSkip: 0,
                }
            default: // medium
                return {
                    maxIterations: 32,
                    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
                    frameSkip: 1,
                }
        }
    }

    useEffect(() => {
        previewRef.current = preview
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        // When turning preview ON in Canvas, (re)start loop if not running
        if (preview && isCanvas && updateRef.current) {
            lastRef.current = performance.now()
            if (rafRef.current == null) {
                rafRef.current = requestAnimationFrame(updateRef.current)
            }
        }
        // When turning preview OFF in Canvas, render once and stop loop
        if (!preview && isCanvas) {
            try {
                if (rendererRef.current && meshRef.current) {
                    rendererRef.current.render({ scene: meshRef.current })
                }
            } catch (e) {
                void e
            }
            if (rafRef.current != null) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [preview])
    useEffect(() => {
        hoverDampRef.current = hoverDampness
    }, [hoverDampness])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const perfSettings = getPerformanceSettings()
        const renderer = new Renderer({
            dpr: perfSettings.dpr,
            alpha: false,
            antialias: false,
        })
        rendererRef.current = renderer

        const gl = renderer.gl
        gl.canvas.style.position = "absolute"
        gl.canvas.style.inset = "0"
        gl.canvas.style.width = "100%"
        gl.canvas.style.height = "100%"
        gl.canvas.style.mixBlendMode =
            mixBlendMode && mixBlendMode !== "none" ? mixBlendMode : ""
        container.appendChild(gl.canvas)

        const white = new Uint8Array([255, 255, 255, 255])
        const gradientTex = new Texture(gl, {
            image: white,
            width: 1,
            height: 1,
            generateMipmaps: false,
            flipY: false,
        })

        gradientTex.minFilter = gl.LINEAR
        gradientTex.magFilter = gl.LINEAR
        gradientTex.wrapS = gl.CLAMP_TO_EDGE
        gradientTex.wrapT = gl.CLAMP_TO_EDGE
        gradTexRef.current = gradientTex

        const program = new Program(gl, {
            vertex: vertexShader,
            fragment: fragmentShader,
            uniforms: {
                uResolution: { value: [1, 1] as [number, number] },
                uTime: { value: 0 },

                uIntensity: { value: 1 },
                uSpeed: { value: 1 },
                uAnimType: { value: 0 },
                uMouse: { value: [0.5, 0.5] as [number, number] },
                uColorCount: { value: 0 },
                uDistort: { value: 0 },
                uOffset: { value: [0, 0] as [number, number] },
                uGradient: { value: gradientTex },
                uNoiseAmount: { value: 0.8 },
                uRayCount: { value: 0 },
                uMaxIterations: { value: perfSettings.maxIterations },
            },
        })

        programRef.current = program

        const triangle = new Triangle(gl)
        const mesh = new Mesh(gl, { geometry: triangle, program })
        triRef.current = triangle
        meshRef.current = mesh

        const resize = () => {
            const w = container.clientWidth || 1
            const h = container.clientHeight || 1
            renderer.setSize(w, h)
            program.uniforms.uResolution.value = [
                gl.drawingBufferWidth,
                gl.drawingBufferHeight,
            ]
        }

        let ro: ResizeObserver | null = null
        if ("ResizeObserver" in window) {
            ro = new ResizeObserver(resize)
            ro.observe(container)
        } else {
            ;(window as Window).addEventListener("resize", resize)
        }
        resize()

        const onPointer = (e: PointerEvent) => {
            const rect = container.getBoundingClientRect()
            const x = (e.clientX - rect.left) / Math.max(rect.width, 1)
            const y = (e.clientY - rect.top) / Math.max(rect.height, 1)
            mouseTargetRef.current = [
                Math.min(Math.max(x, 0), 1),
                Math.min(Math.max(y, 0), 1),
            ]
        }
        container.addEventListener("pointermove", onPointer, { passive: true })

        let io: IntersectionObserver | null = null
        if ("IntersectionObserver" in window) {
            io = new IntersectionObserver(
                (entries) => {
                    if (entries[0])
                        isVisibleRef.current = entries[0].isIntersecting
                },
                { root: null, threshold: 0.01 }
            )
            io.observe(container)
        }
        const onVis = () => {}
        document.addEventListener("visibilitychange", onVis)

        lastRef.current = performance.now()
        let accumTime = 0

        const update = (now: number) => {
             const dt = Math.max(0, now - lastRef.current) * 0.001
             lastRef.current = now
             const visible = isVisibleRef.current && !document.hidden
             
             // Check if we're in Canvas mode and preview is off
             const isCanvas = RenderTarget.current() === RenderTarget.canvas
             const isPaused = !previewRef.current && isCanvas
             
             if (!isPaused) accumTime += dt
             
            // Stop animation completely if not visible
            if (!visible) {
                rafRef.current = requestAnimationFrame(update)
                return
            }
            
            // If paused in Canvas mode, render once then stop the loop
            if (isPaused) {
                renderer.render({ scene: meshRef.current! })
                rafRef.current = null
                return // Don't schedule next frame
            }
             
            // Frame rate throttling (applies everywhere, including Canvas mode)
            const targetFrameTime = 1000 / maxFPSRef.current
            const timeSinceLastFrame = now - lastFrameTimeRef.current
            frameSkipRef.current++

            // Apply quality-based frame skipping
            if (frameSkipRef.current <= perfSettings.frameSkip) {
                rafRef.current = requestAnimationFrame(update)
                return
            }

            // Apply FPS limiting
            if (timeSinceLastFrame < targetFrameTime) {
                rafRef.current = requestAnimationFrame(update)
                return
            }

            lastFrameTimeRef.current = now
            frameSkipRef.current = 0

            const tau =
                0.02 + Math.max(0, Math.min(1, hoverDampRef.current)) * 0.5
            const alpha = 1 - Math.exp(-dt / tau)
            const tgt = mouseTargetRef.current
            const sm = mouseSmoothRef.current
            sm[0] += (tgt[0] - sm[0]) * alpha
            sm[1] += (tgt[1] - sm[1]) * alpha
            program.uniforms.uMouse.value = sm as any
            program.uniforms.uTime.value = accumTime
            renderer.render({ scene: meshRef.current! })
            rafRef.current = requestAnimationFrame(update)
        }
        updateRef.current = update
        rafRef.current = requestAnimationFrame(update)

        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
            container.removeEventListener("pointermove", onPointer)
            ro?.disconnect()
            if (!ro) window.removeEventListener("resize", resize)
            io?.disconnect()
            document.removeEventListener("visibilitychange", onVis)
            try {
                container.removeChild(gl.canvas)
            } catch (e) {
                void e
            }
            meshRef.current = null
            triRef.current = null
            programRef.current = null
            try {
                const glCtx = rendererRef.current?.gl
                if (glCtx && gradTexRef.current?.texture)
                    glCtx.deleteTexture(gradTexRef.current.texture)
            } catch (e) {
                void e
            }
            rendererRef.current = null
            gradTexRef.current = null
        }
    }, [])

    useEffect(() => {
        const canvas = rendererRef.current?.gl?.canvas as
            | HTMLCanvasElement
            | undefined
        if (canvas) {
            canvas.style.mixBlendMode =
                mixBlendMode && mixBlendMode !== "none" ? mixBlendMode : ""
        }
    }, [mixBlendMode])

    useEffect(() => {
        // Update the ref with the new maxFPS value
        maxFPSRef.current = maxFPS
        // Reset frame timing when maxFPS changes to ensure immediate effect
        lastFrameTimeRef.current = 0
        frameSkipRef.current = 0
    }, [maxFPS])

    useEffect(() => {
        const program = programRef.current
        const renderer = rendererRef.current
        const gradTex = gradTexRef.current
        if (!program || !renderer || !gradTex) return

         program.uniforms.uIntensity.value = mapIntensity(intensity ?? 2)
         program.uniforms.uSpeed.value = mapSpeed(speed ?? 0.5)

        const animTypeMap: Record<AnimationType, number> = {
            rotate: 0,
            rotate3d: 1,
            hover: 2,
        }
        program.uniforms.uAnimType.value =
            animTypeMap[animationType ?? "rotate"]

         program.uniforms.uDistort.value = mapDistort(distort ?? 0)

        // Get component dimensions for percentage-based offset calculation
        const container = containerRef.current
        if (container) {
            const width = container.clientWidth || 1
            const height = container.clientHeight || 1
            const [ox, oy] = getOffsetPixels(offset ?? { x: 0, y: 0 }, width, height)
            program.uniforms.uOffset.value = [ox, oy]
        }
        program.uniforms.uRayCount.value = Math.max(
            0,
            Math.floor(rayCount ?? 0)
        )

        let count = 0
        if (Array.isArray(colors) && colors.length > 0) {
            const gl = renderer.gl
            const capped = colors.slice(0, 64)
            count = capped.length
            const data = new Uint8Array(count * 4)
            for (let i = 0; i < count; i++) {
                const [r, g, b, a] = colorStringToVec4(capped[i])
                data[i * 4 + 0] = Math.round(r * 255)
                data[i * 4 + 1] = Math.round(g * 255)
                data[i * 4 + 2] = Math.round(b * 255)
                data[i * 4 + 3] = Math.round(a * 255)
            }
            gradTex.image = data
            gradTex.width = count
            gradTex.height = 1
            gradTex.minFilter = gl.LINEAR
            gradTex.magFilter = gl.LINEAR
            gradTex.wrapS = gl.CLAMP_TO_EDGE
            gradTex.wrapT = gl.CLAMP_TO_EDGE
            gradTex.flipY = false
            gradTex.generateMipmaps = false
            gradTex.format = gl.RGBA
            gradTex.type = gl.UNSIGNED_BYTE
            gradTex.needsUpdate = true
        } else {
            count = 0
        }
        program.uniforms.uColorCount.value = count
    }, [intensity, speed, animationType, colors, distort, offset, rayCount])

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
            }}
            ref={containerRef}
        />
    )
}

addPropertyControls(PrismaticBurst, {
    animationType: {
        type: ControlType.Enum,
        title: "Animation",
        options: ["rotate", "rotate3d", "hover"],
        optionTitles: ["Rotate", "3D Rotate", "Hover"],
        defaultValue: "rotate3d",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 10,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        hidden: (props) => props.animationType === "hover",
        },

    distort: {
        type: ControlType.Number,
        title: "Distort",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 0,
    },
    hoverDampness: {
        type: ControlType.Number,
        title: "Damping",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0,
        hidden: (props) => props.animationType !== "hover",
    },
    rayCount: {
        type: ControlType.Number,
        title: "Ray Count",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 0,
    },
    offset: {
        type: ControlType.Object,
        title: "Offset",
        controls: {
            x: {
                type: ControlType.Number,
                title: "X",
                min: -100,
                max: 100,
                step: 1,
                defaultValue: 0,
                unit: "%",
            },
            y: {
                type: ControlType.Number,
                title: "Y",
                min: -100,
                max: 100,
                step: 1,
                defaultValue: 0,
                unit: "%",
            },
        },
    },
    colors: {
        type: ControlType.Array,
        title: "Colors",
        control: {
            type: ControlType.Color,
        },
        defaultValue: [],
    },
    mixBlendMode: {
        type: ControlType.Enum,
        title: "Blend Mode",
        options: [
            "normal",
            "multiply",
            "screen",
            "overlay",
            "soft-light",
            "hard-light",
            "color-dodge",
            "color-burn",
            "darken",
            "lighten",
            "difference",
            "exclusion",
            "hue",
            "saturation",
            "color",
            "luminosity",
        ],
        optionTitles: [
            "Normal",
            "Multiply",
            "Screen",
            "Overlay",
            "Soft Light",
            "Hard Light",
            "Color Dodge",
            "Color Burn",
            "Darken",
            "Lighten",
            "Difference",
            "Exclusion",
            "Hue",
            "Saturation",
            "Color",
            "Luminosity",
        ],
        defaultValue: "normal",
    },
    quality: {
        type: ControlType.Enum,
        title: "Quality",
        options: ["low", "medium", "high"],
        optionTitles: ["Low (Fast)", "Medium", "High (Slow)"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "medium",
    },
    maxFPS: {
        type: ControlType.Number,
        title: "Max FPS",
        min: 1,
        max: 120,
        step: 15,
        defaultValue: 60,
        description:"More components at [Framer University](https://frameruni.link/cc)."
    },
})

PrismaticBurst.displayName="Animated Prism"

