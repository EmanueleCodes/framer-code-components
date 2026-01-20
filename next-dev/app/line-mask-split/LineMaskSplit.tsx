import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useRef, useEffect, useState } from "react"
import { animate } from "framer-motion"

import {
    gsap,
    useGSAP,
    SplitText,
    ScrollTrigger,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"

// Register plugins
gsap.registerPlugin(SplitText, useGSAP, ScrollTrigger)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface LineMaskSplitProps {
    text: string
    color: string
    font?: React.CSSProperties
    tag?: string
    className?: string
    maskLines: boolean
    style?: React.CSSProperties
    staggerAmount: number
    transition?: {
        type?: "tween" | "spring" | "keyframes" | "inertia"
        duration?: number
        ease?: string | number[]
        delay?: number
        stiffness?: number
        damping?: number
        mass?: number
        bounce?: number
        restDelta?: number
        restSpeed?: number
    }
    trigger: "Appear" | "Scroll"
    reverse: boolean
    scrollTriggerPosition: "bottom" | "center" | "top"
    splitMode: "words" | "chars" | "lines"
    animation?: {
        translateXInitial?: number
        translateYInitial?: number
        opacityInitial?: number
        rotateInitial?: number
        scaleInitial?: number
        blurInitial?: number
    }
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 249.5
 * @framerDisableUnlink
 */
export default function LineMaskSplit(props: LineMaskSplitProps) {
    const {
        text = "Welcome to the amazing world of random word appearances",
        color = "#ffffff",
        font = {},
        tag = "h1",
        className = "",
        style = {},
        staggerAmount = 0.2,
        transition = {
            type: "tween" as const,
            duration: 0.8,
            ease: "easeOut",
            delay: 0,
        },
        trigger = "Appear",
        reverse = false,
        scrollTriggerPosition = "center",
        splitMode = "words",
        maskLines = true,
        animation = {},
    } = props

    const {
        translateXInitial = 0,
        translateYInitial = 50,
        opacityInitial = 1,
        rotateInitial = 0,
        scaleInitial = 1,
        blurInitial = 0,
    } = animation

    const textRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationControlsRef = useRef<Array<ReturnType<typeof animate>>>([])
    const hasAnimatedRef = useRef(false)
    const currentLineSplitRef = useRef<ReturnType<typeof SplitText.create> | null>(null)
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isFirstResizeRef = useRef(true)
    const scrollElementsRef = useRef<HTMLElement[] | null>(null)

    // State for scroll trigger tracking
    const [isInView, setIsInView] = useState(false)
    const [isOutOfView, setIsOutOfView] = useState(false)

    const TAG = tag

    // Build transition config for Framer Motion
    const buildTransitionConfig = (transitionValue: typeof transition) => {
        const config: any = {}

        if (transitionValue?.type === "spring") {
            config.type = "spring"
            if (transitionValue.stiffness !== undefined) config.stiffness = transitionValue.stiffness
            if (transitionValue.damping !== undefined) config.damping = transitionValue.damping
            if (transitionValue.mass !== undefined) config.mass = transitionValue.mass
            if (transitionValue.bounce !== undefined) config.bounce = transitionValue.bounce
            if (transitionValue.restDelta !== undefined) config.restDelta = transitionValue.restDelta
            if (transitionValue.restSpeed !== undefined) config.restSpeed = transitionValue.restSpeed
        } else {
            // Default to tween if no type specified
            config.type = transitionValue?.type || "tween"
            if (transitionValue?.duration !== undefined) config.duration = transitionValue.duration
            if (transitionValue?.ease) config.ease = transitionValue.ease
        }

        return config
    }

    // Split text and set up elements
    const setupSplit = (shouldRevert = false) => {
        if (!textRef.current) return null

        // Revert previous split if exists and should revert
        if (shouldRevert && currentLineSplitRef.current) {
            currentLineSplitRef.current.revert()
            currentLineSplitRef.current = null
        }

        // Split by lines first
        const lineSplit = SplitText.create(textRef.current, { type: "lines" })
        const lines = lineSplit.lines
        currentLineSplitRef.current = lineSplit

        // Wrap each line in overflow hidden div
        lines.forEach((line: HTMLElement) => {
            const wrapper = document.createElement("div")
            wrapper.style.overflow = maskLines ? "hidden" : "visible"
            wrapper.style.display = "block"
            line.parentNode?.insertBefore(wrapper, line)
            wrapper.appendChild(line)
        })

        // Get elements based on split mode
        let elements: HTMLElement[] = []

        if (splitMode === "chars") {
            lines.forEach((line: HTMLElement) => {
                const charSplit = SplitText.create(line, { type: "chars", charsClass: "char" })
                elements.push(...charSplit.chars)
            })
        } else if (splitMode === "words") {
            lines.forEach((line: HTMLElement) => {
                const wordSplit = SplitText.create(line, { type: "words", wordsClass: "word" })
                elements.push(...wordSplit.words)
            })
        } else {
            elements = lines
        }

        return { lineSplit, elements }
    }

    // Animate elements
    const animateElements = (elements: HTMLElement[], forward = true) => {
        // Stop any existing animations
        animationControlsRef.current.forEach(control => control.stop())
        animationControlsRef.current = []

        const transitionConfig = buildTransitionConfig(transition)
        const baseDelay = transition.delay || 0

        elements.forEach((element, index) => {
            const elementDelay = baseDelay + index * staggerAmount

            if (forward) {
                // Set initial state
                element.style.opacity = opacityInitial.toString()
                element.style.transform = `translate(${translateXInitial}px, ${translateYInitial}px) rotate(${rotateInitial}deg) scale(${scaleInitial})`
                element.style.filter = `blur(${blurInitial}px)`

                const control = animate(0, 1, {
                    ...transitionConfig,
                    delay: elementDelay,
                    onUpdate: (progress) => {
                        const x = translateXInitial * (1 - progress)
                        const y = translateYInitial * (1 - progress)
                        const rotation = rotateInitial * (1 - progress)
                        const scale = scaleInitial + (1 - scaleInitial) * progress
                        const opacity = opacityInitial + (1 - opacityInitial) * progress
                        const blur = blurInitial * (1 - progress)
                        element.style.opacity = opacity.toString()
                        element.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`
                        element.style.filter = `blur(${blur}px)`
                    },
                })
                animationControlsRef.current.push(control)
            } else {
                // Reverse animation
                const control = animate(1, 0, {
                    ...transitionConfig,
                    delay: elementDelay,
                    onUpdate: (progress) => {
                        const x = translateXInitial * (1 - progress)
                        const y = translateYInitial * (1 - progress)
                        const rotation = rotateInitial * (1 - progress)
                        const scale = scaleInitial + (1 - scaleInitial) * progress
                        const opacity = opacityInitial + (1 - opacityInitial) * progress
                        const blur = blurInitial * (1 - progress)
                        element.style.opacity = opacity.toString()
                        element.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`
                        element.style.filter = `blur(${blur}px)`
                    },
                })
                animationControlsRef.current.push(control)
            }
        })
    }

    // Appear trigger animation
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (trigger !== "Appear") return
        if (hasAnimatedRef.current) return

        hasAnimatedRef.current = true

        const result = setupSplit()
        if (!result) return

        animateElements(result.elements, true)

        return () => {
            animationControlsRef.current.forEach(control => control.stop())
            result.lineSplit.revert()
            currentLineSplitRef.current = null
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Setup split for scroll mode
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (trigger !== "Scroll") return
        if (!textRef.current) return

        const result = setupSplit()
        if (!result) return

        const { elements } = result
        scrollElementsRef.current = elements

        // Set initial state
        elements.forEach((el) => {
            el.style.opacity = opacityInitial.toString()
            el.style.transform = `translate(${translateXInitial}px, ${translateYInitial}px) rotate(${rotateInitial}deg) scale(${scaleInitial})`
            el.style.filter = `blur(${blurInitial}px)`
        })

        return () => {
            animationControlsRef.current.forEach(control => control.stop())
            if (currentLineSplitRef.current) {
                currentLineSplitRef.current.revert()
                currentLineSplitRef.current = null
            }
            scrollElementsRef.current = null
        }
    }, [trigger, text, splitMode, maskLines, translateXInitial, translateYInitial, opacityInitial, rotateInitial, scaleInitial, blurInitial])

    // Update scroll alignment state for scroll trigger
    useEffect(() => {
        if (trigger !== "Scroll" || RenderTarget.current() === RenderTarget.canvas) return

        let rafId: number | null = null

        const checkAlignment = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight || 0
            const viewportBottom = viewportHeight

            // Calculate which part of the element to check based on scrollTriggerPosition
            let elementPoint: number
            if (scrollTriggerPosition === "top") {
                // Top of element touches bottom of viewport
                elementPoint = rect.top
            } else if (scrollTriggerPosition === "center") {
                // Center of element touches bottom of viewport
                elementPoint = rect.top + rect.height / 2
            } else {
                // Bottom of element touches bottom of viewport
                elementPoint = rect.bottom
            }

            // Element is in view when the specified point has crossed the bottom of viewport
            const isAligned = elementPoint <= viewportBottom && rect.bottom >= 0
            setIsInView(isAligned)
            
            // Check if element is completely out of view below the viewport
            const completelyOutOfView = rect.top > viewportHeight
            setIsOutOfView(completelyOutOfView)
        }

        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(checkAlignment)
        }

        const handleResize = () => checkAlignment()

        checkAlignment()
        window.addEventListener("scroll", handleScroll, { passive: true })
        window.addEventListener("resize", handleResize)

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", handleResize)
        }
    }, [trigger, scrollTriggerPosition])

    // Helper to check if elements are in initial state (need animation)
    const areElementsInInitialState = (elements: HTMLElement[]): boolean => {
        if (elements.length === 0) return false
        
        // Check first element as representative
        const firstEl = elements[0]
        const currentOpacity = parseFloat(firstEl.style.opacity) || 1
        const currentTransform = firstEl.style.transform || ""
        const currentFilter = firstEl.style.filter || ""
        
        // Check if opacity matches initial
        const opacityMatches = Math.abs(currentOpacity - opacityInitial) < 0.01
        
        // Check if transform matches initial (has the initial offsets)
        const hasInitialOffset = currentTransform.includes(`${translateXInitial}px`) || 
                                 currentTransform.includes(`${translateYInitial}px`) ||
                                 (rotateInitial !== 0 && currentTransform.includes(`${rotateInitial}deg`))
        
        // Check if blur matches initial
        const blurMatches = blurInitial === 0 ? 
            (!currentFilter || currentFilter.includes("blur(0px)")) :
            currentFilter.includes(`blur(${blurInitial}px)`)
        
        return opacityMatches && hasInitialOffset && blurMatches
    }

    // Handle scroll trigger animations
    useEffect(() => {
        if (trigger !== "Scroll" || RenderTarget.current() === RenderTarget.canvas) return
        if (!scrollElementsRef.current) return

        const elements = scrollElementsRef.current

        // Kill any existing animations first
        animationControlsRef.current.forEach(control => control.stop())
        animationControlsRef.current = []

        // When completely out of view below viewport with reverse enabled, reset to initial state
        if (isOutOfView) {
            if (reverse) {
                elements.forEach((el) => {
                    el.style.opacity = opacityInitial.toString()
                    el.style.transform = `translate(${translateXInitial}px, ${translateYInitial}px) rotate(${rotateInitial}deg) scale(${scaleInitial})`
                    el.style.filter = `blur(${blurInitial}px)`
                })
                hasAnimatedRef.current = false
            }
            return
        }

        // When in view, animate forward if elements are in initial state
        // This allows re-animation after scrolling out and back in (with reverse enabled)
        // or after resize (which keeps elements in final state, so won't re-animate)
        if (isInView && areElementsInInitialState(elements)) {
            hasAnimatedRef.current = true
            animateElements(elements, true)
        }
    }, [isInView, isOutOfView, reverse, trigger, translateXInitial, translateYInitial, opacityInitial, rotateInitial, scaleInitial, blurInitial])

    // Resize handler - re-split without animating
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (!containerRef.current) return

        const resizeObserver = new ResizeObserver(() => {
            // Skip the first resize event (fires immediately on observe)
            if (isFirstResizeRef.current) {
                isFirstResizeRef.current = false
                return
            }

            // Only re-split if animation has already happened
            if (!hasAnimatedRef.current) return

            // Clear existing timeout
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }

            // Debounce resize to 50ms
            resizeTimeoutRef.current = setTimeout(() => {
                // Only proceed if still animated (check again after timeout)
                if (!hasAnimatedRef.current) return
                
                // Only re-split on resize if we're in scroll mode
                if (trigger !== "Scroll") return
                
                const result = setupSplit(true) // Pass true to revert previous split
                if (result) {
                    // Update scroll elements ref with new elements
                    scrollElementsRef.current = result.elements
                    
                    // Set elements to final state without animating
                    result.elements.forEach((el) => {
                        el.style.opacity = "1"
                        el.style.transform = "translate(0px, 0px) rotate(0deg) scale(1)"
                        el.style.filter = "blur(0px)"
                    })
                }
            }, 50)
        })

        resizeObserver.observe(containerRef.current)

        return () => {
            resizeObserver.disconnect()
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
        }
    }, [trigger])

    return (
        <div
            ref={containerRef}
            className={`line-mask-split ${className}`}
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "auto",
                backgroundColor: "transparent",
                ...style,
            }}
        >
            {React.createElement(
                TAG,
                {
                    ref: textRef,
                    style: {
                        margin: 0,
                        color,
                        fontSize: font.fontSize,
                        fontWeight: font.fontWeight || "700",
                        fontFamily: font.fontFamily || "system-ui, -apple-system, sans-serif",
                        fontStyle: font.fontStyle,
                        textDecoration: font.textDecoration,
                        letterSpacing: font.letterSpacing,
                        lineHeight: font.lineHeight,
                        marginBlock: 0,
                        marginInline: 0,
                        padding: 0,
                        width: "100%",
                    },
                },
                text
            )}
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(LineMaskSplit, {

    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["Appear", "Scroll"],
        optionTitles: ["Appear", "Layer in View"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "Appear",
    },
    scrollTriggerPosition: {
        type: ControlType.Enum,
        title: "Start",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "center",
        hidden: (props: any) => props.trigger !== "Scroll",
    },
    reverse: {
        type: ControlType.Boolean,
        title: "Replay",
        defaultValue: false,
        hidden: (props: any) => props.trigger !== "Scroll",
    },
    splitMode: {
        type: ControlType.Enum,
        title: "Per",
        options: ["words", "chars", "lines"],
        optionTitles: ["Words", "Characters", "Lines"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "lines",
    },
    maskLines: {
        type: ControlType.Boolean,
        title: "Mask Lines",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    staggerAmount: {
        type: ControlType.Number,
        title: "Stagger",
        unit: "s",
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 0.05,
    },
    animation: {
        type: ControlType.Object,
        title: "Animation",
        icon: "effect",
        buttonTitle: "Effect",
        controls: {
            opacityInitial: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
            },
            scaleInitial: {
                type: ControlType.Number,
                title: "Scale",
                unit: "x",
                min: 0,
                max: 4,
                step: 0.1,
                defaultValue: 1,
            },
            blurInitial: {
                type: ControlType.Number,
                title: "Blur",
                unit: "px",
                min: 0,
                max: 100,
                step: 1,
                defaultValue: 0,
            },
            rotateInitial: {
                type: ControlType.Number,
                title: "Rotate",
                unit: "°",
                min: -360,
                max: 360,
                step: 1,
                defaultValue: 0,
            },
            translateXInitial: {
                type: ControlType.Number,
                title: "Offset X",
                unit: "px",
                min: -500,
                max: 500,
                step: 1,
                defaultValue: 0,
            },
            translateYInitial: {
                type: ControlType.Number,
                title: "Offset Y",
                unit: "px",
                min: -500,
                max: 500,
                step: 1,
                defaultValue: 100,
            },
        },
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "tween",
            duration: 0.4,
            ease: "easeOut",
        },
    },
    text: {
        type: ControlType.String,
        title: "Text",
        displayTextArea: true,
        defaultValue: "Welcome to the amazing world of random word appearances. Tweak the component to see an amazing line by line mask split effect.",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#757575",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 48,
            //@ts-ignore
            fontWeight: "600",
            lineHeight: "130%",
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"],
        defaultValue: "h1",
        description: "More components at [Framer University](https://frameruni.link/cc).",

    },
    
    
    
})

LineMaskSplit.displayName = "Text Mask Animation"
