import React, {
    useCallback,
    useEffect,
    useState,
    ComponentPropsWithRef,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

//Stuff to bundle (ORIGINAL IMPORTS)
// import { EmblaOptionsType, EmblaCarouselType } from 'embla-carousel'
// import Autoplay from 'embla-carousel-autoplay'
// import useEmblaCarousel from 'embla-carousel-react'

import {
    useEmblaCarousel,
    Autoplay,
    WheelGestures,
} from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/clients-projects/embla-bundle1.js"

// Type definitions for Embla Carousel (since types can't be imported from CDN)
type EmblaCarouselType = ReturnType<typeof useEmblaCarousel>[1]
type EmblaOptionsType = Parameters<typeof useEmblaCarousel>[0]

// ============================================================================
// INLINE STYLES
// ============================================================================

/**
 * All styles converted from embla.css to inline styles
 * Organized by component for easy reference and customization
 */

// Helper function to create styles with dynamic transition duration
const createStyles = (transitionDuration: string) => ({
    // Main carousel container
    embla: {
        maxWidth: "100vw",
        margin: "auto",
        width: "100vw",
        position: "relative",
        height: "100%",
        overflowY: "visible",
    } as React.CSSProperties,

    // Viewport - enables overflow scrolling
    viewport: {
        overflow: "visible",
        height: "100%",
        width: "100vw",
    } as React.CSSProperties,

    // Container - holds all slides
    container: {
        display: "flex",
        touchAction: "pan-y pinch-zoom",
        marginLeft: "0px",
        height: "100%",
    } as React.CSSProperties,

    // Individual slide (flex basis is set dynamically based on slidesPerView)
    slide: {
        transform: "translate3d(0, 0, 0)",
        minWidth: 0,
        marginRight: "0px",
        overflow: "visible",
    } as React.CSSProperties,

    // Slide content (number display)
    slideNumber: {
        fontSize: "64px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "304px", // Slide height
        userSelect: "none" as const,
        boxShadow: "inset 0px 0px 2px white",
    } as React.CSSProperties,

    // Controls container (arrows + dots)
    controls: {
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        justifyContent: "space-between",
        gap: "19.2px",
        marginTop: "28.8px",
    } as React.CSSProperties,

    // Arrow buttons container
    buttons: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "9.6px",
        alignItems: "center",
    } as React.CSSProperties,

    // Arrow button base
    button: {
        WebkitTapHighlightColor: "rgba(49, 49, 49, 0.5)",
        WebkitAppearance: "none" as const,
        appearance: "none" as const,
        backgroundColor: "transparent",
        touchAction: "manipulation" as const,
        display: "inline-flex",
        textDecoration: "none",
        cursor: "pointer",
        border: 0,
        padding: 0,
        margin: 0,
        boxShadow: "inset 0 0 0 2px rgba(234, 234, 234, 1)",
        width: "57.6px",
        height: "57.6px",
        zIndex: 1,
        borderRadius: "50%",
        color: "rgb(54, 49, 61)",
        alignItems: "center",
        justifyContent: "center",
        transition: `all ${transitionDuration} ease-out`,
    } as React.CSSProperties,

    // Disabled arrow button
    buttonDisabled: {
        color: "rgb(192, 192, 192)",
    } as React.CSSProperties,

    // SVG icon inside button
    buttonSvg: {
        width: "35%",
        height: "35%",
    } as React.CSSProperties,

    // Dots container
    dots: {
        display: "flex",
        flexWrap: "wrap" as const,
        justifyContent: "flex-end",
        alignItems: "center",
    } as React.CSSProperties,

    // Individual dot button
    dot: {
        WebkitTapHighlightColor: "rgba(49, 49, 49, 0.5)",
        WebkitAppearance: "none" as const,
        appearance: "none" as const,
        backgroundColor: "transparent",
        touchAction: "manipulation" as const,
        display: "inline-flex",
        textDecoration: "none",
        cursor: "pointer",
        border: 0,
        padding: 0,
        margin: 0,
        width: "41.6px",
        height: "41.6px",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        position: "relative" as const,
        transition: `all ${transitionDuration} ease-out`,
    } as React.CSSProperties,

    // Dot inner circle (using ::after pseudo-element replacement)
    dotInner: {
        boxShadow: "inset 0 0 0 2px rgba(234, 234, 234, 1)",
        width: "22.4px",
        height: "22.4px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        transition: `all ${transitionDuration} ease-out`,
    } as React.CSSProperties,

    // Selected dot inner circle
    dotInnerSelected: {
        boxShadow: "inset 0 0 0 2px rgb(54, 49, 61)",
    } as React.CSSProperties,
})

// ============================================================================
// DOT BUTTON NAVIGATION
// ============================================================================

/**
 * Hook to manage dot button navigation state and interactions
 * Tracks the currently selected slide and provides click handlers for dots
 */

type UseDotButtonType = {
    selectedIndex: number
    scrollSnaps: number[]
    onDotButtonClick: (index: number) => void
}

export const useDotButton = (
    emblaApi: EmblaCarouselType | undefined,
    onButtonClick?: (emblaApi: EmblaCarouselType) => void
): UseDotButtonType => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

    // Handle dot button clicks - scroll to the selected index
    const onDotButtonClick = useCallback(
        (index: number) => {
            if (!emblaApi) return
            emblaApi.scrollTo(index)
            if (onButtonClick) onButtonClick(emblaApi)
        },
        [emblaApi, onButtonClick]
    )

    // Initialize scroll snap points when carousel is ready
    const onInit = useCallback((emblaApi: EmblaCarouselType) => {
        setScrollSnaps(emblaApi.scrollSnapList())
    }, [])

    // Update selected index when carousel scrolls
    const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
        setSelectedIndex(emblaApi.selectedScrollSnap())
    }, [])

    // Set up event listeners for carousel state changes
    useEffect(() => {
        if (!emblaApi) return

        onInit(emblaApi)
        onSelect(emblaApi)
        emblaApi
            .on("reInit", onInit)
            .on("reInit", onSelect)
            .on("select", onSelect)
    }, [emblaApi, onInit, onSelect])

    return {
        selectedIndex,
        scrollSnaps,
        onDotButtonClick,
    }
}

/**
 * Dot Button Component
 * Renders individual navigation dots with conditional selected styling
 */

type DotButtonPropType = ComponentPropsWithRef<"button"> & {
    isSelected?: boolean
    buttonStyle?: React.CSSProperties
    innerStyle?: React.CSSProperties
}

export const DotButton: React.FC<DotButtonPropType & { styles: any }> = (
    props
) => {
    const {
        children,
        isSelected,
        buttonStyle,
        innerStyle,
        styles,
        ...restProps
    } = props

    return (
        <button
            type="button"
            style={{ ...styles.dot, ...(buttonStyle || {}) }}
            {...restProps}
        >
            <div
                style={{
                    ...styles.dotInner,
                    ...(isSelected ? styles.dotInnerSelected : {}),
                    ...(innerStyle || {}),
                }}
            >
                {children}
            </div>
        </button>
    )
}

// A tiny component that animates a left-to-right fill using a width transition.
// The animation restarts on remount (key change).
type ProgressFillProps = {
    durationMs: number
    color: string
    borderRadiusPx: number
    initialPercent: number
    minWidth: number
    isActive: boolean
    trigger: number
}

const ProgressFill: React.FC<ProgressFillProps> = ({
    durationMs,
    color,
    borderRadiusPx,
    initialPercent,
    minWidth,
    isActive,
    trigger,
}) => {
    const fillRef = React.useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const el = fillRef.current
        if (!el) return
        
        // Fade in duration (10% of total duration)
        const fadeInDuration = Math.max(50, durationMs * 0.1)
        // Fade out duration (10% of total duration) 
        const fadeOutDuration = Math.max(50, durationMs * 0.1)
        // Main fill duration (80% of total duration)
        const fillDuration = durationMs - fadeInDuration - fadeOutDuration
        
        if (isActive) {
            // Reset instantly
            el.style.transition = "none"
            el.style.width = `${Math.max(0, Math.min(100, initialPercent))}%`
            el.style.opacity = "0"

            // Force reflow
            void el.offsetWidth

            // Start fade in
            el.style.transition = `opacity ${fadeInDuration}ms ease-out`
            el.style.opacity = "1"

            // After fade in, start width animation
            const t1 = window.setTimeout(() => {
                el.style.transition = `width ${fillDuration}ms linear`
                el.style.width = "100%"
            }, fadeInDuration)

            // Near the end, start fade out
            const t2 = window.setTimeout(() => {
                // Do not cancel the ongoing width transition; append opacity transition instead
                const currentTransition = el.style.transition || ""
                const appended = currentTransition
                    ? `${currentTransition}, opacity ${fadeOutDuration}ms ease-in`
                    : `opacity ${fadeOutDuration}ms ease-in`
                el.style.transition = appended
                el.style.opacity = "0"
            }, fadeInDuration + fillDuration)

            return () => {
                window.clearTimeout(t1)
                window.clearTimeout(t2)
            }
        } else {
            // If becoming inactive, append opacity transition and fade out on next frame
            const currentTransition = el.style.transition || ""
            const appended = currentTransition
                ? `${currentTransition}, opacity ${fadeOutDuration}ms ease-in`
                : `opacity ${fadeOutDuration}ms ease-in`
            el.style.transition = appended
            requestAnimationFrame(() => {
                el.style.opacity = "0"
            })
        }

    }, [durationMs, initialPercent, isActive, trigger])

    return (
        <div
            ref={fillRef}
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "0%",
                backgroundColor: color,
                borderRadius: `${borderRadiusPx}px`,
                pointerEvents: "none",
                minWidth: `${minWidth}px`,
                opacity: 0,
            }}
        />
    )
}

// ============================================================================
// ARROW BUTTON NAVIGATION
// ============================================================================

/**
 * Hook to manage prev/next arrow button state and interactions
 * Handles button disabled states and click handlers for navigation
 */

type UsePrevNextButtonsType = {
    prevBtnDisabled: boolean
    nextBtnDisabled: boolean
    onPrevButtonClick: () => void
    onNextButtonClick: () => void
}

export const usePrevNextButtons = (
    emblaApi: EmblaCarouselType | undefined,
    onButtonClick?: (emblaApi: EmblaCarouselType) => void
): UsePrevNextButtonsType => {
    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

    // Handle previous button click
    const onPrevButtonClick = useCallback(() => {
        if (!emblaApi) return
        emblaApi.scrollPrev()
        if (onButtonClick) onButtonClick(emblaApi)
    }, [emblaApi, onButtonClick])

    // Handle next button click
    const onNextButtonClick = useCallback(() => {
        if (!emblaApi) return
        emblaApi.scrollNext()
        if (onButtonClick) onButtonClick(emblaApi)
    }, [emblaApi, onButtonClick])

    // Update button disabled states based on scroll position
    const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
        setPrevBtnDisabled(!emblaApi.canScrollPrev())
        setNextBtnDisabled(!emblaApi.canScrollNext())
    }, [])

    // Set up event listeners for carousel state changes
    useEffect(() => {
        if (!emblaApi) return

        onSelect(emblaApi)
        emblaApi.on("reInit", onSelect).on("select", onSelect)
    }, [emblaApi, onSelect])

    return {
        prevBtnDisabled,
        nextBtnDisabled,
        onPrevButtonClick,
        onNextButtonClick,
    }
}

/**
 * Previous Arrow Button Component
 * Renders the previous navigation button with left arrow icon
 */

type PrevButtonPropType = ComponentPropsWithRef<"button">

export const PrevButton: React.FC<
    PrevButtonPropType & {
        buttonStyle?: React.CSSProperties
        strokeColor?: string
        styles: any
    }
> = (props) => {
    const {
        children,
        disabled,
        buttonStyle,
        strokeColor,
        styles,
        ...restProps
    } = props

    return (
        <button
            type="button"
            style={{
                ...styles.button,
                ...(disabled ? styles.buttonDisabled : {}),
                ...buttonStyle,
            }}
            disabled={disabled}
            {...restProps}
        >
            <svg
                style={{ ...styles.buttonSvg, color: strokeColor }}
                viewBox="0 0 532 532"
            >
                <path
                    fill="currentColor"
                    d="M355.66 11.354c13.793-13.805 36.208-13.805 50.001 0 13.785 13.804 13.785 36.238 0 50.034L201.22 266l204.442 204.61c13.785 13.805 13.785 36.239 0 50.044-13.793 13.796-36.208 13.796-50.002 0a5994246.277 5994246.277 0 0 0-229.332-229.454 35.065 35.065 0 0 1-10.326-25.126c0-9.2 3.393-18.26 10.326-25.2C172.192 194.973 332.731 34.31 355.66 11.354Z"
                />
            </svg>
            {children}
        </button>
    )
}

/**
 * Next Arrow Button Component
 * Renders the next navigation button with right arrow icon
 */

type NextButtonPropType = ComponentPropsWithRef<"button">

export const NextButton: React.FC<
    NextButtonPropType & {
        buttonStyle?: React.CSSProperties
        strokeColor?: string
        styles: any
    }
> = (props) => {
    const {
        children,
        disabled,
        buttonStyle,
        strokeColor,
        styles,
        ...restProps
    } = props

    return (
        <button
            type="button"
            style={{
                ...styles.button,
                ...(disabled ? styles.buttonDisabled : {}),
                ...buttonStyle,
            }}
            disabled={disabled}
            {...restProps}
        >
            <svg
                style={{ ...styles.buttonSvg, color: strokeColor }}
                viewBox="0 0 532 532"
            >
                <path
                    fill="currentColor"
                    d="M176.34 520.646c-13.793 13.805-36.208 13.805-50.001 0-13.785-13.804-13.785-36.238 0-50.034L330.78 266 126.34 61.391c-13.785-13.805-13.785-36.239 0-50.044 13.793-13.796 36.208-13.796 50.002 0 22.928 22.947 206.395 206.507 229.332 229.454a35.065 35.065 0 0 1 10.326 25.126c0 9.2-3.393 18.26-10.326 25.2-45.865 45.901-206.404 206.564-229.332 229.52Z"
                />
            </svg>
            {children}
        </button>
    )
}

// ============================================================================
// MAIN CAROUSEL COMPONENT
// ============================================================================

/**
 * EmblaCarousel Component
 * Main carousel component with autoplay, dot navigation, and arrow controls
 */

type PropType = {
    slides?: number[]
    slideCount: number
    slidesPerView: number
    loop: boolean
    autoplay: boolean
    autoplayDelay: number
    align: "start" | "center" | "end"
    trackpad: "enable" | "disable"
    dragFree: boolean
    draggable: boolean
    skipSnaps: boolean
    duration?: number
    dragThreshold?: number
    gap?: number
    borderRadius?: number
    backgroundColor?: string
    /** Parallax effect for images */
    parallaxEnabled?: boolean
    parallaxIntensity?: number
    /** Custom arrow components */
    prevArrow?: React.ReactNode
    nextArrow?: React.ReactNode
    /** Content mode and inputs */
    mode?: "images" | "components"
    /** When mode = components, controls how children size inside slides */
    sizing?: "fixed" | "fit-content"
    content?: ControlType.ComponentInstance[]
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
    /** Dots UI customization and positioning */
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
        borderWidth?: number
        borderColor?: string
        currentBorderWidth?: number
        currentBorderColor?: string
        verticalAlign?: "top" | "center" | "bottom"
        horizontalAlign?: "left" | "center" | "right"
        offsetX?: number
        offsetY?: number
        /** Progress-style active dot for autoplay */
        progress?: {
            enabled?: boolean
            /** how many times wider than base width when active */
            widthMultiplier?: number
            /** color of the moving fill */
            fillColor?: string
        }
    }
    /** Arrows UI customization and positioning */
    arrowsUI?: {
        enabled?: boolean
        arrowMode?: "default" | "components"
        mode?: "group" | "space-between"
        verticalAlign?: "top" | "center" | "bottom"
        horizontalAlign?: "left" | "center" | "right"
        gap?: number
        offsetX?: number
        offsetY?: number
        insetXReference?: "container" | "central-slide"
        insetXUnit?: "px" | "%"
        backgroundColor?: string
        borderColor?: string
        borderWidth?: number
        size?: number
        opacity?: number
        activeOpacity?: number
        radius?: number
        strokeColor?: string
        backdropBlur?: number
        dropShadow?: string
    }
    /** Visual effects for active/inactive slides */
    effects?: {
        enabled?: boolean
        activeOpacity?: number
        inactiveOpacity?: number
        activeScale?: number
        inactiveScale?: number
        activeBlur?: number
        inactiveBlur?: number
        /** Multiplier for how quickly effects fall off by distance */
        tweenFactor?: number
    }
}
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 500
 * @framerDisableUnlink
 */
export default function EmblaCarousel(props: PropType) {
    const {
        slides,
        slideCount = 5,
        slidesPerView = 1,
        mode = "images",
        sizing = "fit-content",
        content = [],
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
        loop = true,
        autoplay = true,
        autoplayDelay = 3000,
        
        align = "center",
        trackpad = "enable",
        dragFree = true,
        draggable = true,
        skipSnaps = false,
        duration = 25,
        dragThreshold = 10,
        gap = 32,
        borderRadius = 12,
        backgroundColor = "transparent",
        parallaxEnabled = false,
        parallaxIntensity = 50,
        prevArrow = null,
        nextArrow = null,
        dotsUI = {
            enabled: true,
            width: 10,
            height: 10,
            gap: 10,
            fill: "#FFFFFF",
            padding: 0,
            backdrop: "transparent",
            backdropRadius: 20,
            radius: 50,
            opacity: 0.5,
            current: 1,
            scale: 1.1,
            blur: 0,
            progress: {
                enabled: false,
                widthMultiplier: 5,
                fillColor: "#000000",
            },
            verticalAlign: "bottom",
            horizontalAlign: "center",
            offsetX: 0,
            offsetY: 20,
        },
        arrowsUI = {
            enabled: true,
            arrowMode: "default",
            mode: "space-between",
            verticalAlign: "center",
            horizontalAlign: "center",
            gap: 10,
            offsetX: 20,
            offsetY: 0,
            insetXReference: "container",
            insetXUnit: "px",
            backgroundColor: "transparent",
            borderColor: "rgba(234, 234, 234, 1)",
            borderWidth: 2,
            size: 58,
            opacity: 1,
            activeOpacity: 1,
            radius: 50,
            strokeColor: "rgb(54, 49, 61)",
            backdropBlur: 0,
            dropShadow: "none",
        },
        effects = {
            enabled: false,
            activeOpacity: 1,
            inactiveOpacity: 0.5,
            activeScale: 1,
            inactiveScale: 0.95,
            activeBlur: 0,
            inactiveBlur: 0,
            tweenFactor: 0.84,
        },
    } = props

    // Check if we're in canvas mode
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Helper: determine if a node should render (skip nullish/hidden)
    const isRenderableNode = useCallback((node: any): boolean => {
        if (node === null || node === undefined || node === false) return false
        if (Array.isArray(node)) return node.some(isRenderableNode)
        if (typeof node === "string") return node.trim().length > 0
        if (typeof node === "number") return true
        if (React.isValidElement(node)) {
            const style = ((node as any).props?.style ||
                {}) as React.CSSProperties
            if (style.display === "none" || style.visibility === "hidden")
                return false
            // If it's a fragment, evaluate its children
            // @ts-ignore
            if (node.type === React.Fragment) {
                return isRenderableNode((node as any).props?.children)
            }
        }
        return true
    }, [])

    // Build images list for images mode
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

    // Filter inputs based on visibility/nullish state
    const contentToRender = (content || []).filter(isRenderableNode)
    // Respect the requested slideCount in images mode: ignore images beyond count
    const requestedImageCount = Math.max(1, Math.min(10, slideCount))
    const imagesToRender = images
        .slice(0, requestedImageCount)
        .filter((img) => img && (img as any).src)

    // Determine actual slide count based on filtered inputs (fallback to props when empty)
    const actualSlideCount =
        mode === "components"
            ? contentToRender.length > 0
                ? contentToRender.length
                : Math.max(1, Math.min(5, slideCount))
            : imagesToRender.length > 0
              ? imagesToRender.length
              : requestedImageCount

    // Generate slides array indices
    const slidesArray = Array.from({ length: actualSlideCount }, (_, i) => i)

    // Calculate slide width based on slidesPerView (percentage fallback)
    const slideWidthPercentage = (100 / slidesPerView).toFixed(4) + "%"

    // Parallax image overfill percent derived from intensity (0->100%, 100->150%)
    const overfillPercent = 100 + 50 * (parallaxIntensity / 100)

    // Convert Embla duration (20-60) to CSS transition duration in milliseconds
    // Maps Embla duration to a reasonable range for UI transitions (200ms-600ms)
    const mapEmblaDurationToMs = (emblaDuration: number): number => {
        const minEmblaDuration = 20
        const maxEmblaDuration = 60
        const minMs = 300
        const maxMs = 600

        const clampedDuration = Math.min(
            Math.max(emblaDuration, minEmblaDuration),
            maxEmblaDuration
        )
        const mappedMs =
            ((clampedDuration - minEmblaDuration) /
                (maxEmblaDuration - minEmblaDuration)) *
                (maxMs - minMs) +
            minMs

        return Math.round(mappedMs)
    }

    const transitionDuration = `${mapEmblaDurationToMs(duration)}ms`
    // Slightly slower transitions for dots for a smoother feel
    const dotsTransitionDuration = `${Math.round(mapEmblaDurationToMs(duration) * 1.3)}ms`

    // Create styles with dynamic transition duration
    const styles = createStyles(transitionDuration)

    // External sizing wrapper: measure its width to size slides while inner carousel spans 100vw
    const outerRef = React.useRef<HTMLDivElement>(null)
    const [outerWidth, setOuterWidth] = useState(0)
    const [isReady, setIsReady] = useState(false)
    const [sideInset, setSideInset] = useState(0)
    useEffect(() => {
        const el = outerRef.current
        if (!el) return
        const update = () => {
            try {
                // Prefer fast measurements; fall back to rect
                const w =
                    el.clientWidth ||
                    el.offsetWidth ||
                    el.getBoundingClientRect().width ||
                    0
                setOuterWidth(w)
            } catch (_) {}
        }
        update()
        let ro: ResizeObserver | null = null
        try {
            ro = new ResizeObserver(update)
            ro.observe(el)
        } catch (_) {
            window.addEventListener("resize", update)
        }
        return () => {
            try {
                ro?.disconnect()
            } catch (_) {}
            window.removeEventListener("resize", update)
        }
    }, [])

    // Compute side inset so non-center alignments use the OUTER wrapper edges, not 100vw
    useEffect(() => {
        const updateInset = () => {
            try {
                const vw =
                    (typeof window !== "undefined" && window.innerWidth) ||
                    (typeof document !== "undefined" &&
                        document.documentElement?.clientWidth) ||
                    0
                if (vw > 0 && outerWidth > 0) {
                    const inset = Math.max(0, (vw - outerWidth) / 2)
                    setSideInset(inset)
                } else {
                    setSideInset(0)
                }
            } catch (_) {}
        }
        updateInset()
        window.addEventListener("resize", updateInset)
        return () => window.removeEventListener("resize", updateInset)
    }, [outerWidth])

    // Canvas sizing can lag; poll for a few frames until width stabilizes
    React.useLayoutEffect(() => {
        let raf = 0
        let attempts = 0
        const tick = () => {
            const el = outerRef.current
            if (el) {
                const w =
                    el.clientWidth ||
                    el.offsetWidth ||
                    el.getBoundingClientRect().width ||
                    0
                if (w && w !== outerWidth) setOuterWidth(w)
            }
            if (
                attempts++ < 15 &&
                RenderTarget.current() === RenderTarget.canvas
            ) {
                raf = requestAnimationFrame(tick)
            }
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [RenderTarget.current() === RenderTarget.canvas])

    // Slide basis computed from the outer wrapper when available; fallback to %
    const slideBasis =
        outerWidth > 0
            ? `${(outerWidth / Math.max(slidesPerView || 1, 0.0001)).toFixed(4)}px`
            : slideWidthPercentage

    // Re-initialize Embla when layout-affecting values change (e.g., gap) so snaps update and no overlap occurs.
    const queueReInit = useCallback((api?: EmblaCarouselType) => {
        if (!api) return
        const raf = requestAnimationFrame(() => {
            try {
                api.reInit()
            } catch (_) {}
        })
        return () => cancelAnimationFrame(raf)
    }, [])

    // Build options object from props
    // Disable draggable when there's only 1 slide
    const isDraggable = draggable && actualSlideCount > 1
    // In infinite mode force center alignment
    const effectiveAlign: "start" | "center" | "end" = loop ? "center" : align
    const options: EmblaOptionsType = {
        loop,
        align: effectiveAlign,
        dragFree: !dragFree, // Inverted: dragFree prop true = snapping on (Embla dragFree false)
        watchDrag: isDraggable,
        containScroll: false, // Always Auto - allows empty space at edges
        skipSnaps,
        duration,
        dragThreshold,
    }

    // Initialize Embla carousel with conditional autoplay plugin and wheel gestures
    const plugins = []
    
    // Add autoplay plugin if enabled and not in canvas
    if (autoplay && !isCanvas) {
        plugins.push(
            Autoplay({
                delay: autoplayDelay * 1000, // Convert seconds to milliseconds
                // We handle interaction semantics manually (pause on down, reset on up)
                stopOnInteraction: false,
            })
        )
    }
    
    // Add wheel gestures plugin for natural trackpad scrolling (if enabled)
    if (trackpad === "enable") {
        plugins.push(WheelGestures())
    }

    const [emblaRef, emblaApi] = useEmblaCarousel(options, plugins)

    // Trigger reInit when layout-affecting props change
    useEffect(() => {
        const cancel = queueReInit(emblaApi)
        if (emblaApi && outerWidth > 0) {
            // Mark ready after layout has a valid width and Embla reinitialized
            requestAnimationFrame(() => setIsReady(true))
        }
        return cancel
    }, [queueReInit, emblaApi, gap, slideBasis, outerWidth, slidesPerView, isDraggable, sideInset, effectiveAlign])

    // Autoplay interaction: call on actual press (pointer down) or while dragging
    const onNavButtonClick = useCallback((emblaApi: EmblaCarouselType) => {
        const autoplay = emblaApi?.plugins()?.autoplay
        if (!autoplay) return

        // Stop or reset autoplay based on configuration
        const resetOrStop =
            autoplay.options.stopOnInteraction === false
                ? autoplay.reset
                : autoplay.stop

        resetOrStop()
    }, [])

    // Handle cursor changes for draggable state
    const [isDragging, setIsDragging] = useState(false)
    const onPointerDown = useCallback(() => {
        if (isDraggable) setIsDragging(true)
        // Pause autoplay immediately on pointer down
        if (emblaApi && autoplay) {
            try {
                const ap = emblaApi.plugins()?.autoplay
                ap?.stop?.()
            } catch (_) {}
        }
    }, [isDraggable, emblaApi, autoplay])
    const onPointerUp = useCallback(() => {
        if (isDraggable) setIsDragging(false)
        if (emblaApi && autoplay) {
            try {
                const ap = emblaApi.plugins()?.autoplay
                // Resume/reset autoplay on pointer up
                ap?.reset?.()
            } catch (_) {}
        }
    }, [isDraggable, emblaApi, autoplay])

    // Dots progress: key that changes on slide change to restart animation
    const [progressKey, setProgressKey] = useState(0)
    useEffect(() => {
        if (!emblaApi) return
        const handler = () => setProgressKey((k) => k + 1)
        emblaApi.on("select", handler).on("reInit", handler)
        return () => {
            try {
                emblaApi.off("select", handler).off("reInit", handler)
            } catch (_) {}
        }
    }, [emblaApi])

    // Reset autoplay timer on controlled navigation (arrows/dots) without stopping it
    const onNavResetClick = useCallback((api: EmblaCarouselType) => {
        const autoplay = api?.plugins()?.autoplay
        if (!autoplay) return
        try {
            autoplay.reset()
        } catch (_) {}
    }, [])

    // Imperatively apply parallax transform to originals and clones
    const applyParallax = useCallback(
        (emblaApi: EmblaCarouselType) => {
            if (!parallaxEnabled || mode !== "images") return

            const root = emblaApi.rootNode() as HTMLElement
            const scrollProgress = emblaApi.scrollProgress()
            const snaps = emblaApi.scrollSnapList()
            const engine: any = emblaApi.internalEngine?.()
            const isLoop = Boolean(engine?.options?.loop)

            // Derive max shift as half of the overfill beyond 100%
            // If overfillPercent is 100..150, extra is 0..50, half is 0..20
            const overfillPercentLocal = 100 + 50 * (parallaxIntensity / 100)
            const extraOverfill = Math.max(0, overfillPercentLocal - 100)
            const maxShiftPercent = extraOverfill / 2

            snaps.forEach((snap: number, index: number) => {
                let diff = scrollProgress - snap
                // In loop mode, normalize across wrap; in finite mode don't wrap to avoid mid-transition jumps
                if (isLoop) {
                    diff = diff - Math.round(diff)
                } else {
                    // Clamp diff to a sane range in finite mode
                    if (diff > 1) diff = 1
                    else if (diff < -1) diff = -1
                }
                const shift = diff * 2 * maxShiftPercent
                const nodes = root.querySelectorAll(
                    `[data-parallax-index="${index}"]`
                )
                nodes.forEach((node) => {
                    ;(node as HTMLElement).style.transform =
                        `translateX(${shift}%)`
                })
            })
        },
        [parallaxEnabled, parallaxIntensity, mode]
    )

    // Effects: opacity/scale/blur based on distance to snaps
    const tweenFactorRef = React.useRef(0)
    const setTweenFactor = useCallback(
        (emblaApi: EmblaCarouselType) => {
            // Similar to reference: base factor times number of snaps for nice falloff
            const snaps = emblaApi.scrollSnapList()
            const base = effects.tweenFactor ?? 0.84
            tweenFactorRef.current = base * (snaps?.length || 1)
        },
        [effects.tweenFactor]
    )

    const applyEffects = useCallback(
        (emblaApi: EmblaCarouselType, eventName?: any) => {
            if (!effects?.enabled) return
            const engine: any = emblaApi.internalEngine()
            const scrollProgress = emblaApi.scrollProgress()
            const slidesInView = emblaApi.slidesInView()
            const isScrollEvent = eventName === "scroll"

            const activeOpacity = effects.activeOpacity ?? 1
            const inactiveOpacity = effects.inactiveOpacity ?? 0.5
            const activeScale = effects.activeScale ?? 1
            const inactiveScale = effects.inactiveScale ?? 0.95
            const activeBlur = effects.activeBlur ?? 0
            const inactiveBlur = effects.inactiveBlur ?? 0

            emblaApi
                .scrollSnapList()
                .forEach((scrollSnap: number, snapIndex: number) => {
                    let diffToTarget = scrollSnap - scrollProgress
                    const slidesInSnap = engine.slideRegistry[snapIndex]

                    slidesInSnap.forEach((slideIndex: number) => {
                        if (isScrollEvent && !slidesInView.includes(slideIndex))
                            return

                        if (engine.options.loop) {
                            engine.slideLooper.loopPoints.forEach(
                                (loopItem: any) => {
                                    const target = loopItem.target()
                                    if (
                                        slideIndex === loopItem.index &&
                                        target !== 0
                                    ) {
                                        const sign = Math.sign(target)
                                        if (sign === -1)
                                            diffToTarget =
                                                scrollSnap -
                                                (1 + scrollProgress)
                                        if (sign === 1)
                                            diffToTarget =
                                                scrollSnap +
                                                (1 - scrollProgress)
                                    }
                                }
                            )
                        }

                        const t =
                            1 - Math.abs(diffToTarget * tweenFactorRef.current)
                        const mix = Math.max(0, Math.min(1, t))

                        // Interpolate values
                        const opacity =
                            inactiveOpacity +
                            (activeOpacity - inactiveOpacity) * mix
                        const scale =
                            inactiveScale + (activeScale - inactiveScale) * mix
                        const blur =
                            inactiveBlur + (activeBlur - inactiveBlur) * mix

                        const slideNode = emblaApi.slideNodes()[
                            slideIndex
                        ] as HTMLElement
                        const targetEl =
                            (slideNode?.firstElementChild as HTMLElement) ||
                            slideNode
                        if (targetEl) {
                            targetEl.style.opacity = String(opacity)
                            targetEl.style.transform = `scale(${scale})`
                            targetEl.style.filter =
                                blur > 0 ? `blur(${blur}px)` : "none"
                        }
                    })
                })
        },
        [effects]
    )

    // Initialize dot button navigation
    const { selectedIndex, scrollSnaps, onDotButtonClick } = useDotButton(
        emblaApi,
        onNavResetClick
    )

    // Initialize arrow button navigation
    const {
        prevBtnDisabled,
        nextBtnDisabled,
        onPrevButtonClick,
        onNextButtonClick,
    } = usePrevNextButtons(emblaApi, onNavResetClick)

    // Add pointer event listeners for cursor changes
    useEffect(() => {
        if (!emblaApi || !isDraggable) return

        emblaApi.on("pointerDown", onPointerDown)
        emblaApi.on("pointerUp", onPointerUp)

        return () => {
            emblaApi.off("pointerDown", onPointerDown)
            emblaApi.off("pointerUp", onPointerUp)
        }
    }, [emblaApi, isDraggable, onPointerDown, onPointerUp])

    // Add parallax scroll listener
    useEffect(() => {
        if (!emblaApi) return

        const updateParallaxIfEnabled = () => {
            if (parallaxEnabled && mode === "images") applyParallax(emblaApi)
        }
        const updateEffectsIfEnabled = (evt?: any) => {
            if (effects?.enabled) applyEffects(emblaApi, evt)
        }

        // Initialize tween factor for effects
        if (effects?.enabled) setTweenFactor(emblaApi)

        emblaApi
            .on("scroll", () => {
                updateParallaxIfEnabled()
                updateEffectsIfEnabled("scroll")
            })
            .on("reInit", () => {
                setTweenFactor(emblaApi)
                updateParallaxIfEnabled()
                updateEffectsIfEnabled("reInit")
            })
            .on("slideFocus", () => updateEffectsIfEnabled("slideFocus"))

        // Initial application
        updateParallaxIfEnabled()
        updateEffectsIfEnabled("init")

        return () => {
            emblaApi.off("scroll").off("reInit").off("slideFocus")
        }
    }, [
        emblaApi,
        parallaxEnabled,
        mode,
        applyParallax,
        effects?.enabled,
        applyEffects,
        setTweenFactor,
    ])

    // Stop autoplay when the carousel goes out of view or tab is hidden; resume when visible again
    useEffect(() => {
        if (!emblaApi || !autoplay || isCanvas) return

        const plugin = (() => {
            try {
                return emblaApi.plugins()?.autoplay as
                    | { stop?: () => void; reset?: () => void }
                    | undefined
            } catch (_) {
                return undefined
            }
        })()

        if (!plugin) return

        let observer: IntersectionObserver | null = null
        let rafId = 0
        const targetEl = outerRef.current
        const inViewportRef = { current: true }

        const applyState = (inViewport: boolean, pageVisible: boolean) => {
            try {
                if (!plugin) return
                if (inViewport && pageVisible) {
                    // When re-entering viewport or tab becomes visible, ensure autoplay resumes
                    // Prefer play/start if available; fall back to reset
                    ;(plugin as unknown as { play?: () => void }).play?.()
                    ;(plugin as unknown as { start?: () => void }).start?.()
                    plugin.reset?.()
                    // Ensure plugin/timers are in a clean state and progress restarts
                    rafId = requestAnimationFrame(() => {
                        try { emblaApi.reInit() } catch (_) {}
                    })
                    // Restart progress fill animation even if slide index didn't change
                    setProgressKey((k) => k + 1)
                } else {
                    plugin.stop?.()
                }
            } catch (_) {}
        }

        const onVisibility = () => {
            applyState(inViewportRef.current, !document.hidden)
        }

        if (
            typeof window !== "undefined" &&
            typeof IntersectionObserver !== "undefined" &&
            targetEl
        ) {
            observer = new IntersectionObserver(
                (entries: IntersectionObserverEntry[]) => {
                    const entry = entries[0]
                    const inView =
                        Boolean(entry?.isIntersecting) &&
                        (entry?.intersectionRatio ?? 0) > 0.05
                    inViewportRef.current = inView
                    applyState(inView, !document.hidden)
                },
                { root: null, threshold: [0, 0.05, 0.1, 0.25, 0.5, 1] }
            )
            try {
                observer.observe(targetEl)
            } catch (_) {}
        }

        document.addEventListener("visibilitychange", onVisibility)
        // Initial sync
        applyState(true, !document.hidden)

        return () => {
            document.removeEventListener("visibilitychange", onVisibility)
            try {
                if (observer && targetEl) observer.unobserve(targetEl)
                observer?.disconnect()
            } catch (_) {}
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [emblaApi, autoplay, isCanvas, setProgressKey])

    // Calculate arrow positioning styles based on arrowsUI settings
    const getArrowsContainerStyle = (): React.CSSProperties => {
        const mode = arrowsUI.mode ?? "space-between"
        const vAlign = arrowsUI.verticalAlign ?? "center"
        const hAlign = arrowsUI.horizontalAlign ?? "center"
        const offsetX = arrowsUI.offsetX ?? 20
        const offsetY = arrowsUI.offsetY ?? 0
        const arrowsGroupGap = arrowsUI.gap ?? 10
        const insetRef = arrowsUI.insetXReference ?? "container"
        const insetUnit = arrowsUI.insetXUnit ?? "px"
        const currentSlidePx =
            outerWidth > 0
                ? outerWidth / Math.max(slidesPerView || 1, 1)
                : undefined

        const baseStyle: React.CSSProperties = {
            position: "absolute",
            display: "flex",
            pointerEvents: "none", // Let clicks pass through container
            zIndex: 10,
        }

        // Vertical positioning
        if (vAlign === "top") {
            baseStyle.top = `${offsetY}px`
        } else if (vAlign === "bottom") {
            baseStyle.bottom = `${offsetY}px`
        } else {
            baseStyle.top = "50%"
            baseStyle.transform = `translateY(calc(-50% + ${offsetY}px))`
        }

        // Horizontal positioning based on mode
        if (mode === "space-between") {            
            const offsetToken =
                insetUnit === "%" ? `${offsetX}%` : `${offsetX}px`

            if (insetRef === "central-slide" && currentSlidePx) {
                // Relative to the central slide edges based on the OUTER WRAPPER width
                baseStyle.left = `calc(50% - ${currentSlidePx / 2}px + ${offsetToken})`
                baseStyle.right = `calc(50% - ${currentSlidePx / 2}px + ${offsetToken})`
            } else {
                // Relative to container: do NOT include slide gap adjustment
                baseStyle.left = `${offsetToken}`
                baseStyle.right = `${offsetToken}`
            }
            baseStyle.justifyContent = "space-between"
        } else {
            // Group mode
            baseStyle.gap = `${arrowsGroupGap}px`
            if (hAlign === "left") {
                baseStyle.left = `${offsetX}px`
            } else if (hAlign === "right") {
                baseStyle.right = `${offsetX}px`
            } else {
                baseStyle.left = "50%"
                const translateX = mode === "group" ? "-50%" : "0"
                baseStyle.transform =
                    vAlign === "center"
                        ? `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`
                        : `translateX(calc(-50% + ${offsetX}px))`
            }
        }

        return baseStyle
    }

    // Calculate dots positioning styles based on dotsUI settings
    const getDotsContainerStyle = (): React.CSSProperties => {
        const vAlign = dotsUI.verticalAlign ?? "bottom"
        const hAlign = dotsUI.horizontalAlign ?? "center"
        const offsetX = dotsUI.offsetX ?? 0
        const offsetY = dotsUI.offsetY ?? 20

        const baseStyle: React.CSSProperties = {
            position: "absolute",
            display: "flex",
            pointerEvents: "none", // Let clicks pass through container
            zIndex: 10,
        }

        // Vertical positioning
        if (vAlign === "top") {
            baseStyle.top = `${offsetY}px`
        } else if (vAlign === "bottom") {
            baseStyle.bottom = `${offsetY}px`
        } else {
            baseStyle.top = "50%"
            baseStyle.transform = `translateY(calc(-50% + ${offsetY}px))`
        }

        // Horizontal positioning relative to outer wrapper when known
        const outerHalf =
            outerWidth > 0 ? `${(outerWidth / 2).toFixed(2)}px` : null
        if (hAlign === "left") {
            if (outerHalf) {
                baseStyle.left = `calc(50% - ${outerHalf} + ${offsetX}px)`
            } else {
                baseStyle.left = `${offsetX}px`
            }
        } else if (hAlign === "right") {
            if (outerHalf) {
                baseStyle.right = `calc(50% - ${outerHalf} + ${offsetX}px)`
            } else {
                baseStyle.right = `${offsetX}px`
            }
        } else {
            // center
            baseStyle.left = "50%"
            baseStyle.transform =
                vAlign === "center"
                    ? `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`
                    : `translateX(calc(-50% + ${offsetX}px))`
        }

        return baseStyle
    }

    return (
        <div
            ref={outerRef}
            style={{
                width: "100%",
                height: "100%",
                overflow: "visible",
                position: "relative",
                display: "flex",
                justifyContent: "center",
            }}
        >
            <section
                style={{
                    ...styles.embla,
                    backgroundColor,
                    width: "100vw",
                    maxWidth: "100vw",
                    opacity: isReady ? 1 : 0,
                    transition: isReady ? "opacity 0.001s linear" : "none",
                }}
            >
                {/* Carousel viewport and slides */}
                <div
                    style={{
                        ...styles.viewport,
                        cursor: isDraggable
                            ? isDragging
                                ? "grabbing"
                                : "grab"
                            : "default",
                        overflow: "visible",
                        pointerEvents: (mode === "images" && actualSlideCount <= 1) ? "none" : "auto",
                        paddingLeft: effectiveAlign === "start" ? sideInset : 0,
                        paddingRight: effectiveAlign === "end" ? sideInset : 0,
                    }}
                    ref={emblaRef}
                >
                    <div
                        style={{
                            ...styles.container,
                        }}
                    >
                        {slidesArray?.map((index) => (
                            <div
                                style={{
                                    ...styles.slide,

                                    marginRight: `${gap}px`,
                                    // Lock slide width purely to slidesPerView
                                    flex:
                                        mode === "images" || sizing === "fixed"
                                            ? `0 0 ${slideBasis}`
                                            : "0 0 auto",
                                    width:
                                        mode === "images" || sizing === "fixed"
                                            ? slideBasis
                                            : undefined,
                                    boxSizing: "border-box",
                                    // Only clip overflow if effects with blur are disabled
                                    overflow: "visible",
                                    minWidth:
                                        mode === "components" &&
                                        (contentToRender?.length ?? 0) === 0
                                            ? "40%"
                                            : undefined,
                                    height:
                                        mode === "images" || sizing === "fixed"
                                            ? "100%"
                                            : undefined,
                                }}
                                key={index}
                            >
                                {mode === "images" ? (
                                    imagesToRender[index] ? (
                                        parallaxEnabled ? (
                                            // Parallax wrapper
                                            <div
                                                style={{
                                                    height: "100%",
                                                    overflow: "hidden",
                                                    overflowY: "visible",
                                                    width: "100%",
                                                    borderRadius: borderRadius,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: "relative",
                                                        height: "100%",
                                                        width: "100%",
                                                        display: "flex",
                                                        justifyContent:
                                                            "center",
                                                    }}
                                                >
                                                    <img
                                                        src={
                                                            imagesToRender[
                                                                index
                                                            ].src
                                                        }
                                                        alt={`Slide ${index + 1}`}
                                                        style={{
                                                            maxWidth: "none",
                                                            // Overfill scales with intensity: 100%..150% + 2 * gap
                                                            flex: `0 0 calc(${overfillPercent}% + ${gap * 2}px)`,
                                                            objectFit: "cover",
                                                            height: "100%",
                                                            display: "block",
                                                            transform:
                                                                "translateX(0%)",
                                                            willChange:
                                                                "transform",
                                                        }}
                                                        data-parallax-index={
                                                            index
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            // Regular image without parallax
                                            <img
                                                src={imagesToRender[index].src}
                                                alt={`Slide ${index + 1}`}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    borderRadius: borderRadius,
                                                }}
                                            />
                                        )
                                    ) : (
                                        <div
                                            style={{
                                                ...styles.slideNumber,
                                                borderRadius: borderRadius,
                                                height: "100%",
                                            }}
                                        >
                                            {index + 1}
                                        </div>
                                    )
                                ) : contentToRender[index] ? (
                                    <div
                                        style={{
                                            position: "relative",
                                            width: "100%",
                                            height: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: borderRadius,
                                            overflow: "visible",
                                        }}
                                    >
                                        {(() => {
                                            const child = contentToRender[
                                                index
                                            ] as any
                                            if (sizing === "fixed") {
                                                // Child adapts to slide; fill 100%
                                                return React.cloneElement(
                                                    child,
                                                    {
                                                        style: {
                                                            width: "100%",
                                                            height: "100%",
                                                            position:
                                                                "absolute",
                                                            top: 0,
                                                            left: 0,
                                                            ...child?.props
                                                                ?.style,
                                                        },
                                                    }
                                                )
                                            }
                                            // fit-content: preserve intrinsic size
                                            return (
                                                <div
                                                    style={{
                                                        position: "relative",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    {React.cloneElement(child, {
                                                        style: {
                                                            ...child?.props
                                                                ?.style,
                                                        },
                                                    })}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            ...styles.slideNumber,
                                            height: "100%",
                                            borderRadius: borderRadius,
                                        }}
                                    >
                                        {index + 1}
                                    </div>
                                )}
                            </div>
                        )) || []}
                    </div>
                </div>

                {/* Arrows & Dots are rendered relative to the OUTER container */}
            </section>
            {isReady && arrowsUI?.enabled && actualSlideCount > 1 && (
                <div style={getArrowsContainerStyle()}>
                    <div style={{ pointerEvents: "auto" }}>
                        {arrowsUI.arrowMode === "components" && prevArrow ? (
                            <div
                                onClick={onPrevButtonClick}
                                style={{
                                    cursor: prevBtnDisabled
                                        ? "not-allowed"
                                        : "pointer",
                                    opacity: prevBtnDisabled
                                        ? (arrowsUI.opacity ?? 1)
                                        : (arrowsUI.activeOpacity ?? 1),
                                    transition: `all ${transitionDuration} ease-out`,
                                    pointerEvents: prevBtnDisabled ? "none" : "auto",
                                }}
                            >
                                {prevArrow}
                            </div>
                        ) : (
                            <PrevButton
                                onClick={onPrevButtonClick}
                                disabled={prevBtnDisabled}
                                strokeColor={
                                    arrowsUI.strokeColor ?? "rgb(54, 49, 61)"
                                }
                                styles={styles}
                                buttonStyle={{
                                    width: `${arrowsUI.size ?? 58}px`,
                                    height: `${arrowsUI.size ?? 58}px`,
                                    backgroundColor:
                                        arrowsUI.backgroundColor ??
                                        "transparent",
                                    border:
                                        arrowsUI.borderWidth &&
                                        arrowsUI.borderWidth > 0
                                            ? `${arrowsUI.borderWidth}px solid ${arrowsUI.borderColor ?? "rgba(234, 234, 234, 1)"}`
                                            : "none",
                                    boxShadow:
                                        arrowsUI.dropShadow === "none"
                                            ? "none"
                                            : (arrowsUI.dropShadow ?? "none"),
                                    backdropFilter:
                                        arrowsUI.backdropBlur &&
                                        arrowsUI.backdropBlur > 0
                                            ? `blur(${arrowsUI.backdropBlur}px)`
                                            : "none",
                                    borderRadius: `${arrowsUI.radius ?? 50}px`,
                                    opacity: prevBtnDisabled
                                        ? (arrowsUI.opacity ?? 1)
                                        : (arrowsUI.activeOpacity ?? 1),
                                    pointerEvents: prevBtnDisabled ? "none" : "auto",
                                }}
                            />
                        )}
                    </div>
                    <div style={{ pointerEvents: "auto" }}>
                        {arrowsUI.arrowMode === "components" && nextArrow ? (
                            <div
                                onClick={onNextButtonClick}
                                style={{
                                    cursor: nextBtnDisabled
                                        ? "not-allowed"
                                        : "pointer",
                                    opacity: nextBtnDisabled
                                        ? (arrowsUI.opacity ?? 1)
                                        : (arrowsUI.activeOpacity ?? 1),
                                    transition: `all ${transitionDuration} ease-out`,
                                    pointerEvents: nextBtnDisabled ? "none" : "auto",
                                }}
                            >
                                {nextArrow}
                            </div>
                        ) : (
                            <NextButton
                                onClick={onNextButtonClick}
                                disabled={nextBtnDisabled}
                                strokeColor={
                                    arrowsUI.strokeColor ?? "rgb(54, 49, 61)"
                                }
                                styles={styles}
                                buttonStyle={{
                                    width: `${arrowsUI.size ?? 58}px`,
                                    height: `${arrowsUI.size ?? 58}px`,
                                    backgroundColor:
                                        arrowsUI.backgroundColor ??
                                        "transparent",
                                    border:
                                        arrowsUI.borderWidth &&
                                        arrowsUI.borderWidth > 0
                                            ? `${arrowsUI.borderWidth}px solid ${arrowsUI.borderColor ?? "rgba(234, 234, 234, 1)"}`
                                            : "none",
                                    boxShadow:
                                        arrowsUI.dropShadow === "none"
                                            ? "none"
                                            : (arrowsUI.dropShadow ?? "none"),
                                    backdropFilter:
                                        arrowsUI.backdropBlur &&
                                        arrowsUI.backdropBlur > 0
                                            ? `blur(${arrowsUI.backdropBlur}px)`
                                            : "none",
                                    borderRadius: `${arrowsUI.radius ?? 50}px`,
                                    opacity: nextBtnDisabled
                                        ? (arrowsUI.opacity ?? 1)
                                        : (arrowsUI.activeOpacity ?? 1),
                                    pointerEvents: nextBtnDisabled ? "none" : "auto",
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            {isReady && dotsUI?.enabled && actualSlideCount > 1 && (
                <div style={getDotsContainerStyle()}>
                    <div
                        style={{
                            display: "inline-flex",
                            gap: `${dotsUI.gap ?? 10}px`,
                            backgroundColor: dotsUI.backdrop || "transparent",
                            borderRadius: dotsUI.backdropRadius ?? 20,
                            padding: dotsUI.padding ?? 0,
                            pointerEvents: "auto",
                        }}
                    >
                        {scrollSnaps?.map((_, index) => {
                            const isSel = index === selectedIndex
                            const baseSizeW = Math.max(dotsUI.width ?? 10, 2)
                            const baseSizeH = Math.max(dotsUI.height ?? 10, 2)
                            const baseRadius = dotsUI.radius ?? 50
                            const useProgress = Boolean(dotsUI?.progress?.enabled && autoplay)
                            const targetScale = isSel
                                ? (dotsUI.scale ?? 1.1)
                                : 1
                            const targetOpacity = isSel
                                ? (dotsUI.current ?? 1)
                                : (dotsUI.opacity ?? 0.5)
                            const bw = dotsUI.borderWidth ?? 0
                            const bws = dotsUI.currentBorderWidth ?? bw
                            const bc = dotsUI.borderColor ?? "transparent"
                            const bcs = dotsUI.currentBorderColor ?? bc
                            return (
                                <DotButton
                                    key={index}
                                    onClick={() => onDotButtonClick(index)}
                                    isSelected={isSel}
                                    styles={styles}
                                    buttonStyle={{
                                        width:
                                            useProgress && isSel
                                                ? `${baseSizeW * (dotsUI.progress?.widthMultiplier ?? 5)}px`
                                                : `${baseSizeW}px`,
                                        height: `${baseSizeH}px`,
                                        borderRadius: `${baseRadius}px`,
                                        transition: `width ${dotsTransitionDuration} ease-in-out, border-radius ${dotsTransitionDuration} ease-in-out, opacity ${dotsTransitionDuration} ease-in-out`,
                                    }}
                                    innerStyle={{
                                        width: "100%",
                                        height: `${baseSizeH}px`,
                                        borderRadius: `${baseRadius}px`,
                                        overflow:"hidden",
                                        backdropFilter:
                                            dotsUI.blur && dotsUI.blur > 0
                                                ? `blur(${dotsUI.blur}px)`
                                                : "none",
                                        transform: `scale(${targetScale})`,
                                        transition: `transform ${dotsTransitionDuration} ease-in-out, opacity ${dotsTransitionDuration} ease-in-out`,
                                        border: `${isSel ? bws : bw}px solid ${isSel ? bcs : bc}`,
                                        boxShadow: "none",
                                        position: useProgress && isSel ? "relative" : undefined,
                                    }}
                                >
                                    {useProgress ? (
                                        <ProgressFill
                                            key={`pf-${index}`}
                                            durationMs={Math.max(0, (autoplayDelay * 1000))}
                                            color={dotsUI.progress?.fillColor || "#000000"}
                                            borderRadiusPx={baseRadius}
                                            minWidth={dotsUI.width ?? 10}
                                            initialPercent={(baseSizeW / Math.max(baseSizeW * (dotsUI.progress?.widthMultiplier ?? 5), 1)) * 100}
                                            isActive={isSel}
                                            trigger={progressKey}
                                        />
                                    ) : null}

                                    <div style={{
                                        width:"100%", 
                                        opacity: targetOpacity, 
                                        height:"100%", 
                                        position:"absolute", 
                                        inset:0, 
                                        backgroundColor:dotsUI.fill,
                                        transition: `opacity ${dotsTransitionDuration} ease-in-out`
                                    }}/>
                                </DotButton>
                            )
                        }) || []}
                    </div>
                </div>
            )}
        </div>
    )
}

EmblaCarousel.displayName = "Embla Carousel"

addPropertyControls(EmblaCarousel, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["images", "components"],
        optionTitles: ["Images", "Components"],
        defaultValue: "images",
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
    slideCount: {
        type: ControlType.Number,
        title: "Count",
        min: 2,
        max: 10,
        step: 1,
        defaultValue: 4,
        hidden: (props) => props.mode === "components",
    },
    image1: {
        type: ControlType.ResponsiveImage,
        title: "Image 1",
        hidden: (p) => p.mode !== "images",
    },
    image2: {
        type: ControlType.ResponsiveImage,
        title: "Image 2",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 2,
    },
    image3: {
        type: ControlType.ResponsiveImage,
        title: "Image 3",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 3,
    },
    image4: {
        type: ControlType.ResponsiveImage,
        title: "Image 4",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 4,
    },
    image5: {
        type: ControlType.ResponsiveImage,
        title: "Image 5",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 5,
    },
    image6: {
        type: ControlType.ResponsiveImage,
        title: "Image 6",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 6,
    },
    image7: {
        type: ControlType.ResponsiveImage,
        title: "Image 7",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 7,
    },
    image8: {
        type: ControlType.ResponsiveImage,
        title: "Image 8",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 8,
    },
    image9: {
        type: ControlType.ResponsiveImage,
        title: "Image 9",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 9,
    },
    image10: {
        type: ControlType.ResponsiveImage,
        title: "Image 10",
        hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 10,
    },

    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    sizing: {
        type: ControlType.Enum,
        title: "Sizing",
        options: ["fixed", "fit-content"],
        optionTitles: ["Fixed", "Fit content"],
        defaultValue: "fit-content",
        hidden: (props) => props.mode !== "components",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },

    slidesPerView: {
        type: ControlType.Number,
        title: "Visible slides",
        min: 0.5,
        max: 4,
        step: 0.1,
        defaultValue: 1,
        hidden: (props) =>
            props.mode === "components" && props.sizing === "fit-content",
    },
    autoplay: {
        type: ControlType.Boolean,
        title: "Autoplay",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    autoplayDelay: {
        type: ControlType.Number,
        title: "Delay",
        min: 1,
        max: 20,
        step: 0.5,
        defaultValue: 3,
        unit: "s",
        hidden: (props) => !props.autoplay,
    },
    draggable: {
        type: ControlType.Boolean,
        title: "Draggable",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    dragFree: {
        type: ControlType.Boolean,
        title: "Snapping",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props) => !props.draggable,
    },
    skipSnaps: {
        type: ControlType.Boolean,
        title: "Throwing",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    align: {
        type: ControlType.Enum,
        title: "Align",
        options: ["start", "center", "end"],
        optionTitles: ["Left", "Center", "Right"],
        defaultValue: "center",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        hidden: (props) => props.loop === true,
    },
    trackpad: {
        type: ControlType.Enum,
        title: "Trackpad",
        options: ["enable", "disable"],
        optionTitles: ["Enable", "Disable"],
        defaultValue: "enable",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 32,
        unit: "px",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 12,
        unit: "px",
        hidden: (props) => props.mode !== "images",
    },
    duration: {
        type: ControlType.Number,
        title: "Transition",
        min: 20,
        max: 60,
        step: 1,
        defaultValue: 25,
    },
    dragThreshold: {
        type: ControlType.Number,
        title: "Drag Threshold",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 10,
        unit: "px",
        hidden: (props) => !props.draggable,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "transparent",
        optional: true,
    },
    /** Parallax effect for images */
    parallaxEnabled: {
        type: ControlType.Boolean,
        title: "Parallax",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props) => props.mode !== "images",
    },
    parallaxIntensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 50,
        unit: "%",
        hidden: (props) => !props.parallaxEnabled,
    },

    /** Effects controls */
    effects: {
        type: ControlType.Object,
        title: "Effects",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: false,
            },
            activeOpacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 1,
                hidden: (p) => !p.enabled,
            },
            inactiveOpacity: {
                type: ControlType.Number,
                title: "Inactive",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.5,
                hidden: (p) => !p.enabled,
            },
            activeScale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.5,
                max: 2,
                step: 0.01,
                defaultValue: 1,
                hidden: (p) => !p.enabled,
            },
            inactiveScale: {
                type: ControlType.Number,
                title: "Inactive",
                min: 0.5,
                max: 2,
                step: 0.01,
                defaultValue: 0.95,
                hidden: (p) => !p.enabled,
            },
            activeBlur: {
                type: ControlType.Number,
                title: "Blur",
                min: 0,
                max: 20,
                step: 1,
                defaultValue: 0,
                hidden: (p) => !p.enabled,
            },
            inactiveBlur: {
                type: ControlType.Number,
                title: "Inactive",
                min: 0,
                max: 20,
                step: 1,
                defaultValue: 0,
                hidden: (p) => !p.enabled,
            },
            tweenFactor: {
                type: ControlType.Number,
                title: "Falloff",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 1,
                hidden: (p) => !p.enabled,
            },
        },
    },
    /** Dots UI controls */
    dotsUI: {
        type: ControlType.Object,
        title: "Dots",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: true,
            },
            width: {
                type: ControlType.Number,
                title: "Width",
                min: 4,
                max: 50,
                step: 1,
                defaultValue: 10,
                hidden: (props) => !props.enabled,
            },
            height: {
                type: ControlType.Number,
                title: "Height",
                min: 4,
                max: 50,
                step: 1,
                defaultValue: 10,
                hidden: (props) => !props.enabled,
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 10,
                hidden: (props) => !props.enabled,
            },
            fill: {
                type: ControlType.Color,
                title: "Fill",
                defaultValue: "#FFFFFF",
                hidden: (props) => !props.enabled,
            },
            backdrop: {
                type: ControlType.Color,
                title: "Backdrop",
                defaultValue: "rgba(0,0,0,0.2)",
                hidden: (props) => !props.enabled,
            },
            padding: {
                type: ControlType.Number,
                title: "Padding",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 16,
                hidden: (props) => !props.enabled,
            },
            radius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 50,
                hidden: (props) => !props.enabled,
            },
            backdropRadius: {
                type: ControlType.Number,
                title: "Out Radius",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 24,
                hidden: (props) => !props.enabled,
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0.5,
                hidden: (props) => !props.enabled,
            },
            current: {
                type: ControlType.Number,
                title: "Current",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
                hidden: (props) => !props.enabled,
            },
            scale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.5,
                max: 2,
                step: 0.1,
                defaultValue: 1.1,
                hidden: (props) => !props.enabled,
            },
            blur: {
                type: ControlType.Number,
                title: "Blur",
                min: 0,
                max: 20,
                step: 1,
                defaultValue: 0,
                hidden: (props) => !props.enabled,
            },
            borderWidth: {
                type: ControlType.Number,
                title: "Border",
                min: 0,
                max: 10,
                step: 1,
                defaultValue: 0,
                hidden: (props) => !props.enabled,
            },
            borderColor: {
                type: ControlType.Color,
                title: "Border",
                defaultValue: "#000000",
                hidden: (props) => !props.enabled,
            },
            currentBorderWidth: {
                type: ControlType.Number,
                title: "Active",
                min: 0,
                max: 10,
                step: 1,
                defaultValue: 0,
                hidden: (props) => !props.enabled,
            },
            currentBorderColor: {
                type: ControlType.Color,
                title: "Active",
                defaultValue: "#000000",
                hidden: (props) => !props.enabled,
            },
            verticalAlign: {
                type: ControlType.Enum,
                title: "Vertical",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "bottom",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props) => !props.enabled,
            },
            horizontalAlign: {
                type: ControlType.Enum,
                title: "Horizontal",
                options: ["left", "center", "right"],
                optionTitles: ["Left", "Center", "Right"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                hidden: (props) => !props.enabled,
            },
            offsetX: {
                type: ControlType.Number,
                title: "X",
                min: -200,
                max: 200,
                step: 5,
                defaultValue: 0,
                hidden: (props) => !props.enabled,
            },
            offsetY: {
                type: ControlType.Number,
                title: "Y",
                min: -200,
                max: 200,
                step: 5,
                defaultValue: 20,
                hidden: (props) => !props.enabled,
            },
            progress: {
                type: ControlType.Object,
                title: "Progress",
                controls: {
                    enabled: {
                        type: ControlType.Boolean,
                        title: "Enable",
                        defaultValue: false,
                    },
                    widthMultiplier: {
                        type: ControlType.Number,
                        title: "Width x",
                        min: 1,
                        max: 10,
                        step: 0.5,
                        defaultValue: 5,
                        hidden: (p) => !p.enabled,
                    },
                    fillColor: {
                        type: ControlType.Color,
                        title: "Fill",
                        defaultValue: "#000000",
                        hidden: (p) => !p.enabled,
                    },
                },
            },
        },
    },
    /** Arrows UI controls */
    arrowsUI: {
        type: ControlType.Object,
        title: "Arrows",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: true,
            },
            arrowMode: {
                type: ControlType.Enum,
                title: "Type",
                options: ["default", "components"],
                optionTitles: ["Default", "Components"],
                defaultValue: "default",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props) => !props.enabled,
            },
            mode: {
                type: ControlType.Enum,
                title: "Mode",
                options: ["group", "space-between"],
                optionTitles: ["Group", "Space"],
                defaultValue: "space-between",
                displaySegmentedControl: true,
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
            verticalAlign: {
                type: ControlType.Enum,
                title: "Vertical",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props) =>
                    !props.enabled 
            },
            horizontalAlign: {
                type: ControlType.Enum,
                title: "Horizontal",
                options: ["left", "center", "right"],
                optionTitles: ["Left", "Center", "Right"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                hidden: (props) =>
                    props.mode === "space-between" ||
                    !props.enabled 
                   
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 0,
                max: 100,
                step: 5,
                defaultValue: 10,
                hidden: (props) =>
                    props.mode === "space-between" ||
                    !props.enabled
                    
            },
            insetXReference: {
                type: ControlType.Enum,
                title: "Reference",
                options: ["container", "central-slide"],
                optionTitles: ["Container", "Central slide"],
                defaultValue: "container",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props) =>
                    !props.enabled ||
                    props.mode !== "space-between",
            },
            insetXUnit: {
                type: ControlType.Enum,
                title: "Unit",
                options: ["px", "%"],
                optionTitles: ["px", "%"],
                defaultValue: "px",
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                hidden: (props) =>
                    !props.enabled ||
                    props.mode !== "space-between",
            },
            offsetX: {
                type: ControlType.Number,
                title: "Offset X",
                min: -200,
                max: 200,
                step: 5,
                defaultValue: 20,
                hidden: (props) =>
                    !props.enabled 
            },
            offsetY: {
                type: ControlType.Number,
                title: "Offset Y",
                min: -200,
                max: 200,
                step: 5,
                defaultValue: 0,
                hidden: (props) =>
                    !props.enabled 
            },

            borderColor: {
                type: ControlType.Color,
                title: "Border",
                defaultValue: "rgba(0, 0, 0, 0.2)",
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
            borderWidth: {
                type: ControlType.Number,
                title: "Border",
                min: 0,
                max: 10,
                step: 1,
                defaultValue: 0,
                unit: "px",
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
            size: {
                type: ControlType.Number,
                title: "Size",
                min: 30,
                max: 100,
                step: 1,
                defaultValue: 58,
                unit: "px",
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
                hidden: (props) => !props.enabled,
            },
            activeOpacity: {
                type: ControlType.Number,
                title: "Active",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
                hidden: (props) => !props.enabled,
            },
            radius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0,
                max: 50,
                step: 1,
                defaultValue: 50,
                unit: "px",
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
            backgroundColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "rgba(0,0,0,0.2)",
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
            strokeColor: {
                type: ControlType.Color,
                title: "Stroke",
                defaultValue: "rgba(255,255,255,1)",
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },

            backdropBlur: {
                type: ControlType.Number,
                title: "Blur",
                min: 0,
                max: 20,
                step: 1,
                defaultValue: 0,
                unit: "px",
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
            dropShadow: {
                // @ts-ignore - ControlType.BoxShadow exists but may not be in types
                type: ControlType.BoxShadow,
                title: "Shadow",
                defaultValue: "none",
                optional: true,
                hidden: (props) =>
                    !props.enabled || props.arrowMode === "components",
            },
        },
    },
    prevArrow: {
        type: ControlType.ComponentInstance,
        title: "Prev Arrow",
        hidden: (props) => props.arrowsUI?.arrowMode !== "components",
    },
    nextArrow: {
        type: ControlType.ComponentInstance,
        title: "Next Arrow",
        hidden: (props) => props.arrowsUI?.arrowMode !== "components",
    },
    // Removed autoplayStopOnInteraction; autoplay always pauses on pointer down and resets on release
})

EmblaCarousel.displayName = "Adriano's Carousel"
