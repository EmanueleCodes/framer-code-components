import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface TrackedElement {
    el: HTMLElement
    initialX: number
    initialY: number
    tileOffsetX: number // Tile offset for duplication (0 or tileW)
    tileOffsetY: number // Tile offset for duplication (0 or tileH)
    width: number
    height: number
    extraX: number
    extraY: number
    ease: number
    isClone: boolean // Track if this is a cloned element for cleanup
}

interface InfiniteCanvasProps {
    scrollSpeed?: number
    dragSpeed?: number
    ease?: number
    parallax?: number
    enableDrag?: boolean
    style?: React.CSSProperties
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
    dragSpeed = 1,
    ease = 0.06,
    parallax = 1,
    enableDrag = true,
    style,
}: InfiniteCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const parentElementRef = useRef<HTMLElement | null>(null)
    const trackedElementsRef = useRef<TrackedElement[]>([])

    const scroll = useRef({
        ease: ease,
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

    const winW = useRef(window.innerWidth)
    const winH = useRef(window.innerHeight)
    const rafId = useRef<number | null>(null)

    // Find parent element and initialize tracked elements
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

        // Store initial window dimensions
        winW.current = window.innerWidth
        winH.current = window.innerHeight

        // Find all direct children of parent element (these are the base elements)
        const baseChildren = Array.from(parentElement.children).filter(
            (child) => child !== container.parentElement
        ) as HTMLElement[]

        // Calculate tile size (viewport dimensions for wrapping)
        const tileW = winW.current
        const tileH = winH.current

        // Create 2x2 grid of duplicates for each base element (infinite tiling)
        // repsX = [0, tileW] and repsY = [0, tileH] creates 4 copies positioned at:
        // (0,0), (tileW,0), (0,tileH), (tileW,tileH)
        const repsX = [0, tileW]
        const repsY = [0, tileH]

        trackedElementsRef.current = []

        baseChildren.forEach((baseChild) => {
            const rect = baseChild.getBoundingClientRect()
            const parentRect = parentElement!.getBoundingClientRect()
            const baseX = rect.left - parentRect.left
            const baseY = rect.top - parentRect.top

            // Generate random ease once for this base element
            const elementEase = Math.random() * 0.5 + 0.5

            repsX.forEach((offsetX) => {
                repsY.forEach((offsetY) => {
                    // For the original position (0,0), use the original element
                    // For other positions, clone the element
                    let element: HTMLElement

                    if (offsetX === 0 && offsetY === 0) {
                        // Use original element for (0,0) position
                        element = baseChild
                    } else {
                        // Clone element for duplicate positions
                        element = baseChild.cloneNode(true) as HTMLElement
                        // Insert the clone into the parent
                        parentElement.appendChild(element)
                    }

                    // Track this element (original or clone) with its offset
                    trackedElementsRef.current.push({
                        el: element,
                        initialX: baseX,
                        initialY: baseY,
                        tileOffsetX: offsetX,
                        tileOffsetY: offsetY,
                        width: rect.width,
                        height: rect.height,
                        extraX: 0,
                        extraY: 0,
                        ease: elementEase, // Same ease for all copies of the same element
                        isClone: !(offsetX === 0 && offsetY === 0), // Mark clones for cleanup
                    })
                })
            })
        })

        // Reset scroll position
        scroll.current.current = { x: 0, y: 0 }
        scroll.current.target = { x: 0, y: 0 }
        scroll.current.last = { x: 0, y: 0 }

        // Position elements at their initial tile offsets
        trackedElementsRef.current.forEach((item) => {
            if (item.isClone) {
                // Clones: position at initial + tile offset
                item.el.style.transform = `translate(${item.initialX + item.tileOffsetX}px, ${item.initialY + item.tileOffsetY}px)`
            } else {
                // Original: no transform (stays in natural Framer position)
                item.el.style.transform = ""
            }
            // Reset first child transform if it exists
            const firstChild = item.el.firstElementChild as HTMLElement
            if (firstChild) {
                firstChild.style.transform = ""
            }
        })

        // Handle window resize
        const handleResize = () => {
            winW.current = window.innerWidth
            winH.current = window.innerHeight

            // Recalculate initial positions
            if (parentElement) {
                const parentRect = parentElement.getBoundingClientRect()
                trackedElementsRef.current.forEach((item) => {
                    const rect = item.el.getBoundingClientRect()
                    item.initialX = rect.left - parentRect.left
                    item.initialY = rect.top - parentRect.top
                    item.width = rect.width
                    item.height = rect.height
                })
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)

            // Cleanup: Remove all cloned elements
            trackedElementsRef.current.forEach((item) => {
                if (item.isClone && item.el.parentNode) {
                    item.el.parentNode.removeChild(item.el)
                }
            })
            trackedElementsRef.current = []
        }
    }, [])

    // Handle wheel events for scrolling
    useEffect(() => {
        const parentElement = parentElementRef.current
        if (!parentElement) return

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            scroll.current.target.x -= e.deltaX * scrollSpeed
            scroll.current.target.y -= e.deltaY * scrollSpeed
        }

        window.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            window.removeEventListener("wheel", handleWheel)
        }
    }, [scrollSpeed])

    // Handle drag events
    useEffect(() => {
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
                scroll.current.target.x = drag.current.scrollX + dx * dragSpeed
                scroll.current.target.y = drag.current.scrollY + dy * dragSpeed
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
                scroll.current.target.x = drag.current.scrollX + dx * dragSpeed
                scroll.current.target.y = drag.current.scrollY + dy * dragSpeed
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
        scroll.current.ease = ease
    }, [ease])

    // Animation loop
    const render = () => {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas

        // If in canvas mode, reset all elements to original positions (no transforms)
        // Also hide clones so designers only see the original elements
        if (isCanvas) {
            trackedElementsRef.current.forEach((item) => {
                item.el.style.transform = ""
                // Hide clones in canvas mode
                item.el.style.display = item.isClone ? "none" : ""
                // Reset first child transform if it exists
                const firstChild = item.el.firstElementChild as HTMLElement
                if (firstChild) {
                    firstChild.style.transform = ""
                }
            })
            return
        }

        // In preview/live mode, show all elements (including clones)
        trackedElementsRef.current.forEach((item) => {
            item.el.style.display = ""
        })

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

        // Update each tracked element
        trackedElementsRef.current.forEach((item) => {
            // Calculate parallax offset
            const parallaxX =
                5 * scroll.current.delta.x.c * item.ease +
                (mouse.current.x.c - 0.5) * item.width * 0.6 * parallax
            const parallaxY =
                5 * scroll.current.delta.y.c * item.ease +
                (mouse.current.y.c - 0.5) * item.height * 0.6 * parallax

            // Calculate position with scroll, tile offset, and parallax
            const scrollX = scroll.current.current.x
            const scrollY = scroll.current.current.y
            
            // For checking wrapping, we need the absolute position
            const absolutePosX =
                item.initialX +
                item.tileOffsetX +
                scrollX +
                item.extraX +
                parallaxX
            const absolutePosY =
                item.initialY +
                item.tileOffsetY +
                scrollY +
                item.extraY +
                parallaxY

            // Infinite wrapping logic
            const beforeX = absolutePosX > winW.current
            const afterX = absolutePosX + item.width < 0
            const beforeY = absolutePosY > winH.current
            const afterY = absolutePosY + item.height < 0

            // Calculate tile size for wrapping (use viewport dimensions * 2)
            const tileW = winW.current * 2
            const tileH = winH.current * 2

            if (dirX === "right" && beforeX) item.extraX -= tileW
            if (dirX === "left" && afterX) item.extraX += tileW
            if (dirY === "down" && beforeY) item.extraY -= tileH
            if (dirY === "up" && afterY) item.extraY += tileH

            // Calculate transform delta (like backup.tsx approach)
            // For original elements: only scroll + extra + parallax
            // For clones: they're already positioned at initialX + tileOffset, so same delta applies
            const deltaX = scrollX + item.extraX + parallaxX
            const deltaY = scrollY + item.extraY + parallaxY

            // Apply transform
            if (item.isClone) {
                // Clones: add delta to their initial tile position
                item.el.style.transform = `translate(${item.initialX + item.tileOffsetX + deltaX}px, ${item.initialY + item.tileOffsetY + deltaY}px)`
            } else {
                // Original: just apply delta from natural position
                item.el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
            }

            // Apply parallax scale effect on press
            const scale = 1.2 + 0.2 * mouse.current.press.c * item.ease
            const translateX = -mouse.current.x.c * item.ease * 10 * parallax
            const translateY = -mouse.current.y.c * item.ease * 10 * parallax

            // Apply to first child if it exists (for nested content)
            const firstChild = item.el.firstElementChild as HTMLElement
            if (firstChild) {
                firstChild.style.transform = `scale(${scale}) translate(${translateX}%, ${translateY}%)`
            }
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
    scrollSpeed: {
        type: ControlType.Number,
        title: "Scroll Speed",
        min: 0.1,
        max: 2,
        step: 0.1,
        defaultValue: 0.4,
    },
    dragSpeed: {
        type: ControlType.Number,
        title: "Drag Speed",
        min: 0.1,
        max: 2,
        step: 0.1,
        defaultValue: 1,
    },
    ease: {
        type: ControlType.Number,
        title: "Smoothness",
        min: 0.01,
        max: 0.2,
        step: 0.01,
        defaultValue: 0.06,
        description: "Lower = smoother, higher = snappier",
    },
    parallax: {
        type: ControlType.Number,
        title: "Parallax",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 1,
    },
    enableDrag: {
        type: ControlType.Boolean,
        title: "Enable Drag",
        defaultValue: true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
    style: {
        type: ControlType.Object,
        title: "Style",
        controls: {},
        hidden: () => true,
    },
})

InfiniteCanvas.displayName = "Infinite Canvas"
