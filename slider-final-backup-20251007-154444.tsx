/**
 * GSAP Horizontal Slider Component
 *
 * A React component that creates an infinite horizontal scrolling slider using GSAP.
 * Features include:
 * - Infinite horizontal loop with seamless wrapping
 * - Drag-to-scroll functionality with momentum
 * - Click navigation (prev/next buttons and direct slide selection)
 * - Center-focused navigation (active slide stays centered)
 * - Responsive design with inline CSS
 * - TypeScript support with full type safety
 * - Unified GSAP-only animation control
 * - Developed by @emanuelecodes for Adriano Reis
 * This component serves as a reference implementation for building similar
 * horizontal scrolling interfaces with GSAP and React.
 *
 * UNIFIED ANIMATION STRATEGY (GSAP-ONLY):
 * - ALL animations handled by GSAP for maximum control and consistency
 * - Single duration and easing control for all animations (animation.duration, animation.easing)
 * - Slide transitions, visual effects (scale, opacity, shadows), and dots all use same timing
 * - Consistent timing across all navigation methods: dots, click navigation, autoplay, and button controls
 * - No CSS transitions - everything is GSAP-powered for better performance and control
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react"
import {
    gsap,
    useGSAP,
    Draggable,
    InertiaPlugin,
    //@ts-ignore
} from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/clients-projects/carousel1.js"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Register GSAP plugins for drag functionality and momentum scrolling
gsap.registerPlugin(Draggable, InertiaPlugin)

/**
 * Configuration interface for the horizontal loop
 *
 * @interface LoopConfig
 * @property {boolean} paused - Whether the timeline starts paused (default: true)
 * @property {boolean} draggable - Enable drag-to-scroll functionality
 * @property {boolean|HTMLElement|string} center - Center element for positioning calculations
 * @property {number} speed - Animation speed multiplier (default: 1)
 * @property {number|boolean} snap - Snap configuration for smooth positioning
 * @property {string|number} paddingRight - Additional padding for the loop
 * @property {boolean} reversed - Whether to reverse the timeline direction
 * @property {number} repeat - Number of times to repeat the timeline
 * @property {Function} onChange - Callback fired when the active element changes
 */
interface LoopConfig {
    paused?: boolean
    draggable?: boolean
    center?: boolean | HTMLElement | string
    speed?: number
    snap?: number | boolean
    paddingRight?: string | number
    reversed?: boolean
    repeat?: number
    gap?: number
    onChange?: (element: HTMLElement, index: number) => void
}

/**
 * Extended GSAP Timeline interface with custom horizontal loop methods
 *
 * This interface extends the base GSAP Timeline to include methods
 * specifically designed for horizontal scrolling functionality.
 *
 * @interface HorizontalLoopTimeline
 * @extends gsap.core.Timeline
 */
interface HorizontalLoopTimeline {
    /** Navigate to a specific slide by index */
    toIndex: (
        index: number,
        //@ts-ignore
        vars?: gsap.TweenVars
        //@ts-ignore
    ) => gsap.core.Tween | gsap.core.Timeline
    /** Get the index of the slide closest to the current timeline position */
    closestIndex: (setCurrent?: boolean) => number
    /** Get the current active slide index */
    current: () => number
    /** Navigate to the next slide */ //@ts-ignore
    next: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline
    /** Navigate to the previous slide */ //@ts-ignore
    previous: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline
    /** Array of timeline positions for each slide */
    times: number[]
    /** GSAP Draggable instance for drag functionality */
    draggable?: any
    /** Get the total time of the timeline */
    totalTime: (value?: number, suppressEvents?: boolean) => number
    /** Get the raw time of the timeline */
    rawTime: (value?: number) => number
    /** Get the duration of the timeline */
    duration: (value?: number) => number
    /** All other GSAP Timeline methods */
    [key: string]: any
}

/**
 * Main Slider Component
 *
 * This is the main React component that renders the horizontal slider.
 * It uses useGSAP for proper GSAP integration with React lifecycle.
 *
 * Key features:
 * - Dynamic slides based on content array
 * - Flexible slide sizing (fill-width, aspect-ratio, fixed-dimensions, fill)
 * - Drag-to-scroll with momentum (configurable with fluid prop)
 * - Click navigation (prev/next buttons)
 * - Direct slide selection by clicking
 * - Responsive component support
 * - Seamless infinite loop with smart duplication
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function Carousel({
    dragFactor = 0.5,
    draggable = true,
    clickNavigation = true,
    content = [],
    autoplay = false,
    interval = 3,
    direction = "right",
    throwAware = "No follow",
    gap = 20,
    prevArrow = null,
    nextArrow = null,
    arrows = {
        show: true,
        fill: "#000000",
        fadeIn: false,
        distance: "space",
        verticalAlign: "center",
        gap: 20,
        insetX: 20,
        insetY: 20,
        opacity: 0.7,
        fadeInControls: {
            duration: 0.5,
            easing: "power1.inOut",
            delay: 0.2,
        },
    },
    finiteMode = false,
    fluid = true,
    dotsUI = {
        enabled: false,
        width: 10,
        height: 10,
        gap: 10,
        fill: "#FFFFFF",
        padding: 0,
        backdrop: "#000000",
        backdropRadius: 20,
        radius: 50,
        opacity: 0.5,
        current: 1,
        scale: 1.2,
        blur: 0,
        verticalAlign: "bottom",
        horizontalAlign: "center",
        insetY: 20,
    },
    effects = {
        scale: 1,
        current: 1.1,
        shadow: "none",
    },
    slideWidth = {
        value: 100,
        unit: "percent",
    },
    animation = {
        duration: 0.4,
        easing: "power1.inOut",
        elasticAmplitude: 1,
        elasticPeriod: 0.3,
        backIntensity: 1.7,
    },
    adaptiveHeight = false,
}: {
    dragFactor?: number
    draggable?: boolean
    clickNavigation?: boolean
    content?: React.ReactNode[]
    autoplay?: boolean
    interval?: number
    direction?: "left" | "right"
    throwAware?: "Follow" | "No follow"
    gap?: number
    prevArrow?: React.ReactNode
    nextArrow?: React.ReactNode
    arrows?: {
        show?: boolean
        fill?: string
        fadeIn?: boolean
        distance?: "space" | "group"
        verticalAlign?: "top" | "center" | "bottom"
        gap?: number
        insetX?: number
        insetXReference?: "container" | "central-slide"
        insetXUnit?: "px" | "%"
        insetY?: number
        opacity?: number
        fadeInControls?: {
            duration?: number
            easing?: string
            delay?: number
        }
    }
    finiteMode?: boolean
    fluid?: boolean
    // alignment removed; always center
    dotsUI?: {
        enabled?: boolean
        width?: number
        height?: number
        gap?: number
        fill?: string
        padding?: number
        backdrop?: string
        backdropRadius?: number
        radius?: number
        opacity?: number
        current?: number
        scale?: number
        blur?: number
        verticalAlign?: "top" | "center" | "bottom"
        horizontalAlign?: "left" | "center" | "right"
        insetY?: number
    }
    effects?: {
        scale?: number
        current?: number
        shadow?: string
    }
    slideWidth?: {
        value?: number
        pixelValue?: number
        unit?: "percent" | "pixels"
    }
    animation?: {
        duration?: number
        easing?: string
        elasticAmplitude?: number
        elasticPeriod?: number
        backIntensity?: number
    }
    adaptiveHeight?: boolean
}) {
    // React refs for DOM elements
    const wrapperRef = useRef<HTMLDivElement>(null) // Reference to the wrapper container
    const boxesRef = useRef<HTMLDivElement[]>([]) // Array of slide element references
    const loopRef = useRef<HorizontalLoopTimeline | null>(null) // Reference to the GSAP timeline
    const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null) // Reference to autoplay timer
    const resizeObserverRef = useRef<ResizeObserver | null>(null) // Reference to ResizeObserver
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Debounce timeout for resize
    const [forceRender, setForceRender] = useState(0) // Force re-render trigger
    const [canvasMode, setCanvasMode] = useState(false) // Track if we're in canvas mode

    // Stable box widths - generated once and reused to prevent animation issues
    // CRITICAL: Box widths must remain stable across React re-renders to prevent
    // GSAP animation calculations from breaking. Random widths calculated during
    // render cause timeline position miscalculations and animation glitches.
    const boxWidths = useRef<number[]>([])
    const boxHeights = useRef<number[]>([])
    const containerDimensions = useRef({ width: 0, height: 0 })
    const lastValidContent = useRef<React.ReactNode[]>([]) // Track last valid content

    // React state for component behavior
    const [showOverflow, setShowOverflow] = useState(false) // Toggle for showing overflow content
    const [activeElement, setActiveElement] = useState<HTMLElement | null>(null) // Currently active slide
    const [activeSlideIndex, setActiveSlideIndex] = useState(0) // Current slide index for dots
    const [containerReady, setContainerReady] = useState(false) // Track when container has proper dimensions
    const [isFullyInitialized, setIsFullyInitialized] = useState(false) // Track when all GSAP setup and centering is complete
    const [isDragging, setIsDragging] = useState(false) // Track dragging state for cursor updates
    const [isCentered, setIsCentered] = useState(false) // Track when slides are properly centered
    const [arrowsVisible, setArrowsVisible] = useState(false) // Track when arrows should be visible
    const arrowsRef = useRef<HTMLDivElement>(null) // Reference to arrows container
    const prevArrowElRef = useRef<HTMLElement | null>(null) // Reference to prev arrow element
    const nextArrowElRef = useRef<HTMLElement | null>(null) // Reference to next arrow element
    const grabHoldTimeoutRef = useRef<number | null>(null) // Start-grab timeout for long press
    const didClickNavigateRef = useRef(false) // Flag to avoid double navigation when both handlers fire

    // Minimal debug helper (safe in browser/Framer environments)
    const debug = (...args: any[]) => {
        try {
            // Prefix with a lightweight marker and instance key if available
            console.log("[Carousel]", ...args)
        } catch {}
    }

    // Refs for tracking drag state without causing re-renders
    const isDraggingRef = useRef(false) // Track if user is currently dragging
    const isThrowingRef = useRef(false) // Track if throwing animation is active
    const dragStartMouseXRef = useRef(0) // Track where mouse drag started to determine direction
    const dragEndMouseXRef = useRef(0) // Track where mouse drag ended
    const currentAutoplayDirectionRef = useRef<"left" | "right">(direction) // Current autoplay direction

    // Store original heights of content components for adaptive height
    const originalContentHeights = useRef<number[]>([])
    const tallestSlideHeight = useRef<number>(400) // Default to 400px if no content
    const [heightsMeasured, setHeightsMeasured] = useState(true) // Simplify: treat heights as ready and let CSS handle sizing
    const [isMeasuringHeights, setIsMeasuringHeights] = useState(false) // Track if we're currently measuring
    const measurementInProgress = useRef(false) // Prevent multiple simultaneous measurements
    const measurementStarted = useRef(false) // Track if we've ever started measurement

    // Initialize heights with proper async measurement - only run once
    const heightRetryCount = useRef(0)
    const MAX_HEIGHT_MEASURE_RETRIES = 15

    const initializeHeights = useCallback(async () => {
        // Simplified mode: no off-DOM measurement; CSS drives heights
        return
    }, [])

    // Run initialization when component mounts - with delay to ensure content is ready
    useEffect(() => {
        // No-op in simplified mode
    }, [])

    // Removed old measureOriginalContentHeights function - now using initializeHeights

    /**
     * Construct easing string with parameters for elastic and back easing functions
     *
     * This function takes the base easing type and constructs the full easing string
     * with parameters for elastic and back easing functions.
     */
    const getEasingString = useCallback(
        (easing: string) => {
            if (easing.startsWith("elastic")) {
                const amplitude = animation.elasticAmplitude || 1
                const period = animation.elasticPeriod || 0.3
                return `${easing}(${amplitude},${period})`
            } else if (easing.startsWith("back")) {
                const intensity = animation.backIntensity || 1.7
                return `${easing}(${intensity})`
            }
            return easing
        },
        [
            animation.elasticAmplitude,
            animation.elasticPeriod,
            animation.backIntensity,
        ]
    )

    /**
     * Apply initial styling to all slides using gsap.set
     *
     * This function sets the initial visual state for all slides
     * immediately without animation, ensuring proper styling on first load.
     */
    const applyInitialStylingToAllSlides = useCallback(() => {
        boxesRef.current.forEach((slideElement, i) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Determine if this is the active/central slide
            let isCentralSlide = false

            if (finiteMode) {
                // In finite mode, use the activeSlideIndex state
                isCentralSlide = i === activeSlideIndex
            } else {
                // In infinite mode, also use the activeSlideIndex state for consistency
                isCentralSlide = i === activeSlideIndex
            }

            // Get the appropriate style values
            const targetScale = isCentralSlide
                ? effects.current || 1.1
                : effects.scale || 1

            // Apply initial styling directly to DOM (immediate, no animation, can't be overridden)
            innerElement.style.transform = `scale(${targetScale})`
            innerElement.style.transformOrigin = "center"

            // Also set with GSAP for consistency, but with immediate render
            gsap.set(innerElement, {
                scale: targetScale,
                transformOrigin: "center",
                immediateRender: true,
                duration: 0, // Force immediate
            })
        })
    }, [effects, finiteMode, activeSlideIndex])

    /**
     * Apply initial central slide styling using gsap.set
     *
     * This function sets the initial visual state for the central slide
     * immediately without animation, ensuring proper styling on first load.
     */
    const applyInitialCentralSlideStyling = useCallback(
        (slideElement: HTMLElement) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Get the appropriate style values for central slide
            // Always apply current scale to central slide
            const targetScale = effects.current || 1.1

            gsap.set(innerElement, {
                scale: targetScale,
                transformOrigin: "center",
                immediateRender: true,
            })
        },
        [effects]
    )

    /**
     * Animate slide visual properties using GSAP
     *
     * This function handles all visual effects (scale, opacity, shadows, etc.)
     * using GSAP for consistent timing and better performance.
     */
    const animateSlideVisuals = useCallback(
        (slideElement: HTMLElement, isActive: boolean) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Get the appropriate style values based on whether it's active
            const targetScale = isActive
                ? effects.current || 1.1
                : effects.scale || 1

            // During initial setup, use gsap.set() for immediate styling
            if (isInitialSetupRef.current) {
                gsap.set(innerElement, {
                    scale: targetScale,
                    transformOrigin: "center",
                    immediateRender: true,
                })
            } else {
                // Kill any existing animations on this element to prevent conflicts
                gsap.killTweensOf(innerElement)

                // For subsequent animations, use gsap.to() with user timing
                gsap.to(innerElement, {
                    scale: targetScale,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                    transformOrigin: "center",
                    overwrite: true, // Overwrite any existing animations on this element
                })
            }
        },
        [effects, animation.duration, animation.easing, getEasingString]
    )

    /**
     * Animate dots using GSAP
     *
     * This function handles dot animations (scale, opacity) using GSAP
     * for consistent timing with slide transitions.
     */
    const animateDots = useCallback(
        (activeIndex: number) => {
            const dots = document.querySelectorAll("[data-dot-index]")
            const totalDots = dots.length
            if (!totalDots) return
            const normalizedActiveIndex =
                ((activeIndex % totalDots) + totalDots) % totalDots

            dots.forEach((dot, index) => {
                const isActive = index === normalizedActiveIndex
                const targetScale = isActive ? dotsUI.scale || 1.2 : 1
                const targetOpacity = isActive
                    ? dotsUI.current || 1
                    : dotsUI.opacity || 0.5

                gsap.to(dot, {
                    scale: targetScale,
                    opacity: targetOpacity,
                    duration: (animation.duration || 0.4) * 0.6, // Slightly faster than slide transitions
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
                // Ensure pointer cursor on dots
                try {
                    ;(dot as HTMLElement).style.cursor = "pointer"
                } catch (_) {}
            })
        },
        [dotsUI, animation.duration, animation.easing, getEasingString]
    )

    /**
     * Apply initial styling to navigation buttons using gsap.set
     *
     * This function sets the initial visual state for buttons
     * immediately without animation, ensuring proper styling on first load.
     */
    const applyInitialButtonStyling = useCallback(() => {
        const leftButton = document.querySelector(
            '[data-button="prev"]'
        ) as HTMLElement
        const rightButton = document.querySelector(
            '[data-button="next"]'
        ) as HTMLElement

        if (leftButton) {
            // In finite mode, first slide means prev button is disabled
            const isPrevDisabled = finiteMode && activeSlideIndex === 0

            if (isPrevDisabled) {
                // Set disabled state immediately
                gsap.set(leftButton, {
                    opacity: arrows.opacity,
                    immediateRender: true,
                    duration: 0,
                })
            } else {
                // Set enabled state immediately
                gsap.set(leftButton, {
                    opacity: 1,
                    immediateRender: true,
                    duration: 0,
                })
            }
        }

        if (rightButton) {
            // In finite mode, check if next button should be disabled
            // Use boxesRef.current.length since slideData might not be initialized yet
            const totalSlides = boxesRef.current.length || 1
            const isNextDisabled =
                finiteMode && activeSlideIndex === totalSlides - 1

            if (isNextDisabled) {
                // Set disabled state immediately
                gsap.set(rightButton, {
                    opacity: arrows.opacity,
                    immediateRender: true,
                    duration: 0,
                })
            } else {
                // Set enabled state immediately
                gsap.set(rightButton, {
                    opacity: 1,
                    immediateRender: true,
                    duration: 0,
                })
            }
        }
    }, [finiteMode, activeSlideIndex, boxesRef])

    // Animation function for navigation buttons
    const animateButtons = useCallback(
        (isPrevDisabled: boolean, isNextDisabled: boolean) => {
            const leftButton = document.querySelector(
                '[data-button="prev"]'
            ) as HTMLElement
            const rightButton = document.querySelector(
                '[data-button="next"]'
            ) as HTMLElement

            if (leftButton) {
                if (isPrevDisabled) {
                    // For disabled buttons, animate to disabled state with user timing
                    gsap.to(leftButton, {
                        opacity: arrows.opacity,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                } else {
                    gsap.to(leftButton, {
                        opacity: 1,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                }
            }

            if (rightButton) {
                if (isNextDisabled) {
                    // For disabled buttons, animate to disabled state with user timing
                    gsap.to(rightButton, {
                        opacity: arrows.opacity,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                } else {
                    // For enabled buttons, animate to enabled state
                    gsap.to(rightButton, {
                        opacity: 1,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                }
            }
        },
        [animation.duration, animation.easing, getEasingString]
    )

    /**
     * Make a component responsive by cloning it with updated styles
     *
     * This function takes a React component and makes it fill the available space
     * while preserving its internal styling and functionality with proper type safety.
     */
    const makeComponentResponsive = useCallback(
        (component: React.ReactNode, key: string | number) => {
            // Handle non-React elements safely
            if (!React.isValidElement(component)) {
                return component
            }

            try {
                // Safely extract existing styles
                const existingStyle =
                    component.props &&
                    typeof component.props === "object" &&
                    "style" in component.props
                        ? (component.props.style as React.CSSProperties) || {}
                        : {}

                // Clone the component with responsive styles
                return React.cloneElement(component as React.ReactElement, {
                    key,
                    style: {
                        ...existingStyle,
                        width: "100%",
                        height: "100%",
                    },
                })
            } catch (error) {
                return component
            }
        },
        []
    )

    /**
     * Find the closest slide index for a given content index in infinite mode
     * This ensures we navigate to the nearest instance of the target content
     */
    const findClosestSlideIndex = useCallback(
        (targetContentIndex: number) => {
            if (finiteMode) {
                return targetContentIndex
            }

            const contentCount = content.length || 1

            // Get the actual current slide position from GSAP timeline
            let currentIndex = activeSlideIndex
            if (loopRef.current && loopRef.current.closestIndex) {
                try {
                    // Use closestIndex to get the actual current slide position
                    currentIndex = loopRef.current.closestIndex()
                } catch (error) {
                    // Fallback to activeSlideIndex if GSAP method fails
                }
            }

            // Calculate the current content index (which content we're currently viewing)
            const currentContentIndex = currentIndex % contentCount

            // Calculate how many slides to move based on dot index difference
            let slidesToMove = targetContentIndex - currentContentIndex

            // Don't wrap around - use the direct difference
            // If we're at dot 1 and click dot 3, move +2
            // If we're at dot 3 and click dot 1, move -2
            // This ensures we always move the correct number of slides

            // Calculate the target slide index
            const targetSlideIndex = currentIndex + slidesToMove

            return targetSlideIndex
        },
        [finiteMode, activeSlideIndex, content.length]
    )

    /**
     * Calculate dots positioning based on alignment settings
     */
    const calculateDotsPosition = useCallback(() => {
        if (!dotsUI.enabled) return { display: "none" }

        const containerWidth = containerDimensions.current.width
        const containerHeight = containerDimensions.current.height

        if (containerWidth === 0 || containerHeight === 0)
            return { display: "none" }

        // Calculate vertical position
        let top = "auto"
        let bottom = "auto"
        let transform = "translateY(0)"

        if (dotsUI.verticalAlign === "top") {
            top = `${dotsUI.insetY || 0}px`
        } else if (dotsUI.verticalAlign === "bottom") {
            bottom = `${dotsUI.insetY || 0}px`
        } else if (dotsUI.verticalAlign === "center") {
            top = "50%"
            transform = "translateY(-50%)"
        }

        // Calculate horizontal position
        let left = "auto"
        let right = "auto"
        let justifyContent = "center"

        if (dotsUI.horizontalAlign === "left") {
            left = "0px"
            justifyContent = "flex-start"
        } else if (dotsUI.horizontalAlign === "right") {
            right = "0px"
            justifyContent = "flex-end"
        } else if (dotsUI.horizontalAlign === "center") {
            left = "50%"
            transform =
                transform === "translateY(-50%)"
                    ? "translate(-50%, -50%)"
                    : "translateX(-50%)"
            justifyContent = "center"
        }

        return {
            position: "absolute" as const,
            top,
            bottom,
            left,
            right,
            transform,
            display: "flex",
            gap: `${dotsUI.gap || 12}px`,
            justifyContent,
            alignItems: "center",
            zIndex: 1000,
        }
    }, [
        dotsUI,
        finiteMode,
        containerDimensions.current.width,
        containerDimensions.current.height,
    ])

    /**
     * Convert position to vertical and horizontal alignment for backward compatibility
     */
    const getPositionAlignment = useCallback((position: string) => {
        switch (position) {
            case "center":
                return { verticalAlign: "center", horizontalAlign: "center" }
            case "top-left":
                return {
                    verticalAlign: "top",
                    horizontalAlign: "space-between",
                }
            case "top-middle":
                return { verticalAlign: "top", horizontalAlign: "center" }
            case "top-right":
                return {
                    verticalAlign: "top",
                    horizontalAlign: "space-between",
                }
            case "bottom-left":
                return {
                    verticalAlign: "bottom",
                    horizontalAlign: "space-between",
                }
            case "bottom-middle":
                return { verticalAlign: "bottom", horizontalAlign: "center" }
            case "bottom-right":
                return {
                    verticalAlign: "bottom",
                    horizontalAlign: "space-between",
                }
            default:
                return { verticalAlign: "center", horizontalAlign: "center" }
        }
    }, [])

    /**
     * Calculate slide dimensions based on sizing mode with proper validation and responsive behavior
     */
    const calculateSlideDimensions = useCallback(
        (
            containerWidth: number,
            containerHeight: number,
            validContent?: React.ReactNode[]
        ) => {
            // CRITICAL: Don't calculate dimensions if container has no size yet
            // This prevents the flash of small slides during initial render
            if (
                !containerWidth ||
                !containerHeight ||
                containerWidth === 0 ||
                containerHeight === 0
            ) {
                // Use reasonable fallback dimensions that work well in canvas
                const fallbackWidth = 400
                const fallbackHeight = 300

                return {
                    width: fallbackWidth,
                    height: fallbackHeight,
                    objectFit: "cover" as const,
                }
            }

            // Validate input dimensions
            const safeContainerWidth = Math.max(containerWidth, 100) // Minimum 100px width
            const safeContainerHeight = Math.max(containerHeight, 100) // Minimum 100px height

            // Always use full-width sizing; height equals container height
            const slideGap = Math.max(gap ?? 20, 0)

            // Determine optimal number of visible slides based on container width
            let slidesToShow = 1
            if (safeContainerWidth >= 400) slidesToShow = 2
            if (safeContainerWidth >= 800) slidesToShow = 3
            if (safeContainerWidth >= 1200) slidesToShow = 4

            // Calculate available width after accounting for gaps
            const totalGapWidth = gap * (slidesToShow - 1)
            const availableWidth = safeContainerWidth - totalGapWidth
            const slideWidth = availableWidth / slidesToShow

            // Ensure minimum viable slide width
            const minSlideWidth = 200
            const finalSlideWidth = Math.max(slideWidth, minSlideWidth)

            // If slides would be too small, reduce the number of slides
            if (slideWidth < minSlideWidth && slidesToShow > 1) {
                slidesToShow = Math.max(
                    1,
                    Math.floor(safeContainerWidth / (minSlideWidth + gap))
                )
                const adjustedTotalGapWidth = gap * (slidesToShow - 1)
                const adjustedAvailableWidth =
                    safeContainerWidth - adjustedTotalGapWidth
                const adjustedSlideWidth = adjustedAvailableWidth / slidesToShow
                return {
                    width: adjustedSlideWidth,
                    height: safeContainerHeight,
                    minHeight: safeContainerHeight,
                    objectFit: "cover" as const,
                }
            }

            return {
                width: finalSlideWidth,
                height: safeContainerHeight,
                minHeight: safeContainerHeight,
                objectFit: "cover" as const,
            }
        },
        [gap, finiteMode, adaptiveHeight]
    )

    /**
     * Creates a finite timeline animation using GSAP
     *
     * This function creates a simple horizontal timeline without infinite loop.
     * Slides move from first to last without duplication.
     *
     * @param {HTMLElement[]} items - Array of DOM elements to animate
     * @param {LoopConfig} config - Configuration object for the timeline
     * @returns {HorizontalLoopTimeline|null} - GSAP timeline with custom methods, or null if no items
     */
    function createFiniteTimeline(
        items: HTMLElement[],
        config: LoopConfig,
        alignment: "left" | "center" | "right" = "center"
    ): HorizontalLoopTimeline | null {
        // Early return if no items provided
        if (!items.length) return null

        // Extract configuration values with defaults
        const onChange = config.onChange
        let lastIndex = 0 // Track the last active index to detect changes

        // Create a simple timeline
        const tl = gsap.timeline({ paused: true }) as any

        // Calculate total width and positions
        const containerWidth = items[0]?.parentElement?.offsetWidth || 0
        const totalWidth = items.reduce((sum, item, i) => {
            const width = item.offsetWidth
            const gap = i < items.length - 1 ? config.gap || 0 : 0
            return sum + width + gap
        }, 0)

        // Position slides horizontally immediately - start with slide 0 in active position
        const slideWidth = items[0]?.offsetWidth || 0

        // Clear any existing transforms immediately
        gsap.set(items, { x: 0, xPercent: 0, transform: "none" })

        // Position all slides immediately with proper centering
        items.forEach((item, i) => {
            let initialX = -(i - 0) * (item.offsetWidth + (config.gap || 0))
            if (alignment === "center") {
                initialX += (containerWidth - slideWidth) / 2
            }
            gsap.set(item, { x: initialX })
        })

        // Initial positioning is now handled above, no need for duplicate timeline animations

        // Add custom methods to match HorizontalLoopTimeline interface
        tl.toIndex = (index: number, options?: any) => {
            if (index >= 0 && index < items.length) {
                // Calculate target position based on alignment
                let targetX =
                    -index * (items[0].offsetWidth + (config.gap || 0))

                if (alignment === "center") {
                    // Center the active slide within the container
                    const containerWidth =
                        items[0]?.parentElement?.offsetWidth || 0
                    const slideWidth = items[0].offsetWidth
                    targetX += (containerWidth - slideWidth) / 2
                } else if (alignment === "right") {
                    // Align the active slide to the right edge
                    const containerWidth =
                        items[0]?.parentElement?.offsetWidth || 0
                    const slideWidth = items[0].offsetWidth
                    targetX += containerWidth - slideWidth
                }
                // For "left" alignment, targetX remains as calculated
                const tween = gsap.to(items, {
                    x: targetX,
                    duration: options?.duration || animation.duration,
                    ease:
                        options?.ease ||
                        getEasingString(animation.easing || "power1.inOut"),
                })

                // Update lastIndex to track current position
                lastIndex = index

                // Update active element

                if (onChange && items[index]) {
                    onChange(items[index], index)
                }

                return tween
            }

            return tl
        }

        tl.closestIndex = () => {
            // Find the slide closest to center
            const containerWidth = items[0]?.parentElement?.offsetWidth || 0
            const centerX = containerWidth / 2
            let closestIndex = 0
            let minDistance = Infinity

            items.forEach((item, i) => {
                const itemX = gsap.getProperty(item, "x") as number
                const itemCenter = itemX + item.offsetWidth / 2
                const distance = Math.abs(itemCenter - centerX)

                if (distance < minDistance) {
                    minDistance = distance
                    closestIndex = i
                }
            })

            return closestIndex
        }

        tl.current = () => lastIndex
        tl.next = () => {
            const nextIndex = Math.min(lastIndex + 1, items.length - 1)

            return tl.toIndex(nextIndex)
        }
        tl.previous = () => {
            const prevIndex = Math.max(lastIndex - 1, 0)

            return tl.toIndex(prevIndex)
        }

        // Set up draggable for finite mode: NO throwing, threshold-based one-slide advance
        if (config.draggable) {
            const containerEl = items[0]?.parentElement as HTMLElement | null
            if (containerEl) {
                let startX = 0
                let startIndex = 0
                let isClick = true
                let allowDrag = false
                let baseGroupX = 0

                // Create a proxy to drive drag without attaching to items directly
                const proxy = document.createElement("div")
                let pressX = 0
                let pressY = 0
                const draggableInstance = Draggable.create(proxy, {
                    type: "x",
                    inertia: false,
                    allowEventDefault: false,
                    trigger: containerEl,
                    onPress(this: any) {
                        isClick = true
                        allowDrag = false
                        startX = this.pointerX || this.startX || 0
                        pressX = this.pointerX || this.startX || 0
                        pressY = this.pointerY || this.startY || 0
                        // capture current group offset from first item
                        baseGroupX =
                            (gsap.getProperty(items[0], "x") as number) || 0
                        // snap current index - prefer lastIndex (timeline source of truth),
                        // fallback to activeSlideIndex
                        startIndex =
                            typeof lastIndex === "number"
                                ? lastIndex
                                : activeSlideIndex
                        
                        stopAutoplay()
                    },
                    onDrag(this: any) {
                        const x = this.pointerX || this.x || 0
                        const moved = Math.abs(x - startX) > 5
                        if (moved && isClick) {
                            isClick = false
                            allowDrag = true
                        }
                        if (!allowDrag) return

                        // Follow cursor by translating the group (all items) with clamping
                        const containerWidth = containerEl.offsetWidth || 0
                        // Recompute totalWidth defensively in case widths changed
                        const currentTotalWidth = items.reduce(
                            (sum, item, i) =>
                                sum +
                                item.offsetWidth +
                                (i < items.length - 1 ? config.gap || 0 : 0),
                            0
                        )
                        const minX = -Math.max(
                            0,
                            currentTotalWidth - containerWidth
                        )
                        const maxX = 0
                        const dragDelta = x - startX
                        const targetX = Math.max(
                            minX,
                            Math.min(maxX, baseGroupX + dragDelta)
                        )
                        gsap.set(items, { x: targetX })
                    },
                    onRelease(this: any) {
                        if (isClick) {
                            // Handle click-to-advance when draggable is enabled
                            if (clickNavigation && !isThrowingRef.current) {
                                const ptX =
                                    pressX || this.pointerX || this.x || 0
                                const ptY =
                                    pressY || this.pointerY || this.y || 0
                                const clicked = document.elementFromPoint(
                                    ptX,
                                    ptY
                                )
                                const slideElement =
                                    clicked &&
                                    ((clicked as Element).closest(
                                        ".box"
                                    ) as HTMLElement | null)
                                if (slideElement) {
                                    const slideIndex =
                                        Array.from(items).indexOf(slideElement)
                                    if (slideIndex !== -1) {
                                        try {
                                            stopAutoplay()
                                            tl.toIndex(slideIndex, {
                                                duration: animation.duration,
                                                ease: getEasingString(
                                                    animation.easing ||
                                                        "power1.inOut"
                                                ),
                                                onComplete: () => {
                                                    lastIndex = slideIndex
                                                    setActiveSlideIndex(
                                                        slideIndex
                                                    )
                                                },
                                            })
                                            if (autoplay)
                                                setTimeout(startAutoplay, 10)
                                        } catch (_) {}
                                    }
                                }
                            }
                            return
                        }

                        // Evaluate drag distance based on ACTUAL group shift
                        const containerWidth = containerEl.offsetWidth || 0
                        const slideWidth =
                            items[0]?.getBoundingClientRect().width ||
                            Math.max(containerWidth, 1)
                        const currentGroupX =
                            parseFloat(
                                String(gsap.getProperty(items[0], "x", "px"))
                            ) || 0
                        const groupShift = currentGroupX - baseGroupX

                        // Threshold (~20% of slide width) for a page advance
                        const threshold = Math.max(30, slideWidth * 0.2)

                        

                        let targetIndex = startIndex
                        if (groupShift > threshold) {
                            // group moved right -> go to previous slide
                            targetIndex = Math.max(0, startIndex - 1)
                            
                        } else if (groupShift < -threshold) {
                            // group moved left -> go to next slide
                            targetIndex = Math.min(
                                items.length - 1,
                                startIndex + 1
                            )
                            
                        } 

                        // Snap to target index using timeline and capture new base position
                        
                        try {
                            tl.toIndex(targetIndex, {
                                duration: animation.duration,
                                ease: getEasingString(
                                    animation.easing || "power1.inOut"
                                ),
                                onComplete: () => {
                                    
                                    try {
                                        baseGroupX =
                                            (gsap.getProperty(
                                                items[0],
                                                "x"
                                            ) as number) || 0
                                        // Update lastIndex to match the target we just navigated to
                                        lastIndex = targetIndex
                                        // Force React state alignment if needed
                                        setActiveSlideIndex(targetIndex)
                                    } catch (_) {}
                                },
                            })
                            // After timeline moves, update baseGroupX for next interaction
                            setTimeout(
                                () => {
                                    try {
                                        baseGroupX =
                                            (gsap.getProperty(
                                                items[0],
                                                "x"
                                            ) as number) || 0
                                    } catch (_) {}
                                },
                                (animation.duration || 0.4) * 1000
                            )
                        } catch (_) {}

                        // Restart autoplay if needed
                        if (autoplay) setTimeout(startAutoplay, 10)
                    },
                })[0]

                if (draggableInstance) {
                    tl.draggable = draggableInstance
                }
            }
        }

        // Center the first slide on initial load if in center alignment mode
        // Guard: do not run this per-slide overwrite in finiteMode because it
        // would force every slide to the same x on first render.
        if (!finiteMode && alignment === "center") {
            // Use a small delay to ensure container dimensions are available
            setTimeout(() => {
                const containerWidth = items[0]?.parentElement?.offsetWidth || 0
                const slideWidth = items[0].offsetWidth
                if (containerWidth > 0 && slideWidth > 0) {
                    const centerOffset = (containerWidth - slideWidth) / 2
                    gsap.set(items, { x: centerOffset })
                }
            }, 10)
        } else if (!finiteMode && alignment === "right") {
            // Right align the first slide on initial load
            setTimeout(() => {
                const containerWidth = items[0]?.parentElement?.offsetWidth || 0
                const slideWidth = items[0].offsetWidth
                if (containerWidth > 0 && slideWidth > 0) {
                    const rightOffset = containerWidth - slideWidth
                    gsap.set(items, { x: rightOffset })
                }
            }, 10)
        } else if (finiteMode && alignment === "center") {
            // Finite mode centering - ensure first slide is centered immediately
            const containerWidth = items[0]?.parentElement?.offsetWidth || 0
            const slideWidth = items[0].offsetWidth
            if (containerWidth > 0 && slideWidth > 0) {
                const centerOffset = (containerWidth - slideWidth) / 2
                gsap.set(items, { x: centerOffset })
            }
        }

        // Fallback click handler for when draggable is disabled but click navigation is enabled
        if (!config.draggable && clickNavigation) {
            items.forEach((item, index) => {
                item.addEventListener("click", (e) => {
                    // Disable click navigation while throwing
                    if (isThrowingRef.current) {
                        e.stopPropagation()
                        e.preventDefault?.()
                        return
                    }
                    e.stopPropagation()
                    try {
                        stopAutoplay() // Stop autoplay when user clicks

                        // Use the same simple pattern as buttons navigation
                        // Just call toIndex directly, let onChange handle the visual updates
                        tl.toIndex(index, {
                            duration: animation.duration,
                            ease: getEasingString(
                                animation.easing || "power1.inOut"
                            ),
                        })

                        // Restart autoplay after user interaction
                        if (autoplay) {
                            setTimeout(startAutoplay, 10)
                        }
                    } catch (error) {}
                })
            })
        }

        return tl
    }

    /**
     * Creates a horizontal infinite loop animation using GSAP
     *
     * This function implements the core logic for creating a seamless horizontal
     * scrolling experience. It's based on the GSAP horizontal loop helper but
     * adapted for React with useGSAP.
     *
     * Key concepts:
     * - Uses xPercent for responsive positioning
     * - Creates seamless loops by duplicating elements virtually
     * - Calculates precise timing for smooth transitions
     * - Supports drag functionality with momentum
     *
     * @param {HTMLElement[]} items - Array of DOM elements to animate
     * @param {LoopConfig} config - Configuration object for the loop
     * @returns {HorizontalLoopTimeline|null} - GSAP timeline with custom methods, or null if no items
     */
    function createHorizontalLoop(
        items: HTMLElement[],
        config: LoopConfig
    ): HorizontalLoopTimeline | null {
        // Early return if no items provided
        if (!items.length) return null

        // GSAP horizontal loop initialization

        // Extract configuration values with defaults
        const onChange = config.onChange
        let lastIndex = 0 // Track the last active index to detect changes

        /**
         * Create the main GSAP timeline
         *
         * This timeline will contain all the horizontal scrolling animations.
         * The onUpdate callback fires whenever the timeline progresses, allowing
         * us to detect when the active slide changes.
         */
        const tl = gsap.timeline({
            repeat: config.repeat, // Number of times to repeat the entire loop
            onUpdate: onChange
                ? function () {
                      // Get the current slide index based on timeline position
                      const i = (tl as any).closestIndex()
                      if (lastIndex !== i) {
                          lastIndex = i
                          // Fire the onChange callback when slide changes
                          onChange(items[i], i)
                      }
                  }
                : undefined,
            paused: config.paused, // Start paused so we can control it manually
            defaults: { ease: "none" }, // No easing for smooth continuous scrolling
            onReverseComplete: () => {
                // Handle reverse completion for seamless looping
                tl.totalTime(tl.rawTime() + tl.duration() * 100)
            },
        }) as unknown as HorizontalLoopTimeline

        // Core variables for the horizontal loop
        const length = items.length // Number of slides
        const startX = items[0].offsetLeft // Starting X position of the first slide
        const times: number[] = [] // Timeline positions for each slide
        const widths: number[] = [] // Width of each slide
        const spaceBefore: number[] = [] // Space before each slide (for gaps)
        const xPercents: number[] = [] // X position as percentage of width
        let curIndex = 0 // Current active slide index
        let indexIsDirty = false // Flag to track if index needs recalculation

        // Configuration values
        const center = config.center // Center element for positioning calculations
        const pixelsPerSecond = (config.speed || 1) * 100 // Animation speed in pixels per second
        const snap =
            config.snap === false
                ? (v: number) => v
                : gsap.utils.snap(
                      typeof config.snap === "number" ? config.snap : 1
                  )
        let timeOffset = 0 // Offset for centering calculations

        // Determine the container element for centering
        // If center is true, use the parent of the first item
        // If center is an element/string, use that element
        // Otherwise, fall back to the parent node
        const container =
            center === true
                ? items[0].parentNode
                : (center
                      ? typeof center === "string"
                          ? gsap.utils.toArray(center)[0]
                          : center
                      : null) || items[0].parentNode
        let totalWidth: number // Total width of all slides combined

        /**
         * Calculate the total width of all slides combined
         * Include gap for proper infinite loop spacing
         */
        const getTotalWidth = () => {
            // Total width calculation - include gap after last slide for infinite loop
            const gap = (config as any).gap ?? 0
            return (
                items[length - 1].offsetLeft +
                (xPercents[length - 1] / 100) * widths[length - 1] -
                startX +
                spaceBefore[0] +
                items[length - 1].offsetWidth *
                    (gsap.getProperty(items[length - 1], "scaleX") as number) +
                gap +
                (parseFloat(String(config.paddingRight)) || 0)
            )
        }

        /**
         * Populate width and position data for all slides
         *
         * This function measures each slide and calculates its position relative
         * to other slides. It's called whenever the layout changes (resize, etc.)
         * to ensure accurate positioning.
         */
        const populateWidths = () => {
            if (!container) return

            // Get the container's bounding rectangle as reference
            let b1 = (container as Element).getBoundingClientRect()
            let b2: DOMRect

            items.forEach((el, i) => {
                try {
                    // Get the actual width of each slide with fallback
                    const gsapWidth = gsap.getProperty(
                        el,
                        "width",
                        "px"
                    ) as string
                    const computedWidth = parseFloat(gsapWidth)

                    // Use computed style as fallback if GSAP can't measure
                    if (isNaN(computedWidth) || computedWidth <= 0) {
                        const computedStyle = window.getComputedStyle(el)
                        const fallbackWidth = parseFloat(computedStyle.width)
                        widths[i] = isNaN(fallbackWidth) ? 250 : fallbackWidth // 250px as last resort
                    } else {
                        widths[i] = computedWidth
                    }

                    // Calculate X position as percentage of width for responsive positioning
                    const gsapX = gsap.getProperty(el, "x", "px") as string
                    const gsapXPercent = gsap.getProperty(
                        el,
                        "xPercent"
                    ) as number
                    const xValue = parseFloat(gsapX) || 0
                    const xPercentValue = gsapXPercent || 0

                    xPercents[i] = snap(
                        (xValue / Math.max(widths[i], 1)) * 100 + xPercentValue
                    )

                    // Calculate space before this slide
                    // For infinite loop, use consistent gap instead of measuring actual spacing
                    const gap = (config as any).gap ?? 0
                    if (i === 0) {
                        spaceBefore[i] = 0 // First slide has no space before
                    } else {
                        spaceBefore[i] = gap // Use the configured gap consistently
                    }

                    // Update b1 for next iteration (still needed for some calculations)
                    b2 = el.getBoundingClientRect()
                    b1 = b2
                } catch (error) {
                    // Fallback values
                    widths[i] = 250
                    xPercents[i] = 0
                    spaceBefore[i] = 0
                }
            })

            // Apply xPercent positioning to all slides for responsive behavior
            try {
                gsap.set(items, {
                    xPercent: (i: number) => xPercents[i],
                })
            } catch (error) {}

            // Update total width calculation
            totalWidth = getTotalWidth()
        }

        let timeWrap: (time: number) => number // Function to wrap time values for seamless looping

        /**
         * Calculate time offsets for centering
         *
         * This function adjusts the timeline positions so that the active slide
         * appears centered in the container. It calculates how much to offset
         * each slide's timeline position based on the container width.
         */
        const populateOffsets = () => {
            if (!container) return

            const containerWidth = (container as HTMLElement).offsetWidth

            // Calculate time offset for centering
            // Shift by half the container width in timeline units so that each slide's CENTER aligns with container center.
            timeOffset = center
                ? (tl.duration() * (containerWidth / 2)) / totalWidth
                : 0

            // Apply centering offset to each slide's timeline position (use slide centers)
            center &&
                times.forEach((t, i) => {
                    times[i] = timeWrap(
                        tl.labels["label" + i] +
                            (tl.duration() * widths[i]) / 2 / totalWidth -
                            timeOffset
                    )
                })
        }

        /**
         * Find the closest value in an array, accounting for wrapping
         *
         * This utility function finds which slide is closest to the current
         * timeline position, taking into account that the timeline wraps around.
         *
         * @param {number[]} values - Array of timeline positions
         * @param {number} value - Current timeline position
         * @param {number} wrap - Wrap value for circular calculations
         * @returns {number} - Index of the closest slide
         */
        const getClosest = (values: number[], value: number, wrap: number) => {
            let i = values.length
            let closest = 1e10 // Start with a very large number
            let index = 0
            let d: number

            // Check each slide's position
            while (i--) {
                d = Math.abs(values[i] - value)

                // Handle wrapping for infinite mode
                if (d > wrap / 2) {
                    d = wrap - d
                }

                // Update closest if this slide is closer
                if (d < closest) {
                    closest = d
                    index = i
                }
            }
            return index
        }

        const populateTimeline = () => {
            let i: number,
                item: HTMLElement,
                curX: number,
                distanceToStart: number,
                distanceToLoop: number
            tl.clear()

            // Populate timeline with slides

            // INFINITE MODE: Don't add gap to individual slides in loop calculation
            // The gap is already included in the spaceBefore measurements from getBoundingClientRect
            for (i = 0; i < length; i++) {
                item = items[i]
                curX = (xPercents[i] / 100) * widths[i]

                // Calculate distances - spaceBefore already includes the gap from CSS margin-right
                distanceToStart =
                    item.offsetLeft + curX - startX + spaceBefore[0]

                // For infinite loop, add gap after last slide to ensure proper spacing
                const gap = (config as any).gap ?? 0
                const isLastSlide = i === length - 1
                distanceToLoop =
                    distanceToStart +
                    widths[i] * (gsap.getProperty(item, "scaleX") as number) +
                    (isLastSlide ? gap : 0)

                tl.to(
                    item,
                    {
                        xPercent: snap(
                            ((curX - distanceToLoop) / widths[i]) * 100
                        ),
                        duration: distanceToLoop / pixelsPerSecond,
                    },
                    0
                )
                    .fromTo(
                        item,
                        {
                            xPercent: snap(
                                ((curX - distanceToLoop + totalWidth) /
                                    widths[i]) *
                                    100
                            ),
                        },
                        {
                            xPercent: xPercents[i],
                            duration:
                                (curX - distanceToLoop + totalWidth - curX) /
                                pixelsPerSecond,
                            immediateRender: false,
                        },
                        distanceToLoop / pixelsPerSecond
                    )
                    .add("label" + i, distanceToStart / pixelsPerSecond)
                times[i] = distanceToStart / pixelsPerSecond
            }
            timeWrap = gsap.utils.wrap(0, tl.duration())
        }

        const refresh = (deep: boolean) => {
            const progress = tl.progress()
            tl.progress(0, true)
            populateWidths()
            deep && populateTimeline()
            populateOffsets()
            deep && tl.draggable && tl.paused()
                ? tl.time(times[curIndex], true)
                : tl.progress(progress, true)
        }

        const onResize = () => refresh(true)
        let proxy: HTMLElement

        // Initial setup
        gsap.set(items, { x: 0, xPercent: 0 })

        populateWidths()
        populateTimeline()
        populateOffsets()
        window.addEventListener("resize", onResize)

        //@ts-ignore
        function toIndex(index: number, vars: gsap.TweenVars = {}) {
            // INFINITE MODE: Logic with wrapping for seamless infinite scrolling
            Math.abs(index - curIndex) > length / 2 &&
                (index += index > curIndex ? -length : length)
            const newIndex = gsap.utils.wrap(0, length, index)
            let time = times[newIndex]
            if (time > tl.time() !== index > curIndex && index !== curIndex) {
                time += tl.duration() * (index > curIndex ? 1 : -1)
            }
            if (time < 0 || time > tl.duration()) {
                vars.modifiers = { time: timeWrap }
            }
            curIndex = newIndex
            vars.overwrite = true
            gsap.killTweensOf(proxy)
            return vars.duration === 0
                ? tl.time(timeWrap(time))
                : tl.tweenTo(time, vars)
        }
        //@ts-ignore
        tl.toIndex = (index: number, vars?: gsap.TweenVars) =>
            toIndex(index, vars)
        tl.closestIndex = (setCurrent: boolean = false) => {
            const index = getClosest(times, tl.time(), tl.duration())
            if (setCurrent) {
                curIndex = index
                indexIsDirty = false
            }
            return index
        }
        tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex)
        //@ts-ignore
        tl.next = (vars?: gsap.TweenVars) => {
            const currentIndex = tl.current()
            return toIndex(currentIndex + 1, vars)
        }
        //@ts-ignore
        tl.previous = (vars?: gsap.TweenVars) => {
            const currentIndex = tl.current()
            return toIndex(currentIndex - 1, vars)
        }
        tl.times = times

        // Initialize infinite mode timeline
        tl.progress(1, true).progress(0, true)

        if (config.reversed) {
            ;(tl.vars as any).onReverseComplete?.()
            tl.reverse()
        }

        if (config.draggable && typeof Draggable === "function") {
            proxy = document.createElement("div")
            const wrap = gsap.utils.wrap(0, 1)
            let ratio: number,
                startProgress: number,
                draggable: any,
                lastSnap: number,
                initChangeX: number,
                wasPlaying: boolean,
                isDragActive = false

            const align = () => {
                const newProgress =
                    startProgress + (draggable.startX - draggable.x) * ratio

                tl.progress(wrap(newProgress))
            }
            const syncIndex = () => {
                // Only sync index if we actually dragged
                if (draggable && draggable.allowDrag) {
                    return tl.closestIndex(true)
                } else {
                    return tl.current()
                }
            }

            // Check if mouse is inside carousel area
            const isMouseInsideCarousel = (
                clientX: number,
                clientY: number
            ) => {
                if (!container) return false
                const rect = (container as HTMLElement).getBoundingClientRect()
                return (
                    clientX >= rect.left &&
                    clientX <= rect.right &&
                    clientY >= rect.top &&
                    clientY <= rect.bottom
                )
            }

            // Global mouse event handlers
            const handleGlobalMouseDown = (e: MouseEvent) => {
                // Only start drag if mouse is inside carousel
                if (
                    isMouseInsideCarousel(e.clientX, e.clientY) &&
                    !isDragActive
                ) {
                    isDragActive = true
                    draggable.startDrag(e)
                    // Long-press logic: switch to grabbing after short hold even before move
                    try {
                        if (grabHoldTimeoutRef.current) {
                            clearTimeout(grabHoldTimeoutRef.current)
                            grabHoldTimeoutRef.current = null
                        }
                        grabHoldTimeoutRef.current = window.setTimeout(() => {
                            isDraggingRef.current = true
                            setIsDragging(true)
                        }, 120) // ~120ms hold to show grabbing
                    } catch (_) {}
                }
            }

            const handleGlobalMouseUp = (e: MouseEvent) => {
                // Always handle mouse up, even if outside carousel
                if (isDragActive) {
                    isDragActive = false
                    draggable.endDrag(e)
                    // Clear any pending hold timeout and reset grabbing state if no throw
                    try {
                        if (grabHoldTimeoutRef.current) {
                            clearTimeout(grabHoldTimeoutRef.current)
                            grabHoldTimeoutRef.current = null
                        }
                    } catch (_) {}
                    if (!isThrowingRef.current) {
                        isDraggingRef.current = false
                        setIsDragging(false)
                    }
                }
            }

            const handleGlobalMouseMove = (e: MouseEvent) => {
                // Only handle mouse move if drag is active
                if (isDragActive) {
                    draggable.updateDrag(e)
                }
            }

            // NOTE: We intentionally avoid global listeners to prevent cross-carousel conflicts.

            draggable = Draggable.create(proxy, {
                trigger: container as HTMLElement, // Scope drag to this carousel only
                type: "x",
                // Prevent draggable from interfering with clicks
                allowEventDefault: false,
                onPress() {
                    debug("INF onPress", { x: this.x, pointerX: this.pointerX, progress: tl.progress() })
                    // Store the initial mouse position for click detection
                    this.pressX = this.pointerX || this.startX || 0
                    this.pressY = this.pointerY || this.startY || 0
                    this.isClick = true // Assume it's a click until proven otherwise
                    this.allowDrag = false // Start with drag disabled
                    // Long-press grabbing cursor even before movement (cursor only)
                    try {
                        if (grabHoldTimeoutRef.current) {
                            clearTimeout(grabHoldTimeoutRef.current)
                            grabHoldTimeoutRef.current = null
                        }
                        grabHoldTimeoutRef.current = window.setTimeout(() => {
                            // Cursor feedback only; don't mark as dragging so clicks still work
                            setIsDragging(true)
                        }, 120)
                    } catch (_) {}
                },
                onPressInit() {
                    const x = this.x
                    debug("INF onPressInit:pre", { x, tlProgress: tl.progress() })
                    gsap.killTweensOf(tl)
                    wasPlaying = !tl.paused()
                    tl.pause()
                    // IMPORTANT: capture progress BEFORE any DOM changes
                    startProgress = tl.progress()
                    refresh(false)
                    ratio = 1 / totalWidth
                    initChangeX = startProgress / -ratio - x
                    gsap.set(proxy, { x: startProgress / -ratio })
                    debug("INF onPressInit:post", { startProgress, ratio, initChangeX })

                    // Store actual mouse coordinates for direction detection
                    dragStartMouseXRef.current =
                        this.pointerX || this.startX || 0

                    // Store starting index for non-fluid mode
                    this.startIndex = tl.closestIndex ? tl.closestIndex() : 0

                    stopAutoplay()
                },
                onDragStart() {
                    debug("INF onDragStart")
                    // Do not alter positions here; wait for threshold detection
                },
                onDrag: function () {
                    // Check if this is the first movement - enable dragging if so
                    if (!this.allowDrag && this.isClick) {
                        const currentX = this.pointerX || this.x || 0
                        const currentY = this.pointerY || this.y || 0
                        const hasMoved =
                            Math.abs(currentX - (this.pressX || 0)) > 5 ||
                            Math.abs(currentY - (this.pressY || 0)) > 5

                        if (hasMoved) {
                            debug("INF threshold crossed", { currentX, pressX: this.pressX, x: this.x })
                            this.isClick = false
                            this.allowDrag = true
                            // Mark dragging only when movement starts (prevents jump on press)
                            isDraggingRef.current = true
                            setIsDragging(true)
                            // Sync baseGroupX in finite mode once when drag starts to avoid jump
                            // finiteMode baseline capture only applies in the finite timeline implementation
                        }
                    }

                    if (!this.allowDrag) {
                        return
                    }
                    debug("INF onDrag align", { x: this.x, pointerX: this.pointerX })

                    if (!fluid) {
                        // NON-FLUID MODE: Check threshold and navigate immediately
                        const dragDistance = startProgress / -ratio - this.x

                        // Use card width as the fixed threshold for immediate navigation
                        const cardWidth = items[0]?.offsetWidth || 300
                        const dragThreshold = cardWidth // Always use full card width

                        if (Math.abs(dragDistance) > dragThreshold) {
                            // Determine target slide based on direction
                            const startIndex =
                                this.startIndex !== undefined
                                    ? this.startIndex
                                    : tl.closestIndex
                                      ? tl.closestIndex()
                                      : 0
                            const targetIndex =
                                dragDistance > 0
                                    ? (startIndex + 1) % length // Next slide
                                    : (startIndex - 1 + length) % length // Previous slide

                            // Navigate to target slide immediately
                            try {
                                stopAutoplay() // Stop autoplay when user drags
                                tl.toIndex(targetIndex, {
                                    duration: animation.duration,
                                    ease: getEasingString(
                                        animation.easing || "power1.inOut"
                                    ),
                                })

                                // Restart autoplay after user interaction
                                if (autoplay) {
                                    setTimeout(startAutoplay, 10)
                                }

                                // Stop drag detection - we've navigated
                                this.allowDrag = false
                                isDraggingRef.current = false
                                setIsDragging(false)
                                return
                            } catch (error) {}
                        } else {
                            // Still within threshold - allow cursor following
                            align()
                        }
                    } else {
                        // FLUID MODE: Original behavior - natural cursor following
                        align()
                    }

                    // Track current mouse position for direction detection
                    dragEndMouseXRef.current = this.pointerX || this.x || 0
                },
                onThrowUpdate: function () {
                    // Allow throwing if we have a genuine drag (allowDrag is true) and fluid mode is enabled
                    if (this.allowDrag && fluid) {
                        align()
                    } else if (!fluid) {
                        // NON-FLUID MODE: Prevent any throwing updates - keep at current position
                        // This ensures the manual release logic takes full control
                    }
                },
                overshootTolerance: 0,
                inertia: fluid, // Only use inertia in fluid mode
                /**
                 * max
                 */
                maxDuration: fluid ? 4 * (1.1 - dragFactor) : 0, // No max duration for non-fluid mode
                snap: fluid
                    ? function (this: any, value: number) {
                          // FLUID MODE: Original snap behavior
                          if (Math.abs(startProgress / -ratio - this.x) < 10) {
                              return lastSnap + initChangeX
                          }

                          // INFINITE MODE: Snap logic with wrapping for seamless infinite scrolling
                          const time = -(value * ratio) * tl.duration()
                          const wrappedTime = timeWrap(time)
                          const snapTime =
                              times[
                                  getClosest(times, wrappedTime, tl.duration())
                              ]
                          let dif = snapTime - wrappedTime
                          Math.abs(dif) > tl.duration() / 2 &&
                              (dif += dif < 0 ? tl.duration() : -tl.duration())
                          lastSnap = (time + dif) / tl.duration() / -ratio
                          return lastSnap
                      }
                    : false, // NON-FLUID MODE: No snapping - let cursor follow directly
                onRelease() {
                    debug("INF onRelease", { isClick: this.isClick, isThrowing: isThrowingRef.current })
                    // Clear pending long-press and reset grabbing state when not throwing
                    try {
                        if (grabHoldTimeoutRef.current) {
                            clearTimeout(grabHoldTimeoutRef.current)
                            grabHoldTimeoutRef.current = null
                        }
                    } catch (_) {}
                    if (this.isClick) {
                        if (clickNavigation && !isThrowingRef.current) {
                            // This was a click with click nav enabled - trigger navigation
                            const clickedElement = document.elementFromPoint(
                                this.pressX,
                                this.pressY
                            )
                            if (clickedElement) {
                                // Find which slide was clicked
                                const slideElement =
                                    clickedElement.closest(".box")
                                if (slideElement) {
                                    const slideIndex = Array.from(
                                        boxesRef.current
                                    ).indexOf(slideElement as HTMLDivElement)
                                    if (
                                        slideIndex !== -1 &&
                                        loopRef.current &&
                                        loopRef.current.toIndex
                                    ) {
                                        // Use the same simple pattern as buttons navigation
                                        try {
                                            debug("INF clickNav", { slideIndex })
                                            stopAutoplay() // Stop autoplay when user clicks

                                            // Just call toIndex directly, let onChange handle the visual updates
                                            loopRef.current.toIndex(
                                                slideIndex,
                                                {
                                                    duration:
                                                        animation.duration,
                                                    ease: getEasingString(
                                                        animation.easing ||
                                                            "power1.inOut"
                                                    ),
                                                }
                                            )

                                            // Restart autoplay after user interaction
                                            if (autoplay) {
                                                setTimeout(startAutoplay, 10)
                                            }
                                        } catch (error) {}
                                    }
                                }
                            }
                        } else {
                            // This was just a click with click nav disabled - ignore completely
                        }

                        // Reset state for clicks
                        isDraggingRef.current = false
                        isThrowingRef.current = false
                        setIsDragging(false)

                        // Resume autoplay if it was playing before
                        if (wasPlaying) {
                            tl.play()
                        }

                        // Restart autoplay if enabled
                        if (autoplay) {
                            setTimeout(startAutoplay, 10)
                        }

                        // Reset for next interaction immediately for clicks
                        this.isClick = true
                        this.allowDrag = false
                    } else if (this.allowDrag) {
                        // This was a real drag
                        isDraggingRef.current = false
                        setIsDragging(false)

                        if (!fluid) {
                            // NON-FLUID MODE: If we reach release, check if we dragged enough for slide change
                            const dragDistance = startProgress / -ratio - this.x
                            const minReleaseThreshold = 50 // Minimum drag distance on release to trigger slide change
                            const startIndex =
                                this.startIndex !== undefined
                                    ? this.startIndex
                                    : tl.closestIndex
                                      ? tl.closestIndex()
                                      : 0

                            let targetIndex = startIndex

                            if (Math.abs(dragDistance) > minReleaseThreshold) {
                                // Determine target slide based on direction
                                targetIndex =
                                    dragDistance > 0
                                        ? (startIndex + 1) % length // Next slide
                                        : (startIndex - 1 + length) % length // Previous slide
                            }
                            // If drag distance is small, targetIndex remains startIndex (current slide)

                            try {
                                tl.toIndex(targetIndex, {
                                    duration: animation.duration,
                                    ease: getEasingString(
                                        animation.easing || "power1.inOut"
                                    ),
                                })
                            } catch (error) {}
                        } else {
                            // FLUID MODE: Original behavior
                            syncIndex()

                            // Update autoplay direction based on drag direction if throwAware is enabled
                            if (throwAware === "Follow") {
                                const mouseDistance =
                                    dragEndMouseXRef.current -
                                    dragStartMouseXRef.current
                                currentAutoplayDirectionRef.current =
                                    mouseDistance > 0 ? "left" : "right"
                            }
                        }

                        // Check if throwing animation will start (only in fluid mode)
                        if (fluid && draggable.isThrowing) {
                            isThrowingRef.current = true
                            indexIsDirty = true

                            // Update styling immediately when throw starts
                            try {
                                const currentIndex = tl.closestIndex
                                    ? tl.closestIndex()
                                    : 0
                                const currentElement =
                                    boxesRef.current[currentIndex]

                                if (currentElement) {
                                    // Update React state immediately
                                    setActiveElement(currentElement)
                                    setActiveSlideIndex(currentIndex)

                                    // Note: Visual updates will be handled by the onChange callback
                                    // when the slide actually changes, preventing animation conflicts
                                }
                            } catch (error) {}
                        }
                    } else {
                        // This was a click but click nav is enabled - let the click handler deal with it
                        isDraggingRef.current = false
                        isThrowingRef.current = false
                        setIsDragging(false)

                        // Reset for next interaction immediately for clicks
                        this.isClick = true
                        this.allowDrag = false
                    }

                    // For drags, don't reset until throwing is complete
                    if (this.allowDrag && !draggable.isThrowing) {
                        // No throwing animation, reset now
                        this.isClick = true
                        this.allowDrag = false
                        // Safety: ensure click navigation is re-enabled
                        isThrowingRef.current = false
                    }

                    // Post-release safety: if inertia isn't active, re-enable click nav on next tick
                    try {
                        const d = draggable
                        setTimeout(() => {
                            try {
                                if (!d || !d.isThrowing) {
                                    isThrowingRef.current = false
                                }
                            } catch (_) {}
                        }, 0)
                    } catch (_) {}
                },
                onThrowComplete: () => {
                    debug("INF onThrowComplete")
                    syncIndex()
                    isThrowingRef.current = false // Throwing animation completed
                    wasPlaying && tl.play()

                    // Extra safety: in case any click during throw set flags, re-enable click nav
                    try {
                        if (draggable) {
                            draggable.isClick = true
                            draggable.allowDrag = false
                        }
                        // Clear again on next tick to cover synchronous edge cases
                        setTimeout(() => {
                            isThrowingRef.current = false
                        }, 0)
                    } catch (e) {}

                    // Reset for next interaction after throwing completes
                    if (draggable) {
                        draggable.isClick = true
                        draggable.allowDrag = false
                    }

                    // Ensure cursor resets after throw
                    isDraggingRef.current = false
                    setIsDragging(false)

                    // Restart autoplay after throwing completes
                    if (autoplay) {
                        setTimeout(startAutoplay, 10) // Restart after 1 second delay
                    }
                },
            })[0]
            tl.draggable = draggable

            // Store cleanup function for global event listeners
            ;(tl as any).cleanupGlobalDrag = () => {
                document.removeEventListener("mousedown", handleGlobalMouseDown)
                document.removeEventListener("mouseup", handleGlobalMouseUp)
                document.removeEventListener("mousemove", handleGlobalMouseMove)
            }
        }

        // CENTERING FIX: Set timeline to start at center position
        // This ensures the first visible slide appears centered
        if (center && times.length > 0) {
            // Force a complete refresh to ensure all calculations are correct
            refresh(true)

            // Set timeline to start at the first content item (index 0)
            const firstContentIndex = 0
            const centerTime = times[firstContentIndex] || times[0]

            // Set the timeline to the center position immediately
            tl.time(centerTime, true)
        }

        // Update current index after centering
        tl.closestIndex(true)
        lastIndex = curIndex
        onChange && onChange(items[curIndex], curIndex)

        // Store cleanup function for later use
        ;(tl as any).cleanup = () => {
            window.removeEventListener("resize", onResize)
            // Clean up global drag event listeners if they exist
            if ((tl as any).cleanupGlobalDrag) {
                ;(tl as any).cleanupGlobalDrag()
            }
        }

        // Fallback click handler for when draggable is disabled but click navigation is enabled
        if (
            (!config.draggable || (finiteMode && clickNavigation)) &&
            clickNavigation
        ) {
            items.forEach((item, index) => {
                item.addEventListener("click", (e) => {
                    // Disable click navigation while throwing
                    if (isThrowingRef.current) {
                        e.stopPropagation()
                        e.preventDefault?.()
                        return
                    }
                    e.stopPropagation()
                    try {
                        stopAutoplay() // Stop autoplay when user clicks

                        // Use the same simple pattern as buttons navigation
                        // Just call toIndex directly, let onChange handle the visual updates
                        tl.toIndex(index, {
                            duration: animation.duration,
                            ease: getEasingString(
                                animation.easing || "power1.inOut"
                            ),
                        })

                        // Restart autoplay after user interaction
                        if (autoplay) {
                            setTimeout(startAutoplay, 10)
                        }
                    } catch (error) {}
                })
            })
        }

        return tl
    }

    // Add initialization state to prevent race conditions
    const initializationRef = useRef({
        isInitializing: false,
        isInitialized: false,
    })
    const isInitialSetupRef = useRef(true) // Track if we're in initial setup phase

    // Fallback timeout to ensure component shows up even if initialization fails
    useEffect(() => {
        const fallbackTimeout = setTimeout(() => {
            if (!isFullyInitialized) {
                setIsFullyInitialized(true)
            }
            // CRITICAL FIX: Also set isCentered to ensure component is visible
            if (!isCentered) {
                setIsCentered(true)
            }
        }, 2000) // 2 second fallback

        return () => clearTimeout(fallbackTimeout)
    }, [isFullyInitialized, isCentered])

    // Update slide visuals when effects props change
    useEffect(() => {
        if (!isFullyInitialized || !boxesRef.current) return

        // Update all slides with new styling
        boxesRef.current.forEach((slideElement, i) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Determine if this is the active/central slide
            let isCentralSlide = false

            if (finiteMode) {
                isCentralSlide = i === activeSlideIndex
            } else {
                // In infinite mode, also use the activeSlideIndex state for consistency
                isCentralSlide = i === activeSlideIndex
            }

            const isCentralCustomized = false

            // Get the appropriate style values
            const targetScale = isCentralSlide
                ? effects.current || 1.1
                : effects.scale || 1

            // Apply styling with smooth animation
            gsap.to(innerElement, {
                scale: targetScale,
                duration: animation.duration || 0.4,
                ease: getEasingString(animation.easing || "power1.inOut"),
                transformOrigin: "center",
                overwrite: true, // Overwrite any existing animations on this element
            })
        })
    }, [
        effects,
        finiteMode,
        activeSlideIndex,
        animation.duration,
        animation.easing,
        isFullyInitialized,
        getEasingString,
    ])

    // Detect canvas mode once on mount
    useEffect(() => {
        // Detect if we're in Framer canvas mode
        const isCanvasMode =
            window.location.href.includes("framer.com") ||
            window.location.href.includes("localhost") ||
            document.querySelector("[data-framer-name]") !== null

        setCanvasMode(isCanvasMode)
    }, [])

    // Handle arrow fade-in effect by observing actual arrow elements
    useEffect(() => {
        if (!arrows?.show || !arrows?.fadeIn) {
            return
        }

        const targets: HTMLElement[] = []
        if (prevArrowElRef.current) targets.push(prevArrowElRef.current)
        if (nextArrowElRef.current) targets.push(nextArrowElRef.current)
        if (!targets.length) return

        // Initialize opacity to 0 for fade-in behavior
        try {
            targets.forEach((el) => {
                gsap.set(el, { opacity: 0 })
            })
        } catch (_) {}

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const el = entry.target as HTMLElement
                    try {
                        // Use intersectionRatio to determine visibility
                        // intersectionRatio is 0 when element is not visible, 1 when fully visible
                        const shouldBeVisible = entry.isIntersecting

                        // Get fade settings from property controls
                        const fadeDuration =
                            arrows?.fadeInControls?.duration || 0.5
                        const fadeEasing =
                            arrows?.fadeInControls?.easing || "power1.inOut"
                        const fadeDelay = arrows?.fadeInControls?.delay || 0.2

                        gsap.to(el, {
                            opacity: shouldBeVisible ? 1 : 0,
                            duration: fadeDuration,
                            delay: shouldBeVisible ? fadeDelay : 0, // Only delay on fade-in
                            ease: getEasingString(fadeEasing),
                            overwrite: true,
                        })
                    } catch (_) {}
                })
            },
            {
                threshold: 0.1, // Trigger when 10% of arrow is visible
                rootMargin: "0px",
            }
        )

        targets.forEach((el) => observer.observe(el))

        return () => {
            observer.disconnect()
        }
    }, [
        arrows?.show,
        arrows?.fadeIn,
        arrows?.fadeInControls?.duration,
        arrows?.fadeInControls?.easing,
        arrows?.fadeInControls?.delay,
        getEasingString,
    ])

    // Remove the old useEffect - now using useLayoutEffect for immediate measurement

    // Log when heights are measured - removed duplicate logging

    // Resize detection for Framer canvas mode - only triggers on actual resize
    useEffect(() => {
        if (!wrapperRef.current) return

        // Use MutationObserver to detect style changes (Framer resizing)
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "style"
                ) {
                    // Debounce the resize detection
                    if (resizeTimeoutRef.current) {
                        clearTimeout(resizeTimeoutRef.current)
                    }

                    resizeTimeoutRef.current = setTimeout(() => {
                        if (wrapperRef.current) {
                            const rect =
                                wrapperRef.current.getBoundingClientRect()
                            if (rect.width > 0 && rect.height > 0) {
                                const prevWidth =
                                    containerDimensions.current.width
                                const prevHeight =
                                    containerDimensions.current.height

                                // Only update when aspect ratio changes (more performant)
                                const prevRatio =
                                    prevWidth / Math.max(prevHeight || 1, 1)
                                const newRatio =
                                    rect.width / Math.max(rect.height || 1, 1)
                                const aspectChanged =
                                    Math.abs(newRatio - prevRatio) > 0.0001

                                // Only trigger re-render if aspect ratio actually changed
                                if (aspectChanged) {
                                    containerDimensions.current = {
                                        width: rect.width,
                                        height: rect.height,
                                    }

                                    // In canvas mode, re-initialize the timeline for proper centering
                                    if (canvasMode && loopRef.current) {
                                        // DON'T reset isCentered during resize - keep component visible
                                        // setIsCentered(false) - REMOVED to prevent flashing

                                        // Pause current timeline
                                        loopRef.current.pause()

                                        // Re-initialize after a short delay to ensure DOM is updated
                                        setTimeout(() => {
                                            if (
                                                wrapperRef.current &&
                                                boxesRef.current.length > 0
                                            ) {
                                                // Recreate the timeline with new dimensions
                                                if (finiteMode) {
                                                    loopRef.current =
                                                        createFiniteTimeline(
                                                            boxesRef.current,
                                                            {
                                                                gap: gap || 20,
                                                                center: true,
                                                                draggable:
                                                                    draggable,
                                                                paused: false,
                                                            }
                                                        )
                                                } else {
                                                    loopRef.current =
                                                        createHorizontalLoop(
                                                            boxesRef.current,
                                                            {
                                                                gap: gap || 20,
                                                                center: true,
                                                                draggable:
                                                                    draggable,
                                                                paused: false,
                                                            }
                                                        )
                                                }

                                                // Center on the first slide
                                                if (loopRef.current) {
                                                    loopRef.current.toIndex(0, {
                                                        duration: 0,
                                                    })
                                                }

                                                // Component remains visible - no need to reset isCentered
                                            }
                                        }, 50)
                                    }

                                    // Force re-render only for relevant change
                                    setForceRender((prev) => prev + 1)
                                }
                            }
                        }
                    }, 100) // debounce to ~10fps during canvas resize
                }
            })
        })

        // Observe the wrapper element for style changes
        mutationObserver.observe(wrapperRef.current, {
            attributes: true,
            attributeFilter: ["style"],
        })

        return () => {
            mutationObserver.disconnect()
        }
    }, [canvasMode, finiteMode, gap, draggable])

    // Update button visuals when buttonsUI props change
    useEffect(() => {
        if (!isFullyInitialized) return

        const leftButton = document.querySelector(
            '[data-button="prev"]'
        ) as HTMLElement
        const rightButton = document.querySelector(
            '[data-button="next"]'
        ) as HTMLElement

        if (leftButton) {
            const isPrevDisabled = finiteMode && activeSlideIndex === 0

            if (isPrevDisabled) {
                gsap.to(leftButton, {
                    opacity: arrows.opacity,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            } else {
                gsap.to(leftButton, {
                    opacity: 1,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
        }

        if (rightButton) {
            const totalSlides = boxesRef.current.length || 1
            const isNextDisabled =
                finiteMode && activeSlideIndex === totalSlides - 1

            if (isNextDisabled) {
                gsap.to(rightButton, {
                    opacity: arrows.opacity,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            } else {
                gsap.to(rightButton, {
                    opacity: 1,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
        }
    }, [
        finiteMode,
        activeSlideIndex,
        animation.duration,
        animation.easing,
        isFullyInitialized,
        getEasingString,
    ])

    // Update dots when dotsUI props change
    useEffect(() => {
        if (!isFullyInitialized || !dotsUI.enabled) return
        animateDots(activeSlideIndex)
    }, [dotsUI, activeSlideIndex, isFullyInitialized, animateDots])

    // Trigger centering when mode changes - force complete re-initialization
    useEffect(() => {
        if (!isFullyInitialized) return

        // Preserve container dimensions during mode change to prevent height issues
        const preservedDimensions = { ...containerDimensions.current }

        // Force complete re-initialization when mode changes (simplest approach)
        setIsFullyInitialized(false)
        // CRITICAL FIX: Keep component visible during mode change
        // Don't reset isCentered - prevents "invisible carousel on reload" bug

        // Small delay to ensure DOM is updated after re-render
        const timeoutId = setTimeout(() => {
            // Restore container dimensions if they were lost during re-initialization
            if (
                containerDimensions.current.width === 0 ||
                containerDimensions.current.height === 0
            ) {
                containerDimensions.current = preservedDimensions
            }

            // Reset initialization state to trigger full re-initialization
            initializationRef.current.isInitialized = false
            initializationRef.current.isInitializing = false
        }, 50)

        return () => clearTimeout(timeoutId)
    }, [finiteMode])

    // Handle height changes without re-rendering
    useEffect(() => {
        if (!isFullyInitialized || !loopRef.current) return

        // Small delay to ensure DOM is updated
        const timeoutId = setTimeout(() => {
            if (loopRef.current && loopRef.current.center) {
                try {
                    loopRef.current.center()
                } catch (error) {}
            }
        }, 50)

        return () => clearTimeout(timeoutId)
    }, [containerDimensions.current.height, isFullyInitialized])

    // Robust click navigation: ensure slide click navigates even when draggable is enabled
    useEffect(() => {
        // Only add this safety layer in infinite mode; finite mode has its own click logic
        if (!isFullyInitialized || !clickNavigation || finiteMode) return
        const slides = boxesRef.current.filter(Boolean) as HTMLDivElement[]
        if (!slides.length || !loopRef.current) return

        const handleSlideClick = (e: MouseEvent) => {
            // Ignore if throwing/dragging or disabled
            if (isThrowingRef.current || isDraggingRef.current) return

            const target = e.currentTarget as HTMLDivElement
            const index = boxesRef.current.indexOf(target)
            if (index === -1) return
            try {
                stopAutoplay()
                loopRef.current?.toIndex(index, {
                    duration: animation.duration,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
                if (autoplay) setTimeout(startAutoplay, 10)
            } catch (_) {}
        }

        slides.forEach((el) => el.addEventListener("click", handleSlideClick))
        return () => {
            slides.forEach((el) =>
                el.removeEventListener("click", handleSlideClick)
            )
        }
    }, [
        isFullyInitialized,
        clickNavigation,
        finiteMode,
        animation.duration,
        animation.easing,
        autoplay,
        getEasingString,
    ])

    /**
     * Initialize the horizontal loop using useGSAP
     *
     * useGSAP is the recommended way to integrate GSAP with React. It automatically
     * handles cleanup when the component unmounts and provides better performance
     * than manual useEffect + GSAP context management.
     *
     * Key benefits:
     * - Automatic cleanup of GSAP animations
     * - Proper React lifecycle integration
     * - Scoped animations to prevent conflicts
     * - Better performance and memory management
     */
    useGSAP(
        () => {
            // Prevent multiple simultaneous initializations
            if (
                initializationRef.current.isInitializing ||
                initializationRef.current.isInitialized
            ) {
                return
            }

            initializationRef.current.isInitializing = true

            // Use requestAnimationFrame for better timing coordination
            const initFrame = requestAnimationFrame(() => {
                // Collect mounted slides
                const allSlides = boxesRef.current.filter(Boolean)

                // DYNAMIC FIX: Ensure we have enough slides to fill the container
                if (allSlides.length < slideData.finalCount) {
                    // Retry after a short delay
                    setTimeout(() => {
                        const retrySlides = boxesRef.current.filter(Boolean)
                        if (retrySlides.length >= slideData.finalCount) {
                            // Re-run the initialization logic here
                        } else {
                        }
                    }, 100)
                    return
                }

                // FIX: Ensure all elements are in the DOM before passing to GSAP
                const validSlides = allSlides.filter((slide) => {
                    const isInDOM = document.contains(slide)
                    const isVisible =
                        window.getComputedStyle(slide).display !== "none"
                    return isInDOM && isVisible
                })

                // Validate that we have slides and container
                if (validSlides.length === 0 || !wrapperRef.current) {
                    return
                }

                // Ensure container has dimensions - single check with fallback
                const containerRect = wrapperRef.current.getBoundingClientRect()
                if (containerRect.width === 0 || containerRect.height === 0) {
                    // Use fallback dimensions instead of retrying
                    containerDimensions.current = { width: 600, height: 400 }
                } else {
                    containerDimensions.current = {
                        width: containerRect.width,
                        height: containerRect.height,
                    }
                }

                setContainerReady(true)
                
                // CRITICAL FIX: Set isCentered early to make component visible during initialization
                // This prevents the "invisible on reload" issue
                setIsCentered(true)

                /**
                 * Create the horizontal loop with configuration
                 *
                 * Configuration options:
                 * - paused: true - Start paused so we can control it manually
                 * - draggable: true - Enable drag-to-scroll functionality
                 * - center: wrapperRef.current - Use wrapper element for centering calculations
                 * - onChange: Callback fired when the active slide changes
                 */
                const currentGap = Math.max(gap ?? 20, 0)

                // FIX: Add delay to ensure all 6 slides are rendered
                setTimeout(() => {
                    // Re-check all slides after delay
                    const allSlidesAfterDelay = boxesRef.current.filter(Boolean)

                    if (allSlidesAfterDelay.length < slideData.finalCount) {
                        return
                    }

                    const finalValidSlides = allSlidesAfterDelay.filter(
                        (slide) => {
                            const isInDOM = document.contains(slide)
                            const isVisible =
                                window.getComputedStyle(slide).display !==
                                "none"
                            return isInDOM && isVisible
                        }
                    )

                    if (finalValidSlides.length === 0) {
                        return
                    }

                    try {
                        // Use different GSAP logic for finite vs infinite modes
                        let loop: HorizontalLoopTimeline | null = null

                        if (finiteMode) {
                            // Finite mode: create a simple timeline without infinite loop
                            loop = createFiniteTimeline(
                                finalValidSlides,
                                {
                                    paused: true,
                                    draggable: draggable,
                                    center: true,
                                    gap: currentGap,
                                    onChange: (
                                        element: HTMLElement,
                                        index: number
                                    ) => {
                                        // Debounce onChange to prevent excessive state updates
                                        requestAnimationFrame(() => {
                                            try {
                                                
                                                // Update React state when active slide changes
                                                setActiveElement(element)
                                                setActiveSlideIndex(index)

                                                // Animate all slides with GSAP (skip during initial setup)
                                                if (
                                                    !isInitialSetupRef.current
                                                ) {
                                                    boxesRef.current.forEach(
                                                        (box, i) => {
                                                            if (box) {
                                                                const isActive =
                                                                    box ===
                                                                    element
                                                                animateSlideVisuals(
                                                                    box,
                                                                    isActive
                                                                )
                                                            }
                                                        }
                                                    )
                                                }

                                                // Animate dots if in finite mode
                                                if (
                                                    finiteMode &&
                                                    dotsUI.enabled
                                                ) {
                                                    const totalDots =
                                                        slideData?.actualSlideCount ||
                                                        0
                                                    const normalizedIndex =
                                                        totalDots
                                                            ? index % totalDots
                                                            : index
                                                    animateDots(normalizedIndex)
                                                }

                                                // Animate buttons based on disabled state
                                                if (
                                                    finiteMode &&
                                                    arrows?.show
                                                ) {
                                                    const isPrevDisabled =
                                                        index === 0
                                                    const isNextDisabled =
                                                        index ===
                                                        (slideData?.actualSlideCount ||
                                                            1) -
                                                            1
                                                    animateButtons(
                                                        isPrevDisabled,
                                                        isNextDisabled
                                                    )
                                                }
                                            } catch (error) {
                                                
                                            }
                                        })
                                    },
                                },
                                "center"
                            )
                        } else {
                            // Infinite mode: use horizontal loop
                            loop = createHorizontalLoop(finalValidSlides, {
                                paused: true,
                                draggable: draggable, // Use the property control value
                                center: wrapperRef.current || true, // Pass the wrapper element for proper centering
                                gap: currentGap, // Pass the gap value for proper loop calculations
                                onChange: (
                                    element: HTMLElement,
                                    index: number
                                ) => {
                                    // Debounce onChange to prevent excessive state updates
                                    requestAnimationFrame(() => {
                                        try {
                                            // Update React state when active slide changes
                                            setActiveElement(element)
                                            setActiveSlideIndex(index)

                                            // Animate all slides with GSAP (skip during initial setup)
                                            if (!isInitialSetupRef.current) {
                                                boxesRef.current.forEach(
                                                    (box, i) => {
                                                        if (box) {
                                                            const isActive =
                                                                box === element
                                                            animateSlideVisuals(
                                                                box,
                                                                isActive
                                                            )
                                                        }
                                                    }
                                                )
                                            }

                                            // Animate dots
                                            if (dotsUI.enabled) {
                                                const totalDots =
                                                    slideData?.validContent
                                                        ?.length || 0
                                                const normalizedIndex =
                                                    totalDots
                                                        ? ((index % totalDots) +
                                                              totalDots) %
                                                          totalDots
                                                        : index
                                                animateDots(normalizedIndex)
                                            }
                                        } catch (error) {}
                                    })
                                },
                            })
                        }

                        if (loop) {
                            loopRef.current = loop
                            initializationRef.current.isInitialized = true

                            // Click navigation is now handled through the draggable system

                            // Initialize autoplay direction
                            currentAutoplayDirectionRef.current = direction

                            // Start autoplay if enabled
                            if (autoplay) {
                                startAutoplay()
                            }

                            // Force-set the initial index using the same code path as navigation
                            try {
                                if ((loop as any).toIndex) {
                                    ;(loop as any).toIndex(0, {
                                        duration: 0,
                                        ease: "none",
                                    })
                                    gsap.ticker.flush()
                                }
                            } catch (e) {}

                            // Initialize visual states for all slides and dots BEFORE showing component
                            setTimeout(() => {
                                // Apply initial styling to ALL slides immediately (no animation)
                                applyInitialStylingToAllSlides()

                                // Apply initial styling to buttons immediately (no animation)
                                if (finiteMode && arrows?.show) {
                                    applyInitialButtonStyling()
                                }

                                // Set initial visual state for dots
                                if (dotsUI.enabled) {
                                    animateDots(0) // First dot is active by default
                                }

                                // Component is already visible from earlier setIsCentered(true)
                                // No need to set it again here
                            }, 100) // Small delay to ensure DOM is ready

                            // Mark as fully initialized after visual styling is complete
                            setTimeout(() => {
                                setIsFullyInitialized(true)
                                // Allow animations for subsequent interactions
                                isInitialSetupRef.current = false
                            }, 150) // Slightly longer delay to ensure all styling is applied

                            // Return cleanup function - useGSAP will handle this automatically
                            return () => {
                                cancelAnimationFrame(initFrame)
                                initializationRef.current.isInitializing = false
                                initializationRef.current.isInitialized = false
                                stopAutoplay() // Stop autoplay on cleanup

                                // Click handlers are now handled by React, no cleanup needed

                                // Call the timeline's cleanup function
                                if ((loop as any).cleanup) {
                                    try {
                                        ;(loop as any).cleanup()
                                    } catch (error) {}
                                }
                            }
                        }
                    } catch (error) {
                        initializationRef.current.isInitializing = false
                        // Return basic cleanup even if loop creation failed
                        return () => {
                            cancelAnimationFrame(initFrame)
                            initializationRef.current.isInitializing = false
                            initializationRef.current.isInitialized = false
                            stopAutoplay()
                        }
                    }
                }, 50) // Close setTimeout with 50ms delay
            })

            return () => {
                cancelAnimationFrame(initFrame)
                initializationRef.current.isInitializing = false
                initializationRef.current.isInitialized = false
            }
        },
        {
            scope: wrapperRef,
            // STABILITY FIX: Reduce dependencies to prevent unnecessary re-initializations
            dependencies: [
                dragFactor,
                draggable,
                clickNavigation,
                content.length,
                gap,
                autoplay,
                direction,
                finiteMode, // Add finiteMode to trigger re-initialization when mode changes
                // Always use full-width mode
                containerReady,
            ],
        }
    ) // Scope to wrapper element

    /**
     * Autoplay Functions
     *
     * These functions handle the automatic progression of slides.
     */
    const startAutoplay = () => {
        try {
            if (
                !autoplay ||
                !loopRef.current ||
                RenderTarget.current() === RenderTarget.canvas
            )
                return

            // Don't start autoplay if user is dragging or throwing
            if (isDraggingRef.current || isThrowingRef.current) return

            // Clear any existing timer
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current)
            }

            // Validate autoplay duration
            const duration = Math.max(interval || 3, 0.5) // Minimum 0.5 seconds

            // Start new timer
            autoplayTimerRef.current = setInterval(() => {
                try {
                    // Check again before advancing - user might have started dragging
                    if (
                        loopRef.current &&
                        !isDraggingRef.current &&
                        !isThrowingRef.current
                    ) {
                        // Store current index before navigation
                        const currentIndex = loopRef.current.current
                            ? loopRef.current.current()
                            : 0

                        // Use current direction for autoplay
                        if (currentAutoplayDirectionRef.current === "right") {
                            if (loopRef.current.next) {
                                const nextResult = loopRef.current.next({
                                    duration: animation.duration,
                                    ease: getEasingString(
                                        animation.easing || "power1.inOut"
                                    ),
                                })

                                // In finite mode, check if we actually moved to the next slide
                                if (finiteMode) {
                                    // Small delay to let the animation start, then check if we're still at the same index
                                    setTimeout(() => {
                                        const newIndex = loopRef.current
                                            ?.current
                                            ? loopRef.current.current()
                                            : 0

                                        if (newIndex === currentIndex) {
                                            // We didn't move, which means we're at the end
                                            // Reverse direction for next iteration
                                            currentAutoplayDirectionRef.current =
                                                "left"
                                        }
                                    }, 50)
                                }
                            }
                        } else if (
                            currentAutoplayDirectionRef.current === "left"
                        ) {
                            if (loopRef.current.previous) {
                                const prevResult = loopRef.current.previous({
                                    duration: animation.duration,
                                    ease: getEasingString(
                                        animation.easing || "power1.inOut"
                                    ),
                                })

                                // In finite mode, check if we actually moved to the previous slide
                                if (finiteMode) {
                                    // Small delay to let the animation start, then check if we're still at the same index
                                    setTimeout(() => {
                                        const newIndex = loopRef.current
                                            ?.current
                                            ? loopRef.current.current()
                                            : 0

                                        if (newIndex === currentIndex) {
                                            // We didn't move, which means we're at the beginning
                                            // Reverse direction for next iteration
                                            currentAutoplayDirectionRef.current =
                                                "right"
                                        }
                                    }, 50)
                                }
                            }
                        }
                    }
                } catch (error) {
                    stopAutoplay() // Stop autoplay if there's an error
                }
            }, duration * 1000) // Convert seconds to milliseconds
        } catch (error) {}
    }

    const stopAutoplay = () => {
        try {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current)
                autoplayTimerRef.current = null
            }
        } catch (error) {}
    }

    /**
     * Event Handlers for Navigation
     *
     * These functions handle user interactions with the slider controls.
     * They use the GSAP timeline methods to animate between slides.
     */

    /**
     * Navigate to the next slide
     *
     * Uses the timeline's next() method to smoothly animate to the next slide
     * with a custom duration and easing function.
     * Seamlessly wraps around to the beginning in infinite mode.
     */
    const handleNext = () => {
        try {
            stopAutoplay() // Stop autoplay when user interacts
            if (loopRef.current && loopRef.current.next) {
                loopRef.current.next({
                    duration: animation.duration,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
            // Restart autoplay after user interaction
            if (autoplay) {
                setTimeout(startAutoplay, 10) // Restart after delay
            }
        } catch (error) {}
    }

    /**
     * Navigate to the previous slide
     *
     * Uses the timeline's previous() method to smoothly animate to the previous slide
     * with a custom duration and easing function.
     * Seamlessly wraps around to the end in infinite mode.
     */
    const handlePrev = () => {
        try {
            stopAutoplay() // Stop autoplay when user interacts
            if (loopRef.current && loopRef.current.previous) {
                loopRef.current.previous({
                    duration: animation.duration,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
            // Restart autoplay after user interaction
            if (autoplay) {
                setTimeout(startAutoplay, 10) // Restart after delay
            }
        } catch (error) {}
    }

    /**
     * Generate Slide Elements
     *
     * Creates 11 slide elements with different gray shades and variable widths.
     * Each slide is assigned to a ref for GSAP manipulation.
     *
     * Design pattern:
     * - Different gray shade for each slide
     * - Variable widths generated once and stored in ref for stability
     * - Each slide gets a ref for GSAP timeline integration
     */

    /**
     * ResizeObserver callback with debouncing for performance
     * STABILITY FIX: Prevent resize conflicts during animations
     */
    const handleResize = useCallback(
        (entries: ResizeObserverEntry[]) => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }

            resizeTimeoutRef.current = setTimeout(() => {
                const entry = entries[0]
                if (entry) {
                    const { width, height } = entry.contentRect
                    const prevWidth = containerDimensions.current.width
                    const prevHeight = containerDimensions.current.height

                    // Only update if there's a significant change (prevents excessive recalculations)
                    if (
                        Math.abs(width - prevWidth) > 20 ||
                        Math.abs(height - prevHeight) > 20
                    ) {
                        // STABILITY FIX: Don't clear widths during resize - recalculate instead
                        const wasPlaying =
                            loopRef.current && !loopRef.current.paused()

                        // Pause animations during resize to prevent conflicts
                        if (loopRef.current && wasPlaying) {
                            loopRef.current.pause()
                        }

                        containerDimensions.current = { width, height }

                        // Recalculate slide widths without clearing the array
                        if (content.length > 0) {
                            const dimensions = calculateSlideDimensions(
                                width,
                                height,
                                content
                            )
                            const slideWidth = Math.max(dimensions.width, 50)
                            boxWidths.current = boxWidths.current.map(
                                () => slideWidth
                            )
                        }

                        // Update container dimensions
                        containerDimensions.current = { width, height }

                        // Force a re-render to recalculate slide count
                        setContainerReady(false)
                        setForceRender((prev) => prev + 1) // Trigger re-render
                        setTimeout(() => setContainerReady(true), 10)

                        // Resume animations after a short delay
                        if (loopRef.current && wasPlaying) {
                            setTimeout(() => {
                                if (loopRef.current) loopRef.current.play()
                            }, 50)
                        }
                    }
                }
            }, 100) // debounce to ~10fps during resize
        },
        [calculateSlideDimensions, content]
    )

    /**
     * Setup ResizeObserver for container width detection
     * STABILITY FIX: Better initialization and cleanup
     */
    useEffect(() => {
        if (!wrapperRef.current) return

        // Initialize ResizeObserver with error handling
        try {
            resizeObserverRef.current = new ResizeObserver(handleResize)
            resizeObserverRef.current.observe(wrapperRef.current)

            // Get initial dimensions with fallback
            const rect = wrapperRef.current.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                containerDimensions.current = {
                    width: rect.width,
                    height: rect.height,
                }
            } else {
                // Use fallback dimensions if measurement fails
                containerDimensions.current = { width: 600, height: 400 }
            }
        } catch (error) {
            // Fallback to window resize for older browsers
            const handleWindowResize = () => {
                if (wrapperRef.current) {
                    const rect = wrapperRef.current.getBoundingClientRect()
                    if (rect.width > 0 && rect.height > 0) {
                        containerDimensions.current = {
                            width: rect.width,
                            height: rect.height,
                        }
                    }
                }
            }
            window.addEventListener("resize", handleWindowResize)

            return () => {
                window.removeEventListener("resize", handleWindowResize)
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current)
                }
            }
        }

        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect()
            }
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
        }
    }, [handleResize])

    /**
     * Calculate how many slides we actually need with proper validation and limits
     * DYNAMIC APPROACH: Calculate slides needed to fill container width
     */
    // Determine if a React node will render visible content
    const isRenderableNode = useCallback((node: React.ReactNode): boolean => {
        if (node === null || node === undefined || node === false) return false
        if (Array.isArray(node)) return node.some(isRenderableNode)
        if (typeof node === "string") return node.trim().length > 0
        if (typeof node === "number") return true
        if (React.isValidElement(node)) {
            const props: any = node.props || {}
            const style = (props.style || {}) as React.CSSProperties
            if (
                style &&
                (style.display === "none" || style.visibility === "hidden")
            )
                return false
            // Filter out empty fragments
            if (node.type === React.Fragment) {
                return isRenderableNode(props.children)
            }
            return true
        }
        return true
    }, [])

    const calculateRequiredSlides = useCallback(() => {
        // Validate content array
        const validContent = Array.isArray(content)
            ? content.filter(isRenderableNode)
            : []
        const actualSlideCount = finiteMode
            ? Math.max(validContent.length, 1) // Finite mode: use actual content count
            : Math.max(validContent.length, 3) // Infinite modes: minimum 3 for infinite loop

        // DYNAMIC APPROACH: Calculate slides needed to fill container
        const containerWidth = containerDimensions.current.width
        const slideGap = Math.max(gap ?? 20, 0)

        if (containerWidth > 0) {
            // Calculate how many slides we need to fill the container
            // For finite mode, just use the actual slide count
            // For infinite modes, we need at least 2x the content for infinite loop
            const minSlides = finiteMode
                ? actualSlideCount // Finite mode: just the actual slides
                : actualSlideCount * 2 // Infinite modes: minimum for infinite loop

            // Calculate slide width (use first slide width if available, otherwise estimate)
            // For very short slides, we need a better estimation strategy
            let estimatedSlideWidth = boxWidths.current[0] || 300

            // If we have very short slides, ensure minimum width for proper filling
            if (estimatedSlideWidth < 100) {
                // For very short slides, estimate based on container and content count
                const minSlideWidth = Math.max(150, containerWidth / 8) // At least 150px or 1/8 of container
                estimatedSlideWidth = Math.max(
                    estimatedSlideWidth,
                    minSlideWidth
                )
            }

            const slideWidthWithGap = estimatedSlideWidth + gap

            // Calculate how many slides we need to fill the container with some overflow
            const slidesNeeded = finiteMode
                ? actualSlideCount // Finite mode: just use actual slides
                : Math.ceil((containerWidth * 1.5) / slideWidthWithGap) // 1.5x for smooth scrolling

            // CRITICAL FIX: Ensure finalCount is always a multiple of actualSlideCount
            // This ensures proper content cycling and infinite loop behavior
            const rawFinalCount = Math.max(minSlides, slidesNeeded)
            const finalCount = finiteMode
                ? rawFinalCount // Finite mode: use exact count
                : Math.ceil(rawFinalCount / actualSlideCount) * actualSlideCount // Infinite modes: ensure multiples

            // SAFETY CHECK: Ensure we have enough slides for very wide containers
            // For very wide containers, we might need more than 1.5x to ensure smooth scrolling
            const minSlidesForWideContainer =
                Math.ceil(containerWidth / slideWidthWithGap) + actualSlideCount
            const finalCountWithSafety = Math.max(
                finalCount,
                minSlidesForWideContainer
            )
            const finalFinalCount = finiteMode
                ? finalCount // Finite mode: use exact count (no safety check)
                : Math.ceil(finalCountWithSafety / actualSlideCount) *
                  actualSlideCount // Infinite modes: ensure multiples

            return {
                finalCount: finalFinalCount,
                actualSlideCount,
                validContent,
            }
        } else {
            // Fallback: container width not available yet
            // Finite mode: render exactly the content count (no duplication)
            // Infinite mode: use at least 2x for seamless loop
            const finalCount = finiteMode
                ? actualSlideCount
                : actualSlideCount * 2
            return { finalCount, actualSlideCount, validContent }
        }
    }, [content, finiteMode, gap])

    /**
     * Generate stable slide widths - SIMPLIFIED
     */
    const generateSlideWidths = useCallback(() => {
        const { finalCount, actualSlideCount, validContent } =
            calculateRequiredSlides()

        // Use current container dimensions
        const containerWidth = containerDimensions.current.width
        const containerHeight = containerDimensions.current.height

        // If container not ready, use fallback for canvas/preview mode
        if (!containerWidth || !containerHeight) {
            // Use reasonable fallback dimensions that work well in canvas
            const fallbackWidth = 400
            const fallbackHeight = 300
            // Finite mode should render exactly the content count (no duplication)
            const canvasFinalCount = finiteMode
                ? finalCount
                : Math.max(finalCount, 6)
            boxWidths.current = Array.from(
                { length: canvasFinalCount },
                () => fallbackWidth
            )
            boxHeights.current = Array.from(
                { length: canvasFinalCount },
                () => fallbackHeight
            )
            return {
                finalCount: canvasFinalCount,
                actualSlideCount,
                validContent,
            }
        }

        // Calculate width and height once and use for all slides
        const dimensions = calculateSlideDimensions(
            containerWidth,
            containerHeight,
            validContent
        )
        const slideWidth = Math.max(dimensions.width, 50)
        const slideHeight =
            typeof dimensions.height === "number"
                ? Math.max(dimensions.height, 50)
                : 300

        // For fill modes and fixed dimensions, use the specified dimensions instead of calculated ones
        let finalWidth = slideWidth
        let finalHeight = slideHeight

        // Use calculated height for all slides

        // Generate same width and height for all slides - simpler and more stable
        boxWidths.current = Array.from({ length: finalCount }, () => finalWidth)

        // Fixed: use container height for all slides
        boxHeights.current = Array.from(
            { length: finalCount },
            () => finalHeight
        )

        return { finalCount, actualSlideCount, validContent }
    }, [
        calculateRequiredSlides,
        calculateSlideDimensions,
        adaptiveHeight,
        originalContentHeights,
        content.length,
        heightsMeasured,
    ])

    // DYNAMIC FIX: Recalculate slides when container size changes
    const slideData = useMemo(() => {
        // Always generate slides, even in canvas mode when container isn't ready
        return generateSlideWidths()
    }, [
        generateSlideWidths,
        content.length,
        containerDimensions.current.width,
        containerDimensions.current.height,
        gap,
        finiteMode, // Add finiteMode to dependencies to recalculate when mode changes
    ]) // Include container width and gap

    // Computed UI visibility flags
    const singleFinite = finiteMode && (slideData?.actualSlideCount || 0) <= 1
    const showArrows = Boolean(arrows?.show && !singleFinite)
    const showDots = Boolean(dotsUI.enabled && !singleFinite)

    // Reset refs each render so removed slides don't linger in boxesRef
    boxesRef.current = []
    const boxes = Array.from(
        {
            length: finiteMode
                ? slideData?.actualSlideCount || 0
                : slideData.finalCount,
        },
        (_, i) => {
            const { validContent, finalCount } = slideData
            const actualSlideCount = Math.max(validContent.length, 1)

            // NEW APPROACH: Cycle through content for each static slide
            const contentIndex = actualSlideCount > 0 ? i % actualSlideCount : 0

            // Content cycling for static slides

            // Get content for this slide with error handling
            let slideContent: React.ReactNode = null
            try {
                if (validContent.length > 0 && validContent[contentIndex]) {
                    slideContent = makeComponentResponsive(
                        validContent[contentIndex],
                        `slide-${i}`
                    )

                    // Apply shadow to the content if it's a React element
                    if (React.isValidElement(slideContent)) {
                        const existingStyle =
                            (slideContent.props as any)?.style || {}
                        slideContent = React.cloneElement(
                            slideContent as React.ReactElement,
                            {
                                style: {
                                    ...existingStyle,
                                    boxShadow: effects.shadow || "none",
                                },
                            }
                        )
                    }
                }
            } catch (error) {
                slideContent = null
            }

            return (
                <div
                    key={i}
                    ref={(el) => {
                        // Store reference for GSAP timeline
                        if (el) boxesRef.current[i] = el
                    }}
                    className="box"
                    // Click navigation is now handled through the draggable system
                    style={{
                        zIndex: 1, // Ensure slides stay below arrows (zIndex: 21)
                        flexShrink: 0,
                        // Dynamic height based on mode
                        height: `${boxHeights.current[i] || 300}px`,
                        minHeight: `${boxHeights.current[i] || 300}px`,
                        // Use slideWidth prop with unit
                        width:
                            slideWidth.unit === "percent"
                                ? `${slideWidth.value}%`
                                : `${slideWidth.pixelValue || 300}px`,
                        minWidth: "100px", // Minimum width
                        maxWidth: "none", // No max-width constraint
                        marginRight: `${Math.max(gap ?? 20, 0)}px`, // Ensure gap is non-negative
                        display: "flex", // Ensure slide container is flex
                        flexDirection: "column" as const,
                        position: "relative" as const,
                        overflowY: "visible",
                    }}
                >
                    <div
                        className="box__inner"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative" as const,
                            cursor: (() => {
                                if (isDragging) return "grabbing"
                                if (draggable) return "grab"
                                return "default"
                            })(),
                            width: "100%",
                            height: "100%",
                            // Ensure no CSS aspect ratio interferes when mode is not "aspect-ratio"
                            aspectRatio: undefined,
                            backgroundColor: "transparent",
                            border: "none",
                            borderRadius: "0px",

                            transform: "none",
                            scale: `${Math.max(
                                i === activeSlideIndex
                                    ? effects.current || 1.1
                                    : effects.scale || 1,
                                0.1
                            )})`, // Ensure scale is positive
                            opacity: 1, // Always full opacity
                            fontSize: "clamp(16px, 4vw, 36px)", // Responsive font size
                            fontWeight: "medium",
                            overflow: "visible",
                            color: "#3D3D3D",
                            textAlign: "center",
                            lineHeight: "1.2",
                        }}
                    >
                        {slideContent || (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "inherit",
                                    fontWeight: "inherit",
                                    color: "inherit",
                                }}
                            >
                                <p style={{ margin: 0 }}>{contentIndex + 1}</p>
                            </div>
                        )}
                    </div>
                </div>
            )
        }
    )

    /**
     * Main Component Render
     *
     * The component renders a complete horizontal slider with:
     * - Navigation controls (prev/next/toggle buttons)
     * - Slider container with overflow control
     * - Individual slide elements with gradient borders
     * - Inline CSS for gradient theming and active states
     */

    return (
        <div
            key={`carousel-${finiteMode ? "finite" : "infinite"}`}
            style={{
                color: "white",
                textAlign: "center" as const,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column" as const,
                height: "100%",
                minHeight: "0px",
                width: "100%",
                margin: 0,
                overflow: "visible",
                position: "relative",
                zIndex: 0,
                // Only show when properly centered
                opacity: isCentered ? 1 : 0,
                visibility: isCentered ? "visible" : "hidden",
            }}
        >
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1000,
                    pointerEvents: "none",
                }}
            ></div>
            {/* Navigation Buttons - Absolutely Positioned */}
            {showArrows && (
                <div ref={arrowsRef}>
                    <>
                        {/* Previous Button */}
                        {prevArrow && (
                            <div
                                data-button="prev"
                                ref={(el) => {
                                    prevArrowElRef.current = el
                                }}
                                style={{
                                    zIndex: 9999,
                                    position: "absolute",
                                    ...(() => {
                                        const gap =
                                            arrows.distance === "group"
                                                ? (arrows.gap ?? 20)
                                                : 0
                                        const insetX = arrows.insetX ?? 20
                                        const insetXUnit =
                                            arrows.insetXUnit ?? "px"
                                        const insetXReference =
                                            arrows.insetXReference ??
                                            "container"
                                        const insetY = arrows.insetY ?? 20
                                        const verticalAlign =
                                            arrows.verticalAlign || "center"

                                        // Calculate insetX based on reference
                                        let calculatedInsetX: number | string =
                                            insetX
                                        let finalUnit: "px" | "%" | "" =
                                            insetXUnit

                                        if (
                                            insetXReference === "central-slide"
                                        ) {
                                            // Get slide width from slideWidth prop
                                            const slideWidthValue =
                                                slideWidth.value ?? 100
                                            const slideWidthUnit =
                                                slideWidth.unit ?? "percent"

                                            if (slideWidthUnit === "percent") {
                                                // For percentage-based slide width: position arrows relative to central slide edges
                                                const slideWidthPercentage =
                                                    slideWidthValue
                                                const offsetFromCenter =
                                                    (100 -
                                                        slideWidthPercentage) /
                                                    2

                                                if (insetXUnit === "px") {
                                                    // For pixel inset with percentage slide width, use calc()
                                                    calculatedInsetX = `calc(${offsetFromCenter}% + ${insetX}px)`
                                                    finalUnit = "" // No unit needed for calc()
                                                } else {
                                                    // For percentage inset with percentage slide width, add percentages
                                                    calculatedInsetX =
                                                        offsetFromCenter +
                                                        insetX
                                                    finalUnit = "%"
                                                }
                                            } else {
                                                // For pixel-based slide width: convert to percentage of container
                                                const containerWidth =
                                                    containerDimensions.current
                                                        .width
                                                if (containerWidth > 0) {
                                                    const slideWidthPixels =
                                                        slideWidth.pixelValue ??
                                                        300
                                                    const slideWidthPercentage =
                                                        (slideWidthPixels /
                                                            containerWidth) *
                                                        100
                                                    const offsetFromCenter =
                                                        (100 -
                                                            slideWidthPercentage) /
                                                        2

                                                    if (insetXUnit === "px") {
                                                        // For pixel inset with pixel slide width, use calc()
                                                        calculatedInsetX = `calc(${offsetFromCenter}% + ${insetX}px)`
                                                        finalUnit = "" // No unit needed for calc()
                                                    } else {
                                                        // For percentage inset with pixel slide width, add percentages
                                                        calculatedInsetX =
                                                            offsetFromCenter +
                                                            insetX
                                                        finalUnit = "%"
                                                    }
                                                }
                                            }
                                        } else {
                                            // For "container" reference, use the user's chosen unit directly
                                            calculatedInsetX = insetX
                                            finalUnit = insetXUnit
                                        }

                                        // Format insetX with the appropriate unit
                                        const formattedInsetX = finalUnit
                                            ? `${calculatedInsetX}${finalUnit}`
                                            : calculatedInsetX

                                        return {
                                            top:
                                                verticalAlign === "top"
                                                    ? `${insetY}px`
                                                    : verticalAlign === "bottom"
                                                      ? "auto"
                                                      : "50%",
                                            bottom:
                                                verticalAlign === "bottom"
                                                    ? `${insetY}px`
                                                    : "auto",
                                            left:
                                                arrows.distance === "space"
                                                    ? formattedInsetX
                                                    : `calc(50% - ${gap}px)`,
                                            right: "auto",
                                            transform:
                                                arrows.distance === "group" &&
                                                verticalAlign === "center"
                                                    ? "translateX(-100%) translateY(-50%)"
                                                    : arrows.distance ===
                                                        "group"
                                                      ? "translateX(-100%)"
                                                      : verticalAlign ===
                                                          "center"
                                                        ? "translateY(-50%)"
                                                        : "none",
                                        }
                                    })(),

                                    cursor: "pointer",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handlePrev()
                                }}
                            >
                                {prevArrow}
                            </div>
                        )}

                        {/* Next Button */}
                        {nextArrow && (
                            <div
                                data-button="next"
                                ref={(el) => {
                                    nextArrowElRef.current = el
                                }}
                                style={{
                                    zIndex: 9999,
                                    position: "absolute",
                                    ...(() => {
                                        const gap =
                                            arrows.distance === "group"
                                                ? (arrows.gap ?? 20)
                                                : 0
                                        const insetX = arrows.insetX ?? 20
                                        const insetXUnit =
                                            arrows.insetXUnit ?? "px"
                                        const insetXReference =
                                            arrows.insetXReference ??
                                            "container"
                                        const insetY = arrows.insetY ?? 20
                                        const verticalAlign =
                                            arrows.verticalAlign || "center"

                                        // Calculate insetX based on reference
                                        let calculatedInsetX: number | string =
                                            insetX
                                        let finalUnit: "px" | "%" | "" =
                                            insetXUnit

                                        if (
                                            insetXReference === "central-slide"
                                        ) {
                                            // Get slide width from slideWidth prop
                                            const slideWidthValue =
                                                slideWidth.value ?? 100
                                            const slideWidthUnit =
                                                slideWidth.unit ?? "percent"

                                            if (slideWidthUnit === "percent") {
                                                // For percentage-based slide width: position arrows relative to central slide edges
                                                const slideWidthPercentage =
                                                    slideWidthValue
                                                const offsetFromCenter =
                                                    (100 -
                                                        slideWidthPercentage) /
                                                    2

                                                if (insetXUnit === "px") {
                                                    // For pixel inset with percentage slide width, use calc()
                                                    calculatedInsetX = `calc(${offsetFromCenter}% + ${insetX}px)`
                                                    finalUnit = "" // No unit needed for calc()
                                                } else {
                                                    // For percentage inset with percentage slide width, add percentages
                                                    calculatedInsetX =
                                                        offsetFromCenter +
                                                        insetX
                                                    finalUnit = "%"
                                                }
                                            } else {
                                                // For pixel-based slide width: convert to percentage of container
                                                const containerWidth =
                                                    containerDimensions.current
                                                        .width
                                                if (containerWidth > 0) {
                                                    const slideWidthPixels =
                                                        slideWidth.pixelValue ??
                                                        300
                                                    const slideWidthPercentage =
                                                        (slideWidthPixels /
                                                            containerWidth) *
                                                        100
                                                    const offsetFromCenter =
                                                        (100 -
                                                            slideWidthPercentage) /
                                                        2

                                                    if (insetXUnit === "px") {
                                                        // For pixel inset with pixel slide width, use calc()
                                                        calculatedInsetX = `calc(${offsetFromCenter}% + ${insetX}px)`
                                                        finalUnit = "" // No unit needed for calc()
                                                    } else {
                                                        // For percentage inset with pixel slide width, add percentages
                                                        calculatedInsetX =
                                                            offsetFromCenter +
                                                            insetX
                                                        finalUnit = "%"
                                                    }
                                                }
                                            }
                                        } else {
                                            // For "container" reference, use the user's chosen unit directly
                                            calculatedInsetX = insetX
                                            finalUnit = insetXUnit
                                        }

                                        // Format insetX with the appropriate unit
                                        const formattedInsetX = finalUnit
                                            ? `${calculatedInsetX}${finalUnit}`
                                            : calculatedInsetX

                                        return {
                                            top:
                                                verticalAlign === "top"
                                                    ? `${insetY}px`
                                                    : verticalAlign === "bottom"
                                                      ? "auto"
                                                      : "50%",
                                            bottom:
                                                verticalAlign === "bottom"
                                                    ? `${insetY}px`
                                                    : "auto",
                                            left: "auto",
                                            right:
                                                arrows.distance === "space"
                                                    ? formattedInsetX
                                                    : `calc(50% - ${gap}px)`,
                                            transform:
                                                arrows.distance === "group" &&
                                                verticalAlign === "center"
                                                    ? "translateX(100%) translateY(-50%)"
                                                    : arrows.distance ===
                                                        "group"
                                                      ? "translateX(100%)"
                                                      : verticalAlign ===
                                                          "center"
                                                        ? "translateY(-50%)"
                                                        : "none",
                                        }
                                    })(),

                                    cursor: "pointer",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleNext()
                                }}
                            >
                                {nextArrow}
                            </div>
                        )}
                    </>
                </div>
            )}

            <div
                ref={wrapperRef}
                style={{
                    height: "100%",
                    minHeight: "0px",
                    maxHeight: "100%",
                    width: "100%",
                    maxWidth: "100%",
                    position: "relative" as const,
                    display: "flex",
                    alignItems: "center",
                    overflow: "visible",
                    overflowX: "clip",
                    cursor: (() => {
                        if (isDragging) return "grabbing"
                        if (draggable) return "grab"
                        return "default"
                    })(),
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        overflow: "visible",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        flexDirection: "row" as const,
                        flexWrap: "nowrap" as const,
                        isolation: "isolate", // Create a new stacking context to contain transforms
                        zIndex: 1, // Ensure this container stays below arrows
                        // Add small margin to accommodate scaled content without affecting GSAP calculations
                    }}
                >
                    {boxes}
                </div>
            </div>

            {/* Dots Navigation - Show when enabled */}
            {showDots && (
                <div
                    style={{
                        ...calculateDotsPosition(),
                        overflow: "visible",
                        backgroundColor: dotsUI.backdrop || "transparent",
                        borderRadius: dotsUI.backdropRadius,
                        padding: dotsUI.padding || 0,
                        pointerEvents: "auto",
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    {Array.from(
                        {
                            length: finiteMode
                                ? slideData?.actualSlideCount || 0
                                : slideData?.validContent?.length || 0,
                        },
                        (_, index) => (
                            <button
                                key={index}
                                data-dot-index={index}
                                onMouseDown={(e) => {
                                    // Prevent draggable from interfering with dot clicks
                                    e.stopPropagation()
                                }}
                                onTouchStart={(e) => {
                                    // Prevent draggable from interfering with dot touches
                                    e.stopPropagation()
                                }}
                                onClick={(e) => {
                                    // Prevent event bubbling to avoid draggable interference
                                    e.stopPropagation()
                                    e.preventDefault()

                                    if (
                                        loopRef.current &&
                                        loopRef.current.toIndex
                                    ) {
                                        // Find the closest instance of this content in infinite mode
                                        const targetSlideIndex =
                                            findClosestSlideIndex(index)
                                        loopRef.current.toIndex(
                                            targetSlideIndex,
                                            {
                                                duration: animation.duration,
                                                ease: getEasingString(
                                                    animation.easing ||
                                                        "power1.inOut"
                                                ),
                                            }
                                        )
                                    }
                                }}
                                style={{
                                    width: `${dotsUI.width || 10}px`,
                                    height: `${dotsUI.height || 10}px`,
                                    borderRadius: `${dotsUI.radius || 50}px`,
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    pointerEvents: "auto",
                                    margin: 0,
                                    position: "relative",
                                    overflow: "hidden",
                                    // Initial state - GSAP will animate from here
                                    opacity: (() => {
                                        const totalDots = finiteMode
                                            ? slideData?.actualSlideCount || 0
                                            : slideData?.validContent?.length ||
                                              0
                                        const normalized = totalDots
                                            ? finiteMode
                                                ? activeSlideIndex
                                                : ((activeSlideIndex %
                                                      totalDots) +
                                                      totalDots) %
                                                  totalDots
                                            : 0
                                        return index === normalized
                                            ? dotsUI.current || 1
                                            : dotsUI.opacity || 0.5
                                    })(),
                                    transform: (() => {
                                        const totalDots = finiteMode
                                            ? slideData?.actualSlideCount || 0
                                            : slideData?.validContent?.length ||
                                              0
                                        const normalized = totalDots
                                            ? finiteMode
                                                ? activeSlideIndex
                                                : ((activeSlideIndex %
                                                      totalDots) +
                                                      totalDots) %
                                                  totalDots
                                            : 0
                                        return index === normalized
                                            ? `scale(${dotsUI.scale || 1.2})`
                                            : "scale(1)"
                                    })(),
                                }}
                            >
                                {/* Backdrop element for blur effect */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor:
                                            dotsUI.fill || "#FFFFFF",
                                        backdropFilter: `blur(${dotsUI?.blur || 0}px)`,
                                        borderRadius: `${dotsUI.radius || 50}px`,
                                    }}
                                />
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    )
}

addPropertyControls(Carousel, {
    content: {
        type: ControlType.Array,
        title: "Content",
        maxCount: 10,
        control: {
            type: ControlType.ComponentInstance,
        },
    },
    finiteMode: {
        type: ControlType.Boolean,
        title: "Finite Mode",
        defaultValue: false,
    },
    autoplay: {
        type: ControlType.Boolean,
        title: "Autoplay",
        defaultValue: false,
    },
    interval: {
        type: ControlType.Number,
        title: "Interval",
        min: 1,
        max: 10,
        step: 0.5,
        defaultValue: 3,
        hidden: (props: any) => !props.autoplay,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["left", "right"],
        defaultValue: "right",
        displaySegmentedControl: true,
        hidden: (props: any) => !props.autoplay,
        optionIcons: ["direction-left", "direction-right"],
    },
    throwAware: {
        type: ControlType.Enum,
        title: "On Throw",
        options: ["Follow", "No follow"],
        defaultValue: "No follow",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        hidden: (props: any) => !props.autoplay,
    },

    draggable: {
        type: ControlType.Boolean,
        title: "Draggable",
        defaultValue: true,
        hidden: (props: any) => false,
    },
    fluid: {
        type: ControlType.Boolean,
        title: "Throwing",
        defaultValue: true,
        hidden: (props: any) => props.finiteMode || !props.draggable,
    },
    dragFactor: {
        type: ControlType.Number,
        title: "Drag Resistence",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        hidden: (props: any) =>
            !props.draggable || props.finiteMode || !props.fluid,
    },
    // alignment removed: always centered
    clickNavigation: {
        type: ControlType.Boolean,
        title: "Click slide to advance",
        defaultValue: true,
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 20,
    },
    slideWidth: {
        type: ControlType.Object,
        title: "Slide Width",
        controls: {
            unit: {
                type: ControlType.Enum,
                title: "Unit",
                options: ["percent", "pixels"],
                optionTitles: ["%", "px"],
                defaultValue: "percent",
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
            },
            value: {
                type: ControlType.Number,
                title: "Value",
                min: 20,
                max: 100,
                step: 1,
                defaultValue: 100,
                hidden: (props: any) => props.unit === "pixels",
                description: "Width as percentage (1-100%)",
            },
            pixelValue: {
                type: ControlType.Number,
                title: "Value",
                min: 50,
                max: 2000,
                step: 10,
                defaultValue: 300,
                hidden: (props: any) => props.unit === "percent",
                description: "Width in pixels (50-2000px)",
            },
        },
    },
    effects: {
        type: ControlType.Object,
        title: "Effects",
        controls: {
            scale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.1,
                max: 2,
                step: 0.1,
                defaultValue: 1,
                description: "Scale for all slides",
            },
            current: {
                type: ControlType.Number,
                title: "Current",
                min: 0.1,
                max: 2,
                step: 0.1,
                defaultValue: 1.1,
                description: "Scale for active slide",
            },
            shadow: {
                //@ts-ignore
                type: ControlType.BoxShadow,
                title: "Shadow",
                defaultValue: "none",
                description: "Shadow for all slides",
            },
        },
    },

    arrows: {
        type: ControlType.Object,
        title: "Arrows",
        controls: {
            show: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: true,
            },
            fadeIn: {
                type: ControlType.Boolean,
                title: "Fade In",
                defaultValue: false,
                hidden: (props: any) => !props.show,
            },
            fadeInControls: {
                type: ControlType.Object,
                title: "Animation",
                hidden: (props: any) => !props.fadeIn,
                controls: {
                    duration: {
                        type: ControlType.Number,
                        title: "Duration",
                        min: 0,
                        max: 1,
                        step: 0.01,
                        defaultValue: 0.5,
                    },
                    easing: {
                        type: ControlType.Enum,
                        title: "Easing",
                        //Same options as in the easing control
                        options: [
                            "none",
                            "power1.inOut",
                            "power1.in",
                            "power1.out",
                            "power2.inOut",
                            "power2.in",
                            "power2.out",
                            "power3.inOut",
                            "power3.in",
                            "power3.out",
                            "back.inOut",
                            "back.in",
                            "back.out",
                            "elastic.inOut",
                            "elastic.in",
                            "elastic.out",
                            "bounce.inOut",
                            "bounce.in",
                            "bounce.out",
                            "circ.inOut",
                            "circ.in",
                            "circ.out",
                            "expo.inOut",
                            "expo.in",
                            "expo.out",
                            "sine.inOut",
                            "sine.in",
                            "sine.out",
                        ],
                        optionTitles: [
                            "None",
                            "Power1 InOut",
                            "Power1 In",
                            "Power1 Out",
                            "Power2 InOut",
                            "Power2 In",
                            "Power2 Out",
                            "Power3 InOut",
                            "Power3 In",
                            "Power3 Out",
                            "Back InOut",
                            "Back In",
                            "Back Out",
                            "Elastic InOut",
                            "Elastic In",
                            "Elastic Out",
                            "Bounce InOut",
                            "Bounce In",
                            "Bounce Out",
                            "Circ InOut",
                            "Circ In",
                            "Circ Out",
                            "Expo InOut",
                            "Expo In",
                            "Expo Out",
                            "Sine InOut",
                            "Sine In",
                            "Sine Out",
                        ],
                        defaultValue: "power1.inOut",
                    },
                    delay: {
                        type: ControlType.Number,
                        title: "Delay",
                        min: 0,
                        max: 1,
                        step: 0.01,
                        defaultValue: 0.2,
                    },
                },
            },
            distance: {
                type: ControlType.Enum,
                title: "Distance",
                options: ["space", "group"],
                optionTitles: ["Space", "Group"],
                defaultValue: "space",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props: any) => !props.show,
            },
            verticalAlign: {
                type: ControlType.Enum,
                title: "Vertical",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                hidden: (props: any) => !props.show,
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 0,
                max: 100,
                step: 5,
                defaultValue: 20,
                hidden: (props: any) =>
                    props.distance !== "group" || !props.show,
            },
            insetXReference: {
                type: ControlType.Enum,
                title: "Reference",
                options: ["container", "central-slide"],
                optionTitles: ["Container", "Central Slide"],
                defaultValue: "container",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props: any) =>
                    props.distance !== "space" || !props.show,
            },
            insetXUnit: {
                type: ControlType.Enum,
                title: "X Inset Unit",
                options: ["px", "%"],
                optionTitles: ["px", "%"],
                defaultValue: "px",
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                hidden: (props: any) =>
                    props.distance !== "space" || !props.show,
            },
            insetX: {
                type: ControlType.Number,
                title: "X Inset",
                min: -500,
                max: 500,
                step: 5,
                defaultValue: 20,
                hidden: (props: any) =>
                    props.distance !== "space" || !props.show,
            },
            insetY: {
                type: ControlType.Number,
                title: "Y Inset",
                min: -100,
                max: 100,
                step: 5,
                defaultValue: 20,
                hidden: (props: any) =>
                    !props.show || props.verticalAlign === "center",
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0.7,
                description: "Finite Mode disabled arrows opacity",
                hidden: (props: any) => !props.show,
            },
        },
    },
    prevArrow: {
        // @ts-ignore - ControlType.ComponentInstance exists but may not be in types
        type: ControlType.ComponentInstance,
        title: "Prev Arrow",
        hidden: (props: any) => !props.arrows?.show,
    },
    nextArrow: {
        // @ts-ignore - ControlType.ComponentInstance exists but may not be in types
        type: ControlType.ComponentInstance,
        title: "Next Arrow",
        hidden: (props: any) => !props.arrows?.show,
    },
    dotsUI: {
        type: ControlType.Object,
        title: "Dots",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: false,
            },
            width: {
                type: ControlType.Number,
                title: "Width",
                min: 4,
                max: 50,
                step: 1,
                defaultValue: 10,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            height: {
                type: ControlType.Number,
                title: "Height",
                min: 4,
                max: 50,
                step: 1,
                defaultValue: 10,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 10,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            fill: {
                type: ControlType.Color,
                title: "Fill",
                defaultValue: "#FFFFFF",
                hidden: (props: any) => !props.enabled,
            },
            backdrop: {
                type: ControlType.Color,
                title: "Backdrop",
                defaultValue: "#000000",
                hidden: (props: any) => !props.enabled,
            },
            padding: {
                type: ControlType.Number,
                title: "Padding",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 0,
                hidden: (props: any) => !props.enabled,
            },
            backdropRadius: {
                type: ControlType.Number,
                title: "Out Radius",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 40,
                hidden: (props: any) => !props.enabled,
            },
            radius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 50,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0.5,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            current: {
                type: ControlType.Number,
                title: "Current",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            scale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.5,
                max: 2,
                step: 0.1,
                defaultValue: 1.2,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            blur: {
                type: ControlType.Number,
                title: "Blur",
                min: 0,
                max: 20,
                step: 1,
                defaultValue: 0,
                displayStepper: true,
                hidden: (props: any) => !props.enabled,
            },
            verticalAlign: {
                type: ControlType.Enum,
                title: "Vertical",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "bottom",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props: any) => !props.enabled,
            },
            horizontalAlign: {
                type: ControlType.Enum,
                title: "Horizontal",
                options: ["left", "center", "right"],
                optionTitles: ["Left", "Center", "Right"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props: any) => !props.enabled,
            },
            insetY: {
                type: ControlType.Number,
                title: "Y Inset",
                min: -100,
                max: 100,
                step: 1,
                defaultValue: 20,
                displayStepper: true,
                hidden: (props: any) =>
                    !props.enabled || props.verticalAlign === "center",
            },
        },
    },

    animation: {
        type: ControlType.Object,
        title: "Transition",
        controls: {
            duration: {
                type: ControlType.Number,
                title: "Duration",
                min: 0.1,
                max: 2,
                step: 0.1,
                defaultValue: 0.4,
                description:
                    "Duration for all animations (slide transitions, visual effects, dots)",
            },
            easing: {
                type: ControlType.Enum,
                title: "Easing",
                options: [
                    "none",
                    "power1.inOut",
                    "power1.in",
                    "power1.out",
                    "power2.inOut",
                    "power2.in",
                    "power2.out",
                    "power3.inOut",
                    "power3.in",
                    "power3.out",
                    "back.inOut",
                    "back.in",
                    "back.out",
                    "elastic.inOut",
                    "elastic.in",
                    "elastic.out",
                    "bounce.inOut",
                    "bounce.in",
                    "bounce.out",
                    "circ.inOut",
                    "circ.in",
                    "circ.out",
                    "expo.inOut",
                    "expo.in",
                    "expo.out",
                    "sine.inOut",
                    "sine.in",
                    "sine.out",
                ],
                optionTitles: [
                    "None",
                    "Power1 InOut",
                    "Power1 In",
                    "Power1 Out",
                    "Power2 InOut",
                    "Power2 In",
                    "Power2 Out",
                    "Power3 InOut",
                    "Power3 In",
                    "Power3 Out",
                    "Back InOut",
                    "Back In",
                    "Back Out",
                    "Elastic InOut",
                    "Elastic In",
                    "Elastic Out",
                    "Bounce InOut",
                    "Bounce In",
                    "Bounce Out",
                    "Circ InOut",
                    "Circ In",
                    "Circ Out",
                    "Expo InOut",
                    "Expo In",
                    "Expo Out",
                    "Sine InOut",
                    "Sine In",
                    "Sine Out",
                ],
                defaultValue: "power1.inOut",
                description:
                    "Easing function for all animations (GSAP handles everything)",
            },
            elasticAmplitude: {
                type: ControlType.Number,
                title: "Amplitude",
                min: 0.1,
                max: 3,
                step: 0.1,
                defaultValue: 1,
                hidden: (props: any) => !props.easing?.startsWith("elastic"),
                description:
                    "Amplitude parameter for elastic easing (higher = more bounce)",
            },
            elasticPeriod: {
                type: ControlType.Number,
                title: "Period",
                min: 0.1,
                max: 1,
                step: 0.1,
                defaultValue: 0.3,
                hidden: (props: any) => !props.easing?.startsWith("elastic"),
                description:
                    "Period parameter for elastic easing (lower = faster oscillation)",
            },
            backIntensity: {
                type: ControlType.Number,
                title: "Intensity",
                min: 0.1,
                max: 3,
                step: 0.1,
                defaultValue: 1.7,
                hidden: (props: any) => !props.easing?.startsWith("back"),
                description:
                    "Intensity parameter for back easing (higher = more overshoot)",
            },
        },
    },
    // Removed adaptiveHeight from UI; slides now always use container height
})

Carousel.displayName = "Adriano's Carousel"
