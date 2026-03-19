import React, { useEffect, useMemo, useState, useRef } from "react"
import {
    addPropertyControls,
    ControlType,
    FileControlDescription,
    RenderTarget,
} from "framer"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** Trim (0–100) and stroke width; eased internally when props change. */
export interface SvgStroke {
    start?: number
    end?: number
    width?: number
}

function clampPct(n: number): number {
    if (typeof n !== "number" || Number.isNaN(n)) return 0
    return Math.max(0, Math.min(100, n))
}

function normalizeTrim(s?: Pick<SvgStroke, "start" | "end">): {
    start: number
    end: number
} {
    return {
        start: clampPct(s?.start ?? 0),
        end: clampPct(s?.end ?? 100),
    }
}

function normalizeStrokeWidth(w?: number): number {
    if (typeof w !== "number" || Number.isNaN(w)) return 2
    return Math.max(0, w)
}

/** Framer `ControlType.Transition` value. */
export interface SvgStrokeTransition {
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

const DEFAULT_TRANSITION: SvgStrokeTransition = {
    type: "tween",
    duration: 0.5,
    ease: "easeOut",
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

/** Map linear t in [0,1] to eased progress (Framer ease name or cubic-bezier). */
function applyEase(t: number, ease: string | number[] | undefined): number {
    const x = clamp01(t)
    if (ease == null) return x
    if (typeof ease === "string") {
        switch (ease) {
            case "linear":
                return x
            case "easeIn":
                return x * x
            case "easeOut":
                return x * (2 - x)
            case "easeInOut":
                return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x
            default:
                return x
        }
    }
    if (Array.isArray(ease) && ease.length >= 4) {
        const [x1, y1, x2, y2] = ease
        let lo = 0
        let hi = 1
        for (let i = 0; i < 12; i++) {
            const mid = (lo + hi) / 2
            const bx = cubicBezierAt(mid, 0, x1, x2, 1)
            if (bx < x) lo = mid
            else hi = mid
        }
        const u = (lo + hi) / 2
        return cubicBezierAt(u, 0, y1, y2, 1)
    }
    return x
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

function isFramerCanvas(): boolean {
    try {
        return RenderTarget.current() === RenderTarget.canvas
    } catch {
        return false
    }
}

/** Dash pattern: visible only from start%→end% of path length (in path direction). */
function segmentDash(L: number, startPct: number, endPct: number): { dasharray: string; dashoffset: number; hide: boolean } {
    if (L <= 0) return { dasharray: "none", dashoffset: 0, hide: true }
    const s = clamp01(startPct / 100)
    const e = clamp01(endPct / 100)
    const lo = Math.min(s, e)
    const hi = Math.max(s, e)
    const dashLen = (hi - lo) * L
    if (dashLen < 0.001) {
        return { dasharray: "none", dashoffset: 0, hide: true }
    }
    const gapBefore = lo * L
    const gapAfter = Math.max(0, (1 - hi) * L)
    return {
        dasharray: `${dashLen} ${gapAfter + gapBefore}`,
        dashoffset: -gapBefore,
        hide: false,
    }
}

/** Union of all path outlines in SVG user space (ignores trim — stable framing). */
export type PathBounds = { x: number; y: number; width: number; height: number }

/** Padding from geometry only — do not pass animated strokeWidth or the frame “breathes” during transitions. */
function viewBoxFromPathBounds(bounds: PathBounds | null): string {
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return "0 0 100 100"
    const m = Math.max(bounds.width, bounds.height)
    const basePad = Math.max(2, Math.min(64, m * 0.1))
    const slack = Math.max(6, Math.min(120, m * 0.18))
    const pad = basePad + slack
    return `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`
}

const extractPathsFromSVG = (
    svgContent: string
): {
    paths: string[]
    lengths: number[]
    longestPathLength: number
    maxPathWidth: number
    maxPathHeight: number
    pathBounds: PathBounds | null
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
    let pathBounds: PathBounds | null = null

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

            const minX = boundingBox.x
            const minY = boundingBox.y
            const maxX = boundingBox.x + boundingBox.width
            const maxY = boundingBox.y + boundingBox.height
            if (!pathBounds) {
                pathBounds = {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                }
            } else {
                const uMinX = Math.min(pathBounds.x, minX)
                const uMinY = Math.min(pathBounds.y, minY)
                const uMaxX = Math.max(pathBounds.x + pathBounds.width, maxX)
                const uMaxY = Math.max(pathBounds.y + pathBounds.height, maxY)
                pathBounds = {
                    x: uMinX,
                    y: uMinY,
                    width: uMaxX - uMinX,
                    height: uMaxY - uMinY,
                }
            }
        })

        document.body.removeChild(tempSvg)
    }

    return {
        paths,
        lengths,
        longestPathLength,
        maxPathWidth,
        maxPathHeight,
        pathBounds,
    }
}

const FALLBACK_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.4952 18.5868L16.5874 20.7373C16.7603 20.8282 16.9552 20.8688 17.15 20.8544C17.3448 20.84 17.5316 20.7713 17.6893 20.656C17.847 20.5408 17.9692 20.3836 18.042 20.2023C18.1148 20.0211 18.1352 19.823 18.1011 19.6307L17.3181 15.0792C17.289 14.9114 17.3013 14.739 17.3541 14.577C17.4069 14.4151 17.4984 14.2685 17.6209 14.1501L20.9301 10.9243C21.0709 10.7888 21.1707 10.6166 21.2184 10.4271C21.2661 10.2377 21.2597 10.0387 21.1999 9.8527C21.14 9.66672 21.0292 9.50127 20.8801 9.37514C20.7309 9.24902 20.5493 9.16728 20.356 9.13923L15.7836 8.48155C15.6163 8.45643 15.4577 8.39105 15.3213 8.29103C15.1849 8.19102 15.0749 8.05936 15.0006 7.90739L12.9128 3.73168C12.8273 3.55518 12.6938 3.40633 12.5276 3.30218C12.3615 3.19803 12.1693 3.14279 11.9732 3.14279C11.7771 3.14279 11.585 3.19803 11.4188 3.30218C11.2526 3.40633 11.1192 3.55518 11.0337 3.73168L8.94584 7.90739C8.87161 8.05936 8.76156 8.19102 8.62518 8.29103C8.48879 8.39105 8.33015 8.45643 8.16289 8.48155L3.65312 9.13923C3.45894 9.16566 3.27611 9.24622 3.12556 9.37169C2.97502 9.49716 2.86283 9.66248 2.80183 9.84872C2.74084 10.035 2.73351 10.2346 2.78067 10.4248C2.82783 10.6151 2.92759 10.7882 3.06853 10.9243L6.37778 14.1501C6.5002 14.2685 6.5918 14.4151 6.64457 14.577C6.69734 14.739 6.70968 14.9114 6.68052 15.0792L5.89757 19.6307C5.86341 19.823 5.88388 20.0211 5.95667 20.2023C6.02946 20.3836 6.15164 20.5408 6.30932 20.656C6.46701 20.7713 6.65387 20.84 6.84867 20.8544C7.04347 20.8688 7.23838 20.8282 7.41126 20.7373L11.5035 18.5868C11.6558 18.5045 11.8262 18.4615 11.9993 18.4615C12.1724 18.4615 12.3428 18.5045 12.4952 18.5868Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

const DEFAULT_STROKE: SvgStroke = {
    start: 0,
    end: 100,
    width: 2,
}

interface SvgTransitionProps {
    svgFile?: string
    svgCode?: string
    inputType?: "file" | "code"
    strokeColor?: string
    stroke?: SvgStroke
    lineCap?: "round" | "butt" | "square"
    lineJoin?: "round" | "bevel" | "miter"
    /** Tween or spring when Stroke targets change. */
    transition?: SvgStrokeTransition
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
        stroke: strokeProp,
        lineCap = "round",
        lineJoin = "round",
        transition: transitionProp,
        style,
    } = props

    const transition: SvgStrokeTransition = {
        ...DEFAULT_TRANSITION,
        ...transitionProp,
    }

    const transitionKey = useMemo(
        () =>
            JSON.stringify({
                ...DEFAULT_TRANSITION,
                ...(transitionProp ?? {}),
            }),
        [transitionProp]
    )

    const mergedStroke = { ...DEFAULT_STROKE, ...strokeProp }

    // Prop targets (Framer may jump the object; we ease in draw state below).
    const strokeTarget = normalizeTrim({
        start: mergedStroke.start,
        end: mergedStroke.end,
    })
    const widthTarget = normalizeStrokeWidth(mergedStroke.width)

    const [draw, setDraw] = useState({
        start: strokeTarget.start,
        end: strokeTarget.end,
        width: widthTarget,
    })
    const drawRef = useRef(draw)
    drawRef.current = draw

    const animRafRef = useRef<number>(0)

    useEffect(() => {
        const to = {
            start: strokeTarget.start,
            end: strokeTarget.end,
            width: widthTarget,
        }

        const cancelRaf = () => {
            if (animRafRef.current) {
                cancelAnimationFrame(animRafRef.current)
                animRafRef.current = 0
            }
        }

        if (isFramerCanvas()) {
            cancelRaf()
            setDraw(to)
            return
        }

        const from = drawRef.current
        if (
            Math.abs(from.start - to.start) < 1e-9 &&
            Math.abs(from.end - to.end) < 1e-9 &&
            Math.abs(from.width - to.width) < 1e-9
        ) {
            return
        }

        cancelRaf()

        const tr = transition
        const usePhysicsSpring =
            tr.type === "spring" && tr.duration === undefined

        if (usePhysicsSpring) {
            const stiffness = tr.stiffness ?? 300
            const damping = tr.damping ?? 30
            const mass = tr.mass ?? 1
            let s0 = from.start
            let s1 = from.end
            let sw = from.width
            let v0 = 0
            let v1 = 0
            let vw = 0
            let last = performance.now()

            const step = (now: number) => {
                const dt = Math.min(0.064, Math.max(0.001, (now - last) / 1000))
                last = now
                ;[s0, v0] = springStep(s0, v0, to.start, stiffness, damping, mass, dt)
                ;[s1, v1] = springStep(s1, v1, to.end, stiffness, damping, mass, dt)
                ;[sw, vw] = springStep(sw, vw, to.width, stiffness, damping, mass, dt)
                setDraw({ start: s0, end: s1, width: sw })

                const restD = tr.restDelta ?? SPRING_POS_THRESHOLD
                const restS = tr.restSpeed ?? SPRING_VEL_THRESHOLD
                const settled =
                    Math.abs(s0 - to.start) < restD &&
                    Math.abs(v0) < restS &&
                    Math.abs(s1 - to.end) < restD &&
                    Math.abs(v1) < restS &&
                    Math.abs(sw - to.width) < restD &&
                    Math.abs(vw) < restS

                if (settled) {
                    setDraw(to)
                    animRafRef.current = 0
                } else {
                    animRafRef.current = requestAnimationFrame(step)
                }
            }
            animRafRef.current = requestAnimationFrame(step)
            return cancelRaf
        }

        const durationSec = Math.max(0, tr.duration ?? DEFAULT_TRANSITION.duration ?? 0.5)
        const durationMs = durationSec * 1000
        const delayMs = Math.max(0, (tr.delay ?? 0) * 1000)

        if (durationMs <= 0) {
            setDraw(to)
            return
        }

        const t0 = performance.now()

        const step = (now: number) => {
            const elapsed = now - t0 - delayMs
            if (elapsed < 0) {
                setDraw(from)
                animRafRef.current = requestAnimationFrame(step)
                return
            }
            const u = Math.min(1, elapsed / durationMs)
            const e = applyEase(u, tr.ease)
            setDraw({
                start: from.start + (to.start - from.start) * e,
                end: from.end + (to.end - from.end) * e,
                width: from.width + (to.width - from.width) * e,
            })
            if (u < 1) {
                animRafRef.current = requestAnimationFrame(step)
            } else {
                animRafRef.current = 0
            }
        }

        animRafRef.current = requestAnimationFrame(step)
        return cancelRaf
    }, [
        strokeTarget.start,
        strokeTarget.end,
        widthTarget,
        transitionKey,
    ])

    const [svgPaths, setSvgPaths] = useState<string[]>([])
    const [pathLengths, setPathLengths] = useState<number[]>([])
    const [pathBounds, setPathBounds] = useState<PathBounds | null>(null)

    const viewBox = useMemo(() => viewBoxFromPathBounds(pathBounds), [pathBounds])

    useEffect(() => {
        let cancelled = false

        const setPathsAndLength = (
            paths: string[],
            lengths: number[],
            _longest: number,
            bounds: PathBounds | null
        ) => {
            if (!cancelled) {
                setSvgPaths(paths)
                setPathLengths(lengths)
                setPathBounds(bounds)
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
                        result.longestPathLength,
                        result.pathBounds
                    )
                })
                .catch(() => setPathsAndLength([], [], 0, null))
        } else if (inputType === "code" && svgCode) {
            const result = extractPathsFromSVG(svgCode)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength,
                result.pathBounds
            )
        } else {
            const result = extractPathsFromSVG(FALLBACK_SVG)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength,
                result.pathBounds
            )
        }

        return () => {
            cancelled = true
        }
    }, [inputType, svgFile, svgCode])

    const pathElements = svgPaths.map((pathData, pathIndex) => {
        const pathLength = pathLengths[pathIndex] ?? 0
        const { dasharray, dashoffset, hide } = segmentDash(
            pathLength,
            draw.start,
            draw.end
        )

        if (hide) return null

        return (
            <path
                key={pathIndex}
                d={pathData}
                stroke={strokeColor}
                strokeWidth={draw.width}
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
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: "block", overflow: "hidden" }}
            >
                <g>{pathElements}</g>
            </svg>
        </div>
    )
}

const svgTransitionDefaultProps: Partial<SvgTransitionProps> = {
    svgFile: "",
    svgCode: "",
    inputType: "file",
    strokeColor: "#fc5025",
    stroke: { start: 0, end: 100, width: 2 },
    lineCap: "round",
    lineJoin: "round",
    transition: {
        type: "tween",
        duration: 0.5,
        ease: "easeOut",
    },
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
    stroke: {
        type: ControlType.Object,
        title: "Stroke",
        controls: {
            start: {
                type: ControlType.Number,
                title: "Start",
                min: 0,
                max: 100,
                step: 1,
                defaultValue: 0,
            },
            end: {
                type: ControlType.Number,
                title: "End",
                min: 0,
                max: 100,
                step: 1,
                defaultValue: 100,
            },
            width: {
                type: ControlType.Number,
                title: "Width",
                min: 0,
                max: 1000,
                step: 0.5,
                defaultValue: 2,
            },
        },
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "tween",
            duration: 0.5,
            ease: "easeOut",
        },
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
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

SvgTransition.displayName = "SVG Transition"
