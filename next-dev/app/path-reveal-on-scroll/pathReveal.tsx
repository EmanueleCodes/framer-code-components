import React, { useEffect, useLayoutEffect } from "react"
import { motion, useTransform, useMotionValue } from "framer-motion"
import {
    addPropertyControls,
    ControlType,
    FileControlDescription,
    RenderTarget,
} from "framer"

// Helper function to clamp a number between 0 and 1
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Extracts all path elements from SVG content and measures their precise lengths
 * This is crucial for accurate animation timing and sizing
 */
const extractPathsFromSVG = (
    svgContent: string
): {
    paths: string[]
    lengths: number[]
    longestPathLength: number
    maxPathWidth: number
    maxPathHeight: number
} => {
    // Parse SVG content into DOM elements
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")
    const pathElements = Array.from(svgDoc.querySelectorAll("path"))

    // Extract the "d" attribute (path data) from each path element
    const paths = pathElements
        .map((p) => p.getAttribute("d"))
        .filter((d): d is string => !!d)

    // Measure each path's length and dimensions for accurate animation
    const lengths: number[] = []
    let longestPathLength = 0
    let maxPathWidth = 0
    let maxPathHeight = 0

    if (pathElements.length > 0) {
        // Create a temporary hidden SVG to measure path lengths
        const tempSvg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        )
        tempSvg.style.position = "absolute"
        tempSvg.style.visibility = "hidden"
        document.body.appendChild(tempSvg)

        // Measure each individual path
        pathElements.forEach((pathEl) => {
            const tempPath = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            )
            tempPath.setAttribute("d", pathEl.getAttribute("d") || "")
            tempSvg.appendChild(tempPath)

            // Get the precise length of this path
            const pathLength = tempPath.getTotalLength()
            lengths.push(pathLength)
            longestPathLength = Math.max(longestPathLength, pathLength)

            // Get the bounding box for sizing calculations
            const boundingBox = tempPath.getBBox()
            maxPathWidth = Math.max(maxPathWidth, boundingBox.width)
            maxPathHeight = Math.max(maxPathHeight, boundingBox.height)
        })

        // Clean up temporary SVG
        document.body.removeChild(tempSvg)
    }

    // Return all extracted data for animation and sizing
    return { paths, lengths, longestPathLength, maxPathWidth, maxPathHeight }
}

// Default SVG icon (star) used when no SVG is provided by the user
const FALLBACK_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.4952 18.5868L16.5874 20.7373C16.7603 20.8282 16.9552 20.8688 17.15 20.8544C17.3448 20.84 17.5316 20.7713 17.6893 20.656C17.847 20.5408 17.9692 20.3836 18.042 20.2023C18.1148 20.0211 18.1352 19.823 18.1011 19.6307L17.3181 15.0792C17.289 14.9114 17.3013 14.739 17.3541 14.577C17.4069 14.4151 17.4984 14.2685 17.6209 14.1501L20.9301 10.9243C21.0709 10.7888 21.1707 10.6166 21.2184 10.4271C21.2661 10.2377 21.2597 10.0387 21.1999 9.8527C21.14 9.66672 21.0292 9.50127 20.8801 9.37514C20.7309 9.24902 20.5493 9.16728 20.356 9.13923L15.7836 8.48155C15.6163 8.45643 15.4577 8.39105 15.3213 8.29103C15.1849 8.19102 15.0749 8.05936 15.0006 7.90739L12.9128 3.73168C12.8273 3.55518 12.6938 3.40633 12.5276 3.30218C12.3615 3.19803 12.1693 3.14279 11.9732 3.14279C11.7771 3.14279 11.585 3.19803 11.4188 3.30218C11.2526 3.40633 11.1192 3.55518 11.0337 3.73168L8.94584 7.90739C8.87161 8.05936 8.76156 8.19102 8.62518 8.29103C8.48879 8.39105 8.33015 8.45643 8.16289 8.48155L3.65312 9.13923C3.45894 9.16566 3.27611 9.24622 3.12556 9.37169C2.97502 9.49716 2.86283 9.66248 2.80183 9.84872C2.74084 10.035 2.73351 10.2346 2.78067 10.4248C2.82783 10.6151 2.92759 10.7882 3.06853 10.9243L6.37778 14.1501C6.5002 14.2685 6.5918 14.4151 6.64457 14.577C6.69734 14.739 6.70968 14.9114 6.68052 15.0792L5.89757 19.6307C5.86341 19.823 5.88388 20.0211 5.95667 20.2023C6.02946 20.3836 6.15164 20.5408 6.30932 20.656C6.46701 20.7713 6.65387 20.84 6.84867 20.8544C7.04347 20.8688 7.23838 20.8282 7.41126 20.7373L11.5035 18.5868C11.6558 18.5045 11.8262 18.4615 11.9993 18.4615C12.1724 18.4615 12.3428 18.5045 12.4952 18.5868Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 320
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

/**
 * PathReveal Component
 *
 * Animates SVG paths by drawing them progressively as the user scrolls.
 * All paths start and finish at the same scroll positions, regardless of their individual lengths.
 *
 * @param props - Component properties including SVG source, styling, and scroll behavior
 */
export default function PathReveal(props: any) {
    // Destructure all the props for easier access
    const {
        svgFile, // URL to SVG file (when inputType is "file")
        svgCode, // Raw SVG code string (when inputType is "code")
        inputType, // "file" or "code" - determines SVG source
        beamColor, // Color of the animated paths
        beamWidth, // Stroke width of the paths
        opacity, // Object with start/end opacity values
        progress, // Object with start/end progress values (0-1)
        start, // Scroll offset in pixels before animation begins
        length, // Scroll distance in pixels over which animation completes
        startAlign, // "top", "center", or "bottom" - where animation starts relative to viewport
    } = props

    // Reference to the SVG group containing all paths
    const groupRef = React.useRef<SVGGElement>(null)

    // ===== STATE MANAGEMENT =====

    // Store the extracted SVG path data and their measured lengths
    const [svgPaths, setSvgPaths] = React.useState<string[]>([]) // Array of path "d" attributes
    const [pathLengths, setPathLengths] = React.useState<number[]>([]) // Array of measured path lengths

    // ===== SCROLL PROGRESS TRACKING =====

    // MotionValue that tracks scroll progress (0 to 1) relative to this component's position
    const sectionProgressMV = useMotionValue(0)

    // ===== ANIMATION CONFIGURATION =====

    // Extract opacity start/end values from the opacity object prop
    const opacityStart: number =
        opacity && typeof opacity.start === "number" ? opacity.start : 0
    const opacityEnd: number =
        opacity && typeof opacity.end === "number" ? opacity.end : 1

    // Extract progress range [start, end] from the progress object prop
    // This allows users to control which portion of the scroll triggers the animation
    const rangeStart: number = Math.max(0, Math.min(1, progress?.start ?? 0))
    const rangeEnd: number = Math.max(0, Math.min(1, progress?.end ?? 1))

    // Transform scroll progress to path drawing progress
    // This maps the scroll progress to the user-defined progress range
    const pathDrawProgress = useTransform<number, number>(
        sectionProgressMV,
        (scrollProgress: number) => {
            // Linear interpolation: maps scroll progress to the defined progress range
            return rangeStart + (rangeEnd - rangeStart) * scrollProgress
        }
    )

    // ===== PROGRESS SYNCHRONIZATION =====

    // Keep a numeric snapshot of the current progress value for per-path calculations
    // This avoids having to call .get() on the MotionValue in the render loop
    const [pathProgressValue, setPathProgressValue] = React.useState<number>(
        () => {
            const initial = (pathDrawProgress as any)?.get?.()
            return typeof initial === "number" ? initial : rangeStart
        }
    )

    // Sync the local progress state with the MotionValue changes
    useEffect(() => {
        // Get current value immediately when the range changes
        const current = (pathDrawProgress as any)?.get?.()
        if (typeof current === "number") setPathProgressValue(current)

        // Subscribe to future changes
        const unsub = pathDrawProgress.onChange((v) => setPathProgressValue(v))
        return () => unsub && unsub()
    }, [pathDrawProgress, rangeStart, rangeEnd])

    // ===== REFS AND ADDITIONAL STATE =====

    // SVG element references for DOM manipulation and measurements
    const svgRef = React.useRef<SVGSVGElement>(null) // Main SVG container
    const containerRef = React.useRef<HTMLDivElement>(null) // Outer container for positioning
    const startPositionRef = React.useRef<number>(0) // Cached start position for scroll calculations
    const zoomProbeRef = React.useRef<HTMLDivElement>(null) // Hidden element to detect editor zoom

    // Dynamic values that update based on SVG content and zoom level
    const [viewBox, setViewBox] = React.useState<string | undefined>(undefined) // SVG viewBox for proper scaling
    const [computedStrokeWidth, setComputedStrokeWidth] =
        React.useState<number>(beamWidth) // Stroke width adjusted for zoom
    const [maxPathWidth, setMaxPathWidth] = React.useState<number>(0) // Widest path for container sizing
    const [maxPathHeight, setMaxPathHeight] = React.useState<number>(0) // Tallest path for container sizing

    // ===== SVG LOADING AND PROCESSING =====

    // Load and process SVG content (either from file or code)
    React.useEffect(() => {
        let cancelled = false

        // Helper function to safely update state if component is still mounted
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

        // Load SVG based on input type
        if (inputType === "file" && svgFile) {
            // Fetch SVG from URL
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
            // Use provided SVG code string
            const result = extractPathsFromSVG(svgCode)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength
            )
        } else {
            // Use fallback SVG when nothing is provided
            const result = extractPathsFromSVG(FALLBACK_SVG)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength
            )
        }

        return () => {
            cancelled = true // Prevent state updates after unmount
        }
    }, [inputType, svgFile, svgCode])

    // Both path drawing and opacity are tied to the same drawProgress

    // ===== SCROLL POSITION CALCULATION =====

    // Find any sticky parent elements that might affect positioning calculations
    const findStickyParent = React.useCallback(
        (el: HTMLElement): HTMLElement | null => {
            let current: HTMLElement | null = el
            while (current && current !== document.body) {
                const pos = window.getComputedStyle(current).position
                if (pos === "sticky") return current
                current = current.parentElement as HTMLElement | null
            }
            return null
        },
        []
    )

    // Get the absolute top position of an element, accounting for sticky positioning
    const getOriginalPosition = React.useCallback(
        (element: HTMLElement): number => {
            const sticky = findStickyParent(element)
            const target = sticky || element
            const originalPosition = target.style.position

            // Temporarily remove sticky positioning to get true position
            target.style.position = "static"
            const rect = target.getBoundingClientRect()
            const scrollTop =
                window.pageYOffset || document.documentElement.scrollTop
            const top = rect.top + scrollTop

            // Restore original positioning
            target.style.position = originalPosition
            return top
        },
        [findStickyParent]
    )

    // ===== SCROLL EVENT HANDLING =====

    // Main effect that handles scroll events and updates progress
    useEffect(() => {
        // Calculate and cache the starting position of this component
        const computeStart = () => {
            if (!containerRef.current) return
            startPositionRef.current = getOriginalPosition(containerRef.current)
        }

        // Update progress based on current scroll position
        const updateProgress = () => {
            const scrollY = window.scrollY || window.pageYOffset || 0
            const startPx = typeof start === "number" ? start : 0
            const lenPx = Math.max(1, typeof length === "number" ? length : 1)
            const vh = window.innerHeight || 0

            // Calculate where the animation should start relative to viewport
            const linePx =
                startAlign === "center"
                    ? vh / 2
                    : startAlign === "bottom"
                      ? vh
                      : 0

            // Calculate the scroll position where animation should begin
            const startScrollY = startPositionRef.current - linePx + startPx

            // Calculate progress (0 to 1) based on scroll position
            const p = clamp01((scrollY - startScrollY) / lenPx)
            sectionProgressMV.set(p)
        }

        // Initialize and set up event listeners
        computeStart()
        updateProgress()

        // Throttle scroll events to improve performance
        const onScroll = () => requestAnimationFrame(updateProgress)
        const onResize = () => {
            computeStart()
            updateProgress()
        }

        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onResize)

        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onResize)
        }
    }, [start, length, startAlign, getOriginalPosition, sectionProgressMV])

    // ===== VIEWBOX CALCULATION =====

    // Calculate the optimal viewBox for the SVG based on actual path geometry
    useLayoutEffect(() => {
        if (!svgPaths || svgPaths.length === 0 || !groupRef.current) return

        // Get the bounding box of all paths combined
        const bbox = groupRef.current.getBBox()

        if (bbox && bbox.width > 0 && bbox.height > 0) {
            // Add padding around paths to account for stroke width
            const strokePadding = Math.max(
                0,
                (computedStrokeWidth || beamWidth) / 2
            )
            setViewBox(
                `${bbox.x - strokePadding} ${bbox.y - strokePadding} ${bbox.width + strokePadding * 2} ${bbox.height + strokePadding * 2}`
            )
        } else {
            // Fallback viewBox if no valid paths
            setViewBox("0 0 100 100")
        }
    }, [svgPaths, computedStrokeWidth, beamWidth])

    // ===== PATH DIMENSIONS CALCULATION =====

    // Calculate the maximum width and height of individual paths for container sizing
    useLayoutEffect(() => {
        if (!svgPaths || svgPaths.length === 0 || !groupRef.current) return

        // Get all rendered path elements
        const paths = Array.from(groupRef.current.querySelectorAll("path"))
        if (paths.length === 0) return

        // Find the widest and tallest individual path
        let widest = 0
        let tallest = 0
        for (const path of paths) {
            const boundingBox = path.getBBox()
            widest = Math.max(widest, boundingBox.width)
            tallest = Math.max(tallest, boundingBox.height)
        }

        // Add stroke width padding to ensure paths aren't clipped
        const strokePadding = Math.max(
            0,
            (computedStrokeWidth || beamWidth) / 2
        )
        setMaxPathWidth(Math.ceil(widest + strokePadding * 2))
        setMaxPathHeight(Math.ceil(tallest + strokePadding * 2))
    }, [svgPaths, computedStrokeWidth, beamWidth])

    // ===== STROKE WIDTH CALCULATION =====

    // Calculate stroke width accounting for canvas zoom and SVG scaling
    useEffect(() => {
        const compute = () => {
            const containerEl = containerRef.current
            const svgEl = svgRef.current
            if (!containerEl || !svgEl) {
                setComputedStrokeWidth(beamWidth)
                return
            }

            // Detect editor zoom using a hidden 20x20 probe element
            const probe = zoomProbeRef.current
            const editorZoom = probe
                ? probe.getBoundingClientRect().width / 20
                : 1

            // Get current SVG dimensions
            const rect = svgEl.getBoundingClientRect()
            const parts = (viewBox || "0 0 100 100").split(" ").map(Number)
            const vbWidth = parts[2] || 100
            const vbHeight = parts[3] || 100

            // Calculate the actual scale factor of the SVG
            const safeZoom = Math.max(editorZoom, 0.0001)
            // Remove editor zoom from the measured size so scale matches preview/live
            const scaleX = rect.width / safeZoom / vbWidth
            const scaleY = rect.height / safeZoom / vbHeight
            const scale = Math.min(scaleX, scaleY) || 1

            // Adjust stroke width based on scale
            const adjustedStrokeWidth = beamWidth / scale
            setComputedStrokeWidth((prev) =>
                Math.abs(prev - adjustedStrokeWidth) > 0.05
                    ? adjustedStrokeWidth
                    : prev
            )
        }

        // Different behavior for canvas (editor) vs preview/live
        if (RenderTarget.current() === RenderTarget.canvas) {
            // In canvas: continuously monitor for zoom and size changes
            let rafId = 0
            const last = { ts: 0, zoom: 0, w: 0, h: 0 }
            const TICK_MS = 250 // throttle to 4Hz to avoid unnecessary work
            const EPS_ZOOM = 0.001
            const EPS_SIZE = 0.5

            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                const svgEl = svgRef.current
                if (probe && svgEl) {
                    const currentZoom = probe.getBoundingClientRect().width / 20
                    const r = svgEl.getBoundingClientRect()

                    // Only update if enough time has passed and something meaningful changed
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

        // Preview/Live: only respond to real size changes, not every animation frame
        compute()
        const ro = new ResizeObserver(() => compute())
        if (containerRef.current) ro.observe(containerRef.current)
        window.addEventListener("resize", compute)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", compute)
        }
    }, [beamWidth, viewBox])

    // ===== RENDER =====

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                minWidth: maxPathWidth || undefined,
                minHeight: maxPathHeight || undefined,
            }}
        >
            <div style={{ position: "absolute", inset: 0 }}>
                {/* Hidden 20x20 probe element to detect editor zoom level in canvas */}
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
                    <g ref={groupRef}>
                        {/* Render each SVG path with synchronized animation */}
                        {svgPaths.map((pathData, pathIndex) => {
                            const pathLength = pathLengths[pathIndex] ?? 0
                            const dasharray =
                                pathLength > 0 ? `${pathLength}` : "1"
                            const isCanvas = RenderTarget.hasRestrictions()
                            const effectiveProgress = isCanvas
                                ? 1
                                : pathProgressValue

                            // All paths use the same progress value - they start and finish at the same scroll positions
                            // This ensures synchronized animation regardless of individual path lengths
                            const dashoffset =
                                pathLength > 0
                                    ? (1 - effectiveProgress) * pathLength
                                    : 0

                            // Calculate opacity based on progress (fade in/out effect)
                            const opacityValue = isCanvas
                                ? 1
                                : opacityStart +
                                  (opacityEnd - opacityStart) *
                                      effectiveProgress

                            return (
                                <motion.path
                                    key={pathIndex}
                                    d={pathData}
                                    stroke={beamColor}
                                    strokeWidth={computedStrokeWidth}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeOpacity={opacityValue as any}
                                    fill="none"
                                    strokeDasharray={dasharray}
                                    strokeDashoffset={dashoffset}
                                />
                            )
                        })}
                    </g>
                </svg>
            </div>
        </div>
    )
}

// ===== DEFAULT PROPS =====

PathReveal.defaultProps = {
    svgFile: "", // No default SVG file
    svgCode: "", // No default SVG code
    inputType: "file", // Default to file input type
    beamColor: "#fc5025", // Default orange color
    beamWidth: 1, // Default 1px stroke width
    opacity: { start: 0, end: 1 }, // Fade in from 0 to 1
    progress: { start: 0, end: 1 }, // Animate over full scroll range
    start: 0, // No offset from component position
    length: 1000, // 1000px scroll distance for animation
    startAlign: "top", // Animation starts when top of component enters viewport
}

// ===== PROPERTY CONTROLS =====

addPropertyControls(PathReveal, {
    // Input source configuration
    inputType: {
        type: ControlType.Enum,
        title: "Type",
        options: ["file", "code"],
        optionTitles: ["File", "Code"],
        displaySegmentedControl: true,
        defaultValue: "file",
    },
    // SVG source controls (file or code)
    svgFile: {
        type: ControlType.File,
        title: "SVG File",
        allowedFileTypes: ["svg"],
        hidden: (props) => props.inputType !== "file",
    } as FileControlDescription,
    svgCode: {
        type: ControlType.String,
        title: " ",
        displayTextArea: true,
        hidden: (props) => props.inputType !== "code",
    },

    // Visual styling controls
    beamColor: { type: ControlType.Color, title: "Beam Color" },
    beamWidth: {
        type: ControlType.Number,
        title: "Beam Width",
        min: 1,
        max: 50,
        step: 1,
    },
    // Animation trigger positioning
    startAlign: {
        type: ControlType.Enum,
        title: "Start At",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "top",
    },

    // Scroll mapping controls - animation is driven by absolute pixel positions
    length: {
        type: ControlType.Number,
        title: "Distance",
        min: 1,
        max: 200000,
        step: 50,
    },

    start: {
        type: ControlType.Number,
        title: "Offset",
        min: -100000,
        max: 100000,
        step: 10,
    },
    // Progress range controls - maps scroll progress to animation progress
    progress: {
        type: ControlType.Object,
        title: "Progress",
        controls: {
            start: {
                type: ControlType.Number,
                title: "Start",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0,
            },
            end: {
                type: ControlType.Number,
                title: "End",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 1,
            },
        },
    },
    // Opacity controls - fade in/out effect during animation
    opacity: {
        type: ControlType.Object,
        title: "Opacity",
        controls: {
            start: {
                type: ControlType.Number,
                title: "Start",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0,
            },
            end: {
                type: ControlType.Number,
                title: "End",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 1,
            },
        },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
    // Removed legacy distance and offset controls
})

// Component display name for Framer's component panel
PathReveal.displayName = "Scroll Path Reveal"
