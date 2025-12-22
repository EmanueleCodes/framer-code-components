import { useEffect, useRef } from "react"

import {
    Renderer,
    Camera,
    Mesh,
    Plane,
    Program,
    RenderTarget as OglRenderTarget,
    Texture,
    //@ts-ignore
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/ascii-background.js"

import {
    addPropertyControls,
    ControlType,
    RenderTarget as FramerRenderTarget,
} from "framer"

// Inline shader sources to avoid special bundler config
// Intrinsic size used to avoid width/height collapse in Fit layouts
const INTRINSIC_WIDTH = 600
const INTRINSIC_HEIGHT = 400
const DEFAULT_GLYPH_PADDING_PX = 2
const DEFAULT_CHARACTERS = "@%#*+=-:."

const perlinVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.); 
}`

const perlinFragmentShader = `#version 300 es
precision mediump float;
uniform float uFrequency;
uniform float uTime;
uniform float uSpeed;
uniform float uValue;
uniform vec2 uResolution;
in vec2 vUv;
out vec4 fragColor;

// Clean Simplex noise from liquid-mask (simplified)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  
  // First corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

// Simple 3D noise - no diagonal shifting, just clean organic noise
float cnoise(vec3 p) {
    return snoise(p);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  // Maintain aspect ratio and cover behavior for noise domain
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  uv = (uv - 0.5) * vec2(aspect, 1.0) + 0.5;

  float hue = abs(cnoise(vec3(uv * uFrequency, uTime * uSpeed)));
  vec3 rainbowColor = hsv2rgb(vec3(hue, 1.0, uValue));
  fragColor = vec4(rainbowColor, 1.0);
}`

const asciiVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`

const asciiFragmentShader = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTexture;
// Palette controls
uniform int uUseCustomPalette; // 0: Rainbow (use texture color), 1: Custom palette
uniform int uPaletteCount; // 1..3
uniform vec3 uPalette1;
uniform vec3 uPalette2;
uniform vec3 uPalette3;
uniform float uPaletteA1;
uniform float uPaletteA2;
uniform float uPaletteA3;
// ASCII controls
uniform float uCellSize; // character cell size in pixels (base)
uniform float uGamma; // grayscale gamma
uniform float uPaletteBias; // shifts palette mapping -0.5..0.5
// Glyph atlas controls (optional)
uniform int uUseGlyphAtlas; // 0: built-in bitmask, 1: sample from atlas
uniform sampler2D uGlyphAtlas;
uniform ivec2 uGlyphGrid; // cols, rows
uniform int uCharCount; // number of glyphs in atlas
out vec4 fragColor;

// Built-in 5x5 bitmask character for fallback
float character(int n, vec2 p) {
  p = floor(p * vec2(-4.0, 4.0) + 2.5);
  if(clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
    int a = int(round(p.x) + 5.0 * round(p.y));
    if(((n >> a) & 1) == 1) return 1.0;
  }
  return 0.0;
}

void main() {
  vec2 pix = gl_FragCoord.xy;
  float quant = max(uCellSize * 2.0, 1.0);
  vec3 col = texture(uTexture, floor(pix / quant) * quant / uResolution.xy).rgb;
  float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
  gray = pow(clamp(gray, 0.0001, 1.0), uGamma);

  float cell = max(uCellSize, 1.0);
  float charAlpha = 0.0;

  if (uUseGlyphAtlas == 1 && uCharCount > 0 && uGlyphGrid.x > 0 && uGlyphGrid.y > 0) {
    // Select glyph index by density
    float g = clamp(gray + uPaletteBias, 0.0, 1.0);
    int idx = int(clamp(floor(g * float(uCharCount - 1) + 0.5), 0.0, float(uCharCount - 1)));
    // Compute per-cell UV
    vec2 cellUV = fract(pix / cell);
    // Atlas tile uv
    vec2 grid = vec2(uGlyphGrid);
    vec2 tileSize = 1.0 / grid;
    float colIdx = float(idx % uGlyphGrid.x);
    float rowIdx = floor(float(idx) / float(uGlyphGrid.x));
    vec2 tileOrigin = vec2(colIdx, rowIdx) * tileSize;
    vec2 atlasUV = tileOrigin + cellUV * tileSize;
    // Assume glyphs are white-on-black; use luminance as alpha
    vec3 glyphSample = texture(uGlyphAtlas, atlasUV).rgb;
    charAlpha = dot(glyphSample, vec3(0.299, 0.587, 0.114));
  } else {
    // Fallback to built-in bitmask
    int n = 4096;
    if(gray > 0.2) n = 65600;
    if(gray > 0.3) n = 163153;
    if(gray > 0.4) n = 15255086;
    if(gray > 0.5) n = 13121101;
    if(gray > 0.6) n = 15252014;
    if(gray > 0.7) n = 13195790;
    if(gray > 0.8) n = 11512810;
    vec2 p = mod(pix / cell, 2.0) - vec2(1.0);
    charAlpha = character(n, p);
  }

  float g2 = clamp(gray + uPaletteBias, 0.0, 1.0);
  vec3 paletteColor;
  float paletteAlpha = 1.0;
  if (uPaletteCount <= 1) {
    paletteColor = uPalette1;
    paletteAlpha = uPaletteA1;
  } else if (uPaletteCount == 2) {
    paletteColor = mix(uPalette1, uPalette2, g2);
    paletteAlpha = mix(uPaletteA1, uPaletteA2, g2);
  } else {
    float t = g2 * 2.0;
    paletteColor = mix(uPalette1, uPalette2, clamp(t, 0.0, 1.0));
    float t2 = clamp(t - 1.0, 0.0, 1.0);
    paletteColor = mix(paletteColor, uPalette3, t2);
    paletteAlpha = mix(mix(uPaletteA1, uPaletteA2, clamp(t, 0.0, 1.0)), uPaletteA3, t2);
  }

  float charOpacity = (uUseCustomPalette == 1) ? paletteAlpha : 1.0;
  vec3 asciiCol = (uUseCustomPalette == 1) ? paletteColor : col;
  fragColor = vec4(asciiCol, charAlpha * charOpacity);
}`

type Mode = "Rainbow" | "Custom"

interface ASCIIBackgroundProps {
    frequency: number
    speed: number
    play: boolean
    mode: Mode
    paletteCount: number
    bgColor: string
    color1: string
    color2: string
    color3: string
    cellSize: number
    gamma: number
    paletteBias: number
    style?: React.CSSProperties
    // Optional: custom glyph atlas settings
    useGlyphAtlas?: boolean | "Default" | "Custom"
    characters?: string
    // Grouped color settings for Custom mode
    colors?: {
        paletteCount: number
        color1: string
        color2: string
        color3: string
    }
    // Deprecated individual font controls (use `font` instead)
    fontFamily?: string
    fontWeight?: string | number
    fontSizePx?: number
    // Framer Font control payload (if provided)
    font?: any
}

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

// UI → shader mapping helpers (keep visual effect identical while showing nicer numbers)
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
// Frequency: UI [0.1..1] → shader [0.1..10] (1 = big blobs, 0.1 = small blobs)
function mapFrequencyUiToShader(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 0.1, 10.0)
}
// Speed: UI [0.1..1] → shader [0.2..2] (original shader range used 0..2; play=false still forces 0)
function mapSpeedUiToShader(ui: number): number {
    return ui * 0.5
}
// Cell size: UI [1..100] → shader [4..48]
function mapCellSizeUiToShader(ui: number): number {
    return mapLinear(ui, 1, 100, 4, 48)
}
// Contrast: UI [1..10] → shader gamma [0.5..2.5]
function mapContrastUiToShader(ui: number): number {
    return mapLinear(ui, 1, 10, 0.5, 2.5)
}
// Palette balance: UI [-1..1] → shader [-0.5..0.5]
function mapPaletteBiasUiToShader(ui: number): number {
    return ui * 0.5
}

function isCustomGlyphMode(value: any): boolean {
    return value === true || value === "Custom"
}

// Extract font settings from a Framer Font control payload (or fallbacks)
function deriveFontSettings(
    font: any,
    fallbackFamily: string,
    fallbackWeight: string | number,
    fallbackSizePx: number
) {
    const family = (font && (font.family || font.fontFamily)) || fallbackFamily
    const weight = (font && (font.weight || font.fontWeight)) || fallbackWeight
    const sizeRaw = (font && (font.fontSize ?? font.size)) ?? fallbackSizePx
    let sizePx = typeof sizeRaw === "string" ? parseFloat(sizeRaw) : Number(sizeRaw)
    if (!Number.isFinite(sizePx) || sizePx <= 0) sizePx = fallbackSizePx
    return { family, weight, sizePx }
}

// Build a glyph atlas texture from a custom font and character set
function buildGlyphAtlas(
    gl: WebGL2RenderingContext,
    characters: string,
    fontFamily: string,
    fontWeight: string | number,
    fontSizePx: number,
    paddingPx: number
) {
    const count = Math.max(1, characters.length)
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const cellPx = Math.max(8, fontSizePx + paddingPx * 2)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement("canvas")
    canvas.width = cols * cellPx * dpr
    canvas.height = rows * cellPx * dpr
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    ctx.fillStyle = "#fff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`
    for (let i = 0; i < count; i++) {
        const cx = i % cols
        const cy = Math.floor(i / cols)
        const x = cx * cellPx + cellPx / 2
        const y = cy * cellPx + cellPx / 2
        ctx.fillText(characters[i], x, y)
    }
    const texture = new Texture(gl as any, {
        image: canvas,
        wrapS: (gl as any).CLAMP_TO_EDGE,
        wrapT: (gl as any).CLAMP_TO_EDGE,
        generateMipmaps: false,
        // Flip Y so canvas y-up maps correctly into texture coordinates
        flipY: true,
    })
    return { texture, cols, rows, cellPx, count }
}

/**
 * @framerDisableUnlink
 * @framerIntrisicHeight 300
 * @framerIntrisicHeight 600
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

export default function ASCIIBackground(props: ASCIIBackgroundProps) {
    const {
        frequency = 0.5, // UI 0.1..1 (maps to shader 0..10)
        speed = 0.375, // UI 0.1..1 (maps to shader 0.2..2)
        play = true,
        mode = "Rainbow",
        paletteCount = 3,
        bgColor = "#000000",
        color1 = "#ffffff",
        color2 = "#ff8000",
        color3 = "#3399ff",
        cellSize = 50, // UI 1..100 (maps to 4..48)
        gamma = 5.5, // UI 1..10 (maps to 0.5..2.5)
        paletteBias = 0.0, // UI -1..1 (maps to -0.5..0.5)
        style,
        useGlyphAtlas = false,
        characters = DEFAULT_CHARACTERS,
        fontFamily = "monospace",
        fontWeight = 400,
        fontSizePx = 42,
        font,
        colors,
    } = props

    const useGlyphAtlasFlag = isCustomGlyphMode(useGlyphAtlas)
    // Compute palette values (support both legacy top-level props and new nested colors object)
    const paletteCountEffective = colors?.paletteCount ?? paletteCount
    const color1Effective = colors?.color1 ?? color1
    const color2Effective = colors?.color2 ?? color2
    const color3Effective = colors?.color3 ?? color3

    const effectiveCharacters = (() => {
        const raw = typeof characters === "string" ? characters : ""
        const sanitized = Array.from(raw).filter((ch) => !/\s/.test(ch)).join("")
        return sanitized.length > 0 ? sanitized : DEFAULT_CHARACTERS
    })()

    // If not in Framer's canvas, always play
    const isCanvas = (() => {
        try {
            return FramerRenderTarget.current() === FramerRenderTarget.canvas
        } catch {
            return false
        }
    })()
    const effectivePlay = isCanvas ? play : true

    const canvasContainerRef = useRef<HTMLDivElement | null>(null)
    const perlinProgramRef = useRef<any | null>(null)
    const asciiProgramRef = useRef<any | null>(null)
    const rendererRef = useRef<any | null>(null)
    const cameraRef = useRef<any | null>(null)
    const perlinMeshRef = useRef<any | null>(null)
    const asciiMeshRef = useRef<any | null>(null)
    const renderTargetRef = useRef<any | null>(null)
    const glRef = useRef<WebGL2RenderingContext | null>(null)
    const rafIdRef = useRef<number | null>(null)
    const lastTimeRef = useRef<number>(0)
    const isPlayingRef = useRef<boolean>(effectivePlay)
    const glyphTextureRef = useRef<any | null>(null)
    const glyphGridRef = useRef<{
        cols: number
        rows: number
        count: number
    } | null>(null)
    const dummyGlyphTextureRef = useRef<any | null>(null)

    // Helper to render a single frame without scheduling RAF
    const renderOnce = () => {
        const renderer = rendererRef.current
        const camera = cameraRef.current
        const perlinMesh = perlinMeshRef.current
        const asciiMesh = asciiMeshRef.current
        const renderTarget = renderTargetRef.current
        const gl = glRef.current as any
        const asciiProgram = asciiProgramRef.current
        if (
            !renderer ||
            !camera ||
            !perlinMesh ||
            !asciiMesh ||
            !renderTarget ||
            !gl ||
            !asciiProgram
        )
            return
        renderer.render({ scene: perlinMesh, camera, target: renderTarget })
        asciiProgram.uniforms.uResolution.value = [
            gl.canvas.width,
            gl.canvas.height,
        ]
        renderer.render({ scene: asciiMesh, camera })
    }

    useEffect(() => {
        let rafId = 0
        let resizeHandler: (() => void) | null = null
        let resizeObserver: any | null = null

        const container = canvasContainerRef.current
        if (!container) return

        const renderer = new Renderer({
            dpr: Math.min(window.devicePixelRatio || 1, 2),
            alpha: true,
            premultipliedAlpha: false,
        } as any)
        const gl = renderer.gl
        container.appendChild(gl.canvas)
        rendererRef.current = renderer
        glRef.current = gl

        const camera = new Camera(gl, { near: 0.1, far: 100 })
        camera.position.set(0, 0, 3)
        cameraRef.current = camera

        const doResize = () => {
            const width = container.clientWidth || window.innerWidth
            const height = container.clientHeight || window.innerHeight
            renderer.setSize(width, height)
            camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
            // keep offscreen target and uniforms in sync with canvas size
            if (
                renderTargetRef.current &&
                (renderTargetRef.current as any).setSize
            ) {
                ;(renderTargetRef.current as any).setSize(
                    gl.canvas.width,
                    gl.canvas.height
                )
            }
            if (perlinProgramRef.current) {
                perlinProgramRef.current.uniforms.uResolution.value = [
                    gl.canvas.width,
                    gl.canvas.height,
                ]
            }
        }

        // Throttled resize scheduler (one per animation frame)
        let resizePending = false
        const scheduleResize = () => {
            if (resizePending) return
            resizePending = true
            requestAnimationFrame(() => {
                resizePending = false
                doResize()
                if (!isPlayingRef.current) {
                    renderOnce()
                }
            })
        }
        resizeHandler = scheduleResize
        window.addEventListener("resize", scheduleResize)
        // Observe the container element's size changes (Framer canvas resizes)
        if (typeof (window as any).ResizeObserver !== "undefined") {
            resizeObserver = new (window as any).ResizeObserver(scheduleResize)
            resizeObserver.observe(container)
        }
        scheduleResize()

        // Perlin noise pass
        const perlinProgram = new Program(gl, {
            vertex: perlinVertexShader,
            fragment: perlinFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uFrequency: { value: mapFrequencyUiToShader(frequency) },
                uSpeed: {
                    value: effectivePlay ? mapSpeedUiToShader(speed) : 0,
                },
                uValue: { value: 1.0 },
                uResolution: { value: [gl.canvas.width, gl.canvas.height] },
            },
        })
        perlinProgramRef.current = perlinProgram

        const perlinMesh = new Mesh(gl, {
            geometry: new Plane(gl, { width: 2, height: 2 }),
            program: perlinProgram,
        })
        perlinMeshRef.current = perlinMesh

        const renderTarget = new OglRenderTarget(gl)
        renderTargetRef.current = renderTarget

        // Prepare a dummy glyph texture so the sampler uniform is always valid
        const dummyGlyphTexture = new Texture(gl as any, {
            width: 1,
            height: 1,
            generateMipmaps: false,
            flipY: false,
        })
        dummyGlyphTextureRef.current = dummyGlyphTexture

        // ASCII pass
        const asciiProgram = new Program(gl, {
            vertex: asciiVertexShader,
            fragment: asciiFragmentShader,
            uniforms: {
                uResolution: { value: [gl.canvas.width, gl.canvas.height] },
                uTexture: { value: renderTarget.texture },
                uUseCustomPalette: { value: mode === "Custom" ? 1 : 0 },
                uPaletteCount: { value: paletteCountEffective },
                uPalette1: {
                    value: colorStringToVec4(color1Effective).slice(0, 3) as unknown as [
                        number,
                        number,
                        number,
                    ],
                },
                uPalette2: {
                    value: colorStringToVec4(color2Effective).slice(0, 3) as unknown as [
                        number,
                        number,
                        number,
                    ],
                },
                uPalette3: {
                    value: colorStringToVec4(color3Effective).slice(0, 3) as unknown as [
                        number,
                        number,
                        number,
                    ],
                },
                uPaletteA1: { value: colorStringToVec4(color1Effective)[3] },
                uPaletteA2: { value: colorStringToVec4(color2Effective)[3] },
                uPaletteA3: { value: colorStringToVec4(color3Effective)[3] },
                uCellSize: { value: mapCellSizeUiToShader(cellSize) },
                uGamma: { value: mapContrastUiToShader(gamma) },
                uPaletteBias: { value: mapPaletteBiasUiToShader(paletteBias) },
                // Glyph atlas uniforms (initialized with dummy texture)
                uUseGlyphAtlas: { value: useGlyphAtlasFlag ? 1 : 0 },
                uGlyphAtlas: { value: dummyGlyphTexture },
                uGlyphGrid: { value: [0, 0] },
                uCharCount: { value: 0 },
            },
        })
        asciiProgramRef.current = asciiProgram

        const asciiMesh = new Mesh(gl, {
            geometry: new Plane(gl, { width: 2, height: 2 }),
            program: asciiProgram,
        })
        asciiMeshRef.current = asciiMesh

        // Optionally build glyph atlas
        if (useGlyphAtlasFlag) {
            try {
                const f = deriveFontSettings(
                    font,
                    fontFamily,
                    fontWeight,
                    fontSizePx
                )
                const fontCSS = `${f.weight} ${f.sizePx}px ${f.family}`
                if ((document as any).fonts && (document as any).fonts.load) {
                    // Load the font before drawing if possible
                    ;(document as any).fonts.load(fontCSS).catch(() => {})
                }
            } catch {}
            const atlas = buildGlyphAtlas(
                gl,
                effectiveCharacters,
                deriveFontSettings(font, fontFamily, fontWeight, fontSizePx)
                    .family,
                deriveFontSettings(font, fontFamily, fontWeight, fontSizePx)
                    .weight,
                deriveFontSettings(font, fontFamily, fontWeight, fontSizePx)
                    .sizePx,
                DEFAULT_GLYPH_PADDING_PX
            )
            glyphTextureRef.current = atlas.texture
            glyphGridRef.current = {
                cols: atlas.cols,
                rows: atlas.rows,
                count: atlas.count,
            }
            asciiProgram.uniforms.uGlyphAtlas.value = atlas.texture
            asciiProgram.uniforms.uGlyphGrid.value = [atlas.cols, atlas.rows]
            asciiProgram.uniforms.uCharCount.value = atlas.count
            asciiProgram.uniforms.uUseGlyphAtlas.value = 1
        }

        const frameInterval = 1000 / 30 // 30 FPS

        const update = (time: number) => {
            if (!isPlayingRef.current) {
                rafIdRef.current = null
                return
            }
            const last = lastTimeRef.current
            if (time - last < frameInterval) {
                rafIdRef.current = requestAnimationFrame(update)
                return
            }
            lastTimeRef.current = time

            const elapsedTime = time * 0.001
            perlinProgram.uniforms.uTime.value = elapsedTime

            renderer.render({ scene: perlinMesh, camera, target: renderTarget })

            asciiProgram.uniforms.uResolution.value = [
                gl.canvas.width,
                gl.canvas.height,
            ]
            perlinProgram.uniforms.uResolution.value = [
                gl.canvas.width,
                gl.canvas.height,
            ]
            renderer.render({ scene: asciiMesh, camera })

            rafIdRef.current = requestAnimationFrame(update)
        }

        // initial render
        renderOnce()
        // start loop if playing
        isPlayingRef.current = effectivePlay
        if (effectivePlay && rafIdRef.current == null) {
            lastTimeRef.current = 0
            rafIdRef.current = requestAnimationFrame(update)
        }

        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
            if (resizeHandler)
                window.removeEventListener("resize", resizeHandler)
            if (resizeObserver) {
                try {
                    resizeObserver.disconnect()
                } catch {}
                resizeObserver = null
            }
            // Dispose glyph texture if any
            if (glyphTextureRef.current) {
                try {
                    const tex: any = glyphTextureRef.current
                    if (typeof tex.destroy === "function") tex.destroy()
                    else if (typeof tex.delete === "function") tex.delete()
                } catch {}
                glyphTextureRef.current = null
                glyphGridRef.current = null
            }
            // Dispose dummy glyph texture
            if (dummyGlyphTextureRef.current) {
                try {
                    const tex: any = dummyGlyphTextureRef.current
                    if (typeof tex.destroy === "function") tex.destroy()
                    else if (typeof tex.delete === "function") tex.delete()
                } catch {}
                dummyGlyphTextureRef.current = null
            }
            if (gl && gl.canvas && gl.canvas.parentElement === container) {
                container.removeChild(gl.canvas)
            }
            perlinProgramRef.current = null
            asciiProgramRef.current = null
            rendererRef.current = null
            cameraRef.current = null
            perlinMeshRef.current = null
            asciiMeshRef.current = null
            renderTargetRef.current = null
            glRef.current = null
            rafIdRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // live update uniforms when props change
    useEffect(() => {
        const perlin = perlinProgramRef.current
        if (perlin) {
            perlin.uniforms.uFrequency.value = mapFrequencyUiToShader(frequency)
            perlin.uniforms.uSpeed.value = effectivePlay
                ? mapSpeedUiToShader(speed)
                : 0
        }
        const ascii = asciiProgramRef.current
        if (ascii) {
            ascii.uniforms.uUseCustomPalette.value = mode === "Custom" ? 1 : 0
            ascii.uniforms.uPaletteCount.value = paletteCountEffective
            const p1 = colorStringToVec4(color1Effective)
            const p2 = colorStringToVec4(color2Effective)
            const p3 = colorStringToVec4(color3Effective)
            ascii.uniforms.uPalette1.value = [p1[0], p1[1], p1[2]]
            ascii.uniforms.uPalette2.value = [p2[0], p2[1], p2[2]]
            ascii.uniforms.uPalette3.value = [p3[0], p3[1], p3[2]]
            ascii.uniforms.uPaletteA1.value = p1[3]
            ascii.uniforms.uPaletteA2.value = p2[3]
            ascii.uniforms.uPaletteA3.value = p3[3]
            ascii.uniforms.uCellSize.value = mapCellSizeUiToShader(cellSize)
            ascii.uniforms.uGamma.value = mapContrastUiToShader(gamma)
            ascii.uniforms.uPaletteBias.value =
                mapPaletteBiasUiToShader(paletteBias)

            // Update glyph atlas
            if (useGlyphAtlasFlag && glRef.current) {
                // Rebuild atlas whenever any relevant input changes
                if (glyphTextureRef.current) {
                    try {
                        const tex: any = glyphTextureRef.current
                        if (typeof tex.destroy === "function") tex.destroy()
                        else if (typeof tex.delete === "function") tex.delete()
                    } catch {}
                    glyphTextureRef.current = null
                    glyphGridRef.current = null
                }
                try {
                    const gl = glRef.current as WebGL2RenderingContext
                    const f = deriveFontSettings(
                        font,
                        fontFamily,
                        fontWeight,
                        fontSizePx
                    )
                    const atlas = buildGlyphAtlas(
                        gl,
                        effectiveCharacters,
                        f.family,
                        f.weight,
                        f.sizePx,
                        DEFAULT_GLYPH_PADDING_PX
                    )
                    glyphTextureRef.current = atlas.texture
                    glyphGridRef.current = {
                        cols: atlas.cols,
                        rows: atlas.rows,
                        count: atlas.count,
                    }
                    ascii.uniforms.uGlyphAtlas.value = atlas.texture
                    ascii.uniforms.uGlyphGrid.value = [atlas.cols, atlas.rows]
                    ascii.uniforms.uCharCount.value = atlas.count
                    ascii.uniforms.uUseGlyphAtlas.value = 1
                } catch {
                    ascii.uniforms.uUseGlyphAtlas.value = 0
                    ascii.uniforms.uCharCount.value = 0
                    // fall back to dummy texture
                    if (dummyGlyphTextureRef.current) {
                        ascii.uniforms.uGlyphAtlas.value =
                            dummyGlyphTextureRef.current
                    }
                }
            } else {
                ascii.uniforms.uUseGlyphAtlas.value = 0
                ascii.uniforms.uCharCount.value = 0
                // ensure sampler has a valid texture bound
                if (dummyGlyphTextureRef.current) {
                    ascii.uniforms.uGlyphAtlas.value =
                        dummyGlyphTextureRef.current
                }
            }
        }
        // sync resolution uniforms on change
        if (rendererRef.current && glRef.current) {
            const gl: any = glRef.current
            if (perlin)
                perlin.uniforms.uResolution.value = [
                    gl.canvas.width,
                    gl.canvas.height,
                ]
            if (ascii)
                ascii.uniforms.uResolution.value = [
                    gl.canvas.width,
                    gl.canvas.height,
                ]
        }
        // whenever uniforms change and we're not playing, render a single frame
        if (!isPlayingRef.current) {
            renderOnce()
        }
    }, [
        effectivePlay,
        play,
        frequency,
        speed,
        mode,
        paletteCountEffective,
        bgColor,
        color1Effective,
        color2Effective,
        color3Effective,
        cellSize,
        gamma,
        paletteBias,
        useGlyphAtlas,
        characters,
        font,
        colors,
    ])

    // Play/pause controller for RAF lifecycle
    useEffect(() => {
        isPlayingRef.current = effectivePlay
        if (!rendererRef.current) return
        if (effectivePlay) {
            if (rafIdRef.current == null) {
                lastTimeRef.current = 0
                rafIdRef.current = requestAnimationFrame(function update(
                    time: number
                ) {
                    // delegate to the setup loop by forcing a re-use
                    const perlin = perlinProgramRef.current
                    const ascii = asciiProgramRef.current
                    const renderer = rendererRef.current
                    const camera = cameraRef.current
                    const perlinMesh = perlinMeshRef.current
                    const asciiMesh = asciiMeshRef.current
                    const renderTarget = renderTargetRef.current
                    const gl = glRef.current as any
                    if (
                        !isPlayingRef.current ||
                        !perlin ||
                        !ascii ||
                        !renderer ||
                        !camera ||
                        !perlinMesh ||
                        !asciiMesh ||
                        !renderTarget ||
                        !gl
                    ) {
                        rafIdRef.current = null
                        return
                    }
                    const last = lastTimeRef.current
                    const frameInterval = 1000 / 30
                    if (time - last < frameInterval) {
                        rafIdRef.current = requestAnimationFrame(update)
                        return
                    }
                    lastTimeRef.current = time
                    perlin.uniforms.uTime.value = time * 0.001
                    renderer.render({
                        scene: perlinMesh,
                        camera,
                        target: renderTarget,
                    })
                    ascii.uniforms.uResolution.value = [
                        gl.canvas.width,
                        gl.canvas.height,
                    ]
                    renderer.render({ scene: asciiMesh, camera })
                    rafIdRef.current = requestAnimationFrame(update)
                })
            }
        } else {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
            renderOnce()
        }
    }, [effectivePlay, play])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Background color applied here, not inside the shader
                background: bgColor,
                lineHeight: 0,
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                ...style,
            }}
        >
            {/* Invisible sizing element to provide intrinsic dimensions in Fit layouts */}
            <div
                style={{
                    width: `${INTRINSIC_WIDTH}px`,
                    height: `${INTRINSIC_HEIGHT}px`,
                    minWidth: `${INTRINSIC_WIDTH}px`,
                    minHeight: `${INTRINSIC_HEIGHT}px`,
                    visibility: "hidden",
                    position: "absolute",
                    pointerEvents: "none",
                }}
            />
            <div
                ref={canvasContainerRef}
                style={{ position: "absolute", inset: 0 }}
            />
        </div>
    )
}

ASCIIBackground.defaultProps = {
    frequency: 0.5,
    speed: 0.375,
    play: true,
    mode: "Rainbow",
    paletteCount: 3,
    bgColor: "#000000",
    color1: "#ffffff",
    color2: "#ff8000",
    color3: "#3399ff",
    cellSize: 50,
    gamma: 5.5,
    paletteBias: 0.0,
    useGlyphAtlas: false,
    characters: "@%#*+=-:. ",
    fontFamily: "monospace",
    fontWeight: 400,
    fontSizePx: 42,
}

addPropertyControls(ASCIIBackground as any, {
    play: {
        type: ControlType.Boolean,
        title: "On canvas",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    frequency: {
        type: ControlType.Number,
        title: "Frequency",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    mode: {
        type: ControlType.Enum,
        title: "Characters",
        options: ["Rainbow", "Custom"],
        optionTitles: ["Rainbow", "Custom"],
        defaultValue: "Rainbow",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",

    },
    bgColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    colors: {
        type: ControlType.Object,
        title: "Colors",
        hidden: (p: ASCIIBackgroundProps) => p.mode !== "Custom",
        controls: {
            paletteCount: {
                type: ControlType.Number,
                title: "Palette Size",
                min: 1,
                max: 3,
                step: 1,
                defaultValue: 3,
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                defaultValue: "#ffffff",
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "#ff8000",
                hidden: (o: any) => (o?.paletteCount ?? 3) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "#3399ff",
                hidden: (o: any) => (o?.paletteCount ?? 3) < 3,
            },
        },
    },
    cellSize: {
        type: ControlType.Number,
        title: "Cell Size",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 50,
    },
    gamma: {
        type: ControlType.Number,
        title: "Contrast",
        min: 1,
        max: 10,
        step: 0.1,
        defaultValue: 5.5,
    },
    paletteBias: {
        type: ControlType.Number,
        title: "Shift",
        min: -1,
        max: 1,
        step: 0.01,
        defaultValue: 0.0,
        hidden: (props) => props.mode === "Rainbow",
    },
    useGlyphAtlas: {
        type: ControlType.Enum,
        title: "Font Type",
        options: ["Default", "Custom"],
        optionTitles: ["Default", "Custom"],
        defaultValue: "Default",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: 16,
            lineHeight: 1.5,
        },
        hidden: (p: ASCIIBackgroundProps) => p.useGlyphAtlas === "Default",
    },
    characters: {
        type: ControlType.String,
        title: "Characters",
        defaultValue: "@%#*+=-:.",
        placeholder: "e.g. @%#*+=-:. ",
        description:
        "More components at [Framer University](https://frameruni.link/cc).",
    },
    
    
})

ASCIIBackground.displayName = "ASCII Background"
