import React, {
    useRef,
    useEffect,
    useState,
    useLayoutEffect,
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

varying vec2 v_uv;

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
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

float fbm(vec2 p, float octaves) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    int n = int(floor(octaves + 0.5));
    for (int i = 0; i < 4; i++) {
        if (i >= n) break;
        val += amp * vnoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return val;
}

void main() {
    vec2 uv = v_uv;
    vec2 size = u_resolution;
    float progress = u_progress;
    
    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv - center;
    float aspect = size.x / size.y;
    p.x *= aspect;
    
    float dist = length(p);
    float maxDist = length(vec2(0.5 * aspect, 0.5));
    float normDist = clamp(dist / maxDist, 0.0, 1.0);
    float angle = atan(p.y, p.x);
    
    float noiseWarp = fbm(vec2(angle * 2.0 + 10.0, normDist * 4.0 + progress * 1.5), u_noiseWarpOctaves);
    float noiseCart = fbm(p * 8.0 + vec2(progress * 1.5, -progress * 1.0), u_noiseCartOctaves);
    float warpedDist = normDist + (noiseWarp - 0.5) * u_warpedDistNoiseWarp + (noiseCart - 0.5) * u_warpedDistNoiseCart;
    
    float waveFront = progress * 1.15;
    float sigma = u_sigma;
    float delta = warpedDist - waveFront;
    float baseEnvelope = exp(-delta * delta / (2.0 * sigma * sigma));
    
    float waveFreq = u_waveFreq;
    float ripples = 0.5 + 0.5 * cos(delta * waveFreq);
    float envelope = baseEnvelope * ripples;
    
    float feather = 0.15;
    float behindWave = smoothstep(waveFront + feather, waveFront - feather, warpedDist);
    
    float gate = smoothstep(0.0, 0.03, progress);
    envelope *= gate;
    behindWave *= gate;
    
    vec2 dir = (dist > 0.001) ? normalize(p) : vec2(0.0);
    float pushAmt = envelope * u_displacement;
    vec2 uvOffset = dir * pushAmt;
    uvOffset.x /= aspect;
    
    float caStrength = envelope * u_caStrength;
    vec2 caOffset = dir * caStrength;
    caOffset.x /= aspect;
    
    vec2 sampleUV = uv - uvOffset;
    float imgR = texture2D(u_image, sampleUV - caOffset).r;
    float imgG = texture2D(u_image, sampleUV).g;
    float imgB = texture2D(u_image, sampleUV + caOffset).b;
    float imgA = texture2D(u_image, sampleUV).a;
    vec4 imgColor = vec4(imgR, imgG, imgB, imgA);
    
    float glow = envelope * u_glow;
    imgColor.rgb = clamp(imgColor.rgb / max(1.0 - glow, 0.1), 0.0, 1.0);
    
    float imageVisibility = 1.0 - behindWave;
    
    vec4 overlayColor = texture2D(u_overlay, uv);
    vec4 finalColor = mix(overlayColor, imgColor, imageVisibility);
    finalColor.rgb += vec3(envelope * u_edgeGlow);
    
    gl_FragColor = finalColor;
}
`

// --- Gradient helpers ---
function parseColorToRgb(c: string): [number, number, number] {
    if (!c || typeof c !== "string") return [0.9, 0.4, 0.3]
    const hex = c.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    if (hex) {
        const s = hex[1]
        if (s.length === 3) {
            return [
                parseInt(s[0] + s[0], 16) / 255,
                parseInt(s[1] + s[1], 16) / 255,
                parseInt(s[2] + s[2], 16) / 255,
            ]
        }
        return [
            parseInt(s.slice(0, 2), 16) / 255,
            parseInt(s.slice(2, 4), 16) / 255,
            parseInt(s.slice(4, 6), 16) / 255,
        ]
    }
    const rgba = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (rgba) {
        return [
            Number(rgba[1]) / 255,
            Number(rgba[2]) / 255,
            Number(rgba[3]) / 255,
        ]
    }
    return [0.9, 0.4, 0.3]
}

function lerp(
    a: [number, number, number],
    b: [number, number, number],
    t: number
): [number, number, number] {
    t = Math.max(0, Math.min(1, t))
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ]
}

function createOverlayTexture(
    gl: WebGLRenderingContext,
    width: number,
    height: number,
    colorTop: string,
    colorLeft: string,
    colorRight: string,
    time: number
): WebGLTexture | null {
    const peach = parseColorToRgb(colorTop)
    const purple = parseColorToRgb(colorLeft)
    const teal = parseColorToRgb(colorRight)
    const pixels = new Uint8Array(width * height * 4)
    const t0 = time / 1000
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const uvx = x / width
            const uvy = y / height
            const t = uvy + 0.2 * Math.sin(t0 + uvx * 3)
            const p = uvx + 0.2 * Math.cos(t0 + uvy * 6)
            const pt = Math.max(0, Math.min(1, p))
            const tt = Math.max(0, Math.min(1, t))
            const bottomColor = lerp(purple, teal, pt)
            const color = lerp(bottomColor, peach, tt)
            const i = (y * width + x) * 4
            pixels[i] = Math.round(color[0] * 255)
            pixels[i + 1] = Math.round(color[1] * 255)
            pixels[i + 2] = Math.round(color[2] * 255)
            pixels[i + 3] = 255
        }
    }
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return texture
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
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

function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
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

const DEFAULT_PEACH = "#e6664d"
const DEFAULT_PURPLE = "#331a99"
const DEFAULT_TEAL = "#00cccc"

export interface ShaderFinetuning {
    noiseWarpOctaves: number
    noiseCartOctaves: number
    warpedDistNoiseWarp: number
    warpedDistNoiseCart: number
    waveFreq: number
    sigma: number
    displacement: number
    caStrength: number
    glow: number
    edgeGlow: number
}

export const DEFAULT_SHADER_FINETUNING: ShaderFinetuning = {
    noiseWarpOctaves: 3,
    noiseCartOctaves: 2,
    warpedDistNoiseWarp: 0.25,
    warpedDistNoiseCart: 0.2,
    waveFreq: 12.0,
    sigma: 0.12,
    displacement: 0.05,
    caStrength: 0.003,
    glow: 0.4,
    edgeGlow: 0.15,
}

interface NoisyRippleRevealProps {
    preview?: boolean
    masked?: boolean
    duration?: number
    image?: { src?: string; srcSet?: string; alt?: string }
    colorTop?: string
    colorLeft?: string
    colorRight?: string
    shaderFinetuning?: Partial<ShaderFinetuning>
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 300
 * @framerDisableUnlink
 */
export default function NoisyRippleReveal({
    preview = false,
    masked = true,
    duration = 1.5,
    image,
    colorTop = DEFAULT_PEACH,
    colorLeft = DEFAULT_PURPLE,
    colorRight = DEFAULT_TEAL,
    shaderFinetuning: shaderFinetuningProp,
    style,
}: NoisyRippleRevealProps) {
    const shaderFinetuning: ShaderFinetuning = {
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
    const imageLoadedRef = useRef(false)

    const [progress, setProgress] = useState(masked ? 0 : 1)
    const prevMaskedRef = useRef(masked)
    const rafRef = useRef<number>(0)
    const renderRafRef = useRef<number>(0)
    const startTimeRef = useRef<number>(0)
    const overlayTimeRef = useRef<number>(0)

    const hasImage = image != null && typeof image === "object" && image.src != null

    useEffect(() => {
        if (masked) {
            prevMaskedRef.current = true
            setProgress(0)
            return
        }
        const wasMasked = prevMaskedRef.current
        prevMaskedRef.current = false
        if (!wasMasked) return
        startTimeRef.current = performance.now()
        let cancelled = false
        const animate = (now: number) => {
            if (cancelled) return
            const elapsed = (now - startTimeRef.current) / 1000
            const t = Math.min(1, elapsed / duration)
            setProgress(t)
            if (t < 1) rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
        return () => {
            cancelled = true
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [masked, duration])

    useLayoutEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true })
        if (!gl) return
        glRef.current = gl
        const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
        if (!program) return
        programRef.current = program
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
        const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0])
        const posBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(gl.getAttribLocation(program, "a_position"))
        gl.vertexAttribPointer(gl.getAttribLocation(program, "a_position"), 2, gl.FLOAT, false, 0, 0)
        const texBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(gl.getAttribLocation(program, "a_texCoord"))
        gl.vertexAttribPointer(gl.getAttribLocation(program, "a_texCoord"), 2, gl.FLOAT, false, 0, 0)
    }, [])

    useEffect(() => {
        const gl = glRef.current
        if (!gl || !hasImage || !image?.src) return
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            if (imageTextureRef.current) gl.deleteTexture(imageTextureRef.current)
            const texture = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            imageTextureRef.current = texture
            imageLoadedRef.current = true
        }
        img.src = image.src
    }, [hasImage, image?.src])

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        const gl = glRef.current
        const program = programRef.current
        if (!canvas || !container || !gl || !program) return
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const runOverlayMotion = preview || isCanvas
        overlayTimeRef.current = performance.now()

        const render = () => {
            const w = container.clientWidth
            const h = container.clientHeight
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            if (!imageLoadedRef.current || !imageTextureRef.current) {
                renderRafRef.current = requestAnimationFrame(render)
                return
            }
            gl.useProgram(program)
            const overlayTime = runOverlayMotion ? performance.now() - overlayTimeRef.current : 0
            if (overlayTextureRef.current) gl.deleteTexture(overlayTextureRef.current)
            overlayTextureRef.current = createOverlayTexture(gl, 128, 128, colorTop, colorLeft, colorRight, overlayTime)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, imageTextureRef.current)
            gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, overlayTextureRef.current)
            gl.uniform1i(gl.getUniformLocation(program, "u_overlay"), 1)
            gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), w, h)
            gl.uniform1f(gl.getUniformLocation(program, "u_progress"), progress)
            gl.uniform1f(gl.getUniformLocation(program, "u_time"), overlayTime / 1000)
            const t = shaderFinetuningRef.current
            gl.uniform1f(gl.getUniformLocation(program, "u_noiseWarpOctaves"), t.noiseWarpOctaves)
            gl.uniform1f(gl.getUniformLocation(program, "u_noiseCartOctaves"), t.noiseCartOctaves)
            gl.uniform1f(gl.getUniformLocation(program, "u_warpedDistNoiseWarp"), t.warpedDistNoiseWarp)
            gl.uniform1f(gl.getUniformLocation(program, "u_warpedDistNoiseCart"), t.warpedDistNoiseCart)
            gl.uniform1f(gl.getUniformLocation(program, "u_waveFreq"), t.waveFreq)
            gl.uniform1f(gl.getUniformLocation(program, "u_sigma"), t.sigma)
            gl.uniform1f(gl.getUniformLocation(program, "u_displacement"), t.displacement)
            gl.uniform1f(gl.getUniformLocation(program, "u_caStrength"), t.caStrength)
            gl.uniform1f(gl.getUniformLocation(program, "u_glow"), t.glow)
            gl.uniform1f(gl.getUniformLocation(program, "u_edgeGlow"), t.edgeGlow)
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            renderRafRef.current = requestAnimationFrame(render)
        }
        renderRafRef.current = requestAnimationFrame(render)
        return () => cancelAnimationFrame(renderRafRef.current)
    }, [progress, preview, colorTop, colorLeft, colorRight])

    if (!hasImage) {
        return (
            <ComponentMessage
                style={{ ...style, position: "relative", width: "100%", height: "100%" }}
                title="Noisy Ripple Reveal"
                subtitle="Add an image to reveal"
            />
        )
    }

    return (
        <div ref={containerRef} style={{ ...style, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>
    )
}

addPropertyControls(NoisyRippleReveal, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    masked: {
        type: ControlType.Boolean,
        title: "Masked",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.3,
        max: 4,
        step: 0.1,
        defaultValue: 1.5,
        unit: "s",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    shaderFinetuning: {
        type: ControlType.Object,
        title: "Shader Finetuning",
        controls: {
            noiseWarpOctaves: {
                type: ControlType.Number,
                title: "Noise warp octaves",
                min: 1,
                max: 4,
                step: 1,
                defaultValue: DEFAULT_SHADER_FINETUNING.noiseWarpOctaves,
            },
            noiseCartOctaves: {
                type: ControlType.Number,
                title: "Noise cart octaves",
                min: 1,
                max: 4,
                step: 1,
                defaultValue: DEFAULT_SHADER_FINETUNING.noiseCartOctaves,
            },
            warpedDistNoiseWarp: {
                type: ControlType.Number,
                title: "Noise multiplier warp",
                min: 0,
                max: 0.8,
                step: 0.05,
                defaultValue: DEFAULT_SHADER_FINETUNING.warpedDistNoiseWarp,
            },
            warpedDistNoiseCart: {
                type: ControlType.Number,
                title: "Noise multiplier cart",
                min: 0,
                max: 0.8,
                step: 0.05,
                defaultValue: DEFAULT_SHADER_FINETUNING.warpedDistNoiseCart,
            },
            waveFreq: {
                type: ControlType.Number,
                title: "Wave freq",
                min: 4,
                max: 60,
                step: 1,
                defaultValue: DEFAULT_SHADER_FINETUNING.waveFreq,
            },
            sigma: {
                type: ControlType.Number,
                title: "Sigma",
                min: 0.04,
                max: 0.4,
                step: 0.01,
                defaultValue: DEFAULT_SHADER_FINETUNING.sigma,
            },
            displacement: {
                type: ControlType.Number,
                title: "Displacement",
                min: 0,
                max: 0.25,
                step: 0.01,
                defaultValue: DEFAULT_SHADER_FINETUNING.displacement,
            },
            caStrength: {
                type: ControlType.Number,
                title: "Chromatic aberration",
                min: 0,
                max: 0.02,
                step: 0.001,
                defaultValue: DEFAULT_SHADER_FINETUNING.caStrength,
            },
            glow: {
                type: ControlType.Number,
                title: "Glow intensity",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: DEFAULT_SHADER_FINETUNING.glow,
            },
            edgeGlow: {
                type: ControlType.Number,
                title: "Edge glow",
                min: 0,
                max: 0.5,
                step: 0.02,
                defaultValue: DEFAULT_SHADER_FINETUNING.edgeGlow,
            },
        },
    },
    colorTop: {
        type: ControlType.Color,
        title: "Top",
        defaultValue: DEFAULT_PEACH,
    },
    colorLeft: {
        type: ControlType.Color,
        title: "Left",
        defaultValue: DEFAULT_PURPLE,
    },
    colorRight: {
        type: ControlType.Color,
        title: "Right",
        defaultValue: DEFAULT_TEAL,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

NoisyRippleReveal.displayName = "Noisy Ripple Reveal"
