import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface TrackedPosition {
    x: number // Base position including tile offset (relative to parent 0,0)
    y: number // Base position including tile offset (relative to parent 0,0)
    width: number
    height: number
    extraX: number // For infinite wrapping
    extraY: number // For infinite wrapping
    ease: number
    baseElement: HTMLElement // Reference to original element (key for grouping)
}

interface ElementGroup {
    baseElement: HTMLElement
    realElement: HTMLElement
    clones: HTMLElement[]
    positions: TrackedPosition[]
    lastActiveIndex: number // Track last assigned index to prevent jumping
    originalStyles: {
        position: string
        left: string
        top: string
        width: string
        height: string
        margin: string
        transform: string
    }
}

interface InfiniteCanvasProps {
    scrollSpeed?: number
    dragSpeed?: number
    ease?: number
    parallax?: {
        enabled?: boolean
        general?: number
        child?: number
    }
    enableDrag?: boolean
    style?: React.CSSProperties
}

/**
 * Linear mapping function: Maps UI values to internal values
 * UI 0.1-1 → Internal 0.1-2
 */
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}

/**
 * Maps speed UI values (0.1-1) to internal values (0.1-2)
 * UI 0.1 → Internal 0.1
 * UI 1.0 → Internal 2.0
 */
function mapSpeedUiToInternal(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 0.1, 2.0)
}

/**
 * Maps ease UI values (0-1) to internal values (0.01-0.2)
 * UI 0 → Internal 0.01 (smoother)
 * UI 1 → Internal 0.2 (snappier)
 */
function mapEaseUiToInternal(ui: number): number {
    const clamped = Math.max(0, Math.min(1, ui))
    return mapLinear(clamped, 0, 1.0, 0.01, 0.2)
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */

export default function InfiniteCanvas({
    scrollSpeed = 0.4,
    dragSpeed = 0.5,
    ease = 0.3,
    parallax = {
        enabled: true,
        general: 1,
        child: 1,
    },
    enableDrag = true,
    style,
}: InfiniteCanvasProps) {
    // Map UI values to internal values
    const internalScrollSpeed = mapSpeedUiToInternal(scrollSpeed)
    const internalDragSpeed = mapSpeedUiToInternal(dragSpeed)
    const internalEase = mapEaseUiToInternal(ease)
    
    const containerRef = useRef<HTMLDivElement>(null)
    const parentElementRef = useRef<HTMLElement | null>(null)
    
    // Store groups of elements (real + clones) and their tracked positions
    const elementGroupsRef = useRef<ElementGroup[]>([])

    const scroll = useRef({
        ease: internalEase,
        current: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        last: { x: 0, y: 0 },
        delta: { x: { c: 0, t: 0 }, y: { c: 0, t: 0 } },
    })

    const isDragging = useRef(false)
    const drag = useRef({ startX: 0, startY: 0, scrollX: 0, scrollY: 0 })

    const mouse = useRef({
        x: { t: 0.5, c: 0.5 },
        y: { t: 0.5, c: 0.5 },
        press: { t: 0, c: 0 },
    })

    const winW = useRef(typeof window !== 'undefined' ? window.innerWidth : 1920)
    const winH = useRef(typeof window !== 'undefined' ? window.innerHeight : 1080)
    const parentDimensions = useRef({ width: 0, height: 0, tileSizeW: 0, tileSizeH: 0 })
    const rafId = useRef<number | null>(null)
    const resizeTimeoutId = useRef<number | null>(null)

    // Initialize the infinite canvas with element duplication
    const initializeInfiniteCanvas = (parentElement: HTMLElement) => {
        // Store initial window dimensions
        if (typeof window !== 'undefined') {
            winW.current = window.innerWidth
            winH.current = window.innerHeight
        }

        // Get parent container dimensions for precise tiling
        const parentRect = parentElement.getBoundingClientRect()
        const parentWidth = parentRect.width
        const parentHeight = parentRect.height

        // Find all direct children of parent element (these are the base elements)
        const baseChildren = Array.from(parentElement.children).filter(
            (child) => child !== containerRef.current?.parentElement
        ) as HTMLElement[]

        // Create 2x2 grid of duplicates (exactly like infinite-grid.js)
        // repsX = [0, parentW] and repsY = [0, parentH]
        const repsX = [0, parentWidth]
        const repsY = [0, parentHeight]

        elementGroupsRef.current = []

        baseChildren.forEach((baseChild) => {
            // STEP 1: Capture the element's current position relative to parent
            const rect = baseChild.getBoundingClientRect()
            const baseX = rect.left - parentRect.left
            const baseY = rect.top - parentRect.top
            const width = rect.width
            const height = rect.height

            // STEP 2: Generate random ease value (for parallax variation)
            const elementEase = Math.random() * 0.5 + 0.5

            // STEP 3: Create clones and positions
            const clones: HTMLElement[] = []
            const positions: TrackedPosition[] = []

            // Save original styles to restore later
            const originalStyles = {
                position: baseChild.style.position,
                left: baseChild.style.left,
                top: baseChild.style.top,
                width: baseChild.style.width,
                height: baseChild.style.height,
                margin: baseChild.style.margin,
                transform: baseChild.style.transform,
            }

            // Create 3 clones (since we need 4 items total for 2x2 grid)
            // We will dynamically assign the Real Element to the most visible position
            for (let i = 0; i < 3; i++) {
                const clone = baseChild.cloneNode(true) as HTMLElement
                parentElement.appendChild(clone)

                // Setup clone styles
                clone.style.position = "absolute"
                clone.style.left = "0"
                clone.style.top = "0"
                clone.style.width = `${width}px`
                clone.style.height = `${height}px`
                clone.style.margin = "0"
                clone.style.willChange = "transform"

                clones.push(clone)
            }

            // Normalize Real Element to behave like a clone (controlled via transform only)
            baseChild.style.position = "absolute"
            baseChild.style.left = "0"
            baseChild.style.top = "0"
            baseChild.style.width = `${width}px`
            baseChild.style.height = `${height}px`
            baseChild.style.margin = "0"
            baseChild.style.willChange = "transform"

            // Create positions for 2x2 grid
            repsX.forEach((offsetX) => {
                repsY.forEach((offsetY) => {
                    positions.push({
                        x: baseX + offsetX,
                        y: baseY + offsetY,
                        width,
                        height,
                        extraX: 0,
                        extraY: 0,
                        ease: elementEase,
                        baseElement: baseChild
                    })
                })
            })

            elementGroupsRef.current.push({
                baseElement: baseChild,
                realElement: baseChild,
                clones,
                positions,
                lastActiveIndex: -1,
                originalStyles
            })
        })

        // Reset scroll position
        scroll.current.current = { x: 0, y: 0 }
        scroll.current.target = { x: 0, y: 0 }
        scroll.current.last = { x: 0, y: 0 }

        // Store doubled tile size for wrapping
        const tileSizeW = parentWidth * 2
        const tileSizeH = parentHeight * 2
        parentDimensions.current = {
            width: parentWidth,
            height: parentHeight,
            tileSizeW,
            tileSizeH,
        }
    }

    // Cleanup function
    const cleanupInfiniteCanvas = () => {
        // Cleanup: Remove all cloned elements and restore original styles
        elementGroupsRef.current.forEach((group) => {
            // Remove clones
            group.clones.forEach(clone => {
                if (clone.parentNode) {
                    clone.parentNode.removeChild(clone)
                }
            })

            // Restore original element styles
            const el = group.realElement
            el.style.position = group.originalStyles.position
            el.style.left = group.originalStyles.left
            el.style.top = group.originalStyles.top
            el.style.width = group.originalStyles.width
            el.style.height = group.originalStyles.height
            el.style.margin = group.originalStyles.margin
            el.style.transform = group.originalStyles.transform
            el.style.willChange = ""
            el.style.opacity = ""
            el.style.pointerEvents = ""

            const firstChild = el.firstElementChild as HTMLElement
            if (firstChild) firstChild.style.transform = ""
        })
        elementGroupsRef.current = []
    }

    // Find parent element and initialize tracked elements
    useEffect(() => {

        if (RenderTarget.current() === RenderTarget.canvas) return;

        const container = containerRef.current
        if (!container) return

        // Find parent element 2 levels up (Framer wraps code components)
        let parentElement: HTMLElement | null = container.parentElement
        if (parentElement) {
            parentElement = parentElement.parentElement
        }

        if (!parentElement) return

        parentElementRef.current = parentElement

        // Initialize the infinite canvas
        initializeInfiniteCanvas(parentElement)

        // Handle window resize
        const handleWindowResize = () => {
            if (typeof window !== 'undefined') {
                winW.current = window.innerWidth
                winH.current = window.innerHeight
            }
        }

        // Handle parent element resize (debounced)
        const handleParentResize = () => {
            // Clear existing timeout
            if (resizeTimeoutId.current !== null) {
                clearTimeout(resizeTimeoutId.current)
            }

            // Set new timeout for 100ms debounce
            resizeTimeoutId.current = window.setTimeout(() => {
                if (parentElement) {
                    // Cleanup existing elements
                    cleanupInfiniteCanvas()
                    // Re-initialize with new dimensions
                    initializeInfiniteCanvas(parentElement)
                }
                resizeTimeoutId.current = null
            }, 100)
        }

        // Set up ResizeObserver for parent element
        let resizeObserver: ResizeObserver | null = null
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(handleParentResize)
            resizeObserver.observe(parentElement)
        }

        window.addEventListener("resize", handleWindowResize)

        return () => {
            window.removeEventListener("resize", handleWindowResize)

            if (resizeObserver) {
                resizeObserver.disconnect()
            }

            // Clear any pending resize timeout
            if (resizeTimeoutId.current !== null) {
                clearTimeout(resizeTimeoutId.current)
                resizeTimeoutId.current = null
            }

            cleanupInfiniteCanvas()
        }
    }, [])

    // Handle wheel events for scrolling
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return;
        
        const parentElement = parentElementRef.current
        if (!parentElement) return

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            scroll.current.target.x -= e.deltaX * internalScrollSpeed
            scroll.current.target.y -= e.deltaY * internalScrollSpeed
        }

        window.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            window.removeEventListener("wheel", handleWheel)
        }
    }, [scrollSpeed])

    // Handle drag events
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return;
        
        const parentElement = parentElementRef.current
        if (!parentElement || !enableDrag) return

        const handleMouseDown = (e: MouseEvent) => {
            e.preventDefault()
            isDragging.current = true
            document.documentElement.classList.add("dragging")
            mouse.current.press.t = 1
            drag.current.startX = e.clientX
            drag.current.startY = e.clientY
            drag.current.scrollX = scroll.current.target.x
            drag.current.scrollY = scroll.current.target.y
        }

        const handleMouseUp = () => {
            isDragging.current = false
            document.documentElement.classList.remove("dragging")
            mouse.current.press.t = 0
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x.t = e.clientX / winW.current
            mouse.current.y.t = e.clientY / winH.current

            if (isDragging.current) {
                const dx = e.clientX - drag.current.startX
                const dy = e.clientY - drag.current.startY
                scroll.current.target.x = drag.current.scrollX + dx * internalDragSpeed
                scroll.current.target.y = drag.current.scrollY + dy * internalDragSpeed
            }
        }

        // Touch event handlers
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0]
                isDragging.current = true
                mouse.current.press.t = 1
                drag.current.startX = touch.clientX
                drag.current.startY = touch.clientY
                drag.current.scrollX = scroll.current.target.x
                drag.current.scrollY = scroll.current.target.y
            }
        }

        const handleTouchEnd = () => {
            isDragging.current = false
            mouse.current.press.t = 0
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1 && isDragging.current) {
                e.preventDefault()
                const touch = e.touches[0]
                mouse.current.x.t = touch.clientX / winW.current
                mouse.current.y.t = touch.clientY / winH.current
                const dx = touch.clientX - drag.current.startX
                const dy = touch.clientY - drag.current.startY
                scroll.current.target.x = drag.current.scrollX + dx * internalDragSpeed
                scroll.current.target.y = drag.current.scrollY + dy * internalDragSpeed
            }
        }

        parentElement.addEventListener("mousedown", handleMouseDown)
        window.addEventListener("mouseup", handleMouseUp)
        window.addEventListener("mousemove", handleMouseMove)
        parentElement.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        })
        window.addEventListener("touchend", handleTouchEnd)
        window.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        })

        return () => {
            parentElement.removeEventListener("mousedown", handleMouseDown)
            window.removeEventListener("mouseup", handleMouseUp)
            window.removeEventListener("mousemove", handleMouseMove)
            parentElement.removeEventListener("touchstart", handleTouchStart)
            window.removeEventListener("touchend", handleTouchEnd)
            window.removeEventListener("touchmove", handleTouchMove)
        }
    }, [enableDrag, dragSpeed])

    // Update ease value when prop changes
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return;
        
        scroll.current.ease = mapEaseUiToInternal(ease)
    }, [ease])

    // Animation loop
    const render = () => {
        if (RenderTarget.current() === RenderTarget.canvas) return

        // Smooth scroll interpolation
        scroll.current.current.x +=
            (scroll.current.target.x - scroll.current.current.x) *
            scroll.current.ease
        scroll.current.current.y +=
            (scroll.current.target.y - scroll.current.current.y) *
            scroll.current.ease

        // Calculate scroll delta for parallax
        scroll.current.delta.x.t =
            scroll.current.current.x - scroll.current.last.x
        scroll.current.delta.y.t =
            scroll.current.current.y - scroll.current.last.y
        scroll.current.delta.x.c +=
            (scroll.current.delta.x.t - scroll.current.delta.x.c) * 0.04
        scroll.current.delta.y.c +=
            (scroll.current.delta.y.t - scroll.current.delta.y.c) * 0.04

        // Smooth mouse interpolation
        mouse.current.x.c += (mouse.current.x.t - mouse.current.x.c) * 0.04
        mouse.current.y.c += (mouse.current.y.t - mouse.current.y.c) * 0.04
        mouse.current.press.c +=
            (mouse.current.press.t - mouse.current.press.c) * 0.04

        const dirX =
            scroll.current.current.x > scroll.current.last.x ? "right" : "left"
        const dirY =
            scroll.current.current.y > scroll.current.last.y ? "down" : "up"

        const scrollX = scroll.current.current.x
        const scrollY = scroll.current.current.y
        const parentW = parentDimensions.current.width
        const parentH = parentDimensions.current.height
        const tileW = parentDimensions.current.tileSizeW
        const tileH = parentDimensions.current.tileSizeH
        const centerX = winW.current / 2
        const centerY = winH.current / 2
        
        // Mouse position in pixels (approximate)
        const mousePX = mouse.current.x.t * winW.current
        const mousePY = mouse.current.y.t * winH.current

        // Get current parent position for correct collision detection
        // We need to compare mouse (screen space) with items (parent space)
        const parentElement = parentElementRef.current
        if (!parentElement) return
        const parentRect = parentElement.getBoundingClientRect()
        const mouseRelX = mousePX - parentRect.left
        const mouseRelY = mousePY - parentRect.top

        // ANIMATION LOOP: Update each group
        elementGroupsRef.current.forEach((group) => {
            // 1. Calculate positions for all 4 instances (virtual items)
            // We use a temporary array to store calculated styles/positions
            const calculatedPositions: {
                item: TrackedPosition,
                finalX: number,
                finalY: number,
                distToCenter: number,
                distToMouse: number,
                isVisible: boolean
            }[] = []

            group.positions.forEach((item) => {
                // Parallax
                const parallaxMultiplier = parallax?.enabled ? (parallax.general ?? 1) : 0
                const parallaxX =
                    5 * scroll.current.delta.x.c * item.ease +
                    (mouse.current.x.c - 0.5) * item.width * 0.6 * parallaxMultiplier
                const parallaxY =
                    5 * scroll.current.delta.y.c * item.ease +
                    (mouse.current.y.c - 0.5) * item.height * 0.6 * parallaxMultiplier

                // Logic position
                const posX = item.x + scrollX + item.extraX + parallaxX
                const posY = item.y + scrollY + item.extraY + parallaxY

                // Wrapping logic
                const beforeX = posX > parentW
                const afterX = posX + item.width < 0
                const beforeY = posY > parentH
                const afterY = posY + item.height < 0

                if (dirX === "right" && beforeX) item.extraX -= tileW
                if (dirX === "left" && afterX) item.extraX += tileW
                if (dirY === "down" && beforeY) item.extraY -= tileH
                if (dirY === "up" && afterY) item.extraY += tileH

                // Final position
                const finalX = item.x + scrollX + item.extraX + parallaxX
                const finalY = item.y + scrollY + item.extraY + parallaxY

                // Metrics for "Smart Swap"
                // Distance to center of screen (approximation)
                // We use screen coordinates for this metric to be consistent
                const absFinalX = finalX + parentRect.left
                const absFinalY = finalY + parentRect.top
                const cx = absFinalX + item.width / 2
                const cy = absFinalY + item.height / 2
                
                const distToCenter = Math.pow(cx - centerX, 2) + Math.pow(cy - centerY, 2)
                const distToMouse = Math.pow(cx - mousePX, 2) + Math.pow(cy - mousePY, 2)

                // Visibility check
                const buffer = 1000
                const isVisible = 
                    (absFinalX >= -item.width - buffer && absFinalX <= winW.current + buffer) &&
                    (absFinalY >= -item.height - buffer && absFinalY <= winH.current + buffer)

                calculatedPositions.push({
                    item,
                    finalX,
                    finalY,
                    distToCenter,
                    distToMouse,
                    isVisible
                })
            })

            // 2. Determine which position gets the Real Element
            // Priority: Mouse Hover > Last Active > Closest to Center
            // Check if mouse is inside any item
            let bestIndex = -1
            let minMouseDist = Infinity

            // Check for mouse intersection first
            for (let i = 0; i < calculatedPositions.length; i++) {
                const p = calculatedPositions[i]
                // Intersection check using RELATIVE coordinates
                // finalX/Y are relative to parent. mouseRelX/Y are relative to parent.
                if (
                    mouseRelX >= p.finalX && mouseRelX <= p.finalX + p.item.width &&
                    mouseRelY >= p.finalY && mouseRelY <= p.finalY + p.item.height
                ) {
                    // Mouse inside this item. If multiple overlap, pick closest to mouse center
                    if (p.distToMouse < minMouseDist) {
                        minMouseDist = p.distToMouse
                        bestIndex = i
                    }
                }
            }

            // If no mouse hover, try to stick to last active index if visible
            if (bestIndex === -1 && group.lastActiveIndex !== -1) {
                const lastPos = calculatedPositions[group.lastActiveIndex]
                // Keep it if it's still reasonably visible/valid
                if (lastPos && lastPos.isVisible) {
                    bestIndex = group.lastActiveIndex
                }
            }

            // Fallback: If still no index, pick closest to screen center
            if (bestIndex === -1) {
                let minCenterDist = Infinity
                for (let i = 0; i < calculatedPositions.length; i++) {
                    if (calculatedPositions[i].distToCenter < minCenterDist) {
                        minCenterDist = calculatedPositions[i].distToCenter
                        bestIndex = i
                    }
                }
            }

            // Update last active index
            group.lastActiveIndex = bestIndex

            // 3. Assign Elements and Apply Styles
            // We have [Real, Clone1, Clone2, Clone3]
            const availableClones = [...group.clones]
            
            calculatedPositions.forEach((calc, index) => {
                let el: HTMLElement
                const isHovered = index === bestIndex

                if (isHovered) {
                    el = group.realElement
                } else {
                    el = availableClones.pop()!
                }

                // Apply Transform
                el.style.transform = `translate(${calc.finalX}px, ${calc.finalY}px)`
                
                // Apply Visibility
                el.style.opacity = calc.isVisible ? "1" : "0"
                el.style.pointerEvents = calc.isVisible ? "auto" : "none"

                // Apply Inner Parallax (only if enabled AND hovered)
                // We only apply the parallax effect to the "hovered" (active) element
                // to prevent other copies from moving distractingly
                const insideParallaxValue = (parallax?.enabled && isHovered) ? (parallax.child ?? 1) : 0
                const generalParallax = parallax?.general ?? 1
                const translateX = (0.5 - mouse.current.x.c) * calc.item.ease * 20 * generalParallax * insideParallaxValue
                const translateY = (0.5 - mouse.current.y.c) * calc.item.ease * 20 * generalParallax * insideParallaxValue

                const firstChild = el.firstElementChild as HTMLElement
                if (firstChild) {
                    if (insideParallaxValue === 0) {
                        firstChild.style.transform = "none"
                    } else {
                        firstChild.style.transform = `translate(${translateX}%, ${translateY}%)`
                    }
                }
            })
        })

        scroll.current.last.x = scroll.current.current.x
        scroll.current.last.y = scroll.current.current.y
    }

    // Animation loop
    useEffect(() => {
        const animate = () => {
            render()
            rafId.current = requestAnimationFrame(animate)
        }

        rafId.current = requestAnimationFrame(animate)

        return () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current)
                rafId.current = null
            }
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "0px",
                height: "0px",
                overflow: "visible",
                backgroundColor: "transparent",
                transform: "translateZ(0)",
                transformStyle: "flat",
            }}
        />
    )
}

addPropertyControls(InfiniteCanvas, {
    enableDrag: {
        type: ControlType.Boolean,
        title: "Enable Drag",
        defaultValue: true,
    },
    dragSpeed: {
        type: ControlType.Number,
        title: "Drag Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        hidden: (props) => !props.enableDrag,
    },
    scrollSpeed: {
        type: ControlType.Number,
        title: "Scroll Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.4,
    },
    
    ease: {
        type: ControlType.Number,
        title: "Snappy",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.3,
    },
    parallax: {
        type: ControlType.Object,
        title: "Parallax",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enabled",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            general: {
                type: ControlType.Number,
                title: "General",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
            },
            child: {
                type: ControlType.Number,
                title: "Child",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0,
                description: "Controls the parallax effect intensity on inner elements",
            },
        },
        defaultValue: {
            enabled: true,
            general: 1,
            child: 1,
        },
    },
})

InfiniteCanvas.displayName = "Infinite Canvas"
