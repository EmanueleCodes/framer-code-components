import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useAnimationFrame } from "framer-motion"

interface Particle {
    id: number
    x: number
    y: number
    scale: number
    rotate: number
    opacity: number
    vx: number // velocity x
    vy: number // velocity y
    gravity: number
    birthTime: number
    lifeMs: number
    contentIdx: number
    scaleStart: number
    scaleEnd: number
    rotateStart: number // degrees
    rotateEnd: number // degrees
    element: HTMLDivElement // Direct DOM element reference
    isDead: boolean
    reactRoot?: ReturnType<typeof import("react-dom/client").createRoot>
}

// Mapping helpers (see how-to-build-framer-components/mappingValues.md)
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

// Deterministic PRNG per mount to avoid preview cross-run bias of Math.random
function createPRNG(seed: number) {
    // Mulberry32
    return function () {
        seed |= 0
        seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

interface ExplodingTapProps {
    mode?: "components" | "images"
    // Component mode props
    content?: any[]
    // Image mode props
    itemCount?: number
    image1?: any
    image2?: any
    image3?: any
    image4?: any
    image5?: any
    image6?: any
    image7?: any
    image8?: any
    image9?: any
    image10?: any
    itemWidth?: number
    itemHeight?: number
    // Common props
    count?: number
    direction?: {
        horizontal?: "left" | "center" | "right"
        vertical?: "top" | "center" | "bottom"
    }
    gravity?: number
    duration?: number
    scale?: {
        value?: number
        randomize?: boolean
        randomVariation?: number // 0-100 percentage
    }
    rotation?: {
        value?: number
        animate?: boolean
    }
    speed?: number
    randomness?: number
    preview?: boolean
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */

export default function ExplodingTap({
    mode = "components",
    content = [],
    itemCount = 4,
    image1,
    image2,
    image3,
    image4,
    image5,
    image6,
    image7,
    image8,
    image9,
    image10,
    itemWidth = 40,
    itemHeight = 40,
    count = 1,
    direction = {
        horizontal: "center",
        vertical: "top",
    },
    gravity = 900,
    duration = 1200,
    scale = {
        value: 1,
        randomize: false,
        randomVariation: 0,
    },
    rotation = {
        value: 0,
        animate: false,
    },
    speed = 1,
    randomness = 1,
    preview = false,
    style,
}: ExplodingTapProps) {
    const particleIdCounter = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const particleContainerRef = useRef<HTMLDivElement>(null)
    const particlesRef = useRef<Particle[]>([])
    const randRef = useRef<() => number>(() => Math.random())
    const previewRef = useRef(preview)

    // Keep preview ref updated
    useEffect(() => {
        previewRef.current = preview
    }, [preview])

    // Get images array for images mode
    const images = [
        image1,
        image2,
        image3,
        image4,
        image5,
        image6,
        image7,
        image8,
        image9,
        image10,
    ]

    // Determine actual content to use based on mode
    const actualContent =
        mode === "images" ? images.slice(0, itemCount) : content
    const actualCount = mode === "images" ? itemCount : content.length

    // Global preview-safe cleanup (handles Framer preview reloads across canvases)
    useEffect(() => {
        // Fresh seed per mount (time + random; no crypto types needed)
        const timeBits = (Date.now() & 0xffffffff) >>> 0
        const extra = Math.floor(Math.random() * 0xffffffff) >>> 0
        const seed = (timeBits ^ extra) >>> 0
        randRef.current = createPRNG(seed)

        const w = window as any
        if (!w.__EXPLODING_ROOTS__) w.__EXPLODING_ROOTS__ = []
        // Unmount any stray roots from previous previews
        try {
            for (const root of w.__EXPLODING_ROOTS__) {
                try {
                    root.unmount?.()
                } catch {}
            }
        } finally {
            w.__EXPLODING_ROOTS__ = []
        }
        // Remove any stray particle DOM nodes
        document
            .querySelectorAll('[data-exploding-particle="true"]')
            .forEach((el) => {
                el.parentNode?.removeChild(el)
            })
        return () => {
            // Best-effort cleanup of particles created by this instance
            particlesRef.current.forEach((p) => {
                try {
                    p.reactRoot?.unmount()
                } catch {}
                if (p.element && p.element.parentNode) {
                    p.element.parentNode.removeChild(p.element)
                }
            })
            particlesRef.current = []
        }
    }, [])

    // Helper function to calculate spawn position from click/tap event
    const getClickSpawnPosition = (
        event: MouseEvent | TouchEvent
    ): { x: number; y: number } | null => {
        const container = containerRef.current
        if (!container) return null

        const containerRect = container.getBoundingClientRect()
        
        // Get click/tap coordinates
        let clientX: number
        let clientY: number
        
        // Check if it's a MouseEvent
        if ('clientX' in event && 'clientY' in event) {
            clientX = event.clientX
            clientY = event.clientY
        } else if (event.touches && event.touches.length > 0) {
            // TouchEvent with touches array
            clientX = event.touches[0].clientX
            clientY = event.touches[0].clientY
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            // TouchEvent with changedTouches (fallback)
            clientX = event.changedTouches[0].clientX
            clientY = event.changedTouches[0].clientY
        } else {
            return null
        }

        // Calculate position relative to container
        const x = clientX - containerRect.left
        const y = clientY - containerRect.top

        return { x, y }
    }

    // Shared function to create particles at a given position
    const createParticlesAtPosition = (x: number, y: number) => {
        const spawnOne = () => {
            // Map direction controls to velocity values
            // Horizontal: left = -0.4, center = 0, right = +0.4
            const horizontalValue =
                direction.horizontal === "left"
                    ? -0.4
                    : direction.horizontal === "right"
                      ? 0.4
                      : 0
            const baseVx = mapLinear(horizontalValue, -1, 1, -800, 800)
            const spreadVx = mapLinear(randomness, 0, 1, 0, 300) // Controlled by randomness prop
            const vx = (baseVx + (randRef.current() * 2 - 1) * spreadVx) * speed

            // Vertical: top = -0.7, center = 0, bottom = +0.7
            const verticalValue =
                direction.vertical === "top"
                    ? -0.7
                    : direction.vertical === "bottom"
                      ? 0.7
                      : 0
            const baseVy = mapLinear(verticalValue, -1, 1, -800, 800)
            const spreadVy = mapLinear(randomness, 0, 1, 0, 300) // Controlled by randomness prop
            const vy = (baseVy + (randRef.current() * 2 - 1) * spreadVy) * speed

            particleIdCounter.current += 1

            const randBetween = (min: number, max: number) =>
                min + randRef.current() * (max - min)

            // Calculate fixed scale with optional randomization
            const baseScale = scale.value ?? 1
            let particleScale = baseScale

            if (
                scale.randomize &&
                scale.randomVariation !== undefined &&
                scale.randomVariation > 0
            ) {
                // Convert percentage to decimal (e.g., 10% = 0.1)
                const variation = (scale.randomVariation / 100) * baseScale
                const minScale = baseScale - variation
                const maxScale = baseScale + variation
                particleScale = randBetween(minScale, maxScale)
            }

            // Ensure scale is within safe bounds
            const safeScale = Math.max(0.1, Math.min(4, particleScale))

            // Calculate rotation with optional animation
            const baseRotation = rotation.value ?? 0
            let initRot = baseRotation
            let endRot = baseRotation

            if (rotation.animate) {
                // Spawn with random rotation
                initRot = randBetween(-180, 180)
                // Animate by a random delta, capped at 360 degrees
                const rotationDelta = randBetween(-360, 360)
                endRot = initRot + rotationDelta
            }

            // Create DOM element for particle (imperative; avoids React remount jitter)
            const el = document.createElement("div")
            el.setAttribute("data-exploding-particle", "true")
            el.style.position = "absolute"
            el.style.left = "0"
            el.style.top = "0"
            el.style.width = mode === "images" ? `${itemWidth}px` : "32px"
            el.style.height = mode === "images" ? `${itemHeight}px` : "32px"
            el.style.display = "flex"
            el.style.alignItems = "center"
            el.style.justifyContent = "center"
            el.style.pointerEvents = "none"
            el.style.willChange = "transform, opacity"
            el.style.transformOrigin = "50% 50%"
            el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${safeScale}) rotate(${initRot}deg)`
            el.style.opacity = "1"

            // Render content inside
            if (actualContent && actualContent.length > 0) {
                const contentIdx =
                    (particleIdCounter.current - 1) % actualContent.length
                const contentElement = actualContent[contentIdx]
                if (contentElement) {
                    if (mode === "images" && contentElement.src) {
                        // For images mode, use native img element
                        const img = document.createElement("img")
                        img.src = contentElement.src
                        img.style.width = "100%"
                        img.style.height = "100%"
                        img.style.objectFit = "cover"
                        el.appendChild(img)
                    } else {
                        // For components mode, use React root
                        const tempDiv = document.createElement("div")
                        tempDiv.style.width = "100%"
                        tempDiv.style.height = "100%"
                        el.appendChild(tempDiv)
                        import("react-dom/client").then(({ createRoot }) => {
                            const root = createRoot(tempDiv)
                            ;(window as any).__EXPLODING_ROOTS__.push(root)
                            root.render(
                                React.cloneElement(contentElement, {
                                    style: {
                                        ...(contentElement as any)?.props
                                            ?.style,
                                        transform: "none",
                                        scale: "none",
                                        rotate: "none",
                                        translate: "none",
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        width: "100%",
                                        height: "100%",
                                    },
                                })
                            )
                            // Attach root reference after render completes
                            newParticle.reactRoot = root
                        })
                    }
                }
            } else {
                const fallback = document.createElement("div")
                fallback.style.width = "16px"
                fallback.style.height = "16px"
                fallback.style.borderRadius = "6px"
                fallback.style.backgroundColor = "#6366f1"
                el.appendChild(fallback)
            }

            // Append to container
            if (particleContainerRef.current) {
                particleContainerRef.current.appendChild(el)
            }

            // Create particle object
            const newParticle: Particle = {
                id: particleIdCounter.current,
                x: x,
                y: y,
                scale: safeScale,
                rotate: initRot,
                opacity: 1,
                vx,
                vy,
                gravity: mapLinear(
                    Math.max(-1, Math.min(1, gravity ?? 0.45)),
                    -1,
                    1,
                    -2000,
                    2000
                ),
                birthTime: performance.now(),
                lifeMs: duration * 1000,
                contentIdx:
                    actualContent.length > 0
                        ? (particleIdCounter.current - 1) % actualContent.length
                        : -1,
                scaleStart: safeScale,
                scaleEnd: safeScale, // Same as start - no scale animation
                rotateStart: initRot,
                rotateEnd: endRot,
                element: el,
                isDead: false,
                reactRoot: undefined,
            }

            particlesRef.current.push(newParticle)

            // Remove after lifetime
            setTimeout(() => {
                newParticle.isDead = true
                try {
                    newParticle.reactRoot?.unmount()
                } catch {}
                const w = window as any
                if (w.__EXPLODING_ROOTS__) {
                    w.__EXPLODING_ROOTS__ = w.__EXPLODING_ROOTS__.filter(
                        (r: any) => r !== newParticle.reactRoot
                    )
                }
                if (newParticle.element && newParticle.element.parentNode) {
                    newParticle.element.parentNode.removeChild(
                        newParticle.element
                    )
                }
                particlesRef.current = particlesRef.current.filter(
                    (p) => p.id !== newParticle.id
                )
            }, duration * 1000)
        }

        const particlesToSpawn = Math.max(1, Math.min(5, Math.round(count)))
        for (let i = 0; i < particlesToSpawn; i++) spawnOne()
    }

    // Listen for click/tap events on parent element (2 levels up)
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Find parent element 2 levels up (Framer wraps code components)
        let parentElement: HTMLElement | null = container.parentElement
        if (parentElement) {
            parentElement = parentElement.parentElement
        }

        if (!parentElement) return

        // Handle both mouse clicks and touch events
        const handleClick = (e: MouseEvent | TouchEvent) => {
            // Check if click is within the parent element
            const parentRect = parentElement!.getBoundingClientRect()
            let clientX: number
            let clientY: number

            // Check if it's a MouseEvent
            if ('clientX' in e && 'clientY' in e) {
                clientX = e.clientX
                clientY = e.clientY
            } else if (e.touches && e.touches.length > 0) {
                // TouchEvent with touches array
                clientX = e.touches[0].clientX
                clientY = e.touches[0].clientY
            } else if (e.changedTouches && e.changedTouches.length > 0) {
                // TouchEvent with changedTouches (fallback)
                clientX = e.changedTouches[0].clientX
                clientY = e.changedTouches[0].clientY
            } else {
                return
            }

            // Only spawn if click is within parent bounds
            if (
                clientX >= parentRect.left &&
                clientX <= parentRect.right &&
                clientY >= parentRect.top &&
                clientY <= parentRect.bottom
            ) {
                const pos = getClickSpawnPosition(e)
                if (pos) {
                    createParticlesAtPosition(pos.x, pos.y)
                }
            }
        }

        // Prevent default touch behavior to avoid scrolling issues
        const handleTouchStart = (e: TouchEvent) => {
            handleClick(e)
            // Don't prevent default to allow normal touch behavior
        }

        parentElement.addEventListener("click", handleClick)
        parentElement.addEventListener("touchstart", handleTouchStart)

        return () => {
            parentElement?.removeEventListener("click", handleClick)
            parentElement?.removeEventListener("touchstart", handleTouchStart)
        }
    }, [
        direction,
        gravity,
        duration,
        content,
        count,
        scale,
        rotation,
        mode,
        itemWidth,
        itemHeight,
        speed,
        randomness,
    ])

    // Preview mode: automatically spawn particles in canvas mode
    useEffect(() => {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (!isCanvas || !preview) return

        const spawnPreviewParticles = () => {
            const container = containerRef.current
            if (!container) return

            // Find parent element 2 levels up
            let parentElement: HTMLElement | null = container.parentElement
            if (parentElement) {
                parentElement = parentElement.parentElement
            }

            if (parentElement) {
                const parentRect = parentElement.getBoundingClientRect()
                const containerRect = container.getBoundingClientRect()
                
                // Spawn from center of parent element
                const x = parentRect.left - containerRect.left + parentRect.width / 2
                const y = parentRect.top - containerRect.top + parentRect.height / 2
                createParticlesAtPosition(x, y)
            } else {
                // Fallback to center if parent not found
                createParticlesAtPosition(0, 0)
            }
        }

        // Spawn particles every 300ms
        const intervalId = setInterval(spawnPreviewParticles, 300)

        return () => {
            clearInterval(intervalId)
        }
    }, [
        preview,
        direction,
        gravity,
        duration,
        count,
        scale,
        rotation,
        mode,
        itemWidth,
        itemHeight,
        content,
        actualContent,
        speed,
        randomness,
    ])

    // Cleanup: Remove all particles instantly when preview is turned off in canvas mode
    useEffect(() => {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (!isCanvas || preview) return

        // Remove all particles immediately
        particlesRef.current.forEach((p) => {
            p.isDead = true
            try {
                p.reactRoot?.unmount()
            } catch {}
            const w = window as any
            if (w.__EXPLODING_ROOTS__) {
                w.__EXPLODING_ROOTS__ = w.__EXPLODING_ROOTS__.filter(
                    (r: any) => r !== p.reactRoot
                )
            }
            if (p.element && p.element.parentNode) {
                p.element.parentNode.removeChild(p.element)
            }
        })
        particlesRef.current = []
    }, [preview])

    // Shared animation update function
    const updateParticles = (delta?: number) => {
        const dtMs = delta ? Math.min(32, delta) : 16 // default to ~60fps if no delta
        const dt = dtMs / 1000 // convert to seconds

        // Use performance.now() consistently with birthTime
        const now = performance.now()

        // Update all particles via direct DOM manipulation (imperative updates, no React re-renders)
        particlesRef.current.forEach((p) => {
            // Skip dead particles
            if (p.isDead) return

            const age = now - p.birthTime

            // Check if element exists
            if (!p.element) {
                return
            }

            // Check if particle exceeded lifetime
            if (age >= p.lifeMs) {
                return
            }

            // Calculate progress (0 to 1) for interpolation
            const progress = age / p.lifeMs

            // Integrate motion: v = v + a*dt; s = s + v*dt
            p.vy = p.vy + p.gravity * dt
            p.x = p.x + p.vx * dt
            p.y = p.y + p.vy * dt

            // Interpolate scale, rotate, and opacity based on lifetime progress
            p.scale = mapLinear(progress, 0, 1, p.scaleStart, p.scaleEnd)
            p.rotate = mapLinear(progress, 0, 1, p.rotateStart, p.rotateEnd)

            // Fade out in last 30% of lifetime
            const fadeStart = 0.7
            p.opacity =
                progress > fadeStart
                    ? mapLinear(progress, fadeStart, 1, 1, 0)
                    : 1

            // Check for invalid values
            if (isNaN(p.x) || isNaN(p.y) || isNaN(p.scale)) {
                return
            }

            // Clamp scale and update transform in correct order: rotate -> scale -> center -> position
            const clampedScale = Math.max(0.1, Math.min(3, p.scale))
            const transformValue = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${clampedScale}) rotate(${p.rotate}deg)`
            p.element.style.transform = transformValue
            p.element.style.opacity = String(p.opacity)
        })
    }

    // Physics loop using direct DOM manipulation for maximum performance
    useAnimationFrame((time, delta) => {
        updateParticles(delta)
    })

    // Fallback animation loop for canvas mode (in case useAnimationFrame doesn't run)
    useEffect(() => {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (!isCanvas || !preview) return

        let rafId: number
        let lastTime = performance.now()

        const animate = (currentTime: number) => {
            const delta = currentTime - lastTime
            lastTime = currentTime
            updateParticles(delta)
            rafId = requestAnimationFrame(animate)
        }

        rafId = requestAnimationFrame(animate)

        return () => {
            cancelAnimationFrame(rafId)
        }
    }, [preview])

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
        >
            <div
                ref={particleContainerRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

addPropertyControls(ExplodingTap, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
    },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["components", "images"],
        optionTitles: ["Components", "Images"],
        defaultValue: "components",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    content: {
        type: ControlType.Array,
        title: "Content",
        control: {
            type: ControlType.ComponentInstance,
        },
        hidden: (props) => props.mode === "images",
    },
    itemCount: {
        type: ControlType.Number,
        title: "Count",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 4,
        hidden: (props) => props.mode === "components",
    },
    image1: {
        type: ControlType.ResponsiveImage,
        title: "Image 1",
        hidden: (props) => props.mode !== "images",
    },
    image2: {
        type: ControlType.ResponsiveImage,
        title: "Image 2",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 2,
    },
    image3: {
        type: ControlType.ResponsiveImage,
        title: "Image 3",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 3,
    },
    image4: {
        type: ControlType.ResponsiveImage,
        title: "Image 4",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 4,
    },
    image5: {
        type: ControlType.ResponsiveImage,
        title: "Image 5",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 5,
    },
    image6: {
        type: ControlType.ResponsiveImage,
        title: "Image 6",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 6,
    },
    image7: {
        type: ControlType.ResponsiveImage,
        title: "Image 7",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 7,
    },
    image8: {
        type: ControlType.ResponsiveImage,
        title: "Image 8",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 8,
    },
    image9: {
        type: ControlType.ResponsiveImage,
        title: "Image 9",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 9,
    },
    image10: {
        type: ControlType.ResponsiveImage,
        title: "Image 10",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 10,
    },
    itemWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 20,
        max: 200,
        step: 5,
        defaultValue: 40,
        unit: "px",
        hidden: (props) => props.mode !== "images",
    },
    itemHeight: {
        type: ControlType.Number,
        title: "Height",
        min: 20,
        max: 200,
        step: 5,
        defaultValue: 40,
        unit: "px",
        hidden: (props) => props.mode !== "images",
    },
    count: {
        type: ControlType.Number,
        title: "Amount",
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 1,
    },
    scale: {
        type: ControlType.Object,
        title: "Scale",
        controls: {
            value: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.5,
                max: 4,
                step: 0.05,
                defaultValue: 1,
            },
            randomize: {
                type: ControlType.Boolean,
                title: "Randomize",
                defaultValue: false,
            },
            randomVariation: {
                type: ControlType.Number,
                title: "Variation",
                min: 0,
                max: 100,
                step: 1,
                defaultValue: 0,
                unit: "%",
                hidden: (props) => !props.randomize,
            },
        },
    },
    rotation: {
        type: ControlType.Object,
        title: "Rotation",
        controls: {
            value: {
                type: ControlType.Number,
                title: "Rotation",
                min: -360,
                max: 360,
                step: 1,
                defaultValue: 0,
                unit: "°",
            },
            animate: {
                type: ControlType.Boolean,
                title: "Animate",
                defaultValue: false,
            },
        },
    },
    direction: {
        type: ControlType.Object,
        title: "Direction",
        controls: {
            horizontal: {
                type: ControlType.Enum,
                title: "Horizontal",
                options: ["left", "center", "right"],
                optionTitles: ["<-", "•", "->"],
                defaultValue: "left",
                displaySegmentedControl: true,
            },
            vertical: {
                type: ControlType.Enum,
                title: "Vertical",
                options: ["top", "center", "bottom"],
                optionTitles: ["↑", "•", "↓"],
                defaultValue: "top",
                displaySegmentedControl: true,
            },
        },
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 1,
    },
    randomness: {
        type: ControlType.Number,
        title: "Randomness",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 1,
    },
    gravity: {
        type: ControlType.Number,
        title: "Gravity",
        min: -1,
        max: 1,
        step: 0.05,
        defaultValue: 0.7,
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.2,
        max: 10,
        step: 0.1,
        defaultValue: 3,
        description:
        "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ExplodingTap.displayName = "Exploding Tap"
