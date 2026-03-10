import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useRef, useEffect, useState } from "react"

import {
    gsap,
    SplitText,
    ScrollTrigger,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"

gsap.registerPlugin(SplitText, ScrollTrigger)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface BlindsTextRevealProps {
    text: string
    color: string
    blindsColor: string
    font?: React.CSSProperties
    tag?: string
    className?: string
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
    direction: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top"
    staggerOrder: "first-to-last" | "last-to-first" | "center-out" | "outer-inner"
    animationMode: "out" | "in-out"
    transitionIn?: {
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
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 312
 * @framerDisableUnlink
 */
export default function BlindsTextReveal(props: BlindsTextRevealProps) {
    const {
        text = "Here's a text reveal with blinds. Each line is covered and then revealed.",
        color = "#ffffff",
        blindsColor = "#8B5CF6",
        font = {},
        tag = "h1",
        className = "",
        style = {},
        staggerAmount = 0.1,
        transition = {
            type: "tween" as const,
            duration: 0.6,
            ease: "easeOut",
            delay: 0,
        },
        trigger = "Appear",
        reverse = false,
        scrollTriggerPosition = "center",
        direction = "left-to-right",
        staggerOrder = "first-to-last",
        animationMode = "out",
        transitionIn = {
            type: "tween" as const,
            duration: 0.5,
            ease: "easeIn",
            delay: 0,
        },
    } = props

    const textRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const gsapTimelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null)
    const hasAnimatedRef = useRef(false)
    const lineSplitRef = useRef<ReturnType<typeof SplitText.create> | null>(null)
    const blindElementsRef = useRef<HTMLElement[]>([])
    const lineElementsRef = useRef<HTMLElement[]>([])
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isFirstResizeRef = useRef(true)
    const propsRef = useRef({ direction, animationMode })
    propsRef.current = { direction, animationMode }

    const [isInView, setIsInView] = useState(false)
    const [isOutOfView, setIsOutOfView] = useState(false)

    const TAG = tag

    const getTransformOrigin = (dir: BlindsTextRevealProps["direction"]) => {
        switch (dir) {
            case "left-to-right":
                return "left center"
            case "right-to-left":
                return "right center"
            case "top-to-bottom":
                return "center top"
            case "bottom-to-top":
                return "center bottom"
            default:
                return "left center"
        }
    }

    const getBlindTransform = (progress: number, dir: BlindsTextRevealProps["direction"]) => {
        const end = 101
        switch (dir) {
            case "left-to-right":
                return `translateX(${-end * progress}%)`
            case "right-to-left":
                return `translateX(${end * progress}%)`
            case "top-to-bottom":
                return `translateY(${-end * progress}%)`
            case "bottom-to-top":
                return `translateY(${end * progress}%)`
            default:
                return `translateX(${-end * progress}%)`
        }
    }

    const getInitialTransform = (dir: BlindsTextRevealProps["direction"]) => getBlindTransform(0, dir)
    const getRevealedTransform = (dir: BlindsTextRevealProps["direction"]) => getBlindTransform(1, dir)

    const getBlindInStartTransform = (dir: BlindsTextRevealProps["direction"]) => {
        switch (dir) {
            case "left-to-right":
                return "translateX(100%)"
            case "right-to-left":
                return "translateX(-100%)"
            case "top-to-bottom":
                return "translateY(100%)"
            case "bottom-to-top":
                return "translateY(-100%)"
            default:
                return "translateX(100%)"
        }
    }

    const getBlindCoveringTransform = (dir: BlindsTextRevealProps["direction"]) => {
        switch (dir) {
            case "left-to-right":
            case "right-to-left":
                return "translateX(0)"
            case "top-to-bottom":
            case "bottom-to-top":
                return "translateY(0)"
            default:
                return "translateX(0)"
        }
    }

    const getBlindInPhaseTransform = (progress: number, dir: BlindsTextRevealProps["direction"]) => {
        if (progress <= 0) return getBlindInStartTransform(dir)
        if (progress >= 1) return getBlindCoveringTransform(dir)
        switch (dir) {
            case "left-to-right":
                return `translateX(${100 * (1 - progress)}%)`
            case "right-to-left":
                return `translateX(${-100 * (1 - progress)}%)`
            case "top-to-bottom":
                return `translateY(${100 * (1 - progress)}%)`
            case "bottom-to-top":
                return `translateY(${-100 * (1 - progress)}%)`
            default:
                return `translateX(${100 * (1 - progress)}%)`
        }
    }

    const getStaggerOrderIndex = (
        lineIndex: number,
        total: number,
        order: BlindsTextRevealProps["staggerOrder"]
    ): number => {
        if (total <= 0) return 0
        switch (order) {
            case "first-to-last":
                return lineIndex
            case "last-to-first":
                return total - 1 - lineIndex
            case "center-out": {
                const mid = Math.floor((total - 1) / 2)
                const sequence: number[] = []
                for (let d = 0; d <= Math.max(mid, total - 1 - mid); d++) {
                    if (mid - d >= 0) sequence.push(mid - d)
                    if (d > 0 && mid + d < total) sequence.push(mid + d)
                }
                const idx = sequence.indexOf(lineIndex)
                return idx >= 0 ? idx : lineIndex
            }
            case "outer-inner": {
                const sequence: number[] = []
                let left = 0,
                    right = total - 1
                while (left <= right) {
                    sequence.push(left)
                    if (left !== right) sequence.push(right)
                    left++
                    right--
                }
                const idx = sequence.indexOf(lineIndex)
                return idx >= 0 ? idx : lineIndex
            }
            default:
                return lineIndex
        }
    }

    const buildGsapEase = (
        transitionValue: BlindsTextRevealProps["transition"] | BlindsTextRevealProps["transitionIn"]
    ): string => {
        if (!transitionValue) return "power2.out"
        if (transitionValue.type === "spring") {
            return "power2.out"
        }
        const ease = transitionValue.ease
        if (!ease) return "power2.out"
        if (typeof ease === "string") {
            const easeMap: Record<string, string> = {
                linear: "none",
                easeIn: "power2.in",
                easeOut: "power2.out",
                easeInOut: "power2.inOut",
                circIn: "circ.in",
                circOut: "circ.out",
                circInOut: "circ.inOut",
                backIn: "back.in",
                backOut: "back.out",
                backInOut: "back.inOut",
                anticipate: "back.inOut",
            }
            return easeMap[ease] || ease
        }
        if (Array.isArray(ease) && ease.length === 4) {
            return `cubic-bezier(${ease.join(",")})`
        }
        return "power2.out"
    }

    const setupSplit = (shouldRevert = false) => {
        if (!textRef.current) return null

        if (shouldRevert && lineSplitRef.current) {
            lineSplitRef.current.revert()
            lineSplitRef.current = null
            blindElementsRef.current = []
            lineElementsRef.current = []
        }

        const lineSplit = SplitText.create(textRef.current, { type: "lines" })
        const lines = lineSplit.lines
        lineSplitRef.current = lineSplit

        const blinds: HTMLElement[] = []
        const lineElements: HTMLElement[] = []

        lines.forEach((line: HTMLElement) => {
            const wrapper = document.createElement("div")
            wrapper.style.display = "inline-block"
            wrapper.style.position = "relative"
            wrapper.style.overflow = "hidden"
            wrapper.style.width = "100%"
            wrapper.style.verticalAlign = "top"
            wrapper.style.lineHeight = "inherit"
            line.parentNode?.insertBefore(wrapper, line)
            wrapper.appendChild(line)

            const blind = document.createElement("div")
            blind.style.position = "absolute"
            blind.style.top = "0"
            blind.style.left = "0"
            blind.style.width = "100%"
            blind.style.height = "100%"
            blind.style.background = blindsColor
            blind.style.transformOrigin = getTransformOrigin(direction)
            wrapper.appendChild(blind)

            blinds.push(blind)
            lineElements.push(line)

            if (animationMode === "in-out") {
                line.style.opacity = "0"
            }
        })

        blindElementsRef.current = blinds
        lineElementsRef.current = lineElements
        return { lineSplit, blinds, lines: lineElements }
    }

    const setBlindsInitial = (blinds: HTMLElement[]) => {
        const t = getInitialTransform(direction)
        blinds.forEach((blind) => {
            blind.style.transform = t
        })
    }

    const setBlindsRevealed = (blinds: HTMLElement[]) => {
        const t = getRevealedTransform(direction)
        blinds.forEach((blind) => {
            blind.style.transform = t
        })
    }

    const killTimeline = () => {
        if (gsapTimelineRef.current) {
            gsapTimelineRef.current.kill()
            gsapTimelineRef.current = null
        }
    }

    const getBlindTransformProp = (dir: BlindsTextRevealProps["direction"]) => {
        return dir === "top-to-bottom" || dir === "bottom-to-top" ? "yPercent" : "xPercent"
    }

    const getBlindTransformValue = (progress: number, dir: BlindsTextRevealProps["direction"]) => {
        const end = 101
        switch (dir) {
            case "left-to-right":
                return -end * progress
            case "right-to-left":
                return end * progress
            case "top-to-bottom":
                return -end * progress
            case "bottom-to-top":
                return end * progress
            default:
                return -end * progress
        }
    }

    const getBlindInStartValue = (dir: BlindsTextRevealProps["direction"]) => {
        switch (dir) {
            case "left-to-right":
                return 100
            case "right-to-left":
                return -100
            case "top-to-bottom":
                return 100
            case "bottom-to-top":
                return -100
            default:
                return 100
        }
    }

    const animateBlinds = (blinds: HTMLElement[], forward: boolean) => {
        killTimeline()

        const duration = transition?.duration ?? 0.6
        const ease = buildGsapEase(transition)
        const baseDelay = transition?.delay ?? 0
        const prop = getBlindTransformProp(direction)

        const tl = gsap.timeline()
        gsapTimelineRef.current = tl

        blinds.forEach((blind, index) => {
            const orderIndex = getStaggerOrderIndex(index, blinds.length, staggerOrder)
            const elementDelay = baseDelay + orderIndex * staggerAmount
            const startVal = forward ? 0 : getBlindTransformValue(1, direction)
            const endVal = forward ? getBlindTransformValue(1, direction) : 0

            gsap.set(blind, { [prop]: startVal })
            tl.to(blind, { [prop]: endVal, duration, ease }, elementDelay)
        })
    }

    const animateBlindsInOut = (
        blinds: HTMLElement[],
        lines: HTMLElement[],
        forward: boolean
    ) => {
        killTimeline()

        if (!forward) {
            setBlindsInitial(blinds)
            lines.forEach((line) => {
                line.style.opacity = "0"
            })
            hasAnimatedRef.current = false
            return
        }

        const durationIn = transitionIn?.duration ?? 0.5
        const durationOut = transition?.duration ?? 0.5
        const easeIn = buildGsapEase(transitionIn)
        const easeOut = buildGsapEase(transition)
        const baseDelayIn = transitionIn?.delay ?? 0
        const baseDelayOut = transition?.delay ?? 0
        const prop = getBlindTransformProp(direction)

        const tl = gsap.timeline()
        gsapTimelineRef.current = tl

        blinds.forEach((blind, index) => {
            const orderIndex = getStaggerOrderIndex(index, blinds.length, staggerOrder)
            const elementDelayIn = baseDelayIn + orderIndex * staggerAmount
            const startIn = getBlindInStartValue(direction)
            const line = lines[index]

            gsap.set(blind, { [prop]: startIn })

            tl.to(
                blind,
                {
                    [prop]: 0,
                    duration: durationIn,
                    ease: easeIn,
                    onComplete: () => {
                        if (line) line.style.opacity = "1"
                    },
                },
                elementDelayIn
            )

            const outStartTime = elementDelayIn + durationIn + baseDelayOut
            const endVal = getBlindTransformValue(1, direction)
            tl.to(blind, { [prop]: endVal, duration: durationOut, ease: easeOut }, outStartTime)
        })
    }

    const areBlindsInInitialState = (blinds: HTMLElement[]): boolean => {
        if (blinds.length === 0) return false
        const first = blinds[0]
        const t = first.style.transform || ""
        if (animationMode === "in-out") {
            const inStart = getBlindInStartTransform(direction)
            return t.includes(inStart) || t === ""
        }
        const initial = getInitialTransform(direction)
        return t.includes("(0)") || t === "" || t === initial
    }

    const setBlindsInOutInitial = (blinds: HTMLElement[], lines: HTMLElement[]) => {
        blinds.forEach((blind) => {
            blind.style.transform = getBlindInStartTransform(direction)
        })
        lines.forEach((line) => {
            line.style.opacity = "0"
        })
    }

    // Appear trigger
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (trigger !== "Appear") return
        if (hasAnimatedRef.current) return

        hasAnimatedRef.current = true
        const result = setupSplit()
        if (!result) return

        if (animationMode === "in-out") {
            animateBlindsInOut(result.blinds, result.lines, true)
        } else {
            animateBlinds(result.blinds, true)
        }

        return () => {
            killTimeline()
            if (lineSplitRef.current) {
                lineSplitRef.current.revert()
                lineSplitRef.current = null
            }
            blindElementsRef.current = []
            lineElementsRef.current = []
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Setup for scroll mode
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (trigger !== "Scroll") return
        if (!textRef.current) return

        const result = setupSplit()
        if (!result) return

        if (animationMode === "in-out") {
            setBlindsInOutInitial(result.blinds, result.lines)
        } else {
            setBlindsInitial(result.blinds)
        }

        return () => {
            killTimeline()
            if (lineSplitRef.current) {
                lineSplitRef.current.revert()
                lineSplitRef.current = null
            }
            blindElementsRef.current = []
            lineElementsRef.current = []
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, text, blindsColor, direction, animationMode])

    // Scroll alignment: use Intersection Observer so we detect exit even when a scroll container (not window) scrolls
    useEffect(() => {
        if (trigger !== "Scroll" || RenderTarget.current() === RenderTarget.canvas) return
        const container = containerRef.current
        if (!container) return

        const getInViewFromEntry = (entry: IntersectionObserverEntry) => {
            const rect = entry.boundingClientRect
            const viewportHeight = window.innerHeight || 0
            let elementPoint: number
            if (scrollTriggerPosition === "top") {
                elementPoint = rect.top
            } else if (scrollTriggerPosition === "center") {
                elementPoint = rect.top + rect.height / 2
            } else {
                elementPoint = rect.bottom
            }
            const isAligned = elementPoint <= viewportHeight && rect.bottom >= 0
            const completelyOutOfView = rect.top > viewportHeight
            return { isAligned, completelyOutOfView }
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                if (!entry) return
                const { isAligned, completelyOutOfView } = getInViewFromEntry(entry)

                if (completelyOutOfView) {
                    // Synchronously stop and reset so we never freeze mid-animation
                    const blinds = blindElementsRef.current
                    killTimeline()
                    if (blinds.length) {
                        const { direction: dir, animationMode: mode } = propsRef.current
                        const prop = dir === "top-to-bottom" || dir === "bottom-to-top" ? "yPercent" : "xPercent"
                        if (mode === "in-out") {
                            const lines = lineElementsRef.current
                            const startVal = getBlindInStartValue(dir)
                            blinds.forEach((b) => {
                                gsap.set(b, { [prop]: startVal })
                            })
                            lines.forEach((line) => {
                                line.style.opacity = "0"
                            })
                        } else {
                            blinds.forEach((b) => {
                                gsap.set(b, { [prop]: 0 })
                            })
                        }
                    }
                    hasAnimatedRef.current = false
                    setIsInView(false)
                    setIsOutOfView(true)
                    return
                }

                setIsInView(isAligned)
                setIsOutOfView(false)
            },
            { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "0px" }
        )

        // Set initial state from current position
        const rect = container.getBoundingClientRect()
        const viewportHeight = window.innerHeight || 0
        let elementPoint: number
        if (scrollTriggerPosition === "top") {
            elementPoint = rect.top
        } else if (scrollTriggerPosition === "center") {
            elementPoint = rect.top + rect.height / 2
        } else {
            elementPoint = rect.bottom
        }
        const isAligned = elementPoint <= viewportHeight && rect.bottom >= 0
        const completelyOutOfView = rect.top > viewportHeight
        setIsInView(isAligned)
        setIsOutOfView(completelyOutOfView)

        observer.observe(container)
        return () => observer.disconnect()
    }, [trigger, scrollTriggerPosition])

    // Scroll trigger animation
    useEffect(() => {
        if (trigger !== "Scroll" || RenderTarget.current() === RenderTarget.canvas) return
        const blinds = blindElementsRef.current
        if (!blinds.length) return

        if (isOutOfView) {
            // Reset is already handled synchronously in IntersectionObserver callback
            return
        }

        if (isInView && areBlindsInInitialState(blinds)) {
            hasAnimatedRef.current = true
            if (animationMode === "in-out") {
                const lines = lineElementsRef.current
                animateBlindsInOut(blinds, lines, true)
            } else {
                animateBlinds(blinds, true)
            }
        }
    }, [isInView, isOutOfView, reverse, trigger, animationMode])

    // Resize: re-split in scroll mode, set blinds revealed
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (!containerRef.current) return

        const resizeObserver = new ResizeObserver(() => {
            if (isFirstResizeRef.current) {
                isFirstResizeRef.current = false
                return
            }
            if (!hasAnimatedRef.current) return
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)

            resizeTimeoutRef.current = setTimeout(() => {
                if (!hasAnimatedRef.current) return
                if (trigger !== "Scroll") return

                const result = setupSplit(true)
                if (result) {
                    setBlindsRevealed(result.blinds)
                    if (animationMode === "in-out") {
                        result.lines.forEach((line) => {
                            line.style.opacity = "1"
                        })
                    }
                }
            }, 50)
        })

        resizeObserver.observe(containerRef.current)
        return () => {
            resizeObserver.disconnect()
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
        }
    }, [trigger])

    return (
        <div
            ref={containerRef}
            className={`blinds-text-reveal ${className}`}
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
                        ...font,
                        fontSize: font.fontSize,
                        fontWeight: font.fontWeight ?? "700",
                        fontFamily: font.fontFamily ?? "system-ui, -apple-system, sans-serif",
                        fontStyle: font.fontStyle,
                        textDecoration: font.textDecoration,
                        letterSpacing: font.letterSpacing,
                        lineHeight: font.lineHeight,
                        textAlign: font.textAlign,
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

addPropertyControls(BlindsTextReveal, {
    text: {
        type: ControlType.String,
        title: "Text",
        displayTextArea: true,
        defaultValue:
            "Here's a text reveal with blinds. Each line is covered and then revealed. You can chose between out and in-out mode for two different effects.",
    },
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
        hidden: (props: BlindsTextRevealProps) => props.trigger !== "Scroll",
    },
    reverse: {
        type: ControlType.Boolean,
        title: "Replay",
        defaultValue: false,
        hidden: (props: BlindsTextRevealProps) => props.trigger !== "Scroll",
    },
    animationMode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["out", "in-out"],
        optionTitles: ["Out", "In–Out"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "in-out",
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["left-to-right", "right-to-left", "top-to-bottom", "bottom-to-top"],
        optionTitles: ["Left to right", "Right to left", "Up–down", "Down–up"],
        optionIcons: ["direction-left", "direction-right", "direction-up", "direction-down"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "left-to-right",
    },
    staggerOrder: {
        type: ControlType.Enum,
        title: "Order",
        options: ["first-to-last", "last-to-first", "center-out", "outer-inner"],
        optionTitles: ["First to last", "Last to first", "Center out", "Outer–inner"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "first-to-last",
    },
    staggerAmount: {
        type: ControlType.Number,
        title: "Stagger",
        unit: "s",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.06,
    },
    transitionIn: {
        type: ControlType.Transition,
        title: "In",
        defaultValue: {
            type: "tween",
            duration: 0.5,
            ease: [0.81, -0.02, 0.55, 0.51],
            delay: 0,
        },
        hidden: (props: BlindsTextRevealProps) => props.animationMode !== "in-out",
    },
    transition: {
        type: ControlType.Transition,
        title: "Out",
        defaultValue: {
            type: "tween",
            duration: 0.5,
            ease: [0.28, 0.25, 0.18, 0.98],
        },
    },
    
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#7A7A7A",
    },
    blindsColor: {
        type: ControlType.Color,
        title: "Blinds",
        defaultValue: "#8B5CF6",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 48,
            // @ts-ignore
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

BlindsTextReveal.displayName = "Text Mask Highlight"
