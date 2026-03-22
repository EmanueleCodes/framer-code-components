import React, {
    useRef,
    useEffect,
    useState,
    useLayoutEffect,
    memo,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// --- WebGL Shader (only 10 params as uniforms, rest hardcoded) ---

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_uv;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_uv = a_texCoord;
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_overlay;
uniform vec2 u_resolution;
uniform float u_progress;
uniform float u_time;

uniform float u_noiseWarpOctaves;
uniform float u_noiseCartOctaves;
uniform float u_warpedDistNoiseWarp;
uniform float u_warpedDistNoiseCart;
uniform float u_waveFreq;
uniform float u_sigma;
uniform float u_displacement;
uniform float u_caStrength;
uniform float u_glow;
uniform float u_edgeGlow;
uniform float u_backgroundOpacity;
uniform float u_imageAspect;

varying vec2 v_uv;

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec2 vnoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 a = hash22(i);
    vec2 b = hash22(i + vec2(1.0, 0.0));
    vec2 c = hash22(i + vec2(0.0, 1.0));
    vec2 d = hash22(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, float octaves) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    int n = int(floor(octaves + 0.5));
    for (int i = 0; i < 8; i++) {
        if (i >= n) break;
        val += amp * vnoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return val;
}

vec2 fbm2(vec2 p, float octaves) {
    vec2 val = vec2(0.0);
    float amp = 0.5;
    float freq = 1.0;
    int n = int(floor(octaves + 0.5));
    for (int i = 0; i < 8; i++) {
        if (i >= n) break;
        val += amp * vnoise2(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return val;
}

void main() {
    vec2 uv = v_uv;
    vec2 size = u_resolution;
    float progress = u_progress;
    
    float viewAspect = size.x / size.y;
    float imageAspect = max(0.001, u_imageAspect);
    // Object-fit cover: sample image so it fills the view without stretching
    vec2 imageUV;
    if (viewAspect > imageAspect) {
        imageUV = vec2(uv.x, (uv.y - 0.5) * (imageAspect / viewAspect) + 0.5);
    } else {
        imageUV = vec2((uv.x - 0.5) * (viewAspect / imageAspect) + 0.5, uv.y);
    }
    
    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv - center;
    float aspect = viewAspect;
    p.x *= aspect;
    
    float dist = length(p);
    float maxDist = length(vec2(0.5 * aspect, 0.5));
    float normDist = clamp(dist / maxDist, 0.0, 1.0);
    float angle = atan(p.y, p.x);
    
    // Scale down noise influence as progress approaches 0 so the blob fully closes
    float noiseScale = smoothstep(0.0, 0.15, progress);
    float noiseWarp = fbm(vec2(angle * 2.0 + 10.0, normDist * 4.0 + progress * 1.5), u_noiseWarpOctaves);
    float noiseCart = fbm(p * 8.0 + vec2(progress * 1.5, -progress * 1.0), u_noiseCartOctaves);
    float warpedDist = normDist + noiseScale * ((noiseWarp - 0.5) * u_warpedDistNoiseWarp + (noiseCart - 0.5) * u_warpedDistNoiseCart);
    
    float waveFront = progress * 1.28;
    float sigma = u_sigma;
    float delta = warpedDist - waveFront;
    float baseEnvelope = exp(-delta * delta / (2.0 * sigma * sigma));
    
    float waveFreq = u_waveFreq;
    float ripples = 0.5 + 0.5 * cos(delta * waveFreq);
    // Scale envelope by noiseScale so all effects (displacement, CA, glow) fade out as progress -> 0
    float envelope = baseEnvelope * ripples * noiseScale;
    
    // Shrink the transition band with progress so the hole can fully close (no stuck blob)
    float feather = 0.15 * max(progress, 0.004);
    float behindWave = smoothstep(waveFront + feather, waveFront - feather, warpedDist);
    
    // Noise-based displacement (also scaled by noiseScale)
    vec2 noiseDisplace = fbm2(p * 6.0 + vec2(progress * 2.0, -progress * 1.5), 3.0);
    noiseDisplace += 0.5 * fbm2(p * 12.0 - vec2(progress * 1.0, progress * 2.0), 2.0);
    noiseDisplace *= noiseScale;
    
    float displaceStrength = envelope * u_displacement * 0.15;
    vec2 uvOffset = noiseDisplace * displaceStrength;
    uvOffset.x /= aspect;

    float caStrength = envelope * u_caStrength * 0.02;
    vec2 caOffset = normalize(noiseDisplace + 0.001) * caStrength;
    caOffset.x /= aspect;
    
    vec2 sampleUV = imageUV - uvOffset;
    float imgR = texture2D(u_image, sampleUV - caOffset).r;
    float imgG = texture2D(u_image, sampleUV).g;
    float imgB = texture2D(u_image, sampleUV + caOffset).b;
    float imgA = texture2D(u_image, sampleUV).a;
    vec4 imgColor = vec4(imgR, imgG, imgB, imgA);
    
    float glow = envelope * u_glow;
    imgColor.rgb = clamp(imgColor.rgb / max(1.0 - glow, 0.1), 0.0, 1.0);
    
    float imageVisibility = 1.0 - behindWave;
    
    vec4 overlayColor = texture2D(u_overlay, uv);
    vec4 baseColor = mix(overlayColor, imgColor, imageVisibility);
    
    // Boost glow when background opacity is low so it stays visible (up to 2x at full transparency)
    float glowBoost = 2.0 - u_backgroundOpacity;
    float edgeGlowAmount = envelope * u_edgeGlow * glowBoost;
    float outAlpha = max(baseColor.a, edgeGlowAmount);
    
    // Premultiplied: base * alpha + glow so glow is visible at any background opacity
    vec3 premultRGB = baseColor.rgb * outAlpha + vec3(edgeGlowAmount);
    gl_FragColor = vec4(premultRGB, outAlpha);
}
`

// --- Color helpers ---
function parseColorToRgb(c: string): [number, number, number] {
    const [r, g, b, _a] = parseColorToRgba(c)
    return [r, g, b]
}

/** Returns [r, g, b, a] in 0-1. Alpha is 1 if not in string. */
function parseColorToRgba(c: string): [number, number, number, number] {
    if (!c || typeof c !== "string") return [0, 0, 0, 1]
    const hex = c.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    if (hex) {
        const s = hex[1]
        if (s.length === 3) {
            return [
                parseInt(s[0] + s[0], 16) / 255,
                parseInt(s[1] + s[1], 16) / 255,
                parseInt(s[2] + s[2], 16) / 255,
                1,
            ]
        }
        return [
            parseInt(s.slice(0, 2), 16) / 255,
            parseInt(s.slice(2, 4), 16) / 255,
            parseInt(s.slice(4, 6), 16) / 255,
            1,
        ]
    }
    const rgbaMatch = c.match(
        /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
    )
    if (rgbaMatch) {
        const a = rgbaMatch[4] != null ? Number(rgbaMatch[4]) : 1
        return [
            Number(rgbaMatch[1]) / 255,
            Number(rgbaMatch[2]) / 255,
            Number(rgbaMatch[3]) / 255,
            typeof a === "number" && !Number.isNaN(a)
                ? Math.max(0, Math.min(1, a))
                : 1,
        ]
    }
    return [0, 0, 0, 1]
}

function createSolidColorTexture(
    gl: WebGLRenderingContext,
    color: string,
    opacity: number
): WebGLTexture | null {
    const [r, g, b, colorAlpha] = parseColorToRgba(color)
    const a = Math.round(Math.max(0, Math.min(1, opacity * colorAlpha)) * 255)
    const pixel = new Uint8Array([
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255),
        a,
    ])
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return texture
}

function createPlaceholderTexture(
    gl: WebGLRenderingContext
): WebGLTexture | null {
    const texture = gl.createTexture()
    if (!texture) return null
    gl.bindTexture(gl.TEXTURE_2D, texture)
    const pixel = new Uint8Array([0, 0, 0, 255])
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return texture
}

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function createProgram(
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string
): WebGLProgram | null {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource)
    if (!vs || !fs) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program))
        return null
    }
    return program
}

// Only user-controllable shader params; rest are hardcoded in the component
export interface ShaderFinetuning {
    noiseCartOctaves: number
    warpedDistNoiseCart: number
    waveFreq: number
    displacement: number
    chromatic: number // chromatic aberration strength
    glow: number // glow intensity (color dodge at wavefront)
    edgeGlow: number // additive white at wave edge
}

export const DEFAULT_SHADER_FINETUNING: ShaderFinetuning = {
    noiseCartOctaves: 3,
    warpedDistNoiseCart: 1,
    waveFreq: 55,
    displacement: 4,
    chromatic: 0.75,
    glow: 0.4,
    edgeGlow: 0.15,
}

export type ShaderMode = "preset" | "custom"

export type ShaderPresetId =
    | "noisy"
    | "sharp"
    | "water"
    | "waterDrop"
    | "magic"

/** Built-in shader looks (Octaves, Warp, Freq, Liquid, Chromatic, Intensity, Edge). */
export const SHADER_PRESET_VALUES: Record<ShaderPresetId, ShaderFinetuning> = {
    noisy: {
        noiseCartOctaves: 3,
        warpedDistNoiseCart: 1,
        waveFreq: 55,
        displacement: 4,
        chromatic: 0.75,
        glow: 0.4,
        edgeGlow: 0.15,
    },
    sharp: {
        noiseCartOctaves: 10,
        warpedDistNoiseCart: 1,
        waveFreq: 60,
        displacement: 4,
        chromatic: 0,
        glow: 0.5,
        edgeGlow: 0.34,
    },
    water: {
        noiseCartOctaves: 2,
        warpedDistNoiseCart: 0.55,
        waveFreq: 60,
        displacement: 10,
        chromatic: 0,
        glow: 0.45,
        edgeGlow: 0.28,
    },
    waterDrop: {
        noiseCartOctaves: 2,
        warpedDistNoiseCart: 0,
        waveFreq: 60,
        displacement: 10,
        chromatic: 0,
        glow: 0.45,
        edgeGlow: 0.28,
    },
    magic: {
        noiseCartOctaves: 9,
        warpedDistNoiseCart: 0.5,
        waveFreq: 27,
        displacement: 0,
        chromatic: 6.6,
        glow: 1,
        edgeGlow: 0.5,
    },
}

// Hardcoded shader values (not exposed in property controls)
const HARDCODED = {
    noiseWarpOctaves: 1,
    warpedDistNoiseWarp: 0.05,
    sigma: 0.04,
}

/** Transition config from Framer ControlType.Transition */
interface TransitionConfig {
    type?: "tween" | "spring" | "keyframes" | "inertia"
    duration?: number
    ease?: string | number[]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restDelta?: number
    restSpeed?: number
}

function cubicBezierAt(
    t: number,
    a: number,
    b: number,
    c: number,
    d: number
): number {
    const u = 1 - t
    const t2 = t * t
    const t3 = t2 * t
    const u2 = u * u
    const u3 = u2 * u
    return 3 * u2 * t * b + 3 * u * t2 * c + t3 * d
}

const SPRING_POS_THRESHOLD = 0.0005
const SPRING_VEL_THRESHOLD = 0.0005

/** One step of spring physics: returns [newPosition, newVelocity]. No clamping so spring can overshoot and bounce. */
function springStep(
    position: number,
    velocity: number,
    target: number,
    stiffness: number,
    damping: number,
    mass: number,
    dtSec: number
): [number, number] {
    const f = -stiffness * (position - target) - damping * velocity
    const a = f / mass
    const v = velocity + a * dtSec
    const p = position + v * dtSec
    return [p, v]
}

/** Map linear t in [0,1] to eased value using Framer ease (name or cubic bezier [x1,y1,x2,y2]) */
function applyEase(t: number, ease: string | number[] | undefined): number {
    if (ease == null) return t
    if (typeof ease === "string") {
        switch (ease) {
            case "linear":
                return t
            case "easeIn":
                return t * t
            case "easeOut":
                return t * (2 - t)
            case "easeInOut":
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
            default:
                return t
        }
    }
    if (Array.isArray(ease) && ease.length >= 4) {
        const [x1, y1, x2, y2] = ease
        let lo = 0
        let hi = 1
        for (let i = 0; i < 12; i++) {
            const mid = (lo + hi) / 2
            const x = cubicBezierAt(mid, 0, x1, x2, 1)
            if (x < t) lo = mid
            else hi = mid
        }
        const u = (lo + hi) / 2
        return cubicBezierAt(u, 0, y1, y2, 1)
    }
    return t
}

const CANVAS_STYLE: React.CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    background: "transparent",
}

interface CanvasLayerRefs {
    containerRef: React.RefObject<HTMLDivElement | null>
    canvasRef: React.RefObject<HTMLCanvasElement | null>
    glRef: React.MutableRefObject<WebGLRenderingContext | null>
    programRef: React.MutableRefObject<WebGLProgram | null>
    imageTextureRef: React.MutableRefObject<WebGLTexture | null>
    overlayTextureRef: React.MutableRefObject<WebGLTexture | null>
    lastOverlayColorRef: React.MutableRefObject<string | null>
    lastOverlayOpacityRef: React.MutableRefObject<number>
    uniformLocationsRef: React.MutableRefObject<Record<
        string,
        WebGLUniformLocation | null
    > | null>
    imageLoadedRef: React.MutableRefObject<boolean>
    hasImageRef: React.MutableRefObject<boolean>
    imageAspectRef: React.MutableRefObject<number>
    progressRef: React.MutableRefObject<number>
    overlayTimeRef: React.MutableRefObject<number>
    shaderFinetuningRef: React.MutableRefObject<ShaderFinetuning>
    backgroundColorRef: React.MutableRefObject<string | undefined>
    backgroundOpacityRef: React.MutableRefObject<number>
    previewRef: React.MutableRefObject<boolean>
    renderRafRef: React.MutableRefObject<number>
}

const NoisyRippleCanvasLayer = memo(function NoisyRippleCanvasLayer({
    containerRef,
    canvasRef,
    glRef,
    programRef,
    imageTextureRef,
    overlayTextureRef,
    lastOverlayColorRef,
    lastOverlayOpacityRef,
    uniformLocationsRef,
    imageLoadedRef,
    hasImageRef,
    imageAspectRef,
    progressRef,
    overlayTimeRef,
    shaderFinetuningRef,
    backgroundColorRef,
    backgroundOpacityRef,
    previewRef,
    renderRafRef,
}: CanvasLayerRefs) {
    useLayoutEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", {
            premultipliedAlpha: true,
            alpha: true,
        })
        if (!gl) return
        glRef.current = gl
        const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
        if (!program) return
        programRef.current = program
        const positions = new Float32Array([
            -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
        ])
        const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0])
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(gl.getAttribLocation(program, "a_position"))
        gl.vertexAttribPointer(
            gl.getAttribLocation(program, "a_position"),
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(gl.getAttribLocation(program, "a_texCoord"))
        gl.vertexAttribPointer(
            gl.getAttribLocation(program, "a_texCoord"),
            2,
            gl.FLOAT,
            false,
            0,
            0
        )
    }, [canvasRef, glRef, programRef])

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        const gl = glRef.current
        const program = programRef.current
        if (!canvas || !container || !gl || !program) return
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        overlayTimeRef.current = performance.now()
        const render = () => {
            const w = Math.max(1, container.clientWidth)
            const h = Math.max(1, container.clientHeight)
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const pw = Math.round(w * dpr)
            const ph = Math.round(h * dpr)
            if (canvas.width !== pw || canvas.height !== ph) {
                canvas.width = pw
                canvas.height = ph
            }
            canvas.style.width = `${w}px`
            canvas.style.height = `${h}px`
            gl.viewport(0, 0, pw, ph)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            if (!imageLoadedRef.current || !imageTextureRef.current) {
                renderRafRef.current = requestAnimationFrame(render)
                return
            }
            gl.useProgram(program)
            const runOverlayMotion = isCanvas
            const overlayTime = runOverlayMotion
                ? performance.now() - overlayTimeRef.current
                : 0
            const bgColor = backgroundColorRef.current
            const bgOpacity =
                bgColor != null && bgColor !== ""
                    ? backgroundOpacityRef.current
                    : 0
            const colorKey = bgColor ?? ""
            if (
                overlayTextureRef.current == null ||
                lastOverlayColorRef.current !== colorKey ||
                lastOverlayOpacityRef.current !== bgOpacity
            ) {
                if (overlayTextureRef.current)
                    gl.deleteTexture(overlayTextureRef.current)
                lastOverlayColorRef.current = colorKey
                lastOverlayOpacityRef.current = bgOpacity
                overlayTextureRef.current = createSolidColorTexture(
                    gl,
                    bgColor ?? "#000000",
                    bgOpacity
                )
            }
            let locs = uniformLocationsRef.current
            if (!locs) {
                locs = {
                    u_image: gl.getUniformLocation(program, "u_image"),
                    u_overlay: gl.getUniformLocation(program, "u_overlay"),
                    u_resolution: gl.getUniformLocation(
                        program,
                        "u_resolution"
                    ),
                    u_backgroundOpacity: gl.getUniformLocation(
                        program,
                        "u_backgroundOpacity"
                    ),
                    u_imageAspect: gl.getUniformLocation(
                        program,
                        "u_imageAspect"
                    ),
                    u_progress: gl.getUniformLocation(program, "u_progress"),
                    u_time: gl.getUniformLocation(program, "u_time"),
                    u_noiseWarpOctaves: gl.getUniformLocation(
                        program,
                        "u_noiseWarpOctaves"
                    ),
                    u_noiseCartOctaves: gl.getUniformLocation(
                        program,
                        "u_noiseCartOctaves"
                    ),
                    u_warpedDistNoiseWarp: gl.getUniformLocation(
                        program,
                        "u_warpedDistNoiseWarp"
                    ),
                    u_warpedDistNoiseCart: gl.getUniformLocation(
                        program,
                        "u_warpedDistNoiseCart"
                    ),
                    u_waveFreq: gl.getUniformLocation(program, "u_waveFreq"),
                    u_sigma: gl.getUniformLocation(program, "u_sigma"),
                    u_displacement: gl.getUniformLocation(
                        program,
                        "u_displacement"
                    ),
                    u_caStrength: gl.getUniformLocation(
                        program,
                        "u_caStrength"
                    ),
                    u_glow: gl.getUniformLocation(program, "u_glow"),
                    u_edgeGlow: gl.getUniformLocation(program, "u_edgeGlow"),
                }
                uniformLocationsRef.current = locs
            }
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, imageTextureRef.current)
            gl.uniform1i(locs.u_image, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, overlayTextureRef.current)
            gl.uniform1i(locs.u_overlay, 1)
            gl.uniform2f(locs.u_resolution!, pw, ph)
            gl.uniform1f(locs.u_backgroundOpacity!, bgOpacity)
            gl.uniform1f(locs.u_imageAspect!, imageAspectRef.current)
            const progress = hasImageRef.current ? progressRef.current : 1
            gl.uniform1f(locs.u_progress!, progress)
            gl.uniform1f(locs.u_time!, overlayTime / 1000)
            const t = shaderFinetuningRef.current
            const hc = HARDCODED
            gl.uniform1f(locs.u_noiseWarpOctaves!, hc.noiseWarpOctaves)
            gl.uniform1f(locs.u_noiseCartOctaves!, t.noiseCartOctaves)
            gl.uniform1f(locs.u_warpedDistNoiseWarp!, hc.warpedDistNoiseWarp)
            gl.uniform1f(locs.u_warpedDistNoiseCart!, t.warpedDistNoiseCart)
            gl.uniform1f(locs.u_waveFreq!, t.waveFreq)
            gl.uniform1f(locs.u_sigma!, hc.sigma)
            gl.uniform1f(locs.u_displacement!, t.displacement)
            gl.uniform1f(locs.u_caStrength!, t.chromatic)
            gl.uniform1f(locs.u_glow!, t.glow)
            gl.uniform1f(locs.u_edgeGlow!, t.edgeGlow)
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            renderRafRef.current = requestAnimationFrame(render)
        }
        renderRafRef.current = requestAnimationFrame(render)
        return () => cancelAnimationFrame(renderRafRef.current)
    }, [])
    return (
        <canvas
            ref={canvasRef as React.Ref<HTMLCanvasElement>}
            style={CANVAS_STYLE}
        />
    )
})

interface NoisyRippleRevealProps {
    preview?: boolean
    masked?: boolean
    transition?: TransitionConfig
    backgroundColor?: string
    backgroundOpacity?: number
    image?: { src?: string; srcSet?: string; alt?: string }
    shaderMode?: ShaderMode
    shaderPreset?: ShaderPresetId
    shaderFinetuning?: Partial<ShaderFinetuning>
    style?: React.CSSProperties
}

const DEFAULT_TRANSITION: TransitionConfig = {
    type: "tween",
    duration: 1.5,
    ease: "easeOut",
    delay: 0,
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 500
 * @framerDisableUnlink
 */

export default function NoisyRippleReveal({
    preview = false,
    masked = true,
    transition: transitionProp,
    backgroundColor,
    backgroundOpacity = 1,
    image,
    shaderMode = "preset",
    shaderPreset = "noisy",
    shaderFinetuning: shaderFinetuningProp,
    style,
}: NoisyRippleRevealProps) {
    const transition: TransitionConfig = {
        ...DEFAULT_TRANSITION,
        ...transitionProp,
    }
    const transitionRef = useRef(transition)
    transitionRef.current = transition

    const shaderFinetuning: ShaderFinetuning =
        shaderMode === "preset"
            ? SHADER_PRESET_VALUES[shaderPreset] ?? SHADER_PRESET_VALUES.noisy
            : {
                  ...DEFAULT_SHADER_FINETUNING,
                  ...shaderFinetuningProp,
              }
    const shaderFinetuningRef = useRef(shaderFinetuning)
    shaderFinetuningRef.current = shaderFinetuning

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const imageTextureRef = useRef<WebGLTexture | null>(null)
    const overlayTextureRef = useRef<WebGLTexture | null>(null)
    const lastOverlayColorRef = useRef<string | null>(null)
    const lastOverlayOpacityRef = useRef<number>(-1)
    const uniformLocationsRef = useRef<Record<
        string,
        WebGLUniformLocation | null
    > | null>(null)
    const imageLoadedRef = useRef(false)
    const hasImageRef = useRef(false)
    const imageSrcRef = useRef<string | null>(null)
    const imageAspectRef = useRef(1)

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const previewMatters = isCanvas
    const initialProgress = previewMatters && preview ? 0.3 : masked ? 0 : 1
    const [progress, setProgress] = useState(initialProgress)
    const prevMaskedRef = useRef(masked)
    const prevPreviewRef = useRef(preview)
    const progressRef = useRef(initialProgress)
    progressRef.current = progress
    const rafRef = useRef<number>(0)
    const renderRafRef = useRef<number>(0)
    const startTimeRef = useRef<number>(0)
    const overlayTimeRef = useRef<number>(0)
    const springVelocityRef = useRef(0)
    const springPositionRef = useRef(0)

    const hasImage =
        image != null && typeof image === "object" && image.src != null
    hasImageRef.current = hasImage

    useEffect(() => {
        // Preview (static 50% hole) only applies in canvas; in preview target only masked matters
        if (previewMatters && preview) {
            prevPreviewRef.current = true
            setProgress(0.3)
            return
        }
        if (previewMatters && prevPreviewRef.current) {
            prevPreviewRef.current = false
            prevMaskedRef.current = masked
            setProgress(masked ? 0 : 1)
            return
        }

        const tr = transitionRef.current
        const durationSec = tr.duration ?? 1.5
        const delaySec = tr.delay ?? 0
        const ease = tr.ease
        const isSpring = tr.type === "spring"
        const stiffness = tr.stiffness ?? 100
        const mass = tr.mass ?? 1
        const bounce = tr.bounce ?? 0
        const baseDamping = tr.damping ?? 10
        const damping = baseDamping * (1 - bounce * 0.9)

        if (masked) {
            prevMaskedRef.current = true
            const startProgress = progressRef.current
            if (startProgress <= 0) {
                setProgress(0)
                return
            }
            const target = 0
            startTimeRef.current = performance.now()
            springPositionRef.current = startProgress
            springVelocityRef.current = 0
            let cancelled = false
            let lastSpringTime = performance.now() / 1000
            const animate = (now: number) => {
                if (cancelled) return
                const elapsed = (now - startTimeRef.current) / 1000
                if (elapsed < delaySec) {
                    lastSpringTime = now / 1000
                    rafRef.current = requestAnimationFrame(animate)
                    return
                }
                if (isSpring) {
                    const nowSec = now / 1000
                    const dt = Math.min(nowSec - lastSpringTime, 1 / 30)
                    lastSpringTime = nowSec
                    const [p, v] = springStep(
                        springPositionRef.current,
                        springVelocityRef.current,
                        target,
                        stiffness,
                        damping,
                        mass,
                        dt
                    )
                    springPositionRef.current = p
                    springVelocityRef.current = v
                    setProgress(p)
                    const settled =
                        Math.abs(p - target) < SPRING_POS_THRESHOLD &&
                        Math.abs(v) < SPRING_VEL_THRESHOLD
                    if (!settled && elapsed < 10)
                        rafRef.current = requestAnimationFrame(animate)
                } else {
                    const rawT = Math.min(1, (elapsed - delaySec) / durationSec)
                    const t = applyEase(rawT, ease)
                    setProgress(startProgress * (1.0 - t))
                    if (rawT < 1)
                        rafRef.current = requestAnimationFrame(animate)
                }
            }
            rafRef.current = requestAnimationFrame(animate)
            return () => {
                cancelled = true
                if (rafRef.current) cancelAnimationFrame(rafRef.current)
            }
        }
        const wasMasked = prevMaskedRef.current
        prevMaskedRef.current = false
        if (!wasMasked) return
        const target = 1
        const revealStart = progressRef.current
        startTimeRef.current = performance.now()
        springPositionRef.current = revealStart
        springVelocityRef.current = 0
        let cancelled = false
        let lastSpringTime = performance.now() / 1000
        const animate = (now: number) => {
            if (cancelled) return
            const elapsed = (now - startTimeRef.current) / 1000
            if (elapsed < delaySec) {
                lastSpringTime = now / 1000
                rafRef.current = requestAnimationFrame(animate)
                return
            }
            if (isSpring) {
                const nowSec = now / 1000
                const dt = Math.min(nowSec - lastSpringTime, 1 / 30)
                lastSpringTime = nowSec
                const [p, v] = springStep(
                    springPositionRef.current,
                    springVelocityRef.current,
                    target,
                    stiffness,
                    damping,
                    mass,
                    dt
                )
                springPositionRef.current = p
                springVelocityRef.current = v
                setProgress(p)
                const settled =
                    Math.abs(p - target) < SPRING_POS_THRESHOLD &&
                    Math.abs(v) < SPRING_VEL_THRESHOLD
                if (!settled && elapsed < 10)
                    rafRef.current = requestAnimationFrame(animate)
            } else {
                const rawT = Math.min(1, (elapsed - delaySec) / durationSec)
                const t = applyEase(rawT, ease)
                setProgress(revealStart + (1 - revealStart) * t)
                if (rawT < 1) rafRef.current = requestAnimationFrame(animate)
            }
        }
        rafRef.current = requestAnimationFrame(animate)
        return () => {
            cancelled = true
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [masked, preview, previewMatters])

    useEffect(() => {
        const gl = glRef.current
        if (!gl) return
        if (!hasImage || !image?.src) {
            imageSrcRef.current = null
            imageAspectRef.current = 1
            if (imageTextureRef.current) {
                gl.deleteTexture(imageTextureRef.current)
                imageTextureRef.current = null
            }
            if (!hasImage) {
                const placeholder = createPlaceholderTexture(gl)
                if (placeholder) {
                    imageTextureRef.current = placeholder
                    imageLoadedRef.current = true
                } else {
                    imageLoadedRef.current = false
                }
            } else {
                imageLoadedRef.current = false
            }
            return
        }
        const src = image.src
        imageLoadedRef.current = false
        if (imageTextureRef.current) {
            gl.deleteTexture(imageTextureRef.current)
            imageTextureRef.current = null
        }
        imageSrcRef.current = src
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            if (imageSrcRef.current !== src) return
            const gl = glRef.current
            if (!gl) return
            if (imageTextureRef.current)
                gl.deleteTexture(imageTextureRef.current)
            const texture = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, texture)
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
            imageTextureRef.current = texture
            imageLoadedRef.current = true
            imageAspectRef.current =
                img.naturalWidth / Math.max(1, img.naturalHeight)
        }
        img.onerror = () => {
            if (imageSrcRef.current === src) imageSrcRef.current = null
        }
        img.src = src
    }, [hasImage, image, image?.src])

    const backgroundColorRef = useRef(backgroundColor)
    backgroundColorRef.current = backgroundColor
    const backgroundOpacityRef = useRef(backgroundOpacity)
    backgroundOpacityRef.current = backgroundOpacity
    const previewRef = useRef(preview)
    previewRef.current = preview

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: !hasImage ? "transparent" : backgroundColor,
            }}
        >
            {!hasImage && (
                <ComponentMessage
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 1,
                        pointerEvents: "none",
                    }}
                    title="Noisy Ripple Reveal"
                    subtitle="Add an image to create a nice ripple reveal effect."
                />
            )}
            <NoisyRippleCanvasLayer
                containerRef={containerRef}
                canvasRef={canvasRef}
                glRef={glRef}
                programRef={programRef}
                imageTextureRef={imageTextureRef}
                overlayTextureRef={overlayTextureRef}
                lastOverlayColorRef={lastOverlayColorRef}
                lastOverlayOpacityRef={lastOverlayOpacityRef}
                uniformLocationsRef={uniformLocationsRef}
                imageLoadedRef={imageLoadedRef}
                hasImageRef={hasImageRef}
                imageAspectRef={imageAspectRef}
                progressRef={progressRef}
                overlayTimeRef={overlayTimeRef}
                shaderFinetuningRef={shaderFinetuningRef}
                backgroundColorRef={backgroundColorRef}
                backgroundOpacityRef={backgroundOpacityRef}
                previewRef={previewRef}
                renderRafRef={renderRafRef}
            />
        </div>
    )
}

addPropertyControls(NoisyRippleReveal, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "Static",
        disabledTitle: "Dynamic",
    },

    masked: {
        type: ControlType.Boolean,
        title: "Masked",
        defaultValue: true,
        enabledTitle: "Off",
        disabledTitle: "On",
        hidden: (props) => props.preview === true,
    },
    
    shaderMode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["preset", "custom"],
        optionTitles: ["Preset", "Custom"],
        defaultValue: "preset",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    shaderPreset: {
        type: ControlType.Enum,
        title: "Preset",
        options: ["noisy", "sharp", "water", "waterDrop", "magic"],
        optionTitles: ["Noisy", "Sharp", "Water", "Water drop", "Magic"],
        defaultValue: "noisy",
        hidden: (props: NoisyRippleRevealProps) =>
            (props.shaderMode ?? "preset") !== "preset",
    },
    shaderFinetuning: {
        type: ControlType.Object,
        title: "Shader",
        hidden: (props: NoisyRippleRevealProps) =>
            (props.shaderMode ?? "preset") !== "custom",
        controls: {
            noiseCartOctaves: {
                type: ControlType.Number,
                title: "Octaves",
                min: 1,
                max: 10,
                step: 1,
                defaultValue: DEFAULT_SHADER_FINETUNING.noiseCartOctaves,
            },
            warpedDistNoiseCart: {
                type: ControlType.Number,
                title: "Warp",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: DEFAULT_SHADER_FINETUNING.warpedDistNoiseCart,
            },
            waveFreq: {
                type: ControlType.Number,
                title: "Freq",
                min: 4,
                max: 60,
                step: 1,
                defaultValue: DEFAULT_SHADER_FINETUNING.waveFreq,
            },
            displacement: {
                type: ControlType.Number,
                title: "Liquid",
                min: 0,
                max: 10,
                step: 1,
                defaultValue: DEFAULT_SHADER_FINETUNING.displacement,
            },
            chromatic: {
                type: ControlType.Number,
                title: "Chromatic",
                min: 0,
                max: 30,
                step: 0.05,
                defaultValue: DEFAULT_SHADER_FINETUNING.chromatic,
            },
            glow: {
                type: ControlType.Number,
                title: "Intensity",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: DEFAULT_SHADER_FINETUNING.glow,
            },
            edgeGlow: {
                type: ControlType.Number,
                title: "Edge",
                min: 0,
                max: 0.5,
                step: 0.02,
                defaultValue: DEFAULT_SHADER_FINETUNING.edgeGlow,
            },
        },
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        optional: true,
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: DEFAULT_TRANSITION,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

NoisyRippleReveal.displayName = "Magic Shader Mask"
