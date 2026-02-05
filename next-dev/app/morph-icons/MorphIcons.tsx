import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import React, { useCallback, useMemo, useRef } from "react"

const DEFAULT_VIEWBOX = 14
const SAMPLE_POINTS = 8 // for flattening curves

/** A single line segment: start (x1,y1) to end (x2,y2) */
export interface LineSegment {
    x1: number
    y1: number
    x2: number
    y2: number
}

/** Parsed icon with N line segments */
export interface ParsedIcon {
    lines: LineSegment[]
}

/**
 * Parse SVG path "d" attribute to line segments.
 * Handles M, L, H, V, C, Q, Z. Flattens curves by sampling.
 */
function parsePathToSegments(
    d: string,
    viewBox: { width: number; height: number }
): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = []
    const tokens = d.trim().replace(/,/g, " ").split(/[\s]+/)
    let i = 0
    let x = 0,
        y = 0
    let startX = 0,
        startY = 0
    let cmd = ""
    let prevCmd = ""

    const next = (): number | undefined =>
        i < tokens.length ? parseFloat(tokens[i++]) : undefined
    const hasNext = (): boolean => i < tokens.length && !isNaN(parseFloat(tokens[i]))

    while (i < tokens.length) {
        const t = tokens[i]
        if (/^[MLHVCSQTAZ]$/i.test(t)) {
            cmd = t.toUpperCase()
            i++
        } else if (prevCmd) {
            cmd = prevCmd
        } else {
            break
        }
        prevCmd = cmd

        switch (cmd) {
            case "M": {
                const mx = next()
                const my = next()
                if (mx !== undefined && my !== undefined) {
                    x = mx
                    y = my
                    startX = x
                    startY = y
                    points.push({ x, y })
                }
                while (hasNext()) {
                    const lx = next()
                    const ly = next()
                    if (lx !== undefined && ly !== undefined) {
                        x = lx
                        y = ly
                        points.push({ x, y })
                    }
                }
                break
            }
            case "L": {
                while (hasNext()) {
                    const lx = next()
                    const ly = next()
                    if (lx !== undefined && ly !== undefined) {
                        x = lx
                        y = ly
                        points.push({ x, y })
                    }
                }
                break
            }
            case "H": {
                while (hasNext()) {
                    const hx = next()
                    if (hx !== undefined) {
                        x = hx
                        points.push({ x, y })
                    }
                }
                break
            }
            case "V": {
                while (hasNext()) {
                    const vy = next()
                    if (vy !== undefined) {
                        y = vy
                        points.push({ x, y })
                    }
                }
                break
            }
            case "C": {
                while (hasNext()) {
                    const x1 = next() ?? x
                    const y1 = next() ?? y
                    const x2 = next() ?? x
                    const y2 = next() ?? y
                    const ex = next()
                    const ey = next()
                    if (ex !== undefined && ey !== undefined) {
                        for (let k = 1; k <= SAMPLE_POINTS; k++) {
                            const t = k / SAMPLE_POINTS
                            const t2 = t * t
                            const t3 = t2 * t
                            const mt = 1 - t
                            const mt2 = mt * mt
                            const mt3 = mt2 * mt
                            const px =
                                mt3 * x +
                                3 * mt2 * t * x1 +
                                3 * mt * t2 * x2 +
                                t3 * ex
                            const py =
                                mt3 * y +
                                3 * mt2 * t * y1 +
                                3 * mt * t2 * y2 +
                                t3 * ey
                            points.push({ x: px, y: py })
                        }
                        x = ex
                        y = ey
                    }
                }
                break
            }
            case "Q": {
                while (hasNext()) {
                    const x1 = next() ?? x
                    const y1 = next() ?? y
                    const ex = next()
                    const ey = next()
                    if (ex !== undefined && ey !== undefined) {
                        for (let k = 1; k <= SAMPLE_POINTS; k++) {
                            const t = k / SAMPLE_POINTS
                            const mt = 1 - t
                            const px = mt * mt * x + 2 * mt * t * x1 + t * t * ex
                            const py = mt * mt * y + 2 * mt * t * y1 + t * t * ey
                            points.push({ x: px, y: py })
                        }
                        x = ex
                        y = ey
                    }
                }
                break
            }
            case "Z": {
                if (points.length > 0 && (x !== startX || y !== startY)) {
                    points.push({ x: startX, y: startY })
                }
                x = startX
                y = startY
                break
            }
            default:
                break
        }
    }
    return points
}

/** Extract viewBox from SVG string */
function getViewBox(svg: string): { x: number; y: number; width: number; height: number } {
    const vbMatch = svg.match(/viewBox\s*=\s*["']?\s*([\d.\s\-]+)["']?/i)
    if (vbMatch) {
        const parts = vbMatch[1].trim().split(/\s+/).map(Number)
        if (parts.length >= 4) {
            return {
                x: parts[0],
                y: parts[1],
                width: parts[2],
                height: parts[3],
            }
        }
    }
    const wMatch = svg.match(/\bwidth\s*=\s*["']?([\d.]+)/i)
    const hMatch = svg.match(/\bheight\s*=\s*["']?([\d.]+)/i)
    const w = wMatch ? parseFloat(wMatch[1]) : 24
    const h = hMatch ? parseFloat(hMatch[1]) : 24
    return { x: 0, y: 0, width: w, height: h }
}

/** Parse SVG transform string and return a function that transforms a point (for regex fallback) */
function parseTransform(transformStr: string | undefined): (x: number, y: number) => { x: number; y: number } {
    if (!transformStr || !transformStr.trim()) return (x, y) => ({ x, y })
    const ops: Array<{ type: string; values: number[] }> = []
    const regex = /(\w+)\s*\(\s*([^)]+)\s*\)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(transformStr)) !== null) {
        const values = match[2].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n))
        ops.push({ type: match[1].toLowerCase(), values })
    }
    if (ops.length === 0) return (x, y) => ({ x, y })
    return (x: number, y: number) => {
        let tx = x, ty = y
        for (const op of ops) {
            if (op.type === "translate") {
                tx += op.values[0] ?? 0
                ty += op.values[1] ?? 0
            } else if (op.type === "rotate") {
                const [angle = 0, cx = 0, cy = 0] = op.values
                const rad = (angle * Math.PI) / 180
                const cos = Math.cos(rad), sin = Math.sin(rad)
                const dx = tx - cx, dy = ty - cy
                tx = cx + dx * cos - dy * sin
                ty = cy + dx * sin + dy * cos
            } else if (op.type === "scale") {
                const [sx = 1, sy] = op.values
                const s = sy ?? sx
                tx *= sx
                ty *= s
            } else if (op.type === "matrix" && op.values.length >= 6) {
                const [a, b, c, d, e, f] = op.values
                tx = a * tx + c * ty + e
                ty = b * tx + d * ty + f
            }
        }
        return { x: tx, y: ty }
    }
}

/** Apply SVG matrix to a point */
function matrixTransform(
    m: { a: number; b: number; c: number; d: number; e: number; f: number },
    x: number,
    y: number
): { x: number; y: number } {
    return {
        x: m.a * x + m.c * y + m.e,
        y: m.b * x + m.d * y + m.f,
    }
}

/**
 * Parse SVG using browser DOM - correctly handles transforms, nested groups, etc.
 * Uses getCTM() which includes all ancestor transforms. Returns [] when DOM unavailable (SSR).
 */
function parseSvgWithDOM(
    svgString: string,
    vb: { x: number; y: number; width: number; height: number },
    normalize: (x: number, y: number) => { x: number; y: number }
): LineSegment[] {
    if (typeof document === "undefined" || typeof DOMParser === "undefined") return []

    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString.trim(), "image/svg+xml")
    let svgEl = doc.querySelector("svg") as SVGSVGElement | null
    if (!svgEl) return []

    if (!svgEl.hasAttribute("viewBox")) {
        svgEl.setAttribute("viewBox", `0 0 ${vb.width} ${vb.height}`)
    }
    svgEl.setAttribute("width", String(vb.width))
    svgEl.setAttribute("height", String(vb.height))
    svgEl.setAttribute(
        "style",
        "position:absolute;left:-9999px;visibility:hidden;pointer-events:none"
    )

    if (!document.body) return []

    document.body.appendChild(svgEl)

    const segments: LineSegment[] = []

    const collect = (el: Element) => {
        const ctm =
            "getCTM" in el && typeof (el as SVGGraphicsElement).getCTM === "function"
                ? (el as SVGGraphicsElement).getCTM()
                : null
        const m = ctm ? { a: ctm.a, b: ctm.b, c: ctm.c, d: ctm.d, e: ctm.e, f: ctm.f } : null

        if (el.tagName === "line") {
            const line = el as SVGLineElement
            const x1 = parseFloat(line.getAttribute("x1") ?? "0")
            const y1 = parseFloat(line.getAttribute("y1") ?? "0")
            const x2 = parseFloat(line.getAttribute("x2") ?? "0")
            const y2 = parseFloat(line.getAttribute("y2") ?? "0")
            const p1 = m ? matrixTransform(m, x1, y1) : { x: x1, y: y1 }
            const p2 = m ? matrixTransform(m, x2, y2) : { x: x2, y: y2 }
            const a = normalize(p1.x, p1.y)
            const b = normalize(p2.x, p2.y)
            segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
        } else if (el.tagName === "path") {
            const path = el as SVGPathElement
            const d = path.getAttribute("d")
            if (!d) return
            const pts = parsePathToSegments(d, vb)
            const pathLines = pointsToLines(pts, vb)
            pathLines.forEach((l) => {
                const p1 = m ? matrixTransform(m, l.x1, l.y1) : { x: l.x1, y: l.y1 }
                const p2 = m ? matrixTransform(m, l.x2, l.y2) : { x: l.x2, y: l.y2 }
                const a = normalize(p1.x, p1.y)
                const b = normalize(p2.x, p2.y)
                segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
            })
        } else if (el.tagName === "polyline") {
            const points = el.getAttribute("points")
            if (!points) return
            const coords = points.trim().split(/[\s,]+/).map(Number)
            const pts: { x: number; y: number }[] = []
            for (let i = 0; i < coords.length - 1; i += 2) {
                const x = coords[i]
                const y = coords[i + 1]
                pts.push(m ? matrixTransform(m, x, y) : { x, y })
            }
            for (let i = 0; i < pts.length - 1; i++) {
                const a = normalize(pts[i].x, pts[i].y)
                const b = normalize(pts[i + 1].x, pts[i + 1].y)
                segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
            }
        }

        for (const child of Array.from(el.children)) {
            collect(child)
        }
    }

    try {
        collect(svgEl)
    } finally {
        if (svgEl.parentNode) svgEl.parentNode.removeChild(svgEl)
    }
    return segments
}

/** Convert points array to line segments (consecutive pairs) */
function pointsToLines(
    points: { x: number; y: number }[],
    viewBox: { x: number; y: number; width: number; height: number }
): LineSegment[] {
    const lines: LineSegment[] = []
    for (let i = 0; i < points.length - 1; i++) {
        lines.push({
            x1: points[i].x,
            y1: points[i].y,
            x2: points[i + 1].x,
            y2: points[i + 1].y,
        })
    }
    return lines
}

/** Parse SVG string to array of line segments */
function parseSvgToLines(
    svgString: string,
    numLines: number,
    viewBoxSize: number = DEFAULT_VIEWBOX
): LineSegment[] {
    if (!svgString || typeof svgString !== "string") return []

    const svg = svgString.trim()
    const vb = getViewBox(svg)
    const vbSize = Math.max(vb.width, vb.height, 1)
    const scale = viewBoxSize / vbSize
    const ox = vb.x
    const oy = vb.y

    const normalize = (x: number, y: number) => ({
        x: (x - ox) * scale,
        y: (y - oy) * scale,
    })

    let allSegments: LineSegment[] = parseSvgWithDOM(svg, vb, normalize)

    if (allSegments.length === 0) {
        allSegments = []

        // <line x1="" y1="" x2="" y2="" transform="..."> - attributes can be in any order
    const lineRegex = /<line\s([^>]+)>/gi
    let m: RegExpExecArray | null
    while ((m = lineRegex.exec(svg)) !== null) {
        const attrs = m[1]
        const x1 = parseFloat(attrs.match(/\bx1\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const y1 = parseFloat(attrs.match(/\by1\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const x2 = parseFloat(attrs.match(/\bx2\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const y2 = parseFloat(attrs.match(/\by2\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const transformMatch = attrs.match(/\btransform\s*=\s*["']([^"']+)["']/i)
        const transform = parseTransform(transformMatch?.[1])
        const p1 = transform(x1, y1)
        const p2 = transform(x2, y2)
        const a = normalize(p1.x, p1.y)
        const b = normalize(p2.x, p2.y)
        allSegments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }

    // <path d="..." transform="...">
    const pathRegex = /<path\s([^>]+)>/gi
    while ((m = pathRegex.exec(svg)) !== null) {
        const attrs = m[1]
        const dMatch = attrs.match(/\bd\s*=\s*["']([^"']+)["']/i)
        if (!dMatch) continue
        const pts = parsePathToSegments(dMatch[1], vb)
        const pathLines = pointsToLines(pts, vb)
        const transformMatch = attrs.match(/\btransform\s*=\s*["']([^"']+)["']/i)
        const transform = parseTransform(transformMatch?.[1])
        pathLines.forEach((l) => {
            const p1 = transform(l.x1, l.y1)
            const p2 = transform(l.x2, l.y2)
            const a = normalize(p1.x, p1.y)
            const b = normalize(p2.x, p2.y)
            allSegments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
        })
    }

    // <polyline points="x1,y1 x2,y2 ..." transform="...">
    const polyRegex = /<polyline\s([^>]+)>/gi
    while ((m = polyRegex.exec(svg)) !== null) {
        const attrs = m[1]
        const pointsMatch = attrs.match(/\bpoints\s*=\s*["']([^"']+)["']/i)
        if (!pointsMatch) continue
        const pts = pointsMatch[1]
            .trim()
            .split(/[\s,]+/)
            .reduce<{ x: number; y: number }[]>((acc, val, idx, arr) => {
                if (idx % 2 === 1) {
                    acc.push({
                        x: parseFloat(arr[idx - 1]),
                        y: parseFloat(val),
                    })
                }
                return acc
            }, [])
        const polyLines = pointsToLines(pts, vb)
        const transformMatch = attrs.match(/\btransform\s*=\s*["']([^"']+)["']/i)
        const transform = parseTransform(transformMatch?.[1])
        polyLines.forEach((l) => {
            const p1 = transform(l.x1, l.y1)
            const p2 = transform(l.x2, l.y2)
            const a = normalize(p1.x, p1.y)
            const b = normalize(p2.x, p2.y)
            allSegments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
        })
    }
    }

    if (allSegments.length === 0) return []


    // Normalize to exactly numLines
    const center = viewBoxSize / 2
    const collapsed: LineSegment = {
        x1: center,
        y1: center,
        x2: center,
        y2: center,
    }

    if (allSegments.length === numLines) {
        return allSegments
    }
    if (allSegments.length < numLines) {
        const result = [...allSegments]
        while (result.length < numLines) {
            result.push({ ...collapsed })
        }
        return result
    }

    // More segments than needed: distribute/sample
    const result: LineSegment[] = []
    const step = allSegments.length / numLines
    for (let i = 0; i < numLines; i++) {
        const idx = Math.min(
            Math.floor(i * step),
            allSegments.length - 1
        )
        result.push({ ...allSegments[idx] })
    }
    return result
}

/** Default SVG icons: hamburger, cross (X), plus */
const DEFAULT_ICONS: Array<{ svg: string }> = [
    { svg: `<svg viewBox="0 0 14 14"><line x1="2" y1="4" x2="12" y2="4"/><line x1="2" y1="7" x2="12" y2="7"/><line x1="2" y1="10" x2="12" y2="10"/></svg>` },
    { svg: `<svg viewBox="0 0 14 14"><line x1="3.5" y1="3.5" x2="10.5" y2="10.5"/><line x1="10.5" y1="3.5" x2="3.5" y2="10.5"/></svg>` },
    { svg: `<svg viewBox="0 0 14 14"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>` },
]

type TransitionValue = {
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

type StrokeLinecap = "butt" | "round" | "square"

interface MorphIconsProps {
    currentIcon?: number
    icons?: Array<{ svg: string }>
    lineCount?: number
    strokeWidth?: number
    strokeColor?: string
    strokeLinecap?: StrokeLinecap
    transition?: TransitionValue
    style?: React.CSSProperties
}

/**
 * Morphing Icons - Framer Code Component
 * Connect a series of SVGs and morph between them using line interpolation.
 * Based on https://benji.org/morphing-icons-with-claude
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 48
 * @framerIntrinsicHeight 48
 * @framerDisableUnlink
 */
export default function MorphIcons(props: MorphIconsProps) {
    const {
        currentIcon: currentIconProp = 1,
        icons = [],
        lineCount = 3,
        strokeWidth = 2,
        strokeColor = "currentColor",
        strokeLinecap = "round",
        transition: transitionProp,
        style = {},
    } = props

    const transitionConfig = useMemo(() => {
        const t = transitionProp ?? { type: "tween" as const, duration: 0.35, ease: "easeInOut" }
        const config: Record<string, unknown> = {}
        if (t?.type === "spring") {
            config.type = "spring"
            if (t.stiffness !== undefined) config.stiffness = t.stiffness
            if (t.damping !== undefined) config.damping = t.damping
            if (t.mass !== undefined) config.mass = t.mass
            if (t.bounce !== undefined) config.bounce = t.bounce
            if (t.restDelta !== undefined) config.restDelta = t.restDelta
            if (t.restSpeed !== undefined) config.restSpeed = t.restSpeed
            if (t.duration !== undefined) config.duration = t.duration
        } else {
            config.type = t?.type || "tween"
            config.duration = t?.duration ?? 0.35
            if (t?.ease) config.ease = t.ease
            if (t?.delay !== undefined) config.delay = t.delay
        }
        return config
    }, [transitionProp])

    const clampedLineCount = Math.max(2, Math.min(5, lineCount))
    const iconList = useMemo(
        () =>
            icons.length > 0
                ? icons
                : DEFAULT_ICONS,
        [icons]
    )

    const parsedIcons = useMemo(() => {
        return iconList.map(
            (item): ParsedIcon => ({
                lines: parseSvgToLines(
                    typeof item === "string" ? item : item.svg,
                    clampedLineCount
                ),
            })
        )
    }, [iconList, clampedLineCount])

    const len = Math.max(1, parsedIcons.length)
    // currentIcon prop is 1-based: 1 = first icon, 3 = third icon (Icons[2])
    const currentIndex = Math.max(
        0,
        Math.min(Math.floor(currentIconProp) - 1, len - 1)
    )

    const prevIndexRef = useRef(currentIndex)
    const isTransitioning = prevIndexRef.current !== currentIndex
    const currentIcon = parsedIcons[currentIndex]
    const prevIcon = parsedIcons[prevIndexRef.current] ?? currentIcon

    const onMorphComplete = useCallback(() => {
        prevIndexRef.current = currentIndex
    }, [currentIndex])

    if (!isTransitioning) {
        prevIndexRef.current = currentIndex
    }

    if (!currentIcon || currentIcon.lines.length === 0) {
        return (
            <div
                style={{
                    ...style,
                    width: "100%",
                    height: "100%",
                    minWidth: DEFAULT_VIEWBOX * 2,
                    minHeight: DEFAULT_VIEWBOX * 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                Add SVGs to morph
            </div>
        )
    }

    const fromLines = isTransitioning && prevIcon ? prevIcon.lines : currentIcon.lines

    return (
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${DEFAULT_VIEWBOX} ${DEFAULT_VIEWBOX}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={strokeLinecap}
            strokeLinejoin="round"
            style={{
                ...style,
                width: "100%",
                height: "100%",
                overflow: "visible",
            }}
        >
            {currentIcon.lines.map((line, i) => {
                const from = fromLines[i] ?? fromLines[0] ?? line
                return (
                    <motion.line
                        key={i}
                        initial={
                            isTransitioning
                                ? { x1: from.x1, y1: from.y1, x2: from.x2, y2: from.y2 }
                                : false
                        }
                        animate={{
                            x1: line.x1,
                            y1: line.y1,
                            x2: line.x2,
                            y2: line.y2,
                        }}
                        transition={transitionConfig}
                        onAnimationComplete={i === currentIcon.lines.length - 1 ? onMorphComplete : undefined}
                    />
                )
            })}
        </motion.svg>
    )
}

MorphIcons.defaultProps = {
    currentIcon: 1,
    icons: [],
    lineCount: 3,
    strokeWidth: 2,
    strokeColor: "currentColor",
    strokeLinecap: "round" as StrokeLinecap,
}

addPropertyControls(MorphIcons, {
    currentIcon: {
        type: ControlType.Number,
        title: "Current icon",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 1,
        description: "1 = first icon, 2 = second, 3 = third… Change via variants to morph.",
    },
    icons: {
        type: ControlType.Array,
        title: "Icons",
        control: {
            type: ControlType.Object,
            //@ts-ignore - Framer supports maxCount
            maxCount: 10,
            controls: {
                svg: {
                    type: ControlType.String,
                    title: "SVG",
                    displayTextArea: true,
                    placeholder: '<svg viewBox="0 0 14 14"><line x1="2" y1="4" x2="12" y2="4"/>...</svg>',
                },
            },
        },
        defaultValue: DEFAULT_ICONS,
    },
    lineCount: {
        type: ControlType.Number,
        title: "Lines",
        min: 2,
        max: 5,
        step: 1,
        defaultValue: 3,
        description: "All SVGs must have the same number of lines",
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Stroke",
        min: 0.5,
        max: 4,
        step: 0.25,
        defaultValue: 2,
        unit: "px",
    },
    strokeColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
    },
    strokeLinecap: {
        type: ControlType.Enum,
        title: "Stroke Cap",
        options: ["butt", "round", "square"],
        optionTitles: ["Butt", "Round", "Square"],
        defaultValue: "round",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "tween",
            duration: 0.35,
            ease: "easeInOut",
        },
    },
})
