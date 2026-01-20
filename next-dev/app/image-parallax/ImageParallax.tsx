import { addPropertyControls, ControlType } from "framer"
import { useRef, useLayoutEffect } from "react"
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

    // Simple, performant parallax using requestAnimationFrame (like many CodePen examples)
    useLayoutEffect(() => {
        if (!containerRef.current || !imageRef.current) return

        const container = containerRef.current
        const image = imageRef.current

        // Enable hardware acceleration via CSS
        image.style.transform = "translate3d(0, 0, 0)"
        image.style.willChange = "transform"

        let rafId: number | null = null
        let ticking = false
        let animationFrameId: number | null = null

        const updateParallax = () => {
            if (!container || !image) return

            const rect = container.getBoundingClientRect()
            const containerHeight = container.offsetHeight
            const containerWidth = container.offsetWidth
            
            // Skip if container has no dimensions
            if (containerHeight === 0 || containerWidth === 0) return
            
            // Calculate vertical parallax based on scroll position
            // Mimics ScrollTrigger behavior: start="top bottom", end="bottom top"
            // Progress goes from 0 (top hits bottom of viewport) to 1 (bottom hits top of viewport)
            const viewportHeight = window.innerHeight
            const scrollProgress = Math.max(0, Math.min(1, 
                (viewportHeight - rect.top) / (viewportHeight + containerHeight)
            ))
            
            // Vertical parallax: move image based on scroll progress
            const yOffset = scrollProgress * (verticalParallaxAmount / 100) * containerHeight
            
            // Horizontal parallax: based purely on element's horizontal position in viewport
            // Works independently of scroll - responds to horizontal movement/looping
            // When element is centered, image should be centered (xOffset compensates for initial CSS offset)
            let xOffset = 0
            if (horizontalParallaxAmount !== 0) {
                const viewportWidth = window.innerWidth
                const viewportCenter = viewportWidth / 2
                const elementCenter = rect.left + rect.width / 2
                
                // Calculate progress from -1 (left) to +1 (right), 0 when centered
                // Normalize based on viewport width so it works regardless of element position
                const horizontalProgress = (elementCenter - viewportCenter) / viewportWidth
                
                // Base offset to center image when element is centered
                // The image CSS has left: -horizontalParallaxAmount%, making it extend left
                // To center the image when element is centered, we shift right by half the parallax amount
                const centerOffset = (horizontalParallaxAmount / 100) * containerWidth / 2
                
                // Apply parallax movement based on element position relative to viewport center
                // horizontalProgress: negative when element is left of center, positive when right of center
                // When element is left of center, image shifts left (negative offset)
                // When element is right of center, image shifts right (positive offset)
                const parallaxOffset = horizontalProgress * (horizontalParallaxAmount / 100) * containerWidth
                
                // Total offset: center compensation + parallax movement
                // When element is centered (horizontalProgress = 0), xOffset = centerOffset (image centered)
                xOffset = centerOffset + parallaxOffset
            }
            
            // Apply transforms using translate3d for GPU acceleration
            image.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`
            
            ticking = false
        }

        const requestTick = () => {
            if (!ticking) {
                rafId = requestAnimationFrame(updateParallax)
                ticking = true
            }
        }

        // Continuous animation loop for horizontal parallax (works with looping elements)
        const startAnimationLoop = () => {
            if (horizontalParallaxAmount !== 0) {
                const animate = () => {
                    updateParallax()
                    animationFrameId = requestAnimationFrame(animate)
                }
                animationFrameId = requestAnimationFrame(animate)
            }
        }

        const stopAnimationLoop = () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
                animationFrameId = null
            }
        }

        // Use passive scroll listener for vertical parallax
        const handleScroll = () => {
            requestTick()
        }

        const handleResize = () => {
            // Debounce resize
            if (rafId !== null) {
                cancelAnimationFrame(rafId)
            }
            rafId = requestAnimationFrame(updateParallax)
        }

        // Initial update
        updateParallax()

        // Start continuous loop for horizontal parallax if enabled
        startAnimationLoop()

        // Add event listeners for vertical parallax
        window.addEventListener("scroll", handleScroll, { passive: true })
        window.addEventListener("resize", handleResize, { passive: true })

        // Cleanup
        return () => {
            stopAnimationLoop()
            if (rafId !== null) {
                cancelAnimationFrame(rafId)
            }
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", handleResize)
        }
    }, [verticalParallaxAmount, horizontalParallaxAmount])

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
            ) : (
                // Render parallax effect
                // Extend beyond boundaries to allow room for parallax movement
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
                        willChange: "transform", // Hint browser to optimize transforms
                        backfaceVisibility: "hidden", // Prevent flickering on transforms
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
        defaultValue: 30,
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
        
    },
})
