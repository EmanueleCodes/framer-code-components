import { addPropertyControls, ControlType } from "framer"
import React, { useEffect, useLayoutEffect, useRef, useMemo, useId } from "react"

// Local bundle: GSAP + MorphSVGPlugin (see custom-bundle-gsap/gsap-morph-svg)
// Build with: cd custom-bundle-gsap/gsap-morph-svg && npm run build
import { gsap, MorphSVGPlugin } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/morph.js"

gsap.registerPlugin(MorphSVGPlugin)

const DEFAULT_VIEWBOX = 24

/** Extract viewBox from SVG string */
function getViewBox(svg: string): { x: number; y: number; width: number; height: number } {
    const vbMatch = svg.match(/viewBox\s*=\s*["']?\s*([\d.\s\-]+)["']?/i)
    if (vbMatch) {
        const parts = vbMatch[1].trim().split(/\s+/).map(Number)
        if (parts.length >= 4) {
            return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
        }
    }
    const wMatch = svg.match(/\bwidth\s*=\s*["']?([\d.]+)/i)
    const hMatch = svg.match(/\bheight\s*=\s*["']?([\d.]+)/i)
    const w = wMatch ? parseFloat(wMatch[1]) : 24
    const h = hMatch ? parseFloat(hMatch[1]) : 24
    return { x: 0, y: 0, width: w, height: h }
}

/**
 * Extract all path data from an SVG string.
 * Converts <line>, <polyline>, <polygon>, <rect>, <circle>, <ellipse> to path d strings.
 * Returns array of { d, fill, stroke } for each shape.
 */
function extractPaths(svgString: string): Array<{ d: string; fill?: string; stroke?: string }> {
    if (!svgString || typeof svgString !== "string") return []
    
    const paths: Array<{ d: string; fill?: string; stroke?: string }> = []
    
    // Extract <path> elements
    const pathRegex = /<path\s+([^>]*)>/gi
    let match: RegExpExecArray | null
    while ((match = pathRegex.exec(svgString)) !== null) {
        const attrs = match[1]
        const dMatch = attrs.match(/\bd\s*=\s*["']([^"']+)["']/i)
        if (dMatch) {
            const fill = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/i)?.[1]
            const stroke = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/i)?.[1]
            paths.push({ d: dMatch[1], fill, stroke })
        }
    }
    
    // Extract <line> elements and convert to path
    const lineRegex = /<line\s+([^>]*)>/gi
    while ((match = lineRegex.exec(svgString)) !== null) {
        const attrs = match[1]
        const x1 = parseFloat(attrs.match(/\bx1\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const y1 = parseFloat(attrs.match(/\by1\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const x2 = parseFloat(attrs.match(/\bx2\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const y2 = parseFloat(attrs.match(/\by2\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const stroke = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/i)?.[1]
        paths.push({ d: `M${x1},${y1} L${x2},${y2}`, stroke })
    }
    
    // Extract <polyline> elements and convert to path
    const polylineRegex = /<polyline\s+([^>]*)>/gi
    while ((match = polylineRegex.exec(svgString)) !== null) {
        const attrs = match[1]
        const pointsMatch = attrs.match(/\bpoints\s*=\s*["']([^"']+)["']/i)
        if (pointsMatch) {
            const coords = pointsMatch[1].trim().split(/[\s,]+/).map(Number)
            if (coords.length >= 4) {
                let d = `M${coords[0]},${coords[1]}`
                for (let i = 2; i < coords.length - 1; i += 2) {
                    d += ` L${coords[i]},${coords[i + 1]}`
                }
                const stroke = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/i)?.[1]
                const fill = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/i)?.[1]
                paths.push({ d, stroke, fill })
            }
        }
    }
    
    // Extract <polygon> elements and convert to path
    const polygonRegex = /<polygon\s+([^>]*)>/gi
    while ((match = polygonRegex.exec(svgString)) !== null) {
        const attrs = match[1]
        const pointsMatch = attrs.match(/\bpoints\s*=\s*["']([^"']+)["']/i)
        if (pointsMatch) {
            const coords = pointsMatch[1].trim().split(/[\s,]+/).map(Number)
            if (coords.length >= 4) {
                let d = `M${coords[0]},${coords[1]}`
                for (let i = 2; i < coords.length - 1; i += 2) {
                    d += ` L${coords[i]},${coords[i + 1]}`
                }
                d += " Z"
                const stroke = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/i)?.[1]
                const fill = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/i)?.[1]
                paths.push({ d, stroke, fill })
            }
        }
    }
    
    // Extract <rect> elements and convert to path
    const rectRegex = /<rect\s+([^>]*)>/gi
    while ((match = rectRegex.exec(svgString)) !== null) {
        const attrs = match[1]
        const x = parseFloat(attrs.match(/\bx\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const y = parseFloat(attrs.match(/\by\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const w = parseFloat(attrs.match(/\bwidth\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const h = parseFloat(attrs.match(/\bheight\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const rx = parseFloat(attrs.match(/\brx\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const ry = parseFloat(attrs.match(/\bry\s*=\s*["']?([\d.-]+)/i)?.[1] ?? rx.toString())
        
        let d: string
        if (rx > 0 || ry > 0) {
            // Rounded rect
            const r = Math.min(rx, w / 2, h / 2)
            d = `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`
        } else {
            d = `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`
        }
        const stroke = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/i)?.[1]
        const fill = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/i)?.[1]
        paths.push({ d, stroke, fill })
    }
    
    // Extract <circle> elements and convert to path
    const circleRegex = /<circle\s+([^>]*)>/gi
    while ((match = circleRegex.exec(svgString)) !== null) {
        const attrs = match[1]
        const cx = parseFloat(attrs.match(/\bcx\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const cy = parseFloat(attrs.match(/\bcy\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const r = parseFloat(attrs.match(/\br\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        // Circle as two arcs
        const d = `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`
        const stroke = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/i)?.[1]
        const fill = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/i)?.[1]
        paths.push({ d, stroke, fill })
    }
    
    // Extract <ellipse> elements and convert to path
    const ellipseRegex = /<ellipse\s+([^>]*)>/gi
    while ((match = ellipseRegex.exec(svgString)) !== null) {
        const attrs = match[1]
        const cx = parseFloat(attrs.match(/\bcx\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const cy = parseFloat(attrs.match(/\bcy\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const rx = parseFloat(attrs.match(/\brx\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const ry = parseFloat(attrs.match(/\bry\s*=\s*["']?([\d.-]+)/i)?.[1] ?? "0")
        const d = `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`
        const stroke = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/i)?.[1]
        const fill = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/i)?.[1]
        paths.push({ d, stroke, fill })
    }
    
    return paths
}

/** Normalize viewBox coordinates to target size */
function normalizePathToViewBox(
    d: string,
    sourceVb: { x: number; y: number; width: number; height: number },
    targetSize: number
): string {
    const scale = targetSize / Math.max(sourceVb.width, sourceVb.height, 1)
    const ox = sourceVb.x
    const oy = sourceVb.y
    
    // Simple numeric replacement - works for most paths
    // For complex transforms, use MorphSVGPlugin.convertToPath in the browser
    return d.replace(/-?[\d.]+/g, (match, offset, str) => {
        const num = parseFloat(match)
        if (isNaN(num)) return match
        
        // Determine if this is an x or y coordinate based on position in command
        // This is a simplified heuristic
        const before = str.slice(0, offset)
        const lastCmd = before.match(/[MLHVCSQTAZ]/gi)?.pop()?.toUpperCase()
        
        if (lastCmd === "H") {
            return String((num - ox) * scale)
        } else if (lastCmd === "V") {
            return String((num - oy) * scale)
        }
        
        // For other commands, scale all numbers uniformly
        // This works well for most SVGs but may need refinement for edge cases
        return String(num * scale)
    })
}

/** Default SVG icons with different complexity */
const DEFAULT_ICONS: Array<{ svg: string }> = [
    // Hamburger menu (3 lines)
    { svg: `<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` },
    // X/Close (2 lines forming X)
    { svg: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` },
    // Arrow right
    { svg: `<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
]

type StrokeLinecap = "butt" | "round" | "square"

interface MorphIconsGsapProps {
    currentIcon?: number
    icons?: Array<{ svg: string }>
    strokeWidth?: number
    strokeColor?: string
    fillColor?: string
    strokeLinecap?: StrokeLinecap
    duration?: number
    ease?: string
    style?: React.CSSProperties
}

/**
 * Morphing Icons (GSAP) - Framer Code Component
 * Uses GSAP MorphSVGPlugin only (no framer-motion). Paths are driven by GSAP during transition.
 * For morphing to run: (1) MorphSVGPlugin must load from the bundle/CDN; (2) use one component
 * instance and change Current Icon via interaction (e.g. variant or variable), not one instance per variant.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 48
 * @framerIntrinsicHeight 48
 * @framerDisableUnlink
 */
export default function MorphIconsGsap(props: MorphIconsGsapProps) {
    const {
        currentIcon: currentIconProp = 1,
        icons = [],
        strokeWidth = 2,
        strokeColor = "currentColor",
        fillColor = "none",
        strokeLinecap = "round",
        duration = 0.35,
        ease = "power2.inOut",
        style = {},
    } = props

    const uniqueId = useId()
    const svgRef = useRef<SVGSVGElement>(null)
    const pathRefs = useRef<(SVGPathElement | null)[]>([])
    const tweenRefs = useRef<Array<{ kill: () => void }>>([])

    const iconList = useMemo(
        () => (icons.length > 0 ? icons : DEFAULT_ICONS),
        [icons]
    )

    // Parse all icons to extract paths
    const parsedIcons = useMemo(() => {
        return iconList.map((item) => {
            const svg = typeof item === "string" ? item : item.svg
            const vb = getViewBox(svg)
            const paths = extractPaths(svg)
            return { paths, viewBox: vb }
        })
    }, [iconList])

    const maxPaths = useMemo(() => {
        return Math.max(1, ...parsedIcons.map((icon) => icon.paths.length))
    }, [parsedIcons])

    const len = Math.max(1, parsedIcons.length)
    const currentIndex = Math.max(0, Math.min(Math.floor(currentIconProp) - 1, len - 1))
    const prevIndexRef = useRef(currentIndex)
    const isTransitioning = prevIndexRef.current !== currentIndex
    const currentIcon = parsedIcons[currentIndex]
    const prevIcon = parsedIcons[prevIndexRef.current] ?? currentIcon

    // Get padded paths for an icon
    const getPaths = (iconData: typeof currentIcon) => {
        const paths = iconData?.paths || []
        const result: Array<{ d: string; fill?: string; stroke?: string }> = []
        for (let i = 0; i < maxPaths; i++) {
            if (i < paths.length) {
                result.push(paths[i])
            } else {
                result.push({ 
                    d: `M${DEFAULT_VIEWBOX / 2},${DEFAULT_VIEWBOX / 2} L${DEFAULT_VIEWBOX / 2},${DEFAULT_VIEWBOX / 2}`, 
                    stroke: "none", 
                    fill: "none" 
                })
            }
        }
        return result
    }

    const currentPaths = getPaths(currentIcon)
    const fromPaths = getPaths(prevIcon)

    // MorphSVGPlugin is required for morphing. CDN import may fail in Framer → instant switch.
    const hasMorphPlugin = useMemo(() => {
        try {
            return (
                typeof MorphSVGPlugin === "object" &&
                MorphSVGPlugin !== null &&
                "getRawPath" in (MorphSVGPlugin as object)
            )
        } catch {
            return false
        }
    }, [])

    // When NOT transitioning: React controls path d. When transitioning: GSAP controls it (don't pass d).
    const pathD = isTransitioning ? undefined : currentPaths

    // Animate paths when currentIndex changes (GSAP only — no framer-motion here)
    useLayoutEffect(() => {
        if (prevIndexRef.current === currentIndex) return

        const prevPaths = getPaths(parsedIcons[prevIndexRef.current] ?? currentIcon)

        // Kill existing tweens
        tweenRefs.current.forEach((t) => t.kill())
        tweenRefs.current = []

        const gsapTo = gsap.to.bind(gsap) as (
            target: object,
            vars: Record<string, unknown>
        ) => { kill: () => void }

        if (hasMorphPlugin) {
            pathRefs.current.forEach((pathEl, i) => {
                if (!pathEl || !currentPaths[i]) return
                // Start from previous icon so morph has a known start state
                pathEl.setAttribute("d", prevPaths[i].d)
                const tween = gsapTo(pathEl, {
                    duration,
                    ease,
                    morphSVG: {
                        shape: currentPaths[i].d,
                        type: "rotational",
                        origin: "50% 50%",
                    },
                    onComplete:
                        i === currentPaths.length - 1
                            ? () => {
                                  prevIndexRef.current = currentIndex
                              }
                            : undefined,
                })
                tweenRefs.current.push(tween)
            })
        } else {
            pathRefs.current.forEach((pathEl, i) => {
                if (pathEl && currentPaths[i]) pathEl.setAttribute("d", currentPaths[i].d)
            })
            prevIndexRef.current = currentIndex
        }
    }, [currentIndex, currentPaths, duration, ease, hasMorphPlugin, parsedIcons, currentIcon])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            tweenRefs.current.forEach((tween) => tween.kill())
        }
    }, [])

    if (!currentIcon || currentIcon.paths.length === 0) {
        return (
            <div
                style={{
                    ...style,
                    width: "100%",
                    height: "100%",
                    minWidth: 48,
                    minHeight: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                Add SVGs to morph
            </div>
        )
    }

    return (
        <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${DEFAULT_VIEWBOX} ${DEFAULT_VIEWBOX}`}
            fill={fillColor}
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
            {currentPaths.map((pathData, i) => (
                <path
                    key={`${uniqueId}-path-${i}`}
                    ref={(el) => {
                        pathRefs.current[i] = el
                    }}
                    d={pathD !== undefined ? pathD[i].d : undefined}
                    fill={pathData.fill || fillColor}
                    stroke={pathData.stroke || strokeColor}
                />
            ))}
        </svg>
    )
}

MorphIconsGsap.defaultProps = {
    currentIcon: 1,
    icons: [],
    strokeWidth: 2,
    strokeColor: "currentColor",
    fillColor: "none",
    strokeLinecap: "round" as StrokeLinecap,
    duration: 0.35,
    ease: "power2.inOut",
}

addPropertyControls(MorphIconsGsap, {
    currentIcon: {
        type: ControlType.Number,
        title: "Current Icon",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 1,
        description: "1 = first icon, 2 = second, etc. Use one instance and change this via interaction (e.g. variant) to morph.",
    },
    icons: {
        type: ControlType.Array,
        title: "Icons",
        control: {
            type: ControlType.Object,
            controls: {
                svg: {
                    type: ControlType.String,
                    title: "SVG",
                    displayTextArea: true,
                    placeholder: '<svg viewBox="0 0 24 24"><path d="M3 6h18..."/></svg>',
                },
            },
        },
        defaultValue: DEFAULT_ICONS,
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Stroke Width",
        min: 0.5,
        max: 6,
        step: 0.5,
        defaultValue: 2,
        unit: "px",
    },
    strokeColor: {
        type: ControlType.Color,
        title: "Stroke Color",
        defaultValue: "#000000",
    },
    fillColor: {
        type: ControlType.Color,
        title: "Fill Color",
        defaultValue: "rgba(0,0,0,0)",
    },
    strokeLinecap: {
        type: ControlType.Enum,
        title: "Stroke Cap",
        options: ["butt", "round", "square"],
        optionTitles: ["Butt", "Round", "Square"],
        defaultValue: "round",
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 2,
        step: 0.05,
        defaultValue: 0.35,
        unit: "s",
    },
    ease: {
        type: ControlType.Enum,
        title: "Ease",
        options: [
            "none",
            "power1.inOut",
            "power2.inOut",
            "power3.inOut",
            "power4.inOut",
            "back.inOut",
            "elastic.out",
            "bounce.out",
            "circ.inOut",
            "expo.inOut",
        ],
        optionTitles: [
            "Linear",
            "Power1",
            "Power2",
            "Power3",
            "Power4",
            "Back",
            "Elastic",
            "Bounce",
            "Circ",
            "Expo",
        ],
        defaultValue: "power2.inOut",
    },
})
