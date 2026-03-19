import React, {
    useRef,
    useEffect,
    useCallback,
    useState,
    useMemo,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// Build: custom-bundle-gsap/cobe-bundle — sync npm-bundles/cobe.js to framer-university/components
// @ts-ignore ESM bundle from jsDelivr (sync npm-bundles/cobe.js to framer-university/components)
import createGlobe from "./bundle.ts"

type Marker = { location: [number, number]; size: number; id?: string }
type Arc = { from: [number, number]; to: [number, number] }

const EMPTY_MARKERS: Marker[] = []
const EMPTY_ARCS: Arc[] = []

const WORLD_MARKERS: Marker[] = [
    { location: [37.78, -122.44], size: 0.04, id: "sf" },
    { location: [40.71, -74.01], size: 0.04, id: "nyc" },
    { location: [35.68, 139.65], size: 0.04, id: "tokyo" },
    { location: [51.51, -0.13], size: 0.04, id: "london" },
    { location: [-33.87, 151.21], size: 0.04, id: "sydney" },
    { location: [1.35, 103.82], size: 0.04, id: "singapore" },
    { location: [25.2, 55.27], size: 0.04, id: "dubai" },
    { location: [-23.55, -46.63], size: 0.04, id: "sp" },
    { location: [-33.93, 18.42], size: 0.04, id: "capetown" },
    { location: [48.86, 2.35], size: 0.04, id: "paris" },
]

const FLIGHT_ARCS: Arc[] = [
    { from: [37.78, -122.44], to: [35.68, 139.65] },
    { from: [40.71, -74.01], to: [51.51, -0.13] },
]

const FLIGHT_MARKERS: Marker[] = [
    { location: [37.78, -122.44], size: 0.045, id: "sf" },
    { location: [35.68, 139.65], size: 0.045, id: "tokyo" },
    { location: [40.71, -74.01], size: 0.045, id: "nyc" },
    { location: [51.51, -0.13], size: 0.045, id: "london" },
]

function presetData(
    preset: CobeGlobeProps["preset"]
): { markers: Marker[]; arcs: Arc[] } {
    switch (preset) {
        case "cities":
            return { markers: WORLD_MARKERS, arcs: EMPTY_ARCS }
        case "flights":
            return { markers: FLIGHT_MARKERS, arcs: FLIGHT_ARCS }
        default:
            return { markers: EMPTY_MARKERS, arcs: EMPTY_ARCS }
    }
}

function hexToRgb01(hex: string): [number, number, number] {
    const h = (hex || "#ffffff").replace("#", "").trim()
    const full =
        h.length === 3
            ? h
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : h.padEnd(6, "0").slice(0, 6)
    const r = parseInt(full.slice(0, 2), 16) / 255
    const g = parseInt(full.slice(2, 4), 16) / 255
    const b = parseInt(full.slice(4, 6), 16) / 255
    return [
        Number.isFinite(r) ? r : 1,
        Number.isFinite(g) ? g : 1,
        Number.isFinite(b) ? b : 1,
    ]
}

export interface CobeGlobeProps {
    preview: boolean
    preset: "none" | "cities" | "flights"
    spin: boolean
    speed: number
    theme: "light" | "dark"
    tilt: number
    diffuse: number
    samples: number
    land: number
    ocean: number
    arcs: boolean
    stroke: number
    curve: number
    dots: number
    sharp: number
    colors: {
        base: string
        marker: string
        glow: string
        arc: string
    }
    style?: CSSProperties
    debug: boolean
}

type GlobeApi = {
    update: (state: Record<string, unknown>) => void
    destroy: () => void
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
    preset = "cities",
    spin = true,
    speed = 0.5,
    theme = "light",
    tilt = 0.2,
    diffuse = 1.2,
    samples = 16000,
    land = 6,
    ocean = 0,
    arcs = false,
    stroke = 0.4,
    curve = 0.25,
    dots = 0.04,
    sharp = 2,
    colors = {
        base: "#ffffff",
        marker: "#3366ff",
        glow: "#ffffff",
        arc: "#4d7cff",
    },
    style,
    debug = false,
}: CobeGlobeProps) {
    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const globeRef = useRef<GlobeApi | null>(null)
    const phiRef = useRef(0)
    const rafRef = useRef<number>(0)
    const sizeRef = useRef({ w: 600, h: 600 })

    const isCanvasRef = useRef<boolean | null>(null)
    if (isCanvasRef.current === null) {
        isCanvasRef.current = RenderTarget.current() === RenderTarget.canvas
    }
    const isCanvas = isCanvasRef.current

    const [isInView, setIsInView] = useState(true)
    const [webglError, setWebglError] = useState(false)

    const runAnimation = (!isCanvas || preview) && isInView

    const { markers, arcs: arcList } = useMemo(() => presetData(preset), [preset])
    const showArcs = arcs && arcList.length > 0
    const dark = theme === "dark" ? 1 : 0

    const baseRgb = hexToRgb01(colors?.base ?? "#ffffff")
    const markerRgb = hexToRgb01(colors?.marker ?? "#3366ff")
    const glowRgb = hexToRgb01(colors?.glow ?? "#ffffff")
    const arcRgb = hexToRgb01(colors?.arc ?? "#4d7cff")

    const dpr = Math.max(1, Math.min(3, sharp))

    const stopRaf = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = 0
        }
    }, [])

    useEffect(() => {
        const el = wrapRef.current
        if (!el || typeof IntersectionObserver === "undefined") return
        const io = new IntersectionObserver(
            ([e]) => setIsInView(e.isIntersecting),
            { threshold: 0 }
        )
        io.observe(el)
        return () => io.disconnect()
    }, [])

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
                phi: phiRef.current,
                theta: tilt,
                dark,
                diffuse,
                mapSamples: samples,
                mapBrightness: land,
                mapBaseBrightness: ocean,
                baseColor: baseRgb,
                markerColor: markerRgb,
                glowColor: glowRgb,
                markers: markers.map((m) => ({
                    ...m,
                    size: dots,
                })),
                arcs: showArcs ? arcList : [],
                arcColor: arcRgb,
                arcWidth: stroke,
                arcHeight: curve,
            }) as GlobeApi

            if (!g || typeof g.update !== "function") {
                setWebglError(true)
                return
            }
            setWebglError(false)
            globeRef.current = g
            g.update({ phi: phiRef.current })
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
        }
    }, [preset, dpr])

    useEffect(() => {
        const g = globeRef.current
        if (!g) return
        g.update({
            theta: tilt,
            dark,
            diffuse,
            mapSamples: samples,
            mapBrightness: land,
            mapBaseBrightness: ocean,
            baseColor: baseRgb,
            markerColor: markerRgb,
            glowColor: glowRgb,
            arcColor: arcRgb,
            arcWidth: stroke,
            arcHeight: curve,
            markers: markers.map((m) => ({ ...m, size: dots })),
            arcs: showArcs ? arcList : [],
        })
    }, [
        tilt,
        dark,
        diffuse,
        samples,
        land,
        ocean,
        baseRgb,
        markerRgb,
        glowRgb,
        arcRgb,
        stroke,
        curve,
        dots,
        markers,
        arcList,
        showArcs,
    ])

    useEffect(() => {
        const g = globeRef.current
        if (!g) return
        const { w, h } = sizeRef.current
        g.update({ devicePixelRatio: dpr, width: w, height: h })
    }, [dpr])

    useEffect(() => {
        stopRaf()
        if (!runAnimation || !globeRef.current) return

        const g = globeRef.current
        const phiSpeed = 0.001 + (speed / 2) * 0.019

        const tick = () => {
            if (spin) {
                phiRef.current += phiSpeed
            }
            g.update({ phi: phiRef.current })
            rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
        return stopRaf
    }, [runAnimation, spin, speed, stopRaf])

    if (webglError) {
        return (
            <ComponentMessage
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
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
                background: "transparent",
                outline: debug ? "1px dashed rgba(255,0,0,0.35)" : undefined,
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
    preset: {
        type: ControlType.Enum,
        title: "Preset",
        options: ["none", "cities", "flights"],
        optionTitles: ["None", "Cities", "Flights"],
        defaultValue: "cities",
        displaySegmentedControl: true,
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
        hidden: (p: CobeGlobeProps) => !p.spin,
    },
    theme: {
        type: ControlType.Enum,
        title: "Theme",
        options: ["light", "dark"],
        optionTitles: ["Light", "Dark"],
        defaultValue: "light",
        displaySegmentedControl: true,
    },
    tilt: {
        type: ControlType.Number,
        title: "Tilt",
        min: -1.2,
        max: 1.2,
        step: 0.05,
        defaultValue: 0.2,
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
        max: 48000,
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
    arcs: {
        type: ControlType.Boolean,
        title: "Arcs",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (p: CobeGlobeProps) => p.preset !== "flights",
    },
    stroke: {
        type: ControlType.Number,
        title: "Stroke",
        min: 0.1,
        max: 2,
        step: 0.05,
        defaultValue: 0.4,
        hidden: (p: CobeGlobeProps) =>
            !p.arcs || p.preset !== "flights",
    },
    curve: {
        type: ControlType.Number,
        title: "Curve",
        min: 0.1,
        max: 0.5,
        step: 0.02,
        defaultValue: 0.25,
        hidden: (p: CobeGlobeProps) =>
            !p.arcs || p.preset !== "flights",
    },
    dots: {
        type: ControlType.Number,
        title: "Dots",
        min: 0.02,
        max: 0.1,
        step: 0.005,
        defaultValue: 0.04,
        hidden: (p: CobeGlobeProps) => p.preset === "none",
    },
    sharp: {
        type: ControlType.Number,
        title: "Sharp",
        min: 1,
        max: 3,
        step: 0.5,
        defaultValue: 2,
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
    debug: {
        type: ControlType.Boolean,
        title: "Debug",
        defaultValue: false,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

CobeGlobe.displayName = "COBE Globe"
