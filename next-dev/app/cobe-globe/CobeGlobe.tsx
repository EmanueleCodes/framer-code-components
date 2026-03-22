import React, {
    useRef,
    useEffect,
    useCallback,
    useState,
    useMemo,
    type CSSProperties,
} from "react"
import { useSpring } from "@react-spring/web"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// @ts-ignore ESM bundle from jsDelivr
import createGlobe from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/cobe.js"

type Marker = { location: [number, number]; size: number; id?: string }
type Arc = { from: [number, number]; to: [number, number] }

type MarkerPoint = { id: string; lat: number; lng: number }
type ArcPoint = { fromId: string; toId: string }

type GlobeApi = {
    update: (state: Record<string, unknown>) => void
    destroy: () => void
}

const DEFAULT_MARKERS: MarkerPoint[] = [
    { id: "sf", lat: 37.78, lng: -122.44 },
    { id: "nyc", lat: 40.71, lng: -74.01 },
    { id: "tokyo", lat: 35.68, lng: 139.65 },
    { id: "london", lat: 51.51, lng: -0.13 },
    { id: "sydney", lat: -33.87, lng: 151.21 },
]

const DEFAULT_ARCS: ArcPoint[] = [
    { fromId: "sf", toId: "tokyo" },
    { fromId: "nyc", toId: "london" },
]

function clampTilt(value: number): number {
    return Math.max(-1.2, Math.min(1.2, value))
}

function colorToRgb01(input: string): [number, number, number] {
    const c = (input || "").trim().toLowerCase()
    if (!c) return [1, 1, 1]

    if (c.startsWith("#")) {
        const h = c.slice(1)
        const expanded =
            h.length === 3
                ? h
                      .split("")
                      .map((ch) => ch + ch)
                      .join("")
                : h.length >= 6
                  ? h.slice(0, 6)
                  : h.padEnd(6, "0").slice(0, 6)

        const r = parseInt(expanded.slice(0, 2), 16)
        const g = parseInt(expanded.slice(2, 4), 16)
        const b = parseInt(expanded.slice(4, 6), 16)
        return [
            Number.isFinite(r) ? r / 255 : 1,
            Number.isFinite(g) ? g / 255 : 1,
            Number.isFinite(b) ? b / 255 : 1,
        ]
    }

    const rgbMatch = c.match(
        /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/
    )
    if (rgbMatch) {
        const r = parseFloat(rgbMatch[1])
        const g = parseFloat(rgbMatch[2])
        const b = parseFloat(rgbMatch[3])
        if ([r, g, b].every(Number.isFinite)) {
            const max = Math.max(r, g, b)
            if (max <= 1.0) return [r, g, b]
            return [r / 255, g / 255, b / 255]
        }
    }

    return [1, 1, 1]
}

function normalizeMarkers(points: MarkerPoint[], dotSize: number): Marker[] {
    return (points || [])
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => ({
            id: String(p.id || "").trim() || undefined,
            location: [p.lat, p.lng] as [number, number],
            size: dotSize,
        }))
}

function arcsFromIds(points: ArcPoint[], markers: Marker[]): Arc[] {
    if (!points?.length || !markers?.length) return []
    const byId = new Map<string, [number, number]>()
    for (const marker of markers) {
        const id = String(marker.id || "").trim()
        if (!id) continue
        byId.set(id, marker.location)
    }

    return points
        .map((arc) => {
            const from = byId.get(String(arc.fromId || "").trim())
            const to = byId.get(String(arc.toId || "").trim())
            if (!from || !to) return null
            return { from, to }
        })
        .filter((arc): arc is Arc => arc !== null)
}

export interface CobeGlobeProps {
    preview: boolean
    motion: {
        phi: number
        tilt: number
        spin: boolean
        speed: number
        draggable: boolean
    }
    globe: {
        theme: "light" | "dark"
        dark: number
        diffuse: number
        samples: number
        land: number
        ocean: number
        scale: number
        opacity: number
        offsetX: number
        offsetY: number
        sharp: number
    }
    dots: {
        size: number
        elevation: number
        markers: MarkerPoint[]
    }
    arcs: {
        show: boolean
        width: number
        height: number
        links: ArcPoint[]
    }
    colors: {
        base: string
        marker: string
        glow: string
        arc: string
    }
    /** Layer behind the WebGL canvas; leave unset for transparent */
    background?: string
    style?: CSSProperties
    debug: boolean
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function CobeGlobe({
    preview = false,
    motion = {
        phi: 0,
        tilt: 0.2,
        spin: true,
        speed: 0.5,
        draggable: false,
    },
    globe = {
        theme: "light",
        dark: 0,
        diffuse: 1.2,
        samples: 16000,
        land: 6,
        ocean: 0,
        scale: 1,
        opacity: 1,
        offsetX: 0,
        offsetY: 0,
        sharp: 2,
    },
    dots = {
        size: 0.04,
        elevation: 0.06,
        markers: DEFAULT_MARKERS,
    },
    arcs = {
        show: true,
        width: 0.4,
        height: 0.25,
        links: DEFAULT_ARCS,
    },
    colors = {
        base: "#ffffff",
        marker: "#3366ff",
        glow: "#ffffff",
        arc: "#4d7cff",
    },
    background,
    style,
}: CobeGlobeProps) {
    const phiProp = motion.phi ?? 0
    const tilt = motion.tilt ?? 0.2
    const spin = motion.spin ?? true
    const speed = motion.speed ?? 0.5
    const draggable = motion.draggable ?? false

    const theme = globe.theme ?? "light"
    const darkSlider = globe.dark ?? 0
    const diffuse = globe.diffuse ?? 1.2
    const samples = globe.samples ?? 16000
    const land = globe.land ?? 6
    const ocean = globe.ocean ?? 0
    const scale = globe.scale ?? 1
    const opacity = globe.opacity ?? 1
    const offsetX = globe.offsetX ?? 0
    const offsetY = globe.offsetY ?? 0
    const sharp = globe.sharp ?? 2

    const dotSize = dots.size ?? 0.04
    const markerElevation = dots.elevation ?? 0.06
    const markers = dots.markers ?? DEFAULT_MARKERS

    const arcsOn = arcs.show ?? true
    const arcWidth = arcs.width ?? 0.4
    const arcHeight = arcs.height ?? 0.25
    const arcLinks = arcs.links ?? DEFAULT_ARCS

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const globeRef = useRef<GlobeApi | null>(null)
    const pointerRef = useRef<{ x: number; y: number } | null>(null)
    const baseRotationRef = useRef(phiProp)
    const baseTiltRef = useRef(tilt)
    const rafRef = useRef<number>(0)
    const sizeRef = useRef({ w: 600, h: 600 })
    const spinRef = useRef(spin)
    const [{ r, t }, api] = useSpring(() => ({ r: 0, t: 0 }))

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const [isInView, setIsInView] = useState(true)
    const [webglError, setWebglError] = useState(false)
    const [globeReady, setGlobeReady] = useState(false)

    const runAnimation = globeReady && (!isCanvas || isInView)
    const dark = theme === "dark" ? 1 : Math.max(0, Math.min(1, darkSlider))
    const dpr = Math.max(1, Math.min(3, sharp))

    const markerData = useMemo(
        () => normalizeMarkers(markers, dotSize),
        [markers, dotSize]
    )
    const arcData = useMemo(
        () => arcsFromIds(arcLinks, markerData),
        [arcLinks, markerData]
    )
    const showArcs = arcsOn && arcData.length > 0

    const baseRgb = colorToRgb01(colors?.base ?? "#ffffff")
    const markerRgb = colorToRgb01(colors?.marker ?? "#3366ff")
    const glowRgb = colorToRgb01(colors?.glow ?? "#ffffff")
    const arcRgb = colorToRgb01(colors?.arc ?? "#4d7cff")

    const stopRaf = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = 0
        }
    }, [])

    useEffect(() => {
        spinRef.current = spin
    }, [spin])

    useEffect(() => {
        const el = wrapRef.current
        if (!el || typeof IntersectionObserver === "undefined") return
        const io = new IntersectionObserver(([e]) => setIsInView(e.isIntersecting), {
            threshold: 0,
        })
        io.observe(el)
        return () => io.disconnect()
    }, [])

    const globeOptions = useMemo(
        () => ({
            dark,
            diffuse,
            mapSamples: samples,
            mapBrightness: land,
            mapBaseBrightness: ocean,
            baseColor: baseRgb,
            markerColor: markerRgb,
            glowColor: glowRgb,
            arcColor: arcRgb,
            arcWidth,
            arcHeight,
            markers: markerData,
            arcs: showArcs ? arcData : [],
            markerElevation,
            scale,
            opacity: Math.max(0, Math.min(1, opacity)),
            offset: [offsetX, offsetY] as [number, number],
        }),
        [
            dark,
            diffuse,
            samples,
            land,
            ocean,
            baseRgb,
            markerRgb,
            glowRgb,
            arcRgb,
            arcWidth,
            arcHeight,
            markerData,
            arcData,
            showArcs,
            markerElevation,
            scale,
            opacity,
            offsetX,
            offsetY,
        ]
    )

    useEffect(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return

        const init = () => {
            const w = Math.max(1, Math.floor(wrap.clientWidth))
            const h = Math.max(1, Math.floor(wrap.clientHeight))
            sizeRef.current = { w, h }

            globeRef.current?.destroy()
            globeRef.current = null

            const g = createGlobe(canvas, {
                devicePixelRatio: dpr,
                width: w,
                height: h,
                phi: baseRotationRef.current + r.get(),
                theta: clampTilt(baseTiltRef.current + t.get()),
                ...globeOptions,
            }) as GlobeApi

            if (!g || typeof g.update !== "function") {
                setWebglError(true)
                return
            }
            setWebglError(false)
            globeRef.current = g
            setGlobeReady(true)
            g.update({
                phi: baseRotationRef.current + r.get(),
                theta: clampTilt(baseTiltRef.current + t.get()),
            })
        }

        init()

        const ro = new ResizeObserver(() => {
            const gw = globeRef.current
            if (!gw || !wrap) return
            const nw = Math.max(1, Math.floor(wrap.clientWidth))
            const nh = Math.max(1, Math.floor(wrap.clientHeight))
            sizeRef.current = { w: nw, h: nh }
            gw.update({ width: nw, height: nh })
        })
        ro.observe(wrap)

        return () => {
            ro.disconnect()
            stopRaf()
            globeRef.current?.destroy()
            globeRef.current = null
            setGlobeReady(false)
        }
    }, [dpr, globeOptions, r, stopRaf, t])

    useEffect(() => {
        const g = globeRef.current
        if (!g) return
        g.update(globeOptions)
    }, [globeOptions])

    useEffect(() => {
        const g = globeRef.current
        if (!g) return
        const { w, h } = sizeRef.current
        g.update({ devicePixelRatio: dpr, width: w, height: h })
    }, [dpr])

    useEffect(() => {
        if (!draggable) return
        const canvas = canvasRef.current
        if (!canvas) return

        const onPointerDown = (e: PointerEvent) => {
            baseRotationRef.current += r.get()
            baseTiltRef.current = clampTilt(baseTiltRef.current + t.get())
            api.start({ r: 0, t: 0, immediate: true })
            pointerRef.current = { x: e.clientX, y: e.clientY }
            canvas.setPointerCapture(e.pointerId)
        }

        const onPointerMove = (e: PointerEvent) => {
            if (pointerRef.current === null) return
            const deltaX = e.clientX - pointerRef.current.x
            const deltaY = e.clientY - pointerRef.current.y
            api.start({
                r: deltaX / 200,
                t: deltaY / 260,
                immediate: true,
            })
        }

        const onPointerUp = (e: PointerEvent) => {
            baseRotationRef.current += r.get()
            baseTiltRef.current = clampTilt(baseTiltRef.current + t.get())
            api.start({ r: 0, t: 0, immediate: true })
            pointerRef.current = null
            if (canvas.hasPointerCapture(e.pointerId)) {
                canvas.releasePointerCapture(e.pointerId)
            }
        }

        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerup", onPointerUp)
        canvas.addEventListener("pointercancel", onPointerUp)
        canvas.addEventListener("pointerleave", onPointerUp)
        return () => {
            pointerRef.current = null
            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerup", onPointerUp)
            canvas.removeEventListener("pointercancel", onPointerUp)
            canvas.removeEventListener("pointerleave", onPointerUp)
        }
    }, [api, draggable, r])

    useEffect(() => {
        stopRaf()
        if (!runAnimation || !globeRef.current) return

        const g = globeRef.current
        const phiSpeed = 0.001 + (speed / 2) * 0.019

        const tick = () => {
            const canAutoSpin = spinRef.current && (!isCanvas || preview)
            if (canAutoSpin && pointerRef.current === null) {
                baseRotationRef.current += phiSpeed
            }
            g.update({
                phi: baseRotationRef.current + r.get(),
                theta: clampTilt(baseTiltRef.current + t.get()),
            })
            rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
        return stopRaf
    }, [isCanvas, preview, r, runAnimation, speed, stopRaf, t])

    const layerBackground =
        background != null && String(background).trim() !== ""
            ? String(background).trim()
            : "transparent"

    if (webglError) {
        return (
            <ComponentMessage
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
                    background: layerBackground,
                    ...style,
                }}
                title="COBE Globe"
                subtitle="WebGL unavailable in this environment"
            />
        )
    }

    return (
        <div
            ref={wrapRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: layerBackground,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    touchAction: "none",
                    cursor: draggable ? "grab" : undefined,
                }}
            />
        </div>
    )
}

addPropertyControls(CobeGlobe, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    motion: {
        type: ControlType.Object,
        title: "Motion",
        controls: {
            phi: {
                type: ControlType.Number,
                title: "Phi",
                min: 0,
                max: 6.283185,
                step: 0.01,
                defaultValue: 0,
            },
            tilt: {
                type: ControlType.Number,
                title: "Tilt",
                min: -1.2,
                max: 1.2,
                step: 0.05,
                defaultValue: 0.2,
            },
            spin: {
                type: ControlType.Boolean,
                title: "Spin",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            speed: {
                type: ControlType.Number,
                title: "Speed",
                min: 0.1,
                max: 2,
                step: 0.05,
                defaultValue: 0.5,
                displayStepper: true,
                hidden: (p: CobeGlobeProps) => !(p.motion?.spin ?? true),
            },
            draggable: {
                type: ControlType.Boolean,
                title: "Drag",
                defaultValue: false,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
        },
    },
    globe: {
        type: ControlType.Object,
        title: "Globe",
        controls: {
            theme: {
                type: ControlType.Enum,
                title: "Theme",
                options: ["light", "dark"],
                optionTitles: ["Light", "Dark"],
                defaultValue: "light",
                displaySegmentedControl: true,
            },
            dark: {
                type: ControlType.Number,
                title: "Dark",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0,
                hidden: (p: CobeGlobeProps) => p.globe?.theme === "dark",
            },
            diffuse: {
                type: ControlType.Number,
                title: "Diffuse",
                min: 0.5,
                max: 3,
                step: 0.05,
                defaultValue: 1.2,
            },
            samples: {
                type: ControlType.Number,
                title: "Samples",
                min: 4000,
                max: 100000,
                step: 1000,
                defaultValue: 16000,
            },
            land: {
                type: ControlType.Number,
                title: "Land",
                min: 1,
                max: 20,
                step: 0.5,
                defaultValue: 6,
            },
            ocean: {
                type: ControlType.Number,
                title: "Ocean",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0,
            },
            scale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.5,
                max: 1.5,
                step: 0.05,
                defaultValue: 1,
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 1,
            },
            offsetX: {
                type: ControlType.Number,
                title: "OffsetX",
                min: -200,
                max: 200,
                step: 1,
                defaultValue: 0,
            },
            offsetY: {
                type: ControlType.Number,
                title: "OffsetY",
                min: -200,
                max: 200,
                step: 1,
                defaultValue: 0,
            },
            sharp: {
                type: ControlType.Number,
                title: "Sharp",
                min: 1,
                max: 3,
                step: 0.5,
                defaultValue: 2,
            },
        },
    },
    dots: {
        type: ControlType.Object,
        title: "Dots",
        controls: {
            size: {
                type: ControlType.Number,
                title: "Size",
                min: 0.02,
                max: 0.1,
                step: 0.005,
                defaultValue: 0.04,
            },
            elevation: {
                type: ControlType.Number,
                title: "Lift",
                min: 0,
                max: 0.2,
                step: 0.01,
                defaultValue: 0.06,
            },
            markers: {
                type: ControlType.Array,
                title: "Points",
                defaultValue: DEFAULT_MARKERS,
                control: {
                    type: ControlType.Object,
                    controls: {
                        id: {
                            type: ControlType.String,
                            title: "Id",
                            defaultValue: "",
                        },
                        lat: {
                            type: ControlType.Number,
                            title: "Lat",
                            min: -90,
                            max: 90,
                            step: 0.1,
                            defaultValue: 0,
                        },
                        lng: {
                            type: ControlType.Number,
                            title: "Lng",
                            min: -180,
                            max: 180,
                            step: 0.1,
                            defaultValue: 0,
                        },
                    },
                },
            },
        },
    },
    arcs: {
        type: ControlType.Object,
        title: "Arcs",
        controls: {
            show: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            width: {
                type: ControlType.Number,
                title: "Width",
                min: 0.1,
                max: 2,
                step: 0.05,
                defaultValue: 0.4,
                hidden: (p: CobeGlobeProps) => !(p.arcs?.show ?? true),
            },
            height: {
                type: ControlType.Number,
                title: "Height",
                min: 0.1,
                max: 0.5,
                step: 0.02,
                defaultValue: 0.25,
                hidden: (p: CobeGlobeProps) => !(p.arcs?.show ?? true),
            },
            links: {
                type: ControlType.Array,
                title: "Links",
                defaultValue: DEFAULT_ARCS,
                hidden: (p: CobeGlobeProps) => !(p.arcs?.show ?? true),
                control: {
                    type: ControlType.Object,
                    controls: {
                        fromId: {
                            type: ControlType.String,
                            title: "From",
                            defaultValue: "",
                        },
                        toId: {
                            type: ControlType.String,
                            title: "To",
                            defaultValue: "",
                        },
                    },
                },
            },
        },
    },
    colors: {
        type: ControlType.Object,
        title: "Colors",
        controls: {
            base: {
                type: ControlType.Color,
                title: "Base",
                defaultValue: "#ffffff",
            },
            marker: {
                type: ControlType.Color,
                title: "Marker",
                defaultValue: "#3366ff",
            },
            glow: {
                type: ControlType.Color,
                title: "Glow",
                defaultValue: "#ffffff",
            },
            arc: {
                type: ControlType.Color,
                title: "Arc",
                defaultValue: "#4d7cff",
            },
        },
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        optional: true,
    },
    debug: {
        type: ControlType.Boolean,
        title: "Debug",
        defaultValue: false,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

CobeGlobe.displayName = "COBE Globe"
