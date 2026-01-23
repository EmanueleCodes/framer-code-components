import { addPropertyControls, ControlType } from "framer"
import { useRef, useEffect, useLayoutEffect } from "react"
import { motion, useTransform, useScroll, useMotionValue } from "framer-motion"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function ImageParallax(props: {
    verticalParallaxAmount?: number
    horizontalParallaxAmount?: number
    image?: string
    style?: React.CSSProperties
    borderRadius?: number
    border?: {
        borderWidth?: number
        borderTopWidth?: number
        borderRightWidth?: number
        borderBottomWidth?: number
        borderLeftWidth?: number
        borderStyle?: string
        borderColor?: string
    }
}) {
    const {
        verticalParallaxAmount = 264,
        horizontalParallaxAmount = 0,
        image,
        style,
        borderRadius = 0,
        border,
    } = props

    // Reference to the container element for position calculations
    const containerRef = useRef<HTMLDivElement>(null)

    // Motion value for horizontal movement
    const xMotionValue = useMotionValue(0)

    // Track vertical scroll progress using Framer Motion's useScroll
    // offset: ["start end", "end start"] means the effect runs from when the element's
    // top edge enters the bottom of the viewport until its bottom edge leaves the top
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    })

    // Transform scroll progress (0-1) to y-position movement
    const y = useTransform(
        scrollYProgress,
        [0, 1],
        [0, verticalParallaxAmount],
        {
            clamp: false,
        }
    )

    // Initialize horizontal position immediately on mount/prop change (before paint)
    useLayoutEffect(() => {
        if (horizontalParallaxAmount === 0) {
            xMotionValue.set(0)
            return
        }

        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const horizontalProgress =
            1 - (rect.left + rect.width) / (viewportWidth + rect.width)
        const initialX = horizontalProgress * horizontalParallaxAmount

        // Set initial value immediately
        xMotionValue.set(initialX)
    }, [horizontalParallaxAmount, xMotionValue])

    // Effect to track horizontal position in viewport
    useEffect(() => {
        // Skip setup if horizontal parallax is disabled (amount is 0)
        if (horizontalParallaxAmount === 0) {
            return
        }

        let observer: IntersectionObserver | null = null
        let animationFrame: number | null = null

        // Function to calculate and update horizontal parallax position
        const updateHorizontalParallax = () => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const viewportWidth = window.innerWidth

            // Calculate horizontal progress (0-1) based on the element's position
            const horizontalProgress =
                1 - (rect.left + rect.width) / (viewportWidth + rect.width)

            // Calculate the new horizontal position based on progress and parallax amount
            const newX = horizontalProgress * horizontalParallaxAmount

            // Update the motion value immediately
            xMotionValue.set(newX)
        }

        // Animation loop function for smooth updates
        const animate = () => {
            updateHorizontalParallax()
            animationFrame = requestAnimationFrame(animate)
        }

        // Use Intersection Observer for efficiency - only animate when visible
        observer = new IntersectionObserver(
            (entries) => {
                const isVisible = entries[0].isIntersecting

                if (isVisible) {
                    // Start animation loop when element becomes visible
                    if (!animationFrame) {
                        animationFrame = requestAnimationFrame(animate)
                    }
                } else {
                    // Stop animation loop when element is not visible
                    if (animationFrame) {
                        cancelAnimationFrame(animationFrame)
                        animationFrame = null
                    }
                }
            },
            { threshold: 0.01, rootMargin: "20% 0px" }
        )

        // Start observing the container element
        if (containerRef.current) {
            observer.observe(containerRef.current)
        }

        // Cleanup function to prevent memory leaks
        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame)
            }
            if (observer) {
                observer.disconnect()
            }
        }
    }, [horizontalParallaxAmount, xMotionValue])

    // Check if image is provided
    const hasImage = !!(image && image.trim())

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                overflow: "hidden",
                width: "100%",
                height: "100%",
                borderRadius: borderRadius,
                ...(border || {}),
            }}
        >
            {!hasImage ? (
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="Image Parallax"
                    subtitle="Add an image to create a parallax effect that moves as you scroll"
                />
            ) : (
                <motion.div
                    style={{
                        position: "absolute",
                        // Extend beyond boundaries to allow room for parallax movement
                        top:
                            verticalParallaxAmount < 0
                                ? 0
                                : -Math.abs(verticalParallaxAmount),
                        left:
                            horizontalParallaxAmount < 0
                                ? 0
                                : -Math.abs(horizontalParallaxAmount),
                        right:
                            horizontalParallaxAmount > 0
                                ? 0
                                : -Math.abs(horizontalParallaxAmount),
                        bottom:
                            verticalParallaxAmount > 0
                                ? 0
                                : -Math.abs(verticalParallaxAmount),
                        // Apply transformations for parallax effect
                        y: y,
                        x: xMotionValue,
                        backgroundImage: image ? `url(${image})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        borderRadius: borderRadius,
                        // Optimize rendering performance
                        willChange: "transform",
                        // Prevent text selection and mouse interactions with the parallax layer
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    )
}

// Default props with descriptive values
ImageParallax.defaultProps = {
    verticalParallaxAmount: 264,
    horizontalParallaxAmount: 0,
}

// Property controls with descriptive tooltips and appropriate ranges
addPropertyControls(ImageParallax, {
    image: {
        type: ControlType.Image,
        title: "Image",
    },
    // Vertical parallax controls
    verticalParallaxAmount: {
        type: ControlType.Number,
        title: "Parallax Y",
        defaultValue: 264,
        step: 10,

        max: 1000,
        min: -1000,
        unit: "px",
    },
    horizontalParallaxAmount: {
        type: ControlType.Number,
        title: "Parallax X",
        defaultValue: 0,
        step: 10,
        max: 1000,
        min: -1000,
        unit: "px",
        description: "Only seen if image moves horizontally.",
    },
    border: {
        // @ts-ignore - ControlType.Border exists but may not be in types
        type: ControlType.Border,

        title: "Border",
        optional: true,
    },
    borderRadius: {
        // @ts-ignore - ControlType.BorderRadius exists but may not be in types
        type: ControlType.BorderRadius,
        title: "Radius",
        defaultValue: 0,
        min: 0,
        max: 100,
        step: 1,
        unit: "px",
    },
})
