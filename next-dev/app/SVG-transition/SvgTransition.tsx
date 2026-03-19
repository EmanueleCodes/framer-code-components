import React, { useEffect, useLayoutEffect, useState, useRef } from "react"
import { addPropertyControls, ControlType, FileControlDescription, RenderTarget } from "framer"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const extractPathsFromSVG = (
    svgContent: string
): {
    paths: string[]
    lengths: number[]
    longestPathLength: number
    maxPathWidth: number
    maxPathHeight: number
} => {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")
    const pathElements = Array.from(svgDoc.querySelectorAll("path"))

    const paths = pathElements
        .map((p) => p.getAttribute("d"))
        .filter((d): d is string => !!d)

    const lengths: number[] = []
    let longestPathLength = 0
    let maxPathWidth = 0
    let maxPathHeight = 0

    if (pathElements.length > 0) {
        const tempSvg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        )
        tempSvg.style.position = "absolute"
        tempSvg.style.visibility = "hidden"
        document.body.appendChild(tempSvg)

        pathElements.forEach((pathEl) => {
            const tempPath = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            )
            tempPath.setAttribute("d", pathEl.getAttribute("d") || "")
            tempSvg.appendChild(tempPath)

            const pathLength = tempPath.getTotalLength()
            lengths.push(pathLength)
            longestPathLength = Math.max(longestPathLength, pathLength)

            const boundingBox = tempPath.getBBox()
            maxPathWidth = Math.max(maxPathWidth, boundingBox.width)
            maxPathHeight = Math.max(maxPathHeight, boundingBox.height)
        })

        document.body.removeChild(tempSvg)
    }

    return { paths, lengths, longestPathLength, maxPathWidth, maxPathHeight }
}

const FALLBACK_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.4952 18.5868L16.5874 20.7373C16.7603 20.8282 16.9552 20.8688 17.15 20.8544C17.3448 20.84 17.5316 20.7713 17.6893 20.656C17.847 20.5408 17.9692 20.3836 18.042 20.2023C18.1148 20.0211 18.1352 19.823 18.1011 19.6307L17.3181 15.0792C17.289 14.9114 17.3013 14.739 17.3541 14.577C17.4069 14.4151 17.4984 14.2685 17.6209 14.1501L20.9301 10.9243C21.0709 10.7888 21.1707 10.6166 21.2184 10.4271C21.2661 10.2377 21.2597 10.0387 21.1999 9.8527C21.14 9.66672 21.0292 9.50127 20.8801 9.37514C20.7309 9.24902 20.5493 9.16728 20.356 9.13923L15.7836 8.48155C15.6163 8.45643 15.4577 8.39105 15.3213 8.29103C15.1849 8.19102 15.0749 8.05936 15.0006 7.90739L12.9128 3.73168C12.8273 3.55518 12.6938 3.40633 12.5276 3.30218C12.3615 3.19803 12.1693 3.14279 11.9732 3.14279C11.7771 3.14279 11.585 3.19803 11.4188 3.30218C11.2526 3.40633 11.1192 3.55518 11.0337 3.73168L8.94584 7.90739C8.87161 8.05936 8.76156 8.19102 8.62518 8.29103C8.48879 8.39105 8.33015 8.45643 8.16289 8.48155L3.65312 9.13923C3.45894 9.16566 3.27611 9.24622 3.12556 9.37169C2.97502 9.49716 2.86283 9.66248 2.80183 9.84872C2.74084 10.035 2.73351 10.2346 2.78067 10.4248C2.82783 10.6151 2.92759 10.7882 3.06853 10.9243L6.37778 14.1501C6.5002 14.2685 6.5918 14.4151 6.64457 14.577C6.69734 14.739 6.70968 14.9114 6.68052 15.0792L5.89757 19.6307C5.86341 19.823 5.88388 20.0211 5.95667 20.2023C6.02946 20.3836 6.15164 20.5408 6.30932 20.656C6.46701 20.7713 6.65387 20.84 6.84867 20.8544C7.04347 20.8688 7.23838 20.8282 7.41126 20.7373L11.5035 18.5868C11.6558 18.5045 11.8262 18.4615 11.9993 18.4615C12.1724 18.4615 12.3428 18.5045 12.4952 18.5868Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

interface TransitionConfig {
    type?: "tween" | "spring" | "keyframes" | "inertia"
    duration?: number
    ease?: string | number[]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
}

function cubicBezierAt(t: number, a: number, b: number, c: number, d: number): number {
    const u = 1 - t
    const t2 = t * t
    const t3 = t2 * t
    const u2 = u * u
    return 3 * u2 * t * b + 3 * u * t2 * c + t3 * d
}

const SPRING_POS_THRESHOLD = 0.0005
const SPRING_VEL_THRESHOLD = 0.0005

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

const DEFAULT_TRANSITION: TransitionConfig = {
    type: "tween",
    duration: 1,
    ease: "easeOut",
    delay: 0,
}

/**
 * Animation modes:
 * - forward:          Draw path from end → start (visible portion grows from path end)
 * - backward:         Erase path toward end (visible portion shrinks toward path end)
 * - forwardFromStart: Draw path from start → end (visible portion grows from path start)
 * - backwardFromStart: Erase path toward start (visible portion shrinks toward path start)
 */
export type SvgTransitionMode =
    | "forward"
    | "backward"
    | "forwardFromStart"
    | "backwardFromStart"

/** Returns true if this mode draws (reveals) the path, false if it erases (hides). */
function isDrawMode(mode: SvgTransitionMode): boolean {
    return mode === "forward" || mode === "forwardFromStart"
}

/** Returns true if the trim anchor is at the path start (negative offset direction). */
function trimFromStart(mode: SvgTransitionMode): boolean {
    return mode === "forwardFromStart" || mode === "backwardFromStart"
}

function resolveMode(props: {
    mode?: SvgTransitionMode
    animate?: "in" | "out"
}): SvgTransitionMode {
    if (props.mode) return props.mode
    if (props.animate === "out") return "backward"
    return "forward"
}

interface SvgTransitionProps {
    svgFile?: string
    svgCode?: string
    inputType?: "file" | "code"
    strokeColor?: string
    strokeWidth?: number
    strokeWidthEnd?: number
    lineCap?: "round" | "butt" | "square"
    lineJoin?: "round" | "bevel" | "miter"
    /** Prefer this over legacy `animate`. */
    mode?: SvgTransitionMode
    /** @deprecated Use `mode` (forward / backward / …). */
    animate?: "in" | "out"
    transition?: TransitionConfig
    preview?: boolean
    style?: React.CSSProperties
}

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 320
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function SvgTransition(props: SvgTransitionProps) {
    const {
        svgFile,
        svgCode,
        inputType = "file",
        strokeColor = "#fc5025",
        strokeWidth = 2,
        strokeWidthEnd = 2,
        lineCap = "round",
        lineJoin = "round",
        mode: modeProp,
        animate: animateLegacy,
        transition: transitionProp,
        preview = false,
        style,
    } = props

    const mode = resolveMode({ mode: modeProp, animate: animateLegacy })

    const transition: TransitionConfig = {
        ...DEFAULT_TRANSITION,
        ...transitionProp,
    }

    const groupRef = useRef<SVGGElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)

    const [svgPaths, setSvgPaths] = useState<string[]>([])
    const [pathLengths, setPathLengths] = useState<number[]>([])
    const [viewBox, setViewBox] = useState<string | undefined>(undefined)
    const [computedStrokeWidth, setComputedStrokeWidth] = useState<number>(strokeWidth)
    const [layoutScale, setLayoutScale] = useState(1)
    const [maxPathWidth, setMaxPathWidth] = useState<number>(0)
    const [maxPathHeight, setMaxPathHeight] = useState<number>(0)

    const [lastStrokeEdit, setLastStrokeEdit] = useState<"start" | "end">(
        "start"
    )
    const prevStrokeWidthRef = useRef(strokeWidth)
    const prevStrokeWidthEndRef = useRef(strokeWidthEnd)

    useEffect(() => {
        const wCh = strokeWidth !== prevStrokeWidthRef.current
        const eCh = strokeWidthEnd !== prevStrokeWidthEndRef.current
        if (wCh && eCh) {
            setLastStrokeEdit("start")
        } else if (wCh) {
            setLastStrokeEdit("start")
        } else if (eCh) {
            setLastStrokeEdit("end")
        }
        prevStrokeWidthRef.current = strokeWidth
        prevStrokeWidthEndRef.current = strokeWidthEnd
    }, [strokeWidth, strokeWidthEnd])

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const previewMatters = isCanvas

    const initialProgress =
        previewMatters && preview ? 0.5 : isDrawMode(mode) ? 0 : 1
    const [progress, setProgress] = useState(initialProgress)
    const prevPreviewRef = useRef(preview)
    const progressRef = useRef(initialProgress)
    progressRef.current = progress

    const rafRef = useRef<number>(0)
    const startTimeRef = useRef<number>(0)
    const springVelocityRef = useRef(0)
    const springPositionRef = useRef(0)

    useEffect(() => {
        let cancelled = false

        const setPathsAndLength = (
            paths: string[],
            lengths: number[],
            _longest: number
        ) => {
            if (!cancelled) {
                setSvgPaths(paths)
                setPathLengths(lengths)
            }
        }

        if (inputType === "file" && svgFile) {
            fetch(svgFile)
                .then((response) => response.text())
                .then((svgContent) => {
                    const result = extractPathsFromSVG(svgContent)
                    setPathsAndLength(
                        result.paths,
                        result.lengths,
                        result.longestPathLength
                    )
                })
                .catch(() => setPathsAndLength([], [], 0))
        } else if (inputType === "code" && svgCode) {
            const result = extractPathsFromSVG(svgCode)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength
            )
        } else {
            const result = extractPathsFromSVG(FALLBACK_SVG)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength
            )
        }

        return () => {
            cancelled = true
        }
    }, [inputType, svgFile, svgCode])

    useEffect(() => {
        if (previewMatters && preview) {
            prevPreviewRef.current = true
            setProgress(0.5)
            return
        }
        if (previewMatters && prevPreviewRef.current) {
            prevPreviewRef.current = false
            setProgress(isDrawMode(mode) ? 0 : 1)
            return
        }

        const durationSec = transition.duration ?? 1
        const delaySec = transition.delay ?? 0
        const ease = transition.ease
        const isSpring = transition.type === "spring"
        const stiffness = transition.stiffness ?? 100
        const mass = transition.mass ?? 1
        const bounce = transition.bounce ?? 0
        const baseDamping = transition.damping ?? 10
        const damping = baseDamping * (1 - bounce * 0.9)

        const target = isDrawMode(mode) ? 1 : 0
        const startProgress = progressRef.current

        if (Math.abs(startProgress - target) < 0.001) {
            setProgress(target)
            return
        }

        startTimeRef.current = performance.now()
        springPositionRef.current = startProgress
        springVelocityRef.current = 0

        let cancelled = false
        let lastSpringTime = performance.now() / 1000

        const animateFrame = (now: number) => {
            if (cancelled) return
            const elapsed = (now - startTimeRef.current) / 1000

            if (elapsed < delaySec) {
                lastSpringTime = now / 1000
                rafRef.current = requestAnimationFrame(animateFrame)
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
                if (!settled && elapsed < 10) rafRef.current = requestAnimationFrame(animateFrame)
            } else {
                const rawT = Math.min(1, (elapsed - delaySec) / durationSec)
                const t = applyEase(rawT, ease)
                const newProgress = startProgress + (target - startProgress) * t
                setProgress(newProgress)
                if (rawT < 1) rafRef.current = requestAnimationFrame(animateFrame)
            }
        }

        rafRef.current = requestAnimationFrame(animateFrame)
        return () => {
            cancelled = true
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [
        mode,
        preview,
        transition?.type,
        transition?.duration,
        transition?.delay,
        transition?.stiffness,
        transition?.damping,
        transition?.mass,
        transition?.bounce,
        typeof transition?.ease === "string"
            ? transition.ease
            : JSON.stringify(transition?.ease ?? []),
    ])

    useLayoutEffect(() => {
        if (!svgPaths || svgPaths.length === 0 || !groupRef.current) return

        const bbox = groupRef.current.getBBox()

        if (bbox && bbox.width > 0 && bbox.height > 0) {
            // Padding only in SVG user units (same as path-reveal). Do not mix in raw
            // strokeWidth/strokeWidthEnd props — they are display px and inflate the
            // viewBox when End is large, which shrinks the path under meet scaling.
            const strokePadding = Math.max(0, computedStrokeWidth / 2)
            setViewBox(
                `${bbox.x - strokePadding} ${bbox.y - strokePadding} ${bbox.width + strokePadding * 2} ${bbox.height + strokePadding * 2}`
            )
        } else {
            setViewBox("0 0 100 100")
        }
    }, [svgPaths, computedStrokeWidth])

    useLayoutEffect(() => {
        if (!svgPaths || svgPaths.length === 0 || !groupRef.current) return

        const paths = Array.from(groupRef.current.querySelectorAll("path"))
        if (paths.length === 0) return

        let widest = 0
        let tallest = 0
        for (const path of paths) {
            const boundingBox = path.getBBox()
            widest = Math.max(widest, boundingBox.width)
            tallest = Math.max(tallest, boundingBox.height)
        }

        const strokePadding = Math.max(0, computedStrokeWidth / 2)
        setMaxPathWidth(Math.ceil(widest + strokePadding * 2))
        setMaxPathHeight(Math.ceil(tallest + strokePadding * 2))
    }, [svgPaths, computedStrokeWidth])

    useEffect(() => {
        const compute = () => {
            const containerEl = containerRef.current
            const svgEl = svgRef.current
            if (!containerEl || !svgEl) {
                setLayoutScale(1)
                setComputedStrokeWidth(strokeWidth)
                return
            }

            const probe = zoomProbeRef.current
            const editorZoom = probe
                ? probe.getBoundingClientRect().width / 20
                : 1

            const rect = svgEl.getBoundingClientRect()
            const parts = (viewBox || "0 0 100 100").split(" ").map(Number)
            const vbWidth = parts[2] || 100
            const vbHeight = parts[3] || 100

            const safeZoom = Math.max(editorZoom, 0.0001)
            const scaleX = rect.width / safeZoom / vbWidth
            const scaleY = rect.height / safeZoom / vbHeight
            const scale = Math.min(scaleX, scaleY) || 1
            setLayoutScale((prev) =>
                Math.abs(prev - scale) > 1e-4 ? scale : prev
            )

            const adjustedStrokeWidth = strokeWidth / scale
            setComputedStrokeWidth((prev) =>
                Math.abs(prev - adjustedStrokeWidth) > 0.05
                    ? adjustedStrokeWidth
                    : prev
            )
        }

        if (RenderTarget.current() === RenderTarget.canvas) {
            let rafId = 0
            const last = { ts: 0, zoom: 0, w: 0, h: 0 }
            const TICK_MS = 250
            const EPS_ZOOM = 0.001
            const EPS_SIZE = 0.5

            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                const svgEl = svgRef.current
                if (probe && svgEl) {
                    const currentZoom = probe.getBoundingClientRect().width / 20
                    const r = svgEl.getBoundingClientRect()

                    const timeOk =
                        !last.ts ||
                        (now || performance.now()) - last.ts >= TICK_MS
                    const zoomChanged =
                        Math.abs(currentZoom - last.zoom) > EPS_ZOOM
                    const sizeChanged =
                        Math.abs(r.width - last.w) > EPS_SIZE ||
                        Math.abs(r.height - last.h) > EPS_SIZE

                    if (timeOk && (zoomChanged || sizeChanged)) {
                        last.ts = now || performance.now()
                        last.zoom = currentZoom
                        last.w = r.width
                        last.h = r.height
                        compute()
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        }

        compute()
        const ro = new ResizeObserver(() => compute())
        if (containerRef.current) ro.observe(containerRef.current)
        window.addEventListener("resize", compute)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", compute)
        }
    }, [strokeWidth, viewBox])

    const effectiveProgress = isCanvas && preview ? 0.5 : clamp01(progress)

    const liveStrokeUser =
        computedStrokeWidth +
        ((strokeWidthEnd - strokeWidth) * effectiveProgress) /
            (strokeWidth / computedStrokeWidth || 1)

    const canvasStrokeUser =
        lastStrokeEdit === "end"
            ? Math.abs(strokeWidth) > 1e-6
                ? computedStrokeWidth * (strokeWidthEnd / strokeWidth)
                : strokeWidthEnd / Math.max(layoutScale, 1e-6)
            : computedStrokeWidth

    const strokeWidthUser = isCanvas ? canvasStrokeUser : liveStrokeUser

    /**
     * Dash offset math (effectiveProgress = how much of the path is visible, 0-1):
     * 
     * Default anchor (path end visible first):
     * - offset = (1 - progress) * pathLength
     * - progress 0 → offset = pathLength (nothing visible)
     * - progress 1 → offset = 0 (fully visible)
     * 
     * FromStart anchor (path start visible first, uses negative offset):
     * - offset = -progress * pathLength  
     * - progress 0 → offset = 0 (nothing visible)
     * - progress 1 → offset = -pathLength (fully visible)
     */
    const fromStart = trimFromStart(mode)

    const pathElements = svgPaths.map((pathData, pathIndex) => {
        const pathLength = pathLengths[pathIndex] ?? 0
        const dasharray = pathLength > 0 ? `${pathLength}` : "1"

        let dashoffset = 0
        if (pathLength > 0) {
            if (fromStart) {
                // Negative offset: visible portion anchored at path start
                dashoffset = -effectiveProgress * pathLength
            } else {
                // Positive offset: visible portion anchored at path end
                dashoffset = (1 - effectiveProgress) * pathLength
            }
        }

        return (
            <path
                key={pathIndex}
                d={pathData}
                stroke={strokeColor}
                strokeWidth={strokeWidthUser}
                strokeLinecap={lineCap}
                strokeLinejoin={lineJoin}
                fill="none"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
            />
        )
    })

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                minWidth: maxPathWidth || undefined,
                minHeight: maxPathHeight || undefined,
            }}
        >
            <div style={{ position: "absolute", inset: 0 }}>
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
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={viewBox}
                    preserveAspectRatio="xMidYMid meet"
                    overflow="visible"
                >
                    <g ref={groupRef}>{pathElements}</g>
                </svg>
            </div>
        </div>
    )
}

const svgTransitionDefaultProps: Partial<SvgTransitionProps> = {
    svgFile: "",
    svgCode: "",
    inputType: "file",
    strokeColor: "#fc5025",
    strokeWidth: 2,
    strokeWidthEnd: 2,
    lineCap: "round",
    lineJoin: "round",
    mode: "forward",
    preview: false,
}
SvgTransition.defaultProps = svgTransitionDefaultProps

addPropertyControls(SvgTransition, {
    inputType: {
        type: ControlType.Enum,
        title: "Type",
        options: ["file", "code"],
        optionTitles: ["File", "Code"],
        displaySegmentedControl: true,
        defaultValue: "file",
    },
    svgFile: {
        type: ControlType.File,
        title: "SVG",
        allowedFileTypes: ["svg"],
        hidden: (props) => props.inputType !== "file",
    } as FileControlDescription,
    svgCode: {
        type: ControlType.String,
        title: " ",
        displayTextArea: true,
        hidden: (props) => props.inputType !== "code",
    },
    strokeColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#fc5025",
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Start",
        min: 0,
        max: 1000,
        step: 0.5,
        defaultValue: 2,
    },
    strokeWidthEnd: {
        type: ControlType.Number,
        title: "End",
        min: 0,
        max: 1000,
        step: 0.5,
        defaultValue: 2,
    },
    lineCap: {
        type: ControlType.Enum,
        title: "Cap",
        options: ["round", "butt", "square"],
        optionTitles: ["Round", "Butt", "Square"],
        defaultValue: "round",
    },
    lineJoin: {
        type: ControlType.Enum,
        title: "Join",
        options: ["round", "bevel", "miter"],
        optionTitles: ["Round", "Bevel", "Miter"],
        defaultValue: "round",
    },
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "Static",
        disabledTitle: "Dynamic",
    },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: [
            "forward",
            "backward",
            "forwardFromStart",
            "backwardFromStart",
        ],
        optionTitles: [
            "Forward",
            "Backward",
            "Forward from Start",
            "Backward from End",
        ],
        defaultValue: "forward",
        hidden: (props) => props.preview === true,
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: DEFAULT_TRANSITION,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

SvgTransition.displayName = "SVG Transition"
