import * as React from "react"
import { useEffect, useRef, useCallback, useMemo, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// ============================================================================
// TYPES
// ============================================================================

type SourceType = "image" | "video"
type DitheringMode = "none" | "bayer" | "floyd-steinberg"

interface Props {
    sourceType: SourceType
    image: any
    videoSource: "url" | "upload"
    videoFile: string
    videoUrl: string
    poster: any
    autoplay: boolean
    loop: boolean
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    characterSet: string
    density: number
    invertBrightness: boolean
    threshold: number
    intensity: number
    font: {
        fontFamily?: string
        fontWeight?: string | number
        fontStyle?: string
        fontSize?: number | string
        lineHeight?: number | string
        letterSpacing?: string
    }
    ditheringMode: DitheringMode
    brightness: number
    contrast: number
    blurAmount: number
    style?: React.CSSProperties
}

// ============================================================================
// COLOR UTILITIES
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

function toRgb(input: string): [number, number, number] {
    const s = resolveColor(input)
    const rgba = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
    if (rgba) {
        return [
            Math.round(+rgba[1]),
            Math.round(+rgba[2]),
            Math.round(+rgba[3]),
        ]
    }
    let hex = s.replace(/^#/, "")
    if (hex.length === 3)
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    if (hex.length === 8) hex = hex.slice(0, 6)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b]
}

// ============================================================================
// FONT PARSING
// ============================================================================

function parseFontSize(fontSize: any): number {
    if (typeof fontSize === "number") return fontSize
    if (typeof fontSize === "string") {
        const parsed = parseFloat(fontSize)
        return isNaN(parsed) ? 10 : parsed
    }
    return 10
}

function parseLetterSpacing(letterSpacing: any, fontSizePx: number): number {
    if (letterSpacing === undefined || letterSpacing === null) return 0
    if (typeof letterSpacing === "number") return letterSpacing
    const s = String(letterSpacing).trim()
    if (!s) return 0
    if (s.endsWith("em")) return (parseFloat(s) || 0) * fontSizePx
    if (s.endsWith("px")) return parseFloat(s) || 0
    return parseFloat(s) || 0
}

function parseLineHeight(lineHeight: any, fontSizePx: number): number {
    if (lineHeight === undefined || lineHeight === null) return 1.0
    if (typeof lineHeight === "number")
        return lineHeight > 4 ? lineHeight / fontSizePx : lineHeight
    if (typeof lineHeight === "string") {
        if (lineHeight.endsWith("%")) return parseFloat(lineHeight) / 100
        if (lineHeight.endsWith("em")) return parseFloat(lineHeight) || 1.0
        if (lineHeight.endsWith("px"))
            return (parseFloat(lineHeight) || fontSizePx) / fontSizePx
        const v = parseFloat(lineHeight)
        return isNaN(v) ? 1.0 : v > 4 ? v / fontSizePx : v
    }
    return 1.0
}

// ============================================================================
// IMAGE SOURCE RESOLUTION
// ============================================================================

function resolveImageSource(input: any): string | null {
    if (!input) return null
    if (typeof input === "string") return input.trim() || null
    return input?.src ?? input?.url ?? null
}

// ============================================================================
// BAYER 4×4
// ============================================================================

const B4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 */
export default function AsciiMedia(props: Props) {
    const {
        sourceType = "image",
        image,
        videoSource = "url",
        videoFile,
        videoUrl,
        poster,
        autoplay = true,
        loop = true,
        primaryColor = "#5B52E0",
        secondaryColor = "#9D96F0",
        backgroundColor = "#FFFFFF",
        characterSet = "0123456789",
        density = 5,
        invertBrightness = true,
        threshold = 5,
        intensity = 1.8,
        font = {
            fontFamily: "monospace",
            fontWeight: "400",
            fontSize: 6,
        },
        ditheringMode = "bayer",
        brightness = 0,
        contrast = 0,
        blurAmount = 0,
        style,
    } = props

    // ── Resolve font ──
    const fontSizePx = parseFontSize(font?.fontSize)
    const fontFamilyStr = font?.fontFamily || "monospace"
    const fontWeightStr =
        font?.fontWeight != null ? String(font.fontWeight) : "400"
    const fontStyleStr = font?.fontStyle || "normal"
    const letterSpacingPx = parseLetterSpacing(font?.letterSpacing, fontSizePx)
    const lineHeightMul = parseLineHeight(font?.lineHeight, fontSizePx)

    // ── Resolve media URL ──
    const resolvedSourceUrl = useMemo(() => {
        if (sourceType === "image") return resolveImageSource(image)
        if (sourceType === "video")
            return videoSource === "upload" ? videoFile : videoUrl
        return null
    }, [sourceType, image, videoSource, videoFile, videoUrl])

    const hasSource = !!resolvedSourceUrl

    // ── Resolve poster URL ──
    const resolvedPosterUrl = useMemo(
        () => (sourceType === "video" ? resolveImageSource(poster) : null),
        [sourceType, poster]
    )

    const containerRef = useRef<HTMLDivElement>(null)
    const hiddenCvs = useRef<HTMLCanvasElement | null>(null)
    const visibleRef = useRef<HTMLCanvasElement>(null)
    const raf = useRef(0)
    const media = useRef<
        HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null
    >(null)
    const posterImg = useRef<HTMLImageElement | null>(null)
    const fpsTrack = useRef({ n: 0, t: performance.now(), fps: 60 })
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [ready, setReady] = useState(false)
    const [posterReady, setPosterReady] = useState(false)

    const pRgb = useMemo(() => toRgb(primaryColor), [primaryColor])
    const sRgb = useMemo(() => toRgb(secondaryColor), [secondaryColor])
    const bgResolved = useMemo(
        () => resolveColor(backgroundColor),
        [backgroundColor]
    )

    // Normalized threshold (0–1)
    const thresholdNorm = threshold / 100

    // Stable DPR — locked on mount to prevent alt-tab canvas jumps
    const dprRef = useRef(Math.min(2, devicePixelRatio || 1))
    // Last known valid canvas dimensions to prevent transient resize glitches
    const lastSizeRef = useRef({ w: 0, h: 0 })

    // ====================================================================
    // RENDER PIPELINE
    // ====================================================================

    const paint = useCallback(() => {
        // Skip paint when tab is hidden (prevents alt-tab artifacts)
        if (typeof document !== "undefined" && document.hidden) return

        const box = containerRef.current
        const out = visibleRef.current
        if (!box || !out) return
        if (!hiddenCvs.current)
            hiddenCvs.current = document.createElement("canvas")
        const hid = hiddenCvs.current

        const W = box.clientWidth
        const H = box.clientHeight
        if (W <= 0 || H <= 0) return

        // Update last valid size — ignore transient zero-size states
        lastSizeRef.current = { w: W, h: H }

        const dpr = dprRef.current

        // Adaptive density
        let d = density
        if (fpsTrack.current.fps < 24 && d < 14) d = Math.min(14, d + 2)

        const cellW = d + letterSpacingPx
        const cellH = Math.round(fontSizePx * lineHeightMul)
        const cols = Math.floor(W / cellW)
        const rows = Math.floor(H / cellH)
        if (cols <= 0 || rows <= 0) return

        // ── FIXED-RATIO SUPERSAMPLING ──
        // Sample at a fixed multiple of the grid (4× per axis = 16 pixels
        // per cell). This makes the luminance averaging identical regardless
        // of container size — the source image always occupies the same
        // proportion of each cell, so intensity stays consistent.
        const SS = 4
        const ssCols = cols * SS
        const ssRows = rows * SS

        hid.width = ssCols
        hid.height = ssRows
        const hCtx = hid.getContext("2d", { willReadFrequently: true })
        if (!hCtx) return

        // High-quality resampling for source image
        hCtx.imageSmoothingEnabled = true
        hCtx.imageSmoothingQuality = "high"

        // Pre-blur (optional — 0 by default for maximum sharpness)
        hCtx.filter = blurAmount > 0 ? `blur(${blurAmount}px)` : "none"

        // ── Resolve source (with poster fallback) ──
        let src:
            | HTMLImageElement
            | HTMLVideoElement
            | HTMLCanvasElement
            | null = media.current

        if (src instanceof HTMLVideoElement && src.readyState < 2) {
            if (
                posterImg.current?.complete &&
                posterImg.current.naturalWidth > 0
            ) {
                src = posterImg.current
            } else {
                return
            }
        }
        if (!src) {
            if (
                posterImg.current?.complete &&
                posterImg.current.naturalWidth > 0
            ) {
                src = posterImg.current
            } else {
                return
            }
        }

        let srcW = 0,
            srcH = 0
        if (src instanceof HTMLVideoElement) {
            srcW = src.videoWidth
            srcH = src.videoHeight
        } else if (src instanceof HTMLCanvasElement) {
            srcW = src.width
            srcH = src.height
        } else {
            if (!src.complete || src.naturalWidth === 0) return
            srcW = src.naturalWidth
            srcH = src.naturalHeight
        }
        if (srcW <= 0 || srcH <= 0) return

        // Cover fit onto supersampled canvas
        const sA = srcW / srcH
        const dA = ssCols / ssRows
        let dw: number, dh: number, dx: number, dy: number
        if (sA > dA) {
            dh = ssRows
            dw = ssRows * sA
            dx = (ssCols - dw) / 2
            dy = 0
        } else {
            dw = ssCols
            dh = ssCols / sA
            dx = 0
            dy = (ssRows - dh) / 2
        }

        hCtx.clearRect(0, 0, ssCols, ssRows)
        hCtx.drawImage(src, dx, dy, dw, dh)
        hCtx.filter = "none"

        const imgData = hCtx.getImageData(0, 0, ssCols, ssRows)
        const px = imgData.data

        // ── Brightness / Contrast adjustment ──
        if (brightness !== 0 || contrast !== 0) {
            const cf =
                (259 * (contrast * 2.55 + 255)) /
                (255 * (259 - contrast * 2.55))
            for (let i = 0; i < px.length; i += 4) {
                let r = px[i] + brightness * 2.55
                let g = px[i + 1] + brightness * 2.55
                let b = px[i + 2] + brightness * 2.55
                r = cf * (r - 128) + 128
                g = cf * (g - 128) + 128
                b = cf * (b - 128) + 128
                px[i] = Math.max(0, Math.min(255, r))
                px[i + 1] = Math.max(0, Math.min(255, g))
                px[i + 2] = Math.max(0, Math.min(255, b))
            }
        }

        // ── Downsample: average each SS×SS block into one cell ──
        const cellLum = new Float32Array(cols * rows)
        const cellAlpha = new Float32Array(cols * rows)
        const ssBlockSize = SS * SS

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let lumSum = 0
                let alphaSum = 0
                for (let sy = 0; sy < SS; sy++) {
                    const py = r * SS + sy
                    const rowOff = py * ssCols
                    for (let sx = 0; sx < SS; sx++) {
                        const px_x = c * SS + sx
                        const i = (rowOff + px_x) * 4
                        const a = px[i + 3] / 255
                        const lum =
                            (0.299 * px[i] +
                                0.587 * px[i + 1] +
                                0.114 * px[i + 2]) /
                            255
                        lumSum += lum * a
                        alphaSum += a
                    }
                }
                const ci = r * cols + c
                cellLum[ci] = lumSum / ssBlockSize
                cellAlpha[ci] = alphaSum / ssBlockSize
            }
        }

        // ── Floyd-Steinberg error buffer ──
        let errBuf: Float32Array | null = null
        if (ditheringMode === "floyd-steinberg") {
            errBuf = new Float32Array(cols * rows)
        }

        // ── Size output canvas (stable — won't resize on alt-tab) ──
        const cW = Math.round(W * dpr)
        const cH = Math.round(H * dpr)
        // Only resize if dimensions actually changed (prevents clear-on-refocus)
        if (out.width !== cW || out.height !== cH) {
            out.width = cW
            out.height = cH
        }

        const ctx = out.getContext("2d")
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // Background
        ctx.globalAlpha = 1
        ctx.fillStyle = bgResolved
        ctx.fillRect(0, 0, W, H)

        // Font
        ctx.textBaseline = "top"
        ctx.textAlign = "center"
        ctx.font = `${fontStyleStr} ${fontWeightStr} ${fontSizePx}px ${fontFamilyStr}`

        const chars = characterSet || "0123456789"
        const cLen = chars.length
        const [pR, pG, pB] = pRgb
        const [sR2, sG2, sB2] = sRgb

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ci = r * cols + c
                const rawLum = cellLum[ci]
                const alpha = cellAlpha[ci]

                // Skip fully transparent cells
                if (alpha < 0.01) continue

                let lum = rawLum
                if (invertBrightness) lum = 1 - lum

                // ── THRESHOLD GATE ──
                // Only render characters above the threshold.
                // This is what creates clean silhouettes — background
                // pixels (near 0 after inversion) are skipped entirely.
                if (lum < thresholdNorm) continue

                // ── Dithering ──
                let dl = lum
                if (ditheringMode === "bayer") {
                    const th = (B4[r % 4][c % 4] + 0.5) / 16
                    dl = Math.max(0, Math.min(1, lum + (th - 0.5) * 0.08))
                } else if (ditheringMode === "floyd-steinberg" && errBuf) {
                    const ei = ci
                    dl = Math.max(0, Math.min(1, lum + errBuf[ei]))
                    const q = Math.round(dl * (cLen - 1)) / (cLen - 1)
                    const err = (dl - q) * 0.35
                    if (c + 1 < cols) errBuf[ei + 1] += err * 0.4375
                    if (r + 1 < rows) {
                        if (c > 0)
                            errBuf[(r + 1) * cols + c - 1] += err * 0.1875
                        errBuf[(r + 1) * cols + c] += err * 0.3125
                        if (c + 1 < cols)
                            errBuf[(r + 1) * cols + c + 1] += err * 0.0625
                    }
                    dl = q
                }

                if (dl < thresholdNorm) continue

                // ── Character selection ──
                const charIdx = Math.min(
                    cLen - 1,
                    Math.max(0, Math.floor(dl * cLen))
                )

                // ── Color: blend primary ↔ secondary by luminance ──
                let cr: number, cg: number, cb: number
                if (dl > 0.6) {
                    cr = pR
                    cg = pG
                    cb = pB
                } else if (dl > 0.2) {
                    const t = (dl - 0.2) / 0.4
                    cr = Math.round(sR2 + (pR - sR2) * t)
                    cg = Math.round(sG2 + (pG - sG2) * t)
                    cb = Math.round(sB2 + (pB - sB2) * t)
                } else {
                    cr = sR2
                    cg = sG2
                    cb = sB2
                }

                // ── Opacity: power curve for intensity control ──
                // intensity > 1 boosts mid-tones (makes faint areas more visible)
                // intensity = 1 is linear, intensity = 2 is strong boost
                const curve = intensity > 0 ? 1 / intensity : 1
                let al = Math.pow(dl, curve) * alpha

                ctx.globalAlpha = Math.max(0, Math.min(1, al))
                ctx.fillStyle = `rgb(${cr},${cg},${cb})`
                ctx.fillText(
                    chars[charIdx],
                    c * cellW + cellW / 2,
                    r * cellH + (cellH - fontSizePx) / 2
                )
            }
        }

        ctx.globalAlpha = 1

        // FPS tracking
        fpsTrack.current.n++
        const now = performance.now()
        if (now - fpsTrack.current.t >= 1000) {
            fpsTrack.current.fps = fpsTrack.current.n
            fpsTrack.current.n = 0
            fpsTrack.current.t = now
        }
    }, [
        density,
        letterSpacingPx,
        fontSizePx,
        lineHeightMul,
        fontFamilyStr,
        fontWeightStr,
        fontStyleStr,
        characterSet,
        invertBrightness,
        thresholdNorm,
        intensity,
        ditheringMode,
        brightness,
        contrast,
        blurAmount,
        pRgb,
        sRgb,
        bgResolved,
    ])

    // ====================================================================
    // POSTER LOADING
    // ====================================================================

    useEffect(() => {
        if (!resolvedPosterUrl) {
            posterImg.current = null
            setPosterReady(false)
            return
        }
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            posterImg.current = img
            setPosterReady(true)
        }
        img.onerror = () => {
            posterImg.current = null
            setPosterReady(false)
        }
        img.src = resolvedPosterUrl
        return () => {
            posterImg.current = null
            setPosterReady(false)
        }
    }, [resolvedPosterUrl])

    // ====================================================================
    // MEDIA LOADING
    // ====================================================================

    useEffect(() => {
        if (!resolvedSourceUrl) return

        const cleanup = () => {
            if (raf.current) cancelAnimationFrame(raf.current)
            raf.current = 0
            const m = media.current
            if (m && m instanceof HTMLVideoElement) {
                m.pause()
                m.removeAttribute("src")
                m.load()
            }
            media.current = null
            setReady(false)
        }

        cleanup()

        if (sourceType === "image") {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                media.current = img
                setReady(true)
            }
            img.onerror = () => {}
            img.src = resolvedSourceUrl
        } else if (sourceType === "video") {
            const vid = document.createElement("video")
            vid.crossOrigin = "anonymous"
            vid.muted = true
            vid.playsInline = true
            vid.loop = loop
            vid.preload = "auto"
            vid.src = resolvedSourceUrl
            media.current = vid

            const onReady = () => {
                setReady(true)
                // Only autoplay in preview mode; in editor show first frame
                if (autoplay && !isCanvas) vid.play().catch(() => {})
            }
            vid.addEventListener("canplay", onReady, { once: true })
            vid.load()
        }

        return cleanup
    }, [resolvedSourceUrl, sourceType, autoplay, loop, isCanvas])

    // ====================================================================
    // ANIMATION LOOP / STATIC PAINT
    // ====================================================================

    useEffect(() => {
        if (!ready && !posterReady) return

        // Defer first paint by one frame so the container layout has settled.
        // This prevents the "tight then expands" size jump.
        const initialFrame = requestAnimationFrame(() => {
            paint()

            // For video in preview mode: continuous animation loop
            if (sourceType === "video" && ready && !isCanvas) {
                const tick = () => {
                    paint()
                    raf.current = requestAnimationFrame(tick)
                }
                raf.current = requestAnimationFrame(tick)
            }
        })

        return () => {
            cancelAnimationFrame(initialFrame)
            if (raf.current) cancelAnimationFrame(raf.current)
            raf.current = 0
        }
    }, [ready, posterReady, sourceType, paint, isCanvas])

    // Repaint on prop changes (all static views: image, video in editor, poster)
    useEffect(() => {
        if (sourceType === "image" && !ready) return
        if (sourceType === "video" && !ready && !posterReady) return
        // Skip if video is running its own animation loop in preview
        if (sourceType === "video" && ready && !isCanvas) return
        requestAnimationFrame(() => paint())
    }, [
        ready,
        posterReady,
        isCanvas,
        sourceType,
        paint,
        density,
        fontSizePx,
        fontFamilyStr,
        fontWeightStr,
        fontStyleStr,
        letterSpacingPx,
        lineHeightMul,
        characterSet,
        invertBrightness,
        threshold,
        intensity,
        ditheringMode,
        brightness,
        contrast,
        blurAmount,
        primaryColor,
        secondaryColor,
        backgroundColor,
    ])

    // Resize observer — validates dimensions to prevent alt-tab artifacts
    useEffect(() => {
        if (!ready && !posterReady) return
        const el = containerRef.current
        if (!el) return

        const ro = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (!entry) return
            const { width, height } = entry.contentRect
            // Skip zero-size transients (alt-tab, minimize, etc.)
            if (width <= 0 || height <= 0) return
            // Only repaint if size actually changed by at least 1px
            const last = lastSizeRef.current
            if (Math.abs(width - last.w) < 1 && Math.abs(height - last.h) < 1)
                return
            // Repaint all static views (video animation loop handles its own)
            if (sourceType === "video" && ready && !isCanvas) return
            requestAnimationFrame(() => paint())
        })
        ro.observe(el)

        // Re-paint when tab becomes visible again (alt-tab back)
        const onVisibility = () => {
            if (!document.hidden) {
                requestAnimationFrame(() => paint())
            }
        }
        document.addEventListener("visibilitychange", onVisibility)

        return () => {
            ro.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [ready, posterReady, sourceType, paint, isCanvas])

    // ====================================================================
    // JSX
    // ====================================================================

    if (!hasSource) {
        return (
            <div
                ref={containerRef}
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: bgResolved,
                    color: resolveColor(primaryColor),
                    fontFamily: "monospace",
                    fontSize: "13px",
                    letterSpacing: "0.04em",
                    opacity: 0.4,
                }}
            >
                {sourceType === "image"
                    ? "[ ASCII MEDIA — ADD IMAGE ]"
                    : "[ ASCII MEDIA — ADD VIDEO ]"}
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
                overflow: "hidden",
                backgroundColor: bgResolved,
            }}
        >
            <canvas
                ref={visibleRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}

AsciiMedia.displayName = "ASCII Media"

// ============================================================================
// FRAMER PROPERTY CONTROLS
// ============================================================================

addPropertyControls(AsciiMedia, {
    // ─── Media ─────────────────────────────────────────────────────────
    sourceType: {
        type: ControlType.Enum,
        title: "Source Type",
        options: ["image", "video"],
        optionTitles: ["Image", "Video"],
        defaultValue: "image",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        hidden: (props: any) => props.sourceType !== "image",
    },
    videoSource: {
        type: ControlType.Enum,
        title: "Source",
        options: ["url", "upload"],
        optionTitles: ["URL", "Upload"],
        defaultValue: "url",
        displaySegmentedControl: true,
        hidden: (props: any) => props.sourceType !== "video",
    },
    videoFile: {
        type: ControlType.File,
        title: "File",
        allowedFileTypes: ["mp4", "webm"],
        hidden: (props: any) =>
            props.sourceType !== "video" || props.videoSource !== "upload",
    },
    videoUrl: {
        type: ControlType.String,
        title: "URL",
        placeholder: "https://…/video.mp4",
        hidden: (props: any) =>
            props.sourceType !== "video" || props.videoSource !== "url",
    },
    poster: {
        type: ControlType.ResponsiveImage,
        title: "Poster",
        hidden: (props: any) => props.sourceType !== "video",
    },
    autoplay: {
        type: ControlType.Boolean,
        title: "Autoplay",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props: any) => props.sourceType !== "video",
    },
    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props: any) => props.sourceType !== "video",
    },

    // ─── Colors ────────────────────────────────────────────────────────
    primaryColor: {
        type: ControlType.Color,
        title: "Primary",
        defaultValue: "#5B52E0",
    },
    secondaryColor: {
        type: ControlType.Color,
        title: "Secondary",
        defaultValue: "#9D96F0",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#FFFFFF",
    },

    // ─── ASCII ─────────────────────────────────────────────────────────
    characterSet: {
        type: ControlType.String,
        title: "Characters",
        defaultValue: "0123456789",
        placeholder: "0123456789",
    },
    density: {
        type: ControlType.Number,
        title: "Density",
        min: 3,
        max: 24,
        step: 1,
        defaultValue: 5,
        unit: "px",
    },
    invertBrightness: {
        type: ControlType.Boolean,
        title: "Invert",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    threshold: {
        type: ControlType.Number,
        title: "Threshold",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 5,
        unit: "%",
        description:
            "Minimum intensity to render a character. Higher = cleaner silhouettes.",
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0.5,
        max: 3,
        step: 0.1,
        defaultValue: 1.8,
        description:
            "Boosts mid-tone visibility. Higher = denser, more saturated characters.",
    },

    // ─── Typography ────────────────────────────────────────────────────
    font: {
        // @ts-ignore
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: 6,
            // @ts-ignore
            fontFamily: "monospace",
            fontWeight: "400",
        },
    },

    // ─── Effects ───────────────────────────────────────────────────────
    ditheringMode: {
        type: ControlType.Enum,
        title: "Dithering",
        options: ["none", "bayer", "floyd-steinberg"],
        optionTitles: ["None", "Bayer 4×4", "Floyd-Steinberg"],
        defaultValue: "bayer",
    },
    brightness: {
        type: ControlType.Number,
        title: "Brightness",
        min: -50,
        max: 50,
        step: 1,
        defaultValue: 0,
    },
    contrast: {
        type: ControlType.Number,
        title: "Contrast",
        min: -50,
        max: 50,
        step: 1,
        defaultValue: 0,
    },
    blurAmount: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 8,
        step: 0.1,
        defaultValue: 0,
        unit: "px",
    },
})
