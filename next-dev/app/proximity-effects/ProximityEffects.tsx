import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

interface ProximityEffectsProps {
    mode?: "auto" | "components"
    influenceRadius?: number
    magnet?: number
    scale?: {
        scaleFar?: number
        scaleNear?: number
    }
    rotation?: {
        rotationFar?: number
        rotationNear?: number
    }
    opacity?: {
        opacityFar?: number
        opacityNear?: number
    }
    border?: {
        borderFar?: {
            borderWidth?: number
            borderTopWidth?: number
            borderRightWidth?: number
            borderBottomWidth?: number
            borderLeftWidth?: number
            borderStyle?: "solid" | "dashed" | "dotted" | "double"
            borderColor?: string
        }
        borderNear?: {
            borderWidth?: number
            borderTopWidth?: number
            borderRightWidth?: number
            borderBottomWidth?: number
            borderLeftWidth?: number
            borderStyle?: "solid" | "dashed" | "dotted" | "double"
            borderColor?: string
        }
    }
    borderRadius?: {
        borderRadiusFar?: number
        borderRadiusNear?: number
    }
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

// Interpolate between two colors
function interpolateColor(
    color1: string,
    color2: string,
    t: number
): string {
    const rgba1 = parseColorToRgba(resolveTokenColor(color1))
    const rgba2 = parseColorToRgba(resolveTokenColor(color2))
    
    const r = rgba1.r + (rgba2.r - rgba1.r) * t
    const g = rgba1.g + (rgba2.g - rgba1.g) * t
    const b = rgba1.b + (rgba2.b - rgba1.b) * t
    const a = rgba1.a + (rgba2.a - rgba1.a) * t
    
    return rgbaToCssColor({ r, g, b, a })
}

// Linear interpolation
function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t
}

// Clamp value between min and max
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

export default function ProximityEffects({
    mode = "auto",
    influenceRadius = 300,
    scale = { scaleFar: 1, scaleNear: 1.2 },
    rotation = { rotationFar: 0, rotationNear: 0 },
    opacity = { opacityFar: 1, opacityNear: 1 },
    border = {
        borderFar: { borderWidth: 0, borderStyle: "solid", borderColor: "transparent" },
        borderNear: { borderWidth: 0, borderStyle: "solid", borderColor: "transparent" },
    },
    borderRadius = { borderRadiusFar: 0, borderRadiusNear: 0 },
    magnet = 0,
}: ProximityEffectsProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const parentElementRef = useRef<HTMLElement | null>(null)
    const rafId = useRef<number | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const zoomProbeRef = useRef<HTMLDivElement | null>(null)
    const mousePositionRef = useRef<{ x: number; y: number } | null>(null)
    
    // Store props in refs so they're always current in the animation loop
    const propsRef = useRef({
        mode,
        influenceRadius,
        scale,
        rotation,
        opacity,
        border,
        borderRadius,
        magnet,
    })
    
    // Store original styles for each element to restore when cursor is far
    const originalStylesRef = useRef<Map<HTMLElement, {
        transform: string
        transformOrigin: string
        opacity: string
        borderColor: string
        borderWidth: string
        borderTopWidth: string
        borderRightWidth: string
        borderBottomWidth: string
        borderLeftWidth: string
        borderStyle: string
        borderRadius: string
    }>>(new Map())
    
    // Store original center positions for elements (before any transforms)
    const originalCentersRef = useRef<Map<HTMLElement, { x: number; y: number }>>(new Map())
    
    // Update refs when props change
    useEffect(() => {
        propsRef.current = {
            mode,
            influenceRadius,
            scale,
            rotation,
            opacity,
            border,
            borderRadius,
            magnet,
        }
    }, [
        mode,
        influenceRadius,
        scale,
        rotation,
        opacity,
        border,
        borderRadius,
        magnet,
    ])

    // Get zoom factor from probe element
    const getZoomFactor = (): number => {
        const probe = zoomProbeRef.current
        if (!probe) return 1
        const probeRect = probe.getBoundingClientRect()
        const zoom = probeRect.width / 20 // 20 is the fixed width of the probe
        return Math.max(zoom, 0.0001) // Prevent division by zero
    }

    // Check if element contains a child (at any depth) with data-line-connections="true"
    const hasLineConnections = (element: Element): boolean => {
        // Check if element itself has the attribute
        if (element.hasAttribute("data-line-connections") && element.getAttribute("data-line-connections") === "true") {
            return true
        }
        // Check if any descendant has the attribute
        const lineConnectionsChild = element.querySelector('[data-line-connections="true"]')
        return lineConnectionsChild !== null
    }

    // Calculate center positions of all sibling elements
    const getElementCenters = (parentElement: HTMLElement): Array<{ element: HTMLElement; x: number; y: number }> => {
        const centers: Array<{ element: HTMLElement; x: number; y: number }> = []
        
        const container = containerRef.current
        const zoom = getZoomFactor()
        
        // Get all direct children, excluding our container and any hidden/invisible elements
        const children = Array.from(parentElement.children).filter((child) => {
            // Exclude line connections component and any elements (or their parents) with data-line-connections="true"
            if (hasLineConnections(child)) return false
            // Exclude SVG elements (from LineConnections)
            if (child.tagName === "svg") return false
            // Exclude proximity effects component (check both possible attribute names)
            if (child.hasAttribute("data-proximity-effects")) return false
            if (child.hasAttribute("data-framer-proximity-effects")) return false
            // Exclude our component's container
            if (child === container) return false
            // Exclude the zoom probe
            if (child === zoomProbeRef.current) return false
            // Exclude any element that is our component's wrapper (check if it contains our container)
            if (container && child.contains && child.contains(container)) return false
            
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

    // Store original styles for an element
    const storeOriginalStyles = (element: HTMLElement) => {
        if (originalStylesRef.current.has(element)) return
        
        // Get computed styles to capture any existing transforms from other sources
        const computedStyle = window.getComputedStyle(element)
        originalStylesRef.current.set(element, {
            transform: element.style.transform || "",
            transformOrigin: element.style.transformOrigin || "",
            opacity: element.style.opacity || "",
            borderColor: element.style.borderColor || "",
            borderWidth: element.style.borderWidth || "",
            borderTopWidth: element.style.borderTopWidth || "",
            borderRightWidth: element.style.borderRightWidth || "",
            borderBottomWidth: element.style.borderBottomWidth || "",
            borderLeftWidth: element.style.borderLeftWidth || "",
            borderStyle: element.style.borderStyle || "",
            borderRadius: element.style.borderRadius || "",
        })
    }

    // Restore original styles for an element
    const restoreOriginalStyles = (element: HTMLElement) => {
        const original = originalStylesRef.current.get(element)
        if (!original) return
        
        element.style.transform = original.transform
        element.style.transformOrigin = original.transformOrigin
        element.style.opacity = original.opacity
        element.style.borderColor = original.borderColor
        element.style.borderWidth = original.borderWidth
        element.style.borderTopWidth = original.borderTopWidth
        element.style.borderRightWidth = original.borderRightWidth
        element.style.borderBottomWidth = original.borderBottomWidth
        element.style.borderLeftWidth = original.borderLeftWidth
        element.style.borderStyle = original.borderStyle
        element.style.borderRadius = original.borderRadius
    }

    // Update effects on all elements based on cursor position
    const updateEffects = () => {
        const parentElement = parentElementRef.current
        if (!parentElement) return

        const centers = getElementCenters(parentElement)
        const mousePos = mousePositionRef.current
        const zoom = getZoomFactor()

        const {
            mode: modeValue,
            influenceRadius: radius,
            scale: scaleProps,
            rotation: rotationProps,
            opacity: opacityProps,
            border: borderProps,
            borderRadius: borderRadiusProps,
            magnet: magnetProps,
        } = propsRef.current

        // Extract values with defaults
        const scaleFar = scaleProps?.scaleFar ?? 1
        const scaleNear = scaleProps?.scaleNear ?? 1.2
        const rotationFar = rotationProps?.rotationFar ?? 0
        const rotationNear = rotationProps?.rotationNear ?? 0
        const opacityFar = opacityProps?.opacityFar ?? 1
        const opacityNear = opacityProps?.opacityNear ?? 1
        const borderFar = borderProps?.borderFar ?? { borderWidth: 0, borderStyle: "solid", borderColor: "transparent" }
        const borderNear = borderProps?.borderNear ?? { borderWidth: 0, borderStyle: "solid", borderColor: "transparent" }
        const borderRadiusFar = borderRadiusProps?.borderRadiusFar ?? 0
        const borderRadiusNear = borderRadiusProps?.borderRadiusNear ?? 0
        const magnetValue = magnetProps ?? 0

        // Convert mouse position to parent-relative coordinates, accounting for zoom
        // If no mouse position, use a position far away so all elements get "far" values
        const parentRect = parentElement.getBoundingClientRect()
        let mouseX: number, mouseY: number
        
        if (mousePos) {
            mouseX = (mousePos.x - parentRect.left) / zoom
            mouseY = (mousePos.y - parentRect.top) / zoom
        } else {
            // Use a position far away (e.g., negative coordinates) so distance is always > radius
            mouseX = -10000
            mouseY = -10000
        }

        centers.forEach(({ element, x, y }) => {
            // Store original styles if not already stored
            storeOriginalStyles(element)
            
            // Store original center position if not already stored (before any transforms)
            if (!originalCentersRef.current.has(element)) {
                originalCentersRef.current.set(element, { x, y })
            }
            
            // Use original center position for distance and direction calculations
            const originalCenter = originalCentersRef.current.get(element)!
            const originalX = originalCenter.x
            const originalY = originalCenter.y

            // Calculate distance from cursor to original element center
            const distance = calculateDistance(mouseX, mouseY, originalX, originalY)

            // Calculate influence factor (0 = at or beyond influence radius, 1 = at element center)
            // Clamp to ensure it's between 0 and 1
            const influenceFactor = clamp(1 - distance / radius, 0, 1)

            // Always apply effects to all elements, interpolated based on distance
            // Interpolate scale
            const scale = lerp(scaleFar, scaleNear, influenceFactor)
            
            // Interpolate rotation
            const rotation = lerp(rotationFar, rotationNear, influenceFactor)
            
            // Interpolate opacity
            const opacity = lerp(opacityFar, opacityNear, influenceFactor)
            
            // Interpolate border properties
            // Handle borderWidth (can be single value or per-side)
            const borderWidthFar = borderFar.borderWidth ?? 0
            const borderWidthNear = borderNear.borderWidth ?? 0
            const borderWidth = lerp(borderWidthFar, borderWidthNear, influenceFactor)
            
            // Handle per-side border widths if present
            const borderTopWidth = borderFar.borderTopWidth !== undefined && borderNear.borderTopWidth !== undefined
                ? lerp(borderFar.borderTopWidth, borderNear.borderTopWidth, influenceFactor)
                : undefined
            const borderRightWidth = borderFar.borderRightWidth !== undefined && borderNear.borderRightWidth !== undefined
                ? lerp(borderFar.borderRightWidth, borderNear.borderRightWidth, influenceFactor)
                : undefined
            const borderBottomWidth = borderFar.borderBottomWidth !== undefined && borderNear.borderBottomWidth !== undefined
                ? lerp(borderFar.borderBottomWidth, borderNear.borderBottomWidth, influenceFactor)
                : undefined
            const borderLeftWidth = borderFar.borderLeftWidth !== undefined && borderNear.borderLeftWidth !== undefined
                ? lerp(borderFar.borderLeftWidth, borderNear.borderLeftWidth, influenceFactor)
                : undefined
            
            // Interpolate border color
            const borderColorFar = borderFar.borderColor ?? "transparent"
            const borderColorNear = borderNear.borderColor ?? "transparent"
            const borderColor = interpolateColor(borderColorFar, borderColorNear, influenceFactor)
            
            // Use border style from near when close, far when distant (or interpolate if different)
            const borderStyle = influenceFactor > 0.5 ? (borderNear.borderStyle ?? "solid") : (borderFar.borderStyle ?? "solid")
            
            // Interpolate border radius
            const borderRadius = lerp(borderRadiusFar, borderRadiusNear, influenceFactor)

            // Calculate magnet translation using a bell curve
            // Zero translation when cursor is at original position (distance = 0)
            // Zero translation when cursor is outside influence radius (distance >= radius)
            // Maximum translation shifted closer to origin (peak at higher influenceFactor)
            // Elements are pulled TOWARD the cursor like a spring
            let translateX = 0
            let translateY = 0
            
            if (magnetValue !== 0 && influenceFactor > 0) {
                // Calculate direction vector from original element center to mouse
                const dx = mouseX - originalX
                const dy = mouseY - originalY
                const distanceToMouse = Math.sqrt(dx * dx + dy * dy)
                
                if (distanceToMouse > 0) {
                    // Normalize direction vector (points from element center toward cursor)
                    const normalizedDx = dx / distanceToMouse
                    const normalizedDy = dy / distanceToMouse
                    
                    // Bell curve shifted towards origin: translation = magnetValue * influenceFactor^2 * (1 - influenceFactor) * 6.75
                    // This creates a curve that:
                    // - Is 0 when influenceFactor = 0 (cursor at edge of radius)
                    // - Is 0 when influenceFactor = 1 (cursor at original position)
                    // - Peaks at influenceFactor ≈ 0.67 (cursor closer to element center)
                    // The * 6.75 normalizes so the peak value equals magnetValue
                    // Squaring influenceFactor shifts the peak towards the origin
                    const translateAmount = magnetValue * influenceFactor * influenceFactor * (1 - influenceFactor) * 11
                    
                    // Move element TOWARD cursor (spring-like attraction)
                    translateX = normalizedDx * translateAmount
                    translateY = normalizedDy * translateAmount
                }
            }

            // Apply transform with center origin to prevent position shifts
            // Use transform-origin to ensure transforms don't affect element position calculations
            element.style.transformOrigin = "center center"
            element.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotation}deg)`
            element.style.opacity = opacity.toString()
            
            // Apply border and borderRadius based on mode
            if (modeValue === "components") {
                // In component mode, apply border and borderRadius to direct children
                const directChildren = Array.from(element.children).filter(
                    (child) => child instanceof HTMLElement
                ) as HTMLElement[]
                
                directChildren.forEach((child) => {
                    // Store original styles for child if not already stored
                    if (!originalStylesRef.current.has(child)) {
                        originalStylesRef.current.set(child, {
                            transform: child.style.transform || "",
                            transformOrigin: child.style.transformOrigin || "",
                            opacity: child.style.opacity || "",
                            borderColor: child.style.borderColor || "",
                            borderWidth: child.style.borderWidth || "",
                            borderTopWidth: child.style.borderTopWidth || "",
                            borderRightWidth: child.style.borderRightWidth || "",
                            borderBottomWidth: child.style.borderBottomWidth || "",
                            borderLeftWidth: child.style.borderLeftWidth || "",
                            borderStyle: child.style.borderStyle || "",
                            borderRadius: child.style.borderRadius || "",
                        })
                    }
                    
                    // Apply border properties to child
                    child.style.borderColor = borderColor
                    child.style.borderStyle = borderStyle
                    if (borderTopWidth !== undefined || borderRightWidth !== undefined || borderBottomWidth !== undefined || borderLeftWidth !== undefined) {
                        // Use per-side border widths if specified
                        if (borderTopWidth !== undefined) child.style.borderTopWidth = `${borderTopWidth}px`
                        if (borderRightWidth !== undefined) child.style.borderRightWidth = `${borderRightWidth}px`
                        if (borderBottomWidth !== undefined) child.style.borderBottomWidth = `${borderBottomWidth}px`
                        if (borderLeftWidth !== undefined) child.style.borderLeftWidth = `${borderLeftWidth}px`
                    } else {
                        // Use single border width
                        child.style.borderWidth = `${borderWidth}px`
                    }
                    child.style.borderRadius = `${borderRadius}px`
                })
            } else {
                // In auto mode, apply border and borderRadius to the element itself
                element.style.borderColor = borderColor
                element.style.borderStyle = borderStyle
                if (borderTopWidth !== undefined || borderRightWidth !== undefined || borderBottomWidth !== undefined || borderLeftWidth !== undefined) {
                    // Use per-side border widths if specified
                    if (borderTopWidth !== undefined) element.style.borderTopWidth = `${borderTopWidth}px`
                    if (borderRightWidth !== undefined) element.style.borderRightWidth = `${borderRightWidth}px`
                    if (borderBottomWidth !== undefined) element.style.borderBottomWidth = `${borderBottomWidth}px`
                    if (borderLeftWidth !== undefined) element.style.borderLeftWidth = `${borderLeftWidth}px`
                } else {
                    // Use single border width
                    element.style.borderWidth = `${borderWidth}px`
                }
                element.style.borderRadius = `${borderRadius}px`
            }
        })
    }

    // Animation loop to continuously update effects
    const render = () => {
        updateEffects()
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

        // Track mouse position globally (on document)
        const handleMouseMove = (e: MouseEvent) => {
            mousePositionRef.current = { x: e.clientX, y: e.clientY }
        }

        // Add mouse listeners to document to track cursor even outside parent
        document.addEventListener("mousemove", handleMouseMove)

        // Set up ResizeObserver to watch for changes in sibling elements
        if (typeof ResizeObserver !== "undefined") {
            resizeObserverRef.current = new ResizeObserver(() => {
                // Updates will happen in the animation loop
            })

            // Observe all sibling elements, excluding our component and zoom probe
            const children = Array.from(parentElement.children).filter((child) => {
                // Exclude our component's container
                if (child === container) return false
                // Exclude the zoom probe
                if (child === zoomProbe) return false
                // Exclude any element that is our component's wrapper
                if (container && child.contains && child.contains(container)) return false
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

        // Start animation loop
        rafId.current = requestAnimationFrame(render)

        // Also listen to window resize
        const handleResize = () => {
            // Updates will happen in the animation loop
        }
        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
            document.removeEventListener("mousemove", handleMouseMove)
            
            if (rafId.current) {
                cancelAnimationFrame(rafId.current)
                rafId.current = null
            }

            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect()
            }

            // Remove zoom probe from parent on cleanup
            if (zoomProbe && zoomProbe.parentNode) {
                zoomProbe.parentNode.removeChild(zoomProbe)
            }

            // Restore all original styles
            originalStylesRef.current.forEach((_, element) => {
                restoreOriginalStyles(element)
            })
            originalStylesRef.current.clear()
            originalCentersRef.current.clear()
        }
    }, [])

    return (
        <div
            data-proximity-effects="true"
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
        />
    )
}

addPropertyControls(ProximityEffects, {
    mode:{
        type: ControlType.Enum,
        title: "",
        options: ["auto", "components"],
        optionTitles: ["Auto", "Components"],
        defaultValue: "auto",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        description:"Set to 'Components' if used to affect element that are components"
    },
    influenceRadius: {
        type: ControlType.Number,
        title: "Influence",
        defaultValue: 300,
        min: 10,
        max: 1000,
        step: 100,
        unit: "px",
    },
    magnet: {
        type: ControlType.Number,
        title: "Magnet",
        defaultValue: 0,
        min: -500,
        max: 500,
        step: 10,
        unit: "px",
        description: "Positive = Attract, Negative = Repel",
    },
    scale:{
        type: ControlType.Object,
        title:"Scale",
        controls:{
            scaleNear: {
                type: ControlType.Number,
                title: "Near",
                defaultValue: 1.2,
                min: 0.1,
                max: 3,
                step: 0.1,
            },
            scaleFar: {
                type: ControlType.Number,
                title: "Far",
                defaultValue: 1,
                min: 0.1,
                max: 3,
                step: 0.1,
            },
        },
    },
    rotation:{
        type: ControlType.Object,
        title:"Rotation",
        controls: {
            rotationNear:{
                type: ControlType.Number,
                title: "Near",
                defaultValue: 0,
                min: -360,
                max: 360,
                step: 1,
                unit: "deg",
            },
            rotationFar: {
                type: ControlType.Number,
                title: "Far",
                defaultValue: 0,
                min: -360,
                max: 360,
        step: 1,
                unit: "deg",
            },
        },
    },
    opacity:{
        type: ControlType.Object,
        title:"Opacity",
        controls: {
            opacityNear: {
                type: ControlType.Number,
                title: "Near",
                defaultValue: 1,
                min: 0,
                max: 1,
                step: 0.1,
            },
        
            opacityFar: {
                type: ControlType.Number,
                title: "Far",
                defaultValue: 1,
                min: 0,
                max: 1,
                step: 0.1,
            },
        },
    },
    border:{
        type: ControlType.Object,
        title:"Border",
        controls: {
            borderNear: {
                // @ts-ignore - ControlType.Border exists but may not be in types
                type: ControlType.Border,
                title: "Near",
                defaultValue: {
                    borderWidth: 0,
                    borderStyle: "solid",
                    borderColor: "transparent",
                },
            },
            borderFar: {
                // @ts-ignore - ControlType.Border exists but may not be in types
                type: ControlType.Border,
                title: "Far",
                defaultValue: {
                    borderWidth: 0,
                    borderStyle: "solid",
                    borderColor: "transparent",
                },
            },
        },
    },
    borderRadius:{
        description: "More components at [Framer University](https://frameruni.link/cc).",
        type: ControlType.Object,
        title:"Radius",
        controls: {
            borderRadiusNear: {
                type: ControlType.Number,
                title: "Near",
                defaultValue: 0,
                min: 0,
                max: 100,
                step: 1,
                unit: "px",
            },
            borderRadiusFar: {
        type: ControlType.Number,
                title: "Far",
                defaultValue: 0,
                min: 0,
                max: 100,
                step: 1,
                unit: "px",
        
            },
        },
    },
})

ProximityEffects.displayName = "Proximity Effects"

