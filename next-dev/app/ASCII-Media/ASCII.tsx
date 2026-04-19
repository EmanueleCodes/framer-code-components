import * as React from "react"
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
import {
    glyphFromAsciiPreset,
    type AsciiStyleId,
} from "./ascii_effect_presets.ts"

/** Standard style: shader uses full mask (1.0) above ~0.85 — draw as a real block glyph, not a pixel grid. */
const STANDARD_BRIGHT_BLOCK = "\u2588"

type MediaSourceType = "image" | "video"

type ColorPaletteId = "original" | "green" | "amber" | "cyan" | "blue"

type ShaderConfig = {
    cellSize: number
    asciiStyle: AsciiStyleId
    colorMode: boolean
    brightnessAdjust: number
    contrastAdjust: number
    colorPalette: ColorPaletteId
}

type EffectsConfig = {
    /** Master switch for the whole Effects group (panel + runtime). */
    effectsEnabled: boolean
    /** When On, scanline **Depth** and **Lines** are shown and CRT lines can run. */
    scanlineEnabled: boolean
    scanlineIntensity: number
    scanlineCount: number
    /** When On, vignette **Dim** and **Radius** are shown and edge darkening can run. */
    vignetteEnabled: boolean
    vignetteIntensity: number
    vignetteRadius: number
    curvature: number
    aberrationStrength: number
    /** When On, Noise **Level** and tuning sliders are shown and grain is applied. */
    noiseEnabled: boolean
    noiseIntensity: number
    noiseScale: number
    /** Spatial frequency of the grain (scales noise domain with Scale). */
    noiseFrequency: number
    /** Noise animation speed (panel title: Speed). */
    noiseSpeed: number
    /** When On, wave **Amp** and motion sliders are shown and wave UV is applied. */
    waveEnabled: boolean
    waveAmplitude: number
    waveFrequency: number
    waveSpeed: number
    /** When On, glitch **Jitter** and **Rate** are shown and row shifts can run. */
    glitchEnabled: boolean
    glitchIntensity: number
    glitchFrequency: number
}

const DEFAULT_SHADER: ShaderConfig = {
    cellSize: 10,
    asciiStyle: "standard",
    colorMode: true,
    brightnessAdjust: 0,
    contrastAdjust: 1,
    colorPalette: "original",
}

/** Stable fallback when `font` prop is unset — avoids new `{}` each render (hooks deps). */
const EMPTY_FONT: React.CSSProperties = {}

const ASCII_DEFAULT_FRAMER_FONT = {
    fontFamily: "monospace",
    fontWeight: 400,
} as const

const DEFAULT_EFFECTS: EffectsConfig = {
    effectsEnabled: true,
    scanlineEnabled: false,
    scanlineIntensity: 0,
    scanlineCount: 100,
    vignetteEnabled: false,
    vignetteIntensity: 0,
    vignetteRadius: 0.8,
    curvature: 0,
    aberrationStrength: 0,
    noiseEnabled: false,
    noiseIntensity: 0,
    noiseScale: 1,
    noiseFrequency: 10,
    noiseSpeed: 1,
    waveEnabled: false,
    waveAmplitude: 0,
    waveFrequency: 10,
    waveSpeed: 1,
    glitchEnabled: false,
    glitchIntensity: 0,
    glitchFrequency: 10,
}

/**
 * `hidden` on nested `effects` controls: Framer may pass full `Props` **or**
 * the effects object with fields at the top level. Support both so secondary
 * sliders (Lines, Radius, …) are not stuck hidden.
 */
function effectControlValue<K extends keyof EffectsConfig>(
    props: unknown,
    key: K
): EffectsConfig[K] {
    if (!props || typeof props !== "object") return DEFAULT_EFFECTS[key]
    const o = props as Record<string, unknown>
    const nested = o.effects
    if (nested && typeof nested === "object") {
        const v = (nested as Partial<EffectsConfig>)[key]
        if (v !== undefined && v !== null) return v as EffectsConfig[K]
    }
    const flat = (o as Partial<EffectsConfig>)[key]
    if (flat !== undefined && flat !== null) return flat as EffectsConfig[K]
    return DEFAULT_EFFECTS[key]
}

/** Hide nested Effects controls when master **Enable** is Off. */
function hideUnlessEffectsOn(
    props: unknown,
    and?: (props: unknown) => boolean
): boolean {
    if (!Boolean(effectControlValue(props, "effectsEnabled"))) return true
    return and ? and(props) : false
}

interface Props {
    preview: boolean
    source?: MediaSourceType
    image: { src?: string; url?: string } | string | null
    videoSource?: "url" | "upload"
    videoFile?: string
    videoUrl?: string
    autoplay?: boolean
    loop?: boolean
    /**
     * Framer may pass a string, `var(--token, #fallback)`, `{ value: … }`, or `{ light, dark }`
     * when the token differs by theme; the component picks the branch for the current appearance.
     */
    backdrop: string
    showImageBelow: boolean
    imageBelowBlur: number
    imageBelowOpacity: number
    /** Framer font control — drives canvas `fontFamily` / weight / italic; cell size still sets pixel height. */
    font?: React.CSSProperties
    shader?: Partial<ShaderConfig>
    effects?: Partial<EffectsConfig>
    style?: React.CSSProperties
}

function resolveImageSource(input: unknown): string | null {
    if (!input) return null
    if (typeof input === "string") return input.trim() || null
    const o = input as { src?: string; url?: string }
    return o?.src ?? o?.url ?? null
}

function resolveMediaUrl(
    source: MediaSourceType | undefined,
    image: unknown,
    videoSource: "url" | "upload" | undefined,
    videoFile: string | undefined,
    videoUrl: string | undefined
): string | null {
    if (source === "video") {
        const vs = videoSource ?? "url"
        if (vs === "upload") {
            const f = (videoFile ?? "").trim()
            return f || null
        }
        const u = (videoUrl ?? "").trim()
        return u || null
    }
    return resolveImageSource(image)
}

function mediaDisplaySize(
    media: HTMLImageElement | HTMLVideoElement
): { width: number; height: number } {
    if (media instanceof HTMLVideoElement) {
        const w = media.videoWidth
        const h = media.videoHeight
        return { width: w > 0 ? w : 1, height: h > 0 ? h : 1 }
    }
    const w = media.naturalWidth
    const h = media.naturalHeight
    return { width: w > 0 ? w : 1, height: h > 0 ? h : 1 }
}

// Framer canvas / tokens — see how-to-build-framer-components/colorInFramerCanvas.md
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

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input.trim()) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()

    const rgbaComma = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaComma) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaComma[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaComma[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaComma[3]))) / 255
        const a =
            rgbaComma[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaComma[4])))
                : 1
        return { r, g, b, a }
    }

    const rgbaSpace = str.match(
        /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i
    )
    if (rgbaSpace) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaSpace[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaSpace[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaSpace[3]))) / 255
        const a =
            rgbaSpace[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaSpace[4])))
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

function tryComputedCssColor(colorValue: string): string | null {
    if (typeof document === "undefined") return null
    try {
        const el = document.createElement("div")
        el.style.color = colorValue
        el.style.position = "absolute"
        el.style.visibility = "hidden"
        el.style.pointerEvents = "none"
        document.body.appendChild(el)
        const rgb = getComputedStyle(el).color
        document.body.removeChild(el)
        if (
            rgb &&
            rgb !== "rgba(0, 0, 0, 0)" &&
            rgb !== "transparent" &&
            /^rgba?\(/i.test(rgb)
        ) {
            return rgb
        }
    } catch {
        /* ignore */
    }
    return null
}

/** Active Framer / OS appearance for dual light–dark color tokens. */
function detectFramerColorScheme(): "light" | "dark" {
    if (typeof document === "undefined") return "light"
    const root = document.documentElement
    const body = document.body
    const fromAttr = (el: Element | null) =>
        el?.getAttribute("data-framer-theme") ||
        el?.getAttribute("data-theme") ||
        ""
    const a = fromAttr(root) || fromAttr(body)
    if (a === "dark") return "dark"
    if (a === "light") return "light"
    if (root.classList.contains("framer-theme-dark")) return "dark"
    if (root.classList.contains("framer-theme-light")) return "light"
    const cs = getComputedStyle(root).colorScheme
    if (cs === "dark") return "dark"
    if (cs === "light") return "light"
    if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ) {
        return "dark"
    }
    return "light"
}

/**
 * Unwrap Framer `ControlType.Color` payloads: plain strings, `{ value }`,
 * `{ light, dark }` theme pairs (see token-aware colors in Framer), and `style` / `css`.
 */
function unwrapFramerBackdropRaw(
    backdrop: unknown,
    mode: "light" | "dark"
): string {
    if (backdrop === null || backdrop === undefined) return "#111111"
    if (typeof backdrop === "string") {
        const t = backdrop.trim()
        return t || "#111111"
    }
    if (typeof backdrop === "object") {
        const o = backdrop as Record<string, unknown>
        if ("value" in o) {
            const v = o.value
            if (typeof v === "string" && v.trim())
                return unwrapFramerBackdropRaw(v, mode)
            if (v !== null && typeof v === "object")
                return unwrapFramerBackdropRaw(v, mode)
        }
        const lightV = o.light ?? o.Light
        const darkV = o.dark ?? o.Dark
        if (lightV !== undefined || darkV !== undefined) {
            const branch =
                mode === "dark"
                    ? (darkV !== undefined ? darkV : lightV)
                    : (lightV !== undefined ? lightV : darkV)
            if (typeof branch === "string" && branch.trim())
                return branch.trim()
            if (branch !== null && typeof branch === "object")
                return unwrapFramerBackdropRaw(branch, mode)
        }
        if (typeof o.style === "string" && o.style.trim()) return o.style.trim()
        if (typeof o.css === "string" && o.css.trim()) return o.css.trim()
    }
    return "#111111"
}

/** Resolved `rgba(...)` for canvas `fillStyle` / container background (never raw `var()`). */
function backdropToCanvasRgbaString(
    backdrop: unknown,
    mode: "light" | "dark"
): string {
    const raw = unwrapFramerBackdropRaw(backdrop, mode)
    let s = raw.trim()
    let guard = 0
    while (s.startsWith("var(") && guard++ < 12) {
        const next = extractDefaultValue(s)
        if (!next || next === s) break
        s = String(next).trim()
    }
    if (/^[0-9A-Fa-f]{6}$/i.test(s)) s = `#${s}`
    if (/^[0-9A-Fa-f]{8}$/i.test(s)) s = `#${s}`

    let rgba = parseColorToRgba(s)
    if (raw.includes("var(")) {
        const computed = tryComputedCssColor(raw.trim())
        if (computed) rgba = parseColorToRgba(computed)
    }

    return `rgba(${Math.round(rgba.r * 255)}, ${Math.round(rgba.g * 255)}, ${Math.round(rgba.b * 255)}, ${rgba.a})`
}

function random(x: number, y: number): number {
    return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123) % 1
}

function noise(x: number, y: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const a = random(ix, iy)
    const b = random(ix + 1, iy)
    const c = random(ix, iy + 1)
    const d = random(ix + 1, iy + 1)
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    return a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy
}

function applyColorPalette(
    r: number,
    g: number,
    b: number,
    palette: ColorPaletteId
): [number, number, number] {
    if (palette === "original") return [r, g, b]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    if (palette === "green") return [0.1 * 255, lum * 0.9, 0.1 * 255]
    if (palette === "amber") return [lum, lum * 0.6, lum * 0.2]
    if (palette === "cyan") return [0, lum * 0.8, lum]
    if (palette === "blue") return [0.1 * 255, 0.2 * 255, lum]
    return [r, g, b]
}

function sampleCellRgb(
    pixels: Uint8ClampedArray,
    cw: number,
    ch: number,
    cx: number,
    cy: number,
    cell: number
): { r: number; g: number; b: number } {
    const px = Math.floor(cx)
    const py = Math.floor(cy)
    const half = Math.max(1, Math.floor(cell * 0.5))
    const stride = Math.max(1, Math.ceil(cell / 5))
    let sr = 0
    let sg = 0
    let sb = 0
    let n = 0
    for (let oy = -half; oy <= half; oy += stride) {
        for (let ox = -half; ox <= half; ox += stride) {
            const sx = Math.max(0, Math.min(cw - 1, px + ox))
            const sy = Math.max(0, Math.min(ch - 1, py + oy))
            const i = (sy * cw + sx) * 4
            sr += pixels[i] ?? 0
            sg += pixels[i + 1] ?? 0
            sb += pixels[i + 2] ?? 0
            n++
        }
    }
    if (n === 0) return { r: 0, g: 0, b: 0 }
    return { r: sr / n / 255, g: sg / n / 255, b: sb / n / 255 }
}

function buildCanvasFontString(
    font: React.CSSProperties | undefined,
    fontSizePx: number
): string {
    const fam =
        (typeof font?.fontFamily === "string" && font.fontFamily.trim()) ||
        "monospace"
    const w = font?.fontWeight
    const weight =
        w === undefined || w === ""
            ? "400"
            : typeof w === "number"
              ? String(w)
              : String(w)
    const style =
        font?.fontStyle === "italic" || font?.fontStyle === "oblique"
            ? `${font.fontStyle} `
            : ""
    const px = Math.max(1, Math.round(fontSizePx))
    return `${style}${weight} ${px}px ${fam}`
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 700
 * @framerDisableUnlink
 */
export default function ASCII(props: Props) {
    const {
        preview = false,
        source = "image",
        image,
        videoSource = "url",
        videoFile,
        videoUrl,
        autoplay = true,
        loop = true,
        backdrop = "#111111",
        showImageBelow = false,
        imageBelowBlur = 10,
        imageBelowOpacity = 0.4,
        font: fontProp,
        shader: shaderProp,
        effects: effectsProp,
        style,
    } = props
    const font = fontProp ?? EMPTY_FONT

    const shader: ShaderConfig = { ...DEFAULT_SHADER, ...shaderProp }
    const effects: EffectsConfig = { ...DEFAULT_EFFECTS, ...effectsProp }
    const {
        cellSize,
        asciiStyle,
        colorMode,
        brightnessAdjust,
        contrastAdjust,
        colorPalette,
    } = shader
    const {
        effectsEnabled,
        scanlineEnabled,
        scanlineIntensity,
        scanlineCount,
        vignetteEnabled,
        vignetteIntensity,
        vignetteRadius,
        curvature,
        aberrationStrength,
        noiseEnabled,
        noiseIntensity,
        noiseScale,
        noiseFrequency,
        noiseSpeed,
        waveEnabled,
        waveAmplitude,
        waveFrequency,
        waveSpeed,
        glitchEnabled,
        glitchIntensity,
        glitchFrequency,
    } = effects

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const underlayCanvasRef = useRef<HTMLCanvasElement>(null)
    const offscreenRef = useRef<HTMLCanvasElement | null>(null)
    const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
    const animationRef = useRef<number>(0)
    const timeRef = useRef<number>(0)

    const [layoutSize, setLayoutSize] = useState({ w: 600, h: 400 })
    const [mediaReady, setMediaReady] = useState(false)
    const [appearance, setAppearance] = useState<"light" | "dark">(() =>
        typeof document !== "undefined" ? detectFramerColorScheme() : "light"
    )

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const shouldAnimate = !isCanvas || preview

    const resolvedMediaUrl = useMemo(
        () =>
            resolveMediaUrl(
                source,
                image,
                videoSource,
                videoFile,
                videoUrl
            ),
        [source, image, videoSource, videoFile, videoUrl]
    )
    const hasMedia = !!resolvedMediaUrl

    const needsEffectTimeRaf = useMemo(
        () =>
            asciiStyle === "matrix" ||
            (effectsEnabled &&
                ((noiseEnabled && noiseIntensity > 0) ||
                    (waveEnabled && waveAmplitude > 0) ||
                    (glitchEnabled &&
                        glitchIntensity > 0 &&
                        glitchFrequency > 0))),
        [
            asciiStyle,
            effectsEnabled,
            noiseEnabled,
            noiseIntensity,
            waveEnabled,
            waveAmplitude,
            glitchEnabled,
            glitchIntensity,
            glitchFrequency,
        ]
    )

    const backdropFill = useMemo(
        () =>
            backdropToCanvasRgbaString(backdrop as unknown, appearance),
        [backdrop, appearance]
    )

    useLayoutEffect(() => {
        const readAppearance = () => setAppearance(detectFramerColorScheme())
        readAppearance()
        const mq = window.matchMedia("(prefers-color-scheme: dark)")
        mq.addEventListener("change", readAppearance)
        const mo = new MutationObserver(readAppearance)
        mo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-framer-theme", "data-theme", "class"],
        })
        if (document.body) {
            mo.observe(document.body, {
                attributes: true,
                attributeFilter: ["data-framer-theme", "data-theme", "class"],
            })
        }
        return () => {
            mq.removeEventListener("change", readAppearance)
            mo.disconnect()
        }
    }, [])

    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return
        const read = () => {
            const w = el.clientWidth || el.offsetWidth || 600
            const h = el.clientHeight || el.offsetHeight || 400
            setLayoutSize((prev) =>
                Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1
                    ? prev
                    : { w, h }
            )
        }
        read()
        const ro = new ResizeObserver(read)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        if (!resolvedMediaUrl) {
            mediaRef.current = null
            setMediaReady(false)
            return
        }

        if (source !== "video") {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                mediaRef.current = img
                setMediaReady(true)
            }
            img.onerror = () => {
                mediaRef.current = null
                setMediaReady(false)
            }
            img.src = resolvedMediaUrl
            return () => {
                img.onload = null
                img.onerror = null
            }
        }

        const v = document.createElement("video")
        v.crossOrigin = "anonymous"
        v.muted = true
        v.loop = loop
        v.playsInline = true
        v.preload = "auto"

        const onReady = () => {
            mediaRef.current = v
            setMediaReady(true)
        }
        const onErr = () => {
            mediaRef.current = null
            setMediaReady(false)
        }

        v.addEventListener("loadeddata", onReady)
        v.addEventListener("error", onErr)
        v.src = resolvedMediaUrl

        if (autoplay && (!isCanvas || preview)) {
            void v.play().catch(() => {})
        }

        return () => {
            v.removeEventListener("loadeddata", onReady)
            v.removeEventListener("error", onErr)
            v.pause()
            v.removeAttribute("src")
            v.load()
        }
    }, [
        resolvedMediaUrl,
        source,
        loop,
        autoplay,
        isCanvas,
        preview,
    ])

    useEffect(() => {
        if (!offscreenRef.current) {
            offscreenRef.current = document.createElement("canvas")
        }
    }, [])

    const render = useCallback(() => {
        const canvas = canvasRef.current
        const offscreen = offscreenRef.current
        const media = mediaRef.current
        if (!canvas || !offscreen || !media || !mediaReady) return

        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        const offCtx = offscreen.getContext("2d", { willReadFrequently: true })
        if (!ctx || !offCtx) return

        const { w, h } = layoutSize
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const cw = Math.floor(w * dpr)
        const ch = Math.floor(h * dpr)

        if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw
            canvas.height = ch
        }
        if (offscreen.width !== cw || offscreen.height !== ch) {
            offscreen.width = cw
            offscreen.height = ch
        }

        const underlayEl = showImageBelow ? underlayCanvasRef.current : null
        if (underlayEl) {
            if (underlayEl.width !== cw || underlayEl.height !== ch) {
                underlayEl.width = cw
                underlayEl.height = ch
            }
        }
        const uctx =
            showImageBelow && underlayEl
                ? underlayEl.getContext("2d", { willReadFrequently: true })
                : null
        if (uctx) {
            uctx.fillStyle = backdropFill
            uctx.fillRect(0, 0, cw, ch)
        }

        if (showImageBelow) {
            ctx.clearRect(0, 0, cw, ch)
        } else {
            ctx.fillStyle = backdropFill
            ctx.fillRect(0, 0, cw, ch)
        }

        const { width: mw, height: mh } = mediaDisplaySize(media)
        const imgAspect = mw / mh
        const canvasAspect = cw / ch
        let drawW: number, drawH: number, drawX: number, drawY: number
        if (imgAspect > canvasAspect) {
            drawH = ch
            drawW = ch * imgAspect
            drawX = (cw - drawW) / 2
            drawY = 0
        } else {
            drawW = cw
            drawH = cw / imgAspect
            drawX = 0
            drawY = (ch - drawH) / 2
        }

        offCtx.fillStyle = backdropFill
        offCtx.fillRect(0, 0, cw, ch)
        offCtx.drawImage(media, drawX, drawY, drawW, drawH)

        const imageData = offCtx.getImageData(0, 0, cw, ch)
        const pixels = imageData.data

        const time = timeRef.current
        const cell = Math.max(2, Math.round(cellSize * dpr))
        const cols = Math.ceil(cw / cell)
        const rows = Math.ceil(ch / cell)

        const fontPx = Math.max(5, Math.floor(cell * 0.88))
        ctx.font = buildCanvasFontString(font, fontPx)
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        for (let row = 0; row < rows; row++) {
            let glitchShift = 0
            if (
                effectsEnabled &&
                glitchEnabled &&
                glitchIntensity > 0 &&
                glitchFrequency > 0
            ) {
                const glitchTime = Math.floor(time * glitchFrequency)
                const glitchRand = Math.abs(random(glitchTime, row))
                if (glitchRand < glitchIntensity) {
                    glitchShift =
                        (random(glitchTime + 1, row) - 0.5) * 20 * cell
                }
            }

            for (let col = 0; col < cols; col++) {
                const cx = col * cell + cell / 2 + glitchShift
                const cy = row * cell + cell / 2

                let sampleX = cx / cw
                let sampleY = cy / ch

                if (effectsEnabled && curvature > 0) {
                    const centeredX = sampleX * 2 - 1
                    const centeredY = sampleY * 2 - 1
                    const dist = centeredX * centeredX + centeredY * centeredY
                    const factor = 1 + curvature * dist
                    sampleX = (centeredX * factor) / 2 + 0.5
                    sampleY = (centeredY * factor) / 2 + 0.5
                }

                if (
                    effectsEnabled &&
                    waveEnabled &&
                    waveAmplitude > 0
                ) {
                    sampleX +=
                        Math.sin(sampleY * waveFrequency + time * waveSpeed) *
                        waveAmplitude
                    sampleY +=
                        Math.cos(sampleX * waveFrequency + time * waveSpeed) *
                        waveAmplitude
                }

                sampleX = Math.max(0, Math.min(1, sampleX))
                sampleY = Math.max(0, Math.min(1, sampleY))

                const px = Math.max(
                    0,
                    Math.min(cw - 1, Math.floor(sampleX * cw))
                )
                const py = Math.max(
                    0,
                    Math.min(ch - 1, Math.floor(sampleY * ch))
                )

                const shiftPx = Math.max(
                    0,
                    effectsEnabled
                        ? Math.floor(aberrationStrength * cw * 0.8)
                        : 0
                )
                const sG = sampleCellRgb(pixels, cw, ch, px, py, cell)
                let r = sG.r
                let g = sG.g
                let b = sG.b
                if (effectsEnabled && shiftPx > 0) {
                    const sR = sampleCellRgb(
                        pixels,
                        cw,
                        ch,
                        Math.min(cw - 1, px + shiftPx),
                        py,
                        cell
                    )
                    const sB = sampleCellRgb(
                        pixels,
                        cw,
                        ch,
                        Math.max(0, px - shiftPx),
                        py,
                        cell
                    )
                    r = sR.r
                    b = sB.b
                }

                r = (r - 0.5) * contrastAdjust + 0.5 + brightnessAdjust
                g = (g - 0.5) * contrastAdjust + 0.5 + brightnessAdjust
                b = (b - 0.5) * contrastAdjust + 0.5 + brightnessAdjust
                r = Math.max(0, Math.min(1, r))
                g = Math.max(0, Math.min(1, g))
                b = Math.max(0, Math.min(1, b))

                if (
                    effectsEnabled &&
                    noiseEnabled &&
                    noiseIntensity > 0
                ) {
                    const n = noise(
                        sampleX * noiseScale * noiseFrequency +
                            time * noiseSpeed,
                        sampleY * noiseScale * noiseFrequency
                    )
                    const noiseMod = (n - 0.5) * noiseIntensity
                    r = Math.max(0, Math.min(1, r + noiseMod))
                    g = Math.max(0, Math.min(1, g + noiseMod))
                    b = Math.max(0, Math.min(1, b + noiseMod))
                }

                const brightness = 0.299 * r + 0.587 * g + 0.114 * b

                let glyph = glyphFromAsciiPreset(brightness, asciiStyle, time)
                if (asciiStyle === "standard" && brightness >= 0.85) {
                    glyph = STANDARD_BRIGHT_BLOCK
                }

                let fr: number
                let fg: number
                let fb: number
                if (colorMode) {
                    fr = r * 255
                    fg = g * 255
                    fb = b * 255
                } else {
                    fr = fg = fb = brightness * 255
                }

                ;[fr, fg, fb] = applyColorPalette(fr, fg, fb, colorPalette)

                if (
                    effectsEnabled &&
                    scanlineEnabled &&
                    scanlineIntensity > 0
                ) {
                    const scanline =
                        Math.sin((cy / ch) * scanlineCount * Math.PI) * 0.5 +
                        0.5
                    const scanMult = 1 - scanline * scanlineIntensity
                    fr *= scanMult
                    fg *= scanMult
                    fb *= scanMult
                }

                if (
                    effectsEnabled &&
                    vignetteEnabled &&
                    vignetteIntensity > 0
                ) {
                    const vx = (cx / cw) * 2 - 1
                    const vy = (cy / ch) * 2 - 1
                    const vignette = 1 - (vx * vx + vy * vy) / vignetteRadius
                    const vMult =
                        1 - vignetteIntensity + vignetteIntensity * vignette
                    fr *= Math.max(0, vMult)
                    fg *= Math.max(0, vMult)
                    fb *= Math.max(0, vMult)
                }

                if (uctx) {
                    const baseX = col * cell + glitchShift
                    const baseY = row * cell
                    const rw = Math.min(cell + 1, cw - Math.max(0, baseX))
                    const rh = Math.min(cell + 1, ch - Math.max(0, baseY))
                    if (rw > 0 && rh > 0) {
                        uctx.fillStyle = `rgb(${Math.round(fr)},${Math.round(fg)},${Math.round(fb)})`
                        uctx.fillRect(
                            Math.max(0, baseX),
                            Math.max(0, baseY),
                            rw,
                            rh
                        )
                    }
                }

                const tx = col * cell + cell / 2 + glitchShift
                const ty = row * cell + cell / 2
                ctx.fillStyle = `rgb(${Math.round(fr)},${Math.round(fg)},${Math.round(fb)})`
                ctx.fillText(glyph, tx, ty)
            }
        }
    }, [
        layoutSize,
        mediaReady,
        backdropFill,
        cellSize,
        asciiStyle,
        colorMode,
        brightnessAdjust,
        contrastAdjust,
        effectsEnabled,
        scanlineEnabled,
        scanlineIntensity,
        scanlineCount,
        vignetteEnabled,
        vignetteIntensity,
        vignetteRadius,
        curvature,
        aberrationStrength,
        noiseEnabled,
        noiseIntensity,
        noiseScale,
        noiseFrequency,
        noiseSpeed,
        waveEnabled,
        waveAmplitude,
        waveFrequency,
        waveSpeed,
        glitchEnabled,
        glitchIntensity,
        glitchFrequency,
        colorPalette,
        showImageBelow,
        font,
    ])

    useEffect(() => {
        if (!mediaReady) return

        const needsRaf =
            shouldAnimate &&
            (needsEffectTimeRaf ||
                (source === "video" &&
                    (!isCanvas || preview) &&
                    autoplay))

        if (needsRaf) {
            let lastTime = performance.now()
            const loop = (now: number) => {
                const delta = (now - lastTime) / 1000
                lastTime = now
                if (needsEffectTimeRaf) {
                    timeRef.current += delta
                }
                render()
                animationRef.current = requestAnimationFrame(loop)
            }
            animationRef.current = requestAnimationFrame(loop)
            return () => cancelAnimationFrame(animationRef.current)
        } else {
            render()
        }
    }, [
        render,
        shouldAnimate,
        mediaReady,
        needsEffectTimeRaf,
        source,
        autoplay,
        isCanvas,
        preview,
    ])

    if (!hasMedia) {
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
                    title="ASCII"
                    subtitle={
                        source === "video"
                            ? "Add a video to see the effect"
                            : "Add an image to see the effect"
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
                minWidth: 0,
                minHeight: 0,
                backgroundColor: backdropFill,
                overflow: "hidden",
            }}
        >
            {showImageBelow && resolvedMediaUrl ? (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        overflow: "hidden",
                        pointerEvents: "none",
                        opacity: imageBelowOpacity,
                        filter:
                            imageBelowBlur > 0
                                ? `blur(${imageBelowBlur}px)`
                                : undefined,
                        transform:
                            imageBelowBlur > 0
                                ? "scale(1.08)"
                                : undefined,
                    }}
                >
                    <canvas
                        ref={underlayCanvasRef}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            display: "block",
                        }}
                    />
                </div>
            ) : null}
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

addPropertyControls(ASCII, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
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
        title: "Image",
        hidden: (p: Props) => p.source === "video",
    },
    videoSource: {
        type: ControlType.Enum,
        title: "Video",
        options: ["url", "upload"],
        optionTitles: ["URL", "Upload"],
        defaultValue: "url",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
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
        hidden: (p: Props) =>
            p.source !== "video" || p.videoSource !== "url",
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
        defaultValue: "#000000",
    },
    showImageBelow: {
        type: ControlType.Boolean,
        title: "Underlay",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    imageBelowBlur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 8,
        hidden: (p: Props) => !p.showImageBelow,
    },
    imageBelowOpacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.2,
        hidden: (p: Props) => !p.showImageBelow,
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        defaultFontType: "monospace",
        controls: "extended",
        defaultValue: ASCII_DEFAULT_FRAMER_FONT as never,
    },
    shader: {
        type: ControlType.Object,
        title: "Shader",
        defaultValue: DEFAULT_SHADER,
        controls: {
            cellSize: {
                type: ControlType.Number,
                title: "Cell Size",
                min: 3,
                max: 50,
                step: 1,
                defaultValue: 10,
            },
            asciiStyle: {
                type: ControlType.Enum,
                title: "Style",
                options: [
                    "standard",
                    "dense",
                    "minimal",
                    "blocks",
                    "braille",
                    "technical",
                    "matrix",
                    "hatching",
                ],
                optionTitles: [
                    "Standard",
                    "Dense",
                    "Minimal",
                    "Blocks",
                    "Braille",
                    "Technical",
                    "Matrix",
                    "Hatching",
                ],
                defaultValue: "standard",
            },
            colorMode: {
                type: ControlType.Boolean,
                title: "Color",
                defaultValue: true,
                enabledTitle: "Color",
                disabledTitle: "Gray",
            },
            brightnessAdjust: {
                type: ControlType.Number,
                title: "Bright",
                min: -0.5,
                max: 0.5,
                step: 0.01,
                defaultValue: 0,
            },
            contrastAdjust: {
                type: ControlType.Number,
                title: "Contrast",
                min: 0.5,
                max: 2,
                step: 0.05,
                defaultValue: 1,
            },
            colorPalette: {
                type: ControlType.Enum,
                title: "Palette",
                options: ["original", "green", "amber", "cyan", "blue"],
                optionTitles: [
                    "Original",
                    "Green",
                    "Amber",
                    "Cyan",
                    "Blue",
                ],
                defaultValue: "original",
            },
        },
    },
    effects: {
        type: ControlType.Object,
        title: "Effects",
        defaultValue: DEFAULT_EFFECTS,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            effectsEnabled: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            scanlineEnabled: {
                type: ControlType.Boolean,
                title: "Scanlines",
                defaultValue: false,
                enabledTitle: "On",
                disabledTitle: "Off",
                hidden: (p) => hideUnlessEffectsOn(p),
            },
            scanlineIntensity: {
                type: ControlType.Number,
                title: "Depth",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) =>
                            !Boolean(effectControlValue(q, "scanlineEnabled"))
                    ),
            },
            scanlineCount: {
                type: ControlType.Number,
                title: "Lines",
                min: 50,
                max: 130,
                step: 10,
                defaultValue: 100,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) =>
                            !Boolean(effectControlValue(q, "scanlineEnabled"))
                    ),
            },
            vignetteEnabled: {
                type: ControlType.Boolean,
                title: "Vignette",
                defaultValue: false,
                enabledTitle: "On",
                disabledTitle: "Off",
                hidden: (p) => hideUnlessEffectsOn(p),
            },
            vignetteIntensity: {
                type: ControlType.Number,
                title: "Dim",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) =>
                            !Boolean(effectControlValue(q, "vignetteEnabled"))
                    ),
            },
            vignetteRadius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0.3,
                max: 2,
                step: 0.1,
                defaultValue: 0.8,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) =>
                            !Boolean(effectControlValue(q, "vignetteEnabled"))
                    ),
            },
            curvature: {
                type: ControlType.Number,
                title: "Fish Eye",
                min: 0,
                max: 0.5,
                step: 0.01,
                defaultValue: 0,
                hidden: (p) => hideUnlessEffectsOn(p),
            },
            aberrationStrength: {
                type: ControlType.Number,
                title: "Aberration",
                min: 0,
                max: 0.02,
                step: 0.001,
                defaultValue: 0,
                hidden: (p) => hideUnlessEffectsOn(p),
            },
            noiseEnabled: {
                type: ControlType.Boolean,
                title: "Noise",
                defaultValue: false,
                enabledTitle: "On",
                disabledTitle: "Off",
                hidden: (p) => hideUnlessEffectsOn(p),
            },
            noiseIntensity: {
                type: ControlType.Number,
                title: "Level",
                min: 0,
                max: 0.5,
                step: 0.01,
                defaultValue: 0,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "noiseEnabled"))
                    ),
            },
            noiseScale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.5,
                max: 10,
                step: 0.5,
                defaultValue: 1,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "noiseEnabled"))
                    ),
            },
            noiseFrequency: {
                type: ControlType.Number,
                title: "Frequency",
                min: 0.5,
                max: 40,
                step: 0.5,
                defaultValue: 10,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "noiseEnabled"))
                    ),
            },
            noiseSpeed: {
                type: ControlType.Number,
                title: "Speed",
                min: 0.1,
                max: 5,
                step: 0.1,
                defaultValue: 1,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "noiseEnabled"))
                    ),
            },
            waveEnabled: {
                type: ControlType.Boolean,
                title: "Wave",
                defaultValue: false,
                enabledTitle: "On",
                disabledTitle: "Off",
                hidden: (p) => hideUnlessEffectsOn(p),
            },
            waveAmplitude: {
                type: ControlType.Number,
                title: "Amp",
                min: 0,
                max: 0.1,
                step: 0.005,
                defaultValue: 0,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "waveEnabled"))
                    ),
            },
            waveFrequency: {
                type: ControlType.Number,
                title: "Ripple",
                min: 1,
                max: 30,
                step: 1,
                defaultValue: 10,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "waveEnabled"))
                    ),
            },
            waveSpeed: {
                type: ControlType.Number,
                title: "Flow",
                min: 0.1,
                max: 5,
                step: 0.1,
                defaultValue: 1,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "waveEnabled"))
                    ),
            },
            glitchEnabled: {
                type: ControlType.Boolean,
                title: "Glitch",
                defaultValue: false,
                enabledTitle: "On",
                disabledTitle: "Off",
                hidden: (p) => hideUnlessEffectsOn(p),
            },
            glitchIntensity: {
                type: ControlType.Number,
                title: "Jitter",
                min: 0,
                max: 0.5,
                step: 0.01,
                defaultValue: 0,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "glitchEnabled"))
                    ),
            },
            glitchFrequency: {
                type: ControlType.Number,
                title: "Rate",
                min: 1,
                max: 30,
                step: 1,
                defaultValue: 10,
                hidden: (p) =>
                    hideUnlessEffectsOn(
                        p,
                        (q) => !Boolean(effectControlValue(q, "glitchEnabled"))
                    ),
            },
        },
    },
})

ASCII.displayName = "ASCII"
