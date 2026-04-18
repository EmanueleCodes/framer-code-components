import * as React from "react"
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Built with: cd custom-bundle-gsap/ascii-media-bundle && npm run build
// Copy dist/bundle.js → npm-bundles/ascii-media-12.js (Framer University CDN path; committed on main).

// DO NOT CHANGE THE URL

import {
    Canvas,
    CanvasTexture,
    Color,
    DoubleSide,
    LinearFilter,
    MeshBasicMaterial,
    NoToneMapping,
    NormalBlending,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
    SRGBColorSpace,
    TextureLoader,
    Vector2,
    Vector3,
    VideoTexture,
    WebGLRenderTarget,
    createPortal,
    invalidate,
    useFrame,
    useThree,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/ascii-media-5.js"

// ============================================================================
// Shader: ASCII only (no scanlines, glow, palette, etc.)
// ============================================================================

const ASCII_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const ASCII_FRAGMENT = `
uniform sampler2D tDiffuse;
uniform sampler2D uGlyphAtlas;
uniform vec2 uGlyphGrid;
uniform float uCharCount;
uniform float uUseGlyphAtlas;
varying vec2 vUv;
uniform float cellSize;
uniform bool invert;
uniform bool colorMode;
uniform int asciiStyle;
uniform float time;
uniform vec2 resolution;
uniform float brightnessAdjust;
uniform float contrastAdjust;

// Same 5x5 bitmask as next-dev/app/ASCII-background-2/page.tsx (Font Type Default).
float character(int n, vec2 p) {
  p = floor(p * vec2(-4.0, 4.0) + 2.5);
  if (clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
    int a = int(round(p.x) + 5.0 * round(p.y));
    if (((n >> a) & 1) == 1) return 1.0;
  }
  return 0.0;
}

float styleBrightness(float b, int style) {
  if (style == 0) return b;
  if (style == 1) return pow(clamp(b, 0.0, 1.0), 0.82);
  if (style == 2) return pow(clamp(b, 0.0, 1.0), 1.12);
  if (style == 3) return floor(b * 4.0 + 0.001) / 4.0;
  if (style == 4) return pow(clamp(b, 0.0, 1.0), 0.9);
  if (style == 5) return pow(clamp(b, 0.0, 1.0), 0.88);
  if (style == 6) return clamp(b + 0.05 * sin(time * 2.0 + b * 12.0), 0.0, 1.0);
  if (style == 7) return pow(clamp(b, 0.0, 1.0), 0.92);
  return b;
}

void main() {
  vec2 uv = vUv;
  vec2 cellCount = resolution / cellSize;
  vec2 cellCoord = floor(uv * cellCount);
  vec2 cellUV = (cellCoord + 0.5) / cellCount;
  vec4 cellColor = texture(tDiffuse, cellUV);
  vec3 leveled = (cellColor.rgb - 0.5) * contrastAdjust + 0.5 + brightnessAdjust;
  leveled = clamp(leveled, 0.0, 1.0);
  float brightness = dot(leveled, vec3(0.299, 0.587, 0.114));

  if (invert) brightness = 1.0 - brightness;

  float b = styleBrightness(clamp(brightness, 0.0, 1.0), asciiStyle);
  b = clamp(b, 0.0001, 1.0);

  vec2 localUV = fract(uv * cellCount);
  float charAlpha;
  if (uUseGlyphAtlas > 0.5) {
    float cols = max(uGlyphGrid.x, 1.0);
    float rows = max(uGlyphGrid.y, 1.0);
    float maxIdx = max(uCharCount - 1.0, 0.0);
    float idxF = clamp(floor(b * maxIdx + 0.5), 0.0, maxIdx);
    vec2 tileSize = vec2(1.0) / vec2(cols, rows);
    float colIdx = mod(idxF, cols);
    float rowIdx = floor(idxF / cols);
    vec2 tileOrigin = vec2(colIdx, rowIdx) * tileSize;
    vec2 atlasUV = tileOrigin + localUV * tileSize;
    vec3 glyphSample = texture(uGlyphAtlas, atlasUV).rgb;
    charAlpha = dot(glyphSample, vec3(0.299, 0.587, 0.114));
  } else {
    float g = clamp(b, 0.0, 1.0);
    int n = 4096;
    if (g > 0.2) n = 65600;
    if (g > 0.3) n = 163153;
    if (g > 0.4) n = 15255086;
    if (g > 0.5) n = 13121101;
    if (g > 0.6) n = 15252014;
    if (g > 0.7) n = 13195790;
    if (g > 0.8) n = 11512810;
    vec2 pix = uv * resolution;
    float cell = max(cellSize, 1.0);
    vec2 p = mod(pix / cell, 2.0) - vec2(1.0);
    charAlpha = character(n, p);
  }

  vec3 rgb = colorMode ? leveled : vec3(brightness);
  float outA = charAlpha * cellColor.a;
  gl_FragColor = vec4(rgb, outA);
}
`

type AsciiStyleId = "standard" | "dense" | "minimal" | "blocks" | "braille" | "technical" | "matrix" | "hatching"
type SourceType = "image" | "video"
type FontTypeId = "default" | "custom"

/** Type Default = same built-in bitmask glyphs as ASCII-background-2 (not canvas text). */

/** Darkest → brightest (matches shader index 0 = dark). From reference stills: space … █. */
const DEFAULT_CHARACTERS = " .-:=o0B8█"

const DEFAULT_GLYPH_PADDING_PX = 2

function sanitizeCharacters(raw: string): string {
    const sanitized = Array.from(raw || "")
        .filter((ch) => ch === " " || !/\s/.test(ch))
        .join("")
    return sanitized.length > 0 ? sanitized : DEFAULT_CHARACTERS
}

function deriveFontSettings(
    font: unknown,
    fallbackFamily: string,
    fallbackWeight: string | number,
    fallbackSizePx: number
) {
    const f = font as {
        family?: string
        fontFamily?: string
        weight?: string | number
        fontWeight?: string | number
        fontSize?: string | number
        size?: string | number
    } | null
    const family = (f && (f.family || f.fontFamily)) || fallbackFamily
    const weight = (f && (f.weight || f.fontWeight)) || fallbackWeight
    const sizeRaw = (f && (f.fontSize ?? f.size)) ?? fallbackSizePx
    let sizePx =
        typeof sizeRaw === "string" ? parseFloat(sizeRaw) : Number(sizeRaw)
    if (!Number.isFinite(sizePx) || sizePx <= 0) sizePx = fallbackSizePx
    return { family, weight, sizePx }
}

type CanvasTexInstance = InstanceType<typeof CanvasTexture>

function createPlaceholderGlyphTexture(): CanvasTexInstance {
    const c = document.createElement("canvas")
    c.width = 8
    c.height = 8
    const g = c.getContext("2d")!
    g.fillStyle = "#000000"
    g.fillRect(0, 0, 8, 8)
    g.fillStyle = "#ffffff"
    g.fillRect(0, 0, 8, 8)
    const tex = new CanvasTexture(c)
    tex.colorSpace = SRGBColorSpace
    tex.minFilter = LinearFilter
    tex.magFilter = LinearFilter
    tex.needsUpdate = true
    return tex
}

function buildGlyphAtlasTexture(
    characters: string,
    fontFamily: string,
    fontWeight: string | number,
    fontSizePx: number,
    paddingPx: number
): { texture: CanvasTexInstance; cols: number; rows: number; count: number } {
    const count = Math.max(1, characters.length)
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const cellPx = Math.max(8, fontSizePx + paddingPx * 2)
    const dpr = Math.min(
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        2
    )
    const canvas = document.createElement("canvas")
    const cssW = cols * cellPx
    const cssH = rows * cellPx
    canvas.width = Math.max(1, Math.floor(cssW * dpr))
    canvas.height = Math.max(1, Math.floor(cssH * dpr))
    const ctx = canvas.getContext("2d")!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, cssW, cssH)
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`
    for (let i = 0; i < count; i++) {
        const cx = i % cols
        const cy = Math.floor(i / cols)
        const x = cx * cellPx + cellPx / 2
        const y = cy * cellPx + cellPx / 2
        ctx.fillText(characters[i]!, x, y)
    }
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.needsUpdate = true
    return { texture, cols, rows, count }
}

function asciiStyleToInt(s: AsciiStyleId): number {
    const m: Record<AsciiStyleId, number> = {
        standard: 0,
        dense: 1,
        minimal: 2,
        blocks: 3,
        braille: 4,
        technical: 5,
        matrix: 6,
        hatching: 7,
    }
    return m[s] ?? 0
}

type Vec2Instance = InstanceType<typeof Vector2>
type VideoTextureInstance = InstanceType<typeof VideoTexture>
type TextureLoaderInstance = InstanceType<typeof TextureLoader>
type TextureInstance = ReturnType<TextureLoaderInstance["load"]>
type ShaderMatInstance = InstanceType<typeof ShaderMaterial>
type RTInstance = InstanceType<typeof WebGLRenderTarget>

type AsciiUniformProps = {
    cellSize: number
    invert: boolean
    colorMode: boolean
    asciiStyle: number
    resolution: Vec2Instance
    brightnessAdjust: number
    contrastAdjust: number
    /** 0 = ASCII-background-2 bitmask; 1 = canvas glyph atlas (Custom). */
    useGlyphAtlas: number
}

function createAsciiShaderMaterial(
    o: AsciiUniformProps,
    rtTexture: RTInstance["texture"],
    placeholderGlyph: CanvasTexInstance
): ShaderMatInstance {
    return new ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        transparent: true,
        blending: NormalBlending,
        uniforms: {
            tDiffuse: { value: rtTexture },
            uGlyphAtlas: { value: placeholderGlyph },
            uGlyphGrid: { value: new Vector2(1, 1) },
            uCharCount: { value: 1 },
            cellSize: { value: o.cellSize },
            invert: { value: o.invert },
            colorMode: { value: o.colorMode },
            asciiStyle: { value: o.asciiStyle },
            time: { value: 0 },
            resolution: { value: o.resolution.clone() },
            brightnessAdjust: { value: o.brightnessAdjust },
            contrastAdjust: { value: o.contrastAdjust },
            uUseGlyphAtlas: { value: o.useGlyphAtlas },
        },
        vertexShader: ASCII_VERTEX,
        fragmentShader: ASCII_FRAGMENT,
    })
}

function syncAsciiMaterial(
    mat: ShaderMatInstance,
    o: AsciiUniformProps,
    rtTexture: RTInstance["texture"]
): void {
    const u = mat.uniforms
    u.tDiffuse.value = rtTexture
    u.cellSize.value = o.cellSize
    u.invert.value = o.invert
    u.colorMode.value = o.colorMode
    u.asciiStyle.value = o.asciiStyle
    ;(u.resolution.value as Vec2Instance).copy(o.resolution)
    u.brightnessAdjust.value = o.brightnessAdjust
    u.contrastAdjust.value = o.contrastAdjust
    u.uUseGlyphAtlas.value = o.useGlyphAtlas
}

// ============================================================================
// Media + scene
// ============================================================================

const cssVarRe =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/

function resolveVar(v: string): string {
    if (!v || !v.startsWith("var(")) return v
    const m = cssVarRe.exec(v)
    if (!m) return v
    const fb = (m[2] || "").trim()
    return fb.startsWith("var(") ? resolveVar(fb) : fb || v
}

function resolveColor(input: string | undefined): string {
    if (typeof input !== "string") return "#0a0a0a"
    const s = input.trim()
    if (s.startsWith("var(")) return resolveVar(s) || "#0a0a0a"
    if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`
    if (/^[0-9A-Fa-f]{8}$/.test(s)) return `#${s}`
    return s
}

function resolveImageSource(input: unknown): string | null {
    if (!input) return null
    if (typeof input === "string") return input.trim() || null
    const o = input as { src?: string; url?: string }
    return o?.src ?? o?.url ?? null
}

/** Framer canvas zoom uses CSS transforms; sync R3F after layout box (CSS px) changes. */
function InvalidateOnLayout({ width, height }: { width: number; height: number }) {
    useLayoutEffect(() => {
        invalidate()
    }, [width, height])
    return null
}

function MediaPlane({
    url,
    isVideo,
    play,
    loop,
    layoutWidth,
    layoutHeight,
}: {
    url: string
    isVideo: boolean
    play: boolean
    loop: boolean
    layoutWidth: number
    layoutHeight: number
}) {
    const [map, setMap] = useState<VideoTextureInstance | TextureInstance | null>(null)
    const viewport = useThree((s: { viewport: { width: number; height: number } }) => s.viewport)

    useEffect(() => {
        let cancelled = false
        if (isVideo) {
            const v = document.createElement("video")
            v.src = url
            v.crossOrigin = "anonymous"
            v.loop = loop
            v.muted = true
            v.playsInline = true
            const vt = new VideoTexture(v)
            vt.colorSpace = SRGBColorSpace
            vt.minFilter = LinearFilter
            const onReady = () => {
                if (!cancelled) setMap(vt)
            }
            v.addEventListener("loadeddata", onReady)
            v.load()
            return () => {
                cancelled = true
                v.removeEventListener("loadeddata", onReady)
                v.pause()
                v.removeAttribute("src")
                v.load()
                vt.dispose()
            }
        }
        let loadedTex: TextureInstance | null = null
        const loader = new TextureLoader()
        loader.load(
            url,
            (tex: TextureInstance) => {
                loadedTex = tex
                tex.colorSpace = SRGBColorSpace
                tex.minFilter = LinearFilter
                if (!cancelled) setMap(tex)
            },
            undefined,
            () => {}
        )
        return () => {
            cancelled = true
            loadedTex?.dispose()
        }
    }, [url, isVideo, loop])

    useEffect(() => {
        if (!isVideo || !map) return
        const v = (map as VideoTextureInstance).image as HTMLVideoElement
        if (play) void v.play().catch(() => {})
        else v.pause()
    }, [isVideo, map, play])

    useFrame(() => {
        if (map && (map as VideoTextureInstance).isVideoTexture) {
            ;(map as VideoTextureInstance).needsUpdate = true
        }
    })

    const scale = useMemo(() => {
        if (!map) return new Vector3(1, 1, 1)
        const img = map.image as HTMLImageElement | HTMLVideoElement
        const w =
            "videoWidth" in img ? img.videoWidth : (img as HTMLImageElement).naturalWidth
        const h =
            "videoHeight" in img ? img.videoHeight : (img as HTMLImageElement).naturalHeight
        const boxW =
            layoutWidth > 0 ? layoutWidth : Math.max(1e-6, viewport.width)
        const boxH =
            layoutHeight > 0 ? layoutHeight : Math.max(1e-6, viewport.height)
        if (!w || !h) return new Vector3(boxW, boxH, 1)
        const mediaAspect = w / h
        const boxAspect = boxW / boxH
        // "Cover" in layout CSS pixels (stable under Framer canvas zoom)
        if (mediaAspect > boxAspect) {
            return new Vector3(boxH * mediaAspect, boxH, 1)
        }
        return new Vector3(boxW, boxW / mediaAspect, 1)
    }, [map, layoutWidth, layoutHeight, viewport.width, viewport.height])

    if (!map) return null

    return (
        <mesh scale={scale}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={map} toneMapped={false} side={DoubleSide} />
        </mesh>
    )
}

function AsciiSceneInner({
    mediaUrl,
    isVideo,
    playVideo,
    loop,
    backdropColor,
    asciiProps,
    layoutWidth,
    layoutHeight,
    characters,
    fontType,
    fontFamily,
    fontWeight,
    fontSizePx,
    font,
}: {
    mediaUrl: string
    isVideo: boolean
    playVideo: boolean
    loop: boolean
    backdropColor: string
    asciiProps: AsciiUniformProps
    layoutWidth: number
    layoutHeight: number
    characters: string
    fontType: FontTypeId
    fontFamily: string
    fontWeight: number
    fontSizePx: number
    font: unknown
}) {
    type R3FSlice = {
        gl: {
            getPixelRatio: () => number
            setRenderTarget: (t: unknown) => void
            render: (scene: unknown, cam: object) => void
            getClearColor: (target: object) => void
            getClearAlpha: () => number
            setClearColor: (color: object, alpha?: number) => void
            clear: (
                color?: boolean,
                depth?: boolean,
                stencil?: boolean
            ) => void
        }
        camera: object
        size: { width: number; height: number }
        viewport: { width: number; height: number }
    }
    const { gl, camera, size, viewport } = useThree() as R3FSlice

    const captureScene = useMemo(() => new Scene(), [])
    const rt = useMemo(
        () =>
            new WebGLRenderTarget(4, 4, {
                depthBuffer: false,
                stencilBuffer: false,
                minFilter: LinearFilter,
                magFilter: LinearFilter,
            }),
        []
    )

    const asciiRef = useRef(asciiProps)
    asciiRef.current = asciiProps

    const timeRef = useRef(0)

    const backdropThree = useMemo(
        () => new Color(resolveColor(backdropColor)),
        [backdropColor]
    )

    const placeholderGlyph = useMemo(() => createPlaceholderGlyphTexture(), [])
    const glyphAtlasRef = useRef<{
        texture: CanvasTexInstance
        owns: boolean
    } | null>(null)

    const asciiMat = useMemo(() => {
        rt.texture.colorSpace = SRGBColorSpace
        return createAsciiShaderMaterial(
            {
                ...asciiProps,
                resolution: new Vector2(
                    Math.max(1, size.width),
                    Math.max(1, size.height)
                ),
            },
            rt.texture,
            placeholderGlyph
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rt, placeholderGlyph])

    useLayoutEffect(() => {
        const pr = gl.getPixelRatio()
        const cssW = layoutWidth > 0 ? layoutWidth : size.width
        const cssH = layoutHeight > 0 ? layoutHeight : size.height
        const w = Math.max(1, Math.floor(cssW * pr))
        const h = Math.max(1, Math.floor(cssH * pr))
        rt.setSize(w, h)
        rt.texture.colorSpace = SRGBColorSpace
    }, [size.width, size.height, layoutWidth, layoutHeight, gl, rt])

    useLayoutEffect(() => {
        const u = asciiMat.uniforms
        if (fontType === "default") {
            u.uUseGlyphAtlas.value = 0
            u.uCharCount.value = 1
            ;(u.uGlyphGrid.value as Vec2Instance).set(1, 1)
            u.uGlyphAtlas.value = placeholderGlyph
            const prev = glyphAtlasRef.current
            if (prev?.owns) {
                prev.texture.dispose()
                glyphAtlasRef.current = null
            }
            return
        }
        const chars = sanitizeCharacters(characters)
        const f = deriveFontSettings(
            font,
            fontFamily,
            fontWeight,
            fontSizePx
        )
        const fontCSS = `${f.weight} ${f.sizePx}px ${f.family}`
        if (typeof document !== "undefined" && document.fonts?.load) {
            void document.fonts.load(fontCSS).catch(() => {})
        }
        const built = buildGlyphAtlasTexture(
            chars,
            f.family,
            f.weight,
            f.sizePx,
            DEFAULT_GLYPH_PADDING_PX
        )
        const prev = glyphAtlasRef.current
        if (prev?.owns && prev.texture !== built.texture) {
            prev.texture.dispose()
        }
        glyphAtlasRef.current = { texture: built.texture, owns: true }
        u.uUseGlyphAtlas.value = 1
        u.uGlyphAtlas.value = built.texture
        ;(u.uGlyphGrid.value as Vec2Instance).set(built.cols, built.rows)
        u.uCharCount.value = built.count
    }, [
        asciiMat,
        characters,
        font,
        fontFamily,
        fontSizePx,
        fontType,
        fontWeight,
        placeholderGlyph,
    ])

    useEffect(() => {
        return () => {
            asciiMat.dispose()
            rt.dispose()
            const g = glyphAtlasRef.current
            if (g?.owns) {
                g.texture.dispose()
                glyphAtlasRef.current = null
            }
            placeholderGlyph.dispose()
        }
    }, [asciiMat, rt, placeholderGlyph])

    useFrame((_state: unknown, delta: number) => {
        const o = asciiRef.current
        timeRef.current += delta
        asciiMat.uniforms.time.value = timeRef.current

        const cssW = layoutWidth > 0 ? layoutWidth : size.width
        const cssH = layoutHeight > 0 ? layoutHeight : size.height
        const res = new Vector2(Math.max(1, cssW), Math.max(1, cssH))
        syncAsciiMaterial(asciiMat, { ...o, resolution: res }, rt.texture)
    })

    useFrame(() => {
        const prevBg = new Color()
        gl.getClearColor(prevBg)
        const prevA = gl.getClearAlpha()
        gl.setRenderTarget(rt)
        gl.setClearColor(backdropThree, 1)
        gl.clear(true, false, false)
        gl.render(captureScene, camera as never)
        gl.setRenderTarget(null)
        gl.setClearColor(prevBg, prevA)
    }, -1)

    return (
        <>
            {createPortal(
                <>
                    <MediaPlane
                        url={mediaUrl}
                        isVideo={isVideo}
                        play={playVideo}
                        loop={loop}
                        layoutWidth={layoutWidth}
                        layoutHeight={layoutHeight}
                    />
                </>,
                captureScene,
                { camera: camera as never }
            )}
            <mesh renderOrder={1} frustumCulled={false}>
                <planeGeometry
                    args={[
                        layoutWidth > 0 ? layoutWidth : viewport.width,
                        layoutHeight > 0 ? layoutHeight : viewport.height,
                    ]}
                />
                <primitive
                    object={asciiMat}
                    attach="material"
                    dispose={null}
                />
            </mesh>
        </>
    )
}

// ============================================================================
// Props
// ============================================================================

interface Props {
    preview: boolean
    source: SourceType
    image: { src?: string; url?: string } | string | null
    videoSource: "url" | "upload"
    videoFile: string
    videoUrl: string
    poster: { src?: string; url?: string } | string | null
    autoplay: boolean
    loop: boolean
    backdrop: string
    cellSize: number
    density: number
    brightnessAdjust: number
    contrastAdjust: number
    invert: boolean
    colorMode: boolean
    asciiStyle: AsciiStyleId
    fontType: FontTypeId
    characters: string
    font?: unknown
    fontFamily: string
    fontWeight: number
    fontSizePx: number
    debug: boolean
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function AsciiMedia(props: Props) {
    const {
        preview = false,
        source = "image",
        image,
        videoSource = "url",
        videoFile,
        videoUrl,
        poster: _poster,
        autoplay = true,
        loop = true,
        backdrop = "#111111",
        cellSize = 10,
        density = 100,
        brightnessAdjust = 0,
        contrastAdjust = 1,
        invert = false,
        colorMode = true,
        asciiStyle = "standard",
        fontType = "default",
        characters = DEFAULT_CHARACTERS,
        font,
        fontFamily = "monospace",
        fontWeight = 400,
        fontSizePx = 28,
        debug: _debug = false,
        style,
    } = props

    const [debouncedCell, setDebouncedCell] = useState(cellSize)
    const [debouncedDensity, setDebouncedDensity] = useState(density)
    useEffect(() => {
        const id = window.setTimeout(() => {
            setDebouncedCell(cellSize)
            setDebouncedDensity(density)
        }, 80)
        return () => window.clearTimeout(id)
    }, [cellSize, density])

    const effectiveCellSize = Math.max(
        2,
        Math.round((debouncedCell * 100) / Math.max(25, debouncedDensity))
    )

    const resolvedSourceUrl = useMemo(() => {
        if (source === "image") return resolveImageSource(image)
        if (source === "video")
            return videoSource === "upload" ? videoFile : videoUrl
        return null
    }, [source, image, videoSource, videoFile, videoUrl])

    const hasSource = !!resolvedSourceUrl

    const INTRINSIC_W = 600
    const INTRINSIC_H = 400

    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const [layoutCss, setLayoutCss] = useState({
        w: INTRINSIC_W,
        h: INTRINSIC_H,
    })
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const playVideo =
        source === "video" && (!isCanvas || preview) && autoplay

    const asciiProps: AsciiUniformProps = useMemo(
        () => ({
            cellSize: effectiveCellSize,
            invert,
            colorMode,
            asciiStyle: asciiStyleToInt(asciiStyle),
            resolution: new Vector2(1, 1),
            brightnessAdjust,
            contrastAdjust,
            useGlyphAtlas: fontType === "custom" ? 1 : 0,
        }),
        [
            effectiveCellSize,
            invert,
            colorMode,
            asciiStyle,
            brightnessAdjust,
            contrastAdjust,
            fontType,
        ]
    )

    useLayoutEffect(() => {
        if (!hasSource) return
        const el = containerRef.current
        if (!el) return
        const read = () => {
            const w = Math.max(1, el.clientWidth || el.offsetWidth || 1)
            const h = Math.max(1, el.clientHeight || el.offsetHeight || 1)
            setLayoutCss((prev) =>
                Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5
                    ? prev
                    : { w, h }
            )
        }
        read()
        const ro = new ResizeObserver(() => read())
        ro.observe(el)
        return () => ro.disconnect()
    }, [hasSource])

    if (!hasSource) {
        return (
            <div
                ref={containerRef}
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
                }}
            >
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="ASCII Media"
                    subtitle={
                        source === "image"
                            ? "Add an image to see the effect"
                            : "Add a video to see the effect"
                    }
                />
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: 0,
                minWidth: 0,
            }}
        >
            <div
                style={{
                    width: `${INTRINSIC_W}px`,
                    height: `${INTRINSIC_H}px`,
                    minWidth: `${INTRINSIC_W}px`,
                    minHeight: `${INTRINSIC_H}px`,
                    visibility: "hidden",
                    position: "absolute",
                    inset: 0,
                    zIndex: -1,
                    pointerEvents: "none",
                }}
                aria-hidden
            />
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                }}
                aria-hidden
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
                    backgroundColor: resolveColor(backdrop),
                }}
            >
                <Canvas
                    orthographic
                    flat
                    camera={{ position: [0, 0, 1], zoom: 1, near: 0.1, far: 10 }}
                    gl={{ preserveDrawingBuffer: true, alpha: true }}
                    onCreated={({
                        gl,
                    }: {
                        gl: {
                            outputColorSpace: string
                            toneMapping: number
                        }
                    }) => {
                        gl.outputColorSpace = SRGBColorSpace
                        gl.toneMapping = NoToneMapping
                    }}
                    resize={{
                        offsetSize: true,
                        scroll: false,
                        debounce: { scroll: 0, resize: 0 },
                    }}
                    dpr={[1, 2]}
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "block",
                        width: "100%",
                        height: "100%",
                    }}
                >
                    <InvalidateOnLayout
                        width={layoutCss.w}
                        height={layoutCss.h}
                    />
                    <AsciiSceneInner
                        mediaUrl={resolvedSourceUrl}
                        isVideo={source === "video"}
                        playVideo={playVideo}
                        loop={loop}
                        backdropColor={backdrop}
                        asciiProps={asciiProps}
                        layoutWidth={layoutCss.w}
                        layoutHeight={layoutCss.h}
                        characters={characters}
                        fontType={fontType}
                        fontFamily={fontFamily}
                        fontWeight={fontWeight}
                        fontSizePx={fontSizePx}
                        font={font}
                    />
                </Canvas>
            </div>
        </div>
    )
}

addPropertyControls(AsciiMedia, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    source: {
        type: ControlType.Enum,
        title: "Source",
        options: ["image", "video"],
        optionTitles: ["Image", "Video"],
        defaultValue: "image",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Media",
        hidden: (p: Props) => p.source !== "image",
    },
    videoSource: {
        type: ControlType.Enum,
        title: "Video",
        options: ["url", "upload"],
        optionTitles: ["URL", "Upload"],
        defaultValue: "url",
        displaySegmentedControl: true,
        hidden: (p: Props) => p.source !== "video",
    },
    videoFile: {
        type: ControlType.File,
        title: "File",
        allowedFileTypes: ["mp4", "webm"],
        hidden: (p: Props) =>
            p.source !== "video" || p.videoSource !== "upload",
    },
    videoUrl: {
        type: ControlType.String,
        title: "URL",
        placeholder: "https://example.com/video.mp4",
        description: "Direct link to an mp4 or webm file.",
        hidden: (p: Props) =>
            p.source !== "video" || p.videoSource !== "url",
    },
    poster: {
        type: ControlType.ResponsiveImage,
        title: "Poster",
        hidden: (p: Props) => p.source !== "video",
    },
    autoplay: {
        type: ControlType.Boolean,
        title: "Autoplay",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (p: Props) => p.source !== "video",
    },
    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (p: Props) => p.source !== "video",
    },
    backdrop: {
        type: ControlType.Color,
        title: "Backdrop",
        defaultValue: "#111111",
    },
    brightnessAdjust: {
        type: ControlType.Number,
        title: "Bright",
        min: -0.45,
        max: 0.45,
        step: 0.01,
        defaultValue: 0,
    },
    contrastAdjust: {
        type: ControlType.Number,
        title: "Contrast",
        min: 0.35,
        max: 2.5,
        step: 0.05,
        defaultValue: 1,
    },
    density: {
        type: ControlType.Number,
        title: "Density",
        min: 50,
        max: 200,
        step: 5,
        defaultValue: 100,
    },
    cellSize: {
        type: ControlType.Number,
        title: "Cells",
        min: 2,
        max: 48,
        step: 1,
        defaultValue: 10,
    },
    invert: {
        type: ControlType.Boolean,
        title: "Invert",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    colorMode: {
        type: ControlType.Boolean,
        title: "Color",
        defaultValue: true,
        enabledTitle: "Color",
        disabledTitle: "Gray",
    },
    asciiStyle: {
        type: ControlType.Enum,
        title: "Style",
        options: ["standard", "dense", "minimal", "blocks", "braille", "technical", "matrix", "hatching"],
        optionTitles: ["Standard", "Dense", "Minimal", "Blocks", "Braille", "Technical", "Matrix", "Hatching"],
        defaultValue: "standard",
    },
    fontType: {
        type: ControlType.Enum,
        title: "Type",
        options: ["default", "custom"],
        optionTitles: ["Default", "Custom"],
        defaultValue: "default",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    characters: {
        type: ControlType.String,
        title: "Chars",
        defaultValue: DEFAULT_CHARACTERS,
        placeholder: " .-:=o0B8█",
        hidden: (p: Props) => p.fontType !== "custom",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: 28,
            lineHeight: 1.2,
        },
        hidden: (p: Props) => p.fontType !== "custom",
    },
    fontFamily: {
        type: ControlType.String,
        title: "Family",
        defaultValue: "monospace",
        hidden: (p: Props) => p.fontType !== "custom",
    },
    fontWeight: {
        type: ControlType.Number,
        title: "Weight",
        min: 100,
        max: 900,
        step: 100,
        defaultValue: 400,
        displayStepper: true,
        hidden: (p: Props) => p.fontType !== "custom",
    },
    fontSizePx: {
        type: ControlType.Number,
        title: "Size",
        min: 8,
        max: 64,
        step: 1,
        defaultValue: 28,
        hidden: (p: Props) => p.fontType !== "custom",
    },
    debug: {
        type: ControlType.Boolean,
        title: "Debug",
        defaultValue: false,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

AsciiMedia.displayName = "ASCII Media"
