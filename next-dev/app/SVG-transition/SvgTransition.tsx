import React, { useEffect, useMemo, useState, useRef } from "react"
import {
    addPropertyControls,
    ControlType,
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

/** sRGB channels 0–1; alpha 0–1. */
export interface Rgba {
    r: number
    g: number
    b: number
    a: number
}

function clamp01Channel(n: number): number {
    return Math.max(0, Math.min(1, n))
}

/** Parse hex / rgb() / rgba() for interpolation. Returns null for hsl(), var(), named colors, etc. */
export function parseColorToRgba(input: string | undefined): Rgba | null {
    if (input == null) return null
    const s = String(input).trim()
    if (!s) return null

    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
        const r = parseInt(s[1] + s[1], 16) / 255
        const g = parseInt(s[2] + s[2], 16) / 255
        const b = parseInt(s[3] + s[3], 16) / 255
        return { r, g, b, a: 1 }
    }
    if (/^#[0-9a-fA-F]{6}$/.test(s)) {
        return {
            r: parseInt(s.slice(1, 3), 16) / 255,
            g: parseInt(s.slice(3, 5), 16) / 255,
            b: parseInt(s.slice(5, 7), 16) / 255,
            a: 1,
        }
    }
    if (/^#[0-9a-fA-F]{8}$/.test(s)) {
        return {
            r: parseInt(s.slice(1, 3), 16) / 255,
            g: parseInt(s.slice(3, 5), 16) / 255,
            b: parseInt(s.slice(5, 7), 16) / 255,
            a: parseInt(s.slice(7, 9), 16) / 255,
        }
    }

    const m = s.match(/^rgba?\(\s*([^)]+)\s*\)$/i)
    if (m) {
        const parts = m[1].split(",").map((p) => p.trim())
        if (parts.length < 3) return null
        const chan = (p: string): number => {
            if (p.endsWith("%")) {
                return clamp01Channel(parseFloat(p) / 100)
            }
            const v = parseFloat(p)
            if (Number.isNaN(v)) return 0
            return clamp01Channel(v / 255)
        }
        const alpha = (p: string): number => {
            if (p.endsWith("%")) {
                return clamp01Channel(parseFloat(p) / 100)
            }
            const v = parseFloat(p)
            if (Number.isNaN(v)) return 1
            return clamp01Channel(v)
        }
        const r = chan(parts[0])
        const g = chan(parts[1])
        const b = chan(parts[2])
        const a = parts.length >= 4 ? alpha(parts[3]) : 1
        return { r, g, b, a }
    }

    return null
}

function formatRgba(c: Rgba): string {
    const r = Math.round(clamp01Channel(c.r) * 255)
    const g = Math.round(clamp01Channel(c.g) * 255)
    const b = Math.round(clamp01Channel(c.b) * 255)
    const a = clamp01Channel(c.a)
    return `rgba(${r},${g},${b},${a})`
}

function colorsNearlyEqual(a: Rgba, b: Rgba, eps: number): boolean {
    return (
        Math.abs(a.r - b.r) < eps &&
        Math.abs(a.g - b.g) < eps &&
        Math.abs(a.b - b.b) < eps &&
        Math.abs(a.a - b.a) < eps
    )
}

function lerpColor(from: Rgba, to: Rgba, t: number): Rgba {
    const e = clamp01(t)
    return {
        r: from.r + (to.r - from.r) * e,
        g: from.g + (to.g - from.g) * e,
        b: from.b + (to.b - from.b) * e,
        a: from.a + (to.a - from.a) * e,
    }
}

function colorMotionSettled(
    current: Rgba | undefined,
    target: Rgba | null
): boolean {
    if (target == null) return current === undefined
    if (current == null) return false
    return colorsNearlyEqual(current, target, 1 / 255)
}

/** Parsed CSS padding for interpolation (Framer ControlType.Padding strings). */
export interface ParsedPadding {
    top: number
    right: number
    bottom: number
    left: number
    unit: string
}

function parsePadding(input: string | undefined): ParsedPadding {
    const raw = (input ?? "0px").trim()
    if (!raw) return { top: 0, right: 0, bottom: 0, left: 0, unit: "px" }
    const tokens = raw.split(/\s+/).filter(Boolean)
    const parseToken = (t: string): { n: number; unit: string } => {
        const m = t.match(/^(-?[\d.]+)\s*(px|rem|em|%)?$/i)
        if (!m) return { n: 0, unit: "px" }
        return {
            n: parseFloat(m[1]),
            unit: (m[2] || "px").toLowerCase(),
        }
    }
    const parts = tokens.map(parseToken)
    const u0 = parts[0]?.unit ?? "px"
    const n = (i: number) => parts[Math.min(i, parts.length - 1)]?.n ?? 0
    const u = (i: number) => parts[Math.min(i, parts.length - 1)]?.unit ?? u0
    let top: number
    let right: number
    let bottom: number
    let left: number
    let unit: string
    if (tokens.length === 1) {
        top = right = bottom = left = n(0)
        unit = u(0)
    } else if (tokens.length === 2) {
        top = bottom = n(0)
        right = left = n(1)
        unit = u(0) === u(1) ? u(0) : u0
    } else if (tokens.length === 3) {
        top = n(0)
        right = left = n(1)
        bottom = n(2)
        unit = u(0)
        if (u(1) !== unit || u(2) !== unit) unit = u0
    } else {
        top = n(0)
        right = n(1)
        bottom = n(2)
        left = n(3)
        unit = u(0)
        if (u(1) !== unit || u(2) !== unit || u(3) !== unit) unit = u0
    }
    return { top, right, bottom, left, unit }
}

function formatPadding(p: ParsedPadding): string {
    const { top, right, bottom, left, unit } = p
    const a = (n: number) => `${n}${unit}`
    if (top === right && right === bottom && bottom === left) return a(top)
    if (top === bottom && left === right) return `${a(top)} ${a(right)}`
    if (left === right) return `${a(top)} ${a(right)} ${a(bottom)}`
    return `${a(top)} ${a(right)} ${a(bottom)} ${a(left)}`
}

function paddingAnimatable(a: ParsedPadding, b: ParsedPadding): boolean {
    return a.unit === b.unit
}

function padsNearlyEqual(
    a: ParsedPadding,
    b: ParsedPadding,
    eps: number
): boolean {
    return (
        a.unit === b.unit &&
        Math.abs(a.top - b.top) < eps &&
        Math.abs(a.right - b.right) < eps &&
        Math.abs(a.bottom - b.bottom) < eps &&
        Math.abs(a.left - b.left) < eps
    )
}

function lerpPad(
    from: ParsedPadding,
    to: ParsedPadding,
    t: number
): ParsedPadding {
    const e = clamp01(t)
    return {
        top: from.top + (to.top - from.top) * e,
        right: from.right + (to.right - from.right) * e,
        bottom: from.bottom + (to.bottom - from.bottom) * e,
        left: from.left + (to.left - from.left) * e,
        unit: to.unit,
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
    return `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
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

/** Default SVG when the SVG field is empty (also default in props / panel). */
const DEFAULT_SVG_CODE = `<svg xmlns="http://www.w3.org/2000/svg" width="605.749" height="776" fill="none" overflow="visible"><path d="M 4.165 134.385 C 4.165 134.385 306.801 -53.203 315.665 14.885 C 324.53 82.972 -42.896 288.549 4.165 367 C 51.226 445.451 546.714 8.369 602.5 96.5 C 658.286 184.631 -23.924 627.076 55.5 706.5 C 134.924 785.924 545.448 441.948 593 489.5 C 640.552 537.052 465.839 731.988 526.5 776" fill="transparent" stroke="#AAA"></path></svg>`

const DEFAULT_STROKE: SvgStroke = {
    start: 0,
    end: 100,
    width: 2,
}

interface SvgTransitionProps {
    svgCode?: string
    strokeColor?: string
    stroke?: SvgStroke
    lineCap?: "round" | "butt" | "square"
    lineJoin?: "round" | "bevel" | "miter"
    /** Tween or spring when Stroke targets change. */
    transition?: SvgStrokeTransition
    /** CSS padding around the SVG (uniform or TRBL). */
    padding?: string
    style?: React.CSSProperties
}

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 320
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function SvgTransition(props: SvgTransitionProps) {
    const {
        svgCode,
        strokeColor = "#fc5025",
        stroke: strokeProp,
        lineCap = "round",
        lineJoin = "round",
        transition: transitionProp,
        padding = "0px",
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
    const paddingTarget = useMemo(() => parsePadding(padding), [padding])

    const [draw, setDraw] = useState({
        start: strokeTarget.start,
        end: strokeTarget.end,
        width: widthTarget,
        pad: paddingTarget,
        strokeRgba: parseColorToRgba(strokeColor) ?? undefined,
    })
    const drawRef = useRef(draw)
    drawRef.current = draw

    const animRafRef = useRef<number>(0)

    useEffect(() => {
        const toRgba = parseColorToRgba(strokeColor)
        const to = {
            start: strokeTarget.start,
            end: strokeTarget.end,
            width: widthTarget,
            pad: paddingTarget,
            strokeRgba: toRgba ?? undefined,
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
            Math.abs(from.width - to.width) < 1e-9 &&
            padsNearlyEqual(from.pad, to.pad, 1e-6) &&
            colorMotionSettled(from.strokeRgba, toRgba)
        ) {
            return
        }

        cancelRaf()

        const tr = transition
        const usePhysicsSpring =
            tr.type === "spring" && tr.duration === undefined
        const padOK = paddingAnimatable(from.pad, to.pad)
        const colorOK =
            toRgba != null &&
            from.strokeRgba != null

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
            let pt = from.pad.top
            let pr = from.pad.right
            let pb = from.pad.bottom
            let pl = from.pad.left
            let vpt = 0
            let vpr = 0
            let vpb = 0
            let vpl = 0
            let cr = from.strokeRgba?.r ?? 0
            let cg = from.strokeRgba?.g ?? 0
            let cb = from.strokeRgba?.b ?? 0
            let ca = from.strokeRgba?.a ?? 1
            let vcr = 0
            let vcg = 0
            let vcb = 0
            let vca = 0
            let last = performance.now()

            const step = (now: number) => {
                const dt = Math.min(0.064, Math.max(0.001, (now - last) / 1000))
                last = now
                ;[s0, v0] = springStep(s0, v0, to.start, stiffness, damping, mass, dt)
                ;[s1, v1] = springStep(s1, v1, to.end, stiffness, damping, mass, dt)
                ;[sw, vw] = springStep(sw, vw, to.width, stiffness, damping, mass, dt)
                if (padOK) {
                    ;[pt, vpt] = springStep(
                        pt,
                        vpt,
                        to.pad.top,
                        stiffness,
                        damping,
                        mass,
                        dt
                    )
                    ;[pr, vpr] = springStep(
                        pr,
                        vpr,
                        to.pad.right,
                        stiffness,
                        damping,
                        mass,
                        dt
                    )
                    ;[pb, vpb] = springStep(
                        pb,
                        vpb,
                        to.pad.bottom,
                        stiffness,
                        damping,
                        mass,
                        dt
                    )
                    ;[pl, vpl] = springStep(
                        pl,
                        vpl,
                        to.pad.left,
                        stiffness,
                        damping,
                        mass,
                        dt
                    )
                } else {
                    pt = to.pad.top
                    pr = to.pad.right
                    pb = to.pad.bottom
                    pl = to.pad.left
                }
                let strokeRgbaOut: Rgba | undefined
                if (toRgba == null) {
                    strokeRgbaOut = undefined
                } else if (colorOK) {
                    ;[cr, vcr] = springStep(cr, vcr, toRgba.r, stiffness, damping, mass, dt)
                    ;[cg, vcg] = springStep(cg, vcg, toRgba.g, stiffness, damping, mass, dt)
                    ;[cb, vcb] = springStep(cb, vcb, toRgba.b, stiffness, damping, mass, dt)
                    ;[ca, vca] = springStep(ca, vca, toRgba.a, stiffness, damping, mass, dt)
                    strokeRgbaOut = { r: cr, g: cg, b: cb, a: ca }
                } else {
                    strokeRgbaOut = toRgba
                }
                setDraw({
                    start: s0,
                    end: s1,
                    width: sw,
                    pad: {
                        top: pt,
                        right: pr,
                        bottom: pb,
                        left: pl,
                        unit: to.pad.unit,
                    },
                    strokeRgba: strokeRgbaOut,
                })

                const restD = tr.restDelta ?? SPRING_POS_THRESHOLD
                const restS = tr.restSpeed ?? SPRING_VEL_THRESHOLD
                let settled =
                    Math.abs(s0 - to.start) < restD &&
                    Math.abs(v0) < restS &&
                    Math.abs(s1 - to.end) < restD &&
                    Math.abs(v1) < restS &&
                    Math.abs(sw - to.width) < restD &&
                    Math.abs(vw) < restS
                if (padOK) {
                    settled =
                        settled &&
                        Math.abs(pt - to.pad.top) < restD &&
                        Math.abs(vpt) < restS &&
                        Math.abs(pr - to.pad.right) < restD &&
                        Math.abs(vpr) < restS &&
                        Math.abs(pb - to.pad.bottom) < restD &&
                        Math.abs(vpb) < restS &&
                        Math.abs(pl - to.pad.left) < restD &&
                        Math.abs(vpl) < restS
                }
                if (colorOK && toRgba) {
                    settled =
                        settled &&
                        Math.abs(cr - toRgba.r) < restD &&
                        Math.abs(vcr) < restS &&
                        Math.abs(cg - toRgba.g) < restD &&
                        Math.abs(vcg) < restS &&
                        Math.abs(cb - toRgba.b) < restD &&
                        Math.abs(vcb) < restS &&
                        Math.abs(ca - toRgba.a) < restD &&
                        Math.abs(vca) < restS
                }

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
            const nextPad = padOK ? lerpPad(from.pad, to.pad, e) : to.pad
            const nextStrokeRgba: Rgba | undefined =
                toRgba == null
                    ? undefined
                    : colorOK && from.strokeRgba
                      ? lerpColor(from.strokeRgba, toRgba, e)
                      : toRgba
            setDraw({
                start: from.start + (to.start - from.start) * e,
                end: from.end + (to.end - from.end) * e,
                width: from.width + (to.width - from.width) * e,
                pad: nextPad,
                strokeRgba: nextStrokeRgba,
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
        paddingTarget,
        strokeColor,
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

        const code =
            typeof svgCode === "string" && svgCode.trim()
                ? svgCode
                : DEFAULT_SVG_CODE
        const result = extractPathsFromSVG(code)
        setPathsAndLength(
            result.paths,
            result.lengths,
            result.longestPathLength,
            result.pathBounds
        )

        return () => {
            cancelled = true
        }
    }, [svgCode])

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
                stroke={
                    draw.strokeRgba != null
                        ? formatRgba(draw.strokeRgba)
                        : strokeColor
                }
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
                padding: formatPadding(draw.pad),
            }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: "block", overflow: "visible" }}
            >
                <g>{pathElements}</g>
            </svg>
        </div>
    )
}

const svgTransitionDefaultProps: Partial<SvgTransitionProps> = {
    svgCode: DEFAULT_SVG_CODE,
    strokeColor: "#fc5025",
    stroke: { start: 0, end: 100, width: 50 },
    lineCap: "round",
    lineJoin: "round",
    transition: {
        type: "tween",
        duration: 0.5,
        ease: "easeOut",
    },
    padding: "0px",
}
SvgTransition.defaultProps = svgTransitionDefaultProps

addPropertyControls(SvgTransition, {
    svgCode: {
        type: ControlType.String,
        title: "SVG",
        displayTextArea: true,
        defaultValue: DEFAULT_SVG_CODE,
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
                step: 1,
                defaultValue: 50,
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
    padding: {
        // @ts-ignore ControlType.Padding — supported in Framer; types may lag
        type: ControlType.Padding,
        title: "Padding",
        defaultValue: "0px",
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
    strokeColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#008CFF",
        description:
        "More components at [Framer University](https://frameruni.link/cc).",
    },
})

SvgTransition.displayName = "SVG Transition"
