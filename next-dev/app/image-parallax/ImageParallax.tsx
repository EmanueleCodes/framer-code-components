import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useRef, useLayoutEffect, useMemo } from "react"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// GSAP imports from CDN
// If CDN imports fail, use the bundled version instead:
import { gsap, ScrollTrigger } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/gsap-scrolltrigger.js"
// import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.esm.js"
// import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.esm.js"

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

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
    image?: any
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
    boxShadow?: string
}) {
    const {
        verticalParallaxAmount = 50,
        horizontalParallaxAmount = 0,
        image,
        style,
        borderRadius = 0,
        border,
        boxShadow,
    } = props

    // Reference to the container and image elements
    const containerRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLDivElement>(null)
    
    // Detect if we're in canvas mode (memoized to avoid recalculation)
    const isCanvas = useMemo(() => RenderTarget.current() === RenderTarget.canvas, [])

    // Setup GSAP ScrollTrigger for vertical parallax effect
    useLayoutEffect(() => {
        if (isCanvas || !containerRef.current || !imageRef.current) return

        const container = containerRef.current
        const image = imageRef.current

        // Create GSAP animation with ScrollTrigger for vertical parallax
        // Using a function for y value so it recalculates on refresh
        const verticalAnimation = gsap.fromTo(
            image,
            {
                y: 0,
            },
            {
                y: () => {
                    // Convert percentage to pixels based on current container height
                    const containerHeight = container.offsetHeight
                    return (verticalParallaxAmount / 100) * containerHeight
                },
                ease: "none", // Linear easing for smooth scrubbing
                scrollTrigger: {
                    trigger: container,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true, // Smooth scrubbing - this eliminates jitter!
                    invalidateOnRefresh: true, // Recalculate on resize
                },
            }
        )

        // Cleanup function
        return () => {
            verticalAnimation.kill()
            // Kill ScrollTrigger associated with this container
            const triggers = ScrollTrigger.getAll()
            for (let i = 0; i < triggers.length; i++) {
                const trigger = triggers[i] as any
                if (trigger.vars?.trigger === container) {
                    trigger.kill()
                }
            }
        }
    }, [isCanvas, verticalParallaxAmount])

    // Setup horizontal parallax based on viewport position (like reference)
    // This uses ScrollTrigger's refresh mechanism to update on scroll
    useLayoutEffect(() => {
        if (isCanvas || horizontalParallaxAmount === 0 || !containerRef.current || !imageRef.current) {
            if (imageRef.current) {
                gsap.set(imageRef.current, { x: 0 })
            }
            return
        }

        const container = containerRef.current
        const image = imageRef.current

        // Function to calculate horizontal position based on viewport (matching reference logic)
        const updateHorizontalPosition = () => {
            if (!container || !image) return
            
            const rect = container.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const containerWidth = container.offsetWidth
            
            // Same calculation as reference: 1 - (rect.left + rect.width) / (viewportWidth + rect.width)
            const horizontalProgress = 1 - (rect.left + rect.width) / (viewportWidth + rect.width)
            
            // Convert percentage to pixels based on container width
            const xAmount = (horizontalParallaxAmount / 100) * containerWidth
            const xPosition = horizontalProgress * xAmount
            
            // Use GSAP for smooth updates
            gsap.set(image, { x: xPosition })
        }

        // Create ScrollTrigger that refreshes on scroll to update horizontal position
        const horizontalTrigger = ScrollTrigger.create({
            trigger: container,
            start: "top bottom",
            end: "bottom top",
            onUpdate: () => {
                updateHorizontalPosition()
            },
            onRefresh: () => {
                updateHorizontalPosition()
            },
        })

        // Initial position
        updateHorizontalPosition()

        // Update on scroll and resize
        const handleScroll = () => {
            updateHorizontalPosition()
        }
        const handleResize = () => {
            updateHorizontalPosition()
            ScrollTrigger.refresh()
        }
        
        window.addEventListener("scroll", handleScroll, { passive: true })
        window.addEventListener("resize", handleResize, { passive: true })

        return () => {
            horizontalTrigger.kill()
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", handleResize)
        }
    }, [isCanvas, horizontalParallaxAmount])

    // Check if image is provided
    const imageSrc = image?.src || (typeof image === "string" ? image : null)
    const hasImage = !!imageSrc

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
                boxShadow: boxShadow || undefined,
               
            }}
        >
            {/* Border overlay */}
            {hasImage && (
                <div style={{
                    width: "100%",
                    zIndex: 1000,
                    height: "100%",
                    borderRadius: borderRadius,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    ...(border || {}),
                }}/>
            )}
            
            {/* No image placeholder */}
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
            ) : isCanvas ? (
                // Canvas mode: render simple image without parallax
                <img
                    src={imageSrc}
                    srcSet={image?.srcSet}
                    alt={image?.alt || ""}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: image?.positionX && image?.positionY 
                            ? `${image.positionX} ${image.positionY}` 
                            : "center",
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                />
            ) : (
                // Preview/production mode: render parallax effect with GSAP
                // Extend beyond boundaries to allow room for parallax movement (matching reference)
                <div
                    ref={imageRef}
                    style={{
                        position: "absolute",
                        // Use percentage-based offsets - GSAP will handle the pixel conversion
                        // The negative values extend the image beyond boundaries for parallax movement
                        top: verticalParallaxAmount < 0 ? 0 : `-${Math.abs(verticalParallaxAmount)}%`,
                        left: horizontalParallaxAmount < 0 ? 0 : `-${Math.abs(horizontalParallaxAmount)}%`,
                        right: horizontalParallaxAmount > 0 ? 0 : `-${Math.abs(horizontalParallaxAmount)}%`,
                        bottom: verticalParallaxAmount > 0 ? 0 : `-${Math.abs(verticalParallaxAmount)}%`,
                        // Always use Math.abs so the image is larger than container regardless of direction
                        width: `calc(100% + ${Math.abs(horizontalParallaxAmount)}%)`,
                        height: `calc(100% + ${Math.abs(verticalParallaxAmount)}%)`,
                        backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: image?.positionX && image?.positionY 
                            ? `${image.positionX} ${image.positionY}` 
                            : "center",
                        borderRadius: borderRadius,
                        willChange: "transform",
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
    verticalParallaxAmount: 50,
    horizontalParallaxAmount: 0,
}

// Property controls with descriptive tooltips and appropriate ranges
addPropertyControls(ImageParallax, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    // Vertical parallax controls (in percentage)
    verticalParallaxAmount: {
        type: ControlType.Number,
        title: "Parallax Y",
        defaultValue: 50,
        step: 5,
        max: 100,
        min: -100,
        unit: "%",
    },
    horizontalParallaxAmount: {
        type: ControlType.Number,
        title: "Parallax X",
        defaultValue: 0,
        step: 5,
        max: 100,
        min: -100,
        unit: "%",
    },
    border: {
        // @ts-ignore - ControlType.Border exists but may not be in types
        type: ControlType.Border,
        
        title: "Border",
        optional:true,
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
    boxShadow: {
        // @ts-ignore - ControlType.BoxShadow exists but may not be in types
        type: ControlType.BoxShadow,
        title: "Shadow",
        optional: true,
    },
})
