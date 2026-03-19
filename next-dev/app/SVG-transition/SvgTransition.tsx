import React, { useEffect, useMemo, useState, useRef } from "react"
import {
    addPropertyControls,
    ControlType,
    FileControlDescription,
    RenderTarget,
} from "framer"

/** Set to `false` when you are done debugging. Or in the browser console: `window.__SVG_TRANSITION_DEBUG__ = false` */
const SVG_TRANSITION_DEBUG = true

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** Path trim along length, 0–100 (variant-interpolatable in Framer). */
export interface StrokeTrim {
    start?: number
    end?: number
}

function clampPct(n: number): number {
    if (typeof n !== "number" || Number.isNaN(n)) return 0
    return Math.max(0, Math.min(100, n))
}

function normalizeStroke(s?: StrokeTrim): { start: number; end: number } {
    return {
        start: clampPct(s?.start ?? 0),
        end: clampPct(s?.end ?? 100),
    }
}

function easeOutCubic(t: number): number {
    const x = clamp01(t)
    return 1 - (1 - x) ** 3
}

function isFramerCanvas(): boolean {
    try {
        return RenderTarget.current() === RenderTarget.canvas
    } catch {
        return false
    }
}

/** Dash pattern: visible only from start%→end% of path length (in path direction). */
function segmentDash(L: number, startPct: number, endPct: number): { dasharray: string; dashoffset: number } {
    if (L <= 0) return { dasharray: "1", dashoffset: 0 }
    const s = clamp01(startPct / 100)
    const e = clamp01(endPct / 100)
    const lo = Math.min(s, e)
    const hi = Math.max(s, e)
    const gapBefore = lo * L
    const dashLen = Math.max(0, (hi - lo) * L)
    const gapAfter = (1 - hi) * L
    return {
        dasharray: `0 ${gapBefore} ${dashLen} ${gapAfter}`,
        dashoffset: 0,
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

const DEFAULT_STROKE_TRIM: StrokeTrim = {
    start: 0,
    end: 100,
}

interface SvgTransitionProps {
    svgFile?: string
    svgCode?: string
    inputType?: "file" | "code"
    strokeColor?: string
    strokeWidth?: number
    /** Path trim start 0–100. Top-level numbers tween between variants; prefer over nested `stroke`. */
    trimStart?: number
    /** Path trim end 0–100. */
    trimEnd?: number
    /** Legacy: Framer often does not interpolate nested objects between variants — use Trim Start/End. */
    stroke?: StrokeTrim
    lineCap?: "round" | "butt" | "square"
    lineJoin?: "round" | "bevel" | "miter"
    /** Seconds to ease trim + width when props change (0 = snap). */
    drawDuration?: number
    /** Log prop / layout changes to the console (same as SVG_TRANSITION_DEBUG in code). */
    debug?: boolean
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
        trimStart,
        trimEnd,
        stroke: strokeProp,
        lineCap = "round",
        lineJoin = "round",
        drawDuration = 0.5,
        debug: debugProp,
        style,
    } = props

    const debugOn =
        SVG_TRANSITION_DEBUG &&
        debugProp !== false &&
        (typeof window === "undefined" ||
            (window as unknown as { __SVG_TRANSITION_DEBUG__?: boolean })
                .__SVG_TRANSITION_DEBUG__ !== false)

    const instanceIdRef = useRef(
        `i-${Math.random().toString(36).slice(2, 9)}`
    )
    const debugOnRef = useRef(debugOn)
    debugOnRef.current = debugOn

    const log = (...args: unknown[]) => {
        if (!debugOnRef.current) return
        // eslint-disable-next-line no-console
        console.log("[SvgTransition]", instanceIdRef.current, ...args)
    }

    // Prop targets (Framer may jump these; we ease in draw state below).
    const strokeTarget = normalizeStroke({
        start: trimStart ?? strokeProp?.start ?? DEFAULT_STROKE_TRIM.start,
        end: trimEnd ?? strokeProp?.end ?? DEFAULT_STROKE_TRIM.end,
    })
    const widthTarget =
        typeof strokeWidth === "number" && !Number.isNaN(strokeWidth)
            ? Math.max(0, strokeWidth)
            : 2

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

        const durationSec = Math.max(0, drawDuration)
        const durationMs = durationSec * 1000
        if (durationMs <= 0) {
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
        const t0 = performance.now()

        const step = (now: number) => {
            const t = Math.min(1, (now - t0) / durationMs)
            const e = easeOutCubic(t)
            setDraw({
                start: from.start + (to.start - from.start) * e,
                end: from.end + (to.end - from.end) * e,
                width: from.width + (to.width - from.width) * e,
            })
            if (t < 1) {
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
        drawDuration,
    ])

    const lastSnapshotRef = useRef<string>("")
    const renderCountRef = useRef(0)
    renderCountRef.current += 1

    const [svgPaths, setSvgPaths] = useState<string[]>([])
    const [pathLengths, setPathLengths] = useState<number[]>([])
    const [pathBounds, setPathBounds] = useState<PathBounds | null>(null)

    const viewBox = useMemo(() => viewBoxFromPathBounds(pathBounds), [pathBounds])

    // Log whenever the *effective* draw inputs change (catches missing Framer interpolation).
    if (debugOn) {
        const snapshot = JSON.stringify({
            r: renderCountRef.current,
            trimStart: trimStart ?? null,
            trimEnd: trimEnd ?? null,
            strokeRaw: strokeProp ?? null,
            targetStart: strokeTarget.start,
            targetEnd: strokeTarget.end,
            targetWidth: widthTarget,
            drawStart: draw.start,
            drawEnd: draw.end,
            drawWidth: draw.width,
            viewBox,
            pathBounds,
            pathCount: svgPaths.length,
            firstLen: pathLengths[0] ?? 0,
        })
        if (snapshot !== lastSnapshotRef.current) {
            lastSnapshotRef.current = snapshot
            // eslint-disable-next-line no-console
            console.log("[SvgTransition]", instanceIdRef.current, "draw snapshot", JSON.parse(snapshot))
        }
    }

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

    useEffect(() => {
        if (!debugOn) return
        log("mounted")
        return () => log("unmounted")
        // eslint-disable-next-line react-hooks/exhaustive-deps -- log is stable; only re-run when debug toggles
    }, [debugOn])

    useEffect(() => {
        if (!debugOn) return
        log("paths updated", {
            count: svgPaths.length,
            lengths: pathLengths.slice(0, 3),
            lengthsSum: pathLengths.reduce((a, b) => a + b, 0),
            pathBounds,
            viewBox,
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [svgPaths, pathLengths, debugOn])

    const pathElements = svgPaths.map((pathData, pathIndex) => {
        const pathLength = pathLengths[pathIndex] ?? 0
        const { dasharray, dashoffset } = segmentDash(
            pathLength,
            draw.start,
            draw.end
        )

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
    strokeWidth: 2,
    trimStart: 0,
    trimEnd: 100,
    lineCap: "round",
    lineJoin: "round",
    drawDuration: 0.5,
    debug: false,
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
    trimStart: {
        type: ControlType.Number,
        title: "Start",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 0,
    },
    trimEnd: {
        type: ControlType.Number,
        title: "End",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 100,
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 0,
        max: 1000,
        step: 0.5,
        defaultValue: 2,
    },
    drawDuration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0,
        max: 5,
        step: 0.05,
        defaultValue: 0.5,
        displayStepper: true,
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
    debug: {
        type: ControlType.Boolean,
        title: "Debug",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        description:
            "Console logs for trim/viewBox. More components at [Framer University](https://frameruni.link/cc).",
    },
})

SvgTransition.displayName = "SVG Transition"
