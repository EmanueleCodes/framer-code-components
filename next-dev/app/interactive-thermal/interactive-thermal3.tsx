import React, { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface HeatmapProps {
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
        color9?: string
        color10?: string
        bgColor?: string
    }
    speed?: number
    contour?: number
    angle?: number
    noise?: number
    innerGlow?: number
    outerGlow?: number
    cursorSize?: number
    cursorStrength?: number
    image?: string | ResponsiveImage
}

type ResponsiveImage =
    | {
          src?: string
          url?: string
          srcSet?: string | Array<{ src: string }>
          default?: string
          asset?: { url?: string }
      }
    | null
    | undefined

const MAX_COLORS = 10
const HEAT_RESOLUTION = 528
const DEFAULT_PALETTE = [
    "#11206a",
    "#1f3ba2",
    "#2f63e7",
    "#6bd7ff",
    "#ffe679",
    "#ff991e",
    "#ff4c00",
    "#ff4c00",
    "#ff4c00",
    "#ff4c00",
]

const parseSimpleColor = (
    value: string
): [number, number, number, number] | null => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null

    if (trimmed.startsWith("#")) {
        const hex = trimmed.slice(1)
        let expanded = hex
        if (hex.length === 3) {
            expanded = hex
                .split("")
                .map((char) => char + char)
                .join("")
        } else if (hex.length === 4) {
            expanded = hex
                .split("")
                .map((char) => char + char)
                .join("")
        }

        if (expanded.length === 6 || expanded.length === 8) {
            const r = parseInt(expanded.slice(0, 2), 16)
            const g = parseInt(expanded.slice(2, 4), 16)
            const b = parseInt(expanded.slice(4, 6), 16)
            const a =
                expanded.length === 8
                    ? parseInt(expanded.slice(6, 8), 16) / 255
                    : 1
            if ([r, g, b].every((channel) => !Number.isNaN(channel))) {
                return [r / 255, g / 255, b / 255, Number.isNaN(a) ? 1 : a]
            }
        }
    }

    const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i)
    if (rgbaMatch) {
        const parts = rgbaMatch[1]
            .split(",")
            .map((segment) => segment.trim())
            .filter(Boolean)
        if (parts.length >= 3) {
            const parseChannel = (channel: string): number | null => {
                if (channel.endsWith("%")) {
                    const percent = parseFloat(channel.slice(0, -1))
                    if (Number.isNaN(percent)) return null
                    return Math.min(255, Math.max(0, (percent / 100) * 255))
                }
                const value = parseFloat(channel)
                if (Number.isNaN(value)) return null
                return value
            }

            const r = parseChannel(parts[0] ?? "")
            const g = parseChannel(parts[1] ?? "")
            const b = parseChannel(parts[2] ?? "")
            const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1
            if (r !== null && g !== null && b !== null) {
                return [
                    r / 255,
                    g / 255,
                    b / 255,
                    Number.isNaN(a) ? 1 : Math.min(1, Math.max(0, a)),
                ]
            }
        }
    }

    return null
}

const createColorParser = () => {
    if (typeof document === "undefined") {
        const cache = new Map<string, [number, number, number, number]>()
        return (
            input: string,
            fallback: string
        ): [number, number, number, number] => {
            const key = `${input}|${fallback}`
            const cached = cache.get(key)
            if (cached) return cached

            const parsed = parseSimpleColor(input) ??
                parseSimpleColor(fallback) ?? [0, 0, 0, 1]
            cache.set(key, parsed)
            return parsed
        }
    }

    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")
    const cache = new Map<string, [number, number, number, number]>()

    return (
        input: string,
        fallback: string
    ): [number, number, number, number] => {
        const key = `${input}|${fallback}`
        const cached = cache.get(key)
        if (cached) return cached
        if (!context) return [0, 0, 0, 1]

        try {
            context.clearRect(0, 0, 1, 1)
            context.fillStyle = fallback
            context.fillRect(0, 0, 1, 1)
            context.fillStyle = input
            context.fillRect(0, 0, 1, 1)
            const data = context.getImageData(0, 0, 1, 1).data
            const rgba: [number, number, number, number] = [
                data[0] / 255,
                data[1] / 255,
                data[2] / 255,
                data[3] / 255,
            ]
            cache.set(key, rgba)
            return rgba
        } catch {
            return parseSimpleColor(fallback) ?? [0, 0, 0, 1]
        }
    }
}

const parseCssColor = createColorParser()

const buildColorUniformData = (colors?: HeatmapProps["colors"]) => {
    const entries: string[] = []
    if (colors) {
        for (let i = 0; i < MAX_COLORS; i++) {
            const key = `color${i + 1}` as keyof typeof colors
            const value = colors?.[key]
            if (typeof value === "string" && value.trim().length > 0) {
                entries.push(value.trim())
            }
        }
    }

    if (entries.length === 0) {
        entries.push(...DEFAULT_PALETTE)
    }

    while (entries.length < MAX_COLORS) {
        entries.push(
            entries[entries.length - 1] ||
                DEFAULT_PALETTE[entries.length % DEFAULT_PALETTE.length]
        )
    }

    const values = new Float32Array(MAX_COLORS * 4)
    for (let i = 0; i < MAX_COLORS; i++) {
        const fallback = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]
        const rgba = parseCssColor(entries[i]!, fallback)
        values[i * 4 + 0] = rgba[0]
        values[i * 4 + 1] = rgba[1]
        values[i * 4 + 2] = rgba[2]
        values[i * 4 + 3] = rgba[3]
    }

    const rawCount =
        colors?.paletteCount ??
        entries.filter(
            (value, index) => index < MAX_COLORS && value !== undefined
        ).length
    const count = Math.min(
        MAX_COLORS,
        Math.max(1, rawCount || DEFAULT_PALETTE.length)
    )

    return { values, count }
}

type UniformLocations = {
    u_resolution: WebGLUniformLocation | null
    u_imageAspectRatio: WebGLUniformLocation | null
    u_image: WebGLUniformLocation | null
    u_heatmap: WebGLUniformLocation | null
    u_time: WebGLUniformLocation | null
    u_colorBack: WebGLUniformLocation | null
    u_colorsCount: WebGLUniformLocation | null
    u_angle: WebGLUniformLocation | null
    u_noise: WebGLUniformLocation | null
    u_innerGlow: WebGLUniformLocation | null
    u_outerGlow: WebGLUniformLocation | null
    u_contour: WebGLUniformLocation | null
    u_imageScale: WebGLUniformLocation | null
    u_colors: Array<WebGLUniformLocation | null>
}

// Vertex shader (WebGL 2)
const vertexShader = `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_imageAspectRatio;

out vec2 v_imageUV;
out vec2 v_objectUV;

void main() {
    gl_Position = a_position;
    
    vec2 uv = gl_Position.xy * .5;
    
    // Object UV (for shader animations)
    v_objectUV = uv;
    
    // Image UV (for texture sampling) - use 'contain' fit
    vec2 imageBoxSize;
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
    imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
    vec2 imageBoxScale = u_resolution.xy / imageBoxSize;
    
    v_imageUV = uv;
    v_imageUV *= imageBoxScale;
    v_imageUV += .5;
    v_imageUV.y = 1. - v_imageUV.y;
}
`

// Fragment shader (adapted from Thermal-Shader.ts)
const fragmentShader = `#version 300 es
precision highp float;

in mediump vec2 v_imageUV;
in mediump vec2 v_objectUV;
out vec4 fragColor;

uniform sampler2D u_image;
uniform sampler2D u_heatmap;
uniform float u_time;
uniform mediump float u_imageAspectRatio;

uniform vec4 u_colorBack;
uniform vec4 u_colors[${MAX_COLORS}];
uniform float u_colorsCount;

uniform float u_angle;
uniform float u_noise;
uniform float u_innerGlow;
uniform float u_outerGlow;
uniform float u_contour;
uniform float u_imageScale;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

float getImgFrame(vec2 uv, float th) {
    float frame = 1.;
    frame *= smoothstep(0., th, uv.y);
    frame *= 1. - smoothstep(1. - th, 1., uv.y);
    frame *= smoothstep(0., th, uv.x);
    frame *= 1. - smoothstep(1. - th, 1., uv.x);
    return frame;
}

float circle(vec2 uv, vec2 c, vec2 r) {
    return 1. - smoothstep(r[0], r[1], length(uv - c));
}

float lst(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float sst(float edge0, float edge1, float x) {
    return smoothstep(edge0, edge1, x);
}

float shadowShape(vec2 uv, float t, float contour) {
    vec2 scaledUV = uv;
    float posY = mix(-1., 2., t);

    scaledUV.y -= .5;
    float mainCircleScale = sst(0., .8, posY) * lst(1.4, .9, posY);
    scaledUV *= vec2(1., 1. + 1.5 * mainCircleScale);
    scaledUV.y += .5;

    float innerR = .4;
    float outerR = 1. - .3 * (sst(.1, .2, t) * (1. - sst(.2, .5, t)));
    float s = circle(scaledUV, vec2(.5, posY - .2), vec2(innerR, outerR));
    s = pow(s, 1.4);
    s *= 1.2;

    float topFlattener = 0.;
    {
        float pos = posY - uv.y;
        float edge = 1.2;
        topFlattener = lst(-.4, 0., pos) * (1. - sst(.0, edge, pos));
        topFlattener = pow(topFlattener, 3.);
        float topFlattenerMixer = (1. - sst(.0, .3, pos));
        s = mix(topFlattener, s, topFlattenerMixer);
    }

    {
        float visibility = sst(.6, .7, t) * (1. - sst(.8, .9, t));
        float angle = -2. - t * TWO_PI;
        float rightCircle = circle(uv, vec2(.95 - .2 * cos(angle), .4 - .1 * sin(angle)), vec2(.15, .3));
        rightCircle *= visibility;
        s = mix(s, 0., rightCircle);
    }

    {
        float topCircle = circle(uv, vec2(.5, .19), vec2(.05, .25));
        topCircle += 2. * contour * circle(uv, vec2(.5, .19), vec2(.2, .5));
        float visibility = .55 * sst(.2, .3, t) * (1. - sst(.3, .45, t));
        topCircle *= visibility;
        s = mix(s, 0., topCircle);
    }

    float leafMask = circle(uv, vec2(.53, .13), vec2(.08, .19));
    leafMask = mix(leafMask, 0., 1. - sst(.4, .54, uv.x));
    leafMask = mix(0., leafMask, sst(.0, .2, uv.y));
    leafMask *= (sst(.5, 1.1, posY) * sst(1.5, 1.3, posY));
    s += leafMask;

    {
        float visibility = sst(.0, .4, t) * (1. - sst(.6, .8, t));
        s = mix(s, 0., visibility * circle(uv, vec2(.52, .92), vec2(.09, .25)));
    }

    {
        float pos = sst(.0, .6, t) * (1. - sst(.6, 1., t));
        s = mix(s, .5, circle(uv, vec2(.0, 1.2 - .5 * pos), vec2(.1, .3)));
        s = mix(s, .0, circle(uv, vec2(1., .5 + .5 * pos), vec2(.1, .3)));

        s = mix(s, 1., circle(uv, vec2(.95, .2 + .2 * sst(.3, .4, t) * sst(.7, .5, t)), vec2(.07, .22)));
        s = mix(s, 1., circle(uv, vec2(.95, .2 + .2 * sst(.3, .4, t) * (1. - sst(.5, .7, t))), vec2(.07, .22)));
        s /= max(1e-4, sst(1., .85, uv.y));
    }

    s = clamp(s, 0., 1.);
    return s;
}

void main() {
    vec2 uv = v_objectUV + .5;
    uv.y = 1. - uv.y;

    vec2 imgUV = v_imageUV;
    imgUV -= .5;
    imgUV *= u_imageScale;
    imgUV += .5;
    float imgSoftFrame = getImgFrame(imgUV, .03);

    vec4 img = texture(u_image, imgUV);
    if (img.a == 0.) {
        fragColor = u_colorBack;
        return;
    }

    float t = .1 * u_time;
    t -= .3;

    float tCopy = t + 1. / 3.;
    float tCopy2 = t + 2. / 3.;

    t = mod(t, 1.);
    tCopy = mod(tCopy, 1.);
    tCopy2 = mod(tCopy2, 1.);

    vec2 animationUV = imgUV - vec2(.5);
    float angle = -u_angle * PI / 180.;
    float cosA = cos(angle);
    float sinA = sin(angle);
    animationUV = vec2(
        animationUV.x * cosA - animationUV.y * sinA,
        animationUV.x * sinA + animationUV.y * cosA
    ) + vec2(.5);

    float shape = img[0];
    float outerBlur = 1. - mix(1., img[1], shape);
    float innerBlur = mix(img[1], 0., shape);
    float contour = mix(img[2], 0., shape);

    outerBlur *= imgSoftFrame;

    float shadow = shadowShape(animationUV, t, innerBlur);
    float shadowCopy = shadowShape(animationUV, tCopy, innerBlur);
    float shadowCopy2 = shadowShape(animationUV, tCopy2, innerBlur);

    float inner = .8 + .8 * innerBlur;
    inner = mix(inner, 0., shadow);
    inner = mix(inner, 0., shadowCopy);
    inner = mix(inner, 0., shadowCopy2);

    inner *= mix(0., 2., u_innerGlow);

    inner += (u_contour * 2.) * contour;
    inner = min(1., inner);
    inner *= (1. - shape);

    float outer = 0.;
    {
        t *= 3.;
        t = mod(t - .1, 1.);

        outer = .9 * pow(outerBlur, .8);
        float y = mod(animationUV.y - t, 1.);
        float animatedMask = sst(.3, .65, y) * (1. - sst(.65, 1., y));
        animatedMask = .5 + animatedMask;
        outer *= animatedMask;
        outer *= mix(0., 5., pow(u_outerGlow, 2.));
        outer *= imgSoftFrame;
    }

    inner = pow(inner, 1.2);
    float heat = clamp(inner + outer, 0., 1.);

    // Add cursor trail heat contribution (masked to black pixels only)
    vec2 heatUV = v_objectUV + 0.5;
    float cursorHeat = texture(u_heatmap, heatUV).r;
    cursorHeat *= (1.0 - shape); // Only show on black pixels (shape = 0 for black)
    cursorHeat *= imgSoftFrame; // Also respect the image frame
    // Boost cursor to reach red-orange colors at high intensity
    heat = max(heat, pow(cursorHeat, 0.8) * 1.2);

    heat += (.005 + .35 * u_noise) * (fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123) - .5);

    float mixer = heat * u_colorsCount;
    vec4 gradient = u_colors[0];
    gradient.rgb *= gradient.a;
    float outerShape = 0.;
    for (int i = 1; i < ${MAX_COLORS + 1}; i++) {
        if (i > int(u_colorsCount)) break;
        float m = clamp(mixer - float(i - 1), 0., 1.);
        if (i == 1) {
            outerShape = m;
        }
        vec4 c = u_colors[i - 1];
        c.rgb *= c.a;
        gradient = mix(gradient, c, m);
    }

    vec3 color = gradient.rgb * outerShape;
    float opacity = gradient.a * outerShape;

    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    color = color + bgColor * (1.0 - opacity);
    opacity = opacity + u_colorBack.a * (1.0 - opacity);

    color += .02 * (fract(sin(dot(uv + 1., vec2(12.9898, 78.233))) * 43758.5453123) - .5);

    fragColor = vec4(color, opacity);
}
`

const log = (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.log("[HeatmapComponent]", ...args)
}

const DEFAULT_IMAGE =
    "https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png"

const CANVAS_SIZE = 1000

const loadHtmlImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = "anonymous"
        image.onload = () => resolve(image)
        image.onerror = (event) => reject(event)
        image.src = src
    })

const toProcessedHeatmap = async (source: string): Promise<Blob> => {
    const image = await loadHtmlImage(source)

    if (source.endsWith(".svg")) {
        image.width = CANVAS_SIZE
        image.height = CANVAS_SIZE
    }

    const ratio = image.naturalWidth / image.naturalHeight

    const maxBlur = Math.floor(CANVAS_SIZE * 0.15)
    const padding = Math.ceil(maxBlur * 2.5)
    let imgWidth = CANVAS_SIZE
    let imgHeight = CANVAS_SIZE
    if (ratio > 1) {
        imgHeight = Math.floor(CANVAS_SIZE / ratio)
    } else {
        imgWidth = Math.floor(CANVAS_SIZE * ratio)
    }

    const canvas = document.createElement("canvas")
    canvas.width = imgWidth + 2 * padding
    canvas.height = imgHeight + 2 * padding

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
        throw new Error("Failed to get 2d context for heatmap processing")
    }

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.filter = `grayscale(100%) blur(${maxBlur}px)`
    ctx.drawImage(image, padding, padding, imgWidth, imgHeight)
    const bigBlurData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.filter = `grayscale(100%) blur(${Math.round(0.12 * maxBlur)}px)`
    ctx.drawImage(image, padding, padding, imgWidth, imgHeight)
    const innerBlurSmallData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    ).data

    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.filter = "grayscale(100%) blur(5px)"
    ctx.drawImage(image, padding, padding, imgWidth, imgHeight)
    const contourData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    const processed = ctx.createImageData(canvas.width, canvas.height)
    const totalPixels = canvas.width * canvas.height
    for (let i = 0; i < totalPixels; i++) {
        const px = i * 4
        processed.data[px] = contourData[px]!
        processed.data[px + 1] = bigBlurData[px]!
        processed.data[px + 2] = innerBlurSmallData[px]!
        processed.data[px + 3] = 255
    }
    ctx.putImageData(processed, 0, 0)

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob)
                } else {
                    reject(new Error("Failed to create processed heatmap blob"))
                }
            },
            "image/png",
            1
        )
    })
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function HeatmapComponent({
    colors = {
        paletteCount: 7,
        color1: "#11206a",
        color2: "#1f3ba2",
        color3: "#2f63e7",
        color4: "#6bd7ff",
        color5: "#ffe679",
        color6: "#ff991e",
        color7: "#ff4c00",
        bgColor: "#000000",
    },
    speed = 1,
    contour = 0.5,
    angle = 0,
    noise = 0.05,
    innerGlow = 0.5,
    outerGlow = 0.5,
    cursorSize = 0.08,
    cursorStrength = 0.5,
    image = DEFAULT_IMAGE,
}: HeatmapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const zoomProbeRef = useRef<HTMLDivElement | null>(null)
    const glRef = useRef<WebGL2RenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const textureRef = useRef<WebGLTexture | null>(null)
    const imageRef = useRef<HTMLImageElement | null>(null)
    const animationRef = useRef<number | null>(null)
    const startTimeRef = useRef<number>(Date.now())
    const firstFrameLoggedRef = useRef(false)
    const uniformLocationsRef = useRef<UniformLocations | null>(null)
    const colorUniformRef = useRef<{ values: Float32Array; count: number }>(
        buildColorUniformData(colors)
    )
    const bgColorRef = useRef<[number, number, number, number]>(
        parseCssColor(colors?.bgColor || "#000000", "#000000")
    )
    const speedRef = useRef(speed)
    const paramsRef = useRef({
        angle,
        noise,
        innerGlow,
        outerGlow,
        contour,
    })
    const [glReady, setGlReady] = useState(false)
    const processedUrlRef = useRef<string | null>(null)

    // Heat texture and cursor trail system - MUST init before WebGL
    const heatmapBufferRef = useRef<Uint8Array | null>(null)
    const heatmapDataRef = useRef<any>(null)
    const lastMouseTimeRef = useRef(0)
    const imageScaleRef = useRef(1)

    // Track canvas size changes to avoid unnecessary resizes on zoom
    const lastCanvasSizeRef = useRef<{
        w: number
        h: number
        aspect: number
        zoom: number
        ts: number
    }>({
        w: 0,
        h: 0,
        aspect: 0,
        zoom: 0,
        ts: 0,
    })

    const applyColorUniforms = (
        gl: WebGL2RenderingContext,
        uniformLocs: UniformLocations,
        data: { values: Float32Array; count: number }
    ) => {
        if (uniformLocs.u_colorsCount) {
            gl.uniform1f(uniformLocs.u_colorsCount, data.count)
        }
        for (let i = 0; i < MAX_COLORS; i++) {
            const location = uniformLocs.u_colors[i]
            if (!location) continue
            const base = i * 4
            gl.uniform4f(
                location,
                data.values[base + 0],
                data.values[base + 1],
                data.values[base + 2],
                data.values[base + 3]
            )
        }
    }

    useEffect(() => {
        speedRef.current = speed
    }, [speed])

    useEffect(() => {
        paramsRef.current = { angle, noise, innerGlow, outerGlow, contour }
    }, [angle, noise, innerGlow, outerGlow, contour])

    // Initialize heat texture on component mount - MUST happen before WebGL setup
    useEffect(() => {
        const data = new Uint8Array(HEAT_RESOLUTION * HEAT_RESOLUTION * 4)
        heatmapBufferRef.current = data
        heatmapDataRef.current = { texture: null, needsUpdate: false }
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext("webgl2", {
            alpha: true,
            premultipliedAlpha: false,
        })
        if (!gl) {
            log("WebGL 2 not supported in this environment")
            return
        }
        log("WebGL2 context initialised")
        glRef.current = gl

        const vShader = gl.createShader(gl.VERTEX_SHADER)
        const fShader = gl.createShader(gl.FRAGMENT_SHADER)
        if (!vShader || !fShader) return

        gl.shaderSource(vShader, vertexShader)
        gl.compileShader(vShader)
        if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            log(
                "Vertex shader compilation failed",
                gl.getShaderInfoLog(vShader)
            )
            return
        }
        log("Vertex shader compiled")

        gl.shaderSource(fShader, fragmentShader)
        gl.compileShader(fShader)
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            log(
                "Fragment shader compilation failed",
                gl.getShaderInfoLog(fShader)
            )
            return
        }
        log("Fragment shader compiled")

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vShader)
        gl.attachShader(program, fShader)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            log("Program link failed", gl.getProgramInfoLog(program))
            return
        }
        log("Shader program linked")
        programRef.current = program
        gl.useProgram(program)

        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
        const positionBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        const positionLoc = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(positionLoc)
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
        log("Position attribute bound", { positionLoc })

        const uniformLocs: UniformLocations = {
            u_resolution: gl.getUniformLocation(program, "u_resolution"),
            u_imageAspectRatio: gl.getUniformLocation(
                program,
                "u_imageAspectRatio"
            ),
            u_image: gl.getUniformLocation(program, "u_image"),
            u_heatmap: gl.getUniformLocation(program, "u_heatmap"),
            u_time: gl.getUniformLocation(program, "u_time"),
            u_colorBack: gl.getUniformLocation(program, "u_colorBack"),
            u_colorsCount: gl.getUniformLocation(program, "u_colorsCount"),
            u_angle: gl.getUniformLocation(program, "u_angle"),
            u_noise: gl.getUniformLocation(program, "u_noise"),
            u_innerGlow: gl.getUniformLocation(program, "u_innerGlow"),
            u_outerGlow: gl.getUniformLocation(program, "u_outerGlow"),
            u_contour: gl.getUniformLocation(program, "u_contour"),
            u_imageScale: gl.getUniformLocation(program, "u_imageScale"),
            u_colors: Array.from({ length: MAX_COLORS }, (_, index) =>
                gl.getUniformLocation(program, `u_colors[${index}]`)
            ),
        }
        uniformLocationsRef.current = uniformLocs
        log("Uniform locations fetched", uniformLocs)

        applyColorUniforms(gl, uniformLocs, colorUniformRef.current)

        if (uniformLocs.u_colorBack) {
            const bg = bgColorRef.current
            gl.uniform4f(uniformLocs.u_colorBack, bg[0], bg[1], bg[2], bg[3])
        }

        // Main image texture
        const texture = gl.createTexture()
        textureRef.current = texture
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        // Heatmap texture for cursor trails
        const heatmapTexture = gl.createTexture()
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, heatmapTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            HEAT_RESOLUTION,
            HEAT_RESOLUTION,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            heatmapBufferRef.current
        )
        if (uniformLocs.u_heatmap) {
            gl.uniform1i(uniformLocs.u_heatmap, 1) // Bind to texture unit 1
        }
        heatmapDataRef.current = { texture: heatmapTexture, needsUpdate: false }
        gl.activeTexture(gl.TEXTURE0) // Switch back to texture unit 0

        const img = new Image()
        img.crossOrigin = "anonymous"
        imageRef.current = img
        log("Image load started", image)

        const resolveImageSource = (
            input?: string | ResponsiveImage
        ): string => {
            if (!input) return DEFAULT_IMAGE
            if (typeof input === "string" && input.trim().length > 0)
                return input.trim()
            if (typeof input === "object") {
                const possibleSources: Array<unknown> = [
                    input.src,
                    input.url,
                    input.default,
                    input.asset?.url,
                ]
                if (typeof input.srcSet === "string") {
                    possibleSources.push(
                        input.srcSet
                            .split(",")
                            .map((entry) => entry.trim().split(" ")[0])
                            .filter(Boolean)[0]
                    )
                } else if (Array.isArray(input.srcSet)) {
                    possibleSources.push(
                        input.srcSet
                            .map((entry) => entry?.src)
                            .filter(Boolean)[0]
                    )
                }
                const resolved = possibleSources.find(
                    (value): value is string =>
                        typeof value === "string" && value.trim().length > 0
                )
                if (resolved) return resolved.trim()
            }
            return DEFAULT_IMAGE
        }

        const resolvedSrc = resolveImageSource(image)
        log("Resolved image source", resolvedSrc)

        let cancelled = false

        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )
            if (uniformLocs.u_imageAspectRatio) {
                gl.uniform1f(
                    uniformLocs.u_imageAspectRatio,
                    img.width / img.height
                )
            }
            // Calculate proper image scale based on padding
            // Scale = original_size / (original_size + 2*padding)
            const maxBlur = Math.floor(CANVAS_SIZE * 0.15)
            const padding = Math.ceil(maxBlur * 2.5)
            const ratio = img.width / img.height
            let imgWidth = CANVAS_SIZE
            let imgHeight = CANVAS_SIZE
            if (ratio > 1) {
                imgHeight = Math.floor(CANVAS_SIZE / ratio)
            } else {
                imgWidth = Math.floor(CANVAS_SIZE * ratio)
            }
            const scale = imgWidth / (imgWidth + 2 * padding)
            imageScaleRef.current = scale
            log("Image loaded", { width: img.width, height: img.height, scale })
        }

        img.onerror = (event) => {
            log("Image failed to load", event, image)
        }

        // Process image first, then load it to avoid showing unprocessed version
        const startProcessing = async () => {
            try {
                const blob = await toProcessedHeatmap(resolvedSrc)
                if (cancelled) return
                if (processedUrlRef.current) {
                    URL.revokeObjectURL(processedUrlRef.current)
                }
                const objectUrl = URL.createObjectURL(blob)
                processedUrlRef.current = objectUrl
                // Load processed version
                img.src = objectUrl
                log("Heatmap preprocessing complete")
            } catch (error) {
                log("Heatmap preprocessing failed; using original image", error)
                // Fallback to original if processing fails
                if (!cancelled) {
                    img.src = resolvedSrc
                }
            }
        }

        // Start processing immediately
        startProcessing()

        const resize = () => {
            if (!gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            // Use clientWidth/clientHeight from container for consistent sizing
            const containerElem = containerRef.current
            if (!containerElem) return
            const w =
                containerElem.clientWidth || containerElem.offsetWidth || 1
            const h =
                containerElem.clientHeight || containerElem.offsetHeight || 1
            canvas.width = w * dpr
            canvas.height = h * dpr
            gl.viewport(0, 0, canvas.width, canvas.height)
            if (uniformLocs.u_resolution) {
                gl.uniform2f(
                    uniformLocs.u_resolution,
                    canvas.width,
                    canvas.height
                )
            }
        }

        resize()
        log("Resize initialised", {
            width: canvas.width,
            height: canvas.height,
        })

        const render = () => {
            if (!gl || !programRef.current) return

            const currentTime =
                (Date.now() - startTimeRef.current) * 0.001 * speedRef.current

            if (uniformLocs.u_time) {
                gl.uniform1f(uniformLocs.u_time, currentTime)
            }

            const params = paramsRef.current
            if (uniformLocs.u_angle)
                gl.uniform1f(uniformLocs.u_angle, params.angle)
            if (uniformLocs.u_noise)
                gl.uniform1f(uniformLocs.u_noise, params.noise)
            if (uniformLocs.u_innerGlow)
                gl.uniform1f(uniformLocs.u_innerGlow, params.innerGlow)
            if (uniformLocs.u_outerGlow)
                gl.uniform1f(uniformLocs.u_outerGlow, params.outerGlow)
            if (uniformLocs.u_contour)
                gl.uniform1f(uniformLocs.u_contour, params.contour)
            if (uniformLocs.u_imageScale)
                gl.uniform1f(uniformLocs.u_imageScale, imageScaleRef.current)

            const bgColor = bgColorRef.current
            gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3])
            gl.clear(gl.COLOR_BUFFER_BIT)

            // Update heatmap texture every frame (fade happens continuously)
            if (heatmapBufferRef.current) {
                // Fade heat each frame
                fadeHeat()

                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, heatmapDataRef.current?.texture)
                gl.texSubImage2D(
                    gl.TEXTURE_2D,
                    0,
                    0,
                    0,
                    HEAT_RESOLUTION,
                    HEAT_RESOLUTION,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    heatmapBufferRef.current
                )
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, texture)
            }

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

            animationRef.current = requestAnimationFrame(render)

            if (!firstFrameLoggedRef.current) {
                firstFrameLoggedRef.current = true
                log("First frame rendered", {
                    currentTime,
                    colorCount: colorUniformRef.current.count,
                    bgColor,
                    ...params,
                })
            }
        }

        animationRef.current = requestAnimationFrame(render)
        log("Render loop started")
        setGlReady(true)

        const resizeCleanup =
            RenderTarget.current() === RenderTarget.canvas
                ? (() => {
                      let rafId = 0
                      const TICK_MS = 250
                      const EPS_ASPECT = 0.001
                      const tick = (now?: number) => {
                          const container = containerRef.current
                          const probe = zoomProbeRef.current
                          if (container && probe) {
                              const cw =
                                  container.clientWidth ||
                                  container.offsetWidth ||
                                  1
                              const ch =
                                  container.clientHeight ||
                                  container.offsetHeight ||
                                  1
                              const aspect = cw / ch
                              const zoom =
                                  probe.getBoundingClientRect().width / 20

                              const timeOk =
                                  !lastCanvasSizeRef.current.ts ||
                                  (now || performance.now()) -
                                      lastCanvasSizeRef.current.ts >=
                                      TICK_MS
                              const aspectChanged =
                                  Math.abs(
                                      aspect - lastCanvasSizeRef.current.aspect
                                  ) > EPS_ASPECT
                              const sizeChanged =
                                  Math.abs(cw - lastCanvasSizeRef.current.w) >
                                      1 ||
                                  Math.abs(ch - lastCanvasSizeRef.current.h) > 1

                              if (timeOk && (aspectChanged || sizeChanged)) {
                                  lastCanvasSizeRef.current = {
                                      w: cw,
                                      h: ch,
                                      aspect,
                                      zoom,
                                      ts: now || performance.now(),
                                  }
                                  resize()
                              }
                          }
                          rafId = requestAnimationFrame(tick)
                      }
                      rafId = requestAnimationFrame(tick)
                      return () => cancelAnimationFrame(rafId)
                  })()
                : (() => {
                      window.addEventListener("resize", resize)
                      return () => window.removeEventListener("resize", resize)
                  })()

        return () => {
            resizeCleanup()
            cancelled = true
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (texture) {
                gl.deleteTexture(texture)
            }
            if (heatmapDataRef.current?.texture) {
                gl.deleteTexture(heatmapDataRef.current.texture)
            }
            if (program) {
                gl.deleteProgram(program)
            }
            if (vShader) {
                gl.deleteShader(vShader)
            }
            if (fShader) {
                gl.deleteShader(fShader)
            }
            if (processedUrlRef.current) {
                URL.revokeObjectURL(processedUrlRef.current)
                processedUrlRef.current = null
            }
            log("WebGL resources cleaned up")
            setGlReady(false)
        }
    }, [image])

    useEffect(() => {
        if (!glReady) return
        const gl = glRef.current
        const uniformLocs = uniformLocationsRef.current
        if (!gl || !uniformLocs) return
        const data = buildColorUniformData(colors)
        colorUniformRef.current = data
        applyColorUniforms(gl, uniformLocs, data)
    }, [colors, glReady])

    useEffect(() => {
        if (!glReady) return
        const gl = glRef.current
        const uniformLocs = uniformLocationsRef.current
        if (!gl || !uniformLocs || !uniformLocs.u_colorBack) return
        const bg = parseCssColor(colors?.bgColor || "#000000", "#000000")
        bgColorRef.current = bg
        gl.uniform4f(uniformLocs.u_colorBack, bg[0], bg[1], bg[2], bg[3])
    }, [colors?.bgColor, glReady])

    const stampHeat = (nx: number, ny: number, aspect: number) => {
        const buffer = heatmapBufferRef.current
        if (!buffer) return

        const size = HEAT_RESOLUTION
        const centerX = Math.max(
            0,
            Math.min(size - 1, Math.round(nx * (size - 1)))
        )
        const centerY = Math.max(
            0,
            Math.min(size - 1, Math.round(ny * (size - 1)))
        )

        // Map normalized cursor size (0.1-1) to actual range (0.02-0.3)
        const mappedCursorSize =
            0.02 + ((cursorSize - 0.1) * (0.3 - 0.02)) / (1 - 0.1)
        // Adjust radius based on aspect ratio to keep circular appearance on canvas
        const baseRadius = mappedCursorSize * size
        const radiusX = aspect > 1 ? baseRadius / aspect : baseRadius
        const radiusY = aspect < 1 ? baseRadius * aspect : baseRadius
        const intensity = Math.max(0, Math.min(1, cursorStrength))

        const minX = Math.max(0, Math.floor(centerX - radiusX))
        const maxX = Math.min(size - 1, Math.ceil(centerX + radiusX))
        const minY = Math.max(0, Math.floor(centerY - radiusY))
        const maxY = Math.min(size - 1, Math.ceil(centerY + radiusY))

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Use elliptical distance for aspect-corrected circle
                const dx = (x - centerX) / radiusX
                const dy = (y - centerY) / radiusY
                const distanceSq = dx * dx + dy * dy
                if (distanceSq > 1) continue

                const falloff = 1 - distanceSq
                const boost = intensity * falloff * falloff
                const idx = (y * size + x) * 4
                const current = buffer[idx]
                const next = Math.min(255, current + Math.round(boost * 255))
                buffer[idx] = next
                buffer[idx + 1] = next
                buffer[idx + 2] = next
                buffer[idx + 3] = 255
            }
        }
        if (heatmapDataRef.current) {
            heatmapDataRef.current.needsUpdate = true
        }
    }

    const fadeHeat = () => {
        const buffer = heatmapBufferRef.current
        const texture = heatmapDataRef.current
        if (!buffer || !texture) return

        let changed = false
        for (let i = 0; i < buffer.length; i += 4) {
            const current = buffer[i]
            if (current <= 0) continue
            const cooled = current * 0.96 - 1
            const next =
                cooled <= 1 ? 0 : Math.min(255, Math.max(0, Math.floor(cooled)))
            if (next !== current) {
                buffer[i] = next
                buffer[i + 1] = next
                buffer[i + 2] = next
                changed = true
            }
        }
        if (changed) {
            texture.needsUpdate = true
        }
    }

    // Handle mouse movement for heat trail with throttling
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const now = Date.now()
        // Throttle to ~16ms (60fps) to avoid excessive updates
        if (now - lastMouseTimeRef.current < 16) return
        lastMouseTimeRef.current = now

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return

        // Get mouse position relative to canvas
        const relX = e.clientX - rect.left
        const relY = e.clientY - rect.top

        if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height)
            return

        // Normalize to 0-1 (full canvas coordinates)
        const nx = relX / rect.width
        const ny = relY / rect.height
        const aspect = rect.width / rect.height

        // Stamp with aspect ratio so the ellipse in buffer space appears circular on canvas
        stampHeat(nx, 1 - ny, aspect)
    }

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => {
                if (canvasRef.current) canvasRef.current.style.cursor = "auto"
            }}
            onMouseLeave={() => {
                if (canvasRef.current) canvasRef.current.style.cursor = "auto"
            }}
            style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                position: "relative",
                background: colors?.bgColor || "#000000",
                display: "block",
                margin: 0,
                padding: 0,
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

HeatmapComponent.defaultProps = {
    colors: {
        paletteCount: 7,
        color1: "#11206a",
        color2: "#1f3ba2",
        color3: "#2f63e7",
        color4: "#6bd7ff",
        color5: "#ffe679",
        color6: "#ff991e",
        color7: "#ff4c00",
        bgColor: "#000000",
    },
    speed: 1,
    contour: 0.5,
    angle: 0,
    noise: 0.05,
    innerGlow: 0.5,
    outerGlow: 0.5,
    image: "https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png",
}

addPropertyControls(HeatmapComponent, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        description:
            "A high quality black on white (or black on transparent) image",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: 1,
    },
    contour: {
        type: ControlType.Number,
        title: "Contour",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    angle: {
        type: ControlType.Number,
        title: "Angle",
        min: 0,
        max: 360,
        unit: "°",
        defaultValue: 0,
    },
    noise: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.05,
    },
    innerGlow: {
        type: ControlType.Number,
        title: "Glow In",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    outerGlow: {
        type: ControlType.Number,
        title: "Glow Out",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.1,
    },
    cursorSize: {
        type: ControlType.Number,
        title: "Cursor Size",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.4,
    },
    cursorStrength: {
        type: ControlType.Number,
        title: "Cursor Power",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
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
                max: 10,
                step: 1,
                defaultValue: 7,
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                defaultValue: "#11206a",
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "#1f3ba2",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "#2f63e7",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                defaultValue: "#6bd7ff",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                defaultValue: "#ffe679",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 5,
            },
            color6: {
                type: ControlType.Color,
                title: "Color 6",
                defaultValue: "#ff991e",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 6,
            },
            color7: {
                type: ControlType.Color,
                title: "Color 7",
                defaultValue: "#ff4c00",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 7,
            },
            color8: {
                type: ControlType.Color,
                title: "Color 8",
                defaultValue: "#ff4c00",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 8,
            },
            color9: {
                type: ControlType.Color,
                title: "Color 9",
                defaultValue: "#ff4c00",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 9,
            },
            color10: {
                type: ControlType.Color,
                title: "Color 10",
                defaultValue: "#ff4c00",
                hidden: (props: any) => (props?.paletteCount ?? 7) < 10,
            },
            bgColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "#000000",
            },
        },
    },
})

HeatmapComponent.displayName = "Heatmap"
