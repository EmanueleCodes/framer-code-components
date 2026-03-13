import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useRef, useEffect, useState } from "react"
import { animate } from "framer-motion"

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
    direction:
        | "left-to-right"
        | "right-to-left"
        | "top-to-bottom"
        | "bottom-to-top"
    lineOrder:
        | "first-to-last"
        | "last-to-first"
        | "center-out"
        | "out-to-center"
    alternate: boolean
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
        lineOrder = "first-to-last",
        alternate = false,
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
    const animationControlsRef = useRef<Array<ReturnType<typeof animate>>>([])
    const hasAnimatedRef = useRef(false)
    const lineSplitRef = useRef<ReturnType<typeof SplitText.create> | null>(
        null
    )
    const blindElementsRef = useRef<HTMLElement[]>([])
    const lineElementsRef = useRef<HTMLElement[]>([])
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isFirstResizeRef = useRef(true)

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

    const getBlindTransform = (
        progress: number,
        dir: BlindsTextRevealProps["direction"]
    ) => {
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

    const getInitialTransform = (dir: BlindsTextRevealProps["direction"]) =>
        getBlindTransform(0, dir)
    const getRevealedTransform = (dir: BlindsTextRevealProps["direction"]) =>
        getBlindTransform(1, dir)

    const getBlindInStartTransform = (
        dir: BlindsTextRevealProps["direction"]
    ) => {
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

    const getBlindCoveringTransform = (
        dir: BlindsTextRevealProps["direction"]
    ) => {
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

    const getBlindInPhaseTransform = (
        progress: number,
        dir: BlindsTextRevealProps["direction"]
    ) => {
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

    const getOppositeDirection = (
        dir: BlindsTextRevealProps["direction"]
    ): BlindsTextRevealProps["direction"] => {
        switch (dir) {
            case "left-to-right":
                return "right-to-left"
            case "right-to-left":
                return "left-to-right"
            case "top-to-bottom":
                return "bottom-to-top"
            case "bottom-to-top":
                return "top-to-bottom"
            default:
                return dir
        }
    }

    const getDirectionForIndex = (
        index: number
    ): BlindsTextRevealProps["direction"] => {
        if (!alternate) return direction
        return index % 2 === 0 ? direction : getOppositeDirection(direction)
    }

    const getStaggerDelayForIndex = (index: number, total: number): number => {
        switch (lineOrder) {
            case "first-to-last":
                return index * staggerAmount
            case "last-to-first":
                return (total - 1 - index) * staggerAmount
            case "center-out": {
                const center = (total - 1) / 2
                const distanceFromCenter = Math.abs(index - center)
                return distanceFromCenter * staggerAmount
            }
            case "out-to-center": {
                const center = (total - 1) / 2
                const maxDistance = center
                const distanceFromCenter = Math.abs(index - center)
                return (maxDistance - distanceFromCenter) * staggerAmount
            }
            default:
                return index * staggerAmount
        }
    }

    const buildTransitionConfig = (
        transitionValue:
            | BlindsTextRevealProps["transition"]
            | BlindsTextRevealProps["transitionIn"]
    ) => {
        const config: Record<string, unknown> = {}
        if (transitionValue?.type === "spring") {
            config.type = "spring"
            if (transitionValue.stiffness !== undefined)
                config.stiffness = transitionValue.stiffness
            if (transitionValue.damping !== undefined)
                config.damping = transitionValue.damping
            if (transitionValue.mass !== undefined)
                config.mass = transitionValue.mass
            if (transitionValue.bounce !== undefined)
                config.bounce = transitionValue.bounce
            if (transitionValue.restDelta !== undefined)
                config.restDelta = transitionValue.restDelta
            if (transitionValue.restSpeed !== undefined)
                config.restSpeed = transitionValue.restSpeed
        } else {
            config.type = transitionValue?.type || "tween"
            if (transitionValue?.duration !== undefined)
                config.duration = transitionValue.duration
            if (transitionValue?.ease) config.ease = transitionValue.ease
        }
        return config
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
            wrapper.style.verticalAlign = "top"
            wrapper.style.position = "relative"
            wrapper.style.overflow = "hidden"
            wrapper.style.width = "fit-content"
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
        blinds.forEach((blind, index) => {
            const dir = getDirectionForIndex(index)
            blind.style.transform = getInitialTransform(dir)
        })
    }

    const setBlindsRevealed = (blinds: HTMLElement[]) => {
        blinds.forEach((blind, index) => {
            const dir = getDirectionForIndex(index)
            blind.style.transform = getRevealedTransform(dir)
        })
    }

    const animateBlinds = (blinds: HTMLElement[], forward: boolean) => {
        animationControlsRef.current.forEach((control) => control.stop())
        animationControlsRef.current = []

        const transitionConfig = buildTransitionConfig(transition)
        const baseDelay = transition?.delay ?? 0
        const total = blinds.length

        blinds.forEach((blind, index) => {
            const elementDelay =
                baseDelay + getStaggerDelayForIndex(index, total)
            const dir = getDirectionForIndex(index)

            if (forward) {
                blind.style.transform = getInitialTransform(dir)
                const control = animate(0, 1, {
                    ...transitionConfig,
                    delay: elementDelay,
                    onUpdate: (progress) => {
                        blind.style.transform = getBlindTransform(progress, dir)
                    },
                })
                animationControlsRef.current.push(control)
            } else {
                const control = animate(1, 0, {
                    ...transitionConfig,
                    delay: elementDelay,
                    onUpdate: (progress) => {
                        blind.style.transform = getBlindTransform(progress, dir)
                    },
                })
                animationControlsRef.current.push(control)
            }
        })
    }

    const animateBlindsInOut = (
        blinds: HTMLElement[],
        lines: HTMLElement[],
        forward: boolean
    ) => {
        animationControlsRef.current.forEach((control) => control.stop())
        animationControlsRef.current = []

        const transitionInConfig = buildTransitionConfig(
            transitionIn ?? { type: "tween", duration: 0.5, ease: "easeIn" }
        )
        const transitionOutConfig = buildTransitionConfig(transition)
        const baseDelayIn = transitionIn?.delay ?? 0
        const baseDelayOut = transition?.delay ?? 0
        const total = blinds.length

        if (!forward) {
            blinds.forEach((blind, index) => {
                const dir = getDirectionForIndex(index)
                blind.style.transform = getBlindInStartTransform(dir)
            })
            lines.forEach((line) => {
                line.style.opacity = "0"
            })
            hasAnimatedRef.current = false
            return
        }

        blinds.forEach((blind, index) => {
            const dir = getDirectionForIndex(index)
            blind.style.transform = getBlindInStartTransform(dir)
            const elementDelayIn =
                baseDelayIn + getStaggerDelayForIndex(index, total)

            const controlIn = animate(0, 1, {
                ...transitionInConfig,
                delay: elementDelayIn,
                onUpdate: (progress) => {
                    blind.style.transform = getBlindInPhaseTransform(
                        progress,
                        dir
                    )
                },
                onComplete: () => {
                    lines[index].style.opacity = "1"
                    blind.style.transform = getBlindCoveringTransform(dir)
                    const elementDelayOut =
                        baseDelayOut + getStaggerDelayForIndex(index, total)
                    const controlOut = animate(0, 1, {
                        ...transitionOutConfig,
                        delay: elementDelayOut,
                        onUpdate: (progress) => {
                            blind.style.transform = getBlindTransform(
                                progress,
                                dir
                            )
                        },
                    })
                    animationControlsRef.current.push(controlOut)
                },
            })
            animationControlsRef.current.push(controlIn)
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

    const setBlindsInOutInitial = (
        blinds: HTMLElement[],
        lines: HTMLElement[]
    ) => {
        blinds.forEach((blind, index) => {
            const dir = getDirectionForIndex(index)
            blind.style.transform = getBlindInStartTransform(dir)
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
            animationControlsRef.current.forEach((control) => control.stop())
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
            animationControlsRef.current.forEach((control) => control.stop())
            if (lineSplitRef.current) {
                lineSplitRef.current.revert()
                lineSplitRef.current = null
            }
            blindElementsRef.current = []
            lineElementsRef.current = []
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, text, blindsColor, direction, animationMode])

    // Scroll alignment
    useEffect(() => {
        if (
            trigger !== "Scroll" ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return

        let rafId: number | null = null
        const checkAlignment = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
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
            setIsInView(isAligned)
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

    // Scroll trigger animation
    useEffect(() => {
        if (
            trigger !== "Scroll" ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return
        const blinds = blindElementsRef.current
        if (!blinds.length) return

        if (isOutOfView) {
            if (reverse) {
                // Only stop and reset when reverse is enabled
                animationControlsRef.current.forEach((control) =>
                    control.stop()
                )
                animationControlsRef.current = []
                if (animationMode === "in-out") {
                    const lines = lineElementsRef.current
                    if (lines.length) setBlindsInOutInitial(blinds, lines)
                } else {
                    setBlindsInitial(blinds)
                }
                hasAnimatedRef.current = false
            }
            // Otherwise let running animations continue off-screen
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
                        fontFamily:
                            font.fontFamily ??
                            "system-ui, -apple-system, sans-serif",
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
        defaultValue: true,
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
        options: [
            "left-to-right",
            "right-to-left",
            "top-to-bottom",
            "bottom-to-top",
        ],
        optionTitles: ["Left to right", "Right to left", "Up–down", "Down–up"],
        optionIcons: [
            "direction-left",
            "direction-right",
            "direction-up",
            "direction-down",
        ],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "right-to-left",
    },
    alternate: {
        type: ControlType.Boolean,
        title: "Alternate",
        defaultValue: false,
    },
    lineOrder: {
        type: ControlType.Enum,
        title: "Order",
        options: [
            "first-to-last",
            "last-to-first",
            "center-out",
            "out-to-center",
        ],
        optionTitles: [
            "First → Last",
            "Last → First",
            "Center → Out",
            "Out → Center",
        ],
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
        hidden: (props: BlindsTextRevealProps) =>
            props.animationMode !== "in-out",
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
            textAlign: "center",
            lineHeight: "130%",
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"],
        defaultValue: "h1",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

BlindsTextReveal.displayName = "Blinds Text Reveal"
