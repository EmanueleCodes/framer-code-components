import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

interface LineConnectionsProps {
    connectionMode: "all" | "closer"
    connectionsCount?: number
    zIndex?: number
    strokeColor?: string
    strokeWidth?: number
    dashLength?: number
    gapLength?: number
    linecap?: "butt" | "round" | "square"
}

// CSS variable token and color parsing (hex/rgba/var())
const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/

function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}

function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

// Color parsing function to extract RGB and alpha
// Returns transparent if input is empty/undefined
// Supports hex, rgba, and CSS variables (Framer color tokens)
function parseColorToRgba(input: string | undefined): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input || input.trim() === "") return { r: 0, g: 0, b: 0, a: 0 }
    const str = input.trim()

    // Handle rgba() format
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1
        return { r, g, b, a }
    }

    // Handle hex formats
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        }
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        }
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

// Convert rgba object to CSS color string
function rgbaToCssColor(rgba: { r: number; g: number; b: number; a: number }): string {
    if (rgba.a === 1) {
        // Return hex format for fully opaque colors
        const r = Math.round(rgba.r * 255).toString(16).padStart(2, "0")
        const g = Math.round(rgba.g * 255).toString(16).padStart(2, "0")
        const b = Math.round(rgba.b * 255).toString(16).padStart(2, "0")
        return `#${r}${g}${b}`
    }
    // Return rgba format for transparent colors
    return `rgba(${Math.round(rgba.r * 255)}, ${Math.round(rgba.g * 255)}, ${Math.round(rgba.b * 255)}, ${rgba.a})`
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

export default function LineConnections({
    connectionMode = "all",
    connectionsCount = 3,
    zIndex = 0,
    strokeColor = "#ffffff",
    strokeWidth = 1,
    dashLength = 0,
    gapLength = 0,
    linecap = "butt",
}: LineConnectionsProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGElement | null>(null)
    const parentElementRef = useRef<HTMLElement | null>(null)
    const rafId = useRef<number | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const zoomProbeRef = useRef<HTMLDivElement | null>(null)
    
    // Store props in refs so they're always current in the animation loop
    const propsRef = useRef({ connectionMode, connectionsCount, strokeColor, strokeWidth, dashLength, gapLength, linecap })
    
    // Store computed connections for "closer" mode (computed once on mount)
    const connectionsRef = useRef<Set<string> | null>(null)
    const lastCentersCountRef = useRef<number>(0)
    
    // Update refs when props change
    useEffect(() => {
        propsRef.current = { connectionMode, connectionsCount, strokeColor, strokeWidth, dashLength, gapLength, linecap }
        // Reset connections when mode or count changes
        if (connectionMode === "closer") {
            connectionsRef.current = null
        }
    }, [connectionMode, connectionsCount, strokeColor, strokeWidth, dashLength, gapLength, linecap])

    // Update SVG z-index when prop changes
    useEffect(() => {
        const svg = svgRef.current
        if (svg) {
            svg.setAttribute("style", `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:${zIndex};`)
        }
    }, [zIndex])

    // Get zoom factor from probe element
    const getZoomFactor = (): number => {
        const probe = zoomProbeRef.current
        if (!probe) return 1
        const probeRect = probe.getBoundingClientRect()
        const zoom = probeRect.width / 20 // 20 is the fixed width of the probe
        return Math.max(zoom, 0.0001) // Prevent division by zero
    }

    // Check if element contains a child (at any depth) with data-proximity-effects="true"
    const hasProximityEffects = (element: Element): boolean => {
        // Check if element itself has the attribute
        if (element.hasAttribute("data-proximity-effects") && element.getAttribute("data-proximity-effects") === "true") {
            return true
        }
        // Check if any descendant has the attribute
        const proximityChild = element.querySelector('[data-proximity-effects="true"]')
        return proximityChild !== null
    }

    // Calculate center positions of all sibling elements
    const getElementCenters = (parentElement: HTMLElement): Array<{ element: HTMLElement; x: number; y: number }> => {
        const centers: Array<{ element: HTMLElement; x: number; y: number }> = []
        
        const container = containerRef.current
        const svg = svgRef.current
        const zoom = getZoomFactor()
        
        // Get all direct children, excluding our container, the SVG, and any hidden/invisible elements
        const children = Array.from(parentElement.children).filter((child) => {
            // Exclude our component's container
            if (child === container) return false
            // Exclude the SVG element we created
            if (child === svg) return false
            // Exclude the zoom probe
            if (child === zoomProbeRef.current) return false
            // Exclude any element that is our component's wrapper (check if it contains our container)
            if (container && child.contains && child.contains(container)) return false
            // Exclude proximity effects component and any elements (or their parents) with data-proximity-effects="true"
            if (hasProximityEffects(child)) return false
            
            // Only include visible, non-hidden elements
            const htmlChild = child as HTMLElement
            const style = window.getComputedStyle(htmlChild)
            if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
                return false
            }
            
            return true
        }) as HTMLElement[]

        children.forEach((child) => {
            const rect = child.getBoundingClientRect()
            const parentRect = parentElement.getBoundingClientRect()
            
            // Skip if element has no dimensions
            if (rect.width === 0 && rect.height === 0) return
            
            // Calculate center relative to parent, accounting for zoom
            // getBoundingClientRect returns screen coordinates, so we divide by zoom to get logical coordinates
            const centerX = (rect.left - parentRect.left) / zoom + (rect.width / zoom) / 2
            const centerY = (rect.top - parentRect.top) / zoom + (rect.height / zoom) / 2
            
            centers.push({
                element: child,
                x: centerX,
                y: centerY,
            })
        })

        return centers
    }

    // Calculate distance between two points
    const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
        const dx = x2 - x1
        const dy = y2 - y1
        return Math.sqrt(dx * dx + dy * dy)
    }

    // Compute connections for "closer" mode (once on mount)
    const computeCloserConnections = (centers: Array<{ element: HTMLElement; x: number; y: number }>, connectionsCount: number): Set<string> => {
        const connections = new Set<string>()
        
        // For each element, find the N closest elements
        for (let i = 0; i < centers.length; i++) {
            // Calculate distances to all other elements
            const distances: Array<{ index: number; distance: number }> = []
            
            for (let j = 0; j < centers.length; j++) {
                if (i === j) continue
                const distance = calculateDistance(
                    centers[i].x,
                    centers[i].y,
                    centers[j].x,
                    centers[j].y
                )
                distances.push({ index: j, distance })
            }
            
            // Sort by distance and take the N closest
            distances.sort((a, b) => a.distance - b.distance)
            const closestCount = Math.min(connectionsCount, distances.length)
            
            for (let k = 0; k < closestCount; k++) {
                const targetIndex = distances[k].index
                // Create a unique key for the connection (smaller index first to avoid duplicates)
                const key = i < targetIndex ? `${i}-${targetIndex}` : `${targetIndex}-${i}`
                connections.add(key)
            }
        }
        
        return connections
    }

    // Update SVG lines connecting all elements
    const updateLines = () => {
        const parentElement = parentElementRef.current
        const svg = svgRef.current
        if (!parentElement || !svg) return

        const centers = getElementCenters(parentElement)
        const parentRect = parentElement.getBoundingClientRect()
        const zoom = getZoomFactor()

        // Clear existing lines
        svg.innerHTML = ""

        // Set SVG dimensions to match parent, accounting for zoom
        // getBoundingClientRect returns screen coordinates, so we divide by zoom to get logical coordinates
        svg.setAttribute("width", (parentRect.width / zoom).toString())
        svg.setAttribute("height", (parentRect.height / zoom).toString())

        // Use current prop values from ref
        const { connectionMode, connectionsCount, strokeColor: currentStrokeColor, strokeWidth: currentStrokeWidth, dashLength: currentDashLength, gapLength: currentGapLength, linecap: currentLinecap } = propsRef.current

        // Compute connections if needed (for "closer" mode, only once or when element count changes)
        if (connectionMode === "closer" && centers.length > 0) {
            // Recompute if connections haven't been computed yet, or if number of elements changed
            if (connectionsRef.current === null || lastCentersCountRef.current !== centers.length) {
                connectionsRef.current = computeCloserConnections(centers, connectionsCount)
                lastCentersCountRef.current = centers.length
            }
        } else if (connectionMode === "all") {
            // Reset connections ref when switching to "all" mode
            connectionsRef.current = null
            lastCentersCountRef.current = 0
        }

        // Resolve color token (CSS variable) and parse to rgba
        const resolvedColor = resolveTokenColor(currentStrokeColor)
        const rgba = parseColorToRgba(resolvedColor)
        const cssColor = rgbaToCssColor(rgba)

        // Create lines based on connection mode
        if (connectionMode === "all") {
            // Connect all pairs of elements
            for (let i = 0; i < centers.length; i++) {
                for (let j = i + 1; j < centers.length; j++) {
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
                    line.setAttribute("x1", centers[i].x.toString())
                    line.setAttribute("y1", centers[i].y.toString())
                    line.setAttribute("x2", centers[j].x.toString())
                    line.setAttribute("y2", centers[j].y.toString())
                    line.setAttribute("stroke", cssColor)
                    line.setAttribute("stroke-width", currentStrokeWidth.toString())
                    line.setAttribute("stroke-linecap", currentLinecap)
                    if (currentDashLength > 0 && currentGapLength > 0) {
                        line.setAttribute("stroke-dasharray", `${currentDashLength} ${currentGapLength}`)
                    }
                    svg.appendChild(line)
                }
            }
        } else if (connectionMode === "closer" && connectionsRef.current) {
            // Connect only the pre-computed connections
            connectionsRef.current.forEach((key) => {
                const [i, j] = key.split("-").map(Number)
                if (i < centers.length && j < centers.length) {
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
                    line.setAttribute("x1", centers[i].x.toString())
                    line.setAttribute("y1", centers[i].y.toString())
                    line.setAttribute("x2", centers[j].x.toString())
                    line.setAttribute("y2", centers[j].y.toString())
                    line.setAttribute("stroke", cssColor)
                    line.setAttribute("stroke-width", currentStrokeWidth.toString())
                    line.setAttribute("stroke-linecap", currentLinecap)
                    if (currentDashLength > 0 && currentGapLength > 0) {
                        line.setAttribute("stroke-dasharray", `${currentDashLength} ${currentGapLength}`)
                    }
                    svg.appendChild(line)
                }
            })
        }
    }

    // Animation loop to continuously update lines
    const render = () => {
        updateLines()
        rafId.current = requestAnimationFrame(render)
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Find parent element 2 levels up (Framer wraps code components)
        let parentElement: HTMLElement | null = container.parentElement
        if (parentElement) {
            parentElement = parentElement.parentElement
        }

        if (!parentElement) return

        parentElementRef.current = parentElement

        // Create zoom probe element and append it to the parent container
        const zoomProbe = document.createElement("div")
        zoomProbe.setAttribute("style", "position:absolute;width:20px;height:20px;opacity:0;pointer-events:none;")
        parentElement.appendChild(zoomProbe)
        zoomProbeRef.current = zoomProbe

        // Create SVG element and append it to the parent container
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svg.setAttribute("style", `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:${zIndex};`)
        parentElement.appendChild(svg)
        svgRef.current = svg

        // Set up ResizeObserver to watch for changes in sibling elements
        if (typeof ResizeObserver !== "undefined") {
            resizeObserverRef.current = new ResizeObserver(() => {
                // Updates will happen in the animation loop
            })

            // Observe all sibling elements, excluding our component, SVG, and zoom probe
            const children = Array.from(parentElement.children).filter((child) => {
                // Exclude our component's container
                if (child === container) return false
                // Exclude the SVG element we created
                if (child === svg) return false
                // Exclude the zoom probe
                if (child === zoomProbe) return false
                // Exclude any element that is our component's wrapper
                if (container && child.contains && child.contains(container)) return false
                // Exclude proximity effects component and any elements (or their parents) with data-proximity-effects="true"
                if (hasProximityEffects(child)) return false
                return true
            }) as HTMLElement[]
            
            children.forEach((child) => {
                resizeObserverRef.current?.observe(child)
            })
        }

        // Also observe parent for size changes
        if (resizeObserverRef.current && parentElement) {
            resizeObserverRef.current.observe(parentElement)
        }

        // Start animation loop (continuously updates to catch transform/position changes)
        rafId.current = requestAnimationFrame(render)

        // Also listen to window resize
        const handleResize = () => {
            // Updates will happen in the animation loop
        }
        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
            
            if (rafId.current) {
                cancelAnimationFrame(rafId.current)
                rafId.current = null
            }

            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect()
            }

            // Remove SVG and zoom probe from parent on cleanup
            if (svg && svg.parentNode) {
                svg.parentNode.removeChild(svg)
            }
            if (zoomProbe && zoomProbe.parentNode) {
                zoomProbe.parentNode.removeChild(zoomProbe)
            }
        }
    }, [zIndex])


    return (
        <div
            ref={containerRef}
            style={{
                display: "none",
                visibility: "hidden",
                opacity: 0,
                position: "absolute",
                width: 0,
                height: 0,
                pointerEvents: "none",
                overflow: "hidden",
            }}
            aria-hidden="true"
            data-line-connections="true"
        />
    )
}


addPropertyControls(LineConnections, {
    connectionMode:{
        type:ControlType.Enum,
        title: "Mode",
        options: ["all", "closer"],
        optionTitles: ["All", "Closer"],
        defaultValue: "all",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    connectionsCount:{
        type:ControlType.Number,
        title: "Count",
        defaultValue: 3,
        min: 1,
        max: 10,
        step: 1,
        hidden: (props) => props.connectionMode === "all",
    },
    zIndex: {
        type: ControlType.Number,
        title: "Z-Index",
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Width",
        defaultValue: 1,
        min: 0.5,
        max: 10,
        step: 0.5,
    },
    strokeColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ffffff",

    },
    dashLength: {
        type: ControlType.Number,
        title: "Dash",
        defaultValue: 0,
        min: 0,
        max: 50,
        step: 1,
    },
    gapLength: {
        type: ControlType.Number,
        title: "Dash Gap",
        defaultValue: 0,
        min: 0,
        max: 50,
        step: 1,
    },
    linecap: {
        type: ControlType.Enum,
        title: "Line Cap",
        options: ["butt", "round", "square"],
        optionTitles: ["Butt", "Round", "Square"],
        defaultValue: "butt",
        description: "More components at [Framer University](https://frameruni.link/cc).",

    },
    
    
})

LineConnections.displayName = "Line Connections"
