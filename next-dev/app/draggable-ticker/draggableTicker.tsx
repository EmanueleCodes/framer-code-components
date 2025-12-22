import {
    Children,
    useLayoutEffect,
    useEffect,
    useState,
    useRef,
    useMemo,
    createRef,
    useCallback,
    cloneElement,
    startTransition,
    forwardRef,
    useImperativeHandle,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import {
    useAnimationFrame,
    useReducedMotion,
    LayoutGroup,
    useInView,
    useMotionValue,
    useTransform,
    motion,
    wrap,
    frame,
} from "framer-motion"
import { resize } from "@motionone/dom"

const MAX_DUPLICATED_ITEMS = 100

// Accept both 'top'/'up' and 'bottom'/'down' and normalize to 'top' and 'bottom'
const normalizeDirection = (dir) => {
    if (dir === 'up') return 'top'
    if (dir === 'down') return 'bottom'
    return dir
}

/**
 *
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 *
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function Ticker(props) {
    /* Props */
    let {
        slots = [],
        gap,
        padding,
        paddingPerSide,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        speed,
        hoverFactor,
        direction,
        alignment,
        sizingOptions,
        fadeOptions,
        style,
        draggable = false,
        dragFactor = 0.3,
        throwAware = "followOriginal",
    } = props

    const { fadeContent, overflow, fadeWidth, fadeInset, fadeAlpha } =
        fadeOptions
    const { widthType, heightType } = sizingOptions
    const paddingValue = paddingPerSide
        ? `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`
        : `${padding}px`

    /* Checks */
    const currentTarget = RenderTarget.current()
    const isCanvas =
        currentTarget === RenderTarget.canvas ||
        currentTarget === RenderTarget.export
    const writingDirection = useWritingDirection()
    // Remove empty slots (such as hidden layers)
    const filteredSlots = slots.filter(Boolean)
    const numChildren = Children.count(filteredSlots)
    const hasChildren = numChildren > 0

    const offset = useMotionValue(0)
    const resolvedDirection = getTickerResolvedDirection(
        direction === true ? 'left' : normalizeDirection(direction),
        writingDirection
    )
    const isHorizontal =
        resolvedDirection === "left" || resolvedDirection === "right"
    const transformer = directionTransformers[resolvedDirection]
    // Multiplier for base motion direction; can change after a throw
    // Always advance time forward; transformer encodes visual direction.
    const directionSignRef = useRef(1)
    useEffect(() => {
        if (throwAware === "followOriginal") {
            directionSignRef.current = 1
        }
    }, [resolvedDirection, throwAware])

    // Combine animation offset with drag offset
    const combinedOffset = useMotionValue(0)
    const transform = useTransform(combinedOffset, (value) =>
        transformer(value)
    )

    /* Refs and State */
    const parentRef = useRef(null)
    const childrenRef = useMemo(() => {
        return [
            {
                current: null,
            },
            {
                current: null,
            },
        ]
    }, [])
    const [size, setSize] = useState({
        parent: null,
        children: null,
    })

    /* Arrays */
    let clonedChildren = null
    let dupedChildren = []

    /* Duplicate value */
    let duplicateBy = 0
    let opacity = 0

    if (isCanvas) {
        duplicateBy = numChildren ? Math.floor(10 / numChildren) : 0
        opacity = 1
    }

    if (!isCanvas && hasChildren && size.parent) {
        // When draggable, we need more duplicates to handle bidirectional dragging
        // Use 4x multiplier for draggable (covers both directions), 2x for regular
        const multiplier = draggable ? 4 : 2
        duplicateBy = Math.round((size.parent / size.children) * multiplier) + 1
        duplicateBy = Math.min(duplicateBy, MAX_DUPLICATED_ITEMS)
        opacity = 1
    }

    /* Measure parent and child */
    const measure = useCallback(() => {
        if (hasChildren && parentRef.current) {
            const parentLength = isHorizontal
                ? parentRef.current.offsetWidth
                : parentRef.current.offsetHeight

            const start = childrenRef[0].current
                ? isHorizontal
                    ? childrenRef[0].current.offsetLeft
                    : childrenRef[0].current.offsetTop
                : 0
            const end = childrenRef[1].current
                ? isHorizontal
                    ? childrenRef[1].current.offsetLeft +
                      childrenRef[1].current.offsetWidth
                    : childrenRef[1].current.offsetTop +
                      childrenRef[1].current.offsetHeight
                : 0

            const childrenLength = end - start + gap

            startTransition(() => {
                setSize({
                    parent: parentLength,
                    children: childrenLength,
                })
            })
        }
    }, [])

    const childrenStyles = isCanvas ? { contentVisibility: "auto" } : {}

    /* Add refs to first and last child */
    if (hasChildren) {
        // TODO: These conditional hooks will be unsafe if hasChildren ever changes outside the canvas.
        if (!isCanvas) {
            /**
             * Track whether this is the initial resize event. By default this will fire on mount,
             * which we do in the useEffect. We should only fire it on subsequent resizes.
             */
            let initialResize = useRef(true)
            useLayoutEffect(() => {
                frame.read(measure, false, true)
                return resize(parentRef.current, ({ contentSize }) => {
                    if (
                        !initialResize.current &&
                        (contentSize.width || contentSize.height)
                    ) {
                        frame.read(measure, false, true)
                    }

                    initialResize.current = false
                })
            }, [])
        }

        clonedChildren = Children.map(filteredSlots, (child, index) => {
            let ref
            if (index === 0) {
                ref =
                    childrenRef[
                        writingDirection === "rtl" && isHorizontal ? 1 : 0
                    ]
            }
            if (index === filteredSlots.length - 1) {
                ref =
                    childrenRef[
                        writingDirection === "rtl" && isHorizontal ? 0 : 1
                    ]
            }

            const size = {
                width: widthType ? child.props?.width : "100%",
                height: heightType ? child.props?.height : "100%",
            }

            return (
                <LayoutGroup inherit="id">
                    <Wrapper ref={ref} style={size}>
                        {cloneElement(
                            child,
                            {
                                style: {
                                    ...child.props?.style,
                                    ...size,
                                    flexShrink: 0,
                                    ...childrenStyles,
                                },
                                layoutId: child.props.layoutId
                                    ? child.props.layoutId +
                                      "-original-" +
                                      index
                                    : undefined,
                            },
                            child.props?.children
                        )}
                    </Wrapper>
                </LayoutGroup>
            )
        })
    }

    const isInView = isCanvas ? true : useInView(parentRef)

    if (!isCanvas) {
        for (let i = 0; i < duplicateBy; i++) {
            dupedChildren = dupedChildren.concat(
                Children.map(filteredSlots, (child, childIndex) => {
                    const size = {
                        width: widthType ? child.props?.width : "100%",
                        height: heightType ? child.props?.height : "100%",
                        willChange: !isInView ? undefined : "transform", // without this, carousel will flash on animation repeat in safari
                    }
                    return (
                        <LayoutGroup inherit="id" key={i + "lg" + childIndex}>
                            <Wrapper key={i + "li" + childIndex} style={size}>
                                {cloneElement(
                                    child,
                                    {
                                        key: i + " " + childIndex,
                                        style: {
                                            ...child.props?.style,
                                            width: widthType
                                                ? child.props?.width
                                                : "100%",
                                            height: heightType
                                                ? child.props?.height
                                                : "100%",
                                            flexShrink: 0,
                                            ...childrenStyles,
                                        },
                                        layoutId: child.props.layoutId
                                            ? child.props.layoutId +
                                              "-dupe-" +
                                              i
                                            : undefined,
                                    },
                                    child.props?.children
                                )}
                            </Wrapper>
                        </LayoutGroup>
                    )
                })
            )
        }
    }

    const animateToValue =
        size.children + size.children * Math.round(size.parent / size.children)

    const initialTime = useRef(null)
    const prevTime = useRef(null)
    const xOrY = useRef(0)
    const isHover = useRef(false)

    const isReducedMotion = useReducedMotion()
    const listRef = useRef<HTMLUListElement>(null)
    const animationRef = useRef<Animation>(null)

    // Drag state and refs
    const isDragging = useRef(false)
    const dragOffset = useMotionValue(0)
    const dragVelocity = useRef(0) // kept for compatibility but not used in blending
    const lastPointerPosition = useRef({ x: 0, y: 0 })
    const animationBaseOffset = useRef(0)
    // Velocity in px/ms used for seamless post-release motion
    const currentVelocity = useRef(0)
    const hasUserDragged = useRef(false)
    const lastPointerTs = useRef<number | null>(null)
    const rawCursorVelocity = useRef(0)

    /**
     * Setup animations
     */
    if (!isCanvas) {
        useEffect(() => {
            if (isReducedMotion || !animateToValue || !speed) {
                return
            }

            // If draggable, we'll use animation frame instead of Web Animations API
            if (!draggable) {
                animationRef.current = listRef.current.animate(
                    {
                        transform: [
                            transformer(0),
                            transformer(animateToValue),
                        ],
                    },
                    {
                        duration: (Math.abs(animateToValue) / speed) * 1000,
                        iterations: Infinity,
                        iterationStart: writingDirection === "rtl" ? 1 : 0,
                        easing: "linear",
                    }
                )

                return () => animationRef.current.cancel()
            }
        }, [hoverFactor, animateToValue, speed, writingDirection, draggable])

        const playOrPause = useCallback(() => {
            if (!animationRef.current) return

            const hidden = document.hidden
            if (
                isInView &&
                !hidden &&
                animationRef.current.playState === "paused"
            ) {
                animationRef.current.play()
            } else if (
                (!isInView || hidden) &&
                animationRef.current.playState === "running"
            ) {
                animationRef.current.pause()
            }
        }, [isInView])

        useEffect(() => {
            playOrPause()
        }, [isInView, hoverFactor, animateToValue, speed])

        useEffect(() => {
            document.addEventListener("visibilitychange", playOrPause)
            return () => {
                document.removeEventListener("visibilitychange", playOrPause)
            }
        }, [playOrPause])
    }

    // Drag handlers
    const handleGlobalPointerUp = useCallback(() => {
        if (!isDragging.current) return

        isDragging.current = false

        // Resume animation if using Web Animations API
        if (animationRef.current && !draggable) {
            animationRef.current.play()
        }

        // Update cursor
        if (listRef.current) {
            listRef.current.style.cursor = "grab"
        }
        if (parentRef.current) {
            parentRef.current.style.cursor = "grab"
        }

        // Remove global listeners
        window.removeEventListener("pointerup", handleGlobalPointerUp)
        window.removeEventListener("pointercancel", handleGlobalPointerUp)
        window.removeEventListener("blur", handleGlobalPointerUp)
    }, [draggable])

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!draggable) return

            e.currentTarget.setPointerCapture(e.pointerId)
            if (listRef.current) {
                listRef.current.style.cursor = "grabbing"
            }
            if (parentRef.current) {
                parentRef.current.style.cursor = "grabbing"
            }

            isDragging.current = true
            lastPointerPosition.current = { x: e.clientX, y: e.clientY }
            dragVelocity.current = 0

            // Pause animation if using Web Animations API
            if (animationRef.current) {
                animationRef.current.pause()
            }

            // Add global listeners
            window.addEventListener("pointerup", handleGlobalPointerUp)
            window.addEventListener("pointercancel", handleGlobalPointerUp)
            window.addEventListener("blur", handleGlobalPointerUp)
            hasUserDragged.current = true
        },
        [draggable, handleGlobalPointerUp]
    )

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!draggable || !isDragging.current) return

            const currentPosition = { x: e.clientX, y: e.clientY }
            const deltaX = currentPosition.x - lastPointerPosition.current.x
            const deltaY = currentPosition.y - lastPointerPosition.current.y

            // Calculate movement based on direction
            let delta = 0
            if (isHorizontal) {
                delta = resolvedDirection === "left" ? -deltaX : deltaX
            } else {
                delta = resolvedDirection === "top" ? -deltaY : deltaY
            }

            // Update drag offset
            dragOffset.set(dragOffset.get() + delta)

            // Track instantaneous cursor velocity (px/ms) for seamless release
            const now = performance.now()
            const dt = lastPointerTs.current ? now - lastPointerTs.current : 0
            if (dt > 0) {
                currentVelocity.current = delta / dt
                const rawDelta = isHorizontal ? deltaX : deltaY
                rawCursorVelocity.current = rawDelta / dt
            }
            lastPointerTs.current = now

            lastPointerPosition.current = currentPosition
        },
        [draggable, isHorizontal, resolvedDirection, dragOffset, dragFactor]
    )

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!draggable) return
            e.currentTarget.releasePointerCapture(e.pointerId)
            handleGlobalPointerUp()
            // Clear timestamp so next drag recalculates properly
            lastPointerTs.current = null
            // If throw aware, set the base motion direction to match throw and direction.
            if (throwAware === "followDrag") {
                // If direction is 'left' or 'top', sign logic must be inverted
                // so that a rightward (positive) throw continues leftward scroll as expected
                const needsFlip = resolvedDirection === "left" || resolvedDirection === "top"
                directionSignRef.current = needsFlip
                    ? rawCursorVelocity.current >= 0 ? -1 : 1
                    : rawCursorVelocity.current >= 0 ? 1 : -1
            }
        },
        [draggable, handleGlobalPointerUp, throwAware, resolvedDirection]
    )

    // Animation frame for draggable mode
    useAnimationFrame((_, delta) => {
        if (
            isCanvas ||
            !draggable ||
            isReducedMotion ||
            !animateToValue ||
            !speed
        ) {
            return
        }

        if (isDragging.current) {
            // During drag, only apply drag offset, don't animate
            combinedOffset.set(animationBaseOffset.current + dragOffset.get())
            return
        }

        // Base velocity from configured speed (px/ms) using current direction sign
        const baseVelocity = (speed / 1000) * directionSignRef.current

        // On first render (no user drag yet), run at base speed exactly
        if (!hasUserDragged.current && !isDragging.current) {
            currentVelocity.current = baseVelocity
        }

        // Blend current velocity toward base velocity at a rate controlled by dragFactor
        // Invert dragFactor so higher momentum = longer coast (lower internal drag)
        const invertedDragFactor = 1.1 - (dragFactor ?? 1)
        // Normalize drag factor to 0.1..1 for predictable UX, then remap to a
        // stronger decay range so low values don't coast for too long
        const frameScale = delta / (1000 / 60)
        const normalizedDrag = Math.max(0.1, Math.min(1, invertedDragFactor))
        // Map 0.1..1 -> 0.4..2.5 (higher = faster convergence)
        const decayScale = mapLinear(normalizedDrag, 0.1, 1, 0.4, 2.5)
        // Use a slightly stronger base decay than before to reduce overall coast time
        const decay = Math.pow(0.88, decayScale * frameScale)
        currentVelocity.current =
            baseVelocity + (currentVelocity.current - baseVelocity) * decay

        // Integrate position with the blended velocity
        animationBaseOffset.current += currentVelocity.current * delta

        // Calculate the total offset before wrapping
        const totalOffset = animationBaseOffset.current + dragOffset.get()

        // Seamless wrapping in both directions using modulo
        const wrappedOffset =
            ((totalOffset % animateToValue) + animateToValue) % animateToValue

        // Update both offsets to maintain the wrap without visible jumps
        animationBaseOffset.current = wrappedOffset
        dragOffset.set(0)

        // Combine animation offset with drag offset
        combinedOffset.set(animationBaseOffset.current + dragOffset.get())
    })

    // Clean up event listeners on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener("pointerup", handleGlobalPointerUp)
            window.removeEventListener("pointercancel", handleGlobalPointerUp)
            window.removeEventListener("blur", handleGlobalPointerUp)
        }
    }, [handleGlobalPointerUp])

    /* Fades */
    const fadeDirection = isHorizontal ? "to right" : "to bottom"
    const fadeWidthStart = fadeWidth / 2
    const fadeWidthEnd = 100 - fadeWidth / 2
    const fadeInsetStart = clamp(fadeInset, 0, fadeWidthStart)
    const fadeInsetEnd = 100 - fadeInset

    const fadeMask = `linear-gradient(${fadeDirection}, rgba(0, 0, 0, ${fadeAlpha}) ${fadeInsetStart}%, rgba(0, 0, 0, 1) ${fadeWidthStart}%, rgba(0, 0, 0, 1) ${fadeWidthEnd}%, rgba(0, 0, 0, ${fadeAlpha}) ${fadeInsetEnd}%)`

    /* Empty state */
    if (!hasChildren) {
        return (
            <section style={placeholderStyles}>
                <div style={emojiStyles}>✨</div>
                <p style={titleStyles}>Connect to Content</p>
                <p style={subtitleStyles}>
                    Add layers or components to infinitely loop on your page.
                </p>
            </section>
        )
    }

    return (
        <section
            style={{
                ...containerStyle,
                opacity: opacity,
                WebkitMaskImage: fadeContent ? fadeMask : undefined,
                maskImage: fadeContent ? fadeMask : undefined,
                overflow: overflow ? "visible" : "hidden",
                padding: paddingValue,
                // Force pointer events from children up to the section (so gaps work)
                pointerEvents: "auto",
                cursor: draggable ? "grab" : undefined,
            }}
            ref={parentRef}
            // Drag & hover listeners moved here for full parent-area support
            onMouseEnter={() => {
                isHover.current = true
                if (animationRef.current && !draggable) {
                    animationRef.current.playbackRate = hoverFactor
                }
            }}
            onMouseLeave={() => {
                isHover.current = false
                if (animationRef.current && !draggable) {
                    animationRef.current.playbackRate = 1
                }
            }}
            onPointerDown={draggable ? handlePointerDown : undefined}
            onPointerMove={draggable ? handlePointerMove : undefined}
            onPointerUp={draggable ? handlePointerUp : undefined}
            onPointerCancel={draggable ? handlePointerUp : undefined}
        >
            <motion.ul
                ref={listRef}
                style={{
                    ...containerStyle,
                    gap: gap,
                    top:
                        direction === "bottom" && isValidNumber(animateToValue)
                            ? -animateToValue
                            : undefined,
                    left:
                        direction === "right" && isValidNumber(animateToValue)
                            ? animateToValue *
                              (writingDirection === "rtl" ? 1 : -1)
                            : undefined,
                    placeItems: alignment,
                    position: "relative",
                    flexDirection: isHorizontal ? "row" : "column",
                    ...style,
                    willChange: isCanvas || !isInView ? "auto" : "transform",
                    transform: draggable ? transform : undefined
                    // pointerEvents line removed so children are interactive
                }}
            >
                {clonedChildren}
                {dupedChildren}
            </motion.ul>
        </section>
    )
}

const Wrapper = forwardRef(({ children, ...props }, ref) => {
    const innerRef = useRef<HTMLLIElement | null>()
    const inView = useInView(innerRef)

    useImperativeHandle(ref, () => innerRef.current)

    useEffect(() => {
        const current = innerRef.current
        if (!current) return

        // for a11y: Manage tabIndex on focusable descendants & aria-hidden on the parent.
        if (inView) {
            current.querySelectorAll("button,a").forEach((el) => {
                const orig = el.dataset.origTabIndex
                if (orig) el.tabIndex = orig
                else el.removeAttribute("tabIndex")
            })
        } else {
            current.querySelectorAll("button,a").forEach((el) => {
                const orig = el.getAttribute("tabIndex")
                if (orig) el.dataset.origTabIndex = orig
                el.tabIndex = -1
            })
        }
    }, [inView])

    return (
        <li {...props} aria-hidden={!inView} ref={innerRef}>
            {children}
        </li>
    )
})

/* Default Properties */
Ticker.defaultProps = {
    gap: 10,
    padding: 10,
    sizingOptions: {
        widthType: true,
        heightType: true,
    },
    fadeOptions: {
        fadeContent: true,
        overflow: false,
        fadeWidth: 25,
        fadeAlpha: 0,
        fadeInset: 0,
    },
    direction: true,
    draggable: false,
    dragFactor: 0.3,
    throwAware: "followOriginal",
}

/* Property Controls */
addPropertyControls(Ticker, {
    slots: {
        type: ControlType.Array,
        title: "Children",
        control: { type: ControlType.ComponentInstance },
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1000,
        defaultValue: 100,
        unit: "%",
        displayStepper: true,
        step: 5,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["left", "right", "top", "bottom"],
        optionIcons: [
            "direction-left",
            "direction-right",
            "direction-up",
            "direction-down",
        ],
        optionTitles: ["Left", "Right", "Top", "Bottom"],
        defaultValue: "left",
        displaySegmentedControl: true,
    },
    alignment: {
        type: ControlType.Enum,
        title: "Align",
        options: ["flex-start", "center", "flex-end"],
        optionIcons: {
            direction: {
                right: ["align-top", "align-middle", "align-bottom"],
                left: ["align-top", "align-middle", "align-bottom"],
                top: ["align-left", "align-center", "align-right"],
                bottom: ["align-left", "align-center", "align-right"],
            },
        },
        defaultValue: "center",
        displaySegmentedControl: true,
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
    },
    padding: {
        title: "Padding",
        type: ControlType.FusedNumber,
        toggleKey: "paddingPerSide",
        toggleTitles: ["Padding", "Padding per side"],
        valueKeys: [
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
        ],
        valueLabels: ["T", "R", "B", "L"],
        min: 0,
    },

    hoverFactor: {
        type: ControlType.Number,
        title: "Hover",
        min: 0,
        max: 1,
        unit: "x",
        defaultValue: 1,
        step: 0.1,
        displayStepper: true,
        description: "Slows down the speed while you are hovering.",
        hidden: (props) => props.draggable,
    },
    draggable: {
        type: ControlType.Boolean,
        title: "Draggable",
        defaultValue: true,
    },
    dragFactor: {
        type: ControlType.Number,
        title: "Momentum",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 0.3,
        hidden: (props) => !props.draggable,
    },
    throwAware: {
        type: ControlType.Enum,
        title: "On Throw",
        options:["followDrag","followOriginal"],
        optionTitles:["Follow Drag",'Follow "Direction"'],
        defaultValue: "followOriginal",
        hidden: (props) => !props.draggable,
        displaySegmentedControl:true,
        segmentedControlDirection:"vertical"
    },

    sizingOptions: {
        type: ControlType.Object,
        title: "Sizing",
        controls: {
            widthType: {
                type: ControlType.Boolean,
                title: "Width",
                enabledTitle: "Auto",
                disabledTitle: "Stretch",
                defaultValue: true,
            },
            heightType: {
                type: ControlType.Boolean,
                title: "Height",
                enabledTitle: "Auto",
                disabledTitle: "Stretch",
                defaultValue: true,
            },
        },
    },
    fadeOptions: {
        type: ControlType.Object,
        title: "Clipping",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            fadeContent: {
                type: ControlType.Boolean,
                title: "Fade",
                defaultValue: true,
            },
            overflow: {
                type: ControlType.Boolean,
                title: "Overflow",
                enabledTitle: "Show",
                disabledTitle: "Hide",
                defaultValue: false,
                hidden(props) {
                    return props.fadeContent === true
                },
            },
            fadeWidth: {
                type: ControlType.Number,
                title: "Width",
                defaultValue: 25,
                min: 0,
                max: 100,
                unit: "%",
                hidden(props) {
                    return props.fadeContent === false
                },
            },
            fadeInset: {
                type: ControlType.Number,
                title: "Inset",
                defaultValue: 0,
                min: 0,
                max: 100,
                unit: "%",
                hidden(props) {
                    return props.fadeContent === false
                },
            },
            fadeAlpha: {
                type: ControlType.Number,
                title: "Opacity",
                defaultValue: 0,
                min: 0,
                max: 1,
                step: 0.05,
                hidden(props) {
                    return props.fadeContent === false
                },
            },
        },
    },
})

/* Placeholder Styles */
const containerStyle = {
    display: "flex",
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    placeItems: "center",
    margin: 0,
    padding: 0,
    listStyleType: "none",
    textIndent: "none",
}

/* Styles */
const placeholderStyles = {
    display: "flex",
    width: "100%",
    height: "100%",
    placeContent: "center",
    placeItems: "center",
    flexDirection: "column",
    color: "#96F",
    background: "rgba(136, 85, 255, 0.1)",
    fontSize: 11,
    overflow: "hidden",
    padding: "20px 20px 30px 20px",
}

const emojiStyles = {
    fontSize: 32,
    marginBottom: 10,
}

const titleStyles = {
    margin: 0,
    marginBottom: 10,
    fontWeight: 600,
    textAlign: "center",
}

const subtitleStyles = {
    margin: 0,
    opacity: 0.7,
    maxWidth: 150,
    lineHeight: 1.5,
    textAlign: "center",
}

/* Clamp function, used for fadeInset */
const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

const isValidNumber = (value) => typeof value === "number" && !isNaN(value)

// Linear mapping helper (see mappingValues.md)
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

function useWritingDirection() {
    if (!window || !window.document || !window.document.documentElement)
        return "ltr"
    return window.document.documentElement.dir === "rtl" ? "rtl" : "ltr"
}

// Add support for 'up'/'down' to directionTransformers, map to 'top'/'bottom'
const directionTransformers = {
    left: (offset: number) => `translateX(-${offset}px)`,
    right: (offset: number) => `translateX(${offset}px)`,
    top: (offset: number) => `translateY(-${offset}px)`,
    up: (offset: number) => `translateY(-${offset}px)`, // synonym
    bottom: (offset: number) => `translateY(${offset}px)`,
    down: (offset: number) => `translateY(${offset}px)`, // synonym
}

// getTickerResolvedDirection supports both ('up' -> 'top', 'down' -> 'bottom')
function getTickerResolvedDirection(
    direction: 'left' | 'right' | 'top' | 'bottom' | 'up' | 'down',
    writingDirection: 'ltr' | 'rtl'
) {
    // Always normalize synonyms
    const dir = normalizeDirection(direction)
    if (writingDirection !== 'rtl') return dir
    if (dir === 'left') return 'right'
    if (dir === 'right') return 'left'
    // top/bottom are the same regardless of RTL/LTR
    return dir
}

Ticker.displayName = "Draggable Ticker"
